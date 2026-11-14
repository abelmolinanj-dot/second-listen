// Army figures on the map: small soldiers in the right uniforms, carrying their flags.
// Continental regulars wear blue and buff, British regulars red, Hessians dark blue with tall brass caps,
// and militia wear brown hunting shirts. Bigger armies show more soldiers.

import { PORTRAITS } from "./data/assets.js";

const UNIFORMS = {
  continental: { coat: "#2e4a7d", facing: "#e8dcb5", legs: "#e8dcb5", hat: "tricorne" },
  militia: { coat: "#94784c", facing: "#c9b483", legs: "#6d5a40", hat: "round" },
  british: { coat: "#b3312a", facing: "#f1e7cc", legs: "#efe9dc", hat: "tricorne" },
  hessian: { coat: "#26375f", facing: "#b7372e", legs: "#e6d79f", hat: "mitre" },
};

// One soldier with a shouldered musket, standing with his feet at (0, 0), about 36 units tall.
function soldier(u) {
  const hat = u.hat === "mitre"
    ? `<path d="M-3.2,-25.6 L0,-35 L3.2,-25.6 Z" fill="#c9a33a" stroke="#6b5420" stroke-width=".5"/><circle cx="0" cy="-30" r="1.1" fill="#f3dd8a"/>`
    : u.hat === "round"
      ? `<ellipse cx="0" cy="-26.3" rx="5" ry="1.3" fill="#4a3a28"/><path d="M-2.8,-26.5 Q0,-31 2.8,-26.5 Z" fill="#4a3a28"/>`
      : `<path d="M-5.4,-26 Q0,-28.6 5.4,-26 L3.4,-28.6 Q0,-31.6 -3.4,-28.6 Z" fill="#1d1a17"/><circle cx="2.8" cy="-28.4" r=".8" fill="#e9e1cc"/>`;
  const belts = u.hat === "round" ? "" : `<path d="M-4.2,-20.5 L3.8,-11 M4.2,-20.5 L-3.8,-11" stroke="#f4efe2" stroke-width="1.1"/>`;
  return `
    <path d="M4.6,-38 L4.6,-34" stroke="#c9ccd1" stroke-width=".9"/>
    <path d="M4.6,-34 L4.6,-12" stroke="#5a3f27" stroke-width="1.5"/>
    <rect x="-3.4" y="-10" width="2.7" height="10" fill="${u.legs}" stroke="#1d1a17" stroke-width=".35"/>
    <rect x=".7" y="-10" width="2.7" height="10" fill="${u.legs}" stroke="#1d1a17" stroke-width=".35"/>
    <rect x="-3.5" y="-5" width="2.9" height="5" fill="#1d1a17"/>
    <rect x=".6" y="-5" width="2.9" height="5" fill="#1d1a17"/>
    <path d="M-5,-21.5 Q0,-23 5,-21.5 L5.4,-10.5 L6.6,-6.8 L-6.6,-6.8 L-5.4,-10.5 Z" fill="${u.coat}" stroke="#1d1a17" stroke-width=".45"/>
    <path d="M-1.4,-21.8 L1.4,-21.8 L1.1,-12 L-1.1,-12 Z" fill="${u.facing}"/>
    ${belts}
    <path d="M5,-21 L6.3,-14 L4.2,-13.2 L3.6,-20" fill="${u.coat}" stroke="#1d1a17" stroke-width=".4"/>
    <circle cx="0" cy="-24.3" r="2.7" fill="#e8c39e" stroke="#6b4b33" stroke-width=".35"/>
    ${hat}`;
}

// Flags as carried in 1776.
function flag(kind) {
  if (kind === "P") {
    // The Grand Union Flag: thirteen stripes, with the old British union in the corner.
    let stripes = "";
    for (let i = 0; i < 13; i++) stripes += `<rect y="${(i * 10) / 13}" width="16" height="${10 / 13 + 0.02}" fill="${i % 2 ? "#f4efe2" : "#b3312a"}"/>`;
    return `${stripes}<rect width="6.6" height="5.4" fill="#253c73"/><path d="M0,0 L6.6,5.4 M6.6,0 L0,5.4" stroke="#f4efe2" stroke-width=".9"/><path d="M3.3,0 V5.4 M0,2.7 H6.6" stroke="#f4efe2" stroke-width="1.6"/><path d="M3.3,0 V5.4 M0,2.7 H6.6" stroke="#b3312a" stroke-width=".9"/>`;
  }
  if (kind === "H") return `<rect width="14" height="10" fill="#f4efe2"/><circle cx="7" cy="5" r="2.6" fill="none" stroke="#26375f" stroke-width="1"/><rect width="14" height="10" fill="none" stroke="#c9a33a" stroke-width="1"/>`;
  // The King's Colours: the union of England and Scotland, before Ireland was added in 1801.
  return `<rect width="16" height="10" fill="#253c73"/><path d="M0,0 L16,10 M16,0 L0,10" stroke="#f4efe2" stroke-width="2"/><path d="M8,0 V10 M0,5 H16" stroke="#f4efe2" stroke-width="3.2"/><path d="M8,0 V10 M0,5 H16" stroke="#b3312a" stroke-width="1.8"/>`;
}

