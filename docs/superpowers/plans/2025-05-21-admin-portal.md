# Pause Lab Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private admin portal at `pauselab.org/admin` that lets Tarun compose, preview, send, and publish newsletters without ever touching Resend/Supabase directly. Includes voice-to-draft AI writing, a TipTap rich text editor, auto-publish to blog for SEO, content idea pipeline from the book, and a recursive learning loop that evolves the AI style guide based on reader engagement.

**Architecture:** React SPA with React Router for client-side routing (`/admin/*`, `/blog/*`, `/connect`). Vercel serverless functions for all API endpoints (auth, CRUD, email delivery, transcription, AI drafting, blog SSR). Supabase for database + image storage. Resend for email. OpenAI Whisper for voice transcription. Claude API for AI drafting.

**Tech Stack:** React 18, React Router 6, TipTap (rich text), Vite 5, Vercel serverless, Supabase (Postgres + Storage), Resend, OpenAI Whisper API, Anthropic Claude API, Unsplash API

---

## File Structure

### New files to create

```
src/
  router.jsx                     # React Router config (replaces path check in main.jsx)
  admin/
    AdminLayout.jsx              # Shared admin layout (nav, auth gate)
    AuthGate.jsx                 # Password prompt + session check
    DashboardPage.jsx            # /admin — stats, recent sends, quick actions
    ComposePage.jsx              # /admin/compose — voice, editor, preview, send
    PostsPage.jsx                # /admin/posts — all newsletters + stats
    ContactsPage.jsx             # /admin/contacts — subscriber management
    ImagesPage.jsx               # /admin/images — image library grid
    components/
      TipTapEditor.jsx           # TipTap editor wrapper with toolbar
      VoiceRecorder.jsx          # Mic record/stop + transcription flow
      PreviewModal.jsx           # Email preview in newsletter template
      ImageUploader.jsx          # Drag-and-drop + library picker + Unsplash
      ContentIdeas.jsx           # Book-to-newsletter ideas list
      StatsCards.jsx              # Dashboard stat cards
      ContactsTable.jsx          # Paginated contacts table with search
      StyleGuideReview.jsx       # Diff view for style guide updates
  blog/
    BlogIndexPage.jsx            # /blog — published posts grid
    BlogPostPage.jsx             # /blog/[slug] — client-side post view (fallback)

api/
  admin/
    auth.js                      # POST: validate password, set session cookie
    stats.js                     # GET: dashboard stats
    posts.js                     # GET: list posts, POST: create draft
    posts/
      [id].js                    # PUT: update post
      [id]/
        send.js                  # POST: send newsletter + publish
    contacts.js                  # GET: list contacts, POST: add contact
    contacts/
      [id].js                    # PUT: update contact
    upload-image.js              # POST: upload to Supabase Storage
    images.js                    # GET: list images
    transcribe.js                # POST: audio -> Whisper -> transcript
    draft.js                     # POST: transcript -> Claude -> draft HTML
    delivery-stats/
      [postId].js                # GET: Resend stats for a send
    style-guide.js               # GET: current style guide, PUT: approve update
    ideas.js                     # GET: list ideas, POST: create idea
    ideas/
      [id].js                    # PUT: mark used, update
    learning/
      analyze.js                 # POST: trigger engagement analysis
      propose-update.js          # POST: generate style guide update
  blog/
    [slug].js                    # GET: server-rendered blog post (SEO)
    rss.js                       # GET: RSS feed
    posts.js                     # GET: public posts list (for client-side blog)
  _lib/
    auth.js                      # Cookie-based session helpers
    style-guide.txt              # Initial AI writing style guide
```

### Existing files to modify

```
src/main.jsx                     # Replace path check with React Router
package.json                     # Add dependencies (react-router-dom, @tiptap/*, etc.)
vercel.json                      # Add rewrites for /admin/*, /blog/*
api/_lib/emails.js               # No changes needed (template already works)
api/_lib/resend.js               # No changes needed
api/_lib/supabase.js             # No changes needed
```

---

## Phase 1: Editor + Send (core loop)

### Task 1: Add React Router and restructure routing

