/**
 * lib/reportGenerator.js
 * Generates child progress report from Firestore data.
 * Pure function — no side effects, easy to test.
 */

const MOOD_EMOJI = { calm:'😌', focused:'🎯', stressed:'😤', overwhelmed:'😰' };

/**
 * generateChildProgressReport(db, userId)
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} userId
 * @returns {Promise<Object>} report data object
 */
async function generateChildProgressReport(db, userId) {
  // 1. Fetch user doc
  const userSnap = await db.collection('users').doc(userId).get();
  if (!userSnap.exists) throw new Error('User not found: ' + userId);
  const user = userSnap.data();
  if (!user.parentEmail) throw new Error('No parent email for user: ' + userId);

  // 2. Fetch subcollections (last 30 entries each)
  const [sessions, moodLog, simplifications, activeDays] = await Promise.all([
    fetchSub(db, userId, 'focusSessions',   'completedAt', 30),
    fetchSub(db, userId, 'moodLog',         'ts',          30),
    fetchSub(db, userId, 'simplifications', 'completedAt', 30),
    fetchSub(db, userId, 'activeDays',      null,          35),
  ]);

  // 3. Filter to last 7 days
  const now          = new Date();
  const sevenDaysAgo = new Date(now - 7 * 86400000);

  const recentSessions = sessions.filter(s =>
    toDate(s.completedAt) >= sevenDaysAgo);
  const recentTexts    = simplifications.filter(s =>
    toDate(s.completedAt) >= sevenDaysAgo);
  const recentMoods    = moodLog.filter(m =>
    toDate(m.ts) >= sevenDaysAgo);

  // 4. Session analytics
  const totalFocusMins = recentSessions.reduce((n, s) => n + (s.minutes || 0), 0);
  const sessionCount   = recentSessions.length;

  const subjectFreq = {};
  recentSessions.forEach(s => {
    const k = s.subject || 'General';
    subjectFreq[k] = (subjectFreq[k] || 0) + (s.minutes || 0);
  });
  const topSubjects = Object.entries(subjectFreq)
    .sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([subj, mins]) => ({ subj, mins }));

  // 5. Mood analytics
  const moodCounts = {};
  recentMoods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] || 0) + 1; });
  const dominantMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Not tracked';

  // 6. 7-day activity calendar
  const thisWeekDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    thisWeekDays.push(d.toISOString().split('T')[0]);
  }
  const activeDaySet    = new Set(activeDays.map(d => d.date));
  const weekActivity    = thisWeekDays.map(d => ({
    date:   d,
    label:  new Date(d + 'T12:00:00').toLocaleDateString('en-IN',
              { weekday:'short', month:'short', day:'numeric' }),
    active: activeDaySet.has(d),
  }));
  const activeDaysCount = weekActivity.filter(d => d.active).length;

  // 7. Strengths & improvements
  const strengths    = [];
  const improvements = [];

  if ((user.streak || 0) >= 5)       strengths.push('Consistent daily learning habit 🔥');
  if (totalFocusMins >= 60)          strengths.push('Strong focus endurance ⏱️');
  if (recentTexts.length >= 3)       strengths.push('Active reading & text engagement 📚');
  if (dominantMood === 'focused')    strengths.push('Positive focus mindset 🎯');
  if (dominantMood === 'calm')       strengths.push('Calm approach to studying 😌');
  if (activeDaysCount >= 5)          strengths.push('Excellent attendance this week 📅');
  if (strengths.length === 0)        strengths.push('Every journey starts with a first step! 🌱');

  if (sessionCount === 0)            improvements.push('Encourage starting with even 5-min sessions');
  if (totalFocusMins < 30)          improvements.push('Aim for at least 30 focus minutes per day');
  if ((user.streak || 0) === 0)     improvements.push('Build a daily login habit for streak rewards');
  const overwhelmedCount = (moodCounts['overwhelmed'] || 0);
  if (overwhelmedCount >= 2)         improvements.push(`Felt overwhelmed ${overwhelmedCount}× — consider shorter sessions`);
  if (improvements.length === 0)     improvements.push('Keep up the fantastic work — no major gaps!');

  // 8. Encouraging message
  const encouragement = user.streak >= 7
    ? `${user.name} is on a 🔥 ${user.streak}-day streak — incredible dedication!`
    : sessionCount > 0
      ? `${user.name} completed ${sessionCount} session${sessionCount>1?'s':''} this week. Every session builds a stronger foundation!`
      : `A new week is a fresh start — great time to build a study routine with ${user.name}!`;

  return {
    childName:         user.name || 'Your child',
    childEmail:        user.email,
    parentEmail:       user.parentEmail,
    reportDate:        now.toLocaleDateString('en-IN',
                         { day:'numeric', month:'long', year:'numeric' }),
    reportPeriod:      'Last 7 days',
    streak:            user.streak || 0,
    bestStreak:        user.bestStreak || 0,
    totalFocusMins,
    sessionCount,
    textsSimplified:   recentTexts.length,
    topSubjects,
    dominantMood,
    moodEmoji:         MOOD_EMOJI[dominantMood] || '😶',
    moodCounts,
    weekActivity,
    activeDaysCount,
    strengths,
    improvements,
    encouragement,
    overwhelmedCount,
    allTimeFocusMins:  user.totalFocusMinutes || 0,
    allTimeTexts:      user.textsSimplified   || 0,
    profiles:          (user.profiles || []).join(', ') || 'None selected',
  };
}

// ─── Helpers ─────────────────────────────────────────────────────
async function fetchSub(db, uid, col, orderField, limit) {
  try {
    let q = db.collection('users').doc(uid).collection(col);
    if (orderField) q = q.orderBy(orderField, 'desc');
    const snap = await q.limit(limit).get();
    return snap.docs.map(d => d.data());
  } catch(e) {
    console.warn(`fetchSub ${col}:`, e.message);
    return [];
  }
}

function toDate(val) {
  if (!val) return new Date(0);
  if (typeof val.toDate === 'function') return val.toDate();
  return new Date(val);
}

module.exports = { generateChildProgressReport };
