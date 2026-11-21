// Generals who remember. Each general's record carries from one campaign to the next in this browser:
// loyalty, battles won and lost, wounds, and the honors Congress gave them.
// The rules and the simulator never read this; only the interface applies it when a campaign starts.

const KEY = "dispatches76-legacy";

export function getLegacy() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function saveLegacy(l) { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ } }
const blank = () => ({ campaigns: 0, won: 0, lost: 0, wounds: [], honors: [], loyalty: null, notes: [] });

// When a campaign starts: a general's loyalty drifts back toward his usual temper, but he remembers.
export function applyLegacy(state) {
  const L = getLegacy();
  state.legacy = {};
  // Regiments keep their experience and honors from earlier campaigns.
  for (const [name, r] of Object.entries(L.regiments || {})) state.regiments[name] = { ...r, honors: r.honors.slice(), notes: (r.notes || []).slice() };
  // And the rival remembers the last time you met.
  if (state.rival && L.rivals && L.rivals[state.rival.id]) state.rival.history = { ...L.rivals[state.rival.id] };
  for (const [id, g] of Object.entries(state.generals)) {
    const rec = L[id];
    if (!rec || g.side !== "P" || g.loyalty === undefined) continue;
    state.legacy[id] = { loyalty: rec.loyalty, campaigns: rec.campaigns, won: rec.won, lost: rec.lost, honors: rec.honors.slice() };
    if (rec.loyalty !== null) g.loyalty = Math.round(rec.loyalty * 0.7 + g.loyalty * 0.3);
  }
}

// Who fought in each battle, by general id. Battle reports carry the general's short name.
function byShort(state) {
  const m = {};
  for (const [id, g] of Object.entries(state.generals)) m[g.short] = id;
  return m;
}

// The Congress of the day voted thanks, medals and swords. This picks the honors a campaign earned.
function honorsFor(state, gameOver, tally) {
  const out = [];
  const ours = Object.entries(tally).filter(([id]) => state.generals[id]?.side === "P");
  const best = ours.sort((a, b) => b[1].won - a[1].won)[0];
  if (best && best[1].won >= 2) out.push({ id: best[0], honor: "The Thanks of Congress", why: `for ${best[1].won} victories` });
  if (gameOver.result === "victory" && gameOver.stars >= 3) {
    const cmd = state.scenario === "saratoga" ? ["gates", "schuyler"].find((g) => state.generals[g]?.status === "active") : "washington";
    if (cmd) out.push({ id: cmd, honor: "A gold medal from Congress", why: "for the campaign" });
  }
  const bold = ours.find(([id, t]) => t.won >= 1 && state.generals[id]?.trait === "bold");
  if (bold && gameOver.result !== "defeat") out.push({ id: bold[0], honor: "A sword of honor", why: "for gallantry" });
  return out;
}

// When a campaign ends: write every general's record, and return the honors Congress voted.
export function recordLegacy(state, gameOver) {
  const L = getLegacy();
  const who = byShort(state);
  const tally = {};
  for (const b of state.battles || []) {
    const winner = b.attackerWins ? b.attacker : b.defender;
    for (const side of [b.attacker, b.defender]) {
      const id = side.general && who[side.general];
      if (!id) continue;
      tally[id] ||= { won: 0, lost: 0 };
      if (side === winner) tally[id].won++; else tally[id].lost++;
    }
  }
  const honors = honorsFor(state, gameOver, tally);
  for (const [id, g] of Object.entries(state.generals)) {
    if (g.side !== "P" || g.status === "away" && !tally[id]) continue;
    const rec = (L[id] ||= blank());
    rec.campaigns++;
    rec.won += tally[id]?.won || 0;
    rec.lost += tally[id]?.lost || 0;
    if (g.loyalty !== undefined) rec.loyalty = Math.round(g.loyalty);
    for (const w of (state.wounds || []).filter((x) => x.general === id)) rec.wounds.push(w.text);
    if (g.status === "captured") rec.notes.push(`Captured in ${state.scenario === "saratoga" ? "1777" : "1776"}.`);
  }
  // Regiments and rivals.
  L.regiments ||= {};
  for (const [name, r] of Object.entries(state.regiments || {})) if (r.battles > 0) L.regiments[name] = r;
  if (state.rival) {
    const R = (L.rivals ||= {})[state.rival.id] ||= { won: 0, lost: 0, campaigns: 0 };
    R.won += state.rival.won; R.lost += state.rival.lost; R.campaigns++;
  }
  for (const h of honors) { (L[h.id] ||= blank()).honors.push(`${h.honor} (${state.scenario === "saratoga" ? "Saratoga, 1777" : "1776"})`); }
  saveLegacy(L);
  return honors;
}
