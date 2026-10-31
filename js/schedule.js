// לוגיקת הלו"ז: איזה אימון היום, איזה שבוע, כמה בעיטות.
import { kicksForWeek } from './program.js';

export function iso(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// הפרש בימים (b פחות a), בלי השפעה של שעון קיץ
export function daysBetween(aISO, bISO) {
  const [ay, am, ad] = aISO.split('-').map(Number);
  const [by, bm, bd] = bISO.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 864e5);
}

export function addDays(dateISO, n) {
  const d = parseISO(dateISO);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function weekday(dateISO) {
  return parseISO(dateISO).getDay(); // 0 ראשון ... 6 שבת
}

// שבוע קלנדרי: בלוקים של 7 ימים מתאריך ההתחלה. שבוע 1 מתחיל בתאריך ההתחלה.
export function calWeek(startISO, dateISO) {
  const n = daysBetween(startISO, dateISO);
  return n < 0 ? 0 : Math.floor(n / 7) + 1;
}

// שבועות קלנדריים שבהם עניתי "כן" על שאלת הכאב לפחות פעם אחת
export function painWeeks(data) {
  const set = new Set();
  for (const s of data.sessions) {
    if (s.pain) set.add(calWeek(data.startDate, s.date));
  }
  return set;
}

// שבוע אימון = שבועות מההתחלה, פחות שבועות קודמים שהיה בהם כאב
export function trainingWeek(data, dateISO) {
  const cw = Math.max(1, calWeek(data.startDate, dateISO));
  let skipped = 0;
  for (const w of painWeeks(data)) if (w < cw) skipped++;
  return { cw, tw: Math.max(1, cw - skipped), skipped };
}

export function sessionOn(data, dateISO) {
  return data.sessions.find((s) => s.date === dateISO) || null;
}

// האימון הבא: האות שאחרי האימון האחרון שסיימתי. שבת תמיד מנוחה פעילה.
export function typeFor(data, dateISO) {
  if (weekday(dateISO) === 6) return 'SAT';
  const done = sessionOn(data, dateISO);
  if (done && done.type !== 'SAT') return done.type;
  const last = data.sessions
    .filter((s) => s.type !== 'SAT' && s.date < dateISO)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.at - b.at))
    .pop();
  if (!last) return 'A';
  return last.type === 'A' ? 'B' : 'A';
}

// התוכנית המלאה ליום מסוים
export function dayPlan(data, dateISO, { bag = false, pain = false } = {}) {
  const type = typeFor(data, dateISO);
  const { cw, tw, skipped } = trainingWeek(data, dateISO);
  const wd = weekday(dateISO);
  const fastDay = tw >= 9 && (wd === 2 || wd === 5);
  const kicks = pain ? kicksForWeek(tw - 1) : kicksForWeek(tw);
  const painThisWeek = painWeeks(data).has(cw);
  return {
    date: dateISO,
    type,
    cw,
    tw,
    skipped,
    painThisWeek,
    kicks,
    normalKicks: kicksForWeek(tw),
    bag,
    pain,
    fastDay,
    fastRound: fastDay && bag && !pain,
    pressRelease: wd === 2 || wd === 5,
    ribs: data.baseline?.result === 'ribs',
    firstThreeMonths: daysBetween(data.startDate, dateISO) < 91,
  };
}

// רצף ימים: ימים רצופים עם אימון, עד היום (או עד אתמול אם היום עוד לא התאמנתי)
export function streak(data, todayISO) {
  const days = new Set(data.sessions.map((s) => s.date));
  let d = days.has(todayISO) ? todayISO : addDays(todayISO, -1);
  let n = 0;
  while (days.has(d)) { n++; d = addDays(d, -1); }
  return n;
}

// תזכורת מדידה: בשבת, אם עברו לפחות 12 ימים מהמדידה האחרונה (או ממבחן הפתיחה)
export function measurementDue(data, todayISO) {
  if (weekday(todayISO) !== 6 || !data.baseline) return false;
  const dates = data.measurements.map((m) => m.date);
  dates.push(data.baseline.date);
  const last = dates.sort().pop();
  return daysBetween(last, todayISO) >= 12;
}

// התראה: גובה הבעיטה הנקייה לא השתפר ב־4 המדידות האחרונות (8 שבועות)
export function kickStalled(data) {
  const ms = [...data.measurements].sort((a, b) => (a.date < b.date ? -1 : 1));
  if (ms.length < 4) return false;
  const last4 = ms.slice(-4);
  const improved = (k) => {
    const base = last4[0][k];
    if (base == null) return true;
    return last4.slice(1).some((m) => m[k] != null && m[k] > base);
  };
  return !improved('kickR') && !improved('kickL');
}
