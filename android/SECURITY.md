# 安全与对抗策略 (NEXT_IMPROVEMENTS §9)

为防止直播 App 检测到 Hook 或注入行为，Release 构建需遵循以下措施。

## 1. 动态库伪装 (Library Camouflage)

- 将核心 SO 命名为混淆名称，例如：
  - `libsoundfx_processing.so`
  - `libandroid_runtime_opt.so`
- 在 `app/build.gradle` 的 `defaultConfig.ndk` 中可配置 `abiFilters`；若需重命名产物，可在 CMake 中设置 `OUTPUT_NAME` 或构建后重命名。

## 2. 符号剥离 (Strip Symbols)

- 构建 Release 包时必须执行 `strip`，移除 `AudioInjector`、`Hook`、`ProtectionEngine` 等敏感符号。
- 在 `app/build.gradle` 的 `android.buildTypes.release` 中可启用：
  - `ndk.debugSymbolLevel 'SYMBOL_TABLE'` 或发布时仅上传带符号的 native 符号包；
  - 或构建后对 `*.so` 执行：`strip --strip-unneeded <so>`。
- 使用 Android Gradle Plugin 时，Release 默认会 strip；若使用自定义 CMake 安装，需在 CMake 中为 Release 添加 `-DCMAKE_BUILD_TYPE=Release` 并确保安装前 strip。

## 3. 内存隐藏

- 加载 TFLite 模型后，对模型内存页执行：
  - `madvise(ptr, size, MADV_DONTDUMP)`（Linux/Android）防止被转储分析。
- 在 Phase 2 的 `TFLiteRunner::loadModel` 实现中接入上述调用。

## 4. SELinux 规避

- 若使用 HAL Wrapper 方案，尽可能复用原有 HAL 的安全上下文 (Security Context)，避免引入新域导致策略拒绝。

---

以上为文档化要求；具体实现需在 Phase 1/2 接入真实 HAL 与 TFLite 时完成。
