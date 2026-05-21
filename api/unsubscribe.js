import { supabase } from './_lib/supabase.js';

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send(unsubscribePage('Missing unsubscribe token.', false));
  }

  try {
    const { data, error } = await supabase
      .from('contacts')
      .update({ subscribed: false })
      .eq('unsubscribe_token', token)
      .select('email')
      .single();

    if (error || !data) {
      return res.status(400).send(unsubscribePage('Invalid or expired unsubscribe link.', false));
    }

    return res.status(200).send(unsubscribePage(`You've been unsubscribed. We're sorry to see you go.`, true));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return res.status(500).send(unsubscribePage('Something went wrong. Please email hello@pauselab.org to unsubscribe.', false));
  }
}

function unsubscribePage(message, success) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - Pause Lab</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #141210; color: #a89d91; display: flex; align-items: center;
      justify-content: center; min-height: 100vh; margin: 0; padding: 24px;
    }
    .card {
      text-align: center; max-width: 400px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; color: #fff; font-weight: 400; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; }
    a { color: #b85c38; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✓' : '⚠'}</div>
    <h1>${message}</h1>
    <p><a href="https://www.pauselab.org">← Back to Pause Lab</a></p>
  </div>
</body>
</html>
  `.trim();
}
