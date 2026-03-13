/**
 * api/send-report.js
 * POST /api/send-report
 * Called from the NeuroAdapt app when user clicks "Send Report Now".
 * Verifies Firebase ID token, generates report, sends via Resend (free).
 */
const { getDB, getAuth } = require('../lib/firebase');
const { generateChildProgressReport } = require('../lib/reportGenerator');
const { buildEmailHTML } = require('../lib/emailBuilder');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.REPORT_FROM_EMAIL || 'reports@resend.dev'; // resend test address
const FROM_NAME      = 'NeuroAdapt Learning';

module.exports = async function handler(req, res) {
  // CORS — allow the Firebase Hosting domain and localhost
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  // 1. Verify Firebase ID token
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  let uid;
  try {
    const token   = authHeader.split('Bearer ')[1];
    const decoded = await getAuth().verifyIdToken(token);
    uid = decoded.uid;
  } catch(e) {
    return res.status(401).json({ error: 'Invalid token: ' + e.message });
  }

  // 2. Validate request body
  const { userId } = req.body || {};
  if (!userId || userId !== uid) {
    return res.status(403).json({ error: 'Forbidden — userId mismatch' });
  }

  // 3. Generate report
  let report;
  try {
    const db = getDB();
    report = await generateChildProgressReport(db, userId);
  } catch(e) {
    return res.status(400).json({ error: e.message });
  }

  // 4. Send email via Resend
  try {
    await sendViaResend(report.parentEmail, report);
    return res.json({ success: true, sentTo: report.parentEmail });
  } catch(e) {
    console.error('Email send error:', e.message);
    return res.status(500).json({ error: 'Email failed: ' + e.message });
  }
};

async function sendViaResend(to, report) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not set in environment variables');

  const html = buildEmailHTML(report);
  const text = buildPlainText(report);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to:   [to],
      subject: `Weekly Learning Report for ${report.childName} — ${report.reportDate}`,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Resend API error: ${response.status}`);
  }
  return response.json();
}

function buildPlainText(r) {
  return [
    `NeuroAdapt Weekly Report — ${r.childName}`,
    `Period: ${r.reportPeriod} (${r.reportDate})`,
    ``,
    `STATS`,
    `  Streak:       ${r.streak} days (best: ${r.bestStreak})`,
    `  Focus time:   ${r.totalFocusMins} minutes`,
    `  Sessions:     ${r.sessionCount}`,
    `  Active days:  ${r.activeDaysCount}/7`,
    `  Texts read:   ${r.textsSimplified}`,
    ``,
    `MOOD: ${r.dominantMood} ${r.moodEmoji}`,
    ``,
    `TOPICS STUDIED`,
    ...r.topSubjects.map(s => `  • ${s.subj}: ${s.mins} min`),
    ``,
    `STRENGTHS`,
    ...r.strengths.map(s => `  ✅ ${s}`),
    ``,
    `AREAS TO GROW`,
    ...r.improvements.map(s => `  💡 ${s}`),
    ``,
    `All-time: ${r.allTimeFocusMins} focus mins · ${r.allTimeTexts} texts`,
    ``,
    `View full dashboard: ${process.env.APP_URL || 'https://enable-auth-f3007.web.app'}`,
  ].join('\n');
}
