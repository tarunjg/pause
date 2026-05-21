import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ContentIdeas from './components/ContentIdeas';
import StyleGuideReview from './components/StyleGuideReview';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#a89d91' }}>Loading...</p>;
  if (!stats) return <p style={{ color: '#e74c3c' }}>Failed to load stats</p>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Dashboard</h1>
        <Link to="/admin/compose" style={styles.newBtn}>New Newsletter</Link>
      </div>

      <div style={styles.statsGrid}>
        <StatCard label="Subscribers" value={stats.subscriberCount} />
        <StatCard label="Unsubscribed" value={stats.unsubscribedCount} />
        <StatCard label="Drafts" value={stats.draftsCount} />
        <StatCard label="Sent" value={stats.recentPosts?.length || 0} />
      </div>

      <h2 style={styles.sectionTitle}>Recent Sends</h2>
      {stats.recentPosts?.length > 0 ? (
        <div style={styles.postsList}>
          {stats.recentPosts.map(post => (
            <div key={post.id} style={styles.postRow}>
              <div>
                <div style={styles.postTitle}>{post.title}</div>
                <div style={styles.postMeta}>
                  {post.sent_at ? new Date(post.sent_at).toLocaleDateString() : 'Draft'}
                  {' · '}{post.recipients_count} delivered
                  {post.bounced_count > 0 && ` · ${post.bounced_count} bounced`}
                  {post.open_rate != null && ` · ${Math.round(post.open_rate * 100)}% opened`}
                </div>
              </div>
              {post.slug && (
                <a
                  href={`/blog/${post.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.viewLink}
                >
                  View post
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>
          No newsletters sent yet. <Link to="/admin/compose" style={styles.link}>Write your first one.</Link>
        </p>
      )}

      <h2 style={styles.sectionTitle}>Content Ideas from the Book</h2>
      <ContentIdeas />

      <StyleGuideReview />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

const styles = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32,
  },
  title: { fontWeight: 400, fontSize: 24, color: '#fff', margin: 0 },
  newBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', border: 'none', borderRadius: 100, textDecoration: 'none',
    letterSpacing: '0.02em',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 16, marginBottom: 40,
  },
  statCard: {
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 10,
    padding: '20px 16px', textAlign: 'center',
  },
  statValue: { fontSize: 28, fontWeight: 300, color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#a89d91', letterSpacing: '0.05em', textTransform: 'uppercase' },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16, marginTop: 40 },
  postsList: { display: 'flex', flexDirection: 'column', gap: 1 },
  postRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#1a1816', borderRadius: 8,
  },
  postTitle: { color: '#e8e3dc', fontSize: 15, marginBottom: 4 },
  postMeta: { color: '#6d6259', fontSize: 13 },
  viewLink: { color: '#b85c38', fontSize: 13, textDecoration: 'none', whiteSpace: 'nowrap' },
  emptyText: { color: '#6d6259', fontSize: 14 },
  link: { color: '#b85c38', textDecoration: 'none' },
};
