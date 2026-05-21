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

  const { data: post, error: postError } = await supabase
    .from('pause_posts')
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

  if (!post.cover_image_url) {
    return res.status(400).json({ message: 'Post must have a cover image' });
  }

  // Auto-generate slug if not set
  let slug = post.slug;
  if (!slug) {
    slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
    const { data: existing } = await supabase
      .from('pause_posts')
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

    if (i + batchSize < contacts.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const { error: updateError } = await supabase
    .from('pause_posts')
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
