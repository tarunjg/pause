import { supabase } from '../_lib/supabase.js';

function escapeXml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const siteUrl = process.env.SITE_URL || 'https://www.pauselab.org';

  const { data: posts } = await supabase
    .from('pause_posts')
    .select('slug, title, body_text, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(20);

  const items = (posts || []).map(post => {
    const pubDate = post.sent_at ? new Date(post.sent_at).toUTCString() : '';
    const excerpt = (post.body_text || '').slice(0, 300);
    return `
    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${excerpt}]]></description>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pause Lab</title>
    <link>${siteUrl}/blog</link>
    <description>Reflections on pausing, neuroscience, and leadership from Tarun Galagali.</description>
    <language>en</language>
    <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600');
  return res.status(200).send(rss);
}
