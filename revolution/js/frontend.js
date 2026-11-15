// The game's front end: main menu, campaign map with mission briefings, generals roster, settings and credits.
// These are full-screen pages drawn over the war map. ui.js decides what happens when a mission starts.

import { REGIONS } from "./data/regions.js";
import { GENERALS } from "./data/generals.js";
import { MISSIONS, starsFor } from "./data/missions.js";
import { PORTRAITS, SCENES } from "./data/assets.js";
import { WIDTH, HEIGHT, project, buildRegionShapes, polygonPath, linePath, seaPath, MAINLAND, ISLANDS, LAKES, RIVERS } from "./geo.js";
import { TERRAIN_DEFS, terrainLayer, overlayLayer, placeIcons } from "./terrain.js";
import { bust } from "./soldiers.js";
import { sfx, music, soundPrefs, setSfx, setMusic } from "./sound.js";

const PROGRESS_KEY = "dispatches76-progress";
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// ---------- progress (stars per mission) ----------
export function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); } catch { return {}; }
}
export function recordResult(missionId, gameOver) {
  const p = getProgress();
  const stars = starsFor(gameOver);
  const prev = p[missionId] || { stars: 0, plays: 0 };
  p[missionId] = { stars: Math.max(prev.stars, stars), plays: prev.plays + 1, last: gameOver.title };
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  return stars;
}
const starRow = (n, of = 3) => `<span class="stars" aria-label="${n} of ${of} stars">${"★".repeat(n)}<i>${"★".repeat(of - n)}</i></span>`;

// ---------- the campaign map art (built once, on first visit) ----------
let mapArt = null;
function campaignMapSvg() {
  if (mapArt) return mapArt;
  const shapes = buildRegionShapes(REGIONS);
  const seeds = Object.fromEntries(Object.entries(REGIONS).map(([id, r]) => [id, project(r.seed)]));
  let s = `<defs>${TERRAIN_DEFS}</defs>`;
  s += `<rect x="-2000" y="-2000" width="${WIDTH + 4000}" height="${HEIGHT + 4000}" fill="var(--sea)"/>`;
  s += Object.values(shapes).map((poly) => `<path class="land" d="${polygonPath(poly)}"/>`).join("");
  s += `<g class="deco">${terrainLayer(shapes, seeds)}</g>`;
  s += `<path class="sea" fill-rule="evenodd" d="${seaPath()}"/>`;
  s += `<path class="coast" d="${polygonPath(MAINLAND)}${Object.values(ISLANDS).map(polygonPath).join("")}"/>`;
  for (const l of LAKES) s += `<path class="lake" d="${polygonPath(l)}"/>`;
  for (const r of RIVERS) s += `<path class="river" d="${linePath(r.pts)}"/>`;
  s += `<g class="deco">${overlayLayer(seeds)}${placeIcons(seeds)}</g>`;
  mapArt = s;
  return s;
}

function markerPos(m) {
  const [x, y] = project(m.at);
  return [Math.min(WIDTH - 34, Math.max(34, x)), Math.min(HEIGHT - 40, Math.max(34, y))];
}

