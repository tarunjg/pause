// Cookie-based admin session.
// Sets a signed session cookie when the password matches ADMIN_SECRET.

import { createHmac } from 'crypto';

const COOKIE_NAME = 'pause_admin_session';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function setSessionCookie(res, adminSecret) {
  const token = sign('authenticated', adminSecret);
  const cookie = `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; Secure`;
  res.setHeader('Set-Cookie', cookie);
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`);
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
