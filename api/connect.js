import { supabase } from './_lib/supabase.js';
import { resend, FROM_EMAIL } from './_lib/resend.js';
import { welcomeEmail } from './_lib/emails.js';
import { rateLimit } from './_lib/rate-limit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  const { ok, retryAfter } = rateLimit(ip, 5);
  if (!ok) {
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({ message: 'Too many requests. Please try again shortly.' });
  }

  const { firstName, lastName, email, org, interests, notes } = req.body;

  if (!firstName || !email) {
    return res.status(400).json({ message: 'Please provide your name and email' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  try {
    const { data: contact, error: dbError } = await supabase
      .from('contacts')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          first_name: firstName.trim(),
          last_name: lastName ? lastName.trim() : '',
          org: org || null,
          interests: ['newsletter', ...(interests || [])],
          notes: notes || null,
          subscribed: true,
        },
        { onConflict: 'email' }
      )
      .select()
      .single();

    if (dbError) {
      console.error('Supabase error:', dbError);
      return res.status(500).json({
        message: 'Failed to save your info. Please try again or contact hello@pauselab.org'
      });
    }

    const welcome = welcomeEmail(firstName, ['newsletter', ...(interests || [])]);
    const unsubscribeUrl = `${process.env.SITE_URL || 'https://www.pauselab.org'}/api/unsubscribe?token=${contact.unsubscribe_token}`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: welcome.subject,
        html: welcome.html.replace('{{unsubscribe_url}}', unsubscribeUrl),
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
        },
      });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr);
    }

    return res.status(200).json({
      message: 'Successfully submitted!',
      success: true,
    });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('Connect request timed out');
      return res.status(504).json({
        message: 'Request timed out. Please try again.'
      });
    }
    console.error('Connect signup error:', error);
    return res.status(500).json({
      message: 'An error occurred. Please try again or contact hello@pauselab.org'
    });
  }
}
