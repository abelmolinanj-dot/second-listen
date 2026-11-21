// Every playable scenario, by id. Each module exports SCENARIO, setupScenario, REINFORCEMENTS and SCENARIO_EVENTS.
// SCENARIO can also define hooks: finish(state), checkEnd(state), onOpenMonth(state), onCloseMonth(state).

import * as s1776 from "./scenario1776.js";
import * as saratoga from "./scenarioSaratoga.js";
import * as philadelphia from "./scenarioPhiladelphia.js";
import * as burgoyne from "./scenarioBurgoyne.js";

export const SCENARIOS = {
  [s1776.SCENARIO.id]: s1776,
  [saratoga.SCENARIO.id]: saratoga,
  [philadelphia.SCENARIO.id]: philadelphia,
  [burgoyne.SCENARIO.id]: burgoyne,
};

export const DEFAULT_SCENARIO = "1776";

export function scenarioOf(state) {
  return SCENARIOS[(state && state.scenario) || DEFAULT_SCENARIO] || SCENARIOS[DEFAULT_SCENARIO];
}
