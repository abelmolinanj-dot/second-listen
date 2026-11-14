// Scenario: The Campaign of 1776.
// July 1776 to June 1777. The British land at New York with the largest force they have ever sent overseas.
// You are the Board of War, the committee of Congress that runs the army and pays for it.

import { REGIONS } from "./regions.js";
import { GENERALS } from "./generals.js";
import {
  newArmy, armyAt, armyList, armyMen, findGeneralArmy, changeCause, changeLoyalty, spend, earn, money, fmtMen,
  moveArmy, distance,
} from "../rules.js";
import { makeRng } from "../rng.js";

export const SCENARIO = {
  id: "1776",
  title: "The Campaign of 1776",
  blurb: "The largest fleet Britain has ever sent across the ocean is anchoring off Staten Island. Keep Washington's army alive, keep Philadelphia, and keep the Cause burning until summer.",
  startMonth: 6, // July
  startYear: 1776,
  turns: 12,
  aiGoal: "philadelphia",
  aiTargets: { philadelphia: 25, manhattan: 15, longisland: 5, rhodeisland: 6, newbrunswick: 3, trenton: 3 },
  // The Delaware River forts and the long voyage to the Chesapeake keep these ports closed to landings this year.
  closedPorts: ["philadelphia", "southjersey", "wilmington", "delmarva", "baltimore", "virginia", "boston", "newhampshire"],
  goals: [
    "Washington must not be captured.",
    "Hold Philadelphia when June 1777 ends.",
    "Don't let the Cause fall to zero.",
  ],
};

const LOYALIST = {
  stjohns: 70, ticonderoga: 20, bennington: 15, newhampshire: 15, mohawk: 45, albany: 35, springfield: 15, boston: 10,
  rhodeisland: 25, connecticut: 20, kingston: 35, highlands: 30, westchester: 50, manhattan: 45, longisland: 55,
  statenisland: 70, hackensack: 45, morristown: 25, newark: 40, newbrunswick: 45, princeton: 35, trenton: 40,
  southjersey: 40, easton: 30, wyoming: 25, bucks: 40, philadelphia: 35, chester: 35, lancaster: 25, wilmington: 40,
  frederick: 20, baltimore: 25, delmarva: 50, virginia: 20,
};

export function setupScenario(state) {
  for (const id of Object.keys(REGIONS)) {
    state.regions[id] = { owner: id === "stjohns" || id === "statenisland" ? "B" : "P", loyalist: LOYALIST[id] ?? 30, works: false };
  }
  for (const [id, g] of Object.entries(GENERALS)) {
    state.generals[id] = { ...g, status: "reserve" };
  }
  state.generals.lee.status = "away";

  const P = (region, regulars, militia, general) => {
    const a = newArmy(state, { side: "P", region, regulars, general });
    if (militia) a.militia.push({ men: militia, left: 5 });
  };
  P("manhattan", 7000, 3000, "washington");
  P("longisland", 4000, 2500, "putnam");
  P("hackensack", 3000, 0, "greene");
  P("newark", 1500, 1000, "knox");
  P("westchester", 0, 1500, null);
  P("ticonderoga", 3000, 1000, "arnold");
  P("philadelphia", 0, 2000, null);
  P("boston", 0, 2000, null);

  // Howe waits on Staten Island for the rest of his army before attacking.
  newArmy(state, { side: "B", region: "statenisland", regulars: 20000, general: "howe" }).stalled = 2;
  newArmy(state, { side: "B", region: "stjohns", regulars: 9000, general: "carleton" });
}

// British troops arriving by sea. If the landing spot is lost, they come ashore wherever the British hold the coast.
export const REINFORCEMENTS = [
  { turn: 1, side: "B", region: "statenisland", regulars: 9000, general: "cornwallis", text: "More British transports arrived with Cornwallis and 9,000 men." },
  { turn: 1, side: "B", region: "statenisland", regulars: 7000, general: "heister", hessian: true, text: "Hessian regiments under von Heister came ashore, hired from the German princes." },
  { turn: 2, side: "B", region: "statenisland", regulars: 2000, general: "rall", hessian: true, text: "Colonel Rall's Hessian brigade arrived." },
  { turn: 2, side: "B", region: "statenisland", regulars: 0, general: "clinton", text: "General Clinton joined Howe's staff." },
  { turn: 4, side: "B", region: "statenisland", regulars: 4000, text: "A late convoy brought 4,000 more British troops." },
  { turn: 9, side: "B", region: "statenisland", regulars: 6000, text: "Spring convoys brought 6,000 fresh British troops." },
];

