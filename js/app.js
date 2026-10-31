import { VIDEOS, TYPE_TITLES, TEXT, SAFETY, BASELINE_RESULTS, buildWorkout, extendedWarmup, kicksForWeek } from './program.js';
import { iso, parseISO, addDays, daysBetween, weekday, dayPlan, sessionOn, streak, measurementDue, kickStalled } from './schedule.js';
import { load, save, reset, exportFile, parseImport, emptyData } from './storage.js';
import { Countdown, Stopwatch, beep, vibrate, unlockAudio, keepAwake, formatTime } from './timer.js';
import { lineChart } from './charts.js';

// לבדיקות: ?today=2026-11-03 מדמה תאריך אחר
const OVERRIDE = new URLSearchParams(location.search).get('today');
const todayISO = () => (OVERRIDE && /^\d{4}-\d{2}-\d{2}$/.test(OVERRIDE) ? OVERRIDE : iso(new Date()));

const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const app = document.getElementById('app');
const nav = document.getElementById('nav');

let data = load(todayISO());
let run = null; // האימון או החימום שרץ עכשיו
let ticker = null; // טיימר או סטופר של הסבב הנוכחי
let histMonth = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const longDate = (d) => parseISO(d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
const shortDate = (d) => { const x = parseISO(d); return `${x.getDate()}/${x.getMonth() + 1}/${String(x.getFullYear()).slice(2)}`; };
// טווחים כמו "8–10" או "50–70%" מתהפכים בטקסט מימין לשמאל. עוטפים אותם בכיוון שמאל לימין.
const ltr = (html) => html.replace(/(\d+)–(\d+%?)/g, '⁦$1–$2⁩');
const daysText = (n) => (n === 1 ? 'יום אחד' : `${n} ימים`);
const typeLabel = (t) => (t === 'SAT' ? 'שבת' : t);
const typeName = (t) => (t === 'SAT' ? 'מנוחה פעילה' : `אימון ${t}`);

function persist() {
  if (!save(data)) toast('השמירה במכשיר נכשלה');
}

function applyTheme() {
  const t = data.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function stopTicker() {
  ticker?.stop();
  ticker = null;
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

// ---------- ניווט ----------

const ROUTES = {
  home: renderHome,
  history: renderHistory,
  progress: renderProgress,
  safety: renderSafety,
  settings: renderSettings,
  workout: renderWorkout,
  'baseline-warmup': () => renderWarmupRun('baseline'),
  'baseline-form': renderBaselineForm,
  'measure-warmup': () => renderWarmupRun('measure'),
  'measure-form': renderMeasureForm,
  done: renderDone,
};
const FULLSCREEN = new Set(['workout', 'baseline-warmup', 'measure-warmup']);

function render() {
  const route = location.hash.slice(1) || 'home';
  stopTicker();
  const fn = ROUTES[route] || renderHome;
  nav.hidden = FULLSCREEN.has(route);
  nav.querySelectorAll('a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#${route}`));
  if (!FULLSCREEN.has(route)) keepAwake(false);
  app.innerHTML = ltr(fn());
  window.scrollTo(0, 0);
  if (FULLSCREEN.has(route) && run?.started) mountRound();
}

window.addEventListener('hashchange', render);

// ---------- מסך הבית ----------

function renderHome() {
  const today = todayISO();
  const plan = dayPlan(data, today, { bag: data.settings.bag });
  const done = sessionOn(data, today);
  const tomorrow = dayPlan(data, addDays(today, 1));
  const parts = [];

  parts.push(`<header class="page-head"><h1>היי קיק</h1><p class="muted">${longDate(today)}</p></header>`);

  if (data.baseline?.result === 'pinch') {
    parts.push(`<div class="alert danger"><b>${TEXT.physio}</b><span>במבחן הפתיחה הייתה צביטה בקדמת הירך. התוכנית לא נעולה, אבל כדאי להיבדק קודם.</span></div>`);
  }
  if (kickStalled(data)) {
    parts.push(`<div class="alert warn"><b>${TEXT.stall}</b></div>`);
  }
  if (!data.baseline) {
    parts.push(`<section class="card baseline-cta">
      <h2>מבחן פתיחה</h2>
      <p>פעם אחת, לפני שמתחילים: חימום מורחב של 8–10 דקות, מדידת ספליט צידי ומבחן בעיטה ליד המשקוף.</p>
      <button class="btn primary big" data-act="start-baseline">התחל מבחן פתיחה</button>
    </section>`);
  }
  if (measurementDue(data, today)) {
    parts.push(`<section class="card reminder">
      <h2>היום שבת מדידה</h2>
      <p>עברו שבועיים מהמדידה האחרונה. מדידה עם אותו חימום מורחב.</p>
      <button class="btn big" data-act="start-measure">התחל מדידה</button>
    </section>`);
  }

  const notStarted = daysBetween(data.startDate, today) < 0;
  const weekLine = `שבוע אימון ${plan.tw} (שבוע קלנדרי ${plan.cw})`;
  const weekNotes = [];
  if (notStarted) weekNotes.push(`התוכנית מתחילה ב־${shortDate(data.startDate)}.`);
  if (plan.skipped > 0) {
    const held = kicksForWeek(plan.cw) > plan.normalKicks ? ', ולכן הכמות לא עלתה' : '';
    weekNotes.push(`${plan.skipped === 1 ? 'שבוע אחד עם כאב לא נספר' : `${plan.skipped} שבועות עם כאב לא נספרו`} להתקדמות${held}.`);
  }
  if (plan.painThisWeek) weekNotes.push('השבוע היה כאב, לכן הוא לא ייספר להתקדמות.');

  const kicksLine = plan.type === 'SAT'
    ? 'מתיחות קלות, בלי בעיטות'
    : `${plan.kicks} בעיטות לכל רגל`;

  parts.push(`<section class="card today type-${plan.type}">
    <div class="today-top">
      <span class="badge-type">${typeLabel(plan.type)}</span>
      <div>
        <h2>${plan.type === 'SAT' ? 'מנוחה פעילה' : `אימון ${plan.type} · ${TYPE_TITLES[plan.type]}`}</h2>
        <p class="week">${weekLine}</p>
      </div>
    </div>
    <p class="kicks-line">${kicksLine}${plan.type !== 'SAT' ? ` <span class="muted">· ${esc(kicksNote(plan))}</span>` : ''}</p>
    ${weekNotes.map((n) => `<p class="small note-line">${n}</p>`).join('')}
    ${plan.type !== 'SAT' && !done ? bagToggle() : ''}
    ${done
      ? `<div class="done-box">✓ סיימת היום ${typeName(done.type)}${done.type !== 'SAT' ? (done.bag ? ' · עם שק' : ' · בלי שק') : ''}</div>
         <p class="small muted">מחר: <bdi>${typeName(tomorrow.type)}</bdi>${tomorrow.type !== 'SAT' ? ` · ${tomorrow.kicks} בעיטות לכל רגל` : ''}</p>
         ${redoButton(done.type)}`
      : `<button class="btn primary huge" data-act="start-workout">התחל אימון היום</button>`}
  </section>`);

  parts.push(`<a class="card link-card" href="${VIDEOS.technique.url}" target="_blank" rel="noopener">
    <span class="play">▶</span><span><b>טכניקת הבעיטה</b><br><span class="small muted">צפה בהדגמה</span></span>
  </a>`);

  parts.push(`<section class="goal small">
    <b>יעד:</b> ${TEXT.goal}
    <span class="muted"> · רצף: ${daysText(streak(data, today))}</span>
  </section>`);
  return parts.join('');
}

function kicksNote(plan) {
  if (plan.fastRound) return 'היום סבב מהיר';
  if (plan.fastDay && !plan.bag) return 'בלי שק: עד 70%, בלי סבב מהיר';
  if (!plan.bag && plan.tw >= 5) return 'בלי שק: עד 70%';
  if (plan.tw >= 9) return 'היום בלי סבב מהיר';
  const notes = { 1: 'חצי מהירות, גובה בטן', 3: 'חצי מהירות', 5: '70–80%, רק אחרי חימום מלא' };
  return plan.tw <= 2 ? notes[1] : plan.tw <= 4 ? notes[3] : notes[5];
}

function bagToggle() {
  const on = data.settings.bag;
  return `<div class="segmented" role="group" aria-label="שק">
    <button class="${on ? 'on' : ''}" data-act="bag" data-val="1">יש לי שק היום</button>
    <button class="${!on ? 'on' : ''}" data-act="bag" data-val="0">אין לי שק היום</button>
  </div>`;
}

// ---------- אימון מודרך ----------

function newRun(kind, sections, extra = {}) {
  const flat = [];
  sections.forEach((section, si) => section.exercises.forEach((ex) => flat.push({ si, section, ex })));
  run = {
    kind, sections, flat, idx: 0, started: true,
    state: flat.map(() => ({ round: 0, count: 0, remaining: null, done: false, banner: null })),
    ...extra,
  };
}

function renderWorkout() {
  const today = todayISO();
  if (run?.kind === 'workout' && run.started) return playerHTML();
  const type = dayPlan(data, today).type;
  if (type === 'SAT') {
    return `<div class="pre">
      <button class="icon-btn exit" data-act="exit" aria-label="יציאה">✕</button>
      <h1>שבת: מנוחה פעילה</h1>
      <p>מתיחות קלות, בלי בעיטות.</p>
      <button class="btn primary huge" data-act="begin" data-pain="0">התחל</button>
    </div>`;
  }
  if (run?.kind === 'workout' && run.painNotice) {
    const p = run.plan;
    return `<div class="pre">
      <button class="icon-btn exit" data-act="exit" aria-label="יציאה">✕</button>
      <h1>היום לא מעלים</h1>
      <div class="alert warn"><b>${p.kicks < p.normalKicks ? `היום ${p.kicks} בעיטות לכל רגל, הכמות של השבוע הקודם, במקום ${p.normalKicks}.` : `הכמות נשארת ${p.kicks} בעיטות לכל רגל.`}</b>
      <span>כל הבעיטות במהירות של 50% לכל היותר, בלי סבב מהיר.</span>
      <span>השבוע הזה לא ייספר להתקדמות, והשלב הבא נדחה בשבוע.</span></div>
      <p class="small">${SAFETY[0]}</p>
      <button class="btn primary huge" data-act="pain-continue">המשך לאימון</button>
    </div>`;
  }
  return `<div class="pre">
    <button class="icon-btn exit" data-act="exit" aria-label="יציאה">✕</button>
    <h1>${typeName(type)}</h1>
    ${bagToggle()}
    <h2 class="q">${TEXT.painQuestion}</h2>
    <div class="answer-row">
      <button class="btn huge" data-act="begin" data-pain="1">כן</button>
      <button class="btn primary huge" data-act="begin" data-pain="0">לא</button>
    </div>
  </div>`;
}

function beginWorkout(pain) {
  const plan = dayPlan(data, todayISO(), { bag: data.settings.bag, pain });
  newRun('workout', buildWorkout(plan), { plan });
  if (pain) { run.started = false; run.painNotice = true; }
  keepAwake(true);
  render();
}

function renderWarmupRun(kind) {
  if (!run || run.kind !== kind) {
    newRun(kind, extendedWarmup());
    keepAwake(true);
  }
  return playerHTML();
}

function playerHTML() {
  const { flat, idx, sections } = run;
  const { si, section, ex } = flat[idx];
  const last = idx === flat.length - 1;
  const pct = Math.round(((idx + (run.state[idx].done ? 1 : 0)) / flat.length) * 100);
  const nextLabel = last ? (run.kind === 'workout' ? 'סיימתי' : 'המשך למדידות') : 'הבא';
  const sectionLabel = sections.length > 1
    ? `חלק ${si + 1} מתוך ${sections.length} · ${section.title}${section.minutes ? ` · ${section.minutes} דק'` : ''}`
    : `${section.title}${section.minutes ? ` · ${section.minutes} דק'` : ''}`;
  return `<div class="player">
    <header class="player-top">
      <button class="icon-btn" data-act="exit" aria-label="יציאה">✕</button>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><div style="width:${pct}%"></div></div>
      <span class="small muted">${idx + 1}/${flat.length}</span>
    </header>
    <p class="section-chip">${sectionLabel}</p>
    ${section.note && idx === flat.findIndex((f) => f.si === si) ? `<p class="small muted">${section.note}</p>` : ''}
    <article class="ex-card">
      <h2>${esc(ex.name)}</h2>
      ${ex.presc ? `<p class="presc">${esc(ex.presc)}</p>` : ''}
      ${ex.desc ? `<p class="desc">${esc(ex.desc)}</p>` : ''}
      ${(ex.notes || []).map((n) => `<p class="note ${n.tone}">${esc(n.text)}</p>`).join('')}
      ${videoButtons(ex.videos)}
      <div class="round-box" id="round-box"></div>
    </article>
    <footer class="player-nav">
      <button class="btn big" data-act="prev" ${idx === 0 ? 'disabled' : ''}>הקודם</button>
      <button class="btn primary big" data-act="next">${nextLabel}</button>
    </footer>
  </div>`;
}

function videoButtons(keys = []) {
  if (!keys.length) return '';
  return `<div class="videos">${keys.map((k, i) => {
    const v = VIDEOS[k];
    const label = i === 0 ? 'צפה בהדגמה' : (v.label || 'הדגמה נוספת');
    return `<a class="btn video" href="${v.url}" target="_blank" rel="noopener">▶ ${label}${v.note ? ` <span class="small">(${v.note})</span>` : ''}</a>`;
  }).join('')}</div>`;
}

// מצייר את אזור הסבב: טיימר, מונה חזרות או סטופר
function mountRound() {
  const box = document.getElementById('round-box');
  if (!box) return;
  stopTicker();
  const { ex } = run.flat[run.idx];
  const st = run.state[run.idx];
  const rounds = ex.rounds;
  const banner = st.banner ? `<div class="banner ${st.banner.big ? 'big' : ''}">${st.banner.text}</div>` : '';
  const dots = rounds.length > 1
    ? `<div class="dots">${rounds.map((_, i) => `<i class="${i < st.round ? 'done' : i === st.round ? 'cur' : ''}"></i>`).join('')}</div>`
    : '';

  if (st.done) {
    box.innerHTML = ltr(`${banner || '<div class="banner">התרגיל הושלם ✓</div>'}${dots}
      <button class="btn small-btn" data-act="redo">עשה שוב</button>`);
    return;
  }
  const r = rounds[st.round];
  const label = r.label ? `<p class="round-label">${r.label}</p>` : '';

  if (r.kind === 'secs') {
    const remaining = st.remaining ?? r.target;
    box.innerHTML = ltr(`${banner}${label}${dots}
      <div class="clock" id="clock">${formatTime(remaining)}</div>
      <div class="timer-row">
        <button class="btn primary huge" data-act="timer-toggle" id="timer-btn">התחל</button>
      </div>
      <div class="timer-row sub">
        <button class="btn" data-act="timer-reset">איפוס</button>
        <button class="btn" data-act="round-skip">סיימתי את הסבב</button>
      </div>`);
    ticker = new Countdown(remaining, {
      onTick: (s) => {
        st.remaining = s;
        const c = document.getElementById('clock');
        if (c) { c.textContent = formatTime(s); c.classList.toggle('ending', s <= 3.05 && s > 0); }
        const b = document.getElementById('timer-btn');
        if (b) b.textContent = ticker?.running ? 'השהה' : (s < r.target ? 'המשך' : 'התחל');
      },
      onDone: () => completeRound(true),
    });
    ticker.total = r.target;
  } else if (r.kind === 'reps') {
    box.innerHTML = ltr(`${banner}${label}${dots}
      <button class="counter" data-act="rep" aria-label="ספירת חזרה">
        <span class="count">${st.count}</span><span class="of">מתוך ${r.target}</span>
        <span class="tap small">לחץ על כל חזרה</span>
      </button>
      <div class="timer-row sub">
        <button class="btn" data-act="rep-minus" ${st.count === 0 ? 'disabled' : ''}>−1</button>
        <button class="btn" data-act="round-skip">סיימתי את הסבב</button>
      </div>`);
  } else {
    box.innerHTML = ltr(`${banner}
      <p class="small muted">בקצב שלך. סטופר לבחירתך:</p>
      <div class="clock" id="clock">${formatTime(st.elapsed || 0)}</div>
      <div class="timer-row"><button class="btn big" data-act="sw-toggle" id="sw-btn">הפעל סטופר</button></div>`);
    ticker = new Stopwatch({
      onTick: (s) => {
        st.elapsed = s;
        const c = document.getElementById('clock');
        if (c) c.textContent = formatTime(Math.floor(s));
      },
    });
    ticker.elapsed = st.elapsed || 0;
  }
}

function completeRound(fromTimer) {
  const { ex } = run.flat[run.idx];
  const st = run.state[run.idx];
  const prev = ex.rounds[st.round];
  stopTicker();
  st.round++;
  st.count = 0;
  st.remaining = null;
  if (st.round >= ex.rounds.length) {
    st.done = true;
    st.banner = { text: 'התרגיל הושלם ✓' };
    beep({ times: fromTimer ? 3 : 2, freq: 990 });
    vibrate([300, 120, 300]);
    // עדכון פס ההתקדמות
    const bar = document.querySelector('.bar > div');
    if (bar) bar.style.width = `${Math.round(((run.idx + 1) / run.flat.length) * 100)}%`;
  } else {
    const next = ex.rounds[st.round];
    const switchSide = prev.side && next.side && prev.side !== next.side;
    st.banner = switchSide
      ? { text: `החלף צד ← ${next.label}`, big: true }
      : { text: next.label ? `הבא: ${next.label}` : 'סבב הבא' };
    beep({ times: fromTimer ? 3 : 2 });
    vibrate(switchSide ? [400, 150, 400] : [250]);
  }
  mountRound();
}

function finishWorkout() {
  const p = run.plan;
  const session = {
    date: p.date, type: p.type, bag: p.type === 'SAT' ? false : p.bag, pain: p.pain,
    kicks: p.type === 'SAT' ? 0 : p.kicks, cw: p.cw, tw: p.tw, at: Date.now(),
  };
  data.sessions = data.sessions.filter((s) => s.date !== p.date);
  data.sessions.push(session);
  persist();
  run = null;
  keepAwake(false);
  beep({ times: 2, freq: 660 });
  go('#done');
}

function renderDone() {
  const s = sessionOn(data, todayISO());
  if (!s) return renderHome();
  return `<div class="pre done-screen">
    <div class="big-check">✓</div>
    <h1>כל הכבוד!</h1>
    <p>${typeName(s.type)} ${s.type === 'SAT' ? 'נשמרה' : 'נשמר'}${s.type !== 'SAT' ? ` · ${s.kicks} בעיטות לכל רגל · ${s.bag ? 'עם שק' : 'בלי שק'}` : ''}.</p>
    <p class="muted">רצף: ${daysText(streak(data, todayISO()))}</p>
    <a class="btn primary huge" href="#home">חזרה לבית</a>
    ${redoButton(s.type)}
  </div>`;
}

// ביצוע חוזר של האימון של היום. בסיום הוא מחליף את הרישום של היום, ולא נספר כאימון נוסף.
function redoButton(type) {
  return `<button class="btn big wide" data-act="start-workout">בצע שוב את ה${type === 'SAT' ? 'מנוחה הפעילה' : `אימון (${type})`}</button>
    <p class="small muted center">הביצוע החוזר יחליף את הרישום של היום.</p>`;
}

// ---------- מבחן פתיחה ומדידה ----------

function renderBaselineForm() {
  const b = data.baseline;
  return `<header class="page-head"><h1>מבחן פתיחה</h1></header>
  <form class="card form" id="baseline-form">
    <h2>1. מדידת ספליט צידי</h2>
    <p>ידיים על הרצפה, ברכיים ישרות. רושמים את המרחק בין העקבים בס"מ.</p>
    <label class="field"><span>מרחק בין העקבים (ס"מ)</span>
      <input type="number" inputmode="decimal" name="splitCm" min="0" max="300" step="0.5" required value="${b?.splitCm ?? ''}"></label>
    <h2>2. מבחן בעיטה ליד המשקוף</h2>
    <p>פיבוט מלא, הטיה לאחור, בעיטה של 70%. מצלמים 3 בעיטות לכל רגל, ואז בוחרים תוצאה:</p>
    ${videoButtons(['technique'])}
    <div class="choices">
      ${Object.entries(BASELINE_RESULTS).map(([k, v]) => `<label class="choice">
        <input type="radio" name="result" value="${k}" required ${b?.result === k ? 'checked' : ''}>
        <span><b>${v.label}</b><br><span class="small muted">${v.effect}</span></span></label>`).join('')}
    </div>
    <button class="btn primary huge" type="submit">שמור</button>
  </form>`;
}

function renderMeasureForm() {
  const num = (name, label) => `<label class="field"><span>${label}</span>
    <input type="number" inputmode="decimal" name="${name}" min="0" max="300" step="0.5"></label>`;
  return `<header class="page-head"><h1>מדידה דו־שבועית</h1><p class="muted">${longDate(todayISO())}</p></header>
  <form class="card form" id="measure-form">
    ${num('splitCm', 'מרחק בין העקבים בספליט צידי (ס"מ)')}
    <h2>גובה הרמת רגל לצד בעמידה</h2>
    <div class="two">${num('sideR', 'ימין (ס"מ)')}${num('sideL', 'שמאל (ס"מ)')}</div>
    <h2>גובה הבעיטה הנקייה</h2>
    <div class="two">${num('kickR', 'ימין (ס"מ)')}${num('kickL', 'שמאל (ס"מ)')}</div>
    <label class="field"><span>הערות</span><textarea name="notes" rows="3"></textarea></label>
    <button class="btn primary huge" type="submit">שמור מדידה</button>
  </form>`;
}

app.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  const n = (k) => { const v = f.get(k); return v === '' || v == null ? null : Number(v); };
  if (e.target.id === 'baseline-form') {
    const first = !data.baseline;
    data.baseline = { date: todayISO(), splitCm: n('splitCm'), result: f.get('result') };
    if (first && data.sessions.length === 0) data.startDate = todayISO();
    persist();
    run = null;
    const r = data.baseline.result;
    toast(r === 'pinch' ? TEXT.physio : 'מבחן הפתיחה נשמר');
    go('#home');
  } else if (e.target.id === 'measure-form') {
    const m = {
      id: Date.now(), date: todayISO(), splitCm: n('splitCm'), sideR: n('sideR'), sideL: n('sideL'),
      kickR: n('kickR'), kickL: n('kickL'), notes: String(f.get('notes') || '').trim(),
    };
    if ([m.splitCm, m.sideR, m.sideL, m.kickR, m.kickL].every((v) => v == null) && !m.notes) {
      toast('לא הוזנו נתונים');
      return;
    }
    data.measurements.push(m);
    persist();
    run = null;
    toast('המדידה נשמרה');
    go('#progress');
  }
});

// ---------- היסטוריה ----------

function renderHistory() {
  const today = todayISO();
  if (!histMonth) { const t = parseISO(today); histMonth = { y: t.getFullYear(), m: t.getMonth() }; }
  const { y, m } = histMonth;
  const byDate = new Map(data.sessions.map((s) => [s.date, s]));
  const first = new Date(y, m, 1);
  const daysIn = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push('<span></span>');
  for (let d = 1; d <= daysIn; d++) {
    const dISO = iso(new Date(y, m, d));
    const s = byDate.get(dISO);
    const cls = [s ? `trained t-${s.type}` : '', dISO === today ? 'today' : ''].join(' ');
    cells.push(`<span class="${cls}" title="${s ? typeName(s.type) : ''}">${d}${s ? `<small>${typeLabel(s.type)}</small>` : ''}</span>`);
  }
  // שבוע: ראשון עד שבת שמכיל את היום
  const weekStart = addDays(today, -weekday(today));
  const weekEnd = addDays(weekStart, 6);
  const thisWeek = data.sessions.filter((s) => s.date >= weekStart && s.date <= weekEnd).length;
  const monthPrefix = today.slice(0, 7);
  const thisMonth = data.sessions.filter((s) => s.date.startsWith(monthPrefix)).length;
  const recent = [...data.sessions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12);
  const monthName = first.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  return `<header class="page-head"><h1>היסטוריה</h1></header>
  <div class="stats">
    <div><b>${streak(data, today)}</b><span>רצף ימים</span></div>
    <div><b>${thisWeek}</b><span>השבוע</span></div>
    <div><b>${thisMonth}</b><span>החודש</span></div>
    <div><b>${data.sessions.length}</b><span>סה"כ</span></div>
  </div>
  <section class="card">
    <div class="cal-head">
      <button class="icon-btn" data-act="month" data-d="-1" aria-label="חודש קודם">›</button>
      <b>${monthName}</b>
      <button class="icon-btn" data-act="month" data-d="1" aria-label="חודש הבא">‹</button>
    </div>
    <div class="cal">${DAY_NAMES.map((n) => `<span class="dow">${n[0]}׳</span>`).join('')}${cells.join('')}</div>
  </section>
  <section class="card">
    <h2>אימונים אחרונים</h2>
    ${recent.length ? `<ul class="list">${recent.map((s) => `<li>
      <span class="pill t-${s.type}">${typeLabel(s.type)}</span>
      <span>${shortDate(s.date)} · ${DAY_NAMES[weekday(s.date)]}</span>
      <span class="small muted">${s.type === 'SAT' ? 'מנוחה פעילה' : `${s.kicks} בעיטות · ${s.bag ? 'שק' : 'בלי שק'}${s.pain ? ' · כאב' : ''}`}</span>
    </li>`).join('')}</ul>` : '<p class="muted">עוד אין אימונים.</p>'}
  </section>`;
}

// ---------- התקדמות ----------

function renderProgress() {
  const ms = [...data.measurements].sort((a, b) => (a.date < b.date ? -1 : 1));
  const pts = (k) => ms.filter((m) => m[k] != null).map((m) => ({ date: m.date, y: m[k] }));
  const splitPts = pts('splitCm');
  if (data.baseline?.splitCm != null) splitPts.unshift({ date: data.baseline.date, y: data.baseline.splitCm });

  return `<header class="page-head"><h1>התקדמות</h1></header>
  ${kickStalled(data) ? `<div class="alert warn"><b>${TEXT.stall}</b></div>` : ''}
  <button class="btn primary big wide" data-act="start-measure">מדידה חדשה</button>
  <p class="small muted center">מדידה כל שבועיים, עם אותו חימום מורחב. תזכורת מופיעה בשבת.</p>
  <section class="card"><h2>גובה הבעיטה הנקייה</h2>
    ${lineChart({ series: [{ name: 'ימין', cls: 's-r', points: pts('kickR') }, { name: 'שמאל', cls: 's-l', points: pts('kickL') }] })}</section>
  <section class="card"><h2>הרמת רגל לצד בעמידה</h2>
    ${lineChart({ series: [{ name: 'ימין', cls: 's-r', points: pts('sideR') }, { name: 'שמאל', cls: 's-l', points: pts('sideL') }] })}</section>
  <section class="card"><h2>ספליט צידי: מרחק בין העקבים</h2>
    ${lineChart({ series: [{ name: 'ספליט', cls: 's-split', points: splitPts }] })}</section>
  <section class="card"><h2>כל המדידות</h2>
    ${ms.length ? `<ul class="list measures">${[...ms].reverse().map((m) => `<li>
      <div><b>${shortDate(m.date)}</b>
      <span class="small">ספליט ${m.splitCm ?? '–'} · צד ${m.sideR ?? '–'}/${m.sideL ?? '–'} · בעיטה ${m.kickR ?? '–'}/${m.kickL ?? '–'}</span>
      ${m.notes ? `<span class="small muted">${esc(m.notes)}</span>` : ''}</div>
      <button class="icon-btn" data-act="del-measure" data-id="${m.id}" aria-label="מחק מדידה">🗑</button>
    </li>`).join('')}</ul><p class="small muted">ימין/שמאל, בס"מ.</p>` : '<p class="muted">עוד אין מדידות.</p>'}
  </section>`;
}

// ---------- בטיחות והגדרות ----------

function renderSafety() {
  return `<header class="page-head"><h1>בטיחות</h1></header>
  <section class="card"><ol class="rules">${SAFETY.map((r) => `<li>${r}</li>`).join('')}</ol></section>`;
}

function renderSettings() {
  const b = data.baseline;
  const theme = data.settings.theme;
  return `<header class="page-head"><h1>הגדרות</h1></header>
  <section class="card form">
    <label class="field"><span>תאריך התחלה</span>
      <input type="date" id="start-date" value="${data.startDate}"></label>
    <p class="small muted">ממנו מחושבים השבועות והדרגת הבעיטות.</p>
  </section>
  <section class="card form">
    <h2>תוצאת מבחן הפתיחה</h2>
    ${b ? `<p class="small muted">נעשה ב־${shortDate(b.date)}${b.splitCm != null ? ` · ספליט ${b.splitCm} ס"מ` : ''}</p>` : '<p class="small muted">עוד לא נעשה.</p>'}
    <label class="field"><span>תוצאה</span>
      <select id="baseline-result" ${b ? '' : 'disabled'}>
        ${Object.entries(BASELINE_RESULTS).map(([k, v]) => `<option value="${k}" ${b?.result === k ? 'selected' : ''}>${v.label}</option>`).join('')}
      </select></label>
    <button class="btn" data-act="start-baseline">${b ? 'עשה מבחן פתיחה מחדש' : 'התחל מבחן פתיחה'}</button>
  </section>
  <section class="card form">
    <h2>מראה</h2>
    <div class="segmented three">
      ${[['auto', 'אוטומטי'], ['light', 'בהיר'], ['dark', 'כהה']].map(([k, l]) => `<button class="${theme === k ? 'on' : ''}" data-act="theme" data-val="${k}">${l}</button>`).join('')}
    </div>
  </section>
  <section class="card form">
    <h2>גיבוי</h2>
    <button class="btn" data-act="export">ייצוא כל הנתונים (JSON)</button>
    <label class="btn file-btn">ייבוא מקובץ<input type="file" accept="application/json,.json" id="import-file" hidden></label>
  </section>
  <section class="card form">
    <h2>איפוס</h2>
    <p class="small muted">מוחק את כל האימונים, המדידות ומבחן הפתיחה מהמכשיר.</p>
    <button class="btn danger" data-act="reset">איפוס כל הנתונים</button>
  </section>`;
}

app.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'start-date' && t.value) {
    data.startDate = t.value;
    persist();
    toast('תאריך ההתחלה עודכן');
  } else if (t.id === 'baseline-result' && data.baseline) {
    data.baseline.result = t.value;
    persist();
    toast(t.value === 'pinch' ? TEXT.physio : 'התוצאה עודכנה');
  } else if (t.id === 'import-file' && t.files[0]) {
    try {
      const imported = parseImport(await t.files[0].text(), todayISO());
      if (!confirm('הייבוא יחליף את כל הנתונים שבמכשיר. להמשיך?')) return;
      data = imported;
      persist();
      applyTheme();
      toast('הנתונים יובאו');
      render();
    } catch (err) {
      toast(err.message || 'הקובץ לא תקין');
    }
    t.value = '';
  }
});

// ---------- לחיצות ----------

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const st = run?.state?.[run.idx];
  switch (act) {
    case 'bag':
      data.settings.bag = el.dataset.val === '1';
      persist();
      render();
      break;
    case 'start-workout':
      unlockAudio();
      run = null;
      go('#workout');
      break;
    case 'begin':
      unlockAudio();
      beginWorkout(el.dataset.pain === '1');
      break;
    case 'pain-continue':
      run.painNotice = false;
      run.started = true;
      render();
      break;
    case 'start-baseline':
      unlockAudio();
      run = null;
      go('#baseline-warmup');
      break;
    case 'start-measure':
      unlockAudio();
      run = null;
      go('#measure-warmup');
      break;
    case 'exit':
      if (!run?.started || confirm('לצאת? ההתקדמות באימון הזה לא תישמר.')) {
        run = null;
        keepAwake(false);
        go('#home');
      }
      break;
    case 'prev':
      if (run.idx > 0) { run.idx--; render(); }
      break;
    case 'next':
      if (run.idx < run.flat.length - 1) {
        run.idx++;
        render();
      } else if (run.kind === 'workout') {
        finishWorkout();
      } else {
        keepAwake(false);
        go(run.kind === 'baseline' ? '#baseline-form' : '#measure-form');
      }
      break;
    case 'timer-toggle':
      unlockAudio();
      if (ticker?.running) ticker.pause();
      else { st.banner = null; document.querySelector('#round-box .banner')?.remove(); ticker?.start(); }
      break;
    case 'timer-reset':
      ticker?.reset();
      break;
    case 'round-skip':
      completeRound(false);
      break;
    case 'rep': {
      unlockAudio();
      const r = run.flat[run.idx].ex.rounds[st.round];
      st.count++;
      st.banner = null;
      vibrate(25);
      if (st.count >= r.target) completeRound(false);
      else mountRound();
      break;
    }
    case 'rep-minus':
      if (st.count > 0) { st.count--; mountRound(); }
      break;
    case 'redo':
      Object.assign(st, { round: 0, count: 0, remaining: null, done: false, banner: null, elapsed: 0 });
      mountRound();
      break;
    case 'sw-toggle':
      if (ticker.running) { ticker.pause(); el.textContent = 'המשך סטופר'; }
      else { ticker.start(); el.textContent = 'עצור סטופר'; }
      break;
    case 'month': {
      const d = new Date(histMonth.y, histMonth.m + Number(el.dataset.d), 1);
      histMonth = { y: d.getFullYear(), m: d.getMonth() };
      render();
      break;
    }
    case 'del-measure':
      if (confirm('למחוק את המדידה?')) {
        data.measurements = data.measurements.filter((m) => String(m.id) !== el.dataset.id);
        persist();
        render();
      }
      break;
    case 'theme':
      data.settings.theme = el.dataset.val;
      persist();
      applyTheme();
      render();
      break;
    case 'export':
      exportFile(data, todayISO());
      break;
    case 'reset':
      if (confirm('למחוק את כל הנתונים מהמכשיר?') && confirm('בטוח? אי אפשר לבטל את זה. כדאי לייצא גיבוי קודם.')) {
        reset();
        data = emptyData(todayISO());
        run = null;
        applyTheme();
        toast('הנתונים אופסו');
        go('#home');
      }
      break;
  }
});

// ---------- הפעלה ----------

applyTheme();
render();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// לבדיקות מהקונסול
window.__hk = { get data() { return data; }, dayPlan: (d, o) => dayPlan(data, d, o) };
