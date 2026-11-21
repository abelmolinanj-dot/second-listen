// The living map: the seasons on the trees and hills, snow and frozen rivers, smoke over battlefields and burning
// towns, campfires at night, and the British turn played out move by move with arrows and sailing fleets.


// ---------- seasons ----------
// The map's tree and mountain symbols are redrawn for each season, so every tree on the map changes at once.
const SYMBOLS = {
  summer: {
    pine: `<path d="M0,-9 L4,-2 L2,-2 L5,2 L-5,2 L-2,-2 L-4,-2 Z" fill="#355f3b" stroke="#21402a" stroke-width=".6"/><path d="M0,-9 L-4,-2 L-2,-2 L-5,2 L0,2 Z" fill="#4c7a4b" opacity=".7"/><rect x="-.7" y="2" width="1.4" height="2" fill="#4a3826"/>`,
    oak: `<circle cx="0" cy="-3.5" r="4.2" fill="#5f8a4a" stroke="#3c5f30" stroke-width=".6"/><circle cx="-1.4" cy="-4.6" r="1.7" fill="#7fa863"/><rect x="-.7" y=".4" width="1.4" height="2.4" fill="#4a3826"/>`,
    mtn: `<path d="M-9,4 L-1,-8 L2,-4 L4,-6 L10,4 Z" fill="#a99a72" stroke="#5c4a2e" stroke-width=".9" stroke-linejoin="round"/><path d="M-1,-8 L1,4 L10,4 L4,-6 L2,-4 Z" fill="#7d6c48" opacity=".85"/><path d="M-9,4 L-6,-0.5 L-3,1.5 L-1,4 Z" fill="#6f8a55" opacity=".8"/><path d="M-1,-8 L-2.6,-5.6 L-1,-5 L0.2,-6.2 Z" fill="#ffffff"/>`,
  },
  spring: {
    oak: `<circle cx="0" cy="-3.5" r="4.2" fill="#78a852" stroke="#4c7236" stroke-width=".6"/><circle cx="-1.4" cy="-4.6" r="1.7" fill="#a6cf7c"/><circle cx="1.8" cy="-2.4" r=".8" fill="#f3e9f0"/><circle cx="-2" cy="-2" r=".6" fill="#f3e9f0"/><rect x="-.7" y=".4" width="1.4" height="2.4" fill="#4a3826"/>`,
  },
  // Autumn: the oaks and maples turn; the pines stay green.
  autumn: {
    oak: `<circle cx="0" cy="-3.5" r="4.2" fill="#c8642a" stroke="#7a3a1c" stroke-width=".6"/><circle cx="-1.6" cy="-4.4" r="1.9" fill="#e8a23a"/><circle cx="1.9" cy="-2.6" r="1.5" fill="#b8321e"/><rect x="-.7" y=".4" width="1.4" height="2.4" fill="#4a3826"/>`,
  },
  // Winter: snow on the pines and the hills, bare branches on the oaks.
  winter: {
    pine: `<path d="M0,-9 L4,-2 L2,-2 L5,2 L-5,2 L-2,-2 L-4,-2 Z" fill="#2f4f3a" stroke="#1d3326" stroke-width=".6"/><path d="M0,-9 L2.2,-5 L-2.2,-5 Z M-2,-2 L2,-2 L3,-0.6 L-3,-0.6 Z" fill="#ffffff"/><rect x="-.7" y="2" width="1.4" height="2" fill="#4a3826"/>`,
    oak: `<path d="M0,2.8 V-3 M0,-1 L-3,-4.5 M0,-2 L2.8,-5.5 M-1.6,-3 L-1.4,-6.4 M1.4,-3.8 L3.6,-3.2" stroke="#5a4532" stroke-width=".9" stroke-linecap="round" fill="none"/><path d="M-3.2,-4.8 h1.4 M2.2,-5.8 h1.4 M-2,-6.6 h1.2" stroke="#ffffff" stroke-width=".8"/>`,
    mtn: `<path d="M-9,4 L-1,-8 L2,-4 L4,-6 L10,4 Z" fill="#c9cfd6" stroke="#5c5a5a" stroke-width=".9" stroke-linejoin="round"/><path d="M-1,-8 L1,4 L10,4 L4,-6 L2,-4 Z" fill="#9aa3ad" opacity=".85"/><path d="M-1,-8 L-4.5,-2.5 L-1.5,-3.5 L0.5,-2 L2,-4 Z" fill="#ffffff"/>`,
  },
};

