import { supabase } from '../_lib/supabase.js';

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Not Found - Pause Lab</title>
<style>body{font-family:-apple-system,sans-serif;background:#141210;color:#a89d91;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{text-align:center}h1{color:#fff;font-weight:400;font-size:20px}a{color:#b85c38;text-decoration:none}</style></head>
<body><div class="card"><h1>${escapeHtml(message)}</h1><p><a href="/blog">&larr; All posts</a></p></div></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { slug } = req.query;

  const { data: post, error } = await supabase
    .from('pause_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'sent')
    .single();

  if (error || !post) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(404).send(errorPage('Post not found'));
  }

  const siteUrl = process.env.SITE_URL || 'https://www.pauselab.org';
  const excerpt = (post.body_text || '').slice(0, 155).trim();
  const publishDate = post.sent_at ? new Date(post.sent_at).toISOString() : '';
  const displayDate = post.sent_at
    ? new Date(post.sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: excerpt,
    image: post.cover_image_url || `${siteUrl}/pause-book.jpeg`,
    datePublished: publishDate,
    author: { '@type': 'Person', name: 'Tarun Galagali' },
    publisher: {
      '@type': 'Organization',
      name: 'Pause Lab',
      url: siteUrl,
    },
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} - Pause Lab</title>
  <meta name="description" content="${escapeHtml(excerpt)}">
  <link rel="canonical" href="${siteUrl}/blog/${slug}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(excerpt)}">
  <meta property="og:image" content="${escapeHtml(post.cover_image_url || siteUrl + '/pause-book.jpeg')}">
  <meta property="og:url" content="${siteUrl}/blog/${slug}">
  <meta property="og:site_name" content="Pause Lab">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(excerpt)}">
  <meta name="twitter:image" content="${escapeHtml(post.cover_image_url || siteUrl + '/pause-book.jpeg')}">

  <link rel="alternate" type="application/rss+xml" title="Pause Lab" href="${siteUrl}/blog/rss.xml">

  <script type="application/ld+json">${jsonLd}</script>

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e8e3dc; line-height: 1.7; margin: 0; padding: 0; background: #141210;
    }
    .container { max-width: 640px; margin: 0 auto; padding: 48px 24px 80px; }
    .back { color: #b85c38; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 32px; }
    h1 { font-size: 28px; font-weight: 400; color: #fff; margin-bottom: 8px; line-height: 1.3; }
    .meta { color: #6d6259; font-size: 14px; margin-bottom: 32px; }
    .cover { width: 100%; border-radius: 12px; margin-bottom: 32px; }
    .content p { font-size: 16px; margin-bottom: 16px; }
    .content h2 { font-size: 20px; font-weight: 600; color: #fff; margin-top: 32px; margin-bottom: 12px; }
    .content a { color: #b85c38; }
    .content blockquote {
      border-left: 3px solid #b85c38; padding-left: 16px; margin: 24px 0;
      color: #a89d91; font-style: italic;
    }
    .content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
    .cta { margin-top: 48px; padding: 24px; background: #1a1816; border-radius: 12px; text-align: center; }
    .cta p { color: #a89d91; font-size: 15px; margin-bottom: 12px; }
    .cta a {
      display: inline-block; padding: 10px 32px; background: #b85c38; color: #fff;
      text-decoration: none; border-radius: 100px; font-size: 14px; font-weight: 500;
    }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #2a2520; color: #6d6259; font-size: 13px; text-align: center; }
    .footer a { color: #b85c38; text-decoration: none; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/blog" class="back">&larr; All posts</a>
    <h1>${escapeHtml(post.title)}</h1>
    <div class="meta">${displayDate} &middot; Tarun Galagali</div>
    ${post.cover_image_url ? `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" class="cover">` : ''}
    <div class="content">${post.body_html}</div>
    <div class="cta">
      <p>Want reflections like this in your inbox?</p>
      <a href="/connect">Subscribe to Pause</a>
    </div>
    <div class="footer">
      <a href="https://www.pauselab.org">Pause Lab</a>&middot;
      <a href="/blog">Blog</a>&middot;
      <a href="/blog/rss.xml">RSS</a>
    </div>
  </div>

  <script>
    (function() {
      var start = Date.now();
      var maxScroll = 0;
      window.addEventListener('scroll', function() {
        var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        if (pct > maxScroll) maxScroll = pct;
      });
      window.addEventListener('beforeunload', function() {
        var seconds = Math.round((Date.now() - start) / 1000);
        try {
          navigator.sendBeacon('/api/blog/track', JSON.stringify({
            slug: ${JSON.stringify(slug)},
            readTimeSeconds: seconds,
            scrollDepth: Math.round(maxScroll * 100),
          }));
        } catch (e) {}
      });
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}
