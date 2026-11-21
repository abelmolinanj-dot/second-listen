// Quick Battle: famous fights of the war, played straight away on the battlefield, outside any campaign.
// Numbers are rounded from the usual historical estimates. Your record is kept in this browser.

import { newGame } from "./turn.js";
import { newArmy } from "./rules.js";
import { playBattle } from "./battlefield.js";

const KEY = "dispatches76-quick";
export function quickRecord() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }
function saveRecord(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* ignore */ } }

// side: "attack" if you attack, "defend" if the British attack you.
export const QUICK_BATTLES = [
  { id: "longisland", title: "Long Island", date: "August 27, 1776", scenario: "1776", region: "longisland", side: "defend",
    you: { regulars: 6000, militia: 3500, general: "putnam" }, them: { regulars: 20000, general: "howe" },
    note: "Howe landed twenty thousand men and marched around the American left by night. History: a heavy defeat, then a famous escape." },
  { id: "trenton", title: "Trenton", date: "December 26, 1776", scenario: "1776", region: "trenton", side: "attack", surprise: true,
    you: { regulars: 2400, general: "washington" }, them: { regulars: 1500, general: "rall", hessian: true },
    note: "After crossing the icy Delaware by night, Washington falls on Colonel Rall's Hessians at dawn. History: nearly a thousand Hessians captured." },
  { id: "princeton", title: "Princeton", date: "January 3, 1777", scenario: "1776", region: "princeton", side: "attack",
    you: { regulars: 4500, general: "washington" }, them: { regulars: 1200 },
    note: "Washington slips around Cornwallis by night and catches the British rear guard at Princeton. History: a sharp American victory." },
  { id: "bennington", title: "Bennington", date: "August 16, 1777", scenario: "saratoga", region: "bennington", side: "attack",
    you: { militia: 2000, general: "stark" }, them: { regulars: 800, hessian: true },
    note: "John Stark's New Hampshire militia surround a column of Burgoyne's Germans sent to seize horses and supplies. History: the column was destroyed." },
  { id: "brandywine", title: "Brandywine", date: "September 11, 1777", scenario: "philadelphia", region: "chester", side: "defend",
    you: { regulars: 11000, militia: 3500, general: "washington" }, them: { regulars: 15500, general: "howe" },
    note: "Washington holds the fords of the Brandywine while Howe marches around his right. History: a British victory, but the army got away." },
  { id: "freemans", title: "Freeman's Farm", date: "September 19, 1777", scenario: "saratoga", region: "saratoga", side: "defend",
    you: { regulars: 7000, militia: 2000, general: "arnold" }, them: { regulars: 6000, general: "burgoyne" },
    note: "Burgoyne attacks through the forest toward the American lines on Bemis Heights, and Arnold and Morgan go out to meet him. History: Burgoyne held the field, at a terrible cost." },
  { id: "germantown", title: "Germantown", date: "October 4, 1777", scenario: "philadelphia", region: "philadelphia", side: "attack",
    you: { regulars: 9000, militia: 2000, general: "washington" }, them: { regulars: 9000, general: "howe" },
    note: "Washington's columns march all night to strike Howe's camp at dawn, in thick fog. History: nearly a victory, until the Chew house and the fog broke the attack." },
];

export function runQuickBattle(q, onDone) {
  const state = newGame(Math.floor(Math.random() * 1e6) + 1, q.scenario);
  state.armies = {};
  state.weather = "clear";
  state.regions[q.region].owner = q.side === "attack" ? "B" : "P";
  const mine = newArmy(state, { side: "P", region: q.region, regulars: q.you.regulars || 0, general: q.you.general || null });
  if (q.you.militia) mine.militia.push({ men: q.you.militia, left: 3 });
  const theirs = newArmy(state, { side: "B", region: q.region, regulars: q.them.regulars, general: q.them.general || null, hessian: !!q.them.hessian });
  for (const g of [q.you.general, q.them.general]) if (g && state.generals[g]) state.generals[g].status = "active";
  const att = q.side === "attack" ? mine : theirs, def = q.side === "attack" ? theirs : mine;
  playBattle({
    state, att, def, regionId: q.region, opts: { surprise: !!q.surprise },
    onDone: (res) => {
      if (!res || typeof res !== "object") { onDone(null); return; }
      const won = (q.side === "attack") === res.attackerWins;
      const rec = quickRecord();
      const r = (rec[q.id] ||= { won: 0, lost: 0 });
      if (won) r.won++; else r.lost++;
      saveRecord(rec);
      const myLoss = Math.round((q.you.regulars || 0) + (q.you.militia || 0)) * (q.side === "attack" ? res.attLoss : res.defLoss);
      const theirLoss = q.them.regulars * (q.side === "attack" ? res.defLoss : res.attLoss);
      onDone({ won, line: `Dispatches of '76 · Quick Battle: ${q.title} · ${won ? "Victory" : "Defeat"} · our losses ${(Math.round(myLoss / 10) * 10).toLocaleString("en-US")}, theirs ${(Math.round(theirLoss / 10) * 10).toLocaleString("en-US")}` });
    },
  });
}
