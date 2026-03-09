# Newsletter Setup Guide

Your newsletter form is ready! Follow these steps to connect it with Brevo.

## Step 1: Create a Brevo Account

1. Go to [Brevo.com](https://www.brevo.com/) and create a free account
2. Verify your email address
3. Complete the onboarding flow

## Step 2: Get Your API Key

1. Log in to your Brevo dashboard
2. Go to **Settings** → **SMTP & API** → **API Keys**
   - Direct link: https://app.brevo.com/settings/keys/api
3. Click **Generate a new API Key**
4. Give it a name like "Pause Lab Website"
5. Copy the API key (you won't be able to see it again!)

## Step 3: Create a Contact List

1. In Brevo, go to **Contacts** → **Lists**
2. Click **Create a List**
3. Name it "Newsletter Subscribers" or similar
4. Note the **List ID** number (you'll see it in the URL or list details)
5. Update the API code:
   - Open `/api/newsletter.js`
   - Find the line: `listIds: [2]`
   - Replace `2` with your actual list ID

## Step 4: Configure Environment Variables

### For Local Development:

1. Create a `.env` file in the root of your project:
   ```bash
   cp .env.example .env
   ```

2. Add your Brevo API key:
   ```
   BREVO_API_KEY=your_actual_api_key_here
   ```

### For Vercel (Production):

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `BREVO_API_KEY`
   - **Value**: Your Brevo API key
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. Redeploy your site for changes to take effect

## Step 5: Test the Form

1. Run your development server:
   ```bash
   npm run dev
   ```

2. Visit your site and scroll to the newsletter section
3. Fill out the form with test data
4. Submit and check:
   - You should see a success message
   - The contact should appear in your Brevo dashboard under **Contacts**

## Using Brevo for Email & SMS

### Sending Personalized Emails:

1. In Brevo, go to **Campaigns** → **Email**
2. Click **Create an email campaign**
3. Choose your template or create from scratch
4. Use `{{ contact.FIRSTNAME }}` to personalize emails
   - Example: "Hi {{ contact.FIRSTNAME }}, here's what's new at Pause Lab..."
5. Select your "Newsletter Subscribers" list
6. Send or schedule!

### Sending SMS Messages:

1. First, add SMS credits to your account:
   - Go to **Settings** → **Plan & Billing** → **SMS**
   - Purchase credits (usually $0.01-0.02 per SMS)
2. Go to **Campaigns** → **SMS**
3. Click **Create an SMS campaign**
4. Write your message (keep it under 160 characters for best delivery)
   - Example: "New from Pause Lab: [your link]"
5. Select your list (only contacts with phone numbers will receive it)
6. Send!

### Tips for Success:

- **Test First**: Always send to yourself first before blasting your whole list
- **Personalization**: Use `{{ contact.FIRSTNAME }}` in emails to address people by name
- **Frequency**: Stick to your "once a month" promise - consistency builds trust
- **Segments**: Create segments in Brevo to send targeted messages (e.g., by industry, role, engagement)
- **Track Opens**: Brevo shows you who opens emails and clicks links
- **SMS Best Practices**: Keep texts short, include a clear call-to-action, and always include a way to opt out

## Troubleshooting

### Form shows "Newsletter service is not configured"
- Make sure `BREVO_API_KEY` is set in your environment variables
- Redeploy your Vercel site after adding the variable

### "Failed to subscribe" error
- Check that your API key is valid and not expired
- Make sure the list ID in `/api/newsletter.js` matches your Brevo list
- Check Vercel function logs for detailed error messages

### Contact not appearing in Brevo
- Check the Brevo dashboard under **Contacts** → **All Contacts**
- Check if the contact was marked as duplicate
- Look in the list you specified in the code

## Need Help?

- Brevo Documentation: https://developers.brevo.com/docs
- Brevo Support: Available in your dashboard
- Newsletter Code Issues: Email hello@pauselab.org

---

## Technical Details

**Frontend**: React form in `src/App.jsx` (`NewsletterForm` component)
**Backend**: Vercel serverless function at `/api/newsletter.js`
**API**: Brevo REST API v3
**Security**: API key stored server-side, never exposed to clients
