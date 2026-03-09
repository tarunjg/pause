// Vercel Serverless Function for Brevo Newsletter Signup
// This keeps your Brevo API key secure on the server

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { fullName, email, phone } = req.body;

  // Validate required fields
  if (!fullName || !email || !phone) {
    return res.status(400).json({
      message: 'Please provide your name, email, and phone number'
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  // Validate phone number format (must include country code)
  const phoneDigits = phone.replace(/\D/g, '');
  if (phoneDigits.length < 10) {
    return res.status(400).json({
      message: 'Please provide a valid phone number with country code (e.g., +14081234567)'
    });
  }

  // Format phone to E.164 format (add + if not present)
  const formattedPhone = phone.startsWith('+') ? phone : `+${phoneDigits}`;

  // Split full name into first and last name
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  // Get Brevo API key from environment variables
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    console.error('BREVO_API_KEY is not configured');
    return res.status(500).json({
      message: 'Newsletter service is not configured yet. Please contact hello@pauselab.org'
    });
  }

  try {
    // Add contact to Brevo
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          SMS: formattedPhone
        },
        listIds: [2], // Default Brevo list ID - you'll update this after creating your list
        updateEnabled: true // Update contact if already exists
      })
    });

    const data = await response.json();

    // Handle Brevo API errors
    if (!response.ok) {
      // If contact already exists, that's actually okay
      if (response.status === 400 && data.code === 'duplicate_parameter') {
        return res.status(200).json({
          message: 'You are already subscribed!',
          success: true
        });
      }

      console.error('Brevo API error:', data);
      return res.status(response.status).json({
        message: 'Failed to subscribe. Please try again or contact hello@pauselab.org'
      });
    }

    // Success!
    return res.status(200).json({
      message: 'Successfully subscribed!',
      success: true
    });

  } catch (error) {
    console.error('Newsletter signup error:', error);
    return res.status(500).json({
      message: 'An error occurred. Please try again or contact hello@pauselab.org'
    });
  }
}
