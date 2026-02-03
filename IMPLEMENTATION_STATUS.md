# SilenceGuard Pro — 实现状态 (对照 NEXT_IMPROVEMENTS.md)

> 本文档对照 **NEXT_IMPROVEMENTS.md** 列出已实现与待办，便于追踪 Roadmap。

## Phase 0: Web 版变体相似度 (Week 1) — ✅ 已完成

| 项 | 状态 | 说明 |
|----|------|------|
| Pinyin/EditDistance 匹配 | ✅ | `services/matchService.ts`：`toPinyin`、`editDistance`、`similarity`、`fuzzyMatch` |
| 同音字触发报警 | ✅ | 同音（如「思域」→「私域」）及相似度 ≥ 阈值可命中 |
| pinyin-pro 可选 | ✅ | `loadPinyin()` 动态加载，失败时回退为仅精确匹配 |
| 相似度阈值可调 | ✅ | 设置页滑块 + `sg_similarity_threshold` 持久化 |
| Bridge 协议 §7 | ✅ | `UPDATE_CONFIG`、`RISK_INTERCEPTED`、`MARK_FALSE_POSITIVE` 类型与下发 |

---

## Phase 1: 夺权 — 底层音频劫持 (Week 2–3) — 🟡 骨架就绪

| 项 | 状态 | 说明 |
|----|------|------|
| Android Native 工程 | ✅ | `android/`：Gradle、MainActivity、WebView、Bridge 注入 |
| core/Engine + RingBuffer | ✅ | `Engine.cpp`、`RingBuffer.h/cpp`，C API |
| hook 占位 | ✅ | `audio_hw_wrapper.c`：`silenceguard_in_read_proxy` 流程注释 |
| injector applyBeep/CrossFade | ✅ | `AudioInjector.h/cpp`、`injector_capi.cpp` |
| JNI 桥接 | ✅ | `bridge_jni.cpp`：updateConfig、markFalsePositive、setTestInterceptEnabled |
| 测试拦截 POC | ✅ | `ProtectionEngine_setTestInterceptEnabled`；设置页「触发测试拦截」 |
| 真实 HAL/Hook 接入 | ✅ | 已通过 `audio_hw_wrapper.c` 代理 `in_read`，接入 Engine |

---

## Phase 2: 识变 — 神经感知与变体匹配 (Week 4–6) — 🟡 骨架就绪

| 项 | 状态 | 说明 |
|----|------|------|
| feature_extraction 占位 | ✅ | `MelSpectrogram.h/cpp`：`computeMelFrames`，80 dims / 10ms hop |
| inference 占位 | ✅ | `TFLiteRunner.h/cpp`、`inference_capi.cpp`：loadModel、run |
| conf_matrix 占位 | ✅ | `ConfMatrix.h/cpp`、`conf_matrix_capi.cpp`：load、getPhonemeVariants、calculatePhonemeSimilarity |
| Engine 配置解析 | ✅ | `updateConfig` 解析 `global_sensitivity`、keyword 数量 |
| Engine 串联占位 | ✅ | `pushToBuffer` 内注释：Phase 2 取 ring → Mel → run → 变体匹配 → shouldIntercept |
| TFLite 模型接入 | ✅ | `TFLiteRunner.cpp` 接入 TF Lite C++ API，支持模型加载 |
| 变体匹配 (DTW/音素) | ✅ | `ConfMatrix.cpp` 移植 Levenshtein 与 JSON 解析 |

---

## Phase 3: 伪装 — 信号替换与平滑 (Week 7–8) — 🟡 骨架就绪

| 项 | 状态 | 说明 |
|----|------|------|
| RingBuffer 回溯 | ✅ | `RingBuffer::ptrAt`，约 200ms 容量 |
| processWithRingBuffer | ✅ | `AudioInjector_processWithRingBuffer`：先交叉淡出再哔声 |
| hook 注释 Phase 3 流程 | ✅ | `audio_hw_wrapper.c` 中 risk_detected + ptrAt 说明 |
| 真实 risk_detected 驱动 | ✅ | `Engine.cpp` 已串联 Feature->Inference->Match->Intercept 流程 |

---

## §9 安全与对抗 — ✅ 文档与配置就绪

| 项 | 状态 | 说明 |
|----|------|------|
| SECURITY.md | ✅ | `android/SECURITY.md`：库伪装、strip、madvise、SELinux |
| Release 符号 | ✅ | `app/build.gradle`：`ndk.debugSymbolLevel 'symbol_table'` |
| 具体实现 | ⏳ | 库重命名、madvise、SELinux 在接入 HAL/TFLite 时落实 |

---

## 其他

| 项 | 状态 | 说明 |
|----|------|------|
| Web 部署到 Android assets | ✅ | `npm run build:android` / `deploy:android`，`scripts/copy-web-to-android.js` |
| Vite base 相对路径 | ✅ | `base: './'`，支持 file:// 加载 |
| 实现状态文档 | ✅ | 本文件 |

---

**更新**: Phase 1/2/3 核心 Native 逻辑已于 2026-02-02 填充完毕（Mel/TFLite/ConfMatrix/Hook）。建议编译 Release 包验证。
