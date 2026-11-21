// Scenario: the Philadelphia campaign, 1777.
// July to December 1777. Howe has put his army on board ship in New York and sailed, nobody knows where.
// He lands at the head of the Chesapeake, beats Washington at the Brandywine, and takes the capital.
// You are the Board of War with Washington's main army; the war in the north (Saratoga) goes on offstage.

import { REGIONS } from "./regions.js";
import { GENERALS } from "./generals.js";
import {
  newArmy, armyAt, armyList, armyMen, findGeneralArmy, changeCause, changeLoyalty, spend, earn, money, fmtMen, menWords,
  distance, log, digIn, moveArmy, dateLabel,
} from "../rules.js";
import { makeRng } from "../rng.js";

const HOWE_MEN = 15000;

export const SCENARIO = {
  id: "philadelphia",
  title: "The Philadelphia Campaign",
  blurb: "Howe has put fifteen thousand men aboard ship in New York and vanished out to sea. He is after Philadelphia, the capital. Keep Washington's army alive, make him pay for every mile, and keep the Cause burning into winter.",
  startMonth: 6, // July
  startYear: 1777,
  turns: 6,
  treasury: 90,
  priceLevel: 1.9,
  cause: 52,
  aiGoal: "philadelphia",
  aiGoalBold: true, // Howe came to take the capital, and will storm it
  aiTargets: { philadelphia: 35, chester: 6, bucks: 4, wilmington: 4, southjersey: 5, lancaster: 3 },
  aiArea: ["philadelphia", "chester", "bucks", "wilmington", "delmarva", "baltimore", "lancaster", "southjersey", "trenton", "princeton", "newbrunswick", "newark", "statenisland", "manhattan", "longisland", "westchester", "hackensack", "morristown", "easton", "frederick"],
  closedPorts: ["philadelphia", "southjersey", "bucks", "newark", "newbrunswick", "hackensack", "westchester", "baltimore", "virginia", "boston", "newhampshire", "rhodeisland", "connecticut", "longisland", "trenton"],
  goals: [
    "Washington must not be captured.",
    "Hold Philadelphia, or keep the army strong and win a battle.",
    "Keep the Cause alive into winter.",
  ],
  mustSurvive: ["washington"],
  focus: ["morristown", "philadelphia", "chester", "wilmington", "trenton", "southjersey"],
  defend: "philadelphia",
  commander: "washington",
  openingScene: "howeSails",
  victoryScene: "victory",
  newspaper: "The Pennsylvania Packet",
  history: {
    summary: "Howe sailed from New York in July 1777 and landed at Head of Elk, at the top of the Chesapeake, in late August. He beat Washington at the Brandywine on September 11, surprised Wayne at Paoli, and marched into Philadelphia on September 26. Congress fled to Lancaster, then York.",
    outcome: "Washington's dawn attack at Germantown on October 4 came close but failed in the fog. The Delaware River forts held into November, and the Hessians were bloodily beaten at Red Bank. On December 19 the army marched into winter quarters at Valley Forge.",
    facts: ["Brandywine: lost", "Germantown: lost, narrowly", "Philadelphia: taken by the British, September 26", "Washington's army in December: about 11,000 men, half of them sick or without shoes"],
  },
  tutorial: false,
  finish,
  objectives,
  advice,
  onOpenMonth,
  onCloseMonth,
};

const LOYALIST = {
  stjohns: 70, ticonderoga: 20, saratoga: 25, bennington: 15, newhampshire: 15, mohawk: 45, albany: 35, springfield: 15, boston: 10,
  rhodeisland: 30, connecticut: 20, kingston: 35, highlands: 30, westchester: 50, manhattan: 60, longisland: 60,
  statenisland: 75, hackensack: 45, morristown: 25, newark: 40, newbrunswick: 45, princeton: 35, trenton: 35,
  southjersey: 40, easton: 30, wyoming: 25, bucks: 45, philadelphia: 45, chester: 40, lancaster: 25, wilmington: 45,
  frederick: 20, baltimore: 25, delmarva: 55, virginia: 20,
};

