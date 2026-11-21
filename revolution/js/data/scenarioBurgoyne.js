// What if: Burgoyne breaks through. October 1777 to March 1778.
// Unlocked when Saratoga ends without Burgoyne's surrender. In this history he won in the woods above Saratoga and
// marched into Albany, while Clinton took the forts in the Hudson Highlands below. If the two armies join hands,
// the Hudson is cut and New England is cut off from the other states. Everything here after mid-October 1777 is
// imagined; the people, places and armies are real.

import { REGIONS } from "./regions.js";
import { GENERALS } from "./generals.js";
import {
  newArmy, armyAt, armyList, armyMen, findGeneralArmy, changeCause, changeLoyalty, spend, earn, money, menWords, log,
  moveArmy, distance,
} from "../rules.js";
import { makeRng } from "../rng.js";

export const SCENARIO = {
  id: "burgoyne",
  title: "What If: Burgoyne Breaks Through",
  blurb: "Burgoyne has taken Albany, and Clinton holds the Hudson Highlands. If they join hands, New England is cut off. Rally the Northern army, cut the river, and starve Burgoyne out before spring.",
  startMonth: 9, // October
  startYear: 1777,
  turns: 6,
  treasury: 80,
  priceLevel: 1.8,
  cause: 42,
  aiGoal: "kingston",
  aiTargets: { kingston: 30, highlands: 15, albany: 25, bennington: 6, springfield: 8, saratoga: 4 },
  aiArea: ["stjohns", "ticonderoga", "saratoga", "bennington", "albany", "mohawk", "kingston", "highlands", "westchester", "manhattan", "longisland", "statenisland", "hackensack", "springfield", "connecticut"],
  closedPorts: ["philadelphia", "southjersey", "wilmington", "delmarva", "baltimore", "virginia", "boston", "newhampshire", "rhodeisland", "connecticut", "newark", "newbrunswick"],
  goals: ["Keep Burgoyne and Clinton from joining hands on the Hudson.", "Starve or beat Burgoyne out of Albany.", "Keep New England in the war."],
  mustSurvive: [],
  focus: ["albany", "kingston", "highlands", "bennington", "springfield", "saratoga", "westchester"],
  defend: "kingston",
  commander: "gates",
  openingScene: "breakthrough",
  victoryScene: "victory",
  newspaper: "The Massachusetts Spy",
  history: {
    summary: "This campaign never happened. In the real October of 1777, Burgoyne lost at Freeman's Farm and Bemis Heights, was surrounded at Saratoga, and surrendered about 5,900 men on October 17.",
    outcome: "In real history, Clinton did take Forts Montgomery and Clinton in the Highlands on October 6, and his raiders burned Kingston on October 16, but he turned back when he heard Burgoyne had surrendered. France signed an alliance with the United States in February 1778, largely because of Saratoga.",
    facts: ["This campaign: an alternate history", "Real Saratoga: Burgoyne surrendered October 17, 1777", "Real Highlands: Clinton took the forts, then withdrew", "Real Kingston: burned by British raiders, October 16, 1777"],
  },
  tutorial: false,
  finish,
  objectives,
  advice,
  onOpenMonth,
  onCloseMonth,
};

const LOYALIST = {
  stjohns: 70, ticonderoga: 30, saratoga: 35, bennington: 15, newhampshire: 15, mohawk: 55, albany: 45, springfield: 15, boston: 10,
  rhodeisland: 30, connecticut: 20, kingston: 35, highlands: 35, westchester: 50, manhattan: 60, longisland: 60,
  statenisland: 75, hackensack: 45, morristown: 25, newark: 40, newbrunswick: 45, princeton: 35, trenton: 35,
  southjersey: 40, easton: 30, wyoming: 25, bucks: 40, philadelphia: 45, chester: 40, lancaster: 25, wilmington: 40,
  frederick: 20, baltimore: 25, delmarva: 50, virginia: 20,
};

