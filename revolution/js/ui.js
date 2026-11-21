// Everything on screen: the map, the bottom/side panel, letters, the ledger and the menus.

import { REGIONS } from "./data/regions.js";
import { WIDTH, HEIGHT, project, buildRegionShapes, polygonPath, linePath, seaPath, MAINLAND, ISLANDS, LAKES, RIVERS, pointInPolygon } from "./geo.js";
import {
  condOf, condLabel, marchInfo, armyList, armyAt, armyMen, militiaMen, generalOf, moveTargets, winChance, oddsLabel, moveArmy, digIn, recruit, canRecruit,
  regularsCost, militiaCost, printMoney, monthlyIncome, monthlyUpkeep, regionIncome, assignGeneral, reserveGenerals,
  dateLabel, isWinter, money, fmtMen, menWords, COST, RECRUIT_BATCH, MILITIA_MONTHS, describeArmy, SIDES, WEATHER, season,
  supplyPath, buildDepot, SUPPLY_RANGE, DEPOT_COST, TACTICS, flankChance,
} from "./rules.js";
import { newGame, endTurn, resumeBritishAttack, scenarioOf, SAVE_VERSION } from "./turn.js";
import { answerLetter, unanswered, urgent, trayLetters, senderName, senderRole, EVENTS } from "./letters.js";
import { FIGURES, FIGURE_GROUPS } from "./data/figures.js";
import { randomQuote } from "./data/quotes.js";
import { awardHonors, noteFact, noteLetter, recordDaily } from "./book.js";
import { applyLegacy, recordLegacy, getLegacy } from "./legacy.js";
import { TERRAIN_DEFS, terrainLayer, overlayLayer, placeIcons, waterLayer, extraLand, mapLettering } from "./terrain.js";
import { SOLDIER_DEFS, armyFigure, battleMarker, bust, battleScene } from "./soldiers.js";
import { playBattle } from "./battlefield.js";
import { playSetPiece } from "./setpiece.js";
import { applySeason, resetSeason, LIVING_DEFS, smokeColumn, SHIP, arrowPath } from "./living.js";
import { assignRegiments, kindsFor, recordOf, levelOf, LEVELS } from "./regiments.js";
import { STYLES, setupRival } from "./rival.js";
import { ROLES } from "./roles.js";
import { playScene } from "./scenes.js";
import { PORTRAITS } from "./data/assets.js";
import { FACTS } from "./data/facts.js";
import { sfx, music, soundPrefs, setSfx, setMusic, setVolume, setVoice, speak, stopSpeaking } from "./sound.js";
import { askConfirm } from "./confirm.js";
import { createTutorial } from "./tutorial.js";
import { createFrontend, recordResult } from "./frontend.js";

const SAVE_KEY = "dispatches76-save";
const PLAYED_KEY = "dispatches76-played";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let state = null;
const ui = { army: null, region: null, target: null, split: false };
const shapes = buildRegionShapes(REGIONS);
const seeds = Object.fromEntries(Object.entries(REGIONS).map(([id, r]) => [id, project(r.seed)]));

// ---------- saving ----------
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch { /* storage unavailable: play on without saving */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.version === SAVE_VERSION ? s : null;
  } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } }
function hasPlayed() { try { return !!localStorage.getItem(PLAYED_KEY); } catch { return false; } }
function markPlayed() { try { localStorage.setItem(PLAYED_KEY, "1"); } catch { /* ignore */ } }

const tutorial = createTutorial({ getState: () => state, save });

// ---------- "Did you know?" ----------
function monthKey() {
  const m = state.startMonth + state.turn;
  return `${state.startYear + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
}
// Take the first unseen fact that matches, and remember it so it isn't shown again this campaign.
function takeFact(match) {
  state.factsSeen ||= [];
  const i = FACTS.findIndex((f, idx) => !state.factsSeen.includes(idx) && match(f));
  if (i < 0) return null;
  state.factsSeen.push(i);
  noteFact(i);
  return FACTS[i];
}
function monthlyFact(regions = []) {
  const key = monthKey();
  return takeFact((f) => f.when === key)
    || takeFact((f) => f.when && f.when < key)
    || takeFact((f) => !f.when && f.region && regions.includes(f.region))
    || takeFact((f) => f.topic && (f.topic !== "winter" || isWinter(state)))
    || takeFact((f) => !f.when);
}
// A region's note: one that has already happened by this month, rotating as the months pass.
function regionFact(id) {
  const key = monthKey();
  const list = FACTS.filter((f) => f.region === id && (!f.when || f.when <= key));
  if (!list.length) return null;
  const f = list[state.turn % list.length];
  const idx = FACTS.indexOf(f);
  state.factsSeen ||= [];
  if (!state.factsSeen.includes(idx)) state.factsSeen.push(idx);
  noteFact(idx);
  return f;
}
const factHtml = (f) => (f ? `<div class="didyouknow"><b>Did you know?</b> ${esc(f.text)}</div>` : "");

// ---------- map ----------
const svg = $("#map");
const view = { x: 0, y: 0, w: WIDTH, h: HEIGHT };

function buildMap() {
  const regionPaths = (cls) => Object.entries(shapes).map(([id, poly]) => `<path class="${cls}" data-region="${id}" d="${polygonPath(poly)}"/>`).join("");
  let s = `<defs>${TERRAIN_DEFS}${SOLDIER_DEFS}${LIVING_DEFS}</defs>`;
  resetSeason();
  s += `<rect x="-2000" y="-2000" width="${WIDTH + 4000}" height="${HEIGHT + 4000}" fill="var(--sea)"/>`;
  s += `<g id="land">${regionPaths("land")}${extraLand()}</g>`;
  s += `<g class="deco">${terrainLayer(shapes, seeds)}</g>`;
  s += `<g id="regions">${regionPaths("region")}</g>`;
  s += `<path class="sea" fill-rule="evenodd" d="${seaPath()}"/>`;
  s += waterLayer(); // the real coast, lakes, rivers and colony borders
  s += `<g class="deco">${overlayLayer(seeds)}${mapLettering(seeds)}${placeIcons(seeds)}</g>`;
  s += `<g id="marks">`;
  for (const [id, r] of Object.entries(REGIONS)) {
    const [x, y] = seeds[id];
    s += `<text class="label${r.city ? " city" : ""}" x="${x}" y="${y + 33}">${esc(r.name)}</text>`;
  }
  // The season's tint over the land (snow in winter, autumn color), and ships sailing offshore.
  s += `</g><rect id="season-tint" clip-path="url(#landclip)" x="0" y="0" width="${WIDTH}" height="${HEIGHT}"/>`;
  s += `<g id="ships">${[[-72.4, 40.35, 70], [-73.55, 39.55, 55], [-70.6, 41.95, 80], [-74.6, 38.9, 64]].map(([lon, lat, dur], i) => {
    const [x, y] = project([lon, lat]);
    return `<g class="ship" style="--dur:${dur}s;--delay:-${i * 13}s" transform="translate(${x.toFixed(0)},${y.toFixed(0)})"><g class="ship-bob">${SHIP}</g></g>`;
  }).join("")}</g>`;
  s += `<g id="highlights"></g><g id="fx"></g><g id="booms"></g><g id="tokens"></g><g id="replay"></g>`;
  svg.innerHTML = s;
  fitView();
}

function setView() { svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`); }

function fitView(focus) {
  const rect = svg.getBoundingClientRect();
  const aspect = rect.width / Math.max(1, rect.height);
  // Start zoomed on the New York – Philadelphia corridor, where the 1776 campaign happens.
  const [x0, y0, x1, y1] = focus ? [0, 0, WIDTH, HEIGHT] : corridorBox();
  let w = x1 - x0, h = y1 - y0;
  if (w / h > aspect) h = w / aspect; else w = h * aspect;
  view.w = w; view.h = h;
  view.x = (x0 + x1) / 2 - w / 2;
  view.y = (y0 + y1) / 2 - h / 2;
  setView();
}
function corridorBox() {
  const ids = scenarioOf(state).SCENARIO.focus;
  const pts = ids.map((id) => seeds[id]);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs) - 30, Math.min(...ys) - 40, Math.max(...xs) + 30, Math.max(...ys) + 40];
}

function zoomAt(factor, cx, cy) {
  const nw = Math.min(WIDTH * 1.6, Math.max(180, view.w * factor));
  const k = nw / view.w;
  view.x = cx - (cx - view.x) * k;
  view.y = cy - (cy - view.y) * k;
  view.w = nw;
  view.h *= k;
  setView();
}

function toMap(clientX, clientY) {
  const r = svg.getBoundingClientRect();
  return [view.x + ((clientX - r.left) / r.width) * view.w, view.y + ((clientY - r.top) / r.height) * view.h];
}

// Pointer handling: drag to pan, pinch or wheel to zoom, tap to select.
const pointers = new Map();
let drag = null;
svg.addEventListener("pointerdown", (e) => {
  svg.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: 0, target: e.target };
  else drag = null;
});
svg.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)[1];
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(a.x - b.x, a.y - b.y);
    if (before > 0) { const [cx, cy] = toMap((a.x + b.x) / 2, (a.y + b.y) / 2); zoomAt(before / after, cx, cy); }
    return;
  }
  if (!drag) return;
  const r = svg.getBoundingClientRect();
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
  if (drag.moved > 6) {
    view.x = drag.vx - (dx / r.width) * view.w;
    view.y = drag.vy - (dy / r.height) * view.h;
    setView();
  }
});
function endPointer(e) {
  const wasTap = drag && drag.moved <= 6 && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (wasTap) onMapTap(drag.target, e.clientX, e.clientY);
  if (pointers.size === 0) drag = null;
}
svg.addEventListener("pointerup", endPointer);
svg.addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); drag = null; });
svg.addEventListener("wheel", (e) => { e.preventDefault(); const [cx, cy] = toMap(e.clientX, e.clientY); zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, cx, cy); }, { passive: false });
$("#zoom-in").onclick = () => zoomAt(1 / 1.3, view.x + view.w / 2, view.y + view.h / 2);
$("#zoom-out").onclick = () => zoomAt(1.3, view.x + view.w / 2, view.y + view.h / 2);
$("#zoom-fit").onclick = () => fitView(true);
window.addEventListener("resize", () => { const cx = view.x + view.w / 2, cy = view.y + view.h / 2; const r = svg.getBoundingClientRect(); view.h = view.w * (r.height / Math.max(1, r.width)); view.x = cx - view.w / 2; view.y = cy - view.h / 2; setView(); });

