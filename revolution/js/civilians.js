// The civilians' war: every couple of months, a short scene of ordinary people caught up in the war, drawn in pixel
// art. The choice changes how a region feels about the Cause, and sometimes the army itself. People in these scenes
// are not named historical figures; the history notes beside them are true.

import { REGIONS, ADJ } from "./data/regions.js";
import { armyAt, armyList, armyMen, changeCause, spend, earn } from "./rules.js";
import { pixelSoldier } from "./pixel.js";
import { UNIFORMS } from "./soldiers.js";

// Clothes for civilians.
const DRESS = {
  farmer: { coat: "#6b4a2e", facing: "#6b4a2e", vest: "#c9b48a", legs: "#4a3a2a", gaiters: "#3a2a1c", hat: "slouch", hair: "#4a2e1a", unarmed: true },
  wife: { coat: "#7a2e2e", facing: "#7a2e2e", vest: "#efe6cc", legs: "#000", gaiters: "#000", hat: "cap", hair: "#6b4220", unarmed: true, skirt: "#5a4a6a" },
  girl: { coat: "#3e5a7a", facing: "#3e5a7a", vest: "#efe6cc", legs: "#000", gaiters: "#000", hat: "cap", hair: "#c9a04a", unarmed: true, skirt: "#8a6a4a" },
  printer: { coat: "#2a2a30", facing: "#2a2a30", vest: "#efe6cc", legs: "#2a2a30", gaiters: "#1b1a1f", hat: "none", hair: "#8a8a8a", unarmed: true, holds: "#f4efe2" },
  gent: { coat: "#3a4a2a", facing: "#3a4a2a", vest: "#c9a04a", legs: "#efe6cc", gaiters: "#1b1a1f", hat: "tricorne", hair: "#ece6d6", unarmed: true },
  quaker: { coat: "#5a5650", facing: "#5a5650", vest: "#8a857a", legs: "#5a5650", gaiters: "#3a3630", hat: "round", hair: "#d8d0c0", unarmed: true },
  freeman: { coat: "#5a4632", facing: "#5a4632", vest: "#c9b48a", legs: "#4a3a2a", gaiters: "#3a2a1c", hat: "slouch", hair: "#1a120c", unarmed: true, skin: "dark" },
  crowd: { coat: "#4a3a5a", facing: "#4a3a5a", vest: "#c9b48a", legs: "#3a2a1c", gaiters: "#3a2a1c", hat: "slouch", hair: "#3a2414", unarmed: true, holds: "#8a6a45" },
};

// ---------- pixel backdrops (160 by 80) ----------
const r = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const SKY = (top, bot) => r(0, 0, 160, 30, top) + r(0, 30, 160, 20, bot);
const BACK = {
  farm: () => SKY("#7d9bbd", "#c9cfb8") + r(0, 50, 160, 30, "#6b7a3a") + [0, 1, 2, 3, 4, 5].map((i) => r(0, 54 + i * 4, 160, 1, "#5d6a32")).join("")
    + r(98, 26, 40, 26, "#8a3a2a") + `<path d="M94,26 L118,12 L142,26 Z" fill="#4a2a1e"/>` + r(112, 38, 10, 14, "#3a2218") + r(10, 46, 70, 1, "#6b5230") + [10, 30, 50, 70].map((x) => r(x, 42, 2, 8, "#6b5230")).join(""),
  town: () => SKY("#8aa2bd", "#d8d0bc") + r(0, 52, 160, 28, "#8a7a5a") + [0, 34, 68, 102, 136].map((x, i) => r(x, 20 + (i % 2) * 6, 30, 34 - (i % 2) * 6, i % 2 ? "#9a5a3a" : "#7a6a5a") + r(x + 6, 30 + (i % 2) * 6, 6, 6, "#e8c86a") + r(x + 18, 30 + (i % 2) * 6, 6, 6, "#e8c86a")).join(""),
  camp: () => SKY("#2a2a44", "#4a3a44") + r(0, 50, 160, 30, "#3d4a2c") + [12, 52, 112].map((x) => `<path d="M${x},50 L${x + 14},32 L${x + 28},50 Z" fill="#d8d0bc"/>` + r(x + 13, 40, 2, 10, "#3a2a1c")).join("")
    + r(76, 58, 10, 3, "#3b2614") + r(78, 52, 6, 6, "#ffb02e") + r(80, 49, 2, 4, "#fff2a8"),
  press: () => r(0, 0, 160, 80, "#4a3a2a") + r(0, 60, 160, 20, "#3a2a1c") + r(60, 14, 44, 46, "#2a1d12") + r(64, 18, 36, 6, "#5a4630") + r(76, 24, 4, 20, "#7a6a5a") + r(66, 44, 32, 6, "#5a4630")
    + r(8, 10, 40, 30, "#d8d0bc") + [14, 20, 26, 32].map((y) => r(12, y, 32, 1, "#3a2a1c")).join("") + r(120, 12, 30, 40, "#2a1d12") + r(124, 16, 22, 32, "#8aa2bd"),
  meeting: () => SKY("#8aa2bd", "#d8dcc8") + r(0, 52, 160, 28, "#6b7a3a") + r(50, 22, 60, 32, "#e9e4d8") + `<path d="M46,22 L80,6 L114,22 Z" fill="#5a5650"/>` + r(74, 36, 12, 18, "#5a4630") + r(58, 30, 8, 10, "#3a4a5a") + r(94, 30, 8, 10, "#3a4a5a"),
};

