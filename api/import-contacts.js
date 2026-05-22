import { supabase } from './_lib/supabase.js';

// Protected endpoint for bulk importing contacts
// Call with: POST /api/import-contacts
// Headers: Authorization: Bearer <ADMIN_SECRET>
// Body: { contacts: [{ email, firstName, lastName, org }] }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { contacts } = req.body;

  if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
    return res.status(400).json({ message: 'Provide a contacts array with at least one entry' });
  }

  try {
    const rows = contacts.map((c) => ({
      email: c.email.toLowerCase().trim(),
      first_name: c.firstName || null,
      last_name: c.lastName || null,
      org: c.org || null,
      interests: c.interests || ['newsletter'],
      subscribed: true,
      source: 'import',
    }));

    const CHUNK_SIZE = 200;
    let imported = 0;

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { data, error } = await supabase
        .from('contacts')
        .upsert(chunk, { onConflict: 'email', ignoreDuplicates: false })
        .select('email');

      if (error) {
        console.error(`Import chunk error (rows ${i}-${i + chunk.length}):`, error);
        return res.status(500).json({
          message: `Import failed at row ${i}. ${imported} contacts imported before failure.`,
          imported,
          error: error.message,
        });
      }
      imported += data.length;
    }

    return res.status(200).json({
      message: `Imported ${imported} contacts`,
      count: imported,
    });
  } catch (error) {
    console.error('Import error:', error);
    return res.status(500).json({ message: 'Import failed' });
  }
}
