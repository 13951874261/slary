// SilenceGuard Pro — TFLite 推理封装 (NEXT_IMPROVEMENTS §3.1)
// 输入: [1, 50, 80] Mel; 输出: 音素后验概率 (Phoneme Posteriors)
// Phase 2: 接入真实 TFLite Interpreter

#ifndef SILENCEGUARD_TFLITERUNNER_H
#define SILENCEGUARD_TFLITERUNNER_H

#include <cstddef>
#include <vector>
#include <string>

namespace silenceguard {

// §3.1: input [1, 50, 80], output 音素维度由模型定义
constexpr int kInputFrames = 50;
constexpr int kInputMelBins = 80;
constexpr int kInputSize = kInputFrames * kInputMelBins;

class TFLiteRunner {
 public:
  TFLiteRunner() = default;
  ~TFLiteRunner() = default;

  /** 从 assets 或路径加载 encoder.tflite，Phase 2 实现 */
  bool loadModel(const char* path);

  /** 推理：melInput 长度为 kInputSize，输出音素后验写入 posteriors */
  bool run(const float* melInput, size_t melLen, std::vector<float>* posteriors);

  bool isLoaded() const { return loaded_; }

 private:
  bool loaded_ = false;
};

}  // namespace silenceguard

#endif  // SILENCEGUARD_TFLITERUNNER_H
