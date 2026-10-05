# OAuth Migration Plan

> **Status: historical.** This plan was implemented, then superseded. Login now runs on the local server (`reddit-auth.js`): it opens a Chrome/Chromium window, intercepts the authorize redirect, and stores a permanent refresh token, so there's no manual token copying and no hourly re-login. The browser no longer holds tokens. The Android wrapper and its proxy (Phase 4) were removed, and `auth.html`, `oauth-intercept.html` and `oauth-redirect.html` no longer exist. See the README and `.kiro/specs/reddit-image-viewer/design.md` (component 14) for the current design.

## Background

As of May 28, 2026, Reddit has blocked unauthenticated `.json` endpoint access. All requests to `https://www.reddit.com/r/{sub}/hot.json` now return 403 Forbidden. This breaks both the web app and Android wrapper.

The app must migrate to Reddit's authenticated OAuth API to continue functioning.

## Strategy

Implement OAuth authentication using configurable credentials. This allows:
1. **Immediate unblocking** using RedReader's client ID (accessibility exemption)
2. **Seamless transition** to our own credentials once OAuth application is approved
3. **Minimal code changes** — only swap three config values when switching credentials

### Credential Sets

| Setting | RedReader (Temporary) | Own Credentials (Future) |
|---------|----------------------|--------------------------|
| Client ID | *(from email after RedReader login)* | *(from reddit.com/prefs/apps)* |
| Redirect URI | `redreader://rr_oauth_redir` | `http://localhost:8000/auth` |
| User-Agent | `org.quantumbadger.redreader/1.25.1` | `RedditImageViewer/1.0` |

---

## Implementation Tasks

### Phase 1: OAuth Configuration & Types ✅ COMPLETE

**Task 1.1: Add OAuth types to `types.ts`** ✅

```typescript
// OAuth Configuration
export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  userAgent: string;
  scope: string;
}

// OAuth Token
export interface OAuthToken {
  accessToken: string;
  tokenType: string;
  expiresAt: number;  // Unix timestamp
  scope: string;
}

// Auth State
export interface AuthState {
  isAuthenticated: boolean;
  token: OAuthToken | null;
  error: string | null;
}
```

**Task 1.2: Create `auth.ts` module** ✅

New file with:
- `OAuthManager` class
- Token storage (localStorage)
- Token refresh logic
- Login flow orchestration

---

### Phase 2: OAuth Manager Implementation ✅ COMPLETE

**Task 2.1: Implement `OAuthManager` class** ✅

```typescript
// auth.ts
export class OAuthManager {
  private config: OAuthConfig;
  private token: OAuthToken | null = null;
  private readonly STORAGE_KEY = 'reddit-oauth-token';

  constructor(config: OAuthConfig) {
    this.config = config;
    this.loadStoredToken();
  }

  // Check if we have a valid (non-expired) token
  isAuthenticated(): boolean {
    if (!this.token) return false;
    return Date.now() < this.token.expiresAt - 60000; // 1min buffer
  }

  // Get current access token, or null if not authenticated
  getAccessToken(): string | null {
    if (!this.isAuthenticated()) return null;
    return this.token?.accessToken || null;
  }

  // Generate the OAuth authorization URL
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'token',
      state: state,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      duration: 'temporary'
    });
    return `https://www.reddit.com/api/v1/authorize?${params}`;
  }

  // Parse the OAuth callback URL fragment
  handleCallback(fragment: string): boolean {
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const tokenType = params.get('token_type');
    const expiresIn = params.get('expires_in');
    const scope = params.get('scope');

    if (!accessToken || !expiresIn) return false;

    this.token = {
      accessToken,
      tokenType: tokenType || 'bearer',
      expiresAt: Date.now() + parseInt(expiresIn) * 1000,
      scope: scope || 'read'
    };
    this.saveToken();
    return true;
  }

  // Clear stored token (logout)
  logout(): void {
    this.token = null;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  private loadStoredToken(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.token = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load OAuth token:', e);
    }
  }

  private saveToken(): void {
    if (this.token) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.token));
    }
  }
}
```

---

### Phase 3: Update API Client ✅ COMPLETE

**Task 3.1: Modify `APIClient` to use OAuth** ✅

Key changes to `api.ts`:

```typescript
export class APIClient {
  private readonly isAndroid: boolean;
  private readonly corsProxy: string;
  private readonly oauthManager: OAuthManager;
  private readonly userAgent: string;

