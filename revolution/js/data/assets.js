// Image files the game uses when they exist. Until an entry is filled in, the game draws its own art.
//
// Put portraits in img/portraits/ and scene paintings in img/scenes/, then list them here, for example:
//   washington: "img/portraits/washington.jpg",
//
// Only use images we're allowed to use: paintings made before 1900 are in the public domain, and so are
// faithful photographs of them (Wikimedia Commons has most of these). Photos you took yourself are fine too.
// Avoid images from movies, TV, other games or modern illustrators unless you have permission.
// Record where each image came from in img/CREDITS.md.

export const PORTRAITS = {
  // Suggested public-domain sources (all on Wikimedia Commons):
  // washington: Charles Willson Peale, George Washington (1776)
  // greene:     Charles Willson Peale, Nathanael Greene (1783)
  // knox:       Gilbert Stuart, Henry Knox (c. 1805)
  // putnam:     John Trumbull, Israel Putnam (study)
  // lee:        Charles Lee caricature (1776 engraving)
  // arnold:     Benedict Arnold engraving after Pierre Eugène du Simitière (1783)
  // sullivan:   Richard Morrell Staigg, John Sullivan
  // stirling:   Bass Otis, William Alexander, Lord Stirling
  // howe:       Richard Purcell, Sir William Howe (1777 mezzotint)
  // cornwallis: Thomas Gainsborough, Charles Cornwallis (1783)
  // clinton:    Andrea Soldi, Henry Clinton (c. 1762)
  // carleton:   Guy Carleton portrait (Library and Archives Canada)
};

export const SCENES = {
  // fleet:       Dominic Serres or other period paintings of the British fleet at New York
  // declaration: John Trumbull, Declaration of Independence (1818)
  // crossing:    Emanuel Leutze, Washington Crossing the Delaware (1851)
  // winter:      William B. T. Trego, The March to Valley Forge (1883)
  // victory:     John Trumbull, The Capture of the Hessians at Trenton (1828)
};
