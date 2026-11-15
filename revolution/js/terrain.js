// Map decoration: mountains, forests, farmland, roads, towns, forts, waves and water names.
// Everything is placed from real geography (longitude/latitude) and drawn once when the game starts.

import { project, WIDTH, HEIGHT, MAINLAND, ISLANDS, pointInPolygon, linePath, polygonPath, seaPath, ALL_LAND, landPath, LAKES, RIVERS, BORDERS, EXTRA_ISLANDS } from "./geo.js";
import { REGIONS } from "./data/regions.js";

// Deterministic randomness so the map looks the same every time.
function seeded(n) {
  let s = n >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Mountain ridges as lines of [lon, lat], with how tall the peaks are drawn.
const RIDGES = [
  { name: "Adirondacks", size: 1.2, pts: [[-75.3, 44.5], [-74.6, 44.4], [-73.95, 44.2]] },
  { name: "", size: 1.1, pts: [[-75.1, 43.95], [-74.5, 43.85], [-74.0, 43.6]] },
  { name: "", size: 1.0, pts: [[-74.9, 44.85], [-74.2, 44.75]] },
  { name: "Green Mountains", size: 1.1, pts: [[-72.85, 45.1], [-72.8, 44.4], [-72.95, 43.6], [-73.1, 42.8]] },
  { name: "White Mountains", size: 1.3, pts: [[-71.9, 44.45], [-71.3, 44.25], [-71.0, 44.05]] },
  { name: "Berkshires", size: 0.8, pts: [[-73.2, 42.75], [-73.25, 42.1]] },
  { name: "Catskills", size: 1.0, pts: [[-74.8, 42.3], [-74.3, 42.15], [-74.05, 42.05]] },
  { name: "Highlands", size: 0.75, pts: [[-74.25, 41.22], [-73.88, 41.45]] },
  { name: "Kittatinny Ridge", size: 0.8, pts: [[-74.55, 41.38], [-74.95, 41.05], [-75.3, 40.85], [-75.9, 40.6], [-76.7, 40.45], [-77.4, 40.15]] },
  { name: "Poconos", size: 0.8, pts: [[-75.7, 41.25], [-75.2, 41.1]] },
  { name: "Endless Mountains", size: 0.9, pts: [[-77.9, 41.55], [-76.9, 41.6], [-76.1, 41.75]] },
  { name: "", size: 0.85, pts: [[-77.9, 40.95], [-77.1, 41.0]] },
  { name: "Blue Ridge", size: 0.9, pts: [[-77.5, 39.95], [-77.6, 39.45], [-77.85, 38.95], [-78.0, 38.6]] },
  { name: "Watchung Hills", size: 0.55, pts: [[-74.65, 40.6], [-74.45, 40.72], [-74.3, 40.85]] },
];

// Wilderness: thick forest. Other regions get scattered woods among the farms.
const FOREST = { stjohns: 120, ticonderoga: 95, saratoga: 45, mohawk: 150, wyoming: 150, newhampshire: 100, bennington: 60, kingston: 60, southjersey: 70, easton: 50, delmarva: 40, frederick: 40, lancaster: 18, virginia: 40, springfield: 28, connecticut: 20, morristown: 22, highlands: 20 };

// Salt marshes and tidal meadows, as [lon, lat, size].
const MARSHES = [
  [-74.1, 40.78, 1.0], // Hackensack Meadows
  [-74.35, 39.75, 1.1], [-74.55, 39.35, 1.0], // the Jersey shore
  [-75.45, 39.35, 1.1], [-75.2, 39.05, 0.9], // Delaware Bay
  [-75.9, 38.4, 1.2], [-76.05, 38.75, 0.9], // Eastern Shore
  [-72.5, 41.25, 0.7], [-70.95, 42.55, 0.7],
];

// The main roads of the colonies.
const ROADS = [
  // Boston Post Road
  [[-71.06, 42.36], [-71.8, 42.27], [-72.59, 42.1], [-72.68, 41.76], [-72.93, 41.31], [-73.5, 41.07], [-73.8, 40.9], [-73.95, 40.85]],
  // New York to Philadelphia and Baltimore
  [[-74.07, 40.72], [-74.2, 40.66], [-74.45, 40.49], [-74.66, 40.35], [-74.76, 40.22], [-75.15, 39.95], [-75.4, 39.85], [-75.55, 39.74], [-76.1, 39.55], [-76.61, 39.29], [-77.05, 38.9], [-77.3, 38.3]],
  // Albany Post Road
  [[-73.93, 40.88], [-73.9, 41.3], [-73.95, 41.7], [-73.82, 42.2], [-73.75, 42.65], [-73.6, 43.3], [-73.4, 43.85]],
  // Philadelphia west to Lancaster
  [[-75.15, 39.95], [-75.6, 40.05], [-76.3, 40.04]],
  // Through Morristown and Easton
  [[-74.2, 40.73], [-74.48, 40.8], [-74.85, 40.75], [-75.21, 40.69]],
  // Mohawk road
  [[-73.75, 42.65], [-74.2, 42.85], [-74.9, 43.0], [-75.45, 43.2]],
];

const WATER_NAMES = [
  { text: "ATLANTIC OCEAN", at: [-72.2, 39.4], size: 22, spacing: 6 },
  { text: "Long Island Sound", at: [-72.85, 41.1], size: 11, spacing: 1 },
  { text: "Delaware Bay", at: [-75.05, 39.12], size: 10, spacing: 1, rotate: -50 },
  { text: "Chesapeake Bay", at: [-76.15, 38.45], size: 10, spacing: 1, rotate: -78 },
  { text: "Lake Champlain", at: [-73.18, 44.6], size: 9, spacing: 1, rotate: -84 },
  { text: "Massachusetts Bay", at: [-70.4, 42.35], size: 10, spacing: 1 },
  { text: "New York Bay", at: [-73.95, 40.47], size: 9, spacing: 1 },
];

const onLand = (p) => ALL_LAND.some((poly) => pointInPolygon(p, poly));

// Walk along a line in map space, yielding evenly spaced points.
function along(pts, step) {
  const out = [];
  let carry = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay);
    let d = carry;
    while (d < len) { out.push([ax + ((bx - ax) * d) / len, ay + ((by - ay) * d) / len]); d += step; }
    carry = d - len;
  }
  return out;
}