export function setupScenario(state) {
  const british = new Set(["stjohns", "ticonderoga", "saratoga", "albany", "highlands", "manhattan", "statenisland", "longisland", "rhodeisland"]);
  for (const id of Object.keys(REGIONS)) state.regions[id] = { owner: british.has(id) ? "B" : "P", loyalist: LOYALIST[id] ?? 30, works: false };
  const here = new Set(["gates", "arnold", "stark", "putnam", "morgan", "kosciuszko", "schuyler", "burgoyne", "fraser", "riedesel", "clinton"]);
  for (const [id, g] of Object.entries(GENERALS)) state.generals[id] = { ...g, status: here.has(id) ? "reserve" : "away" };
  state.generals.arnold.status = "away"; // wounded at Saratoga; he may come back
  const r = makeRng({ seed: ((state.gameSeed ?? 1) * 43 + 5) >>> 0 });
  const bMen = Math.round((6400 * (0.92 + r() * 0.16)) / 100) * 100;
  state.flags.history = { burgoyneMen: bMen, clintonBold: r() < 0.4 };

  const P = (region, regulars, militia, general, months = 3) => {
    const a = newArmy(state, { side: "P", region, regulars, general });
    if (militia) a.militia.push({ men: militia, left: months });
    return a;
  };
  P("bennington", 4500, 2500, "gates");
  P("kingston", 1200, 1500, "morgan");
  P("westchester", 2000, 800, "putnam");
  P("newhampshire", 0, 2000, "stark", 4);
  P("springfield", 800, 1200, "schuyler");

  newArmy(state, { side: "B", region: "albany", regulars: bMen, general: "burgoyne" });
  newArmy(state, { side: "B", region: "highlands", regulars: state.flags.history.clintonBold ? 5000 : 3800, general: "clinton" });
  newArmy(state, { side: "B", region: "saratoga", regulars: 900, general: "riedesel", hessian: true });
  state.philadelphiaLoss = 10;
}

export const REINFORCEMENTS = [
  { turn: 2, side: "B", region: "manhattan", regulars: 2500, text: "Transports from Philadelphia brought Howe's spare regiments to New York." },
];

// ---------- helpers ----------
const gates = (state) => findGeneralArmy(state, "gates") || armyList(state, "P").sort((x, y) => armyMen(y) - armyMen(x))[0];
const burg = (state) => findGeneralArmy(state, "burgoyne");
// The British hold the whole river from Albany to the Highlands: the Hudson is cut.
const riverCut = (state) => ["albany", "kingston", "highlands"].every((id) => state.regions[id].owner === "B");
// Burgoyne is fed by boat from New York only while the river below Albany is in British hands.
const burgoyneFed = (state) => state.regions.kingston.owner === "B" && state.regions.highlands.owner === "B";

function onOpenMonth(state) {
  if (state.turn === 3 && !riverCut(state)) {
    log(state, "The Hudson has frozen above the Highlands. No more boats will reach Albany until the spring thaw.", "good");
  }
}

function onCloseMonth(state) {
  const b = burg(state);
  if (b && !burgoyneFed(state)) {
    const lost = Math.round(b.regulars * (state.turn >= 2 ? 0.12 : 0.07)); // worse once winter sets in
    b.regulars -= lost;
    if (lost > 50) log(state, `With the river closed below Albany, Burgoyne's army goes hungry. ${menWords(lost)} men were lost to sickness and desertion.`, "good");
  }
  if (riverCut(state)) changeCause(state, -2, "The Hudson is in British hands, and New England is cut off.");
}

