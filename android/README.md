# SilenceGuard Pro — Android Native (Phase 1 骨架)

按 **NEXT_IMPROVEMENTS.md §6** 搭建的 Hybrid 工程骨架，含可运行应用壳。

## 运行方式

1. 用 Android Studio 打开本目录，或命令行：`./gradlew assembleDebug` 或 Windows 下 `gradlew.bat assembleDebug`（需已安装 Android SDK + NDK）。
2. Web UI：在 **silenceguard-pro 根目录** 执行 `npm run build:android`（或先 `npm run build` 再 `npm run deploy:android`），会将 `dist/` 自动复制到 `app/src/main/assets/www/`。
3. MainActivity 已启用 WebView、注入 `AntigravityBridge`，加载 `file:///android_asset/www/index.html`。

## Gradle 与 NDK 说明

- **gradlew 生成**：若目录下无 `gradlew` / `gradlew.bat`，可用 Android Studio 打开本目录并 Sync，或在本目录执行 `gradle wrapper`（需系统已安装 Gradle），以生成 wrapper 脚本。
- **环境要求**：Android SDK（建议 API 24+）、NDK（CMake 3.22.1+）、JDK 17（与 AGP 8.x 匹配）。Android Studio 安装时勾选 NDK 与 CMake 即可。
- **常见问题**：若 CMake 报错，检查 `app/build.gradle` 中 `externalNativeBuild.cmake.path` 指向 `src/main/cpp/CMakeLists.txt`；若 JNI 找不到符号，确认 `silenceguard_native` 已链接 core、injector、hook、feature_extraction、inference。

## 目录结构

- `app/src/main/java/com/antigravity/MainActivity.java` — 单 Activity，WebView + Bridge 注入
- `app/src/main/assets/www/` — 放置 Web 构建产物（index.html + 静态资源）
- `app/src/main/cpp/` — Native 核心
  - `core/` — Engine、RingBuffer（调度与环形缓冲）
  - `feature_extraction/` — MFCC/Fbank（Phase 2）
  - `inference/` — TFLite 推理（Phase 2）
  - `hook/` — HAL Wrapper / PLT Hook（Phase 1）
  - `injector/` — 哔声与 Cross-fade（Phase 3）
- `app/src/main/java/com/antigravity/Bridge.java` — Web ↔ Native 通信

## 集成方式

1. 将本目录作为 **Android 应用模块** 放入现有工程，或新建 Android 工程并引用本模块。
2. 在 `app/build.gradle` 中启用 NDK 并指定 `CMakeLists.txt` 路径（指向 `src/main/cpp/CMakeLists.txt`）。
3. WebView 加载前端后，`addJavascriptInterface(new Bridge(webView), "AntigravityBridge")`。Web 端调用：
   - `AntigravityBridge.emit('UPDATE_CONFIG', JSON.stringify(payload))` — 配置下发；
   - `AntigravityBridge.emit('MARK_FALSE_POSITIVE', JSON.stringify({ word, timestamp }))` — 误报标记。
   Java Bridge 的 `emit(action, payloadJson)` 会转调 `onMessage` 并进入 JNI：`nativeUpdateConfig` / `nativeMarkFalsePositive`。
   Native 拦截时由 C++ 层通过 JNI 回调 Java，调用 `Bridge.postRiskIntercepted(...)` 向 Web 发送 `native_INTERCEPT`。

## 已实现骨架

- **core/** — `ProtectionEngine_setTestInterceptEnabled(engine, 1)` 开启后，约 100ms 内 `shouldIntercept()` 返回 true，便于 POC 验证 hook → injector 链路。
- **injector/** — `applyBeep`、`applyCrossFade`（§4.2）；Phase 3 时间机器：`AudioInjector_processWithRingBuffer(buffer, frames, crossFadeFrames)`。
- **hook/** — `audio_hw_wrapper.c` 占位：`silenceguard_in_read_proxy` 流程（pushToBuffer → shouldIntercept → applyBeep / processWithRingBuffer）。
- **安全 §9** — 见 `SECURITY.md`；Release 构建已配置 `ndk.debugSymbolLevel 'symbol_table'`。

## Phase 2 骨架（已就绪）

- **feature_extraction/** — `MelSpectrogram.h/cpp`：`computeMelFrames(PCM → Mel [1,50,80])` 占位，Phase 2 接入 Fbank。
- **inference/** — `TFLiteRunner.h/cpp`、`inference_capi.cpp`：`loadModel` / `run(melInput, posteriors)` 占位；`ConfMatrix.h/cpp`、`conf_matrix_capi.cpp`：`loadConfMatrix` / `getPhonemeVariants` / `calculatePhonemeSimilarity` 占位（§3.2）。

## Phase 1 / Phase 2 下一步

- Phase 1：在 `hook/` 接入真实 HAL 或 AudioFlinger Hook，在 `in_read` / `getNextBuffer` 处调用 `ProtectionEngine_*` 与 `AudioInjector_applyBeep`。
- Phase 2：接入 TFLite 依赖，实现 `TFLiteRunner::loadModel` / `run`；实现 `computeMelFrames`；Engine 在 `pushToBuffer` 后调用 feature_extraction → inference，用 `shouldIntercept()` 驱动拦截。