function densifyMap(lonlats) {
  const out = [];
  for (let i = 0; i < lonlats.length - 1; i++) {
    const a = lonlats[i], b = lonlats[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.08));
    for (let k = 0; k < n; k++) out.push(project([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]));
  }
  out.push(project(lonlats[lonlats.length - 1]));
  return out;
}

// Keep decoration away from the spots where army figures and labels sit.
function clearOfMarkers(p, seeds, r = 34) {
  return seeds.every(([x, y]) => Math.hypot(p[0] - x, p[1] - (y + 8)) > r);
}

export const TERRAIN_DEFS = `
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="softer" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>
<clipPath id="landclip"><path d="${landPath()}"/></clipPath>
<clipPath id="seaclip"><path clip-rule="evenodd" d="${seaPath()}"/></clipPath>
<linearGradient id="seadepth" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#bcd7e6" stop-opacity="0"/><stop offset=".55" stop-color="#2f6491" stop-opacity=".18"/><stop offset="1" stop-color="#1c4a75" stop-opacity=".45"/>
</linearGradient>
<symbol id="mtn" viewBox="-10 -9 20 13" overflow="visible">
  <path d="M-9,4 L-1,-8 L2,-4 L4,-6 L10,4 Z" fill="#a99a72" stroke="#5c4a2e" stroke-width=".9" stroke-linejoin="round"/>
  <path d="M-1,-8 L1,4 L10,4 L4,-6 L2,-4 Z" fill="#7d6c48" opacity=".85"/>
  <path d="M-9,4 L-6,-0.5 L-3,1.5 L-1,4 Z" fill="#6f8a55" opacity=".8"/>
  <path d="M-1,-8 L-2.6,-5.6 L-1,-5 L0.2,-6.2 Z" fill="#ffffff"/>
</symbol>
<symbol id="pine" viewBox="-5 -10 10 12" overflow="visible">
  <path d="M0,-9 L4,-2 L2,-2 L5,2 L-5,2 L-2,-2 L-4,-2 Z" fill="#355f3b" stroke="#21402a" stroke-width=".6"/>
  <path d="M0,-9 L-4,-2 L-2,-2 L-5,2 L0,2 Z" fill="#4c7a4b" opacity=".7"/>
  <rect x="-.7" y="2" width="1.4" height="2" fill="#4a3826"/>
</symbol>
<symbol id="oak" viewBox="-5 -8 10 11" overflow="visible">
  <circle cx="0" cy="-3.5" r="4.2" fill="#5f8a4a" stroke="#3c5f30" stroke-width=".6"/>
  <circle cx="-1.4" cy="-4.6" r="1.7" fill="#7fa863"/>
  <rect x="-.7" y=".4" width="1.4" height="2.4" fill="#4a3826"/>
</symbol>
<symbol id="marsh" viewBox="-12 -6 24 10" overflow="visible">
  <ellipse rx="11" ry="3.6" fill="#9fbf9a" opacity=".55"/>
  <path d="M-8,0 l-1,-4 M-7,0 l0,-5 M-6,0 l1,-4 M-1,1 l-1,-4 M0,1 l0,-5 M1,1 l1,-4 M5,0 l-1,-4 M6,0 l0,-5 M7,0 l1,-4" stroke="#4f7a4c" stroke-width=".7"/>
  <path d="M-10,2 h5 M-2,3 h6 M4,2 h5" stroke="#6f9cbc" stroke-width=".8"/>
</symbol>
<symbol id="town" viewBox="-12 -12 24 14" overflow="visible">
  <rect x="-10" y="-4" width="6" height="6" fill="#efe3c6" stroke="#5a4632" stroke-width=".8"/>
  <path d="M-10.8,-4 L-7,-8 L-3.2,-4 Z" fill="#9b4a35" stroke="#5a4632" stroke-width=".8"/>
  <rect x="-2" y="-7" width="4" height="9" fill="#efe3c6" stroke="#5a4632" stroke-width=".8"/>
  <path d="M-2.6,-7 L0,-13 L2.6,-7 Z" fill="#6e7d8e" stroke="#5a4632" stroke-width=".8"/>
  <rect x="4" y="-3" width="6" height="5" fill="#efe3c6" stroke="#5a4632" stroke-width=".8"/>
  <path d="M3.2,-3 L7,-7 L10.8,-3 Z" fill="#9b4a35" stroke="#5a4632" stroke-width=".8"/>
</symbol>
<symbol id="fort" viewBox="-10 -10 20 20" overflow="visible">
  <path d="M0,-9 L3,-3 L9,-3 L4,1.5 L6,8 L0,4.5 L-6,8 L-4,1.5 L-9,-3 L-3,-3 Z" fill="#cdbb92" stroke="#4d3b28" stroke-width="1.1" stroke-linejoin="round"/>
  <circle r="2" fill="#4d3b28"/>
</symbol>
<symbol id="wave" viewBox="-8 -3 16 6" overflow="visible">
  <path d="M-8,0 q2,-3 4,0 t4,0 t4,0 t4,0" fill="none" stroke="#6f8fa3" stroke-width=".9" opacity=".55"/>
</symbol>
<pattern id="fields" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
  <rect width="14" height="14" fill="none"/>
  <path d="M0,3.5 H14 M0,10.5 H14" stroke="#b9a676" stroke-width=".55" opacity=".35"/>
</pattern>
<radialGradient id="vignette" cx="50%" cy="50%" r="75%">
  <stop offset="65%" stop-color="#000" stop-opacity="0"/>
  <stop offset="100%" stop-color="#3a2a14" stop-opacity=".22"/>
</radialGradient>`;

