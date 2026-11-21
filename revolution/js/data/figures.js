// Everyone who appears in the game: generals, Founding Fathers and other figures.
// role: shown under their name on letters. bio: who they were. after: what became of them.
// Keep every line true. Generals' fighting ratings live in generals.js; this file is about the people.

export const FIGURES = {
  // ----- Continental Army -----
  washington: {
    group: "P", name: "George Washington", role: "Commander in Chief, Continental Army", life: "1732 to 1799",
    bio: "A Virginia planter and surveyor who learned soldiering in the French and Indian War. Congress chose him to command the army in June 1775, partly because a Virginian would bind the South to a war that began in New England. He lost more battles than he won, but he kept the army alive, and that was what mattered.",
    after: "He resigned his command in 1783, presided over the Constitutional Convention in 1787, and became the first President of the United States.",
  },
  greene: {
    group: "P", name: "Nathanael Greene", role: "Major General", life: "1742 to 1786",
    bio: "A Rhode Island ironworker's son, raised a Quaker, who taught himself war from books. He started the war as a private in the militia and rose to be Washington's most trusted general. He also served as Quartermaster General, keeping a starving army supplied.",
    after: "In 1780 he took command in the South and won the campaign without winning a battle, wearing Cornwallis down until the British left the Carolinas.",
  },
  knox: {
    group: "P", name: "Henry Knox", role: "Chief of Artillery", life: "1750 to 1806",
    bio: "A Boston bookseller who read every book on artillery he sold. In the winter of 1775 to 1776 he dragged about sixty tons of captured cannon from Ticonderoga to Boston on ox sleds, and the British left the city soon after.",
    after: "He became the first Secretary of War under the Constitution.",
  },
  putnam: {
    group: "P", name: "Israel Putnam", role: "Major General", life: "1718 to 1790",
    bio: "\"Old Put,\" a Connecticut farmer and veteran of the French and Indian War, famous for leaving his plow in the field when he heard about Lexington. Brave and popular, but out of his depth commanding large armies.",
    after: "A stroke ended his service in 1779.",
  },
  lee: {
    group: "P", name: "Charles Lee", role: "Major General", life: "1732 to 1782",
    bio: "A former British officer who had fought in Portugal, Poland and America. Many in Congress thought he, not Washington, should command. He was proud, sharp-tongued and sloppy, and in December 1776 British dragoons captured him at a tavern far from his troops.",
    after: "Exchanged in 1778, he ordered a confused retreat at Monmouth, was court-martialed, and was dismissed from the army.",
  },
  arnold: {
    group: "P", name: "Benedict Arnold", role: "Major General", life: "1741 to 1801",
    bio: "A Connecticut merchant and the boldest fighting general the Americans had. He helped take Ticonderoga, marched through the Maine wilderness to Quebec, built a fleet on Lake Champlain, and was the hero of Saratoga. He was also touchy, in debt, and furious at being passed over.",
    after: "In 1780 he tried to hand West Point to the British for money and a British general's commission. His name became the American word for traitor.",
  },
  sullivan: {
    group: "P", name: "John Sullivan", role: "Major General", life: "1740 to 1795",
    bio: "A New Hampshire lawyer who was captured at Long Island in 1776 and exchanged soon after. Brave but unlucky, he was blamed for more than one lost battle.",
    after: "He led a campaign against the Iroquois in 1779 and later became governor of New Hampshire.",
  },
  stirling: {
    group: "P", name: "William Alexander, Lord Stirling", role: "Major General", life: "1726 to 1783",
    bio: "A New Jersey gentleman who claimed a Scottish earldom the House of Lords never granted. At Long Island he held off the British with a few hundred Marylanders long enough for much of the army to escape, and was captured doing it.",
    after: "He served to the end of the war and died just months before the peace treaty was signed.",
  },
  gates: {
    group: "P", name: "Horatio Gates", role: "Commander, Northern Department", life: "1727 to 1806",
    bio: "A former British officer, popular with New England and with Congress, who was better at organizing than fighting. He took command against Burgoyne in August 1777 and got the credit for Saratoga, much of it earned by Arnold and Morgan.",
    after: "Some officers wanted him to replace Washington. In 1780 Congress sent him south, where his army was routed at Camden.",
  },
  schuyler: {
    group: "P", name: "Philip Schuyler", role: "Major General", life: "1733 to 1804",
    bio: "A wealthy New York landowner from Albany who commanded the Northern Department until Congress replaced him with Gates. His axemen slowed Burgoyne badly, but New Englanders distrusted him, and he was blamed for losing Ticonderoga.",
    after: "He became a United States Senator. His daughter Elizabeth married Alexander Hamilton.",
  },
  stclair: {
    group: "P", name: "Arthur St. Clair", role: "Major General", life: "1736 to 1818",
    bio: "A Scottish-born former British officer who settled in Pennsylvania. In July 1777 he abandoned Ticonderoga rather than lose its garrison. The country was outraged, but a court-martial cleared him.",
    after: "He became President of Congress in 1787 and the first governor of the Northwest Territory.",
  },
  stark: {
    group: "P", name: "John Stark", role: "Brigadier General, New Hampshire", life: "1728 to 1822",
    bio: "A New Hampshire frontiersman and veteran of Rogers' Rangers who fought at Bunker Hill. Passed over for promotion, he resigned from the Continental Army, then led New Hampshire's militia to a crushing victory at Bennington.",
    after: "He lived to 93. New Hampshire's motto, \"Live Free or Die,\" comes from a toast he wrote in 1809.",
  },
  morgan: {
    group: "P", name: "Daniel Morgan", role: "Colonel of Riflemen", life: "1736 to 1802",
    bio: "A Virginia wagon driver who still carried scars from a flogging he got while driving wagons for the British army in 1756. His riflemen in hunting shirts were the deadliest marksmen in the war, and they picked off Burgoyne's officers at Saratoga.",
    after: "In January 1781 he won the Battle of Cowpens, one of the most complete American victories of the war.",
  },

  kosciuszko: {
    group: "P", name: "Thaddeus Kosciuszko", role: "Colonel of Engineers, volunteer from Poland", life: "1746 to 1817",
    bio: "A Polish-Lithuanian officer trained as a military engineer in France, who came to America in 1776. He chose and fortified Bemis Heights, where Burgoyne's army was stopped, and later designed the fortress at West Point.",
    after: "He led a national uprising in Poland in 1794. In his will he asked that his American money be used to free and educate enslaved people. Thomas Jefferson, his executor, never carried it out.",
  },
  steuben: {
    group: "P", name: "Baron Friedrich Wilhelm von Steuben", role: "Inspector General, volunteer from Prussia", life: "1730 to 1794",
    bio: "A former Prussian staff officer who arrived at Valley Forge in February 1778, speaking almost no English. He drilled the starving army himself, swearing in three languages, and turned it into soldiers who could stand against British regulars.",
    after: "His drill manual, the \"Blue Book,\" was used by the army for decades. He became an American citizen and settled in New York.",
  },
  pulaski: {
    group: "P", name: "Casimir Pulaski", role: "General of Cavalry, volunteer from Poland", life: "1745 to 1779",
    bio: "A Polish cavalry commander who had fought against Russia and came to America on Benjamin Franklin's recommendation. At the Brandywine in 1777 he led a charge that helped cover the army's retreat.",
    after: "Often called the father of the American cavalry, he was mortally wounded at Savannah in 1779.",
  },

  // ----- The Crown -----
  howe: {
    group: "B", name: "Sir William Howe", role: "Commander in Chief, British Army", life: "1729 to 1814",
    bio: "A brave officer who led the bloody assault at Bunker Hill, and perhaps never forgot it. He beat Washington again and again in 1776 and 1777 but never destroyed his army. Some in Britain believed he hoped for a peace that would keep the colonies without crushing them.",
    after: "He resigned in 1778 after taking Philadelphia, and defended his conduct before Parliament.",
  },
  cornwallis: {
    group: "B", name: "Charles Cornwallis", role: "Lieutenant General", life: "1738 to 1805",
    bio: "An earl who voted against taxing the colonies but fought for the King anyway. He was Britain's most energetic general in America, always wanting to attack.",
    after: "He surrendered his army at Yorktown in 1781, then went on to govern India and Ireland.",
  },
  clinton: {
    group: "B", name: "Sir Henry Clinton", role: "Lieutenant General", life: "1730 to 1795",
    bio: "A careful, prickly planner who quarreled with almost every other British general. He was raised partly in New York, where his father had been governor.",
    after: "He replaced Howe as commander in chief in 1778 and blamed Cornwallis for Yorktown for the rest of his life.",
  },
  carleton: {
    group: "B", name: "Sir Guy Carleton", role: "Governor of Quebec", life: "1724 to 1808",
    bio: "The governor who held Quebec against the American attack on the last night of 1775. Humane and careful, he sent captured Americans home and was passed over for the 1777 invasion in favor of Burgoyne.",
    after: "He was the last British commander in New York and made sure thousands of Black Loyalists who had escaped slavery were evacuated as free people.",
  },
  heister: {
    group: "B", name: "Leopold Philip von Heister", role: "Commander of the Hessians", life: "1716 to 1777",
    bio: "An old soldier from Hesse-Kassel who led the first German regiments sent to America and fought at Long Island in 1776.",
    after: "He was recalled to Germany in 1777 and died that year.",
  },
  rall: {
    group: "B", name: "Johann Rall", role: "Colonel, Hessian Brigade", life: "about 1726 to 1776",
    bio: "A tough Hessian colonel who fought well at White Plains and Fort Washington. He scorned the Americans and did not fortify Trenton.",
    after: "He was mortally wounded when Washington attacked Trenton on December 26, 1776.",
  },
  burgoyne: {
    group: "B", name: "John Burgoyne", role: "Lieutenant General", life: "1722 to 1792",
    bio: "\"Gentleman Johnny,\" a playwright, gambler and Member of Parliament who sold London on a plan to cut New England off by marching down from Canada. His soldiers liked him because he treated them well.",
    after: "He surrendered at Saratoga in October 1777 and went home to write plays. His comedy The Heiress was a hit in 1786.",
  },
  wayne: {
    group: "P", name: "Anthony Wayne", role: "Brigadier General, Pennsylvania", life: "1745 to 1796",
    bio: "A Pennsylvania tanner and surveyor who became one of the boldest brigade commanders in the army. His men were surprised in a night bayonet attack at Paoli in September 1777, and he fought hard at Brandywine and Germantown.",
    after: "His bayonet assault on Stony Point in 1779 made him famous as \"Mad Anthony.\" In 1794 he won the Battle of Fallen Timbers in Ohio.",
  },
  knyphausen: {
    group: "B", name: "Wilhelm von Knyphausen", role: "Lieutenant General, Hessian corps", life: "1716 to 1800",
    bio: "A veteran German general who took over the Hessian troops in America in 1777. At the Brandywine he made the frontal attack at Chadds Ford while Howe marched around the American flank.",
    after: "He commanded at New York while Clinton was away in the south, and went home in 1782.",
  },
  grey: {
    group: "B", name: "Charles Grey", role: "Major General", life: "1729 to 1807",
    bio: "A British officer who led the night attack on Wayne's camp at Paoli in September 1777, ordering his men to take the flints from their muskets so no shot would give them away. It earned him the nickname \"No-flint\" Grey.",
    after: "He was made an earl. His son, the second Earl Grey, became prime minister, and Earl Grey tea is named after the son.",
  },

  fraser: {
    group: "B", name: "Simon Fraser", role: "Brigadier General", life: "1729 to 1777",
    bio: "A Scottish officer who led Burgoyne's advance guard and was the best field commander in his army.",
    after: "He was shot by an American rifleman at Bemis Heights on October 7, 1777, and died the next day.",
  },
  riedesel: {
    group: "B", name: "Baron Friedrich Adolf von Riedesel", role: "Major General, Brunswick Troops", life: "1738 to 1800",
    bio: "Commander of the German troops from Brunswick in Burgoyne's army. His wife Frederika came along with their three small daughters and kept a journal of the campaign that is still read today.",
    after: "He spent years as a prisoner of war with his family, and is said to have held one of the first Christmas tree celebrations in America.",
  },
  stleger: {
    group: "B", name: "Barry St. Leger", role: "Lieutenant Colonel", life: "1733 to 1789",
    bio: "Led a mixed force of British regulars, Loyalists and Iroquois allies east from Lake Ontario to besiege Fort Stanwix in 1777.",
    after: "When his allies left, he gave up the siege and retreated to Canada.",
  },

  // ----- Founders and others -----
  congress: {
    group: "F", name: "John Hancock", role: "President of Congress", life: "1737 to 1793",
    bio: "One of the richest merchants in Boston and a hero to the Sons of Liberty. As President of Congress he signed the Declaration first, in a famously large hand.",
    after: "He became the first governor of the state of Massachusetts.",
  },
  franklin: {
    group: "F", name: "Benjamin Franklin", role: "Commissioner to France", life: "1706 to 1790",
    bio: "Printer, scientist, writer and the most famous American in the world. At seventy he crossed the Atlantic in winter to win French help, and charmed Paris in a plain coat and fur cap.",
    after: "He signed the treaty of alliance with France in 1778 and the peace treaty with Britain in 1783.",
  },
  jadams: {
    group: "F", name: "John Adams", role: "Delegate from Massachusetts, Board of War", life: "1735 to 1826",
    bio: "A blunt Massachusetts lawyer who pushed Congress toward independence and nominated Washington to command the army. He chaired the Board of War in 1776 and 1777 and worked himself nearly to collapse.",
    after: "He became the first Vice President and the second President of the United States, and died on July 4, 1826, the same day as Jefferson.",
  },
  samadams: {
    group: "F", name: "Samuel Adams", role: "Delegate from Massachusetts", life: "1722 to 1803",
    bio: "John Adams's older cousin, a Boston organizer who did more than anyone to turn protest into revolution. He was a master of newspapers, committees and crowds.",
    after: "He later served as governor of Massachusetts.",
  },
  hamilton: {
    group: "F", name: "Alexander Hamilton", role: "Aide-de-camp to General Washington", life: "1755 or 1757 to 1804",
    bio: "A brilliant young immigrant from the West Indies who commanded an artillery company in 1776 and joined Washington's staff in 1777. He wrote many of Washington's letters.",
    after: "He became the first Secretary of the Treasury and was killed in a duel with Aaron Burr.",
  },
  lafayette: {
    group: "P", name: "Marquis de Lafayette", role: "Major General, volunteer from France", life: "1757 to 1834",
    bio: "A rich French nobleman who bought his own ship and sailed to America at nineteen to join the cause. Congress made him a major general, and he became like a son to Washington.",
    after: "He helped trap Cornwallis at Yorktown, and later played a part in the French Revolution.",
  },
  morris: {
    group: "F", name: "Robert Morris", role: "Philadelphia merchant, Congress", life: "1734 to 1806",
    bio: "The richest merchant in Philadelphia, who used his own credit to keep the army supplied when Continental money was worthless.",
    after: "As Superintendent of Finance from 1781 he found the money for Yorktown. He ended up in debtors' prison.",
  },
  jay: {
    group: "F", name: "John Jay", role: "New York Committee of Safety", life: "1745 to 1829",
    bio: "A careful New York lawyer who helped write New York's first state constitution in the spring of 1777, while Burgoyne was preparing his invasion.",
    after: "He helped negotiate the peace treaty of 1783 and became the first Chief Justice of the United States.",
  },
  paine: {
    group: "F", name: "Thomas Paine", role: "Writer, aide to General Greene", life: "1737 to 1809",
    bio: "An English corset-maker and failed tax collector who came to Philadelphia in 1774. His pamphlet Common Sense, in January 1776, argued for independence in plain words anyone could follow, and sold in enormous numbers. He marched with the army in the retreat across New Jersey.",
    after: "He wrote The Rights of Man in defense of the French Revolution, was nearly executed in Paris, and died poor in New York.",
  },
  mwashington: {
    group: "F", name: "Martha Washington", role: "With the army in winter quarters", life: "1731 to 1802",
    bio: "A wealthy Virginia widow who married George Washington in 1759. She spent every winter of the war in camp with him, from Cambridge to Valley Forge and Morristown, organizing officers' wives to knit, mend and nurse.",
    after: "She became the first First Lady, though the title came later.",
  },
  spy: { group: "X", name: "A friend behind the lines", role: "Intelligence", bio: "", after: "" },
  soldier: { group: "X", name: "A soldier in the ranks", role: "", bio: "", after: "" },
  colonel: { group: "X", name: "The colonel commanding", role: "", bio: "", after: "" },
};

export const FIGURE_GROUPS = [
  { id: "P", label: "Continental Army" },
  { id: "B", label: "The Crown" },
  { id: "F", label: "Founders" },
];
