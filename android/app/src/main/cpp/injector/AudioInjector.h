// SilenceGuard Pro — 音频合成与 Cross-fade (NEXT_IMPROVEMENTS §4.2)
// Phase 3: 信号替换与平滑，避免 POP 噪声

#ifndef SILENCEGUARD_AUDIOINJECTOR_H
#define SILENCEGUARD_AUDIOINJECTOR_H

#include <cstddef>
#include <cstdint>

namespace silenceguard {

// 采样率 16kHz，哔声 440Hz，交叉淡入淡出帧数
constexpr int kSampleRate = 16000;
constexpr float kBeepFreqHz = 440.f;
constexpr size_t kCrossFadeFramesDefault = 80;  // ~5ms @ 16kHz

/** 在当前 buffer 上写入哔声（覆盖），Phase 1 夺权时直接篡改 HAL 输出 */
void applyBeep(int16_t* buffer, size_t frames);

/** 线性交叉淡入淡出：渐出原音、渐入哔声，避免波形断裂 */
void applyCrossFade(int16_t* buffer, size_t frames, size_t crossFadeFrames = kCrossFadeFramesDefault);

/** 生成单帧正弦样本（内部用），phase 为弧度累加 */
float generateSineSample(int frameIndex, float phaseRad = 0.f);

}  // namespace silenceguard

#endif  // SILENCEGUARD_AUDIOINJECTOR_H