// Everything drawn under the region colors: land texture, farmland, forests and mountains.
export function terrainLayer(shapes, seeds) {
  const rand = seeded(1776);
  const seedPts = Object.values(seeds);
  let s = "";

  // The land itself, colored like a relief map: a pale sandy coastal plain, greener rolling country inland,
  // and brown uplands along the real mountain ranges. Each layer is one blurred group, so it stays fast.
  const coast = `${landPath()}`;
  s += `<g clip-path="url(#landclip)">`;
  s += `<g filter="url(#soft)"><path d="${coast}" fill="none" stroke="#ece2bd" stroke-width="44" stroke-linejoin="round"/></g>`;
  s += `<g filter="url(#soft)" opacity=".55">`;
  for (const [id, poly] of Object.entries(shapes)) {
    const n = FOREST[id] ?? 8;
    if (n < 18) continue;
    s += `<path d="${polygonPath(poly)}" fill="#6f9558" opacity="${Math.min(0.85, n / 150).toFixed(2)}"/>`;
  }
  s += `</g>`;
  // Patches of woodland among the farms everywhere else.
  s += `<g filter="url(#softer)" opacity=".35">`;
  for (let i = 0; i < 140; i++) {
    const p = [rand() * WIDTH, rand() * HEIGHT];
    if (!onLand(p)) continue;
    s += `<ellipse cx="${p[0].toFixed(0)}" cy="${p[1].toFixed(0)}" rx="${(10 + rand() * 22).toFixed(0)}" ry="${(6 + rand() * 12).toFixed(0)}" fill="#7a9e5f"/>`;
  }
  s += `</g>`;
  // Uplands: a broad brown band under each range, with a darker spine.
  s += `<g filter="url(#soft)">`;
  for (const r of RIDGES) {
    const d = linePath(densifyMap(r.pts));
    s += `<path d="${d}" fill="none" stroke="#b49a68" stroke-width="${(46 * r.size).toFixed(0)}" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>`;
    s += `<path d="${d}" fill="none" stroke="#8a7146" stroke-width="${(18 * r.size).toFixed(0)}" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>`;
  }
  s += `</g></g>`;

  // Marshes along the coast.
  for (const [lon, lat, size] of MARSHES) {
    const [x, y] = project([lon, lat]);
    for (let k = 0; k < 3; k++) {
      const q = [x + (rand() - 0.5) * 22 * size, y + (rand() - 0.5) * 14 * size];
      if (!onLand(q) || !clearOfMarkers(q, seedPts, 26)) continue;
      s += `<use href="#marsh" x="${(q[0] - 12 * size).toFixed(1)}" y="${(q[1] - 5 * size).toFixed(1)}" width="${(24 * size).toFixed(1)}" height="${(10 * size).toFixed(1)}"/>`;
    }
  }

  // Farmland hatching on settled, open regions.
  for (const [id, poly] of Object.entries(shapes)) {
    if (!REGIONS[id].terrain && !FOREST[id]) s += `<path d="M${poly.map((p) => p.join(",")).join("L")}Z" fill="url(#fields)"/>`;
  }

  // Forests.
  const trees = [];
  for (const [id, poly] of Object.entries(shapes)) {
    const n = FOREST[id] ?? 6;
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    let placed = 0, tries = 0;
    // Trees come in clumps: pick a clump center, then scatter around it.
    while (placed < n && tries++ < n * 30) {
      const c = [x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)];
      if (!pointInPolygon(c, poly)) continue;
      const clump = 3 + Math.floor(rand() * 5);
      for (let k = 0; k < clump && placed < n; k++) {
        const p = [c[0] + (rand() - 0.5) * 26, c[1] + (rand() - 0.5) * 18];
        if (!pointInPolygon(p, poly) || !clearOfMarkers(p, seedPts, 30)) continue;
        const lat = 45.2 - p[1] / 120;
        trees.push({ p, kind: lat > 42.3 || rand() < 0.25 ? "pine" : "oak", sc: 0.8 + rand() * 0.5 });
        placed++;
      }
    }
  }

  // Mountains along the ridge lines.
  const mtns = [];
  for (const r of RIDGES) {
    for (const p of along(densifyMap(r.pts), 11 * r.size)) {
      for (let k = 0; k < 2; k++) {
        const q = [p[0] + (rand() - 0.5) * 16 * r.size, p[1] + (rand() - 0.5) * 12 * r.size];
        if (!onLand(q) || !clearOfMarkers(q, seedPts, 28)) continue;
        mtns.push({ p: q, sc: r.size * (0.75 + rand() * 0.55) });
      }
    }
  }

  // Draw back to front so nearer things overlap farther ones.
  const all = [...trees.map((t) => ({ ...t, type: t.kind })), ...mtns.map((m) => ({ ...m, type: "mtn" }))].sort((a, b) => a.p[1] - b.p[1]);
  for (const o of all) {
    const w = o.type === "mtn" ? 20 : 10, h = o.type === "mtn" ? 13 : 12;
    const W = w * o.sc * (o.type === "mtn" ? 1.15 : 1), H = h * o.sc * (o.type === "mtn" ? 1.15 : 1);
    s += `<use href="#${o.type}" x="${(o.p[0] - W / 2).toFixed(1)}" y="${(o.p[1] - H * 0.7).toFixed(1)}" width="${W.toFixed(1)}" height="${H.toFixed(1)}"/>`;
  }
  return s;
}