// ---------- the screens ----------
export function createFrontend({ savedGame, onBegin, onContinue, hasPlayed }) {
  const root = document.createElement("div");
  root.id = "screens";
  root.hidden = true;
  document.body.appendChild(root);
  let selected = null;

  const show = (cls, html) => {
    root.className = cls;
    root.innerHTML = html;
    root.hidden = false;
    root.scrollTop = 0;
  };
  const hide = () => { root.hidden = true; root.innerHTML = ""; };
  const on = (sel, fn) => { const el = root.querySelector(sel); if (el) el.onclick = (e) => { sfx.tap(); fn(e); }; };

  // ----- main menu -----
  function showMain() {
    const saved = savedGame();
    const p = getProgress();
    const stars = Object.values(p).reduce((s, x) => s + (x.stars || 0), 0);
    show("scr-main", `
      <div class="main-bg" style="background-image:url('${SCENES.declaration || ""}')"></div>
      <div class="main-shade"></div>
      <div class="main-inner">
        <div class="main-title">
          <div class="main-kicker">A strategy game of the American Revolution</div>
          <h1>Dispatches<br>of '76</h1>
          <div class="main-rule"><span>1775 · 1783</span></div>
        </div>
        <nav class="main-menu">
          ${saved ? `<button class="mm-btn primary" id="mm-continue"><b>Continue</b><span>${esc(saved.label)}</span></button>` : ""}
          <button class="mm-btn ${saved ? "" : "primary"}" id="mm-campaign"><b>Campaign</b><span>The War for Independence · ${stars} ★</span></button>
          <button class="mm-btn locked" id="mm-conquest"><b>Conquest</b><span>Take the continent, then the world · Coming 2027</span></button>
          <button class="mm-btn" id="mm-generals"><b>Generals</b><span>The commanders of both armies</span></button>
          <div class="mm-row">
            <button class="mm-btn small" id="mm-settings">Settings</button>
            <button class="mm-btn small" id="mm-credits">Credits</button>
          </div>
        </nav>
      </div>`);
    on("#mm-continue", () => { hide(); onContinue(); });
    on("#mm-campaign", showCampaign);
    on("#mm-conquest", showConquest);
    on("#mm-generals", () => showGenerals("P"));
    on("#mm-settings", showSettings);
    on("#mm-credits", showCredits);
  }

  const backBar = (title, right = "") => `<header class="scr-bar"><button class="scr-back" id="back" aria-label="Back">‹ Back</button><h2>${title}</h2><div class="scr-right">${right}</div></header>`;

  // ----- campaign map -----
  function showCampaign() {
    const p = getProgress();
    const total = MISSIONS.filter((m) => m.status === "ready").length * 3;
    const got = Object.values(p).reduce((s, x) => s + (x.stars || 0), 0);
    const pts = MISSIONS.map(markerPos);
    let trail = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2 + (y1 - y0) * 0.18, my = (y0 + y1) / 2 - (x1 - x0) * 0.18;
      trail += ` Q${mx},${my} ${x1},${y1}`;
    }
    const markers = MISSIONS.map((m, i) => {
      const [x, y] = pts[i];
      const st = p[m.id]?.stars || 0;
      const cls = `mnode ${m.status}${st ? " done" : ""}${selected === m.id ? " sel" : ""}`;
      // Where the label goes: to the right by default, to the left near the right edge, or above/left when crowded.
      const side = m.label || (x > WIDTH - 200 ? "left" : "right");
      const [lx, ly, anchor] = { right: [40, -6, "start"], left: [-40, -6, "end"], above: [-10, -64, "start"], below: [-10, 60, "start"] }[side];
      return `<g class="${cls}" data-mission="${m.id}" transform="translate(${x},${y})">
        <circle class="mn-hit" r="54"/>
        <circle class="mn-ring" r="33"/>
        <circle class="mn-seal" r="26"/>
        <text class="mn-num" y="9">${i + 1}</text>
        ${m.status === "soon" ? `<text class="mn-lock" x="22" y="-20">⌛</text>` : ""}
        <g transform="translate(${lx},${ly})"><text class="mn-label" text-anchor="${anchor}">${esc(m.title)}</text>
        <text class="mn-year" y="22" text-anchor="${anchor}">${esc(m.year)}${st ? "  " + "★".repeat(st) : ""}</text></g>
        ${m.edge ? `<text class="mn-edge" y="56" text-anchor="middle">↓ ${esc(m.edge)}</text>` : ""}
      </g>`;
    }).join("");
    show("scr-campaign", `${backBar("Campaign", `<span class="scr-stars">${got} / ${total} ★</span>`)}
      <div class="camp-wrap">
        <svg class="camp-map" viewBox="0 0 ${WIDTH} ${HEIGHT}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
          ${campaignMapSvg()}
          <path class="camp-trail" d="${trail}"/>
          ${markers}
        </svg>
        <div class="camp-hint" id="camp-hint">Tap a mission to read your orders</div>
        <aside class="brief" id="brief"></aside>
      </div>`);
    on("#back", () => { selected = null; showMain(); });
    for (const g of root.querySelectorAll("[data-mission]")) g.onclick = () => { sfx.tap(); selectMission(g.dataset.mission); };
    if (selected) selectMission(selected, true);
  }

  function selectMission(id, quiet) {
    root.querySelector("#camp-hint")?.remove();
    selected = id;
    for (const g of root.querySelectorAll("[data-mission]")) g.classList.toggle("sel", g.dataset.mission === id);
    const m = MISSIONS.find((x) => x.id === id);
    const i = MISSIONS.indexOf(m);
    const p = getProgress()[id];
    const saved = savedGame();
    const savedHere = saved && saved.mission === id;
    const diff = ["", "Easier", "Moderate", "Hard"][m.difficulty];
    let h = `<button class="brief-close" id="brief-close" aria-label="Close">×</button>`;
    if (m.image) h += `<div class="brief-img" style="background-image:url('${m.image}')"></div>`;
    h += `<div class="brief-body"><div class="brief-kicker">Mission ${i + 1} · ${esc(m.year)} · ${esc(m.place)}</div>
      <h2>${esc(m.title)}</h2>
      <p>${esc(m.summary)}</p>
      <h3>Your orders</h3><ul class="brief-goals">${m.objectives.map((o) => `<li>${esc(o)}</li>`).join("")}</ul>
      <div class="brief-meta"><span>Difficulty: <b>${diff}</b></span>${m.length ? `<span>${esc(m.length)}</span>` : ""}${m.status === "ready" ? `<span>Best: ${starRow(p?.stars || 0)}</span>` : ""}</div>`;
    if (m.status === "ready") {
      h += m.guide ? `<label class="check"><input type="checkbox" id="guide" ${hasPlayed() ? "" : "checked"}> Guide me through the first two months</label>` : "";
      h += `
        <div class="brief-actions">${savedHere ? `<button class="btn" id="b-continue">Continue · ${esc(saved.label)}</button>` : ""}<button class="btn primary" id="b-begin">${savedHere ? "Start over" : "Begin the campaign"}</button></div>`;
    } else {
      h += `<div class="brief-soon">⌛ ${esc(m.eta)}</div>`;
    }
    h += `</div>`;
    const brief = root.querySelector("#brief");
    brief.innerHTML = h;
    brief.classList.add("open");
    brief.scrollTop = 0;
    const b = brief.querySelector("#b-begin");
    if (b) b.onclick = () => {
      if (saved && !confirm(savedHere ? "Start this campaign over? Your saved game will be lost." : `This replaces your saved game (${saved.label}). Start anyway?`)) return;
      const guide = !!brief.querySelector("#guide")?.checked;
      hide();
      onBegin(m.scenario, guide);
    };
    const c = brief.querySelector("#b-continue");
    if (c) c.onclick = () => { hide(); onContinue(); };
    brief.querySelector("#brief-close").onclick = () => brief.classList.remove("open");
    if (!quiet) sfx.letter();
  }

  // ----- conquest (coming) -----
  function showConquest() {
    show("scr-page", `${backBar("Conquest")}<div class="page">
      <p class="page-lead">A free-play mode, coming in 2027. No script and no timetable: pick a side and take the map.</p>
      <div class="cq-cards">
        <div class="cq-card"><h3>Rival States</h3><p>What if the thirteen colonies had fought each other? Pick a state, New Jersey or Virginia or any other, unite the colonies under your flag, then take on the world of 1775.</p></div>
        <div class="cq-card"><h3>Historical Conquests</h3><p>Start from a real moment with the real powers and borders: 1775, the War of 1812, Texas and Mexico, the Civil War, and the Spanish–American War of 1898.</p></div>
      </div></div>`);
    on("#back", showMain);
  }

  // ----- generals roster -----
  function showGenerals(side) {
    const pips = (n) => `<span class="pip-row">${"●".repeat(n)}<i>${"●".repeat(3 - n)}</i></span>`;
    const list = Object.entries(GENERALS).filter(([, g]) => g.side === side).sort((a, b) => b[1].rank - a[1].rank);
    const cards = list.map(([id, g]) => {
      const pic = PORTRAITS[id] ? `<img src="${PORTRAITS[id]}" alt="">` : `<svg viewBox="-8 -8 16 16">${bust(g.side === "P" ? "#2e4a7d" : g.hessian ? "#26375f" : "#b3312a")}</svg>`;
      const [traitName, traitDesc] = g.traitText.split(/:\s(.+)/);
      return `<div class="gcard ${g.side}"><div class="portrait ${g.side}">${pic}</div><div class="gc-body">
        <div class="gc-name">${esc(g.name)}</div>
        <div class="gc-sub">${g.side === "P" ? "Continental Army" : g.hessian ? "Hessian, in British pay" : "British Army"}</div>
        <div class="gc-stats"><span>Attack ${pips(g.atk)}</span><span>Defense ${pips(g.def)}</span>${g.loyalty !== undefined ? `<span>Loyalty <b>${g.loyalty}</b></span>` : ""}</div>
        <div class="gc-trait"><b>${esc(traitName)}</b>${traitDesc ? ": " + esc(traitDesc) : ""}</div></div></div>`;
    }).join("");
    show("scr-page", `${backBar("Generals")}<div class="page">
      <div class="tabs"><button class="tab ${side === "P" ? "on" : ""}" id="t-p">Continental Army</button><button class="tab ${side === "B" ? "on" : ""}" id="t-b">The Crown</button></div>
      <p class="page-lead">${side === "P" ? "Your commanders. Their loyalty rises and falls with how you treat them, and some of them remember." : "The King's commanders. Each fights the way the real one did."}</p>
      <div class="gcards">${cards}</div></div>`);
    on("#back", showMain);
    on("#t-p", () => showGenerals("P"));
    on("#t-b", () => showGenerals("B"));
  }

  // ----- settings -----
  function showSettings() {
    const p = soundPrefs();
    show("scr-page", `${backBar("Settings")}<div class="page">
      <h3>Sound</h3>
      <label class="check"><input type="checkbox" id="opt-sfx" ${p.sfx ? "checked" : ""}> Sound effects (muskets, cannon, drums)</label>
      <label class="check"><input type="checkbox" id="opt-music" ${p.music ? "checked" : ""}> Fife and drum music</label>
      <h3>Progress</h3>
      <p class="page-lead">Stars and settings are saved in this browser.</p>
      <button class="btn danger" id="reset">Erase stars and saved game</button></div>`);
    on("#back", showMain);
    root.querySelector("#opt-sfx").onchange = (e) => { setSfx(e.target.checked); if (e.target.checked) sfx.musket(); };
    root.querySelector("#opt-music").onchange = (e) => { setMusic(e.target.checked); if (e.target.checked) music.victory(); };
    on("#reset", () => {
      if (!confirm("Erase all stars and your saved game? This can't be undone.")) return;
      try { for (const k of Object.keys(localStorage)) if (k.startsWith("dispatches76-") && k !== "dispatches76-sound") localStorage.removeItem(k); } catch { /* ignore */ }
      showMain();
    });
  }

  // ----- credits -----
  function showCredits() {
    show("scr-page", `${backBar("Credits")}<div class="page">
      <p class="page-lead">An original strategy game. Events follow the real war; your choices change them.</p>
      <h3>Paintings and portraits</h3>
      <p>John Trumbull, Emanuel Leutze, William B. T. Trego, Archibald Robertson, Charles Willson Peale, Gilbert Stuart, Thomas Gainsborough and others. All are in the public domain, from Wikimedia Commons, the Metropolitan Museum of Art, the New York Public Library, the Library of Congress and the National Archives. Full sources are listed in <code>img/CREDITS.md</code>.</p>
      <h3>Music</h3><p>"Yankee Doodle", a traditional 18th-century tune, played by a fife and drum made in code.</p>
      <h3>Fonts</h3><p>IM Fell English, from the type of John Fell (17th century), digitized by Igino Marini. Inter by Rasmus Andersson. Both under the SIL Open Font License.</p>
      <h3>Made with</h3><p>Plain HTML, CSS and JavaScript, built by directing Claude, an AI model by Anthropic.</p></div>`);
    on("#back", showMain);
  }

  return { showMain, showCampaign, hide, isOpen: () => !root.hidden };
}
