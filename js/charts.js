// גרף קווים פשוט ב־SVG, בלי ספריות, כדי שיעבוד גם בלי אינטרנט
import { parseISO } from './schedule.js';

function fmtDate(isoDate) {
  const d = parseISO(isoDate);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// series: [{ name, cls, points: [{ date, y }] }]
export function lineChart({ series, unit = 'ס"מ' }) {
  const all = series.flatMap((s) => s.points);
  if (all.length === 0) return '<p class="muted small">אין עדיין מדידות.</p>';

  const W = 340, H = 190, padL = 38, padR = 14, padT = 14, padB = 28;
  const times = all.map((p) => parseISO(p.date).getTime());
  let tMin = Math.min(...times), tMax = Math.max(...times);
  if (tMin === tMax) { tMin -= 864e5 * 7; tMax += 864e5 * 7; }
  let yMin = Math.min(...all.map((p) => p.y)), yMax = Math.max(...all.map((p) => p.y));
  const span = Math.max(4, yMax - yMin);
  yMin = Math.floor((yMin - span * 0.15) / 2) * 2;
  yMax = Math.ceil((yMax + span * 0.15) / 2) * 2;

  // ציר הזמן משמאל לימין, כמקובל בגרפים גם בממשק עברי
  const x = (iso) => padL + ((parseISO(iso).getTime() - tMin) / (tMax - tMin)) * (W - padL - padR);
  const y = (v) => padT + (1 - (v - yMin) / (yMax - yMin)) * (H - padT - padB);

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const v = yMin + ((yMax - yMin) * i) / 4;
    const yy = y(v).toFixed(1);
    grid.push(`<line class="grid" x1="${padL}" x2="${W - padR}" y1="${yy}" y2="${yy}"/>`);
    grid.push(`<text class="axis" x="${padL - 6}" y="${yy}" text-anchor="end" dominant-baseline="middle">${Math.round(v)}</text>`);
  }

  const dates = [...new Set(all.map((p) => p.date))].sort();
  const xLabels = [dates[0], dates[dates.length - 1]].filter((d, i, a) => a.indexOf(d) === i)
    .map((d, i) => `<text class="axis" x="${x(d).toFixed(1)}" y="${H - 8}" text-anchor="${dates.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}">${fmtDate(d)}</text>`);

  const lines = series.map((s) => {
    const pts = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1));
    if (!pts.length) return '';
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
    const dots = pts.map((p) => `<circle class="dot ${s.cls}" cx="${x(p.date).toFixed(1)}" cy="${y(p.y).toFixed(1)}" r="3.5"><title>${s.name}: ${p.y} ${unit} (${fmtDate(p.date)})</title></circle>`).join('');
    return `<path class="line ${s.cls}" d="${d}"/>${dots}`;
  }).join('');

  const legend = series.length > 1
    ? `<div class="legend">${series.map((s) => {
        const last = [...s.points].sort((a, b) => (a.date < b.date ? -1 : 1)).pop();
        return `<span><i class="swatch ${s.cls}"></i>${s.name}${last ? `: <b>${last.y}</b>` : ''}</span>`;
      }).join('')}</div>`
    : '';

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" dir="ltr">${grid.join('')}${xLabels.join('')}${lines}</svg>${legend}`;
}