function regionFromPoint(clientX, clientY) {
  const p = toMap(clientX, clientY);
  for (const [id, poly] of Object.entries(shapes)) if (pointInPolygon(p, poly)) return id;
  // Close to a small region? Pick the nearest center so tiny islands stay easy to tap.
  let best = null, bd = 40 * (view.w / WIDTH) * 2.5;
  for (const [id, s] of Object.entries(seeds)) { const d = Math.hypot(s[0] - p[0], s[1] - p[1]); if (d < bd) { bd = d; best = id; } }
  return best;
}

function onMapTap(target, clientX, clientY) {
  if (!state || state.gameOver) return;
  const tok = target.closest && target.closest("[data-army]");
  const regionId = tok ? tok.dataset.region : regionFromPoint(clientX, clientY);
  if (!regionId) return;

  // An army is selected and this is one of its destinations.
  if (ui.army && state.armies[ui.army]) {
    const t = moveTargets(state, state.armies[ui.army]).find((x) => x.region === regionId);
    if (t) {
      if (t.kind === "attack") { ui.target = regionId; render(); return; }
      doMove(regionId);
      return;
    }
  }
  const mine = armyAt(state, regionId, "P");
  if (mine && (!tok || tok.dataset.army === mine.id)) { ui.army = mine.id; ui.region = regionId; ui.target = null; ui.split = false; sfx.tap(); }
  else { ui.army = null; ui.region = regionId; ui.target = null; }
  render();
  if (ui.army && state.armies[ui.army].general === "washington") tutorial.event("select");
}

function doMove(regionId, tactic = null, outcome = null) {
  const r = moveArmy(state, ui.army, regionId, { share: ui.split ? 0.5 : 1, tactic, outcome, forced: !!ui.forced });
  ui.forced = false;
  if (typeof r === "string") { toast(r); return; }
  ui.split = false;
  ui.target = null;
  // A battle you commanded already showed its result on the field.
  if (r.type === "battle") {
    markBattles([r]);
    // A big battle gets its own short scene; small ones the plain report.
    if (!r.fought) setTimeout(() => (r.attacker.men + r.defender.men >= 5000 ? battleCutscene(r, () => {}) : showBattle(r)), 750);
  }
  const army = state.armies[r.armyId] || armyAt(state, regionId, "P");
  ui.army = army && army.side === "P" ? army.id : null;
  ui.region = regionId;
  save();
  render();
  tutorial.event("act");
}

// Smoke over the fields where battles were fought this month or last, and fire where a town was fought over.
function renderFx() {
  const layer = $("#fx");
  if (!layer) return;
  const recent = state.battles.filter((b) => b.turn >= state.turn - 1);
  const key = recent.map((b) => b.region + b.turn).join("|");
  if (layer.dataset.key === key) return;
  layer.dataset.key = key;
  const seen = new Set();
  layer.innerHTML = recent.filter((b) => !seen.has(b.region) && seen.add(b.region)).map((b) => {
    const [x, y] = seeds[b.region];
    const town = REGIONS[b.region].city || REGIONS[b.region].fort;
    return smokeColumn(x + 24, y - 6, { fire: !!town, size: 1.7 });
  }).join("");
}

// The British turn, replayed on the map: each march or attack in turn, with an arrow, a fleet for moves by sea,
// and the battle where it happened. Tokens slide to their new places in the same order. Returns how long it takes.
function replayTurn(summary) {
  const seq = (summary && summary.seq) || [];
  const layer = $("#replay");
  if (!layer || !seq.length) { ui.replay = null; return 0; }
  const step = Math.max(380, Math.min(700, 5200 / seq.length));
  ui.replay = {};
  layer.innerHTML = "";
  seq.forEach((r, i) => {
    const t = 600 + i * step;
    const from = seeds[r.from], to = seeds[r.type === "battle" ? r.region : r.to];
    if (!from || !to) return;
    const side = r.type === "battle" ? r.attacker.side : r.side;
    const d = arrowPath(from, to);
    setTimeout(() => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("class", `move-arrow ${side}`);
      g.innerHTML = `<path class="arrow-under" d="${d}"/><path class="arrow-line" d="${d}" marker-end="url(#arrowhead-${side === "B" ? "b" : "p"})"/>`
        + (r.sea ? `<g class="fleet">${SHIP}<animateMotion dur="${(step / 1000 + 0.3).toFixed(2)}s" path="${d}" fill="freeze" begin="indefinite"/></g>` : "");
      layer.appendChild(g);
      const anim = g.querySelector("animateMotion");
      if (anim) try { anim.beginElement(); } catch { /* older browsers just show the arrow */ }
      if (r.sea && i === 0) sfx.tap();
      setTimeout(() => g.classList.add("fade"), 2600);
      setTimeout(() => g.remove(), 3400);
    }, t);
    if (r.type === "battle") {
      setTimeout(() => markBattles([r]), t + step * 0.6);
      ui.replay[r.attacker.id] = t + step * 0.5;
      ui.replay[r.defender.id] = t + step * 0.8;
    } else if (r.armyId) ui.replay[r.armyId] = t;
  });
  const total = 600 + seq.length * step + 500;
  setTimeout(() => { ui.replay = null; }, total + 1000);
  return total;
}

function renderMap() {
  renderFx();
  for (const el of svg.querySelectorAll(".region")) {
    const id = el.dataset.region;
    el.setAttribute("class", `region ${state.regions[id].owner}${ui.region === id && !ui.army ? " sel" : ""}`);
  }
  // Highlights for the selected army's options.
  let hl = "";
  if (ui.army && state.armies[ui.army]) {
    for (const t of moveTargets(state, state.armies[ui.army])) {
      hl += `<path class="hl ${t.kind}${ui.target === t.region ? " target" : ""}" d="${polygonPath(shapes[t.region])}"/>`;
      const md = marchInfo(state, state.armies[ui.army], state.armies[ui.army].region, t.region, { sea: t.sea, forced: ui.forced }).days;
      const [dx, dy] = seeds[t.region];
      hl += `<g class="march-days ${t.kind}" transform="translate(${dx - 30},${dy - 44})"><rect x="-14" y="-9" width="28" height="15" rx="3"/><text y="2.5" text-anchor="middle">${md}d</text></g>`;
    }
  }
  // The selected army's road back to its supply.
  if (ui.army && state.armies[ui.army]) { const sp = supplyPath(state, state.armies[ui.army]); if (sp && sp.length > 1) hl += `<path class="supply-line" d="${linePath(sp.map((id) => seeds[id]))}"/>`; }
  $("#highlights").innerHTML = hl;
  // Army figures. Each keeps its element between renders, so a move slides it across the map.
  const layer = $("#tokens");
  const seen = new Set();
  const byRegion = {};
  for (const a of armyList(state)) (byRegion[a.region] ||= []).push(a);
  const order = Object.entries(byRegion).sort((x, y) => seeds[x[0]][1] - seeds[y[0]][1]);
  for (const [rid, list] of order) {
    list.sort((a) => (a.side === "P" ? -1 : 1));
    list.forEach((a, i) => {
      const [x, y] = seeds[rid];
      const ox = list.length > 1 ? (i === 0 ? -22 : 22) : 0;
      const g = generalOf(state, a);
      let el = layer.querySelector(`[data-army="${a.id}"]`);
      const fresh = !el;
      if (fresh) { el = document.createElementNS("http://www.w3.org/2000/svg", "g"); el.dataset.army = a.id; el.style.transition = "none"; }
      el.dataset.region = rid;
      el.setAttribute("class", `token ${a.side}${a.moved && a.side === "P" ? " moved" : ""}${ui.army === a.id ? " selected" : ""}`);
      const key = [armyMen(a), a.general, a.moved, a.dugIn, ui.army === a.id, a.hessian, militiaMen(a) > a.regulars, a.side === "P" && !supplyPath(state, a), Math.floor(condOf(a) / 5)].join("|");
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.innerHTML = armyFigure({ side: a.side, hessian: a.hessian, men: armyMen(a), regulars: a.regulars, militia: militiaMen(a), general: a.general, short: g ? g.short : "", moved: a.moved, dugIn: a.dugIn, selected: ui.army === a.id, label: fmtMen(armyMen(a)), unsupplied: a.side === "P" && !supplyPath(state, a), cond: condOf(a) });
      }
      const pos = `translate(${x + ox}px, ${y}px)`;
      el.style.transitionDelay = ui.replay && ui.replay[a.id] ? `${ui.replay[a.id]}ms` : "";
      el.style.transitionDuration = a.lastMarch && a.lastMarch.turn >= state.turn - 1 ? `${Math.min(2.2, 0.5 + a.lastMarch.days * 0.08).toFixed(2)}s` : "";
      // A token sliding to a new place marches while it moves.
      if (!fresh && el.style.transform && el.style.transform !== pos) { el.classList.add("marching"); clearTimeout(el._march); el._march = setTimeout(() => el.classList.remove("marching"), 950); }
      el.style.transform = pos;
      layer.appendChild(el); // keeps northern armies behind southern ones
      if (fresh) requestAnimationFrame(() => { el.style.transition = ""; });
      seen.add(a.id);
    });
  }
  for (const el of [...layer.children]) if (!seen.has(el.dataset.army)) el.remove();
}

// Crossed swords where battles were just fought.
function markBattles(battles) {
  const layer = $("#booms");
  if (battles.length) sfx.battle(Math.max(...battles.map((b) => (b.attacker?.men || 0) + (b.defender?.men || 0))));
  noteWounds(battles);
  for (const b of battles) {
    const [x, y] = seeds[b.region];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "boom");
    g.style.transform = `translate(${x}px, ${y - 20}px)`;
    g.innerHTML = battleMarker() + [0, 1, 2, 3, 4].map((i) => `<circle class="smoke" style="--i:${i}" cx="${(i - 2) * 7}" cy="-4" r="${6 + (i % 2) * 3}"/>`).join("");
    layer.appendChild(g);
    setTimeout(() => g.remove(), 3200);
  }
}

