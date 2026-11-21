# Dispatches of '76 (working title)

A turn-based strategy game of the American Revolution, built for phones first. You are the **Board of War**: you move the Continental Army, pay for it, and answer letters from your generals.

Three campaigns are playable: **The Campaign of 1776** (July 1776 to June 1777, around New York and New Jersey), **Saratoga** (June to November 1777, against Burgoyne's invasion from Canada) and **The Philadelphia Campaign** (July to December 1777, against Howe's march on the capital).

## Play it

The game is plain HTML, CSS and JavaScript modules with no build step. Browsers won't load modules from a `file://` page, so serve the folder. With [Node.js](https://nodejs.org) installed:

```
cd revolution
npm start
```

Then open http://localhost:5180. (Any static server works too, for example `python3 -m http.server`. On some Windows machines port 8000 is reserved, which is why the default is 5180.) The server only listens on your own computer; to test on a phone on the same Wi-Fi, use a server that listens on your network address.

Once this folder is on the repository's main branch, GitHub Pages also serves it at `/second-listen/revolution/`.

## What's in the prototype

- **A main menu** with Continue, Campaign, Conquest (coming), Generals, Settings and Credits.
- **A campaign map**: the war as a trail of eight missions from Boston in 1775 to Yorktown in 1781. Tap a mission for its briefing: a painting, the situation, your orders, difficulty, and your best result in stars (1–3). The Campaign of 1776 is playable; the rest show when they're coming. Missions are listed in `js/data/missions.js`.
- **Who's Who**: every general, foreign volunteer and Founding Father, with ratings, traits, a short biography, and their record with you across campaigns (`js/data/figures.js`).
- **Generals who remember**: loyalty, battles won and lost, wounds and honors carry from one campaign to the next (`js/legacy.js`), and later letters mention them. Congress votes its thanks, gold medals and swords of honor at the end of a campaign.
- **Foreign volunteers** with abilities from their real careers: Kosciuszko (engineer), Steuben (drillmaster), Pulaski (cavalry), Lafayette (beloved). Kosciuszko can join at Saratoga; the others arrive in later campaigns.
- **Camp life**: Martha Washington in winter quarters, the women of the camp, the army's hospitals, and an intercepted letter from Burgoyne's camp.

