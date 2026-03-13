# NeuroAdapt — Free Backend Setup (Vercel + Resend)

No credit card. No Firebase Blaze plan needed.
Total setup time: ~15 minutes.

---

## What you get
- ✅ Weekly parent progress reports (every Monday, automatic)
- ✅ Manual "Send Report Now" button in the app
- ✅ Welcome email when under-18 account is created
- ✅ Beautiful dark-themed HTML email with stats, charts, strengths, mood
- ✅ 100% free — Vercel free tier + Resend free tier

---

## Step 1 — Get a free Resend API key (email service)

1. Go to **resend.com** → click "Start for free"
2. Sign up (GitHub login works great)
3. Go to **API Keys** → click "Create API Key"
4. Name it "neuroadapt" → Create → **copy the key** (starts with `re_`)
5. Free tier: **3,000 emails/month** — more than enough

> **About the sender address:**
> On Resend's free tier you can send FROM `onboarding@resend.dev` immediately (no domain needed).
> Set `REPORT_FROM_EMAIL=onboarding@resend.dev` in Step 3.
> Later, add your own domain in Resend → Domains for a custom from address.

---

## Step 2 — Get Firebase service account key

1. Go to **console.firebase.google.com** → select `enable-auth-f3007`
2. Click ⚙️ **Settings** → **Project settings**
3. Go to **Service accounts** tab
4. Click **"Generate new private key"** → confirm → a JSON file downloads
5. Open that JSON file — you'll paste its contents in Step 3

---

## Step 3 — Deploy to Vercel (free)

### 3a. Install Vercel CLI
```bash
npm install -g vercel
```

### 3b. Deploy
```bash
cd neuroadapt-vercel
npm install
vercel
```

Follow the prompts:
- "Set up and deploy?" → **Y**
- "Which scope?" → your personal account
- "Link to existing project?" → **N** (new project)
- "Project name?" → `neuroadapt-backend`
- "Directory?" → `.` (current)
- Override settings? → **N**

It will deploy and give you a URL like: `https://neuroadapt-backend-xyz.vercel.app`

### 3c. Set environment variables
```bash
# Your Resend API key from Step 1
vercel env add RESEND_API_KEY
# paste: re_xxxxxxxxxxxx

# Sender address (use onboarding@resend.dev for free tier)
vercel env add REPORT_FROM_EMAIL
# paste: onboarding@resend.dev

# Firebase service account (paste the ENTIRE contents of the JSON file)
vercel env add FIREBASE_SERVICE_ACCOUNT
# paste the full JSON — it's long, that's fine

# Secret to protect the cron endpoint
vercel env add CRON_SECRET
# type any random string e.g: mysecret123

# Your app's URL
vercel env add APP_URL
# paste: https://enable-auth-f3007.web.app
```

### 3d. Redeploy with env vars
```bash
vercel --prod
```

Copy the final production URL (e.g. `https://neuroadapt-backend.vercel.app`)

---

## Step 4 — Update index.html with your Vercel URL

Open `index.html`, find this line near the bottom:
```js
const FUNCTIONS_URL = 'https://neuroadapt-backend.vercel.app';
```
Replace `neuroadapt-backend.vercel.app` with **your actual Vercel URL**.

Then redeploy the app to Firebase Hosting:
```bash
# from the neuroadapt-parent-feature folder
firebase deploy --only hosting
```

---

## Step 5 — Test it

1. Create a new account in the app → enter age under 18 → add a parent email
2. You should receive a **welcome email** within ~30 seconds
3. Go to **Profile → Parent / Guardian** → click **"Send Report Now"**
4. Check the parent inbox — report arrives within ~10 seconds

---

## How the weekly cron works

`vercel.json` contains:
```json
{ "path": "/api/weekly-cron", "schedule": "0 3 * * 1" }
```
This runs every Monday at 3:00 AM UTC (= 8:30 AM IST).
Vercel calls the endpoint automatically — no setup needed.

---

## File structure

```
neuroadapt-vercel/
├── api/
│   ├── send-report.js      ← POST — called from app (auth-protected)
│   ├── weekly-cron.js      ← GET  — Vercel Cron, runs every Monday
│   └── welcome-parent.js   ← POST — called on under-18 signup
├── lib/
│   ├── reportGenerator.js  ← generateChildProgressReport(db, userId)
│   ├── emailBuilder.js     ← buildEmailHTML(reportData)
│   └── firebase.js         ← Admin SDK singleton
├── vercel.json             ← Cron schedule + function config
└── package.json
```

---

## Troubleshooting

**"RESEND_API_KEY not set"** — run `vercel env add RESEND_API_KEY` then `vercel --prod`

**"User not found"** — Firestore rules may be blocking. Check `firestore.rules` is deployed:
```bash
firebase deploy --only firestore:rules
```

**"Invalid token"** — Make sure the Firebase project ID in the service account JSON
matches `enable-auth-f3007`.

**Cron not running** — Vercel Cron requires the **Hobby plan** (free).
Check: vercel.com/dashboard → your project → Settings → Crons.

**Email going to spam** — Add a custom domain in Resend → Domains,
then set `REPORT_FROM_EMAIL=reports@yourdomain.com`.
