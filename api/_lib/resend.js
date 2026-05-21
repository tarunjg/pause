import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.error('Missing RESEND_API_KEY');
}

export const resend = new Resend(resendApiKey);

export const FROM_EMAIL = 'Tarun Galagali <tarun@pauselab.org>';
