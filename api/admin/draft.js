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

  const { transcript, context, ideaPrompt, currentDraft } = req.body || {};
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

    const hasExistingDraft = currentDraft && currentDraft.replace(/<[^>]*>/g, '').trim().length > 50;

    let userPrompt = '';
    if (hasExistingDraft) {
      userPrompt = `Here is the current draft of the newsletter:\n\n${currentDraft}\n\nThe author just recorded a follow-up voice note with new thoughts to integrate:\n\n${transcript || ''}`;
      if (ideaPrompt) {
        userPrompt += `\n\nThe original idea prompt was:\n\n${ideaPrompt}`;
      }
    } else if (ideaPrompt) {
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

    if (hasExistingDraft) {
      userPrompt += `\n\nProduce a REVISED newsletter draft that integrates the new voice note's ideas into the existing draft. Preserve what's working, weave in the new thoughts naturally, refine awkward phrasing. Keep the same general structure unless the new voice note explicitly asks for a different angle. Output the complete revised draft as HTML. Do NOT wrap in markdown code fences.`;
    } else {
      userPrompt += `\n\nWrite a complete newsletter draft in HTML. Use <p>, <h2>, <blockquote>, and <a> tags. Do not include the greeting (it gets personalized per recipient). Do not include a sign-off (the template adds one). Just the body content. Do NOT wrap your output in markdown code fences (no \`\`\`html or \`\`\`). Output raw HTML directly.`;
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a ghostwriter for Tarun Galagali's Pause Lab newsletter. Write exactly in his voice using this style guide:

${styleGuide}

CRITICAL ANTI-AI PATTERNS — these make writing feel generated, never use them:
- No antithesis pairs: "Not behind. Not frantic. Just steady." "Not just X, but Y." "Not loud, but clear." This pattern is the #1 tell of AI writing. Use straightforward declarative sentences instead.
- No "It's not X. It's Y." constructions.
- No tricolons (three-part lists with parallel structure for rhetorical effect): "calm, clear, and centered" / "show up, slow down, and tune in".
- No em dashes — use commas or periods.
- No "the truth is..." or "here's the thing..." setups.
- No abstract platitudes ("real growth happens in the pause"). Always anchor in a specific moment or piece of research.
- Avoid "we" when you mean "I". Tarun speaks as himself.

HYPERLINKS — when you reference researchers, studies, books, or organizations, link them:
- Researchers: link to their faculty page or recent paper. e.g. <a href="https://...">Sophie Leroy</a>, <a href="https://...">Giacomo Rizzolatti</a>
- Studies: link to the paper if known, or the press release. e.g. "a <a href="https://...">2023 Berkeley study</a> found..."
- If you don't know an exact URL, use a search URL as a placeholder: <a href="https://scholar.google.com/scholar?q=Sophie+Leroy+attention+residue">Sophie Leroy's research</a>
- Always link the first mention of a real person or paper. Subsequent mentions don't need re-linking.

Your output is raw HTML that goes directly into an email template. Personal, warm, grounded in neuroscience. 400-800 words.`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    let draftHtml = message.content[0]?.text || '';

    // Strip markdown code fences if Claude wrapped the output anyway
    draftHtml = draftHtml
      .replace(/^\s*```(?:html)?\s*\n/i, '')
      .replace(/\n\s*```\s*$/i, '')
      .trim();

    return res.status(200).json({ draft: draftHtml });
  } catch (error) {
    console.error('Draft error:', error);
    return res.status(500).json({ message: 'Draft generation failed: ' + error.message });
  }
}
