// Army figures on the map: small soldiers in the right uniforms, carrying their flags.
// Continental regulars wear blue and buff, British regulars red, Hessians dark blue with tall brass caps,
// and militia wear brown hunting shirts. Bigger armies show more soldiers.

import { PORTRAITS } from "./data/assets.js";

// Uniforms of 1776 to 1777. coat and facings (lapels, cuffs, turnbacks), waistcoat, breeches, and the hat.
const UNIFORMS = {
  continental: { coat: "#24407a", facing: "#e3cf9a", vest: "#efe6cc", legs: "#efe6cc", gaiters: "#1b1a1f", hat: "tricorne", lace: "#f1ead6", hair: "#ece6d6", belts: true, bayonet: true },
  militia: { coat: "#cdb98a", facing: "#cdb98a", vest: "#cdb98a", legs: "#6b5638", gaiters: "#5a472e", hat: "slouch", hair: "#5a3e24", belts: false, bayonet: false, hunting: true },
  british: { coat: "#b8241e", facing: "#f3ecd8", vest: "#f3ecd8", legs: "#f3ecd8", gaiters: "#1b1a1f", hat: "tricorne", lace: "#f3ecd8", hair: "#ece6d6", belts: true, bayonet: true },
  hessian: { coat: "#1f2f57", facing: "#b8241e", vest: "#e8cf6c", legs: "#e8cf6c", gaiters: "#1b1a1f", hat: "mitre", hair: "#ece6d6", belts: true, bayonet: true, moustache: true },
};

