// טיימר ספירה לאחור, צפצוף, רטט ומניעת כיבוי מסך

let audioCtx = null;

// חייב להיקרא מתוך לחיצה של המשתמש (דרישה של iOS)
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch { /* אין תמיכה בשמע */ }
}

export function beep({ times = 3, freq = 880, ms = 180, gap = 120 } = {}) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + 0.02;
  for (let i = 0; i < times; i++) {
    const start = t0 + i * (ms + gap) / 1000;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.4, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + ms / 1000 + 0.02);
  }
}

export function vibrate(pattern = [250, 120, 250]) {
  try { navigator.vibrate?.(pattern); } catch { /* אין תמיכה ברטט */ }
}

export function formatTime(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// טיימר שמבוסס על שעת סיום, כדי שיישאר מדויק גם אם הדפדפן מאט את העדכונים
export class Countdown {
  constructor(seconds, { onTick, onDone }) {
    this.total = seconds;
    this.remaining = seconds;
    this.endAt = null;
    this.handle = null;
    this.onTick = onTick;
    this.onDone = onDone;
  }
  get running() { return this.endAt !== null; }
  start() {
    if (this.running || this.remaining <= 0) return;
    this.endAt = performance.now() + this.remaining * 1000;
    this.handle = setInterval(() => this.tick(), 200);
    this.onTick?.(this.remaining);
  }
  pause() {
    if (!this.running) return;
    this.remaining = Math.max(0, (this.endAt - performance.now()) / 1000);
    this.endAt = null;
    clearInterval(this.handle);
    this.onTick?.(this.remaining);
  }
  reset() {
    this.stop();
    this.remaining = this.total;
    this.onTick?.(this.remaining);
  }
  stop() {
    clearInterval(this.handle);
    this.endAt = null;
  }
  tick() {
    this.remaining = Math.max(0, (this.endAt - performance.now()) / 1000);
    this.onTick?.(this.remaining);
    if (this.remaining <= 0) {
      this.stop();
      this.onDone?.();
    }
  }
}

// סטופר פשוט לתרגילים בלי זמן קבוע
export class Stopwatch {
  constructor({ onTick }) {
    this.elapsed = 0;
    this.startedAt = null;
    this.handle = null;
    this.onTick = onTick;
  }
  get running() { return this.startedAt !== null; }
  current() { return this.elapsed + (this.running ? (performance.now() - this.startedAt) / 1000 : 0); }
  start() {
    if (this.running) return;
    this.startedAt = performance.now();
    this.handle = setInterval(() => this.onTick?.(this.current()), 250);
  }
  pause() {
    if (!this.running) return;
    this.elapsed = this.current();
    this.startedAt = null;
    clearInterval(this.handle);
    this.onTick?.(this.elapsed);
  }
  stop() { clearInterval(this.handle); this.startedAt = null; }
}

// המסך לא נכבה בזמן אימון
let wakeLock = null;
let wantWake = false;

export async function keepAwake(on) {
  wantWake = on;
  if (!('wakeLock' in navigator)) return;
  try {
    if (on && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch { /* הדפדפן סירב, ממשיכים בלי */ }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && wantWake) keepAwake(true);
});
