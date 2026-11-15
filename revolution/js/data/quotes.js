// Words of the era, shown while the British move and on the main menu.
// Only real quotes. When a line is traditional rather than documented, say "attributed".

export const QUOTES = [
  { text: "These are the times that try men's souls.", who: "Thomas Paine", when: "The American Crisis, December 1776" },
  { text: "The harder the conflict, the more glorious the triumph.", who: "Thomas Paine", when: "The American Crisis, December 1776" },
  { text: "We have it in our power to begin the world over again.", who: "Thomas Paine", when: "Common Sense, January 1776" },
  { text: "The fate of unborn millions will now depend, under God, on the courage and conduct of this army.", who: "George Washington", when: "General orders, July 1776" },
  { text: "Perseverance and spirit have done wonders in all ages.", who: "George Washington", when: "Letter, 1775" },
  { text: "Posterity! You will never know how much it cost the present generation to preserve your freedom!", who: "John Adams", when: "Letter to Abigail Adams, April 1777" },
  { text: "Remember the ladies, and be more generous and favourable to them than your ancestors.", who: "Abigail Adams", when: "Letter to John Adams, March 1776" },
  { text: "I am not a Virginian, but an American.", who: "Patrick Henry", when: "First Continental Congress, 1774" },
  { text: "Give me liberty, or give me death!", who: "Patrick Henry", when: "Virginia Convention, March 1775" },
  { text: "The die is now cast; the colonies must either submit or triumph.", who: "King George III", when: "Letter to Lord North, 1774" },
  { text: "Our cause is just. Our union is perfect.", who: "Second Continental Congress", when: "Declaration of the Causes of Taking Up Arms, July 1775" },
  { text: "We must all hang together, or most assuredly we shall all hang separately.", who: "Benjamin Franklin", when: "Attributed, 1776" },
  { text: "I only regret that I have but one life to lose for my country.", who: "Nathan Hale", when: "As reported, September 1776" },
  { text: "Victory or Death.", who: "Password of Washington's army", when: "Christmas night, 1776" },
  { text: "There are the redcoats, and they are ours, or Molly Stark sleeps a widow tonight!", who: "John Stark", when: "Attributed, Bennington, August 1777" },
  { text: "Nous y voici, and nothing now between us but Gates.", who: "Sir Henry Clinton", when: "Message to Burgoyne, October 1777" },
  { text: "I have not yet begun to fight!", who: "John Paul Jones", when: "Attributed, September 1779" },
  { text: "Don't fire until you see the whites of their eyes.", who: "Israel Putnam or William Prescott", when: "Attributed, Bunker Hill, June 1775" },
  { text: "These united Colonies are, and of right ought to be, free and independent States.", who: "Richard Henry Lee's resolution", when: "Adopted by Congress, July 2, 1776" },
];

export function randomQuote(exclude) {
  const pool = QUOTES.filter((q) => q !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}