// Everything drawn above the region colors: roads, waves, water names, ridge names, towns and the cartouche.
export function overlayLayer(seeds) {
  const rand = seeded(1781);
  let s = "";
  // Water: deeper toward the open ocean, and pale shallows along every shore.
  s += `<g clip-path="url(#seaclip)" pointer-events="none">
    <rect x="-60" y="-60" width="${WIDTH + 120}" height="${HEIGHT + 120}" fill="url(#seadepth)"/>
    <g filter="url(#softer)"><path d="${landPath()}" fill="none" stroke="#d4e7f1" stroke-width="16" stroke-linejoin="round" opacity=".8"/></g>
  </g>`;
  for (const road of ROADS) s += `<path class="road" d="${linePath(densifyMap(road))}"/>`;

  // Waves scattered on open water.
  for (let i = 0; i < 160; i++) {
    const p = [rand() * WIDTH, rand() * HEIGHT];
    if (onLand(p)) continue;
    let near = false;
    for (let a = 0; a < 6 && !near; a++) { const q = [p[0] + Math.cos(a) * 14, p[1] + Math.sin(a) * 14]; if (onLand(q)) near = true; }
    if (near) continue;
    s += `<use href="#wave" x="${(p[0] - 8).toFixed(0)}" y="${(p[1] - 3).toFixed(0)}" width="16" height="6"/>`;
  }

  for (const w of WATER_NAMES) {
    const [x, y] = project(w.at);
    s += `<text class="water-name" x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-size="${w.size}" letter-spacing="${w.spacing}"${w.rotate ? ` transform="rotate(${w.rotate} ${x.toFixed(0)} ${y.toFixed(0)})"` : ""}>${w.text}</text>`;
  }
  for (const r of RIDGES) {
    if (!r.name) continue;
    const pts = densifyMap(r.pts);
    const mid = pts[Math.floor(pts.length / 2)];
    s += `<text class="ridge-name" x="${mid[0].toFixed(0)}" y="${(mid[1] + 17).toFixed(0)}">${r.name}</text>`;
  }

  // Compass rose and title cartouche in the open sea.
  const [cx, cy] = project([-70.6, 38.3]);
  s += `<g class="compass" transform="translate(${cx.toFixed(0)},${cy.toFixed(0)})">
    <circle r="30" fill="none" stroke="#5c4d3c" stroke-width="1" opacity=".6"/>
    <circle r="24" fill="none" stroke="#5c4d3c" stroke-width=".6" opacity=".5"/>
    <path d="M0,-38 L5,0 L0,38 L-5,0 Z" fill="#5c4d3c" opacity=".75"/>
    <path d="M-38,0 L0,-5 L38,0 L0,5 Z" fill="#5c4d3c" opacity=".55"/>
    <path d="M0,-38 L5,0 L0,0 Z" fill="#a8342b"/>
    <text y="-42" text-anchor="middle" font-family="IM Fell English, Georgia, serif" font-size="13" fill="#5c4d3c">N</text>
  </g>`;
  const [tx, ty] = project([-71.4, 37.35]);
  s += `<g transform="translate(${tx.toFixed(0)},${ty.toFixed(0)})">
    <rect x="-110" y="-26" width="220" height="48" rx="3" fill="#ffffff" stroke="#0c1a38" stroke-width="1.2" opacity=".95"/><rect x="-110" y="-26" width="220" height="5" fill="#c8102e"/>
    <rect x="-106" y="-22" width="212" height="40" rx="2" fill="none" stroke="#5c4d3c" stroke-width=".5"/>
    <text text-anchor="middle" y="-4" font-family="IM Fell English, Georgia, serif" font-size="15" fill="#2a2118">The Northern Colonies</text>
    <text text-anchor="middle" y="13" font-family="IM Fell English, Georgia, serif" font-style="italic" font-size="11" fill="#1f3566">and the Seat of War, 1775 to 1783</text>
  </g>`;
  s += `<rect x="-60" y="-60" width="${WIDTH + 120}" height="${HEIGHT + 120}" fill="url(#vignette)" pointer-events="none"/>`;
  return s;
}