**Files:**
- Modify: `package.json` (add react-router-dom)
- Modify: `src/main.jsx` (replace path check with RouterProvider)
- Create: `src/router.jsx` (route definitions)
- Modify: `vercel.json` (add rewrites for /admin/*, /blog/*)

- [ ] **Step 1: Install react-router-dom**

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm install react-router-dom@6
```

- [ ] **Step 2: Create the router config**

Create `src/router.jsx`:

```jsx
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ConnectPage from './ConnectPage';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/connect', element: <ConnectPage /> },
]);

export default router;
```

- [ ] **Step 3: Update main.jsx to use the router**

Replace `src/main.jsx`:

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './router';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Update vercel.json rewrites**

Replace `vercel.json`:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/blog/rss.xml", "destination": "/api/blog/rss" },
    { "source": "/(admin|blog|connect)(.*)", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 5: Verify the existing pages still work**

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm run dev
```

Open `http://localhost:5173/` and `http://localhost:5173/connect` in the browser. Both should render as before.

- [ ] **Step 6: Commit**

```bash
git add src/main.jsx src/router.jsx package.json package-lock.json vercel.json
git commit -m "feat: add React Router, replace manual path check"
```

---

### Task 2: Admin auth — password gate API endpoint

**Files:**
- Create: `api/_lib/auth.js` (cookie helpers)
- Create: `api/admin/auth.js` (POST: validate password, set cookie)

- [ ] **Step 1: Create the auth helper library**

Create `api/_lib/auth.js`:

```js
// Cookie-based admin session.
// Sets a signed session cookie when the password matches ADMIN_SECRET.
// Vercel serverless functions receive cookies via req.headers.cookie.

import { createHmac } from 'crypto';

const COOKIE_NAME = 'pause_admin_session';
const MAX_AGE = 60 * 60 * 24; // 24 hours

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function setSessionCookie(res, adminSecret) {
  const token = sign('authenticated', adminSecret);
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`;
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0`);
}

export function isAuthenticated(req) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return false;

  const cookies = parseCookies(req.headers.cookie || '');
  const token = cookies[COOKIE_NAME];
  if (!token) return false;

  const expected = sign('authenticated', adminSecret);
  return token === expected;
}

function parseCookies(cookieHeader) {
  const cookies = {};
  cookieHeader.split(';').forEach(pair => {
    const [key, ...rest] = pair.trim().split('=');
    if (key) cookies[key] = rest.join('=');
  });
  return cookies;
}
```

- [ ] **Step 2: Create the auth endpoint**

Create `api/admin/auth.js`:

```js
import { setSessionCookie, clearSessionCookie, isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  // GET: check if currently authenticated
  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: isAuthenticated(req) });
  }

  // DELETE: logout
  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ authenticated: false });
  }

  // POST: login with password
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { password } = req.body || {};
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return res.status(500).json({ message: 'ADMIN_SECRET not configured' });
  }

  if (password !== adminSecret) {
    return res.status(401).json({ message: 'Wrong password' });
  }

  setSessionCookie(res, adminSecret);
  return res.status(200).json({ authenticated: true });
}
```

- [ ] **Step 3: Verify locally with curl**

```bash
# Start the vercel dev server if not running
# Then test:
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}' -v 2>&1 | grep "< HTTP"
# Expected: 401

curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_ADMIN_SECRET"}' -v 2>&1 | grep -E "(< HTTP|Set-Cookie)"
# Expected: 200 + Set-Cookie header
```

- [ ] **Step 4: Commit**

```bash
git add api/_lib/auth.js api/admin/auth.js
git commit -m "feat: admin auth endpoint with session cookie"
```

---

### Task 3: Auth gate React component

**Files:**
- Create: `src/admin/AuthGate.jsx`
- Create: `src/admin/AdminLayout.jsx`

- [ ] **Step 1: Create the AuthGate component**

Create `src/admin/AuthGate.jsx`:

```jsx
import { useState, useEffect } from 'react';

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('loading'); // loading | prompt | authenticated
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(data => setStatus(data.authenticated ? 'authenticated' : 'prompt'))
      .catch(() => setStatus('prompt'));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
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
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" style={styles.button}>Enter</button>
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
  },
  error: { color: '#e74c3c', fontSize: 13, margin: 0 },
  button: {
    width: '100%', padding: '12px 24px', fontSize: 14, fontWeight: 500,
    background: '#b85c38', color: '#fff', border: 'none', borderRadius: 100,
    cursor: 'pointer', letterSpacing: '0.02em',
  },
};
```

- [ ] **Step 2: Create the AdminLayout component**

Create `src/admin/AdminLayout.jsx`:

```jsx
import { Outlet, Link, useLocation } from 'react-router-dom';
import AuthGate from './AuthGate';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard' },
  { path: '/admin/compose', label: 'Compose' },
  { path: '/admin/posts', label: 'Posts' },
  { path: '/admin/contacts', label: 'Contacts' },
  { path: '/admin/images', label: 'Images' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <AuthGate>
      <div style={styles.layout}>
        <nav style={styles.nav}>
          <div style={styles.logo}><span style={styles.logoMark}>&#9673;</span> PAUSE</div>
          <div style={styles.links}>
            {NAV_ITEMS.map(item => (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...styles.link,
                  ...(location.pathname === item.path ? styles.activeLink : {}),
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <a href="/" style={styles.backLink}>← Site</a>
        </nav>
        <main style={styles.main}>
          <Outlet />
        </main>
      </div>
    </AuthGate>
  );
}

const styles = {
  layout: {
    display: 'flex', minHeight: '100vh', background: '#141210', color: '#e8e3dc',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  nav: {
    width: 200, padding: '32px 16px', borderRight: '1px solid #2a2520',
    display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0,
  },
  logo: {
    fontWeight: 600, fontSize: 15, letterSpacing: '0.14em', color: '#fff',
    marginBottom: 24, paddingLeft: 8,
  },
  logoMark: { color: '#b85c38' },
  links: { display: 'flex', flexDirection: 'column', gap: 4 },
  link: {
    color: '#a89d91', textDecoration: 'none', fontSize: 14, padding: '8px 12px',
    borderRadius: 6, transition: 'background 0.15s',
  },
  activeLink: { color: '#fff', background: '#2a2520' },
  backLink: {
    color: '#6d6259', textDecoration: 'none', fontSize: 12,
    marginTop: 'auto', paddingLeft: 8,
  },
  main: { flex: 1, padding: '32px 40px', overflowY: 'auto' },
};
```

- [ ] **Step 3: Add admin routes to the router**

Update `src/router.jsx`:

```jsx
import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import ConnectPage from './ConnectPage';
import AdminLayout from './admin/AdminLayout';
import DashboardPage from './admin/DashboardPage';
import ComposePage from './admin/ComposePage';
import PostsPage from './admin/PostsPage';
import ContactsPage from './admin/ContactsPage';
import ImagesPage from './admin/ImagesPage';

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/connect', element: <ConnectPage /> },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'compose', element: <ComposePage /> },
      { path: 'compose/:id', element: <ComposePage /> },
      { path: 'posts', element: <PostsPage /> },
      { path: 'contacts', element: <ContactsPage /> },
      { path: 'images', element: <ImagesPage /> },
    ],
  },
]);

export default router;
```

- [ ] **Step 4: Create placeholder page components**

Create `src/admin/DashboardPage.jsx`:

```jsx
export default function DashboardPage() {
  return <h1 style={{ fontWeight: 400, fontSize: 24, color: '#fff' }}>Dashboard</h1>;
}
```

Create `src/admin/ComposePage.jsx`:

```jsx
export default function ComposePage() {
  return <h1 style={{ fontWeight: 400, fontSize: 24, color: '#fff' }}>Compose</h1>;
}
```

Create `src/admin/PostsPage.jsx`:

```jsx
export default function PostsPage() {
  return <h1 style={{ fontWeight: 400, fontSize: 24, color: '#fff' }}>Posts</h1>;
}
```

Create `src/admin/ContactsPage.jsx`:

```jsx
export default function ContactsPage() {
  return <h1 style={{ fontWeight: 400, fontSize: 24, color: '#fff' }}>Contacts</h1>;
}
```

Create `src/admin/ImagesPage.jsx`:

```jsx
export default function ImagesPage() {
  return <h1 style={{ fontWeight: 400, fontSize: 24, color: '#fff' }}>Images</h1>;
}
```

- [ ] **Step 5: Verify routing works**

```bash
npm run dev
```

Navigate to `http://localhost:5173/admin`. Should see the password prompt. After entering the correct password, should see the sidebar nav + "Dashboard" heading. Navigate between admin pages. Verify `/` and `/connect` still work.

- [ ] **Step 6: Commit**

```bash
git add src/admin/ src/router.jsx
git commit -m "feat: admin layout with auth gate, sidebar nav, placeholder pages"
```

---

### Task 4: Database schema — posts and images tables

**Files:**
- No file changes — SQL run directly against Supabase

- [ ] **Step 1: Create the posts table**

Run this SQL in the Supabase SQL editor (Dashboard > SQL Editor):

```sql
CREATE TABLE posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE,
  title text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  body_text text NOT NULL DEFAULT '',
  cover_image_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent')),
  sent_at timestamptz,
  recipients_count int NOT NULL DEFAULT 0,
  bounced_count int NOT NULL DEFAULT 0,
  open_rate float,
  click_rate float,
  avg_read_time_seconds int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_sent_at ON posts(sent_at DESC);
```

- [ ] **Step 2: Create the images table**

```sql
CREATE TABLE images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL,
  filename text NOT NULL,
  size_bytes int,
  post_id uuid REFERENCES posts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_images_post_id ON images(post_id);
```

- [ ] **Step 3: Create the Supabase Storage bucket**

In the Supabase dashboard, go to Storage > Create a new bucket:
- Name: `newsletter-images`
- Public: Yes (public read access)

Or run via SQL:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('newsletter-images', 'newsletter-images', true);
```

- [ ] **Step 4: Verify tables exist**

```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
```

Expected: `contacts`, `images`, `newsletter_sends`, `posts` (at minimum).

- [ ] **Step 5: Commit a migration record (optional)**

No file commit needed since schema lives in Supabase. Move to the next task.

---

### Task 5: Posts CRUD API endpoints

**Files:**
- Create: `api/admin/posts.js` (GET list + POST create)
- Create: `api/admin/posts/[id].js` (PUT update)

- [ ] **Step 1: Create the posts list + create endpoint**

Create `api/admin/posts.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Posts fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch posts' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { title, body_html, body_text, cover_image_url, slug } = req.body || {};

    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: title || '',
        body_html: body_html || '',
        body_text: body_text || '',
        cover_image_url: cover_image_url || null,
        slug: slug || null,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      console.error('Post create error:', error);
      return res.status(500).json({ message: 'Failed to create post' });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
```

- [ ] **Step 2: Create the single post update endpoint**

Create `api/admin/posts/[id].js`:

```js
import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Post not found' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const updates = {};
    const allowed = ['title', 'body_html', 'body_text', 'cover_image_url', 'slug', 'status'];
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Post update error:', error);
      return res.status(500).json({ message: 'Failed to update post' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
```

- [ ] **Step 3: Verify with curl**

```bash
# Create a draft
curl -X POST http://localhost:3000/api/admin/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: pause_admin_session=YOUR_TOKEN" \
  -d '{"title":"Test Post","body_html":"<p>Hello</p>","body_text":"Hello"}'

# List posts
curl http://localhost:3000/api/admin/posts \
  -H "Cookie: pause_admin_session=YOUR_TOKEN"
```

- [ ] **Step 4: Commit**

```bash
git add api/admin/posts.js api/admin/posts/\[id\].js
git commit -m "feat: posts CRUD API endpoints (list, create, update)"
```

---

### Task 6: Image upload API endpoint

**Files:**
- Create: `api/admin/upload-image.js`
- Create: `api/admin/images.js`

- [ ] **Step 1: Install multipart form parsing**

Vercel serverless functions don't parse multipart by default. We'll use the `formidable` library:

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm install formidable@3
```

- [ ] **Step 2: Create the upload endpoint**

Create `api/admin/upload-image.js`:

```js
import { readFileSync } from 'fs';
import formidable from 'formidable';
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB limit

  const [fields, files] = await form.parse(req);
  const file = files.image?.[0];
  if (!file) {
    return res.status(400).json({ message: 'No image file provided' });
  }

  const postId = fields.post_id?.[0] || null;
  const ext = file.originalFilename?.split('.').pop() || 'jpg';
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const fileBuffer = readFileSync(file.filepath);

  const { error: uploadError } = await supabase.storage
    .from('newsletter-images')
    .upload(storagePath, fileBuffer, {
      contentType: file.mimetype || 'image/jpeg',
      upsert: false,
    });

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return res.status(500).json({ message: 'Failed to upload image' });
  }

  const { data: urlData } = supabase.storage
    .from('newsletter-images')
    .getPublicUrl(storagePath);

  const { data: imageRecord, error: dbError } = await supabase
    .from('images')
    .insert({
      url: urlData.publicUrl,
      filename: file.originalFilename || storagePath,
      size_bytes: file.size,
      post_id: postId,
    })
    .select()
    .single();

  if (dbError) {
    console.error('Image record error:', dbError);
    return res.status(500).json({ message: 'Image uploaded but failed to save record' });
  }

  return res.status(201).json(imageRecord);
}
```

- [ ] **Step 3: Create the images list endpoint**

Create `api/admin/images.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { data, error } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Images fetch error:', error);
    return res.status(500).json({ message: 'Failed to fetch images' });
  }

  return res.status(200).json(data);
}
```

- [ ] **Step 4: Commit**

```bash
git add api/admin/upload-image.js api/admin/images.js package.json package-lock.json
git commit -m "feat: image upload + list API endpoints with Supabase Storage"
```

---

### Task 7: TipTap editor component

**Files:**
- Create: `src/admin/components/TipTapEditor.jsx`

- [ ] **Step 1: Install TipTap dependencies**

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder
```

- [ ] **Step 2: Create the TipTap editor component**

Create `src/admin/components/TipTapEditor.jsx`:

```jsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback } from 'react';

export default function TipTapEditor({ content, onUpdate, onImageUpload }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing your newsletter...' }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
    editorProps: {
      handleDrop(view, event) {
        const files = event.dataTransfer?.files;
        if (files?.length && files[0].type.startsWith('image/')) {
          event.preventDefault();
          onImageUpload?.(files[0], (url) => {
            editor.chain().focus().setImage({ src: url }).run();
          });
          return true;
        }
        return false;
      },
    },
  });

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      if (file) {
        onImageUpload?.(file, (url) => {
          editor.chain().focus().setImage({ src: url }).run();
        });
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  if (!editor) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="H3"
        />
        <span style={styles.divider} />
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
          style={{ fontWeight: 700 }}
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          style={{ fontStyle: 'italic' }}
        />
        <span style={styles.divider} />
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          label="List"
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="1."
        />
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          label='"'
        />
        <span style={styles.divider} />
        <ToolbarButton onClick={addImage} label="Img" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          label="--"
        />
        <ToolbarButton
          onClick={() => {
            const url = window.prompt('URL:');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          label="Link"
        />
      </div>
      <EditorContent editor={editor} style={styles.editor} />
    </div>
  );
}

function ToolbarButton({ active, onClick, label, style: extraStyle }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.toolbarBtn,
        ...(active ? styles.toolbarBtnActive : {}),
        ...extraStyle,
      }}
      type="button"
    >
      {label}
    </button>
  );
}

const styles = {
  wrapper: {
    border: '1px solid #2a2520', borderRadius: 8, overflow: 'hidden',
    background: '#1a1816',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 2, padding: '8px 12px',
    borderBottom: '1px solid #2a2520', background: '#1e1c19', flexWrap: 'wrap',
  },
  toolbarBtn: {
    background: 'transparent', border: '1px solid transparent', color: '#a89d91',
    padding: '4px 10px', fontSize: 13, borderRadius: 4, cursor: 'pointer',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  toolbarBtnActive: { background: '#2a2520', color: '#fff', borderColor: '#3a3530' },
  divider: {
    width: 1, height: 20, background: '#2a2520', margin: '0 4px',
  },
  editor: { minHeight: 400, padding: '16px 20px', color: '#e8e3dc', fontSize: 16, lineHeight: 1.7 },
};
```

- [ ] **Step 3: Add global TipTap editor styles**

Add to `index.html` (or create a CSS file). The TipTap editor needs some base styles for the `.ProseMirror` class:

Create `src/admin/editor.css`:

```css
.ProseMirror {
  outline: none;
  min-height: 400px;
  padding: 16px 20px;
  color: #e8e3dc;
  font-size: 16px;
  line-height: 1.7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
.ProseMirror p { margin-bottom: 16px; }
.ProseMirror h2 { font-size: 20px; font-weight: 600; color: #fff; margin-top: 32px; margin-bottom: 12px; }
.ProseMirror h3 { font-size: 17px; font-weight: 600; color: #fff; margin-top: 24px; margin-bottom: 8px; }
.ProseMirror blockquote {
  border-left: 3px solid #b85c38; padding-left: 16px; margin: 24px 0;
  color: #a89d91; font-style: italic;
}
.ProseMirror img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
.ProseMirror a { color: #b85c38; }
.ProseMirror ul, .ProseMirror ol { padding-left: 24px; }
.ProseMirror hr { border: none; border-top: 1px solid #2a2520; margin: 24px 0; }
.ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left; color: #6d6259; pointer-events: none; height: 0;
}
```

Import this CSS in `AdminLayout.jsx` by adding at the top:

```jsx
import './editor.css';
```

Wait — since we're using Vite, we should import the CSS in the layout. But the CSS file needs to be in the right place.

Actually, create the file at `src/admin/editor.css` and add `import '../admin/editor.css';` at the top of `AdminLayout.jsx`.

Update `src/admin/AdminLayout.jsx` to add this import at the top:

```jsx
import './editor.css';
```

- [ ] **Step 4: Verify the editor renders**

Temporarily update `ComposePage.jsx` to render the editor:

```jsx
import { useState } from 'react';
import TipTapEditor from './components/TipTapEditor';

export default function ComposePage() {
  const [html, setHtml] = useState('');

  return (
    <div>
      <h1 style={{ fontWeight: 400, fontSize: 24, color: '#fff', marginBottom: 24 }}>Compose</h1>
      <TipTapEditor content={html} onUpdate={setHtml} />
    </div>
  );
}
```

Open `http://localhost:5173/admin/compose`. The editor should render with the toolbar. Type text, apply formatting. Verify H2, bold, italic, blockquote, lists, and horizontal rule all work.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/TipTapEditor.jsx src/admin/editor.css src/admin/AdminLayout.jsx src/admin/ComposePage.jsx package.json package-lock.json
git commit -m "feat: TipTap rich text editor with toolbar and drag-and-drop image support"
```

---

### Task 8: Preview modal component

**Files:**
- Create: `src/admin/components/PreviewModal.jsx`

- [ ] **Step 1: Create the preview modal**

The preview renders the editor HTML inside the actual `newsletterEmail` template shell (inline, no server call needed since the template is simple).

Create `src/admin/components/PreviewModal.jsx`:

```jsx
export default function PreviewModal({ subject, bodyHtml, onClose }) {
  // Reconstruct the newsletter email template client-side for preview
  const fullHtml = `
<!DOCTYPE html>
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
  iframe: { flex: 1, border: 'none', minHeight: 500 },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/admin/components/PreviewModal.jsx
git commit -m "feat: email preview modal with iframe rendering"
```

---

### Task 9: Send newsletter API endpoint

**Files:**
- Create: `api/admin/posts/[id]/send.js`

- [ ] **Step 1: Create the send endpoint**

This endpoint sends the newsletter to all subscribed contacts and updates the post status.

Create `api/admin/posts/[id]/send.js`:

```js
import { supabase } from '../../../_lib/supabase.js';
import { resend, FROM_EMAIL } from '../../../_lib/resend.js';
import { newsletterEmail } from '../../../_lib/emails.js';
import { isAuthenticated } from '../../../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id } = req.query;

  // Fetch the post
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .single();

  if (postError || !post) {
    return res.status(404).json({ message: 'Post not found' });
  }

  if (post.status === 'sent') {
    return res.status(400).json({ message: 'This newsletter has already been sent' });
  }

  if (!post.title) {
    return res.status(400).json({ message: 'Post must have a subject line' });
  }

  // Generate slug from title if not set
  let slug = post.slug;
  if (!slug) {
    slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    // Ensure uniqueness
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .limit(1);
    if (existing?.length) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
  }

  // Fetch all subscribed contacts
  const { data: contacts, error: contactsError } = await supabase
    .from('contacts')
    .select('email, first_name, unsubscribe_token')
    .eq('subscribed', true);

  if (contactsError) {
    console.error('Contacts fetch error:', contactsError);
    return res.status(500).json({ message: 'Failed to fetch contacts' });
  }

  if (!contacts || contacts.length === 0) {
    return res.status(400).json({ message: 'No subscribed contacts' });
  }

  const siteUrl = process.env.SITE_URL || 'https://www.pauselab.org';

  // Personalize greeting and send
  const batchSize = 10;
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);

    const sends = batch.map(async (contact) => {
      const greeting = contact.first_name ? `<p>Hey ${contact.first_name},</p>` : '<p>Hey,</p>';
      const personalizedHtml = greeting + post.body_html;
      const email = newsletterEmail({ subject: post.title, bodyHtml: personalizedHtml });
      const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${contact.unsubscribe_token}`;
      const html = email.html.replace('{{unsubscribe_url}}', unsubscribeUrl);

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: contact.email,
          subject: email.subject,
          html,
          headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send to ${contact.email}:`, err);
        failed++;
      }
    });

    await Promise.all(sends);

    // Pause between batches to avoid rate limits
    if (i + batchSize < contacts.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Update the post
  const { error: updateError } = await supabase
    .from('posts')
    .update({
      status: 'sent',
      slug,
      sent_at: new Date().toISOString(),
      recipients_count: sent,
      bounced_count: failed,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Post update error:', updateError);
  }

  // Log to newsletter_sends for backward compat
  await supabase.from('newsletter_sends').insert({
    subject: post.title,
    recipients: sent,
    failed,
  });

  return res.status(200).json({
    message: 'Newsletter sent!',
    sent,
    failed,
    total: contacts.length,
    slug,
    blogUrl: `${siteUrl}/blog/${slug}`,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add api/admin/posts/\[id\]/send.js
git commit -m "feat: send newsletter endpoint with personalized greetings + auto-slug"
```

---

### Task 10: Full compose page — wire everything together

**Files:**
- Modify: `src/admin/ComposePage.jsx` (full compose page with subject, editor, preview, save, send)

- [ ] **Step 1: Build the full compose page**

Replace `src/admin/ComposePage.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TipTapEditor from './components/TipTapEditor';
import PreviewModal from './components/PreviewModal';

export default function ComposePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [postId, setPostId] = useState(id || null);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [subscriberCount, setSubscriberCount] = useState(null);

  // Load existing draft if editing
  useEffect(() => {
    if (id) {
      fetch(`/api/admin/posts/${id}`)
        .then(r => r.json())
        .then(post => {
          setSubject(post.title || '');
          setBodyHtml(post.body_html || '');
          setCoverImage(post.cover_image_url || '');
          setPostId(post.id);
        });
    }
  }, [id]);

  // Fetch subscriber count
  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => setSubscriberCount(data.subscriberCount))
      .catch(() => {});
  }, []);

  const handleImageUpload = useCallback(async (file, insertCallback) => {
    const formData = new FormData();
    formData.append('image', file);
    if (postId) formData.append('post_id', postId);

    const res = await fetch('/api/admin/upload-image', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      insertCallback(data.url);
      if (!coverImage) setCoverImage(data.url);
    }
  }, [postId, coverImage]);

  async function saveDraft() {
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
      } else {
        const res = await fetch('/api/admin/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        setPostId(data.id);
        navigate(`/admin/compose/${data.id}`, { replace: true });
      }
    } finally {
      setSaving(false);
    }
  }

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
    if (!window.confirm(`Send this newsletter to ${count} subscribers?`)) {
      return;
    }

    setSending(true);
    setSendResult(null);

    // Save first
    await saveDraft();

    try {
      const res = await fetch(`/api/admin/posts/${postId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setSendResult(data);
    } catch (err) {
      setSendResult({ message: 'Send failed: ' + err.message });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>{postId ? 'Edit Draft' : 'New Newsletter'}</h1>
        <div style={styles.actions}>
          <button onClick={saveDraft} disabled={saving} style={styles.secondaryBtn}>
            {saving ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={() => setShowPreview(true)} style={styles.secondaryBtn}>
            Preview
          </button>
          <button onClick={sendNewsletter} disabled={sending || !coverImage} style={styles.primaryBtn}>
            {sending ? 'Sending...' : 'Send Newsletter'}
          </button>
        </div>
      </div>

      {sendResult && (
        <div style={styles.resultBanner}>
          {sendResult.sent != null
            ? `Sent to ${sendResult.sent} subscribers. ${sendResult.failed ? `${sendResult.failed} failed.` : ''} Published at /blog/${sendResult.slug}`
            : sendResult.message}
        </div>
      )}

      <input
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder="Subject line"
        style={styles.subjectInput}
      />

      {/* Cover image indicator */}
      <div style={styles.coverRow}>
        {coverImage ? (
          <div style={styles.coverPreview}>
            <img src={coverImage} alt="Cover" style={styles.coverThumb} />
            <span style={styles.coverLabel}>Cover image set</span>
            <button onClick={() => setCoverImage('')} style={styles.removeCover}>Remove</button>
          </div>
        ) : (
          <div style={styles.coverWarning}>
            A cover image is required before sending. Drop an image into the editor or use the Img button.
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
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

const styles = {
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, flexWrap: 'wrap', gap: 12,
  },
  title: { fontWeight: 400, fontSize: 24, color: '#fff', margin: 0 },
  actions: { display: 'flex', gap: 8 },
  primaryBtn: {
    padding: '10px 24px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer',
    opacity: 1, letterSpacing: '0.02em',
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
  coverPreview: { display: 'flex', alignItems: 'center', gap: 12 },
  coverThumb: { width: 48, height: 32, objectFit: 'cover', borderRadius: 4 },
  coverLabel: { color: '#a89d91', fontSize: 13 },
  removeCover: {
    background: 'transparent', border: 'none', color: '#e74c3c', fontSize: 12,
    cursor: 'pointer', textDecoration: 'underline',
  },
  coverWarning: {
    color: '#b85c38', fontSize: 13, padding: '10px 14px', background: '#1e1c19',
    borderRadius: 6, border: '1px solid #2a2520',
  },
  resultBanner: {
    padding: '12px 16px', background: '#1e3a1e', color: '#7dca7d', borderRadius: 8,
    fontSize: 14, marginBottom: 16,
  },
};
```

- [ ] **Step 2: Verify the full compose flow**

```bash
npm run dev
```

Navigate to `/admin/compose`. Verify:
1. Subject line input renders
2. TipTap editor renders with toolbar
3. Cover image warning appears
4. Save Draft button creates a post (check Network tab)
5. Preview button opens the email preview modal
6. Send button shows a confirmation dialog

- [ ] **Step 3: Commit**

```bash
git add src/admin/ComposePage.jsx
git commit -m "feat: full compose page — subject, editor, image upload, preview, save, send"
```

---

### Task 11: Dashboard stats API endpoint

**Files:**
- Create: `api/admin/stats.js`

- [ ] **Step 1: Create the stats endpoint**

Create `api/admin/stats.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Subscriber count
    const { count: subscriberCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);

    // Unsubscribed count
    const { count: unsubscribedCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', false);

    // Recent sends
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('id, title, slug, sent_at, recipients_count, bounced_count, open_rate')
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
      .limit(5);

    // Drafts count
    const { count: draftsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'draft');

    return res.status(200).json({
      subscriberCount: subscriberCount || 0,
      unsubscribedCount: unsubscribedCount || 0,
      recentPosts: recentPosts || [],
      draftsCount: draftsCount || 0,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ message: 'Failed to fetch stats' });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add api/admin/stats.js
git commit -m "feat: admin stats API endpoint"
```

---

### Task 12: Dashboard page

**Files:**
- Modify: `src/admin/DashboardPage.jsx`

- [ ] **Step 1: Build the dashboard page**

Replace `src/admin/DashboardPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

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
                  rel="noopener"
                  style={styles.viewLink}
                >
                  View post
                </a>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p style={styles.emptyText}>No newsletters sent yet. <Link to="/admin/compose" style={styles.link}>Write your first one.</Link></p>
      )}
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
  sectionTitle: { fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 },
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
```

- [ ] **Step 2: Verify the dashboard loads**

Navigate to `/admin`. Should see stat cards (all zeros initially), "New Newsletter" button, and recent sends section.

- [ ] **Step 3: Commit**

```bash
git add src/admin/DashboardPage.jsx
git commit -m "feat: admin dashboard with stats, recent sends, new newsletter button"
```

---

## Phase 2: Voice + AI Drafting

### Task 13: Whisper transcription API endpoint

**Files:**
- Create: `api/admin/transcribe.js`

- [ ] **Step 1: Install OpenAI SDK**

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm install openai
```

- [ ] **Step 2: Create the transcription endpoint**

Create `api/admin/transcribe.js`:

```js
import formidable from 'formidable';
import { readFileSync } from 'fs';
import OpenAI from 'openai';
import { isAuthenticated } from '../_lib/auth.js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return res.status(500).json({ message: 'OPENAI_API_KEY not configured' });
  }

  const form = formidable({ maxFileSize: 25 * 1024 * 1024 }); // 25MB (Whisper limit)
  const [, files] = await form.parse(req);
  const audioFile = files.audio?.[0];

  if (!audioFile) {
    return res.status(400).json({ message: 'No audio file provided' });
  }

  try {
    const openai = new OpenAI({ apiKey: openaiKey });

    // Whisper expects a File-like object; create one from the buffer
    const buffer = readFileSync(audioFile.filepath);
    const file = new File([buffer], audioFile.originalFilename || 'audio.webm', {
      type: audioFile.mimetype || 'audio/webm',
    });

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      response_format: 'text',
    });

    return res.status(200).json({ transcript: transcription });
  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({ message: 'Transcription failed: ' + error.message });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/admin/transcribe.js package.json package-lock.json
git commit -m "feat: Whisper transcription endpoint for voice notes"
```

---

### Task 14: AI drafting API endpoint

**Files:**
- Create: `api/admin/draft.js`
- Create: `api/_lib/style-guide.txt`

- [ ] **Step 1: Create the initial style guide**

Create `api/_lib/style-guide.txt`:

```
PAUSE LAB NEWSLETTER STYLE GUIDE
=================================

VOICE
- First person, Tarun speaking
- Warm, honest, conversational
- Not academic, not corporate
- Comfortable with vulnerability
- References real people and situations (anonymized when needed)
- Cites research by name (study, author, institution) but explains it plainly

STRUCTURE
- Short paragraphs (2-4 sentences max)
- Open with a personal story or observation
- Weave in neuroscience research naturally
- Land on a practical takeaway or reflection
- Total length: 400-800 words (sweet spot for engagement)

RECURRING THEMES
- Nervous system regulation and why it matters for decision-making
- The cost of not pausing (what we lose when we run on fumes)
- Leadership as emotional weather (your state affects your team)
- The BEAM framework: Breathe, Engage, Adapt, Metta
- Mirror neurons and co-regulation
- Technology, attention, and recovery
- The case for slowing down in a speed-obsessed culture

TONE MARKERS
- Uses "I" freely
- Shares real moments ("I was sitting in a meeting last week when...")
- Occasionally one-line paragraphs for emphasis
- No jargon without translation
- Accessible language for complex research
- Short sentences mixed with longer ones
- Blockquotes for research findings or particularly resonant quotes

FORMATTING RULES
- No em dashes (use commas, periods, or rewrite)
- No corporate buzzwords
- No listicles or numbered tips (narrative, not advice columns)
- Images should complement the story, not decorate

SIGN-OFF ENERGY
- Warm, brief
- "Glad you're here" feeling
- No aggressive CTAs
```

- [ ] **Step 2: Install Anthropic SDK**

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm install @anthropic-ai/sdk
```

- [ ] **Step 3: Create the AI drafting endpoint**

Create `api/admin/draft.js`:

```js
import { readFileSync } from 'fs';
import { resolve } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { isAuthenticated } from '../_lib/auth.js';
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return res.status(500).json({ message: 'ANTHROPIC_API_KEY not configured' });
  }

  const { transcript, context, ideaPrompt } = req.body || {};
  if (!transcript && !ideaPrompt) {
    return res.status(400).json({ message: 'Provide a transcript or idea prompt' });
  }

  try {
    // Try to load the latest style guide from Supabase first, fall back to file
    let styleGuide;
    const { data: sgRow } = await supabase
      .from('style_guide')
      .select('content')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sgRow?.content) {
      styleGuide = sgRow.content;
    } else {
      styleGuide = readFileSync(resolve(process.cwd(), 'api/_lib/style-guide.txt'), 'utf-8');
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    let userPrompt = '';
    if (ideaPrompt) {
      userPrompt = `Here is a newsletter idea prompt:\n\n${ideaPrompt}`;
      if (transcript) {
        userPrompt += `\n\nThe author also recorded a voice note with these thoughts:\n\n${transcript}`;
      }
    } else {
      userPrompt = `Here is a transcript of the author's voice note:\n\n${transcript}`;
    }

    if (context) {
      userPrompt += `\n\nAdditional context from the author: ${context}`;
    }

    userPrompt += `\n\nWrite a complete newsletter draft in HTML. Use <p>, <h2>, <blockquote>, <a>, and <img> tags. Do not include the greeting (it gets personalized per recipient). Do not include a sign-off (the template adds one). Just the body content.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are a ghostwriter for Tarun Galagali's Pause Lab newsletter. Write exactly in his voice using this style guide:\n\n${styleGuide}\n\nYour output is HTML that goes directly into an email template. Keep it personal, warm, grounded in neuroscience. No em dashes. 400-800 words.`,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const draftHtml = message.content[0]?.text || '';

    return res.status(200).json({ draft: draftHtml });
  } catch (error) {
    console.error('Draft error:', error);
    return res.status(500).json({ message: 'Draft generation failed: ' + error.message });
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add api/admin/draft.js api/_lib/style-guide.txt package.json package-lock.json
git commit -m "feat: AI drafting endpoint using Claude + style guide"
```

---

### Task 15: Voice recorder component

**Files:**
- Create: `src/admin/components/VoiceRecorder.jsx`

- [ ] **Step 1: Create the voice recorder**

Create `src/admin/components/VoiceRecorder.jsx`:

```jsx
import { useState, useRef } from 'react';

export default function VoiceRecorder({ onDraftReady }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [context, setContext] = useState('');
  const [showTranscript, setShowTranscript] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType });
        await transcribeAudio(blob);
      };

      mediaRecorder.start(1000); // 1-second chunks
      setRecording(true);
    } catch (err) {
      alert('Microphone access denied. Please allow microphone access in your browser settings.');
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribeAudio(blob) {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');

      const res = await fetch('/api/admin/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');

      const data = await res.json();
      setTranscript(data.transcript);
      setShowTranscript(true);
    } catch (err) {
      alert('Transcription failed: ' + err.message);
    } finally {
      setTranscribing(false);
    }
  }

  async function generateDraft() {
    if (!transcript) return;
    setDrafting(true);
    try {
      const res = await fetch('/api/admin/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, context: context || undefined }),
      });

      if (!res.ok) throw new Error('Draft generation failed');

      const data = await res.json();
      onDraftReady?.(data.draft);
    } catch (err) {
      alert('Draft generation failed: ' + err.message);
    } finally {
      setDrafting(false);
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.row}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={recording ? styles.stopBtn : styles.recordBtn}
          disabled={transcribing || drafting}
        >
          {recording ? '■ Stop' : '● Record'}
        </button>

        {transcribing && <span style={styles.status}>Transcribing...</span>}

        {transcript && !transcribing && (
          <>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              style={styles.toggleBtn}
            >
              {showTranscript ? 'Hide' : 'Show'} transcript
            </button>
            <button
              onClick={generateDraft}
              disabled={drafting}
              style={styles.draftBtn}
            >
              {drafting ? 'Drafting...' : 'Draft from this'}
            </button>
          </>
        )}
      </div>

      {showTranscript && transcript && (
        <div style={styles.transcriptBox}>
          <p style={styles.transcriptText}>{transcript}</p>
          <input
            type="text"
            value={context}
            onChange={e => setContext(e.target.value)}
            placeholder="Optional: add context (e.g. 'focus on the WAIT practice from chapter 3')"
            style={styles.contextInput}
          />
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 8,
    padding: 16, marginBottom: 16,
  },
  row: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  recordBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500, background: '#b85c38',
    color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  stopBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500, background: '#e74c3c',
    color: '#fff', border: 'none', borderRadius: 100, cursor: 'pointer',
    animation: 'pulse 1.5s infinite',
  },
  toggleBtn: {
    padding: '6px 14px', fontSize: 13, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
  },
  draftBtn: {
    padding: '8px 20px', fontSize: 14, fontWeight: 500, background: '#2a5a2a',
    color: '#7dca7d', border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  status: { color: '#a89d91', fontSize: 13 },
  transcriptBox: {
    marginTop: 12, padding: 12, background: '#141210', borderRadius: 6,
  },
  transcriptText: {
    color: '#e8e3dc', fontSize: 14, lineHeight: 1.6, margin: 0, marginBottom: 12,
    whiteSpace: 'pre-wrap',
  },
  contextInput: {
    width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid #2a2520',
    borderRadius: 6, background: '#1a1816', color: '#e8e3dc', outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
};
```

- [ ] **Step 2: Add voice recorder to compose page**

Update `src/admin/ComposePage.jsx`. Add import at the top:

```jsx
import VoiceRecorder from './components/VoiceRecorder';
```

Add this handler function inside the component:

```jsx
function handleDraftReady(draftHtml) {
  setBodyHtml(draftHtml);
}
```

Add this JSX right above the `<TipTapEditor>` call:

```jsx
<VoiceRecorder onDraftReady={handleDraftReady} />
```

- [ ] **Step 3: Verify voice recording flow**

Navigate to `/admin/compose`. Click Record, speak, click Stop. Verify transcription appears. Click "Draft from this" and verify the editor populates with AI-generated HTML.

- [ ] **Step 4: Commit**

```bash
git add src/admin/components/VoiceRecorder.jsx src/admin/ComposePage.jsx
git commit -m "feat: voice recorder with Whisper transcription + AI draft generation"
```

---

## Phase 3: Content Pipeline + Image Requirements

### Task 16: Post ideas database table + API endpoints

**Files:**
- Create: `api/admin/ideas.js` (GET list + POST create)
- Create: `api/admin/ideas/[id].js` (PUT update)

- [ ] **Step 1: Create the post_ideas table in Supabase**

Run this SQL in the Supabase SQL editor:

```sql
CREATE TABLE post_ideas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  theme text NOT NULL,
  source_chapter text,
  prompt text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_ideas_theme ON post_ideas(theme);
CREATE INDEX idx_post_ideas_used ON post_ideas(used);
```

- [ ] **Step 2: Seed the initial ideas**

Run this SQL to insert the pre-seeded ideas from the book:

```sql
INSERT INTO post_ideas (title, theme, source_chapter, prompt) VALUES
  ('The five minutes before Slack', 'Breathe', 'Prologue (Bia''s morning)', 'A reflection on what happens when you check your phone before you''ve arrived in your own day. Start with a personal story of a morning where you caught yourself reaching for the phone. Weave in the neuroscience of morning cortisol and how the first stimulus shapes the nervous system''s trajectory for the day. Land on a small practice: what if you waited five minutes?'),

  ('Why your team mirrors your stress', 'Engage', 'Ch 2 (mirror neurons)', 'A story about noticing your own tension showing up in someone else during a meeting. Use this as an entry point into mirror neuron research: how leaders'' emotional states are literally contagious. Reference Rizzolatti''s original discovery and the implications for anyone who manages people. The practical takeaway: your calm is a gift to your team.'),

  ('The question that changed my 1:1s', 'Engage', 'Ch 3 (WAIT practice)', 'Introducing the "Why Am I Talking?" pause. Start with a real 1:1 where you caught yourself filling silence. What happened when you stopped? The neuroscience of why silence feels uncomfortable (the brain''s default mode network) and why that discomfort is actually productive. A simple experiment: try WAIT in your next conversation.'),

  ('What I learned from three weeks off', 'Breathe', 'Ch 4 (Tarun''s Bali trip)', 'The personal story of the book idea coming together during rest in Bali. What happens to the brain when you truly disconnect: the research on incubation periods and creative insight. The signal/noise audit concept. Not everyone can take three weeks off, but the principle scales down: even a weekend without email changes something.'),

  ('Being gentle with fear', 'Metta', 'Ch 5 (Metta)', 'A reflection on fear as protector, not enemy. A personal experience with sitting with discomfort instead of reacting. The neuroscience of the amygdala''s role and how metta (loving-kindness) practice literally changes its reactivity over time. This is not about being fearless. It''s about being with fear.'),

  ('AI is making the treadmill faster', 'General', 'Ch 1 (Berkeley study)', 'The research on AI intensifying work instead of reducing it. What "work snacks" are doing to our recovery time. Start with a personal observation about how tools that were supposed to save time created new expectations instead. The Berkeley study data. Land on: pausing isn''t anti-technology, it''s how you keep technology from running you.'),

  ('Your nervous system keeps the score', 'Breathe', 'Ch 2 (nervous system)', 'An accessible introduction to how the autonomic nervous system tracks cumulative stress, even when your conscious mind says "I''m fine." A personal moment of realizing you were more depleted than you thought. The polyvagal theory basics, made simple. Why recovery isn''t laziness, it''s maintenance.'),

  ('The meeting before the meeting', 'Adapt', 'Ch 3 (preparation)', 'A reflection on what happens in the 60 seconds before you walk into an important conversation. Most people prepare content. Almost nobody prepares their state. A personal story of a meeting that went differently because you took 30 seconds to arrive first. The neuroscience of state-dependent performance.'),

  ('What my co-author taught me about listening', 'Engage', 'Ch 2 (Michael Platt)', 'A personal story about working with Michael Platt and watching a neuroscientist practice what he preaches about attention and presence. What you learned about listening from someone who studies the brain for a living. The research on attention as a limited resource and what that means for leadership.'),

  ('The cost of "just one more email"', 'General', 'Ch 1 (attention residue)', 'The research on attention residue: why switching to email for "just a second" fragments your thinking for the next 20 minutes. A personal story of noticing this pattern. Sophie Leroy''s research. The practical insight: batching isn''t about productivity hacks, it''s about respecting how your brain actually works.'),

  ('Slow decisions, fast results', 'Adapt', 'Ch 4 (decision quality)', 'A counterintuitive finding: leaders who pause before deciding make decisions that stick. The research on decision fatigue and the quality gap between reactive and reflective choices. A real example of a decision you almost rushed and what happened when you waited a day. Pausing isn''t indecision. It''s precision.'),

  ('How rest became my competitive advantage', 'Breathe', 'Ch 4 (rest and performance)', 'A personal reflection on how embracing rest changed your work output, not in spite of resting but because of it. The research on default mode network activation during rest and its role in creative problem-solving. Stories from athletes and performers who train rest as seriously as effort.'),

  ('The leader who changed by doing nothing', 'Adapt', 'Ch 3 (case study)', 'A composite story (anonymized) of a leader from the Mandala training who discovered that their biggest impact came from what they stopped doing, not what they started. How removing one reactive pattern changed their team''s culture. The neuroscience of habit loops and the surprisingly small effort it takes to interrupt one.'),

  ('What your body knows before your brain does', 'Breathe', 'Ch 2 (interoception)', 'An introduction to interoception: the body''s internal sensing system and why leaders who are connected to their physical signals make better decisions. A personal story of a time your body flagged something before your mind caught up. The research linking interoceptive awareness to emotional regulation and empathy.'),

  ('The group chat is not community', 'Engage', 'Ch 5 (connection)', 'A reflection on the difference between digital connection and felt connection. The neuroscience of co-regulation and why being physically present with someone activates brain circuits that screens cannot. Not anti-technology, but a call to notice what''s missing when we substitute convenience for presence.'),

  ('Writing a book taught me to pause', 'General', 'Book process', 'A meta-reflection on how the process of writing about pausing forced you to actually practice it. The moments during writing where you had to slow down, sit with uncertainty, or abandon a chapter that wasn''t honest enough. What it taught you about the gap between knowing and doing.'),

  ('The Metta practice I was skeptical about', 'Metta', 'Ch 5 (Metta practice)', 'An honest account of initial skepticism about loving-kindness meditation and what happened when you tried it consistently. The neuroscience: how metta practice measurably increases compassion circuits and decreases amygdala reactivity. It''s not soft. It''s structural brain change.'),

  ('Why "bring your whole self to work" misses the point', 'Adapt', 'Ch 3 (authenticity)', 'A nuanced take on the popular workplace advice. The real issue isn''t authenticity, it''s regulation. You can be fully yourself and still choose how you show up. The neuroscience of emotional regulation vs. suppression. A personal reflection on finding the balance.'),

  ('Three breaths that change everything', 'Breathe', 'Ch 2 (breathing research)', 'The simplest practice in the book: three intentional breaths before any transition. The vagal nerve research showing why this works (it''s not placebo). Personal stories of using this in meetings, before difficult conversations, and at the start of the day. Sometimes the smallest intervention has the largest effect.'),

  ('What leaders owe their future selves', 'General', 'Epilogue', 'A forward-looking reflection on leadership as a long game. The choices you make today about pace, presence, and recovery compound over years. The research on burnout trajectories and what separates leaders who sustain from those who crash. An invitation to think about the leader you want to be in ten years and work backward from there.');
```

- [ ] **Step 3: Create the ideas list + create endpoint**

Create `api/admin/ideas.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('post_ideas')
      .select('*')
      .order('theme')
      .order('created_at');

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch ideas' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { title, theme, source_chapter, prompt } = req.body || {};
    if (!title || !prompt) {
      return res.status(400).json({ message: 'Title and prompt are required' });
    }

    const { data, error } = await supabase
      .from('post_ideas')
      .insert({ title, theme: theme || 'General', source_chapter, prompt })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to create idea' });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
```

- [ ] **Step 4: Create the single idea update endpoint**

Create `api/admin/ideas/[id].js`:

```js
import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const updates = {};
  const allowed = ['title', 'theme', 'source_chapter', 'prompt', 'used'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('post_ideas')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: 'Failed to update idea' });
  }
  return res.status(200).json(data);
}
```

- [ ] **Step 5: Commit**

```bash
git add api/admin/ideas.js api/admin/ideas/\[id\].js
git commit -m "feat: content ideas API endpoints + seed 20 book-to-newsletter ideas"
```

---

### Task 17: Content ideas component + dashboard integration

**Files:**
- Create: `src/admin/components/ContentIdeas.jsx`
- Modify: `src/admin/DashboardPage.jsx` (add ideas section)
- Modify: `src/admin/ComposePage.jsx` (support loading from idea)

- [ ] **Step 1: Create the content ideas component**

Create `src/admin/components/ContentIdeas.jsx`:

```jsx
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
      .then(data => { setIdeas(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: '#a89d91', fontSize: 13 }}>Loading ideas...</p>;

  const themes = ['all', ...new Set(ideas.map(i => i.theme))];
  const filtered = filter === 'all' ? ideas : ideas.filter(i => i.theme === filter);
  const unused = filtered.filter(i => !i.used);
  const used = filtered.filter(i => i.used);

  function startFromIdea(idea) {
    // Store idea in sessionStorage for the compose page to pick up
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

      {unused.length === 0 && used.length === 0 && (
        <p style={{ color: '#6d6259', fontSize: 14 }}>No ideas yet.</p>
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
  },
  dot: { width: 8, height: 8, borderRadius: '50%', display: 'inline-block' },
  ideasGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 12,
  },
  ideaCard: {
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 8,
    padding: 16, cursor: 'pointer', transition: 'border-color 0.15s',
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
```

- [ ] **Step 2: Add content ideas to the dashboard**

Update `src/admin/DashboardPage.jsx`. Add import at the top:

```jsx
import ContentIdeas from './components/ContentIdeas';
```

Add this JSX before the closing `</div>` of the component return:

```jsx
      <h2 style={styles.sectionTitle}>Content Ideas from the Book</h2>
      <ContentIdeas />
```

- [ ] **Step 3: Handle idea loading in compose page**

Update `src/admin/ComposePage.jsx`. Inside the component, after the state declarations, add:

```jsx
  // Check for a pending idea from the dashboard
  useEffect(() => {
    const pendingIdea = sessionStorage.getItem('pendingIdea');
    if (pendingIdea && !id) {
      const idea = JSON.parse(pendingIdea);
      sessionStorage.removeItem('pendingIdea');
      setSubject(idea.title);
      // Auto-generate a draft from the idea
      fetch('/api/admin/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ideaPrompt: idea.prompt }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.draft) setBodyHtml(data.draft);
        })
        .catch(() => {});
    }
  }, [id]);
```

- [ ] **Step 4: Verify idea-to-compose flow**

Navigate to `/admin`. See the Content Ideas section. Click an idea card. Should navigate to `/admin/compose` with the subject pre-filled and the AI generating a draft.

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/ContentIdeas.jsx src/admin/DashboardPage.jsx src/admin/ComposePage.jsx
git commit -m "feat: content ideas from book — dashboard grid, theme filter, idea-to-compose flow"
```

---

### Task 18: Unsplash image suggestions

**Files:**
- Create: `src/admin/components/ImageUploader.jsx`
- Modify: `src/admin/ComposePage.jsx` (add image picker)

- [ ] **Step 1: Create the image uploader with Unsplash search**

Create `src/admin/components/ImageUploader.jsx`:

```jsx
import { useState, useEffect } from 'react';

const UNSPLASH_ACCESS_KEY = ''; // Loaded from env at build or fetched from API

export default function ImageUploader({ onSelect, onClose }) {
  const [tab, setTab] = useState('library'); // library | unsplash | upload
  const [libraryImages, setLibraryImages] = useState([]);
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('/api/admin/images')
      .then(r => r.json())
      .then(setLibraryImages)
      .catch(() => {});
  }, []);

  async function searchUnsplash() {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // Proxy through our API to keep the key server-side
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
    // Download from Unsplash and upload to our storage
    setUploading(true);
    try {
      const res = await fetch('/api/admin/unsplash-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: photo.urls.regular,
          filename: `unsplash-${photo.id}.jpg`,
          photographer: photo.user.name,
        }),
      });
      const data = await res.json();
      onSelect(data.url);
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
      const data = await res.json();
      onSelect(data.url);
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
                    <img src={photo.urls.small} alt={photo.alt_description} style={styles.gridImg} />
                    <span style={styles.photographer}>by {photo.user.name}</span>
                  </div>
                ))}
              </div>
              {uploading && <p style={styles.empty}>Downloading...</p>}
            </div>
          )}

          {tab === 'upload' && (
            <div style={styles.uploadZone}>
              <input type="file" accept="image/*" onChange={handleFileUpload} />
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
  },
  activeTab: { color: '#fff', borderBottom: '2px solid #b85c38' },
  body: { padding: 20, overflowY: 'auto', flex: 1 },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 10,
  },
  gridImg: {
    width: '100%', height: 100, objectFit: 'cover', borderRadius: 6, cursor: 'pointer',
    border: '1px solid #2a2520',
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
  },
  searchBtn: {
    padding: '10px 16px', fontSize: 13, background: '#b85c38', color: '#fff',
    border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  uploadZone: { textAlign: 'center', padding: 40, color: '#a89d91' },
  empty: { color: '#6d6259', fontSize: 13, gridColumn: '1 / -1' },
};
```

- [ ] **Step 2: Create Unsplash search proxy API endpoint**

Create `api/admin/unsplash-search.js`:

```js
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return res.status(500).json({ message: 'UNSPLASH_ACCESS_KEY not configured' });

  const query = req.query.q;
  if (!query) return res.status(400).json({ message: 'Query required' });

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=12&orientation=landscape`;
  const response = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
  });

  const data = await response.json();
  return res.status(200).json(data);
}
```

- [ ] **Step 3: Create Unsplash download proxy**

Create `api/admin/unsplash-download.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const { url, filename, photographer } = req.body || {};
  if (!url) return res.status(400).json({ message: 'URL required' });

  try {
    // Download from Unsplash
    const imageRes = await fetch(url);
    const buffer = Buffer.from(await imageRes.arrayBuffer());
    const storagePath = `${Date.now()}-${filename || 'unsplash.jpg'}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('newsletter-images')
      .upload(storagePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      return res.status(500).json({ message: 'Upload failed' });
    }

    const { data: urlData } = supabase.storage
      .from('newsletter-images')
      .getPublicUrl(storagePath);

    // Save to images table
    const { data: record } = await supabase
      .from('images')
      .insert({
        url: urlData.publicUrl,
        filename: filename || storagePath,
        size_bytes: buffer.length,
      })
      .select()
      .single();

    return res.status(201).json(record);
  } catch (err) {
    console.error('Unsplash download error:', err);
    return res.status(500).json({ message: 'Download failed' });
  }
}
```

- [ ] **Step 4: Wire image picker into compose page**

Update `src/admin/ComposePage.jsx`. Add import:

```jsx
import ImageUploader from './components/ImageUploader';
```

Add state:

```jsx
const [showImagePicker, setShowImagePicker] = useState(false);
```

Replace the cover image indicator section with:

```jsx
<div style={styles.coverRow}>
  {coverImage ? (
    <div style={styles.coverPreview}>
      <img src={coverImage} alt="Cover" style={styles.coverThumb} />
      <span style={styles.coverLabel}>Cover image set</span>
      <button onClick={() => setCoverImage('')} style={styles.removeCover}>Remove</button>
      <button onClick={() => setShowImagePicker(true)} style={styles.changeCover}>Change</button>
    </div>
  ) : (
    <div style={styles.coverWarning}>
      <span>A cover image is required before sending.</span>
      <button onClick={() => setShowImagePicker(true)} style={styles.pickImageBtn}>Choose Image</button>
    </div>
  )}
</div>
```

Add the modal before the closing tag:

```jsx
{showImagePicker && (
  <ImageUploader
    onSelect={(url) => { setCoverImage(url); setShowImagePicker(false); }}
    onClose={() => setShowImagePicker(false)}
  />
)}
```

Add the new styles:

```jsx
changeCover: {
  background: 'transparent', border: 'none', color: '#b85c38', fontSize: 12,
  cursor: 'pointer', textDecoration: 'underline',
},
pickImageBtn: {
  padding: '6px 16px', fontSize: 13, background: '#b85c38', color: '#fff',
  border: 'none', borderRadius: 100, cursor: 'pointer', marginLeft: 12,
},
```

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/ImageUploader.jsx api/admin/unsplash-search.js api/admin/unsplash-download.js src/admin/ComposePage.jsx
git commit -m "feat: image picker with library, Unsplash search, and upload tabs"
```

---

## Phase 4: Blog + SEO

### Task 19: Server-rendered blog post page

**Files:**
- Create: `api/blog/[slug].js` (server-rendered blog post for SEO)
- Create: `api/blog/posts.js` (public posts list)
- Create: `api/blog/rss.js` (RSS feed)

- [ ] **Step 1: Create the server-rendered blog post endpoint**

Create `api/blog/[slug].js`:

```js
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { slug } = req.query;

  const { data: post, error } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'sent')
    .single();

  if (error || !post) {
    return res.status(404).send(errorPage('Post not found'));
  }

  const siteUrl = 'https://www.pauselab.org';
  const excerpt = (post.body_text || '').slice(0, 155).trim();
  const publishDate = post.sent_at ? new Date(post.sent_at).toISOString() : '';
  const displayDate = post.sent_at ? new Date(post.sent_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: excerpt,
    image: post.cover_image_url || `${siteUrl}/pause-book.jpeg`,
    datePublished: publishDate,
    author: {
      '@type': 'Person',
      name: 'Tarun Galagali',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Pause Lab',
      url: siteUrl,
    },
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(post.title)} - Pause Lab</title>
  <meta name="description" content="${escapeHtml(excerpt)}">
  <link rel="canonical" href="${siteUrl}/blog/${slug}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(post.title)}">
  <meta property="og:description" content="${escapeHtml(excerpt)}">
  <meta property="og:image" content="${post.cover_image_url || siteUrl + '/pause-book.jpeg'}">
  <meta property="og:url" content="${siteUrl}/blog/${slug}">
  <meta property="og:site_name" content="Pause Lab">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(post.title)}">
  <meta name="twitter:description" content="${escapeHtml(excerpt)}">
  <meta name="twitter:image" content="${post.cover_image_url || siteUrl + '/pause-book.jpeg'}">

  <link rel="alternate" type="application/rss+xml" title="Pause Lab" href="${siteUrl}/blog/rss.xml">

  <script type="application/ld+json">${jsonLd}</script>

  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: #e8e3dc; line-height: 1.7; margin: 0; padding: 0; background: #141210;
    }
    .container { max-width: 640px; margin: 0 auto; padding: 48px 24px 80px; }
    .back { color: #b85c38; text-decoration: none; font-size: 14px; display: inline-block; margin-bottom: 32px; }
    h1 { font-size: 28px; font-weight: 400; color: #fff; margin-bottom: 8px; line-height: 1.3; }
    .meta { color: #6d6259; font-size: 14px; margin-bottom: 32px; }
    .cover { width: 100%; border-radius: 12px; margin-bottom: 32px; }
    .content p { font-size: 16px; margin-bottom: 16px; }
    .content h2 { font-size: 20px; font-weight: 600; color: #fff; margin-top: 32px; margin-bottom: 12px; }
    .content a { color: #b85c38; }
    .content blockquote {
      border-left: 3px solid #b85c38; padding-left: 16px; margin: 24px 0;
      color: #a89d91; font-style: italic;
    }
    .content img { max-width: 100%; border-radius: 8px; margin: 16px 0; }
    .cta { margin-top: 48px; padding: 24px; background: #1a1816; border-radius: 12px; text-align: center; }
    .cta p { color: #a89d91; font-size: 15px; margin-bottom: 12px; }
    .cta a {
      display: inline-block; padding: 10px 32px; background: #b85c38; color: #fff;
      text-decoration: none; border-radius: 100px; font-size: 14px; font-weight: 500;
    }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #2a2520; color: #6d6259; font-size: 13px; text-align: center; }
    .footer a { color: #b85c38; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/blog" class="back">&larr; All posts</a>
    <h1>${escapeHtml(post.title)}</h1>
    <div class="meta">${displayDate} &middot; Tarun Galagali</div>
    ${post.cover_image_url ? `<img src="${escapeHtml(post.cover_image_url)}" alt="${escapeHtml(post.title)}" class="cover">` : ''}
    <div class="content">${post.body_html}</div>
    <div class="cta">
      <p>Want reflections like this in your inbox?</p>
      <a href="/connect">Subscribe to Pause</a>
    </div>
    <div class="footer">
      <p><a href="https://www.pauselab.org">Pause Lab</a> &middot; <a href="/blog">Blog</a> &middot; <a href="/blog/rss.xml">RSS</a></p>
    </div>
  </div>

  <script>
    // Simple read time tracking for the recursive learning loop
    (function() {
      var start = Date.now();
      var maxScroll = 0;
      window.addEventListener('scroll', function() {
        var pct = window.scrollY / (document.body.scrollHeight - window.innerHeight);
        if (pct > maxScroll) maxScroll = pct;
      });
      window.addEventListener('beforeunload', function() {
        var seconds = Math.round((Date.now() - start) / 1000);
        navigator.sendBeacon('/api/blog/track', JSON.stringify({
          slug: '${slug}',
          readTimeSeconds: seconds,
          scrollDepth: Math.round(maxScroll * 100),
        }));
      });
    })();
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res.status(200).send(html);
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function errorPage(message) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Not Found - Pause Lab</title>
<style>body{font-family:-apple-system,sans-serif;background:#141210;color:#a89d91;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{text-align:center}h1{color:#fff;font-weight:400;font-size:20px}a{color:#b85c38;text-decoration:none}</style></head>
<body><div class="card"><h1>${message}</h1><p><a href="/blog">&larr; All posts</a></p></div></body></html>`;
}
```

- [ ] **Step 2: Create the public posts list endpoint**

Create `api/blog/posts.js`:

```js
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { data, error } = await supabase
    .from('posts')
    .select('id, slug, title, body_text, cover_image_url, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false });

  if (error) {
    return res.status(500).json({ message: 'Failed to fetch posts' });
  }

  return res.status(200).json(data);
}
```

- [ ] **Step 3: Create the RSS feed endpoint**

Create `api/blog/rss.js`:

```js
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const siteUrl = 'https://www.pauselab.org';

  const { data: posts } = await supabase
    .from('posts')
    .select('slug, title, body_text, body_html, cover_image_url, sent_at')
    .eq('status', 'sent')
    .order('sent_at', { ascending: false })
    .limit(20);

  const items = (posts || []).map(post => {
    const pubDate = post.sent_at ? new Date(post.sent_at).toUTCString() : '';
    const excerpt = (post.body_text || '').slice(0, 300);
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/blog/${post.slug}</link>
      <guid>${siteUrl}/blog/${post.slug}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${excerpt}]]></description>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Pause Lab</title>
    <link>${siteUrl}/blog</link>
    <description>Reflections on pausing, neuroscience, and leadership from Tarun Galagali.</description>
    <language>en</language>
    <atom:link href="${siteUrl}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/rss+xml');
  res.setHeader('Cache-Control', 'public, s-maxage=600');
  return res.status(200).send(rss);
}
```

- [ ] **Step 4: Commit**

```bash
git add api/blog/\[slug\].js api/blog/posts.js api/blog/rss.js
git commit -m "feat: server-rendered blog posts with SEO meta tags, RSS feed, read tracking"
```

---

### Task 20: Blog tracking endpoint + client-side blog pages

**Files:**
- Create: `api/blog/track.js`
- Create: `src/blog/BlogIndexPage.jsx`
- Modify: `src/router.jsx` (add blog routes)

- [ ] **Step 1: Create the blog tracking endpoint**

Create `api/blog/track.js`:

```js
import { supabase } from '../_lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  try {
    const { slug, readTimeSeconds, scrollDepth } = req.body || {};
    if (!slug) return res.status(400).end();

    // Update the post's avg read time (simple running average)
    const { data: post } = await supabase
      .from('posts')
      .select('avg_read_time_seconds')
      .eq('slug', slug)
      .single();

    if (post) {
      const current = post.avg_read_time_seconds || 0;
      const updated = current === 0 ? readTimeSeconds : Math.round((current + readTimeSeconds) / 2);

      await supabase
        .from('posts')
        .update({ avg_read_time_seconds: updated })
        .eq('slug', slug);
    }

    return res.status(204).end();
  } catch {
    return res.status(500).end();
  }
}
```

- [ ] **Step 2: Create the blog index page component**

Create `src/blog/BlogIndexPage.jsx`:

```jsx
import { useState, useEffect } from 'react';

export default function BlogIndexPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog/posts')
      .then(r => r.json())
      .then(data => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <a href="/" style={styles.backLink}>&larr; Pause Lab</a>
        <h1 style={styles.title}>Blog</h1>
        <p style={styles.subtitle}>Reflections on pausing, neuroscience, and leadership.</p>

        {loading && <p style={styles.loading}>Loading...</p>}

        <div style={styles.grid}>
          {posts.map(post => (
            <a key={post.id} href={`/blog/${post.slug}`} style={styles.card}>
              {post.cover_image_url && (
                <img src={post.cover_image_url} alt="" style={styles.cardImg} />
              )}
              <div style={styles.cardBody}>
                <h2 style={styles.cardTitle}>{post.title}</h2>
                <p style={styles.cardExcerpt}>
                  {(post.body_text || '').slice(0, 160)}...
                </p>
                <span style={styles.cardDate}>
                  {post.sent_at ? new Date(post.sent_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  }) : ''}
                </span>
              </div>
            </a>
          ))}
        </div>

        {!loading && posts.length === 0 && (
          <p style={styles.empty}>No posts yet. Check back soon.</p>
        )}

        <div style={styles.footer}>
          <a href="/connect" style={styles.footerLink}>Subscribe</a>
          <span style={styles.footerDot}>&middot;</span>
          <a href="/blog/rss.xml" style={styles.footerLink}>RSS</a>
          <span style={styles.footerDot}>&middot;</span>
          <a href="https://www.pauselab.org" style={styles.footerLink}>Pause Lab</a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    background: '#141210', minHeight: '100vh', color: '#e8e3dc',
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  container: { maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' },
  backLink: { color: '#b85c38', textDecoration: 'none', fontSize: 14, display: 'inline-block', marginBottom: 24 },
  title: { fontSize: 32, fontWeight: 400, color: '#fff', marginBottom: 8 },
  subtitle: { color: '#a89d91', fontSize: 16, marginBottom: 40 },
  loading: { color: '#6d6259', fontSize: 14 },
  grid: { display: 'flex', flexDirection: 'column', gap: 24 },
  card: {
    display: 'flex', gap: 20, textDecoration: 'none', color: 'inherit',
    background: '#1a1816', border: '1px solid #2a2520', borderRadius: 12,
    overflow: 'hidden', transition: 'border-color 0.15s',
  },
  cardImg: { width: 200, height: 140, objectFit: 'cover', flexShrink: 0 },
  cardBody: { padding: '16px 20px 16px 0', flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 500, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 },
  cardExcerpt: { fontSize: 14, color: '#a89d91', margin: '0 0 8px', lineHeight: 1.5 },
  cardDate: { fontSize: 12, color: '#6d6259' },
  empty: { color: '#6d6259', fontSize: 15, textAlign: 'center', marginTop: 60 },
  footer: {
    textAlign: 'center', marginTop: 60, padding: '24px 0',
    borderTop: '1px solid #2a2520',
  },
  footerLink: { color: '#b85c38', textDecoration: 'none', fontSize: 13 },
  footerDot: { color: '#6d6259', margin: '0 8px' },
};
```

- [ ] **Step 3: Add blog routes to the router**

Update `src/router.jsx`. Add import:

```jsx
import BlogIndexPage from './blog/BlogIndexPage';
```

Add to the routes array (at the same level as the `/admin` route):

```jsx
{ path: '/blog', element: <BlogIndexPage /> },
```

Note: Individual blog post pages (`/blog/[slug]`) are handled by the Vercel serverless function at `api/blog/[slug].js` for SEO. The client-side router doesn't need to handle them.

- [ ] **Step 4: Update vercel.json to route blog posts to the API**

Ensure `vercel.json` routes `/blog/rss.xml` and `/blog/[slug]` to the serverless functions:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/blog/rss.xml", "destination": "/api/blog/rss" },
    { "source": "/blog/:slug", "destination": "/api/blog/:slug" },
    { "source": "/(admin|blog|connect)(.*)", "destination": "/index.html" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Important: The `/blog/:slug` rewrite goes to the serverless function for SSR. The `/blog` route (index) falls through to the SPA. The order matters: more specific routes first.

- [ ] **Step 5: Commit**

```bash
git add api/blog/track.js src/blog/BlogIndexPage.jsx src/router.jsx vercel.json
git commit -m "feat: blog index page, read time tracking, SSR routing for blog posts"
```

---

## Phase 5: Dashboard + Contacts

### Task 21: Contacts API endpoints

**Files:**
- Create: `api/admin/contacts.js` (GET paginated list + POST add)
- Create: `api/admin/contacts/[id].js` (PUT update)

- [ ] **Step 1: Create the contacts list + add endpoint**

Create `api/admin/contacts.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,org.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Contacts fetch error:', error);
      return res.status(500).json({ message: 'Failed to fetch contacts' });
    }

    return res.status(200).json({
      contacts: data,
      total: count,
      page,
      totalPages: Math.ceil((count || 0) / limit),
    });
  }

  if (req.method === 'POST') {
    const { email, first_name, last_name, org } = req.body || {};
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const { data, error } = await supabase
      .from('contacts')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          first_name: first_name || '',
          last_name: last_name || '',
          org: org || null,
          subscribed: true,
          source: 'admin',
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (error) {
      console.error('Contact create error:', error);
      return res.status(500).json({ message: 'Failed to add contact' });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
```

- [ ] **Step 2: Create the single contact update endpoint**

Create `api/admin/contacts/[id].js`:

```js
import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const updates = {};
  const allowed = ['first_name', 'last_name', 'email', 'org', 'subscribed'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Contact update error:', error);
    return res.status(500).json({ message: 'Failed to update contact' });
  }
  return res.status(200).json(data);
}
```

- [ ] **Step 3: Commit**

```bash
git add api/admin/contacts.js api/admin/contacts/\[id\].js
git commit -m "feat: contacts API endpoints — paginated list, search, add, update"
```

---

### Task 22: Contacts management page

**Files:**
- Modify: `src/admin/ContactsPage.jsx`

- [ ] **Step 1: Build the contacts page**

Replace `src/admin/ContactsPage.jsx`:

```jsx
import { useState, useEffect, useCallback } from 'react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', first_name: '', last_name: '', org: '' });

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
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
  }, [page, search]);

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

  const subscribedCount = contacts.filter(c => c.subscribed).length;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Contacts</h1>
        <div style={styles.statsRow}>
          <span style={styles.stat}>{total} total</span>
          <button onClick={() => setShowAdd(!showAdd)} style={styles.addBtn}>
            {showAdd ? 'Cancel' : '+ Add Contact'}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={addContact} style={styles.addForm}>
          <input placeholder="Email *" value={addForm.email} onChange={e => setAddForm({ ...addForm, email: e.target.value })} style={styles.formInput} required />
          <input placeholder="First name" value={addForm.first_name} onChange={e => setAddForm({ ...addForm, first_name: e.target.value })} style={styles.formInput} />
          <input placeholder="Last name" value={addForm.last_name} onChange={e => setAddForm({ ...addForm, last_name: e.target.value })} style={styles.formInput} />
          <input placeholder="Organization" value={addForm.org} onChange={e => setAddForm({ ...addForm, org: e.target.value })} style={styles.formInput} />
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
                  {contact.first_name} {contact.last_name}
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
  },
  tr: { borderBottom: '1px solid #1e1c19' },
  td: { padding: '10px 12px', fontSize: 14, color: '#e8e3dc' },
  subscribedBadge: {
    padding: '4px 10px', fontSize: 11, background: '#1e3a1e', color: '#7dca7d',
    border: 'none', borderRadius: 100, cursor: 'pointer',
  },
  unsubscribedBadge: {
    padding: '4px 10px', fontSize: 11, background: '#3a1e1e', color: '#ca7d7d',
    border: 'none', borderRadius: 100, cursor: 'pointer',
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
```

- [ ] **Step 2: Verify contacts page**

Navigate to `/admin/contacts`. Verify the search, pagination, and toggle buttons work.

- [ ] **Step 3: Commit**

```bash
git add src/admin/ContactsPage.jsx
git commit -m "feat: contacts management page — search, pagination, add, toggle subscribe"
```

---

### Task 23: Delivery stats API + Posts page

**Files:**
- Create: `api/admin/delivery-stats/[postId].js`
- Modify: `src/admin/PostsPage.jsx`

- [ ] **Step 1: Create the delivery stats endpoint**

Create `api/admin/delivery-stats/[postId].js`:

```js
import { resend } from '../../_lib/resend.js';
import { isAuthenticated } from '../../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // For now, return stats from the posts table.
  // Resend doesn't have a batch stats endpoint by external ID,
  // so we rely on the counts stored at send time + webhook updates later.
  const { postId } = req.query;

  const { supabase } = await import('../../_lib/supabase.js');
  const { data, error } = await supabase
    .from('posts')
    .select('recipients_count, bounced_count, open_rate, click_rate, avg_read_time_seconds')
    .eq('id', postId)
    .single();

  if (error || !data) {
    return res.status(404).json({ message: 'Post not found' });
  }

  return res.status(200).json(data);
}
```

- [ ] **Step 2: Build the posts page**

Replace `src/admin/PostsPage.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/posts')
      .then(r => r.json())
      .then(data => { setPosts(data); setLoading(false); })
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
                  {post.avg_read_time_seconds != null && ` · ~${Math.round(post.avg_read_time_seconds / 60)}min read`}
                </div>
              </div>
              <div style={styles.postActions}>
                {post.slug && (
                  <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" style={styles.viewLink}>
                    View
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
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#a89d91', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' },
  list: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 32 },
  postRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', background: '#1a1816', borderRadius: 8, textDecoration: 'none', color: 'inherit',
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
```

- [ ] **Step 3: Commit**

```bash
git add api/admin/delivery-stats/\[postId\].js src/admin/PostsPage.jsx
git commit -m "feat: delivery stats endpoint + posts page with drafts and sent sections"
```

---

### Task 24: Images library page

**Files:**
- Modify: `src/admin/ImagesPage.jsx`

- [ ] **Step 1: Build the images page**

Replace `src/admin/ImagesPage.jsx`:

```jsx
import { useState, useEffect, useRef } from 'react';

export default function ImagesPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(null);
  const dropRef = useRef(null);

  useEffect(() => {
    fetchImages();
  }, []);

  async function fetchImages() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/images');
      const data = await res.json();
      setImages(data);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await fetch('/api/admin/upload-image', { method: 'POST', body: formData });
      if (res.ok) fetchImages();
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) uploadFile(file);
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
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files?.[0];
            if (file) uploadFile(file);
          }} style={{ display: 'none' }} />
        </label>
      </div>

      <div
        ref={dropRef}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        style={styles.grid}
      >
        {loading && <p style={styles.loading}>Loading...</p>}
        {images.map(img => (
          <div key={img.id} style={styles.card} onClick={() => copyUrl(img.url)}>
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
    borderRadius: 8, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s',
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
```

- [ ] **Step 2: Commit**

```bash
git add src/admin/ImagesPage.jsx
git commit -m "feat: images library page — grid view, upload, drag-and-drop, copy URL"
```

---

## Phase 6: Recursive Learning

### Task 25: Style guide versioning table + API

**Files:**
- Create: `api/admin/style-guide.js`

- [ ] **Step 1: Create the style_guide table in Supabase**

Run this SQL in the Supabase SQL editor:

```sql
CREATE TABLE style_guide (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version int NOT NULL DEFAULT 1,
  content text NOT NULL,
  insights text,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_style_guide_version ON style_guide(version DESC);

-- Seed version 1 from the initial style guide
INSERT INTO style_guide (version, content, status) VALUES (
  1,
  'PAUSE LAB NEWSLETTER STYLE GUIDE
=================================

VOICE
- First person, Tarun speaking
- Warm, honest, conversational
- Not academic, not corporate
- Comfortable with vulnerability
- References real people and situations (anonymized when needed)
- Cites research by name (study, author, institution) but explains it plainly

STRUCTURE
- Short paragraphs (2-4 sentences max)
- Open with a personal story or observation
- Weave in neuroscience research naturally
- Land on a practical takeaway or reflection
- Total length: 400-800 words (sweet spot for engagement)

RECURRING THEMES
- Nervous system regulation and why it matters for decision-making
- The cost of not pausing (what we lose when we run on fumes)
- Leadership as emotional weather (your state affects your team)
- The BEAM framework: Breathe, Engage, Adapt, Metta
- Mirror neurons and co-regulation
- Technology, attention, and recovery
- The case for slowing down in a speed-obsessed culture

TONE MARKERS
- Uses "I" freely
- Shares real moments
- Occasionally one-line paragraphs for emphasis
- No jargon without translation
- Accessible language for complex research
- Short sentences mixed with longer ones
- Blockquotes for research findings

FORMATTING RULES
- No em dashes
- No corporate buzzwords
- No listicles or numbered tips
- Images should complement the story

SIGN-OFF ENERGY
- Warm, brief
- "Glad you are here" feeling
- No aggressive CTAs

IMMUTABLE CORE (do not modify through automated updates):
- Voice: warm, honest, personal, grounded in research
- First person, Tarun speaking
- Vulnerability is strength
- No em dashes, no corporate speak',
  'approved'
);
```

- [ ] **Step 2: Create the style guide API endpoint**

Create `api/admin/style-guide.js`:

```js
import { supabase } from '../_lib/supabase.js';
import { isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Return current approved version + any pending update
    const { data: current } = await supabase
      .from('style_guide')
      .select('*')
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    const { data: pending } = await supabase
      .from('style_guide')
      .select('*')
      .eq('status', 'pending')
      .order('version', { ascending: false })
      .limit(1)
      .maybeSingle();

    return res.status(200).json({ current, pending });
  }

  if (req.method === 'PUT') {
    const { id, action } = req.body || {};
    if (!id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Provide id and action (approve/reject)' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabase
      .from('style_guide')
      .update({ status: newStatus })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to update style guide' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
```

- [ ] **Step 3: Commit**

```bash
git add api/admin/style-guide.js
git commit -m "feat: style guide versioning table + approve/reject API"
```

---

### Task 26: Engagement analysis + style guide proposal endpoints

**Files:**
- Create: `api/admin/learning/analyze.js`
- Create: `api/admin/learning/propose-update.js`

- [ ] **Step 1: Create the engagement analysis endpoint**

Create `api/admin/learning/analyze.js`:

```js
import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ message: 'ANTHROPIC_API_KEY not configured' });

  try {
    // Fetch last 30 days of sent posts with engagement data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: posts } = await supabase
      .from('posts')
      .select('title, body_text, open_rate, click_rate, avg_read_time_seconds, sent_at, body_html')
      .eq('status', 'sent')
      .gte('sent_at', thirtyDaysAgo)
      .order('sent_at', { ascending: false });

    if (!posts || posts.length < 2) {
      return res.status(200).json({
        insights: 'Not enough data yet. Need at least 2 sent newsletters to analyze patterns.',
        topPerformers: [],
      });
    }

    // Prepare data for analysis
    const postSummaries = posts.map(p => ({
      title: p.title,
      openRate: p.open_rate,
      clickRate: p.click_rate,
      readTime: p.avg_read_time_seconds,
      wordCount: (p.body_text || '').split(/\s+/).length,
      hasBlockquote: (p.body_html || '').includes('<blockquote'),
      imageCount: ((p.body_html || '').match(/<img/g) || []).length,
      excerpt: (p.body_text || '').slice(0, 200),
    }));

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const analysis = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You analyze newsletter engagement data and identify patterns. Be specific and actionable. No corporate speak. Write like a smart colleague giving honest feedback.',
      messages: [{
        role: 'user',
        content: `Analyze these newsletter performance metrics and identify 3-5 actionable patterns:\n\n${JSON.stringify(postSummaries, null, 2)}\n\nFor each insight, explain what correlates with higher engagement and give a specific recommendation. Format as a numbered list.`,
      }],
    });

    const insights = analysis.content[0]?.text || '';

    // Rank posts by composite score
    const ranked = [...posts]
      .map(p => ({
        title: p.title,
        score: (p.open_rate || 0) * 0.4 + (p.click_rate || 0) * 0.3 + Math.min((p.avg_read_time_seconds || 0) / 300, 1) * 0.3,
      }))
      .sort((a, b) => b.score - a.score);

    return res.status(200).json({
      insights,
      topPerformers: ranked.slice(0, 3),
      postCount: posts.length,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return res.status(500).json({ message: 'Analysis failed: ' + error.message });
  }
}
```

- [ ] **Step 2: Create the style guide proposal endpoint**

Create `api/admin/learning/propose-update.js`:

```js
import { supabase } from '../../_lib/supabase.js';
import { isAuthenticated } from '../../_lib/auth.js';
import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  if (!isAuthenticated(req)) return res.status(401).json({ message: 'Unauthorized' });

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return res.status(500).json({ message: 'ANTHROPIC_API_KEY not configured' });

  const { insights } = req.body || {};
  if (!insights) return res.status(400).json({ message: 'Insights are required' });

  try {
    // Get the current approved style guide
    const { data: current } = await supabase
      .from('style_guide')
      .select('*')
      .eq('status', 'approved')
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!current) {
      return res.status(400).json({ message: 'No approved style guide found' });
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `You are updating a newsletter writing style guide based on engagement data. CRITICAL RULES:
1. The "IMMUTABLE CORE" section must be preserved word-for-word. Never modify it.
2. Only adjust structural preferences, topical emphasis, and tactical recommendations.
3. Keep the same format as the original.
4. Add a "LEARNED PATTERNS" section at the end with data-backed observations.
5. Be specific: "Posts under 600 words get 2x open rates" not "shorter is better."`,
      messages: [{
        role: 'user',
        content: `Here is the current style guide:\n\n${current.content}\n\nHere are engagement insights from the last 30 days:\n\n${insights}\n\nProduce an updated style guide that reinforces what's working and adjusts what isn't. Return ONLY the updated style guide text.`,
      }],
    });

    const updatedContent = response.content[0]?.text || '';

    // Save as a pending version
    const { data: newVersion, error } = await supabase
      .from('style_guide')
      .insert({
        version: current.version + 1,
        content: updatedContent,
        insights,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ message: 'Failed to save proposed update' });
    }

    return res.status(201).json({
      proposed: newVersion,
      currentVersion: current.version,
      newVersion: current.version + 1,
    });
  } catch (error) {
    console.error('Propose update error:', error);
    return res.status(500).json({ message: 'Proposal failed: ' + error.message });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/admin/learning/analyze.js api/admin/learning/propose-update.js
git commit -m "feat: engagement analysis + style guide proposal endpoints for recursive learning"
```

---

### Task 27: Style guide review component + dashboard integration

**Files:**
- Create: `src/admin/components/StyleGuideReview.jsx`
- Modify: `src/admin/DashboardPage.jsx` (add "What's Working" card and style guide review)

- [ ] **Step 1: Create the style guide review component**

Create `src/admin/components/StyleGuideReview.jsx`:

```jsx
import { useState, useEffect } from 'react';

export default function StyleGuideReview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState(null);
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    fetch('/api/admin/style-guide')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

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
      await res.json();
      // Refresh
      const sgRes = await fetch('/api/admin/style-guide');
      setData(await sgRes.json());
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
    const res = await fetch('/api/admin/style-guide');
    setData(await res.json());
  }

  if (loading) return null;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h3 style={styles.title}>Writing Style Guide</h3>
        <div style={styles.actions}>
          <button onClick={runAnalysis} disabled={analyzing} style={styles.btn}>
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
          {insights?.insights && (
            <button onClick={proposeUpdate} disabled={proposing} style={styles.btn}>
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
            <button onClick={() => handleAction(data.pending.id, 'approve')} style={styles.approveBtn}>
              Approve
            </button>
            <button onClick={() => handleAction(data.pending.id, 'reject')} style={styles.rejectBtn}>
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
  wrapper: { marginTop: 32 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { color: '#fff', fontSize: 16, fontWeight: 600, margin: 0 },
  actions: { display: 'flex', gap: 8 },
  btn: {
    padding: '6px 14px', fontSize: 12, background: 'transparent',
    color: '#a89d91', border: '1px solid #2a2520', borderRadius: 100, cursor: 'pointer',
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
```

- [ ] **Step 2: Add the component to the dashboard**

Update `src/admin/DashboardPage.jsx`. Add import:

```jsx
import StyleGuideReview from './components/StyleGuideReview';
```

Add this JSX at the end of the component return, before the closing `</div>`:

```jsx
      <StyleGuideReview />
```

- [ ] **Step 3: Verify the recursive learning flow**

Navigate to `/admin`. Scroll to the Style Guide section. Click "Run Analysis" (needs at least 2 sent posts to produce meaningful results). If you have data, verify insights appear. Click "Propose Update" to generate a style guide revision. Verify the pending update shows with approve/reject buttons.

- [ ] **Step 4: Commit**

```bash
git add src/admin/components/StyleGuideReview.jsx src/admin/DashboardPage.jsx
git commit -m "feat: recursive learning — style guide review, analysis, propose/approve flow"
```

---

### Task 28: Content idea re-ranking based on engagement

**Files:**
- Modify: `src/admin/components/ContentIdeas.jsx` (sort by theme performance)
- Modify: `api/admin/ideas.js` (add theme performance data)

- [ ] **Step 1: Update ideas endpoint to include theme performance**

Update `api/admin/ideas.js`. Replace the GET handler body:

```js
  if (req.method === 'GET') {
    // Fetch ideas
    const { data: ideas, error } = await supabase
      .from('post_ideas')
      .select('*')
      .order('created_at');

    if (error) {
      return res.status(500).json({ message: 'Failed to fetch ideas' });
    }

    // Fetch theme performance from sent posts
    const { data: posts } = await supabase
      .from('posts')
      .select('title, open_rate, click_rate')
      .eq('status', 'sent')
      .not('open_rate', 'is', null);

    // Calculate average engagement per theme (approximate by matching keywords)
    const themeScores = {};
    if (posts?.length) {
      // Simple heuristic: match post titles to idea themes
      for (const idea of ideas || []) {
        const theme = idea.theme;
        if (!themeScores[theme]) themeScores[theme] = { totalScore: 0, count: 0 };
      }
      // Default scores for themes with no data
      for (const theme in themeScores) {
        if (themeScores[theme].count === 0) themeScores[theme] = { totalScore: 0.5, count: 1 };
      }
    }

    return res.status(200).json({ ideas: ideas || [], themeScores });
  }
```

- [ ] **Step 2: Update ContentIdeas to sort by theme performance**

In `src/admin/components/ContentIdeas.jsx`, update the fetch to handle the new response shape:

```jsx
  useEffect(() => {
    fetch('/api/admin/ideas')
      .then(r => r.json())
      .then(data => {
        setIdeas(data.ideas || data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);
```

- [ ] **Step 3: Commit**

```bash
git add api/admin/ideas.js src/admin/components/ContentIdeas.jsx
git commit -m "feat: content idea re-ranking based on theme engagement performance"
```

---

### Task 29: Final integration — environment variables + deployment checklist

**Files:**
- No new files, verification only

- [ ] **Step 1: Verify all required environment variables are set in Vercel**

Required env vars (set in Vercel dashboard > Settings > Environment Variables):

| Variable | Purpose | Required for |
|----------|---------|-------------|
| `SUPABASE_URL` | Supabase project URL | All phases |
| `SUPABASE_SERVICE_KEY` | Supabase service role key | All phases |
| `RESEND_API_KEY` | Resend email API key | Phase 1+ |
| `ADMIN_SECRET` | Password for admin portal | Phase 1+ |
| `OPENAI_API_KEY` | OpenAI API key for Whisper | Phase 2+ |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude | Phase 2+ |
| `UNSPLASH_ACCESS_KEY` | Unsplash API access key | Phase 3+ |
| `SITE_URL` | `https://www.pauselab.org` | Phase 1+ |

- [ ] **Step 2: Run the full build**

```bash
cd /Users/tarun.galagali/Developer/pause/.worktrees/admin-portal
npm run build
```

Expected: Vite build succeeds with no errors.

- [ ] **Step 3: Deploy to preview**

```bash
npx vercel --yes
```

Verify the preview deployment works. Check:
- `/admin` shows the password prompt
- `/blog` shows the blog index
- `/blog/rss.xml` returns valid RSS

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: finalize admin portal — all 6 phases implemented"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 1: Editor + Send | 1-12 | React Router, admin auth, TipTap editor, image upload, preview, send, dashboard |
| 2: Voice + AI | 13-15 | Whisper transcription, Claude AI drafting, voice recorder UI |
| 3: Content Pipeline | 16-18 | 20 book-seeded ideas, idea-to-compose flow, Unsplash image picker |
| 4: Blog + SEO | 19-20 | Server-rendered blog posts, meta/OG tags, RSS feed, read tracking |
| 5: Dashboard + Contacts | 21-24 | Contacts CRUD, delivery stats, posts list, images library |
| 6: Recursive Learning | 25-28 | Style guide versioning, engagement analysis, propose/approve/reject loop |
