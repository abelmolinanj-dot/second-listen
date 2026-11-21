// Image files the game uses. A general or scene without an entry here keeps the game's own drawn art.
//
// Portraits go in img/portraits/ (256px squares cropped to head and shoulders) and scene paintings in
// img/scenes/ (about 1280px wide). List each one here, for example:
//   washington: "img/portraits/washington.jpg",
//
// Only use images we're allowed to use: paintings made before 1900 are in the public domain, and so are
// faithful photographs of them (Wikimedia Commons has most of these). Photos you took yourself are fine too.
// Avoid images from movies, TV, other games or modern illustrators unless you have permission.
// Record where each image came from in img/CREDITS.md.

export const PORTRAITS = {
  washington: "img/portraits/washington.jpg", // Charles Willson Peale, 1776
  greene:     "img/portraits/greene.jpg",     // Charles Willson Peale, 1783
  knox:       "img/portraits/knox.jpg",       // Gilbert Stuart, 1806
  putnam:     "img/portraits/putnam.jpg",     // after John Trumbull
  lee:        "img/portraits/lee.jpg",        // German engraving, 1778
  arnold:     "img/portraits/arnold.jpg",     // H. B. Hall engraving after John Trumbull
  sullivan:   "img/portraits/sullivan.jpg",   // mezzotint after Thomas Hart, 1776
  stirling:   "img/portraits/stirling.jpg",   // 19th-century engraving
  howe:       "img/portraits/howe.jpg",       // Richard Purcell mezzotint, 1777
  cornwallis: "img/portraits/cornwallis.jpg", // Thomas Gainsborough
  clinton:    "img/portraits/clinton.jpg",    // engraving after John Smart, 1780
  carleton:   "img/portraits/carleton.jpg",   // unknown artist, about 1760
  rall:       "img/portraits/rall.jpg",       // detail of John Trumbull's study for the Battle of Trenton
  // Saratoga, 1777
  gates:      "img/portraits/gates.jpg",      // Gilbert Stuart, about 1793
  schuyler:   "img/portraits/schuyler.jpg",   // engraving by T. Kelly after John Trumbull
  stclair:    "img/portraits/stclair.jpg",    // Charles Willson Peale, about 1780
  stark:      "img/portraits/stark.jpg",      // Ulysses Dow Tenney, about 1790
  morgan:     "img/portraits/morgan.jpg",     // Charles Willson Peale, about 1794
  burgoyne:   "img/portraits/burgoyne.jpg",   // Joshua Reynolds, about 1766
  fraser:     "img/portraits/fraser.jpg",     // engraving (New York Public Library)
  riedesel:   "img/portraits/riedesel.jpg",   // engraving, 1856
  stleger:    "img/portraits/stleger.jpg",    // engraving, 1794
  // Philadelphia, 1777
  wayne:      "img/portraits/wayne.jpg",      // Charles Willson Peale, 1783
  knyphausen: "img/portraits/knyphausen.jpg", // engraving (New York Public Library)
  grey:       "img/portraits/grey.jpg",       // Joseph Collyer after Thomas Lawrence, 1797
  // Founders
  congress:   "img/portraits/congress.jpg",   // John Hancock, by John Singleton Copley, 1765
  franklin:   "img/portraits/franklin.jpg",   // Joseph-Siffred Duplessis, about 1785
  jadams:     "img/portraits/jadams.jpg",     // John Adams, by Mather Brown, 1788
  samadams:   "img/portraits/samadams.jpg",   // Samuel Adams, by John Singleton Copley, about 1772
  hamilton:   "img/portraits/hamilton.jpg",   // John Trumbull, about 1805
  lafayette:  "img/portraits/lafayette.jpg",  // Charles Willson Peale, 1779
  morris:     "img/portraits/morris.jpg",     // Charles Willson Peale, about 1782
  jay:        "img/portraits/jay.jpg",        // Gilbert Stuart, 1794
  paine:      "img/portraits/paine.jpg",      // Laurent Dabos, about 1792
  // Foreign volunteers and camp
  kosciuszko:  "img/portraits/kosciuszko.jpg",  // Josef Grassi, 1792
  steuben:     "img/portraits/steuben.jpg",     // Charles Willson Peale, 1780
  pulaski:     "img/portraits/pulaski.jpg",     // engraving, 1859
  mwashington: "img/portraits/mwashington.jpg", // Charles Willson Peale, print, after 1776
  // heister: no public-domain portrait found yet; the drawn bust is used.
};

// Period paintings of battles, by region, for the battle scenes and the attack screens. Any region without one
// uses the general victory or defeat painting. Add more as they are downloaded (credit them in img/CREDITS.md).
const B = (f) => `img/scenes/battles/${f}.jpg`;
export const BATTLE_PAINTINGS = {
  // New York and New Jersey, 1776 to 1777
  longisland: B("longisland"), manhattan: B("longisland"), statenisland: B("longisland"), hackensack: B("longisland"),
  westchester: B("bunkerhill"), trenton: "img/scenes/victory.jpg", princeton: B("princeton"),
  newbrunswick: B("monmouth"), newark: B("monmouth"), morristown: B("monmouth"), southjersey: B("monmouth"),
  // Pennsylvania, 1777
  philadelphia: B("germantown"), chester: B("brandywine"), wilmington: B("brandywine"), bucks: B("paoli"), lancaster: B("paoli"),
  delmarva: B("paoli"), baltimore: B("paoli"), easton: B("paoli"),
  // New England and the north
  boston: B("warren"), rhodeisland: B("warren"), connecticut: B("warren"), newhampshire: B("bunkerhill"),
  springfield: B("bunkerhill"), bennington: B("bunkerhill"), highlands: B("bunkerhill"), kingston: B("bunkerhill"),
};
export function battlePainting(regionId, won) {
  return BATTLE_PAINTINGS[regionId] || (won ? SCENES.victory : SCENES.defeat || SCENES.victory);
}

export const SCENES = {
  fleet:       "img/scenes/fleet.jpg",       // Archibald Robertson, the fleet at the Narrows, 12 July 1776
  declaration: "img/scenes/declaration.jpg", // John Trumbull, Declaration of Independence (1819)
  crossing:    "img/scenes/crossing.jpg",    // Emanuel Leutze, Washington Crossing the Delaware (1851)
  winter:      "img/scenes/winter.jpg",      // William B. T. Trego, The March to Valley Forge (1883)
  victory:     "img/scenes/victory.jpg",     // John Trumbull, The Capture of the Hessians at Trenton
  saratoga:    "img/scenes/saratoga.jpg",    // John Trumbull, Surrender of General Burgoyne (1821)
  defeat:      "img/scenes/battles/warren.jpg", // John Trumbull, The Death of General Warren at the Battle of Bunker's Hill (1786)
};