// ---------- top bar ----------
function renderTop() {
  const wx = WEATHER[state.weather || "clear"];
  $("#date").textContent = `${dateLabel(state)} ${wx.icon}`;
  $("#date").title = wx.label;
  // The map shows the season and the weather.
  $("#mapwrap").dataset.season = season(state);
  applySeason(svg, season(state));
  $("#mapwrap").dataset.weather = state.weather || "clear";
  $("#turnof").textContent = `Month ${state.turn + 1} of ${state.lastTurn + 1}`;
  $("#treasury").textContent = money(state.treasury);
  $("#cause-bar").style.width = Math.round(state.cause) + "%";
  $("#cause-bar").style.background = state.cause < 25 ? "var(--british)" : "var(--stripes)";
  $("#cause-num").textContent = Math.round(state.cause);
  const open = unanswered(state).length;
  const unread = state.letters.filter((l) => !l.read).length;
  const badge = $("#letters-badge");
  badge.hidden = !(open || unread);
  badge.textContent = open || unread;
  $("#btn-letters").classList.toggle("pulse", urgent(state).length > 0);
}

// ---------- panel ----------
function generalCard(g, id) {
  const pips = (n) => "●".repeat(n) + "○".repeat(3 - n);
  const loyal = g.side === "P" && g.loyalty !== undefined
    ? `<div class="loyal">Loyalty <span class="bar"><i class="${g.loyalty < 40 ? "low" : ""}" style="width:${g.loyalty}%"></i></span> ${Math.round(g.loyalty)}</div>` : "";
  const pic = PORTRAITS[id]
    ? `<img src="${PORTRAITS[id]}" alt="">`
    : `<svg viewBox="-8 -8 16 16">${bust(g.side === "P" ? "#2e4a7d" : g.hessian ? "#26375f" : "#b3312a")}</svg>`;
  return `<div class="general"><div class="portrait ${g.side}">${pic}</div><div>
    <div class="gname">${esc(g.name)}</div>
    <div class="pips">Attack ${pips(g.atk)} &nbsp; Defense ${pips(g.def)}</div>
    <div class="gtrait">${esc(g.traitText)}</div>${loyal}</div></div>`;
}

function armySummary(a) {
  const mil = militiaMen(a);
  const soonest = a.militia.length ? Math.min(...a.militia.map((b) => b.left)) : null;
  return `<div class="stats">
    <div class="stat"><b>${fmtMen(a.regulars)}</b><span>Regulars</span></div>
    <div class="stat"><b>${fmtMen(mil)}</b><span>Militia${soonest !== null && a.side === "P" && soonest < 50 ? ` · ${soonest} mo` : ""}</span></div>
    ${a.side === "P" ? `<div class="stat"><b>${money(armyUpkeepFor(a))}</b><span>Pay / month</span></div>` : ""}
    <div class="stat cond c${Math.floor(condOf(a) / 20)}"><b>${Math.round(condOf(a))}</b><span>${condLabel(condOf(a))}</span></div>
  </div>${a.side === "P" && condOf(a) < 65 ? `<p class="hint">Condition: long marches, winter in the open, hunger and empty pockets wear an army down; a month's rest (or a city) restores it. Worn-out armies fight worse, and broken-down ones lose men.</p>` : ""}`;
}
function armyUpkeepFor(a) {
  const g = generalOf(state, a);
  return ((a.regulars / 1000) * COST.upkeepRegulars + (militiaMen(a) / 1000) * COST.upkeepMilitia) * state.priceLevel * (g && g.trait === "quartermaster" ? 0.5 : 1);
}

function renderPanel() {
  const p = $("#panel");
  if (!state) { p.innerHTML = ""; return; }
  const a = ui.army && state.armies[ui.army];
  let h = "";

  if (a) {
    const g = generalOf(state, a);
    h += `<h2>${esc(describeArmy(state, a))}</h2><p class="sub">at ${esc(REGIONS[a.region].name)}${a.moved ? " · has acted this month" : ""}${a.dugIn ? " · dug in" : ""}</p>`;
    h += armySummary(a);
    h += supplyNote(a);
    h += regimentsHtml(a);
    if (g) h += generalCard(g, a.general);
    else {
      const spare = reserveGenerals(state, "P");
      if (spare.length) h += `<div class="row"><select id="assign"><option value="">Assign a general…</option>${spare.map((id) => `<option value="${id}">${esc(state.generals[id].name)}</option>`).join("")}</select></div>`;
    }
    if (ui.target) {
      const foe = armyAt(state, ui.target, "B");
      const att = ui.split ? { ...a, regulars: Math.round(a.regulars / 2), militia: a.militia.map((b) => ({ ...b, men: Math.round(b.men / 2) })), general: null } : a;
      const t = moveTargets(state, a).find((x) => x.region === ui.target);
      const pWin = winChance(state, att, foe, ui.target, { sea: t && t.sea });
      const fg = generalOf(state, foe);
      h += `<p><b>Attack ${esc(REGIONS[ui.target].name)}</b>: ${fmtMen(armyMen(foe))} ${foe.hessian ? "Hessians" : "British"}${fg ? ` under ${esc(fg.short)}` : ""}${foe.dugIn ? ", dug in" : ""}.</p>`;
      h += `<p class="odds ${pWin >= 0.6 ? "good" : pWin < 0.4 ? "bad" : ""}">${oddsLabel(pWin)}: about ${Math.round(pWin * 100)}% chance to win</p>`;
      h += `<p class="hint">${REGIONS[ui.target].fort ? "Fort: defenders much stronger. " : REGIONS[ui.target].city ? "City: defenders a bit stronger. " : ""}${REGIONS[ui.target].terrain === "hills" ? "Hills favor the defender. " : REGIONS[ui.target].terrain === "forest" ? "Forest favors the defender. " : ""}${isWinter(state) ? "Winter: attacking is harder. " : ""}${WEATHER[state.weather || "clear"].hint}</p>`;
      if (t) { const m = marchInfo(state, att, a.region, ui.target, { sea: t.sea, forced: ui.forced }); h += `<p class="march">The march: <b>${m.days} day${m.days === 1 ? "" : "s"}</b>, about ${m.miles} miles (${esc(m.why.join(", "))}).${m.days >= 10 ? " The men will arrive tired." : ""}</p>`; }
      h += `<div class="row"><button class="btn danger" id="do-attack">${ui.split ? "Attack with half" : "Attack"}</button><button class="btn" id="cancel-attack">Cancel</button></div>`;
    } else if (!a.moved) {
      h += `<p class="hint">Tap a highlighted region to move there. Red outlines are attacks.</p>`;
      h += `<p class="hint">The number on each region is how many days the march takes.</p>`;
      h += `<div class="row"><button class="btn toggle small" id="split" aria-pressed="${ui.split}">${ui.split ? "Sending half (no general)" : "Send only half"}</button><button class="btn toggle small" id="forced" aria-pressed="${!!ui.forced}" title="Half again as fast, but stragglers drop out and the men arrive worn">${ui.forced ? "Forced march: on" : "Forced march"}</button><button class="btn small" id="dig">Dig in</button></div>`;
    }
    h += recruitButtons(a.region);
  } else if (ui.region) {
    const r = REGIONS[ui.region], rs = state.regions[ui.region];
    const foe = armyAt(state, ui.region, "B");
    h += `<h2>${esc(r.name)}</h2><p class="sub">${rs.owner === "P" ? "Held by Congress" : "Held by the British"}${r.city ? " · city" : ""}${r.fort ? " · fort" : ""}${r.coastal ? " · coast" : ""}${r.terrain ? ` · ${r.terrain}` : ""}</p>`;
    h += `<div class="stats"><div class="stat"><b>${Math.round(rs.loyalist)}%</b><span>Loyalists</span></div><div class="stat"><b>${money(regionIncome(state, ui.region))}</b><span>Taxes / month</span></div></div>`;
    if (foe) { h += armySummary(foe); const fg = generalOf(state, foe); if (fg) h += generalCard(fg, foe.general); }
    if (r.terrain === "hills") h += `<p class="hint">Hills: defenders are 20% stronger, and militia fight almost as well as regulars.</p>`;
    if (r.terrain === "forest") h += `<p class="hint">Forest: defenders are 10% stronger, and militia fight almost as well as regulars.</p>`;
    if (r.note) h += `<p class="hint">${esc(r.note)}</p>`;
    h += factHtml(regionFact(ui.region));
    h += depotButton(ui.region);
    h += recruitButtons(ui.region);
  } else {
    const R = state.role && ROLES[state.role.id] && state.role.id !== "board" ? ROLES[state.role.id] : null;
    h += `<h2>${esc(scenarioOf(state).SCENARIO.title)}</h2><p class="sub">${R ? `You are ${esc(R.who(state.generals[state.role.gen]?.name || ""))}. ${esc(R.perks.join(". "))}. ${esc(R.problems.join(". "))}.` : "You are the Board of War: you run the army and pay for it."}</p>`;
    // Your orders: what each star needs, a live check beside each, and the aide's advice for this month.
    const SC = scenarioOf(state).SCENARIO;
    if (SC.objectives) {
      const o = SC.objectives(state);
      h += `<div class="orders"><div class="orders-head">Your orders</div><div class="orders-status">${esc(o.status)}</div>
        ${o.goals.map((g) => `<div class="goal ${g.done ? "done" : g.failed ? "failed" : ""}"><span class="goal-stars">${"★".repeat(g.stars)}</span><span class="goal-text">${esc(g.text)}</span><span class="goal-mark">${g.done ? "✓" : g.failed ? "✗" : ""}</span></div>`).join("")}
        ${SC.advice ? `<div class="aide"><b>Your aide suggests:</b> ${esc(SC.advice(state))}</div>` : ""}</div>`;
    }
    h += rivalHtml();
    h += `<p>Tap an army below or on the map to give it orders, or tap any region to learn about it. When you're done, end the month and the British move.</p>`;
    const mine = armyList(state, "P").sort((x, y) => armyMen(y) - armyMen(x));
    h += `<h3 class="panel-h">Your armies</h3><div class="army-list">${mine.map((a) => `<button class="army-chip${a.moved ? " moved" : ""}" data-pick="${a.id}">${a.general ? portraitOf(a.general, "tiny") : `<span class="chip-flag"></span>`}<span><b>${esc(describeArmy(state, a))}</b><small>${esc(REGIONS[a.region].name)} · ${fmtMen(armyMen(a))}${a.moved ? " · done this month" : ""}</small></span></button>`).join("")}</div>`;
  }
  const open = urgent(state).length;
  const tray = trayLetters(state).length;
  if (state.gameOver) h += `<div class="end-row"><button class="btn primary" id="tocamp2">Back to the campaign map ›</button></div>`;
  else h += `<div class="end-row">${open ? `<button class="btn gold" id="open-letters">Answer the letter</button>` : tray ? `<button class="btn" id="open-tray" title="Answer them, or leave them and the senders decide at the end of the month">Dispatches (${tray})</button>` : ""}<button class="btn primary" id="end-turn">End ${esc(dateLabel(state).split(" ")[0])} ›</button></div>`;
  p.innerHTML = h;

  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on("do-attack", () => (bigBattle() ? showCloseup() : doMove(ui.target)));
  on("cancel-attack", () => { ui.target = null; render(); });
  on("split", () => { ui.split = !ui.split; render(); });
  on("forced", () => { ui.forced = !ui.forced; render(); });
  on("dig", () => { const e = digIn(state, ui.army); if (e) toast(e); else { sfx.tap(); tutorial.event("act"); } save(); render(); });
  on("end-turn", onEndTurn);
  on("open-letters", () => showLetters());
  on("open-tray", () => showInbox());
  on("tocamp2", () => frontend.showCampaign());
  // The army list: select an army and bring it into view.
  for (const chip of p.querySelectorAll("[data-pick]")) chip.onclick = () => {
    const a = state.armies[chip.dataset.pick];
    if (!a) return;
    ui.army = a.id; ui.region = a.region; ui.target = null; ui.split = false;
    const [x, y] = seeds[a.region];
    view.x = x - view.w / 2; view.y = y - view.h / 2; setView();
    sfx.tap();
    render();
    if (a.general === "washington") tutorial.event("select");
  };
  on("rec-reg", () => doRecruit("regulars"));
  on("rec-mil", () => doRecruit("militia"));
  on("build-depot", () => { const e = buildDepot(state, ui.region); if (e) toast(e); else sfx.coins(); save(); render(); });
  const sel = document.getElementById("assign");
  if (sel) sel.onchange = () => { if (sel.value) { const e = assignGeneral(state, sel.value, ui.army); if (e) toast(e); save(); render(); } };
}

