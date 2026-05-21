// Email templates as simple HTML strings

export function welcomeEmail(firstName, interests = []) {
  const greeting = firstName ? `Hey ${firstName},` : 'Hey there,';

  // Build the middle section based on what they selected
  const parts = [];

  if (interests.includes('newsletter')) {
    parts.push(`You're all set to receive our newsletter — insights from neuroscience, stories from the leaders we train, and updates as the book gets closer.`);
  }

  if (interests.includes('workshop')) {
    parts.push(`We saw you're interested in bringing the Power of Pause workshop to your org — we'd love to make that happen. We'll follow up shortly with more details on how it works and what to expect.`);
  }

  if (interests.includes('ambassador')) {
    parts.push(`We're excited you want to be a Pause Ambassador. We're building something special with our ambassador community, and we'll reach out soon with more on what that looks like.`);
  }

  // Fallback if somehow no interests (shouldn't happen, but just in case)
  if (parts.length === 0) {
    parts.push(`Thanks for connecting with us. We'll be in touch soon.`);
  }

  const interestParagraphs = parts.map(p => `<p>${p}</p>`).join('\n    ');

  return {
    subject: "Welcome to the Pause movement",
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
    .signature { margin-top: 28px; color: #2a2520; font-size: 16px; }
    .signature a { color: #b85c38; text-decoration: none; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e8e3dc; font-size: 12px; color: #a89d91; }
    .footer a { color: #b85c38; text-decoration: none; }
    .banner { margin-top: 40px; border-radius: 12px; background: #141210; padding: 36px 28px; text-align: center; }
    .banner-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase; color: #b85c38; margin-bottom: 12px; }
    .banner-heading { font-size: 22px; font-weight: 300; color: #ffffff; line-height: 1.4; margin-bottom: 16px; }
    .banner-heading em { font-style: italic; color: #b85c38; }
    .banner-text { font-size: 13px; color: #a89d91; line-height: 1.6; margin-bottom: 20px; }
    .banner-btn { display: inline-block; padding: 10px 24px; background: #b85c38; color: #ffffff; font-size: 13px; font-weight: 500; border-radius: 100px; text-decoration: none; letter-spacing: 0.02em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-mark">&#9673;</span> PAUSE</div>

    <p>${greeting}</p>

    <p>Thanks for joining the Pause movement.</p>

    ${interestParagraphs}

    <p>Feel free to reply to this email anytime — it comes straight to us. We'd love to hear what's on your mind.</p>

    <div class="signature">
      <p>Warmly,</p>
      <p>Tarun &amp; Michael<br>
      <a href="https://www.pauselab.org">www.pauselab.org</a></p>
    </div>

    <div class="banner">
      <div class="banner-eyebrow">Coming 2027 from Hachette</div>
      <div class="banner-heading">Better leaders start with a <em>pause.</em></div>
      <div class="banner-text">A new book on the neuroscience of self-regulation, emotional intelligence, and what it really takes to lead well.</div>
      <a href="https://www.pauselab.org/#book" class="banner-btn">Learn More</a>
    </div>

    <div class="footer">
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
    .signature { margin-top: 28px; color: #2a2520; font-size: 16px; }
    .signature a { color: #b85c38; text-decoration: none; }
    .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e8e3dc; font-size: 12px; color: #a89d91; }
    .footer a { color: #b85c38; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo"><span class="logo-mark">&#9673;</span> PAUSE</div>

    ${bodyHtml}

    <div class="signature">
      <p>Warmly,</p>
      <p>Tarun &amp; Michael<br>
      <a href="https://www.pauselab.org">www.pauselab.org</a></p>
    </div>

    <div class="footer">
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
    `.trim()
  };
}
