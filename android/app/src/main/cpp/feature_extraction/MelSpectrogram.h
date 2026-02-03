// SilenceGuard Pro — Mel 谱特征提取 (NEXT_IMPROVEMENTS §3.1)
// 输入: PCM 16bit; 输出: Mel-spectrogram 80 dims, 10ms hop
// Phase 2: 接入真实 MFCC/Fbank 实现

#ifndef SILENCEGUARD_MELSPECTROGRAM_H
#define SILENCEGUARD_MELSPECTROGRAM_H

#include <cstddef>
#include <cstdint>

namespace silenceguard {

// §3.1: 80 Mel-bins, 10ms hop → 50 frames 对应 500ms
constexpr int kMelBins = 80;
constexpr int kMaxFrames = 50;
constexpr int kSampleRate = 16000;
constexpr int kHopMs = 10;
constexpr int kHopSamples = kSampleRate * kHopMs / 1000;  // 160

/** 将 PCM 帧转为 Mel 谱 [1, time_frames, 80]，供 TFLite 输入 */
int computeMelFrames(const int16_t* audio, size_t numFrames,
                      float* outMel, size_t maxOutFrames);

}  // namespace silenceguard

#endif  // SILENCEGUARD_MELSPECTROGRAM_H
