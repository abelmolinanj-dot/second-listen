// The battlefield screen: a field battle you command, drawn in pixel art.
// You place your regiments in three lanes, then give each lane its orders while the battle runs:
// leave it to your general, hold, advance, charge or fall back. Send in the reserve, and ride the general
// along the line to rally the men. The simulation itself is in battle.js.

import { setupBattle, step, aiOrders, commitReserve, rally, finish, outcomeOf, LANES, LANE_NAMES, ORDERS, KINDS, TICKS } from "./battle.js";
import { pixelSoldier } from "./pixel.js";
import { UNIFORMS, flag } from "./soldiers.js";
import { REGIONS } from "./data/regions.js";
import { sfx, music, battleDrums, stopMusic } from "./sound.js";
import { menWords, noteHabit, dateLabel } from "./rules.js";

// ---------- replays ----------
// Every battle you command is recorded tick by tick; the last five are kept in this browser for the History Book.
const REPLAYS = "dispatches76-replays";
export function getReplays() { try { return JSON.parse(localStorage.getItem(REPLAYS) || "[]"); } catch { return []; } }
function saveReplay(rec) {
  let list = [rec, ...getReplays()].slice(0, 5);
  for (;;) { try { localStorage.setItem(REPLAYS, JSON.stringify(list)); return; } catch { if (list.length <= 1) return; list = list.slice(0, -1); } }
}
const snapUnits = (b) => b.units.map((u) => [Math.round(u.x * 10) / 10, u.lane, u.men, Math.round(u.morale), u.state[0], (u.firing ? 1 : 0) | (u.moving ? 2 : 0) | (u.melee ? 4 : 0)]);
const STATES = { o: "ok", r: "routed", w: "withdrawn" };
function applySnap(b, snap) {
  snap.forEach(([x, lane, men, morale, st, f], i) => Object.assign(b.units[i], { x, lane, men, morale, state: STATES[st], firing: !!(f & 1), moving: !!(f & 2), melee: !!(f & 4) }));
}
function fromRecord(rec) {
  const b = {
    region: rec.region, tick: 0, over: false, attacker: rec.attacker, defender: rec.defender, lanes: rec.lanes,
    orders: { P: {}, B: {} }, generals: { P: { short: rec.gName }, B: null }, generalLane: { P: "center", B: "center" }, rallies: { P: 0, B: 0 },
    units: rec.units.map((u) => ({ ...u })), fallen: [], events: [], armyMen: rec.armyMen,
  };
  applySnap(b, rec.start);
  return b;
}

const W = 800, H = 400;
const LANE_Y = { left: 196, center: 272, right: 356 };
const LANE_S = { left: 0.8, center: 0.94, right: 1.08 };
const RESERVE_Y = 236;
const xOf = (x) => 34 + x * 7.32;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function uniformKey(u) {
  if (u.flag === "P") return (u.kind === "militia" || u.kind === "rifles" ? "militia" : "continental") + (u.worn ? `~${u.worn}` : "");
  if (u.flag === "H") return u.kind === "jagers" ? "jagers" : "hessian";
  return "british";
}