export function setupScenario(state) {
  const british = new Set(["manhattan", "statenisland", "longisland", "rhodeisland", "stjohns"]);
  for (const id of Object.keys(REGIONS)) state.regions[id] = { owner: british.has(id) ? "B" : "P", loyalist: LOYALIST[id] ?? 30, works: false };
  const here = new Set(["washington", "greene", "sullivan", "stirling", "knox", "wayne", "putnam", "lafayette", "pulaski", "howe", "cornwallis", "knyphausen", "grey", "clinton"]);
  for (const [id, g] of Object.entries(GENERALS)) state.generals[id] = { ...g, status: here.has(id) ? "reserve" : "away" };
  for (const id of ["lafayette", "pulaski", "howe", "cornwallis", "knyphausen", "grey"]) state.generals[id].status = "away"; // they arrive later

  // History shifts each game: where Howe lands, and how big his army is.
  const r = makeRng({ seed: ((state.gameSeed ?? 1) * 37 + 11) >>> 0 });
  state.flags.history = { landing: r() < 0.65 ? "elk" : "shore", howeMen: Math.round((HOWE_MEN * (0.92 + r() * 0.16)) / 100) * 100 };

  const P = (region, regulars, militia, general, months = 3) => {
    const a = newArmy(state, { side: "P", region, regulars, general });
    if (militia) a.militia.push({ men: militia, left: months });
    return a;
  };
  P("morristown", 8500, 1500, "washington");
  P("hackensack", 2000, 0, "sullivan");
  P("philadelphia", 0, 2500, null);
  P("southjersey", 600, 0, null); // Fort Mercer, at Red Bank on the Delaware
  P("highlands", 1500, 500, "putnam");
  state.regions.southjersey.works = true;

  newArmy(state, { side: "B", region: "manhattan", regulars: 7000, general: "clinton" }).stalled = 9; // Clinton holds New York
  state.philadelphiaLoss = 10;
}

export const REINFORCEMENTS = [
  { turn: 3, side: "B", region: "wilmington", regulars: 3000, text: "Fresh British regiments arrived by sea from New York to join Howe." },
];

// ---------- helpers ----------
const wash = (state) => findGeneralArmy(state, "washington");
const howe = (state) => findGeneralArmy(state, "howe") || armyList(state, "B").filter((a) => a.region !== "manhattan" && a.region !== "statenisland" && a.region !== "longisland").sort((x, y) => armyMen(y) - armyMen(x))[0];
const fortsHeld = (state) => state.regions.southjersey.owner === "P" && !!armyAt(state, "southjersey", "P");

// ---------- month hooks ----------
function onOpenMonth(state) {
  // August: Howe's fleet comes up the Chesapeake (or the Delaware shore) and lands.
  if (state.turn === 1 && !howe(state)) {
    let at = state.flags.history.landing === "elk" ? "wilmington" : "delmarva";
    if (armyAt(state, at, "P")) at = at === "wilmington" ? "delmarva" : "wilmington";
    state.regions[at].owner = "B";
    for (const id of ["cornwallis", "knyphausen", "grey"]) state.generals[id].status = "reserve";
    state.generals.howe.status = "reserve";
    newArmy(state, { side: "B", region: at, regulars: state.flags.history.howeMen, general: "howe" }).stalled = 1; // a month to land horses, guns and stores
    log(state, `Howe's fleet has appeared: ${menWords(state.flags.history.howeMen)} British and Hessian troops are coming ashore at ${at === "wilmington" ? "Head of Elk, at the top of the Chesapeake" : "the Eastern Shore"}.`, "bad");
  }
  // Once Howe has the capital, he settles into it for the winter, as he did in history.
  const h = findGeneralArmy(state, "howe");
  if (h && h.region === "philadelphia" && state.regions.philadelphia.owner === "B") h.stalled = Math.max(h.stalled || 0, 1);
  // September: the Pennsylvania militia turn out to defend their own state.
  if (state.turn === 2 && state.cause >= 35) {
    const w = wash(state);
    if (w) { w.militia.push({ men: 2000, left: 3 }); log(state, "2,000 Pennsylvania militia joined Washington's army to defend their state.", "good"); }
  }
}

function onCloseMonth(state) {
  // While the Delaware River forts hold, British ships can't reach Philadelphia, and an army there goes short.
  const inCity = armyAt(state, "philadelphia", "B");
  if (inCity && fortsHeld(state)) {
    const lost = Math.round(inCity.regulars * (0.04 + (state.flags.millsBurned ? 0.03 : 0)));
    inCity.regulars -= lost;
    if (lost > 50) log(state, `The Delaware forts still block the river. The British in Philadelphia lost ${menWords(lost)} men to short rations and sickness.`, "good");
  }
}

// ---------- endings ----------
function scoreOf(state) {
  const w = wash(state);
  return Math.round(state.cause + state.stats.won * 5 - state.stats.lost * 2 + (state.regions.philadelphia.owner === "P" ? 25 : 0) + (w ? armyMen(w) / 1000 : 0) + (fortsHeld(state) ? 5 : 0));
}

function finish(state) {
  const held = state.regions.philadelphia.owner === "P";
  const w = wash(state);
  const strong = w && armyMen(w) >= 7000 && state.cause >= 40 && state.stats.won >= 1;
  const end = state.flags.valleyForge ? " The army marches into winter quarters at Valley Forge." : "";
  if (held && state.cause >= 50) return { result: "victory", stars: 3, title: "Philadelphia stands", text: "You did better than history: the capital is still free, and Howe goes into winter with nothing to show for his voyage." + end, score: scoreOf(state) + 20 };
  if (held || strong) return { result: "victory", stars: 2, title: "The army endures", text: (held ? "Philadelphia held. " : "Philadelphia fell, as it did in history, but ") + "Washington's army is still strong and has proven it can fight the King's best." + end, score: scoreOf(state) };
  if (w && state.cause >= 35) return { result: "survived", stars: 1, title: "Into winter quarters", text: "The capital is lost and the army is battered, but it is still an army. Winter will decide whether it survives." + end, score: scoreOf(state) };
  return { result: "defeat", stars: 0, title: "The Cause falters", text: "The capital is gone, the army is broken, and the country has lost heart. Only news from the north can save the Revolution now.", score: scoreOf(state) };
}

