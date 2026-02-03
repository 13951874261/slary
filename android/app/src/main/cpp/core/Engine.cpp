// SilenceGuard Pro — 核心调度器 (NEXT_IMPROVEMENTS §2.1)
// Phase 1: 接收 HAL 数据 → 送入分析；Phase 2: TFLite 推理；Phase 3: 注入指令

#include "RingBuffer.h"
#include "feature_extraction/MelSpectrogram.h"
#include "inference/TFLiteRunner.h"
#include "inference/ConfMatrix.h"
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
  
  // Phase 2 实现: 初始化
  // 此处简单起见在首次使用时初始化
  // 生产环境应在 Bridge JNI_OnLoad 或独立 init 方法中调用
  void init() {
     // Default no-op. Load model via loadModel() JNI call.
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
    // init(); // No implicit init with hardcoded path
    
    size_t frames = bytes / sizeof(int16_t);
    const int16_t* pcm = static_cast<const int16_t*>(data);
    ring_.write(pcm, frames);

    // Buffer for analysis (Accumulate enough for 500ms window? or Sliding window?)
    // TFLite input: [1, 50, 80] -> 50 frames * 10ms hop = ~500ms context
    // Real-time strategy: Run every 100ms?
    
    // For POC: simple counter to run every ~500ms (not sliding window for simplicity)
    processed_samples_ += frames;
    if (processed_samples_ >= 8000) { // 8000 samples @ 16k = 500ms
        // 1. Read last 500ms from RingBuffer
        std::vector<int16_t> window(8000);
        // Warning: RingBuffer needs peek method handling wrap-around. 
        // For POC assuming linear read or implementing simple peek.
        // ring_.peek(window.data(), 8000, offset?); 
        // fallback: just use current incoming buffer if large enough, or skip complex ring read for POC
        
        // 2. Feature Extraction
        std::vector<float> mel(50 * 80);
        // Using current buffer for simplicity of POC demo if large enough, else should use ring
        int validFrames = computeMelFrames(pcm, frames, mel.data(), 50); 
        
        // 3. Inference
        // CRITICAL FIX: Only run if loaded
        if (validFrames > 0 && tfRunner_.isLoaded()) {
            std::vector<float> posteriors;
            if (tfRunner_.run(mel.data(), validFrames * 80, &posteriors)) {
                // 4. Matching: Simplified to check if "risk" probability is high
                // Real impl: Decode phonemes from posteriors -> fuzzy match
                // For POC: Check if output sum > threshold (Mock logic)
                float risk_score = 0.0f; 
                for(float p : posteriors) risk_score += p;
                
                // 5. Intercept Decision
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
    // Phase 2: 由 TFLite + 变体匹配结果驱动
    if (test_intercept_enabled_ && test_frames_remaining_ > 0) {
      --test_frames_remaining_;
      return true;
    }
    
    // Phase 2 Real Logic
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

  /** POC 测试：启用后接下来约 100ms 内 shouldIntercept() 返回 true，便于验证 hook → injector 链路 */
  void setTestInterceptEnabled(bool enabled) {
    std::lock_guard<std::mutex> lock(mutex_);
    test_intercept_enabled_ = enabled;
    if (enabled) test_frames_remaining_ = 1600;  // 100ms @ 16kHz
  }

  RingBuffer& getRingBuffer() { return ring_; }

  /** Web → Native: UPDATE_CONFIG 下发 (§7.1)，简单解析 global_sensitivity 与 keywords 数量 */
  void updateConfig(const char* json) {
    if (!json) return;
    std::lock_guard<std::mutex> lock(mutex_);
    last_config_json_ = json;
    global_sensitivity_ = parseGlobalSensitivity(json);
    keyword_count_ = parseKeywordCount(json);
    // Reload ConfMatrix if needed
  }
  
  // ... (rest of parsing logic unchanged) ...

  const std::string& getLastConfigJson() const { return last_config_json_; }
  const std::string& getLastFalsePositiveWord() const { return last_false_positive_word_; }
  int64_t getLastFalsePositiveTs() const { return last_false_positive_ts_; }

 private:
  ProtectionEngine() = default;
  static float parseGlobalSensitivity(const char* json) {
    // ... (unchanged) ...
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
    // ... (unchanged) ...
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
  std::mutex mutex_;
  RingBuffer ring_;
  std::string last_config_json_;
  std::string last_false_positive_word_;
  int64_t last_false_positive_ts_ = 0;
  float global_sensitivity_ = 0.85f;
  int keyword_count_ = 0;
  bool test_intercept_enabled_ = false;
  int test_frames_remaining_ = 0;
  
  // Phase 2 State
  TFLiteRunner tfRunner_;
  bool initialized_ = false;
  size_t processed_samples_ = 0;
  bool intercept_requested_ = false;
  int intercept_frames_remaining_ = 0;
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
