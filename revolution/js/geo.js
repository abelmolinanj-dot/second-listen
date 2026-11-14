// Map geometry: projects longitude/latitude to map units and builds region shapes.
// Mainland regions are Voronoi cells around each region's seed point, clipped to the coastline.
// Islands (Manhattan, Long Island, Staten Island) use their own outlines.
// Coordinates are hand-drawn and a little exaggerated around New York so small places stay tappable.

const LON0 = -78.0;
const LAT1 = 45.2;
const KY = 120;
const KX = 120 * Math.cos((41 * Math.PI) / 180);

// A fisheye lens over the New York–New Jersey–Philadelphia corridor, where the 1776 campaign happens,
// so those small regions get room on a phone screen. Places far from the center keep their true positions.
const LENS_CENTER = [(-74.45 - LON0) * KX, (LAT1 - 40.5) * KY];
const LENS_RADIUS = 340;
const LENS_POWER = 2.6;

function plain([lon, lat]) {
  return [(lon - LON0) * KX, (LAT1 - lat) * KY];
}

function lens([x, y]) {
  const dx = x - LENS_CENTER[0], dy = y - LENS_CENTER[1];
  const r = Math.hypot(dx, dy);
  if (r === 0 || r >= LENS_RADIUS) return [x, y];
  const t = r / LENS_RADIUS;
  const k = ((LENS_POWER + 1) * t) / (LENS_POWER * t + 1) / t;
  return [LENS_CENTER[0] + dx * k, LENS_CENTER[1] + dy * k];
}

// The map is cropped to the plain (unmagnified) frame; the lens only rearranges what is inside it.
export const WIDTH = Math.round((-69.8 - LON0) * KX);
export const HEIGHT = Math.round((LAT1 - 36.9) * KY);

export function project(lonlat) {
  return lens(plain(lonlat));
}

// Add points along each edge so long straight edges bend smoothly through the lens.
function densify(pts, closed) {
  const out = [];
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.15));
    for (let s = 0; s < steps; s++) out.push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
  }
  if (!closed) out.push(pts[pts.length - 1]);
  return out;
}
const P = (pts, closed = true) => densify(pts, closed).map(project);

// Mainland coastline, clockwise from the north-west corner of the map.
export const MAINLAND = P([
  [-78.0, 45.3], [-70.6, 45.3], [-70.2, 43.75], [-70.75, 42.95], [-70.6, 42.62],
  [-71.0, 42.36], [-70.65, 42.15], [-70.55, 41.8], [-70.0, 41.8], [-70.1, 42.07],
  [-69.93, 41.95], [-69.95, 41.68], [-70.6, 41.52], [-71.1, 41.45], [-71.45, 41.4],
  [-71.9, 41.3], [-72.9, 41.24], [-73.6, 40.98], [-73.78, 40.86], [-73.86, 40.83],
  [-73.92, 40.9], [-73.98, 40.92],
  // Hudson's west bank, down to the Jersey shore opposite Manhattan
  [-74.02, 40.84], [-74.08, 40.72], [-74.12, 40.66], [-74.2, 40.6],
  [-74.28, 40.5], [-74.1, 40.44], [-73.98, 40.42], [-74.0, 40.1], [-74.1, 39.75],
  [-74.4, 39.35], [-74.9, 38.94], [-75.0, 39.2], [-75.4, 39.45],
  // Delaware Bay, then the Delmarva coast
  [-75.55, 39.62], [-75.45, 39.35], [-75.1, 38.8], [-75.05, 38.4], [-75.3, 38.0],
  [-75.6, 37.55], [-75.95, 37.15],
  // Chesapeake Bay, up the Eastern Shore and back down the western shore
  [-76.0, 37.85], [-76.15, 38.5], [-76.2, 39.15], [-76.0, 39.55], [-76.35, 39.45],
  [-76.6, 39.25], [-76.45, 38.95], [-76.45, 38.35], [-76.3, 37.9], [-76.35, 37.1],
  [-76.3, 36.85], [-78.0, 36.85],
]);

export const ISLANDS = {
  manhattan: P([
    [-74.06, 40.69], [-73.95, 40.7], [-73.9, 40.8], [-73.87, 40.88],
    [-73.93, 40.9], [-74.0, 40.82], [-74.04, 40.75],
  ]),
  longisland: P([
    [-74.06, 40.63], [-73.95, 40.56], [-73.4, 40.6], [-72.5, 40.83], [-71.86, 41.07],
    [-72.3, 41.02], [-72.6, 40.99], [-73.4, 40.92], [-73.72, 40.82], [-73.92, 40.68],
  ]),
  statenisland: P([
    [-74.24, 40.55], [-74.08, 40.48], [-74.02, 40.53], [-74.06, 40.63],
    [-74.16, 40.64], [-74.22, 40.6],
  ]),
};

