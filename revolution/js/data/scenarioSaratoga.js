// Scenario: Saratoga, 1777.
// June to November 1777. General Burgoyne marches south from Canada to take Albany and cut New England off
// from the other states. You run the Northern Department; Washington and the main army are far away in Pennsylvania.

import { REGIONS } from "./regions.js";
import { GENERALS } from "./generals.js";
import {
  newArmy, armyAt, armyList, armyMen, findGeneralArmy, changeCause, changeLoyalty, spend, earn, money, fmtMen, menWords,
  distance, retreatSpot, log, digIn, withdraw, moveArmy, dateLabel,
} from "../rules.js";
import { makeRng } from "../rng.js";

const BURGOYNE_START = 8000;
const NORTH_WOODS = ["ticonderoga", "saratoga", "bennington", "albany", "mohawk", "kingston"];

export const SCENARIO = {
  id: "saratoga",
  title: "Saratoga",
  blurb: "General Burgoyne is coming down Lake Champlain with 8,000 men, cannon and a long line of baggage carts. He means to take Albany and cut New England off from the rest. Stop him in the forests of the upper Hudson.",
  startMonth: 5, // June
  startYear: 1777,
  turns: 6,
  treasury: 100,
  priceLevel: 1.6,
  cause: 50,
  aiGoal: "albany",
  aiTargets: { albany: 30, saratoga: 8, ticonderoga: 10, kingston: 6, highlands: 6, bennington: 3 },
  // The British here fight only along the Champlain–Hudson corridor and around New York.
  aiArea: ["stjohns", "ticonderoga", "saratoga", "bennington", "albany", "mohawk", "kingston", "highlands", "westchester", "manhattan", "longisland", "statenisland", "hackensack"],
  closedPorts: ["philadelphia", "southjersey", "wilmington", "delmarva", "baltimore", "virginia", "boston", "newhampshire", "rhodeisland", "connecticut", "newark", "newbrunswick"],
  goals: [
    "Stop Burgoyne before he reaches Albany.",
    "Destroy his army, or force him to surrender.",
    "Hold Albany when November ends.",
  ],
  mustSurvive: [],
  focus: ["stjohns", "ticonderoga", "saratoga", "albany", "mohawk", "bennington", "highlands"],
  defend: "albany",
  commander: "schuyler",
  openingScene: "burgoyne",
  victoryScene: "saratoga",
  newspaper: "The Connecticut Courant",
  history: {
    summary: "Burgoyne took Ticonderoga without a fight in July 1777, then spent three weeks cutting through Schuyler's felled trees. His Germans were destroyed at Bennington, St. Leger turned back from Fort Stanwix, and Clinton came up the Hudson too late and too weakly.",
    outcome: "After losing at Freeman's Farm and Bemis Heights, Burgoyne was surrounded at Saratoga and surrendered about 5,900 men on October 17, 1777. Gates granted him a convention, and France joined the war four months later.",
    facts: ["Ticonderoga: abandoned by St. Clair", "Bennington: won by Stark's militia", "Burgoyne's army: surrendered at Saratoga", "Albany in November 1777: held"],
  },
  tutorial: false,
  finish,
  checkEnd,
  onOpenMonth,
  onCloseMonth,
};

const LOYALIST = {
  stjohns: 70, ticonderoga: 20, saratoga: 25, bennington: 15, newhampshire: 15, mohawk: 50, albany: 35, springfield: 15, boston: 10,
  rhodeisland: 30, connecticut: 20, kingston: 35, highlands: 30, westchester: 50, manhattan: 60, longisland: 60,
  statenisland: 75, hackensack: 45, morristown: 25, newark: 40, newbrunswick: 45, princeton: 35, trenton: 35,
  southjersey: 40, easton: 30, wyoming: 25, bucks: 40, philadelphia: 40, chester: 35, lancaster: 25, wilmington: 40,
  frederick: 20, baltimore: 25, delmarva: 50, virginia: 20,
};

export function setupScenario(state) {
  const british = new Set(["stjohns", "manhattan", "statenisland", "longisland", "rhodeisland"]);
  for (const id of Object.keys(REGIONS)) {
    state.regions[id] = { owner: british.has(id) ? "B" : "P", loyalist: LOYALIST[id] ?? 30, works: false };
  }
  // Only the commanders of this campaign take part. The rest are with Washington, or elsewhere.
  const here = new Set(["schuyler", "stclair", "stark", "putnam", "arnold", "gates", "morgan", "burgoyne", "fraser", "riedesel", "stleger", "clinton"]);
  for (const [id, g] of Object.entries(GENERALS)) state.generals[id] = { ...g, status: here.has(id) ? "reserve" : "away" };
  for (const id of ["arnold", "gates", "morgan", "stleger"]) state.generals[id].status = "away"; // they arrive later

  const P = (region, regulars, militia, general, months = 3) => {
    const a = newArmy(state, { side: "P", region, regulars, general });
    if (militia) a.militia.push({ men: militia, left: months });
    return a;
  };
  // History shifts a little each game: how big Burgoyne's army is, how strong Ticonderoga is,
  // and whether Howe lets Clinton come up the Hudson early, late, or as he really did, in October.
  const r = makeRng({ seed: ((state.gameSeed ?? 1) * 31 + 7) >>> 0 });
  const burgoyneMen = Math.round((BURGOYNE_START * (0.9 + r() * 0.2)) / 100) * 100;
  const roll = r();
  const clinton = roll < 0.25 ? { plan: "early", men: 5500, stalled: 3 } : roll < 0.45 ? { plan: "late", men: 3000, stalled: 5 } : { plan: "historic", men: 4000, stalled: 4 };
  state.flags.history = { clinton: clinton.plan, burgoyneMen, stanwixTurn: r() < 0.35 ? 1 : 2 };

  P("ticonderoga", 2000 + Math.round(r() * 10) * 100, 1000, "stclair");
  P("albany", 1500, 1200, "schuyler");
  P("mohawk", 750, 0, null); // Fort Stanwix
  P("newhampshire", 0, 1500, "stark", 5);
  P("highlands", 1500, 500, "putnam");

  newArmy(state, { side: "B", region: "stjohns", regulars: burgoyneMen, general: "burgoyne" });
  newArmy(state, { side: "B", region: "manhattan", regulars: clinton.men, general: "clinton" }).stalled = clinton.stalled;
  state.flags.burgoyneFedUntil = 1;
}

export const REINFORCEMENTS = [];