// Town and fort icons, drawn just above the region colors.
export function placeIcons(seeds) {
  let s = "";
  for (const [id, r] of Object.entries(REGIONS)) {
    const [x, y] = seeds[id];
    if (r.fort) s += `<use href="#fort" x="${x - 9}" y="${y + 13}" width="18" height="18"/>`;
    else if (r.city) {
      const big = ["philadelphia", "manhattan", "boston"].includes(id);
      const w = big ? 30 : 22, h = big ? 18 : 13;
      s += `<use href="#town" x="${x - w / 2}" y="${y + 13}" width="${w}" height="${h}"/>`;
    }
  }
  return s;
}

// ---------- water and borders, from the real map data ----------
// The coast, every lake and river, the colony borders, and the names of the great rivers.
const RIVER_LABELS = { Hudson: "Hudson R.", Delaware: "Delaware R.", Susquehanna: "Susquehanna R.", Connecticut: "Connecticut R.", Mohawk: "Mohawk R.", Potomac: "Potomac R.", Merrimack: "Merrimack R.", Housatonic: "Housatonic R.", Passaic: "Passaic R.", Lehigh: "Lehigh R.", Schuylkill: "Schuylkill R." };

export function waterLayer() {
  let s = `<path class="coast" d="${landPath()}"/>`;
  for (const b of BORDERS) s += `<path class="border" d="${linePath(b)}"/>`;
  for (const l of LAKES) s += `<path class="lake" d="${polygonPath(l)}"/>`;
  for (const r of RIVERS) s += `<path class="river ${r.rank <= 4 ? "major" : r.rank <= 7 ? "mid" : "minor"}" d="${linePath(r.pts)}"/>`;
  // Name each great river once, along the middle of its longest stretch.
  const best = {};
  for (const r of RIVERS) {
    if (!RIVER_LABELS[r.name]) continue;
    const len = r.pts.reduce((n, p, i) => (i ? n + Math.hypot(p[0] - r.pts[i - 1][0], p[1] - r.pts[i - 1][1]) : 0), 0);
    if (!best[r.name] || len > best[r.name].len) best[r.name] = { len, pts: r.pts };
  }
  for (const [name, { len, pts }] of Object.entries(best)) {
    if (len < 40) continue;
    const i = Math.floor(pts.length / 2), a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)];
    let ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    if (ang > 90) ang -= 180; if (ang < -90) ang += 180;
    const [x, y] = pts[i];
    s += `<text class="river-name" x="${x.toFixed(0)}" y="${(y - 3).toFixed(0)}" transform="rotate(${ang.toFixed(0)} ${x.toFixed(0)} ${(y - 3).toFixed(0)})">${RIVER_LABELS[name]}</text>`;
  }
  return s;
}

