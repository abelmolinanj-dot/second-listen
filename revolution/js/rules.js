// Core rules: armies, movement, battles, money and Cause. Nothing here touches the page,
// so the same code runs in the browser and in the headless test in tools/simulate.mjs.

import { REGIONS, ADJ, isWaterCrossing } from "./data/regions.js";
import { makeRng, between } from "./rng.js";

export const SIDES = { P: "Continental", B: "British" };
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// --- tuning numbers, kept together so balance changes happen in one place ---
export const COST = {
  regulars: 20,        // $k per 1,000 Continental regulars, before inflation
  militia: 5,          // $k per 1,000 militia
  upkeepRegulars: 2.0, // $k per 1,000 regulars per month
  upkeepMilitia: 0.7,   // $k per 1,000 militia per month
  printAmount: 60,     // $k printed per press run
  printInflation: 0.10,// each press run raises prices this much
  baseInflation: 0.02, // prices drift up this much every month of the war
  incomeScale: 0.5,    // share of a region's wealth Congress actually collects
};
export const MILITIA_MONTHS = 3;
export const SEA_RANGE = 3;
export const RECRUIT_BATCH = 1000;

export const QUALITY = { P: 1.0, B: 1.15 };
const MILITIA_QUALITY = 0.55;

export const rng = (state) => makeRng(state);

// --- dates ---
export function monthIndex(state) { return (state.startMonth + state.turn) % 12; }
export function year(state) { return state.startYear + Math.floor((state.startMonth + state.turn) / 12); }
export function dateLabel(state) { return MONTHS[monthIndex(state)] + " " + year(state); }
export function isWinter(state) { const m = monthIndex(state); return m === 11 || m === 0 || m === 1; }

// Weather, rolled each month. Rain wets the powder (attacks weaker); fog hides an approach (attacks stronger).
export const WEATHER = {
  clear: { icon: "☀", label: "Clear", hint: "" },
  rain: { icon: "☂", label: "Rain", hint: "Rain: wet powder makes every attack weaker this month." },
  fog: { icon: "≈", label: "Fog", hint: "Fog: attackers can get close unseen, so attacks are stronger this month." },
  snow: { icon: "❄", label: "Snow", hint: "" },
};
export function season(state) { const m = monthIndex(state); return m === 11 || m <= 1 ? "winter" : m <= 4 ? "spring" : m <= 7 ? "summer" : "autumn"; }
export function rollWeather(state) {
  const r = rng(state)();
  const s = season(state);
  if (s === "winter") return r < 0.4 ? "snow" : r < 0.5 ? "fog" : "clear";
  if (s === "spring") return r < 0.35 ? "rain" : r < 0.45 ? "fog" : "clear";
  if (s === "autumn") return r < 0.25 ? "rain" : r < 0.4 ? "fog" : "clear";
  return r < 0.15 ? "rain" : "clear";
}

// --- lookups ---
export const region = (id) => REGIONS[id];
export const armyList = (state, side) => Object.values(state.armies).filter((a) => !side || a.side === side);
export const armyAt = (state, regionId, side) =>
  Object.values(state.armies).find((a) => a.region === regionId && (!side || a.side === side));
export const generalOf = (state, army) => (army && army.general ? state.generals[army.general] : null);
export const findGeneralArmy = (state, genId) => Object.values(state.armies).find((a) => a.general === genId);
export const enemy = (side) => (side === "P" ? "B" : "P");

