// Vercel Serverless Function for Connect page signups
// Sends contacts to Brevo with interest tags

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

  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    console.error('BREVO_API_KEY is not configured');
    return res.status(500).json({
      message: 'Service is not configured yet. Please contact hello@pauselab.org'
    });
  }

  try {
    // Build attributes including interest tags and notes
    const attributes = {
      FIRSTNAME: firstName,
      LASTNAME: lastName,
    };

    // Store interests and notes as attributes
    if (org) {
      attributes.COMPANY = org;
    }
    if (notes) {
      attributes.NOTES = notes;
    }
    attributes.INTERESTS = interests.join(', ');

    // Use the same list as newsletter (list 2), Brevo will dedupe
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: attributes,
        listIds: [2],
        updateEnabled: true
      })
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400 && data.code === 'duplicate_parameter') {
        return res.status(200).json({
          message: 'Thanks! We already have your info and will be in touch.',
          success: true
        });
      }

      console.error('Brevo API error:', data);
      return res.status(response.status).json({
        message: 'Failed to submit. Please try again or contact hello@pauselab.org'
      });
    }

    return res.status(200).json({
      message: 'Successfully submitted!',
      success: true
    });

  } catch (error) {
    console.error('Connect signup error:', error);
    return res.status(500).json({
      message: 'An error occurred. Please try again or contact hello@pauselab.org'
    });
  }
}
