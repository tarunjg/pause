import { supabase } from '../../../_lib/supabase.js';
import { isAuthenticated } from '../../../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'POST') {
    // Schedule the post
    const { scheduled_at } = req.body || {};
    if (!scheduled_at) {
      return res.status(400).json({ message: 'scheduled_at is required (ISO 8601)' });
    }

    const scheduledDate = new Date(scheduled_at);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: 'Invalid scheduled_at — must be ISO 8601' });
    }
    if (scheduledDate.getTime() <= Date.now() + 60 * 1000) {
      return res.status(400).json({ message: 'scheduled_at must be at least 1 minute in the future' });
    }

    // Validate the post first
    const { data: post, error: postError } = await supabase
      .from('pause_posts')
      .select('title, body_html, cover_image_url, status')
      .eq('id', id)
      .single();

    if (postError || !post) return res.status(404).json({ message: 'Post not found' });
    if (post.status === 'sent') return res.status(400).json({ message: 'Already sent' });
    if (!post.title) return res.status(400).json({ message: 'Subject required' });
    if (!post.cover_image_url) return res.status(400).json({ message: 'Cover image required' });

    const { data, error } = await supabase
      .from('pause_posts')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to schedule: ' + error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    // Unschedule — revert to draft
    const { data, error } = await supabase
      .from('pause_posts')
      .update({
        status: 'draft',
        scheduled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'scheduled')
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to unschedule' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