// ---------- helpers ----------
// Generals remember. If the player commanded Arnold in an earlier campaign, Washington's letter says so.
function arnoldMemory(state) {
  const rec = state.legacy?.arnold;
  if (!rec || rec.loyalty === null || rec.loyalty === undefined) return "I would ask the Board to make use of his talents, and to remember that he feels his treatment by Congress keenly.";
  if (rec.loyalty >= 80) return "He speaks warmly of the Board, which has stood by him before when Congress did not. I think you will find no officer more willing.";
  if (rec.loyalty < 55) return "I must warn the Board that he has not forgotten how he was treated. He says openly that the Board let Congress humiliate him, and he does not forgive easily. Handle him with care.";
  return "He is as touchy as ever about his rank, but he will fight. I would ask the Board to make use of his talents.";
}
// What Schuyler has heard about the British army in New York. It hints at how this game's history was rolled.
function rumor(state) {
  const plan = state.flags.history?.clinton;
  if (plan === "early") return "There is a rumor from New York that General Clinton has been given more troops than expected, and boats are being gathered on the Hudson. I pray it is only talk.";
  if (plan === "late") return "From New York we hear that Howe has taken nearly everything with him to the south, and left Clinton with barely enough to hold the city.";
  return "What General Howe means to do with his army in New York, nobody here can tell me. If he comes up the Hudson to meet Burgoyne, we are caught between them.";
}
const commander = (state) => ["gates", "schuyler"].find((g) => state.generals[g].status === "active") || "colonel";
const burgoyne = (state) => findGeneralArmy(state, "burgoyne");
const commandArmy = (state) => findGeneralArmy(state, commander(state)) || armyAt(state, "albany", "P") || armyList(state, "P").sort((x, y) => armyMen(y) - armyMen(x))[0];

function burgoyneCornered(state) {
  const b = burgoyne(state);
  if (!b || state.turn < 2 || b.region === "stjohns") return false;
  if (state.flags.lastTerms === state.turn - 1 || state.flags.lastTerms === state.turn) return false;
  const near = armyList(state, "P").filter((a) => distance(a.region, b.region) <= 1);
  const ours = near.reduce((s, a) => s + armyMen(a), 0);
  const trapped = !retreatSpot(state, b, null);
  return (armyMen(b) < (state.flags.history?.burgoyneMen || BURGOYNE_START) * (state.flags.burgoyneDespairs ? 0.75 : 0.6) || trapped) && ours >= armyMen(b) * 1.1;
}

// ---------- month hooks ----------
function onOpenMonth(state) {
  // Most of the money Congress raises goes to Washington's main army in Pennsylvania.
  const share = Math.round(state.ledger.current.taxes * 0.35 || 0);
  if (share > 0) { spend(state, share, "main army"); }

  // Schuyler's axemen: the first month Burgoyne stands at Ticonderoga, felled trees and wrecked bridges hold him there.
  const b = burgoyne(state);
  if (b && state.flags.roadsWrecked && !state.flags.roadsUsed && b.region === "ticonderoga") {
    state.flags.roadsUsed = true;
    b.stalled = 1;
    log(state, "Burgoyne's army is cutting its way through felled trees and burned bridges south of Ticonderoga.", "good");
  }
  // Burgoyne's own Iroquois and Canadian allies drift away as the campaign drags on.
  if (b && state.turn === 3) {
    b.regulars = Math.round(b.regulars * 0.93);
    log(state, "Many of Burgoyne's Native allies and Canadian volunteers have gone home.", "good");
  }
  // In September and October, militia from all over New England poured into the American camp.
  if ((state.turn === 3 || state.turn === 4) && state.cause >= 35 && b) {
    const a = commandArmy(state);
    if (a) {
      const men = state.turn === 3 ? 1500 : 2500;
      a.militia.push({ men, left: 3 });
      log(state, `${menWords(men)} militia from New England marched into ${REGIONS[a.region].name} to fight Burgoyne.`, "good");
    }
  }
  // In November Howe called Clinton back to New York, and to Philadelphia.
  const c = findGeneralArmy(state, "clinton");
  if (c && state.turn === 5 && c.region !== "manhattan") {
    const home = armyAt(state, "manhattan", "B");
    if (home) { home.regulars += c.regulars; delete state.armies[c.id]; home.general = home.general || "clinton"; }
    else c.region = "manhattan";
    log(state, "Howe ordered Clinton back to New York. His boats went back down the Hudson.", "good");
  }
}

function onCloseMonth(state) {
  // Every mile south of the lake, Burgoyne's supply line gets longer.
  const b = burgoyne(state);
  if (!b || b.region === "stjohns" || (state.flags.burgoyneFedUntil ?? -1) >= state.turn) return;
  const rate = (b.region === "ticonderoga" ? 0.02 : 0.05) + (state.flags.burgoyneHungry ? 0.03 : 0) + (state.flags.oneida ? 0.02 : 0);
  const lost = Math.round(b.regulars * rate);
  b.regulars -= lost;
  if (lost > 50) log(state, `Burgoyne's army lost ${menWords(lost)} men to hunger, sickness and desertion on its long supply line.`, "good");
}

// ---------- endings ----------
function scoreOf(state) {
  return Math.round(state.cause + state.stats.won * 4 - state.stats.lost * 2 + (state.regions.albany.owner === "P" ? 15 : 0));
}

function checkEnd(state) {
  if (state.flags.convention) return state.flags.convention;
  const g = state.generals.burgoyne;
  if (g.status === "captured") {
    return { result: "victory", stars: 3, title: "The turning point", text: "Burgoyne's army has laid down its arms. Nearly six thousand of the King's soldiers are prisoners. When the news reaches Paris, France will join the war.", score: scoreOf(state) + 30 };
  }
  if (state.turn >= 1 && !burgoyne(state) && g.status !== "away") {
    return { result: "victory", stars: 3, title: "Burgoyne's army is destroyed", text: "The army that marched out of Canada in June no longer exists. New England is safe, and the world has noticed.", score: scoreOf(state) + 25 };
  }
  return null;
}

function finish(state) {
  const albany = state.regions.albany.owner === "P";
  const invaders = armyList(state, "B").filter((a) => NORTH_WOODS.includes(a.region));
  if (albany && !invaders.length) {
    return { result: "victory", stars: 2, title: "The North holds", text: "Burgoyne's campaign has failed. His army limps back toward Canada, and the Hudson is still yours. Not a decisive victory, but a victory.", score: scoreOf(state) };
  }
  if (albany && state.cause < 40) {
    return { result: "defeat", stars: 0, title: "Burgoyne winters on the Hudson", text: "Albany still stands, but Burgoyne's army is camped in the Hudson Valley and the country has lost heart. In the spring he will finish what he started.", score: scoreOf(state) };
  }
  if (albany) {
    return { result: "survived", stars: 1, title: "Stalemate in the north", text: "Albany is still in American hands, but British troops remain in the Hudson Valley as winter comes. The question will be settled next year.", score: scoreOf(state) };
  }
  return { result: "defeat", stars: 0, title: "The Hudson is cut", text: "Albany has fallen. The British hold the Hudson from Canada to New York, and New England is cut off from the other states.", score: scoreOf(state) };
}

