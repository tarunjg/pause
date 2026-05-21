import { useState, useEffect } from 'react';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => setStatus(data.authenticated ? 'authenticated' : 'prompt'))
      .catch(() => setStatus('prompt'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setStatus('authenticated');
      } else {
        setError('Wrong password');
        setPassword('');
      }
    } catch {
      setError('Connection error');
    } finally {
      setSubmitting(false);
    }
  }

  if (status === 'loading') {
    return <div style={styles.center}><p style={styles.text}>Loading...</p></div>;
  }

  if (status === 'prompt') {
    return (
      <div style={styles.center}>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.logo}><span style={styles.logoMark}>&#9673;</span> PAUSE</div>
          <p style={styles.text}>Admin access</p>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            style={styles.input}
            disabled={submitting}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button} disabled={submitting || !password}>
            {submitting ? 'Checking...' : 'Enter'}
          </button>
        </form>
      </div>
    );
  }

  return children;
}

const styles = {
  center: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#141210', padding: 24,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  form: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
    maxWidth: 320, width: '100%',
  },
  logo: {
    fontWeight: 600, fontSize: 15, letterSpacing: '0.14em', color: '#fff',
    marginBottom: 8,
  },
  logoMark: { color: '#b85c38' },
  text: { color: '#a89d91', fontSize: 14, margin: 0 },
  input: {
    width: '100%', padding: '12px 16px', fontSize: 16, border: '1px solid #2a2520',
    borderRadius: 8, background: '#1a1816', color: '#fff', outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  error: { color: '#e74c3c', fontSize: 13, margin: 0 },
  button: {
    width: '100%', padding: '12px 24px', fontSize: 14, fontWeight: 500,
    background: '#b85c38', color: '#fff', border: 'none', borderRadius: 100,
    cursor: 'pointer', letterSpacing: '0.02em',
  },
};