let shownSeason = null;
export function applySeason(svg, season) {
  if (season === shownSeason) return;
  shownSeason = season;
  const set = { ...SYMBOLS.summer, ...(SYMBOLS[season] || {}) };
  for (const [id, body] of Object.entries(set)) {
    const el = svg.querySelector(`symbol#${id}`);
    if (el) el.innerHTML = body;
  }
}
export function resetSeason() { shownSeason = null; }

// Snow lying on the land, drawn as a dithered pattern in the old VGA way rather than a flat wash.
export const LIVING_DEFS = `
  <pattern id="snow-dith" width="4" height="4" patternUnits="userSpaceOnUse">
    <rect width="4" height="4" fill="#ffffff" opacity=".55"/><rect width="1" height="1" fill="#ffffff"/><rect x="2" y="2" width="1" height="1" fill="#ffffff"/><rect x="1" y="3" width="1" height="1" fill="#dfe8f2"/>
  </pattern>
  <marker id="arrowhead-b" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#c8102e" stroke="#ffffff" stroke-width="1"/></marker>
  <marker id="arrowhead-p" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#1d3f8f" stroke="#ffffff" stroke-width="1"/></marker>`;

// ---------- smoke, fire and camps ----------
// A column of pixel smoke rising from (x, y); fire adds flames at its foot.
export function smokeColumn(x, y, { fire = false, size = 1 } = {}) {
  let s = `<g class="smoke-col" transform="translate(${x.toFixed(0)},${y.toFixed(0)}) scale(${size})">`;
  for (let i = 0; i < 7; i++) {
    const d = (i * 0.55).toFixed(2), w = 4 + (i % 3) * 2;
    s += `<circle class="puff" cx="${(((i * 7) % 5) - 2).toFixed(0)}" cy="-6" r="${(w / 1.6).toFixed(1)}" style="animation-delay:-${d}s"/>`;
  }
  if (fire) s += `<g class="flames"><rect x="-4" y="-4" width="3" height="4" fill="#e8501f"/><rect x="-1" y="-6" width="3" height="6" fill="#ffb02e"/><rect x="2" y="-3" width="3" height="3" fill="#e8501f"/><rect x="-0" y="-4" width="1" height="2" fill="#fff2a8"/></g>`;
  return s + `</g>`;
}

// A pixel campfire, shown beside each army at night.
export const CAMPFIRE = `<g class="campfire" transform="translate(13,6)" shape-rendering="crispEdges"><rect x="-4" y="1" width="8" height="2" fill="#3b2614"/><g class="flames"><rect x="-3" y="-3" width="2" height="4" fill="#e8501f"/><rect x="-1" y="-5" width="2" height="6" fill="#ffb02e"/><rect x="1" y="-2" width="2" height="3" fill="#e8501f"/><rect x="-1" y="-2" width="1" height="2" fill="#fff2a8"/></g></g>`;

// ---------- watching the British turn ----------
// A pixel ship for fleets on the move.
// A ship of the line as the engravers drew them on period maps: dark hull, three masts, white sails, a red pennant.
export const SHIP = `<g class="fleet-ship"><path d="M-11,0 L11,0 L8,4 L-8,4 Z" fill="#0c1a38"/><path d="M-1,-1 V-17 M6,-1 V-13 M-7,-1 V-12" stroke="#0c1a38" stroke-width=".9"/><path d="M-1,-16 Q4,-12 -1,-6 Z M-1,-6 Q4,-3 -1,-1 Z M6,-12 Q10,-9 6,-5 Z M-7,-11 Q-3,-8 -7,-4 Z" fill="#ffffff" stroke="#0c1a38" stroke-width=".5"/><path d="M-1,-17 l5,1.2 l-5,1.2" fill="#c8102e"/></g>`;

// The path of an arrow between two map points, bowed a little so overlapping moves stay readable.
export function arrowPath([x0, y0], [x1, y1], bow = 0.18) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0;
  const cx = mx - dy * bow, cy = my + dx * bow;
  // Stop short of the destination so the head doesn't sit on the army.
  const len = Math.hypot(dx, dy) || 1, cut = Math.min(14, len * 0.25);
  const ex = x1 - (dx / len) * cut, ey = y1 - (dy / len) * cut;
  return `M${x0.toFixed(1)},${y0.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
}

