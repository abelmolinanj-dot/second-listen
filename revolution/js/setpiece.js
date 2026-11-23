// Set pieces: famous moments of the war played as short action games, drawn like period maps (and, for the
// Chew House, on della Gatta's 1782 painting of it).
//   delaware:   Christmas night 1776. Steer the Durham boats through the ice and get the army across before dawn.
//   longisland: August 1776. Ferry the trapped army off Long Island by night, and keep the campfires burning.
//   chew:       Germantown, October 1777. Silence the stone house's windows while the columns push past it.
// playSetPiece(kind, onDone) calls onDone with a score from 0 to 1, or null if the player let the officers handle it.

import { sfx, music, battleDrums, stopMusic } from "./sound.js";

const W = 320, H = 180;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const INFO = {
  delaware: {
    art: "img/scenes/crossing.jpg",
    title: "Crossing the Delaware",
    when: "Christmas night, 1776",
    intro: "Colonel Glover's Marblehead fishermen are rowing the army across the Delaware in big Durham boats, through sleet and floating ice. Washington wanted everyone across by midnight. Every load that reaches the Jersey shore before dawn keeps the surprise alive.",
    how: "Steer the boat up and down the river to dodge the ice: drag, tap above or below the boat, or use the arrow keys. It rows itself across. Ten loads carry the army, its horses and eighteen guns.",
    officers: "Let Glover's men handle it",
  },
  longisland: {
    art: "img/scenes/battles/longisland.jpg",
    title: "Escape from Long Island",
    when: "The night of August 29, 1776",
    intro: "The army is trapped on Long Island with the East River at its back. Washington has gathered every boat he can find, and Glover's Marbleheaders will row all night. The campfires must stay lit so the British think the lines are still manned.",
    how: "Tap a boat at the Brooklyn shore to send it across with a company; it rows back by itself. Tap a fading campfire to stoke it. If the fires die, the British pickets will notice. Morning fog will help, for a while.",
    officers: "Let Glover's men handle it",
  },
  chew: {
    art: "img/scenes/battles/germantown.jpg",
    title: "The Chew House",
    when: "Germantown, October 4, 1777",
    intro: "In the fog, the attack has run into a stone house held by six companies of British infantry. Musket fire pours from its windows. Knox says no fort should be left in the army's rear; others say push on past it.",
    how: "Tap a window when it flashes to send a volley at it and silence it for a while. Every shot that goes unanswered costs men and slows the columns. Push on past the house before the fog lifts. You can leave a regiment to watch the house and push on faster, but the windows will fire more freely.",
    officers: "Let Knox and Sullivan handle it",
  },
};