function objectives(state) {
  const held = state.regions.philadelphia.owner === "P";
  const w = wash(state);
  const h = howe(state);
  const months = state.lastTurn - state.turn + 1;
  return {
    status: `${h ? `Howe: ${menWords(armyMen(h))} men at ${REGIONS[h.region].name}` : "Howe's fleet is at sea, destination unknown"} · Philadelphia ${held ? "held" : "lost"} · ${months} month${months === 1 ? "" : "s"} left`,
    goals: [
      { stars: 3, text: "Hold Philadelphia with the Cause at 50 or more", done: held && state.cause >= 50 },
      { stars: 2, text: "Hold Philadelphia, or keep Washington's army at 7,000+ men with the Cause at 40+ and at least one victory", done: held || (!!w && armyMen(w) >= 7000 && state.cause >= 40 && state.stats.won >= 1) },
      { stars: 1, text: "Keep Washington free and the Cause at 35 or more until December ends", done: !!w && state.cause >= 35, failed: state.generals.washington.status === "captured" },
    ],
  };
}

function advice(state) {
  const w = wash(state), h = howe(state);
  if (state.turn === 0) return "Howe could be going anywhere: up the Hudson, to Boston, or to Philadelphia. Most signs point to Philadelphia. Get Washington's army moving south toward Trenton and the Delaware, so you can reach the city in time.";
  if (!w) return "Washington's army is gone. Hold the forts on the Delaware and keep what's left together.";
  if (h && distance(h.region, w.region) <= 1) return "Howe is next to Washington. He beats armies that stand still in the open: dig in on good ground, or strike only when the odds shown are in your favor. Don't let the army be trapped against a river.";
  if (state.regions.philadelphia.owner === "B") return fortsHeld(state) ? "Howe holds Philadelphia, but the Delaware forts still block the river and his army is going hungry. Keep the forts (South Jersey) supplied and garrisoned, and look for a chance to strike his outposts." : "Howe holds Philadelphia and the river is open. Keep Washington's army close, in good ground, and strong enough to strike if he makes a mistake.";
  if (h) return `Howe is at ${REGIONS[h.region].name}. Put Washington's army between him and Philadelphia, ideally on the hills of Chester County, and hold the Delaware forts.`;
  return "Recruit while you can, and keep Philadelphia's defenders and the Delaware forts strong.";
}

