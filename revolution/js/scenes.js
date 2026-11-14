// Cutscenes: a picture with a slow pan, and a few lines of narration that advance with a tap.
// Each scene has drawn artwork. If a painting for it is listed in data/assets.js, the painting is shown instead.

import { SCENES } from "./data/assets.js";

const W = 800, H = 500;

function rng(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function sky(id, stops) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
}

function hills(y, color, seed, amp = 30) {
  const r = rng(seed);
  let d = `M0,${H} L0,${y}`;
  for (let x = 0; x <= W; x += 80) d += ` Q${x + 40},${y - r() * amp} ${x + 80},${y + (r() - 0.5) * amp * 0.5}`;
  return `<path d="${d} L${W},${H} Z" fill="${color}"/>`;
}

function ship(x, y, s, color = "#2b2a33", sail = "#e9dcc0") {
  const sails = [-18, 0, 18].map((mx, i) => {
    const h = i === 1 ? 46 : 38;
    return `<path d="M${mx},-8 V${-h - 10}" stroke="${color}" stroke-width="1.6"/>
      <path d="M${mx - 9},${-h + 2} Q${mx},${-h + 6} ${mx + 9},${-h + 2} L${mx + 8},${-h * 0.55} Q${mx},${-h * 0.5} ${mx - 8},${-h * 0.55} Z" fill="${sail}" opacity=".9"/>
      <path d="M${mx - 7},${-h * 0.5} Q${mx},${-h * 0.45} ${mx + 7},${-h * 0.5} L${mx + 6},${-14} Q${mx},${-11} ${mx - 6},${-14} Z" fill="${sail}" opacity=".85"/>`;
  }).join("");
  return `<g transform="translate(${x},${y}) scale(${s})">${sails}
    <path d="M-34,-10 L34,-10 L28,4 L-26,4 Z" fill="${color}"/>
    <path d="M-30,-6 H30" stroke="#c9a33a" stroke-width="1" opacity=".6"/>
    <path d="M0,-56 l10,3 l-10,3" fill="#b3312a"/></g>`;
}

function snow(n, seed) {
  const r = rng(seed);
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = r() * W, d = 4 + r() * 6, delay = -r() * d;
    s += `<circle class="snowflake" cx="${x.toFixed(0)}" cy="-10" r="${(1 + r() * 2).toFixed(1)}" style="animation-duration:${d.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s"/>`;
  }
  return s;
}

function figure(x, y, s, color = "#1b1a20") {
  return `<g transform="translate(${x},${y}) scale(${s})" fill="${color}">
    <circle cy="-26" r="4"/><path d="M-6,-30 Q0,-34 6,-30 L4,-28 L-4,-28 Z"/>
    <path d="M-5,-22 L5,-22 L6,-6 L-6,-6 Z"/><rect x="-4.5" y="-6" width="3.4" height="9"/><rect x="1.1" y="-6" width="3.4" height="9"/>
    <path d="M5.5,-36 L5.5,-10" stroke="${color}" stroke-width="1.4"/></g>`;
}