// Every other island, as plain land (drawn with the regions' land).
export function extraLand() {
  return EXTRA_ISLANDS.map((p) => `<path class="land" d="${polygonPath(p)}"/>`).join("");
}

// ---------- colony names and the towns of 1776 ----------
// Colony names in spaced capitals, the way period maps lettered them. Names are what they were called in 1776.
const COLONIES = [
  { text: "PROVINCE OF QUEBEC", at: [-73.4, 45.12], rot: 0 },
  { text: "NEW HAMPSHIRE GRANTS", at: [-72.78, 44.15], rot: -78 },
  { text: "NEW HAMPSHIRE", at: [-71.5, 43.95], rot: -80 },
  { text: "MASSACHUSETTS BAY", at: [-71.95, 42.62], rot: 0 },
  { text: "CONNECTICUT", at: [-72.65, 41.62], rot: 0 },
  { text: "NEW YORK", at: [-75.4, 42.35], rot: -8 },
  { text: "NEW JERSEY", at: [-74.85, 39.85], rot: -62 },
  { text: "PENNSYLVANIA", at: [-77.2, 40.62], rot: -4 },
  { text: "DELAWARE", at: [-75.48, 38.95], rot: -76 },
  { text: "MARYLAND", at: [-77.15, 39.4], rot: -4 },
  { text: "VIRGINIA", at: [-77.6, 37.75], rot: -10 },
];

