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
  // The Northern Department, 1777
  gates:      { side: "P", name: "Horatio Gates", short: "Gates", rank: 8, atk: 1, def: 3, loyalty: 60,
    trait: "entrenched", traitText: "Entrenched: when dug in, his lines are even harder to break. Popular with New England, and ambitious." },
  schuyler:   { side: "P", name: "Philip Schuyler", short: "Schuyler", rank: 7, atk: 1, def: 2, loyalty: 80,
    trait: "quartermaster", traitText: "Quartermaster: his army costs half as much to keep in the field. A New York grandee New Englanders distrust." },
  stclair:    { side: "P", name: "Arthur St. Clair", short: "St. Clair", rank: 5, atk: 1, def: 2, loyalty: 75,
    trait: "rearguard", traitText: "Rearguard: his army loses fewer men when it is beaten." },
  stark:      { side: "P", name: "John Stark", short: "Stark", rank: 5, atk: 2, def: 2, loyalty: 50,
    trait: "oldwolf", traitText: "Granite: New Hampshire militia under him fight almost like regulars. Quit the army over a slight and answers to New Hampshire, not Congress." },
  morgan:     { side: "P", name: "Daniel Morgan", short: "Morgan", rank: 4, atk: 3, def: 2, loyalty: 80,
    trait: "riflemen", traitText: "Riflemen: deadly in forest and hills, attacking or defending." },

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
  // Burgoyne's army from Canada, 1777. north: they march south from Canada.
  burgoyne:   { side: "B", name: "John Burgoyne", short: "Burgoyne", rank: 9, atk: 2, def: 2, north: true,
    trait: "gambler", traitText: "Gambler: a playwright and card player who attacks even when the odds are against him, and travels with thirty carts of baggage." },
  fraser:     { side: "B", name: "Simon Fraser", short: "Fraser", rank: 6, atk: 3, def: 1, north: true,
    trait: "aggressive", traitText: "Aggressive: leads the advance guard and attacks at worse odds." },
  riedesel:   { side: "B", name: "Baron von Riedesel", short: "Riedesel", rank: 7, atk: 1, def: 3, hessian: true, north: true,
    trait: null, traitText: "Commands the German troops from Brunswick. Steady and careful." },
  stleger:    { side: "B", name: "Barry St. Leger", short: "St. Leger", rank: 5, atk: 1, def: 1, north: true,
    trait: null, traitText: "Leads a column of British, Loyalists and Iroquois allies down the Mohawk Valley." },
};
