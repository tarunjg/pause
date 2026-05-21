import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/posts')
      .then(r => r.json())
      .then(data => { setPosts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#a89d91' }}>Loading...</p>;

  const drafts = posts.filter(p => p.status === 'draft');
  const sent = posts.filter(p => p.status === 'sent');

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Posts</h1>
        <Link to="/admin/compose" style={styles.newBtn}>New Newsletter</Link>
      </div>

      {drafts.length > 0 && (
        <>
          <h2 style={styles.sectionTitle}>Drafts</h2>
          <div style={styles.list}>
            {drafts.map(post => (
              <Link key={post.id} to={`/admin/compose/${post.id}`} style={styles.postRow}>
                <div>
                  <div style={styles.postTitle}>{post.title || '(untitled)'}</div>
                  <div style={styles.postMeta}>
                    Last edited {new Date(post.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <span style={styles.draftBadge}>Draft</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 style={styles.sectionTitle}>Sent</h2>
      {sent.length > 0 ? (
        <div style={styles.list}>
          {sent.map(post => (
            <div key={post.id} style={styles.postRow}>
              <div>
                <div style={styles.postTitle}>{post.title}</div>
                <div style={styles.postMeta}>
                  {post.sent_at ? new Date(post.sent_at).toLocaleDateString() : ''}
                  {' · '}{post.recipients_count} delivered
                  {post.bounced_count > 0 && ` · ${post.bounced_count} bounced`}
                  {post.open_rate != null && ` · ${Math.round(post.open_rate * 100)}% opened`}
                  {post.avg_read_time_seconds != null && ` · ~${Math.max(1, Math.round(post.avg_read_time_seconds / 60))}min read`}
                </div>
              </div>
              <div style={styles.postActions}>
                {post.slug && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" style={styles.viewLink}>
                    View →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>No newsletters sent yet.</p>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { fontWeight: 400, fontSize: 24, color: '#fff', margin: 0 },
  newBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', borderRadius: 100, textDecoration: 'none',
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: '#a89d91', marginBottom: 12, marginTop: 24,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 2 },
  postRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#1a1816', borderRadius: 8,
    textDecoration: 'none', color: 'inherit',
  },
  postTitle: { color: '#e8e3dc', fontSize: 15, marginBottom: 4 },
  postMeta: { color: '#6d6259', fontSize: 13 },
  postActions: { display: 'flex', gap: 8 },
  viewLink: { color: '#b85c38', fontSize: 13, textDecoration: 'none' },
  draftBadge: {
    padding: '4px 10px', fontSize: 11, background: '#2a2520', color: '#a89d91',
    borderRadius: 100,
  },
  emptyText: { color: '#6d6259', fontSize: 14 },
};