// One soldier at "shoulder arms", feet at (0, 0), about 40 units tall, drawn in period uniform.
function soldier(u) {
  const ink = "#16151a";
  // Hats: the cocked tricorne with lace edging, the Hessian brass mitre cap, or the militiaman's slouch hat.
  const hat = u.hat === "mitre"
    ? `<path d="M-3.3,-27.4 L-2.5,-37.2 Q0,-39.6 2.5,-37.2 L3.3,-27.4 Z" fill="#d4ad3e" stroke="#6b5420" stroke-width=".45"/>
       <path d="M-2.2,-35.5 Q0,-36.8 2.2,-35.5 M-2.6,-32 L2.6,-32" stroke="#8a6a1e" stroke-width=".4" fill="none"/>
       <circle cx="0" cy="-30" r="1.25" fill="#fff1b0" stroke="#8a6a1e" stroke-width=".3"/>
       <rect x="-3.4" y="-28.3" width="6.8" height="1.3" fill="#b8241e"/><circle cx="0" cy="-39.3" r="1" fill="#f1ead6"/>`
    : u.hat === "slouch"
      ? `<ellipse cx="0" cy="-27.4" rx="6.2" ry="1.5" fill="#3b2c1c"/><path d="M-3,-27.6 Q-2.6,-31.6 0,-31.8 Q2.6,-31.6 3,-27.6 Z" fill="#3b2c1c"/><path d="M-3,-28.4 H3" stroke="#6b5638" stroke-width=".6"/>`
      : `<path d="M-6,-27.6 Q0,-26.2 6,-27.6 L4.3,-31.2 Q0,-33.6 -4.3,-31.2 Z" fill="${ink}"/>
         <path d="M-6,-27.6 Q0,-26.2 6,-27.6 M4.3,-31.2 Q0,-33.6 -4.3,-31.2" stroke="${u.lace}" stroke-width=".45" fill="none"/>
         <circle cx="3" cy="-29.4" r="1" fill="${ink}" stroke="${u.lace}" stroke-width=".35"/>`;
  // Long arms: a musket with a fixed bayonet, or the militia's long rifle.
  const gun = u.bayonet
    ? `<path d="M6.4,-13 L6.4,-34.5" stroke="#9ea3aa" stroke-width=".9"/><path d="M6.4,-34.5 L6.4,-41" stroke="#d9dde2" stroke-width=".55"/>
       <path d="M5.4,-9.5 L7.4,-9.5 L7,-16 L5.8,-16 Z" fill="#6b4524"/><path d="M6.4,-16 L6.4,-30" stroke="#6b4524" stroke-width="1.1"/>`
    : `<path d="M6.4,-11 L6.4,-38" stroke="#5a3a1e" stroke-width="1.1"/><path d="M6.4,-24 L6.4,-38.5" stroke="#8a8f96" stroke-width=".6"/><path d="M5.5,-9 L7.3,-9 L7,-14 L5.8,-14 Z" fill="#5a3a1e"/>`;
  // Crossbelts for the cartridge box and bayonet, or the hunting shirt's fringed cape and a powder horn.
  const kit = u.belts
    ? `<path d="M-4.6,-21.6 L4,-12.6 M4.6,-21.6 L-4,-12.6" stroke="#f6f1e2" stroke-width="1.15"/><rect x="-0.9" y="-17.8" width="1.8" height="1.4" fill="#d4ad3e"/>`
    : `<path d="M-5.6,-21.8 Q0,-19.4 5.6,-21.8 L5,-18.2 Q0,-16.6 -5,-18.2 Z" fill="#bfa877" stroke="#7a6640" stroke-width=".35"/>
       <path d="M-4.6,-18 l-.4,1.6 M-3,-17.5 l-.3,1.6 M-1.4,-17.2 l-.2,1.6 M0,-17.1 v1.6 M1.4,-17.2 l.2,1.6 M3,-17.5 l.3,1.6 M4.6,-18 l.4,1.6" stroke="#7a6640" stroke-width=".35"/>
       <path d="M-5.2,-20.6 L4.6,-12.2" stroke="#4a3520" stroke-width=".6"/><path d="M2.6,-12.4 Q4.8,-12.8 5.6,-10.6 L4.6,-10.4 Q4,-11.8 2.8,-11.6 Z" fill="#efe2bf" stroke="#7a6640" stroke-width=".3"/>`;
  const fringe = u.hunting ? `<path d="M-5.6,-10.6 l-.3,1.4 M-4,-10.6 l-.2,1.4 M-2.4,-10.6 v1.4 M2.4,-10.6 v1.4 M4,-10.6 l.2,1.4 M5.6,-10.6 l.3,1.4" stroke="#7a6640" stroke-width=".35"/>` : "";
  return `
    ${gun}
    <!-- legs: breeches, then gaiters buttoned to the knee, then shoes -->
    <path d="M-3.3,-12 L-0.5,-12 L-0.7,-0.8 L-3.1,-0.8 Z" fill="${u.legs}" stroke="${ink}" stroke-width=".3"/>
    <path d="M0.5,-12 L3.3,-12 L3.1,-0.8 L0.7,-0.8 Z" fill="${u.legs}" stroke="${ink}" stroke-width=".3"/>
    <path d="M-3.2,-6.6 L-0.6,-6.6 L-0.7,-0.6 L-3.1,-0.6 Z M0.6,-6.6 L3.2,-6.6 L3.1,-0.6 L0.7,-0.6 Z" fill="${u.gaiters}"/>
    <ellipse cx="-2" cy="-0.3" rx="1.9" ry=".7" fill="${ink}"/><ellipse cx="2" cy="-0.3" rx="1.9" ry=".7" fill="${ink}"/>
    <!-- coat: body, long skirts with turned-back facings -->
    <path d="M-5.2,-13 L-6.9,-5.2 L-3.4,-5.6 L-2.4,-12 Z M5.2,-13 L6.9,-5.2 L3.4,-5.6 L2.4,-12 Z" fill="${u.coat}" stroke="${ink}" stroke-width=".35"/>
    ${u.hunting ? "" : `<path d="M-5.8,-9.6 L-6.6,-5.4 L-4.6,-5.6 Z M5.8,-9.6 L6.6,-5.4 L4.6,-5.6 Z" fill="${u.facing}"/>`}
    <path d="M-5.2,-22.2 Q0,-23.8 5.2,-22.2 L5.4,-12.4 L-5.4,-12.4 Z" fill="${u.coat}" stroke="${ink}" stroke-width=".4"/>
    <path d="M-1.7,-22 L1.7,-22 L1.4,-11.6 L-1.4,-11.6 Z" fill="${u.vest}"/>
    ${u.hunting ? "" : `<path d="M-1.7,-22 L-3.3,-21.2 L-2.7,-14.6 L-1.5,-14 Z M1.7,-22 L3.3,-21.2 L2.7,-14.6 L1.5,-14 Z" fill="${u.facing}"/>
    <circle cx="-2.6" cy="-20" r=".32" fill="#e9d48a"/><circle cx="-2.5" cy="-18" r=".32" fill="#e9d48a"/><circle cx="-2.4" cy="-16" r=".32" fill="#e9d48a"/>
    <circle cx="2.6" cy="-20" r=".32" fill="#e9d48a"/><circle cx="2.5" cy="-18" r=".32" fill="#e9d48a"/><circle cx="2.4" cy="-16" r=".32" fill="#e9d48a"/>`}
    ${fringe}
    ${kit}
    <!-- arms: the left hangs at the side, the right steadies the musket -->
    <path d="M-5.2,-21.6 L-6.3,-13.6 L-4.7,-13.2 L-3.9,-20.4 Z" fill="${u.coat}" stroke="${ink}" stroke-width=".35"/>
    <path d="M5.2,-21.6 L6.8,-15.6 L5.4,-14.6 L3.9,-20.4 Z" fill="${u.coat}" stroke="${ink}" stroke-width=".35"/>
    ${u.hunting ? "" : `<path d="M-6.3,-14.6 L-4.7,-14.2 L-4.6,-13.2 L-6.3,-13.6 Z M6.8,-15.6 L5.4,-14.6 L5.2,-15.6 L6.5,-16.4 Z" fill="${u.facing}"/>`}
    <circle cx="-5.5" cy="-12.6" r=".95" fill="#e3b892"/><circle cx="6.3" cy="-14.4" r=".95" fill="#e3b892"/>
    <!-- head: black neck stock, face, powdered or natural hair with a queue -->
    <rect x="-1.3" y="-23.6" width="2.6" height="1.2" fill="${ink}"/>
    <ellipse cx="0" cy="-25.6" rx="2.6" ry="2.9" fill="#e9c39c" stroke="#7a5236" stroke-width=".3"/>
    <path d="M-2.6,-26.2 Q-2.8,-28.4 0,-28.6 Q2.8,-28.4 2.6,-26.2 Q2.4,-27.4 0,-27.6 Q-2.4,-27.4 -2.6,-26.2 Z" fill="${u.hair}"/>
    <circle cx="-2.7" cy="-25.6" r=".85" fill="${u.hair}"/><circle cx="2.7" cy="-25.6" r=".85" fill="${u.hair}"/>
    <circle cx="-.9" cy="-25.9" r=".28" fill="${ink}"/><circle cx=".9" cy="-25.9" r=".28" fill="${ink}"/>
    ${u.moustache ? `<path d="M-1.3,-24.4 Q0,-25 1.3,-24.4" stroke="#3a2a1a" stroke-width=".55" fill="none"/>` : ""}
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
  return `<g transform="translate(17,-48)"><circle r="9" fill="#f3e8cf" stroke="${ring}" stroke-width="2"/>${inner}</g>`;
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
export function armyFigure({ side, hessian, men, regulars, militia, general, short, moved, dugIn, selected, label, unsupplied }) {
  const kind = side === "P" ? "P" : hessian ? "H" : "B";
  const main = side === "P" ? (militia > regulars ? UNIFORMS.militia : UNIFORMS.continental) : hessian ? UNIFORMS.hessian : UNIFORMS.british;
  const second = side === "P" && militia > 0 && regulars > 0 ? (main === UNIFORMS.militia ? UNIFORMS.continental : UNIFORMS.militia) : main;
  const count = men >= 8000 ? 3 : men >= 2500 ? 2 : 1;
  const spots = count === 3 ? [[-12, -3, 0.98, second], [12, -3, 0.98, main], [0, 0, 1.2, main]] : count === 2 ? [[-7, -2, 1.08, second], [7, 0, 1.2, main]] : [[0, 0, 1.2, main]];

  let s = `<rect x="-26" y="-60" width="52" height="78" fill="transparent"/>`;
  if (selected) s += `<ellipse cx="0" cy="1" rx="23" ry="7" fill="#ffffff" stroke="#c8102e" stroke-width="1.5" opacity=".9"/>`;
  s += `<ellipse cx="0" cy="1" rx="17" ry="4.2" fill="#000" opacity=".22"/>`;
  if (general) s += `<path d="M-17,0 V-54" stroke="#4a3520" stroke-width="1.3"/><g class="flag" transform="translate(-17,-54)">${flag(kind)}</g>`;
  for (const [x, y, sc, u] of spots) s += `<g transform="translate(${x},${y}) scale(${sc})">${soldier(u)}</g>`;
  if (dugIn) s += `<path d="M-21,2 Q-12,-9 0,-8 Q12,-9 21,2 Z" fill="#8a6d45" stroke="#4d3b28" stroke-width=".8"/><path d="M-15,-3 l-3,-5 M-7,-6 l-2,-5 M2,-7 l1,-5 M10,-5 l3,-5 M16,-2 l4,-4" stroke="#4d3b28" stroke-width="1.2"/>`;
  if (general) s += medallion(general, short, side);
  // Cut off from supply: a red warning badge.
  if (unsupplied) s += `<g transform="translate(-19,-30)"><circle r="6.5" fill="#c8102e" stroke="#ffffff" stroke-width="1.4"/><text y="3.4" text-anchor="middle" font-size="9.5" font-weight="700" fill="#ffffff" font-family="Inter, sans-serif">!</text></g>`;
  const fill = side === "P" ? "#253c73" : hessian ? "#7d2a22" : "#a8342b";
  s += `<g transform="translate(0,9)"><rect x="-17" y="-1" width="34" height="13" rx="6.5" fill="${fill}" stroke="#f3e8cf" stroke-width="1.2"/><text y="8.6" text-anchor="middle" class="count">${label}</text></g>`;
  return s;
}

export function battleMarker() {
  return `<g class="boom-inner">
    <circle r="16" fill="#f3e8cf" opacity=".75"/>
    <circle r="11" fill="#ffffff" opacity=".7"/>
    <path d="M-9,-9 L9,9 M9,-9 L-9,9" stroke="#2a2118" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M-10,-7 L-7,-10 M10,-7 L7,-10" stroke="#2a2118" stroke-width="2.2" stroke-linecap="round"/>
  </g>`;
}

// ---------- battle close-up art ----------
// A wide scene of two battle lines facing each other across the ground of the region being fought over.
// kinds: "continental", "militia", "british", "hessian". terrain: "hills", "forest", "city" or "open".
export function battleScene({ left, right, terrain = "open", leftFlag = "P", rightFlag = "B" }) {
  const W = 800, H = 300;
  let r = 7;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const sky = `<defs><linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d9bbd"/><stop offset=".7" stop-color="#e9dcc0"/><stop offset="1" stop-color="#f1e6cc"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#bs-sky)"/>`;
  let back = "";
  if (terrain === "hills") back = `<path d="M0,170 Q120,90 260,150 Q380,80 520,140 Q650,70 800,135 L800,300 L0,300 Z" fill="#7f8a5c"/><path d="M0,190 Q200,140 400,185 Q600,150 800,180 L800,300 L0,300 Z" fill="#94a066"/>`;
  else if (terrain === "forest") { back = `<rect y="150" width="${W}" height="150" fill="#8d9a5f"/>`; for (let i = 0; i < 46; i++) { const x = i * 18 - 5, h = 40 + rand() * 40; back += `<path d="M${x},175 l9,-${h.toFixed(0)} l9,${h.toFixed(0)} Z" fill="${rand() < 0.5 ? "#2f4d33" : "#3d5e3c"}"/>`; } }
  else if (terrain === "city") { back = `<rect y="160" width="${W}" height="140" fill="#a39a74"/>`; for (let i = 0; i < 12; i++) { const x = 30 + i * 64, h = 30 + rand() * 40; back += `<rect x="${x}" y="${160 - h}" width="44" height="${h}" fill="#8a6a55" stroke="#4d3b28" stroke-width="1"/><path d="M${x - 4},${160 - h} L${x + 22},${140 - h} L${x + 48},${160 - h} Z" fill="#5c3b2e"/>`; } back += `<path d="M380,100 V40 M372,60 H388" stroke="#4d3b28" stroke-width="4"/>`; }
  else back = `<rect y="160" width="${W}" height="140" fill="#a8ae6d"/><path d="M0,200 H800 M0,232 H800" stroke="#8a8a52" stroke-width="2" stroke-dasharray="30 10"/><path d="M0,180 L800,176" stroke="#6b5537" stroke-width="2"/>${Array.from({ length: 20 }, (_, i) => `<path d="M${i * 42},172 v12" stroke="#6b5537" stroke-width="2"/>`).join("")}`;
  const ground = `<rect y="215" width="${W}" height="85" fill="#8f9455" opacity=".55"/>`;
  const line = (kind, x0, dir) => {
    let s = "";
    // The rear rank first (smaller, farther back), then the front rank over it.
    for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) {
      const x = x0 + dir * (i * 34 + (row ? 0 : 17)), y = row ? 290 : 258;
      s += `<g transform="translate(${x},${y}) scale(${row ? 2.6 : 2.15})">${soldier(UNIFORMS[kind])}</g>`;
    }
    return s;
  };
  const flagPole = (x, kind) => `<path d="M${x},262 V118" stroke="#3a2a1c" stroke-width="3.5"/><g transform="translate(${x},120) scale(4)">${flag(kind)}</g>`;
  let smoke = "";
  for (let i = 0; i < 18; i++) { const x = 280 + rand() * 240, y = 200 + rand() * 60, rr = 14 + rand() * 26; smoke += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${rr.toFixed(0)}" fill="#f4f0e6" opacity="${(0.45 + rand() * 0.35).toFixed(2)}"/>`; }
  return `<svg class="battle-art" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">${sky}${back}${ground}
    ${flagPole(60, leftFlag)}${line(left, 40, 1)}${flagPole(730, rightFlag)}${line(right, 760, -1)}
    <g class="bs-smoke">${smoke}</g></svg>`;
}