// ---------- endings ----------
function scoreOf(state) {
  const b = burg(state);
  return Math.round(state.cause + state.stats.won * 5 - state.stats.lost * 2 + (state.regions.albany.owner === "P" ? 25 : 0) + (b ? 0 : 20) + (riverCut(state) ? -15 : 10));
}
function finish(state) {
  const albany = state.regions.albany.owner === "P";
  const b = burg(state);
  const end = " This campaign is an alternate history; see the History Book for what really happened.";
  if (albany && (!b || armyMen(b) < 2500) && state.cause >= 45) return { result: "victory", stars: 3, title: "The North redeemed", text: "Albany is free, and Burgoyne's army has been starved and beaten into nothing. The Northern army has won back everything that was lost." + end, score: scoreOf(state) + 20 };
  if (!riverCut(state) && state.cause >= 35) return { result: "victory", stars: 2, title: "The river stays open", text: "Burgoyne and Clinton never joined hands. New England is still in the war, and the spring will bring another chance." + end, score: scoreOf(state) };
  if (state.cause >= 25) return { result: "survived", stars: 1, title: "A hard winter", text: "The British hold much of the Hudson, but the Northern army is still in the field and New England still fights." + end, score: scoreOf(state) };
  return { result: "defeat", stars: 0, title: "New England cut off", text: "The Hudson is a British river, and New England, cut off and exhausted, talks of making its own peace." + end, score: scoreOf(state) };
}

function objectives(state) {
  const b = burg(state);
  const months = state.lastTurn - state.turn + 1;
  return {
    status: `${b ? `Burgoyne: ${menWords(armyMen(b))} men at ${REGIONS[b.region].name}${burgoyneFed(state) ? ", supplied by river" : ", going hungry"}` : "Burgoyne's army is gone"} · ${months} month${months === 1 ? "" : "s"} left`,
    goals: [
      { stars: 3, text: "Retake Albany, break Burgoyne (under 2,500 men), Cause 45 or more", done: state.regions.albany.owner === "P" && (!b || armyMen(b) < 2500) && state.cause >= 45 },
      { stars: 2, text: "Don't let the British hold the whole Hudson from Albany to the Highlands; Cause 35 or more", done: !riverCut(state) && state.cause >= 35 },
      { stars: 1, text: "Keep the Cause at 25 or more until March ends", done: state.cause >= 25 },
    ],
  };
}

function advice(state) {
  if (state.regions.kingston.owner === "B" && state.regions.highlands.owner === "B") return "Burgoyne is fed by boats from New York while the British hold Kingston and the Highlands. Take either one back and his army starts to starve.";
  if (state.regions.kingston.owner === "P") return "Kingston is the key: while you hold it, no boats reach Albany. Keep it, and let hunger work on Burgoyne before you attack him.";
  return "Gather Gates's army and the New England militia. Burgoyne grows weaker each month the river stays closed.";
}

