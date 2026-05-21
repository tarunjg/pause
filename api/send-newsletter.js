import { supabase } from './_lib/supabase.js';
import { resend, FROM_EMAIL } from './_lib/resend.js';
import { newsletterEmail } from './_lib/emails.js';

// Protected endpoint for sending newsletters
// Call with: POST /api/send-newsletter
// Headers: Authorization: Bearer <ADMIN_SECRET>
// Body: { subject: "...", bodyHtml: "..." }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Simple auth check — must match ADMIN_SECRET env var
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { subject, bodyHtml } = req.body;

  if (!subject || !bodyHtml) {
    return res.status(400).json({ message: 'Subject and bodyHtml are required' });
  }

  try {
    // Fetch all subscribed contacts
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('email, first_name, unsubscribe_token')
      .eq('subscribed', true);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ message: 'Failed to fetch contacts' });
    }

    if (!contacts || contacts.length === 0) {
      return res.status(200).json({ message: 'No subscribed contacts', sent: 0 });
    }

    const siteUrl = process.env.SITE_URL || 'https://www.pauselab.org';
    const email = newsletterEmail({ subject, bodyHtml });

    // Send in batches of 50 to avoid rate limits
    const batchSize = 50;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);

      const sends = batch.map(async (contact) => {
        const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=${contact.unsubscribe_token}`;
        const html = email.html.replace('{{unsubscribe_url}}', unsubscribeUrl);

        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: contact.email,
            subject: email.subject,
            html,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
            },
          });
          sent++;
        } catch (err) {
          console.error(`Failed to send to ${contact.email}:`, err);
          failed++;
        }
      });

      await Promise.all(sends);
    }

    // Log the send
    await supabase.from('newsletter_sends').insert({
      subject,
      recipients: sent,
      failed,
    });

    return res.status(200).json({
      message: `Newsletter sent!`,
      sent,
      failed,
      total: contacts.length,
    });
  } catch (error) {
    console.error('Newsletter send error:', error);
    return res.status(500).json({ message: 'Failed to send newsletter' });
  }
}
