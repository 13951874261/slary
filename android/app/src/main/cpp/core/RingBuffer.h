// SilenceGuard Pro — 环形缓冲区 (NEXT_IMPROVEMENTS §4.1)
// 用于 "时间机器"：回溯修改已发生的违规起始音节

#ifndef SILENCEGUARD_RINGBUFFER_H
#define SILENCEGUARD_RINGBUFFER_H

#include <cstddef>
#include <cstdint>

namespace silenceguard {

// 约 200ms @ 16kHz mono 16bit → 6400 样本
constexpr size_t kRingCapacityFrames = 6400;

class RingBuffer {
 public:
  RingBuffer();
  ~RingBuffer();

  void write(const int16_t* data, size_t frames);
  size_t read(int16_t* out, size_t frames);
  // 获取某时间偏移处的指针，用于 applyCrossFade / applySineWave
  int16_t* ptrAt(size_t frameOffset);

 private:
  int16_t buffer_[kRingCapacityFrames];
  size_t write_pos_ = 0;
  size_t size_ = 0;
};

}  // namespace silenceguard

#endif  // SILENCEGUARD_RINGBUFFER_H
