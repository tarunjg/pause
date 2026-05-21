import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('pause_posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Post not found' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const updates = {};
    const allowed = ['title', 'body_html', 'body_text', 'cover_image_url', 'slug', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('pause_posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Post update error:', error);
      return res.status(500).json({ message: 'Failed to update post' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('pause_posts')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(500).json({ message: 'Failed to delete post' });
    }
    return res.status(204).end();
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
