package com.antigravity;

import android.annotation.SuppressLint;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

/**
 * SilenceGuard Pro — 战术指挥终端 (NEXT_IMPROVEMENTS §5)
 * 加载 Web UI 并注入 Bridge，实现 Web ↔ Native 双向通信。
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        // 注入 Bridge：Web 通过 AntigravityBridge.emit / .on 与 Native 通信
        Bridge bridge = new Bridge(webView);
        webView.addJavascriptInterface(bridge, "AntigravityBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return false;
            }
        });

        // 优先加载 assets/www（将 Web 构建产物复制到 app/src/main/assets/www/）
        // 若不存在则加载占位页
        webView.loadUrl("file:///android_asset/www/index.html");
    }
}
