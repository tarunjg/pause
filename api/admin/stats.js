import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { count: subscriberCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);

    const { count: unsubscribedCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', false);

    const { data: recentPosts } = await supabase
      .from('pause_posts')
      .select('id, title, slug, sent_at, recipients_count, bounced_count, open_rate')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(5);

    const { count: draftsCount } = await supabase
      .from('pause_posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    return res.status(200).json({
      subscriberCount: subscriberCount || 0,
      unsubscribedCount: unsubscribedCount || 0,
      recentPosts: recentPosts || [],
      draftsCount: draftsCount || 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch stats' });
  }
}
