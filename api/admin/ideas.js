import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data: ideas, error } = await supabase
      .from('pause_post_ideas')
      .select('*')
      .order('created_at');

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch ideas' });
    }

    return res.status(200).json({ ideas: ideas || [] });
  }

  if (req.method === 'POST') {
    const { title, theme, source_chapter, prompt } = req.body || {};
    if (!title || !prompt) {
      return res.status(400).json({ message: 'Title and prompt are required' });
    }

    const { data, error } = await supabase
      .from('pause_post_ideas')
      .insert({ title, theme: theme || 'General', source_chapter, prompt })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to create idea' });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
