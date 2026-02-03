// SilenceGuard Pro — applyBeep / applyCrossFade 实现 (NEXT_IMPROVEMENTS §4.2)

#include "AudioInjector.h"
#include <cmath>
#include <algorithm>

namespace silenceguard {

namespace {
constexpr float kPi = 3.14159265358979f;
constexpr float kAmplitude = 0.4f;  // 避免削波
}  // namespace

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
