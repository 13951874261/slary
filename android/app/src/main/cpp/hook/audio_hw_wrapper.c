// SilenceGuard Pro — HAL 层占位 (NEXT_IMPROVEMENTS §2.1)
// Phase 1: 真实 HAL 替换/代理后，在 in_read 中接入以下流程

#include <stddef.h>
#include <stdint.h>
#include <sys/types.h>

// 外部 C 接口：core/Engine.cpp, injector/injector_capi.cpp
extern void* ProtectionEngine_getInstance(void);
extern void ProtectionEngine_pushToBuffer(void* engine, const void* buffer, size_t bytes);
extern int ProtectionEngine_shouldIntercept(void* engine);
extern void ProtectionEngine_setTestInterceptEnabled(void* engine, int enabled);
extern void AudioInjector_applyBeep(int16_t* buffer, size_t frames);
extern void AudioInjector_processWithRingBuffer(int16_t* buffer, size_t frames, size_t crossFadeFrames);

// 占位：原始 HAL in_read 的签名（实际由厂商 audio.primary 实现）
// static ssize_t original_in_read(struct audio_stream_in* stream, void* buffer, size_t bytes);

// 代理 in_read：数据进入直播 App 前在此劫持
// 1. 调用原始 HAL 读取麦克风
// 2. 送入 ProtectionEngine 分析
// 3. 若需阻断则写入哔声（或 Phase 3：从 RingBuffer 回溯后 processWithRingBuffer）
// POC 测试：先调用 ProtectionEngine_setTestInterceptEnabled(engine, 1)，再读一帧即可触发哔声
// 真实 HAL 代理实现：数据进入直播 App 前在此劫持
// 1. 调用原始 HAL 读取麦克风 (在真实部署中，这里会调用 dlsym 获取的 original_read)
// 2. 送入 ProtectionEngine 分析
// 3. 若需阻断则写入哔声
ssize_t silenceguard_in_read_proxy(void* engine, void* buffer, size_t bytes) {
    if (!engine || !buffer) return -1;
    
    // 步骤 1: 模拟调用原始 HAL (在真实场景中这里是 `original_stream->read(...)`)
    // 这里假设 buffer 已经被系统填充了 PCM 数据（例如全是白噪声或空数据）
    // 为了 POC，我们将 buffer 视为有效数据直接处理
    ssize_t ret = bytes; // 假设读取成功
    
    // 步骤 2: 将数据送入分析引擎 (非阻塞，零拷贝)
    ProtectionEngine_pushToBuffer(engine, buffer, (size_t)ret);
    
    // 步骤 3: 检查是否有阻断指令
    // Phase 2: 由 TFLite + 变体匹配结果驱动 shouldIntercept
    // Phase 1 POC: 由 setTestInterceptEnabled 强制驱动
    if (ProtectionEngine_shouldIntercept(engine)) {
        size_t frames = (size_t)ret / sizeof(int16_t);
        // 执行实时篡改：写入哔声
        // 在 Phase 3 中，这里会改为 AudioInjector_processWithRingBuffer 调用以实现回溯平滑
        AudioInjector_applyBeep((int16_t*)buffer, frames);
    }
    
    return ret;
}
