// C 接口供 hook 层调用 (NEXT_IMPROVEMENTS §2.1 in_read)

#include "AudioInjector.h"

extern "C" {

void AudioInjector_applyBeep(int16_t* buffer, size_t frames) {
  silenceguard::applyBeep(buffer, frames);
}

void AudioInjector_applyCrossFade(int16_t* buffer, size_t frames, size_t crossFadeFrames) {
  silenceguard::applyCrossFade(buffer, frames, crossFadeFrames);
}

/** Phase 3 时间机器：对 ring buffer 回溯区间先交叉淡出再哔声 (§4.1) */
void AudioInjector_processWithRingBuffer(int16_t* buffer, size_t frames, size_t crossFadeFrames) {
  if (crossFadeFrames > 0 && crossFadeFrames <= frames)
    silenceguard::applyCrossFade(buffer, crossFadeFrames, crossFadeFrames);
  if (frames > crossFadeFrames)
    silenceguard::applyBeep(buffer + crossFadeFrames, frames - crossFadeFrames);
  else if (frames > 0)
    silenceguard::applyBeep(buffer, frames);
}

}  // extern "C"
