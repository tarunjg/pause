import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const THEME_COLORS = {
  Breathe: '#4a9eff',
  Engage: '#b85c38',
  Adapt: '#7dca7d',
  Metta: '#c084fc',
  General: '#a89d91',
};

export default function ContentIdeas() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/admin/ideas')
      .then(r => r.json())
      .then(data => {
        setIdeas(data.ideas || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#6d6259', fontSize: 13 }}>Loading ideas...</p>;
  if (ideas.length === 0) return <p style={{ color: '#6d6259', fontSize: 13 }}>No ideas yet.</p>;

  const themes = ['all', ...new Set(ideas.map(i => i.theme))];
  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.theme === filter);
  const unused = filtered.filter(i => !i.used);
  const used = filtered.filter(i => i.used);

  function startFromIdea(idea) {
    sessionStorage.setItem('pendingIdea', JSON.stringify(idea));
    navigate('/admin/compose');
  }

  return (
    <div>
      <div style={styles.filterRow}>
        {themes.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              ...styles.filterBtn,
              ...(filter === t ? { background: '#2a2520', color: '#fff' } : {}),
            }}
            type="button"
          >
            {t === 'all' ? 'All' : t}
            {t !== 'all' && (
              <span style={{ ...styles.dot, background: THEME_COLORS[t] || '#a89d91' }} />
            )}
          </button>
        ))}
      </div>

      {unused.length > 0 && (
        <div style={styles.ideasGrid}>
          {unused.map(idea => (
            <div key={idea.id} style={styles.ideaCard} onClick={() => startFromIdea(idea)}>
              <div style={styles.ideaTheme}>
                <span style={{ ...styles.dot, background: THEME_COLORS[idea.theme] || '#a89d91' }} />
                {idea.theme}
              </div>
              <div style={styles.ideaTitle}>{idea.title}</div>
              {idea.source_chapter && (
                <div style={styles.ideaSource}>{idea.source_chapter}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {used.length > 0 && (
        <>
          <p style={styles.usedLabel}>Used ({used.length})</p>
          <div style={styles.ideasGrid}>
            {used.map(idea => (
              <div key={idea.id} style={{ ...styles.ideaCard, opacity: 0.5 }} onClick={() => startFromIdea(idea)}>
                <div style={styles.ideaTheme}>
                  <span style={{ ...styles.dot, background: THEME_COLORS[idea.theme] || '#a89d91' }} />
                  {idea.theme}
                </div>
                <div style={styles.ideaTitle}>{idea.title}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  filterRow: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 12px', fontSize: 12, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  ideasGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 12,
  },
  ideaCard: {
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 8,
    padding: 16, cursor: 'pointer',
  },
  ideaTheme: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#6d6259', marginBottom: 8, textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  ideaTitle: { color: '#e8e3dc', fontSize: 14, lineHeight: 1.4 },
  ideaSource: { color: '#6d6259', fontSize: 12, marginTop: 6 },
  usedLabel: {
    color: '#6d6259', fontSize: 12, textTransform: 'uppercase',
    letterSpacing: '0.05em', marginTop: 24, marginBottom: 8,
  },
};