  constructor(oauthManager: OAuthManager, userAgent: string) {
    this.isAndroid = window.location.hostname === 'appassets.androidplatform.net';
    this.corsProxy = this.isAndroid ? '' : '/browser-proxy/';
    this.oauthManager = oauthManager;
    this.userAgent = userAgent;
  }

  private buildUrl(endpoint: string): string {
    // Change base URL from www.reddit.com to oauth.reddit.com
    const oauthUrl = `https://oauth.reddit.com${endpoint}`;
    
    if (this.isAndroid) {
      const parsed = new URL(oauthUrl);
      return `https://appassets.androidplatform.net/reddit-api${parsed.pathname}${parsed.search}`;
    }
    return this.corsProxy + encodeURIComponent(oauthUrl);
  }

  private getAuthHeaders(): HeadersInit {
    const token = this.oauthManager.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'User-Agent': this.userAgent
    };
  }

  async fetchSubreddit(
    subreddit: string, sortOrder: SortOrder, timespan?: Timespan, after?: string
  ): Promise<RedditAPIResult> {
    // No more .json suffix needed - oauth.reddit.com returns JSON by default
    let endpoint = `/r/${subreddit}/${sortOrder}`;
    const params = new URLSearchParams();
    if (timespan) params.append('t', timespan);
    if (after) params.append('after', after);
    params.append('raw_json', '1'); // Prevent HTML entity encoding
    const queryString = params.toString();
    if (queryString) endpoint += `?${queryString}`;

    const url = this.buildUrl(endpoint);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: RedditAPIResponse = await response.json();
    return {
      posts: data.data.children.map(child => child.data),
      after: data.data.after
    };
  }

  // Similar changes for fetchUserPosts...
}
```

**Task 3.2: URL structure changes**

| Before | After |
|--------|-------|
| `https://www.reddit.com/r/pics/hot.json` | `https://oauth.reddit.com/r/pics/hot` |
| `https://www.reddit.com/user/spez/submitted.json?sort=top` | `https://oauth.reddit.com/user/spez/submitted?sort=top` |

---

### Phase 4: Android Proxy Updates ✅ COMPLETE

**Task 4.1: Update `MainActivity.java` proxy** ✅

The Android proxy needs to:
1. Target `oauth.reddit.com` instead of `www.reddit.com`
2. Pass through `Authorization` header from WebView
3. Use the configured User-Agent

```java
private WebResourceResponse proxyRedditRequest(WebResourceRequest request, String path, String query) {
    HttpURLConnection connection = null;
    try {
        // Changed from www.reddit.com to oauth.reddit.com
        String targetUrl = "https://oauth.reddit.com/" + path;
        if (query != null && !query.isEmpty()) {
            targetUrl += "?" + query + "&raw_json=1";
        } else {
            targetUrl += "?raw_json=1";
        }

        connection = (HttpURLConnection) new URL(targetUrl).openConnection();
        connection.setRequestMethod("GET");
        
        // Pass through Authorization header from the WebView request
        String authHeader = request.getRequestHeaders().get("Authorization");
        if (authHeader != null) {
            connection.setRequestProperty("Authorization", authHeader);
        }
        
        // Use configured User-Agent (passed from JS or hardcoded)
        connection.setRequestProperty("User-Agent", "org.quantumbadger.redreader/1.25.1");
        
        // ... rest of existing proxy code
    }
}
```

---

### Phase 5: Login UI ✅ COMPLETE

**Task 5.1: Add login button/state to header** ✅

When not authenticated:
- Show "Login with Reddit" button
- Clicking opens OAuth flow in popup/redirect

When authenticated:
- Show logged-in indicator
- Provide logout option

**Task 5.2: Handle OAuth callback** ✅

