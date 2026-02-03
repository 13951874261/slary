#include "RingBuffer.h"
#include <algorithm>
#include <cstring>

namespace silenceguard {

RingBuffer::RingBuffer() { std::memset(buffer_, 0, sizeof(buffer_)); }

RingBuffer::~RingBuffer() = default;

void RingBuffer::write(const int16_t* data, size_t frames) {
  if (frames == 0) return;
  for (size_t i = 0; i < frames; ++i) {
    buffer_[write_pos_ % kRingCapacityFrames] = data[i];
    write_pos_++;
  }
  size_ = std::min(size_ + frames, kRingCapacityFrames);
}

size_t RingBuffer::read(int16_t* out, size_t frames) {
  size_t read_pos = write_pos_ >= size_ ? write_pos_ - size_ : 0;
  size_t n = std::min(frames, size_);
  for (size_t i = 0; i < n; ++i) {
    out[i] = buffer_[(read_pos + i) % kRingCapacityFrames];
  }
  return n;
}

int16_t* RingBuffer::ptrAt(size_t frameOffset) {
  size_t idx = (write_pos_ + kRingCapacityFrames - frameOffset) % kRingCapacityFrames;
  return &buffer_[idx];
}

}  // namespace silenceguard
