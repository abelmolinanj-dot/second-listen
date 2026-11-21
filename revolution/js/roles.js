// Choose who you are. Each campaign can be played as the Board of War (the default), as the commander in the field,
// or as one of the war's great subordinates, each with his own strengths and his own troubles.
// The rules read state.role.id and state.role.gen; this file only describes the roles.

export const ROLES = {
  board: {
    title: "The Board of War",
    who: () => "The Board of War",
    blurb: "You run the whole war from Congress: every army, the treasury and the letters.",
    perks: ["The usual game: no bonuses, no penalties"],
    problems: [],
  },
  commander: {
    title: "The commander in the field",
    who: (gen) => gen,
    blurb: "You ride with the main army and see the battle with your own eyes.",
    perks: ["Your own army fights 10% better, attacking or defending", "One more rally in battles you command"],
    problems: ["Far from Congress: taxes come in 15% short"],
  },
  greene: {
    title: "Nathanael Greene",
    who: () => "Nathanael Greene",
    blurb: "The Rhode Island Quaker turned general, the best organizer in the army. He wins by not losing.",
    perks: ["Every army costs a quarter less to pay", "Supply reaches one region further", "Worn armies recover faster"],
    problems: ["A careful fighter: attacks are 5% weaker"],
  },
  arnold: {
    title: "Benedict Arnold",
    who: () => "Benedict Arnold",
    blurb: "The most daring field commander in America, and the most resented. Congress will never give him the credit.",
    perks: ["Every attack hits 12% harder"],
    problems: ["Congress gives you little credit: Cause gains are cut by a third", "Defeats sting more: Cause losses are a quarter larger"],
  },
};

// The general the "commander" role means right now. At Saratoga that is Schuyler until Congress replaces him with Gates.
export function roleGeneral(state) {
  const r = state.role;
  if (!r || !r.gen) return null;
  if (r.id === "commander" && r.gen === "schuyler" && state.generals.schuyler && state.generals.schuyler.status !== "active" && state.generals.gates && state.generals.gates.status === "active") return "gates";
  return r.gen;
}

// Which roles each campaign offers (a general has to be in the campaign to play as him).
export const ROLES_FOR = {
  "1776": ["board", "commander", "greene", "arnold"],
  saratoga: ["board", "commander", "arnold"],
  philadelphia: ["board", "commander", "greene"],
  burgoyne: ["board", "commander", "arnold"],
};
