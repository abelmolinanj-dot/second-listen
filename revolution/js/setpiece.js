// Set pieces: famous moments of the war played as short action games, on a 320 by 180 pixel canvas.
//   delaware:   Christmas night 1776. Steer the Durham boats through the ice and get the army across before dawn.
//   longisland: August 1776. Ferry the trapped army off Long Island by night, and keep the campfires burning.
//   chew:       Germantown, October 1777. Silence the stone house's windows while the columns push past it.
// playSetPiece(kind, onDone) calls onDone with a score from 0 to 1, or null if the player let the officers handle it.

import { sfx, music, battleDrums, stopMusic } from "./sound.js";

const W = 320, H = 180;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const INFO = {
  delaware: {
    title: "Crossing the Delaware",
    when: "Christmas night, 1776",
    intro: "Colonel Glover's Marblehead fishermen are rowing the army across the Delaware in big Durham boats, through sleet and floating ice. Washington wanted everyone across by midnight. Every load that reaches the Jersey shore before dawn keeps the surprise alive.",
    how: "Steer the boat up and down the river to dodge the ice: drag, tap above or below the boat, or use the arrow keys. It rows itself across. Ten loads carry the army, its horses and eighteen guns.",
    officers: "Let Glover's men handle it",
  },
  longisland: {
    title: "Escape from Long Island",
    when: "The night of August 29, 1776",
    intro: "The army is trapped on Long Island with the East River at its back. Washington has gathered every boat he can find, and Glover's Marbleheaders will row all night. The campfires must stay lit so the British think the lines are still manned.",
    how: "Tap a boat at the Brooklyn shore to send it across with a company; it rows back by itself. Tap a fading campfire to stoke it. If the fires die, the British pickets will notice. Morning fog will help, for a while.",
    officers: "Let Glover's men handle it",
  },
  chew: {
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
    <div class="sp-stage"><canvas id="sp-canvas" width="${W}" height="${H}"></canvas>
      <div class="sp-card" id="sp-card"><div class="sp-when">${esc(info.when)}</div><h2>${esc(info.title)}</h2><p>${esc(info.intro)}</p><p class="sp-how">${esc(info.how)}</p>
        <div class="sp-btns"><button class="bf-big" id="sp-go">Take command</button><button class="bf-btn" id="sp-skip">${esc(info.officers)}</button></div></div></div>
    <div class="sp-extra" id="sp-extra"></div>`;
  document.body.appendChild(root);
  const cv = root.querySelector("#sp-canvas"), g = cv.getContext("2d");
  g.imageSmoothingEnabled = false;
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

// ---------- drawing helpers ----------
const px = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function soldierPx(g, x, y, coat, step = 0, face = 1) {
  px(g, x + 1, y, 3, 1, "#17131a"); px(g, x, y + 1, 5, 1, "#17131a"); // hat
  px(g, x + 1, y + 2, 3, 2, "#d9a37c"); // face
  px(g, x + 1, y + 4, 3, 3, coat); px(g, x + 2, y + 4, 1, 3, "#e9e4d6"); // coat, belts
  px(g, x + 1 + (step ? 1 : 0), y + 7, 1, 2, "#e9e4d6"); px(g, x + 3 - (step ? 1 : 0), y + 7, 1, 2, "#e9e4d6"); // legs
  px(g, x + (face > 0 ? 4 : 0), y - 2, 1, 7, "#6d7480"); // musket
}
function snowfall(g, flakes, dt, wind = -8) {
  for (const f of flakes) { f.y += f.v * dt; f.x += wind * dt; if (f.y > H) { f.y = -2; f.x = Math.random() * W; } if (f.x < 0) f.x = W; px(g, f.x, f.y, 1, 1, "#ffffff"); }
}
const flakesOf = (n) => Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 18 + Math.random() * 30 }));
const clockText = (startHour, hours, frac) => { const t = startHour + hours * Math.min(1, frac); const h = Math.floor(t) % 24, m = Math.floor((t % 1) * 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };

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
        px(g, 0, 0, W, H, "#0d1424");
        // Banks: Pennsylvania on the left, New Jersey on the right, in snow.
        px(g, 0, 0, RIVER[0], H, "#c9d3de"); px(g, RIVER[1], 0, W - RIVER[1], H, "#c9d3de");
        for (let y = 4; y < H; y += 22) { px(g, 10, y, 4, 8, "#1f3320"); px(g, 8, y + 4, 8, 4, "#2a4428"); px(g, RIVER[1] + 16, y + 9, 4, 8, "#1f3320"); px(g, RIVER[1] + 14, y + 13, 8, 4, "#2a4428"); }
        // The river, with streaks of current.
        px(g, RIVER[0], 0, RIVER[1] - RIVER[0], H, "#24415e");
        for (let i = 0; i < 26; i++) { const y = ((i * 37 + S.t * 30) % (H + 10)) - 5; px(g, RIVER[0] + ((i * 53) % (RIVER[1] - RIVER[0] - 10)), y, 6, 1, "#3a5f80"); }
        for (const f of S.floes) { px(g, f.x, f.y, f.w, f.h, "#e6eef5"); px(g, f.x + 1, f.y + f.h - 2, f.w - 2, 2, "#a9bccd"); px(g, f.x + 2, f.y + 1, 3, 1, "#ffffff"); }
        // The Durham boat: dark hull, oars, men standing.
        const bx = S.bx, by = S.by;
        px(g, bx - 10, by - 2, 20, 5, "#3a2a1c"); px(g, bx - 8, by + 3, 16, 1, "#21160d");
        for (let i = -6; i <= 6; i += 6) { soldierPx(g, bx + i - 2, by - 12, "#24407a", Math.floor(S.t * 3) % 2); }
        const oar = Math.sin(S.t * 8) * 2;
        px(g, bx - 6, by + 3 + oar, 1, 4, "#8a6a45"); px(g, bx + 4, by + 3 - oar, 1, 4, "#8a6a45");
        for (const s of S.splash) px(g, s.x - 6, s.y - 6, 12 * s.t, 3, "#ffffff");
        // Loads waiting and loads landed.
        for (let i = 0; i < NEED - S.loads - 1; i++) soldierPx(g, 4 + (i % 3) * 9, 150 - Math.floor(i / 3) * 12, "#24407a");
        for (let i = 0; i < S.loads; i++) soldierPx(g, RIVER[1] + 4 + (i % 4) * 9, 150 - Math.floor(i / 4) * 12, "#24407a");
        // Sleet, and the sky lightening toward dawn.
        snowfall(g, S.flakes, 1 / 60);
        if (night > 0.75) { g.fillStyle = `rgba(230,170,120,${(night - 0.75) * 0.9})`; g.fillRect(0, 0, W, H); }
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
        px(g, 0, 0, W, H, "#0b1220");
        // Manhattan shore at the top, Brooklyn at the bottom, the East River between.
        px(g, 0, 0, W, 26, "#1d2418"); for (let x = 6; x < W; x += 30) { px(g, x, 8, 10, 8, "#3b2e24"); px(g, x + 3, 11, 2, 2, "#e8b84a"); }
        px(g, 0, 26, W, 128, "#14283e");
        for (let i = 0; i < 30; i++) { const y = 30 + ((i * 41) % 120), x = ((i * 67 + S.t * 18) % (W + 20)) - 10; px(g, x, y, 7, 1, "#22405e"); }
        px(g, 0, 154, W, 26, "#2a2418");
        // Companies waiting on the Brooklyn shore.
        for (let i = 0; i < S.waiting; i++) soldierPx(g, 8 + (i % 15) * 20, 164 - Math.floor(i / 15) * 9, "#24407a");
        // Campfires: tap to stoke.
        for (const f of S.fires) {
          px(g, f.x - 4, 175, 8, 2, "#3b2614");
          if (f.life > 0.05) { const h = 2 + f.life * 6; px(g, f.x - 2, 175 - h, 4, h, f.life > 0.4 ? "#ffb02e" : "#e8501f"); px(g, f.x - 1, 175 - h * 0.6, 2, h * 0.5, "#fff2a8"); }
          else px(g, f.x - 2, 171, 4, 4, "#555");
        }
        // Boats.
        for (const b of S.boats) {
          px(g, b.x - 12, b.y - 2, 24, 5, "#3a2a1c");
          if (b.state === "out") for (let i = -8; i <= 8; i += 8) soldierPx(g, b.x + i - 2, b.y - 11, "#24407a");
          if (b.state === "dock") { px(g, b.x - 12, b.y - 8, 24, 2, S.waiting ? "#e8d9a8" : "#555"); }
          const oar = Math.sin(S.t * 9 + b.x) * 2; px(g, b.x - 13, b.y + oar, 2, 1, "#8a6a45"); px(g, b.x + 11, b.y - oar, 2, 1, "#8a6a45");
        }
        // Companies safe on Manhattan.
        for (let i = 0; i < S.saved; i++) px(g, 6 + (i % 30) * 10, 20, 4, 4, "#24407a");
        // Fog, thick until near dawn, and the pickets' line creeping in from the left.
        const fog = S.t < T * 0.8 ? 0.35 : Math.max(0, 0.35 - (S.t - T * 0.8) / (T * 0.2) * 0.35);
        g.fillStyle = `rgba(200,210,220,${fog})`; g.fillRect(0, 26, W, 128);
        px(g, 0, 150, (S.pickets / 100) * W, 3, "#c8102e");
        for (let x = 4; x < (S.pickets / 100) * W; x += 26) soldierPx(g, x, 140, "#b8241e", Math.floor(S.t * 3) % 2);
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
    const WIN = [[118, 52], [148, 52], [178, 52], [118, 82], [148, 82], [178, 82]];
    const S = { t: 0, progress: 0, losses: 0, windows: WIN.map(() => ({ state: "idle", t: Math.random() * 2 })), bypass: false, hits: 0, silenced: 0, flashes: [] };
    const game = {
      over: false,
      press(x, y) {
        WIN.forEach(([wx, wy], i) => {
          const w = S.windows[i];
          if (Math.abs(x - (wx + 6)) < 12 && Math.abs(y - (wy + 7)) < 12 && w.state === "aim") { w.state = "quiet"; w.t = 3.2; S.silenced++; sfx.volley(4, 0); S.flashes.push({ x: wx, y: wy, t: 0.3 }); }
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
        // Fog over Germantown: grey-green, thinning as the morning goes on.
        px(g, 0, 0, W, H, "#59645a");
        px(g, 0, 120, W, 60, "#3d4a30");
        // The Chew house: grey stone, two floors of windows, a pitched roof.
        px(g, 104, 34, 100, 78, "#8a8579"); px(g, 98, 26, 112, 10, "#4a3a30"); px(g, 112, 18, 84, 10, "#3b2e26");
        for (let x = 104; x < 204; x += 8) px(g, x, 34, 1, 78, "#7a756a");
        px(g, 146, 92, 16, 20, "#3b2e26");
        WIN.forEach(([wx, wy], i) => {
          const w = S.windows[i];
          px(g, wx, wy, 12, 14, w.state === "quiet" ? "#2a2622" : "#1a1714");
          px(g, wx, wy + 6, 12, 1, "#8a8579"); px(g, wx + 6, wy, 1, 14, "#8a8579");
          if (w.state === "aim") { px(g, wx + 2, wy + 2, 8, 10, Math.floor(S.t * 10) % 2 ? "#c8102e" : "#e84a2a"); px(g, wx + 4, wy + 5, 4, 4, "#fff2a8"); }
        });
        for (const f of S.flashes) { g.fillStyle = f.enemy ? "rgba(255,210,120,.9)" : "rgba(240,240,230,.9)"; g.fillRect(f.x - 6, f.y - 4, 24, 22); }
        // The road, and the American columns pushing past along it.
        px(g, 0, 130, W, 10, "#6b5a40");
        const lead = (S.progress / 100) * (W + 40) - 30;
        for (let i = 0; i < 14; i++) { const x = lead - i * 11; if (x > -8 && x < W) soldierPx(g, x, 128 + (i % 2) * 4, "#24407a", Math.floor(S.t * 4 + i) % 2); }
        // Smoke drifting from the windows.
        g.fillStyle = "rgba(220,220,210,.35)";
        for (let i = 0; i < 8; i++) g.fillRect(((i * 47 + S.t * 9) % W), 40 + ((i * 29) % 60), 14, 8);
        // The fog, lifting.
        g.fillStyle = `rgba(190,198,190,${Math.max(0, 0.45 - S.t / T * 0.45)})`; g.fillRect(0, 0, W, H);
      },
      hud: () => `${clockText(6, 2.5, S.t / T)} · columns past the house ${Math.min(100, Math.round(S.progress))}% · men lost ${Math.round(S.losses)}`,
      score: () => Math.max(0, Math.min(1, S.progress / 100) - Math.max(0, S.losses - 120) / 900),
      result: () => S.progress >= 100 ? `The columns got past the house with ${Math.round(S.losses)} men lost${S.bypass ? ", leaving a regiment to keep its garrison penned in" : ""}. The attack rolls on into Germantown.`
        : `The fog lifted with the columns still stuck at the Chew house, ${Math.round(S.losses)} men down. The attack has lost its momentum.`,
    };
    return game;
  },
};
