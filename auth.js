/**
 * Tracks Reddit login state. The OAuth flow and tokens live in the local server
 * (reddit-auth.js); the server adds the access token to proxied API requests, so
 * the browser only needs to know whether we're logged in.
 *
 * Flow:
 * 1. init() fetches /auth/status
 * 2. initiateLogin() asks the server to open a Chrome window at Reddit's authorize page
 * 3. We poll /auth/status until the login finishes
 */
export class OAuthManager {
    constructor() {
        this.status = { configured: true, authenticated: false, loginInProgress: false, lastError: null };
        this.pollTimer = null;
    }
    setOnAuthChange(callback) {
        this.onAuthChange = callback;
    }
    isAuthenticated() { return this.status.authenticated; }
    isConfigured() { return this.status.configured; }
    isLoginInProgress() { return this.status.loginInProgress; }
    getLastError() { return this.status.lastError; }
    async init() {
        // Tokens used to be kept in the browser; they're now held by the server
        localStorage.removeItem('reddit-oauth-token');
        localStorage.removeItem('oauth_pending_callback');
        await this.refreshStatus();
        if (this.status.loginInProgress)
            this.pollUntilDone();
    }
    /** Re-reads login state from the server and notifies listeners if it changed. */
    async refreshStatus() {
        try {
            const response = await fetch('/auth/status');
            if (!response.ok)
                throw new Error(`HTTP ${response.status}`);
            this.setStatus(await response.json());
        }
        catch (e) {
            console.error('Failed to fetch auth status:', e);
        }
    }
    async initiateLogin() {
        try {
            const response = await fetch('/auth/login', { method: 'POST' });
            this.setStatus(await response.json());
            this.pollUntilDone();
        }
        catch (e) {
            console.error('Failed to start login:', e);
        }
    }
    async logout() {
        try {
            const response = await fetch('/auth/logout', { method: 'POST' });
            this.setStatus(await response.json());
        }
        catch (e) {
            console.error('Failed to log out:', e);
        }
    }
    pollUntilDone() {
        if (this.pollTimer !== null)
            return;
        this.pollTimer = window.setInterval(async () => {
            await this.refreshStatus();
            if (!this.status.loginInProgress && this.pollTimer !== null) {
                window.clearInterval(this.pollTimer);
                this.pollTimer = null;
            }
        }, 1500);
    }
    setStatus(next) {
        const changed = next.authenticated !== this.status.authenticated ||
            next.loginInProgress !== this.status.loginInProgress ||
            next.lastError !== this.status.lastError;
        this.status = next;
        if (changed && this.onAuthChange)
            this.onAuthChange(this.status.authenticated);
    }
}
