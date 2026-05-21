import { readFileSync } from 'fs';
import formidable from 'formidable';
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export const config = { api: { bodyParser: false } };

const BUCKET = 'pause-newsletter-images';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 });

  let fields, files;
  try {
    [fields, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to parse upload: ' + err.message });
  }

  const file = files.image?.[0];
  if (!file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const postId = fields.post_id?.[0] || null;
  const ext = (file.originalFilename?.split('.').pop() || 'jpg').toLowerCase();
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fileBuffer = readFileSync(file.filepath);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return res.status(500).json({ message: 'Failed to upload image: ' + uploadError.message });
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const { data: imageRecord, error: dbError } = await supabase
    .from('pause_images')
    .insert({
      url: urlData.publicUrl,
      filename: file.originalFilename || storagePath,
      size_bytes: file.size,
      post_id: postId,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Image record error:', dbError);
    return res.status(500).json({ message: 'Image uploaded but failed to save record' });
  }

  return res.status(201).json(imageRecord);
}