// ---------- the scenery ----------
function backdrop(b) {
  const r = REGIONS[b.region];
  let rr = 11;
  const rand = () => { rr = (rr * 16807) % 2147483647; return rr / 2147483647; };
  // A dusky VGA sky in bands, dithered where the bands meet.
  const bands = ["#1b1424", "#2a1b2e", "#3d2433", "#5a3238", "#7c4438", "#a65e3c"];
  let s = `<defs>
    <pattern id="bf-dith" width="2" height="2" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="#000" opacity=".18"/><rect x="1" y="1" width="1" height="1" fill="#000" opacity=".18"/></pattern>
    <pattern id="bf-grass" width="6" height="4" patternUnits="userSpaceOnUse"><rect width="6" height="4" fill="#4b5a2c"/><rect x="1" y="1" width="1" height="1" fill="#5d6e35"/><rect x="4" y="3" width="1" height="1" fill="#3c4823"/></pattern>
  </defs>`;
  bands.forEach((c, i) => { s += `<rect y="${i * 22}" width="${W}" height="23" fill="${c}"/>`; });
  s += `<rect y="0" width="${W}" height="132" fill="url(#bf-dith)"/>`;
  // Distant hills, then the field.
  s += `<path d="M0,132 L60,118 L130,126 L210,108 L300,122 L380,112 L470,124 L560,104 L650,120 L730,110 L800,118 L800,150 L0,150 Z" fill="#2c2a2e"/>`;
  s += `<path d="M0,146 L90,136 L180,144 L270,132 L370,142 L460,134 L560,144 L660,130 L760,140 L800,138 L800,160 L0,160 Z" fill="#383a30"/>`;
  s += `<rect y="156" width="${W}" height="${H - 156}" fill="url(#bf-grass)"/>`;
  // The lanes, with a faint line between them.
  for (const y of [232, 312]) s += `<rect y="${y}" width="${W}" height="2" fill="#3c4823" opacity=".7"/>`;
  // Ground features.
  for (const l of LANES) {
    const g = b.lanes[l].ground, y = LANE_Y[l], k = LANE_S[l];
    const defX = b.defender === "P" ? 0.25 : 0.75;
    if (g === "woods") for (let i = 0; i < 26; i++) {
      const x = rand() * W, h = (16 + rand() * 14) * k, yy = y - 26 * k - rand() * 10;
      s += `<rect x="${(x - 1).toFixed(0)}" y="${(yy).toFixed(0)}" width="${Math.max(2, 3 * k).toFixed(0)}" height="${(h * 0.5).toFixed(0)}" fill="#2b1d12"/><path d="M${x.toFixed(0)},${(yy - h).toFixed(0)} l${(-8 * k).toFixed(0)},${(h * 0.8).toFixed(0)} h${(16 * k).toFixed(0)} Z" fill="${rand() < 0.5 ? "#1f3320" : "#2a4428"}"/>`;
    }
    if (g === "hill") s += `<path d="M${W * defX - 190},${y + 16} Q${W * defX},${y - 40} ${W * defX + 190},${y + 16} Z" fill="#5b6a34"/><path d="M${W * defX - 150},${y + 16} Q${W * defX},${y - 30} ${W * defX + 150},${y + 16} Z" fill="url(#bf-dith)"/>`;
    if (g === "town") for (let i = 0; i < 5; i++) {
      const x = W * defX - 120 + i * 52, hh = (22 + rand() * 18) * k;
      s += `<rect x="${x}" y="${y - 30 - hh}" width="${40 * k}" height="${hh}" fill="#6d4a3a" stroke="#120d10" stroke-width="2"/><path d="M${x - 4},${y - 30 - hh} L${x + 20 * k},${y - 46 - hh} L${x + 44 * k},${y - 30 - hh} Z" fill="#3b2620" stroke="#120d10" stroke-width="2"/><rect x="${x + 8}" y="${y - 22 - hh}" width="6" height="6" fill="#e8b84a" opacity=".8"/>`;
    }
    if (g === "works") s += `<rect x="${W * defX - (b.defender === "P" ? -60 : 60)}" y="${y - 10}" width="${14}" height="34" fill="#6b5230" stroke="#120d10" stroke-width="2"/>`;
  }
  return s;
}

// A field gun, in pixels.
const CANNON = `<g shape-rendering="crispEdges"><rect x="-2" y="-9" width="18" height="4" fill="#2a2a30"/><rect x="14" y="-10" width="3" height="6" fill="#1a1a1e"/><rect x="-6" y="-6" width="12" height="3" fill="#5a3a1e"/><rect x="-4" y="-7" width="8" height="8" fill="#120d10"/><rect x="-3" y="-6" width="6" height="6" fill="#7a5226"/><rect x="-1" y="-4" width="2" height="2" fill="#120d10"/></g>`;

