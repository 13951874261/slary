#include "AudioInjector.h"
#include <cmath>
#include <algorithm>
#include <random>

namespace silenceguard {

// =========================================================
// NoiseMasker 实现 (核心升级)
// =========================================================

NoiseMasker::NoiseMasker(float sampleRate) 
    : sampleRate_(sampleRate), dist_(-1.0f, 1.0f) {
  // 初始化随机种子
  std::random_device rd;
  rng_.seed(rd());
  
  // 初始化默认参数
  // Attack=10ms: 快速捕捉辅音爆发
  // Release=50ms: 平滑元音拖尾，保持语流连贯
  setEnvelopeParams(10.0f, 50.0f);
}

void NoiseMasker::setEnvelopeParams(float attackMs, float releaseMs) {
  // 防止除零错误
  attackMs = std::max(1.0f, attackMs);
  releaseMs = std::max(1.0f, releaseMs);

  // 计算一阶低通滤波器系数公式: coeff = 1 - exp( -1 / (time * fs) )
  // 此处使用高精度计算确保滤波器稳定性
  attackCoeff_ = 1.0f - std::exp(-1000.0f / (attackMs * sampleRate_));
  releaseCoeff_ = 1.0f - std::exp(-1000.0f / (releaseMs * sampleRate_));
}

void NoiseMasker::process(int16_t* buffer, size_t frames) {
  const float kInt16Max = 32767.0f;
  
  for (size_t i = 0; i < frames; ++i) {
    // 1. 归一化输入 [-1.0, 1.0]
    float input = static_cast<float>(buffer[i]) / kInt16Max;
    float inputAbs = std::abs(input);

    // 2. 包络跟随 (Envelope Follower)
    // 模拟电路中的检波器行为
    if (inputAbs > currentEnvelope_) {
      // Attack Phase: 信号增强，快速充电
      currentEnvelope_ += attackCoeff_ * (inputAbs - currentEnvelope_);
    } else {
      // Release Phase: 信号减弱，缓慢放电
      currentEnvelope_ += releaseCoeff_ * (inputAbs - currentEnvelope_);
    }

    // 3. 生成白噪声 (White Noise) N(t)
    float noise = dist_(rng_);

    // 4. 调制 (Modulation) N_mod(t) = N(t) * E(t)
    // 用提取的包络去控制噪声的幅度
    float output = noise * currentEnvelope_ * makeUpGain_;

    // 5. 软限幅 (Soft Clipping)
    // 防止调制后的噪声峰值溢出，比硬截断更自然
    if (output > 1.0f) output = 1.0f;
    if (output < -1.0f) output = -1.0f;

    // 6. 写入输出
    buffer[i] = static_cast<int16_t>(output * kInt16Max);
  }
}

// =========================================================
// 传统接口实现 (Legacy)
// =========================================================

namespace {
constexpr float kPi = 3.14159265358979f;
constexpr float kAmplitude = 0.4f;
}

float generateSineSample(int frameIndex, float phaseRad) {
  float t = static_cast<float>(frameIndex) / static_cast<float>(kSampleRate);
  return kAmplitude * std::sin(2.f * kPi * kBeepFreqHz * t + phaseRad);
}

void applyBeep(int16_t* buffer, size_t frames) {
  const float scale = 32767.f;
  for (size_t i = 0; i < frames; ++i) {
    float s = generateSineSample(static_cast<int>(i), 0.f);
    buffer[i] = static_cast<int16_t>(std::max(-32768.f, std::min(32767.f, s * scale)));
  }
}

void applyCrossFade(int16_t* buffer, size_t frames, size_t crossFadeFrames) {
  if (crossFadeFrames == 0 || frames < crossFadeFrames) {
    applyBeep(buffer, frames);
    return;
  }
  const float scale = 32767.f;
  for (size_t i = 0; i < frames; ++i) {
    float alpha = (i < crossFadeFrames) ? (static_cast<float>(i) / static_cast<float>(crossFadeFrames)) : 1.f;
    float original = static_cast<float>(buffer[i]) / scale * (1.f - alpha);
    float beep = generateSineSample(static_cast<int>(i), 0.f) * alpha;
    float mixed = original + beep;
    buffer[i] = static_cast<int16_t>(std::max(-32768.f, std::min(32767.f, mixed * scale)));
  }
}

}  // namespace silenceguard
