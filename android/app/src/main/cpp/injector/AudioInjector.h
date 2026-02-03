#pragma once

#include <cstdint>
#include <cstddef>
#include <random>
#include <vector>

namespace silenceguard {

// 采样率常量，与白皮书一致 (48kHz 或 16kHz，此处默认 16kHz 用于处理)
constexpr int kSampleRate = 16000;
constexpr int kBeepFreqHz = 1000;

/**
 * 核心升级：噪声掩蔽器 (Stateful)
 * 实现白皮书 §5.1 白噪声/掩蔽模式
 */
class NoiseMasker {
 public:
  explicit NoiseMasker(float sampleRate = static_cast<float>(kSampleRate));

  /**
   * 核心处理函数：原地(In-place)将输入 buffer 中的人声替换为掩蔽噪声
   * @param buffer PCM音频数据
   * @param frames 帧数
   */
  void process(int16_t* buffer, size_t frames);

  /**
   * 动态调整包络参数 (支持从 Web 端下发配置)
   * @param attackMs 起步时间 (默认 10ms): 越小反应越快
   * @param releaseMs 释放时间 (默认 50ms): 越大声音拖尾越长，越平滑
   */
  void setEnvelopeParams(float attackMs, float releaseMs);

 private:
  float sampleRate_;
  
  // 随机数生成器 (用于生成高质量白噪声)
  std::mt19937 rng_;
  std::uniform_real_distribution<float> dist_;

  // 包络跟随器状态 (记忆上一帧的能量)
  float currentEnvelope_ = 0.0f;
  
  // 滤波器系数 (根据 attack/release 时间计算)
  float attackCoeff_ = 0.0f;
  float releaseCoeff_ = 0.0f;

  // 妆容增益 (Make-up Gain)，补偿噪声听感上的能量损失
  float makeUpGain_ = 1.0f;
};

// ---------------------------------------------------------
// 兼容接口 (Legacy / Fallback)
// ---------------------------------------------------------
void applyBeep(int16_t* buffer, size_t frames);
void applyCrossFade(int16_t* buffer, size_t frames, size_t crossFadeFrames);

}  // namespace silenceguard
