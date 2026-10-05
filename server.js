import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getAuthStatus, getAccessToken, getUserAgent, startLogin, logout } from './reddit-auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8000;

const SESSION_FILE = path.join(__dirname, '.reddit-session.json');

// Load Reddit session cookies from file (created by reddit-login.cjs)
function loadRedditCookies() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const cookies = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }
  } catch (e) {
    console.warn('Warning: Could not load Reddit session cookies:', e.message);
  }
  // Fallback to env var
  if (process.env.REDDIT_SESSION) {
    return `reddit_session=${process.env.REDDIT_SESSION}`;
  }
  console.warn('Warning: No Reddit session found. Run "node reddit-login.cjs" to authenticate.');
  return '';
}

let redditCookieString = loadRedditCookies();

// Reload cookies periodically (in case user re-runs login script)
setInterval(() => { redditCookieString = loadRedditCookies(); }, 60000);

const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

// Redgifs token cache
let redgifsToken = null;
let redgifsTokenExpiry = 0;

async function getRedgifsToken() {
  if (redgifsToken && Date.now() < redgifsTokenExpiry) return redgifsToken;
  const resp = await fetch('https://api.redgifs.com/v2/auth/temporary', {
    headers: { 'User-Agent': 'RedditImageViewer/1.0' }
  });
  if (!resp.ok) throw new Error(`Auth failed: ${resp.status}`);
  const data = await resp.json();
  redgifsToken = data.token;
  redgifsTokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
  return redgifsToken;
}

const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  // Only serve the API to this machine's own pages (blocks DNS-rebinding tricks)
  const isApiRequest = req.url.startsWith('/browser-proxy/') || req.url.startsWith('/auth/');
  if (isApiRequest && !ALLOWED_HOSTS.has(req.headers.host)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  // OAuth endpoints (see reddit-auth.js)
  if (req.url === '/auth/status' && req.method === 'GET') {
    sendJson(res, 200, getAuthStatus());
    return;
  }
  if (req.url === '/auth/login' && req.method === 'POST') {
    startLogin();
    sendJson(res, 202, getAuthStatus());
    return;
  }
  if (req.url === '/auth/logout' && req.method === 'POST') {
    await logout();
    sendJson(res, 200, getAuthStatus());
    return;
  }
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, User-Agent, Content-Type',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  // Reddit API proxy — adds the server's OAuth token for oauth.reddit.com requests
  if (req.url.startsWith('/browser-proxy/')) {
    const encoded = req.url.replace('/browser-proxy/', '');
    const redditUrl = decodeURIComponent(encoded);

    let parsedUrl;
    try { parsedUrl = new URL(redditUrl); } catch { sendJson(res, 400, { error: 'Invalid URL' }); return; }
    const isOAuthRequest = parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'oauth.reddit.com';

    try {
      const headers = {
        'Accept': 'application/json, text/html;q=0.9, */*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      };
      
      if (isOAuthRequest) {
        const token = await getAccessToken().catch(() => null);
        if (!token) { sendJson(res, 401, { error: 'Not logged in to Reddit' }); return; }
        headers['Authorization'] = `Bearer ${token}`;
        headers['User-Agent'] = getUserAgent();
        console.log(`[OAuth Proxy] ${redditUrl}`);
      } else {
        // Legacy mode: use browser cookies
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
        headers['Cookie'] = redditCookieString;
        console.log(`[Cookie Proxy] ${redditUrl}`);
      }
      
      const redditResp = await fetch(redditUrl, {
        headers,
        redirect: 'follow'
      });
      const body = await redditResp.text();
      res.writeHead(redditResp.status, {
        'Content-Type': redditResp.headers.get('content-type') || 'application/json'
      });
      res.end(body);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Reddit proxy error: ' + err.message }));
    }
    return;
  }

  // Redgifs media proxy — streams video/images from media.redgifs.com
  if (req.url.startsWith('/media/redgifs/')) {
    const mediaPath = req.url.replace('/media/redgifs/', '').split('?')[0];
    if (!mediaPath || !/^[a-zA-Z0-9._-]+$/.test(mediaPath)) {
      res.writeHead(400); res.end('Invalid path'); return;
    }
    try {
      const token = await getRedgifsToken();
      const mediaResp = await fetch(`https://media.redgifs.com/${mediaPath}`, {
        headers: {
          'User-Agent': 'RedditImageViewer/1.0',
          'Authorization': `Bearer ${token}`,
          'Referer': 'https://www.redgifs.com/',
          ...(req.headers.range ? { 'Range': req.headers.range } : {})
        }
      });
      const headers = {
        'Content-Type': mediaResp.headers.get('content-type') || 'video/mp4',
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
      };
      if (mediaResp.headers.get('content-length')) headers['Content-Length'] = mediaResp.headers.get('content-length');
      if (mediaResp.headers.get('content-range')) headers['Content-Range'] = mediaResp.headers.get('content-range');
      res.writeHead(mediaResp.status, headers);
      const reader = mediaResp.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); return; }
          res.write(value);
        }
      };
      await pump();
    } catch (err) {
      res.writeHead(502); res.end('Proxy error');
    }
    return;
  }

  // Redgifs API proxy endpoint
  if (req.url.startsWith('/api/redgifs/')) {
    const videoId = req.url.replace('/api/redgifs/', '').split('?')[0];
    if (!videoId || !/^[a-zA-Z0-9]+$/.test(videoId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid video ID' }));
      return;
    }
    try {
      const token = await getRedgifsToken();
      const apiResp = await fetch(`https://api.redgifs.com/v2/gifs/${videoId.toLowerCase()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'RedditImageViewer/1.0'
        }
      });
      if (!apiResp.ok) throw new Error(`Redgifs API: ${apiResp.status}`);
      const data = await apiResp.json();
      const gif = data.gif;
      // Return proxied URLs through our local server
      const hdFile = gif.urls.hd.split('/').pop();
      const sdFile = gif.urls.sd.split('/').pop();
      const posterFile = gif.urls.poster.split('/').pop();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        hdUrl: `/media/redgifs/${hdFile}`, sdUrl: `/media/redgifs/${sdFile}`, posterUrl: `/media/redgifs/${posterFile}`,
        width: gif.width, height: gif.height, hasAudio: gif.hasAudio, duration: gif.duration
      }));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static file serving
  let filePath = req.url.split('?')[0];
  if (filePath === '/') filePath = '/index.html';
  try { filePath = decodeURIComponent(filePath); } catch { filePath = ''; }
  const fullPath = path.resolve(__dirname, '.' + filePath);
  const ext = path.extname(fullPath);
  const relative = path.relative(__dirname, fullPath);

  // Never serve files outside the app folder or dotfiles (token/session files, browser profile)
  if (!filePath || relative.startsWith('..') || path.isAbsolute(relative) ||
      relative.split(path.sep).some(part => part.startsWith('.') || part === 'node_modules')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  try {
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Server running at http://localhost:${PORT}`));
