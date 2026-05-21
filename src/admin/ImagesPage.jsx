import { useState, useEffect } from 'react';

export default function ImagesPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(null);

  useEffect(() => { fetchImages(); }, []);

  async function fetchImages() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/images');
      const data = await res.json();
      setImages(Array.isArray(data) ? data : []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file) {
    if (!file?.type?.startsWith('image/')) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
      if (res.ok) fetchImages();
      else alert('Upload failed');
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) uploadFile(file);
  }

  function copyUrl(url) {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Images</h1>
        <label style={styles.uploadBtn}>
          {uploading ? 'Uploading...' : 'Upload Image'}
          <input
            type="file"
            accept="image/*"
            onChange={e => { const file = e.target.files?.[0]; if (file) uploadFile(file); }}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      <div
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={styles.grid}
      >
        {loading && <p style={styles.loading}>Loading...</p>}
        {images.map(img => (
          <div key={img.id} style={styles.card} onClick={() => copyUrl(img.url)} title="Click to copy URL">
            <img src={img.url} alt={img.filename} style={styles.thumb} />
            <div style={styles.cardMeta}>
              <span style={styles.filename}>{img.filename}</span>
              {img.size_bytes && <span style={styles.size}>{Math.round(img.size_bytes / 1024)}KB</span>}
            </div>
            {copied === img.url && <div style={styles.copiedBadge}>URL copied!</div>}
          </div>
        ))}
        {!loading && images.length === 0 && (
          <div style={styles.emptyZone}>
            <p style={styles.emptyText}>Drop images here or click Upload</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontWeight: 400, fontSize: 24, color: '#fff', margin: 0 },
  uploadBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', borderRadius: 100, cursor: 'pointer',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: 12, minHeight: 200,
  },
  card: {
    position: 'relative', background: '#1a1816', border: '1px solid #2a2520',
    borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
  },
  thumb: { width: '100%', height: 130, objectFit: 'cover', display: 'block' },
  cardMeta: { padding: '8px 10px' },
  filename: { color: '#a89d91', fontSize: 12, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  size: { color: '#6d6259', fontSize: 11 },
  copiedBadge: {
    position: 'absolute', top: 8, right: 8, padding: '4px 8px', background: '#2a5a2a',
    color: '#7dca7d', fontSize: 11, borderRadius: 4,
  },
  loading: { color: '#6d6259', fontSize: 14, gridColumn: '1 / -1' },
  emptyZone: {
    gridColumn: '1 / -1', textAlign: 'center', padding: '60px 24px',
    border: '2px dashed #2a2520', borderRadius: 12,
  },
  emptyText: { color: '#6d6259', fontSize: 14 },
};
