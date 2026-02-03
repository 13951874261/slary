// C 接口供 Engine 调用 (Phase 2 识变)

#include "TFLiteRunner.h"
#include <vector>

static silenceguard::TFLiteRunner s_runner;

extern "C" {

int TFLiteRunner_loadModel(const char* path) {
  return s_runner.loadModel(path) ? 1 : 0;
}

int TFLiteRunner_run(const float* melInput, size_t melLen, float* outPosteriors, size_t outLen) {
  std::vector<float> posteriors;
  if (!s_runner.run(melInput, melLen, &posteriors)) return 0;
  size_t n = (posteriors.size() < outLen) ? posteriors.size() : outLen;
  for (size_t i = 0; i < n; ++i) outPosteriors[i] = posteriors[i];
  return static_cast<int>(n);
}

int TFLiteRunner_isLoaded(void) {
  return s_runner.isLoaded() ? 1 : 0;
}

}  // extern "C"
