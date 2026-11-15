// Honors you can earn. Each one is tied to something that really happened, explained in `note`.
// check(state, gameOver) runs when a campaign ends. Keep them achievable and honest.

const won = (go) => go && go.result === "victory";
const patriotSurprise = (state) => state.battles.some((b) => b.surprise && b.attacker.side === "P" && b.attackerWins);

export const ACHIEVEMENTS = [
  {
    id: "victory-or-death", title: "Victory or Death",
    goal: "Win a surprise attack across a river in winter.",
    note: "\"Victory or Death\" was the password on the night Washington crossed the Delaware, December 25, 1776.",
    check: (state) => patriotSurprise(state),
  },
  {
    id: "glorious-year", title: "A Glorious Year",
    goal: "Earn three stars in the Campaign of 1776.",
    note: "In reality the year ended with Washington clinging on. Trenton and Princeton saved the Revolution, but New York was lost for the rest of the war.",
    check: (state, go) => state.scenario === "1776" && go.stars === 3,
  },
  {
    id: "turning-point", title: "The Turning Point",
    goal: "Force Burgoyne to surrender unconditionally.",
    note: "Gates actually granted Burgoyne a \"convention\" rather than demanding unconditional surrender. Congress later refused to honor it, and the Convention Army stayed prisoner for the rest of the war.",
    check: (state, go) => state.scenario === "saratoga" && go.title === "The turning point",
  },
  {
    id: "gibraltar", title: "Gibraltar of the North",
    goal: "Win Saratoga without abandoning Ticonderoga.",
    note: "St. Clair abandoned Ticonderoga in July 1777 to save his army. Congress was outraged; a court-martial cleared him the next year.",
    check: (state, go) => state.scenario === "saratoga" && won(go) && state.flags.ticonderogaAbandoned === undefined,
  },
  {
    id: "hard-money", title: "Hard Money",
    goal: "Finish a campaign without running the printing press.",
    note: "Congress printed over 200 million Continental dollars during the war. By 1781 they were nearly worthless.",
    check: (state, go) => go.result !== "defeat" && state.pressRuns === 0,
  },
  {
    id: "not-worth", title: "Not Worth a Continental",
    goal: "Run the printing press five times in one campaign. (Not an honor, exactly.)",
    note: "\"Not worth a Continental\" was still an everyday American saying more than a century after the war.",
    check: (state) => state.pressRuns >= 5,
  },
  {
    id: "loyal-arnold", title: "A Different Arnold",
    goal: "Finish a campaign with Benedict Arnold's loyalty at 85 or more.",
    note: "Arnold's real grievances (passed over for promotion, unpaid, mocked by Congress) are part of why he turned traitor in 1780.",
    check: (state) => state.generals.arnold && state.generals.arnold.loyalty >= 85 && state.generals.arnold.status !== "away",
  },
  {
    id: "band-of-brothers", title: "Band of Brothers",
    goal: "Finish a campaign with every general's loyalty at 50 or more.",
    note: "Washington spent much of the war managing the pride of his generals. Several resigned over promotions.",
    check: (state, go) => go.result !== "defeat" && Object.values(state.generals).filter((g) => g.side === "P" && g.loyalty !== undefined && g.status !== "away").every((g) => g.loyalty >= 50),
  },
  {
    id: "stark", title: "Live Free or Die",
    goal: "Win the fight at Bennington.",
    note: "Stark's militia took about 700 prisoners at Bennington. New Hampshire's motto comes from a toast Stark wrote in 1809.",
    check: (state) => !!state.flags.burgoyneHungry && state.scenario === "saratoga",
  },
  {
    id: "paris", title: "Paris Is Watching",
    goal: "Win Saratoga after promising Lafayette's friends a victory.",
    note: "News of Saratoga reached France in December 1777. The treaty of alliance was signed in February 1778.",
    check: (state, go) => state.scenario === "saratoga" && won(go) && !!state.flags.lafayette,
  },
];
