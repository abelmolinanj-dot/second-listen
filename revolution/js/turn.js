// Turn order. One turn is one month:
//   1. You move armies, recruit, print money and answer letters.
//   2. The British move.
//   3. The month closes: pay, desertion, winter, militia going home, debts.
//   4. The next month opens: taxes come in, reinforcements land, new letters arrive.

import { REGIONS } from "./data/regions.js";
import { SCENARIOS, DEFAULT_SCENARIO, scenarioOf } from "./data/scenarios.js";
import {
  armyList, armyAt, armyMen, militiaMen, newArmy, monthlyIncome, armyUpkeep, earn, spend, changeCause, log,
  isWinter, dateLabel, money, fmtMen, menWords, COST, generalOf, findGeneralArmy, enemy, rollWeather, supplyPath, moveArmy, condOf,
} from "./rules.js";
import { britishTurn } from "./ai.js";
import { registerEvents, deliverMail, soldierLetter, settleTray } from "./letters.js";
import { setupRival, updateRival } from "./rival.js";

// Each scenario's scripted letters only fire in that scenario.
for (const [id, s] of Object.entries(SCENARIOS)) registerEvents(s.SCENARIO_EVENTS, id);

export const SAVE_VERSION = 1;

export function newGame(seed = Date.now() % 2147483647, scenarioId = DEFAULT_SCENARIO) {
  const { SCENARIO, setupScenario } = SCENARIOS[scenarioId];
  const state = {
    version: SAVE_VERSION,
    scenario: SCENARIO.id,
    aiArea: SCENARIO.aiArea || null,
    seed,
    gameSeed: seed,
    turn: 0,
    startMonth: SCENARIO.startMonth,
    startYear: SCENARIO.startYear,
    lastTurn: SCENARIO.turns - 1,
    aiGoal: SCENARIO.aiGoal,
    aiGoalBold: !!SCENARIO.aiGoalBold,
    aiTargets: SCENARIO.aiTargets,
    closedPorts: SCENARIO.closedPorts,
    regions: {},
    armies: {},
    generals: {},
    nextArmyId: 1,
    nextLetterId: 1,
    treasury: SCENARIO.treasury ?? 80,
    priceLevel: SCENARIO.priceLevel ?? 1,
    pressRuns: 0,
    arrears: 0,
    loans: [],
    cause: SCENARIO.cause ?? 55,
    philadelphiaLoss: 10,
    ledger: { current: {}, history: [] },
    letters: [],
    mailbag: [],
    fired: {},
    cooldown: {},
    flags: {},
    recruited: {},
    log: [],
    battles: [],
    stats: { won: 0, lost: 0 },
    gameOver: null,
    winterNow: false,
  };
  setupScenario(state);
  state.regiments ||= {};
  state.habits ||= {};
  setupRival(state);
  openMonth(state, { first: true });
  return state;
}

// The player has finished their moves. Returns what happened, for the turn summary.
// If the British attack one of the player's big armies and state.fightDefense is on, the turn pauses:
// the summary comes back with paused: true and state.pendingDefense set. The player fights the battle, then
// resumeBritishAttack(state, outcome) resolves it and carries on with the rest of the turn.
export function endTurn(state) {
  if (state.gameOver) return null;
  if (state.pendingDefense) return { paused: true, battles: state.midTurn.battles, moves: state.midTurn.moves, notes: [] };
  // Any letter left unanswered is handled by the sender.
  settleTray(state);
  state.midTurn = { battles: [], moves: [], seq: [], before: state.log.length, startBattles: state.battles.length };
  return continueTurn(state);
}

// Fight the attack the British turn stopped for. outcome comes from the battlefield, or null to fight it the quick way.
export function resumeBritishAttack(state, outcome = null) {
  if (!state.pendingDefense || !state.midTurn) return null;
  const p = state.pendingDefense;
  state.pendingDefense = null;
  if (p && state.armies[p.armyId]) {
    const r = moveArmy(state, p.armyId, p.target, { share: p.share, withGeneral: true, outcome });
    if (typeof r === "object") { (r.type === "battle" ? state.midTurn.battles : state.midTurn.moves).push(r); (state.midTurn.seq ||= []).push(r); }
  }
  return continueTurn(state);
}

function continueTurn(state) {
  const m = state.midTurn;
  const summary = { battles: m.battles, moves: m.moves, seq: (m.seq ||= []), notes: [] };
  const before = m.before;

  // 2. The British move.
  const startBattles = m.startBattles;
  const reports = britishTurn(state);
  for (const r of reports) {
    if (r.type === "battle") summary.battles.push(r);
    else summary.moves.push(r);
    summary.seq.push(r); // in the order they happened, so the map can replay them
  }
  if (reports.paused) { summary.paused = true; return summary; }
  state.midTurn = null;
  for (const b of state.battles.slice(startBattles)) {
    if (b.attacker.side === "P" || b.defender.side === "P") {
      const patriotWon = (b.attackerWins ? b.attacker : b.defender).side === "P";
      soldierLetter(state, patriotWon ? "won" : "lost");
    }
  }
  checkDefeat(state);
  if (state.gameOver) return summary;

  // 3. Close the month.
  closeMonth(state);
  checkDefeat(state);
  if (state.gameOver) return summary;

  if (state.turn >= state.lastTurn) {
    finishScenario(state);
    return summary;
  }

  // 4. Open the next month.
  state.turn += 1;
  openMonth(state, {});
  checkDefeat(state);
  summary.newLog = state.log.slice(0, state.log.length - before);
  return summary;
}

