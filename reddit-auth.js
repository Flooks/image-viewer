/**
 * Server-side Reddit OAuth.
 *
 * Login opens a Chrome window (via Playwright) at Reddit's authorize page. When the
 * user clicks Allow, we intercept Reddit's redirect to the app's redirect URI (which
 * may be a custom scheme like redreader:// that a browser can't hand back to us),
 * exchange the code for a permanent refresh token and store it in TOKEN_FILE.
 * Access tokens are refreshed automatically and never sent to the browser.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { OAUTH_CONFIG } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = path.join(__dirname, '.reddit-oauth.json');
const PROFILE_DIR = path.join(__dirname, '.reddit-browser-profile');
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

let tokens = loadTokens(); // { refreshToken, accessToken, expiresAt, scope }
let refreshPromise = null;
let loginPromise = null;
let lastLoginError = null;

function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      if (data.refreshToken) return data;
    }
  } catch (e) {
    console.warn('[Auth] Could not read token file:', e.message);
  }
  return null;
}

function saveTokens(data) {
  tokens = data;
  if (data) fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
  else if (fs.existsSync(TOKEN_FILE)) fs.unlinkSync(TOKEN_FILE);
}

async function tokenRequest(params) {
  const basic = Buffer.from(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret || ''}`).toString('base64');
  const resp = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': OAUTH_CONFIG.userAgent
    },
    body: new URLSearchParams(params).toString()
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok || body.error) {
    const err = new Error(`Token request failed: ${resp.status} ${body.error || ''}`.trim());
    err.invalidGrant = body.error === 'invalid_grant' || resp.status === 400 || resp.status === 401;
    throw err;
  }
  return body;
}

export function getUserAgent() {
  return OAUTH_CONFIG.userAgent;
}

export function getAuthStatus() {
  return {
    configured: Boolean(OAUTH_CONFIG.clientId) && !OAUTH_CONFIG.clientId.startsWith('PASTE_'),
    authenticated: tokens !== null,
    loginInProgress: loginPromise !== null,
    lastError: lastLoginError
  };
}

/** Returns a valid access token, refreshing it if needed, or null if not logged in. */
export async function getAccessToken() {
  if (!tokens) return null;
  if (tokens.accessToken && Date.now() < tokens.expiresAt - REFRESH_MARGIN_MS) return tokens.accessToken;
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const body = await tokenRequest({ grant_type: 'refresh_token', refresh_token: tokens.refreshToken });
        saveTokens({
          ...tokens,
          accessToken: body.access_token,
          expiresAt: Date.now() + body.expires_in * 1000,
          refreshToken: body.refresh_token || tokens.refreshToken
        });
        console.log('[Auth] Access token refreshed');
      } catch (e) {
        console.error('[Auth]', e.message);
        // Refresh token revoked or invalid: log out. Network errors keep the tokens.
        if (e.invalidGrant) saveTokens(null);
        throw e;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  await refreshPromise;
  return tokens ? tokens.accessToken : null;
}

/** Starts the login flow if one isn't already running. Resolves when it finishes. */
export function startLogin() {
  if (!loginPromise) {
    lastLoginError = null;
    loginPromise = runLogin()
      .catch(e => {
        lastLoginError = e.message;
        console.error('[Auth] Login failed:', e.message);
      })
      .finally(() => { loginPromise = null; });
  }
  return loginPromise;
}

// Prefer the installed Google Chrome; otherwise use Playwright's bundled Chromium
// (common on Linux, install it with `npx playwright install chromium`).
async function launchLoginBrowser(chromium) {
  const options = { headless: false, viewport: null };
  try {
    return await chromium.launchPersistentContext(PROFILE_DIR, { ...options, channel: 'chrome' });
  } catch (e) {
    console.log('[Auth] Google Chrome not available, trying bundled Chromium');
  }
  try {
    return await chromium.launchPersistentContext(PROFILE_DIR, options);
  } catch (e) {
    throw new Error('Could not open a browser for login. Install Google Chrome, or run "npx playwright install chromium".');
  }
}

async function runLogin() {
  const { chromium } = await import('@playwright/test');
  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = OAUTH_CONFIG.redirectUri;
  const authUrl = 'https://www.reddit.com/api/v1/authorize?' + new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    response_type: 'code',
    state,
    redirect_uri: redirectUri,
    duration: 'permanent',
    scope: OAUTH_CONFIG.scope
  });

  console.log('[Auth] Opening Chrome for Reddit login...');
  const context = await launchLoginBrowser(chromium);

  try {
    const redirect = new Promise((resolve, reject) => {
      const capture = (url) => { if (url && url.startsWith(redirectUri)) resolve(url); };

      // Clicking Allow POSTs to /api/v1/authorize, which answers with a redirect to
      // redirectUri. Fetch it ourselves without following the redirect so we can read it.
      context.route('**/api/v1/authorize**', async (route) => {
        const request = route.request();
        if (request.method() !== 'POST') return route.continue();
        const response = await route.fetch({ maxRedirects: 0 });
        const location = response.headers()['location'];
        console.log(`[Auth] Authorize POST -> ${response.status()}${location ? ` (redirect to ${location.split(/[?#]/)[0]})` : ''}`);
        if (location && location.startsWith(redirectUri)) {
          resolve(location);
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<p style="font-family:sans-serif">Logged in. This window will close.</p>'
          });
        }
        return route.fulfill({ response });
      });

      // Fallbacks in case the redirect arrives some other way.
      context.on('request', r => capture(r.url()));
      context.on('response', r => capture(r.headers()['location']));
      context.on('close', () => reject(new Error('Login window was closed')));
      setTimeout(() => reject(new Error('Timed out waiting for login')), LOGIN_TIMEOUT_MS);
    });
    redirect.catch(() => {}); // avoid an unhandled rejection if goto() throws first

    const page = context.pages()[0] || await context.newPage();
    await page.goto(authUrl);

    const redirectUrl = new URL(await redirect);
    console.log('[Auth] Redirect captured');
    const params = redirectUrl.searchParams;
    if (params.get('error')) throw new Error(`Reddit returned error: ${params.get('error')}`);
    if (params.get('state') !== state) throw new Error('OAuth state mismatch');
    const code = params.get('code');
    if (!code) throw new Error('No authorization code in redirect');

    const body = await tokenRequest({ grant_type: 'authorization_code', code, redirect_uri: redirectUri });
    if (!body.refresh_token) throw new Error('Reddit did not return a refresh token');
    saveTokens({
      refreshToken: body.refresh_token,
      accessToken: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000,
      scope: body.scope
    });
    console.log('[Auth] Logged in, tokens saved');
  } finally {
    await context.close().catch(() => {});
  }
}

export async function logout() {
  if (tokens) {
    try {
      const basic = Buffer.from(`${OAUTH_CONFIG.clientId}:${OAUTH_CONFIG.clientSecret || ''}`).toString('base64');
      await fetch('https://www.reddit.com/api/v1/revoke_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': OAUTH_CONFIG.userAgent
        },
        body: new URLSearchParams({ token: tokens.refreshToken, token_type_hint: 'refresh_token' }).toString()
      });
    } catch (e) {
      console.warn('[Auth] Token revoke failed:', e.message);
    }
  }
  saveTokens(null);
  console.log('[Auth] Logged out');
}
