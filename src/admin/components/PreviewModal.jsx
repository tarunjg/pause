export default function PreviewModal({ subject, bodyHtml, coverImage, firstName, onClose }) {
  const greeting = firstName ? `Hey ${firstName},` : 'Hey,';
  const greetingHtml = `<p>${greeting}</p>`;
  const coverImageHtml = coverImage
    ? `<img src="${coverImage}" alt="" style="width:100%;border-radius:12px;margin:16px 0 24px;display:block;" />`
    : '';

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #2a2520; line-height: 1.7; margin: 0; padding: 0; background: #faf8f5; }
    .container { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
    .logo { font-weight: 600; font-size: 15px; letter-spacing: 0.14em; color: #141210; margin-bottom: 32px; }
    .logo-mark { color: #b85c38; }
    h1 { font-size: 24px; font-weight: 400; color: #141210; margin-bottom: 24px; }
    h2 { font-size: 20px; font-weight: 600; color: #141210; margin-top: 32px; margin-bottom: 12px; }
    p { font-size: 16px; margin-bottom: 16px; }
    a { color: #b85c38; }
    blockquote { border-left: 3px solid #b85c38; padding-left: 16px; margin: 24px 0; color: #6d6259; font-style: italic; }
    img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
    .signature { margin-top: 28px; color: #2a2520; font-size: 16px; }
    .signature a { color: #b85c38; text-decoration: none; }
    .banner { margin-top: 40px; text-align: center; }
    .banner img { width: 80%; border-radius: 12px; display: block; margin: 0 auto; }
    .banner-buttons { text-align: center; margin-top: 16px; }
    .banner-btn { display: inline-block; padding: 10px 32px; margin: 6px 12px; font-size: 14px; font-weight: 500; border-radius: 100px; text-decoration: none; background: transparent; color: #a89d91; border: 1px solid #e8e3dc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-mark">&#9673;</span> PAUSE</div>
    ${greetingHtml}
    ${coverImageHtml}
    ${bodyHtml}
    <div class="signature">
      <p>Warmly,</p>
      <p>Tarun</p>
    </div>
    <div class="banner">
      <a href="https://www.pauselab.org/#book"><img src="https://www.pauselab.org/pause-book.jpeg" alt="Pause book" /></a>
      <div class="banner-buttons">
        <a href="#" class="banner-btn">Learn More</a>
        <a href="#" class="banner-btn">Subscribe</a>
        <a href="#" class="banner-btn">Unsubscribe</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <div>
            <span style={styles.label}>Subject:</span>
            <span style={styles.subject}>{subject || '(no subject)'}</span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>Close</button>
        </div>
        <iframe
          srcDoc={fullHtml}
          style={styles.iframe}
          title="Email Preview"
          sandbox="allow-same-origin"
        />
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
    background: '#fff', borderRadius: 12, width: '100%', maxWidth: 700,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 20px', borderBottom: '1px solid #e8e3dc',
  },
  label: { color: '#6d6259', fontSize: 13, marginRight: 8 },
  subject: { color: '#2a2520', fontSize: 15, fontWeight: 500 },
  closeBtn: {
    background: 'transparent', border: '1px solid #e8e3dc', padding: '6px 16px',
    borderRadius: 100, fontSize: 13, cursor: 'pointer', color: '#6d6259',
  },
  iframe: { flex: 1, border: 'none', minHeight: 500, background: '#faf8f5' },
};
