import { readFileSync } from 'fs';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { transcript, context, ideaPrompt } = req.body || {};
  if (!transcript && !ideaPrompt) {
    return res.status(400).json({ message: 'Provide a transcript or idea prompt' });
  }

  try {
    let styleGuide;
    const { data: sgRow } = await supabase
      .from('pause_style_guide')
      .select('content')
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sgRow?.content) {
      styleGuide = sgRow.content;
    } else {
      try {
        styleGuide = readFileSync(resolve(process.cwd(), 'api/_lib/style-guide.txt'), 'utf-8');
      } catch {
        styleGuide = 'Write in a warm, personal, first-person voice. Short paragraphs. No em dashes. Weave neuroscience into stories.';
      }
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    let userPrompt = '';
    if (ideaPrompt) {
      userPrompt = `Here is a newsletter idea prompt:\n\n${ideaPrompt}`;
      if (transcript) {
        userPrompt += `\n\nThe author also recorded a voice note with these thoughts:\n\n${transcript}`;
      }
    } else {
      userPrompt = `Here is a transcript of the author's voice note:\n\n${transcript}`;
    }

    if (context) {
      userPrompt += `\n\nAdditional context from the author: ${context}`;
    }

    userPrompt += `\n\nWrite a complete newsletter draft in HTML. Use <p>, <h2>, <blockquote>, <a>, and <img> tags. Do not include the greeting (it gets personalized per recipient). Do not include a sign-off (the template adds one). Just the body content.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a ghostwriter for Tarun Galagali's Pause Lab newsletter. Write exactly in his voice using this style guide:\n\n${styleGuide}\n\nYour output is HTML that goes directly into an email template. Keep it personal, warm, grounded in neuroscience. No em dashes. 400-800 words.`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const draftHtml = message.content[0]?.text || '';

    return res.status(200).json({ draft: draftHtml });
  } catch (error) {
    console.error('Draft error:', error);
    return res.status(500).json({ message: 'Draft generation failed: ' + error.message });
  }
}
