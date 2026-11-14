// Regions of the northern colonies. `seed` is [longitude, latitude] and sets where the region sits on the map.
// city: worth more income and gives defenders an edge. fort: a strong defensive position.
// terrain: hills (defenders +20%) or forest (defenders +10%); in either, militia fight nearly as well as regulars.
// coastal: the Royal Navy can land troops here. income: Continental dollars ($ thousands) per month at full support.

export const REGIONS = {
  stjohns:      { name: "St. Johns", terrain: "forest",       seed: [-73.6, 44.95], income: 2, coastal: false, note: "Gateway to Canada" },
  ticonderoga:  { name: "Ticonderoga", terrain: "forest",     seed: [-73.6, 43.95], income: 2, fort: true },
  bennington:   { name: "Bennington", terrain: "hills",      seed: [-73.0, 43.0],  income: 4 },
  newhampshire: { name: "New Hampshire", terrain: "hills",   seed: [-71.6, 43.6],  income: 5, coastal: true },
  mohawk:       { name: "Mohawk Valley", terrain: "forest",   seed: [-75.2, 43.1],  income: 3 },
  albany:       { name: "Albany",          seed: [-74.0, 42.6],  income: 6, city: true },
  springfield:  { name: "Springfield", terrain: "hills",     seed: [-72.5, 42.3],  income: 5 },
  boston:       { name: "Boston",          seed: [-71.2, 42.4],  income: 12, city: true, coastal: true },
  rhodeisland:  { name: "Rhode Island",    seed: [-71.45, 41.7], income: 7, city: true, coastal: true },
  connecticut:  { name: "Connecticut",     seed: [-72.75, 41.55], income: 8, coastal: true },
  kingston:     { name: "Kingston", terrain: "hills",        seed: [-74.45, 41.85], income: 4 },
  highlands:    { name: "Hudson Highlands", terrain: "hills", seed: [-73.95, 41.38], income: 3, fort: true },
  westchester:  { name: "Westchester",     seed: [-73.7, 41.05], income: 4, coastal: true },
  manhattan:    { name: "New York City",   seed: [-73.97, 40.79], island: true, income: 14, city: true, coastal: true },
  longisland:   { name: "Long Island",     seed: [-73.2, 40.78], island: true, income: 6, coastal: true },
  statenisland: { name: "Staten Island",   seed: [-74.14, 40.57], island: true, income: 2, coastal: true },
  hackensack:   { name: "Fort Lee",        seed: [-74.15, 40.98], income: 3, fort: true, coastal: true },
  morristown:   { name: "Morristown", terrain: "hills",      seed: [-74.6, 40.9],  income: 3 },
  newark:       { name: "Newark",          seed: [-74.3, 40.68], income: 4, coastal: true },
  newbrunswick: { name: "New Brunswick",   seed: [-74.45, 40.42], income: 4, coastal: true },
  princeton:    { name: "Princeton",       seed: [-74.65, 40.32], income: 3 },
  trenton:      { name: "Trenton",         seed: [-74.65, 40.08], income: 3, city: true },
  southjersey:  { name: "South Jersey", terrain: "forest",    seed: [-74.7, 39.55], income: 4, coastal: true },
  easton:       { name: "Easton", terrain: "hills",          seed: [-75.3, 40.75], income: 3 },
  wyoming:      { name: "Wyoming Valley", terrain: "forest",  seed: [-76.2, 41.6],  income: 2 },
  bucks:        { name: "Bucks County",    seed: [-75.1, 40.32], income: 4 },
  philadelphia: { name: "Philadelphia",    seed: [-75.2, 39.97], income: 18, city: true, coastal: true },
  chester:      { name: "Chester County",  seed: [-75.7, 40.05], income: 5 },
  lancaster:    { name: "Lancaster",       seed: [-76.4, 40.1],  income: 6 },
  wilmington:   { name: "Wilmington",      seed: [-75.65, 39.6], income: 4, coastal: true },
  frederick:    { name: "Frederick", terrain: "hills",       seed: [-77.5, 39.55], income: 4 },
  baltimore:    { name: "Baltimore",       seed: [-76.7, 39.25], income: 9, city: true, coastal: true },
  delmarva:     { name: "Eastern Shore", terrain: "forest",   seed: [-75.55, 38.55], income: 4, coastal: true },
  virginia:     { name: "Northern Virginia", seed: [-77.3, 38.1], income: 7, coastal: true },
};

