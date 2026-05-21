import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ message: 'ANTHROPIC_API_KEY not configured' });

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: posts } = await supabase
      .from('pause_posts')
      .select('title, body_text, body_html, open_rate, click_rate, avg_read_time_seconds, sent_at')
      .eq('status', 'sent')
      .gte('sent_at', thirtyDaysAgo)
      .order('sent_at', { ascending: false });

    if (!posts || posts.length < 2) {
      return res.status(200).json({
        insights: 'Not enough data yet. Need at least 2 sent newsletters to analyze patterns.',
        topPerformers: [],
        postCount: posts?.length || 0,
      });
    }

    const postSummaries = posts.map(p => ({
      title: p.title,
      openRate: p.open_rate,
      clickRate: p.click_rate,
      readTimeSeconds: p.avg_read_time_seconds,
      wordCount: (p.body_text || '').split(/\s+/).filter(Boolean).length,
      hasBlockquote: (p.body_html || '').includes('<blockquote'),
      imageCount: ((p.body_html || '').match(/<img/g) || []).length,
      excerpt: (p.body_text || '').slice(0, 200),
    }));

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You analyze newsletter engagement data and identify patterns. Be specific and actionable. No corporate speak. Write like a smart colleague giving honest feedback.',
      messages: [{
        role: 'user',
        content: `Analyze these newsletter performance metrics and identify 3-5 actionable patterns:\n\n${JSON.stringify(postSummaries, null, 2)}\n\nFor each insight, explain what correlates with higher engagement and give a specific recommendation. Format as a numbered list.`,
      }],
    });

    const insights = analysis.content[0]?.text || '';

    const ranked = [...posts]
      .map(p => ({
        title: p.title,
        score: (p.open_rate || 0) * 0.4 + (p.click_rate || 0) * 0.3 + Math.min((p.avg_read_time_seconds || 0) / 300, 1) * 0.3,
      }))
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({
      insights,
      topPerformers: ranked.slice(0, 3),
      postCount: posts.length,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ message: 'Analysis failed: ' + error.message });
  }
}
