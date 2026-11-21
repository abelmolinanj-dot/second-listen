// Field battles: the fight itself, played out on a small field of three lanes (left, center, right).
// This file is only the simulation, with no drawing, so the balance simulator can run it too.
//
// Each side has up to six regiments. Every tick (about a second on screen, a quarter hour of battle) each regiment
// moves according to its lane's orders, fires at the nearest enemy in its lane, and loses men and morale.
// A regiment whose morale breaks runs; a lane with no enemy left lets the winners pour into the next lane's flank.
// The strategic modifiers (generals, terrain, works, weather, surprise) come from rules.js, so a battle fought with
// ordinary orders gives about the same odds as the quick resolution, and good orders can beat them.

import { REGIONS } from "./data/regions.js";
import { armyMen, militiaMen, generalOf, battleFactors, power, QUALITY } from "./rules.js";
import { assignRegiments, recordOf, levelOf, levelBonus } from "./regiments.js";

export const LANES = ["left", "center", "right"];
export const LANE_NAMES = { left: "Left", center: "Center", right: "Right" };
export const ORDERS = {
  hold: { label: "Hold", hint: "Stand and fire. Units holding in cover take fewer losses." },
  advance: { label: "Advance", hint: "Close to musket range, where volleys hit hardest for both sides." },
  charge: { label: "Charge", hint: "Bayonets. Breaks shaken troops, but costly against steady ones. Militia hate it." },
  fallback: { label: "Fall back", hint: "Pull out of this lane. Saves men, but gives the enemy the flank." },
};
export const TICKS = 40; // ten hours of daylight, four ticks an hour

// Regiment types. fire and melee are per man; resist is how well they take punishment; range in field units (0-100).
export const KINDS = {
  line: { label: "Line infantry", fire: 1, melee: 1, resist: 1, range: 26, speed: 4 },
  militia: { label: "Militia", fire: 0.62, melee: 0.45, resist: 0.62, range: 24, speed: 4.5 },
  rifles: { label: "Riflemen", fire: 0.8, melee: 0.3, resist: 0.72, range: 44, speed: 5, sharp: true },
  guns: { label: "Artillery", fire: 1.9, melee: 0.15, resist: 0.9, range: 72, speed: 0 },
  grenadiers: { label: "Grenadiers", fire: 1.05, melee: 1.35, resist: 1.2, range: 26, speed: 4 },
  light: { label: "Light infantry", fire: 0.95, melee: 1.1, resist: 1.05, range: 32, speed: 5.5 },
  jagers: { label: "Jägers", fire: 0.85, melee: 0.5, resist: 0.85, range: 44, speed: 5, sharp: true },
};

// Real regiments of the war, used to name the units on the field.
const NAMES = {
  P: { line: ["1st Maryland", "Delaware Regiment", "3rd Virginia", "1st Pennsylvania", "2nd New Jersey", "Glover's Marbleheaders", "4th Connecticut", "2nd New Hampshire", "1st Rhode Island", "6th Massachusetts"],
       militia: ["Pennsylvania militia", "New Jersey militia", "Connecticut militia", "Massachusetts militia", "New York militia"],
       rifles: ["Morgan's Riflemen", "Pennsylvania Rifles"], guns: ["Knox's artillery", "Continental artillery"] },
  B: { line: ["33rd Foot", "23rd Royal Welch Fusiliers", "42nd Highlanders", "17th Foot", "4th King's Own", "40th Foot", "55th Foot", "Foot Guards"],
       grenadiers: ["British Grenadiers"], light: ["British Light Infantry"], guns: ["Royal Artillery"] },
  H: { line: ["Regiment von Knyphausen", "Regiment von Lossberg", "Regiment von Mirbach", "Leib Regiment", "Regiment von Donop"],
       grenadiers: ["Hessian Grenadiers"], jagers: ["Hessian Jägers"], guns: ["Hessian artillery"] },
};