export const LAKES = [
  // Lake Champlain
  P([[-73.38, 45.25], [-73.25, 44.9], [-73.25, 44.4], [-73.3, 44.0], [-73.42, 43.62],
    [-73.45, 43.65], [-73.4, 44.05], [-73.38, 44.45], [-73.37, 44.9], [-73.45, 45.25]]),
];

const L = (pts) => P(pts, false);

export const RIVERS = [
  { name: "Hudson", pts: L([[-73.7, 43.3], [-73.68, 42.9], [-73.75, 42.65], [-73.85, 42.2], [-73.95, 41.75], [-73.96, 41.35], [-73.93, 41.0], [-73.97, 40.92]]) },
  { name: "Delaware", pts: L([[-75.1, 42.0], [-75.05, 41.5], [-75.1, 41.0], [-75.05, 40.6], [-74.85, 40.32], [-74.76, 40.21], [-74.95, 40.05], [-75.15, 39.93], [-75.4, 39.8], [-75.5, 39.6]]) },
  { name: "Mohawk", pts: L([[-75.5, 43.2], [-74.9, 42.98], [-74.2, 42.92], [-73.7, 42.78]]) },
  { name: "Connecticut", pts: L([[-71.6, 45.2], [-72.0, 44.4], [-72.45, 43.6], [-72.55, 42.7], [-72.6, 42.1], [-72.65, 41.7], [-72.35, 41.28]]) },
  { name: "Susquehanna", pts: L([[-75.9, 42.0], [-76.4, 41.7], [-76.85, 41.2], [-76.9, 40.6], [-76.5, 40.0], [-76.1, 39.55]]) },
  { name: "Potomac", pts: L([[-78.0, 39.5], [-77.45, 39.3], [-77.05, 38.9], [-77.0, 38.6], [-76.5, 38.15], [-76.35, 38.0]]) },
];

// --- polygon helpers ---

// Keep the part of `poly` where a*x + b*y <= c (one Sutherland–Hodgman step).
function clipHalfPlane(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const fp = a * p[0] + b * p[1] - c;
    const fq = a * q[0] + b * q[1] - c;
    if (fp <= 0) out.push(p);
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

function voronoiCell(seed, others, box) {
  let cell = [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
  for (const q of others) {
    const a = q[0] - seed[0];
    const b = q[1] - seed[1];
    const c = (q[0] * q[0] + q[1] * q[1] - seed[0] * seed[0] - seed[1] * seed[1]) / 2;
    cell = clipHalfPlane(cell, a, b, c);
    if (cell.length === 0) break;
  }
  return cell;
}

// Clip any polygon to a convex one by cutting along each of its edges.
function clipToConvex(subject, convex) {
  // Make sure the convex polygon is counter-clockwise in screen space (y down).
  let area = 0;
  for (let i = 0; i < convex.length; i++) {
    const p = convex[i], q = convex[(i + 1) % convex.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  const ring = area < 0 ? [...convex].reverse() : convex;
  let out = subject;
  for (let i = 0; i < ring.length && out.length; i++) {
    const p = ring[i], q = ring[(i + 1) % ring.length];
    // Inside is to the right of p->q in screen space when the ring has positive area.
    const a = -(q[1] - p[1]);
    const b = q[0] - p[0];
    const c = a * p[0] + b * p[1];
    out = clipHalfPlane(out, -a, -b, -c);
  }
  return out;
}

export function polygonPath(poly) {
  if (!poly.length) return "";
  return "M" + poly.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L") + "Z";
}

export function linePath(pts) {
  return "M" + pts.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join("L");
}

export function pointInPolygon([x, y], poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Build a shape for every region. `regions` is a map of id -> { seed: [lon, lat], island?: true }.
export function buildRegionShapes(regions) {
  const box = [-50, -50, WIDTH + 50, HEIGHT + 50];
  const mainland = Object.entries(regions).filter(([, r]) => !r.island);
  const seeds = mainland.map(([, r]) => project(r.seed));
  const shapes = {};
  mainland.forEach(([id], i) => {
    const others = seeds.filter((_, j) => j !== i);
    const cell = voronoiCell(seeds[i], others, box);
    shapes[id] = clipToConvex(MAINLAND, cell);
  });
  for (const [id, r] of Object.entries(regions)) {
    if (r.island) shapes[id] = ISLANDS[id];
  }
  return shapes;
}

// Sea drawn above the region fills, so stray clip edges over open water stay hidden. Use fill-rule="evenodd".
export function seaPath() {
  const m = 60;
  let d = `M${-m},${-m}H${WIDTH + m}V${HEIGHT + m}H${-m}Z`;
  d += polygonPath(MAINLAND);
  for (const poly of Object.values(ISLANDS)) d += polygonPath(poly);
  return d;
}
