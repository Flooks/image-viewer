package com.redditimageviewer.app;

import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private FrameLayout lockOverlay;
    private boolean isLocked = false;
    private boolean biometricAvailable = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // FLAG_SECURE prevents screenshots and hides content in app switcher
        getWindow().setFlags(
                WindowManager.LayoutParams.FLAG_SECURE,
                WindowManager.LayoutParams.FLAG_SECURE
        );

        setContentView(R.layout.activity_main);

        webView = findViewById(R.id.webview);
        lockOverlay = findViewById(R.id.lock_overlay);

        WebView.setWebContentsDebuggingEnabled(true);
        webView.setBackgroundColor(Color.WHITE);

        // Check if biometric auth is available
        BiometricManager biometricManager = BiometricManager.from(this);
        int canAuth = biometricManager.canAuthenticate(
                BiometricManager.Authenticators.BIOMETRIC_WEAK
                        | BiometricManager.Authenticators.DEVICE_CREDENTIAL
        );
        biometricAvailable = (canAuth == BiometricManager.BIOMETRIC_SUCCESS);

        configureWebView();
    }

    private void showLockScreen() {
        isLocked = true;
        lockOverlay.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
    }

    /** Called when user taps the lock overlay to retry authentication */
    public void onLockOverlayTap(View view) {
        promptBiometric();
    }

    private void unlock() {
        isLocked = false;
        lockOverlay.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }

    private void promptBiometric() {
        if (!biometricAvailable) {
            unlock();
            return;
        }

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock Reddit Image Viewer")
                .setSubtitle("Authenticate to continue")
                .setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_WEAK
                                | BiometricManager.Authenticators.DEVICE_CREDENTIAL
                )
                .build();

        BiometricPrompt biometricPrompt = new BiometricPrompt(this,
                ContextCompat.getMainExecutor(this),
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        super.onAuthenticationSucceeded(result);
                        unlock();
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        super.onAuthenticationError(errorCode, errString);
                        // User cancelled or error — keep locked, let them tap to retry
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        super.onAuthenticationFailed();
                        // Wrong fingerprint — prompt stays open for retry
                    }
                });

        biometricPrompt.authenticate(promptInfo);
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("appassets.androidplatform.net".equals(host)) {
                    String path = uri.getPath();
                    if (path != null && path.startsWith("/reddit-api/")) {
                        return proxyRedditRequest(request, path.substring("/reddit-api/".length()), uri.getQuery());
                    }
                    return assetLoader.shouldInterceptRequest(uri);
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String host = uri.getHost();
                if ("appassets.androidplatform.net".equals(host)) {
                    return false;
                }
                Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                startActivity(intent);
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage consoleMessage) {
                android.util.Log.d("WebView", consoleMessage.message()
                        + " -- From line " + consoleMessage.lineNumber()
                        + " of " + consoleMessage.sourceId());
                return true;
            }
        });

        webView.loadUrl("https://appassets.androidplatform.net/assets/web/index.html");
    }

    private WebResourceResponse proxyRedditRequest(String path, String query) {
        return proxyRedditRequest(null, path, query);
    }

    private WebResourceResponse proxyRedditRequest(WebResourceRequest request, String path, String query) {
        HttpURLConnection connection = null;
        try {
            // Determine if this is an OAuth request (path starts with oauth/)
            boolean isOAuth = path.startsWith("oauth/");
            String baseUrl = isOAuth ? "https://oauth.reddit.com/" : "https://www.reddit.com/";
            String cleanPath = isOAuth ? path.substring("oauth/".length()) : path;
            
            String targetUrl = baseUrl + cleanPath;
            if (query != null && !query.isEmpty()) {
                targetUrl += "?" + query + (isOAuth ? "&raw_json=1" : "&include_over_18=on");
            } else {
                targetUrl += isOAuth ? "?raw_json=1" : "?include_over_18=on";
            }

            connection = (HttpURLConnection) new URL(targetUrl).openConnection();
            connection.setRequestMethod("GET");
            
            // Pass through Authorization header for OAuth requests
            if (request != null && isOAuth) {
                String authHeader = request.getRequestHeaders().get("Authorization");
                if (authHeader != null) {
                    connection.setRequestProperty("Authorization", authHeader);
                }
                String userAgent = request.getRequestHeaders().get("User-Agent");
                if (userAgent != null) {
                    connection.setRequestProperty("User-Agent", userAgent);
                } else {
                    connection.setRequestProperty("User-Agent", "RedditImageViewer/1.0 Android");
                }
            } else {
                connection.setRequestProperty("User-Agent", "RedditImageViewer/1.0 Android");
            }
            
            connection.setConnectTimeout(10000);
            connection.setReadTimeout(15000);
            connection.connect();

            int responseCode = connection.getResponseCode();
            InputStream inputStream;
            if (responseCode >= 400) {
                inputStream = connection.getErrorStream();
                if (inputStream == null) {
                    inputStream = new ByteArrayInputStream(
                        ("{\"error\":" + responseCode + "}").getBytes("UTF-8")
                    );
                }
            } else {
                inputStream = connection.getInputStream();
            }

            Map<String, String> headers = new HashMap<>();
            headers.put("Access-Control-Allow-Origin", "*");
            headers.put("Access-Control-Allow-Methods", "GET");

            return new WebResourceResponse(
                    "application/json", "UTF-8", responseCode,
                    responseCode < 400 ? "OK" : "Error", headers, inputStream
            );
        } catch (Exception e) {
            android.util.Log.e("WebView", "Reddit proxy error: " + e.getMessage());
            try {
                Map<String, String> headers = new HashMap<>();
                headers.put("Access-Control-Allow-Origin", "*");
                return new WebResourceResponse(
                        "application/json", "UTF-8", 502, "Bad Gateway", headers,
                        new ByteArrayInputStream(
                            ("{\"error\":\"proxy_error\",\"message\":\"" + e.getMessage() + "\"}").getBytes("UTF-8")
                        )
                );
            } catch (Exception ex) {
                return null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (isLocked) return; // Don't allow back when locked
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        webView.onPause();
        showLockScreen();
    }

    @Override
    protected void onResume() {
        super.onResume();
        webView.onResume();
        if (isLocked) {
            promptBiometric();
        }
    }

    @Override
    protected void onDestroy() {
        webView.destroy();
        super.onDestroy();
    }
}
