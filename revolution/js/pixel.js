// Pixel-art soldiers in the style of early-1990s VGA games: a 12 by 24 grid, hard outlines, dithered shading.
// Every figure is drawn in code from the uniform, so there are no image files and every pose matches every uniform.
// Poses: "stand" (shoulder arms), "walk1" and "walk2" (marching), "fire" (musket leveled, a flash and smoke),
// "load" (ramming a charge), "fallen" (lying on the ground).

const INK = "#120d10";

// Darken or lighten a hex color by f (-1 to 1).
export function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// A tiny canvas: set pixels, then turn rows of same-colored pixels into as few rectangles as possible.
function grid() {
  const px = new Map();
  const set = (x, y, c) => { if (c) px.set(x + "," + y, c); };
  return {
    set,
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c); },
    // Checkerboard dithering between two colors, the classic way to shade with a small palette.
    dither(x, y, w, h, c1, c2) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, (x + i + y + j) % 2 ? c2 : c1); },
    // A one-pixel dark outline around everything drawn so far.
    outline() {
      const add = [];
      for (const key of px.keys()) {
        const [x, y] = key.split(",").map(Number);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!px.has(x + dx + "," + (y + dy))) add.push([x + dx, y + dy]);
      }
      for (const [x, y] of add) px.set(x + "," + y, INK);
    },
    svg() {
      const rows = {};
      for (const [key, c] of px) { const [x, y] = key.split(",").map(Number); (rows[y] ||= []).push([x, c]); }
      let s = "";
      for (const y of Object.keys(rows)) {
        const r = rows[y].sort((a, b) => a[0] - b[0]);
        for (let i = 0; i < r.length;) {
          let j = i;
          while (j + 1 < r.length && r[j + 1][0] === r[j][0] + 1 && r[j + 1][1] === r[i][1]) j++;
          s += `<rect x="${r[i][0]}" y="${y}" width="${j - i + 1}" height="1" fill="${r[i][1]}"/>`;
          i = j + 1;
        }
      }
      return s;
    },
  };
}

const cache = new Map();

// One soldier. Feet at the bottom center of the grid; the returned group is placed so (0, 0) is between the feet.
// size: how tall the figure is in SVG units (the grid is 24 pixels tall plus the hat).
export function pixelSoldier(u, pose = "stand", size = 40) {
  const key = JSON.stringify([u, pose]);
  let body = cache.get(key);
  if (!body) { body = draw(u, pose); cache.set(key, body); }
  const k = size / 26;
  return `<g transform="scale(${k.toFixed(3)}) translate(-6,-24)" shape-rendering="crispEdges">${body}</g>`;
}

