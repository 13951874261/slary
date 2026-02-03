package com.antigravity;

import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import org.json.JSONObject;

/**
 * JNI/Web Bridge — NEXT_IMPROVEMENTS §5.1 §7
 * 接收 Native 的 RISK_INTERCEPTED 上报给 Web；
 * 接收 Web 的 UPDATE_CONFIG / MARK_FALSE_POSITIVE 下发到 Native。
 */
public class Bridge {

    static {
        System.loadLibrary("silenceguard_native");
    }

    private final WebView webView;

    public Bridge(WebView webView) {
        this.webView = webView;
    }

    /** JNI: 配置下发 (UPDATE_CONFIG payload) */
    private static native void nativeUpdateConfig(String payloadJson);

    /** JNI: 误报标记 (MARK_FALSE_POSITIVE) */
    private static native void nativeMarkFalsePositive(String word, long timestamp);

    /** JNI: POC 测试拦截 — 接下来约 100ms 内 shouldIntercept() 返回 true */
    private static native void nativeSetTestInterceptEnabled(boolean enabled);

    /**
     * Web 端通过 AntigravityBridge.on('INTERCEPT', cb) 监听。
     * Native 拦截成功时调用此方法，向 Web 注入 RISK_INTERCEPTED。
     */
    public void postRiskIntercepted(String word, long timestamp, double confidence, String hookType) {
        if (webView == null) return;
        try {
            JSONObject detail = new JSONObject();
            detail.put("word", word);
            detail.put("timestamp", timestamp);
            detail.put("confidence", confidence);
            detail.put("hook_type", hookType != null ? hookType : "HAL_VIRTUAL_DEVICE");
            String json = detail.toString().replace("\\", "\\\\").replace("'", "\\'");
            String script = "if (window.AntigravityBridge) { var d = JSON.parse('" + json + "'); window.dispatchEvent(new CustomEvent('native_INTERCEPT', { detail: d })); }";
            webView.post(() -> webView.evaluateJavascript(script, null));
        } catch (Exception e) {
            // ignore
        }
    }

    /** Web 调用此方法向 Native 下发：emit(action, JSON.stringify(payload)) */
    @JavascriptInterface
    public void emit(String action, String payloadJson) {
        onMessage(action, payloadJson);
    }

    @JavascriptInterface
    public void onMessage(String action, String payloadJson) {
        if (payloadJson == null) payloadJson = "{}";
        if ("UPDATE_CONFIG".equals(action)) {
            nativeUpdateConfig(payloadJson);
        } else if ("TEST_INTERCEPT".equals(action)) {
            boolean enabled = "true".equalsIgnoreCase(payloadJson != null ? payloadJson.trim() : "");
            nativeSetTestInterceptEnabled(enabled);
        } else if ("MARK_FALSE_POSITIVE".equals(action)) {
            try {
                JSONObject o = new JSONObject(payloadJson);
                String word = o.optString("word", "");
                long timestamp = o.optLong("timestamp", System.currentTimeMillis());
                nativeMarkFalsePositive(word, timestamp);
            } catch (Exception e) {
                nativeMarkFalsePositive("", System.currentTimeMillis());
            }
        }
    }
}
