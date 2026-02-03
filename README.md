# SilenceGuard Pro — 静默卫士

> 基于 **NEXT_IMPROVEMENTS.md** 的 Hybrid 方案：Web 战术指挥终端 + Android Native 音频拦截与变体匹配。

## 快速开始

**环境**：Node.js（建议 18+）

1. 安装依赖：`npm install`
2. 本地开发：`npm run dev`，浏览器打开提示的地址
3. 构建 Web：`npm run build`，产物在 `dist/`
4. 部署到 Android：`npm run build:android`（先构建再复制到 `android/app/src/main/assets/www/`）

## 脚本说明

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | TypeScript 检查 + Vite 构建，输出到 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run deploy:android` | 将 `dist/` 复制到 `android/.../assets/www/`（需先 build） |
| `npm run build:android` | 先 build 再 deploy:android |

## Android 应用

- 工程目录：`android/`
- 运行方式：用 Android Studio 打开 `android/`，或在该目录执行 `./gradlew assembleDebug`（需 Android SDK + NDK）
- Web 加载：MainActivity 加载 `file:///android_asset/www/index.html`，并注入 `AntigravityBridge`
- 详细说明：[android/README.md](android/README.md)

## 文档与路线图

- **[NEXT_IMPROVEMENTS.md](../NEXT_IMPROVEMENTS.md)** — 技术演进与 Phase 0–3、§9 安全与对抗
- **[IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)** — 当前实现状态与待办（对照 NEXT_IMPROVEMENTS）

## 技术要点

- **Phase 0**：Web 端变体相似度（拼音 + 编辑距离）、Bridge 协议、相似度阈值、策略下发与误报标记
- **Phase 1**：Native 骨架（Engine、RingBuffer、injector、hook）、JNI 桥接、测试拦截 POC
- **Phase 2**：feature_extraction / inference 占位（Mel、TFLite）、Engine 配置解析
- **Phase 3**：时间机器占位（RingBuffer 回溯 + processWithRingBuffer）

---

*静默卫士 Pro | Sovereign Obsidian*
