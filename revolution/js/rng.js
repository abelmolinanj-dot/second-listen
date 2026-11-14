// Small seeded random number generator, so a saved game continues the same way it would have.
export function makeRng(state) {
  return function rand() {
    let t = (state.seed = (state.seed + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const between = (rand, lo, hi) => lo + (hi - lo) * rand();
export const pick = (rand, list) => list[Math.floor(rand() * list.length)];
