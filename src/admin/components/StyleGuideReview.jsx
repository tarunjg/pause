import { useState, useEffect } from 'react';

export default function StyleGuideReview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    fetchStyleGuide();
  }, []);

  async function fetchStyleGuide() {
    try {
      const res = await fetch('/api/admin/style-guide');
      const d = await res.json();
      setData(d);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/admin/learning/analyze', { method: 'POST' });
      const result = await res.json();
      setInsights(result);
    } catch {
      alert('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }

  async function proposeUpdate() {
    if (!insights?.insights) return;
    setProposing(true);
    try {
      const res = await fetch('/api/admin/learning/propose-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insights: insights.insights }),
      });
      if (res.ok) await fetchStyleGuide();
      else alert('Proposal failed');
    } catch {
      alert('Proposal failed');
    } finally {
      setProposing(false);
    }
  }

  async function handleAction(id, action) {
    await fetch('/api/admin/style-guide', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action }),
    });
    await fetchStyleGuide();
  }

  if (loading) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Writing Style Guide</h2>
        <div style={styles.actions}>
          <button onClick={runAnalysis} disabled={analyzing} style={styles.btn} type="button">
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
          {insights?.insights && (
            <button onClick={proposeUpdate} disabled={proposing} style={styles.btn} type="button">
              {proposing ? 'Proposing...' : 'Propose Update'}
            </button>
          )}
        </div>
      </div>

      {insights && (
        <div style={styles.insightsBox}>
          <h4 style={styles.insightsTitle}>What's Working</h4>
          <pre style={styles.insightsText}>{insights.insights}</pre>
          {insights.topPerformers?.length > 0 && (
            <div style={styles.topList}>
              <span style={styles.topLabel}>Top posts:</span>
              {insights.topPerformers.map((p, i) => (
                <span key={i} style={styles.topItem}>{p.title}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {data?.pending && (
        <div style={styles.pendingBox}>
          <h4 style={styles.pendingTitle}>
            Pending Update (v{data.pending.version})
          </h4>
          <pre style={styles.pendingContent}>{data.pending.content}</pre>
          <div style={styles.pendingActions}>
            <button onClick={() => handleAction(data.pending.id, 'approve')} style={styles.approveBtn} type="button">
              Approve
            </button>
            <button onClick={() => handleAction(data.pending.id, 'reject')} style={styles.rejectBtn} type="button">
              Reject
            </button>
          </div>
        </div>
      )}

      {data?.current && (
        <details style={styles.details}>
          <summary style={styles.summary}>
            Current Style Guide (v{data.current.version})
          </summary>
          <pre style={styles.guideContent}>{data.current.content}</pre>
        </details>
      )}
    </div>
  );
}

const styles = {
  wrapper: { marginTop: 40 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 },
  title: { color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 },
  actions: { display: 'flex', gap: 8 },
  btn: {
    padding: '6px 14px', fontSize: 12, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  insightsBox: {
    padding: 16, background: '#1a1816', border: '1px solid #2a2520',
    borderRadius: 8, marginBottom: 16,
  },
  insightsTitle: { color: '#7dca7d', fontSize: 14, fontWeight: 600, margin: '0 0 8px' },
  insightsText: {
    color: '#e8e3dc', fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  topList: { marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  topLabel: { color: '#6d6259', fontSize: 12 },
  topItem: {
    padding: '3px 8px', background: '#2a2520', color: '#a89d91',
    borderRadius: 4, fontSize: 12,
  },
  pendingBox: {
    padding: 16, background: '#1e1c19', border: '1px solid #b85c38',
    borderRadius: 8, marginBottom: 16,
  },
  pendingTitle: { color: '#b85c38', fontSize: 14, fontWeight: 600, margin: '0 0 8px' },
  pendingContent: {
    color: '#e8e3dc', fontSize: 12, lineHeight: 1.6, margin: '0 0 12px',
    whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  pendingActions: { display: 'flex', gap: 8 },
  approveBtn: {
    padding: '6px 16px', fontSize: 12, background: '#2a5a2a', color: '#7dca7d',
    border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  rejectBtn: {
    padding: '6px 16px', fontSize: 12, background: '#3a1e1e', color: '#ca7d7d',
    border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  details: { marginTop: 8 },
  summary: { color: '#6d6259', fontSize: 13, cursor: 'pointer' },
  guideContent: {
    color: '#a89d91', fontSize: 12, lineHeight: 1.6, marginTop: 8,
    whiteSpace: 'pre-wrap', padding: 12, background: '#1a1816', borderRadius: 6,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};
