# Handoff: read this first

For anyone (or any AI session) picking up Dispatches of '76. Read this, then `README.md` and `docs/ROADMAP.md`.

## The project

A phone-first, turn-based strategy game of the American Revolution, in the spirit of World Conqueror 4 but original:
no copied names, art or layout. It's a passion project and a portfolio piece about directing AI to build something
real. Target: playable public release around January to February 2027. "Ship, find errors, fix them."

- Code: this `revolution/` folder, branch `ccr-ecf204f0-v2tloy` of the `second-listen` repository. Not merged to main.
- Plain HTML, CSS and JavaScript modules, no build step. Run `npm start` here and open http://localhost:5180
  (port 8000 is reserved on the main development PC). Node.js is needed for the server and the simulator.
- Balance: `node tools/simulate.mjs 100 defensive --scenario=saratoga` (or `--scenario=1776`). Run it after any
  change to rules, letters or scenarios.

## How the owner wants to work

- **Work on your own.** Commit and push without asking. Don't make them stand by for routine decisions.
- **Pitch new features before building them**, and always list clearly what was added so they can cut it.
  Bug fixes and polish don't need a pitch.
- **Ask before downloading** files (images, data), saying what, from where and how big. Only public-domain or freely
  licensed material, credited in `img/CREDITS.md`. No movie, TV or game images.
- **Testing in the browser:** they play in the app's browser at `localhost:5180`. Never clear storage or reload that
  tab. Test in a separate tab at `127.0.0.1:5180` (a different address keeps separate saves), and close it when done.

## Style rules

- No em dashes, in game text or in replies.
- No gray text. Secondary text is navy.
- Colors are red, white and navy. No gold or parchment tints. Tokens live at the top of `css/style.css`.
- The map should look as close to real terrain as possible.
- It must feel like a real game: main menu, campaign map, briefings, never dropping players straight into the war map.
- Every campaign must feel different, not "the same conversation in a different scenario": alternate letter wordings,
  chance events, shifting history, consequence letters, councils of war, spy reports, Founders' letters.
  **Saratoga is the template** for every later mission.
- History must be accurate. If a quote isn't documented, say "attributed" or paraphrase. Never put invented words in
  a real person's mouth.

## Where things stand (November 21, 2026)

Built: main menu, campaign map with 8 missions (1776, Saratoga and Philadelphia playable), letters with portraits and seals,
councils of war, spy reports, monthly newspaper, Who's Who with large portraits and biographies, History Book,
honors, generals who remember across campaigns, foreign volunteers, camp life, weather, seasons, night turns,
quotes, sound, a tutorial for 1776, an orders box with an aide's tips, period soldiers, a real map from
Natural Earth data, supply lines and depots, battle close-ups with tactics, naval moments, and the Daily Dispatch.
Phases 1, 2 and 3 of the roadmap are done.

Next, in order:
1. The Philadelphia campaign of 1777 is built (`js/data/scenarioPhiladelphia.js`): Howe's voyage, the Brandywine
   council, Paoli, Germantown in the fog, the Delaware forts, the Liberty Bell, Lydia Darragh, the Conway Cabal and
   Valley Forge. Wayne, Knyphausen and Grey have portraits. Next mission after it:
   Valley Forge and Monmouth (Steuben is waiting in the data).
   Phase 5 ("make it a game", see ROADMAP) is under way: step 1 (fewer letters, pixel soldiers) and the first half of
   step 2 (battles you command, battle drums) are built. Defensive battles are in too: the British turn pauses
   (state.pendingDefense, resumeBritishAttack in turn.js) when it attacks an army of 3,000+. Step 3 (a map that lives, watching the British turn) is built too. Next is step 4:
   named regiments with battle honors and a rival enemy general. `node tools/battletest.mjs` checks battle balance.
2. Phase 4: "An Officer's Road", a personal career mode inspired by Mount and Blade: Warband.
3. Optional: a public-domain period map from Wikimedia Commons for the History Book (approved in principle).