// ---------- letters ----------
export const SCENARIO_EVENTS = [
  {
    id: "phl_welcome", scripted: true, turn: 0, from: "washington", place: "Morristown",
    title: ["Howe has sailed", "Where is Howe going?"],
    body: [
      () => `Gentlemen,

General Howe has embarked his army at New York, some fifteen thousand men, on more than two hundred ships, and they have put out to sea. Where they are bound, nobody can tell me. It may be the Hudson, to meet Burgoyne. It may be Boston, or Charleston. I think it most likely Philadelphia.

If I march south and Howe goes north, Burgoyne will have the Hudson. If I wait and he goes south, he will be in Philadelphia before me. I ask the Board's judgment.

G. Washington`,
      () => `Gentlemen,

The enemy's fleet sailed from Sandy Hook this week and is out of sight. I have riders watching the coast from Cape May to Cape Henlopen, and none of them has seen a sail.

This is the hardest kind of war, against an enemy who can go anywhere by sea while we must walk. I believe his object is Philadelphia, but I would not move this army on a guess without the Board's approval.

G. Washington`,
    ],
    choices: [
      {
        label: "March south to cover Philadelphia",
        hint: "Washington's army moves to Bucks County, close to the city. Cause +1.",
        apply(state) {
          const w = wash(state);
          if (w && state.regions.bucks.owner === "P" && !armyAt(state, "bucks", "B") && !armyAt(state, "bucks", "P")) { w.region = "bucks"; w.moved = true; }
          changeCause(state, 1, "Washington marched to cover Philadelphia.");
          return "The army marched through the summer heat, crossed the Delaware at Coryell's Ferry, and camped within reach of the city.";
        },
      },
      { label: "Wait in New Jersey until we know", hint: "Safe, but the army starts further away.", apply: () => "Washington kept the army at Morristown, watching both ways." },
    ],
  },
  {
    id: "phl_lafayette", scripted: true, turn: 1, from: "lafayette", place: "Philadelphia",
    title: "A volunteer from France",
    body: [
      () => `Messieurs,

I am arrived in Philadelphia at my own expense, in my own ship, to serve the cause of liberty. Congress has made me a major general, though I am nineteen years old and ask no pay.

General Washington received me with great kindness. I do not wish to be an ornament on his staff. I wish to fight.

Lafayette`,
      () => `Messieurs,

Forgive my English. I have come from France against the wishes of my king and my family, because I believe your cause is the cause of all mankind. I have been made a general, but I have no soldiers.

I will serve wherever the Board sends me. Only, I beg you, let it be where there is fighting.

Lafayette`,
    ],
    choices: [
      { label: "Give him a command", hint: "Lafayette joins as a general you can assign. His loyalty rises.", apply(state) { state.generals.lafayette.status = "reserve"; changeLoyalty(state, "lafayette", 5); return "Lafayette was promised a division. He wrote home that he had never been happier."; } },
      { label: "Keep him on Washington's staff for now", hint: "He joins anyway, a little hurt.", apply(state) { state.generals.lafayette.status = "reserve"; changeLoyalty(state, "lafayette", -5); return "Lafayette joined Washington's staff, and asked every day for a command."; } },
    ],
  },
  {
    id: "phl_pulaski", scripted: true, turn: 2, from: "franklin", place: "Paris",
    title: "A Polish cavalryman",
    body: () => `My dear friends,

This letter will be carried by Count Casimir Pulaski, of Poland, who fought for the liberty of his own country until it was lost. He is famous across Europe as a cavalry officer, and I think he may be of great use to you, for your army has hardly any horse.

B. Franklin`,
    choices: [
      { label: "Give him command of the cavalry", hint: "Pulaski joins as a general, and 200 dragoons join Washington's army.", apply(state) { state.generals.pulaski.status = "reserve"; const w = wash(state); if (w) w.regulars += 200; return "Pulaski took command of the dragoons, and rode them harder than they had ever been ridden."; } },
      { label: "There is no post for him", hint: "Nothing changes.", apply: () => "Pulaski stayed on as a volunteer, without a command." },
    ],
  },
  {
    id: "phl_congress", scripted: true, from: "congress",
    when: (state) => state.regions.philadelphia.owner === "P" && armyList(state, "B").some((a) => distance(a.region, "philadelphia") <= 1),
    title: "The enemy is near the capital",
    body: () => `Sir,

Howe's army is within two days' march of this city. Some members wish to remove Congress at once, first to Lancaster and then across the Susquehanna to York. Others say that if we flee, the country will believe the war is lost.

What does the Board advise?

John Hancock, President`,
    choices: [
      { label: "Move Congress to Lancaster and York", hint: "Cause -2 now, but losing the city costs less (-5 instead of -10).", apply(state) { changeCause(state, -2, "Congress fled Philadelphia."); state.philadelphiaLoss = 5; return "Congress packed its papers and rode west in the night."; } },
      { label: "Stay and defend the city", hint: "Cause +3 now, but losing the city would cost -15.", apply(state) { changeCause(state, 3, "Congress refused to flee."); state.philadelphiaLoss = 15; return "Congress stayed. The city began digging trenches."; } },
    ],
  },
  {
    id: "phl_brandywine", scripted: true, kind: "council", fromTurn: 1, untilTurn: 3, from: "washington", place: "Chadds Ford, on the Brandywine",
    when: (state) => { const w = wash(state), h = howe(state); return w && h && distance(w.region, h.region) <= 1 && armyMen(w) >= 4000; },
    title: "Council of war on the Brandywine",
    body: (state) => `Howe's army, about ${menWords(armyMen(howe(state)))} men, is within a day's march. The general officers met at headquarters to decide how to meet him. They did not agree.`,
    council: (state) => {
      const out = [{ from: "washington", choice: 0, says: "We hold the fords of the creek. Chadds Ford is the main crossing, and the ground behind it is good. Let him come at us there." }];
      out.push({ from: state.generals.sullivan.status === "away" ? "colonel" : "sullivan", choice: 1, says: "My scouts say there may be other fords upstream we don't know about. If Howe sends a column around our right, we'll be caught. Guard the upper fords, even if it spreads us thin." });
      out.push({ from: state.generals.wayne.status === "away" ? "greene" : "wayne", choice: 2, says: "Why wait for him? Cross the creek and hit Knyphausen's Hessians before Howe can bring up the rest. Attack is the best defense." });
      return out;
    },
    choices: [
      { label: "Hold the fords", hint: "The army digs in along the creek. If Howe has found a ford you aren't watching, his attack will be much stronger.", apply(state) { const w = wash(state); if (w && !w.moved) digIn(state, w.id); state.flags.flankBonus = { side: "B", turn: state.turn }; return "The army dug in along the Brandywine, facing Chadds Ford."; } },
      { label: "Guard the upper fords", hint: "No flank surprise, but the army is spread out and can't dig in.", apply(state) { const w = wash(state); if (w) w.moved = true; changeLoyalty(state, "sullivan", 5); return "Sullivan's men spread out along the creek to watch every crossing. It was the right call: a British column was already marching for the upper fords."; } },
      {
        label: "Attack across the creek",
        hint: "Washington's army attacks Howe now.",
        apply(state) {
          const w = wash(state), h = howe(state);
          if (!w || !h) return "By the time the orders came, the chance had passed.";
          w.moved = false;
          const r = moveArmy(state, w.id, h.region, {});
          if (typeof r === "string") return "The army could not reach him.";
          state.lastSurprise = r;
          return r.attackerWins ? "The army splashed across the Brandywine and broke Knyphausen's line before Howe could come up." : "The attack across the creek ran into the whole British army and was thrown back.";
        },
      },
    ],
  },
  {
    id: "phl_paoli", scripted: true, fromTurn: 2, untilTurn: 3, from: "wayne", place: "Near the Paoli Tavern",
    when: (state) => !!findGeneralArmy(state, "wayne") && !!howe(state) && distance(findGeneralArmy(state, "wayne").region, howe(state).region) <= 2,
    title: "Wayne behind the British lines",
    body: () => `Sir,

I am camped near the Paoli Tavern, close behind Howe's army. His baggage train is strung out on the roads, and I can fall on it any night I choose. I have scouts out and my men sleep with their muskets.

Give me leave to stay and I will make Howe sorry he ever came to Pennsylvania.

Anthony Wayne`,
    choices: [
      {
        label: "Stay and strike his baggage",
        hint: "A gamble: Wayne may hurt Howe, or be surprised himself.",
        apply(state) {
          const wy = findGeneralArmy(state, "wayne"), h = howe(state);
          if (makeRng(state)() < 0.55) {
            if (wy) { wy.regulars = Math.round(wy.regulars * 0.7); for (const m of wy.militia) m.men = Math.round(m.men * 0.6); }
            changeCause(state, -2, "Wayne was surprised at Paoli.");
            state.flags.paoli = true;
            return "A Loyalist guided General Grey's light infantry to Wayne's camp after midnight. Grey had his men take the flints out of their muskets so no shot would give them away, and they came in with the bayonet. Wayne lost hundreds of men. Americans called it the Paoli Massacre.";
          }
          if (h) h.regulars = Math.max(1000, h.regulars - 350);
          changeLoyalty(state, "wayne", 5);
          return "Wayne's men fell on the baggage at night, burned wagons and drove off horses, and were gone by dawn.";
        },
      },
      { label: "Rejoin the main army", hint: "Safe. Wayne is disappointed.", apply(state) { changeLoyalty(state, "wayne", -3); return "Wayne marched back to Washington's camp, grumbling all the way."; } },
    ],
  },
  {
    id: "phl_fall", scripted: true, from: "congress", fromName: "Henry Laurens, for the Congress at York",
    when: (state) => state.regions.philadelphia.owner === "B",
    title: "Philadelphia has fallen",
    body: [
      () => `Sir,

Lord Cornwallis has marched into Philadelphia with his grenadiers and a band playing. Many of the inhabitants cheered. Others watched from their windows and said nothing.

Congress is reassembling at York, beyond the Susquehanna. We have lost the capital, but not the war. The army is still in the field.`,
      () => `Sir,

The British are in Philadelphia. The State House where independence was declared is now in British hands. Congress meets at York, in the courthouse.

It is a heavy blow. But a capital is only a city, and the King's army must now feed itself there all winter.`,
    ],
    choices: [{ label: "The war goes on", hint: "", apply: () => "Congress settled into the courthouse at York." }],
  },
  {
    id: "phl_germantown", scripted: true, fromTurn: 2, untilTurn: 4, from: "washington", place: "Skippack Creek",
    when: (state) => { const w = wash(state); return w && state.regions.philadelphia.owner === "B" && !!armyAt(state, "philadelphia", "B") && distance(w.region, "philadelphia") === 1; },
    title: "A dawn attack on Germantown",
    body: [
      () => `Gentlemen,

Howe has split his army. Part of it is in the city, part is guarding the river, and the rest is camped at Germantown, just outside, with no works around it. My spies say his outposts are careless.

I propose to march all night in four columns and strike at dawn. It is a complicated plan, and much depends on the columns arriving together. If the fog lies thick in the morning, as it often does this time of year, it may hide us, or it may confuse us.

G. Washington`,
      () => `Gentlemen,

The enemy believes this army is beaten. I mean to show him otherwise. His camp at Germantown is open to attack, and I can have the army there by dawn.

It is a gamble. A night march in several columns is the hardest thing an army can do. But if it succeeds, Howe's victory will be worth nothing.

G. Washington`,
    ],
    choices: [
      {
        label: "Attack at dawn",
        hint: "Washington attacks the British at Philadelphia. The fog may help or hurt. You can lead the fight at the Chew house yourself.",
        minigame: "chew",
        apply(state, ctx) {
          const w = wash(state);
          if (!w || !armyAt(state, "philadelphia", "B")) return "By the time the orders came, the chance had passed.";
          // The fight at the Chew house decides whether the attack keeps its momentum (left to chance without the set piece).
          const fogHelps = ctx && ctx.minigame !== undefined && ctx.minigame !== null ? ctx.minigame >= 0.55 : makeRng(state)() < 0.45;
          w.moved = false;
          const r = moveArmy(state, w.id, "philadelphia", { surprise: fogHelps });
          if (typeof r === "string") return "The army could not reach Germantown.";
          state.lastSurprise = r;
          if (r.attackerWins) { changeCause(state, 6, "Washington won at Germantown."); return "The fog hid the columns until they were among the British tents. Howe's army broke and fell back through the city. Philadelphia is free again."; }
          changeCause(state, 2, "Washington nearly won at Germantown.");
          return fogHelps ? "The columns arrived together and nearly broke the British, but a stone house held by redcoats stopped the attack and the army fell back. Even so, the boldness of it impressed Europe." : "In the fog, two American columns fired into each other. A stone house, the Chew mansion, held up the advance for hours. The attack failed, but it was close enough that Europe took notice.";
        },
      },
      { label: "Too risky", hint: "Nothing ventured.", apply: () => "Washington kept the army in camp, watching the city." },
    ],
  },
  {
    id: "phl_forts", scripted: true, fromTurn: 2, untilTurn: 3, from: "colonel", fromName: "Colonel Christopher Greene, Fort Mercer",
    when: (state) => state.regions.southjersey.owner === "P",
    title: "The forts on the Delaware",
    body: () => `Sir,

Fort Mercer, here at Red Bank, and Fort Mifflin on Mud Island across the channel, guard the river below Philadelphia. Between them are sunken frames of timber, tipped with iron, that no ship can pass. While we hold, Howe's fleet cannot reach the city, and his army must be fed by wagon from Chester.

We have too few men and too little powder. With help we can hold until winter.

Christopher Greene, Colonel`,
    choices: [
      { label: `Reinforce the forts (${money(8)} and 800 men from Washington's army)`, hint: "The forts hold, and Howe's army in Philadelphia goes hungry while they do.", apply(state) { if (state.treasury >= 8) spend(state, 8, "fortifications"); const w = wash(state), f = armyAt(state, "southjersey", "P"); if (w && f) { const n = Math.min(800, Math.max(0, w.regulars - 3000)); w.regulars -= n; f.regulars += n; } state.flags.fortsReinforced = true; return "Rhode Island Continentals and powder went down the river to Red Bank."; } },
      { label: "They must hold with what they have", hint: "The forts may fall in November.", apply: () => "Greene's men strengthened the walls with their own hands." },
    ],
  },
  {
    id: "phl_redbank", scripted: true, fromTurn: 3, untilTurn: 4, from: "colonel", fromName: "Colonel Christopher Greene, Fort Mercer",
    when: (state) => fortsHeld(state) && !!armyAt(state, "philadelphia", "B"),
    title: "The Hessians attacked Red Bank",
    body: () => `Sir,

Colonel von Donop came at Fort Mercer with some two thousand Hessians. He sent a drummer to demand our surrender and said that if we fought, no quarter would be given. We fought.

They came at the walls in two columns and were cut down in the ditch. Donop himself was mortally wounded and is our prisoner. Our own losses were light.

Christopher Greene, Colonel`,
    choices: [{ label: "Honor the garrison", hint: "Cause +4. The British lose about 400 men.", apply(state) { const b = armyAt(state, "philadelphia", "B"); if (b) b.regulars = Math.max(1000, b.regulars - 400); changeCause(state, 4, "The Hessians were beaten at Red Bank."); state.stats.won++; return "Congress voted thanks to the garrison. Donop died of his wounds a few days later."; } }],
  },
  {
    id: "phl_mifflin", scripted: true, turn: 4, from: "colonel", fromName: "Major Simeon Thayer, Fort Mifflin",
    when: (state) => state.regions.southjersey.owner === "P" && !state.flags.fortsReinforced,
    title: "Fort Mifflin has fallen",
    body: () => `Sir,

For days the British pounded Fort Mifflin from batteries on shore and from ships in the river, the heaviest bombardment this war has seen. Our walls are gone and most of our guns dismounted. We brought off the survivors by night and set fire to what was left.

Without Mifflin, Fort Mercer cannot stand either. The river is open to the British fleet.`,
    choices: [{ label: "Abandon Fort Mercer", hint: "Cause -2. Howe's army in Philadelphia will be supplied by sea.", apply(state) { const f = armyAt(state, "southjersey", "P"); if (f) { if (state.regions.trenton.owner === "P" && !armyAt(state, "trenton", "P") && !armyAt(state, "trenton", "B")) f.region = "trenton"; else delete state.armies[f.id]; } state.regions.southjersey.owner = "B"; changeCause(state, -2, "The Delaware forts fell."); return "Fort Mercer was blown up and abandoned. British ships sailed up to Philadelphia within days."; } }],
  },
  {
    id: "phl_saratoga", scripted: true, turn: 3, from: "congress", fromName: "Henry Laurens, for the Congress at York",
    title: "News from the north",
    body: () => `Sir,

An express rider has come from General Gates. On the seventeenth of October, General Burgoyne surrendered his whole army at Saratoga: nearly six thousand men, with all their guns and colors.

It is the greatest victory of the war. Every bell in York is ringing.`,
    choices: [{ label: "Order a feu de joie", hint: "Cause +6.", apply(state) { changeCause(state, 6, "News of Saratoga reached the army."); return "Washington's army fired a feu de joie, a running fire of muskets down the whole line, and gave three cheers for the Northern army."; } }],
  },
  {
    id: "phl_cabal", scripted: true, fromTurn: 4, untilTurn: 5, from: "congress", fromName: "Henry Laurens, President of Congress",
    title: ["Whispers against the General", "A letter that should not have been written"],
    body: [
      () => `Sir,

A letter from General Conway to General Gates has come to light. In it Conway calls General Washington a weak general. Some members of Congress and some officers are saying the same thing quietly: that Gates, who won at Saratoga, should command in his place.

The Board's opinion will carry great weight.

Henry Laurens, President`,
      () => `Sir,

I must tell the Board in confidence that there is talk in Congress and in the army of replacing General Washington with General Gates. General Conway has written that Washington is a weak general, and others agree.

I do not share their view, but I cannot stop the talk alone. What will the Board say?

Henry Laurens`,
    ],
    choices: [
      { label: "Stand by Washington", hint: "Washington's loyalty rises; Gates is offended. Cause +1.", apply(state) { changeLoyalty(state, "washington", 10); changeLoyalty(state, "gates", -10); changeCause(state, 1, "The Board stood by Washington."); return "The Board wrote that the army had one commander, and would keep him. The plotting fell apart within weeks."; } },
      { label: "Let Congress debate it", hint: "Washington's loyalty falls. Cause -2.", apply(state) { changeLoyalty(state, "washington", -10); changeCause(state, -2, "Congress quarreled over the command."); return "Congress argued for weeks. In the end it changed nothing, but Washington knew who had not stood up for him."; } },
    ],
  },
  {
    id: "phl_winter", scripted: true, turn: 5, from: "washington",
    when: (state) => !!wash(state),
    title: ["Winter quarters", "Where the army will winter"],
    body: [
      () => `Gentlemen,

The army must go into winter quarters. The Pennsylvania Assembly begs me to stay close to Philadelphia, to protect the country from the enemy's foraging parties. My officers would rather go far inland, to Lancaster or Reading, where there are houses and supplies.

There is a place called Valley Forge, twenty miles from the city, on high ground by the Schuylkill. It is easy to defend and close enough to watch Howe. But there is nothing there: no houses, no stores, no shelter. We would have to build a city of huts in the snow.

G. Washington`,
      () => `Gentlemen,

Winter is upon us. I must choose between keeping the army close to the enemy, at Valley Forge, where we can watch him and protect the farms, or marching it inland to the towns, where it can be housed and fed.

The first is harder on the men. The second gives the country to Howe's foragers until spring.

G. Washington`,
    ],
    choices: [
      { label: "Valley Forge: stay close and watch Howe", hint: "Cause +2. A hard winter, but the country sees the army hold on.", apply(state) { const w = wash(state); if (w && w.region !== "philadelphia" && state.regions.chester.owner === "P" && !armyAt(state, "chester", "B") && (!armyAt(state, "chester", "P") || armyAt(state, "chester", "P") === w)) w.region = "chester"; state.flags.valleyForge = true; changeCause(state, 2, "The army wintered at Valley Forge."); return "On December 19 the army marched into Valley Forge. The men began building log huts, twelve men to a hut, in the snow."; } },
      { label: "March inland to Lancaster", hint: "Cause -3. Easier on the army, but Pennsylvania feels abandoned.", apply(state) { const w = wash(state); if (w && state.regions.lancaster.owner === "P" && !armyAt(state, "lancaster", "P")) w.region = "lancaster"; changeCause(state, -3, "The army withdrew inland for the winter."); return "The army marched west to the towns. The farmers around Philadelphia were left to Howe's foraging parties."; } },
    ],
  },

  // ---------- chance letters: a few turn up in each game ----------
  {
    id: "phl_bells", random: true, weight: 3, fromTurn: 1, untilTurn: 2, from: "congress",
    when: (state) => state.regions.philadelphia.owner === "P",
    title: "The bells of Philadelphia",
    body: () => `Sir,

If the British take the city, they may melt down its church bells for cannon, the State House bell among them. The Pennsylvania council proposes to take them down and hide them in the country before the enemy arrives.

It will take wagons and men we can barely spare.

John Hancock, President`,
    choices: [
      { label: `Hide the bells (${money(2)})`, hint: "Cause +1.", apply(state) { if (state.treasury >= 2) spend(state, 2, "letters"); changeCause(state, 1, "Philadelphia's bells were hidden from the British."); return "The bells were loaded into wagons and driven north to Northampton Town, where the State House bell was hidden under the floor of the Zion Reformed Church. Today it is called the Liberty Bell."; } },
      { label: "There is no time", hint: "Nothing changes.", apply: () => "The bells stayed in their steeples." },
    ],
  },
  {
    id: "phl_mills", random: true, weight: 2, fromTurn: 2, untilTurn: 2, from: "hamilton", place: "On the Schuylkill",
    title: "The mills along the Schuylkill",
    body: () => `Sir,

I am at the mills along the Schuylkill with a few dragoons, at His Excellency's order. There are great quantities of flour here that will feed Howe's army if he takes them. We can burn the mills and the flour, or try to carry off what we can.

The owners are begging us not to.

A. Hamilton`,
    choices: [
      { label: "Burn what we can't carry", hint: "Cause -1. If Howe takes Philadelphia, his army there goes hungrier.", apply(state) { state.flags.millsBurned = true; changeCause(state, -1, "Hamilton burned the Schuylkill mills."); return "Hamilton's men fired the mills and only just escaped British dragoons, crossing the river under fire."; } },
      { label: "Spare the mills", hint: "Nothing changes.", apply: () => "The mills were left standing. The millers were grateful; Howe, later, more so." },
    ],
  },
  {
    id: "phl_darragh", random: true, weight: 3, kind: "intel", fromTurn: 4, untilTurn: 5, from: "spy", fromName: "Word from inside Philadelphia",
    when: (state) => state.regions.philadelphia.owner === "B" && !!wash(state),
    ctx: () => ({ reliable: true, truth: true }),
    title: "A warning from a Quaker woman",
    body: () => `A woman came out of Philadelphia this morning, saying she needed flour from the mill at Frankford. On the road she found one of our officers and gave him a message.

She is Lydia Darragh, a Quaker. British officers had been meeting in her house, and she listened at the door. Howe means to march out and surprise our camp within days.`,
    choices: [
      { label: "Dig in and be ready", hint: "Washington's army fortifies its camp.", apply(state) { const w = wash(state); if (w) { state.regions[w.region].works = true; if (!w.moved) digIn(state, w.id); } return "The camp was ready when Howe came out. He looked at the earthworks for three days, then marched back to Philadelphia."; } },
      { label: "Thank her, but trust our scouts", hint: "Nothing changes.", apply: () => "The scouts were doubled. Lydia Darragh's name was kept secret." },
    ],
  },
  {
    id: "phl_loyalists", random: true, weight: 3, fromTurn: 2, untilTurn: 5, from: "spy", fromName: "A friend inside Philadelphia",
    when: (state) => state.regions.philadelphia.owner === "B" && !!armyAt(state, "philadelphia", "B"),
    title: "Philadelphia's Loyalists",
    body: () => `Many in the city have welcomed the British. Joseph Galloway, once a member of Congress himself, is now running the city's police for Howe and raising Loyalist companies. Balls and plays are held every week.

Outside the city, the farms of known Loyalists are full of grain and cattle.`,
    choices: [
      { label: "Seize Loyalist farms outside the city", hint: "+$15k, but Loyalists everywhere grow angrier.", apply(state) { earn(state, 15, "letters"); for (const r of Object.values(state.regions)) if (r.owner === "P") r.loyalist = Math.min(90, r.loyalist + 4); return "Commissaries went farm to farm with lists of names. The army ate; the Loyalists remembered."; } },
      { label: "Leave them be", hint: "Nothing changes.", apply: () => "The farms were left alone." },
    ],
  },
  {
    id: "phl_morris", random: true, weight: 2, fromTurn: 1, untilTurn: 4, from: "morris", place: "Lancaster",
    title: "Hard money",
    body: () => `Sir,

Continental paper is worth a fraction of what it was a year ago, and the farmers will not take it. I can raise $40k in coin from friends who still trust me, if Congress will promise $50k back by December.

Robert Morris`,
    choices: [
      { label: "Accept the loan", hint: "+$40k now, $50k due in December.", apply(state) { earn(state, 40, "loans"); state.loans.push({ lender: "Robert Morris's friends", due: 5, amount: 50 }); return "Morris delivered the money in kegs of Spanish dollars."; } },
      { label: "Decline", hint: "No debt.", apply: () => "Morris wrote that the offer stood if the Board changed its mind." },
    ],
  },
  {
    id: "phl_shoes", random: true, weight: 3, fromTurn: 4, untilTurn: 5, from: "greene",
    title: ["The men have no shoes", "Bloody footprints in the snow"],
    body: () => `Sir,

A great part of this army has no shoes. I have seen men's footprints in the snow marked with blood. The commissaries have no cloth, no leather, and no money to buy them, and the farmers sell their hides to the British in Philadelphia for silver.

N. Greene`,
    choices: [
      { label: "Buy shoes and blankets ($12k)", hint: "Far fewer men are lost to the cold this winter.", apply(state) { if (state.treasury < 12) return "There was no money for it."; spend(state, 12, "letters"); state.flags.hospitals = true; return "Wagons of shoes and blankets reached the camp before the worst of the cold."; } },
      { label: "There is no money", hint: "Nothing changes.", apply: () => "The men wrapped their feet in rags and waited for spring." },
    ],
  },
];