const ART = {
  fleet() {
    const r = rng(7);
    let ships = "";
    for (let i = 0; i < 26; i++) {
      const depth = r();
      ships += ship(30 + r() * 740, 300 + depth * 70, 0.25 + depth * 0.45, depth < 0.4 ? "#4a4652" : "#2b2a33");
    }
    return `<defs>${sky("sk", [[0, "#2c3b5c"], [0.45, "#c97d4e"], [0.7, "#f0c27b"], [1, "#f3dca6"]])}</defs>
      <rect width="${W}" height="${H}" fill="url(#sk)"/>
      <circle cx="560" cy="270" r="46" fill="#ffe6a8" opacity=".9"/>
      ${hills(290, "#6c5a62", 3, 26)}
      <rect y="300" width="${W}" height="200" fill="#4d5c78"/>
      <rect y="300" width="${W}" height="200" fill="#f0c27b" opacity=".18"/>
      <path d="M520,300 L600,300 L640,500 L480,500 Z" fill="#ffe6a8" opacity=".18"/>
      ${ships}
      <path d="M90,120 q8,-6 16,0 q8,-6 16,0 M150,100 q6,-5 12,0 q6,-5 12,0" stroke="#2c2a33" stroke-width="2" fill="none"/>`;
  },
  declaration() {
    return `<defs><radialGradient id="glow" cx="72%" cy="30%" r="70%"><stop offset="0" stop-color="#f6d58d"/><stop offset=".5" stop-color="#7a5532"/><stop offset="1" stop-color="#2a1b10"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#glow)"/>
      <g transform="rotate(-4 400 280)">
        <rect x="170" y="90" width="440" height="380" fill="#efe1bd" stroke="#8b6d43" stroke-width="2"/>
        <text x="390" y="140" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="20" fill="#2a2118">IN CONGRESS, JULY 4, 1776.</text>
        <text x="390" y="180" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="15" fill="#2a2118">The unanimous Declaration of the thirteen</text>
        <text x="390" y="202" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="15" fill="#2a2118">united States of America.</text>
        ${Array.from({ length: 9 }, (_, i) => `<path d="M200,${240 + i * 22} H${560 - (i % 3) * 30}" stroke="#6b5537" stroke-width="1.4" opacity=".5" stroke-dasharray="${3 + (i % 4)} 2"/>`).join("")}
        <path d="M420,450 q30,-20 60,0 t60,-6" stroke="#2a2118" stroke-width="2" fill="none"/>
      </g>
      <g transform="translate(640,340) rotate(28)"><path d="M0,0 Q20,-80 8,-170 Q-6,-90 0,0 Z" fill="#f3efe4" stroke="#b9ae97"/><path d="M0,0 L4,-150" stroke="#b9ae97"/></g>
      <ellipse cx="660" cy="420" rx="34" ry="12" fill="#1b130c"/><rect x="630" y="378" width="60" height="42" rx="6" fill="#2a1d12"/>
      <rect x="690" y="150" width="14" height="80" fill="#efe6cf"/><path d="M697,150 q-8,-16 0,-30 q8,14 0,30" fill="#ffd36e"/>
      <circle cx="697" cy="135" r="60" fill="#ffd36e" opacity=".15"/>`;
  },
  crossing() {
    const r = rng(11);
    let ice = "";
    for (let i = 0; i < 18; i++) {
      const x = r() * W, y = 330 + r() * 150, w = 20 + r() * 60;
      ice += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${w.toFixed(0)}" ry="${(w / 6).toFixed(0)}" fill="#c9d6e0" opacity="${(0.5 + r() * 0.4).toFixed(2)}"/>`;
    }
    let men = "";
    for (let i = 0; i < 9; i++) men += figure(250 + i * 26 + (i % 2) * 4, 372 - (i % 3) * 2, 1 + (i === 4 ? 0.25 : 0));
    return `<defs>${sky("sk2", [[0, "#0d1424"], [0.6, "#2a3a55"], [1, "#4d5d78"]])}</defs>
      <rect width="${W}" height="${H}" fill="url(#sk2)"/>
      <circle cx="120" cy="80" r="24" fill="#d9e1ea" opacity=".35"/>
      ${hills(300, "#1c2333", 5, 18)}
      ${Array.from({ length: 30 }, (_, i) => `<path d="M${i * 28 + 10},300 l6,-22 l6,22 Z" fill="#141a27"/>`).join("")}
      <rect y="305" width="${W}" height="195" fill="#33445e"/>
      ${ice}
      <path d="M210,380 L520,380 L500,402 L235,402 Z" fill="#2a1d12"/>
      ${men}
      <path d="M352,330 V250" stroke="#2a1d12" stroke-width="2"/>
      <path d="M352,252 q24,6 46,0 q-6,12 0,22 q-22,6 -46,0 Z" fill="#7b2420"/>
      <path d="M200,392 L120,430 M530,392 L600,428" stroke="#2a1d12" stroke-width="3"/>
      <circle cx="530" cy="340" r="5" fill="#ffd36e"/><circle cx="530" cy="340" r="20" fill="#ffd36e" opacity=".18"/>
      <g class="snow">${snow(90, 3)}</g>`;
  },
  winter() {
    let tents = "";
    for (let i = 0; i < 7; i++) {
      const x = 80 + i * 105, y = 330 + (i % 2) * 20, s = 0.8 + (i % 3) * 0.15;
      tents += `<g transform="translate(${x},${y}) scale(${s})"><path d="M-40,30 L0,-30 L40,30 Z" fill="#d9d3c4" stroke="#7d7464" stroke-width="2"/><path d="M0,-30 L-8,30 L8,30 Z" fill="#5b5346"/></g>`;
    }
    return `<defs>${sky("sk3", [[0, "#5d6b80"], [1, "#c9ced6"]])}<radialGradient id="fire" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf6b" stop-opacity=".8"/><stop offset="1" stop-color="#ffcf6b" stop-opacity="0"/></radialGradient></defs>
      <rect width="${W}" height="${H}" fill="url(#sk3)"/>
      ${hills(280, "#aeb6c2", 9, 40)}
      ${hills(320, "#e6e8ec", 4, 24)}
      ${Array.from({ length: 22 }, (_, i) => `<g transform="translate(${i * 38 + 5},${255 + (i % 3) * 8})"><path d="M0,0 l8,-30 l8,30 Z" fill="#4f5a52"/><path d="M2,-8 l6,-14 l6,14" fill="#f2f3f5"/></g>`).join("")}
      ${tents}
      <circle cx="400" cy="440" r="110" fill="url(#fire)"/>
      <path d="M388,450 q12,-40 14,-60 q10,30 12,60 Z" fill="#f08a2c"/><path d="M394,450 q6,-22 8,-34 q6,18 6,34 Z" fill="#ffd36e"/>
      ${figure(330, 462, 1.6)}${figure(470, 462, 1.6)}${figure(300, 470, 1.4, "#2b2a2e")}
      <g class="snow">${snow(110, 8)}</g>`;
  },
  victory() {
    return `<defs>${sky("sk4", [[0, "#3d5a86"], [0.55, "#e7a66b"], [1, "#fbe3a8"]])}</defs>
      <rect width="${W}" height="${H}" fill="url(#sk4)"/>
      <circle cx="400" cy="330" r="80" fill="#fff0c2" opacity=".85"/>
      ${hills(330, "#7c6a5a", 12, 30)}${hills(380, "#4e4339", 6, 26)}
      <path d="M400,380 V170" stroke="#2a1d12" stroke-width="4"/>
      <g transform="translate(402,172) scale(6)">${unionFlag()}</g>
      ${figure(330, 400, 2)}${figure(470, 400, 2)}${figure(370, 410, 2.2)}${figure(430, 410, 2.2)}`;
  },
  defeat() {
    return `<defs>${sky("sk5", [[0, "#1d1d22"], [0.6, "#4a3b36"], [1, "#7a4f3a"]])}</defs>
      <rect width="${W}" height="${H}" fill="url(#sk5)"/>
      <path d="M520,340 q-20,-80 30,-140 q-10,60 40,80 q10,-50 40,-60 q-20,70 -10,120 Z" fill="#2c2525" opacity=".7"/>
      ${hills(330, "#2a2324", 2, 20)}
      ${Array.from({ length: 9 }, (_, i) => `<rect x="${480 + i * 22}" y="${300 - (i % 3) * 14}" width="18" height="${40 + (i % 3) * 14}" fill="#1a1516"/>`).join("")}
      <circle cx="600" cy="300" r="70" fill="#d9632b" opacity=".25"/>
      <path d="M230,420 L300,250" stroke="#2a1d12" stroke-width="4"/>
      <g transform="translate(300,252) rotate(68) scale(5)">${unionFlag()}</g>
      ${hills(420, "#141112", 8, 16)}`;
  },
};

