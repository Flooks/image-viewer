/**
 * Manages Reddit OAuth authentication flow and token storage.
 *
 * Flow:
 * 1. Call getAuthorizationUrl() to get the Reddit login URL
 * 2. Open that URL (popup or redirect)
 * 3. User logs in and authorizes
 * 4. Reddit redirects to redirectUri with token in URL fragment
 * 5. Call handleCallback() with the fragment to store the token
 * 6. Use getAccessToken() for authenticated API requests
 */
export class OAuthManager {
    constructor(config) {
        this.token = null;
        this.STORAGE_KEY = 'reddit-oauth-token';
        this.config = config;
        this.loadStoredToken();
    }
    /**
     * Register a callback for authentication state changes
     */
    setOnAuthChange(callback) {
        this.onAuthChange = callback;
    }
    /**
     * Check if we have a valid (non-expired) token
     */
    isAuthenticated() {
        if (!this.token)
            return false;
        // 60 second buffer before expiration
        return Date.now() < this.token.expiresAt - 60000;
    }
    /**
     * Get current access token, or null if not authenticated
     */
    getAccessToken() {
        if (!this.isAuthenticated())
            return null;
        return this.token?.accessToken || null;
    }
    /**
     * Get the configured User-Agent string
     */
    getUserAgent() {
        return this.config.userAgent;
    }
    /**
     * Get token expiration time as Date, or null if no token
     */
    getTokenExpiration() {
        if (!this.token)
            return null;
        return new Date(this.token.expiresAt);
    }
    /**
     * Get time until token expires in seconds, or null if no token
     */
    getTimeUntilExpiration() {
        if (!this.token)
            return null;
        const remaining = this.token.expiresAt - Date.now();
        return Math.max(0, Math.floor(remaining / 1000));
    }
    /**
     * Generate the OAuth authorization URL
     * @param state Random string for CSRF protection
     */
    getAuthorizationUrl(state) {
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
    /**
     * Parse the OAuth callback URL fragment and store the token
     * @param fragment The URL fragment (everything after #) from the callback
     * @returns true if token was successfully parsed and stored
     */
    handleCallback(fragment) {
        // Remove leading # if present
        if (fragment.startsWith('#')) {
            fragment = fragment.substring(1);
        }
        const params = new URLSearchParams(fragment);
        // Check for error response
        const error = params.get('error');
        if (error) {
            console.error('OAuth error:', error, params.get('error_description'));
            return false;
        }
        const accessToken = params.get('access_token');
        const tokenType = params.get('token_type');
        const expiresIn = params.get('expires_in');
        const scope = params.get('scope');
        if (!accessToken || !expiresIn) {
            console.error('Missing required OAuth parameters');
            return false;
        }
        this.token = {
            accessToken,
            tokenType: tokenType || 'bearer',
            expiresAt: Date.now() + parseInt(expiresIn, 10) * 1000,
            scope: scope || 'read'
        };
        this.saveToken();
        this.notifyAuthChange();
        return true;
    }
    /**
     * Clear stored token (logout)
     */
    logout() {
        this.token = null;
        localStorage.removeItem(this.STORAGE_KEY);
        this.notifyAuthChange();
    }
    /**
     * Initiate the login flow
     * Opens Reddit OAuth page in a popup window
     */
    initiateLogin() {
        const state = this.generateRandomState();
        sessionStorage.setItem('oauth_state', state);
        const authUrl = this.getAuthorizationUrl(state);
        // Calculate popup position (centered)
        const width = 700;
        const height = 750;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        // Check if using custom scheme (redreader://)
        const isCustomScheme = this.config.redirectUri.startsWith('redreader://');
        if (isCustomScheme) {
            // Open our intercept page that guides the user through the process
            const interceptUrl = `${window.location.origin}/oauth-intercept.html?auth_url=${encodeURIComponent(authUrl)}`;
            const popup = window.open(interceptUrl, 'reddit_oauth', `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`);
            if (!popup) {
                alert('Please allow popups for this site, then click Login again.');
            }
        }
        else {
            // Normal flow - redirect will come back to our callback page
            const popup = window.open(authUrl, 'reddit_oauth', `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`);
            if (!popup) {
                // Popup blocked - fall back to redirect
                window.location.href = authUrl;
            }
        }
    }
    /**
     * Check URL for OAuth callback parameters (used after redirect)
     * Call this on page load to handle returning from OAuth
     */
    checkForCallback() {
        const hash = window.location.hash;
        if (!hash || hash.length < 2)
            return false;
        // Check if this looks like an OAuth callback
        if (!hash.includes('access_token='))
            return false;
        const success = this.handleCallback(hash);
        if (success) {
            // Clear the hash from URL
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
        return success;
    }
    loadStoredToken() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Validate the stored token has required fields
                if (parsed.accessToken && parsed.expiresAt) {
                    this.token = parsed;
                }
            }
        }
        catch (e) {
            console.error('Failed to load OAuth token:', e);
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }
    saveToken() {
        if (this.token) {
            try {
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.token));
            }
            catch (e) {
                console.error('Failed to save OAuth token:', e);
            }
        }
    }
    notifyAuthChange() {
        if (this.onAuthChange) {
            this.onAuthChange(this.isAuthenticated());
        }
    }
    generateRandomState() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    }
}
/**
 * Handle messages from OAuth popup window
 * The popup will postMessage the token fragment back to the opener
 */
export function setupOAuthPopupListener(oauthManager) {
    window.addEventListener('message', (event) => {
        // Validate origin - should be from our own domain or Reddit
        if (event.origin !== window.location.origin) {
            return;
        }
        if (event.data && typeof event.data === 'object' && event.data.type === 'oauth_callback') {
            const fragment = event.data.fragment;
            if (fragment) {
                oauthManager.handleCallback(fragment);
            }
        }
    });
}
