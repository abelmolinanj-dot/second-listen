// Builds js/data/geodata.js from Natural Earth's public-domain 1:10m map data (naturalearthdata.com).
// Keeps only the northern colonies, simplifies the lines, and writes plain [longitude, latitude] arrays.
//
// Usage, from the revolution folder:
//   node tools/build-geodata.mjs <folder with the unzipped Natural Earth folders>
// Needs: ne_10m_land, ne_10m_lakes, ne_10m_lakes_north_america, ne_10m_rivers_lake_centerlines,
//        ne_10m_rivers_north_america, ne_10m_admin_1_states_provinces_lines

import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2];
if (!SRC) { console.error("Give the folder that holds the unzipped Natural Earth data."); process.exit(1); }

// The map's frame, with a margin so nothing is cut short at the edges.
const BOX = { w: -78.7, e: -69.0, s: 36.3, n: 45.9 };
const inBox = ([x, y]) => x >= BOX.w && x <= BOX.e && y >= BOX.s && y <= BOX.n;

// ---------- reading shapefiles (.shp geometry, .dbf attributes) ----------
function readShp(file) {
  const buf = fs.readFileSync(file);
  const shapes = [];
  let off = 100;
  while (off < buf.length) {
    const len = buf.readInt32BE(off + 4) * 2;
    const rec = off + 8;
    const type = buf.readInt32LE(rec);
    if (type === 3 || type === 5) {
      const numParts = buf.readInt32LE(rec + 36), numPoints = buf.readInt32LE(rec + 40);
      const parts = [];
      for (let i = 0; i < numParts; i++) parts.push(buf.readInt32LE(rec + 44 + i * 4));
      const pts0 = rec + 44 + numParts * 4;
      const rings = parts.map((start, i) => {
        const end = i + 1 < numParts ? parts[i + 1] : numPoints;
        const ring = [];
        for (let k = start; k < end; k++) ring.push([buf.readDoubleLE(pts0 + k * 16), buf.readDoubleLE(pts0 + k * 16 + 8)]);
        return ring;
      });
      shapes.push(rings);
    } else shapes.push([]);
    off = rec + len;
  }
  return shapes;
}

function readDbf(file) {
  const buf = fs.readFileSync(file);
  const count = buf.readUInt32LE(4), headLen = buf.readUInt16LE(8), recLen = buf.readUInt16LE(10);
  const fields = [];
  for (let o = 32; buf[o] !== 0x0d; o += 32) fields.push({ name: buf.toString("latin1", o, o + 11).replace(/\0.*$/, "").toLowerCase(), len: buf[o + 16] });
  const rows = [];
  for (let r = 0; r < count; r++) {
    let o = headLen + r * recLen + 1;
    const row = {};
    for (const f of fields) { row[f.name] = buf.toString("utf8", o, o + f.len).trim(); o += f.len; }
    rows.push(row);
  }
  return rows;
}

function layer(name) {
  const dir = path.join(SRC, name);
  return { shapes: readShp(path.join(dir, name + ".shp")), rows: readDbf(path.join(dir, name + ".dbf")) };
}

// ---------- geometry helpers ----------
// Clip a closed ring to the box (Sutherland–Hodgman, one side at a time).
function clipRing(ring) {
  const sides = [
    (p) => p[0] >= BOX.w, (p) => p[0] <= BOX.e, (p) => p[1] >= BOX.s, (p) => p[1] <= BOX.n,
  ];
  const cut = [
    (a, b) => { const t = (BOX.w - a[0]) / (b[0] - a[0]); return [BOX.w, a[1] + (b[1] - a[1]) * t]; },
    (a, b) => { const t = (BOX.e - a[0]) / (b[0] - a[0]); return [BOX.e, a[1] + (b[1] - a[1]) * t]; },
    (a, b) => { const t = (BOX.s - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, BOX.s]; },
    (a, b) => { const t = (BOX.n - a[1]) / (b[1] - a[1]); return [a[0] + (b[0] - a[0]) * t, BOX.n]; },
  ];
  let out = ring;
  for (let s = 0; s < 4 && out.length; s++) {
    const inside = sides[s], src = out;
    out = [];
    for (let i = 0; i < src.length; i++) {
      const p = src[i], q = src[(i + 1) % src.length];
      const pi = inside(p), qi = inside(q);
      if (pi) out.push(p);
      if (pi !== qi) out.push(cut[s](p, q));
    }
  }
  return out;
}

// Split a line into the runs that lie inside the box.
function clipLine(line) {
  const runs = [];
  let cur = [];
  for (const p of line) {
    if (inBox(p)) cur.push(p);
    else if (cur.length) { if (cur.length > 1) runs.push(cur); cur = []; }
  }
  if (cur.length > 1) runs.push(cur);
  return runs;
}