// ---------- the screen ----------
export function playBattle({ state, att, def, regionId, opts = {}, onDone, replay = null, dateText = null }) {
  if (replay) regionId = replay.region;
  const b = replay ? fromRecord(replay) : setupBattle(state, att, def, regionId, opts, ((state.gameSeed ?? 1) * 7919 + state.turn * 131 + regionId.length * 17) >>> 0);
  // The recording of this battle, for replays.
  const rec = replay || {
    v: 1, region: regionId, place: REGIONS[regionId].name, date: dateText || dateLabel(state), attacker: b.attacker, defender: b.defender, lanes: b.lanes,
    gName: b.generals.P ? b.generals.P.short : "The colonel", armyMen: b.armyMen,
    units: b.units.map((u) => ({ id: u.id, side: u.side, flag: u.flag, kind: u.kind, name: u.name, start: u.start, level: u.level || 0, honors: u.honors || 0, worn: u.worn || 0, men: u.men, morale: u.morale, x: u.x, lane: u.lane, state: u.state })),
    frames: [], events: [], fallen: [],
  };
  let frame = 0;
  const mySide = "P";
  const lanePick = { left: "auto", center: "auto", right: "auto" }; // "auto" leaves the lane to the general
  let phase = replay ? "replay" : "deploy", speed = replay ? 2 : 1, paused = false, timer = null, shownEvents = 0, fallenShown = 0;
  const gName = b.generals.P ? b.generals.P.short : "The colonel";
  const defending = b.defender === mySide;

  const root = document.createElement("div");
  root.id = "battlefield";
  root.innerHTML = `
    <div class="bf-top"><div class="bf-title">The Battle of ${esc(REGIONS[regionId].name)}</div><div class="bf-clock" id="bf-clock"></div></div>
    <div class="bf-strength"><span class="bf-p" id="bf-sp"></span><span class="bf-b" id="bf-sb"></span></div>
    <div class="bf-stage"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" id="bf-svg" xmlns="http://www.w3.org/2000/svg">
      <defs id="bf-defs"></defs><g id="bf-back">${backdrop(b)}</g><g id="bf-fallen"></g><g id="bf-units"></g><g id="bf-smoke"></g></svg>
      <div class="bf-result" id="bf-result" hidden></div></div>
    <div class="bf-ticker" id="bf-ticker"></div>
    <div class="bf-controls" id="bf-controls"></div>`;
  document.body.appendChild(root);
  const $ = (id) => root.querySelector("#" + id);
  const defs = $("bf-defs");
  const made = new Set();
  const sym = (key, pose) => {
    const id = `bf-${key}-${pose}`;
    const [base, worn] = key.split("~");
    if (!made.has(id)) { made.add(id); defs.insertAdjacentHTML("beforeend", `<g id="${id}">${pixelSoldier(worn ? { ...UNIFORMS[base], worn: Number(worn) } : UNIFORMS[base], pose, 40)}</g>`); }
    return id;
  };

  // ---- drawing the regiments ----
  function unitPose(u) {
    if (u.state === "routed") return "routed";
    if (u.melee || u.firing) return "fire";
    if (u.moving) return "walk";
    return "stand";
  }
  function unitBody(u) {
    const key = uniformKey(u), dir = u.side === "P" ? 1 : -1, pose = unitPose(u);
    const n = Math.max(1, Math.min(8, Math.ceil(u.men / 220)));
    let s = "";
    if (u.kind === "guns") {
      s += `<g transform="scale(${dir * 1.6},1.6)">${CANNON}</g>`;
      for (let i = 0; i < Math.min(3, n + 1); i++) s += `<use href="#${sym(key, pose === "fire" ? (i % 2 ? "load" : "stand") : pose === "walk" ? "walk1" : "stand")}" transform="translate(${-dir * (14 + i * 9)},${2 + (i % 2) * 4}) scale(${dir},1)"/>`;
    } else for (let i = 0; i < n; i++) {
      const col = Math.floor(i / 2), row = i % 2;
      const x = -dir * col * 10 + (row ? -dir * 4 : 0), y = row ? 6 : 0;
      const face = pose === "routed" ? -dir : dir;
      const delay = ((i * 0.41 + u.id.length * 0.3) % 1.6).toFixed(2);
      if (pose === "fire") s += `<g transform="translate(${x},${y}) scale(${face},1)"><use class="bs-load" style="animation-delay:-${delay}s" href="#${sym(key, "load")}"/><use class="bs-fire" style="animation-delay:-${delay}s" href="#${sym(key, "fire")}"/></g>`;
      else if (pose === "walk" || pose === "routed") s += `<g transform="translate(${x},${y}) scale(${face},1)"><use class="bf-a" style="animation-delay:-${(i * 0.13).toFixed(2)}s" href="#${sym(key, "walk1")}"/><use class="bf-b" style="animation-delay:-${(i * 0.13).toFixed(2)}s" href="#${sym(key, "walk2")}"/></g>`;
      else s += `<use transform="translate(${x},${y}) scale(${face},1)" href="#${sym(key, "stand")}"/>`;
    }
    // The regiment's colors, carried at the back.
    if (u.state === "ok") {
      const back = -dir * (Math.ceil(n / 2) * 10 + 4);
      s += `<path d="M${back},4 V-46" stroke="#2b1d12" stroke-width="1.6"/><g class="flag" transform="translate(${back},-46) scale(${1.05})">${flag(u.flag)}</g>`;
      // Battle honors: a streamer on the colors for each one.
      for (let i = 0; i < Math.min(4, u.honors || 0); i++) s += `<rect x="${back + 1}" y="${-46 + 11 + i * 2}" width="${7 - i}" height="1.4" fill="${i % 2 ? "#c8102e" : "#f4efe2"}"/>`;
    }
    // Name, strength and morale.
    const w = 46;
    const men = Math.max(0, u.men / u.start), mor = Math.max(0, u.morale / 100);
    s += `<g transform="translate(${-w / 2},${-62})" class="bf-tag"><text x="${w / 2}" y="-3" text-anchor="middle">${esc(u.name)}${u.level ? " " + "★".repeat(u.level) : ""}</text>
      <rect width="${w}" height="4" fill="#120d10"/><rect width="${(w * men).toFixed(1)}" height="4" fill="${u.side === "P" ? "#6f8fd6" : "#d8564a"}"/>
      <rect y="5" width="${w}" height="3" fill="#120d10"/><rect y="5" width="${(w * mor).toFixed(1)}" height="3" fill="${mor > 0.5 ? "#e8d9a8" : mor > 0.25 ? "#e8a14a" : "#e0442f"}"/></g>`;
    return s;
  }
  // Where a regiment stands on screen. Several in one lane stand one behind the other, a little staggered.
  function placeOf(u) {
    if (u.lane === "reserve") return [u.side === "P" ? xOf(3) : xOf(97), RESERVE_Y, 0.74];
    const mates = b.units.filter((v) => v.side === u.side && v.lane === u.lane && v.state !== "withdrawn");
    const i = mates.indexOf(u), dir = u.side === "P" ? 1 : -1;
    return [xOf(u.x) - dir * i * 22, LANE_Y[u.lane] + (i % 2 ? 14 : 0) - (mates.length > 1 && i === 0 ? 8 : 0), LANE_S[u.lane]];
  }
  function drawUnits() {
    const layer = $("bf-units");
    const order = b.units.slice().sort((p, q) => placeOf(p)[1] - placeOf(q)[1]);
    for (const u of order) {
      let el = layer.querySelector(`[data-u="${u.id}"]`);
      if (!el) { el = document.createElementNS("http://www.w3.org/2000/svg", "g"); el.dataset.u = u.id; el.classList.add("bf-unit"); }
      if (u.state === "withdrawn" || (u.state === "routed" && (u.x < -6 || u.x > 106))) { el.remove(); continue; }
      const key = [unitPose(u), Math.ceil(u.men / 220), Math.round(u.men / u.start * 20), Math.round(u.morale / 5), u.lane, u.state].join("|");
      if (el.dataset.key !== key) { el.dataset.key = key; el.innerHTML = unitBody(u); }
      const [x, y, k] = placeOf(u);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y}px) scale(${k})`;
      el.style.opacity = u.lane === "reserve" ? 0.8 : u.state === "routed" ? 0.75 : 1;
      layer.appendChild(el); // nearer lanes drawn over farther ones
    }
    // Men who fell, left on the field.
    const fl = $("bf-fallen");
    for (; fallenShown < b.fallen.length; fallenShown++) {
      const [fx, lane, side] = b.fallen[fallenShown];
      const key = side === "P" ? "continental" : "british";
      fl.insertAdjacentHTML("beforeend", `<use href="#${sym(key, "fallen")}" transform="translate(${xOf(fx).toFixed(0)},${LANE_Y[lane] + 8}) scale(${LANE_S[lane] * (side === "P" ? 1 : -1)},${LANE_S[lane]})" opacity=".85"/>`);
    }
  }
  // Powder smoke drifting up from every firing line.
  function puffs() {
    const layer = $("bf-smoke");
    for (const u of b.units) {
      if (!(u.firing || u.melee) || u.state !== "ok") continue;
      const [x, y, k] = placeOf(u), dir = u.side === "P" ? 1 : -1;
      for (let i = 0; i < (u.kind === "guns" ? 3 : 2); i++) {
        const px = x + dir * (18 + Math.random() * 14) * k, py = y - (14 + Math.random() * 12) * k, sz = (6 + Math.random() * 8) * k;
        const p = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        p.setAttribute("x", px.toFixed(0)); p.setAttribute("y", py.toFixed(0));
        p.setAttribute("width", sz.toFixed(0)); p.setAttribute("height", sz.toFixed(0));
        p.setAttribute("class", "bf-puff");
        layer.appendChild(p);
        setTimeout(() => p.remove(), 2400);
      }
    }
  }

  // ---- the header and ticker ----
  function hud() {
    const hour = Math.min(10, Math.floor(b.tick / 4) + 1);
    const clock = 7 + Math.floor(b.tick / 4);
    $("bf-clock").textContent = phase === "deploy" ? (defending ? "Dawn. The enemy is coming." : "Dawn. Place your regiments.") : `${clock > 12 ? clock - 12 : clock}:00 ${clock >= 12 ? "pm" : "am"} · hour ${hour} of 10`;
    const str = (side) => b.units.filter((u) => u.side === side && u.state === "ok").reduce((s, u) => s + u.men * (0.3 + u.morale / 100), 0);
    const sp = str("P"), sb = str("B"), tot = sp + sb || 1;
    $("bf-sp").style.width = `${(sp / tot) * 100}%`;
    $("bf-sb").style.width = `${(sb / tot) * 100}%`;
    for (; shownEvents < b.events.length; shownEvents++) {
      const e = b.events[shownEvents];
      $("bf-ticker").insertAdjacentHTML("afterbegin", `<div class="bf-ev ${e.kind}">${esc(e.text)}</div>`);
    }
    while ($("bf-ticker").children.length > 4) $("bf-ticker").lastChild.remove();
    const heat = b.units.filter((u) => u.firing || u.melee).length / Math.max(1, b.units.length);
    battleDrums.setIntensity(0.25 + heat * 0.9);
  }

  // ---- the controls ----
  function controls() {
    const c = $("bf-controls");
    const mine = b.units.filter((u) => u.side === mySide);
    if (phase === "deploy") {
      const rows = mine.map((u) => `<div class="bf-row"><div class="bf-unitname"><b>${esc(u.name)}</b><small>${esc(KINDS[u.kind].label)} · ${menWords(u.men)}</small></div>
        <div class="bf-btns">${[...LANES, "reserve"].map((l) => `<button class="bf-btn${u.lane === l ? " on" : ""}" data-place="${u.id}" data-lane="${l}">${l === "reserve" ? "Reserve" : LANE_NAMES[l]}</button>`).join("")}</div></div>`).join("");
      c.innerHTML = `<div class="bf-h">${defending ? "The British are attacking. Place your regiments to receive them." : "Your regiments."} The left flank is the top lane, the right flank the bottom.</div>${rows}
        <div class="bf-row"><div class="bf-unitname"><b>${esc(gName)}</b><small>rides with the</small></div><div class="bf-btns">${LANES.map((l) => `<button class="bf-btn${b.generalLane.P === l ? " on" : ""}" data-glane="${l}">${LANE_NAMES[l]}</button>`).join("")}</div></div>
        <div class="bf-actions"><button class="bf-big" id="bf-go">Begin the battle</button><button class="bf-btn" id="bf-quick">Let ${esc(gName)} fight it</button>${defending ? "" : `<button class="bf-btn" id="bf-cancel">Call off the attack</button>`}</div>`;
      for (const x of c.querySelectorAll("[data-place]")) x.onclick = () => { const u = b.units.find((v) => v.id === x.dataset.place); u.lane = x.dataset.lane; sfx.tap(); drawUnits(); controls(); };
      for (const x of c.querySelectorAll("[data-glane]")) x.onclick = () => { b.generalLane.P = x.dataset.glane; sfx.tap(); controls(); };
      $("bf-go").onclick = begin;
      $("bf-quick").onclick = () => close("quick");
      if ($("bf-cancel")) $("bf-cancel").onclick = () => close(null);
      return;
    }
    if (phase === "replay") {
      c.innerHTML = `<div class="bf-h">A replay of the battle of ${esc(rec.place)}, ${esc(rec.date)}.</div><div class="bf-actions"><button class="bf-btn" id="bf-pause">${paused ? "Resume" : "Pause"}</button><button class="bf-btn" id="bf-speed">Speed ${speed}x</button><button class="bf-btn" id="bf-pic">Save a picture</button><button class="bf-btn" id="bf-close">Close</button></div>`;
      $("bf-pause").onclick = () => { paused = !paused; controls(); if (!paused) replayLoop(); };
      $("bf-speed").onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; controls(); };
      $("bf-pic").onclick = savePicture;
      $("bf-close").onclick = () => close(null);
      return;
    }
    if (phase !== "fight") { c.innerHTML = ""; return; }
    const laneRows = LANES.map((l) => {
      const ours = mine.filter((u) => u.lane === l && u.state === "ok"), theirs = b.units.filter((u) => u.side !== mySide && u.lane === l && u.state === "ok");
      const who = ours.length ? ours.map((u) => esc(u.name)).join(", ") : "<i>nobody</i>";
      const vs = theirs.length ? theirs.map((u) => esc(u.name)).join(", ") : "<i>clear</i>";
      const btns = ["auto", "hold", "advance", "charge", "fallback"].map((o) => `<button class="bf-btn${lanePick[l] === o ? " on" : ""}${o === "charge" ? " red" : ""}" data-order="${l}" data-o="${o}" title="${esc(o === "auto" ? `${gName} decides` : ORDERS[o].hint)}">${o === "auto" ? "General" : ORDERS[o].label}</button>`).join("");
      return `<div class="bf-row"><div class="bf-unitname"><b>${LANE_NAMES[l]}${b.generalLane.P === l ? " ★" : ""}</b><small>${who} <span class="bf-vs">vs</span> ${vs}</small></div><div class="bf-btns">${ours.length ? btns : ""}</div></div>`;
    }).join("");
    const reserve = mine.find((u) => u.lane === "reserve" && u.state === "ok");
    c.innerHTML = `${laneRows}
      ${reserve ? `<div class="bf-row"><div class="bf-unitname"><b>Reserve</b><small>${esc(reserve.name)}, ${menWords(reserve.men)}: send to the</small></div><div class="bf-btns">${LANES.map((l) => `<button class="bf-btn" data-res="${l}">${LANE_NAMES[l]}</button>`).join("")}</div></div>` : ""}
      <div class="bf-row"><div class="bf-unitname"><b>${esc(gName)}</b><small>rides to the</small></div><div class="bf-btns">${LANES.map((l) => `<button class="bf-btn${b.generalLane.P === l ? " on" : ""}" data-glane="${l}">${LANE_NAMES[l]}</button>`).join("")}<button class="bf-btn red" id="bf-rally" ${b.rallies.P ? "" : "disabled"}>Rally (${b.rallies.P})</button></div></div>
      <div class="bf-actions"><button class="bf-btn" id="bf-pause">${paused ? "Resume" : "Pause"}</button><button class="bf-btn" id="bf-speed">Speed ${speed}x</button><button class="bf-btn" id="bf-retreat">${defending ? "Give up the field" : "Retreat the army"}</button></div>`;
    for (const x of c.querySelectorAll("[data-order]")) x.onclick = () => {
      lanePick[x.dataset.order] = x.dataset.o; sfx.tap();
      if (x.dataset.o === "charge") noteHabit(state, "charge");
      if (x.dataset.o === "fallback") noteHabit(state, "retreat");
      if (x.dataset.o === "charge") sfx.charge({ left: -0.3, center: 0, right: 0.3 }[x.dataset.order]);
      applyOrders(); controls();
    };
    for (const x of c.querySelectorAll("[data-res]")) x.onclick = () => { commitReserve(b, mySide, x.dataset.res); sfx.tap(); drawUnits(); hud(); controls(); };
    for (const x of c.querySelectorAll("[data-glane]")) x.onclick = () => { b.generalLane.P = x.dataset.glane; sfx.tap(); controls(); };
    $("bf-rally").onclick = () => { if (rally(b, mySide)) { sfx.charge(0); drawUnits(); hud(); controls(); } };
    $("bf-pause").onclick = () => { paused = !paused; controls(); if (!paused) loop(); };
    $("bf-speed").onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; controls(); };
    $("bf-retreat").onclick = () => { finish(b, mySide); end(); };
  }
  function applyOrders() {
    aiOrders(b, mySide, { lanesOnly: true }); // the general's choice for lanes left to him
    for (const l of LANES) if (lanePick[l] !== "auto") b.orders[mySide][l] = lanePick[l];
  }

  // ---- running the battle ----
  function begin() {
    phase = "fight";
    rec.start = snapUnits(b);
    sfx.drumroll();
    stopMusic();
    battleDrums.start();
    applyOrders();
    controls(); hud();
    timer = setTimeout(loop, 700);
  }
  function loop() {
    clearTimeout(timer);
    if (paused || phase !== "fight") return;
    aiOrders(b, mySide === "P" ? "B" : "P");
    applyOrders();
    const charging = LANES.filter((l) => b.orders.B[l] === "charge" && !b._bCharge?.[l]);
    for (const l of charging) { (b._bCharge ||= {})[l] = true; sfx.charge(0.4); }
    step(b);
    rec.frames.push({ u: snapUnits(b), ev: b.events.length, fl: b.fallen.length });
    drawUnits(); puffs(); hud();
    // Sounds: each side's volleys from its own side of the stereo field, and the guns.
    for (const side of ["P", "B"]) {
      const firing = b.units.filter((u) => u.side === side && u.state === "ok" && u.firing && u.kind !== "guns").length;
      if (firing) sfx.volley(firing * 2, side === "P" ? -0.5 : 0.5);
      if (b.units.some((u) => u.side === side && u.kind === "guns" && u.firing) && b.tick % 2 === 0) sfx.gun(side === "P" ? -0.6 : 0.6);
    }
    if (b.tick % 3 === 0) controls(); // keep the lane lists current without rebuilding every tick
    if (b.over) { end(); return; }
    timer = setTimeout(loop, 900 / speed);
  }
  function end() {
    clearTimeout(timer);
    phase = "over";
    battleDrums.stop();
    drawUnits(); hud(); controls();
    const o = outcomeOf(b);
    const won = (b.attacker === mySide) === o.attackerWins;
    if (won) music.victory(); else music.dirge();
    const myLoss = Math.round(b.armyMen[mySide] * b[`loss${mySide}`]);
    const foe = mySide === "P" ? "B" : "P";
    const theirLoss = Math.round(b.armyMen[foe] * b[`loss${foe}`]);
    const moments = b.events.filter((e) => /breaks and runs|break and run|flank is open|rides along/.test(e.text)).slice(-4);
    rec.events = b.events; rec.fallen = b.fallen;
    rec.result = { won, verdict: won ? "Victory" : b.attacker === mySide ? "The attack failed" : "Defeat", myLoss, theirLoss };
    saveReplay(rec);
    const res = $("bf-result");
    res.hidden = false;
    res.innerHTML = `<div class="bf-card ${won ? "won" : "lost"}">
      <div class="bf-verdict">${won ? "Victory" : b.attacker === mySide ? "The attack has failed" : "Defeat"}</div>
      <p>${won ? (b.attacker === mySide ? "The enemy is driven from the field." : "The enemy is thrown back.") : b.attacker === mySide ? "The army falls back to where it started." : "The army is driven from the field."}</p>
      <p>Your losses: <b>${menWords(myLoss)}</b> · The enemy's: <b>${menWords(theirLoss)}</b></p>
      ${moments.length ? `<ul>${moments.map((e) => `<li>${esc(e.text)}</li>`).join("")}</ul>` : ""}
      <div class="bf-actions"><button class="bf-big" id="bf-done">Continue</button><button class="bf-btn" id="bf-pic">Save a picture</button></div></div>`;
    $("bf-done").onclick = () => close(o);
    $("bf-pic").onclick = savePicture;
  }

  // ---- watching a replay ----
  function replayLoop() {
    clearTimeout(timer);
    if (paused || phase !== "replay") return;
    const f = rec.frames[frame++];
    if (!f) { replayEnd(); return; }
    applySnap(b, f.u);
    b.tick = frame;
    b.events = rec.events.slice(0, f.ev);
    b.fallen = rec.fallen.slice(0, f.fl);
    drawUnits(); puffs(); hud();
    for (const side of ["P", "B"]) {
      const firing = b.units.filter((u) => u.side === side && u.state === "ok" && u.firing && u.kind !== "guns").length;
      if (firing) sfx.volley(firing * 2, side === "P" ? -0.5 : 0.5);
    }
    timer = setTimeout(replayLoop, 900 / speed);
  }
  function replayEnd() {
    battleDrums.stop();
    const r = rec.result || {};
    const res = $("bf-result");
    res.hidden = false;
    res.innerHTML = `<div class="bf-card ${r.won ? "won" : "lost"}"><div class="bf-verdict">${esc(r.verdict || "The end")}</div>
      <p>Your losses: <b>${menWords(r.myLoss || 0)}</b> · The enemy's: <b>${menWords(r.theirLoss || 0)}</b></p>
      <div class="bf-actions"><button class="bf-big" id="bf-done">Close</button><button class="bf-btn" id="bf-pic">Save a picture</button></div></div>`;
    $("bf-done").onclick = () => close(null);
    $("bf-pic").onclick = savePicture;
  }

  // ---- a picture of the field, to keep or share ----
  async function savePicture() {
    try {
      const svgEl = $("bf-svg").cloneNode(true);
      svgEl.setAttribute("width", W); svgEl.setAttribute("height", H);
      svgEl.insertAdjacentHTML("afterbegin", `<style>.bf-tag text{font-family:monospace;font-size:11px;fill:#f4efe2;paint-order:stroke;stroke:#120d10;stroke-width:2.4px}.bf-puff{fill:#e9e4d8;opacity:.6}.bs-fire,.bf-b{display:none}</style>`);
      // CSS transforms don't survive the trip into an image, so write each regiment's place as an attribute.
      for (const el of svgEl.querySelectorAll(".bf-unit")) {
        const m = (el.style.transform || "").match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
        if (m) { el.setAttribute("transform", `translate(${m[1]} ${m[2]}) scale(${m[3]})`); el.style.transform = ""; }
      }
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svgEl)], { type: "image/svg+xml" }));
      const img = new Image();
      await new Promise((ok, fail) => { img.onload = ok; img.onerror = fail; img.src = url; });
      const cv = document.createElement("canvas");
      cv.width = W * 2; cv.height = H * 2 + 90;
      const g = cv.getContext("2d");
      g.imageSmoothingEnabled = false;
      g.fillStyle = "#0c1a38"; g.fillRect(0, 0, cv.width, cv.height);
      g.drawImage(img, 0, 0, W * 2, H * 2);
      URL.revokeObjectURL(url);
      g.fillStyle = "#c8102e"; g.fillRect(0, H * 2, cv.width, 6);
      g.fillStyle = "#ffffff"; g.font = "bold 40px Georgia, serif";
      g.fillText(`The Battle of ${rec.place}, ${rec.date}`, 24, H * 2 + 52);
      g.font = "28px Georgia, serif"; g.fillStyle = "#dfe6f6";
      const verdict = rec.result ? rec.result.verdict : "";
      g.fillText(`${verdict} · Dispatches of '76`, 24, H * 2 + 84);
      const blob = await new Promise((ok) => cv.toBlob(ok, "image/png"));
      const file = new File([blob], `battle-of-${rec.place.toLowerCase().replace(/[^a-z]+/g, "-")}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: `The Battle of ${rec.place}` }); return; }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      window.__lastPicture = file.name;
    } catch { /* sharing was cancelled, or the picture could not be made */ }
  }
  function close(result) {
    clearTimeout(timer);
    battleDrums.stop();
    root.remove();
    onDone(result);
  }

  drawUnits(); hud(); controls();
  if (replay) { stopMusic(); battleDrums.start(); timer = setTimeout(replayLoop, 600); }
  return b;
}