export function playSetPiece(kind, onDone) {
  const info = INFO[kind];
  const root = document.createElement("div");
  root.id = "setpiece";
  root.innerHTML = `
    <div class="sp-top"><div class="sp-title">${esc(info.title)}</div><div class="sp-hud" id="sp-hud"></div></div>
    <div class="sp-stage"><canvas id="sp-canvas" width="${W * 2}" height="${H * 2}"></canvas>
      <div class="sp-card" id="sp-card">${info.art ? `<div class="sp-art" style="background-image:url('${info.art}')"></div>` : ""}<div class="sp-when">${esc(info.when)}</div><h2>${esc(info.title)}</h2><p>${esc(info.intro)}</p><p class="sp-how">${esc(info.how)}</p>
        <div class="sp-btns"><button class="bf-big" id="sp-go">Take command</button><button class="bf-btn" id="sp-skip">${esc(info.officers)}</button></div></div></div>
    <div class="sp-extra" id="sp-extra"></div>`;
  document.body.appendChild(root);
  const cv = root.querySelector("#sp-canvas"), g = cv.getContext("2d");
  g.imageSmoothingEnabled = true;
  const hud = root.querySelector("#sp-hud"), card = root.querySelector("#sp-card"), extra = root.querySelector("#sp-extra");
  const game = GAMES[kind]();
  let raf = 0, last = 0, running = false, ended = false;
  const keys = {};
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H]; };
  const onKey = (e) => { keys[e.key] = e.type === "keydown"; };
  cv.addEventListener("pointerdown", (e) => { if (running) { cv.setPointerCapture(e.pointerId); game.press?.(...pos(e)); } });
  cv.addEventListener("pointermove", (e) => { if (running && e.buttons) game.drag?.(...pos(e)); });
  cv.addEventListener("pointerup", () => running && game.release?.());
  window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey);
  const close = (score) => { cancelAnimationFrame(raf); battleDrums.stop(); window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); root.remove(); onDone(score); };

  function frame(t) {
    const dt = Math.min(0.05, (t - last) / 1000 || 0);
    last = t;
    if (running) game.update(dt, keys);
    g.setTransform(2, 0, 0, 2, 0, 0);
    game.draw(g);
    hud.textContent = game.hud();
    if (game.extra) { const x = game.extra(); if (extra.dataset.v !== x.key) { extra.dataset.v = x.key; extra.innerHTML = x.html; x.bind?.(extra); } }
    if (running && game.over && !ended) { ended = true; running = false; finish(); }
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    battleDrums.stop();
    const s = Math.max(0, Math.min(1, game.score()));
    if (s >= 0.7) music.victory(); else music.dirge();
    card.innerHTML = `<div class="sp-when">${esc(info.when)}</div><h2>${s >= 0.85 ? "A triumph" : s >= 0.6 ? "Well done" : s >= 0.35 ? "A hard night" : "It went badly"}</h2><p>${esc(game.result())}</p><div class="sp-btns"><button class="bf-big" id="sp-done">Continue</button></div>`;
    card.hidden = false;
    card.querySelector("#sp-done").onclick = () => close(s);
  }
  root.querySelector("#sp-go").onclick = () => { card.hidden = true; running = true; last = performance.now(); stopMusic(); battleDrums.start(); battleDrums.setIntensity(0.35); sfx.drumroll(); };
  root.querySelector("#sp-skip").onclick = () => close(null);
  raf = requestAnimationFrame(frame);
}

