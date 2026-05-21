// Email templates as simple HTML strings
// Resend also supports React Email components, but keeping it simple for now

export function welcomeEmail(firstName) {
  return {
    subject: "Thanks for connecting with Pause Lab",
    html: `
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
    p { font-size: 16px; margin-bottom: 16px; }
    .signature { margin-top: 32px; color: #6d6259; font-size: 15px; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e8e3dc; font-size: 12px; color: #a89d91; }
    .footer a { color: #b85c38; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-mark">&#9673;</span> PAUSE</div>

    <p>Hey${firstName ? ` ${firstName}` : ''},</p>

    <p>Thanks for reaching out — really glad you connected with us.</p>

    <p>At Pause Lab, we're building neuroscience-backed tools to help managers lead with more self-awareness, emotional regulation, and clarity. Whether you're here for the newsletter, a workshop, or just curious, you're in the right place.</p>

    <p>I'll be in touch soon with more. In the meantime, feel free to reply to this email — it comes straight to me.</p>

    <div class="signature">
      <p>Tarun<br>
      Co-Founder, Pause Lab</p>
    </div>

    <div class="footer">
      <p>Pause Lab &middot; <a href="https://www.pauselab.org">pauselab.org</a></p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}

export function newsletterEmail({ subject, bodyHtml }) {
  return {
    subject,
    html: `
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
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e8e3dc; font-size: 12px; color: #a89d91; }
    .footer a { color: #b85c38; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-mark">&#9673;</span> PAUSE</div>

    ${bodyHtml}

    <div class="footer">
      <p>Pause Lab &middot; <a href="https://www.pauselab.org">pauselab.org</a></p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}
