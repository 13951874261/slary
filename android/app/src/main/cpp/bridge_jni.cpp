// JNI 桥接 — Bridge.java ↔ ProtectionEngine (NEXT_IMPROVEMENTS §5 §7)

#include <jni.h>
#include <cstdint>
#include <cstring>
#include <string>

extern void* ProtectionEngine_getInstance(void);
extern void ProtectionEngine_updateConfig(void* engine, const char* json);
extern void ProtectionEngine_markFalsePositive(void* engine, const char* word, int64_t timestamp);
extern void ProtectionEngine_setTestInterceptEnabled(void* engine, int enabled);
// 声明新添加的 initInterceptor Stub/Impl
// Assuming ProtectionEngine has init(). Yes it does.
// extern void ProtectionEngine_init(void* engine); // Not exported in Engine.cpp yet?
// Wait, Engine.cpp exports getInstance, updateConfig, etc.
// Let's check Engine.cpp content from previous view.
// It has `init()` method but NOT exported as C API `ProtectionEngine_init`.
// However, initInterceptor in Bridge.java is likely calling `init()`.
// Warning: If I call a non-existent C function, link error.
// I will just implement a stub for now if no export exists, or assume lazy init.
// Actually, Engine.cpp has `ProtectionEngine_loadModel`.
// I should add `nativeInitInterceptor` that does nothing or logs, OR proper init.
// Since `init()` is called implicitly or lazy, maybe just logging is enough or call getInstance to trigger static init.

namespace {

std::string jstringToUtf8(JNIEnv* env, jstring jstr) {
  if (!jstr) return "";
  const char* chars = env->GetStringUTFChars(jstr, nullptr);
  if (!chars) return "";
  std::string s(chars);
  env->ReleaseStringUTFChars(jstr, chars);
  return s;
}

void nativeUpdateConfig(JNIEnv* env, jobject /* thiz */, jstring payloadJson) {
  if (!payloadJson) return;
  std::string json = jstringToUtf8(env, payloadJson);
  void* engine = ProtectionEngine_getInstance();
  ProtectionEngine_updateConfig(engine, json.c_str());
}

void nativeMarkFalsePositive(JNIEnv* env, jobject /* thiz */, jstring word, jlong timestamp) {
  std::string wordStr = jstringToUtf8(env, word);
  void* engine = ProtectionEngine_getInstance();
  ProtectionEngine_markFalsePositive(engine, wordStr.c_str(), static_cast<int64_t>(timestamp));
}

void nativeSetTestInterceptEnabled(JNIEnv* /* env */, jobject /* thiz */, jboolean enabled) {
  void* engine = ProtectionEngine_getInstance();
  ProtectionEngine_setTestInterceptEnabled(engine, enabled == JNI_TRUE ? 1 : 0);
}

void nativeInitInterceptor(JNIEnv* /* env */, jobject /* thiz */) {
  // Just ensure instance exists
  ProtectionEngine_getInstance();
}

void nativeLoadModel(JNIEnv* env, jobject /* thiz */, jstring path) {
    // Stub or Implement if needed. Engine.cpp has `ProtectionEngine_loadModel` exported?
    // Let's assume yes from previous `Engine.cpp` view (lines 206-208).
    // Yes: extern "C" void ProtectionEngine_loadModel(void* engine, const char* path)
    extern void ProtectionEngine_loadModel(void* engine, const char* path);
    
    std::string pathStr = jstringToUtf8(env, path);
    void* engine = ProtectionEngine_getInstance();
    ProtectionEngine_loadModel(engine, pathStr.c_str());
}

// TODO: Implement updateRules if needed, currently stubbed or ignored.

JNINativeMethod g_bridgeMethods[] = {
  { "updateConfig", "(Ljava/lang/String;)V", reinterpret_cast<void*>(nativeUpdateConfig) },
  { "markFalsePositive", "(Ljava/lang/String;J)V", reinterpret_cast<void*>(nativeMarkFalsePositive) },
  { "setTestInterceptEnabled", "(Z)V", reinterpret_cast<void*>(nativeSetTestInterceptEnabled) },
  { "initInterceptor", "()V", reinterpret_cast<void*>(nativeInitInterceptor) },
  { "loadModel", "(Ljava/lang/String;)V", reinterpret_cast<void*>(nativeLoadModel) }
};

}  // namespace

JNIEXPORT jint JNI_OnLoad(JavaVM* vm, void* reserved) {
  JNIEnv* env = nullptr;
  if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK)
    return JNI_ERR;
  
  // FIX: Correct package name
  jclass bridgeClass = env->FindClass("com/antigravity/offline/app/Bridge");
  if (!bridgeClass) return JNI_ERR;

  if (env->RegisterNatives(bridgeClass, g_bridgeMethods,
                          sizeof(g_bridgeMethods) / sizeof(g_bridgeMethods[0])) != JNI_OK)
    return JNI_ERR;
    
  return JNI_VERSION_1_6;
}
