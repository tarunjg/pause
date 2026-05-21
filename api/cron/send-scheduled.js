/**
 * Vercel Cron handler. Runs every 5 minutes (see vercel.json).
 * Finds posts where status='scheduled' AND scheduled_at <= now() and sends them.
 *
 * Security: Vercel cron requests include the header `x-vercel-cron` and an
 * Authorization Bearer token matching CRON_SECRET if set. We accept either.
 */

import { supabase } from '../_lib/supabase.js';
import { resend, FROM_EMAIL } from '../_lib/resend.js';
import { newsletterEmail } from '../_lib/emails.js';

export default async function handler(req, res) {
  // Verify the request is from Vercel cron (or has the cron secret)
  const isVercelCron = req.headers['x-vercel-cron'] === '1';
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.authorization || '';
  const hasValidSecret = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isVercelCron && !hasValidSecret) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Find posts due for sending
    const { data: duePosts, error: queryError } = await supabase
      .from('pause_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(5);

    if (queryError) {
      console.error('Query error:', queryError);
      return res.status(500).json({ message: 'Query failed' });
    }

    if (!duePosts || duePosts.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No scheduled posts due' });
    }

    const results = [];

    for (const post of duePosts) {
      try {
        // Mark as sending so concurrent crons don't double-send
        const { error: lockError } = await supabase
          .from('pause_posts')
          .update({ status: 'sending', updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('status', 'scheduled');

        if (lockError) {
          results.push({ id: post.id, skipped: 'lock failed' });
          continue;
        }

        // Compute slug if missing
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
            .neq('id', post.id)
            .limit(1);
          if (existing?.length) slug = `${slug}-${Date.now().toString(36)}`;
        }

        // Fetch subscribers
        const { data: contacts } = await supabase
          .from('contacts')
          .select('email, first_name, unsubscribe_token')
          .eq('subscribed', true);

        if (!contacts?.length) {
          await supabase
            .from('pause_posts')
            .update({ status: 'scheduled', updated_at: new Date().toISOString() })
            .eq('id', post.id);
          results.push({ id: post.id, error: 'no subscribers, reverted to scheduled' });
          continue;
        }

        const siteUrl = process.env.SITE_URL || 'https://www.pauselab.org';
        const coverImageHtml = post.cover_image_url
          ? `<p><img src="${post.cover_image_url}" alt="" style="width:100%;border-radius:12px;display:block;margin:16px 0;" /></p>`
          : '';

        let sent = 0;
        let failed = 0;
        const batchSize = 10;

        for (let i = 0; i < contacts.length; i += batchSize) {
          const batch = contacts.slice(i, i + batchSize);
          const sends = batch.map(async (contact) => {
            const greeting = contact.first_name ? `<p>Hey ${contact.first_name},</p>` : '<p>Hey,</p>';
            const personalizedHtml = greeting + coverImageHtml + post.body_html;
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
              console.error(`Failed to send to ${contact.email}:`, err.message);
              failed++;
            }
          });

          await Promise.all(sends);
          if (i + batchSize < contacts.length) {
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        await supabase
          .from('pause_posts')
          .update({
            status: 'sent',
            slug,
            sent_at: new Date().toISOString(),
            recipients_count: sent,
            bounced_count: failed,
            scheduled_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', post.id);

        await supabase.from('newsletter_sends').insert({
          subject: post.title,
          recipients: sent,
          failed,
        });

        results.push({ id: post.id, sent, failed, slug });
      } catch (postError) {
        console.error(`Error processing post ${post.id}:`, postError);
        // Revert to scheduled so we retry next cron tick
        await supabase
          .from('pause_posts')
          .update({ status: 'scheduled' })
          .eq('id', post.id);
        results.push({ id: post.id, error: postError.message });
      }
    }

    return res.status(200).json({ processed: results.length, results });
  } catch (error) {
    console.error('Cron error:', error);
    return res.status(500).json({ message: 'Cron failed: ' + error.message });
  }
}
