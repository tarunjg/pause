import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

const BUCKET = 'pause-newsletter-images';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const { url, filename } = req.body || {};
  if (!url) return res.status(400).json({ message: 'URL required' });

  try {
    const imageRes = await fetch(url);
    if (!imageRes.ok) {
      return res.status(500).json({ message: 'Failed to download from Unsplash' });
    }

    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const safeName = (filename || `unsplash-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return res.status(500).json({ message: 'Upload to storage failed: ' + uploadError.message });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    const { data: record, error: dbError } = await supabase
      .from('pause_images')
      .insert({
        url: urlData.publicUrl,
        filename: safeName,
        size_bytes: buffer.length,
      })
      .select()
      .single();

    if (dbError) {
      return res.status(500).json({ message: 'Failed to save image record' });
    }

    return res.status(201).json(record);
  } catch (err) {
    console.error('Unsplash download error:', err);
    return res.status(500).json({ message: 'Download failed: ' + err.message });
  }
}
