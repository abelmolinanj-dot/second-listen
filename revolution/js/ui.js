// Everything on screen: the map, the bottom/side panel, letters, the ledger and the menus.

import { REGIONS } from "./data/regions.js";
import { WIDTH, HEIGHT, project, buildRegionShapes, polygonPath, linePath, seaPath, MAINLAND, ISLANDS, LAKES, RIVERS, pointInPolygon } from "./geo.js";
import {
  armyList, armyAt, armyMen, militiaMen, generalOf, moveTargets, winChance, oddsLabel, moveArmy, digIn, recruit, canRecruit,
  regularsCost, militiaCost, printMoney, monthlyIncome, monthlyUpkeep, regionIncome, assignGeneral, reserveGenerals,
  dateLabel, isWinter, money, fmtMen, COST, RECRUIT_BATCH, MILITIA_MONTHS, describeArmy, SIDES,
} from "./rules.js";
import { newGame, endTurn, SCENARIO, SAVE_VERSION } from "./turn.js";
import { answerLetter, unanswered } from "./letters.js";
import { TERRAIN_DEFS, terrainLayer, overlayLayer, placeIcons } from "./terrain.js";
import { SOLDIER_DEFS, armyFigure, battleMarker, bust } from "./soldiers.js";
import { playScene } from "./scenes.js";
import { PORTRAITS } from "./data/assets.js";

const SAVE_KEY = "dispatches76-save";
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

// ---------- map ----------
const svg = $("#map");
const view = { x: 0, y: 0, w: WIDTH, h: HEIGHT };

function buildMap() {
  const regionPaths = (cls) => Object.entries(shapes).map(([id, poly]) => `<path class="${cls}" data-region="${id}" d="${polygonPath(poly)}"/>`).join("");
  let s = `<defs>${TERRAIN_DEFS}${SOLDIER_DEFS}</defs>`;
  s += `<rect x="-2000" y="-2000" width="${WIDTH + 4000}" height="${HEIGHT + 4000}" fill="var(--sea)"/>`;
  s += `<g id="land">${regionPaths("land")}</g>`;
  s += `<g class="deco">${terrainLayer(shapes, seeds)}</g>`;
  s += `<g id="regions">${regionPaths("region")}</g>`;
  s += `<path class="sea" fill-rule="evenodd" d="${seaPath()}"/>`;
  s += `<path class="coast" d="${polygonPath(MAINLAND)}${Object.values(ISLANDS).map(polygonPath).join("")}"/>`;
  for (const l of LAKES) s += `<path class="lake" d="${polygonPath(l)}"/>`;
  for (const r of RIVERS) s += `<path class="river" d="${linePath(r.pts)}"/>`;
  s += `<g class="deco">${overlayLayer(seeds)}${placeIcons(seeds)}</g>`;
  s += `<g id="marks">`;
  for (const [id, r] of Object.entries(REGIONS)) {
    const [x, y] = seeds[id];
    s += `<text class="label${r.city ? " city" : ""}" x="${x}" y="${y + 33}">${esc(r.name)}</text>`;
  }
  s += `</g><g id="highlights"></g><g id="booms"></g><g id="tokens"></g>`;
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
  const ids = ["highlands", "philadelphia", "longisland", "trenton", "newark", "westchester"];
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
  if (mine && (!tok || tok.dataset.army === mine.id)) { ui.army = mine.id; ui.region = regionId; ui.target = null; ui.split = false; }
  else { ui.army = null; ui.region = regionId; ui.target = null; }
  render();
}

function doMove(regionId) {
  const r = moveArmy(state, ui.army, regionId, { share: ui.split ? 0.5 : 1 });
  if (typeof r === "string") { toast(r); return; }
  ui.split = false;
  ui.target = null;
  if (r.type === "battle") { markBattles([r]); setTimeout(() => showBattle(r), 750); }
  const army = state.armies[r.armyId] || armyAt(state, regionId, "P");
  ui.army = army && army.side === "P" ? army.id : null;
  ui.region = regionId;
  save();
  render();
}

