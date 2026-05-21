import { useState, useEffect, useCallback } from 'react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', org: '' });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (searchDebounced) params.set('search', searchDebounced);
      const res = await fetch(`/api/admin/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  async function toggleSubscribed(contact) {
    await fetch(`/api/admin/contacts/${contact.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscribed: !contact.subscribed }),
    });
    fetchContacts();
  }

  async function addContact(e) {
    e.preventDefault();
    if (!addForm.email) return;
    await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    setAddForm({ email: '', first_name: '', last_name: '', org: '' });
    setShowAdd(false);
    fetchContacts();
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Contacts</h1>
        <div style={styles.statsRow}>
          <span style={styles.stat}>{total.toLocaleString()} total</span>
          <button onClick={() => setShowAdd(!showAdd)} style={styles.addBtn}>
            {showAdd ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addContact} style={styles.addForm}>
          <input placeholder="Email *" value={addForm.email}
            onChange={e => setAddForm({ ...addForm, email: e.target.value })}
            style={styles.formInput} required type="email" />
          <input placeholder="First name" value={addForm.first_name}
            onChange={e => setAddForm({ ...addForm, first_name: e.target.value })} style={styles.formInput} />
          <input placeholder="Last name" value={addForm.last_name}
            onChange={e => setAddForm({ ...addForm, last_name: e.target.value })} style={styles.formInput} />
          <input placeholder="Organization" value={addForm.org}
            onChange={e => setAddForm({ ...addForm, org: e.target.value })} style={styles.formInput} />
          <button type="submit" style={styles.submitBtn}>Add</button>
        </form>
      )}

      <input
        type="text"
        value={search}
        onChange={e => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search by name, email, or org..."
        style={styles.searchInput}
      />

      {loading ? (
        <p style={styles.loading}>Loading...</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Org</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => (
                <tr key={contact.id} style={styles.tr}>
                  <td style={styles.td}>
                    {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td style={styles.td}>{contact.email}</td>
                  <td style={styles.td}>{contact.org || ''}</td>
                  <td style={styles.td}>{contact.source || ''}</td>
                  <td style={styles.td}>
                    <button
                      onClick={() => toggleSubscribed(contact)}
                      style={contact.subscribed ? styles.subscribedBadge : styles.unsubscribedBadge}
                    >
                      {contact.subscribed ? 'Subscribed' : 'Unsubscribed'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} style={styles.pageBtn}>Prev</button>
          <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} style={styles.pageBtn}>Next</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
  title: { fontWeight: 400, fontSize: 24, color: '#fff', margin: 0 },
  statsRow: { display: 'flex', alignItems: 'center', gap: 16 },
  stat: { color: '#a89d91', fontSize: 14 },
  addBtn: {
    padding: '8px 20px', fontSize: 13, background: '#b85c38', color: '#fff',
    border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  addForm: {
    display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
    padding: 16, background: '#1a1816', borderRadius: 8, border: '1px solid #2a2520',
  },
  formInput: {
    padding: '8px 12px', fontSize: 13, border: '1px solid #2a2520', borderRadius: 6,
    background: '#141210', color: '#e8e3dc', outline: 'none', flex: '1 1 140px',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  submitBtn: {
    padding: '8px 20px', fontSize: 13, background: '#2a5a2a', color: '#7dca7d',
    border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  searchInput: {
    width: '100%', padding: '10px 14px', fontSize: 14, border: '1px solid #2a2520',
    borderRadius: 8, background: '#1a1816', color: '#e8e3dc', outline: 'none',
    marginBottom: 16, boxSizing: 'border-box',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  loading: { color: '#6d6259', fontSize: 14 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left', padding: '10px 12px', fontSize: 11, color: '#6d6259',
    textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2520',
    whiteSpace: 'nowrap',
  },
  tr: { borderBottom: '1px solid #1e1c19' },
  td: { padding: '10px 12px', fontSize: 14, color: '#e8e3dc' },
  subscribedBadge: {
    padding: '4px 10px', fontSize: 11, background: '#1e3a1e', color: '#7dca7d',
    border: 'none', borderRadius: 100, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  unsubscribedBadge: {
    padding: '4px 10px', fontSize: 11, background: '#3a1e1e', color: '#ca7d7d',
    border: 'none', borderRadius: 100, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  pagination: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 24,
  },
  pageBtn: {
    padding: '6px 14px', fontSize: 13, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
  },
  pageInfo: { color: '#6d6259', fontSize: 13 },
};
