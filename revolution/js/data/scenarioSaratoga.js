// Scenario: Saratoga, 1777.
// June to November 1777. General Burgoyne marches south from Canada to take Albany and cut New England off
// from the other states. You run the Northern Department; Washington and the main army are far away in Pennsylvania.

import { REGIONS } from "./regions.js";
import { GENERALS } from "./generals.js";
import {
  newArmy, armyAt, armyList, armyMen, findGeneralArmy, changeCause, changeLoyalty, spend, earn, money, fmtMen,
  distance, retreatSpot, log, digIn, withdraw,
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
  P("ticonderoga", 2500, 1000, "stclair");
  P("albany", 1500, 1200, "schuyler");
  P("mohawk", 750, 0, null); // Fort Stanwix
  P("newhampshire", 0, 1500, "stark", 5);
  P("highlands", 1500, 500, "putnam");

  newArmy(state, { side: "B", region: "stjohns", regulars: BURGOYNE_START, general: "burgoyne" });
  newArmy(state, { side: "B", region: "manhattan", regulars: 4000, general: "clinton" }).stalled = 4; // Clinton waits for reinforcements until October
  state.flags.burgoyneFedUntil = 1;
}

export const REINFORCEMENTS = [];

// ---------- helpers ----------
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
  return (armyMen(b) < BURGOYNE_START * 0.6 || trapped) && ours >= armyMen(b) * 1.1;
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
      log(state, `${fmtMen(men)} militia from New England marched into ${REGIONS[a.region].name} to fight Burgoyne.`, "good");
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
  const rate = (b.region === "ticonderoga" ? 0.02 : 0.05) + (state.flags.burgoyneHungry ? 0.03 : 0);
  const lost = Math.round(b.regulars * rate);
  b.regulars -= lost;
  if (lost > 50) log(state, `Burgoyne's army lost ${fmtMen(lost)} men to hunger, sickness and desertion on its long supply line.`, "good");
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
    title: "Burgoyne is coming",
    body: () => `Gentlemen,

Our scouts on the lake report that General Burgoyne has left St. Johns with more than seven thousand British and German troops, Canadian volunteers, Iroquois allies and a great train of artillery.

I have not the men to meet him in the field. But the road from the lake to the Hudson runs twenty miles through forest and swamp. With axes and a thousand men I can fell trees across every road, burn every bridge and drive off every cow. It will cost money, and it will make me no friends among the farmers.

Philip Schuyler, Major General`,
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
    title: "Ticonderoga cannot be held",
    body: (state) => `Sir,

The enemy has dragged cannon to the top of Sugar Loaf, a hill we were told no army could climb. From there his guns can fire straight down into the fort. I have ${fmtMen(armyMen(armyAt(state, "ticonderoga", "P")))} men to hold works built for ten thousand.

If I stay, I will lose this army. If I go, I will lose my reputation. The country thinks Ticonderoga is the Gibraltar of the North. I await your orders, though they must come quickly.

Arthur St. Clair`,
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
          return `The garrison crossed the lake by night and marched for ${REGIONS[to].name}. Congress is furious. "We shall never be able to defend a post," John Adams wrote, "until we shoot a general."`;
        },
      },
    ],
  },
  {
    id: "sar_arnold", scripted: true, turn: 1, from: "washington",
    title: "Arnold is coming north",
    body: () => `Gentlemen,

Howe has put his army on board ship and sailed, I believe for Philadelphia, so I must keep the main army here. But I can send the Northern Department a general who knows the country and has never been accused of being slow.

General Arnold is on his way to Albany. I would ask the Board to make use of his talents, and to remember that he feels his treatment by Congress keenly.

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
    id: "sar_stanwix", scripted: true, turn: 2, from: "colonel",
    when: (state) => state.regions.mohawk.owner === "P",
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
    title: "Germans are marching on Bennington",
    body: (state) => `Sir,

A column of Burgoyne's Germans is coming to Bennington to seize our horses, cattle and the stores there. They are dragoons without horses, marching in heavy boots, so they are not coming fast.

I have ${fmtMen(armyMen(findGeneralArmy(state, "stark")))} New Hampshire men. I don't take orders from Congress, which promoted men over my head, but I will take advice from the Board. Do we fight?

John Stark`,
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

A British officer came into our lines this morning under a white flag. General Burgoyne's army, ${fmtMen(ctx.men)} men, is out of food and surrounded. He asks for terms.

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
          return "The British laid down their arms on the seventeenth of October.";
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
