/**
 * lib/emailBuilder.js
 * Builds the HTML email for parent progress reports.
 */

const APP_URL = process.env.APP_URL || 'https://enable-auth-f3007.web.app';

function buildEmailHTML(r) {
  const calendar = r.weekActivity.map(d => `
    <td align="center" style="padding:0 3px">
      <div style="width:36px;height:36px;border-radius:8px;line-height:36px;text-align:center;
           font-size:14px;font-weight:700;margin:0 auto;
           background:${d.active ? '#FF5722' : '#2a2a2a'};
           color:${d.active ? '#fff' : '#555'}">
        ${d.active ? '✓' : '·'}
      </div>
      <div style="font-size:10px;color:#666;margin-top:4px;white-space:nowrap">
        ${d.label.split(' ')[0]}
      </div>
    </td>`).join('');

  const subjectRows = r.topSubjects.length
    ? r.topSubjects.map(s => `
        <tr>
          <td style="padding:8px 0;color:#ccc;font-size:13px;border-bottom:1px solid #2a2a2a">${s.subj}</td>
          <td style="padding:8px 0;text-align:right;border-bottom:1px solid #2a2a2a">
            <span style="background:#1a1a1a;color:#FF5722;font-weight:700;font-size:12px;
                         padding:3px 10px;border-radius:20px">${s.mins} min</span>
          </td>
        </tr>`).join('')
    : `<tr><td colspan="2" style="color:#555;font-size:13px;padding:8px 0">No sessions logged this week</td></tr>`;

  const strengthItems = r.strengths.map(s =>
    `<li style="margin:7px 0;color:#ddd;font-size:13px;line-height:1.5">
       <span style="color:#66BB6A">✅</span> ${s}
     </li>`).join('');

  const improveItems = r.improvements.map(s =>
    `<li style="margin:7px 0;color:#ddd;font-size:13px;line-height:1.5">
       <span style="color:#FFA726">💡</span> ${s}
     </li>`).join('');

  const overwhelmWarning = r.overwhelmedCount >= 2 ? `
    <tr><td style="padding:0 32px 16px">
      <div style="background:#2a1a1a;border-left:4px solid #EF5350;border-radius:0 8px 8px 0;
                  padding:12px 16px;font-size:13px;color:#EF9A9A;line-height:1.6">
        ⚠️ <strong>${r.childName}</strong> reported feeling overwhelmed
        ${r.overwhelmedCount} times this week.
        Consider discussing session length or workload with them.
      </div>
    </td></tr>` : '';

  const profilesRow = r.profiles !== 'None selected' ? `
    <tr><td style="padding:16px 32px;border-top:1px solid #222">
      <div style="font-size:12px;color:#666">
        🧩 <strong style="color:#888">Accessibility profiles active:</strong>
        <span style="color:#aaa">${r.profiles}</span>
      </div>
    </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>NeuroAdapt Report — ${r.childName}</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;
  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0"
  style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;
         border:1px solid #222">

  <!-- ── Header ── -->
  <tr><td style="background:#111;padding:28px 32px;border-bottom:2px solid #FF5722">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <div style="display:inline-block;background:#FF5722;border-radius:10px;
               padding:8px 14px;font-size:18px;font-weight:900;color:#fff;
               letter-spacing:-0.5px">NA</div>
        </td>
        <td align="right">
          <div style="color:#555;font-size:11px">Weekly Learning Report</div>
          <div style="color:#444;font-size:11px">${r.reportDate}</div>
        </td>
      </tr>
    </table>
    <div style="margin-top:20px">
      <div style="color:#FF5722;font-size:11px;font-weight:700;
                  text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px">
        Learning report for
      </div>
      <div style="color:#fff;font-size:26px;font-weight:900;letter-spacing:-0.5px">
        ${r.childName}
      </div>
      <div style="color:#555;font-size:12px;margin-top:2px">${r.reportPeriod}</div>
    </div>
  </td></tr>

  <!-- ── Encouraging message ── -->
  <tr><td style="background:#0f1f0f;padding:16px 32px;border-bottom:1px solid #1a2a1a">
    <div style="color:#81C784;font-size:14px;line-height:1.7">
      💚 ${r.encouragement}
    </div>
  </td></tr>

  <!-- ── 4 stat boxes ── -->
  <tr><td style="background:#111;padding:24px 32px 20px">
    <div style="color:#555;font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:1.5px;margin-bottom:14px">This Week's Stats</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        ${statBox(r.streak,         '🔥', 'Day Streak')}
        ${statBox(r.totalFocusMins, '⏱️', 'Focus Mins')}
        ${statBox(r.sessionCount,   '📚', 'Sessions')}
        ${statBox(r.activeDaysCount+'/7', '📅', 'Active Days')}
      </tr>
    </table>
  </td></tr>

  <!-- ── Activity calendar ── -->
  <tr><td style="background:#111;padding:0 32px 24px">
    <div style="color:#555;font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:1.5px;margin-bottom:12px">Activity This Week</div>
    <table cellpadding="0" cellspacing="0"><tr>${calendar}</tr></table>
  </td></tr>

  <!-- ── Topics ── -->
  <tr><td style="background:#0f0f0f;padding:22px 32px;border-top:1px solid #1e1e1e">
    <div style="color:#555;font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:1.5px;margin-bottom:12px">Topics & Study Time</div>
    <table width="100%" cellpadding="0" cellspacing="0">${subjectRows}</table>
    <div style="margin-top:12px;font-size:11px;color:#444">
      All-time: ${r.allTimeFocusMins} focus mins · ${r.allTimeTexts} texts simplified
    </div>
  </td></tr>

  <!-- ── Mood ── -->
  <tr><td style="background:#111;padding:22px 32px;border-top:1px solid #1e1e1e">
    <div style="color:#555;font-size:10px;font-weight:700;text-transform:uppercase;
                letter-spacing:1.5px;margin-bottom:10px">Mood & Wellbeing</div>
    <div>
      <span style="font-size:24px">${r.moodEmoji}</span>
      <span style="color:#ddd;font-size:14px;vertical-align:middle;margin-left:8px">
        Most frequent mood this week:
        <strong style="color:#fff">${r.dominantMood}</strong>
      </span>
    </div>
  </td></tr>

  <!-- ── Overwhelm warning (conditional) ── -->
  ${overwhelmWarning}

  <!-- ── Strengths + Improvements ── -->
  <tr><td style="background:#0f0f0f;padding:22px 32px;border-top:1px solid #1e1e1e">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr valign="top">
        <td style="width:47%;padding-right:16px">
          <div style="color:#66BB6A;font-size:10px;font-weight:700;text-transform:uppercase;
                      letter-spacing:1.5px;margin-bottom:10px">Strengths</div>
          <ul style="margin:0;padding-left:0;list-style:none">${strengthItems}</ul>
        </td>
        <td style="width:6%;border-left:1px solid #222"></td>
        <td style="width:47%;padding-left:16px">
          <div style="color:#FFA726;font-size:10px;font-weight:700;text-transform:uppercase;
                      letter-spacing:1.5px;margin-bottom:10px">Areas to Grow</div>
          <ul style="margin:0;padding-left:0;list-style:none">${improveItems}</ul>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- ── Profiles ── -->
  ${profilesRow}

  <!-- ── CTA ── -->
  <tr><td style="background:#111;padding:24px 32px;border-top:1px solid #1e1e1e;text-align:center">
    <a href="${APP_URL}"
       style="display:inline-block;background:#FF5722;color:#fff;text-decoration:none;
              padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;
              letter-spacing:0.3px">
      View Full Dashboard →
    </a>
    <div style="color:#444;font-size:11px;margin-top:12px">
      Best streak so far: <strong style="color:#666">${r.bestStreak} days</strong>
    </div>
  </td></tr>

  <!-- ── Footer ── -->
  <tr><td style="background:#0a0a0a;padding:20px 32px;border-top:1px solid #1a1a1a;
                  text-align:center">
    <div style="color:#333;font-size:11px;line-height:1.8">
      Sent to you as the registered parent/guardian of ${r.childName}.<br>
      Reports are sent every Monday. To stop receiving them, ask ${r.childName}
      to remove the parent email from their profile settings.<br>
      <a href="${APP_URL}" style="color:#444">neuroadapt.app</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function statBox(value, icon, label) {
  return `
    <td align="center" style="padding:0 4px 0 0">
      <div style="background:#1a1a1a;border-radius:10px;padding:14px 8px;min-width:100px">
        <div style="font-size:26px;font-weight:900;color:#FF5722;line-height:1">${value}</div>
        <div style="font-size:11px;color:#555;margin-top:5px">${icon} ${label}</div>
      </div>
    </td>`;
}

module.exports = { buildEmailHTML };
