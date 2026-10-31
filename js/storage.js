// כל הנתונים נשמרים במכשיר בלבד (localStorage)
const KEY = 'highkick.v1';

export function emptyData(todayISO) {
  return {
    version: 1,
    startDate: todayISO,
    baseline: null, // { date, splitCm, result: 'jaw' | 'ribs' | 'pinch' }
    sessions: [], // { date, type, bag, pain, kicks, cw, tw, at }
    measurements: [], // { id, date, splitCm, sideR, sideL, kickR, kickL, notes }
    settings: { bag: false, theme: 'auto' },
  };
}

export function load(todayISO) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyData(todayISO);
    return normalize(JSON.parse(raw), todayISO);
  } catch {
    return emptyData(todayISO);
  }
}

export function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch { /* אין גישה לאחסון */ }
}

function normalize(obj, todayISO) {
  const base = emptyData(todayISO);
  return {
    ...base,
    ...obj,
    sessions: Array.isArray(obj.sessions) ? obj.sessions : [],
    measurements: Array.isArray(obj.measurements) ? obj.measurements : [],
    settings: { ...base.settings, ...(obj.settings || {}) },
  };
}

export function exportFile(data, todayISO) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `high-kick-backup-${todayISO}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function parseImport(text, todayISO) {
  const obj = JSON.parse(text);
  if (!obj || typeof obj !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(obj.startDate || '') || !Array.isArray(obj.sessions)) {
    throw new Error('הקובץ לא נראה כמו גיבוי של האפליקציה');
  }
  return normalize(obj, todayISO);
}
