const https = require('https');

module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const API_KEY = process.env.FOOTBALL_API_KEY;

  if (!API_KEY) {
    res.status(500).json({ error: 'FOOTBALL_API_KEY environment variable is not configured on the server.' });
    return;
  }

  const targetUrl = 'https://api.football-data.org/v4/competitions/WC/matches';
  const options = {
    headers: {
      'X-Auth-Token': API_KEY
    }
  };

  https.get(targetUrl, options, (apiRes) => {
    let body = '';
    apiRes.on('data', chunk => body += chunk);
    apiRes.on('end', () => {
      try {
        const data = JSON.parse(body);
        res.status(apiRes.statusCode).json(data);
      } catch (e) {
        res.status(500).json({ error: 'Failed to parse API response' });
      }
    });
  }).on('error', (e) => {
    console.error('Proxy error:', e.message);
    res.status(500).json({ error: e.message });
  });
};
