// Commanders. atk and def run 0-3 and add to an army's strength in battle.
// Traits change how a general fights or behaves; the engine and AI check them by name.
// loyalty (Patriot generals only) goes up and down with your choices. Low loyalty has consequences.

export const GENERALS = {
  // Continental Army
  washington: { side: "P", name: "George Washington", short: "Washington", rank: 10, atk: 2, def: 3, loyalty: 90,
    trait: "steadfast", traitText: "Steadfast: his army never surrenders while it has somewhere to retreat, and Cause falls less when he loses." },
  greene:     { side: "P", name: "Nathanael Greene", short: "Greene", rank: 7, atk: 2, def: 2, loyalty: 75,
    trait: "quartermaster", traitText: "Quartermaster: his army costs half as much to keep in the field." },
  knox:       { side: "P", name: "Henry Knox", short: "Knox", rank: 5, atk: 1, def: 2, loyalty: 80,
    trait: "artillery", traitText: "Artillerist: much stronger defending a city or fort." },
  putnam:     { side: "P", name: "Israel Putnam", short: "Putnam", rank: 6, atk: 1, def: 2, loyalty: 70,
    trait: "oldwolf", traitText: "Old Wolf: militia under him hold their ground better." },
  lee:        { side: "P", name: "Charles Lee", short: "Lee", rank: 8, atk: 2, def: 1, loyalty: 55,
    trait: "proud", traitText: "Proud: a former British officer who thinks he should be in charge. Watch his loyalty." },
  arnold:     { side: "P", name: "Benedict Arnold", short: "Arnold", rank: 6, atk: 3, def: 2, loyalty: 65,
    trait: "bold", traitText: "Bold: hits hard when attacking. Ambitious, and sensitive about being passed over." },
  sullivan:   { side: "P", name: "John Sullivan", short: "Sullivan", rank: 5, atk: 1, def: 1, loyalty: 70,
    trait: null, traitText: "A steady brigade commander." },
  stirling:   { side: "P", name: "Lord Stirling", short: "Stirling", rank: 4, atk: 1, def: 2, loyalty: 75,
    trait: "rearguard", traitText: "Rearguard: his army loses fewer men when it is beaten." },

  // British and Hessian
  howe:       { side: "B", name: "William Howe", short: "Howe", rank: 10, atk: 3, def: 2,
    trait: "cautious", traitText: "Cautious: wins battles, but rarely presses a beaten enemy and won't attack dug-in troops without big odds." },
  cornwallis: { side: "B", name: "Charles Cornwallis", short: "Cornwallis", rank: 8, atk: 3, def: 2,
    trait: "aggressive", traitText: "Aggressive: attacks at worse odds than other British generals." },
  clinton:    { side: "B", name: "Henry Clinton", short: "Clinton", rank: 9, atk: 2, def: 2,
    trait: null, traitText: "A careful planner." },
  carleton:   { side: "B", name: "Guy Carleton", short: "Carleton", rank: 9, atk: 2, def: 3,
    trait: "northern", traitText: "Governor of Canada: operates around Lake Champlain and the upper Hudson." },
  heister:    { side: "B", name: "Leopold von Heister", short: "Heister", rank: 7, atk: 2, def: 2, hessian: true,
    trait: null, traitText: "Commander of the Hessian corps." },
  rall:       { side: "B", name: "Johann Rall", short: "Rall", rank: 5, atk: 2, def: 1, hessian: true,
    trait: "complacent", traitText: "Complacent: badly surprised if attacked in winter quarters." },
};
