// Letters: how your generals, Congress and others talk to you.
// Some arrive on a schedule (the scenario's events). Others are written when something happens,
// such as an army that is badly outnumbered. Letters from far away arrive a month late, because
// in 1776 news traveled by courier.

import { REGIONS } from "./data/regions.js";
import {
  armyList, armyAt, armyMen, power, generalOf, findGeneralArmy, threatTo, distance, digIn, withdraw,
  militiaCost, spend, changeLoyalty, log, fmtMen, menWords, money, MILITIA_MONTHS, enemy,
} from "./rules.js";
import { makeRng, pick } from "./rng.js";
import { FIGURES } from "./data/figures.js";

export const EVENTS = {};
// scenarioId ties scripted letters to one scenario; letters registered without it can appear in any scenario.
export function registerEvents(list, scenarioId) { for (const e of list) EVENTS[e.id] = scenarioId ? { ...e, scenario: scenarioId } : e; }

const COURIER_RANGE = 3; // regions from Washington before a letter takes an extra month

// The same campaign should not read the same way twice. When an event offers several wordings (body as an array),
// each game picks one, steadily: the same game always shows the same version.
export function variantOf(state, key, n) {
  let h = (state.gameSeed ?? state.seed ?? 1) >>> 0;
  for (const ch of key) h = (Math.imul(h ^ ch.charCodeAt(0), 2654435761) >>> 0);
  return h % n;
}
const pickText = (state, e, field, ctx) => {
  const v = e[field];
  if (Array.isArray(v)) { const f = v[variantOf(state, e.id + field, v.length)]; return typeof f === "function" ? f(state, ctx) : f; }
  return typeof v === "function" ? v(state, ctx) : v;
};

// Create a letter from an event. `ctx` carries anything the choices need later (it is saved with the game).
// kind: "letter" (the default), "council" (several officers give their advice) or "intel" (a spy's report, maybe wrong).
export function sendLetter(state, eventId, ctx = {}, { delayed = false } = {}) {
  const e = EVENTS[eventId];
  const from = typeof e.from === "function" ? e.from(state, ctx) : e.from;
  const letter = {
    id: "L" + state.nextLetterId++,
    event: eventId,
    kind: e.kind || "letter",
    ctx,
    written: state.turn,
    turn: delayed ? state.turn + 1 : state.turn,
    from,
    fromName: e.fromName || senderName(state, from),
    place: e.place ? (typeof e.place === "function" ? e.place(state, ctx) : e.place) : null,
    title: pickText(state, e, "title", ctx),
    body: pickText(state, e, "body", ctx),
    council: e.council ? e.council(state, ctx) : null,
    choices: (e.choices || []).map((c) => ({ label: typeof c.label === "function" ? c.label(state, ctx) : c.label, hint: typeof c.hint === "function" ? c.hint(state, ctx) : c.hint || "" })),
    resolved: !(e.choices && e.choices.length),
    read: false,
    outcome: null,
  };
  if (delayed) state.mailbag.push(letter);
  else state.letters.unshift(letter);
  return letter;
}

export function senderName(state, from) {
  if (state.generals[from]) return state.generals[from].name;
  return (FIGURES[from] && FIGURES[from].name) || from;
}
export function senderRole(state, from) {
  return (FIGURES[from] && FIGURES[from].role) || "";
}

export function answerLetter(state, letterId, choiceIndex) {
  const letter = state.letters.find((l) => l.id === letterId);
  if (!letter || letter.resolved) return null;
  const e = EVENTS[letter.event];
  const choice = e.choices[choiceIndex];
  const outcome = choice.apply(state, letter.ctx, letter) || "";
  letter.resolved = true;
  letter.read = true;
  letter.chosen = choiceIndex;
  letter.outcome = outcome;
  if (outcome) log(state, outcome, "letter");
  return outcome;
}

export const unanswered = (state) => state.letters.filter((l) => !l.resolved);
// Letters that must be answered before the month can end: at most one a month. The rest wait in the dispatch tray.
export const MAX_LETTERS = 3;
export const urgent = (state) => state.letters.filter((l) => !l.resolved && !l.tray);
export const trayLetters = (state) => state.letters.filter((l) => !l.resolved && l.tray);

// How much a letter matters, for picking the one main letter of the month.
function weightOf(l) {
  const e = EVENTS[l.event] || {};
  if (e.main) return 5;
  if (l.kind === "council") return 4;
  if (e.scripted) return 3;
  if (l.kind === "intel") return 2;
  if (e.random) return 1;
  return 0;
}