function unionFlag() {
  let s = "";
  for (let i = 0; i < 13; i++) s += `<rect y="${(i * 10) / 13}" width="16" height="${10 / 13 + 0.02}" fill="${i % 2 ? "#f4efe2" : "#b3312a"}"/>`;
  return `${s}<rect width="6.6" height="5.4" fill="#253c73"/><path d="M0,0 L6.6,5.4 M6.6,0 L0,5.4" stroke="#f4efe2" stroke-width=".9"/><path d="M3.3,0 V5.4 M0,2.7 H6.6" stroke="#f4efe2" stroke-width="1.6"/><path d="M3.3,0 V5.4 M0,2.7 H6.6" stroke="#b3312a" stroke-width=".9"/>`;
}

export const SCENE_TEXT = {
  fleet: {
    art: "fleet",
    lines: [
      "Summer, 1776.",
      "For a year the colonies have been fighting their King. Now the King has answered.",
      "Four hundred ships and more than thirty thousand soldiers are sailing into New York harbor: the largest force Britain has ever sent across an ocean.",
      "Against them stands a young army of farmers and tradesmen, led by a Virginia planter, paid for by a Congress with almost no money.",
      "You are the Board of War. The army is yours to command, and yours to pay for.",
    ],
  },
  declaration: {
    art: "declaration",
    lines: [
      "Philadelphia, the fourth of July, 1776.",
      "Congress declares the thirteen colonies free and independent States.",
      "“We mutually pledge to each other our Lives, our Fortunes and our sacred Honor.”",
      "Now they have to win.",
    ],
  },
  crossing: {
    art: "crossing",
    lines: [
      "Christmas night, 1776.",
      "In sleet and snow, the army crosses the ice-choked Delaware in the dark. The password is “Victory or Death.”",
      "At dawn they fall on the enemy.",
    ],
  },
  winter: {
    art: "winter",
    lines: [
      "Winter comes.",
      "Snow falls on soldiers without shoes, blankets or pay.",
      "Every month in the cold, men sicken, desert or go home. Shelter your armies in towns, and keep them paid.",
    ],
  },
  victory: { art: "victory", lines: [] },
  defeat: { art: "defeat", lines: [] },
};