function renderMap() {
  for (const el of svg.querySelectorAll(".region")) {
    const id = el.dataset.region;
    el.setAttribute("class", `region ${state.regions[id].owner}${ui.region === id && !ui.army ? " sel" : ""}`);
  }
  // Highlights for the selected army's options.
  let hl = "";
  if (ui.army && state.armies[ui.army]) {
    for (const t of moveTargets(state, state.armies[ui.army])) {
      hl += `<path class="hl ${t.kind}${ui.target === t.region ? " target" : ""}" d="${polygonPath(shapes[t.region])}"/>`;
    }
  }
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
      el.setAttribute("class", `token ${a.side}${a.moved && a.side === "P" ? " moved" : ""}`);
      const key = [armyMen(a), a.general, a.moved, a.dugIn, ui.army === a.id, a.hessian, militiaMen(a) > a.regulars].join("|");
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.innerHTML = armyFigure({ side: a.side, hessian: a.hessian, men: armyMen(a), regulars: a.regulars, militia: militiaMen(a), general: a.general, short: g ? g.short : "", moved: a.moved, dugIn: a.dugIn, selected: ui.army === a.id, label: fmtMen(armyMen(a)) });
      }
      el.style.transform = `translate(${x + ox}px, ${y}px)`;
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
  for (const b of battles) {
    const [x, y] = seeds[b.region];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "boom");
    g.style.transform = `translate(${x}px, ${y - 20}px)`;
    g.innerHTML = battleMarker();
    layer.appendChild(g);
    setTimeout(() => g.remove(), 3200);
  }
}

// ---------- top bar ----------
function renderTop() {
  $("#date").textContent = dateLabel(state) + (isWinter(state) ? " ❄" : "");
  $("#turnof").textContent = `Month ${state.turn + 1} of ${state.lastTurn + 1}`;
  $("#treasury").textContent = money(state.treasury);
  $("#cause-bar").style.width = Math.round(state.cause) + "%";
  $("#cause-bar").style.background = state.cause < 25 ? "var(--british)" : "var(--gold)";
  $("#cause-num").textContent = Math.round(state.cause);
  const open = unanswered(state).length;
  const unread = state.letters.filter((l) => !l.read).length;
  const badge = $("#letters-badge");
  badge.hidden = !(open || unread);
  badge.textContent = open || unread;
  $("#btn-letters").classList.toggle("pulse", open > 0);
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
  </div>`;
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
      h += `<p class="hint">${REGIONS[ui.target].fort ? "Fort: defenders much stronger. " : REGIONS[ui.target].city ? "City: defenders a bit stronger. " : ""}${REGIONS[ui.target].terrain === "hills" ? "Hills favor the defender. " : REGIONS[ui.target].terrain === "forest" ? "Forest favors the defender. " : ""}${isWinter(state) ? "Winter: attacking is harder. " : ""}</p>`;
      h += `<div class="row"><button class="btn danger" id="do-attack">${ui.split ? "Attack with half" : "Attack"}</button><button class="btn" id="cancel-attack">Cancel</button></div>`;
    } else if (!a.moved) {
      h += `<p class="hint">Tap a highlighted region to move there. Red outlines are attacks.</p>`;
      h += `<div class="row"><button class="btn toggle small" id="split" aria-pressed="${ui.split}">${ui.split ? "Sending half (no general)" : "Send only half"}</button><button class="btn small" id="dig">Dig in</button></div>`;
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
    h += recruitButtons(ui.region);
  } else {
    h += `<h2>${esc(SCENARIO.title)}</h2><p class="sub">You are the Board of War: you run the army and pay for it.</p>`;
    h += `<p>Tap one of your <b style="color:var(--patriot)">blue</b> armies to give it orders, or any region to learn about it. When you're done, end the month and the British move.</p>`;
  }
  const open = unanswered(state).length;
  h += `<div class="end-row">${open ? `<button class="btn gold" id="open-letters">Answer ${open} letter${open > 1 ? "s" : ""}</button>` : ""}<button class="btn primary" id="end-turn">End ${esc(dateLabel(state).split(" ")[0])} ›</button></div>`;
  p.innerHTML = h;

  const on = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
  on("do-attack", () => doMove(ui.target));
  on("cancel-attack", () => { ui.target = null; render(); });
  on("split", () => { ui.split = !ui.split; render(); });
  on("dig", () => { const e = digIn(state, ui.army); if (e) toast(e); save(); render(); });
  on("end-turn", onEndTurn);
  on("open-letters", () => showLetters());
  on("rec-reg", () => doRecruit("regulars"));
  on("rec-mil", () => doRecruit("militia"));
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
  save();
  render();
}

