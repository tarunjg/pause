# Newsletter Quick Start 🚀

Your newsletter form is now live on your site! Here's what was added and what you need to do.

## ✅ What's Been Built

1. **Beautiful Form Component** - Collects name, email, and phone number
2. **Secure API Endpoint** - Server-side integration with Brevo (`/api/newsletter.js`)
3. **Responsive Design** - Looks great on mobile, tablet, and desktop
4. **Success/Error States** - Clear feedback for users
5. **Loading States** - Smooth UX while submitting

## 🎯 Next Steps (5 minutes)

### 1. Create Brevo Account
Go to [Brevo.com](https://www.brevo.com/) and sign up (it's free!)

### 2. Get Your API Key
- Settings → SMTP & API → API Keys
- Generate new key
- Copy it

### 3. Add to Vercel
- Vercel Dashboard → Your Project → Settings → Environment Variables
- Add: `BREVO_API_KEY` = `your_key_here`
- Save and redeploy

### 4. Create a List in Brevo
- Go to Contacts → Lists → Create List
- Name it "Newsletter Subscribers"
- Note the List ID (shown in URL or list details)
- Update `/api/newsletter.js` line 48: change `listIds: [2]` to your list ID

### 5. Deploy & Test!
```bash
git add .
git commit -m "Add newsletter form with Brevo integration"
git push
```

## 📧 How to Use Brevo

### Send Personalized Emails:
1. Campaigns → Email → Create campaign
2. Use `{{ contact.FIRSTNAME }}` for personalization
   - "Hi {{ contact.FIRSTNAME }}, here's what's new..."
3. Select your list and send!

### Send SMS Blasts:
1. Add SMS credits (Settings → Plan & Billing → SMS)
2. Campaigns → SMS → Create SMS campaign
3. Write your message with a link
4. Send to your list!

## 📁 Files Changed/Added

- `src/App.jsx` - Added `NewsletterForm` component
- `api/newsletter.js` - NEW: Serverless function for Brevo integration
- `.env.example` - NEW: Example environment variables
- `.gitignore` - Updated to ignore `.env` files
- `NEWSLETTER_SETUP.md` - NEW: Detailed setup guide

## 🆘 Need More Help?

See `NEWSLETTER_SETUP.md` for detailed instructions with screenshots and troubleshooting.

---

Built with ❤️ for Pause Lab
