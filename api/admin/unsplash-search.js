import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return res.status(500).json({ message: 'UNSPLASH_ACCESS_KEY not configured' });

  const query = req.query.q;
  if (!query) return res.status(400).json({ message: 'Query required' });

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`;
    const response = await fetch(url, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });

    if (!response.ok) {
      return res.status(response.status).json({ message: 'Unsplash search failed' });
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Unsplash search error:', err);
    return res.status(500).json({ message: 'Unsplash search failed' });
  }
}