// The lanes' ground, from the region's terrain. cover: incoming fire is multiplied by this for a unit holding there.
function terrainFor(regionId, defenderSide, dugIn, works) {
  const r = REGIONS[regionId];
  const lanes = { left: { ground: "open", cover: {} }, center: { ground: "open", cover: {} }, right: { ground: "open", cover: {} } };
  if (r.terrain === "forest") { lanes.left.ground = "woods"; lanes.right.ground = "woods"; }
  if (r.terrain === "hills") lanes.center.ground = "hill";
  if (r.city) lanes.center.ground = "town";
  if (r.fort) for (const l of LANES) lanes[l].ground = "works";
  for (const l of LANES) {
    const g = lanes[l].ground;
    // Woods hide both sides; a hill, a town or works shelter only the side that holds them.
    if (g === "woods") { lanes[l].cover.P = 0.75; lanes[l].cover.B = 0.75; }
    if (g === "hill") lanes[l].cover[defenderSide] = 0.72;
    if (g === "town") lanes[l].cover[defenderSide] = 0.68;
    if (g === "works") lanes[l].cover[defenderSide] = 0.62;
    if ((dugIn || works) && g === "open") lanes[l].cover[defenderSide] = 0.8;
  }
  return lanes;
}

// Break an army into regiments. Up to six per side.
function regiments(state, army, side, rand) {
  const g = generalOf(state, army);
  const flag = side === "P" ? "P" : army.hessian ? "H" : "B";
  const pool = NAMES[flag];
  const used = {};
  const name = (kind) => { const list = pool[kind] || pool.line; const i = used[kind] = (used[kind] ?? Math.floor(rand() * list.length)) + 1; return list[(i - 1) % list.length]; };
  const out = [];
  let regs = army.regulars, mil = militiaMen(army);
  const total = regs + mil;
  // Guns: big armies and artillerists bring a battery.
  if ((total >= 5000 || (g && g.trait === "artillery")) && regs > 1500) { const n = Math.round(Math.min(400, total * 0.04)); out.push({ kind: "guns", men: n }); regs -= n; }
  if (side === "P") {
    if (g && g.trait === "riflemen") { const n = Math.min(600, Math.round((regs + mil) * 0.2)); out.push({ kind: "rifles", men: n }); if (mil >= n) mil -= n; else regs -= n; }
  } else if (regs >= 6000) {
    const n = Math.round(regs * 0.14); out.push({ kind: "grenadiers", men: n }); regs -= n;
    const m = Math.round(regs * 0.1); out.push({ kind: army.hessian ? "jagers" : "light", men: m }); regs -= m;
  } else if (army.hessian && regs >= 2500) { const m = Math.round(regs * 0.12); out.push({ kind: "jagers", men: m }); regs -= m; }
  const slots = 6 - out.length;
  const milUnits = mil > 300 ? Math.min(2, Math.max(1, Math.round(mil / 1800))) : 0;
  const lineUnits = regs > 300 ? Math.max(1, Math.min(slots - milUnits, Math.round(regs / 1300))) : 0;
  for (let i = 0; i < lineUnits; i++) out.push({ kind: "line", men: Math.round(regs / lineUnits) });
  for (let i = 0; i < milUnits; i++) out.push({ kind: "militia", men: Math.round(mil / milUnits) });
  const list = out.filter((u) => u.men > 0);
  // Continental units are the army's own named regiments, with their experience and honors.
  const named = side === "P" && state.armies[army.id] ? assignRegiments(state, state.armies[army.id], list.map((u) => u.kind)) : [];
  return list.map((u, i) => {
    const reg = named[i] || null;
    const rec = reg ? recordOf(state, reg) : null;
    const level = levelOf(rec);
    return {
      id: side + i, side, flag, kind: u.kind, name: reg || name(u.kind), reg, level, vet: levelBonus(level), honors: rec ? rec.honors.length : 0,
      worn: army.cond === undefined ? 0 : army.cond < 35 ? 2 : army.cond < 65 ? 1 : 0,
      men: u.men, start: u.men, morale: 100,
      lane: null, x: side === "P" ? 26 : 74, state: "ok", lastFire: -9, firing: false, moving: false, melee: false,
    };
  });
}

// Spread units over the lanes: guns in the center, the strongest on the flanks, and a reserve if there are four or more.
function autoDeploy(units) {
  const order = units.slice().sort((a, b) => (a.kind === "guns" ? -1 : 0) - (b.kind === "guns" ? -1 : 0) || b.men - a.men);
  const lanes = ["center", "left", "right", "center", "left", "right"];
  order.forEach((u, i) => { u.lane = u.kind === "guns" ? "center" : lanes[i % 3]; });
  if (units.length >= 4) {
    const spare = order.filter((u) => u.kind !== "guns").slice(-1)[0];
    if (spare) spare.lane = "reserve";
  }
}