function medallion(genId, short, side) {
  const src = PORTRAITS[genId];
  const ring = side === "P" ? "#253c73" : "#b3312a";
  const inner = src
    ? `<image href="${src}" x="-8" y="-8" width="16" height="16" preserveAspectRatio="xMidYMin slice" clip-path="url(#medal-clip)"/>`
    : `${bust(side === "P" ? "#2e4a7d" : "#b3312a")}<text y="2.6" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" font-family="Inter, sans-serif">${short[0]}</text>`;
  return `<g transform="translate(15,-40)"><circle r="9" fill="#f3e8cf" stroke="${ring}" stroke-width="2"/>${inner}</g>`;
}

// A small generic officer's bust in a powdered wig, used until a real portrait is added.
export function bust(coat, scale = 1) {
  return `<g transform="scale(${scale})" clip-path="url(#medal-clip)">
    <circle r="8" fill="#d9ccaa"/>
    <path d="M-8,8 Q-7,1 0,0.5 Q7,1 8,8 Z" fill="${coat}"/>
    <path d="M-1.6,0.8 L0,4 L1.6,0.8 Z" fill="#f4efe2"/>
    <ellipse cx="0" cy="-3" rx="3.1" ry="3.6" fill="#e8c39e"/>
    <path d="M-3.4,-3.6 Q-3.6,-7.6 0,-7.4 Q3.6,-7.6 3.4,-3.6 Q3,-5.4 0,-5.6 Q-3,-5.4 -3.4,-3.6 Z" fill="#ece8df"/>
    <circle cx="-3.5" cy="-2.2" r="1.3" fill="#ece8df"/><circle cx="3.5" cy="-2.2" r="1.3" fill="#ece8df"/>
  </g>`;
}

export const SOLDIER_DEFS = `<clipPath id="medal-clip"><circle r="8"/></clipPath>`;

// Build the inside of an army's map marker. Coordinates are relative to the region's center.
export function armyFigure({ side, hessian, men, regulars, militia, general, short, moved, dugIn, selected, label }) {
  const kind = side === "P" ? "P" : hessian ? "H" : "B";
  const main = side === "P" ? (militia > regulars ? UNIFORMS.militia : UNIFORMS.continental) : hessian ? UNIFORMS.hessian : UNIFORMS.british;
  const second = side === "P" && militia > 0 && regulars > 0 ? (main === UNIFORMS.militia ? UNIFORMS.continental : UNIFORMS.militia) : main;
  const count = men >= 8000 ? 3 : men >= 2500 ? 2 : 1;
  const spots = count === 3 ? [[-10, -3, 0.82, second], [10, -3, 0.82, main], [0, 0, 1, main]] : count === 2 ? [[-6, -2, 0.9, second], [6, 0, 1, main]] : [[0, 0, 1, main]];

  let s = `<rect x="-24" y="-52" width="48" height="70" fill="transparent"/>`;
  if (selected) s += `<ellipse cx="0" cy="1" rx="23" ry="7" fill="#d9a43b" opacity=".75"/>`;
  s += `<ellipse cx="0" cy="1" rx="17" ry="4.2" fill="#000" opacity=".22"/>`;
  if (general) s += `<path d="M-15,0 V-46" stroke="#4a3520" stroke-width="1.2"/><g class="flag" transform="translate(-15,-46)">${flag(kind)}</g>`;
  for (const [x, y, sc, u] of spots) s += `<g transform="translate(${x},${y}) scale(${sc})">${soldier(u)}</g>`;
  if (dugIn) s += `<path d="M-21,2 Q-12,-9 0,-8 Q12,-9 21,2 Z" fill="#8a6d45" stroke="#4d3b28" stroke-width=".8"/><path d="M-15,-3 l-3,-5 M-7,-6 l-2,-5 M2,-7 l1,-5 M10,-5 l3,-5 M16,-2 l4,-4" stroke="#4d3b28" stroke-width="1.2"/>`;
  if (general) s += medallion(general, short, side);
  const fill = side === "P" ? "#253c73" : hessian ? "#7d2a22" : "#a8342b";
  s += `<g transform="translate(0,9)"><rect x="-17" y="-1" width="34" height="13" rx="6.5" fill="${fill}" stroke="#f3e8cf" stroke-width="1.2"/><text y="8.6" text-anchor="middle" class="count">${label}</text></g>`;
  return s;
}

export function battleMarker() {
  return `<g class="boom-inner">
    <circle r="16" fill="#f3e8cf" opacity=".75"/>
    <circle r="11" fill="#d9a43b" opacity=".55"/>
    <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke="#2a2118" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-10,-7 L-7,-10 M10,-7 L7,-10" stroke="#2a2118" stroke-width="2.2" stroke-linecap="round"/>
  </g>`;
}
