import formidable from 'formidable';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import { isAuthenticated } from '../_lib/auth.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY not configured' });
  }

  const form = formidable({ maxFileSize: 25 * 1024 * 1024 });
  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    return res.status(400).json({ message: 'Failed to parse upload: ' + err.message });
  }

  const audioFile = files.audio?.[0];
  if (!audioFile) {
    return res.status(400).json({ message: 'No audio file provided' });
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    const buffer = readFileSync(audioFile.filepath);
    const file = new File([buffer], audioFile.originalFilename || 'audio.webm', {
      type: audioFile.mimetype || 'audio/webm',
    });

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'text',
    });

    return res.status(200).json({ transcript: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ message: 'Transcription failed: ' + error.message });
  }
}
