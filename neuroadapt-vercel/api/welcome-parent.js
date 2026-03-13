/**
 * api/welcome-parent.js
 * POST /api/welcome-parent
 * Called from the app immediately after under-18 account creation.
 * Sends a welcome email to the parent so they know reports are coming.
 * No auth required — just validates the payload.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = process.env.REPORT_FROM_EMAIL || 'reports@resend.dev';
const FROM_NAME      = 'NeuroAdapt Learning';
const APP_URL        = process.env.APP_URL || 'https://enable-auth-f3007.web.app';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { parentEmail, childName } = req.body || {};

  if (!parentEmail || !EMAIL_RE.test(parentEmail)) {
    return res.status(400).json({ error: 'Invalid parent email' });
  }
  if (!childName || typeof childName !== 'string') {
    return res.status(400).json({ error: 'childName required' });
  }
  // Sanitise
  const safeName  = childName.slice(0, 80).replace(/[<>]/g, '');
  const safeEmail = parentEmail.toLowerCase().trim();

  if (!RESEND_API_KEY) {
    // Graceful skip if not configured yet
    console.warn('RESEND_API_KEY not set — skipping welcome email');
    return res.json({ success: true, skipped: true });
  }

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from:    `${FROM_NAME} <${FROM_EMAIL}>`,
        to:      [safeEmail],
        subject: `${safeName} joined NeuroAdapt — you'll receive weekly progress reports`,
        html: welcomeHTML(safeName),
        text:    `Hi! ${safeName} joined NeuroAdapt and listed you as their parent/guardian. You'll receive a weekly learning progress report every Monday. Visit ${APP_URL}`,
      }),
    });
    return res.json({ success: true });
  } catch(e) {
    console.error('welcome-parent error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};

function welcomeHTML(childName) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0"
  style="max-width:560px;background:#111;border-radius:16px;overflow:hidden;border:1px solid #222">
  <tr><td style="background:#111;padding:32px;border-bottom:2px solid #FF5722">
    <div style="background:#FF5722;display:inline-block;border-radius:10px;
         padding:8px 14px;font-size:18px;font-weight:900;color:#fff">NA</div>
    <h1 style="color:#fff;margin:20px 0 4px;font-size:22px">Hello from NeuroAdapt 👋</h1>
    <p style="color:#888;margin:0;font-size:13px">Weekly progress reports for your child</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    <p style="color:#ddd;font-size:14px;line-height:1.7;margin-top:0">
      <strong style="color:#fff">${childName}</strong> just created a NeuroAdapt account
      and listed you as their parent or guardian.
    </p>
    <p style="color:#ddd;font-size:14px;line-height:1.7">
      Every <strong style="color:#fff">Monday morning</strong> you'll receive a report with:
    </p>
    <ul style="color:#aaa;line-height:2;font-size:13px;padding-left:20px">
      <li>Focus sessions completed and time spent</li>
      <li>Topics and subjects studied</li>
      <li>Daily streak and consistency</li>
      <li>Mood and wellbeing check-ins</li>
      <li>Strengths and areas to improve</li>
    </ul>
    <div style="margin-top:24px">
      <a href="${APP_URL}"
         style="background:#FF5722;color:#fff;text-decoration:none;padding:12px 28px;
                border-radius:8px;font-size:14px;font-weight:700;display:inline-block">
        View NeuroAdapt →
      </a>
    </div>
  </td></tr>
  <tr><td style="padding:16px 32px;background:#0a0a0a;border-top:1px solid #1a1a1a">
    <p style="color:#333;font-size:11px;margin:0;line-height:1.6">
      If ${childName} is not your child, please ignore this email — no action needed.<br>
      To stop receiving reports, ask ${childName} to remove the parent email from profile settings.
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