// Set up a battle between an attacking army and a defending one in a region.
export function setupBattle(state, att, def, regionId, opts = {}, seed = 1) {
  let r = seed >>> 0 || 1;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  const f = battleFactors(state, att, def, regionId, opts);
  // How much better each side fights per man than its raw numbers, from generals, terrain, weather and the rest.
  // Terrain cover is drawn on the field instead, so take the plain terrain bonus back out of the defender's edge.
  const reg = REGIONS[regionId];
  const plain = (reg.terrain === "hills" ? 1.2 : reg.terrain === "forest" ? 1.1 : 1) * (reg.fort ? 1.3 : reg.city ? 1.1 : 1) * (def.dugIn ? 1.25 : 1);
  // Regulars' training (British regulars are better drilled) and the luck of the day, as in the quick battle.
  const qa = (f.A / Math.max(1, power(state, att, regionId))) * QUALITY[att.side] * (0.75 + rand() * 0.5);
  const qd = (f.D / Math.max(1, power(state, def, regionId)) / plain) * QUALITY[def.side] * (0.75 + rand() * 0.5) * Math.pow(plain, 0.25); // a little of the terrain edge stays; cover on the field gives the rest
  const P = att.side === "P" ? att : def, B = att.side === "P" ? def : att;
  const b = {
    region: regionId, tick: 0, over: false, rand, seed,
    attacker: att.side, defender: def.side,
    q: { [att.side]: qa, [def.side]: qd },
    lanes: terrainFor(regionId, def.side, def.dugIn, state.regions[regionId].works && def.side === "P"),
    orders: { P: { left: "hold", center: "hold", right: "hold" }, B: { left: "hold", center: "hold", right: "hold" } },
    generals: { P: generalOf(state, P), B: generalOf(state, B) },
    generalLane: { P: "center", B: "center" },
    rallies: { P: generalOf(state, P) && generalOf(state, P).trait === "steadfast" ? 2 : 1, B: 1 },
    units: [...regiments(state, P, "P", rand), ...regiments(state, B, "B", rand)],
    fallen: [], // where men fell, for the drawing: [x, lane, side]
    events: [], // things worth saying: { tick, text, kind }
    startMen: { P: armyMen(P), B: armyMen(B) },
    counterCharge: state.rival && state.rival.style === "counter" ? "B" : null,
    armyMen: { P: armyMen(P), B: armyMen(B) },
  };
  autoDeploy(b.units.filter((u) => u.side === "P"));
  autoDeploy(b.units.filter((u) => u.side === "B"));
  // Whoever attacks starts with orders to advance; the defender holds.
  for (const l of LANES) { b.orders[att.side][l] = "advance"; b.orders[def.side][l] = "hold"; }
  return b;
}