- **Map** of the northern colonies, Virginia to Canada, with 34 regions, drawn like a period map: mountain ranges, forests, farmland, the main post roads, towns, forts, rivers and named waters. The New York–Philadelphia corridor is magnified so it's playable on a phone.
- **Terrain that matters**: hills (defenders +20%) and forest (+10%); in either, militia fight nearly as well as regulars.
- **Soldiers on the map**: Continentals in blue and buff, redcoats, Hessians in brass caps and militia in hunting shirts. Bigger armies show more men. Armies carry the Grand Union Flag or the King's Colours, and march across the map when they move.
- **Cutscenes** for the British fleet arriving, the Declaration, crossing the Delaware, the first winter, and the end of the campaign.
- **Armies** of regulars and militia. Militia are cheap but weaker, and go home after 3 months.
- **Generals** with attack and defense ratings, traits (Howe is cautious, Arnold is bold, Rall is complacent in winter) and, on your side, **loyalty**.
- **Letters** from generals and Founders (Franklin, both Adamses, Hamilton, Lafayette, Hancock, Morris, Jay, Paine), each opening with the writer's portrait and seal. Your answers have consequences, and later letters remember them. Councils of war let several officers argue their plans; spy reports may be wrong. Letters from far away arrive a month late.
- **No two games alike**: key letters come in several wordings, each campaign has a pool of chance events (about one a month), and history shifts a little each game (in Saratoga: Burgoyne's strength, when Fort Stanwix is besieged, and whether Clinton comes up the Hudson early, late or on time).
- **Supply lines**: armies need a friendly city, fort or depot within 3 regions; cut-off armies starve. Build depots to operate far afield.
- **Battles you command**: big attacks, yours or the British army's, open a pixel-art battlefield. When the British attack one of your armies of 3,000 or more, the month stops: command the defense, or let your general fight it. Place your regiments (named after real ones, like the 1st Maryland and Glover's Marbleheaders) in three lanes, then give each lane its orders while the battle runs: leave it to your general, hold, advance, charge or fall back. Send in the reserve, and ride your general along the line to rally the men. Morale breaks regiments long before they are destroyed, and chance moments (a colonel shot, a drummer who keeps beating) can turn the day. You can still let the general fight it with one plan (bayonet charge, volleys, flank march or probe). Drums quicken as the fighting gets heavier, and volleys come from each side of the stereo field.
- **Named regiments**: every Continental army carries real regiments of the war (the 1st Maryland, Glover's Marbleheaders, Knox's artillery, the Green Mountain Boys and more). They gain experience (Raw, Seasoned, Veteran, Elite), and veterans fire steadier and hold longer. Regiments that stand their ground in a victory earn the battle's name as an honor, shown as streamers on their colors, and they keep all of it from campaign to campaign (`js/regiments.js`, and the Regiments tab of the History Book).
- **A rival general**: the British commander of each campaign studies how you fight. Dig in everywhere and he brings up siege guns; attack again and again and he fortifies his camps; keep falling back and he presses harder; charge too often and his men learn to shoot charges down. Spies report what he has learned, intercepted letters from British officers show their mood, and your record against him carries over (`js/rival.js`). Old habits fade, so changing your ways shakes him off.
- **A map that lives**: the trees turn in autumn and go bare in winter, snow lies on the hills, the rivers freeze, smoke and fire rise over recent battlefields, and armies light campfires at night (`js/living.js`). The British turn plays out move by move: red arrows march across the map, fleets sail along sea moves, and battles flash where they happen.
- **Pixel-art soldiers** in the style of early-1990s games, drawn in code (`js/pixel.js`): marching, loading, firing and falling.
- **Fewer letters**: one main letter a month; the rest wait in a dispatch tray, and their senders decide for themselves if you leave them. News arrives in the monthly paper.
- **Naval moments**: the Turtle submarine, fire ships, sunken hulks, Brown's raid on Lake George and the Hudson chain.
- **Daily Dispatch**: the same Saratoga for everyone each day, with a score to share and a streak.
- **A newspaper each month**: the monthly report is the front page of a period paper, with a headline for the month's biggest news.
- **Historical moments as decisions**: the Declaration, Lee's arrival and capture, Arnold's fleet on Lake Champlain, the enlistment crisis, crossing the Delaware, Arnold being passed over for promotion.
- **Money**: taxes, army pay, back pay owed, a loan with interest, and a printing press that causes inflation. The Treasury screen shows a monthly statement and a balance sheet.
- **The Royal Navy**: British armies can land anywhere along nearby coasts.
- **Winter**: armies outside cities lose men, and attacks are harder.
- **British AI** that scores its options and plays to its generals' personalities.
- **Autosave** in the browser.
- **Period paintings** for the cutscenes and portraits for most generals, all public domain (see `img/CREDITS.md`).
- **Sound**: musket volleys, cannon, drums, letters and coins, plus fife-and-drum "Yankee Doodle". Everything is made in code with the Web Audio API, so there are no sound files to license. Both can be turned off in the menu.
- **Did you know?** history notes in each monthly report and on each region, timed so they never give away events before they happen.
- **A guided tutorial** for the first two months, given by your aide-de-camp. It's on by default for new players and can be replayed from the menu.

## Files

