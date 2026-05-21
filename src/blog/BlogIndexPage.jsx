import { useState, useEffect } from 'react';

export default function BlogIndexPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Blog — Pause Lab';
    fetch('/api/blog/posts')
      .then(r => r.json())
      .then(data => { setPosts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <a href="/" style={styles.backLink}>&larr; Pause Lab</a>
        <h1 style={styles.title}>Blog</h1>
        <p style={styles.subtitle}>Reflections on pausing, neuroscience, and leadership.</p>

        {loading && <p style={styles.loading}>Loading...</p>}

        <div style={styles.grid}>
          {posts.map(post => (
            <a key={post.id} href={`/blog/${post.slug}`} style={styles.card}>
              {post.cover_image_url && (
                <img src={post.cover_image_url} alt="" style={styles.cardImg} />
              )}
              <div style={styles.cardBody}>
                <h2 style={styles.cardTitle}>{post.title}</h2>
                <p style={styles.cardExcerpt}>
                  {(post.body_text || '').slice(0, 160)}{(post.body_text || '').length > 160 ? '...' : ''}
                </p>
                <span style={styles.cardDate}>
                  {post.sent_at ? new Date(post.sent_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  }) : ''}
                </span>
              </div>
            </a>
          ))}
        </div>

        {!loading && posts.length === 0 && (
          <p style={styles.empty}>No posts yet. Check back soon.</p>
        )}

        <div style={styles.footer}>
          <a href="/connect" style={styles.footerLink}>Subscribe</a>
          <span style={styles.footerDot}>·</span>
          <a href="/blog/rss.xml" style={styles.footerLink}>RSS</a>
          <span style={styles.footerDot}>·</span>
          <a href="https://www.pauselab.org" style={styles.footerLink}>Pause Lab</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: '#141210', minHeight: '100vh', color: '#e8e3dc',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  container: { maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' },
  backLink: { color: '#b85c38', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 400, color: '#fff', marginBottom: 8 },
  subtitle: { color: '#a89d91', fontSize: 16, marginBottom: 40 },
  loading: { color: '#6d6259', fontSize: 14 },
  grid: { display: 'flex', flexDirection: 'column', gap: 24 },
  card: {
    display: 'flex', gap: 20, textDecoration: 'none', color: 'inherit',
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 12,
    overflow: 'hidden',
  },
  cardImg: { width: 200, height: 140, objectFit: 'cover', flexShrink: 0 },
  cardBody: { padding: '16px 20px 16px 0', flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 500, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 },
  cardExcerpt: { fontSize: 14, color: '#a89d91', margin: '0 0 8px', lineHeight: 1.5 },
  cardDate: { fontSize: 12, color: '#6d6259' },
  empty: { color: '#6d6259', fontSize: 15, textAlign: 'center', marginTop: 60 },
  footer: {
    textAlign: 'center', marginTop: 60, padding: '24px 0',
    borderTop: '1px solid #2a2520',
  },
  footerLink: { color: '#b85c38', textDecoration: 'none', fontSize: 13 },
  footerDot: { color: '#6d6259', margin: '0 8px' },
};