const washArmy = (state) => findGeneralArmy(state, "washington");

export const SCENARIO_EVENTS = [
  {
    id: "welcome", scripted: true, turn: 0, from: "washington",
    title: "To the Honorable Board of War",
    body: () => `Gentlemen,

The enemy's fleet lies at anchor off Staten Island. I have counted above a hundred sail, and more arrive daily. General Howe has landed some twenty thousand men, and we expect more.

Our army at New York numbers perhaps nineteen thousand fit for duty, a great part of them militia who have never seen a battle. The city sits on islands, and the King's navy commands every river around it. I fear that is a hard place to defend against an enemy who can land wherever he pleases.

I ask the Board's direction. Shall we spend what we have on earthworks around the city and on Long Island, or save it to keep the army paid?

I have the honor to be your obedient servant,
G. Washington`,
    choices: [
      {
        label: "Fortify New York and Long Island ($20k)",
        hint: "Earthworks make both places harder to attack for the rest of the game.",
        apply(state) {
          if (state.treasury < 20) return "The treasury could not cover it. No works were built.";
          spend(state, 20, "fortifications");
          state.regions.manhattan.works = true;
          state.regions.longisland.works = true;
          return "Work parties began digging forts on Brooklyn Heights and around the city.";
        },
      },
      {
        label: "Save the money for the army",
        hint: "Keep the treasury for pay and recruits.",
        apply() { return "Washington replied that he would do what he could with what he had."; },
      },
    ],
  },
  {
    id: "declaration", scripted: true, turn: 0, from: "congress",
    title: "Independence",
    body: () => `Sir,

On the fourth of this month Congress agreed to a Declaration that these United Colonies are, and of right ought to be, free and independent States.

There is no going back. Every man under arms is now a rebel in the eyes of the King, and he knows it. How should the news be spread?

John Hancock, President`,
    choices: [
      {
        label: "Read it aloud to every regiment",
        hint: "Cause +6.",
        apply(state) { changeCause(state, 6, "The Declaration was read to the troops."); return "The Declaration was read to the army. In New York a crowd pulled down the statue of King George."; },
      },
      {
        label: "Print broadsides for every colony ($10k)",
        hint: "Cause +10, and Loyalist support drops everywhere you hold.",
        apply(state) {
          if (state.treasury < 10) { changeCause(state, 6, "The Declaration was read to the troops."); return "No money for printing, so it was read aloud instead."; }
          spend(state, 10, "printing");
          changeCause(state, 10, "Copies of the Declaration spread through the colonies.");
          for (const r of Object.values(state.regions)) if (r.owner === "P") r.loyalist = Math.max(5, r.loyalist - 5);
          return "Printers worked through the night. The Declaration was posted in every town square.";
        },
      },
    ],
  },
  {
    id: "spy", scripted: true, turn: 1, from: "spy",
    title: "Hessians",
    body: () => `Sir,

The ships unloading this week carry Germans, many thousands of them. They are called Hessians, though they come from several German states. Their princes rent them to King George by the regiment.

They are hard soldiers and they do not speak English. The farmers here are afraid of them. People say they take whatever they want.

I will write again when I can. Burn this letter.`,
    choices: [{ label: "Noted", hint: "Hessian armies plunder. Loyalist support falls where they camp, not rises.", apply: () => "" }],
  },
  {
    id: "lee", scripted: true, turn: 1, from: "lee",
    title: "General Lee returns from the south",
    body: () => `Gentlemen,

I have returned from Charleston, where, as you will have heard, the enemy was beaten off largely through my arrangements. I bring two thousand regulars and arrive at Westchester.

I served in the King's army for twenty years. I say this without vanity: I am the only general officer in this army who has ever commanded regular troops in a real campaign. I trust the Board will employ me accordingly.

Charles Lee, Major General`,
    choices: [
      {
        label: "Give him command at Westchester",
        hint: "Lee loyalty +10. He keeps his own army.",
        apply(state) { arriveLee(state); changeLoyalty(state, "lee", 10); return "Lee took command at Westchester, very pleased with himself."; },
      },
      {
        label: "Put him under Washington's orders",
        hint: "Lee loyalty -15. His troops still arrive at Westchester.",
        apply(state) { arriveLee(state); changeLoyalty(state, "lee", -15); return "Lee accepted his orders. His letters to friends in Congress became noticeably less polite."; },
      },
    ],
  },
  {
    id: "valcour", scripted: true, fromTurn: 2, untilTurn: 4, from: "arnold",
    when: (state) => {
      const arnold = findGeneralArmy(state, "arnold");
      const carleton = findGeneralArmy(state, "carleton");
      return arnold && carleton && distance(arnold.region, carleton.region) <= 1;
    },
    title: "A fleet on Lake Champlain",
    body: () => `Sir,

Carleton is building boats at the north end of the lake. If he gets his army down the lake before winter, Ticonderoga falls and the road to Albany is open.

Give me shipwrights and money and I will build a fleet of my own. I do not need to beat him. I only need to cost him the summer. Winter will do the rest.

I await your answer with some impatience.
B. Arnold`,
    choices: [
      {
        label: "Fund the fleet ($15k)",
        hint: "Carleton loses men and is delayed until spring. Arnold loyalty +10.",
        apply(state) {
          if (state.treasury < 15) { changeLoyalty(state, "arnold", -5); return "There was no money. Arnold was furious."; }
          spend(state, 15, "letters");
          const c = findGeneralArmy(state, "carleton");
          if (c) { c.regulars = Math.round(c.regulars * 0.85); c.stalled = 6; }
          changeLoyalty(state, "arnold", 10);
          changeCause(state, 2, "Arnold's fleet fought Carleton at Valcour Island.");
          return "Arnold's little fleet was destroyed at Valcour Island, but it cost Carleton the season. He pulled back to Canada for the winter.";
        },
      },
      {
        label: "No money for boats",
        hint: "Arnold loyalty -5. He'll hold Ticonderoga with what he has.",
        apply(state) { changeLoyalty(state, "arnold", -5); return "Arnold replied that the Board would regret it."; },
      },
    ],
  },
  {
    id: "congressFlees", scripted: true, from: "congress",
    when: (state) => state.regions.philadelphia.owner === "P" && armyList(state, "B").some((a) => distance(a.region, "philadelphia") <= 1),
    title: "The enemy is near Philadelphia",
    body: () => `Sir,

British troops are within a day's march of this city. Some members wish to remove Congress to Baltimore at once. Others say flight would tell the country we have given up.

What does the Board advise?

John Hancock, President`,
    choices: [
      {
        label: "Move Congress to Baltimore",
        hint: "Cause -2 now, but losing Philadelphia would cost less (-5 instead of -10).",
        apply(state) { changeCause(state, -2, "Congress fled to Baltimore."); state.philadelphiaLoss = 5; return "Congress packed its papers and rode for Baltimore."; },
      },
      {
        label: "Stay and defend the city",
        hint: "Cause +3 now, but losing Philadelphia would cost -15.",
        apply(state) { changeCause(state, 3, "Congress refused to flee."); state.philadelphiaLoss = 15; return "Congress stayed. The city began digging trenches."; },
      },
    ],
  },
  {
    id: "enlistments", scripted: true, turn: 4, from: "washington",
    title: "The army is about to go home",
    body: (state) => `Gentlemen,

I must lay before the Board a danger greater than General Howe. Nearly every regiment in this army enlisted for one year, and those enlistments end on the last day of December. If nothing is done, I may wake on the first of January with no army at all.

A bounty would persuade many to stay. The cost would be about ${money(bountyCost(state))}. I know the treasury is thin. I would not ask if the need were not so great.

G. Washington`,
    choices: [
      {
        label: (state) => `Pay the bounty (${money(bountyCost(state))})`,
        hint: "Keeps the regulars you have.",
        apply(state) {
          const cost = bountyCost(state);
          if (state.treasury < cost) { state.flags.enlistmentsLapse = true; return "The treasury could not cover the bounty. Many men will go home in January."; }
          spend(state, cost, "bounties");
          return "Officers went from tent to tent with the money. Most of the men agreed to stay.";
        },
      },
      {
        label: "We can't afford it",
        hint: "In January, a third of your regulars go home.",
        apply(state) { state.flags.enlistmentsLapse = true; return "Washington wrote back only: 'Then we must do what we can before the year ends.'"; },
      },
    ],
  },
  {
    id: "leeDelay", scripted: true, fromTurn: 5, untilTurn: 6, from: "lee",
    when: (state) => findGeneralArmy(state, "lee") && state.generals.lee.loyalty < 60 && washArmy(state),
    title: "General Lee takes his time",
    body: () => `Gentlemen,

General Washington writes again, begging me to bring my troops to join him. Between ourselves, I think the man is not equal to his command. I shall come when I judge it right, and not before.

I shall be spending tonight at a tavern near Basking Ridge. The beds are better than in camp.

Charles Lee`,
    choices: [
      {
        label: "Order him to join Washington at once",
        hint: "Lee loyalty -10. If he's close enough, his troops join Washington's army.",
        apply(state) {
          changeLoyalty(state, "lee", -10);
          const lee = findGeneralArmy(state, "lee"), w = washArmy(state);
          if (lee && w && distance(lee.region, w.region) <= 2) {
            w.regulars += lee.regulars; w.militia.push(...lee.militia);
            lee.regulars = 0; lee.militia = [];
            delete state.armies[lee.id];
            state.generals.lee.status = "reserve";
            return "Lee obeyed, sulking. His men marched into Washington's camp.";
          }
          return "Lee replied that he was too far away to comply, and stayed where he was.";
        },
      },
      {
        label: "Let him act as he sees fit",
        hint: "Lee loyalty +5. He may not be careful.",
        apply(state) {
          changeLoyalty(state, "lee", 5);
          if (makeRng(state)() < 0.6 || state.generals.lee.loyalty < 45) {
            const lee = findGeneralArmy(state, "lee");
            if (lee) lee.general = null;
            state.generals.lee.status = "captured";
            changeCause(state, -3, "General Lee was captured.");
            return "British dragoons surrounded the tavern at dawn and carried Lee off in his nightshirt. His troops are now without a general.";
          }
          return "Lee stayed where he was. Nothing came of it, this time.";
        },
      },
    ],
  },
  {
    id: "crossing", scripted: true, fromTurn: 5, untilTurn: 6, from: "washington",
    when: (state) => !!crossingTarget(state),
    ctx: (state) => ({ target: crossingTarget(state) }),
    title: "A bold stroke",
    body: (state, ctx) => {
      const foe = armyAt(state, ctx.target, "B");
      const who = foe && foe.hessian ? "Hessians" : "British";
      return `Gentlemen,

The enemy has gone into winter quarters. He believes this army is finished and that the war will end in the spring. He has left ${fmtMen(foe ? armyMen(foe) : 0)} ${who} at ${REGIONS[ctx.target].name}, where they will be celebrating Christmas.

I propose to cross the river on Christmas night, in the dark and the cold, and fall on them at dawn. If it fails, I may lose everything. If it succeeds, the country will know we are still in the field.

I await the Board's answer. There is not much time.

G. Washington`;
    },
    choices: [
      {
        label: "Cross the river and attack at dawn",
        hint: "A surprise attack: big bonus, and complacent garrisons are badly caught out.",
        apply(state, ctx) {
          const w = washArmy(state);
          if (!w || !armyAt(state, ctx.target, "B")) return "By the time the orders arrived, the chance had passed.";
          w.moved = false;
          const r = moveArmy(state, w.id, ctx.target, { surprise: true });
          state.lastSurprise = r;
          if (typeof r === "string") return r;
          if (r.attackerWins) { changeCause(state, 8, "Washington crossed the river and won by surprise."); return `Washington crossed in a sleet storm and struck ${REGIONS[ctx.target].name} at dawn. The enemy was routed. Across the country, people who had given up began to hope again.`; }
          return `The crossing went wrong. Washington struck ${REGIONS[ctx.target].name} but was driven back.`;
        },
      },
      {
        label: "Too risky. Stay in camp.",
        hint: "Nothing ventured.",
        apply() { return "Washington stayed in camp. The army shivered and waited for spring."; },
      },
    ],
  },
  {
    id: "morris", scripted: true, turn: 6, from: "morris",
    title: "A loan from the merchants",
    body: () => `Sir,

Continental paper is worth less every week, and nobody wants it. But some merchants here still hold hard money, and they trust me personally.

I can raise ${money(60)} in coin at once, if the Board will pledge to repay ${money(75)} by May. It is not cheap money, but it is money that will still be worth something next month.

Robert Morris`,
    choices: [
      {
        label: "Accept the loan",
        hint: "+$60k now. $75k is due in May. If you can't pay, it becomes back pay owed.",
        apply(state) {
          earn(state, 60, "loans");
          state.loans.push({ lender: "Philadelphia merchants", due: 10, amount: 75 });
          return "Morris delivered the money in kegs of coin. The army's paymaster wept.";
        },
      },
      { label: "Decline", hint: "No debt.", apply() { return "Morris wrote that the offer would stand if the Board changed its mind. It will not."; } },
    ],
  },
  {
    id: "franklin", scripted: true, turn: 7, from: "franklin",
    title: "News from Paris",
    body: (state) => frenchFriendly(state)
      ? `My dear friends,

News of your winter victories has reached Paris and made a great noise. The ministers will not yet sign a treaty, but they have agreed to help in secret, through a trading company that does not exist.

They ask what you need most: money or arms. Tell me and I will see it shipped to Portsmouth.

B. Franklin`
      : `My dear friends,

The French court is friendly in private and careful in public. They are waiting to see whether you can win a battle that matters. Until then, I eat a great many dinners and get very little else.

Send me a victory and I will send you France.

B. Franklin`,
    choices: [
      {
        label: (state) => (frenchFriendly(state) ? "Ask for money (+$60k)" : "Understood"),
        hint: (state) => (frenchFriendly(state) ? "Secret French money arrives at once." : "Win battles to get French help."),
        apply(state) {
          if (!frenchFriendly(state)) return "";
          earn(state, 60, "foreign aid");
          return "French money arrived through the trading house of Hortalez & Company.";
        },
      },
      {
        label: (state) => (frenchFriendly(state) ? `Ask for muskets and powder (+${fmtMen(2000)} regulars)` : "Keep trying"),
        hint: (state) => (frenchFriendly(state) ? "Arms are landed at Portsmouth, New Hampshire, enough to equip new regiments." : ""),
        apply(state) {
          if (!frenchFriendly(state)) return "";
          if (state.regions.newhampshire.owner !== "P") { earn(state, 40, "foreign aid"); return "Portsmouth was in enemy hands, so the arms were sold and the money sent instead."; }
          const a = armyAt(state, "newhampshire", "P") || newArmy(state, { side: "P", region: "newhampshire", regulars: 0 });
          a.regulars += 2000;
          return "French muskets, powder and uniforms were landed at Portsmouth. 2,000 new regulars were equipped.";
        },
      },
    ],
  },
  {
    id: "arnoldPassed", scripted: true, turn: 7, from: "arnold",
    when: (state) => state.generals.arnold.status !== "captured",
    title: "Passed over",
    body: () => `Sir,

I learn from the newspapers that Congress has promoted five brigadiers to major general. Every one of them is junior to me. Not one of them has done half of what I have done.

I have been shot in the leg at Quebec and I have fought a fleet on Lake Champlain. I am owed money that Congress will not pay. And I am to be passed over by men who have never smelled powder.

I ask the Board whether this is how the country repays its servants.

B. Arnold`,
    choices: [
      {
        label: "Protest to Congress on his behalf",
        hint: "Cause -2 (Congress is embarrassed). Arnold loyalty +15.",
        apply(state) { changeCause(state, -2, "The Board quarreled with Congress over Arnold."); changeLoyalty(state, "arnold", 15); return "Congress grumbled, but restored Arnold's seniority. He remembered who stood up for him."; },
      },
      {
        label: "Accept Congress's decision",
        hint: "Arnold loyalty -20. He won't forget.",
        apply(state) { changeLoyalty(state, "arnold", -20); return "Arnold did not reply. His friends said he spoke bitterly of Congress for weeks."; },
      },
    ],
  },
  {
    id: "winterSupplies", scripted: true, repeat: true, from: "greene",
    when: (state) => state.winterNow && state.arrears > 0 && state.generals.greene.status === "active" && state.lastSupplyLetter !== state.turn,
    title: "The men have no shoes",
    body: (state) => `Sir,

I write from a camp where men leave bloody footprints in the snow. We are owed ${money(state.arrears)} in back pay, and the commissaries have no flour. Desertions rise every night.

The farmers around us have full barns. Many of them sell to the British for silver. I could take what we need, with receipts the Board can honor later. It would keep the army alive, but it would not win us friends.

N. Greene, Major General`,
    choices: [
      {
        label: "Requisition from the farms",
        hint: "No desertion from unpaid wages this month. Loyalist support rises where your armies are.",
        apply(state) {
          state.lastSupplyLetter = state.turn;
          state.flags.requisitioned = state.turn;
          for (const a of armyList(state, "P")) state.regions[a.region].loyalist = Math.min(90, state.regions[a.region].loyalist + 8);
          return "Foraging parties went farm to farm with receipts. The army ate. The farmers were not pleased.";
        },
      },
      {
        label: "Ask them to endure",
        hint: "Desertion continues.",
        apply(state) { state.lastSupplyLetter = state.turn; return "The men endured. Some of them."; },
      },
    ],
  },
  {
    id: "newArmy", scripted: true, turn: 9, from: "washington",
    when: (state) => !!washArmy(state),
    title: "A new army",
    body: () => `Gentlemen,

Congress has at last agreed that men should enlist for three years or the length of the war, not for a few months at a time. The first of the new regiments are arriving in camp. They are raw, but they are ours for the duration.

G. Washington`,
    choices: [{ label: "Welcome them", hint: `+${fmtMen(2500)} regulars join Washington.`, apply(state) { const w = washArmy(state); if (w) w.regulars += 2500; return "New regiments marched into Washington's camp."; } }],
  },
];