// Which regions border each other. `water` marks a crossing over a river or harbor, which slows an attack.
const LINKS = [
  ["stjohns", "ticonderoga"],
  ["ticonderoga", "bennington"], ["ticonderoga", "albany"], ["ticonderoga", "mohawk"], ["ticonderoga", "newhampshire"],
  ["bennington", "albany"], ["bennington", "springfield"], ["bennington", "newhampshire"],
  ["newhampshire", "boston"], ["newhampshire", "springfield"],
  ["mohawk", "albany"], ["mohawk", "kingston"], ["mohawk", "wyoming"],
  ["albany", "kingston"], ["albany", "springfield"], ["albany", "highlands"],
  ["springfield", "boston"], ["springfield", "connecticut"], ["springfield", "rhodeisland"], ["springfield", "highlands"],
  ["boston", "rhodeisland"],
  ["rhodeisland", "connecticut"],
  ["connecticut", "westchester"], ["connecticut", "highlands"], ["connecticut", "longisland", "water"],
  ["kingston", "highlands"], ["kingston", "morristown"], ["kingston", "easton"], ["kingston", "wyoming"],
  ["highlands", "westchester"], ["highlands", "hackensack", "water"], ["highlands", "morristown"],
  ["westchester", "manhattan", "water"], ["westchester", "longisland", "water"],
  ["manhattan", "longisland", "water"], ["manhattan", "hackensack", "water"], ["manhattan", "statenisland", "water"],
  ["longisland", "statenisland", "water"],
  ["statenisland", "newark", "water"], ["statenisland", "newbrunswick", "water"],
  ["hackensack", "morristown"], ["hackensack", "newark"],
  ["morristown", "newark"], ["morristown", "newbrunswick"], ["morristown", "princeton"], ["morristown", "easton"],
  ["newark", "newbrunswick"],
  ["newbrunswick", "princeton"], ["newbrunswick", "southjersey"],
  ["princeton", "trenton"], ["princeton", "southjersey"], ["princeton", "easton"],
  ["trenton", "southjersey"], ["trenton", "bucks", "water"], ["trenton", "philadelphia", "water"],
  ["southjersey", "philadelphia", "water"], ["southjersey", "wilmington", "water"],
  ["easton", "bucks"], ["easton", "wyoming"], ["easton", "chester"],
  ["wyoming", "lancaster"], ["wyoming", "chester"],
  ["bucks", "philadelphia"], ["bucks", "chester"],
  ["philadelphia", "chester"], ["philadelphia", "wilmington"],
  ["chester", "lancaster"], ["chester", "wilmington"],
  ["lancaster", "frederick"], ["lancaster", "baltimore"], ["lancaster", "wilmington"],
  ["wilmington", "baltimore"], ["wilmington", "delmarva"],
  ["frederick", "baltimore"], ["frederick", "virginia"],
  ["baltimore", "virginia"], ["baltimore", "delmarva", "water"],
];

export const ADJ = {};
export const WATER = new Set();
for (const id of Object.keys(REGIONS)) ADJ[id] = [];
for (const [a, b, kind] of LINKS) {
  if (!REGIONS[a] || !REGIONS[b]) throw new Error("Unknown region in link: " + a + "-" + b);
  ADJ[a].push(b);
  ADJ[b].push(a);
  if (kind === "water") { WATER.add(a + "|" + b); WATER.add(b + "|" + a); }
}

export const isWaterCrossing = (a, b) => WATER.has(a + "|" + b);