export function militiaMen(army) { return army.militia.reduce((s, b) => s + b.men, 0); }
export function armyMen(army) { return army.regulars + militiaMen(army); }
// Numbers of men as a letter writer would put them: "8,000", "750".
export function menWords(n) { const r = n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 10) * 10; return r.toLocaleString("en-US"); }
export function fmtMen(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k" : String(Math.round(n)); }
export function money(n) { return "$" + Math.round(n) + "k"; }

// Raw fighting strength before terrain and generals.
export function power(state, army, regionId) {
  const g = generalOf(state, army);
  let mq = g && g.trait === "oldwolf" ? 0.7 : g && g.trait === "drillmaster" ? 0.85 : MILITIA_QUALITY;
  // Militia fight from behind trees and stone walls far better than in the open.
  if (regionId && REGIONS[regionId].terrain) mq = Math.max(mq, 0.75);
  return army.regulars * QUALITY[army.side] + militiaMen(army) * mq;
}

export function log(state, text, kind = "info") {
  state.log.unshift({ turn: state.turn, text, kind });
  if (state.log.length > 200) state.log.length = 200;
}

// --- Cause and loyalties ---
export function changeCause(state, delta, why) {
  const before = state.cause;
  state.cause = Math.max(0, Math.min(100, state.cause + delta));
  if (why && Math.round(state.cause - before) !== 0) log(state, `Cause ${delta > 0 ? "+" : ""}${Math.round(state.cause - before)}: ${why}`, delta > 0 ? "good" : "bad");
}

export function changeLoyalty(state, genId, delta) {
  const g = state.generals[genId];
  if (!g || g.side !== "P") return;
  g.loyalty = Math.max(0, Math.min(100, g.loyalty + delta));
}

// --- money ---
export function earn(state, amount, line) {
  state.treasury += amount;
  state.ledger.current[line] = (state.ledger.current[line] || 0) + amount;
}
export function spend(state, amount, line) {
  state.treasury -= amount;
  state.ledger.current[line] = (state.ledger.current[line] || 0) - amount;
}

export function regionIncome(state, id) {
  const r = state.regions[id];
  if (r.owner !== "P") return 0;
  return REGIONS[id].income * COST.incomeScale * (1 - r.loyalist / 100);
}
export function monthlyIncome(state) {
  return Object.keys(state.regions).reduce((s, id) => s + regionIncome(state, id), 0);
}
export function armyUpkeep(state, army) {
  const g = generalOf(state, army);
  const base = (army.regulars / 1000) * COST.upkeepRegulars + (militiaMen(army) / 1000) * COST.upkeepMilitia;
  return base * state.priceLevel * (g && g.trait === "quartermaster" ? 0.5 : 1);
}
export function monthlyUpkeep(state) {
  return armyList(state, "P").reduce((s, a) => s + armyUpkeep(state, a), 0);
}
export const regularsCost = (state) => COST.regulars * state.priceLevel;
export const militiaCost = (state) => COST.militia * state.priceLevel;

export function printMoney(state) {
  earn(state, COST.printAmount, "printed");
  state.priceLevel *= 1 + COST.printInflation;
  state.pressRuns += 1;
  log(state, `Congress printed ${money(COST.printAmount)} in Continental bills. Prices rose ${Math.round(COST.printInflation * 100)}%.`, "money");
}

// --- recruiting ---
export function canRecruit(state, regionId, kind) {
  const r = state.regions[regionId];
  if (!r || r.owner !== "P") return "Only in regions you control.";
  if (state.recruited[regionId]) return "Already recruited here this month.";
  if (armyAt(state, regionId, "B")) return "The enemy is here.";
  if (kind === "regulars") {
    if (state.cause < 15) return "Cause is too low to enlist regulars.";
    if (state.treasury < regularsCost(state)) return "Not enough money.";
  } else {
    if (state.cause < 25) return "Cause is too low to call out militia.";
    if (r.loyalist >= 60) return "Too many Loyalists here to raise militia.";
    if (state.treasury < militiaCost(state)) return "Not enough money.";
  }
  return null;
}

function joinOrCreate(state, regionId, regulars, militia) {
  let a = armyAt(state, regionId, "P");
  if (!a) {
    a = newArmy(state, { side: "P", region: regionId, regulars: 0 });
    a.moved = true;
  }
  a.regulars += regulars;
  if (militia) a.militia.push({ men: militia, left: MILITIA_MONTHS });
  return a;
}

export function recruit(state, regionId, kind) {
  const why = canRecruit(state, regionId, kind);
  if (why) return why;
  if (kind === "regulars") {
    spend(state, regularsCost(state), "recruiting");
    joinOrCreate(state, regionId, RECRUIT_BATCH, 0);
    log(state, `Enlisted ${menWords(RECRUIT_BATCH)} Continental regulars at ${REGIONS[regionId].name}.`, "money");
  } else {
    spend(state, militiaCost(state), "recruiting");
    joinOrCreate(state, regionId, 0, RECRUIT_BATCH);
    log(state, `Called out ${menWords(RECRUIT_BATCH)} militia at ${REGIONS[regionId].name} for ${MILITIA_MONTHS} months.`, "money");
  }
  state.recruited[regionId] = true;
  return null;
}

// --- armies ---
export function newArmy(state, { side, region: regionId, regulars, militia = 0, general = null, hessian = false }) {
  const id = "a" + state.nextArmyId++;
  const a = { id, side, region: regionId, regulars, militia: [], general, hessian, moved: false, dugIn: false };
  if (militia) a.militia.push({ men: militia, left: 99 });
  state.armies[id] = a;
  if (general) state.generals[general].status = "active";
  return a;
}

function removeArmy(state, army) {
  delete state.armies[army.id];
}

function mergeInto(state, from, to) {
  to.regulars += from.regulars;
  to.militia.push(...from.militia);
  if (from.general) {
    const fg = state.generals[from.general];
    const tg = generalOf(state, to);
    if (!tg || fg.rank > tg.rank) {
      if (tg) tg.status = "reserve";
      to.general = from.general;
    } else {
      fg.status = "reserve";
    }
  }
  to.hessian = to.hessian && from.hessian;
  removeArmy(state, from);
}

export function assignGeneral(state, genId, armyId) {
  const g = state.generals[genId];
  const a = state.armies[armyId];
  if (!g || !a || g.side !== a.side || g.status !== "reserve") return "That general isn't available.";
  if (a.general) state.generals[a.general].status = "reserve";
  a.general = genId;
  g.status = "active";
  if (g.hessian) a.hessian = true;
  return null;
}

export function reserveGenerals(state, side) {
  return Object.entries(state.generals).filter(([, g]) => g.side === side && g.status === "reserve").map(([id]) => id);
}

// Split off part of an army (no general) that can then move on its own.
function detach(state, army, share) {
  const part = newArmy(state, { side: army.side, region: army.region, regulars: Math.round(army.regulars * share) });
  army.regulars -= part.regulars;
  for (const b of army.militia) {
    const m = Math.round(b.men * share);
    if (m > 0) { part.militia.push({ men: m, left: b.left }); b.men -= m; }
  }
  army.militia = army.militia.filter((b) => b.men > 0);
  part.hessian = army.hessian;
  return part;
}

// Where an army can go this turn.
export function moveTargets(state, army) {
  if (army.moved) return [];
  const out = new Map();
  for (const t of ADJ[army.region]) out.set(t, { region: t, sea: false });
  // The Royal Navy controls the coast: British armies in a coastal region can land at other coastal regions
  // within a few days' sail (three regions by land).
  if (army.side === "B" && REGIONS[army.region].coastal && !state.noNavy) {
    for (const [id, r] of Object.entries(REGIONS)) {
      if (r.coastal && id !== army.region && !out.has(id) && !(state.closedPorts || []).includes(id) && !(army.side === "B" && (state.flags.noLandingsUntil ?? -1) >= state.turn) && distance(army.region, id) <= SEA_RANGE) out.set(id, { region: id, sea: true });
    }
  }
  return [...out.values()].map((t) => {
    const foe = armyAt(state, t.region, enemy(army.side));
    const friend = armyAt(state, t.region, army.side);
    const kind = foe ? "attack" : friend ? "merge" : state.regions[t.region].owner === army.side ? "move" : "capture";
    return { ...t, kind };
  });
}

// --- battle math ---
// Tactics for a big attack, chosen in the battle close-up. A multiplies the attack; the loss numbers scale casualties.
export const TACTICS = {
  charge: { label: "Frontal bayonet charge", A: 1.12, winLoss: 1.35, loseLoss: 1.25 },
  volley: { label: "Steady volleys", A: 1, winLoss: 1, loseLoss: 1 },
  flank: { label: "Turn their flank" },
  probe: { label: "Probe and pull back", A: 0.9, winLoss: 0.9, loseLoss: 0.55 },
  flankHit: { A: 1.3, winLoss: 0.9, loseLoss: 1 },
  flankMiss: { A: 0.85, winLoss: 1, loseLoss: 1.15 },
};
// The chance a flanking march works: better with an attacking general, and in woods or hills that hide it.
export function flankChance(state, army, regionId) {
  const g = generalOf(state, army);
  const p = 0.35 + 0.1 * (g ? g.atk : 0) + (REGIONS[regionId].terrain ? 0.1 : 0) + (g && g.trait === "riflemen" ? 0.1 : 0);
  return Math.max(0.25, Math.min(0.85, p));
}

export function battleFactors(state, att, def, regionId, { surprise = false, sea = false, tactic = null } = {}) {
  const ag = generalOf(state, att);
  const dg = generalOf(state, def);
  const r = REGIONS[regionId];
  let A = power(state, att, regionId) * (1 + 0.12 * (ag ? ag.atk : 0));
  let D = power(state, def, regionId) * (1 + 0.12 * (dg ? dg.def : 0));
  if (r.terrain === "hills") D *= 1.2;
  else if (r.terrain === "forest") D *= 1.1;
  if (ag && ag.trait === "bold") A *= 1.15;
  if (isWinter(state) && !surprise) A *= 0.8;
  if (state.weather === "rain") A *= 0.88;
  if (state.weather === "fog") A *= 1.1;
  if (surprise) A *= 1.4;
  if (sea || isWaterCrossing(att.region, regionId)) A *= att.side === "B" ? 0.95 : 0.8;
  if (r.fort) D *= 1.3;
  else if (r.city) D *= 1.1;
  if ((r.fort || r.city) && dg && dg.trait === "artillery") D *= 1.25;
  if (def.dugIn) D *= 1.25;
  if (def.dugIn && dg && dg.trait === "entrenched") D *= 1.15;
  // Riflemen pick off officers from cover: deadly in forest and hills, ordinary in the open.
  if (r.terrain && ag && ag.trait === "riflemen") A *= 1.2;
  if (!r.terrain && !r.fort && ag && ag.trait === "cavalry") A *= 1.2;
  if (r.terrain && dg && dg.trait === "riflemen") D *= 1.15;
  if (state.regions[regionId].works && def.side === "P") D *= 1.15;
  if (surprise && dg && dg.trait === "complacent") D *= 0.55;
  // A flank march the defender failed to watch for (set by a scenario, for one side, for one month).
  const fb = state.flags && state.flags.flankBonus;
  if (fb && fb.side === att.side && fb.turn === state.turn) A *= 1.3;
  if (tactic && TACTICS[tactic] && TACTICS[tactic].A) A *= TACTICS[tactic].A;
  return { A, D };
}

// Chance an attack succeeds, estimated by simulating the dice. Used for the preview and by the AI.
export function winChance(state, att, def, regionId, opts = {}) {
  if (opts.tactic === "flank") {
    const p = flankChance(state, att, regionId);
    return p * winChance(state, att, def, regionId, { ...opts, tactic: "flankHit" }) + (1 - p) * winChance(state, att, def, regionId, { ...opts, tactic: "flankMiss" });
  }
  const { A, D } = battleFactors(state, att, def, regionId, opts);
  let wins = 0;
  const N = 400;
  for (let i = 0; i < N; i++) {
    const a = A * (0.8 + 0.4 * Math.random());
    const d = D * (0.8 + 0.4 * Math.random());
    if (a > d) wins++;
  }
  return wins / N;
}

export function oddsLabel(p) {
  if (p >= 0.9) return "Overwhelming";
  if (p >= 0.65) return "Favorable";
  if (p >= 0.4) return "Even";
  if (p >= 0.15) return "Unfavorable";
  return "Hopeless";
}

function applyLosses(army, frac, militiaExtra) {
  const lostReg = Math.round(army.regulars * frac);
  army.regulars -= lostReg;
  let lostMil = 0;
  const mf = Math.min(0.85, frac * militiaExtra);
  for (const b of army.militia) { const m = Math.round(b.men * mf); b.men -= m; lostMil += m; }
  army.militia = army.militia.filter((b) => b.men > 50);
  return lostReg + lostMil;
}

// Pick where a beaten army falls back to, or null if it is trapped.
export function retreatSpot(state, army, avoid) {
  const options = ADJ[army.region].filter((t) => t !== avoid && !armyAt(state, t, enemy(army.side)) && state.regions[t].owner === army.side);
  if (!options.length) return null;
  const danger = (t) => ADJ[t].reduce((s, n) => { const e = armyAt(state, n, enemy(army.side)); return s + (e ? armyMen(e) : 0); }, 0);
  options.sort((x, y) => (armyAt(state, y, army.side) ? 1 : 0) - (armyAt(state, x, army.side) ? 1 : 0) || danger(x) - danger(y));
  return options[0];
}

function relocate(state, army, to) {
  const there = armyAt(state, to, army.side);
  army.region = to;
  if (there && there !== army) { mergeInto(state, army, there); return there; }
  return army;
}

function captureRegion(state, regionId, side) {
  const r = state.regions[regionId];
  if (r.owner === side) return;
  const name = REGIONS[regionId].name;
  r.owner = side;
  if (side === "B") {
    if (REGIONS[regionId].city) changeCause(state, regionId === "philadelphia" ? -state.philadelphiaLoss : -3, `${name} fell to the British.`);
  } else {
    r.loyalist = Math.max(5, r.loyalist - 10);
    if (REGIONS[regionId].city) changeCause(state, 3, `${name} was retaken.`);
  }
}

// Move an army (or part of it) into a target region, fighting if the enemy is there.
// Returns a report describing what happened, or a string explaining why it can't.
export function moveArmy(state, armyId, targetId, { share = 1, surprise = false, withGeneral = false, tactic = null, outcome = null } = {}) {
  let army = state.armies[armyId];
  if (!army) return "No such army.";
  const target = moveTargets(state, army).find((t) => t.region === targetId);
  if (!target) return "That army can't reach there this turn.";
  if (share < 1) {
    if (armyMen(army) < 400) return "Too few men to split.";
    const main = army;
    army = detach(state, army, share);
    if (withGeneral && main.general) { army.general = main.general; main.general = null; }
  }
  const from = army.region;
  army.moved = true;
  army.dugIn = false;
  const foe = armyAt(state, targetId, enemy(army.side));
  if (!foe) {
    const merged = relocate(state, army, targetId);
    captureRegion(state, targetId, army.side);
    return { type: "move", side: army.side, from, to: targetId, armyId: merged.id };
  }
  return fight(state, army, foe, targetId, { surprise, sea: target.sea, tactic, outcome });
}

function fight(state, att, def, regionId, opts) {
  const rand = rng(state);
  // A flanking march either finds the enemy's flank or gets lost in the woods.
  let flank = null;
  if (opts.tactic === "flank") { flank = rand() < flankChance(state, att, regionId); opts = { ...opts, tactic: flank ? "flankHit" : "flankMiss" }; }
  const T = (opts.tactic && TACTICS[opts.tactic]) || TACTICS.volley;
  const f = battleFactors(state, att, def, regionId, opts);
  const A = f.A * between(rand, 0.8, 1.2);
  const D = f.D * between(rand, 0.8, 1.2);
  const ag = generalOf(state, att), dg = generalOf(state, def);
  const report = {
    type: "battle", region: regionId, from: att.region, surprise: !!opts.surprise,
    attacker: { side: att.side, general: ag ? ag.short : null, men: armyMen(att), id: att.id },
    defender: { side: def.side, general: dg ? dg.short : null, men: armyMen(def), id: def.id },
  };
  // A battle fought on the field (battle.js) brings its own result and losses.
  const O = opts.outcome;
  const attackerWins = O ? O.attackerWins : A > D;
  const ratio = O ? O.ratio : attackerWins ? A / D : D / A;
  const loserFrac = O ? (attackerWins ? O.defLoss : O.attLoss) : Math.min(0.6, 0.16 + 0.18 * (ratio - 1));
  const winnerFrac = O ? (attackerWins ? O.attLoss : O.defLoss) : Math.max(0.04, 0.12 - 0.05 * (ratio - 1));
  const loser = attackerWins ? def : att;
  const winner = attackerWins ? att : def;
  const lg = generalOf(state, loser);
  report.attackerWins = attackerWins;
  report.tactic = opts.tactic ? (flank === null ? opts.tactic : "flank") : null;
  report.flank = flank;
  // Tactics change the butcher's bill: a charge is bloody for everyone, a probe costs little if it fails.
  const bloody = opts.tactic === "charge" ? 1.2 : 1; // a bayonet charge costs the defender too
  const attackerMult = attackerWins ? T.winLoss ?? 1 : T.loseLoss ?? 1;
  const wl = attackerWins ? attackerMult : bloody;
  const ll = attackerWins ? bloody : attackerMult;
  report.fought = !!O;
  report.winnerLoss = applyLosses(winner, O ? winnerFrac : winnerFrac * wl, 1);
  report.loserLoss = applyLosses(loser, O ? loserFrac * (lg && lg.trait === "rearguard" ? 0.8 : 1) : loserFrac * ll * (lg && lg.trait === "rearguard" ? 0.65 : 1), O ? 1 : 1.4);
  if (attackerWins) {
    const to = retreatSpot(state, def, att.region);
    if (to) {
      report.retreatTo = to;
      relocate(state, def, to);
    } else if (dg && dg.trait === "steadfast") {
      // Washington cuts his way out to any open neighboring region.
      const out = ADJ[regionId].find((t) => !armyAt(state, t, att.side) && t !== att.region);
      if (out) {
        applyLosses(def, 0.25, 1.4);
        report.retreatTo = out;
        report.brokeOut = true;
        def.region = out;
        captureRegion(state, out, def.side);
      } else surrender(state, def, report);
    } else surrender(state, def, report);
    att.region = regionId;
    captureRegion(state, regionId, att.side);
  }
  // Cause reacts to how the Continentals fared.
  const patriotWon = winner.side === "P";
  const big = ratio > 1.6;
  const beloved = (ag && ag.trait === "beloved" && att.side === "P") || (dg && dg.trait === "beloved" && def.side === "P");
  if (patriotWon) changeCause(state, (attackerWins ? 4 : 3) + (big ? 2 : 0) + (beloved ? 2 : 0), `Victory at ${REGIONS[regionId].name}.`);
  else if (!report.surrendered) changeCause(state, -(lg && lg.trait === "steadfast" ? 2 : 3) - (big ? 1 : 0), `Defeat at ${REGIONS[regionId].name}.`);
  for (const a of [att, def]) if (state.armies[a.id] && armyMen(a) < 150) {
    if (a.general) state.generals[a.general].status = "reserve";
    removeArmy(state, a);
  }
  state.battles.push({ turn: state.turn, ...report });
  if (patriotWon || loser.side === "P") state.stats[patriotWon ? "won" : "lost"]++;
  return report;
}

function surrender(state, army, report) {
  report.surrendered = true;
  report.captured = armyMen(army);
  if (army.general) {
    state.generals[army.general].status = "captured";
    report.generalCaptured = state.generals[army.general].short;
  }
  if (army.side === "P") changeCause(state, -8, `An army of ${menWords(report.captured)} surrendered.`);
  else changeCause(state, 6, `An enemy army of ${menWords(report.captured)} surrendered.`);
  removeArmy(state, army);
}

// Dig in: skip moving to make the position harder to attack until your next turn.
export function digIn(state, armyId) {
  const a = state.armies[armyId];
  if (!a || a.moved) return "This army already acted this month.";
  a.moved = true;
  a.dugIn = true;
  // An engineer fortifies the ground for good.
  const eg = generalOf(state, a);
  if (eg && eg.trait === "engineer" && a.side === "P") state.regions[a.region].works = true;
  log(state, `${describeArmy(state, a)} dug in at ${REGIONS[a.region].name}.`);
  return null;
}

// Move an army back without a battle (used by letters).
export function withdraw(state, armyId) {
  const a = state.armies[armyId];
  if (!a) return null;
  const to = retreatSpot(state, a, null);
  if (!to) return null;
  const name = describeArmy(state, a);
  a.moved = true;
  relocate(state, a, to);
  log(state, `${name} fell back to ${REGIONS[to].name}.`);
  return to;
}

export function describeArmy(state, army) {
  const g = generalOf(state, army);
  return g ? `${g.short}'s army` : `${army.side === "P" ? "Continental" : army.hessian ? "Hessian" : "British"} troops`;
}

export function distance(from, to) {
  if (from === to) return 0;
  const seen = new Set([from]);
  let frontier = [from];
  for (let d = 1; frontier.length; d++) {
    const next = [];
    for (const r of frontier) for (const n of ADJ[r]) {
      if (n === to) return d;
      if (!seen.has(n)) { seen.add(n); next.push(n); }
    }
    frontier = next;
  }
  return Infinity;
}

// Total enemy strength one step from a region.
export function threatTo(state, regionId, side) {
  return ADJ[regionId].reduce((s, n) => { const e = armyAt(state, n, enemy(side)); return s + (e ? power(state, e) : 0); }, 0);
}

// ---------- supply ----------
// An army eats from a friendly city, fort or supply depot within a few regions, along a road of friendly
// regions with no enemy army on it. The British also supply by sea: any coastal region they hold works.
// Cut an army off, and it goes hungry.
export const SUPPLY_RANGE = 3;
export const DEPOT_COST = 10;

export function isSupplySource(state, side, id) {
  const r = REGIONS[id], s = state.regions[id];
  if (s.owner !== side) return false;
  if (r.city || r.fort || s.depot) return true;
  if (side === "B" && (r.coastal || id === "stjohns")) return true;
  return false;
}

// The road from an army to its nearest source of supply, as a list of region ids starting where the army is,
// or null if it's cut off.
export function supplyPath(state, army) {
  const side = army.side;
  if (isSupplySource(state, side, army.region)) return [army.region];
  const prev = { [army.region]: null };
  let frontier = [army.region];
  for (let d = 1; d <= SUPPLY_RANGE && frontier.length; d++) {
    const next = [];
    for (const id of frontier) for (const n of ADJ[id]) {
      if (n in prev) continue;
      if (state.regions[n].owner !== side || armyAt(state, n, enemy(side))) continue;
      prev[n] = id;
      if (isSupplySource(state, side, n)) {
        const path = [n];
        for (let p = id; p !== null; p = prev[p]) path.unshift(p);
        return path;
      }
      next.push(n);
    }
    frontier = next;
  }
  return null;
}

export function buildDepot(state, regionId) {
  const s = state.regions[regionId], r = REGIONS[regionId];
  if (s.owner !== "P") return "You can only build a depot in a region you hold.";
  if (r.city || r.fort || s.depot) return "This region already supplies your armies.";
  if (state.treasury < DEPOT_COST) return "The treasury can't cover a depot.";
  spend(state, DEPOT_COST, "fortifications");
  s.depot = true;
  log(state, `A supply depot was set up at ${r.name}.`, "money");
  return null;
}
