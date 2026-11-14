# Dispatches of '76 (working title)

A turn-based strategy game of the American Revolution, built for phones first. You are the **Board of War**: you move the Continental Army, pay for it, and answer letters from your generals.

This is the first playable prototype: one scenario, **The Campaign of 1776** (July 1776 to June 1777).

## Play it

The game is plain HTML, CSS and JavaScript modules with no build step. Browsers won't load modules from a `file://` page, so serve the folder:

```
cd revolution
python3 -m http.server 8000
```

Then open http://localhost:8000. On the same Wi-Fi, a phone can open `http://<your computer's IP>:8000`.

Once this folder is on the repository's main branch, GitHub Pages also serves it at `/second-listen/revolution/`.

## What's in the prototype

- **Map** of the northern colonies, Virginia to Canada, with 34 regions. The New York–Philadelphia corridor is magnified so it's playable on a phone.
- **Armies** of regulars and militia. Militia are cheap but weaker, and go home after 3 months.
- **Generals** with attack and defense ratings, traits (Howe is cautious, Arnold is bold, Rall is complacent in winter) and, on your side, **loyalty**.
- **Letters** from generals, Congress, a spy, Robert Morris and Benjamin Franklin. Your answers have consequences. Commanders who are badly outnumbered write to you for orders, and letters from far away arrive a month late.
- **Historical moments as decisions**: the Declaration, Lee's arrival and capture, Arnold's fleet on Lake Champlain, the enlistment crisis, crossing the Delaware, Arnold being passed over for promotion.
- **Money**: taxes, army pay, back pay owed, a loan with interest, and a printing press that causes inflation. The Treasury screen shows a monthly statement and a balance sheet.
- **The Royal Navy**: British armies can land anywhere along nearby coasts.
- **Winter**: armies outside cities lose men, and attacks are harder.
- **British AI** that scores its options and plays to its generals' personalities.
- **Autosave** in the browser.

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
| `js/data/regions.js` | Regions and which ones border each other |
| `js/data/generals.js` | Generals and their traits |
| `js/data/scenario1776.js` | Starting setup, reinforcements and scripted letters for 1776 |
| `tools/simulate.mjs` | Plays the campaign many times without a screen, for testing balance |

Balance test, from this folder: `node tools/simulate.mjs 60 defensive` (strategies: `passive`, `simple`, `defensive`). A reasonable player wins about a third of the time and survives about a quarter. A player who does nothing always loses.

## Roadmap

**Next**
- Playtest and tune the balance by hand
- Battle animations and sound
- A short tutorial for the first two months
- Better art for tokens and generals

**More campaigns**
- 1777: Saratoga in the north, Brandywine and Philadelphia in the south
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
