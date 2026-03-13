/**
 * api/weekly-cron.js
 * GET /api/weekly-cron
 * Triggered every Monday by Vercel Cron (configured in vercel.json).
 * Protected by CRON_SECRET so only Vercel can call it.
 */
const { getDB } = require('../lib/firebase');
const { generateChildProgressReport } = require('../lib/reportGenerator');
const { buildEmailHTML } = require('../lib/emailBuilder');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.REPORT_FROM_EMAIL || 'reports@resend.dev';
const FROM_NAME      = 'NeuroAdapt Learning';
const CRON_SECRET    = process.env.CRON_SECRET;

module.exports = async function handler(req, res) {
  // Security: only Vercel Cron (or your own calls with the secret) can trigger this
  const authHeader = req.headers.authorization || '';
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorised' });
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Weekly cron started at', new Date().toISOString());

  const db = getDB();

  // Fetch all users with a parentEmail
  let usersSnap;
  try {
    usersSnap = await db.collection('users')
      .where('parentEmail', '!=', null)
      .get();
  } catch(e) {
    console.error('Firestore query failed:', e.message);
    return res.status(500).json({ error: e.message });
  }

  console.log(`Found ${usersSnap.size} accounts with parent email`);

  const results = { sent: [], failed: [] };

  // Process sequentially to avoid rate limits on free Resend tier
  for (const doc of usersSnap.docs) {
    try {
      const report = await generateChildProgressReport(db, doc.id);
      await sendViaResend(report.parentEmail, report);
      results.sent.push({ uid: doc.id, name: report.childName });
      console.log(`✅ Sent to ${report.parentEmail} for ${report.childName}`);
      // 200ms gap between sends to respect rate limits
      await sleep(200);
    } catch(e) {
      console.error(`❌ Failed for ${doc.id}:`, e.message);
      results.failed.push({ uid: doc.id, error: e.message });
    }
  }

  console.log(`Cron done. Sent: ${results.sent.length}, Failed: ${results.failed.length}`);
  return res.json({
    success: true,
    sent:    results.sent.length,
    failed:  results.failed.length,
    details: results,
  });
};

async function sendViaResend(to, report) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      from:    `${FROM_NAME} <${FROM_EMAIL}>`,
      to:      [to],
      subject: `Weekly Learning Report for ${report.childName} — ${report.reportDate}`,
      html:    buildEmailHTML(report),
      text:    `NeuroAdapt weekly report for ${report.childName}. Streak: ${report.streak} days. Focus: ${report.totalFocusMins} mins. Sessions: ${report.sessionCount}.`,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Resend ${response.status}`);
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
