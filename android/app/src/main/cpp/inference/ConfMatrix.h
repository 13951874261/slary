// SilenceGuard Pro — 变体混淆矩阵 (NEXT_IMPROVEMENTS §3.2)
// conf_matrix.json: "s" -> ["s","sh","x"], "yi" -> ["yi","wei","yu"], ...
// Phase 2: 接入真实 JSON 解析与 DTW 相似度

#ifndef SILENCEGUARD_CONFMATRIX_H
#define SILENCEGUARD_CONFMATRIX_H

#include <cstddef>
#include <cstdint>

namespace silenceguard {

/** 从 assets 或路径加载 conf_matrix.json，Phase 2 实现；当前占位返回 false */
bool loadConfMatrix(const char* path);

/** 获取音素变体列表：target 为 key（如 "s"），outVariants 写入最多 maxOut 个变体；返回写入数量。占位返回 0 */
int getPhonemeVariants(const char* target, const char** outVariants, int maxOut);

/** 音素序列相似度 (DTW)，Phase 2 实现；占位返回 0.f */
float calculatePhonemeSimilarity(const float* posteriorsA, int lenA,
                                 const float* posteriorsB, int lenB);

}  // namespace silenceguard

#endif  // SILENCEGUARD_CONFMATRIX_H
