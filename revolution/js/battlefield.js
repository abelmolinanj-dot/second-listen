// The battlefield screen: a field battle you command, drawn as a battle plan of the period, the kind of map officers
// engraved after a battle: white paper, navy ink, regiments as red and blue blocks, hachured hills and stippled woods.
// You place your regiments in three lanes, then give each lane its orders while the battle runs:
// leave it to your general, hold, advance, charge or fall back. Send in the reserve, and ride the general
// along the line to rally the men. The simulation itself is in battle.js.

import { setupBattle, step, aiOrders, commitReserve, rally, finish, outcomeOf, LANES, LANE_NAMES, ORDERS, KINDS, TICKS } from "./battle.js";
import { flag } from "./soldiers.js";
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
// The three lanes as bands across the plan, seen from above like the period maps.
const LANE_Y = { left: 134, center: 224, right: 314 };
const LANE_S = { left: 1, center: 1, right: 1 };
const RESERVE_Y = 224;
const xOf = (x) => 70 + x * 6.6;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const INK = "#0c1a38";
// Colors of the period plans: Americans in blue, British in red, the Germans in a darker blue-black.
const FILL = { P: "#1d3f8f", B: "#c8102e", H: "#2e2a4a" };


// ---------- the plan ----------
function backdrop(b, rec) {
  let rr = 11;
  const rand = () => { rr = (rr * 16807) % 2147483647; return rr / 2147483647; };
  let s = `<defs>
    <pattern id="bp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#ffffff"/><line x1="0" y1="0" x2="0" y2="5" stroke="${FILL.P}" stroke-width="1.6"/></pattern>
    <pattern id="bp-town" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="4" stroke="${INK}" stroke-width=".8"/></pattern>
    <filter id="bp-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>`;
  // The sheet, with a double ruled border.
  s += `<rect width="${W}" height="${H}" fill="#fbfaf6"/><rect x="6" y="6" width="${W - 12}" height="${H - 12}" fill="none" stroke="${INK}" stroke-width="2"/><rect x="11" y="11" width="${W - 22}" height="${H - 22}" fill="none" stroke="${INK}" stroke-width=".7"/>`;
  // Fields and fences, faint, to give the ground some life.
  for (let i = 0; i < 14; i++) {
    const x = 60 + rand() * (W - 140), y = 80 + rand() * (H - 140), len = 40 + rand() * 70, bend = (rand() - 0.5) * 16;
    s += `<path d="M${x.toFixed(0)},${y.toFixed(0)} q${(len / 2).toFixed(0)},${bend.toFixed(0)} ${len.toFixed(0)},${(rand() * 8 - 4).toFixed(0)}" fill="none" stroke="#b9c2d3" stroke-width=".9" stroke-dasharray="1 2.5"/>`;
  }
  // The lanes, with dotted lines between them and their names in the margin.
  for (const y of [179, 269]) s += `<line x1="20" y1="${y}" x2="${W - 20}" y2="${y}" stroke="${INK}" stroke-width=".7" stroke-dasharray="1 4" opacity=".6"/>`;
  // A road across the field.
  s += `<path d="M20,${LANE_Y.center + 26} C220,${LANE_Y.center + 14} 420,${LANE_Y.center + 40} ${W - 20},${LANE_Y.center + 22}" fill="none" stroke="${INK}" stroke-width="3.2"/><path d="M20,${LANE_Y.center + 26} C220,${LANE_Y.center + 14} 420,${LANE_Y.center + 40} ${W - 20},${LANE_Y.center + 22}" fill="none" stroke="#fbfaf6" stroke-width="1.8"/>`;
  // The ground of each lane.
  for (const l of LANES) {
    const g = b.lanes[l].ground, y = LANE_Y[l];
    const defX = b.defender === "P" ? xOf(18) : xOf(82);
    if (g === "woods") for (let i = 0; i < 70; i++) {
      const x = 60 + rand() * (W - 120), yy = y - 38 + rand() * 76;
      s += `<circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r="${(2.4 + rand() * 1.6).toFixed(1)}" fill="#eef2e8" stroke="${INK}" stroke-width=".6"/><circle cx="${x.toFixed(0)}" cy="${yy.toFixed(0)}" r=".7" fill="${INK}"/>`;
    }
    if (g === "hill") for (let ring = 0; ring < 3; ring++) {
      const rx = 120 - ring * 34, ry = 34 - ring * 9;
      for (let a = 0; a < 360; a += 9 + ring * 3) {
        const t = (a * Math.PI) / 180, x1 = defX + Math.cos(t) * rx, y1 = y + Math.sin(t) * ry;
        s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${(x1 + Math.cos(t) * 6).toFixed(1)}" y2="${(y1 + Math.sin(t) * 3).toFixed(1)}" stroke="${INK}" stroke-width=".7" opacity=".7"/>`;
      }
    }
    if (g === "town") for (let i = 0; i < 9; i++) {
      const x = defX - 70 + (i % 3) * 48 + rand() * 6, yy = y - 30 + Math.floor(i / 3) * 22;
      s += `<rect x="${x.toFixed(0)}" y="${yy.toFixed(0)}" width="30" height="14" fill="url(#bp-town)" stroke="${INK}" stroke-width=".8"/>`;
    }
    if (g === "works") {
      const x = defX + (b.defender === "P" ? 34 : -34);
      let d = `M${x},${y - 40}`;
      for (let k = 0; k < 8; k++) d += ` L${x + (k % 2 ? 8 : -8) * (b.defender === "P" ? 1 : -1)},${y - 40 + (k + 1) * 10}`;
      s += `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2.2"/>`;
    }
  }
  // The cartouche, the references, the compass and the scale.
  s += `<g transform="translate(18,16)"><rect width="230" height="34" fill="#ffffff" stroke="${INK}" stroke-width="1.2"/><rect x="3" y="3" width="224" height="28" fill="none" stroke="${INK}" stroke-width=".5"/>
    <text x="115" y="15" text-anchor="middle" class="bp-title">Plan of the Battle of ${esc(rec.place)}</text>
    <text x="115" y="27" text-anchor="middle" class="bp-sub">${esc(rec.date)}</text></g>`;
  s += `<g transform="translate(${W - 170},20)" class="bp-ref"><text x="0" y="0">References</text>
    <rect x="0" y="6" width="14" height="6" fill="${FILL.P}"/><text x="19" y="12">American</text>
    <rect x="80" y="6" width="14" height="6" fill="${FILL.B}"/><text x="99" y="12">British</text>
    <rect x="0" y="18" width="14" height="6" fill="url(#bp-hatch)" stroke="${FILL.P}" stroke-width=".6"/><text x="19" y="24">Militia</text>
    <rect x="80" y="18" width="14" height="6" fill="${FILL.H}"/><text x="99" y="24">Hessian</text></g>`;
  s += `<g transform="translate(${W - 46},${H - 50})"><circle r="16" fill="none" stroke="${INK}" stroke-width=".6"/><path d="M0,-18 L4,0 L0,18 L-4,0 Z" fill="${INK}"/><path d="M-18,0 L0,3 L18,0 L0,-3 Z" fill="none" stroke="${INK}" stroke-width=".6"/><text y="-21" text-anchor="middle" class="bp-ref">N</text></g>`;
  s += `<g transform="translate(36,${H - 30})" class="bp-ref"><line x1="0" y1="0" x2="120" y2="0" stroke="${INK}" stroke-width="1.2"/>${[0, 30, 60, 90, 120].map((x) => `<line x1="${x}" y1="-3" x2="${x}" y2="3" stroke="${INK}"/>`).join("")}<text x="0" y="-6">Scale of yards</text><text x="0" y="13">0</text><text x="120" y="13" text-anchor="middle">500</text></g>`;
  return s;
}


