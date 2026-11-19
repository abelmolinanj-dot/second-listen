// The History Book: everything the player has seen across all their games (notes, letters, paintings),
// and the honors they have earned. Saved in this browser.

import { ACHIEVEMENTS } from "./data/achievements.js";

const KEY = "dispatches76-book";
const empty = () => ({ facts: [], letters: [], scenes: [], honors: {} });

export function getBook() {
  try { return { ...empty(), ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return empty(); }
}
function saveBook(b) { try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* ignore */ } }

function add(kind, id) {
  const b = getBook();
  if (!b[kind].includes(id)) { b[kind].push(id); saveBook(b); }
}
export const noteFact = (idx) => add("facts", idx);
export const noteLetter = (eventId) => add("letters", eventId);
export const noteScene = (sceneId) => add("scenes", sceneId);

// Check every honor at the end of a campaign. Returns the ones earned for the first time.
export function awardHonors(state, gameOver) {
  const b = getBook();
  const fresh = [];
  for (const a of ACHIEVEMENTS) {
    if (b.honors[a.id]) continue;
    let ok = false;
    try { ok = !!a.check(state, gameOver); } catch { ok = false; }
    if (ok) { b.honors[a.id] = new Date().toISOString().slice(0, 10); fresh.push(a); }
  }
  if (fresh.length) saveBook(b);
  return fresh;
}

// ---------- the Daily Dispatch: best score per day, and how many days in a row ----------
const DAILY = "dispatches76-daily";
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function getDaily() { try { return JSON.parse(localStorage.getItem(DAILY) || "{}"); } catch { return {}; } }
export function recordDaily(day, score, stars, title) {
  const all = getDaily();
  const prev = all[day] || { best: -Infinity, plays: 0 };
  all[day] = { best: Math.max(prev.best, score), stars: Math.max(prev.stars || 0, stars), plays: prev.plays + 1, title };
  try { localStorage.setItem(DAILY, JSON.stringify(all)); } catch { /* ignore */ }
  let streak = 0;
  for (let d = new Date(`${day}T12:00:00`); all[todayKey(d)]; d.setDate(d.getDate() - 1)) streak++;
  return { ...all[day], streak };
}
