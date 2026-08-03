// Toggle between RedReader credentials and own credentials
const USE_OWN_CREDENTIALS = false;
// RedReader credentials - works with custom scheme redirect
const REDREADER_CONFIG = {
    clientId: 'yH0aTnJEt6qUgGn835B4vg',
    redirectUri: 'redreader://rr_oauth_redir',
    userAgent: 'org.quantumbadger.redreader/1.25.1',
    scope: 'read history' // read for subreddits, history for user profiles
};
// Your own OAuth credentials (once approved)
// Get these from https://www.reddit.com/prefs/apps
const OWN_CONFIG = {
    clientId: 'PASTE_YOUR_CLIENT_ID_HERE',
    redirectUri: 'http://localhost:8000/auth.html',
    userAgent: 'web:RedditImageViewer:v1.0 (by /u/YOUR_USERNAME)',
    scope: 'read history' // read for subreddits, history for user profiles
};
export const OAUTH_CONFIG = USE_OWN_CREDENTIALS ? OWN_CONFIG : REDREADER_CONFIG;
// Check if credentials have been configured
export function isOAuthConfigured() {
    return OAUTH_CONFIG.clientId.length > 0;
}
// Check if using custom scheme redirect (needs special handling)
export function isCustomSchemeRedirect() {
    return OAUTH_CONFIG.redirectUri.startsWith('redreader://');
}