For web:
- Register redirect URI as `http://localhost:8000/auth`
- Create simple HTML page at `/auth` that extracts token from URL fragment
- Pass token back to main app via `window.opener.postMessage()` or localStorage

For Android:
- Hidden for now (OAuth popup doesn't work well in WebView)
- Future: Register custom URI scheme handler

**Task 5.3: Auth-gated content loading** ⏳ PARTIAL

Note: Content loading still works without auth (will fall back to unauthenticated mode which will 403).
Full auth-gating deferred until credentials are configured.

---

### Phase 6: Configuration ✅ COMPLETE

**Task 6.1: Create `config.ts` for OAuth settings** ✅

```typescript
// config.ts
import { OAuthConfig } from './types.js';

// Toggle between RedReader credentials and own credentials
const USE_OWN_CREDENTIALS = false;

export const OAUTH_CONFIG: OAuthConfig = USE_OWN_CREDENTIALS
  ? {
      clientId: 'YOUR_CLIENT_ID_HERE',
      redirectUri: 'http://localhost:8000/auth',
      userAgent: 'RedditImageViewer/1.0',
      scope: 'read'
    }
  : {
      // RedReader credentials (temporary workaround)
      clientId: 'REDREADER_CLIENT_ID_FROM_EMAIL',
      redirectUri: 'redreader://rr_oauth_redir',
      userAgent: 'org.quantumbadger.redreader/1.25.1',
      scope: 'read'
    };
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `types.ts` | Modify | Add OAuth types |
| `auth.ts` | **New** | OAuthManager class |
| `config.ts` | **New** | OAuth configuration |
| `api.ts` | Modify | Use OAuth, change base URL |
| `state.ts` | Modify | Auth-gate content loading |
| `app.ts` | Modify | Initialize OAuthManager, wire up login |
| `index.html` | Modify | Add login UI elements |
| `styles.css` | Modify ✅ | Login button/indicator styles |
| `auth.html` | **New** ✅ | OAuth callback handler page |
| `MainActivity.java` | Modify ✅ | Update proxy for oauth.reddit.com |

---

## Current Status

**Implementation complete.** All code is in place and compiles successfully.

**Next step:** Configure the client ID in `config.ts`:
1. Install RedReader from Play Store
2. Log in with your Reddit account  
3. Check email for "You've authorized a new app" message
4. Copy the `App ID` from the email
5. Paste it into `config.ts` replacing `PASTE_REDREADER_CLIENT_ID_HERE`

---

## Testing Plan

1. **Unit tests for OAuthManager**
   - Token parsing
   - Expiration detection
   - Storage persistence

2. **Integration tests**
   - Login flow (manual)
   - Token refresh behavior
   - API calls with auth headers

3. **Platform tests**
   - Web: Login popup flow
   - Android: Custom URI scheme handling

---

## Rollback Plan

If OAuth implementation has issues:
1. Keep old `APIClient` code behind a feature flag
2. Can revert to unauthenticated mode for testing (will still 403 on Reddit, but useful for local mocking)

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Types & Config | 1 hour |
| Phase 2: OAuthManager | 2 hours |
| Phase 3: API Client | 2 hours |
| Phase 4: Android Proxy | 1 hour |
| Phase 5: Login UI | 3 hours |
| Phase 6: Testing | 2 hours |
| **Total** | **~11 hours** |

---

## Open Questions

1. **RedReader client ID acquisition**: Need to install RedReader and authorize to get the client ID from email. Do this before starting implementation.

2. **Android redirect handling**: RedReader's redirect URI (`redreader://rr_oauth_redir`) is a custom scheme. Android WebView may not handle this gracefully. May need to:
   - Intercept the redirect in `shouldOverrideUrlLoading`
   - Extract token from the URI
   - Pass back to WebView via JavaScript interface

3. **CORS proxy for oauth.reddit.com**: Verify the existing CORS proxy setup works with the new domain. May need server-side changes.

4. **Token refresh**: Reddit's implicit grant flow doesn't support refresh tokens. When token expires (~1 hour), user must re-authenticate. Consider adding a "session expired" notification.
