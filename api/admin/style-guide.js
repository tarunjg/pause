import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data: current } = await supabase
      .from('pause_style_guide')
      .select('*')
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: pending } = await supabase
      .from('pause_style_guide')
      .select('*')
      .eq('status', 'pending')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.status(200).json({ current, pending });
  }

  if (req.method === 'PUT') {
    const { id, action } = req.body || {};
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Provide id and action (approve/reject)' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabase
      .from('pause_style_guide')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to update style guide' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