function closeMonth(state) {
  const winter = isWinter(state);

  // Pay the army. Whatever can't be paid becomes back pay owed.
  let upkeep = 0;
  for (const a of armyList(state, "P")) upkeep += armyUpkeep(state, a);
  const paid = Math.min(upkeep, Math.max(0, state.treasury));
  spend(state, paid, "upkeep");
  if (upkeep - paid > 0.5) {
    state.arrears += upkeep - paid;
    log(state, `The treasury fell ${money(upkeep - paid)} short of the army's pay. It is owed as back pay.`, "bad");
  }

  // Loans that fall due.
  for (const loan of state.loans.filter((l) => l.due === state.turn)) {
    const pay = Math.min(loan.amount, Math.max(0, state.treasury));
    spend(state, pay, "loan repayment");
    if (pay < loan.amount) {
      state.arrears += loan.amount - pay;
      changeCause(state, -3, "Congress defaulted on a loan.");
    } else log(state, `Repaid ${money(loan.amount)} to the ${loan.lender}.`, "money");
  }
  state.loans = state.loans.filter((l) => l.due !== state.turn);

  // Unpaid men desert, unless they were fed by requisition this month.
  if (state.arrears > 0 && state.flags.requisitioned !== state.turn) {
    let gone = 0;
    for (const a of armyList(state, "P")) { const d = Math.round(a.regulars * 0.05); a.regulars -= d; gone += d; }
    if (gone) log(state, `${menWords(gone)} unpaid regulars deserted.`, "bad");
    changeCause(state, -2, "Soldiers are going unpaid.");
  }

  // Winter: armies camped outside a city lose men to cold and sickness.
  if (winter) {
    for (const a of Object.values(state.armies)) {
      const inCity = REGIONS[a.region].city;
      let rate = a.side === "P" ? (inCity ? 0.01 : state.arrears > 0 ? 0.06 : 0.03) : inCity ? 0 : 0.02;
      // Funded hospitals and good care in camp save lives.
      if (a.side === "P" && state.flags.hospitals) rate *= 0.6;
      if (a.side === "P" && state.flags.marthaInCamp && a.general === "washington") rate *= 0.7;
      a.regulars = Math.round(a.regulars * (1 - rate));
      for (const b of a.militia) b.men = Math.round(b.men * (1 - rate * 1.5));
    }
  }

  // Condition: rest restores an army; winter in the open, hunger and empty pockets wear it down.
  for (const a of Object.values(state.armies)) {
    let c = condOf(a);
    c += a.marched === state.turn ? 4 : 15;
    if (a.side === "P" && state.role && state.role.id === "greene") c += 5;
    if (REGIONS[a.region].city) c += 5;
    if (winter && !REGIONS[a.region].city) c -= a.side === "P" ? 9 : 6;
    if (a.side === "P" && !supplyPath(state, a)) c -= 12;
    if (a.side === "P" && state.arrears > 0) c -= 4;
    if (a.side === "P" && state.flags.hospitals && winter) c += 4;
    a.cond = Math.max(0, Math.min(100, Math.round(c)));
    // A broken-down army sheds men: the sick, the shoeless and the hopeless go home.
    if (a.side === "P" && a.cond < 25) {
      const d = Math.round(a.regulars * 0.04);
      a.regulars -= d;
      if (d > 50) log(state, `${menWords(d)} men left the worn-out army at ${REGIONS[a.region].name}.`, "bad");
    }
  }

  // Militia whose time is up go home.
  for (const a of armyList(state, "P")) {
    let home = 0;
    for (const b of a.militia) { b.left -= 1; if (b.left <= 0) home += b.men; }
    a.militia = a.militia.filter((b) => b.left > 0);
    if (home) log(state, `${menWords(home)} militia went home from ${REGIONS[a.region].name} when their time was up.`);
  }

  // Occupation changes minds. British troops win Loyalists; Hessian plundering loses them.
  for (const [id, r] of Object.entries(state.regions)) {
    const b = armyAt(state, id, "B");
    if (r.owner === "B" && b) r.loyalist = Math.max(5, Math.min(90, r.loyalist + (b.hessian ? -3 : 2)));
  }

  // Loyalists enlist with the British where support is strong.
  for (const a of armyList(state, "B")) {
    const loy = state.regions[a.region].loyalist;
    if (loy >= 45) a.regulars += Math.round(loy * 5);
  }

  // Anything special this scenario does at the end of a month (supply lines, for example).
  scenarioOf(state).SCENARIO.onCloseMonth?.(state);

  // Armies cut off from supply go hungry: men fall sick, desert, or wander off to forage.
  for (const a of Object.values(state.armies)) {
    a.unsupplied = !supplyPath(state, a);
    if (!a.unsupplied || armyMen(a) < 100) continue;
    const lostReg = Math.round(a.regulars * 0.05);
    let lostMil = 0;
    for (const b of a.militia) { const m = Math.round(b.men * 0.08); b.men -= m; lostMil += m; }
    a.regulars -= lostReg;
    const lost = lostReg + lostMil;
    if (lost > 30) log(state, `${a.side === "P" ? "Our" : "An enemy"} army at ${REGIONS[a.region].name} is cut off from supply and lost ${menWords(lost)} men.`, a.side === "P" ? "bad" : "good");
  }

  // Remove armies that have melted away.
  for (const a of Object.values(state.armies)) {
    if (armyMen(a) < 100) {
      if (a.general) state.generals[a.general].status = "reserve";
      delete state.armies[a.id];
    }
  }

  // Close the books for the month.
  state.priceLevel *= 1 + COST.baseInflation;
  state.ledger.history.unshift({ turn: state.turn, label: dateLabel(state), lines: state.ledger.current, closing: state.treasury, arrears: state.arrears, priceLevel: state.priceLevel });
  state.ledger.current = {};
}