// ---------- letters ----------
export const SCENARIO_EVENTS = [
  {
    id: "sar_welcome", scripted: true, turn: 0, from: "schuyler",
    place: "Albany",
    title: ["Burgoyne is coming", "A storm from the north", "The lake is full of boats"],
    body: [
      (state) => `Gentlemen,

Our scouts on the lake report that General Burgoyne has left St. Johns with some ${menWords(state.flags.history.burgoyneMen)} British and German troops, Canadian volunteers, Iroquois allies and a great train of artillery.

I have not the men to meet him in the field. But the road from the lake to the Hudson runs twenty miles through forest and swamp. With axes and a thousand men I can fell trees across every road, burn every bridge and drive off every cow. It will cost money, and it will make me no friends among the farmers.

${rumor(state)}

Philip Schuyler, Major General`,
      (state) => `Gentlemen,

I write in haste. An Oneida runner came in last night from the north. He counted boats on Lake Champlain until he lost count: Burgoyne is coming, with ${menWords(state.flags.history.burgoyneMen)} men and more cannon than this department has ever seen.

St. Clair's garrison at Ticonderoga is too small for its walls. My own army is mostly men whose enlistments end before the harvest. What I do have is axes. Give me money and I will turn the road from the lake into a forest of fallen trees.

${rumor(state)}

Your servant, Ph. Schuyler`,
      (state) => `Gentlemen,

You will have heard by now that the enemy is on the lake. My scouts put his strength near ${menWords(state.flags.history.burgoyneMen)} regulars, besides the Indians, who frighten the settlers more than all the rest together.

The country between the lake and the Hudson is wilderness. Every tree I fell across the road costs him a day. Every bridge I burn costs him two. I can make his march a misery, if the Board will pay the axemen.

${rumor(state)}

Philip Schuyler`,
    ],
    choices: [
      {
        label: `Wreck the roads (${money(10)})`,
        hint: "The first month Burgoyne stands at Ticonderoga, he can't advance.",
        apply(state) {
          if (state.treasury < 10) return "There was no money. Schuyler did what he could with his own soldiers.";
          spend(state, 10, "fortifications");
          state.flags.roadsWrecked = true;
          return "Axemen went to work on the road south of the lake. Every bridge between Ticonderoga and Fort Edward will burn.";
        },
      },
      { label: "Save the money", hint: "Keep the treasury for pay and recruits.", apply: () => "Schuyler replied that he hoped the Board knew what it was doing." },
    ],
  },
  {
    id: "sar_ticonderoga", scripted: true, fromTurn: 0, untilTurn: 2, from: "stclair",
    when: (state) => { const b = burgoyne(state); const t = armyAt(state, "ticonderoga", "P"); return b && t && distance(b.region, "ticonderoga") <= 1; },
    place: "Fort Ticonderoga",
    title: ["Ticonderoga cannot be held", "Cannon on Sugar Loaf"],
    body: [
      (state) => `Sir,

The enemy has dragged cannon to the top of Sugar Loaf, a hill we were told no army could climb. From there his guns can fire straight down into the fort. I have ${menWords(armyMen(armyAt(state, "ticonderoga", "P")))} men to hold works built for ten thousand.

If I stay, I will lose this army. If I go, I will lose my reputation. The country thinks Ticonderoga is the Gibraltar of the North. I await your orders, though they must come quickly.

Arthur St. Clair`,
      (state) => `Sir,

This morning my officers woke me to show me red coats on the summit of Sugar Loaf. Our engineers swore it was too steep for guns. They were wrong. By tomorrow the enemy's cannon will look down into every corner of this fort.

My ${menWords(armyMen(armyAt(state, "ticonderoga", "P")))} men are brave, but they cannot fight cannon they cannot reach. I can hold and be destroyed, or slip away tonight across the lake and be called a coward. I would rather the Board decided which.

A. St. Clair`,
    ],
    choices: [
      {
        label: "Hold the fort to the last",
        hint: "The garrison digs in. Burgoyne must storm it.",
        apply(state) {
          const a = armyAt(state, "ticonderoga", "P");
          if (!a) return "The garrison was no longer there.";
          if (!a.moved) digIn(state, a.id);
          changeLoyalty(state, "stclair", 5);
          return "St. Clair's men manned the walls and waited for the assault.";
        },
      },
      {
        label: "Abandon the fort and save the army",
        hint: "Cause -4. The garrison slips away to fight another day.",
        apply(state) {
          const a = armyAt(state, "ticonderoga", "P");
          if (!a) return "The garrison was no longer there.";
          const to = withdraw(state, a.id);
          if (!to) { digIn(state, a.id); return "There was no way out. The garrison dug in."; }
          changeCause(state, -4, "Ticonderoga was abandoned without a fight.");
          state.flags.ticonderogaAbandoned = state.turn;
          return `The garrison crossed the lake by night and marched for ${REGIONS[to].name}. Congress is furious. "We shall never be able to defend a post," John Adams wrote, "until we shoot a general."`;
        },
      },
    ],
  },
  {
    id: "sar_arnold", scripted: true, turn: 1, from: "washington",
    title: "Arnold is coming north",
    body: (state) => `Gentlemen,

Howe has put his army on board ship and sailed, I believe for Philadelphia, so I must keep the main army here. But I can send the Northern Department a general who knows the country and has never been accused of being slow.

General Arnold is on his way to Albany. ${arnoldMemory(state)}

G. Washington`,
    choices: [{
      label: "Welcome him",
      hint: "Arnold joins as a general you can assign to any army without one.",
      apply(state) { state.generals.arnold.status = "reserve"; return "Arnold rode into Albany within the week, already full of plans."; },
    }],
  },
  {
    id: "sar_mccrea", scripted: true, turn: 1, from: (state) => commander(state),
    title: "The murder of Jane McCrea",
    body: () => `Gentlemen,

A young woman named Jane McCrea was killed near Fort Edward by warriors serving with Burgoyne. She was engaged to a Loyalist officer in his own army.

Burgoyne promised that his Native allies would not harm civilians, and now every farmer in New England believes he can't keep his word. Men who stayed home all summer are talking about taking down their muskets.`,
    choices: [
      {
        label: `Print the story in every newspaper (${money(5)})`,
        hint: "Cause +3. New England militia march to your largest army.",
        apply(state) {
          const a = commandArmy(state);
          if (state.treasury >= 5) spend(state, 5, "printing");
          changeCause(state, 3, "The story of Jane McCrea spread across New England.");
          if (a) a.militia.push({ men: 1500, left: 3 });
          return "The story ran in every newspaper from Boston to Philadelphia. Militia companies started marching for the Hudson.";
        },
      },
      { label: "Leave it alone", hint: "Nothing changes.", apply: () => "The news spread anyway, more slowly." },
    ],
  },
  {
    id: "sar_stanwix", scripted: true, fromTurn: 1, untilTurn: 2, from: "colonel",
    when: (state) => state.regions.mohawk.owner === "P" && state.turn === (state.flags.history?.stanwixTurn ?? 2),
    title: "Fort Stanwix is besieged",
    body: () => `Sir,

Colonel St. Leger has come down from Lake Ontario with British regulars, Loyalists and some hundreds of Mohawk and Seneca warriors under Joseph Brant. They have surrounded Fort Stanwix. Colonel Gansevoort has refused to surrender, but the garrison has food for a few weeks.

If the fort falls, St. Leger will come down the Mohawk Valley to Albany, behind our army.

The colonel commanding at German Flatts`,
    choices: [
      {
        label: "Send Arnold with a relief column",
        hint: "Arnold has an idea. He usually does.",
        apply(state) {
          state.flags.stanwixSaved = true;
          changeLoyalty(state, "arnold", 5);
          changeCause(state, 2, "The siege of Fort Stanwix was lifted.");
          return "Arnold sent a half-witted Loyalist prisoner ahead to tell St. Leger's camp that a huge American army was coming. The Native allies left at once, and St. Leger fled back to Canada, leaving his tents and cannon behind.";
        },
      },
      {
        label: "Call out the Tryon County militia",
        hint: "General Herkimer's militia try to break the siege. A gamble.",
        apply(state) {
          if (makeRng(state)() < 0.55) {
            state.flags.stanwixSaved = true;
            changeCause(state, 1, "The Mohawk Valley militia fought at Oriskany.");
            return "Herkimer's militia were ambushed at Oriskany and fought all day in a ravine. Herkimer was mortally wounded, but the garrison sallied out and wrecked the enemy camp. St. Leger gave up the siege.";
          }
          return stanwixFalls(state, "Herkimer's militia were ambushed at Oriskany and cut to pieces. ");
        },
      },
      {
        label: "The fort must hold on its own",
        hint: "It might.",
        apply(state) {
          if (makeRng(state)() < 0.35) { state.flags.stanwixSaved = true; return "Gansevoort's garrison held out until St. Leger's allies lost patience and went home."; }
          return stanwixFalls(state, "");
        },
      },
    ],
  },
  {
    id: "sar_bennington", scripted: true, turn: 2, from: "stark",
    when: (state) => !!findGeneralArmy(state, "stark") && !!burgoyne(state) && burgoyne(state).region !== "stjohns",
    place: "Bennington",
    title: ["Germans are marching on Bennington", "They want our horses"],
    body: [
      (state) => `Sir,

A column of Burgoyne's Germans is coming to Bennington to seize our horses, cattle and the stores there. They are dragoons without horses, marching in heavy boots, so they are not coming fast.

I have ${menWords(armyMen(findGeneralArmy(state, "stark")))} New Hampshire men. I don't take orders from Congress, which promoted men over my head, but I will take advice from the Board. Do we fight?

John Stark`,
      (state) => `Sir,

Burgoyne has sent Colonel Baum with Germans, Loyalists and Indians to take the stores at Bennington. They mean to mount his dragoons on our horses. Imagine it: cavalry riding Vermont farm horses against Vermont farmers.

I have ${menWords(armyMen(findGeneralArmy(state, "stark")))} men who know every wall and wood lot between here and the Walloomsac. Say the word.

J. Stark`,
    ],
    choices: [
      {
        label: "Fight them",
        hint: "If Stark has enough men, Burgoyne loses about 900 men and the stores he needs. Stark's loyalty rises.",
        apply(state) {
          const s = findGeneralArmy(state, "stark");
          const b = burgoyne(state);
          if (s && armyMen(s) >= 1000) {
            if (b) b.regulars = Math.max(500, b.regulars - 900);
            state.flags.burgoyneHungry = true;
            state.stats.won++;
            changeCause(state, 5, "Stark's militia won at Bennington.");
            changeLoyalty(state, "stark", 15);
            return "\"There are the redcoats, and they are ours, or Molly Stark sleeps a widow tonight!\" Stark's militia surrounded the Germans and took nearly 700 prisoners. Burgoyne's army will go hungry.";
          }
          if (s) s.militia.forEach((m) => { m.men = Math.round(m.men * 0.7); });
          changeCause(state, -2, "Stark was beaten near Bennington.");
          return "Stark had too few men. The Germans drove them off and took the stores.";
        },
      },
      {
        label: "Let them take the stores",
        hint: "Cause -2. Burgoyne's army eats well for two months.",
        apply(state) {
          state.flags.burgoyneFedUntil = state.turn + 1;
          changeCause(state, -2, "The British took the stores at Bennington.");
          return "The Germans drove off the cattle and loaded the wagons. Burgoyne's army will eat well for a while.";
        },
      },
    ],
  },
  {
    id: "sar_gates", scripted: true, turn: 2, from: "congress",
    when: (state) => state.generals.schuyler.status === "active",
    title: "Congress wants a new general",
    body: () => `Sir,

The loss of Ticonderoga has caused an uproar. The New England delegates blame General Schuyler, and say their militia will not turn out for him. They have voted to send General Horatio Gates to command the Northern Department.

General Schuyler has friends here too. The Board must decide whether to carry out this vote.

John Hancock, President`,
    choices: [
      {
        label: "Give Gates the command",
        hint: "Gates takes over Schuyler's army. New England militia come out for him. Arnold, who dislikes Gates, loses loyalty.",
        apply(state) {
          const a = findGeneralArmy(state, "schuyler");
          state.generals.schuyler.status = "away";
          state.generals.gates.status = "reserve";
          if (a) { a.general = "gates"; state.generals.gates.status = "active"; a.militia.push({ men: 2000, left: 3 }); }
          changeLoyalty(state, "arnold", -5);
          return "Gates arrived in camp to cheers from the New England regiments. Schuyler went home to Albany and kept sending him supplies, which Gates did not mention in his reports.";
        },
      },
      {
        label: "Keep Schuyler",
        hint: "Cause -3. Schuyler's loyalty rises, but fewer militia come.",
        apply(state) { changeCause(state, -3, "New England grumbled about Schuyler."); changeLoyalty(state, "schuyler", 10); return "Schuyler kept the command. The New England militia were slow to come."; },
      },
    ],
  },
  {
    id: "sar_morgan", scripted: true, turn: 3, from: "washington",
    title: "Morgan's riflemen",
    body: () => `Gentlemen,

I have five hundred riflemen under Colonel Daniel Morgan, the best marksmen in this army. In the forests of the north they would be worth thousands. Here they would help me against Howe, who is now marching on Philadelphia.

I leave it to the Board where they will do more good.

G. Washington`,
    choices: [
      {
        label: "Send Morgan north",
        hint: "Morgan and 500 riflemen join your biggest army near Albany. Philadelphia may fall faster.",
        apply(state) {
          const a = commandArmy(state);
          state.generals.morgan.status = "reserve";
          if (a) {
            a.regulars += 500;
            if (!a.general) { a.general = "morgan"; state.generals.morgan.status = "active"; }
          }
          return "Morgan's riflemen arrived in their hunting shirts and went straight into the woods. Assign Morgan to an army to lead them.";
        },
      },
      {
        label: "Keep him with Washington",
        hint: "Philadelphia's fall will cost you less Cause.",
        apply(state) { state.flags.morganStayed = true; return "Morgan stayed in Pennsylvania."; },
      },
    ],
  },
  {
    id: "sar_philadelphia", scripted: true, turn: 4, from: "congress",
    title: "Philadelphia has fallen",
    body: (state) => `Sir,

I write from York, Pennsylvania. Howe beat General Washington at the Brandywine and marched into Philadelphia on the twenty-sixth of September. Congress fled in the night.

Washington's army is still in the field${state.flags.morganStayed ? ", and it fought hard. People say it was a close thing" : ""}. But the capital is lost, and the country now looks north to you. Only a victory over Burgoyne can make up for this.

John Hancock, President`,
    choices: [{
      label: "Tell them to hold on",
      hint: (state) => (state.flags.morganStayed ? "Cause -3." : "Cause -6."),
      apply(state) {
        state.regions.philadelphia.owner = "B";
        changeCause(state, state.flags.morganStayed ? -3 : -6, "Philadelphia fell to Howe.");
        return "Congress set up in the courthouse at York. Its taxes from Philadelphia are lost.";
      },
    }],
  },
  {
    id: "sar_quarrel", scripted: true, turn: 4, from: "arnold",
    when: (state) => state.generals.gates.status === "active" && ["active", "reserve"].includes(state.generals.arnold.status),
    title: "Gates and I",
    body: () => `Sir,

At Freeman's Farm my division fought the whole British army for an afternoon while General Gates sat in his headquarters. His report to Congress does not mention my name.

When I complained, he relieved me of my command. I am told to go to Philadelphia, which is in enemy hands. I will not leave this army on the eve of a battle, but I can't serve under a man who lies about me.

The Board must choose between us.

B. Arnold`,
    choices: [
      {
        label: "Back Gates",
        hint: "Arnold loses his command. His loyalty falls sharply.",
        apply(state) {
          const a = findGeneralArmy(state, "arnold");
          if (a) { a.general = null; }
          state.generals.arnold.status = "reserve";
          changeLoyalty(state, "arnold", -20);
          changeLoyalty(state, "gates", 5);
          return "Arnold stayed in camp with no command, pacing his tent. He will remember this.";
        },
      },
      {
        label: "Back Arnold",
        hint: "Arnold keeps a command and his loyalty rises. Gates is offended.",
        apply(state) { changeLoyalty(state, "arnold", 15); changeLoyalty(state, "gates", -10); return "Arnold kept his command. Gates stopped speaking to him."; },
      },
    ],
  },
  {
    id: "sar_clinton", scripted: true, turn: 4, from: "putnam",
    when: (state) => !!findGeneralArmy(state, "clinton") && !!armyAt(state, "highlands", "P"),
    title: "Clinton is coming up the river",
    body: () => `Gentlemen,

Sir Henry Clinton has put troops on boats in New York and is coming up the Hudson. I reckon he means to break through the Highlands and reach Burgoyne before winter.

Forts Clinton and Montgomery are undermanned. Say the word and we hold them. Say the other and I bring the men off while I still can.

I. Putnam`,
    choices: [
      { label: "Hold the Highlands", hint: "Putnam's army digs in.", apply(state) { const a = armyAt(state, "highlands", "P"); if (a && !a.moved) digIn(state, a.id); return "Putnam's men manned the forts."; } },
      { label: "Fall back and save the men", hint: "The army withdraws without a fight.", apply(state) { const a = armyAt(state, "highlands", "P"); const to = a && withdraw(state, a.id); return to ? `Putnam fell back to ${REGIONS[to].name}.` : "There was nowhere to go. Putnam dug in."; } },
    ],
  },
  {
    id: "sar_terms", scripted: true, repeat: true, from: (state) => commander(state),
    when: (state) => burgoyneCornered(state),
    ctx: (state) => ({ men: armyMen(burgoyne(state)) }),
    title: "Burgoyne asks for terms",
    body: (state, ctx) => `Sir,

A British officer came into our lines this morning under a white flag. General Burgoyne's army, ${menWords(ctx.men)} men, is out of food and surrounded. He asks for terms.

He will not surrender as a prisoner. He offers a "convention": his army lays down its arms, marches to Boston and sails home, promising never to fight in America again.

I could refuse and demand unconditional surrender. He might accept. Or he might try to cut his way out.`,
    choices: [
      {
        label: "Accept the convention",
        hint: "Victory now. His soldiers go home, and Britain can send others in their place.",
        apply(state) {
          state.flags.lastTerms = state.turn;
          const b = burgoyne(state);
          if (b) { delete state.armies[b.id]; state.generals.burgoyne.status = "away"; }
          changeCause(state, 10, "Burgoyne's army surrendered at Saratoga.");
          state.flags.convention = { result: "victory", stars: 2, title: "The Convention of Saratoga", text: "Burgoyne's army stacked its muskets on the meadow by the Hudson and marched off toward Boston. The war in the north is over. In the end Congress, suspicious of British promises, never let them sail home.", score: scoreOf(state) + 20 };
          state.gameOver = state.flags.convention;
          return state.turn === 4 ? "The British laid down their arms on the seventeenth of October, as it really happened." : `The British laid down their arms in ${dateLabel(state)}.`;
        },
      },
      {
        label: "Demand unconditional surrender",
        hint: "About a 60% chance he accepts, for a complete victory. If not, he fights on.",
        apply(state) {
          state.flags.lastTerms = state.turn;
          if (makeRng(state)() < 0.6) {
            const b = burgoyne(state);
            if (b) delete state.armies[b.id];
            state.generals.burgoyne.status = "captured";
            changeCause(state, 14, "Burgoyne surrendered unconditionally.");
            state.gameOver = checkEnd(state);
            return "Burgoyne read the terms twice, then agreed. His whole army are prisoners of war.";
          }
          const b = burgoyne(state);
          if (b) b.stalled = 0;
          return "Burgoyne refused. \"Sooner than this army will consent to ground their arms in their encampment, they will rush on the enemy.\" He is preparing to fight his way out.";
        },
      },
    ],
  },

  // ---------- a council of war: the officers argue, and you decide ----------
  {
    id: "sar_council", scripted: true, kind: "council", fromTurn: 2, untilTurn: 4, from: (state) => commander(state),
    battleScene: null,
    when: (state) => { const b = burgoyne(state); const a = commandArmy(state); return b && a && b.region !== "stjohns" && distance(a.region, b.region) <= 1 && armyMen(a) >= 3000; },
    place: "Headquarters, near Stillwater",
    title: "Council of war",
    body: (state) => `The general officers met in headquarters last night. Burgoyne's army, about ${menWords(armyMen(burgoyne(state)))} men, is camped within a day's march. Nobody slept. Here is what each of them said.`,
    council: (state) => {
      const c = commander(state);
      const out = [{ from: c, choice: 0, says: c === "gates"
        ? "We have the high ground at Bemis Heights. The Polish engineer has laid out the lines. Let Burgoyne come to us and break his army on our earthworks. Time is on our side, not his."
        : "We should entrench and wait. Every week he waits, he eats his stores. I would not risk this army in the woods." }];
      if (["active", "reserve"].includes(state.generals.arnold.status)) out.push({ from: "arnold", choice: 1, says: "If we sit behind our walls he will drag his cannon onto the hills and shell us out. Meet him in the woods, where his regulars can't form lines, and beat him there. Give me the left wing and I will do it." });
      if (state.generals.morgan.status !== "away") out.push({ from: "morgan", choice: 2, says: "Don't fight him all at once. Let my riflemen into the trees around his camp. We'll shoot his officers, his gunners and his scouts, and he won't be able to send a man for water." });
      else out.push({ from: "colonel", choice: 2, says: "Send the militia into the woods to harry his foragers and pickets. We can bleed him without a pitched battle." });
      return out;
    },
    choices: [
      {
        label: "Dig in on the heights",
        hint: "Your army entrenches. The ground is fortified for the rest of the campaign.",
        apply(state) {
          const a = commandArmy(state);
          if (!a) return "The army was no longer there.";
          state.regions[a.region].works = true;
          if (!a.moved) digIn(state, a.id); else a.dugIn = true;
          changeLoyalty(state, "arnold", -3);
          return `The men worked through the night. By morning there were breastworks of logs and earth across ${REGIONS[a.region].name}, with cannon in every gap.`;
        },
      },
      {
        label: "Attack him in the woods",
        hint: "Your army attacks Burgoyne now. Riskier, but a win could break him.",
        apply(state) {
          const a = commandArmy(state), b = burgoyne(state);
          if (!a || !b) return "By the time the orders came, the chance had passed.";
          changeLoyalty(state, "arnold", 8);
          a.moved = false;
          const r = moveArmy(state, a.id, b.region, {});
          if (typeof r === "string") { return "The army could not reach him."; }
          state.lastSurprise = r;
          return r.attackerWins ? "The army went into the woods at dawn and fell on Burgoyne's lines. By evening the British were in retreat." : "The attack ran into Burgoyne's regulars in a clearing and was beaten back with heavy losses.";
        },
      },
      {
        label: "Send riflemen to harry his camp",
        hint: "Burgoyne loses men and can't move next month.",
        apply(state) {
          const b = burgoyne(state);
          if (!b) return "There was nobody left to harry.";
          b.regulars = Math.round(b.regulars * (state.generals.morgan.status !== "away" ? 0.93 : 0.96));
          b.stalled = Math.max(b.stalled || 0, 1);
          changeLoyalty(state, "morgan", 5);
          return "For days the woods around Burgoyne's camp crackled with rifle fire. His pickets were shot at their posts, and his foraging parties stopped going out.";
        },
      },
    ],
  },

  // ---------- consequences ----------
  {
    id: "sar_inquiry", scripted: true, from: "congress", place: "Philadelphia",
    when: (state) => state.flags.ticonderogaAbandoned !== undefined && state.turn > state.flags.ticonderogaAbandoned && state.generals.stclair.status !== "captured",
    title: "Congress wants a court-martial",
    body: [
      () => `Sir,

The loss of Ticonderoga without a shot has caused more anger here than any defeat of this war. Members are demanding that General St. Clair be arrested and tried. Some say he was paid by the enemy, which I do not believe.

Congress will follow the Board's advice.

John Hancock, President`,
      () => `Sir,

I must tell you plainly that the country is in an uproar over Ticonderoga. The fort that cost so much, given up without a fight! Mr. Adams says we shall never defend a post until we shoot a general. He is only partly joking.

What does the Board advise about General St. Clair?

John Hancock`,
    ],
    choices: [
      { label: "Defend St. Clair: he saved the army", hint: "Cause -1. St. Clair's loyalty rises sharply.", apply(state) { changeCause(state, -1, "The Board defended St. Clair."); changeLoyalty(state, "stclair", 15); return "The Board wrote that St. Clair had saved three thousand men for the fight that mattered. Congress grumbled, and delayed the court-martial."; } },
      {
        label: "Let the court-martial go ahead",
        hint: "St. Clair is relieved of command until the trial.",
        apply(state) {
          const a = findGeneralArmy(state, "stclair");
          if (a) a.general = null;
          state.generals.stclair.status = "away";
          return "St. Clair handed over his command and went to await his trial. (He was cleared in 1778.)";
        },
      },
    ],
  },

  // ---------- camp life ----------
  {
    id: "sar_baroness", random: true, weight: 2, kind: "intel", fromTurn: 3, untilTurn: 5, from: "spy", fromName: "Taken from a captured courier",
    when: (state) => !!burgoyne(state),
    ctx: () => ({ reliable: true, truth: true }),
    title: "A letter from Burgoyne's camp",
    body: (state) => `Our pickets stopped a courier riding north toward Canada. Among his dispatches was a private letter in German from the Baroness von Riedesel, wife of the Brunswick general, who travels with the army and her three small daughters.

Our interpreter says she writes of short rations and tired men, of her children sleeping in a carriage, and of General Burgoyne giving suppers and drinking champagne late into the night as if nothing were wrong.

There is nothing military in it, except what it tells us about the state of their camp.`,
    choices: [
      { label: "Send it on to Canada, unopened in spirit", hint: "Cause +1: the country hears the Board behaves like gentlemen.", apply(state) { changeCause(state, 1, "The Board sent a lady's letter on through the lines."); return "The letter was sealed again and sent through the lines under a flag of truce, with the Board's compliments to the Baroness."; } },
      { label: "Let Burgoyne know we've read it", hint: "His officers lose heart: Burgoyne is more likely to ask for terms.", apply(state) { state.flags.burgoyneDespairs = true; return "A copy went back through the lines with a note: the Board hopes the champagne holds out. Burgoyne's officers were not amused."; } },
    ],
  },

  // ---------- chance events: a few of these turn up in each game ----------
  {
    id: "sar_oneida", random: true, weight: 2, fromTurn: 0, untilTurn: 3, from: (state) => commander(state), place: "Albany",
    title: "The Oneida offer their help",
    body: () => `Gentlemen,

Chiefs of the Oneida nation have come to Albany. The Iroquois Confederacy is breaking apart over this war: the Mohawk and Seneca have joined the British, but the Oneida, and many Tuscarora, lean toward us. Their missionary, Mr. Kirkland, has been their friend for years.

They offer scouts who know every trail between the lake and the Hudson. They ask for gifts of cloth, powder and food for their families, which have been hungry since the war closed the trading posts.`,
    choices: [
      { label: `Accept, and send the gifts (${money(8)})`, hint: "Oneida scouts harry Burgoyne's foragers: he loses more men every month.", apply(state) { if (state.treasury < 8) return "There was no money for gifts. The Oneida went home disappointed."; spend(state, 8, "letters"); state.flags.oneida = true; return "Oneida scouts went north. From now on Burgoyne's foraging parties will not come back so often."; } },
      { label: "We can't spare the money", hint: "Nothing changes.", apply: () => "The chiefs listened politely, and went home." },
    ],
  },
  {
    id: "sar_smallpox", random: true, fromTurn: 1, untilTurn: 4, from: (state) => commander(state),
    title: ["Smallpox in camp", "The pox"],
    body: [
      () => `Gentlemen,

Smallpox has broken out in two regiments. The surgeons say we can inoculate the whole army: give every man a mild case on purpose, so he can't catch the deadly one. Some will die of it, and the rest will be sick for weeks. Or we can put the sick in a pest house and hope it spreads no further.`,
      () => `Gentlemen,

I am sorry to report the smallpox among the men. Three have died this week. The doctors are divided. Half want to inoculate the army at once, which will lay it low for a month. The other half say isolate the sick and pray.`,
    ],
    choices: [
      { label: `Inoculate everyone (${money(10)})`, hint: "Your largest army loses a few men now, and is safe after.", apply(state) { const a = commandArmy(state); if (state.treasury >= 10) spend(state, 10, "letters"); if (a) a.regulars = Math.round(a.regulars * 0.96); return "The surgeons went tent to tent with their lancets. A few men died, but the army is safe from the pox."; } },
      { label: "Isolate the sick and hope", hint: "Free. A gamble.", apply(state) { const a = commandArmy(state); if (makeRng(state)() < 0.5) return "The pest house worked. The outbreak burned out."; if (a) { a.regulars = Math.round(a.regulars * 0.88); for (const m of a.militia) m.men = Math.round(m.men * 0.85); } return "It spread. Hundreds fell sick, and the militia went home in droves rather than catch it."; } },
    ],
  },
  {
    id: "sar_deserters", random: true, weight: 2, kind: "intel", fromTurn: 2, untilTurn: 5, from: "spy", fromName: "A scout on the Hudson",
    when: (state) => !!burgoyne(state) && burgoyne(state).region !== "stjohns",
    ctx: (state) => { const r = makeRng(state); const reliable = r() < 0.6; return { reliable, truth: reliable ? r() < 0.85 : r() < 0.35, wagons: 20 + Math.floor(r() * 30) }; },
    title: "A wagon train",
    body: (state, ctx) => `Two German deserters came into our lines last night, half starved. They say a train of ${ctx.wagons} wagons with flour and rum is coming down from Fort George to Burgoyne's camp within the week, with only a company to guard it.

${ctx.reliable ? "They seem honest. Their story matches what our scouts have seen." : "I don't trust them. They contradict each other, and deserters will say anything for a meal."}`,
    choices: [
      {
        label: "Ambush the wagons",
        hint: "If the story is true, Burgoyne loses his supplies. If it's a trap, your militia pay for it.",
        apply(state, ctx) {
          const b = burgoyne(state), a = commandArmy(state);
          if (ctx.truth) { if (b) b.regulars = Math.max(500, b.regulars - 350); state.flags.burgoyneHungry = true; changeCause(state, 2, "Militia captured Burgoyne's wagons."); return `The story was true. Militia caught the wagons in a ravine and drove off every one. Burgoyne's men are on half rations.`; }
          if (a) for (const m of a.militia) m.men = Math.round(m.men * 0.7);
          changeCause(state, -1, "An ambush went wrong.");
          return "There were no wagons, only a battalion of grenadiers waiting in the trees. The militia ran, and many did not stop running until they were home.";
        },
      },
      { label: "Ignore it", hint: "Safe.", apply: (state, ctx) => (ctx.truth ? "Later we learned the wagons were real, and reached Burgoyne safely." : "Just as well: our scouts later found grenadiers waiting where the wagons were supposed to be.") },
    ],
  },
  {
    id: "sar_proclamation", random: true, fromTurn: 0, untilTurn: 2, from: "jadams", place: "Philadelphia",
    title: "Burgoyne's proclamation",
    body: [
      () => `Gentlemen,

Have you seen Burgoyne's proclamation? He calls on the people of New York to submit, and threatens to "give stretch" to his Indian allies against anyone who resists. It is pompous enough to have been written for the stage, which, considering the author, it perhaps was.

Mr. Hopkinson here has written a parody that had all of Congress laughing. I suggest we print it everywhere. Nothing hurts a general like being laughed at.

John Adams`,
      () => `Dear Sirs,

General Burgoyne has issued a proclamation of such swollen self-importance that I laughed aloud reading it, which I have not done since the spring. He threatens the people with his Indians and promises them the King's mercy in the same breath.

I say we answer it with ridicule. Give the printers a few dollars and the whole country will be quoting it to mock him.

J. Adams`,
    ],
    choices: [
      { label: `Print the parody everywhere (${money(4)})`, hint: "Cause +3.", apply(state) { if (state.treasury >= 4) spend(state, 4, "printing"); changeCause(state, 3, "The country laughed at Burgoyne's proclamation."); return "The parody ran in every newspaper. Farmers who had never read a proclamation in their lives were reciting it in taverns."; } },
      { label: "Ignore it", hint: "Nothing changes.", apply: () => "Adams replied that the Board had no sense of humor." },
    ],
  },
  {
    id: "sar_vermont", random: true, fromTurn: 1, untilTurn: 3, from: "stark", fromName: "The Council of Safety of Vermont",
    title: "Vermont asks to be recognized",
    body: () => `Gentlemen,

The people of the New Hampshire Grants have declared themselves a free and independent state called Vermont. New York claims our land and calls us rebels against New York, as well as against the King.

We are raising men to fight Burgoyne. We would raise more if Congress would recognize us. We ask the Board to speak for us.

Thomas Chittenden, for the Council of Safety`,
    choices: [
      { label: "Promise to speak for Vermont", hint: "1,500 Vermont militia join your army near Bennington. New York is angry.", apply(state) { const a = findGeneralArmy(state, "stark") || armyAt(state, "bennington", "P") || commandArmy(state); if (a) a.militia.push({ men: 1500, left: 3 }); changeLoyalty(state, "schuyler", -8); return "Green Mountain Boys came down from the hills, ready to fight. In Albany, Schuyler and the New York men were furious."; } },
      { label: "New York's claims must stand", hint: "Schuyler is pleased. Vermont sends fewer men.", apply(state) { changeLoyalty(state, "schuyler", 5); return "Vermont's council replied that it would fight Burgoyne anyway, but would remember."; } },
    ],
  },
  {
    id: "sar_kosciuszko", random: true, weight: 3, fromTurn: 2, untilTurn: 4, from: (state) => commander(state),
    title: "A Polish engineer",
    body: () => `Gentlemen,

A young Polish officer, Colonel Thaddeus Kosciuszko, has joined us as an engineer. He has walked the whole river from Stillwater north and found a place called Bemis Heights, where the hills come down to the river and the road runs between. He says that with earthworks there, no army could pass.

He needs men, tools and money to build them.`,
    choices: [
      { label: `Fortify Saratoga (${money(12)})`, hint: "Saratoga becomes much harder to attack, and Kosciuszko joins as a general you can assign.", apply(state) { if (state.treasury < 12) return "There was no money for the works."; spend(state, 12, "fortifications"); state.regions.saratoga.works = true; state.generals.kosciuszko.status = "reserve"; return "Kosciuszko's lines went up on Bemis Heights: breastworks, redoubts and batteries covering the river road. Kosciuszko himself is ready to serve: assign him to an army, and every place it digs in will be fortified."; } },
      { label: "Not now", hint: "Keep the money.", apply: () => "Kosciuszko bowed and went back to his maps." },
    ],
  },
  {
    id: "sar_hamilton", random: true, fromTurn: 3, untilTurn: 4, from: "hamilton", place: "Headquarters, Pennsylvania",
    title: "General Washington asks for troops",
    body: (state) => `Sir,

I write at His Excellency's direction. General Howe has beaten us at the Brandywine and is close to Philadelphia. General Washington is short of men and asks whether the Northern Department can spare any regiments of Continentals, now that the militia have come out in such numbers.

He leaves it to the Board's judgment, but he would not ask if the need were not great.

A. Hamilton, Aide-de-Camp`,
    choices: [
      { label: "Send 1,500 regulars south", hint: "Your largest army is weaker. Philadelphia's fall costs less Cause.", apply(state) { const a = commandArmy(state); if (a) a.regulars = Math.max(300, a.regulars - 1500); state.flags.morganStayed = true; return "Two brigades marched south. Hamilton wrote back with Washington's thanks."; } },
      { label: "We need every man here", hint: "Keep your strength.", apply: () => "Hamilton replied politely. Washington, he said, understood." },
    ],
  },
  {
    id: "sar_lafayette", random: true, fromTurn: 2, untilTurn: 5, from: "lafayette", place: "Washington's camp",
    title: "A volunteer from France",
    body: () => `Messieurs,

Forgive my English, I learn it every day. I am arrived from France to serve the cause of liberty, at my own expense, and Congress has done me the honor of making me a major general, although I am only nineteen.

All of Paris watches what happens to General Burgoyne. A victory in the north would do more for an alliance than all of Dr. Franklin's dinners. I am writing to my friends at court. What shall I tell them?

Lafayette`,
    choices: [
      { label: "Tell them we will win", hint: "Cause +1.", apply(state) { state.flags.lafayette = true; changeCause(state, 1, "Lafayette wrote to Paris."); return "Lafayette's letters went to Versailles full of confidence. Now the north had better deliver."; } },
      { label: "Tell them the truth: it's close", hint: "Nothing changes.", apply: () => "Lafayette promised to be honest, and to be hopeful." },
    ],
  },
  {
    id: "sar_silverbullet", random: true, weight: 3, kind: "intel", fromTurn: 3, untilTurn: 4, from: "putnam",
    when: (state) => !!findGeneralArmy(state, "clinton"),
    ctx: () => ({ reliable: true, truth: true }),
    title: "A message in a silver bullet",
    body: (state) => `Gentlemen,

We caught a man near New Windsor who said he was a messenger from Clinton. When he saw he'd been taken, he swallowed something. A dose of medicine brought it up: a hollow silver bullet with a note inside, from Clinton to Burgoyne.

It says: ${state.flags.history?.clinton === "early" ? "\"Nous y voici, here we are, and nothing now between us but Gates.\" He is coming up the river with everything he has." : state.flags.history?.clinton === "late" ? "that Clinton can do little, and Burgoyne must look after himself." : "that Clinton is moving on the Highland forts, and hopes it will draw some of our men away from Burgoyne."}

The man will hang as a spy. The question is what we do with what he carried.

I. Putnam`,
    choices: [
      { label: "Rush militia to the Highlands", hint: "1,500 militia join the army in the Highlands.", apply(state) { const a = armyAt(state, "highlands", "P") || findGeneralArmy(state, "putnam"); if (a) a.militia.push({ men: 1500, left: 2 }); return "Militia from Connecticut and New York marched for the Highland forts."; } },
      { label: "Make sure Burgoyne hears it's hopeless", hint: "Burgoyne is more likely to ask for terms.", apply(state) { state.flags.burgoyneDespairs = true; return "Our scouts let a copy of the news slip through to Burgoyne's camp. He knows now that no help is coming."; } },
    ],
  },
  {
    id: "sar_mutiny", random: true, fromTurn: 2, untilTurn: 5, from: (state) => commander(state),
    title: ["The New York regiments are unpaid", "Trouble in the ranks"],
    body: (state) => `Gentlemen,

The New York regiments have not been paid since the spring. This morning a company stacked its muskets and said it would not march another mile until it saw money. The officers talked them back into line, but it won't hold for long.

Their arrears come to about ${money(15)}.`,
    choices: [
      { label: `Pay them now (${money(15)})`, hint: "The army stays together.", apply(state) { if (state.treasury < 15) { const a = commandArmy(state); if (a) a.regulars = Math.round(a.regulars * 0.92); return "There was not enough money. Some of the men went home."; } spend(state, 15, "back pay"); return "The paymaster arrived with the money. The company picked up its muskets."; } },
      { label: "Promise them it is coming", hint: "Some will desert anyway.", apply(state) { const a = commandArmy(state); if (a) a.regulars = Math.round(a.regulars * 0.94); return "The promise kept most of them. Not all."; } },
    ],
  },
  {
    id: "sar_jay", random: true, fromTurn: 0, untilTurn: 3, from: "jay", place: "Kingston, New York",
    title: "New York's new government",
    body: () => `Gentlemen,

New York has adopted a constitution and is choosing a governor, General George Clinton (no relation to the British general, he will tell you at length). We are trying to build a state while the enemy comes down the lake.

The state can call out more militia for the Hudson, but it needs muskets and powder to arm them. Can the Board help?

John Jay`,
    choices: [
      { label: `Send arms to New York (${money(8)})`, hint: "2,000 New York militia join the army in the Highlands or at Albany.", apply(state) { if (state.treasury < 8) return "The Board had no money for arms."; spend(state, 8, "letters"); const a = armyAt(state, "highlands", "P") || commandArmy(state); if (a) a.militia.push({ men: 2000, left: 3 }); return "Wagons of muskets went up the Hudson. New York's militia turned out."; } },
      { label: "We have nothing to spare", hint: "Nothing changes.", apply: () => "Jay wrote back, very politely, that New York would remember." },
    ],
  },
];

function stanwixFalls(state, prefix) {
  const g = armyAt(state, "mohawk", "P");
  if (g) delete state.armies[g.id];
  state.regions.mohawk.owner = "B";
  state.generals.stleger.status = "reserve";
  newArmy(state, { side: "B", region: "mohawk", regulars: 1800, general: "stleger" });
  changeCause(state, -3, "Fort Stanwix fell.");
  return prefix + "Fort Stanwix has fallen. St. Leger is coming down the Mohawk Valley toward Albany.";
}

export { earn };