function recruitButtons(regionId) {
  if (state.regions[regionId].owner !== "P") return "";
  const rr = canRecruit(state, regionId, "regulars");
  const rm = canRecruit(state, regionId, "militia");
  return `<h3 style="font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--ink-soft);margin:12px 0 6px">Recruit here</h3>
  <div class="row">
    <button class="btn small" id="rec-reg" ${rr ? "disabled" : ""} title="${esc(rr || "")}">+${fmtMen(RECRUIT_BATCH)} regulars · ${money(regularsCost(state))}</button>
    <button class="btn small" id="rec-mil" ${rm ? "disabled" : ""} title="${esc(rm || "")}">+${fmtMen(RECRUIT_BATCH)} militia · ${money(militiaCost(state))}</button>
  </div>
  <p class="hint">${esc(rr && rm ? rr : `Regulars stay and fight well. Militia are cheap, weaker, and go home after ${MILITIA_MONTHS} months.`)}</p>`;
}

function doRecruit(kind) {
  const regionId = ui.army ? state.armies[ui.army].region : ui.region;
  const e = recruit(state, regionId, kind);
  if (e) { toast(e); return; }
  const a = armyAt(state, regionId, "P");
  if (a) { ui.army = a.id; }
  sfx.drumroll();
  save();
  render();
  tutorial.event("act");
}

function render() {
  if (!state) return;
  renderTop();
  renderMap();
  renderPanel();
  tutorial.refresh();
}

let toastTimer;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

// ---------- modals ----------
function modal(html, onReady) {
  $("#modal-card").innerHTML = html;
  $("#modal").hidden = false;
  $("#modal-card").scrollTop = 0;
  if (onReady) onReady($("#modal-card"));
}
function closeModal() { $("#modal").hidden = true; render(); }
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" && state && !urgent(state).length && !state.pendingDefense) closeModal(); });

