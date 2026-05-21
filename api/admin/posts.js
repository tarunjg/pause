import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pause_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Posts fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch posts' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { title, body_html, body_text, cover_image_url, slug } = req.body || {};

    const { data, error } = await supabase
      .from('pause_posts')
      .insert({
        title: title || '',
        body_html: body_html || '',
        body_text: body_text || '',
        cover_image_url: cover_image_url || null,
        slug: slug || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Post create error:', error);
      return res.status(500).json({ message: 'Failed to create post' });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
