import { supabase } from '../../../_lib/supabase.js';
import { resend, FROM_EMAIL } from '../../../_lib/resend.js';
import { newsletterEmail } from '../../../_lib/emails.js';
import { isAuthenticated } from '../../../_lib/auth.js';

const TEST_RECIPIENT = 'tarun@pauselab.org';

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

  if (!post.title) {
    return res.status(400).json({ message: 'Post must have a subject line' });
  }

  const siteUrl = process.env.SITE_URL || 'https://www.pauselab.org';

  const greeting = `<p>Hey Tarun,</p>`;
  const coverImageHtml = post.cover_image_url
    ? `<p><img src="${post.cover_image_url}" alt="" style="width:100%;border-radius:12px;display:block;margin:16px 0;" /></p>`
    : '';
  const personalizedHtml = greeting + coverImageHtml + post.body_html;

  const email = newsletterEmail({
    subject: `[TEST] ${post.title}`,
    bodyHtml: personalizedHtml,
  });

  const unsubscribeUrl = `${siteUrl}/api/unsubscribe?token=test`;
  const html = email.html.replace('{{unsubscribe_url}}', unsubscribeUrl);

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: TEST_RECIPIENT,
      subject: email.subject,
      html,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
    });

    return res.status(200).json({
      message: `Test sent to ${TEST_RECIPIENT}`,
      recipient: TEST_RECIPIENT,
    });
  } catch (err) {
    console.error('Test send error:', err);
    return res.status(500).json({ message: 'Test send failed: ' + err.message });
  }
}
