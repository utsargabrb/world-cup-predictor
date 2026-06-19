module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
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
    return res.status(500).json({ error: 'FOOTBALL_API_KEY environment variable is not configured.' });
  }

  const targetUrl = 'https://api.football-data.org/v4/competitions/WC/matches';

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'X-Auth-Token': API_KEY
      }
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch from API' });
  }
};
