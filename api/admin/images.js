import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { data, error } = await supabase
    .from('pause_images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Images fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch images' });
  }

  return res.status(200).json(data);
}