// ---------- letters ----------
export const SCENARIO_EVENTS = [
  {
    id: "bt_welcome", scripted: true, turn: 0, from: "gates", place: "Bennington",
    title: ["Burgoyne is in Albany", "The Northern army regroups"],
    body: [
      () => `Gentlemen,

I must report the worst. Burgoyne broke through our lines above Saratoga and entered Albany three days ago. The army fell back to Bennington in good order, but we have lost the Hudson above the Highlands, and General Clinton has taken the forts below.

If the two of them join hands at Kingston, New England is cut off. I have five thousand men and more militia coming in every day. I await the Board's orders.

H. Gates`,
      () => `Gentlemen,

Albany is lost. Burgoyne's army marched in with its bands playing, and the Loyalists of the town turned out to cheer. Our army is at Bennington, battered but whole.

Between Burgoyne at Albany and Clinton in the Highlands lies Kingston, held by Colonel Morgan's riflemen and the Ulster County militia. While Kingston stands, they cannot meet.

H. Gates`,
    ],
    choices: [
      { label: "Call out every militiaman in New England", hint: "+2,500 militia join Gates's army. Costs $10k.", apply(state) { const g = gates(state); if (state.treasury >= 10) spend(state, 10, "letters"); if (g) g.militia.push({ men: 2500, left: 3 }); changeCause(state, 2, "New England turned out for the Northern army."); return "Alarm guns fired from the Berkshires to the coast of Maine, and the militia came in by the thousand."; } },
      { label: "Fortify Kingston and wait", hint: "Kingston is dug in; the army rests.", apply(state) { state.regions.kingston.works = true; const k = armyAt(state, "kingston", "P"); if (k) k.dugIn = true; return "Morgan's men threw up earthworks along the river at Kingston."; } },
    ],
  },
  {
    id: "bt_adams", scripted: true, turn: 1, from: "jadams", place: "York, Pennsylvania",
    title: "New England wavers",
    body: () => `My dear sirs,

The news from Albany has struck New England like a thunderbolt. Some in Boston are saying that if Congress cannot protect them, they must look to themselves. I have written every friend I have in Massachusetts to stand firm.

What they need is a sign that the war in the north is not lost. A blow struck, anywhere, would do more than any letter of mine.

John Adams`,
    choices: [
      { label: "Promise New England a victory before the snow", hint: "Cause +2 now. If Burgoyne still holds Albany in December, Cause -5.", apply(state) { changeCause(state, 2, "Congress promised New England a victory."); state.flags.promised = true; return "Adams carried the Board's promise to Boston himself."; } },
      { label: "Ask New England only for patience", hint: "Cause -1.", apply(state) { changeCause(state, -1, "Congress asked New England for patience."); return "The Board's letter was read in Faneuil Hall to a silent crowd."; } },
    ],
  },
  {
    id: "bt_promise", scripted: true, turn: 2, from: "jadams", fromName: "John Adams",
    when: (state) => state.flags.promised && state.regions.albany.owner === "B",
    title: "A promise broken",
    body: () => `Sirs,

December has come, and Burgoyne is still in Albany. The Board's promise to New England has not been kept, and men who believed it are asking why they should believe the next one.`,
    choices: [{ label: "The war goes on", hint: "Cause -5.", apply(state) { changeCause(state, -5, "The promise to New England was broken."); return ""; } }],
  },
  {
    id: "bt_arnold", scripted: true, fromTurn: 1, untilTurn: 3, from: "arnold", place: "Springfield",
    when: (state) => state.generals.arnold.status === "away",
    title: "Arnold asks for a command",
    body: () => `Sirs,

My leg is not healed and the surgeons say it may never be, but I can sit a horse. I will not lie in bed while Burgoyne sits in Albany. Give me command of anything, a brigade, a regiment, a company, and I will show the Board what can be done.

B. Arnold`,
    choices: [
      { label: "Give Arnold a command", hint: "Arnold joins as a general you can assign; his loyalty rises.", apply(state) { state.generals.arnold.status = "reserve"; changeLoyalty(state, "arnold", 10); return "Arnold rode to the army with his leg in a box splint, cursing every step of the road."; } },
      { label: "Order him to rest", hint: "His loyalty falls.", apply(state) { changeLoyalty(state, "arnold", -12); return "Arnold stayed in his bed, and wrote bitter letters to anyone who would read them."; } },
    ],
  },
  {
    id: "bt_franklin", scripted: true, turn: 3, from: "franklin", place: "Passy, near Paris",
    title: "France hesitates",
    body: () => `Gentlemen,

The French ministers were ready to treat with us, until the news came that Burgoyne had taken Albany. Now the Comte de Vergennes says, very politely, that France will wait to see whether the Americans can win a battle.

I can still raise money here. But an alliance will need a victory.

B. Franklin`,
    choices: [
      { label: "Ask Franklin for a loan", hint: "+$30k.", apply(state) { earn(state, 30, "foreign aid"); return "French bankers lent quietly, as friends who do not wish to be seen."; } },
      { label: "Tell him the victory is coming", hint: "If Albany is retaken by March: Cause +8.", apply(state) { state.flags.toldFrance = true; return "Franklin told Vergennes, with perfect confidence, that the news would come by spring."; } },
    ],
  },
  {
    id: "bt_frozen", scripted: true, turn: 4, from: "colonel", fromName: "Colonel Kosciuszko, engineer",
    when: (state) => state.regions.albany.owner === "B" && !!burg(state),
    title: "The Hudson is frozen",
    body: () => `Sir,

The river is frozen hard from Albany to Kingston, thick enough for men and guns. Burgoyne's outposts along it are thin, and his men are hungry.

An army that marched up the ice could be at the gates of Albany before he knew it.`,
    choices: [
      {
        label: "March up the frozen river and storm Albany",
        hint: "Your biggest army next to Albany attacks it by surprise.",
        apply(state) {
          const a = armyList(state, "P").filter((x) => distance(x.region, "albany") === 1).sort((x, y) => armyMen(y) - armyMen(x))[0];
          if (!a || !armyAt(state, "albany", "B")) return "No army was close enough to make the march.";
          a.moved = false;
          const r = moveArmy(state, a.id, "albany", { surprise: true });
          if (typeof r === "string") return "The march could not be made.";
          state.lastSurprise = r;
          return r.attackerWins ? "The army marched up the ice by night and burst into Albany at dawn. Burgoyne's hungry regiments broke and fled north." : "The army came up the ice by night, but Burgoyne's sentries were awake. The attack was beaten back in the snow.";
        },
      },
      { label: "Too dangerous", hint: "Nothing changes.", apply: () => "The army stayed in its winter quarters." },
    ],
  },
  {
    id: "bt_france_news", scripted: true, turn: 5, from: "franklin",
    when: (state) => state.flags.toldFrance && state.regions.albany.owner === "P",
    title: "The alliance",
    body: () => `Gentlemen,

The news from Albany reached Paris last week. This morning I signed a treaty of alliance with France. The King's ministers say they never doubted us.`,
    choices: [{ label: "Fire a salute", hint: "Cause +8.", apply(state) { changeCause(state, 8, "France joined the war."); return "Thirteen guns were fired at every post in the north."; } }],
  },
  // Chance letters
  {
    id: "bt_mohawk", random: true, weight: 3, fromTurn: 1, untilTurn: 5, from: "schuyler",
    title: "Raids in the Mohawk Valley",
    body: () => `Sir,

With Burgoyne in Albany, Loyalist rangers and their Iroquois allies are raiding the farms of the Mohawk Valley. Families are fleeing east with whatever they can carry.`,
    choices: [
      { label: "Send money for the refugees ($8k)", hint: "Cause +2.", apply(state) { if (state.treasury >= 8) spend(state, 8, "letters"); changeCause(state, 2, "Congress helped the Mohawk Valley refugees."); return "Wagons of flour and blankets went west from Springfield."; } },
      { label: "We cannot spare it", hint: "Cause -1.", apply(state) { changeCause(state, -1, "The Mohawk Valley was left to itself."); return "The valley burned, and remembered who had not come."; } },
    ],
  },
  {
    id: "bt_baroness", random: true, weight: 2, fromTurn: 2, untilTurn: 5, from: "spy", fromName: "A friend in Albany",
    title: "Hunger in Albany",
    body: () => `Burgoyne's officers are dining well in the Schuyler mansion, but the soldiers in the barracks are on half rations. Some of the Germans are slipping away across the river at night to give themselves up.

If we offered them land and a welcome, more would come.`,
    choices: [
      { label: "Offer land to any German who comes over ($5k)", hint: "Burgoyne's army loses about 400 men.", apply(state) { if (state.treasury >= 5) spend(state, 5, "letters"); const b = burg(state); if (b) b.regulars = Math.max(500, b.regulars - 400); return "Handbills in German were smuggled into Albany. That week, four hundred men walked across the ice."; } },
      { label: "Leave it", hint: "Nothing changes.", apply: () => "The deserters kept coming in ones and twos." },
    ],
  },
];
