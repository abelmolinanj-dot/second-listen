// Checks that field battles (js/battle.js) agree with the quick battle odds (winChance in js/rules.js)
// when both sides leave the fighting to their generals. Run from the revolution folder:
//   node tools/battletest.mjs
// Each row: a matchup, the quick odds, how often the attacker won on the field, and average losses.

import { newGame } from "../js/turn.js";
import { newArmy, winChance } from "../js/rules.js";
import { setupBattle, step, aiOrders, outcomeOf } from "../js/battle.js";

const CASES = [
  // [label, region, attacker {side, regulars, militia, general}, defender {...}, opts]
  ["Even fight in the open", "princeton", { side: "P", regulars: 5000 }, { side: "B", regulars: 4500 }],
  ["Outnumbered 2 to 1", "princeton", { side: "P", regulars: 4000 }, { side: "B", regulars: 8000 }],
  ["Big edge in numbers", "princeton", { side: "P", regulars: 9000 }, { side: "B", regulars: 5000 }],
  ["Militia army attacks", "princeton", { side: "P", regulars: 2000, militia: 4000 }, { side: "B", regulars: 4000 }],
  ["Attack a city", "philadelphia", { side: "P", regulars: 9000, general: "washington" }, { side: "B", regulars: 7000, general: "howe" }],
  ["British attack hills", "highlands", { side: "B", regulars: 9000, general: "cornwallis" }, { side: "P", regulars: 5000, militia: 1500, general: "putnam" }],
  ["Hessians in winter quarters", "trenton", { side: "P", regulars: 2400, general: "washington" }, { side: "B", regulars: 1500, general: "rall", hessian: true }, { surprise: true }],
  ["Riflemen in the woods", "saratoga", { side: "P", regulars: 5000, militia: 2000, general: "morgan" }, { side: "B", regulars: 6000, general: "burgoyne" }],
];

const N = Number(process.argv[2] || 300);
for (const [label, region, a, d, opts = {}] of CASES) {
  let wins = 0, quick = 0, la = 0, ld = 0;
  for (let i = 0; i < N; i++) {
    const state = newGame(500 + i, "1776");
    state.armies = {};
    const att = newArmy(state, { side: a.side, region, regulars: a.regulars, general: a.general || null, hessian: !!a.hessian });
    if (a.militia) att.militia.push({ men: a.militia, left: 3 });
    const def = newArmy(state, { side: d.side, region, regulars: d.regulars, general: d.general || null, hessian: !!d.hessian });
    if (d.militia) def.militia.push({ men: d.militia, left: 3 });
    if (i === 0) quick = winChance(state, att, def, region, opts);
    const b = setupBattle(state, att, def, region, opts, 1000 + i * 7);
    while (!b.over) { aiOrders(b, "P"); aiOrders(b, "B"); step(b); }
    const o = outcomeOf(b);
    if (o.attackerWins) wins++;
    la += o.attLoss; ld += o.defLoss;
  }
  console.log(`${label.padEnd(30)} quick ${String(Math.round(quick * 100)).padStart(3)}%   field ${String(Math.round((wins / N) * 100)).padStart(3)}%   losses att ${Math.round((la / N) * 100)}% def ${Math.round((ld / N) * 100)}%`);
}
