import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { data, error } = await supabase
    .from('pause_posts')
    .select('id, slug, title, body_text, cover_image_url, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'Failed to fetch posts' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json(data || []);
}