// Sort this month's new mail: news is applied at once and reported in the paper; one letter waits for an answer;
// the others go to the tray, where the sender decides for himself if the Board says nothing by the end of the month.
export function triageMail(state) {
  const fresh = state.letters.filter((l) => !l.resolved && !l.triaged);
  for (const l of fresh) l.triaged = true;
  const open = [];
  for (const l of fresh) {
    const e = EVENTS[l.event] || {};
    const onlyNews = e.choices && e.choices.length === 1 && !e.choices[0].scene && !e.keep && !String(l.choices[0].label || "").includes("$");
    if (onlyNews) { answerLetter(state, l.id, 0); l.read = false; l.news = true; continue; }
    open.push(l);
  }
  // A hard cap: never more than three letters a month to read. The most important one must be answered, two more
  // can wait in the tray, and anything beyond that the sender settles himself, the cautious way (it goes in the paper).
  open.sort((a, b) => weightOf(b) - weightOf(a));
  const waiting = unanswered(state).filter((l) => !fresh.includes(l)).length;
  const room = Math.max(0, MAX_LETTERS - waiting);
  for (const l of open.slice(room)) {
    const e = EVENTS[l.event] || {};
    const pick = e.autoChoice ?? (e.choices ? e.choices.length - 1 : 0);
    if (e.choices && e.choices[pick]) answerLetter(state, l.id, pick); else l.resolved = true;
    l.read = false; l.news = true; l.settled = true;
  }
  const kept = open.slice(0, room);
  const mainTaken = urgent(state).some((l) => !fresh.includes(l));
  kept.forEach((l, i) => { if (i > 0 || mainTaken) l.tray = true; });
}

// The end of the month: tray letters nobody answered. The sender uses his own judgment (autoChoice), or lets it pass.
export function settleTray(state) {
  for (const l of unanswered(state)) {
    const e = EVENTS[l.event] || {};
    const pick = typeof e.autoChoice === "function" ? e.autoChoice(state, l.ctx) : e.autoChoice;
    if (pick !== undefined && pick !== null && e.choices && e.choices[pick]) {
      answerLetter(state, l.id, pick);
      l.outcome = "The Board said nothing, so they decided for themselves. " + (l.outcome || "");
    } else {
      l.resolved = true;
      l.outcome = "No answer came, so they did what they thought best.";
    }
  }
}

// Called at the start of each month, after the enemy has moved.
export function deliverMail(state) {
  // Letters held up on the road arrive now.
  const arriving = state.mailbag.filter((l) => l.turn <= state.turn);
  state.mailbag = state.mailbag.filter((l) => l.turn > state.turn);
  for (const l of arriving) {
    const e = EVENTS[l.event];
    if (e.stale && e.stale(state, l.ctx)) {
      l.body += "\n\n" + e.stale(state, l.ctx);
      l.choices = [{ label: "Too late. File it.", hint: "" }];
      l.event = "_stale";
    }
    state.letters.unshift(l);
  }

  // Scheduled and conditional events from the scenario.
  for (const e of Object.values(EVENTS)) {
    if (!e.scripted || state.fired[e.id]) continue;
    if (e.scenario && e.scenario !== (state.scenario || "1776")) continue;
    if (e.turn !== undefined && e.turn !== state.turn) continue;
    if (e.fromTurn !== undefined && state.turn < e.fromTurn) continue;
    if (e.untilTurn !== undefined && state.turn > e.untilTurn) continue;
    if (e.when && !e.when(state)) continue;
    if (!e.repeat) state.fired[e.id] = true;
    sendLetter(state, e.id, e.ctx ? e.ctx(state) : {});
  }

  // A chance event from the scenario's pool, so no two games run alike. At most one a month, never the same one twice.
  const pool = Object.values(EVENTS).filter((e) => e.random && e.scenario === (state.scenario || "1776") && !state.fired[e.id]
    && (e.fromTurn === undefined || state.turn >= e.fromTurn) && (e.untilTurn === undefined || state.turn <= e.untilTurn)
    && (!e.when || e.when(state)));
  const roll = makeRng({ seed: ((state.gameSeed ?? state.seed ?? 1) + state.turn * 7919) >>> 0 });
  if (pool.length && roll() < 0.5) {
    let total = pool.reduce((s, e) => s + (e.weight || 1), 0);
    let r = roll() * total;
    const e = pool.find((x) => (r -= x.weight || 1) < 0) || pool[0];
    state.fired[e.id] = true;
    sendLetter(state, e.id, e.ctx ? e.ctx(state) : {});
  }

  // Commanders in trouble write for orders. At most one such letter a month, starting in the second month.
  let sent = state.turn === 0 ? 1 : 0;
  const wash = findGeneralArmy(state, "washington");
  for (const a of armyList(state, "P").sort((x, y) => armyMen(y) - armyMen(x))) {
    if (sent >= 1) break;
    if (armyMen(a) < 1500) continue;
    if ((state.cooldown[a.id] || -9) > state.turn - 3) continue;
    const threat = threatTo(state, a.region, "P");
    const ratio = threat / Math.max(1, power(state, a));
    if (ratio < 1.6) continue;
    state.cooldown[a.id] = state.turn;
    const far = wash && wash !== a && distance(wash.region, a.region) > COURIER_RANGE;
    sendLetter(state, "endangered", { armyId: a.id, region: a.region, ratio: Math.round(ratio * 10) / 10, general: a.general }, { delayed: far });
    sent++;
  }
  triageMail(state);
}

