// The rival: the British commander of each campaign studies how the player fights and changes his methods.
//   You dig in everywhere      -> "siege":   he brings up heavy guns; earthworks protect you less, and he attacks them.
//   You attack again and again -> "wary":    he fortifies his camps; attacking him is harder.
//   You keep falling back      -> "hunter":  he presses harder, attacking at worse odds.
//   You love the bayonet       -> "counter": his men hold and shoot down charges in field battles.
// Spies and intercepted letters tell the player what he has learned. Real people are never quoted with invented
// words: news of the rival comes from spies, and the letters quoted are from unnamed British officers.

import { registerEvents, sendLetter } from "./letters.js";

export const RIVAL_OF = { "1776": "howe", saratoga: "burgoyne", philadelphia: "howe" };

export const STYLES = {
  siege: { label: "Siege guns", learned: "You dig in wherever you stop.", answer: "He has brought up heavy guns. Earthworks protect you less, and he will assault them." },
  wary: { label: "Fortified camps", learned: "You attack whenever you can.", answer: "He fortifies every camp. Attacking his armies is harder." },
  hunter: { label: "The hunt", learned: "You fall back when he comes near.", answer: "He presses harder, and attacks at odds he once would have refused." },
  counter: { label: "Steady volleys", learned: "You trust the bayonet.", answer: "His men hold their fire for your charges and shoot them down." },
};

export function setupRival(state) {
  const id = RIVAL_OF[state.scenario || "1776"];
  if (!id || !state.generals[id]) return;
  state.rival = { id, style: null, won: 0, lost: 0, seenBattles: state.battles.length, history: null };
  state.habits ||= {};
}

// Which habit stands out. Needs a few examples, and a clear lead over the others.
function readHabits(h) {
  const score = { siege: h.digin || 0, wary: h.attack || 0, hunter: h.retreat || 0, counter: (h.charge || 0) * 1.5 };
  const [best, second] = Object.entries(score).sort((a, b) => b[1] - a[1]);
  if (best[1] < 3 || best[1] < second[1] * 1.25) return null;
  return best[0];
}

// Each new month: tally the battles against him, read the player's habits, and maybe send word of it.
export function updateRival(state) {
  const R = state.rival;
  if (!R) return;
  const g = state.generals[R.id];
  if (!g || g.status === "captured") return;
  const fresh = state.battles.slice(R.seenBattles || 0);
  R.seenBattles = state.battles.length;
  let beat = null, lostTo = null;
  for (const b of fresh) {
    if (b.attacker.side === b.defender.side) continue;
    const pWon = (b.attackerWins ? b.attacker : b.defender).side === "P";
    if (pWon) { R.won++; beat = b; } else { R.lost++; lostTo = b; }
  }
  const style = readHabits(state.habits || {});
  // Old habits fade, so a player who changes his ways can shake the rival off.
  for (const k of Object.keys(state.habits || {})) if (typeof state.habits[k] === "number") state.habits[k] *= 0.8;
  if (style && style !== R.style) {
    R.style = style;
    sendLetter(state, `rival_${style}`, { rival: R.id });
    return;
  }
  // At most one word of him a month.
  const roll = ((state.turn * 7 + (state.gameSeed || 1)) % 10) / 10;
  if (beat && roll < 0.7) sendLetter(state, "rival_beaten", { rival: R.id, place: beat.region });
  else if (lostTo && roll < 0.45) sendLetter(state, "rival_officer", { rival: R.id, place: lostTo.region });
}

const rivalName = (state, ctx) => state.generals[ctx.rival]?.short || "The British commander";
const SPY = { from: "spy", fromName: "Our friends in the enemy camp" };
const OK = [{ label: "Noted", hint: "", apply: () => "" }];

registerEvents([
  {
    id: "rival_siege", ...SPY, title: (s, c) => `${rivalName(s, c)} brings up the heavy guns`,
    body: (s, c) => `Our people in the enemy's camp report that ${rivalName(s, c)} has sent for the heavy guns of the siege train. His officers say the Board's armies dig in wherever they stop, and that he means to knock their earthworks down rather than walk around them.\n\nEarthworks will not protect us as they did.`,
    choices: OK,
  },
  {
    id: "rival_wary", ...SPY, title: (s, c) => `${rivalName(s, c)} fortifies his camps`,
    body: (s, c) => `Word from behind the British lines: ${rivalName(s, c)} has ordered every camp entrenched and every road picketed. He expects to be attacked, and he means to be ready.\n\nThe next attack on his army will find it dug in and waiting.`,
    choices: OK,
  },
  {
    id: "rival_hunter", ...SPY, title: (s, c) => `${rivalName(s, c)} smells a retreat`,
    body: (s, c) => `A friend who carries vegetables into the British lines reports that ${rivalName(s, c)}'s officers are betting on how far we will fall back next. He has ordered his light troops forward and means to press us hard.\n\nHe will attack at odds he once would have refused.`,
    choices: OK,
  },
  {
    id: "rival_counter", ...SPY, title: (s, c) => `${rivalName(s, c)} drills against the bayonet`,
    body: (s, c) => `Our spies report that ${rivalName(s, c)} has been drilling his regiments to stand and hold their fire when charged, then fire by platoons at thirty paces. He has noticed how often we come on with the bayonet.\n\nIn the next battle, a charge at steady British troops will cost dearly.`,
    choices: OK,
  },
  {
    id: "rival_beaten", ...SPY, title: (s, c) => `Bad tempers at ${rivalName(s, c)}'s headquarters`,
    body: [
      (s, c) => `The news of the fighting has gone hard at British headquarters. A friend in the city reports that ${rivalName(s, c)} kept his officers late into the night, and that the dispatches to London are being rewritten for the third time.\n\nHe will not forget it.`,
      (s, c) => `Our people report that ${rivalName(s, c)} has pulled in his outposts and doubled the guard. The Loyalists who were so sure of him a month ago are quieter now.\n\nHe will want to settle the score.`,
    ],
    choices: OK,
  },
  {
    id: "rival_officer", from: "spy", fromName: "An intercepted letter", title: "A British officer writes home",
    body: [
      () => `A letter taken from a captured courier, written by a captain of the light infantry to his brother in England:\n\n"The rebels run like rabbits when we come on with the bayonet, and our general says the whole business will be over by Christmas. I have bought a horse from a Quaker for four guineas."\n\nThe captain is not as clever as he thinks. But his general is learning.`,
      () => `A letter taken from a British mail bag, from a lieutenant of the Guards to his mother:\n\n"We have beaten them again. They are brave enough behind a wall, but they cannot stand in the open, and our commander knows it. I am well, and very tired of salt pork."\n\nThe British are growing sure of themselves.`,
      () => `Our scouts took a letter from a Hessian officer's servant. Translated, it reads in part:\n\n"The Americans fight from the woods like the hunters they are, but in the field they give way. Our general watches how they move, and says he can read them now."\n\nIt seems the enemy studies us as closely as we study him.`,
    ],
    choices: OK,
  },
]);
