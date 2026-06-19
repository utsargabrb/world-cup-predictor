const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Simple .env parser (no need for dotenv package)
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim();
    }
  });
} catch (e) {
  // .env not found - env vars should be set in the environment (e.g. Vercel)
}

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.FOOTBALL_API_KEY;

http.createServer((req, res) => {
  // CORS Proxy Endpoint
  if (req.url.startsWith('/api/proxy')) {
    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'FOOTBALL_API_KEY env variable is not set.' }));
      return;
    }

    const targetUrl = 'https://api.football-data.org/v4/competitions/WC/matches';
    const options = {
      headers: {
        'X-Auth-Token': API_KEY
      }
    };

    https.get(targetUrl, options, (apiRes) => {
      res.writeHead(apiRes.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      apiRes.pipe(res);
    }).on('error', (e) => {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    });
    return;
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // Serve static files
  let filePath = '.' + req.url;
  if (filePath === './') filePath = './index.html';

  const extname = String(path.extname(filePath)).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code == 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}).listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}/`);
  if (!API_KEY) {
    console.warn('⚠️  Warning: FOOTBALL_API_KEY is not set. Live scores will not work.');
  }
  console.log('Press Ctrl+C to stop.');
});
