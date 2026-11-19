// The game's front end: main menu, campaign map with mission briefings, generals roster, settings and credits.
// These are full-screen pages drawn over the war map. ui.js decides what happens when a mission starts.

import { REGIONS } from "./data/regions.js";
import { GENERALS } from "./data/generals.js";
import { MISSIONS, starsFor } from "./data/missions.js";
import { FIGURES, FIGURE_GROUPS } from "./data/figures.js";
import { PORTRAITS, SCENES } from "./data/assets.js";
import { WIDTH, HEIGHT, project, buildRegionShapes, polygonPath, linePath, seaPath, MAINLAND, ISLANDS, LAKES, RIVERS } from "./geo.js";
import { TERRAIN_DEFS, terrainLayer, overlayLayer, placeIcons, waterLayer, extraLand, mapLettering } from "./terrain.js";
import { bust } from "./soldiers.js";
import { sfx, music, soundPrefs, setSfx, setMusic, setVolume, setVoice, speak, stopSpeaking } from "./sound.js";
import { askConfirm } from "./confirm.js";
import { getBook, getDaily, todayKey } from "./book.js";
import { getLegacy } from "./legacy.js";
import { ACHIEVEMENTS } from "./data/achievements.js";
import { FACTS } from "./data/facts.js";
import { EVENTS } from "./letters.js";

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
  s += Object.values(shapes).map((poly) => `<path class="land" d="${polygonPath(poly)}"/>`).join("") + extraLand();
  s += `<g class="deco">${terrainLayer(shapes, seeds)}</g>`;
  s += `<path class="sea" fill-rule="evenodd" d="${seaPath()}"/>`;
  s += waterLayer(); // the real coast, lakes, rivers and colony borders
  s += `<g class="deco">${overlayLayer(seeds)}${mapLettering(seeds, { towns: false })}${placeIcons(seeds)}</g>`;
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
          <button class="mm-btn" id="mm-daily"><b>Daily Dispatch</b><span>${dailyLine()}</span></button>
          <button class="mm-btn" id="mm-generals"><b>Who's Who</b><span>Generals, Founders and the King's men</span></button>
          <button class="mm-btn" id="mm-book"><b>History Book</b><span>Honors, paintings and notes you've found</span></button>
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
    on("#mm-book", () => showBook());
    on("#mm-daily", async () => {
      const saved = savedGame();
      if (saved && !(await askConfirm(`The Daily Dispatch replaces your saved game (${saved.label}). Start anyway?`, { ok: "Start", danger: true }))) return;
      hide();
      onBegin("saratoga", false, { daily: todayKey() });
    });
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
    if (b) b.onclick = async () => {
      if (saved && !(await askConfirm(savedHere ? "Start this campaign over? Your saved game will be lost." : `This replaces your saved game (${saved.label}). Start anyway?`, { ok: "Start", danger: true }))) return;
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

  // ----- who's who: generals, the King's commanders, and the Founders -----
  function showGenerals(side) {
    const pips = (n) => `<span class="pip-row">${"●".repeat(n)}<i>${"●".repeat(3 - n)}</i></span>`;
    const ids = Object.entries(FIGURES).filter(([, f]) => f.group === side)
      .sort((a, b) => (GENERALS[b[0]]?.rank || 0) - (GENERALS[a[0]]?.rank || 0)).map(([id]) => id);
    const cards = ids.map((id) => {
      const f = FIGURES[id], g = GENERALS[id];
      const coat = side === "B" ? (g?.hessian ? "#26375f" : "#b3312a") : side === "F" ? "#3a3a46" : "#2e4a7d";
      // The painting gets the top of the card. Everyone with a portrait has a large crop in img/portraits/large/.
      const pic = PORTRAITS[id] ? `<img src="img/portraits/large/${id}.jpg" alt="Portrait of ${esc(f.name)}" loading="lazy">` : `<svg viewBox="-8 -8 16 16" preserveAspectRatio="xMidYMid slice">${bust(coat)}</svg>`;
      const [traitName, traitDesc] = g ? g.traitText.split(/:\s(.+)/) : [];
      return `<article class="pcard ${side}">
        <div class="pc-img">${pic}<div class="pc-name"><h3>${esc(f.name)}</h3><span>${esc(f.role)}${f.life ? ` · ${esc(f.life)}` : ""}</span></div></div>
        <div class="pc-body">
          <p class="pc-bio">${esc(f.bio)}</p>
          ${g ? `<div class="pc-stats"><span>Attack ${pips(g.atk)}</span><span>Defense ${pips(g.def)}</span>${g.loyalty !== undefined ? `<span>Loyalty <b>${g.loyalty}</b></span>` : ""}</div>
          <div class="pc-trait"><b>${esc(traitName)}</b>${traitDesc ? ": " + esc(traitDesc) : ""}</div>` : ""}
          <p class="pc-after"><b>Afterward.</b> ${esc(f.after)}</p>
          ${recordHtml(id)}
        </div></article>`;
    }).join("");
    const lead = { P: "Your commanders. Their loyalty rises and falls with how you treat them, and some of them remember.", B: "The King's commanders. Each fights the way the real one did.", F: "The men in Congress and abroad who write to you, argue with you, and pay for the war." }[side];
    show("scr-page", `${backBar("Who's Who")}<div class="page">
      <div class="tabs">${FIGURE_GROUPS.map((t) => `<button class="tab ${side === t.id ? "on" : ""}" data-tab="${t.id}">${t.label}</button>`).join("")}</div>
      <p class="page-lead">${lead}</p>
      <div class="pcards">${cards}</div></div>`);
    on("#back", showMain);
    for (const t of root.querySelectorAll("[data-tab]")) t.onclick = () => { sfx.tap(); showGenerals(t.dataset.tab); };
  }

  // ----- the History Book: everything you've found, across all your games -----
  const SCENE_CAPTIONS = {
    fleet: ["The fleet at the Narrows", "Archibald Robertson, 1776"],
    declaration: ["Declaration of Independence", "John Trumbull, 1819"],
    crossing: ["Washington Crossing the Delaware", "Emanuel Leutze, 1851"],
    winter: ["The March to Valley Forge", "William B. T. Trego, 1883"],
    victory: ["The Capture of the Hessians at Trenton", "John Trumbull"],
    saratoga: ["Surrender of General Burgoyne", "John Trumbull, 1821"],
  };
  function showBook(tab = "honors") {
    const b = getBook();
    const letterIds = Object.values(EVENTS).filter((e) => e.scenario && (e.scripted || e.random)).map((e) => e.id);
    const counts = {
      honors: [Object.keys(b.honors).length, ACHIEVEMENTS.length],
      paintings: [Object.keys(SCENE_CAPTIONS).filter((k) => b.scenes.includes(k)).length, Object.keys(SCENE_CAPTIONS).length],
      notes: [b.facts.length, FACTS.length],
      letters: [letterIds.filter((id) => b.letters.includes(id)).length, letterIds.length],
    };
    let body = "";
    if (tab === "honors") {
      body = ACHIEVEMENTS.map((a) => { const got = b.honors[a.id]; return `<div class="honor ${got ? "" : "locked"}"><div class="honor-medal">${got ? "★" : "?"}</div><div><b>${esc(a.title)}</b><span>${esc(a.goal)}</span>${got ? `<p>${esc(a.note)}</p><small>Earned ${esc(got)}</small>` : ""}</div></div>`; }).join("");
    } else if (tab === "paintings") {
      body = `<div class="book-gallery">${Object.entries(SCENE_CAPTIONS).map(([id, [t, who]]) => b.scenes.includes(id) && SCENES[id]
        ? `<figure><div class="bg-img" style="background-image:url('${SCENES[id]}')"></div><figcaption><b>${esc(t)}</b><span>${esc(who)}</span></figcaption></figure>`
        : `<figure class="locked"><div class="bg-img"></div><figcaption><b>Not yet found</b><span>Keep playing</span></figcaption></figure>`).join("")}</div>`;
    } else if (tab === "notes") {
      body = b.facts.length ? b.facts.slice().sort((x, y) => x - y).map((i) => FACTS[i] ? `<div class="didyouknow"><b>Did you know?</b> ${esc(FACTS[i].text)}</div>` : "").join("") : `<p class="page-lead">Notes you read in the monthly newspaper and on the map will be collected here.</p>`;
    } else {
      const seen = letterIds.filter((id) => b.letters.includes(id));
      body = seen.length ? `<ul class="book-letters">${seen.map((id) => { const e = EVENTS[id]; const t = Array.isArray(e.title) ? e.title[0] : typeof e.title === "function" ? id : e.title; return `<li><b>${esc(t)}</b><span>${esc(e.fromName || FIGURES[typeof e.from === "string" ? e.from : ""]?.name || "")}</span></li>`; }).join("")}</ul>` : `<p class="page-lead">Every different letter you receive is listed here.</p>`;
    }
    const tabs = [["honors", "Honors"], ["paintings", "Paintings"], ["notes", "Notes"], ["letters", "Letters"]];
    show("scr-page", `${backBar("History Book")}<div class="page">
      <div class="tabs">${tabs.map(([id, label]) => `<button class="tab ${tab === id ? "on" : ""}" data-tab="${id}">${label} <small>${counts[id][0]}/${counts[id][1]}</small></button>`).join("")}</div>
      <div class="book-body">${body}</div></div>`);
    on("#back", showMain);
    for (const t of root.querySelectorAll("[data-tab]")) t.onclick = () => { sfx.tap(); showBook(t.dataset.tab); };
  }

  // ----- settings -----
  function showSettings() {
    const p = soundPrefs();
    show("scr-page", `${backBar("Settings")}<div class="page">
      <h3>Sound</h3>
      <label class="check"><input type="checkbox" id="opt-sfx" ${p.sfx ? "checked" : ""}> Sound effects (muskets, cannon, drums)</label>
      <label class="check"><input type="checkbox" id="opt-music" ${p.music ? "checked" : ""}> Fife and drum music</label>
  <label class="slider">Volume <input type="range" id="opt-vol" min="0" max="100" value="${Math.round((p.volume ?? 0.4) * 100)}"></label>
  <label class="check"><input type="checkbox" id="opt-voice" ${p.voice ? "checked" : ""}> Read letters aloud (computer voice, until real actors record them)</label>
      <h3>Progress</h3>
      <p class="page-lead">Stars and settings are saved in this browser.</p>
      <button class="btn danger" id="reset">Erase stars and saved game</button></div>`);
    on("#back", showMain);
    root.querySelector("#opt-sfx").onchange = (e) => { setSfx(e.target.checked); if (e.target.checked) sfx.musket(); };
    root.querySelector("#opt-music").onchange = (e) => { setMusic(e.target.checked); if (e.target.checked) music.victory(); };
    root.querySelector("#opt-vol").oninput = (e) => setVolume(e.target.value / 100);
    root.querySelector("#opt-vol").onchange = () => sfx.musket();
    root.querySelector("#opt-voice").onchange = (e) => { setVoice(e.target.checked); if (e.target.checked) speak("Your obedient servant, G. Washington."); };
    on("#reset", async () => {
      if (!(await askConfirm("Erase all stars and your saved game? This can't be undone.", { ok: "Erase", danger: true }))) return;
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

// A general's record across all your campaigns, from legacy.js.
function recordHtml(id) {
  const r = getLegacy()[id];
  if (!r || !r.campaigns) return "";
  const bits = [`${r.campaigns} campaign${r.campaigns > 1 ? "s" : ""} with you`, `won ${r.won}`, `lost ${r.lost}`];
  if (r.loyalty !== null && r.loyalty !== undefined) bits.push(`last loyalty ${r.loyalty}`);
  const extra = [...(r.honors || []).map((h) => `★ ${h}`), ...(r.wounds || []), ...(r.notes || [])];
  return `<div class="gc-record"><b>Your record:</b> ${bits.join(" · ")}${extra.length ? `<ul>${extra.map((x) => `<li>${x.replace(/[<>&]/g, "")}</li>`).join("")}</ul>` : ""}</div>`;
}

// The menu line for the Daily Dispatch: today's best score, if any.
function dailyLine() {
  const rec = getDaily()[todayKey()];
  return rec ? `Today's Saratoga, the same for everyone · your best today: ${rec.best}` : "Today's Saratoga, the same for everyone · new every day";
}
