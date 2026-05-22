import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    fetch: (url, options = {}) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      return fetch(url, { ...options, signal: controller.signal }).finally(() =>
        clearTimeout(timeout)
      );
    },
  },
  db: { schema: 'public' },
});
