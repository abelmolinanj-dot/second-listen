// The campaign map: the war as a trail of missions, from Boston in 1775 to Yorktown in 1781.
// status "ready" missions can be played; "soon" ones show their briefing with a "coming" note.
// at: [longitude, latitude] of the marker. Markers outside the map's frame are pulled to its edge by the screen code.

export const MISSIONS = [
  {
    id: "1775", status: "soon", eta: "Coming in 2027",
    year: "1775", title: "The Siege of Boston", place: "Boston", at: [-71.1, 42.35],
    image: null,
    summary: "Shots at Lexington and Concord bring thousands of militia to the hills around Boston. Hold the British in the city, survive Bunker Hill, and get cannon onto Dorchester Heights.",
    objectives: ["Keep the British penned inside Boston", "Hold the heights around the city", "Force the British out by spring 1776"],
    difficulty: 1,
  },
  {
    id: "canada", status: "soon", eta: "Coming in 2027",
    year: "1775–76", title: "The Invasion of Canada", place: "Lake Champlain", at: [-73.35, 44.6],
    image: null,
    summary: "Two American armies march on Quebec, one up Lake Champlain and one through the Maine wilderness under Benedict Arnold. Take Canada before winter, or lose everything trying.",
    objectives: ["Capture Montreal", "Take Quebec before the British fleet arrives in spring", "Bring Arnold's column through alive"],
    difficulty: 3,
  },
  {
    id: "1776", status: "ready", scenario: "1776",
    year: "1776–77", title: "The Campaign of 1776", place: "New York and New Jersey", at: [-74.0, 40.72],
    image: "img/scenes/fleet.jpg",
    summary: "The largest fleet Britain has ever sent across the ocean is anchoring off Staten Island. Keep Washington's army alive, keep Philadelphia, and keep the Cause burning until summer.",
    objectives: ["Washington must not be captured", "Hold Philadelphia when June 1777 ends", "Don't let the Cause fall to zero"],
    difficulty: 2,
    length: "12 months · about 30 to 45 minutes",
    guide: true,
  },
  {
    id: "saratoga", status: "ready", scenario: "saratoga",
    year: "1777", title: "Saratoga", place: "The Hudson Valley", at: [-73.65, 43.05],
    image: "img/scenes/saratoga.jpg",
    summary: "General Burgoyne is coming down Lake Champlain with 8,000 men to take Albany and cut New England off from the other states. You command the Northern Department. Stop him in the forests of the upper Hudson, and France may join the war.",
    objectives: ["3 stars: force Burgoyne to surrender, or destroy his army", "2 stars: hold Albany and break Burgoyne (half strength, or pushed back past Saratoga)", "1 star: hold Albany to the end of November"],
    difficulty: 2,
    length: "6 months · about 20 to 30 minutes",
  },
  {
    id: "philadelphia", status: "soon", eta: "Coming in 2027",
    year: "1777", title: "The Philadelphia Campaign", place: "Brandywine", at: [-75.75, 39.75], label: "below",
    image: null,
    summary: "Howe sails up the Chesapeake to take the capital. Fight him at the Brandywine and Germantown, and keep Congress out of his hands.",
    objectives: ["Defend Philadelphia", "Keep Congress free", "Keep the army in one piece for the winter"],
    difficulty: 3,
  },
  {
    id: "valleyforge", status: "soon", eta: "Coming in 2027",
    year: "1778", title: "Valley Forge and Monmouth", place: "Valley Forge", at: [-75.45, 40.1],
    image: "img/scenes/winter.jpg",
    summary: "Get the army through a starving winter, let Baron von Steuben drill it into shape, and strike the British as they leave Philadelphia.",
    objectives: ["Keep the army alive through the winter", "Train your regiments with Steuben", "Catch the British at Monmouth"],
    difficulty: 3,
  },
  {
    id: "south", status: "soon", eta: "Coming in 2027",
    year: "1780–81", title: "The Southern Campaign", place: "The Carolinas", at: [-77.55, 37.05], edge: "To the Carolinas", label: "above",
    image: null,
    summary: "Charleston has fallen and Cornwallis is loose in the South. Nathanael Greene must lose battles slowly enough to win the war.",
    objectives: ["Rebuild the southern army", "Wear Cornwallis down", "Win at Cowpens"],
    difficulty: 3,
  },
  {
    id: "yorktown", status: "soon", eta: "Coming in 2027",
    year: "1781", title: "Yorktown", place: "Virginia", at: [-76.5, 37.24],
    image: null,
    summary: "Cornwallis has dug in at Yorktown with his back to the sea. With the French army beside you and the French fleet offshore, finish the war.",
    objectives: ["March from New York to Virginia without being noticed", "Keep the French fleet in the bay", "Force Cornwallis to surrender"],
    difficulty: 2,
  },
];

// Stars for a finished campaign, from how it ended.
export function starsFor(gameOver) {
  if (!gameOver) return 0;
  if (typeof gameOver.stars === "number") return gameOver.stars;
  if (gameOver.title === "A glorious year") return 3;
  if (gameOver.result === "victory") return 2;
  if (gameOver.result === "survived") return 1;
  return 0;
}
