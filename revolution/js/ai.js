// The British commander. Each army looks at its options, scores them, and takes the best one.
// Generals' traits shape the choices: Howe is cautious, Cornwallis aggressive, Carleton stays in the north.

import { REGIONS, ADJ } from "./data/regions.js";
import {
  armyList, armyAt, armyMen, power, generalOf, moveTargets, winChance, moveArmy, isWinter,
  reserveGenerals, assignGeneral, threatTo, distance, log,
} from "./rules.js";

const NORTH = new Set(["stjohns", "ticonderoga", "bennington", "albany", "mohawk", "newhampshire", "springfield", "kingston"]);

function value(state, id) {
  const r = REGIONS[id];
  return (r.city ? 12 : 4) + (r.fort ? 3 : 0) + (state.aiTargets[id] || 0);
}

function attackThreshold(g, defender, winter) {
  let t = 0.65;
  if (g && g.trait === "cautious") t = defender.dugIn ? 0.88 : 0.75;
  if (g && g.trait === "aggressive") t = 0.55;
  if (winter) t = Math.max(t, 0.85);
  return t;
}

function scoreOption(state, army, opt, winter) {
  const g = generalOf(state, army);
  if (g && g.trait === "northern" && !NORTH.has(opt.region)) return null;
  if (!g || g.trait !== "northern") if (NORTH.has(opt.region) && opt.region !== "albany" && opt.region !== "kingston") return null;
  if (opt.sea && winter) return null;
  const mine = power(state, army);
  let score;
  if (opt.kind === "attack") {
    const foe = armyAt(state, opt.region, "P");
    const p = winChance(state, army, foe, opt.region, { sea: opt.sea });
    if (p < attackThreshold(g, foe, winter)) return null;
    score = p * (value(state, opt.region) + armyMen(foe) / 400) - (1 - p) * 10;
  } else if (opt.kind === "capture") {
    const danger = threatTo(state, opt.region, "B");
    if (danger > mine * 0.8) return null;
    if (winter && (opt.sea || danger > mine * 0.3)) return null;
    score = value(state, opt.region) - danger / 2500;
    if (winter) score *= 0.5;
  } else {
    // Moving within British territory: only worth it to get closer to the fighting.
    const here = threatTo(state, army.region, "B");
    if (here > 0 || opt.sea) return null;
    const goal = state.aiGoal;
    score = distance(opt.region, goal) < distance(army.region, goal) ? 1.5 : 0;
    if (opt.kind === "merge") score += 0.5;
  }
  if (opt.sea) score -= 4;
  return score;
}

export function britishTurn(state) {
  const reports = [];
  const winter = isWinter(state);

  // Give spare generals to armies that lack one, biggest armies first.
  const leaderless = armyList(state, "B").filter((a) => !a.general).sort((x, y) => armyMen(y) - armyMen(x));
  for (const a of leaderless) {
    const spare = reserveGenerals(state, "B").filter((g) => !(state.generals[g].trait === "northern"));
    if (!spare.length) break;
    assignGeneral(state, spare[0], a.id);
  }

  const order = armyList(state, "B").sort((x, y) => armyMen(y) - armyMen(x));
  for (const army of order) {
    if (!state.armies[army.id] || army.moved) continue;
    if (army.stalled > 0) continue;
    const options = moveTargets(state, army)
      .map((o) => ({ ...o, score: scoreOption(state, army, o, winter) }))
      .filter((o) => o.score !== null && o.score > 0.5)
      .sort((x, y) => y.score - x.score);
    if (!options.length) continue;

    // A large army can send a detachment to grab an undefended region before the main body moves.
    const best = options[0];
    const spareGrab = options.find((o) => o !== best && o.kind === "capture" && !o.sea);
    if (spareGrab && armyMen(army) >= 10000 && !winter) {
      const r = moveArmy(state, army.id, spareGrab.region, { share: 0.2 });
      if (typeof r === "object") reports.push(r);
    }

    // Don't leave a city empty when the Continentals are nearby.
    let share = 1;
    const leavingCity = REGIONS[army.region].city && best.kind !== "merge";
    if (leavingCity && threatTo(state, army.region, "B") > 0 && armyMen(army) > 5000) share = 0.75;
    const r = moveArmy(state, army.id, best.region, { share, withGeneral: true });
    if (typeof r === "object") reports.push(r);
    else log(state, "British AI: " + r);
  }

  // Hessians garrisoning the front go into winter quarters.
  return reports;
}

export { NORTH };
