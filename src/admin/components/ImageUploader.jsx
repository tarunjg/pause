import { useState, useEffect } from 'react';

export default function ImageUploader({ onSelect, onClose }) {
  const [tab, setTab] = useState('library');
  const [libraryImages, setLibraryImages] = useState([]);
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/images')
      .then(r => r.json())
      .then(data => setLibraryImages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  async function searchUnsplash() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/admin/unsplash-search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setUnsplashResults(data.results || []);
    } catch {
      setUnsplashResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectUnsplash(photo) {
    setUploading(true);
    try {
      const res = await fetch('/api/admin/unsplash-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photo.urls.regular,
          filename: `unsplash-${photo.id}.jpg`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onSelect(data.url);
      } else {
        alert('Failed to download image');
      }
    } catch {
      alert('Failed to download image');
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        onSelect(data.url);
      } else {
        alert('Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.modalTitle}>Choose Cover Image</h3>
          <button onClick={onClose} style={styles.closeBtn}>Close</button>
        </div>

        <div style={styles.tabs}>
          {['library', 'unsplash', 'upload'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{ ...styles.tab, ...(tab === t ? styles.activeTab : {}) }}
              type="button"
            >
              {t === 'library' ? 'Library' : t === 'unsplash' ? 'Unsplash' : 'Upload'}
            </button>
          ))}
        </div>

        <div style={styles.body}>
          {tab === 'library' && (
            <div style={styles.grid}>
              {libraryImages.map(img => (
                <img
                  key={img.id}
                  src={img.url}
                  alt={img.filename}
                  style={styles.gridImg}
                  onClick={() => onSelect(img.url)}
                />
              ))}
              {libraryImages.length === 0 && (
                <p style={styles.empty}>No images uploaded yet.</p>
              )}
            </div>
          )}

          {tab === 'unsplash' && (
            <div>
              <div style={styles.searchRow}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                  placeholder="Search Unsplash photos..."
                  style={styles.searchInput}
                />
                <button onClick={searchUnsplash} disabled={searching} style={styles.searchBtn}>
                  {searching ? '...' : 'Search'}
                </button>
              </div>
              <div style={styles.grid}>
                {unsplashResults.map(photo => (
                  <div key={photo.id} style={styles.unsplashCard} onClick={() => selectUnsplash(photo)}>
                    <img src={photo.urls.small} alt={photo.alt_description || ''} style={styles.gridImg} />
                    <span style={styles.photographer}>by {photo.user?.name}</span>
                  </div>
                ))}
              </div>
              {uploading && <p style={styles.empty}>Downloading from Unsplash...</p>}
            </div>
          )}

          {tab === 'upload' && (
            <div style={styles.uploadZone}>
              <input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
              {uploading && <p style={styles.empty}>Uploading...</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 24,
  },
  modal: {
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 12,
    width: '100%', maxWidth: 700, maxHeight: '80vh', display: 'flex',
    flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #2a2520',
  },
  modalTitle: { color: '#fff', fontSize: 16, fontWeight: 500, margin: 0 },
  closeBtn: {
    background: 'transparent', border: '1px solid #2a2520', padding: '6px 14px',
    borderRadius: 100, fontSize: 13, cursor: 'pointer', color: '#a89d91',
  },
  tabs: { display: 'flex', borderBottom: '1px solid #2a2520' },
  tab: {
    flex: 1, padding: '10px 16px', fontSize: 13, background: 'transparent',
    color: '#a89d91', border: 'none', cursor: 'pointer', textAlign: 'center',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  activeTab: { color: '#fff', borderBottom: '2px solid #b85c38' },
  body: { padding: 20, overflowY: 'auto', flex: 1 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
  },
  gridImg: {
    width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
    border: '1px solid #2a2520', display: 'block',
  },
  unsplashCard: { position: 'relative', cursor: 'pointer' },
  photographer: {
    position: 'absolute', bottom: 4, left: 4, fontSize: 10, color: '#fff',
    background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: 4,
  },
  searchRow: { display: 'flex', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, padding: '10px 12px', fontSize: 14, border: '1px solid #2a2520',
    borderRadius: 6, background: '#141210', color: '#e8e3dc', outline: 'none',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  searchBtn: {
    padding: '10px 16px', fontSize: 13, background: '#b85c38', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  uploadZone: { textAlign: 'center', padding: 40, color: '#a89d91' },
  empty: { color: '#6d6259', fontSize: 13, gridColumn: '1 / -1' },
};
