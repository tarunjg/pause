import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    let body = req.body;
    // sendBeacon may not set Content-Type, body may be string
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { slug, readTimeSeconds } = body || {};
    if (!slug || readTimeSeconds == null) return res.status(400).end();

    const { data: post } = await supabase
      .from('pause_posts')
      .select('avg_read_time_seconds')
      .eq('slug', slug)
      .single();

    if (post) {
      const current = post.avg_read_time_seconds || 0;
      const updated = current === 0
        ? Math.round(readTimeSeconds)
        : Math.round((current + readTimeSeconds) / 2);

      await supabase
        .from('pause_posts')
        .update({ avg_read_time_seconds: updated })
        .eq('slug', slug);
    }

    return res.status(204).end();
  } catch {
    return res.status(500).end();
  }
}