function arriveLee(state) {
  const there = armyAt(state, "westchester", "P");
  if (state.regions.westchester.owner === "P" && !armyAt(state, "westchester", "B")) {
    const a = there || newArmy(state, { side: "P", region: "westchester", regulars: 0 });
    a.regulars += 2000;
    if (a.general) state.generals[a.general].status = "reserve";
    a.general = "lee";
    state.generals.lee.status = "active";
  } else {
    const w = washArmy(state);
    if (w) w.regulars += 2000;
    state.generals.lee.status = "reserve";
  }
}

function bountyCost(state) {
  const regs = armyList(state, "P").reduce((s, a) => s + a.regulars, 0);
  return Math.round((regs / 1000) * 3 * state.priceLevel);
}

function frenchFriendly(state) {
  return state.stats.won >= 2 || state.cause >= 60;
}

// Washington's surprise attack needs an enemy force next to him that he can realistically beat.
function crossingTarget(state) {
  const w = washArmy(state);
  if (!w) return null;
  const options = [];
  for (const a of armyList(state, "B")) {
    if (distance(a.region, w.region) !== 1) continue;
    if (armyMen(a) > armyMen(w) * 1.3) continue;
    options.push(a);
  }
  options.sort((x, y) => (y.hessian ? 1 : 0) - (x.hessian ? 1 : 0) || armyMen(x) - armyMen(y));
  return options[0] ? options[0].region : null;
}

