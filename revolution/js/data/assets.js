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
  // Lines starting with // are paintings picked out but not downloaded yet (Wikimedia was rate-limiting);
  // those generals use the drawn bust until the file is added and the line is uncommented.
  washington: "img/portraits/washington.jpg", // Charles Willson Peale, 1776
  greene:     "img/portraits/greene.jpg",     // Charles Willson Peale, 1783
  // knox:       "img/portraits/knox.jpg",       // Gilbert Stuart, 1806
  // putnam:     "img/portraits/putnam.jpg",     // after John Trumbull
  // lee:        "img/portraits/lee.jpg",        // German engraving, 1778
  arnold:     "img/portraits/arnold.jpg",     // H. B. Hall engraving after John Trumbull
  sullivan:   "img/portraits/sullivan.jpg",   // mezzotint after Thomas Hart, 1776
  // stirling:   "img/portraits/stirling.jpg",   // 19th-century engraving
  // howe:       "img/portraits/howe.jpg",       // Richard Purcell mezzotint, 1777
  // cornwallis: "img/portraits/cornwallis.jpg", // Thomas Gainsborough
  // clinton:    "img/portraits/clinton.jpg",    // engraving after John Smart, 1780
  carleton:   "img/portraits/carleton.jpg",   // unknown artist, about 1760
  rall:       "img/portraits/rall.jpg",       // detail of John Trumbull's study for the Battle of Trenton
  // heister: no public-domain portrait found yet; the drawn bust is used.
};

export const SCENES = {
  fleet:       "img/scenes/fleet.jpg",       // Archibald Robertson, the fleet at the Narrows, 12 July 1776
  declaration: "img/scenes/declaration.jpg", // John Trumbull, Declaration of Independence (1819)
  crossing:    "img/scenes/crossing.jpg",    // Emanuel Leutze, Washington Crossing the Delaware (1851)
  winter:      "img/scenes/winter.jpg",      // William B. T. Trego, The March to Valley Forge (1883)
  victory:     "img/scenes/victory.jpg",     // John Trumbull, The Capture of the Hessians at Trenton
  // defeat: no painting yet; the drawn art is used.
};