// Grammar for regiment names: "Glover's Marbleheaders" takes no "the", and plural names take plural verbs.
const plural = (n) => /(s|men)$/.test(n) && !/'s [a-z]+$/.test(n) ? true : /'s [A-Z][a-z]+s$/.test(n);
const the = (n, cap = false) => (/'s /.test(n) ? n : (cap ? "The " : "the ") + n);
const v = (n, one, many) => (plural(n) ? many : one);
const alive = (b, side, lane) => b.units.filter((u) => u.side === side && u.state === "ok" && (lane === undefined || u.lane === lane));
const say = (b, text, kind = "info") => b.events.push({ tick: b.tick, text, kind });
const dirOf = (side) => (side === "P" ? 1 : -1);

// The other side's commander, and the stand-in for a player who leaves everything to the general.
// lanesOnly: set only the lane orders (the player keeps the reserve and the general's rally for himself).
export function aiOrders(b, side, { lanesOnly = false } = {}) {
  const foe = side === "P" ? "B" : "P";
  const g = b.generals[side];
  const bold = g && ["aggressive", "gambler", "bold"].includes(g.trait);
  const careful = g && ["cautious", "entrenched"].includes(g.trait);
  const attacking = b.attacker === side;
  for (const l of LANES) {
    const mine = alive(b, side, l), theirs = alive(b, foe, l);
    if (!mine.length) continue;
    const myS = mine.reduce((s, u) => s + u.men * u.morale, 0), thS = theirs.reduce((s, u) => s + u.men * u.morale, 0);
    const myM = Math.min(...mine.map((u) => u.morale));
    const gap = theirs.length ? Math.min(...theirs.flatMap((t) => mine.map((u) => Math.abs(t.x - u.x)))) : 99;
    let o = attacking ? "advance" : "hold";
    if (!theirs.length) o = attacking ? "advance" : "hold";
    else if (myM < 30 && myS < thS * 0.6) o = "fallback";
    else if (gap < 22 && myS > thS * (bold ? 1.15 : careful ? 1.8 : 1.4) && theirs.some((t) => t.morale < 55)) o = "charge";
    else if (attacking && careful && gap < 24) o = "hold";
    else if (!attacking && theirs.length && thS < myS * 0.5) o = "advance";
    b.orders[side][l] = o;
  }
  if (lanesOnly) return;
  // Commit the reserve where the line is weakest, after the first hour or so.
  const reserve = b.units.filter((u) => u.side === side && u.lane === "reserve" && u.state === "ok");
  if (reserve.length && b.tick >= 6) {
    const need = LANES.map((l) => ({ l, r: (alive(b, foe, l).reduce((s, u) => s + u.men, 0) + 1) / (alive(b, side, l).reduce((s, u) => s + u.men, 0) + 1) })).sort((x, y) => y.r - x.r)[0];
    commitReserve(b, side, need.l);
  }
  // Rally where morale is lowest, once it is low.
  const shaky = LANES.map((l) => ({ l, m: Math.min(100, ...alive(b, side, l).map((u) => u.morale)) })).sort((x, y) => x.m - y.m)[0];
  if (shaky.m < 40 && b.rallies[side] > 0) { b.generalLane[side] = shaky.l; rally(b, side); }
}

export function commitReserve(b, side, lane) {
  const u = b.units.find((x) => x.side === side && x.lane === "reserve" && x.state === "ok");
  if (!u) return false;
  u.lane = lane;
  u.x = side === "P" ? 16 : 84;
  say(b, `${the(u.name, true)} ${side === "P" ? v(u.name, "marches", "march") : v(u.name, "is seen marching", "are seen marching")} up to the ${lane}.`, side === "P" ? "good" : "warn");
  return true;
}

// The general rides along the line: units in his lane recover morale.
export function rally(b, side) {
  if (b.rallies[side] <= 0) return false;
  b.rallies[side]--;
  const lane = b.generalLane[side];
  for (const u of alive(b, side, lane)) u.morale = Math.min(100, u.morale + 30);
  const g = b.generals[side];
  say(b, `${g ? g.short : "The colonel"} rides along the ${lane}, and the men cheer.`, side === "P" ? "good" : "warn");
  return true;
}

// One tick of battle.
export function step(b) {
  if (b.over) return;
  b.tick++;
  const K = 0.0115; // casualties per man firing per tick, at close range
  const hits = []; // collected first, so both sides fire at once
  for (const u of b.units) { u.firing = false; u.moving = false; u.melee = false; }

  for (const l of LANES) for (const side of ["P", "B"]) {
    const foe = side === "P" ? "B" : "P";
    const order = b.orders[side][l];
    const theirs = alive(b, foe, l);
    // The regiment nearest the enemy fires at full effect; those behind it fire over its heads at less.
    const mine = alive(b, side, l).sort((p, q) => dirOf(side) * (q.x - p.x));
    for (const [rank, u] of mine.entries()) {
      const k = KINDS[u.kind];
      const depth = rank === 0 || u.kind === "guns" ? 1 : 0.6;
      const d = dirOf(side);
      const nearest = theirs.slice().sort((p, q) => Math.abs(p.x - u.x) - Math.abs(q.x - u.x))[0];
      const gap = nearest ? Math.abs(nearest.x - u.x) : 99;
      // Movement.
      if (order === "fallback") {
        u.x -= d * Math.max(3, k.speed * 1.2); u.moving = true;
        if ((side === "P" && u.x <= 2) || (side === "B" && u.x >= 98)) { u.state = "withdrawn"; say(b, `${the(u.name, true)} ${v(u.name, "pulls", "pull")} out of the ${l}.`, side === "P" ? "warn" : "good"); continue; }
      } else if (k.speed && nearest) {
        const stopAt = order === "charge" ? 3 : order === "advance" ? (k.sharp ? 30 : 15) : null;
        if (stopAt !== null && gap > stopAt) { u.x += d * Math.min(gap - stopAt, k.speed * (order === "charge" ? 1.8 : 1)); u.moving = true; }
      } else if (k.speed && !nearest && order !== "hold") {
        // Nobody left in this lane: press on and turn the enemy's flank.
        if ((side === "P" && u.x < 70) || (side === "B" && u.x > 30)) { u.x += d * k.speed; u.moving = true; }
      }
      u.x = Math.max(0, Math.min(100, u.x));
      if (!nearest) continue;
      const g2 = Math.abs(nearest.x - u.x);
      // Bayonets: close quarters.
      if (g2 <= 4) {
        u.melee = true;
        const shock = (order === "charge" ? 1.6 : 1) * k.melee;
        hits.push({ to: nearest, men: Math.sqrt(u.men * nearest.men) * shock * K * 1.6 * b.q[side] * depth * (u.vet || 1), morale: 7 * shock / KINDS[nearest.kind].resist * (u.morale / 100), from: u });
        continue;
      }
      // Volleys.
      if (g2 <= k.range) {
        u.firing = true;
        const rangeF = Math.max(0.25, 1.5 - g2 / (k.range * 0.9));
        const sharp = k.sharp ? 1.25 : 1;
        // Woods hide everyone; a hill, a town or works only shelter men standing in them.
        const cover = b.lanes[l].ground === "woods" || b.orders[foe][l] === "hold" || !nearest.moving ? (b.lanes[l].cover[foe] || 1) : 1;
        const woods = k.sharp && b.lanes[l].ground === "woods" ? 1.2 : 1;
        // Casualties grow with both lines' frontage, so piling men into one lane helps, but not without limit.
        // A commander who has learned you love the bayonet keeps his men steady and shoots down a charge.
        const counter = b.counterCharge === side && b.orders[foe][l] === "charge" ? 1.25 : 1;
        hits.push({ to: nearest, men: Math.sqrt(u.men * nearest.men) * depth * (u.vet || 1) * counter * k.fire * K * rangeF * sharp * woods * cover * b.q[side] * (u.morale > 40 ? 1 : 0.75), morale: 0, from: u });
      }
    }
  }

  // Apply the damage.
  for (const h of hits) {
    const t = h.to;
    if (t.state !== "ok") continue;
    const lost = Math.min(t.men, Math.round(h.men * (0.85 + b.rand() * 0.3)));
    t.men -= lost;
    const gl = b.generalLane[t.side] === t.lane && b.generals[t.side] ? 0.85 : 1;
    t.morale -= ((lost / t.start) * 250 / KINDS[t.kind].resist * gl + h.morale * gl) / (t.vet || 1);
    if (lost > 25 && b.rand() < 0.5) b.fallen.push([t.x + (b.rand() - 0.5) * 6, t.lane, t.side]);
  }

  // Flanks: a lane where one side has nobody left shakes the neighbors.
  for (let i = 0; i < 3; i++) {
    const l = LANES[i];
    for (const side of ["P", "B"]) {
      const foe = side === "P" ? "B" : "P";
      if (alive(b, side, l).length || !alive(b, foe, l).length) continue;
      for (const n of [LANES[i - 1], LANES[i + 1]].filter(Boolean)) for (const u of alive(b, side, n)) u.morale -= 2.2;
      if (!b[`flankSaid${side}${l}`]) { b[`flankSaid${side}${l}`] = true; say(b, side === "P" ? `The enemy holds the ${l}. Our flank is open!` : `The enemy's ${l} is gone. Their flank is open!`, side === "P" ? "bad" : "good"); }
    }
  }

  // The fortunes of war: now and then something happens to one regiment in the thick of it.
  if (b.rand() < 0.22) {
    const engaged = b.units.filter((u) => u.state === "ok" && (u.firing || u.melee));
    const u = engaged[Math.floor(b.rand() * engaged.length)];
    if (u) {
      const good = b.rand() < 0.5;
      const k = u.kind === "guns" ? (good ? 4 : 5) : Math.floor(b.rand() * 4);
      const text = good
        ? [`${the(u.name, true)} ${v(u.name, "closes ranks and stands", "close ranks and stand")} like a wall.`, `A drummer of ${the(u.name)} keeps beating, and the men steady.`, `The colonel of ${the(u.name)} seizes the colors and rallies the line.`, `Fresh cartridges reach ${the(u.name)}.`, `The gunners of ${the(u.name)} find the range.`][k]
        : [`The colonel of ${the(u.name)} is shot from his horse.`, `A rumor runs through ${the(u.name)} that they are cut off.`, `${the(u.name, true)} ${v(u.name, "is", "are")} running short of cartridges.`, `Smoke and confusion: part of ${the(u.name)} fires into its own side.`, `A gun of ${the(u.name)} bursts.`, `${the(u.name, true)} ${v(u.name, "loses its", "lose their")} horses.`][k];
      u.morale += good ? 14 : -16;
      say(b, text, (u.side === "P") === good ? "good" : "bad");
    }
  }

  // Routs, and recovery for those out of the fire.
  for (const u of b.units) {
    if (u.state !== "ok") continue;
    if (u.men < u.start * 0.18 || u.morale <= 12) {
      u.state = "routed";
      say(b, `${the(u.name, true)} ${v(u.name, "breaks and runs", "break and run")}!`, u.side === "P" ? "bad" : "good");
      for (const o of alive(b, u.side, u.lane)) o.morale -= 9;
      for (const o of alive(b, u.side)) o.morale -= 2;
      continue;
    }
    if (!u.firing && !u.melee && u.lane !== "reserve") u.morale = Math.min(100, u.morale + 1.2);
  }
  for (const u of b.units) if (u.state === "routed") u.x -= dirOf(u.side) * 7;

  // Is it over?
  const left = (side) => alive(b, side).filter((u) => u.lane !== "reserve").length + b.units.filter((u) => u.side === side && u.lane === "reserve" && u.state === "ok").length;
  if (!left("P") || !left("B") || b.tick >= TICKS) finish(b);
}

// Who won, and what it cost. Everyone who isn't fighting any more counts toward the losers' rout.
export function finish(b, withdrawSide = null) {
  if (b.over) return;
  b.over = true;
  const strength = (side) => b.units.filter((u) => u.side === side && u.state === "ok").reduce((s, u) => s + u.men * (0.4 + u.morale / 100), 0);
  const sP = strength("P"), sB = strength("B");
  const att = b.attacker, def = b.defender;
  const sA = att === "P" ? sP : sB, sD = att === "P" ? sB : sP;
  // The attacker must clear the field, or end the day clearly stronger. Otherwise the defender holds.
  let attackerWins = withdrawSide === att ? false : withdrawSide === def ? true : sD === 0 ? sA > 0 : sA > sD * 1.05;
  if (sA === 0) attackerWins = false;
  b.attackerWins = attackerWins;
  b.ratio = Math.max(1.05, Math.min(3, attackerWins ? (sA + 1) / (sD + 1) : (sD + 1) / (sA + 1)));
  for (const side of ["P", "B"]) {
    const units = b.units.filter((u) => u.side === side);
    const start = units.reduce((s, u) => s + u.start, 0), now = units.reduce((s, u) => s + u.men, 0);
    // Units that ran lose stragglers and prisoners on top of the dead and wounded.
    const routed = units.filter((u) => u.state === "routed").reduce((s, u) => s + u.men, 0);
    const lost = start - now + routed * 0.08;
    const loser = (side === att) !== attackerWins;
    b[`loss${side}`] = Math.min(0.85, lost / Math.max(1, start) + (loser ? 0.02 : 0));
  }
  b.winner = attackerWins ? att : def;
}

// The result in the form rules.js expects (fractions of each army lost).
export function outcomeOf(b) {
  return {
    attackerWins: b.attackerWins, ratio: b.ratio, attLoss: b[`loss${b.attacker}`], defLoss: b[`loss${b.defender}`],
    units: b.units.filter((u) => u.side === "P" && u.reg && u.lane !== "reserve" || u.side === "P" && u.reg && u.state !== "ok").map((u) => ({ reg: u.reg, routed: u.state === "routed" })),
  };
}
