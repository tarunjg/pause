import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const updates = {};
  const allowed = ['title', 'theme', 'source_chapter', 'prompt', 'used'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('pause_post_ideas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: 'Failed to update idea' });
  }
  return res.status(200).json(data);
}