// Douglas–Peucker simplification, with longitude scaled for latitude so the tolerance is even.
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const kx = Math.cos((41 * Math.PI) / 180);
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const ax = pts[a][0] * kx, ay = pts[a][1], bx = pts[b][0] * kx, by = pts[b][1];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-12;
    let best = -1, bestD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i][0] * kx - ax) * dy - (pts[i][1] - ay) * dx) / L;
      if (d > bestD) { bestD = d; best = i; }
    }
    if (best > 0) { keep[best] = 1; stack.push([a, best], [best, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Closed outlines start and end on the same point, which would collapse under Douglas-Peucker.
// Split each ring at its farthest point and simplify the two halves.
function simplifyRing(ring, tol) {
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1] ? ring.slice(0, -1) : ring;
  if (pts.length < 4) return pts;
  let k = 0, best = -1;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]); if (d > best) { best = d; k = i; } }
  const a = simplify(pts.slice(0, k + 1), tol), b = simplify([...pts.slice(k), pts[0]], tol);
  return [...a, ...b.slice(1, -1)];
}

const r4 = (pts) => pts.map(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]);
const area = (ring) => { let s = 0; for (let i = 0; i < ring.length; i++) { const p = ring[i], q = ring[(i + 1) % ring.length]; s += p[0] * q[1] - q[0] * p[1]; } return Math.abs(s / 2); };

// ---------- land ----------
const land = [];
for (const rings of layer("ne_10m_land").shapes) {
  for (const ring of rings) {
    if (!ring.some(inBox) && !(ring.some((p) => p[0] < BOX.w) && ring.some((p) => p[0] > BOX.e))) continue;
    const c = clipRing(ring);
    if (c.length < 3 || area(c) < 0.00015) continue;
    land.push(r4(simplifyRing(c, 0.0018)));
  }
}
land.sort((a, b) => area(b) - area(a));

// ---------- lakes ----------
const lakes = [];
for (const name of ["ne_10m_lakes", "ne_10m_lakes_north_america"]) {
  const L = layer(name);
  L.shapes.forEach((rings, i) => {
    for (const ring of rings) {
      if (!ring.some(inBox)) continue;
      const c = clipRing(ring);
      if (c.length < 3 || area(c) < 0.0006) continue;
      // Leave out reservoirs: they were built long after the Revolution.
      if (/reservoir/i.test(L.rows[i].featurecla || "") || /Reservoir|Sacandaga|Raystown|Gaston|Lake Anna|Quabbin|Flagstaff/i.test(L.rows[i].name || "")) continue;
      lakes.push({ name: (L.rows[i].name || "").trim(), pts: r4(simplifyRing(c, 0.002)) });
    }
  });
}

// ---------- rivers ----------
const rivers = [];
for (const name of ["ne_10m_rivers_lake_centerlines", "ne_10m_rivers_north_america"]) {
  const L = layer(name);
  L.shapes.forEach((lines, i) => {
    const row = L.rows[i];
    if (/lake centerline|canal/i.test(row.featurecla || "")) return;
    const rank = Number(row.scalerank || row.strokeweig || 10);
    for (const line of lines) for (const run of clipLine(line)) {
      const s = simplify(run, 0.003);
      if (s.length > 1) rivers.push({ name: (row.name || "").replace(/s+/g, " ").trim(), rank, pts: r4(s) });
    }
  });
}

// ---------- state and province borders (colony borders, near enough) ----------
const borders = [];
{
  const L = layer("ne_10m_admin_1_states_provinces_lines");
  L.shapes.forEach((lines, i) => {
    const row = L.rows[i];
    // Only borders that existed in 1776: no Canadian provinces (all one Province of Quebec then), no West Virginia (1863), no D.C. (1790).
    if (!/USA/.test(row.adm0_a3 || row.adm0_name || "") || /West Virginia|District of Columbia/i.test(row.name || "")) return;
    for (const line of lines) for (const run of clipLine(line)) {
      const s = simplify(run, 0.004);
      if (s.length > 1) borders.push({ name: row.name || "", pts: r4(s) });
    }
  });
}

const count = (arr) => arr.reduce((n, x) => n + (x.pts || x).length, 0);
const out = `// Generated by tools/build-geodata.mjs from Natural Earth 1:10m data (public domain, naturalearthdata.com).
// Do not edit by hand. Coordinates are [longitude, latitude].
// Land: ${land.length} shapes, ${count(land)} points. Lakes: ${lakes.length}. Rivers: ${rivers.length}. Borders: ${borders.length}.

export const LAND = ${JSON.stringify(land)};
export const LAKES = ${JSON.stringify(lakes)};
export const RIVERS = ${JSON.stringify(rivers)};
export const BORDERS = ${JSON.stringify(borders)};
`;
fs.writeFileSync(new URL("../js/data/geodata.js", import.meta.url), out);
console.log(`land ${land.length} shapes / ${count(land)} pts, lakes ${lakes.length} / ${count(lakes)} pts, rivers ${rivers.length} / ${count(rivers)} pts, borders ${borders.length} / ${count(borders)} pts, ${(out.length / 1024).toFixed(0)} KB`);