// Play a scene. `extra` adds lines at the end (for example, how a battle turned out). Calls `done` when finished.
export function playScene(id, { extra = [], title } = {}, done = () => {}) {
  const def = SCENE_TEXT[id];
  const lines = [...def.lines, ...extra];
  const el = document.createElement("div");
  el.className = "cutscene";
  const img = SCENES[id];
  el.innerHTML = `<div class="cs-art">${img ? `<img src="${img}" alt="">` : `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${ART[def.art]()}</svg>`}</div>
    <div class="cs-shade"></div>
    <div class="cs-text">${title ? `<h1>${title}</h1>` : ""}<p class="cs-line"></p><div class="cs-hint">Tap to continue</div></div>
    <button class="cs-skip">Skip ›</button>`;
  document.body.appendChild(el);
  let i = 0;
  const line = el.querySelector(".cs-line");
  const finish = () => { el.classList.add("out"); setTimeout(() => { el.remove(); done(); }, 400); };
  const show = () => {
    if (i >= lines.length) { finish(); return; }
    line.classList.remove("in");
    void line.offsetWidth;
    line.textContent = lines[i++];
    line.classList.add("in");
  };
  el.addEventListener("click", (e) => { if (e.target.closest(".cs-skip")) finish(); else show(); });
  requestAnimationFrame(() => el.classList.add("on"));
  if (lines.length) show();
}
