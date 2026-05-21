import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ message: 'ANTHROPIC_API_KEY not configured' });

  const { insights } = req.body || {};
  if (!insights) return res.status(400).json({ message: 'Insights are required' });

  try {
    const { data: current } = await supabase
      .from('pause_style_guide')
      .select('*')
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!current) {
      return res.status(400).json({ message: 'No approved style guide found' });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are updating a newsletter writing style guide based on engagement data. CRITICAL RULES:
1. The "IMMUTABLE CORE" section must be preserved word-for-word. Never modify it.
2. Only adjust structural preferences, topical emphasis, and tactical recommendations.
3. Keep the same format as the original.
4. Add a "LEARNED PATTERNS" section at the end with data-backed observations.
5. Be specific: "Posts under 600 words get 2x open rates" not "shorter is better."`,
      messages: [{
        role: 'user',
        content: `Here is the current style guide:\n\n${current.content}\n\nHere are engagement insights from the last 30 days:\n\n${insights}\n\nProduce an updated style guide that reinforces what's working and adjusts what isn't. Return ONLY the updated style guide text.`,
      }],
    });

    const updatedContent = response.content[0]?.text || '';

    const { data: newVersion, error } = await supabase
      .from('pause_style_guide')
      .insert({
        version: current.version + 1,
        content: updatedContent,
        insights,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to save proposed update' });
    }

    return res.status(201).json({
      proposed: newVersion,
      currentVersion: current.version,
      newVersion: current.version + 1,
    });
  } catch (error) {
    console.error('Propose update error:', error);
    return res.status(500).json({ message: 'Proposal failed: ' + error.message });
  }
}
