# SilenceGuard Pro — Native Core (NEXT_IMPROVEMENTS §6)
# Phase 1: 夺权 / Phase 2: 识变 / Phase 3: 伪装

cmake_minimum_required(VERSION 3.22.1)
project("silenceguard_native")

# 核心引擎 (Sovereign Core)
add_library(core STATIC
  core/Engine.cpp
  core/RingBuffer.cpp
)
target_include_directories(core PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# Injector — 音频合成与 Cross-fade (NEXT_IMPROVEMENTS §4.2)
add_library(injector STATIC
  injector/AudioInjector.cpp
  injector/injector_capi.cpp
)
target_include_directories(injector PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/injector)

# Hook — HAL 占位 (Phase 1 接入真实 HAL 后替换)
add_library(hook STATIC hook/audio_hw_wrapper.c)
target_include_directories(hook PUBLIC ${CMAKE_CURRENT_SOURCE_DIR})

# Phase 2: 特征提取 (NEXT_IMPROVEMENTS §3.1)
add_library(feature_extraction STATIC
  feature_extraction/MelSpectrogram.cpp
)
target_include_directories(feature_extraction PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/feature_extraction)

# Phase 2: TFLite 推理占位 + 变体混淆矩阵占位 (§3.2)
add_library(inference STATIC
  inference/TFLiteRunner.cpp
  inference/ConfMatrix.cpp
  inference/inference_capi.cpp
  inference/conf_matrix_capi.cpp
)
target_include_directories(inference PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/inference)

# 主 JNI 库 (与 Bridge.java 对接)：JNI_OnLoad 在 bridge_jni.cpp
add_library(silenceguard_native SHARED bridge_jni.cpp)

# Find TensorFlow Lite package (provided by Prefab)
find_package(TensorFlowLite REQUIRED)

target_link_libraries(silenceguard_native 
    core 
    injector 
    hook 
    feature_extraction 
    inference
    tensorflow::tensorflowlite
)