function draw(u, pose) {
  const g = grid();
  // worn: 0 smart, 1 weary (faded, no lace), 2 worn out (patched rags, bandages, bare feet).
  const worn = u.worn || 0;
  const coat = worn ? shade(u.coat, -0.16 * worn) : u.coat, coatD = shade(coat, -0.35), coatL = shade(coat, 0.18);
  const face = worn ? shade(u.facing, -0.2 * worn) : u.facing, skin = "#d9a37c", skinD = "#a8714f";
  if (worn) u = { ...u, lace: null, cockade: null };
  const legs = u.legs, legsD = shade(u.legs, -0.3), gait = u.gaiters;
  const steel = "#b8bec8", steelD = "#6d7480", wood = "#6b4220", woodD = "#45290f";

  if (pose === "fallen") {
    // Lying on his side, musket dropped beside him.
    g.rect(1, 21, 6, 2, coat); g.dither(1, 22, 6, 1, coat, coatD);
    g.rect(7, 21, 3, 2, legs); g.rect(10, 21, 2, 2, gait);
    g.rect(-2, 20, 3, 3, skin); g.rect(-2, 20, 3, 1, u.hair);
    g.rect(-1, 23, 13, 1, wood); g.rect(9, 23, 4, 1, steelD);
    g.outline();
    g.rect(2, 20, 2, 1, "#7a0d12"); // blood on the coat
    return g.svg();
  }

  const walking = pose === "walk1" || pose === "walk2";
  const bob = pose === "walk1" ? 1 : 0; // the body dips a pixel on the stride

  // ---- legs: breeches, gaiters or leggings, shoes ----
  const leg = (x, lift) => {
    g.rect(x, 15 + bob, 2, 3 - lift, legs); g.set(x + 1, 16 + bob, legsD);
    g.rect(x, 18 + bob - lift, 2, 4 - (bob ? 1 : 0), gait);
    if (worn >= 2) { g.rect(x - (x < 5 ? 1 : 0), 22 - lift, 3, 1, "#c99a7a"); g.set(x, 22 - lift, "#8a1a1a"); } // bare feet in the snow
    else g.rect(x - (x < 5 ? 1 : 0), 22 - lift, 3, 1, INK);
  };
  if (pose === "walk1") { leg(3, 0); leg(6, 1); }
  else if (pose === "walk2") { leg(3, 1); leg(6, 0); }
  else if (pose === "fire" || pose === "load") { leg(2, 0); leg(7, 0); }
  else { leg(3, 0); leg(6, 0); }

  const y0 = bob; // everything above the legs moves with the bob
  // ---- coat skirts with turnbacks ----
  if (u.hunting) { g.rect(2, 14 + y0, 7, 3, coat); for (let x = 2; x < 9; x += 2) g.set(x, 17 + y0, coatD); }
  else {
    g.rect(2, 15 + y0, 1, 3, coat); g.rect(8, 15 + y0, 1, 3, coat);
    g.set(2, 17 + y0, face); g.set(8, 17 + y0, face);
  }
  // ---- body ----
  g.rect(2, 9 + y0, 7, 6, coat);
  g.dither(2, 14 + y0, 7, 1, coat, shade(coat, -0.2)); // shading toward the waist
  g.rect(2, 9 + y0, 1, 4, coatL); // light from the left
  if (u.hunting) {
    // A hunting shirt: fringed cape over the shoulders, no lapels.
    g.rect(2, 9 + y0, 7, 2, shade(coat, 0.1));
    for (let x = 2; x < 9; x += 2) g.set(x, 11 + y0, shade(coat, -0.25));
    g.set(5, 10 + y0, skinD);
    g.rect(3, 12 + y0, 1, 1, "#e8dcb8"); // powder horn
  } else {
    // Waistcoat showing down the middle, lapels in the facing color, white crossbelts over the coat.
    g.rect(5, 9 + y0, 1, 6, u.vest); g.rect(4, 9 + y0, 1, 3, face); g.rect(6, 9 + y0, 1, 3, face);
    if (u.belts) { for (let i = 0; i < 4; i++) { g.set(2 + i, 11 + y0 + i, "#e9e4d6"); g.set(8 - i, 11 + y0 + i, "#e9e4d6"); } g.set(5, 13 + y0, "#c9a23a"); }
    g.set(3, 10 + y0, "#e2c55a"); g.set(7, 10 + y0, "#e2c55a"); // buttons
  }
  g.rect(4, 8 + y0, 3, 1, INK); // black neck stock
  if (worn >= 2) { g.set(3, 13 + y0, "#3a2a1c"); g.set(7, 12 + y0, "#5a4a3a"); g.set(6, 14 + y0, "#2a1d14"); } // patches and holes

  // ---- head ----
  g.rect(3, 4 + y0, 5, 4, skin);
  g.set(7, 6 + y0, skinD); g.set(6, 7 + y0, skinD);
  g.set(4, 5 + y0, INK); g.set(6, 5 + y0, INK); // eyes
  g.rect(3, 4 + y0, 5, 1, u.hair); g.set(3, 5 + y0, u.hair); g.set(7, 5 + y0, u.hair); g.set(3, 6 + y0, u.hair);
  if (u.moustache) g.rect(4, 7 + y0, 3, 1, "#3a2414");
  if (worn >= 2) { g.rect(3, 4 + y0, 5, 1, "#eae4d4"); g.set(6, 4 + y0, "#a3161c"); } // a bandage

  // ---- hat ----
  if (u.hat === "mitre") {
    const brass = "#c9a23a";
    g.rect(3, 0 + y0, 5, 4, brass); g.rect(4, -2 + y0, 3, 2, brass); g.set(5, -3 + y0, "#f2eee2");
    g.dither(3, 2 + y0, 5, 1, brass, shade(brass, -0.3)); g.rect(3, 3 + y0, 5, 1, "#a3161c");
  } else if (u.hat === "slouch") {
    g.rect(1, 3 + y0, 9, 1, "#2a1d12"); g.rect(3, 1 + y0, 5, 2, "#3b2a1a"); g.set(4, 1 + y0, "#5a4027");
  } else {
    g.rect(1, 3 + y0, 9, 1, "#17131a"); g.rect(2, 2 + y0, 7, 1, "#17131a"); g.rect(3, 1 + y0, 5, 1, "#221c26");
    if (u.lace) { g.set(1, 3 + y0, u.lace); g.set(9, 3 + y0, u.lace); g.set(2, 2 + y0, u.lace); g.set(8, 2 + y0, u.lace); }
    g.set(7, 2 + y0, u.cockade || "#17131a");
  }

  // ---- arms and the musket ----
  if (pose === "fire") {
    // Leveled musket, butt at the right shoulder, pointing right.
    g.rect(8, 9, 2, 2, coat); g.rect(10, 10, 1, 1, skin);
    g.rect(1, 9, 1, 3, coat); g.rect(1, 11, 3, 1, coat); g.set(4, 11, skin);
    g.rect(7, 10, 2, 1, wood); g.rect(9, 10, 1, 1, woodD); g.rect(10, 9, 7, 1, steelD); g.rect(11, 10, 2, 1, wood);
    if (u.bayonet) g.rect(17, 9, 3, 1, steel);
  } else if (pose === "load") {
    // Musket upright in front, ramrod going down the barrel.
    g.rect(1, 9, 1, 4, coat); g.set(1, 13, skin);
    g.rect(9, 9, 1, 3, coat); g.set(9, 12, skin);
    g.rect(10, 6, 1, 8, steelD); g.rect(10, 14, 1, 5, wood); g.rect(10, 19, 2, 2, woodD);
    g.rect(10, 1, 1, 5, "#d8d0bc"); g.set(9, 4, skin);
  } else {
    // Shoulder arms: left arm at the side, right hand on the musket.
    const yy = y0;
    g.rect(1, 9 + yy, 1, 5, coat); g.set(1, 10 + yy, coatL);
    if (!u.hunting) g.set(1, 13 + yy, face);
    g.set(1, 14 + yy, skin);
    g.rect(9, 9 + yy, 1, 3, coat); g.set(10, 11 + yy, skin);
    if (u.bayonet) g.rect(10, -3 + yy, 1, 4, steel);
    g.rect(10, 1 + yy, 1, 9, steelD); g.set(10, 2 + yy, steel);
    g.rect(10, 10 + yy, 1, 5, wood); g.rect(10, 15 + yy, 2, 2, woodD);
  }

  g.outline();
  if (pose === "fire") {
    // Muzzle flash and a puff of smoke, drawn over the outline.
    const tip = u.bayonet ? 20 : 17;
    g.rect(tip, 8, 2, 3, "#ffd34d"); g.set(tip + 2, 9, "#fff6c8"); g.set(tip, 9, "#ff8a1f");
    for (const [x, y] of [[tip + 3, 7], [tip + 4, 8], [tip + 3, 10], [tip + 5, 9], [tip + 6, 7], [tip + 5, 11], [tip + 7, 9]]) g.rect(x, y, 2, 2, "#e9e4d8");
  }
  return g.svg();
}