// --- letters every scenario can use ---

const DANGER_VOICE = {
  washington: (r, x) => `The enemy has gathered before ${r} in numbers I judge to be ${x} times our own. I will hold if the Board wishes it. But I would remind the Board that this army is the cause itself, and if it is lost, all is lost.`,
  lee: (r, x) => `I am obliged to inform the Board that my position at ${r} cannot be held against ${x} times my number, a fact that would be obvious to anyone of real military training. I await your instructions, though I expect I shall have to act on my own judgment, as usual.`,
  putnam: (r, x) => `They are coming at ${r} with near ${x} men for every one of mine. Say the word and we fight. Say the other word and we go. Only say it quick.`,
  greene: (r, x) => `I have counted the enemy's fires across from ${r}. By my reckoning they outnumber us ${x} to one. Our supplies will last some days. I would recommend, with respect, that we not be here when they come.`,
  knox: (r, x) => `The guns are placed and the men are willing! Still I must report the enemy before ${r} is ${x} times our strength, and willing men do not stop cannon balls.`,
  arnold: (r, x) => `The enemy before ${r} is ${x} to one. I would attack them tomorrow if I had the men, and I am told I do not. Send me men or send me orders. I will not sit idle.`,
  sullivan: (r, x) => `The enemy is massing near ${r}, perhaps ${x} times our force. The men are steady for now. I request the Board's orders.`,
  stirling: (r, x) => `My lords, the enemy is before ${r} in great force, ${x} to one by my count. My regiments will do their duty, whatever the Board decides.`,
  gates: (r, x) => `The enemy is advancing on ${r} with ${x} times our number. I have chosen strong ground and the engineers are at work. I am confident, provided the Board sends what I have asked for, which it has not.`,
  schuyler: (r, x) => `I must report the enemy before ${r} in force, ${x} to one. The militia promised to me have not come. I do not say this to excuse myself, but so the Board will know where the fault lies if we fail.`,
  stclair: (r, x) => `The enemy is ${x} to one before ${r}. I will hold if ordered. I would rather save this army than my reputation, but I know which one the newspapers will judge me by.`,
  stark: (r, x) => `They are coming at ${r}, ${x} to one. My boys can fight from behind a stone wall as well as any regulars in the world. Tell me plain what you want.`,
  morgan: (r, x) => `Enemy at ${r}, ${x} to one. Put us in the trees and we'll make them pay for every yard.`,
};

