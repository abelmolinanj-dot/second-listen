// Plays the 1776 campaign many times without a screen, to catch crashes and check balance.
// Run from the revolution folder:  node tools/simulate.mjs [games] [strategy]
// Strategies: passive (answer every letter with the first choice, never move), simple (a basic player).

import { newGame, endTurn } from "../js/turn.js";
import { answerLetter, unanswered } from "../js/letters.js";
import {
  armyList, moveTargets, winChance, armyAt, moveArmy, recruit, canRecruit, printMoney, armyMen, digIn, findGeneralArmy, threatTo, power, distance,
} from "../js/rules.js";

const games = Number(process.argv[2] || 50);
const strategy = process.argv[3] || "simple";
const verbose = process.argv.includes("-v");

function playSimple(state) {
  // Recruit where Washington is, print money when broke.
  const w = findGeneralArmy(state, "washington");
  if (state.treasury < 15 && state.priceLevel < 2) printMoney(state);
  if (w) { if (!canRecruit(state, w.region, "regulars")) recruit(state, w.region, "regulars"); else if (!canRecruit(state, w.region, "militia")) recruit(state, w.region, "militia"); }
  for (const a of armyList(state, "P")) {
    if (a.moved) continue;
    const opts = moveTargets(state, a);
    const atk = opts.filter((o) => o.kind === "attack").map((o) => ({ o, p: winChance(state, a, armyAt(state, o.region, "B"), o.region) })).sort((x, y) => y.p - x.p)[0];
    if (atk && atk.p > 0.7) { moveArmy(state, a.id, atk.o.region); continue; }
    const threat = threatTo(state, a.region, "P");
    if (threat > power(state, a) * 1.5) {
      const safe = opts.filter((o) => o.kind !== "attack" && threatTo(state, o.region, "P") < threat * 0.5)[0];
      if (safe) { moveArmy(state, a.id, safe.region); continue; }
      digIn(state, a.id);
    }
  }
}

// Pull Washington back to defend Philadelphia, recruit there, and strike only at good odds.
function playDefensive(state) {
  const w = findGeneralArmy(state, "washington");
  if (state.treasury < 25 && state.priceLevel < 1.8) printMoney(state);
  for (const r of ["philadelphia", w && w.region]) if (r) { if (!canRecruit(state, r, "regulars")) recruit(state, r, "regulars"); }
  for (const a of armyList(state, "P")) {
    if (a.moved) continue;
    const opts = moveTargets(state, a);
    const atk = opts.filter((o) => o.kind === "attack").map((o) => ({ o, p: winChance(state, a, armyAt(state, o.region, "B"), o.region) })).sort((x, y) => y.p - x.p)[0];
    if (atk && atk.p > 0.75) { moveArmy(state, a.id, atk.o.region); continue; }
    if (a.general === "washington" || a.general === "greene" || a.general === "knox") {
      const goal = "philadelphia";
      const step = opts.filter((o) => o.kind !== "attack").sort((x, y) => distance(x.region, goal) - distance(y.region, goal))[0];
      if (step && distance(step.region, goal) < distance(a.region, goal)) { moveArmy(state, a.id, step.region); continue; }
      digIn(state, a.id); continue;
    }
    const threat = threatTo(state, a.region, "P");
    if (threat > power(state, a) * 1.5) {
      const safe = opts.filter((o) => o.kind !== "attack" && threatTo(state, o.region, "P") < threat * 0.5)[0];
      if (safe) { moveArmy(state, a.id, safe.region); continue; }
    }
    digIn(state, a.id);
  }
}

const results = {};
let totalScore = 0;
for (let g = 0; g < games; g++) {
  const state = newGame(1000 + g);
  let guard = 0;
  while (!state.gameOver && guard++ < 40) {
    for (const l of unanswered(state)) answerLetter(state, l.id, strategy === "passive" ? Math.min(1, l.choices.length - 1) : 0);
    if (strategy === "simple") playSimple(state);
    if (strategy === "defensive") playDefensive(state);
    endTurn(state);
  }
  const key = state.gameOver ? state.gameOver.title : "unfinished";
  results[key] = (results[key] || 0) + 1;
  totalScore += state.gameOver?.score || 0;
  if (verbose && g < 2) {
    console.log("--- game", g, "---");
    for (const l of [...state.log].reverse()) console.log(l.turn, l.text);
    console.log("armies:", armyList(state).map((a) => `${a.side} ${a.region} ${armyMen(a)} ${a.general || ""}`).join(" | "));
    console.log("cause", Math.round(state.cause), "treasury", Math.round(state.treasury), "price", state.priceLevel.toFixed(2), "arrears", Math.round(state.arrears));
  }
}
console.log(strategy, results, "avg score", Math.round(totalScore / games));