function figure(dress, x, y, flip = false, scale = 0.9) {
  const u = { ...DRESS[dress] || UNIFORMS[dress] };
  if (u.skin === "dark") u.dark = true;
  let svg = pixelSoldier(u, "stand", 26 * scale);
  if (u.dark) svg = svg.replaceAll("#d9a37c", "#6b4630").replaceAll("#a8714f", "#4a2e1e");
  return `<g transform="translate(${x},${y}) scale(${flip ? -1 : 1},1)">${svg}</g>`;
}

const PICS = {
  "grain": [
    "grain",
    "Edward Hicks, The Cornell Farm, 1848: a Bucks County farm"
  ],
  "printer": [
    "printer",
    "Charles E. Mills, Franklin the Printer, about 1914"
  ],
  "loyalist": [
    "loyalist",
    "Philip Dawe (attributed), The Bostonians Paying the Excise-Man, or Tarring and Feathering, 1774"
  ],
  "women": [
    "women",
    "Currier & Ives, Molly Pitcher at the Battle of Monmouth, nineteenth century"
  ],
  "enlist": [
    "enlist",
    "Jean-Baptiste de Verger, a soldier of the 1st Rhode Island Regiment, 1781"
  ],
  "quaker": [
    "quaker",
    "Egbert van Heemskerck, A Quaker Meeting (in England), about 1685"
  ],
  "smallpox": [
    "smallpox",
    "Edward Hicks, The Residence of David Twining in 1787, painted about 1846"
  ],
  "deserter": [
    "deserter",
    "Daniel Chodowiecki, Hessians Taken at Trenton Brought into Philadelphia, 1784"
  ]
};
export function sceneArt(c) {
  const [file, caption] = PICS[c.id] || [];
  if (!file) return "";
  return `<figure class="civ-print"><img src="img/scenes/people/${file}.jpg" alt=""><figcaption>${caption.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</figcaption></figure>`;
}

// ---------- the scenes ----------
const near = (state, side, region) => armyAt(state, region, side) || ADJ[region].map((n) => armyAt(state, n, side)).find(Boolean);
const pArmyIn = (state, region) => armyAt(state, region, "P") || near(state, "P", region);
const loy = (state, region, d) => { const rs = state.regions[region]; rs.loyalist = Math.max(5, Math.min(90, rs.loyalist + d)); };
const cond = (a, d) => { if (a) a.cond = Math.max(0, Math.min(100, (a.cond ?? 100) + d)); };