// ---------- the screen ----------
export function playBattle({ state, att, def, regionId, opts = {}, onDone, replay = null, dateText = null, placeName = null }) {
  if (replay) regionId = replay.region;
  const b = replay ? fromRecord(replay) : setupBattle(state, att, def, regionId, opts, ((state.gameSeed ?? 1) * 7919 + state.turn * 131 + regionId.length * 17) >>> 0);
  // The recording of this battle, for replays.
  const rec = replay || {
    v: 1, region: regionId, place: placeName || REGIONS[regionId].name, date: dateText || dateLabel(state), attacker: b.attacker, defender: b.defender, lanes: b.lanes,
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
    <div class="bf-top"><div class="bf-title">The Battle of ${esc(rec.place)}</div><div class="bf-clock" id="bf-clock"></div></div>
    <div class="bf-strength"><span class="bf-p" id="bf-sp"></span><span class="bf-b" id="bf-sb"></span></div>
    <div class="bf-stage"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" id="bf-svg" xmlns="http://www.w3.org/2000/svg">
      <defs id="bf-defs"></defs><g id="bf-back">${backdrop(b, rec)}</g><g id="bf-fallen"></g><g id="bf-units"></g><g id="bf-smoke"></g></svg>
      <div class="bf-result" id="bf-result" hidden></div></div>
    <div class="bf-ticker" id="bf-ticker"></div>
    <div class="bf-controls" id="bf-controls"></div>`;
  document.body.appendChild(root);
  const $ = (id) => root.querySelector("#" + id);

  // ---- drawing the regiments, as blocks on the plan ----
  function unitBody(u) {
    const dir = u.side === "P" ? 1 : -1;
    const col = u.flag === "H" ? FILL.H : FILL[u.side];
    const front = Math.max(14, Math.min(52, 10 + Math.sqrt(Math.max(1, u.men)) * 0.95));
    const op = (0.35 + 0.65 * Math.max(0, u.morale) / 100).toFixed(2);
    let s = "";
    if (u.state === "routed") {
      // A broken regiment: scattered fragments, and an arrow back the way they came.
      for (let i = 0; i < 4; i++) s += `<rect x="${-dir * (i * 7) - 3}" y="${(i % 2 ? 6 : -8) - 2 + i * 2}" width="5" height="${4 + (i % 3) * 2}" fill="${col}" opacity=".6" transform="rotate(${(i * 37) % 60 - 30})"/>`;
      s += `<path d="M${-dir * 4},0 H${-dir * 30} M${-dir * 24},-4 L${-dir * 30},0 L${-dir * 24},4" fill="none" stroke="${col}" stroke-width="1.4"/>`;
    } else if (u.kind === "guns") {
      // A battery: the gun's carriage, its barrel and wheels.
      s += `<rect x="-7" y="-5" width="10" height="10" fill="${col}" fill-opacity="${op}" stroke="${INK}" stroke-width=".8"/><line x1="0" y1="0" x2="${dir * 16}" y2="0" stroke="${INK}" stroke-width="2.4"/><circle cx="-2" cy="-7" r="2.6" fill="#fff" stroke="${INK}" stroke-width=".8"/><circle cx="-2" cy="7" r="2.6" fill="#fff" stroke="${INK}" stroke-width=".8"/>`;
    } else if (u.kind === "rifles" || u.kind === "jagers") {
      // Riflemen in open order: a dotted skirmish line.
      for (let y = -front / 2; y <= front / 2; y += 5) s += `<rect x="-2" y="${y.toFixed(1)}" width="3.4" height="3.4" fill="${col}" fill-opacity="${op}"/>`;
    } else {
      // A line regiment in two ranks; militia hatched instead of solid.
      const fill = u.kind === "militia" ? "url(#bp-hatch)" : col;
      s += `<rect x="${dir > 0 ? -9 : 2}" y="${-front / 2}" width="5" height="${front}" fill="${fill}" fill-opacity="${op}" stroke="${col}" stroke-width=".8"/>`;
      s += `<rect x="${dir > 0 ? -2 : -5}" y="${-front / 2}" width="5" height="${front}" fill="${fill}" fill-opacity="${op}" stroke="${col}" stroke-width=".8"/>`;
      if (u.kind === "grenadiers") s += `<rect x="-11" y="${-front / 2 - 3}" width="22" height="2" fill="${INK}"/>`;
    }
    // Fire: fine lines toward the enemy while the regiment fires; crossed swords in close combat.
    if (u.state === "ok" && u.firing) for (let i = -1; i <= 1; i++) s += `<line class="bp-fire" x1="${dir * 6}" y1="${i * front / 3}" x2="${dir * 26}" y2="${i * front / 3 + i * 2}" stroke="${col}" stroke-width=".9" stroke-dasharray="3 2"/>`;
    if (u.state === "ok" && u.melee) s += `<path d="M${dir * 8},-7 l10,14 M${dir * 8 + 10},-7 l-10,14" stroke="${INK}" stroke-width="1.6"/>`;
    // The colors on a staff at the rear, with a streamer for each battle honor.
    if (u.state === "ok") {
      const back = -dir * 12;
      s += `<path d="M${back},${-front / 2} V${-front / 2 - 16}" stroke="${INK}" stroke-width="1"/><g transform="translate(${back},${-front / 2 - 16}) scale(.7)">${flag(u.flag)}</g>`;
      for (let i = 0; i < Math.min(4, u.honors || 0); i++) s += `<rect x="${back + 1}" y="${-front / 2 - 8 + i * 1.6}" width="${6 - i}" height="1" fill="${i % 2 ? "#c8102e" : INK}"/>`;
    }
    // Name, strength and morale, in the engraver's hand.
    const w = 54;
    const men = Math.max(0, u.men / u.start), mor = Math.max(0, u.morale / 100);
    s += `<g transform="translate(${-w / 2},${-front / 2 - 28})" class="bf-tag"><text x="${w / 2}" y="-2" text-anchor="middle">${esc(u.name)}${u.level ? " " + "★".repeat(u.level) : ""}</text>
      <rect width="${w}" height="3" fill="#dfe4ee"/><rect width="${(w * men).toFixed(1)}" height="3" fill="${col}"/>
      <rect y="4" width="${w}" height="2" fill="#dfe4ee"/><rect y="4" width="${(w * mor).toFixed(1)}" height="2" fill="${mor > 0.5 ? INK : mor > 0.25 ? "#b0601a" : "#c8102e"}"/></g>`;
    return s;
  }
  // Where a regiment stands on the plan. Several in one lane form one behind the other.
  function placeOf(u) {
    if (u.lane === "reserve") return [u.side === "P" ? xOf(-4) : xOf(104), RESERVE_Y + (u.side === "P" ? 0 : 0), 0.85];
    const mates = b.units.filter((v) => v.side === u.side && v.lane === u.lane && v.state !== "withdrawn");
    const i = mates.indexOf(u), dir = u.side === "P" ? 1 : -1;
    return [xOf(u.x) - dir * i * 26, LANE_Y[u.lane] + (i % 2 ? 18 : 0) - (mates.length > 1 ? 9 : 0), 1];
  }
  function drawUnits() {
    const layer = $("bf-units");
    for (const u of b.units) {
      let el = layer.querySelector(`[data-u="${u.id}"]`);
      if (!el) { el = document.createElementNS("http://www.w3.org/2000/svg", "g"); el.dataset.u = u.id; el.classList.add("bf-unit"); layer.appendChild(el); }
      if (u.state === "withdrawn" || (u.state === "routed" && (u.x < -12 || u.x > 112))) { el.remove(); continue; }
      const key = [u.state, u.firing, u.melee, Math.round(u.men / 50), Math.round(u.morale / 5), u.lane].join("|");
      if (el.dataset.key !== key) { el.dataset.key = key; el.innerHTML = unitBody(u); }
      const [x, y, k] = placeOf(u);
      el.style.transform = `translate(${x.toFixed(1)}px, ${y}px) scale(${k})`;
      el.style.opacity = u.lane === "reserve" ? 0.75 : 1;
    }
    // Where men fell, marked on the plan with small crosses.
    const fl = $("bf-fallen");
    for (; fallenShown < b.fallen.length; fallenShown++) {
      const [fx, lane, side] = b.fallen[fallenShown];
      const x = xOf(fx), y = LANE_Y[lane] + (Math.random() - 0.5) * 40;
      fl.insertAdjacentHTML("beforeend", `<path d="M${(x - 2).toFixed(1)},${(y - 2).toFixed(1)} l4,4 m0,-4 l-4,4" stroke="${side === "P" ? FILL.P : FILL.B}" stroke-width=".8" opacity=".55"/>`);
    }
  }
  // Powder smoke: soft grey clouds drifting off each firing line.
  function puffs() {
    const layer = $("bf-smoke");
    for (const u of b.units) {
      if (!(u.firing || u.melee) || u.state !== "ok") continue;
      const [x, y] = placeOf(u), dir = u.side === "P" ? 1 : -1;
      for (let i = 0; i < (u.kind === "guns" ? 2 : 1); i++) {
        const p = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        p.setAttribute("cx", (x + dir * (16 + Math.random() * 16)).toFixed(0)); p.setAttribute("cy", (y + (Math.random() - 0.5) * 30).toFixed(0));
        p.setAttribute("rx", (12 + Math.random() * 10).toFixed(0)); p.setAttribute("ry", (8 + Math.random() * 6).toFixed(0));
        p.setAttribute("class", "bf-cloud");
        p.setAttribute("filter", "url(#bp-soft)");
        layer.appendChild(p);
        setTimeout(() => p.remove(), 3000);
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
      svgEl.insertAdjacentHTML("afterbegin", `<style>.bf-tag text{font-family:Georgia,serif;font-size:10px;fill:#0c1a38;paint-order:stroke;stroke:#fbfaf6;stroke-width:3px}.bp-title{font-family:Georgia,serif;font-size:13px;fill:#0c1a38}.bp-sub,.bp-ref,.bp-lane{font-family:Georgia,serif;font-size:9px;fill:#0c1a38;font-style:italic}.bf-cloud{fill:#9aa0aa;opacity:.35}</style>`);
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
