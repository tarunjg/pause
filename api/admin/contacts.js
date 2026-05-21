import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      const safe = search.replace(/[%,]/g, '');
      query = query.or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,org.ilike.%${safe}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Contacts fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch contacts' });
    }

    return res.status(200).json({
      contacts: data,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  }

  if (req.method === 'POST') {
    const { email, first_name, last_name, org } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const { data, error } = await supabase
      .from('contacts')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          first_name: first_name || '',
          last_name: last_name || '',
          org: org || null,
          subscribed: true,
          source: 'admin',
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) {
      console.error('Contact create error:', error);
      return res.status(500).json({ message: 'Failed to add contact' });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