function render() {
  if (!state) return;
  renderTop();
  renderMap();
  renderPanel();
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
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal" && state && !unanswered(state).length) closeModal(); });

const paras = (text) => text.split(/\n\n+/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");

function letterHtml(l) {
  const late = l.turn > l.written;
  const g = state.generals[l.from];
  const pic = g ? `<div class="portrait ${g.side}">${PORTRAITS[l.from] ? `<img src="${PORTRAITS[l.from]}" alt="">` : `<svg viewBox="-8 -8 16 16">${bust(g.side === "P" ? "#2e4a7d" : "#b3312a")}</svg>`}</div>` : "";
  let h = `<div class="letter-head">${pic}<div><div class="meta">${esc(l.fromName)}${late ? ` · <span class="delayed">Written a month ago. The courier was delayed.</span>` : ""}</div>`;
  h += `<h2>${esc(l.title)}</h2></div></div><div class="letter">${paras(l.body)}</div>`;
  if (!l.resolved && l.choices.length) {
    h += `<div class="choices">${l.choices.map((c, i) => `<button class="choice" data-choice="${i}"><b>${esc(c.label)}</b>${c.hint ? `<span>${esc(c.hint)}</span>` : ""}</button>`).join("")}</div>`;
  } else if (l.outcome) {
    h += `<p class="outcome">${esc(l.outcome)}</p>`;
  }
  return h;
}

// Show unanswered letters one at a time; then the inbox.
function showLetters(after) {
  const open = unanswered(state);
  if (open.length) {
    const l = open[open.length - 1];
    l.read = true;
    modal(letterHtml(l) + `<p class="meta" style="margin-top:12px">${open.length > 1 ? `${open.length - 1} more letter${open.length > 2 ? "s" : ""} waiting.` : ""}</p>`, (card) => {
      for (const b of card.querySelectorAll("[data-choice]")) b.onclick = () => {
        const outcome = answerLetter(state, l.id, Number(b.dataset.choice));
        save();
        const lost = state.lastSurprise; state.lastSurprise = null;
        const showOutcome = () => modal(`<h2>${esc(l.title)}</h2><p class="outcome">${esc(outcome || "Your answer was sent.")}</p>${lost && typeof lost === "object" ? battleHtml(lost) : ""}<div class="modal-actions"><button class="btn primary" id="next">${unanswered(state).length ? "Next letter" : "Continue"}</button></div>`, (c) => {
          c.querySelector("#next").onclick = () => (unanswered(state).length ? showLetters(after) : after ? after() : closeModal());
        });
        renderTop();
        if (l.event === "declaration") { $("#modal").hidden = true; playScene("declaration", {}, showOutcome); }
        else if (lost && typeof lost === "object") {
          $("#modal").hidden = true;
          render();
          markBattles([lost]);
          playScene("crossing", { extra: [lost.attackerWins ? `${REGIONS[lost.region].name} is taken. The country takes heart.` : `The attack on ${REGIONS[lost.region].name} fails.`] }, showOutcome);
        } else showOutcome();
      };
    });
    return;
  }
  if (after) { after(); return; }
  showInbox();
}

function showInbox() {
  for (const l of state.letters) if (l.resolved) l.read = l.read || false;
  const items = state.letters.slice(0, 40).map((l) => `<li class="${l.read ? "" : "unread"}"><button data-letter="${l.id}"><div class="t">${esc(l.title)}</div><div class="meta">${esc(l.fromName)} · ${monthOf(l.turn)}</div></button></li>`).join("");
  modal(`<h2>Letters</h2><ul class="inbox">${items || "<li class='meta'>No letters yet.</li>"}</ul><div class="modal-actions"><button class="btn primary" id="close">Close</button></div>`, (c) => {
    c.querySelector("#close").onclick = closeModal;
    for (const b of c.querySelectorAll("[data-letter]")) b.onclick = () => {
      const l = state.letters.find((x) => x.id === b.dataset.letter);
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
  const who = (x) => `${x.general ? esc(x.general) + "'s " : ""}${sideName(x.side)} force (${fmtMen(x.men)})`;
  let s = `<div class="battle ${cls}"><b>${esc(REGIONS[b.region].name)}${b.surprise ? " — surprise attack" : ""}</b><br>`;
  s += `${who(att)} attacked ${who(def)}. `;
  s += b.attackerWins ? `The attackers won. ` : `The attack was beaten off. `;
  s += `Losses: ${fmtMen(b.attackerWins ? b.winnerLoss : b.loserLoss)} attackers, ${fmtMen(b.attackerWins ? b.loserLoss : b.winnerLoss)} defenders.`;
  if (b.surrendered) s += ` The defenders were trapped and surrendered${b.generalCaptured ? `, and ${esc(b.generalCaptured)} was taken prisoner` : ""}.`;
  else if (b.retreatTo) s += ` The defenders ${b.brokeOut ? "broke out" : "fell back"} to ${esc(REGIONS[b.retreatTo].name)}.`;
  return s + `</div>`;
}

function showBattle(b) {
  modal(`<h2>Battle of ${esc(REGIONS[b.region].name)}</h2>${battleHtml(b)}<div class="modal-actions"><button class="btn primary" id="ok">Continue</button></div>`, (c) => { c.querySelector("#ok").onclick = closeModal; });
}

function ledgerHtml() {
  const names = { taxes: "Taxes from the states", printed: "Money printed", loans: "Loans received", "foreign aid": "Foreign aid", recruiting: "Recruiting", upkeep: "Army pay", "back pay": "Back pay settled", fortifications: "Fortifications", printing: "Printing", bounties: "Enlistment bounties", letters: "Other orders", "loan repayment": "Loan repayments" };
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
    c.querySelector("#print").onclick = () => { printMoney(state); save(); renderTop(); showLedger(); };
  });
}
$("#btn-ledger").onclick = () => state && showLedger();
$("#btn-letters").onclick = () => state && showLetters();
$("#btn-menu").onclick = () => showMenu();

// ---------- turns ----------
function onEndTurn() {
  if (unanswered(state).length) { showLetters(); return; }
  const before = state.log.length;
  const startTurn = state.turn;
  ui.army = null; ui.target = null; ui.split = false;
  const wasWinter = isWinter(state);
  const summary = endTurn(state);
  save();
  render();
  $("#end-turn") && ($("#end-turn").disabled = true);
  if (summary) markBattles(summary.battles);
  const fresh = state.log.filter((l) => l.turn >= startTurn).slice(0, state.log.length - before);
  const voices = state.letters.filter((l) => l.voice && l.written === startTurn);
  // Let the British moves play out on the map before the report covers it.
  setTimeout(() => {
    if (state.gameOver) { showGameOver(summary); return; }
    const next = () => showReport(summary, fresh, voices);
    if (isWinter(state) && !wasWinter && !state.seenScenes?.winter) { (state.seenScenes ||= {}).winter = true; save(); playScene("winter", {}, next); }
    else next();
  }, summary && (summary.battles.length || summary.moves.length) ? 1300 : 300);
}

function showReport(summary, lines, voices = []) {
  let h = `<h2>${esc(dateLabel(state))}</h2>`;
  const battles = summary ? summary.battles : [];
  if (battles.length) h += `<h3>Battles</h3>` + battles.map(battleHtml).join("");
  const moves = summary ? summary.moves.filter((m) => m.type === "move") : [];
  if (moves.length) h += `<h3>Enemy movements</h3>` + moves.map((m) => `<div class="logline">${m.side === "B" ? "British troops" : "Your troops"} moved from ${esc(REGIONS[m.from].name)} to ${esc(REGIONS[m.to].name)}.</div>`).join("");
  const notes = lines.filter((l) => l.kind !== "date").reverse();
  if (notes.length) h += `<h3>Reports</h3>` + notes.map((l) => `<div class="logline ${l.kind}">${esc(l.text)}</div>`).join("");
  if (voices.length) h += `<h3>Voices from the ranks</h3>` + voices.map((v) => `<div class="letter" style="font-size:15px;padding:10px 14px"><p>${esc(v.body)}</p><p class="from">${esc(v.title)}</p></div>`).join("");
  if (isWinter(state)) h += `<p class="hint">❄ Winter: armies outside cities lose men each month, and attacks are harder.</p>`;
  const open = unanswered(state).length;
  h += `<div class="modal-actions"><button class="btn primary" id="go">${open ? `Read ${open} letter${open > 1 ? "s" : ""}` : "Continue"}</button></div>`;
  modal(h, (c) => { c.querySelector("#go").onclick = () => (open ? showLetters() : closeModal()); });
}

function showGameOver(summary) {
  const g = state.gameOver;
  if (!showGameOver.played) {
    showGameOver.played = true;
    $("#modal").hidden = true;
    playScene(g.result === "defeat" ? "defeat" : "victory", { title: esc(g.title), extra: [g.text] }, () => showGameOver(summary));
    return;
  }
  showGameOver.played = false;
  let h = `<div class="title-hero"><div class="seal">${g.result === "defeat" ? "⚑" : "★"}</div><h1>${esc(g.title)}</h1></div><p>${esc(g.text)}</p>`;
  if (summary && summary.battles.length) h += `<h3>The last battles</h3>` + summary.battles.map(battleHtml).join("");
  h += `<h3>Your record</h3><div class="stats" style="color:var(--ink)">
    <div class="stat"><b>${state.stats.won}</b><span>Battles won</span></div>
    <div class="stat"><b>${state.stats.lost}</b><span>Battles lost</span></div>
    <div class="stat"><b>${Math.round(state.cause)}</b><span>Cause</span></div>
    <div class="stat"><b>${(1 / state.priceLevel).toFixed(2)}</b><span>Dollar's value</span></div>
    ${g.score !== undefined ? `<div class="stat"><b>${g.score}</b><span>Score</span></div>` : ""}</div>`;
  h += `<div class="modal-actions"><button class="btn" id="view">Look at the map</button><button class="btn primary" id="again">Play again</button></div>`;
  clearSave();
  modal(h, (c) => {
    c.querySelector("#view").onclick = () => { $("#modal").hidden = true; };
    c.querySelector("#again").onclick = () => startNew();
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

function showTitle() {
  const saved = loadSave();
  modal(`<div class="title-hero"><div class="seal">✒</div><h1>Dispatches of '76</h1><p class="meta">A strategy game of the American Revolution · Prototype</p></div>
  <h2 style="margin-top:14px">${esc(SCENARIO.title)}</h2><p>${esc(SCENARIO.blurb)}</p>
  <h3>To win</h3><ul class="goals">${SCENARIO.goals.map((g) => `<li>${esc(g)}</li>`).join("")}</ul>
  ${howToPlay()}
  <div class="modal-actions">${saved ? `<button class="btn" id="continue">Continue (${esc(dateLabel(saved))})</button>` : ""}<button class="btn primary" id="new">Begin the campaign</button></div>`, (c) => {
    c.querySelector("#new").onclick = startNew;
    const cont = c.querySelector("#continue");
    if (cont) cont.onclick = () => { state = saved; closeModal(); fitView(); if (unanswered(state).length) showLetters(); };
  });
}

function showMenu() {
  modal(`<h2>Menu</h2>${howToPlay()}<div class="modal-actions"><button class="btn danger" id="restart">Restart campaign</button><button class="btn primary" id="close">Back to the war</button></div>`, (c) => {
    c.querySelector("#close").onclick = closeModal;
    c.querySelector("#restart").onclick = () => { if (confirm("Abandon this campaign and start over?")) startNew(); };
  });
}

function startNew() {
  state = newGame();
  ui.army = null; ui.region = null; ui.target = null;
  save();
  $("#modal").hidden = true;
  fitView();
  render();
  playScene("fleet", {}, () => showLetters());
}

buildMap();
showTitle();
