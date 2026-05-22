const hits = new Map();

const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL = 120_000;

let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of hits) {
    if (now - entry.start > WINDOW_MS) hits.delete(key);
  }
}

export function rateLimit(ip, maxPerWindow = 5) {
  cleanup();
  const now = Date.now();
  const entry = hits.get(ip);

  if (!entry || now - entry.start > WINDOW_MS) {
    hits.set(ip, { start: now, count: 1 });
    return { ok: true };
  }

  entry.count++;
  if (entry.count > maxPerWindow) {
    return { ok: false, retryAfter: Math.ceil((entry.start + WINDOW_MS - now) / 1000) };
  }
  return { ok: true };
}
