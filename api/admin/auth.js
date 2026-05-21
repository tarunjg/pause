import { setSessionCookie, clearSessionCookie, isAuthenticated } from '../_lib/auth.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: isAuthenticated(req) });
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(res);
    return res.status(200).json({ authenticated: false });
  }

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
