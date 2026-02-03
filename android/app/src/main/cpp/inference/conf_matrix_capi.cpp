// C 接口供 Engine / 变体匹配调用 (NEXT_IMPROVEMENTS §3.2)

#include "ConfMatrix.h"

extern "C" {

int ConfMatrix_load(const char* path) {
  return silenceguard::loadConfMatrix(path) ? 1 : 0;
}

int ConfMatrix_getPhonemeVariants(const char* target, const char** outVariants, int maxOut) {
  return silenceguard::getPhonemeVariants(target, outVariants, maxOut);
}

float ConfMatrix_calculatePhonemeSimilarity(const float* a, int lenA, const float* b, int lenB) {
  return silenceguard::calculatePhonemeSimilarity(a, lenA, b, lenB);
}

}  // extern "C"
