import { supabase } from './_lib/supabase.js';
import { resend, FROM_EMAIL } from './_lib/resend.js';
import { welcomeEmail } from './_lib/emails.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { fullName, email, org, interests, notes } = req.body;

  if (!fullName || !email) {
    return res.status(400).json({ message: 'Please provide your name and email' });
  }

  if (!interests || interests.length === 0) {
    return res.status(400).json({ message: 'Please select at least one interest' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  try {
    // Upsert contact into Supabase
    const { data: contact, error: dbError } = await supabase
      .from('contacts')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          first_name: firstName,
          last_name: lastName,
          org: org || null,
          interests: interests,
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

    // Send welcome email via Resend
    const welcome = welcomeEmail(firstName);
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
      // Don't fail the signup if the welcome email fails
      console.error('Welcome email failed:', emailErr);
    }

    return res.status(200).json({
      message: 'Successfully submitted!',
      success: true,
    });
  } catch (error) {
    console.error('Connect signup error:', error);
    return res.status(500).json({
      message: 'An error occurred. Please try again or contact hello@pauselab.org'
    });
  }
}