function openMonth(state, { first }) {
  state.winterNow = isWinter(state);
  state.weather = rollWeather(state);
  state.recruited = {};
  for (const a of Object.values(state.armies)) {
    a.moved = false;
    if (a.side === "P") a.dugIn = false;
    if (a.stalled) a.stalled -= 1;
  }

  // Taxes from the states, which first go to back pay.
  {
    const income = monthlyIncome(state);
    earn(state, income, "taxes");
    if (state.arrears > 0) {
      const pay = Math.min(state.arrears, state.treasury);
      if (pay > 0) { spend(state, pay, "back pay"); state.arrears -= pay; log(state, `Paid ${money(pay)} of back pay.`, "money"); }
    }
  }

  // The enlistment crisis, if the bounty wasn't paid.
  if (state.flags.enlistmentsLapse && state.turn === 6) {
    let gone = 0;
    for (const a of armyList(state, "P")) { const d = Math.round(a.regulars * 0.33); a.regulars -= d; gone += d; }
    state.flags.enlistmentsLapse = false;
    log(state, `Enlistments ran out. ${menWords(gone)} regulars went home.`, "bad");
  }

  // Reinforcements land.
  for (const r of scenarioOf(state).REINFORCEMENTS.filter((x) => x.turn === state.turn)) landReinforcement(state, r);
  scenarioOf(state).SCENARIO.onOpenMonth?.(state);
  updateRival(state);

  deliverMail(state);
  log(state, dateLabel(state), "date");
}

function landReinforcement(state, r) {
  let where = r.region;
  if (state.regions[where].owner !== r.side || armyAt(state, where, enemy(r.side))) {
    where = Object.keys(REGIONS).find((id) => REGIONS[id].coastal && state.regions[id].owner === r.side && !armyAt(state, id, enemy(r.side)));
  }
  if (!where) return;
  const there = armyAt(state, where, r.side);
  if (there) {
    there.regulars += r.regulars;
    if (r.general) state.generals[r.general].status = "reserve";
  } else {
    newArmy(state, { side: r.side, region: where, regulars: r.regulars, general: r.general || null, hessian: !!r.hessian });
  }
  if (r.text) log(state, r.text, "enemy");
}

function checkDefeat(state) {
  if (state.gameOver) return;
  const S = scenarioOf(state).SCENARIO;
  const lost = (S.mustSurvive || []).find((g) => state.generals[g] && state.generals[g].status === "captured");
  if (lost) {
    const name = state.generals[lost].name;
    state.gameOver = { result: "defeat", stars: 0, title: `${name.split(" ").pop()} is captured`, text: `With ${name} in a British prison, the army fell apart. Congress sued for peace on the King's terms.` };
  } else if (state.cause <= 0) {
    state.gameOver = { result: "defeat", stars: 0, title: "The Cause is lost", text: "Nobody believed anymore. Militia stayed home, Congress dissolved, and the rebellion faded away." };
  } else if (S.checkEnd) {
    const end = S.checkEnd(state);
    if (end) state.gameOver = end;
  }
}

function finishScenario(state) {
  state.gameOver = scenarioOf(state).SCENARIO.finish(state);
}

export function summaryOfMonth(state) {
  const last = state.ledger.history[0];
  return last;
}

// Lets the letters and the interface end a campaign early (for example, when an enemy army surrenders).
export { checkDefeat };
export { scenarioOf, dateLabel, militiaMen, generalOf };