registerEvents([
  {
    id: "endangered",
    autoChoice: 3, // left in the tray, the general uses his own judgment
    from: (state, ctx) => ctx.general || "colonel",
    title: (state, ctx) => `Outnumbered at ${REGIONS[ctx.region].name}`,
    body: (state, ctx) => {
      const r = REGIONS[ctx.region].name;
      const voice = DANGER_VOICE[ctx.general];
      return voice ? voice(r, ctx.ratio) : `Sir, the enemy has gathered before our post at ${r}, about ${ctx.ratio} times our strength. The men look to the Board for orders.`;
    },
    stale: (state, ctx) => {
      const a = state.armies[ctx.armyId];
      if (!a || a.region !== ctx.region) return "This letter was a month on the road. By the time it reached you, the matter had been settled.";
      return null;
    },
    choices: [
      {
        label: "Hold and dig in",
        hint: "Harder to attack this month, but the army can't move.",
        apply(state, ctx) {
          const a = state.armies[ctx.armyId];
          if (!a) return "The army was no longer there.";
          if (a.moved) { a.dugIn = true; return "Orders received: hold the line."; }
          digIn(state, a.id);
          if (ctx.general === "lee") changeLoyalty(state, "lee", -3);
          return `Orders sent: hold ${REGIONS[a.region].name} at all costs.`;
        },
      },
      {
        label: "Fall back",
        hint: "Retreat to a safer region without a fight. Cause -1.",
        apply(state, ctx) {
          const a = state.armies[ctx.armyId];
          if (!a) return "The army was no longer there.";
          const to = withdraw(state, a.id);
          if (!to) { digIn(state, a.id); return "There was nowhere safe to go, so the army dug in."; }
          state.cause = Math.max(0, state.cause - 1);
          return `Orders sent: fall back to ${REGIONS[to].name}.`;
        },
      },
      {
        label: (state) => `Send money for militia (${money(militiaCost(state) * 1.5)})`,
        hint: `Adds ${menWords(1500)} militia for ${MILITIA_MONTHS} months, if there's money and Cause is high enough.`,
        apply(state, ctx) {
          const a = state.armies[ctx.armyId];
          if (!a) return "The army was no longer there.";
          const cost = militiaCost(state) * 1.5;
          if (state.treasury < cost || state.cause < 25) {
            digIn(state, a.id);
            return "There was no money to send. The army dug in and hoped for the best.";
          }
          spend(state, cost, "letters");
          a.militia.push({ men: 1500, left: MILITIA_MONTHS });
          changeLoyalty(state, ctx.general, 3);
          return `${menWords(1500)} militia marched to ${REGIONS[a.region].name}.`;
        },
      },
      {
        label: "Use your own judgment",
        hint: "The general decides. Generals like being trusted.",
        apply(state, ctx) {
          const a = state.armies[ctx.armyId];
          if (!a) return "The army was no longer there.";
          changeLoyalty(state, ctx.general, 5);
          const g = generalOf(state, a);
          const ratio = threatTo(state, a.region, "P") / Math.max(1, power(state, a));
          const bold = g && (g.trait === "bold" || g.trait === "proud");
          if (ratio > (bold ? 3 : 2.2)) {
            const to = withdraw(state, a.id);
            if (to) return `${g ? g.short : "The colonel"} chose to fall back to ${REGIONS[to].name}.`;
          }
          if (!a.moved) digIn(state, a.id);
          return `${g ? g.short : "The colonel"} chose to stand and dig in.`;
        },
      },
    ],
  },
  { id: "_stale", from: "colonel", title: "", body: () => "", choices: [{ label: "File it", apply: () => "" }] },
]);

// Short letters from ordinary soldiers after a battle. No answer needed.
const SOLDIER_LINES = {
  won: [
    "We drove them off the field and took their packs. I have a pair of shoes now, which is more than I had this morning.",
    "The redcoats ran today. I did not think I would ever see it. The whole regiment cheered until we were hoarse.",
    "We held. My hands still shake writing this. Tell Mother I am well.",
  ],
  lost: [
    "We were beaten and ran. I lost my blanket and my friend Thomas. I do not know which I will miss more tonight, God forgive me.",
    "The officers say we fell back in good order. It did not feel orderly to me.",
    "They came on with bayonets and the militia broke. I stayed as long as I could. I am ashamed and I am alive.",
  ],
  unpaid: [
    "We have not been paid in months. Some of the men talk of going home. I am not one of them, yet.",
  ],
};
const UNITS = ["1st Pennsylvania", "2nd Connecticut", "Delaware Regiment", "Maryland Line", "4th Massachusetts", "1st New York", "Rhode Island Regiment", "New Jersey militia"];

registerEvents([{ id: "soldier", from: "soldier", title: (s, ctx) => `From the ${ctx.unit}`, body: (s, ctx) => ctx.text }]);

export function soldierLetter(state, outcome) {
  const rand = makeRng(state);
  const l = sendLetter(state, "soldier", { unit: pick(rand, UNITS), text: pick(rand, SOLDIER_LINES[outcome]) });
  l.read = true; // shown in the month's report, so it doesn't add to the unread count
  l.voice = true;
}

export { enemy, armyAt };