// ---------- drawing: the look of a period map, ink on white paper, with washes of color ----------
const INK = "#0c1a38", PAPER = "#fbfaf6", BLUE = "#1d3f8f", RED = "#c8102e";
const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
// A company or regiment as a block on the plan.
function block(g, x, y, w, h, color, alpha = 1) { g.globalAlpha = alpha; g.fillStyle = color; g.fillRect(x, y, w, h); g.strokeStyle = "#ffffff"; g.lineWidth = 0.5; g.strokeRect(x, y, w, h); g.globalAlpha = 1; }
// A rowing boat as the engravers drew it: a dark hull, oars out, men aboard as blue marks.
function boat(g, x, y, men, t) {
  g.fillStyle = INK; g.beginPath(); g.moveTo(x - 12, y - 2); g.quadraticCurveTo(x, y + 6, x + 12, y - 2); g.lineTo(x + 10, y - 3); g.lineTo(x - 10, y - 3); g.closePath(); g.fill();
  const o = Math.sin(t * 8 + x) * 2;
  g.strokeStyle = INK; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x - 9, y + 5 + o); g.moveTo(x + 5, y); g.lineTo(x + 9, y + 5 - o); g.moveTo(x - 5, y - 2); g.lineTo(x - 9, y - 7 - o); g.moveTo(x + 5, y - 2); g.lineTo(x + 9, y - 7 + o); g.stroke();
  for (let i = 0; i < men; i++) block(g, x - 7 + i * 5, y - 7, 3, 3, BLUE);
}
// A soft cloud of powder smoke or fog.
function cloud(g, x, y, r, alpha, color = "200,205,212") {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(${color},${alpha})`); grad.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
// A warm glow: campfires, muzzle flashes.
function glow(g, x, y, r, alpha) {
  const grad = g.createRadialGradient(x, y, 0, x, y, r);
  grad.addColorStop(0, `rgba(255,236,170,${alpha})`); grad.addColorStop(0.4, `rgba(240,140,40,${alpha * 0.8})`); grad.addColorStop(1, "rgba(200,60,20,0)");
  g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
// Engraved water: a pale wash crossed by fine ink lines that drift with the current.
function water(g, x, y, w, h, t, down = true) {
  px(g, x, y, w, h, "#dfe7ef");
  g.strokeStyle = "rgba(12,26,56,.28)"; g.lineWidth = 0.5;
  for (let i = 0; i < 40; i++) {
    const lx = x + ((i * 53) % w), ly = y + (((i * 37) + (down ? t * 26 : 0)) % h), lx2 = x + (((i * 53) + (down ? 0 : t * 18)) % w);
    g.beginPath();
    if (down) { g.moveTo(lx, ly); g.quadraticCurveTo(lx + 3, ly + 3, lx, ly + 7); } else { g.moveTo(lx2, ly); g.quadraticCurveTo(lx2 + 4, ly - 1.5, lx2 + 8, ly); }
    g.stroke();
  }
}
// Land on the plan: white paper, hachures along the shore, trees as stippled rings.
function land(g, x, y, w, h, shoreX = null, shoreY = null, seed = 1) {
  px(g, x, y, w, h, PAPER);
  g.strokeStyle = INK; g.lineWidth = 0.5;
  if (shoreX !== null) for (let yy = y; yy < y + h; yy += 3) { g.beginPath(); g.moveTo(shoreX, yy); g.lineTo(shoreX + (shoreX > x + w / 2 ? -4 : 4), yy + 2); g.stroke(); }
  if (shoreY !== null) for (let xx = x; xx < x + w; xx += 3) { g.beginPath(); g.moveTo(xx, shoreY); g.lineTo(xx + 2, shoreY + (shoreY > y + h / 2 ? -4 : 4)); g.stroke(); }
  let r = seed;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  for (let i = 0; i < Math.floor((w * h) / 260); i++) { const tx = x + 4 + rand() * (w - 8), ty = y + 4 + rand() * (h - 8); g.beginPath(); g.arc(tx, ty, 1.4, 0, Math.PI * 2); g.stroke(); }
}
const label = (g, text, x, y, size = 6, italic = true, align = "center") => { g.fillStyle = INK; g.font = `${italic ? "italic " : ""}${size}px "IM Fell English", Georgia, serif`; g.textAlign = align; g.fillText(text, x, y); };
// Sleet: fine grey streaks.
function sleet(g, flakes, dt) {
  g.strokeStyle = "rgba(90,100,115,.45)"; g.lineWidth = 0.5;
  for (const f of flakes) { f.y += f.v * dt; f.x -= 10 * dt; if (f.y > H) { f.y = -4; f.x = Math.random() * W; } if (f.x < 0) f.x = W; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x - 1.2, f.y + 3); g.stroke(); }
}
const flakesOf = (n) => Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 40 + Math.random() * 40 }));
const clockText = (startHour, hours, frac) => { const t = startHour + hours * Math.min(1, frac); const h = Math.floor(t) % 24, m = Math.floor((t % 1) * 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
// della Gatta's 1782 painting of Germantown, for the Chew House.
const GERMANTOWN = typeof Image !== "undefined" ? Object.assign(new Image(), { src: "img/scenes/battles/germantown.jpg" }) : null;


// ---------- the games ----------
const GAMES = {
  delaware() {
    const T = 75, NEED = 10;
    const S = { t: 0, loads: 0, by: 90, bx: 44, target: 90, stun: 0, floes: [], spawn: 0, hits: 0, flakes: flakesOf(70), splash: [] };
    const RIVER = [40, 280];
    const game = {
      over: false,
      press(x, y) { S.target = y; S.dragging = true; },
      drag(x, y) { S.target = y; },
      release() { S.dragging = false; },
      update(dt, keys) {
        S.t += dt;
        if (keys.ArrowUp) S.target = S.by - 30;
        if (keys.ArrowDown) S.target = S.by + 30;
        S.target = Math.max(14, Math.min(H - 14, S.target));
        // The boat: rowed across steadily, steered up and down.
        if (S.stun > 0) { S.stun -= dt; S.by += 14 * dt; }
        else { S.bx += 44 * dt; const d = S.target - S.by; S.by += Math.sign(d) * Math.min(Math.abs(d), 60 * dt); }
        S.by = Math.max(10, Math.min(H - 10, S.by));
        if (S.bx > RIVER[1] + 4) { S.loads++; S.bx = RIVER[0] + 4; sfx.tap(); if (S.loads >= NEED) game.over = true; }
        // Ice floes, thicker as the night goes on, carried down by the current.
        S.spawn -= dt;
        if (S.spawn <= 0) { S.spawn = Math.max(0.35, 1.1 - S.t / 90); const w = 10 + Math.random() * 26; S.floes.push({ x: RIVER[0] + 10 + Math.random() * (RIVER[1] - RIVER[0] - 20 - w), y: -12, w, h: 6 + Math.random() * 6, v: 14 + Math.random() * 22 + S.t * 0.25 }); }
        for (const f of S.floes) f.y += f.v * dt;
        S.floes = S.floes.filter((f) => f.y < H + 12);
        if (S.stun <= 0) for (const f of S.floes) {
          if (S.bx + 9 > f.x && S.bx - 9 < f.x + f.w && S.by + 3 > f.y && S.by - 3 < f.y + f.h) {
            S.stun = 1.3; S.hits++; S.bx -= 10; f.y += 10; sfx.gun(0); S.splash.push({ x: S.bx, y: S.by, t: 0.6 }); break;
          }
        }
        for (const s of S.splash) s.t -= dt;
        S.splash = S.splash.filter((s) => s.t > 0);
        battleDrums.setIntensity(0.3 + S.t / T * 0.6);
        if (S.t >= T) game.over = true;
      },
      draw(g) {
        const night = Math.min(1, S.t / T);
        // Pennsylvania and New Jersey in snow, the Delaware between, drawn as on a map of the crossing.
        land(g, 0, 0, RIVER[0], H, RIVER[0] - 1, null, 7); land(g, RIVER[1], 0, W - RIVER[1], H, RIVER[1] + 1, null, 11);
        water(g, RIVER[0], 0, RIVER[1] - RIVER[0], H, S.t, true);
        g.save(); g.translate(14, 90); g.rotate(-Math.PI / 2); label(g, "PENNSYLVANIA", 0, 0, 7, false); g.restore();
        g.save(); g.translate(W - 10, 90); g.rotate(Math.PI / 2); label(g, "NEW JERSEY", 0, 0, 7, false); g.restore();
        label(g, "McConkey's Ferry", 22, 12, 5.5); label(g, "Johnson's Ferry", W - 22, 12, 5.5);
        label(g, "River Delaware", (RIVER[0] + RIVER[1]) / 2, H - 6, 7);
        // Ice floes: white, outlined and shaded in ink.
        for (const f of S.floes) {
          g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 0.6;
          g.beginPath(); g.moveTo(f.x, f.y + f.h * 0.3); g.lineTo(f.x + f.w * 0.3, f.y); g.lineTo(f.x + f.w, f.y + f.h * 0.2); g.lineTo(f.x + f.w * 0.9, f.y + f.h); g.lineTo(f.x + f.w * 0.2, f.y + f.h * 0.9); g.closePath(); g.fill(); g.stroke();
          g.beginPath(); g.moveTo(f.x + f.w * 0.3, f.y + f.h * 0.7); g.lineTo(f.x + f.w * 0.7, f.y + f.h * 0.8); g.stroke();
        }
        // Glover's Durham boat, and ripples where it hits the ice.
        boat(g, S.bx, S.by, 3, S.t);
        for (const s of S.splash) { g.strokeStyle = `rgba(12,26,56,${s.t})`; g.lineWidth = 0.7; g.beginPath(); g.arc(s.x, s.y, 14 - s.t * 12, 0, Math.PI * 2); g.stroke(); }
        // The army waiting on the Pennsylvania shore, and the loads landed in New Jersey.
        for (let i = 0; i < NEED - S.loads - 1; i++) block(g, 6 + (i % 3) * 10, 150 - Math.floor(i / 3) * 12, 7, 9, BLUE);
        for (let i = 0; i < S.loads; i++) block(g, RIVER[1] + 6 + (i % 3) * 10, 150 - Math.floor(i / 3) * 12, 7, 9, BLUE);
        // Sleet, the dark of the night, and the grey of dawn coming.
        sleet(g, S.flakes, 1 / 60);
        g.fillStyle = `rgba(12,26,56,${0.22 * (1 - Math.max(0, night - 0.7) * 3)})`; g.fillRect(0, 0, W, H);
        if (night > 0.75) { g.fillStyle = `rgba(240,200,160,${(night - 0.75) * 0.8})`; g.fillRect(0, 0, W, H); }
      },
      hud: () => `${clockText(23, 4, S.t / T)} · ${S.loads} of ${NEED} loads across`,
      score: () => S.loads / NEED,
      result: () => S.loads >= NEED ? `The whole force was across by ${clockText(23, 4, S.t / T)}${S.hits ? `, though the ice held you up ${S.hits} time${S.hits > 1 ? "s" : ""}` : ""}. The army forms up on the Jersey shore and marches for Trenton in the sleet.`
        : S.loads >= 7 ? `Dawn came with ${S.loads} of ${NEED} loads across. Most of the army is over, but the rear will be late.` : `Only ${S.loads} of ${NEED} loads made it across before the sky began to lighten. The attack will go in weak, and perhaps not by surprise.`,
    };
    return game;
  },

  longisland() {
    const T = 75, TOTAL = 30;
    const S = { t: 0, waiting: TOTAL, saved: 0, boats: [0, 1, 2, 3].map((i) => ({ x: 70 + i * 55, y: 150, state: "dock", t: 0 })), fires: [0, 1, 2, 3, 4].map((i) => ({ x: 20 + i * 64, life: 1 })), pickets: 0, lost: 0, msg: "" };
    const game = {
      over: false,
      press(x, y) {
        // Stoke a fire?
        for (const f of S.fires) if (Math.abs(x - f.x) < 10 && y > 158) { f.life = 1; sfx.tap(); return; }
        // Launch a boat?
        for (const b of S.boats) if (b.state === "dock" && Math.abs(x - b.x) < 16 && Math.abs(y - b.y) < 14 && S.waiting > 0) { b.state = "out"; b.t = 0; S.waiting--; sfx.tap(); return; }
      },
      update(dt) {
        S.t += dt;
        for (const b of S.boats) {
          if (b.state === "out") { b.y -= 34 * dt; if (b.y <= 32) { b.state = "back"; S.saved++; } }
          else if (b.state === "back") { b.y += 48 * dt; if (b.y >= 150) { b.y = 150; b.state = "dock"; } }
        }
        for (const f of S.fires) f.life = Math.max(0, f.life - dt / 9);
        // The British pickets creep forward faster when the fires die and when the fog lifts at dawn.
        const dark = S.fires.filter((f) => f.life < 0.15).length;
        const fogGone = S.t > T * 0.8;
        S.pickets += dt * (0.4 + dark * 0.55 + (fogGone ? 1.4 : 0));
        battleDrums.setIntensity(0.25 + S.pickets / 100);
        if (S.saved >= TOTAL) game.over = true;
        if (S.pickets >= 100 || S.t >= T) game.over = true;
      },
      draw(g) {
        // New York at the top, Brooklyn at the bottom, the East River between, as on a map of the retreat.
        land(g, 0, 0, W, 26, null, 25, 5);
        for (let x = 14; x < W - 10; x += 24) { g.strokeStyle = INK; g.lineWidth = 0.5; g.strokeRect(x, 6, 12, 7); g.beginPath(); for (let k = 0; k < 12; k += 2) { g.moveTo(x + k, 6); g.lineTo(x + k + 2, 13); } g.stroke(); }
        label(g, "NEW YORK", W / 2, 22, 7, false);
        water(g, 0, 26, W, 128, S.t, false);
        label(g, "East River", W - 40, 92, 8);
        land(g, 0, 154, W, 26, null, 155, 9);
        label(g, "BROOKLYN", W - 30, 176, 6, false);
        // Companies waiting on the Brooklyn shore.
        for (let i = 0; i < S.waiting; i++) block(g, 8 + (i % 15) * 19, 160 + Math.floor(i / 15) * 8, 8, 5, BLUE);
        // Campfires: tap to stoke. A dying fire fades to a grey ring.
        for (const f of S.fires) {
          if (f.life > 0.05) glow(g, f.x, 174, 3 + f.life * 7, 0.55 + f.life * 0.4);
          g.strokeStyle = INK; g.lineWidth = 0.6; g.beginPath(); g.arc(f.x, 174, 2.5, 0, Math.PI * 2); g.stroke();
          if (f.life < 0.15) { g.strokeStyle = RED; g.beginPath(); g.arc(f.x, 174, 6, 0, Math.PI * 2); g.stroke(); }
        }
        // The boats: a ring around each one waiting at the shore for a company.
        for (const b of S.boats) {
          if (b.state === "dock" && S.waiting) { g.strokeStyle = RED; g.lineWidth = 0.8; g.setLineDash([2, 2]); g.beginPath(); g.arc(b.x, b.y - 2, 14, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); }
          boat(g, b.x, b.y, b.state === "out" ? 3 : 0, S.t);
        }
        // Companies safe on Manhattan.
        for (let i = 0; i < S.saved; i++) block(g, 6 + (i % 30) * 10, 15, 6, 4, BLUE);
        // Fog over the river, thick until dawn; the British pickets closing in from the left in red.
        const fog = S.t < T * 0.8 ? 1 : Math.max(0, 1 - (S.t - T * 0.8) / (T * 0.2));
        for (let i = 0; i < 9; i++) cloud(g, ((i * 41 + S.t * 6) % (W + 60)) - 30, 60 + ((i * 23) % 80), 46, 0.5 * fog, "235,238,242");
        const reach = (S.pickets / 100) * W;
        g.strokeStyle = RED; g.lineWidth = 1; g.setLineDash([3, 2]); g.beginPath(); g.moveTo(0, 157); g.lineTo(reach, 157); g.stroke(); g.setLineDash([]);
        for (let x = 4; x < reach; x += 22) block(g, x, 150, 9, 4, RED);
        g.fillStyle = "rgba(12,26,56,.18)"; g.fillRect(0, 0, W, H);
      },
      hud: () => `${clockText(22, 9, S.t / T)} · ${S.saved} of ${TOTAL} companies across · British pickets ${Math.round(S.pickets)}%`,
      score: () => S.saved / TOTAL,
      result: () => S.saved >= TOTAL ? `The last boat pulled away as the fog thinned. The whole army, about nine thousand men, is safe on Manhattan, and the British woke to find the lines empty.`
        : `${S.saved} of ${TOTAL} companies got across. ${TOTAL - S.saved} were left on the Brooklyn shore when the British came up, and were taken.`,
    };
    return game;
  },

  chew() {
    const T = 40;
    const WIN = [[152, 56], [175, 56], [198, 56], [237, 60], [262, 60], [200, 131]];
    const S = { t: 0, progress: 0, losses: 0, windows: WIN.map(() => ({ state: "idle", t: Math.random() * 2 })), bypass: false, hits: 0, silenced: 0, flashes: [] };
    const game = {
      over: false,
      press(x, y) {
        WIN.forEach(([wx, wy], i) => {
          const w = S.windows[i];
          if (Math.abs(x - wx) < 10 && Math.abs(y - wy) < 16 && w.state === "aim") { w.state = "quiet"; w.t = 3.2; S.silenced++; sfx.volley(4, 0); S.flashes.push({ x: wx, y: wy, t: 0.3 }); }
        });
      },
      extra() {
        return { key: String(S.bypass) + String(game.over), html: S.bypass || game.over ? "" : `<button class="bf-btn red" id="sp-bypass">Leave a regiment to watch the house, and push on</button>`, bind: (el) => { const b = el.querySelector("#sp-bypass"); if (b) b.onclick = () => { S.bypass = true; sfx.charge(0); }; } };
      },
      update(dt) {
        S.t += dt;
        // Windows take aim, fire, and fall quiet again. Unanswered shots cost men and time.
        for (const [i, w] of S.windows.entries()) {
          w.t -= dt;
          if (w.state === "idle" && w.t <= 0) { w.state = "aim"; w.t = S.bypass ? 1.3 : 1.05; }
          else if (w.state === "aim" && w.t <= 0) { w.state = "idle"; w.t = (S.bypass ? 0.9 : 1.6) + Math.random() * 2.2; S.hits++; S.losses += 18 + Math.random() * 14; S.progress -= 1.2; sfx.musket?.(); S.flashes.push({ x: WIN[i][0], y: WIN[i][1], t: 0.25, enemy: true }); }
          else if (w.state === "quiet" && w.t <= 0) { w.state = "idle"; w.t = 0.6 + Math.random() * 1.5; }
        }
        const firing = S.windows.filter((w) => w.state === "aim").length;
        S.progress += dt * (S.bypass ? 4.6 : 3.3) * (1 - firing * 0.12);
        S.progress = Math.max(0, S.progress);
        for (const f of S.flashes) f.t -= dt;
        S.flashes = S.flashes.filter((f) => f.t > 0);
        battleDrums.setIntensity(0.4 + firing * 0.1);
        if (S.progress >= 100 || S.t >= T) game.over = true;
      },
      draw(g) {
        // della Gatta's painting of the Chew House (1782), cropped close to the house.
        if ((GERMANTOWN && GERMANTOWN.complete && GERMANTOWN.naturalWidth)) g.drawImage(GERMANTOWN, 860, 300, 420, 236, 0, 0, W, H); else px(g, 0, 0, W, H, "#8a8f86");
        // The windows: a glow when a soldier inside takes aim, darkness when a volley has silenced it.
        WIN.forEach(([cx, cy], i) => {
          const w = S.windows[i];
          if (w.state === "aim") { glow(g, cx, cy, 16, 0.55 + 0.35 * Math.abs(Math.sin(S.t * 14))); g.strokeStyle = RED; g.lineWidth = 1.2; g.strokeRect(cx - 7, cy - 13, 14, 26); }
          if (w.state === "quiet") { g.fillStyle = "rgba(10,10,14,.55)"; g.fillRect(cx - 5, cy - 11, 10, 22); }
        });
        for (const f of S.flashes) cloud(g, f.x, f.y, 26, 0.8, f.enemy ? "255,210,140" : "240,240,232");
        // Smoke drifting off the house, and the fog lifting as the morning goes on.
        for (let i = 0; i < 6; i++) cloud(g, ((i * 61 + S.t * 8) % (W + 40)) - 20, 50 + ((i * 29) % 70), 28, 0.35);
        g.fillStyle = `rgba(200,206,200,${Math.max(0, 0.5 - S.t / T * 0.5)})`; g.fillRect(0, 0, W, H);
        // The American columns pushing past: blue blocks along the bottom of the picture.
        g.fillStyle = "rgba(251,250,246,.85)"; g.fillRect(0, H - 16, W, 16);
        const lead = (S.progress / 100) * (W + 40) - 30;
        for (let i = 0; i < 12; i++) { const x = lead - i * 12; if (x > -10 && x < W) block(g, x, H - 12, 9, 7, BLUE); }
        label(g, "The American columns", 6, H - 3, 6, true, "left");
      },
      hud: () => `${clockText(6, 2.5, S.t / T)} · columns past the house ${Math.min(100, Math.round(S.progress))}% · men lost ${Math.round(S.losses)}`,
      score: () => Math.max(0, Math.min(1, S.progress / 100) - Math.max(0, S.losses - 120) / 900),
      result: () => S.progress >= 100 ? `The columns got past the house with ${Math.round(S.losses)} men lost${S.bypass ? ", leaving a regiment to keep its garrison penned in" : ""}. The attack rolls on into Germantown.`
        : `The fog lifted with the columns still stuck at the Chew house, ${Math.round(S.losses)} men down. The attack has lost its momentum.`,
    };
    return game;
  },
};
