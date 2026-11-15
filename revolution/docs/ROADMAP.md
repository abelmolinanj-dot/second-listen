# Roadmap and design notes

Written November 2026. Target: a public release around January–February 2027. Ship, find errors, fix them.

## Where things stand

Playable now: **The Campaign of 1776** (12 months), with period paintings, sound and music, a guided tutorial,
"Did you know?" history notes, letters, generals with loyalty, and a real treasury with a balance sheet.

## Release plan

| When | Goal |
|---|---|
| Late Nov 2026 | Playtest 1776 by hand, fix what feels wrong, tune balance. Add the 7 missing portraits. |
| Dec 2026 | Second campaign: **Saratoga and Philadelphia, 1777**. Voiced lines for the key letters. |
| Jan 2027 | First version of conquest mode: **Rival States** on the colonies map. Publish on the web (GitHub Pages) for friends to test. |
| Feb 2027 | Fix what testers find. Release on the web. Package for Google Play (Android first: no Mac needed). |
| After launch | The world map, the later eras, iPhone. |

Anything not ready by February ships later. A finished small game beats an unfinished big one.

## Conquest mode (working name: "Grand Campaign")

A free-play mode next to the historical campaigns: no script, no letters on a timetable. You pick a side and
take the map. Original rules and look; the genre (regions, armies, turns) is shared by many strategy games.

### Mode 1: Rival States

*"What if the thirteen colonies had fought each other instead?"*

- Map: the thirteen colonies plus the frontier (Vermont, Maine, the Ohio Country, Florida).
- Pick any state, for example New Jersey, Virginia or Massachusetts. Every other state is run by the computer.
- States differ the way they really did: Virginia and Pennsylvania are large and rich; New Jersey is small but
  sits between New York and Philadelphia; Massachusetts has ports and militia; Rhode Island has a navy and little else.
- Win by uniting the colonies under your state's flag. Then a second stage opens: the 1775 world map, where
  your new nation faces Britain, France, Spain and the rest.
- What carries over from the campaigns: generals with loyalty and letters, the treasury and inflation, terrain,
  winter, the "Did you know?" notes (about the real states).

### Mode 2: Historical Conquests

Start from a real moment, with the real powers and borders, and play it out your way.

| Era | Start | Sides |
|---|---|---|
| The Revolution | 1775 | Britain, the United States, France, Spain, the Dutch Republic, Native nations |
| The War of 1812 | 1812 | The United States, Britain and Canada, Tecumseh's confederacy; Napoleon's Europe in the background |
| Texas and Mexico | 1836 / 1846 | The United States, Mexico, the Republic of Texas, Comanche and other Native nations |
| The Civil War | 1861 | The Union and the Confederacy, with Britain and France deciding whether to step in |
| The Spanish–American War | 1898 | The United States and Spain, in Cuba, Puerto Rico and the Philippines (Roosevelt's Rough Riders, Dewey at Manila Bay) |

Nothing later than 1898. Each era adds its own weapons (smoothbore muskets → rifled muskets → repeating rifles,
sail → steam and ironclads), its own money problems (Continentals, greenbacks), and its own history notes.

Handle the hard parts of these wars honestly: Native nations are real, playable powers, not obstacles; slavery is
named as the cause of the Civil War; no side is glorified.

### What has to change in the code

1. **More than two sides.** The rules assume Patriots versus British (`"P"` and `"B"`). Conquest needs any number
   of factions, each with its own treasury, generals and AI. This is the biggest piece of work, and it should
   happen first, with the simulator (`tools/simulate.mjs`) proving the 1776 campaign still plays the same.
2. **Maps as data.** `geo.js` and `regions.js` hold one map. Move each map into its own data file so the
   colonies map, the world map and later maps can share the same drawing code.
3. **A simple diplomacy layer.** Peace, alliance and war between computer powers, so a world map isn't
   everyone against you.
4. **AI for many sides.** Reuse the British AI's scoring, aimed at "grow and survive" instead of "take Philadelphia".

## Voices

Ideas for having historical figures speak their letters:

- **Recorded by real people (recommended).** Friends, a theater club or classmates record 20–30 short lines
  (Washington's first letter, Arnold's complaint, Franklin from Paris...). It's free, sounds human, the
  rights are clear with a simple written OK from each person, and it makes a good story to tell in interviews.
- **AI voice services.** Quick and good quality, but most cost money, and their terms need checking for a
  published game. Never imitate a real actor's voice.
- **The browser's built-in speech.** Free and already available, but robotic. Fine as a test, not for release.

Plan: script the lines in December, record them over winter break, and add a voice toggle to the menu.

## Other ideas worth keeping

- A **history book** screen collecting every "Did you know?" note you've unlocked.
- **Achievements**: "Hold Philadelphia without printing money", "Win with Arnold loyal", and so on.
- **Daily challenge**: the same random seed for everyone, compare scores.
- **Arnold's treason** across campaigns, depending on how you treated him.
