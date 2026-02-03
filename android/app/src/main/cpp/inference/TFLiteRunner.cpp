// SilenceGuard Pro — TFLite 推理封装 (Phase 2 真实实现)

#include "TFLiteRunner.h"
#include <tensorflow/lite/interpreter.h>
#include <tensorflow/lite/kernels/register.h>
#include <tensorflow/lite/model.h>
#include <tensorflow/lite/tools/gen_op_registration.h>
#include <iostream>
#include <memory> 

namespace silenceguard {

// Internal state to hide TFLite headers from the .h
struct TFLiteContext {
    std::unique_ptr<tflite::FlatBufferModel> model;
    std::unique_ptr<tflite::Interpreter> interpreter;
};

// Global context (Singleton-like for simplicity in this file scope)
static std::unique_ptr<TFLiteContext> g_ctx;

bool TFLiteRunner::loadModel(const char* path) {
    if (!g_ctx) g_ctx = std::make_unique<TFLiteContext>();
    
    // Load model
    g_ctx->model = tflite::FlatBufferModel::BuildFromFile(path);
    if (!g_ctx->model) {
        std::cerr << "[SilenceGuard] Failed to load model: " << path << std::endl;
        loaded_ = false;
        return false;
    }

    // Build interpreter
    tflite::ops::builtin::BuiltinOpResolver resolver;
    tflite::InterpreterBuilder builder(*g_ctx->model, resolver);
    builder(&g_ctx->interpreter);

    if (!g_ctx->interpreter) {
        std::cerr << "[SilenceGuard] Failed to build interpreter" << std::endl;
        loaded_ = false;
        return false;
    }

    // Allocate tensors
    if (g_ctx->interpreter->AllocateTensors() != kTfLiteOk) {
        std::cerr << "[SilenceGuard] Failed to allocate tensors" << std::endl;
        loaded_ = false;
        return false;
    }

    // Verify input shape (Expect [1, 50, 80])
    // Note: In real production code, add stricter shape checks here.
    
    loaded_ = true;
    std::cout << "[SilenceGuard] TFLite model loaded successfully: " << path << std::endl;
    return true;
}

bool TFLiteRunner::run(const float* melInput, size_t melLen, std::vector<float>* posteriors) {
    if (!loaded_ || !g_ctx || !g_ctx->interpreter) return false;
    if (!melInput || !posteriors) return false;

    // 1. Fill Input Tensor
    float* inputTensor = g_ctx->interpreter->typed_input_tensor<float>(0);
    if (!inputTensor) return false;
    
    // Safety check for input size
    // Assumes input 0 is the Mel-spectrogram
    size_t inputBytes = g_ctx->interpreter->input_tensor(0)->bytes;
    if (melLen * sizeof(float) > inputBytes) {
        // Truncate if too long (or error out)
        std::memcpy(inputTensor, melInput, inputBytes);
    } else {
        std::memcpy(inputTensor, melInput, melLen * sizeof(float));
    }

    // 2. Run Inference
    if (g_ctx->interpreter->Invoke() != kTfLiteOk) {
        std::cerr << "[SilenceGuard] Inference failed" << std::endl;
        return false;
    }

    // 3. Read Output
    float* outputTensor = g_ctx->interpreter->typed_output_tensor<float>(0);
    if (!outputTensor) return false;

    // Copy to vector
    int outputElements = g_ctx->interpreter->output_tensor(0)->bytes / sizeof(float);
    posteriors->resize(outputElements);
    std::memcpy(posteriors->data(), outputTensor, outputElements * sizeof(float));

    return true;
}

}  // namespace silenceguard