export const SCENES = {
  grain: {
    title: "The grain in the cellar", back: "farm", figures: [["farmer", 54, 72], ["wife", 70, 72], ["girl", 84, 74], ["continental", 128, 72, true]],
    where: (state) => armyList(state, "P").map((a) => a.region).find((id) => ADJ[id].some((n) => armyAt(state, n, "B"))) || armyList(state, "P")[0]?.region,
    text: (n) => `A farm near ${n}. Foraging parties from both armies have been through twice this month. The family has hidden the last of their wheat under the cellar floor, and a Continental sergeant has just found it. The farmer says that if the army takes it, his children will go hungry by February.`,
    note: "Both armies lived off the country. Washington ordered his foragers to give receipts for what they took, but Continental receipts were often worth little, and farmers learned to hide their grain from everyone.",
    choices: [
      { label: "Buy the grain at a fair price ($6k)", hint: "The region warms to the Cause; the army eats better.", apply(state, reg) { if (state.treasury >= 6) spend(state, 6, "letters"); loy(state, reg, -5); cond(pArmyIn(state, reg), 8); return "The farmer counted the coins twice, then shook the sergeant's hand."; } },
      { label: "Take it, and leave a receipt", hint: "The army eats; the neighbors remember.", apply(state, reg) { loy(state, reg, 7); cond(pArmyIn(state, reg), 8); return "The sergeant left a receipt on the kitchen table. The farmer used it to light the fire."; } },
      { label: "Leave it to them", hint: "Nothing changes.", apply: () => "The sergeant put the boards back, and the family kept their wheat." },
    ],
  },
  printer: {
    title: "The printer's choice", back: "press", figures: [["printer", 52, 76], ["gent", 132, 76, true]],
    where: (state) => ["philadelphia", "boston", "albany", "baltimore", "connecticut"].find((id) => state.regions[id].owner === "P"),
    text: (n) => `A print shop in ${n}. The printer has two accounts of last month's fighting on his desk: one from an officer who was there, plain and grim, and one sent by a committee of Congress, a good deal more cheerful. The paper goes to press tonight. He asks the Board which to print.`,
    note: "Newspapers were the war's lifeline: Paine's The American Crisis was read aloud to the troops, and both sides printed victories that never happened. Printers who backed the wrong side were sometimes run out of town.",
    choices: [
      { label: "Print the plain truth", hint: "Cause -1 now, but people trust the Patriot press: Loyalist feeling falls across the states.", apply(state) { changeCause(state, -1, "The papers printed the hard truth."); for (const rs of Object.values(state.regions)) if (rs.owner === "P") rs.loyalist = Math.max(5, rs.loyalist - 1); return "The paper sold out by noon. People said it was the first honest one in months."; } },
      { label: "Print the cheerful version", hint: "Cause +2, but where people know better, Loyalists gain.", apply(state, reg) { changeCause(state, 2, "The papers reported good news."); loy(state, reg, 5); return "The cheerful account went out to every tavern in the state. In the town itself, people who had seen the wagons of wounded only laughed."; } },
    ],
  },
  loyalist: {
    title: "The Loyalist next door", back: "town", figures: [["gent", 60, 74], ["crowd", 96, 74, true], ["crowd", 110, 76, true], ["crowd", 124, 74, true], ["wife", 40, 74]],
    where: (state) => Object.keys(state.regions).filter((id) => state.regions[id].owner === "P" && state.regions[id].loyalist >= 35).sort((a, b) => state.regions[b].loyalist - state.regions[a].loyalist)[0],
    text: (n) => `A street in ${n}. A crowd has gathered outside the house of a shopkeeper who would not sign the Association and still drinks the King's health. Someone has brought a bucket of tar. His wife stands in the doorway. The local committee looks to the Board.`,
    note: "Perhaps a fifth of white colonists were Loyalists. Many were fined, jailed, or tarred and feathered by Patriot crowds, and some sixty thousand left America during and after the war.",
    choices: [
      { label: "Protect him: the law, not the mob", hint: "Moderates are won over (Loyalists -5 here), but radicals grumble (Cause -1).", apply(state, reg) { loy(state, reg, -5); changeCause(state, -1, "The Board protected a Loyalist from a mob."); return "The committee sent the crowd home. The shopkeeper kept his opinions, and his neighbors, quietly, kept buying from him."; } },
      { label: "Let the crowd have its way", hint: "Patriots cheer (Cause +1), but fear makes more Loyalists here (+7).", apply(state, reg) { loy(state, reg, 7); changeCause(state, 1, "A Loyalist was driven out."); return "The shopkeeper left town that night with his family and what they could carry. Others who thought as he did said nothing, and waited for the British."; } },
    ],
  },
  women: {
    title: "The women of the camp", back: "camp", figures: [["wife", 50, 74], ["girl", 64, 76], ["continental", 104, 74, true], ["militia", 118, 76, true]],
    where: (state) => armyList(state, "P").sort((a, b) => armyMen(b) - armyMen(a))[0]?.region,
    text: (n) => `The army's camp at ${n}. A delegation of soldiers' wives has come to headquarters. They wash, mend, cook and nurse for the regiments, and they ask for half rations in return, as the British army gives its women.`,
    note: "Thousands of women followed the Continental Army, often wives and children of soldiers with nowhere else to go. Washington complained about their numbers but admitted the army could not do without their work, and they drew rations for it.",
    choices: [
      { label: "Grant half rations ($3k)", hint: "Washing, mending and nursing: the army's condition improves.", apply(state, reg) { if (state.treasury >= 3) spend(state, 3, "letters"); cond(pArmyIn(state, reg), 10); return "The rations were granted. By the end of the week the hospital tents were cleaner than they had been all year."; } },
      { label: "The army cannot feed them", hint: "Condition falls a little.", apply(state, reg) { cond(pArmyIn(state, reg), -3); return "Some of the women left. The ones who stayed did the work anyway, on what their husbands could share."; } },
    ],
  },
  enlist: {
    title: "Men who want to fight", back: "town", figures: [["freeman", 60, 74], ["freeman", 74, 76], ["freeman", 88, 74], ["continental", 128, 74, true]],
    where: (state) => ["rhodeisland", "connecticut", "boston", "philadelphia", "newhampshire"].find((id) => state.regions[id].owner === "P"),
    text: (n) => `A recruiting post in ${n}. A group of free Black men, some of them veterans of the fighting around Boston, have come to enlist. The recruiting officer has orders that are unclear, and asks the Board what to do.`,
    note: "In late 1775 Congress barred new Black recruits, but Washington soon allowed free Black veterans to reenlist, and the ban faded as men grew scarce. Perhaps five thousand Black soldiers served in the Continental Army, and in 1778 Rhode Island raised a regiment that included formerly enslaved men promised their freedom.",
    choices: [
      { label: "Enlist them", hint: "+300 regulars join the nearest army.", apply(state, reg) { const a = armyAt(state, reg, "P") || armyList(state, "P").sort((x, y) => armyMen(y) - armyMen(x))[0]; if (a) a.regulars += 300; return "They signed the rolls that afternoon. Within a month their company was among the steadiest in the regiment."; } },
      { label: "Turn them away", hint: "Nothing changes.", apply: () => "The men went home. Some of them, it was said, went to the British, who were promising freedom to the enslaved men of rebel masters." },
    ],
  },
  quaker: {
    title: "The Friends' meeting", back: "meeting", figures: [["quaker", 56, 74], ["quaker", 70, 76], ["wife", 84, 74], ["continental", 128, 74, true]],
    where: (state) => ["philadelphia", "bucks", "chester", "lancaster"].find((id) => state.regions[id].owner === "P"),
    text: (n) => `A Quaker meetinghouse in ${n}. The Friends will not bear arms, pay the war tax, or take the oath to the new government; it is against their faith. The county committee wants to fine them and seize their goods.`,
    note: "Pennsylvania's Quakers were pacifists, and many were suspected of Loyalism. In 1777 Congress had several leading Philadelphia Quakers arrested and exiled to Virginia. Some Quakers, the Free Quakers, broke away and fought for independence.",
    choices: [
      { label: "Fine them and seize goods", hint: "+$6k, but Loyalist feeling here rises (+6).", apply(state, reg) { earn(state, 6, "letters"); loy(state, reg, 6); return "The committee's men carried off pewter, horses and a clock. The Friends watched in silence."; } },
      { label: "Respect their conscience", hint: "Loyalist feeling here eases a little (-2).", apply(state, reg) { loy(state, reg, -2); return "The committee let them be. A few of the younger Friends, it was noticed, began bringing grain to the army's commissaries."; } },
    ],
  },
  smallpox: {
    title: "Smallpox in the village", back: "farm", figures: [["wife", 50, 74], ["farmer", 66, 74], ["girl", 80, 76]],
    where: (state) => armyList(state, "P").map((a) => a.region).find((id) => !REGIONS[id].city) || armyList(state, "P")[0]?.region,
    text: (n) => `A village near the army at ${n}. Smallpox has broken out. A doctor offers to inoculate the whole village, deliberately giving everyone a mild case, which usually protects them for life but sometimes kills. The villagers are frightened of it.`,
    note: "Smallpox killed more soldiers than the British did. In early 1777 Washington ordered the whole army inoculated, a risky and secret decision that may have saved the Revolution.",
    choices: [
      { label: "Pay for the inoculation ($5k)", hint: "Cause +1, and grateful neighbors (Loyalists -4 here).", apply(state, reg) { if (state.treasury >= 5) spend(state, 5, "letters"); changeCause(state, 1, "The Board paid to inoculate a village."); loy(state, reg, -4); return "The doctor went house to house with his lancet. Two weeks later the village was sore, feverish and safe."; } },
      { label: "Keep the army away from it", hint: "The army stays healthy, but the village suffers alone (Loyalists +3).", apply(state, reg) { loy(state, reg, 3); return "Sentries turned travelers away from the village road. The sickness ran its course inside."; } },
    ],
  },
  deserter: {
    title: "A Hessian at the door", back: "farm", figures: [["hessian", 64, 74], ["farmer", 96, 74, true], ["wife", 110, 74, true]],
    where: (state) => Object.keys(state.regions).find((id) => state.regions[id].owner === "P" && ADJ[id].some((n) => { const b = armyAt(state, n, "B"); return b && b.hessian; })),
    text: (n) => `A farm near ${n}. A young Hessian soldier has walked out of the British lines and knocked on a German farmer's door. He speaks no English. He says, through the farmer, that he was sold to the British by his prince and wants only land and a quiet life.`,
    note: "About thirty thousand German soldiers served the British in America, and some five thousand stayed after the war. Congress offered them land to desert, in handbills printed in German.",
    choices: [
      { label: "Offer him land, and print handbills for more ($3k)", hint: "The nearest Hessian army loses about 150 men.", apply(state, reg) { if (state.treasury >= 3) spend(state, 3, "letters"); const h = ADJ[reg].map((n) => armyAt(state, n, "B")).find((b) => b && b.hessian); if (h) h.regulars = Math.max(200, h.regulars - 150); return "He was given a farm on the frontier. Within weeks, handbills in German were turning up in every Hessian camp."; } },
      { label: "Send him to the prisoners' camp", hint: "Nothing changes.", apply: () => "He was marched off with other prisoners to Lancaster, where many Hessians ended up working on German farms anyway." },
    ],
  },
};

// Pick a scene for this month, if one is due: about every other month, never the same one twice.
export function pickCivilian(state, rand) {
  state.civSeen ||= [];
  if (state.turn < 1 || state.turn - (state.civLast ?? -9) < 2 || rand() > 0.75) return null;
  const options = Object.entries(SCENES).filter(([id]) => !state.civSeen.includes(id)).map(([id, s]) => ({ id, region: s.where(state) })).filter((o) => o.region);
  if (!options.length) return null;
  const pick = options[Math.floor(rand() * options.length)];
  state.civSeen.push(pick.id);
  state.civLast = state.turn;
  return pick;
}

export function answerCivilian(state, choice) {
  const c = state.civilian;
  if (!c) return "";
  state.civilian = null;
  return SCENES[c.id].choices[choice].apply(state, c.region) || "";
}