| Path | What it does |
|---|---|
| `index.html`, `css/style.css` | The page and its look |
| `js/ui.js` | Map drawing, taps and zoom, panels, letters, ledger, menus |
| `js/rules.js` | Core rules: movement, battles, money, Cause |
| `js/turn.js` | Turn order, month-end bookkeeping, win and loss |
| `js/ai.js` | The British commander |
| `js/letters.js` | The letter system and letters every scenario can use |
| `js/geo.js` | Map geometry: coastline, rivers, region shapes |
| `js/terrain.js` | Map artwork: mountains, forests, roads, towns, waves, compass |
| `js/soldiers.js` | Soldier figures, flags and general medallions |
| `js/scenes.js` | Cutscenes and their drawn artwork |
| `js/frontend.js` | Main menu, campaign map, mission briefings, generals roster, settings, credits |
| `js/data/missions.js` | The campaign's missions and how stars are earned |
| `js/battle.js` | The field battle simulation: regiments, lanes, morale, orders |
| `js/battlefield.js` | The battlefield screen you command a battle from |
| `js/regiments.js` | Named regiments, their experience and battle honors |
| `js/rival.js` | The rival British general who learns your habits |
| `js/living.js` | The living map: seasons, smoke, campfires, ships, and the replay of the British turn |
| `js/pixel.js` | Pixel-art soldiers drawn in code |
| `tools/battletest.mjs` | Checks field battles against the quick battle odds |
| `js/sound.js` | Sound effects and music, synthesized with the Web Audio API |
| `js/tutorial.js` | The aide-de-camp's guided tutorial |
| `js/data/facts.js` | The "Did you know?" history notes |
| `tools/serve.mjs` | A tiny local web server (`npm start`) |
| `js/data/geodata.js` | Real coastline, lakes, rivers and colony borders (generated from Natural Earth by `tools/build-geodata.mjs`) |
| `js/data/assets.js` | Portraits and paintings to use when they're added |
| `img/` | Image files, with sources recorded in `img/CREDITS.md` |
| `js/data/regions.js` | Regions and which ones border each other |
| `js/data/generals.js` | Generals and their traits |
| `js/data/scenarios.js` | The list of playable scenarios |
| `js/data/scenario1776.js` | Starting setup, reinforcements, scripted letters and endings for 1776 |
| `js/data/scenarioSaratoga.js` | The same for Saratoga, 1777 |
| `js/data/scenarioPhiladelphia.js` | The same for the Philadelphia campaign, 1777 |
| `tools/simulate.mjs` | Plays the campaign many times without a screen, for testing balance |

Balance test, from this folder: `node tools/simulate.mjs 100 defensive --scenario=saratoga` (strategies: `passive`, `simple`, `defensive`; scenarios: `1776`, `saratoga`, `philadelphia`). In 1776 a careful player wins a little under half the time (more if they spend on the Founders' offers). Saratoga is easier, as it was historically: careful play usually wins, but three stars take cutting Burgoyne off or forcing his surrender. Philadelphia is harder: a careful player keeps the capital about a third of the time and keeps the army strong most of the rest. Doing nothing loses all three.

## Adding portraits and paintings

The game draws its own art until real images are added. To add one:

1. Put the file in `img/portraits/` (generals) or `img/scenes/` (cutscenes). Square-ish portraits work best.
2. List it in `js/data/assets.js`, for example `washington: "img/portraits/washington.jpg"`.
3. Record where it came from in `img/CREDITS.md`.

`assets.js` lists suggested public-domain paintings for each general and scene. Use paintings from before 1900, photos of them, or your own pictures. Avoid images from movies, TV, other games or modern artists unless you have permission.

## Roadmap

**Next**
- Playtest and tune the balance by hand
- Voiced lines for key letters (see `docs/ROADMAP.md`)
- Better art for tokens

**More campaigns**
- 1778: Valley Forge, Steuben's training, France enters the war
- 1780–81: the Southern campaign and Yorktown, where the French navy finally beats the Royal Navy
- Arnold's treason, which depends on his loyalty across campaigns

**Bigger features**
- Conquest mode on a 1775 world map: Britain, France, Spain, the Dutch Republic, Native nations and more
- Packaging for the App Store and Google Play (Capacitor)
- A Civil War series on the same engine

## Design notes

- **Original work.** The genre (regions, turns, generals) is common to many strategy and board games. The name, art, map, rules, numbers and writing here are our own.
- **History first, then fun.** Events follow what really happened, but your choices can change the outcome.
- **Money is real accounting.** The Treasury tracks cash, back pay owed (an accrued liability), loans payable and inflation. The Continental dollar really did collapse, which is where "not worth a Continental" comes from.

## Credits

Fonts: IM Fell English and Inter, from Google Fonts (SIL Open Font License).
