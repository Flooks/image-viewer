import { OAuthConfig } from './types.js';

// Toggle between RedReader credentials and own credentials
const USE_OWN_CREDENTIALS = false;

// Used by the local server (reddit-auth.js), which runs the OAuth flow.

// RedReader credentials - the server captures the custom scheme redirect
const REDREADER_CONFIG: OAuthConfig = {
  clientId: 'yH0aTnJEt6qUgGn835B4vg',
  redirectUri: 'redreader://rr_oauth_redir',
  userAgent: 'org.quantumbadger.redreader/1.25.1',
  scope: 'read history'  // read for subreddits, history for user profiles
};

// Your own OAuth credentials (once approved)
// Get these from https://www.reddit.com/prefs/apps
const OWN_CONFIG: OAuthConfig = {
  clientId: 'PASTE_YOUR_CLIENT_ID_HERE',
  redirectUri: 'http://localhost:8000/auth/callback',
  userAgent: 'web:RedditImageViewer:v1.0 (by /u/YOUR_USERNAME)',
  scope: 'read history'  // read for subreddits, history for user profiles
};

export const OAUTH_CONFIG: OAuthConfig = USE_OWN_CREDENTIALS ? OWN_CONFIG : REDREADER_CONFIG;

// Check if credentials have been configured
export function isOAuthConfigured(): boolean {
  return OAUTH_CONFIG.clientId.length > 0;
}

