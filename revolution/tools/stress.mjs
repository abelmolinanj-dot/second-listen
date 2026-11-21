// A stress test: plays every campaign many times with every role, answering letters at random, fighting the
// British attacks the slow way (the turn pauses, as in the game) and settling civilian scenes, and checks after
// every month that nothing has gone wrong: no crashes, no NaN, no negative armies, no two enemies in one region.
// Run from the revolution folder:  node tools/stress.mjs [games per campaign]

import { newGame, endTurn, resumeBritishAttack } from "../js/turn.js";
import { answerLetter, unanswered } from "../js/letters.js";
import { armyList, armyMen, moveTargets, moveArmy, digIn, armyAt, condOf } from "../js/rules.js";
import { answerCivilian } from "../js/civilians.js";
import { ROLES_FOR } from "../js/roles.js";
import { setupBattle, step, aiOrders, outcomeOf } from "../js/battle.js";

const N = Number(process.argv[2] || 30);
const problems = [];
let checks = 0, defenses = 0, fought = 0, civ = 0;
let r = 12345;
const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };

function check(state, where) {
  checks++;
  const bad = (msg) => problems.push(`${state.scenario} role=${state.role?.id} seed=${state.gameSeed} turn=${state.turn} ${where}: ${msg}`);
  for (const k of ["cause", "treasury", "priceLevel"]) if (!Number.isFinite(state[k])) bad(`${k} is ${state[k]}`);
  if (state.cause < 0 || state.cause > 100) bad(`cause out of range ${state.cause}`);
  for (const a of Object.values(state.armies)) {
    if (!Number.isFinite(a.regulars) || a.regulars < 0) bad(`army ${a.id} regulars ${a.regulars}`);
    for (const m of a.militia) if (!Number.isFinite(m.men) || m.men < 0) bad(`army ${a.id} militia ${m.men}`);
    if (!Number.isFinite(condOf(a))) bad(`army ${a.id} condition ${a.cond}`);
    if (!state.regions[a.region]) bad(`army ${a.id} in unknown region ${a.region}`);
    if (a.general && !state.generals[a.general]) bad(`army ${a.id} has unknown general ${a.general}`);
  }
  for (const id of Object.keys(state.regions)) {
    const sides = new Set(Object.values(state.armies).filter((a) => a.region === id).map((a) => a.side));
    if (sides.size > 1) bad(`both sides in ${id}`);
    const ps = Object.values(state.armies).filter((a) => a.region === id && a.side === "P").length;
    if (ps > 1) bad(`${ps} Continental armies stacked in ${id}`);
  }
  for (const rs of Object.values(state.regions)) if (!Number.isFinite(rs.loyalist)) bad(`loyalist NaN`);
}

for (const scenario of ["1776", "saratoga", "philadelphia", "burgoyne"]) {
  for (const role of ROLES_FOR[scenario]) {
    for (let g = 0; g < N; g++) {
      const state = newGame(1000 + g * 7, scenario);
      state.role = { id: role, gen: role === "commander" ? { "1776": "washington", saratoga: "schuyler", philadelphia: "washington", burgoyne: "gates" }[scenario] : role === "greene" ? "greene" : role === "arnold" ? "arnold" : null };
      state.fightDefense = true;
      let guard = 0;
      try {
        while (!state.gameOver && guard++ < 40) {
          // Letters: pick any choice, sometimes with a set-piece score.
          for (const l of unanswered(state)) { if (rand() < 0.5) l.ctx.minigame = rand() < 0.2 ? null : rand(); answerLetter(state, l.id, Math.floor(rand() * Math.max(1, l.choices.length))); }
          if (state.civilian) { const n = 2; answerCivilian(state, Math.floor(rand() * n)); civ++; }
          // Armies: move, attack, dig in or rest, at random; sometimes fight a big attack on the field.
          for (const a of armyList(state, "P")) {
            if (!state.armies[a.id] || a.moved) continue;
            const opts = moveTargets(state, a);
            const roll = rand();
            if (roll < 0.35 && opts.length) {
              const t = opts[Math.floor(rand() * opts.length)];
              const foe = armyAt(state, t.region, "B");
              let outcome = null;
              if (foe && rand() < 0.5) {
                const b = setupBattle(state, a, foe, t.region, { sea: t.sea }, 77 + g);
                while (!b.over) { aiOrders(b, "P"); aiOrders(b, "B"); step(b); }
                outcome = outcomeOf(b); fought++;
              }
              moveArmy(state, a.id, t.region, { outcome, forced: rand() < 0.15 });
            } else if (roll < 0.6) digIn(state, a.id);
          }
          check(state, "after player moves");
          let s = endTurn(state);
          while (s && s.paused) {
            defenses++;
            let outcome = null;
            const p = state.pendingDefense;
            if (rand() < 0.5 && p) {
              const att = state.armies[p.armyId], def = armyAt(state, p.target, "P");
              if (att && def) { const b = setupBattle(state, att, def, p.target, {}, 99 + g); while (!b.over) { aiOrders(b, "P"); aiOrders(b, "B"); step(b); } outcome = outcomeOf(b); fought++; }
            }
            s = resumeBritishAttack(state, outcome);
          }
          check(state, "after month");
        }
        if (!state.gameOver) problems.push(`${scenario} role=${role} seed=${state.gameSeed}: never finished`);
      } catch (e) {
        problems.push(`${scenario} role=${role} seed=${state.gameSeed} turn=${state.turn}: CRASH ${e.stack.split("\n").slice(0, 3).join(" | ")}`);
      }
    }
  }
}
const uniq = [...new Set(problems.map((p) => p.replace(/seed=\d+ turn=\d+ /, "")))];
console.log(`checks ${checks}, defensive pauses ${defenses}, field battles ${fought}, civilian scenes ${civ}`);
console.log(`${problems.length} problems (${uniq.length} kinds)`);
for (const u of uniq.slice(0, 25)) console.log(" -", u, `(x${problems.filter((p) => p.replace(/seed=\d+ turn=\d+ /, "") === u).length})`);
if (problems.length) console.log("first:", problems[0]);
