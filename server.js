import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8000;

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

const server = http.createServer(async (req, res) => {
  // Redgifs proxy endpoint
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
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({
        hdUrl: gif.urls.hd, sdUrl: gif.urls.sd, posterUrl: gif.urls.poster,
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
  const fullPath = path.join(__dirname, filePath);
  const ext = path.extname(fullPath);

  try {
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
