import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapEditor from './components/TipTapEditor';
import PreviewModal from './components/PreviewModal';
import VoiceRecorder from './components/VoiceRecorder';
import ImageUploader from './components/ImageUploader';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function ComposePage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [postId, setPostId] = useState(routeId || null);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [subscriberCount, setSubscriberCount] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [aiDrafting, setAiDrafting] = useState(false);

  // Load existing draft
  useEffect(() => {
    if (routeId) {
      fetch(`/api/admin/posts/${routeId}`)
        .then(r => r.json())
        .then(post => {
          if (post.id) {
            setSubject(post.title || '');
            setBodyHtml(post.body_html || '');
            setCoverImage(post.cover_image_url || '');
            setPostId(post.id);
          }
        });
    }
  }, [routeId]);

  // Subscriber count
  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setSubscriberCount(data.subscriberCount))
      .catch(() => {});
  }, []);

  // Pending idea from dashboard
  useEffect(() => {
    if (routeId) return; // editing existing — skip
    const pendingIdea = sessionStorage.getItem('pendingIdea');
    if (!pendingIdea) return;
    try {
      const idea = JSON.parse(pendingIdea);
      sessionStorage.removeItem('pendingIdea');
      setSubject(idea.title);
      setAiDrafting(true);
      fetch('/api/admin/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaPrompt: idea.prompt }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.draft) setBodyHtml(data.draft);
        })
        .catch(() => {})
        .finally(() => setAiDrafting(false));
    } catch {
      sessionStorage.removeItem('pendingIdea');
    }
  }, [routeId]);

  const handleImageUpload = useCallback(async (file, insertCallback) => {
    const formData = new FormData();
    formData.append('image', file);
    if (postId) formData.append('post_id', postId);

    try {
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        insertCallback(data.url);
        if (!coverImage) setCoverImage(data.url);
      } else {
        alert('Upload failed');
      }
    } catch {
      alert('Upload failed');
    }
  }, [postId, coverImage]);

  const saveDraft = useCallback(async () => {
    setSaving(true);
    try {
      const body = {
        title: subject,
        body_html: bodyHtml,
        body_text: stripHtml(bodyHtml),
        cover_image_url: coverImage || null,
      };

      if (postId) {
        await fetch(`/api/admin/posts/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        return postId;
      } else {
        const res = await fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setPostId(data.id);
        navigate(`/admin/compose/${data.id}`, { replace: true });
        return data.id;
      }
    } finally {
      setSaving(false);
    }
  }, [postId, subject, bodyHtml, coverImage, navigate]);

  async function sendNewsletter() {
    if (!subject.trim()) {
      alert('Please add a subject line.');
      return;
    }
    if (!coverImage) {
      alert('Please add a cover image before sending.');
      return;
    }

    const count = subscriberCount || '?';
    if (!window.confirm(`Send this newsletter to ${count} subscribers?`)) return;

    setSending(true);
    setSendResult(null);

    const idToSend = await saveDraft();
    if (!idToSend) {
      setSending(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/posts/${idToSend}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSendResult(data);
      if (res.ok) {
        // Navigate to posts page after a moment so user can see the success message
        setTimeout(() => navigate('/admin/posts'), 4000);
      }
    } catch (err) {
      setSendResult({ message: 'Send failed: ' + err.message });
    } finally {
      setSending(false);
    }
  }

  function handleDraftReady(draftHtml) {
    setBodyHtml(draftHtml);
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>{postId ? 'Edit Draft' : 'New Newsletter'}</h1>
        <div style={styles.actions}>
          <button onClick={saveDraft} disabled={saving || sending} style={styles.secondaryBtn}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => setShowPreview(true)} disabled={sending} style={styles.secondaryBtn}>
            Preview
          </button>
          <button
            onClick={sendNewsletter}
            disabled={sending || !coverImage || !subject.trim() || !bodyHtml.trim()}
            style={{ ...styles.primaryBtn, ...((!coverImage || !subject.trim() || !bodyHtml.trim()) ? { opacity: 0.4, cursor: 'not-allowed' } : {}) }}
          >
            {sending ? 'Sending...' : 'Send Newsletter'}
          </button>
        </div>
      </div>

      {sendResult && (
        <div style={sendResult.sent != null ? styles.successBanner : styles.errorBanner}>
          {sendResult.sent != null
            ? `✓ Sent to ${sendResult.sent} subscribers${sendResult.failed ? ` · ${sendResult.failed} failed` : ''}. Published at /blog/${sendResult.slug}`
            : sendResult.message}
        </div>
      )}

      {aiDrafting && (
        <div style={styles.aiBanner}>
          Generating draft from idea prompt...
        </div>
      )}

      <VoiceRecorder onDraftReady={handleDraftReady} />

      <input
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject line"
        style={styles.subjectInput}
      />

      <div style={styles.coverRow}>
        {coverImage ? (
          <div style={styles.coverPreview}>
            <img src={coverImage} alt="Cover" style={styles.coverThumb} />
            <span style={styles.coverLabel}>Cover image set</span>
            <button onClick={() => setShowImagePicker(true)} style={styles.changeCover}>Change</button>
            <button onClick={() => setCoverImage('')} style={styles.removeCover}>Remove</button>
          </div>
        ) : (
          <div style={styles.coverWarning}>
            <span>A cover image is required before sending. Drop one into the editor, or:</span>
            <button onClick={() => setShowImagePicker(true)} style={styles.pickImageBtn}>Choose Image</button>
          </div>
        )}
      </div>

      <TipTapEditor
        content={bodyHtml}
        onUpdate={setBodyHtml}
        onImageUpload={handleImageUpload}
      />

      {showPreview && (
        <PreviewModal
          subject={subject}
          bodyHtml={bodyHtml}
          firstName="Tarun"
          onClose={() => setShowPreview(false)}
        />
      )}

      {showImagePicker && (
        <ImageUploader
          onSelect={(url) => { setCoverImage(url); setShowImagePicker(false); }}
          onClose={() => setShowImagePicker(false)}
        />
      )}
    </div>
  );
}

const styles = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16, flexWrap: 'wrap', gap: 12,
  },
  title: { fontWeight: 400, fontSize: 24, color: '#fff', margin: 0 },
  actions: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer',
    letterSpacing: '0.02em',
  },
  secondaryBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
  },
  subjectInput: {
    width: '100%', padding: '14px 16px', fontSize: 20, fontWeight: 400,
    border: '1px solid #2a2520', borderRadius: 8, background: '#1a1816', color: '#fff',
    outline: 'none', marginBottom: 16, boxSizing: 'border-box',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  coverRow: { marginBottom: 16 },
  coverPreview: {
    display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 8,
  },
  coverThumb: { width: 60, height: 40, objectFit: 'cover', borderRadius: 4 },
  coverLabel: { color: '#a89d91', fontSize: 13, flex: 1 },
  removeCover: {
    background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 12,
    cursor: 'pointer', textDecoration: 'underline',
  },
  changeCover: {
    background: 'transparent', border: 'none', color: '#b85c38', fontSize: 12,
    cursor: 'pointer', textDecoration: 'underline',
  },
  coverWarning: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, color: '#b85c38', fontSize: 13, padding: '12px 16px', background: '#1e1c19',
    borderRadius: 8, border: '1px solid #2a2520', flexWrap: 'wrap',
  },
  pickImageBtn: {
    padding: '6px 16px', fontSize: 13, background: '#b85c38', color: '#fff',
    border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  successBanner: {
    padding: '12px 16px', background: '#1e3a1e', color: '#7dca7d', borderRadius: 8,
    fontSize: 14, marginBottom: 16,
  },
  errorBanner: {
    padding: '12px 16px', background: '#3a1e1e', color: '#ca7d7d', borderRadius: 8,
    fontSize: 14, marginBottom: 16,
  },
  aiBanner: {
    padding: '10px 16px', background: '#1e1c19', color: '#a89d91', borderRadius: 8,
    fontSize: 13, marginBottom: 16, border: '1px solid #2a2520',
  },
};