const paras = (text) => text.split(/\n\n+/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

// A portrait for anyone who writes to you: a painting if we have one, otherwise a drawn bust in their colors.
function portraitOf(id, size = "") {
  const side = state.generals[id]?.side || (FIGURES[id]?.group === "B" ? "B" : "P");
  const coat = side === "B" ? (state.generals[id]?.hessian ? "#26375f" : "#b3312a") : FIGURES[id]?.group === "F" ? "#3a3a46" : "#2e4a7d";
  const inner = PORTRAITS[id] ? `<img src="${PORTRAITS[id]}" alt="">` : `<svg viewBox="-8 -8 16 16">${bust(coat)}</svg>`;
  return `<div class="portrait ${side} ${size}">${inner}</div>`;
}

// The letter's text: the greeting, the body, and the signature in a hand-written style.
function letterBody(text) {
  const ps = text.split(/\n\n+/);
  return ps.map((p, i) => {
    const html = esc(p).replace(/\n/g, "<br>");
    if (i === 0 && p.length < 30 && /,$/.test(p)) return `<p class="salute">${html}</p>`;
    if (i === ps.length - 1 && ps.length > 1 && p.length < 70 && !/[?.!"]$/.test(p.split("\n")[0])) return `<p class="sig">${html}</p>`;
    return `<p>${html}</p>`;
  }).join("");
}

const SEAL = `<svg class="seal" viewBox="-20 -20 40 40" aria-hidden="true"><path d="M0,-18 C6,-19 10,-14 15,-12 C19,-8 17,-3 19,1 C20,7 15,10 12,15 C7,19 3,17 -1,19 C-7,20 -10,15 -15,12 C-19,7 -17,3 -19,-2 C-20,-8 -15,-11 -12,-15 C-7,-19 -4,-17 0,-18 Z" fill="#9b0c23"/><circle r="11" fill="none" stroke="#c8102e" stroke-width="1.5"/><path d="M0,-7 L2,-2 L7,-2 L3,1 L4.5,6.5 L0,3.2 L-4.5,6.5 L-3,1 L-7,-2 L-2,-2 Z" fill="#e8a0a8"/></svg>`;

function letterHtml(l) {
  const late = l.turn > l.written;
  const role = senderRole(state, l.from);
  const when = monthOf(l.written);
  let h = `<div class="lt-banner kind-${l.kind}">${portraitOf(l.from, "big")}<div class="lt-who"><div class="lt-name">${esc(l.fromName)}</div>${role ? `<div class="lt-role">${esc(role)}</div>` : ""}<div class="lt-place">${l.place ? esc(l.place) + " · " : ""}${when}</div></div>${l.kind === "intel" ? "" : SEAL}</div>`;
  if (late) h += `<p class="delayed">This letter was a month on the road. The courier was delayed.</p>`;
  h += `<h2 class="lt-title">${esc(l.title)}</h2>`;
  if (l.kind === "intel") {
    const src = l.ctx.reliable === true && l.ctx.truth === true && l.from !== "spy" ? "Certain" : l.ctx.reliable ? "Probably reliable" : "Doubtful";
    h += `<div class="intel-note"><div class="intel-stamp">Intelligence · Source: ${src}</div>${letterBody(l.body)}</div>`;
  } else if (l.kind === "council" && l.council) {
    h += `<p class="council-intro">${esc(l.body)}</p><div class="council-voices">${l.council.map((v) => `<div class="voice">${portraitOf(v.from)}<div><div class="voice-name">${esc(senderName(state, v.from))}</div><p>“${esc(v.says)}”</p></div></div>`).join("")}</div>`;
  } else {
    h += `<div class="letter">${letterBody(l.body)}</div>`;
  }
  if (!l.resolved && l.choices.length) {
    h += `<div class="choices">${l.choices.map((c, i) => `<button class="choice" data-choice="${i}"><b>${esc(c.label)}</b>${c.hint ? `<span>${esc(c.hint)}</span>` : ""}</button>`).join("")}</div>`;
  } else if (l.outcome) {
    h += `<p class="outcome">${esc(l.outcome)}</p>`;
  }
  return h;
}

// Show unanswered letters one at a time; then the inbox.
function showLetters(after) {
  const open = urgent(state);
  if (open.length) {
    showLetter(open[open.length - 1], () => (urgent(state).length ? showLetters(after) : after ? after() : closeModal()), after);
    return;
  }
  if (after) { after(); return; }
  showInbox();
}

// One letter with its choices. next() runs after the outcome is read.
function showLetter(l, next, after) {
  {
    l.read = true;
    sfx.letter();
    noteLetter(l.event);
    speakLetter(l);
    const waiting = trayLetters(state).filter((x) => x !== l).length;
    modal(letterHtml(l) + `<p class="meta" style="margin-top:12px">${l.tray ? "From the dispatch tray. If you leave it, the sender decides at the end of the month." : waiting ? `${waiting} more in the dispatch tray. You can answer them or leave them.` : ""}</p>` + (l.tray ? `<div class="modal-actions"><button class="btn" id="leave">Leave it for now</button></div>` : ""), (card) => {
      const lv = card.querySelector("#leave"); if (lv) lv.onclick = () => { stopSpeaking(); showInbox(); };
      for (const b of card.querySelectorAll("[data-choice]")) b.onclick = () => {
        stopSpeaking();
        // Some choices open a set piece first; its score goes into the letter for the choice to use.
        const mg = EVENTS[l.event]?.choices?.[Number(b.dataset.choice)]?.minigame;
        if (mg && l.ctx.minigame === undefined) {
          $("#modal").hidden = true;
          playSetPiece(mg, (score) => { l.ctx.minigame = score; $("#modal").hidden = false; b.onclick(); });
          return;
        }
        const outcome = answerLetter(state, l.id, Number(b.dataset.choice));
        renderPanel(); // keeps the "Answer N letters" button honest while the next letter is open
        save();
        const lost = state.lastSurprise; state.lastSurprise = null;
        // A letter can end the campaign (an enemy army surrendering, for example).
        const over = !!state.gameOver;
        const showOutcome = () => modal(`<h2>${esc(l.title)}</h2><p class="outcome">${esc(outcome || "Your answer was sent.")}</p>${lost && typeof lost === "object" ? battleHtml(lost) : ""}<div class="modal-actions"><button class="btn primary" id="next">Continue</button></div>`, (c) => {
          c.querySelector("#next").onclick = () => (over ? showGameOver(null) : next());
        });
        renderTop();
        const chosenScene = EVENTS[l.event]?.choices?.[Number(b.dataset.choice)]?.scene;
        if (l.event === "declaration") { $("#modal").hidden = true; playScene("declaration", {}, showOutcome); }
        else if (chosenScene && !(lost && typeof lost === "object")) { $("#modal").hidden = true; playScene(chosenScene, { extra: [outcome] }, showOutcome); }
        else if (lost && typeof lost === "object") {
          $("#modal").hidden = true;
          render();
          markBattles([lost]);
          // Washington's Christmas crossing gets its cutscene; other battles ordered by letter just play on the map.
          if (l.event === "crossing") playScene("crossing", { extra: [lost.attackerWins ? `${REGIONS[lost.region].name} is taken. The country takes heart.` : `The attack on ${REGIONS[lost.region].name} fails.`] }, showOutcome);
          else setTimeout(showOutcome, 900);
        } else showOutcome();
      };
    });
  }
}

function showInbox() {
  for (const l of state.letters) if (l.resolved) l.read = l.read || false;
  const waiting = trayLetters(state);
  const rest = state.letters.filter((l) => !waiting.includes(l)).slice(0, 40);
  const item = (l) => `<li class="${l.read ? "" : "unread"}${l.tray && !l.resolved ? " waiting" : ""}"><button data-letter="${l.id}"><div class="t">${esc(l.title)}</div><div class="meta">${esc(l.fromName)} · ${monthOf(l.turn)}${l.tray && !l.resolved ? " · waiting for an answer" : l.news ? " · news" : ""}</div></button></li>`;
  const items = (waiting.length ? `<li class="inbox-h">Dispatch tray: answer these, or leave them and the senders decide at the end of the month</li>` + waiting.map(item).join("") + `<li class="inbox-h">Earlier letters</li>` : "") + rest.map(item).join("");
  modal(`<h2>Letters</h2><ul class="inbox">${items || "<li class='meta'>No letters yet.</li>"}</ul><div class="modal-actions"><button class="btn primary" id="close">Close</button></div>`, (c) => {
    c.querySelector("#close").onclick = closeModal;
    for (const b of c.querySelectorAll("[data-letter]")) b.onclick = () => {
      const l = state.letters.find((x) => x.id === b.dataset.letter);
      if (!l.resolved) { showLetter(l, showInbox); renderTop(); return; }
      l.read = true;
      save();
      modal(letterHtml(l) + `<div class="modal-actions"><button class="btn" id="back">Back</button></div>`, (cc) => { cc.querySelector("#back").onclick = showInbox; });
      renderTop();
    };
  });
}
function monthOf(turn) { const m = (state.startMonth + turn) % 12; const y = state.startYear + Math.floor((state.startMonth + turn) / 12); return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m] + " " + y; }

function sideName(side, hessian) { return side === "P" ? "Continental" : hessian ? "Hessian" : "British"; }

function battleHtml(b) {
  const att = b.attacker, def = b.defender;
  const winner = b.attackerWins ? att : def;
  const cls = winner.side === "P" ? "won" : "lost";
  const who = (x) => `${x.general ? esc(x.general) + "'s " : ""}${sideName(x.side)} force (${menWords(x.men)})`;
  let s = `<div class="battle ${cls}"><b>${esc(REGIONS[b.region].name)}${b.surprise ? ": surprise attack" : ""}</b><br>`;
  s += `${who(att)} attacked ${who(def)}. `;
  const TACTIC_TEXT = { charge: "Our men went in with the bayonet. ", probe: "Our men probed the enemy line. ", volley: "" };
  if (b.tactic === "flank") s += b.flank ? "The flanking column found the enemy's flank. " : "The flanking column lost its way and arrived too late. ";
  else if (b.tactic) s += TACTIC_TEXT[b.tactic] || "";
  s += b.attackerWins ? `The attackers won. ` : `The attack was beaten off. `;
  s += `Losses: ${menWords(b.attackerWins ? b.winnerLoss : b.loserLoss)} attackers, ${menWords(b.attackerWins ? b.loserLoss : b.winnerLoss)} defenders.`;
  if (b.surrendered) s += ` The defenders were trapped and surrendered${b.generalCaptured ? `, and ${esc(b.generalCaptured)} was taken prisoner` : ""}.`;
  else if (b.retreatTo) s += ` The defenders ${b.brokeOut ? "broke out" : "fell back"} to ${esc(REGIONS[b.retreatTo].name)}.`;
  return s + `</div>`;
}

// A short cutscene after a big battle: the two lines in pixel art, smoke, and the story of the day.
function battleCutscene(r, next) {
  const reg = REGIONS[r.region];
  const P = r.attacker.side === "P" ? r.attacker : r.defender, B = r.attacker.side === "P" ? r.defender : r.attacker;
  const ours = (r.attackerWins ? r.attacker : r.defender).side === "P";
  const foe = state.armies[B.id];
  const art = battleScene({ left: "continental", right: foe && foe.hessian ? "hessian" : "british", terrain: reg.terrain || (reg.city || reg.fort ? "city" : "open"), leftFlag: "P", rightFlag: foe && foe.hessian ? "H" : "B" });
  const ourLoss = ours ? r.winnerLoss : r.loserLoss, theirLoss = ours ? r.loserLoss : r.winnerLoss;
  const who = (x, side) => `${x.general ? `${x.general}'s ` : ""}${menWords(x.men)} ${side === "P" ? "Continentals" : foe && foe.hessian ? "Hessians" : "redcoats"}`;
  const held = ours ? Object.values(state.regiments || {}).filter((g) => g.honors.includes(reg.name)).slice(0, 2).map((g) => g.name) : [];
  const lines = [
    `${reg.name}, ${dateLabel(state)}.`,
    r.attacker.side === "P" ? `${who(P, "P")} attacked ${who(B, "B")}.` : `${who(B, "B")} came on against ${who(P, "P")}.`,
    r.surrendered ? (ours ? "By evening the enemy had laid down his arms." : "By evening the army had laid down its arms.") : ours ? (r.attacker.side === "P" ? "The enemy broke and was driven from the field." : "The line held, and the enemy fell back.") : (r.attacker.side === "P" ? "The attack was thrown back." : "The line gave way, and the army fell back."),
    `We lost ${menWords(ourLoss)} men. The enemy lost ${menWords(theirLoss)}.`,
  ];
  if (held.length) lines.push(`${held.join(" and ")} stood firm through it all.`);
  if (ours) music.victory(); else music.dirge();
  $("#modal").hidden = true;
  const fit = `<div class="cs-battle">${art.replace('preserveAspectRatio="xMidYMax slice"', 'preserveAspectRatio="xMidYMax meet"')}</div>`;
  playScene(null, { title: `The Battle of ${esc(reg.name)}`, custom: { art: fit, lines, fx: ["smoke"] } }, () => { render(); next(); });
}

function showBattle(b) {
  modal(`<h2>Battle of ${esc(REGIONS[b.region].name)}</h2>${battleHtml(b)}<div class="modal-actions"><button class="btn primary" id="ok">Continue</button></div>`, (c) => { c.querySelector("#ok").onclick = closeModal; });
}

function ledgerHtml() {
  const names = { taxes: "Taxes from the states", printed: "Money printed", loans: "Loans received", "foreign aid": "Foreign aid", recruiting: "Recruiting", upkeep: "Army pay", "back pay": "Back pay settled", fortifications: "Fortifications", printing: "Printing", bounties: "Enlistment bounties", letters: "Other orders", "loan repayment": "Loan repayments", "main army": "Washington's main army" };
  const row = (label, v) => `<tr><td>${esc(label)}</td><td class="n ${v < 0 ? "neg" : ""}">${v < 0 ? "(" + money(-v).slice(1) + ")" : money(v)}</td></tr>`;
  const table = (lines) => {
    const entries = Object.entries(lines).filter(([, v]) => Math.abs(v) >= 0.5);
    const net = entries.reduce((s, [, v]) => s + v, 0);
    return `<table class="ledger">${entries.map(([k, v]) => row(names[k] || k, v)).join("") || `<tr><td class="meta">Nothing yet.</td><td></td></tr>`}<tr class="total"><td>Net change</td><td class="n ${net < 0 ? "neg" : ""}">${money(net)}</td></tr></table>`;
  };
  const debt = state.loans.reduce((s, l) => s + l.amount, 0);
  const coin = 1 / state.priceLevel;
  let h = `<h2>The Treasury</h2><p class="meta">Amounts in Continental dollars, thousands. Brackets are money going out.</p>`;
  h += `<h3>This month so far</h3>${table(state.ledger.current)}`;
  h += `<h3>Balance sheet</h3><table class="ledger">
    <tr><td>Cash in the treasury</td><td class="n">${money(state.treasury)}</td></tr>
    <tr><td>Back pay owed to soldiers</td><td class="n ${state.arrears > 0 ? "neg" : ""}">${money(state.arrears)}</td></tr>
    <tr><td>Loans payable</td><td class="n">${money(debt)}</td></tr>
    <tr class="total"><td>Net position</td><td class="n ${state.treasury - state.arrears - debt < 0 ? "neg" : ""}">${money(state.treasury - state.arrears - debt)}</td></tr></table>`;
  h += `<h3>Next month (estimate)</h3><table class="ledger">${row("Taxes", monthlyIncome(state))}${row("Army pay", -monthlyUpkeep(state))}<tr class="total"><td>Expected surplus</td><td class="n">${money(monthlyIncome(state) - monthlyUpkeep(state))}</td></tr></table>`;
  h += `<h3>The Continental dollar</h3><p>A paper dollar buys what <b>${coin.toFixed(2)}</b> silver dollars did in July 1776. Congress has run the printing press ${state.pressRuns} time${state.pressRuns === 1 ? "" : "s"}.</p>`;
  h += `<p class="hint">Printing gives you ${money(COST.printAmount)} now, but prices rise ${Math.round(COST.printInflation * 100)}%. Every recruit and every month's pay costs more from then on. Taxes don't rise with prices.</p>`;
  if (state.ledger.history.length) h += `<h3>Last month: ${esc(state.ledger.history[0].label)}</h3>${table(state.ledger.history[0].lines)}`;
  h += `<div class="modal-actions"><button class="btn danger" id="print">Print ${money(COST.printAmount)}</button><button class="btn primary" id="close">Close</button></div>`;
  return h;
}
function showLedger() {
  modal(ledgerHtml(), (c) => {
    c.querySelector("#close").onclick = closeModal;
    c.querySelector("#print").onclick = () => { printMoney(state); sfx.coins(); save(); renderTop(); showLedger(); };
  });
}
$("#btn-ledger").onclick = () => { if (!state) return; sfx.coins(); showLedger(); tutorial.event("ledger"); };
$("#btn-letters").onclick = () => state && showLetters();
$("#btn-menu").onclick = () => showMenu();

// ---------- turns ----------
function onEndTurn() {
  if (urgent(state).length) { showLetters(); return; }
  const ctx = { before: state.log.length, startTurn: state.turn, wasWinter: isWinter(state) };
  ui.army = null; ui.target = null; ui.split = false;
  sfx.drumroll();
  nightFalls();
  tutorial.event("endTurn");
  state.fightDefense = true; // big British attacks stop the turn so you can command the defense
  afterBritish(endTurn(state), ctx);
}

// The British turn has run, or stopped to let you fight an attack on one of your armies.
function afterBritish(summary, ctx) {
  const { before, startTurn, wasWinter } = ctx;
  save();
  if (summary && summary.paused) { render(); askDefense(ctx); return; }
  // Watch the British move, one march at a time.
  const playTime = replayTurn(summary);
  render();
  $("#end-turn") && ($("#end-turn").disabled = true);
  if (summary && !playTime) markBattles(summary.battles);
  const fresh = state.log.filter((l) => l.turn >= startTurn).slice(0, state.log.length - before);
  const voices = state.letters.filter((l) => l.voice && l.written === startTurn);
  // Let the British moves play out on the map before the report covers it.
  setTimeout(() => {
    dawn();
    if (state.gameOver) { showGameOver(summary); return; }
    const report = () => showReport(summary, fresh, voices);
    // The biggest battle of the night that you didn't command yourself gets a scene before the newspaper.
    const big = (summary ? summary.battles : []).filter((b) => !b.fought && (b.attacker.side === "P" || b.defender.side === "P") && b.attacker.men + b.defender.men >= 6000)
      .sort((x, y) => (y.attacker.men + y.defender.men) - (x.attacker.men + x.defender.men))[0];
    const next = big ? () => battleCutscene(big, report) : report;
    if (isWinter(state) && !wasWinter && !state.seenScenes?.winter) { (state.seenScenes ||= {}).winter = true; save(); music.dirge(); playScene("winter", {}, next); }
    else next();
  }, Math.max(2600, playTime + 700)); // long enough to watch the British move by night and read the quote
}

// The British are attacking one of your armies: command the defense, or leave it to the general.
function askDefense(ctx) {
  const p = state.pendingDefense;
  const att = p && state.armies[p.armyId], def = p && armyAt(state, p.target, "P");
  if (!att || !def) { afterBritish(resumeBritishAttack(state, null), ctx); return; }
  const attNow = p.share < 1 ? { ...att, regulars: Math.round(att.regulars * p.share), militia: att.militia.map((m) => ({ ...m, men: Math.round(m.men * p.share) })) } : att;
  const ag = generalOf(state, att), dg = generalOf(state, def), r = REGIONS[p.target];
  const hold = 1 - winChance(state, attNow, def, p.target, { sea: p.sea });
  const art = battleScene({ left: militiaMen(def) > def.regulars ? "militia" : "continental", right: att.hessian ? "hessian" : "british", terrain: r.terrain || (r.city || r.fort ? "city" : "open"), leftFlag: "P", rightFlag: att.hessian ? "H" : "B" });
  const who = dg ? `${dg.short}'s army` : "your troops";
  $("#modal").hidden = false;
  modal(`<div class="closeup-art">${art}<div class="closeup-title"><span>${esc(dateLabel(state))}</span><h2>The British are attacking!</h2></div></div>
    <p class="closeup-forces"><b>${menWords(armyMen(attNow))}</b> ${att.hessian ? "Hessians" : "British"}${ag ? ` under ${esc(ag.short)}` : ""} are marching on ${esc(who)} at <b>${esc(r.name)}</b>, ${menWords(armyMen(def))} strong${def.dugIn ? " and dug in" : ""}.</p>
    <p class="meta">Left to ${esc(dg ? dg.short : "the colonel")}, the odds are about ${Math.round(hold * 100)}% that the line holds.</p>
    <button class="btn primary fight-it" id="df-command">Command the defense ›</button>
    <div class="modal-actions"><button class="btn" id="df-quick">Let ${esc(dg ? dg.short : "the colonel")} fight it</button></div>`, (c) => {
    sfx.drumroll();
    let once = false; // one answer per attack
    c.querySelector("#df-quick").onclick = () => { if (once) return; once = true; $("#modal").hidden = true; afterBritish(resumeBritishAttack(state, null), ctx); };
    c.querySelector("#df-command").onclick = () => {
      if (once) return; once = true;
      $("#modal").hidden = true;
      playBattle({ state, att: attNow, def, regionId: p.target, opts: { sea: p.sea }, onDone: (res) => afterBritish(resumeBritishAttack(state, res && typeof res === "object" ? res : null), ctx) });
    };
  });
}

// The month's news, set as the front page of a period newspaper.
function headlineFor(battles, notes) {
  const big = battles.slice().sort((a, b) => (b.attacker.men + b.defender.men) - (a.attacker.men + a.defender.men))[0];
  if (big) {
    const ours = (big.attackerWins ? big.attacker : big.defender).side === "P";
    const place = REGIONS[big.region].name;
    if (big.surrendered) return ours ? [`An Enemy Army Surrenders at ${place}`, "The whole force laid down its arms"] : [`Disaster at ${place}`, "An American army has surrendered"];
    return ours ? [`Victory at ${place}`, "The King's troops driven from the field"] : [`Defeat at ${place}`, "The army falls back in good order, its officers say"];
  }
  const fell = notes.find((n) => /fell to the British/.test(n.text));
  if (fell) return [fell.text.replace(/\.$/, ""), "The enemy advances"];
  const retaken = notes.find((n) => /was retaken/.test(n.text));
  if (retaken) return [retaken.text.replace(/\.$/, ""), "Good news from the army"];
  return ["News from the Army", "A quiet month, as quiet months go in wartime"];
}

// The first real sentence of a letter, for a news item that has nothing else to say.
function newsLine(body) {
  const text = String(body || "").replace(/^(Sir|Sirs|Gentlemen|Messieurs|My dear friends?|My lords),?s*/i, "").replace(/s+/g, " ").trim();
  const m = text.match(/^.{20,220}?[.!?](s|$)/);
  return m ? m[0].trim() : text.slice(0, 200);
}

function showReport(summary, lines, voices = []) {
  const S = scenarioOf(state).SCENARIO;
  const battles = summary ? summary.battles : [];
  const moves = summary ? summary.moves.filter((m) => m.type === "move") : [];
  // Letters that only carried news were applied when they arrived; they become stories in the paper.
  const news = state.letters.filter((l) => l.news && l.turn === state.turn);
  const told = new Set(news.map((l) => l.outcome));
  const notes = lines.filter((l) => l.kind !== "date" && !told.has(l.text)).reverse();
  let [head, deck] = headlineFor(battles, notes);
  if (!battles.length && news.length && head === "News from the Army") [head, deck] = [news[0].title, "Dispatches reach the Board"];
  const issue = 100 + state.turn * 4 + (state.startMonth || 0);
  let h = `<div class="gazette"><div class="gz-mast"><div class="gz-rule"></div><div class="gz-name">${esc(S.newspaper || "The Pennsylvania Evening Post")}</div><div class="gz-meta"><span>Price Four Coppers</span><span>${esc(dateLabel(state))}</span><span>No. ${issue}</span></div><div class="gz-rule"></div></div>`;
  h += `<h2 class="gz-head">${esc(head)}</h2><p class="gz-deck">${esc(deck)}</p>`;
  h += `<div class="gz-cols">`;
  if (news.length) h += `<section><h3>Dispatches</h3>${news.map((l) => `<div class="gz-story"><b>${esc(l.title)}.</b> ${esc(l.outcome || newsLine(l.body))} <i>(${esc(l.fromName)})</i></div>`).join("")}</section>`;
  if (battles.length) h += `<section><h3>From the Seat of War</h3>${battles.map(battleHtml).join("")}</section>`;
  if (moves.length) h += `<section><h3>Movements of the Enemy</h3>${moves.map((m) => `<div class="logline">${m.side === "B" ? "British troops" : "Our troops"} moved from ${esc(REGIONS[m.from].name)} to ${esc(REGIONS[m.to].name)}.</div>`).join("")}</section>`;
  if (notes.length) h += `<section><h3>Intelligence &amp; Reports</h3>${notes.map((l) => `<div class="logline ${l.kind}">${esc(l.text)}</div>`).join("")}</section>`;
  if (voices.length) h += `<section><h3>Letters from the Army</h3>${voices.map((v) => `<blockquote class="gz-voice">${esc(v.body)}<cite>${esc(v.title)}</cite></blockquote>`).join("")}</section>`;
  h += `</div>`;
  if (isWinter(state)) h += `<p class="hint">❄ Winter: armies outside cities lose men each month, and attacks are harder.</p>`;
  if (WEATHER[state.weather || "clear"].hint) h += `<p class="hint">${WEATHER[state.weather].icon} ${WEATHER[state.weather].hint}</p>`;
  h += factHtml(monthlyFact([...battles.map((b) => b.region), ...moves.map((m) => m.to)]));
  h += `</div>`;
  save();
  const open = urgent(state).length;
  h += `<div class="modal-actions"><button class="btn primary" id="go">${open ? "Read the letter" : "Continue"}</button></div>`;
  modal(h, (c) => { c.querySelector("#go").onclick = () => (open ? showLetters() : closeModal()); });
}

function showGameOver(summary) {
  const g = state.gameOver;
  if (!showGameOver.played) {
    showGameOver.played = true;
    $("#modal").hidden = true;
    markPlayed();
    if (g.result === "defeat") music.dirge(); else music.victory();
    playScene(g.result === "defeat" ? "defeat" : scenarioOf(state).SCENARIO.victoryScene || "victory", { title: esc(g.title), extra: [g.text] }, () => showGameOver(summary));
    return;
  }
  showGameOver.played = false;
  const stars = recordResult(state.mission || "1776", g);
  let h = `<div class="title-hero"><div class="seal">${g.result === "defeat" ? "⚑" : "★"}</div><h1>${esc(g.title)}</h1>
    <div class="result-stars">${"★".repeat(stars)}<i>${"★".repeat(3 - stars)}</i></div></div><p>${esc(g.text)}</p>`;
  if (summary && summary.battles.length) h += `<h3>The last battles</h3>` + summary.battles.map(battleHtml).join("");
  h += `<h3>Your record</h3><div class="stats" style="color:var(--ink)">
    <div class="stat"><b>${state.stats.won}</b><span>Battles won</span></div>
    <div class="stat"><b>${state.stats.lost}</b><span>Battles lost</span></div>
    <div class="stat"><b>${Math.round(state.cause)}</b><span>Cause</span></div>
    <div class="stat"><b>${(1 / state.priceLevel).toFixed(2)}</b><span>Dollar's value</span></div>
    ${g.score !== undefined ? `<div class="stat"><b>${g.score}</b><span>Score</span></div>` : ""}</div>`;
  // What really happened, beside what you did.
  const H = scenarioOf(state).SCENARIO.history;
  if (H) h += `<div class="history-box"><h3>What really happened</h3><p>${esc(H.summary)}</p><p>${esc(H.outcome)}</p><ul>${H.facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul></div>`;
  // Honors earned for the first time.
  // Congress votes its thanks: honors that stay with the general in later campaigns.
  const voted = state.daily ? [] : recordLegacy(state, g);
  if (state.daily) h += dailyResultHtml(g);
  if (voted.length) h += `<h3>Congress votes its thanks</h3>` + voted.map((v) => `<div class="honor congress">${portraitOf(v.id)}<div><b>${esc(state.generals[v.id]?.name || v.id)}</b><span>${esc(v.honor)}, ${esc(v.why)}</span></div></div>`).join("");
  const fresh = awardHonors(state, g);
  if (fresh.length) h += `<h3>Honors earned</h3>` + fresh.map((a) => `<div class="honor"><div class="honor-medal">★</div><div><b>${esc(a.title)}</b><span>${esc(a.goal)}</span><p>${esc(a.note)}</p></div></div>`).join("");
  h += `<div class="modal-actions"><button class="btn" id="view">Look at the map</button><button class="btn" id="again">Play again</button><button class="btn primary" id="tocamp">Campaign map</button></div>`;
  clearSave();
  modal(h, (c) => {
    c.querySelector("#view").onclick = () => { $("#modal").hidden = true; };
    c.querySelector("#again").onclick = () => startNew(state.scenario, false);
    c.querySelector("#tocamp").onclick = () => { $("#modal").hidden = true; frontend.showCampaign(); };
  });
}

// ---------- title and menu ----------
function howToPlay() {
  return `<h3>How to play</h3><ul>
  <li><b>Each turn is one month.</b> Move your armies, recruit, then end the month. The British move after you.</li>
  <li><b>Tap a blue army</b> to select it. Gold outlines show where it can march; red outlines are attacks, with your odds shown before you commit.</li>
  <li><b>The Royal Navy</b> lets British armies land anywhere along the nearby coast. Rivers and harbors make attacks harder for you.</li>
  <li><b>Letters</b> arrive from your generals, Congress and others. Your answers matter, and so does how you treat your generals. Letters from far away arrive late.</li>
  <li><b>Money</b>: taxes come in each month, and your army must be paid. Printing money helps now and hurts later. Unpaid soldiers desert.</li>
  <li><b>Cause</b> is the country's belief in the Revolution. Victories raise it; defeats and lost cities lower it. At zero, you lose.</li>
  <li><b>Winter</b> (December–February) kills men camped outside cities and makes attacks harder.</li></ul>`;
}

// The main menu, campaign map and other full-screen pages live in frontend.js.
const frontend = createFrontend({
  savedGame: () => { const s = loadSave(); return s && !s.gameOver ? { label: dateLabel(s), mission: s.mission || "1776" } : null; },
  onBegin: (scenario, guide, opts) => startNew(scenario, guide, opts),
  onContinue: continueGame,
  hasPlayed,
});

function continueGame() {
  const saved = loadSave();
  if (!saved) { frontend.showCampaign(); return; }
  state = saved;
  state.regiments ||= {};
  if (!state.rival) setupRival(state); // saves from before the rival existed
  ui.army = null; ui.region = null; ui.target = null;
  $("#modal").hidden = true;
  fitView();
  render();
  // Saved in the middle of a British attack: pick the battle up again.
  if (state.pendingDefense && state.midTurn) { askDefense({ before: state.midTurn.before, startTurn: state.turn, wasWinter: isWinter(state) }); return; }
  if (urgent(state).length) showLetters();
}

function showMenu() {
  const p = soundPrefs();
  modal(`<h2>Menu</h2>
  <h3>Sound</h3>
  <label class="check"><input type="checkbox" id="opt-sfx" ${p.sfx ? "checked" : ""}> Sound effects (muskets, cannon, drums)</label>
  <label class="check"><input type="checkbox" id="opt-music" ${p.music ? "checked" : ""}> Fife and drum music</label>
  <label class="slider">Volume <input type="range" id="opt-vol" min="0" max="100" value="${Math.round((p.volume ?? 0.4) * 100)}"></label>
  <label class="check"><input type="checkbox" id="opt-voice" ${p.voice ? "checked" : ""}> Read letters aloud (computer voice, until real actors record them)</label>
  ${howToPlay()}<div class="modal-actions">${state && !state.tutorial && scenarioOf(state).SCENARIO.tutorial ? `<button class="btn" id="guide">Show the guide</button>` : ""}<button class="btn danger" id="restart">Restart campaign</button><button class="btn" id="tomain">Main menu</button><button class="btn primary" id="close">Back to the war</button></div>`, (c) => {
    c.querySelector("#close").onclick = closeModal;
    c.querySelector("#tomain").onclick = () => { save(); $("#modal").hidden = true; frontend.showMain(); };
    c.querySelector("#restart").onclick = async () => { if (await askConfirm("Abandon this campaign and start over from the beginning?", { ok: "Start over", danger: true })) startNew(state.scenario, false); };
    c.querySelector("#opt-sfx").onchange = (e) => { setSfx(e.target.checked); if (e.target.checked) sfx.musket(); };
    c.querySelector("#opt-music").onchange = (e) => { setMusic(e.target.checked); if (e.target.checked) music.victory(); };
    c.querySelector("#opt-vol").oninput = (e) => setVolume(e.target.value / 100);
    c.querySelector("#opt-vol").onchange = () => sfx.musket();
    c.querySelector("#opt-voice").onchange = (e) => { setVoice(e.target.checked); if (e.target.checked) speak("Your obedient servant, G. Washington."); };
    const g = c.querySelector("#guide");
    if (g) g.onclick = () => { closeModal(); tutorial.start(); };
  });
}

function startNew(scenarioId = "1776", guide = false, { daily = null, role = "board", mission = null } = {}) {
  // The Daily Dispatch uses a seed made from the date, so everyone gets the same game that day.
  state = newGame(daily ? dailySeed(daily) : undefined, scenarioId);
  state.mission = mission || scenarioId;
  state.daily = daily;
  // Who you play as: the Board of War, the commander in the field, Greene or Arnold (roles.js).
  const SC0 = scenarioOf(state).SCENARIO;
  state.role = { id: role, gen: role === "commander" ? SC0.commander : role === "greene" ? "greene" : role === "arnold" ? "arnold" : null };
  if (!daily) applyLegacy(state); // generals remember earlier campaigns (not in the daily, to keep it fair)
  const S = scenarioOf(state).SCENARIO;
  ui.army = null; ui.region = null; ui.target = null;
  save();
  $("#modal").hidden = true;
  fitView();
  render();
  music.march();
  // The guided tutorial is written for the 1776 campaign.
  playScene(S.openingScene, {}, () => showLetters(() => { closeModal(); if (guide && S.tutorial) tutorial.start(); }));
}

buildMap();
frontend.showMain();

// ---------- night falls while the British move ----------
let lastQuote = null;
function nightFalls() {
  lastQuote = randomQuote(lastQuote);
  const q = $("#nightfx .night-quote");
  q.innerHTML = `<p>“${esc(lastQuote.text)}”</p><cite>${esc(lastQuote.who)}<span>${esc(lastQuote.when)}</span></cite>`;
  $("#mapwrap").classList.add("night");
}
function dawn() { $("#mapwrap").classList.remove("night"); }

// Read the opening of a letter aloud (when the player has turned this on): skip the greeting, read two sentences.
function speakLetter(l) {
  if (!l || !l.body) return;
  const paras = l.body.split(/\n\n+/).filter((p) => !(p.length < 30 && /,$/.test(p)));
  const sentences = (paras[0] || "").match(/[^.!?]+[.!?]+/g) || [paras[0] || ""];
  speak(`${l.fromName}. ${sentences.slice(0, 2).join(" ")}`);
}

// A general on the losing side of a battle is sometimes wounded. It goes into his record for later campaigns.
function noteWounds(battles) {
  for (const b of battles) {
    const loser = b.attackerWins ? b.defender : b.attacker;
    if (loser.side !== "P" || !loser.general) continue;
    const id = Object.keys(state.generals).find((k) => state.generals[k].short === loser.general);
    if (!id || Math.random() > 0.12) continue;
    const text = `Wounded at ${REGIONS[b.region].name}, ${dateLabel(state)}.`;
    (state.wounds ||= []).push({ general: id, text });
    state.log.unshift({ turn: state.turn, text: `General ${state.generals[id].short} was wounded at ${REGIONS[b.region].name}.`, kind: "bad" });
  }
}

// ---------- supply in the panel ----------
// The army's named regiments, with their experience and honors.
function regimentsHtml(a) {
  if (a.side !== "P") return "";
  const names = assignRegiments(state, a, kindsFor(a)).filter(Boolean);
  if (!names.length) return "";
  return `<div class="regs"><div class="regs-h">Regiments</div>${names.map((n) => {
    const r = recordOf(state, n), lvl = levelOf(r);
    return `<div class="reg"><span class="reg-name">${esc(n)}</span><span class="reg-lvl lvl${lvl}">${LEVELS[lvl]}${lvl ? " " + "★".repeat(lvl) : ""}</span>${r.honors.length ? `<span class="reg-honors">${r.honors.map(esc).join(" · ")}</span>` : ""}</div>`;
  }).join("")}</div>`;
}

// Your rival: the British commander of this campaign, what he has learned about you, and your record against him.
function rivalHtml() {
  const R = state.rival;
  if (!R) return "";
  const g = state.generals[R.id];
  if (!g) return "";
  const st = R.style && STYLES[R.style];
  const past = R.history && (R.history.won || R.history.lost) ? ` Earlier campaigns: you won ${R.history.won}, he won ${R.history.lost}.` : "";
  return `<div class="rival">${portraitOf(R.id)}<div><div class="rival-h">Your rival: ${esc(g.name)}</div>
    <div class="rival-rec">This campaign: you have won ${R.won}, he has won ${R.lost}.${esc(past)}</div>
    ${st ? `<div class="rival-read"><b>He has learned:</b> ${esc(st.learned)} ${esc(st.answer)}</div>` : `<div class="rival-read">He is still taking your measure. Fight the same way every time, and he will learn it.</div>`}</div></div>`;
}

function supplyNote(a) {
  const sp = supplyPath(state, a);
  if (!sp) return `<p class="supply bad"><b>Out of supply.</b> This army loses men every month until it is within ${SUPPLY_RANGE} friendly regions of a city, fort or depot.</p>`;
  if (sp.length === 1) return `<p class="supply good"><b>Supplied</b> from ${esc(REGIONS[a.region].name)}.</p>`;
  return `<p class="supply good"><b>Supplied</b> from ${esc(REGIONS[sp[sp.length - 1]].name)}, ${sp.length - 1} region${sp.length > 2 ? "s" : ""} away (the dashed line).</p>`;
}
function depotButton(id) {
  const s = state.regions[id], r = REGIONS[id];
  if (s.owner !== "P") return "";
  if (s.depot) return `<p class="hint">A supply depot here feeds armies within ${SUPPLY_RANGE} regions.</p>`;
  if (r.city || r.fort) return "";
  return `<div class="row"><button class="btn small" id="build-depot">Build a supply depot · ${money(DEPOT_COST)}</button></div><p class="hint">Feeds your armies within ${SUPPLY_RANGE} regions, so they can operate far from cities.</p>`;
}

// ---------- battle close-ups: for big attacks, choose a tactic before the battle ----------
function attackerNow() {
  const a = state.armies[ui.army];
  return ui.split ? { ...a, regulars: Math.round(a.regulars / 2), militia: a.militia.map((b) => ({ ...b, men: Math.round(b.men / 2) })), general: null } : a;
}
function bigBattle() {
  const a = state.armies[ui.army], foe = ui.target && armyAt(state, ui.target, "B");
  return a && foe && armyMen(attackerNow()) >= 2000 && armyMen(foe) >= 2000;
}
const TACTIC_ADVICE = {
  charge: "Fix bayonets and go straight at them. They won't stand.",
  volley: "Advance in good order and give them volley for volley. No tricks.",
  flank: "Send a column round through the woods and take them in the flank.",
  probe: "Feel out their line first. If it holds, we pull back and keep the army.",
};
function recommendedTactic(g) {
  if (!g) return "volley";
  if (["bold", "aggressive", "gambler"].includes(g.trait)) return "charge";
  if (["riflemen", "cavalry"].includes(g.trait)) return "flank";
  if (["entrenched", "rearguard", "steadfast", "cautious"].includes(g.trait)) return "probe";
  return "volley";
}
function showCloseup() {
  const a = state.armies[ui.army], att = attackerNow(), target = ui.target;
  const foe = armyAt(state, target, "B");
  const r = REGIONS[target];
  const t = moveTargets(state, a).find((x) => x.region === target);
  const g = ui.split ? null : generalOf(state, a);
  const rec = recommendedTactic(g);
  const art = battleScene({ left: militiaMen(att) > att.regulars ? "militia" : "continental", right: foe.hessian ? "hessian" : "british", terrain: r.terrain || (r.city || r.fort ? "city" : "open"), leftFlag: "P", rightFlag: foe.hessian ? "H" : "B" });
  const desc = {
    charge: "A stronger attack, but heavy losses on both sides.",
    volley: "The ordinary attack.",
    flank: `About ${Math.round(flankChance(state, att, target) * 100)}% chance the column finds their flank: then the attack is much stronger. If it gets lost, the attack is weaker.`,
    probe: "A weaker attack, but you lose far fewer men if it fails.",
  };
  const opts = ["charge", "volley", "flank", "probe"].map((k) => {
    const p = winChance(state, att, foe, target, { sea: t && t.sea, tactic: k });
    return `<button class="tactic ${k === rec ? "rec" : ""}" data-tactic="${k}"><b>${esc(TACTICS[k].label)}${k === rec ? " · advised" : ""}</b><span>${esc(desc[k])}</span><em class="${p >= 0.6 ? "good" : p < 0.4 ? "bad" : ""}">${Math.round(p * 100)}% chance to win</em></button>`;
  }).join("");
  modal(`<div class="closeup-art">${art}<div class="closeup-title"><span>${esc(dateLabel(state))}</span><h2>The Battle of ${esc(r.name)}</h2></div></div>
    <p class="closeup-forces"><b>${menWords(armyMen(att))}</b> ${g ? `under ${esc(g.short)}` : "Continentals"} against <b>${menWords(armyMen(foe))}</b> ${foe.hessian ? "Hessians" : "British"}${generalOf(state, foe) ? ` under ${esc(generalOf(state, foe).short)}` : ""}${foe.dugIn ? ", dug in" : ""}.</p>
    ${g ? `<div class="voice">${portraitOf(a.general)}<div><div class="voice-name">${esc(g.name)}</div><p>“${esc(TACTIC_ADVICE[rec])}”</p></div></div>` : ""}
    <button class="btn primary fight-it" id="cu-command">Command the battle yourself ›</button>
    <p class="meta">Or let ${g ? esc(g.short) : "the colonel"} fight it, with one plan for the whole day:</p>
    <div class="tactics">${opts}</div>
    <div class="modal-actions"><button class="btn" id="cu-cancel">Call off the attack</button></div>`, (c) => {
    sfx.drumroll();
    for (const b of c.querySelectorAll("[data-tactic]")) b.onclick = () => { $("#modal").hidden = true; doMove(target, b.dataset.tactic); };
    c.querySelector("#cu-cancel").onclick = () => { ui.target = null; closeModal(); };
    c.querySelector("#cu-command").onclick = () => {
      $("#modal").hidden = true;
      playBattle({
        state, att, def: foe, regionId: target, opts: { sea: t && t.sea },
        onDone: (res) => {
          if (res === null) { ui.target = null; render(); return; }
          if (res === "quick") { showCloseup(); return; }
          doMove(target, null, res);
        },
      });
    };
  });
}

// ---------- the Daily Dispatch ----------
function dailySeed(day) {
  let h = 2166136261;
  for (const ch of `dispatches76-${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return (h % 2147483646) + 1;
}
function dailyResultHtml(g) {
  const stars = typeof g.stars === "number" ? g.stars : 0;
  const rec = recordDaily(state.daily, g.score ?? 0, stars, g.title);
  const label = new Date(`${state.daily}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const share = `Dispatches of '76 · Daily Dispatch, ${label} · ${"★".repeat(stars)}${"☆".repeat(3 - stars)} · Score ${g.score ?? 0} · ${g.title}`;
  setTimeout(() => {
    const btn = document.getElementById("copy-daily");
    if (btn) btn.onclick = async () => {
      try { await navigator.clipboard.writeText(share); btn.textContent = "Copied"; }
      catch { const t = document.getElementById("daily-share"); t.select(); btn.textContent = "Select and copy the text"; }
    };
  }, 0);
  return `<div class="daily-box"><h3>Daily Dispatch · ${esc(label)}</h3>
    <p>Score <b>${g.score ?? 0}</b>${rec.best > (g.score ?? 0) ? ` · your best today is ${rec.best}` : rec.plays > 1 ? " · a new best for today" : ""} · ${rec.streak} day${rec.streak === 1 ? "" : "s"} in a row</p>
    <textarea id="daily-share" readonly rows="2">${esc(share)}</textarea>
    <button class="btn primary small" id="copy-daily">Copy result to share</button></div>`;
}
