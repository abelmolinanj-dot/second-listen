// Named regiments. Each Continental army carries real regiments of the war; they fight in its battles, gain experience,
// win battle honors, and remember all of it from one campaign to the next (through legacy.js).
// Regiments are given to an army the first time it fights or is looked at, so splitting, merging and recruiting
// need no bookkeeping beyond passing the list along.
// This file imports nothing from the rules, so rules.js can use it.

export const ROSTER = [
  // Continental line
  { name: "1st Maryland", home: "Maryland", kind: "line" },
  { name: "Delaware Regiment", home: "Delaware", kind: "line" },
  { name: "Glover's Marbleheaders", home: "Massachusetts", kind: "line" },
  { name: "1st Virginia", home: "Virginia", kind: "line" },
  { name: "3rd Virginia", home: "Virginia", kind: "line" },
  { name: "1st Pennsylvania", home: "Pennsylvania", kind: "line" },
  { name: "2nd New Jersey", home: "New Jersey", kind: "line" },
  { name: "4th Connecticut", home: "Connecticut", kind: "line" },
  { name: "2nd New Hampshire", home: "New Hampshire", kind: "line" },
  { name: "1st Rhode Island", home: "Rhode Island", kind: "line" },
  { name: "6th Massachusetts", home: "Massachusetts", kind: "line" },
  { name: "1st New York", home: "New York", kind: "line" },
  { name: "Knowlton's Rangers", home: "Connecticut", kind: "line" },
  { name: "5th Virginia", home: "Virginia", kind: "line" },
  { name: "8th Pennsylvania", home: "Pennsylvania", kind: "line" },
  { name: "3rd New Hampshire", home: "New Hampshire", kind: "line" },
  { name: "2nd Rhode Island", home: "Rhode Island", kind: "line" },
  { name: "2nd Canadian Regiment", home: "Canada", kind: "line" },
  { name: "Webb's Additional Regiment", home: "Connecticut", kind: "line" },
  { name: "4th New Jersey", home: "New Jersey", kind: "line" },
  // Militia
  { name: "Pennsylvania Associators", home: "Pennsylvania", kind: "militia" },
  { name: "New Jersey militia", home: "New Jersey", kind: "militia" },
  { name: "Connecticut militia", home: "Connecticut", kind: "militia" },
  { name: "Massachusetts militia", home: "Massachusetts", kind: "militia" },
  { name: "New York militia", home: "New York", kind: "militia" },
  { name: "Green Mountain Boys", home: "Vermont", kind: "militia" },
  { name: "Albany County militia", home: "New York", kind: "militia" },
  { name: "Bucks County militia", home: "Pennsylvania", kind: "militia" },
  // Riflemen and artillery
  { name: "Morgan's Riflemen", home: "Virginia", kind: "rifles" },
  { name: "Pennsylvania Rifle Regiment", home: "Pennsylvania", kind: "rifles" },
  { name: "Knox's artillery", home: "Massachusetts", kind: "guns" },
  { name: "2nd Continental Artillery", home: "Connecticut", kind: "guns" },
];

export const LEVELS = ["Raw", "Seasoned", "Veteran", "Elite"];
export const levelOf = (r) => (!r ? 0 : r.xp >= 7 || r.honors.length >= 3 ? 3 : r.xp >= 4 ? 2 : r.xp >= 1.5 ? 1 : 0);
// Veterans fire steadier and hold longer: 6% better a level.
export const levelBonus = (lvl) => 1 + 0.06 * lvl;

export function recordOf(state, name) {
  state.regiments ||= {};
  const base = ROSTER.find((r) => r.name === name) || { name, home: "", kind: "line" };
  return (state.regiments[name] ||= { name, home: base.home, kind: base.kind, battles: 0, won: 0, xp: 0, honors: [], broke: 0, notes: [] });
}

// The regiments an army fields, roughly as battle.js breaks it up (used when it has not fought on the field).
export function kindsFor(army) {
  const regs = army.regulars, mil = (army.militia || []).reduce((s, b) => s + b.men, 0);
  const out = [];
  if (regs + mil >= 5000 && regs > 1500) out.push("guns");
  const m = mil > 300 ? Math.min(2, Math.max(1, Math.round(mil / 1800))) : 0;
  const l = regs > 300 ? Math.max(1, Math.min(6 - out.length - m, Math.round(regs / 1300))) : 0;
  for (let i = 0; i < l; i++) out.push("line");
  for (let i = 0; i < m; i++) out.push("militia");
  return out;
}

// Give an army regiments for each kind of unit it fields. kinds: ["guns", "line", "line", "militia", ...]
// Returns the regiment names in the same order. Regiments already with the army are kept and reused first.
export function assignRegiments(state, army, kinds) {
  army.regs ||= [];
  const inUse = new Set(Object.values(state.armies).flatMap((a) => a.regs || []));
  const want = kinds.slice();
  const out = new Array(kinds.length).fill(null);
  const pool = army.regs.slice();
  // Match the army's own regiments to units of the same kind (riflemen and guns can serve as line in a pinch).
  want.forEach((k, i) => {
    const j = pool.findIndex((n) => recordOf(state, n).kind === k);
    if (j >= 0) { out[i] = pool[j]; pool.splice(j, 1); }
  });
  want.forEach((k, i) => {
    if (out[i]) return;
    const j = pool.findIndex((n) => k === "line" || recordOf(state, n).kind === "line");
    if (j >= 0 && k !== "guns" && k !== "rifles") { out[i] = pool[j]; pool.splice(j, 1); return; }
    // A fresh regiment from the roster: the most experienced free one of the right kind first.
    const free = ROSTER.filter((r) => r.kind === k && !inUse.has(r.name) && !out.includes(r.name))
      .sort((a, b) => (state.regiments?.[b.name]?.xp || 0) - (state.regiments?.[a.name]?.xp || 0));
    const pick = free[0] || ROSTER.find((r) => r.kind === "line" && !inUse.has(r.name) && !out.includes(r.name));
    if (pick) { out[i] = pick.name; army.regs.push(pick.name); inUse.add(pick.name); recordOf(state, pick.name); }
  });
  return out;
}

// After a battle: every regiment that fought gains experience; those that stood their ground in a victory
// earn the battle's name as an honor; those that broke remember it too.
// units: [{ reg, routed }] for a fought battle, or null to credit all the army's regiments (a quick battle).
export function creditRegiments(state, army, { won, place, units = null, captured = false }) {
  // A quick battle by an army that has never been looked at: give it regiments first.
  if (!units && !(army.regs && army.regs.length) && army.side === "P" && state.armies[army.id]) assignRegiments(state, army, kindsFor(army));
  const list = units || (army.regs || []).map((reg) => ({ reg, routed: !won && Math.random() < 0.3 }));
  for (const u of list) {
    if (!u.reg) continue;
    const r = recordOf(state, u.reg);
    r.battles++;
    r.xp += u.routed ? 0.5 : won ? 1.5 : 1;
    if (won) r.won++;
    if (won && !u.routed && !r.honors.includes(place)) r.honors.push(place);
    if (u.routed) r.broke++;
    if (captured) r.notes.push(`Captured at ${place}`);
  }
}