// Towns of 1776 that aren't regions of their own. [name, longitude, latitude]
const TOWNS = [
  ["Falmouth", -70.26, 43.66], ["Portsmouth", -70.76, 43.07], ["Salem", -70.9, 42.52], ["Marblehead", -70.86, 42.5],
  ["Lexington", -71.23, 42.45], ["Concord", -71.35, 42.46], ["Cambridge", -71.11, 42.37], ["Worcester", -71.8, 42.26],
  ["Providence", -71.41, 41.82], ["Newport", -71.31, 41.49], ["New London", -72.1, 41.36], ["New Haven", -72.93, 41.31],
  ["Hartford", -72.68, 41.76], ["Danbury", -73.45, 41.39], ["Northampton", -72.64, 42.32],
  ["Schenectady", -73.94, 42.81], ["Johnstown", -74.37, 43.0], ["Fort Stanwix", -75.46, 43.21], ["Oriskany", -75.34, 43.16],
  ["Fort Edward", -73.58, 43.27], ["Fort George", -73.71, 43.42], ["Crown Point", -73.43, 44.03], ["Skenesborough", -73.4, 43.55],
  ["Stillwater", -73.65, 42.94], ["Poughkeepsie", -73.93, 41.7], ["Newburgh", -74.01, 41.5], ["West Point", -73.96, 41.39],
  ["White Plains", -73.76, 41.03], ["Tarrytown", -73.86, 41.08], ["Elizabethtown", -74.21, 40.66], ["Perth Amboy", -74.27, 40.51],
  ["Monmouth", -74.27, 40.26], ["Burlington", -74.86, 40.07], ["Bordentown", -74.69, 40.15], ["Basking Ridge", -74.55, 40.71],
  ["Germantown", -75.17, 40.04], ["Valley Forge", -75.45, 40.1], ["Reading", -75.93, 40.34], ["Bethlehem", -75.38, 40.62],
  ["York", -76.73, 39.96], ["Carlisle", -77.19, 40.2], ["Chester", -75.36, 39.85], ["Chadds Ford", -75.59, 39.87],
  ["New Castle", -75.56, 39.66], ["Dover", -75.52, 39.16], ["Head of Elk", -75.83, 39.61], ["Annapolis", -76.49, 38.98],
  ["Alexandria", -77.05, 38.8], ["Mount Vernon", -77.09, 38.71], ["Fredericksburg", -77.46, 38.3],
  ["Williamsburg", -76.71, 37.27], ["Yorktown", -76.51, 37.24],
];

export function mapLettering(seeds, { towns = true } = {}) {
  const seedPts = Object.values(seeds);
  let s = "";
  for (const c of COLONIES) {
    const [x, y] = project(c.at);
    s += `<text class="colony-name" x="${x.toFixed(0)}" y="${y.toFixed(0)}"${c.rot ? ` transform="rotate(${c.rot} ${x.toFixed(0)} ${y.toFixed(0)})"` : ""}>${c.text}</text>`;
  }
  for (const [name, lon, lat] of towns ? TOWNS : []) {
    const p = project([lon, lat]);
    // Skip a town where it would sit on an army or a region's name.
    if (!clearOfMarkers(p, seedPts, 24) || seedPts.some(([x, y]) => Math.abs(p[0] - x) < 34 && Math.abs(p[1] - (y + 33)) < 9)) continue;
    s += `<g class="town"><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.6"/><text x="${(p[0] + 3).toFixed(1)}" y="${(p[1] + 2.6).toFixed(1)}">${name}</text></g>`;
  }
  return s;
}
