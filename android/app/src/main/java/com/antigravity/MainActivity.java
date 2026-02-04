package com.antigravity;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends AppCompatActivity {

    private static final String TAG = "SilenceGuard";
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private WebView webView;
    private Bridge bridge;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 1. 初始化 WebView 容器
        webView = new WebView(this);
        setContentView(webView);
        setupWebView();

        // 2. 部署 AI 模型文件 (从 assets -> filesDir)
        // C++ 层只能读取文件系统路径，无法直接读 assets
        deployModelAssets();

        // 3. 检查并申请权限 (录音是危险权限，必须动态申请)
        if (checkPermissions()) {
            initApp();
        } else {
            requestPermissions();
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return false;
            }
        });
    }

    private void initApp() {
        // 4. 只有权限到位了，才注入 Bridge 并加载页面
        // 因为 Bridge 加载时会触发 System.loadLibrary，进而可能启动音频线程
        bridge = new Bridge(webView);
        webView.addJavascriptInterface(bridge, "AntigravityBridge");
        
        // Pass the model path to C++
        String modelPath = new File(getFilesDir(), "model/encoder.tflite").getAbsolutePath();
        bridge.loadModel(modelPath);

        // 加载页面
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    // --- 关键修复 1: 部署模型文件 ---
    private void deployModelAssets() {
        // 将 assets/model/encoder.tflite 复制到 getFilesDir()/model/encoder.tflite
        try {
            File modelDir = new File(getFilesDir(), "model");
            if (!modelDir.exists()) modelDir.mkdirs();
            
            String[] models = {"encoder.tflite", "conf_matrix.json"}; // 你的文件名
            for (String fileName : models) {
                File outFile = new File(modelDir, fileName);
                // 仅当文件不存在或大小为0时复制 (生产环境可以加版本校验)
                if (!outFile.exists() || outFile.length() == 0) {
                    copyAsset("model/" + fileName, outFile);
                    Log.i(TAG, "Copied asset: " + fileName + " to " + outFile.getAbsolutePath());
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Model deployment failed", e);
        }
    }

    private void copyAsset(String assetPath, File outFile) throws IOException {
        try (InputStream in = getAssets().open(assetPath);
             OutputStream out = new FileOutputStream(outFile)) {
            byte[] buffer = new byte[1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        }
    }

    // --- 关键修复 2: 动态权限申请 ---
    private boolean checkPermissions() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) 
                == PackageManager.PERMISSION_GRANTED;
    }

    private void requestPermissions() {
        ActivityCompat.requestPermissions(this,
                new String[]{Manifest.permission.RECORD_AUDIO},
                PERMISSION_REQUEST_CODE);
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // 用户同意了，启动 App
                initApp();
            } else {
                Toast.makeText(this, "SilenceGuard 需要麦克风权限才能运行", Toast.LENGTH_LONG).show();
                // 即使拒绝也可以让它进 UI，但底层功能会失效
                initApp(); 
            }
        }
    }
}
