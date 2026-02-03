#include "RingBuffer.h"
#include "feature_extraction/MelSpectrogram.h"
#include "inference/TFLiteRunner.h"
#include "inference/ConfMatrix.h"
#include "injector/AudioInjector.h" 
#include <cstdint>
#include <cstdio>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>

namespace silenceguard {

class ProtectionEngine {
 public:
  static ProtectionEngine* getInstance() {
    static ProtectionEngine s;
    return &s;
  }
  
  void init() {
     initialized_ = true;
  }
  
  void loadModel(const char* path) {
      std::lock_guard<std::mutex> lock(mutex_);
      if (tfRunner_.loadModel(path)) {
          printf("Model loaded from: %s\n", path);
      }
  }

  void pushToBuffer(const void* data, size_t bytes) {
    std::lock_guard<std::mutex> lock(mutex_);
    
    size_t frames = bytes / sizeof(int16_t);
    const int16_t* pcm = static_cast<const int16_t*>(data);
    ring_.write(pcm, frames);

    processed_samples_ += frames;
    if (processed_samples_ >= 8000) { 
        std::vector<int16_t> window(8000);
        
        std::vector<float> mel(50 * 80);
        int validFrames = computeMelFrames(pcm, frames, mel.data(), 50); 
        
        if (validFrames > 0 && tfRunner_.isLoaded()) {
            std::vector<float> posteriors;
            if (tfRunner_.run(mel.data(), validFrames * 80, &posteriors)) {
                float risk_score = 0.0f; 
                for(float p : posteriors) risk_score += p;
                
                if (risk_score > global_sensitivity_) {
                    intercept_requested_ = true;
                    intercept_frames_remaining_ = 3200; // 200ms mute
                }
            }
        }
        processed_samples_ = 0;
    }
  }

  bool shouldIntercept() {
    std::lock_guard<std::mutex> lock(mutex_);
    if (test_intercept_enabled_ && test_frames_remaining_ > 0) {
      --test_frames_remaining_;
      return true;
    }
    
    if (intercept_requested_) {
        if (intercept_frames_remaining_ > 0) {
            --intercept_frames_remaining_;
            return true;
        } else {
            intercept_requested_ = false;
        }
    }
    
    return false;
  }

  void setTestInterceptEnabled(bool enabled) {
    std::lock_guard<std::mutex> lock(mutex_);
    test_intercept_enabled_ = enabled;
    if (enabled) test_frames_remaining_ = 1600;  // 100ms @ 16kHz
  }

  RingBuffer& getRingBuffer() { return ring_; }

  /**
   * [新增] 获取 Masker 实例供外部调用 (如 Hook 层)
   * 当检测到违规时，Hook 层可直接调用 engine->getMasker().process(buffer, frames)
   */
  NoiseMasker& getMasker() { return masker_; }

  /**
   * [升级] 支持配置 Masking 参数
   * Web 端发送 {"masking": {"attack": 15, "release": 100}}
   */
  void updateConfig(const char* json) {
    if (!json) return;
    std::lock_guard<std::mutex> lock(mutex_);
    last_config_json_ = json;
    
    global_sensitivity_ = parseGlobalSensitivity(json);
    keyword_count_ = parseKeywordCount(json);

    // 新增：解析 masking 参数
    float attack = parseJsonFloat(json, "\"attack\"", 10.0f);
    float release = parseJsonFloat(json, "\"release\"", 50.0f);
    masker_.setEnvelopeParams(attack, release);
  }
  
  const std::string& getLastConfigJson() const { return last_config_json_; }
  const std::string& getLastFalsePositiveWord() const { return last_false_positive_word_; }
  int64_t getLastFalsePositiveTs() const { return last_false_positive_ts_; }
  
  void markFalsePositive(const char* word, int64_t timestamp) {
      std::lock_guard<std::mutex> lock(mutex_);
      if (word) last_false_positive_word_ = word;
      last_false_positive_ts_ = timestamp;
  }

 private:
  ProtectionEngine() : masker_(16000.0f) {} // 初始化 Masker

  static float parseGlobalSensitivity(const char* json) {
    const char* key = "\"global_sensitivity\"";
    const char* p = strstr(json, key);
    if (!p) return 0.85f;
    p += strlen(key);
    while (*p && (*p == ' ' || *p == ':' || *p == ' ')) ++p;
    float v = 0.85f;
    if (sscanf(p, "%f", &v) >= 1) return v;
    return 0.85f;
  }

  static int parseKeywordCount(const char* json) {
    const char* key = "\"keywords\"";
    const char* p = strstr(json, key);
    if (!p) return 0;
    p = strchr(p, '[');
    if (!p) return 0;
    int n = 0;
    for (++p; *p && *p != ']'; ++p)
      if (*p == '{') ++n;
    return n;
  }

  // 辅助解析函数
  static float parseJsonFloat(const char* json, const char* key, float defaultVal) {
    const char* p = strstr(json, key);
    if (!p) return defaultVal;
    p += strlen(key);
    while (*p && (*p == ' ' || *p == ':' || *p == ' ' || *p == '"')) ++p;
    float v = defaultVal;
    if (sscanf(p, "%f", &v) >= 1) return v;
    return defaultVal;
  }

  std::mutex mutex_;
  RingBuffer ring_;
  std::string last_config_json_;
  std::string last_false_positive_word_;
  int64_t last_false_positive_ts_ = 0;
  float global_sensitivity_ = 0.85f;
  int keyword_count_ = 0;
  bool test_intercept_enabled_ = false;
  int test_frames_remaining_ = 0;
  
  TFLiteRunner tfRunner_;
  bool initialized_ = false;
  size_t processed_samples_ = 0;
  bool intercept_requested_ = false;
  int intercept_frames_remaining_ = 0;

  // 新增成员变量
  NoiseMasker masker_;
};

}  // namespace silenceguard

// C 接口供 HAL/Hook 层调用
extern "C" {

void* ProtectionEngine_getInstance() {
  return silenceguard::ProtectionEngine::getInstance();
}

void ProtectionEngine_pushToBuffer(void* engine, const void* buffer, size_t bytes) {
  static_cast<silenceguard::ProtectionEngine*>(engine)->pushToBuffer(buffer, bytes);
}

int ProtectionEngine_shouldIntercept(void* engine) {
  return static_cast<silenceguard::ProtectionEngine*>(engine)->shouldIntercept() ? 1 : 0;
}

void ProtectionEngine_setTestInterceptEnabled(void* engine, int enabled) {
  static_cast<silenceguard::ProtectionEngine*>(engine)->setTestInterceptEnabled(enabled != 0);
}

void ProtectionEngine_updateConfig(void* engine, const char* json) {
  static_cast<silenceguard::ProtectionEngine*>(engine)->updateConfig(json);
}

void ProtectionEngine_markFalsePositive(void* engine, const char* word, int64_t timestamp) {
  static_cast<silenceguard::ProtectionEngine*>(engine)->markFalsePositive(word, timestamp);
}

void ProtectionEngine_loadModel(void* engine, const char* path) {
  static_cast<silenceguard::ProtectionEngine*>(engine)->loadModel(path);
}

}  // extern "C"
