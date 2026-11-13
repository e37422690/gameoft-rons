import { CARD_CATEGORIES, ERAS, GAME_MODES, PLAYER_ROLES, REGIONS } from '../data/categoriesAndEras';
import { CHARACTER_MAP, CHARACTERS, getRelationshipTierInfo } from '../data/characters';
import {
  CardCategoryId,
  CharacterMood,
  DifficultyId,
  EraId,
  GameEndSummary,
  GameLanguage,
  GameModeId,
  GameRunState,
  PlayerRoleId,
  RegionId,
  RelationshipTierId,
  ScenarioCard,
} from '../types/game';

const LS_LANGUAGE_KEY = 'got_tg_language_v1';

export function loadLanguage(): GameLanguage {
  try {
    const raw = localStorage.getItem(LS_LANGUAGE_KEY);
    if (raw === 'en' || raw === 'tr') return raw;
  } catch {
    // ignore
  }
  return 'tr';
}

export function saveLanguage(lang: GameLanguage): void {
  try {
    localStorage.setItem(LS_LANGUAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export const EN_DIFFICULTY_MODES: Record<
  DifficultyId,
  { id: DifficultyId; name: string; shortRule: string; description: string }
> = {
  easy: {
    id: 'easy',
    name: 'Easy Mode',
    shortRule: 'Max +10 Gain · Max -5 Drop',
    description:
      'Ideal for experiencing the story and politics comfortably. Positive outcomes can increase indicators by up to +10 points, while negative outcomes are softened to drop by at most 5 points (-5).',
  },
  normal: {
    id: 'normal',
    name: 'Normal Mode (Default)',
    shortRule: 'Max +10 Gain · Max -10 Drop',
    description:
      'Default balanced Westeros challenge. Decisions can increase indicators by at most +10 points and reduce them by at most 10 points (-10).',
  },
  hard: {
    id: 'hard',
    name: 'Hard Mode',
    shortRule: 'Max +7 Gain · Max -10 Drop',
    description:
      'Unforgiving Westeros realism. Negative outcomes can drop indicators by up to 10 points (-10), while positive outcomes can increase them by at most +7 points.',
  },
};

export const EN_GAME_MODES: Record<GameModeId, { name: string; description: string }> = {
  quick: {
    name: 'Quick Mode',
    description:
      'An intense 300-decision struggle for power in Westeros. Reach decision 300 without letting any core indicator hit zero to secure your throne.',
  },
  normal: {
    name: 'Normal Mode',
    description:
      'A balanced 600-decision dynastic saga. Political alliances, character relationships, and house wars yield lasting mid-term consequences.',
  },
  long: {
    name: 'Long Mode',
    description:
      'A deep 1,200-decision strategic and alternate-history campaign. Promises or betrayals made hundreds of turns ago will return to haunt or aid you.',
  },
  competitive: {
    name: 'Competitive Mode',
    description:
      'The ultimate 6,000-decision Westeros survival and imperial endurance test across the entire 64,534+ scenario pool.',
  },
};

export const EN_ERAS: Record<EraId, { name: string; years: string; summary: string }> = {
  robert_reign: {
    name: 'Reign of Robert Baratheon & Throne Crisis',
    years: '298 AC – Winter Is Coming',
    summary:
      'Jon Arryn has died under suspicious circumstances. King Robert Baratheon rides north to Winterfell to name his old friend Ned Stark Hand of the King while Lannister influence peaks.',
  },
  kings_landing_crisis: {
    name: 'Ned Stark & King’s Landing Intrigues',
    years: '298 AC – The Wolf and the Lion',
    summary:
      'Ned Stark investigates the secret parentage of the royal heirs in the capital while Littlefinger, Varys, and Cersei Lannister wage an unseen war of whispers.',
  },
  war_of_five_kings: {
    name: 'War of the Five Kings & Shadow of the Red Wedding',
    years: '299–300 AC – Rivers of Blood',
    summary:
      'Joffrey sits on the Iron Throne, Robb Stark is proclaimed King in the North, Stannis and Renly Baratheon press their claims, and Balon Greyjoy unleashes the Iron Fleet.',
  },
  essos_and_dragons: {
    name: 'Rise of Daenerys Targaryen & Meereen',
    years: '300–301 AC – Fire and Blood',
    summary:
      'Three dragons have grown. Daenerys Targaryen rules Slaver’s Bay with the Unsullied, Dothraki, and Second Sons while preparing her return to Westeros.',
  },
  faith_and_sparrows: {
    name: 'The Faith Militant & The High Sparrow',
    years: '301–302 AC – Faith and Crown',
    summary:
      'The High Sparrow and the Faith Militant have armed themselves in the capital. The power struggle between Cersei Lannister and House Tyrell threatens to tear the Red Keep apart.',
  },
  battle_for_north: {
    name: 'Battle for the North & Battle of the Bastards',
    years: '303 AC – The North Remembers',
    summary:
      'Winterfell is held by House Bolton. Jon Snow and Sansa Stark rally northern houses and the Free Folk to march against Ramsay Bolton.',
  },
  long_night: {
    name: 'Dragonstone Alliance & The Long Night',
    years: '304 AC – Army of the Dead',
    summary:
      'Daenerys Targaryen lands at Dragonstone. Beyond the Wall, the Night King and the White Walkers march south; the living must unite or perish.',
  },
  iron_throne_endgame: {
    name: 'Battle of King’s Landing & A New Order for Westeros',
    years: '305 AC – Ashes and the Throne',
    summary:
      'The final reckoning for the Iron Throne has arrived. The fate of the Seven Kingdoms and the Great Council will be forged by your choices.',
  },
};

export const EN_PLAYER_ROLES: Record<PlayerRoleId, { titlePrefix: string; name: string; description: string }> = {
  noble_bannerman: {
    titlePrefix: 'Lord',
    name: 'Noble Bannerman of a Great House',
    description: 'As a sworn bannerman to a Great House, you command both levy armies and highborn court diplomacy.',
  },
  minor_lord: {
    titlePrefix: 'Lord',
    name: 'Border Keep Lord',
    description: 'A resilient regional ruler living close to the smallfolk and defending your lands with grit and steel.',
  },
  small_council_advisor: {
    titlePrefix: 'Councilor',
    name: 'Small Council Advisor',
    description: 'A master strategist managing whispers, royal ledgers, and state secrets in the corridors of King’s Landing.',
  },
  sworn_commander: {
    titlePrefix: 'Commander',
    name: 'Royal & Border Commander',
    description: 'A battle-hardened military leader who has earned the fierce loyalty of knights and castle garrisons.',
  },
  courtier: {
    titlePrefix: 'Courtier',
    name: 'Red Keep Courtier',
    description: 'A refined noble who reads the pulse of the highborn at feasts, tourneys, and secret meetings.',
  },
  diplomat: {
    titlePrefix: 'Envoy',
    name: 'High Envoy of the Seven Kingdoms',
    description: 'Architect of peace treaties and alliances from Dorne to the North and across the Narrow Sea.',
  },
  sellsword_captain: {
    titlePrefix: 'Captain',
    name: 'Sellsword Captain',
    description: 'A daring warrior who commands free companies and perilous contracts for gold and glory.',
  },
  throne_claimant: {
    titlePrefix: 'Sovereign',
    name: 'Claimant to the Throne',
    description: 'A bold leader pressing a direct claim to the Iron Throne or an independent crown through fire and blood.',
  },
};

export const EN_REGIONS: Record<RegionId, { subtitle: string; description: string }> = {
  kings_landing: {
    subtitle: 'The Red Keep & Heart of the Iron Throne',
    description: 'The capital of intrigues, Small Council whispers, Gold Cloaks, and tolling bells.',
  },
  winterfell: {
    subtitle: 'Ancient Seat of the North',
    description: 'The northern stronghold of heart trees, hot springs, and biting winter winds.',
  },
  dragonstone: {
    subtitle: 'Obsidian Island & The Painted Table',
    description: 'A volcanic island fortress carved with dragons, commanding the Narrow Sea.',
  },
  the_wall: {
    subtitle: 'The Wall & Night’s Watch',
    description: 'A colossal wall of ancient ice—the last shield guarding the realms of men from the darkness beyond.',
  },
  meereen_essos: {
    subtitle: 'Slaver’s Bay & The Free Cities',
    description: 'The eastern continent of Great Pyramids, Dothraki seas, and wealthy trade ports.',
  },
  casterly_rock: {
    subtitle: 'The Westerlands & Gold Mines',
    description: 'Carved into a towering stone cliff overlooking the sunset sea, symbol of Lannister wealth.',
  },
  highgarden: {
    subtitle: 'Bountiful Gardens of the Reach',
    description: 'Heart of golden roses, chivalric tourneys, and vast harvest fields that feed the realm.',
  },
  sunspear_dorne: {
    subtitle: 'Red Deserts & The Water Gardens',
    description: 'Sun-drenched seat of House Martell—Unbowed, Unbent, Unbroken.',
  },
  pyke_iron_islands: {
    subtitle: 'The Iron Islands & Stormy Crags',
    description: 'Wave-battered sea towers and harsh homeland of the Ironborn who pay the iron price.',
  },
  riverrun: {
    subtitle: 'The Trident & The Riverlands',
    description: 'Strategic castle at the confluence of the Red Fork and Tumblestone, frontline of every great war.',
  },
  eyrie_vale: {
    subtitle: 'The Eyrie & Mountains of the Moon',
    description: 'An impregnable mountain fortress high above the clouds, guarded by the Bloody Gate.',
  },
  storms_end: {
    subtitle: 'Storm’s End & Shipbreaker Bay',
    description: 'Massive curtain-walled Baratheon fortress that has defied thousands of years of tempests.',
  },
};

export const EN_CARD_CATEGORIES: Record<CardCategoryId, { name: string; description: string }> = {
  cat_01_main_story: { name: 'Main Story Events', description: 'Pivotal turning points and seasonal milestones shaping the Seven Kingdoms.' },
  cat_02_dynasty_struggles: { name: 'Dynastic Struggles', description: 'Rivalries for supremacy, prestige, and lands among the Great Houses.' },
  cat_03_throne_games: { name: 'Games of the Throne', description: 'Legitimacy crises and power plays over the Iron Throne and regional crowns.' },
  cat_04_political_intrigues: { name: 'Political Intrigues', description: 'Secret plots, blackmail, and backroom deals in palace corridors.' },
  cat_05_assassination_attempts: { name: 'Assassination Attempts', description: 'Poisoned goblets, shadow assassins, Faceless Men, and hired blades.' },
  cat_06_betrayals: { name: 'Betrayals', description: 'Sudden defections by bannermen, councilors, and sworn allies.' },
  cat_07_diplomatic_talks: { name: 'Diplomatic Negotiations', description: 'Truce summits, border treaties, envoy receptions, and peace terms.' },
  cat_08_marriage_proposals: { name: 'Marriage Proposals', description: 'Political betrothals and dowry negotiations uniting noble bloodlines.' },
  cat_09_love_and_romance: { name: 'Love & Romance', description: 'Secret passions, tests of devotion, and romance where heart clashes with duty.' },
  cat_10_wars: { name: 'Wars', description: 'Pitched battles, cavalry charges, river crossings, and frontline command.' },
  cat_11_sieges: { name: 'Sieges', description: 'Castle defenses, ration shortages, trebuchet barrages, and tunnel raids.' },
  cat_12_military_strategies: { name: 'Military Strategies', description: 'Army logistics, garrison deployments, commander appointments, and ambushes.' },
  cat_13_popular_rebellions: { name: 'Popular Rebellions', description: 'Flea Bottom riots, peasant uprisings, and hunger-fueled revolts.' },
  cat_14_tax_and_economy: { name: 'Tax & Economy Decisions', description: 'Iron Bank debts, gold mines, customs tariffs, and royal treasury management.' },
  cat_15_trade_and_resources: { name: 'Trade & Resource Management', description: 'Grain caravans, Free Cities maritime trade, iron, and timber reserves.' },
  cat_16_religion_and_faith: { name: 'Religion & Faith Conflicts', description: 'The Faith of the Seven, Old Gods, Lord of Light (R’hllor), and Drowned God tensions.' },
  cat_17_nights_watch_wall: { name: 'Night’s Watch & The Wall', description: 'Castle Black garrison, Wildling raids, mutinies, and defending the Wall.' },
  cat_18_white_walkers_others: { name: 'White Walkers & The Others', description: 'The Night King, army of the dead, dragonglass shipments, and the Long Night.' },
  cat_19_dragons_and_riders: { name: 'Dragons & Dragonriders', description: 'Commanding Drogon, Rhaegal, and Viserion, dragonfire, and aerial supremacy.' },
  cat_20_house_targaryen: { name: 'House Targaryen Events', description: 'Fire and Blood legacy, Valyrian traditions, and Targaryen legitimacy.' },
  cat_21_house_stark: { name: 'House Stark Events', description: 'Winterfell honor, direwolves, loyalty of Northern lords, and winter preparations.' },
  cat_22_house_lannister: { name: 'House Lannister Events', description: 'Casterly Rock gold, internal family power struggles, and paying debts.' },
  cat_23_house_baratheon: { name: 'House Baratheon Events', description: 'Stormlands sibling rivalries, the crowned stag banner, and iron resolve.' },
  cat_24_house_greyjoy: { name: 'House Greyjoy Events', description: 'Iron Fleet raids, the Kingsmoot, and naval dominance.' },
  cat_25_house_tyrell: { name: 'House Tyrell Events', description: 'Highgarden harvests, courtly grace, thorny politics, and food embargoes.' },
  cat_26_house_martell: { name: 'House Martell Events', description: 'Dornish vengeance, the Sand Snakes, desert diplomacy, and poisoned spears.' },
  cat_27_house_arryn: { name: 'House Arryn Events', description: 'Knights of the Vale, Eyrie neutrality, and defending the Bloody Gate.' },
  cat_28_house_tully: { name: 'House Tully Events', description: 'Family, Duty, Honor, the Twins crossing, and defending the Riverlands.' },
  cat_29_small_council: { name: 'Small Council & Court Governance', description: 'Decisions among the Hand, Master of Whisperers, Master of Coin, and Maesters.' },
  cat_30_personal_troubles: { name: 'Personal Dilemmas', description: 'Conscience, trauma, loyalty, and honor dilemmas of major characters.' },
  cat_31_family_relations: { name: 'Family Relations', description: 'Sibling rivalries, parental expectations, and blood ties within dynasties.' },
  cat_32_children_and_heirs: { name: 'Children & Heirs', description: 'Educating heirs, legitimacy disputes, wardships, and succession struggles.' },
  cat_33_spies_and_intel: { name: 'Spies & Intelligence Networks', description: 'Little birds, coded raven scrolls, double agents, and disinformation.' },
  cat_34_commonfolk_daily: { name: 'Daily Life of the Smallfolk', description: 'Craft guilds, inns, peasant petitions, and city watch security.' },
  cat_35_plagues_and_epidemics: { name: 'Plagues & Epidemics', description: 'Greyscale, bloody flux, quarantine decrees, and Citadel maesters.' },
  cat_36_famines_and_disasters: { name: 'Famines & Natural Disasters', description: 'Long winter rations, droughts, storm-wrecked fleets, and wildfire accidents.' },
  cat_37_escape_exile_captivity: { name: 'Escape, Exile & Captivity', description: 'Dungeon bargains, ransom treaties, secret tunnels, and exile in Essos.' },
  cat_38_courts_and_justice: { name: 'Courts & Justice', description: 'Trials by combat, high treason hearings, and sentences to the Night’s Watch.' },
  cat_39_tournaments_chivalry: { name: 'Tournaments & Chivalry', description: 'Jousting lists, melee arenas, Kingsguard appointments, and knightly honor.' },
  cat_40_explorations_distant: { name: 'Explorations & Distant Realms', description: 'Braavos, Volantis, Qarth, Asshai, and uncharted seas west of Westeros.' },
  cat_41_magic_prophecy: { name: 'Magic, Prophecy & The Supernatural', description: 'Three-Eyed Raven visions, Red Priestess prophecies, and warg abilities.' },
  cat_42_alternate_history: { name: 'Alternate History & Unexpected Summits', description: 'Fate-altering rescues, unforeseen alliances, and broken prophecies.' },
};

export const EN_RELATIONSHIP_TIERS: Record<RelationshipTierId, { label: string; description: string }> = {
  mortal_enemy: {
    label: 'Mortal Enemy',
    description: 'Seeks every opportunity to destroy you; high danger of assassination and open war.',
  },
  enemy: {
    label: 'Enemy',
    description: 'Openly opposes your interests and secretly collaborates with your rivals.',
  },
  distrust: {
    label: 'Distrustful',
    description: 'Doubts your word and refuses cooperation without concessions.',
  },
  neutral: {
    label: 'Neutral',
    description: 'Formal and guarded; open to negotiation as long as interests align.',
  },
  favorable: {
    label: 'Favorable',
    description: 'Respects your rule and supports reasonable diplomatic requests.',
  },
  friend: {
    label: 'Friend',
    description: 'Stands by you in crises, offering valuable intelligence and military backing.',
  },
  loyal_ally: {
    label: 'Devoted Ally',
    description: 'Unwavering ally who would risk their own house and life for your cause.',
  },
};

export const EN_CHARACTER_TRANSLATIONS: Record<
  string,
  {
    title: string;
    personality: string[];
    motivation: string;
    fears: string;
    ideals: string;
    politicalGoal: string;
    behaviorModel: string;
    secretIntel: string;
    romancePreferenceNote: string;
    greetings: { enemy: string; neutral: string; friend: string; romance?: string };
  }
> = {
  jon_snow: {
    title: 'Lord Commander of the Night’s Watch & White Wolf of the North',
    personality: ['Honorable', 'Selfless', 'Resolute', 'Melancholic'],
    motivation: 'Protect the living from the horrors of the Long Night and shield the North from ruin.',
    fears: 'Failing to protect those he loves and breaking his sworn oaths.',
    ideals: 'True leadership is not craving a crown, but acting as a shield for the people.',
    politicalGoal: 'Unite the Northern houses and the Free Folk against the coming winter.',
    behaviorModel: 'Rewards fair and honorable decisions; reacts harshly to the slaughter of innocents.',
    secretIntel: 'He is in truth Aegon Targaryen, the legitimate son of Lyanna Stark and Rhaegar Targaryen.',
    romancePreferenceNote: 'Opens his heart to those who share his honor, sacrifice, and duty to protect the living.',
    greetings: {
      enemy: '{{playerTitle}} {{playerName}}, I have no time for those who do not keep their word.',
      neutral: '{{playerTitle}} {{playerName}}, winter is coming. We cannot forget the true enemy.',
      friend: 'Good to see you, {{playerName}}. The North does not forget your friendship.',
      romance: '{{playerName}}... No matter how fiercely the storm howls, I find peace by your side.',
    },
  },
  daenerys_targaryen: {
    title: 'Stormborn, Mother of Dragons, Breaker of Chains',
    personality: ['Charismatic', 'Idealistic', 'Proud', 'Fierce'],
    motivation: 'Restore the Targaryen dynasty and break the wheel of tyrants.',
    fears: 'Becoming the shadow of the Mad King Aerys or being betrayed by those she trusts.',
    ideals: 'A just yet absolute Targaryen realm free of slavery and oppression.',
    politicalGoal: 'Cross the Narrow Sea with her three dragons and armies to reclaim the Iron Throne.',
    behaviorModel: 'Rewards loyalty generously; punishes betrayal with fire and blood.',
    secretIntel: 'The prophecy of three treasons—for blood, for gold, and for love—constantly haunts her mind.',
    romancePreferenceNote: 'Drawn to courageous, loyal spirits who respect her vision as an equal.',
    greetings: {
      enemy: 'If you will not bend the knee before me, prepare for my fire, {{playerName}}.',
      neutral: 'I am Daenerys Stormborn. What do you offer me, {{playerTitle}} {{playerName}}?',
      friend: 'My loyal friend {{playerName}}, we shall build the new world together.',
      romance: '{{playerName}}, the throne is cold iron, but your presence is as real as my fire.',
    },
  },
  tyrion_lannister: {
    title: 'The Imp of Casterly Rock & Hand of the Monarch',
    personality: ['Clever', 'Witty', 'Pragmatic', 'Compassionate'],
    motivation: 'Prove himself a statesman who shapes history despite his family’s scorn.',
    fears: 'Being betrayed once more by those he cares for.',
    ideals: 'Wit and diplomacy save far more lives than the sword.',
    politicalGoal: 'Guide a rational ruler who can govern the realm with minimal destruction.',
    behaviorModel: 'Appreciates shrewd alliances and strategic conversations over a goblet of wine.',
    secretIntel: 'He personally managed all the drains and cisterns of Casterly Rock and knows its secret entryways.',
    romancePreferenceNote: 'Values sharp intellect, humor, and genuine warmth that looks past appearances.',
    greetings: {
      enemy: 'The last person who underestimated me is currently feeding the fish at the bottom of the Blackwater, {{playerName}}.',
      neutral: '{{playerTitle}} {{playerName}}, how about a cup of Dornish red and a bit of common sense?',
      friend: 'My friend {{playerName}}! Your wit is the rarest treasure in this court.',
      romance: '{{playerName}}, that you found something to love in a scarred soul like mine is a miracle.',
    },
  },
  cersei_lannister: {
    title: 'Queen of the Seven Kingdoms & Lioness of the Red Keep',
    personality: ['Ambitious', 'Vindictive', 'Protective', 'Ruthless'],
    motivation: 'Protect her children and Lannister supremacy at any cost.',
    fears: 'Maggy the Frog’s prophecy that a younger, more beautiful queen will cast her down.',
    ideals: 'When you play the game of thrones, you win or you die; there is no middle ground.',
    politicalGoal: 'Crush all rivals and establish absolute Lannister rule on the Iron Throne.',
    behaviorModel: 'Never forgives weakness; rewards obedience but never stops suspecting.',
    secretIntel: 'She controls the ancient Targaryen wildfire caches beneath the Red Keep and the Sept of Baelor through Qyburn.',
    romancePreferenceNote: 'Her heart belongs only to Jaime and her children; she views other ties as political instruments.',
    greetings: {
      enemy: 'Every breath you take is by my mercy, {{playerName}}. Do not overstep.',
      neutral: '{{playerTitle}} {{playerName}}, prove your loyalty with deeds, not words.',
      friend: '{{playerName}}, you are one of the few I can trust among the vipers of this court.',
    },
  },
  jaime_lannister: {
    title: 'The Kingslayer & Lord Commander of the Kingsguard',
    personality: ['Daring', 'Sardonic', 'Conflicted', 'Knightly'],
    motivation: 'Reclaim his tarnished knightly honor and protect those he loves.',
    fears: 'Being remembered in the White Book only as an oathbreaker.',
    ideals: 'Sometimes a true knight must make the hardest choice to save innocent lives.',
    politicalGoal: 'Secure his family’s survival and fulfill his sworn chivalric oaths.',
    behaviorModel: 'Respects martial courage and straightforward honesty; despises scheming cowards.',
    secretIntel: 'He slew King Aerys II because the Mad King ordered the entire population of King’s Landing burned with wildfire.',
    romancePreferenceNote: 'Moved by unwavering honor and mutual respect forged on the battlefield.',
    greetings: {
      enemy: 'Keep your hand near your hilt when you speak to me, {{playerName}}.',
      neutral: '{{playerTitle}} {{playerName}}, let us skip the courtly flatteries and talk steel.',
      friend: '{{playerName}}, I would gladly stand beside you in the shield wall.',
      romance: '{{playerName}}, beside you I remember the knight I always wanted to be.',
    },
  },
  tywin_lannister: {
    title: 'Lord of Casterly Rock & Warden of the West',
    personality: ['Calculating', 'Commanding', 'Pragmatic', 'Relentless'],
    motivation: 'Build a Lannister dynasty that will endure for a thousand years.',
    fears: 'His family becoming a laughingstock as it nearly did under his father Tytos.',
    ideals: 'Individuals die, but the family name and legacy are eternal.',
    politicalGoal: 'Dominate the Iron Throne through gold, fear, and strategic marriages.',
    behaviorModel: 'Respects cold competence, fiscal discipline, and decisive authority.',
    secretIntel: 'Casterly Rock’s deepest gold veins have begun to run dry, making control of the Crown’s treasury vital.',
    romancePreferenceNote: 'Since the death of his beloved wife Joanna, his heart is closed to romance.',
    greetings: {
      enemy: 'A lion does not concern himself with the opinions of sheep, {{playerName}}.',
      neutral: '{{playerTitle}} {{playerName}}, what matters is the legacy we leave to our houses.',
      friend: '{{playerName}}, you are one of the rare rulers who understands statecraft.',
    },
  },
  ned_stark: {
    title: 'Lord of Winterfell, Warden of the North & Hand of the King',
    personality: ['Honorable', 'Just', 'Dutiful', 'Steadfast'],
    motivation: 'Uphold justice, protect his family, and preserve peace in the realm.',
    fears: 'Dishonor falling upon House Stark or harm coming to his children.',
    ideals: 'The man who passes the sentence should swing the sword.',
    politicalGoal: 'Keep the North safe and serve the realm with integrity.',
    behaviorModel: 'Rewards honesty and mercy; strongly opposes assassination, bribery, and deceit.',
    secretIntel: 'He kept his dying sister Lyanna’s secret for years at the cost of his own stained honor.',
    romancePreferenceNote: 'Devoted husband to Catelyn Stark; not eligible for romance.',
    greetings: {
      enemy: 'Your lack of honor sickens me, {{playerName}}.',
      neutral: 'Winter is coming, {{playerTitle}} {{playerName}}. We must stand firm.',
      friend: '{{playerName}}, Winterfell’s gates and hearth are always open to you.',
    },
  },
  robb_stark: {
    title: 'The Young Wolf & King in the North',
    personality: ['Brave', 'Tactical', 'Honorable', 'Passionate'],
    motivation: 'Avenge his father and win the independence and safety of the North.',
    fears: 'Winning every battle in the field only to lose the war at the negotiating table.',
    ideals: 'A king must ride at the vanguard with his bannermen.',
    politicalGoal: 'Secure Northern sovereignty and punish Lannister aggression.',
    behaviorModel: 'Loyal to allies who fight with honor; unforgiving of treachery.',
    secretIntel: 'His direwolf Grey Wind senses treachery in the scent of untrustworthy bannermen before anyone else.',
    romancePreferenceNote: 'Follows his heart even when it complicates political betrothals.',
    greetings: {
      enemy: 'The North remembers, {{playerName}}, and Grey Wind is hungry.',
      neutral: '{{playerTitle}} {{playerName}}, my bannermen await your word.',
      friend: '{{playerName}}, there is no ally I trust more on the battlefield!',
    },
  },
  arya_stark: {
    title: 'Wolf of Winterfell & Faceless Assassin',
    personality: ['Fearless', 'Independent', 'Vengeful', 'Loyal'],
    motivation: 'Cross off every name on her list and protect her pack.',
    fears: 'Losing her family and her true identity.',
    ideals: 'When the snows fall and the white winds blow, the lone wolf dies, but the pack survives.',
    politicalGoal: 'Eliminate traitors from the shadows and defend House Stark.',
    behaviorModel: 'Despises cruel lords and Tyrants; respects those who defend the weak.',
    secretIntel: 'Trained in the House of Black and White in Braavos, she can wear the faces of the dead.',
    romancePreferenceNote: 'That’s not her—she refuses the traditional life of a courtly lady.',
    greetings: {
      enemy: 'You have just earned a place on my list, {{playerName}}. Valar Morghulis.',
      neutral: '{{playerTitle}} {{playerName}}, a girl is watching your choices.',
      friend: '{{playerName}}, Needle is sharp and I have your back in the dark.',
    },
  },
  sansa_stark: {
    title: 'Lady of Winterfell & Queen in the North',
    personality: ['Resilient', 'Astute', 'Diplomatic', 'Protective'],
    motivation: 'Ensure Winterfell and the North never again fall under southern tyranny.',
    fears: 'Being used as a political hostage or pawn ever again.',
    ideals: 'True survival requires combining Stark honor with political foresight.',
    politicalGoal: 'Manage winter logistics, unite Northern lords, and safeguard Stark sovereignty.',
    behaviorModel: 'Values careful planning, grain reserves, and cautious diplomacy.',
    secretIntel: 'She learned every manipulation tactic of Cersei Lannister and Littlefinger and now turns them against her foes.',
    romancePreferenceNote: 'Extremely cautious; only trusts those who prove unwavering respect and protection.',
    greetings: {
      enemy: 'I used to be a slow learner, {{playerName}}, but I learned. You will not deceive me.',
      neutral: '{{playerTitle}} {{playerName}}, courtesy is a lady’s armor.',
      friend: '{{playerName}}, Winterfell values your wisdom and alliance.',
      romance: '{{playerName}}, after all the cruelty I have seen, your kindness is a rare light.',
    },
  },
  bran_stark: {
    title: 'The Three-Eyed Raven',
    personality: ['Calm', 'All-Seeing', 'Detached', 'Wise'],
    motivation: 'Preserve the memory of the world and defeat the Night King.',
    fears: 'The endless night erasing the history and memory of mankind.',
    ideals: 'The past is already written; the ink is dry, yet the future hangs in the balance.',
    politicalGoal: 'Guide the realm through visions of past and present.',
    behaviorModel: 'Speaks in quiet truths and reveals hidden plots before they strike.',
    secretIntel: 'Through the weirwood net, he has witnessed the Tower of Joy, the creation of the Night King, and every whispered plot.',
    romancePreferenceNote: 'As the Three-Eyed Raven, he has transcended earthly desires.',
    greetings: {
      enemy: 'I saw what you did in the dark, {{playerName}}.',
      neutral: 'You are exactly where you were meant to be, {{playerTitle}} {{playerName}}.',
      friend: '{{playerName}}, the ravens showed me your courage.',
    },
  },
};

export function getCharacterLocalized(charId: string, lang: GameLanguage) {
  const base = CHARACTER_MAP[charId] || CHARACTERS[0];
  if (lang === 'tr') return base;
  const trEn = EN_CHARACTER_TRANSLATIONS[charId];
  if (trEn) {
    return {
      ...base,
      title: trEn.title,
      personality: trEn.personality,
      motivation: trEn.motivation,
      fears: trEn.fears,
      ideals: trEn.ideals,
      politicalGoal: trEn.politicalGoal,
      behaviorModel: trEn.behaviorModel,
      secretIntel: trEn.secretIntel,
      romancePreferenceNote: trEn.romancePreferenceNote,
      greetings: trEn.greetings,
    };
  }
  // Automatic clean English adaptation for remaining characters
  return {
    ...base,
    title: translateCommonTitleToEn(base.title),
    personality: base.personality.map(translateTraitToEn),
    motivation: `Uphold the power and honor of ${base.house} across Westeros.`,
    fears: `Seeing ${base.house} fall into ruin or betrayal.`,
    ideals: `Strength, loyalty, and strategic foresight determine who survives the game of thrones.`,
    politicalGoal: `Expand influence in ${REGIONS[base.defaultRegion]?.name || 'the realm'} and protect sworn allies.`,
    behaviorModel: `Responds strongly to decisions affecting ${base.house} and regional stability.`,
    secretIntel: `Maintains confidential informants and strategic reserves within ${REGIONS[base.defaultRegion]?.name || 'Westeros'}.`,
    romancePreferenceNote: base.romanceEligible
      ? 'Open to a deep bond built on mutual trust and shared ambition.'
      : 'Focused entirely on duty, politics, and survival.',
    greetings: {
      enemy: `Cross my path again, {{playerName}}, and you will regret it.`,
      neutral: `{{playerTitle}} {{playerName}}, let us see what your rule brings to the realm.`,
      friend: `{{playerName}}, my sword and counsel are with you.`,
      romance: base.greetings.romance
        ? `{{playerName}}, my heart stands with you through fire and winter.`
        : undefined,
    },
  };
}

function translateCommonTitleToEn(trTitle: string): string {
  return trTitle
    .replace('Gece Nöbeti 997. Lord Kumandanı (Yaşlı Ayı)', '997th Lord Commander of the Night’s Watch (The Old Bear)')
    .replace('Kartal Yuvası Naibesi', 'Lady Regent of the Eyrie')
    .replace('Karabalık & Nehir Toprakları Komutanı', 'The Blackfish & Commander of the Riverlands')
    .replace('Riverrun Lordu', 'Lord of Riverrun')
    .replace('Dorne Prensi & Sunspear Hükümdarı', 'Prince of Dorne & Lord of Sunspear')
    .replace('Ak Gezenlerin ve Ölüler Ordusunun Efendisi', 'Supreme Leader of the White Walkers & Army of the Dead')
    .replace('Ayı Adası Leydisi', 'Lady of Bear Island')
    .replace('Second Sons Komutanı', 'Commander of the Second Sons')
    .replace('Samwell’in Hayat Arkadaşı', 'Companion of Samwell Tarly')
    .replace('Kraliçe Eli & Fısıltılar Efendisi', 'Hand of the Queen & Master of Whisperers')
    .replace('İnanç’ın Yüce Rahibi', 'Leader of the Faith Militant')
    .replace('Myr’li Kızıl Rahip', 'Red Priest of Myr')
    .replace('Şimşek Lordu & Sancaksız Kardeşlik Lideri', 'The Lightning Lord & Leader of the Brotherhood Without Banners')
    .replace('Winterfell’in Sadık Koruyucusu', 'Loyal Protector of Winterfell')
    .replace('Usta Demirci & Storm’s End Lordu', 'Master Blacksmith & Lord of Storm’s End')
    .replace('Ateşle Öpülmüş Mızrak Karısı', 'Spearwife Kissed by Fire')
    .replace('Dilenci Kral', 'The Beggar King')
    .replace('Büyük Çimen Denizi’nin Khal’ı', 'Great Khal of the Dothraki Sea')
    .replace('Kum Yılanlarının Lideri', 'Leader of the Sand Snakes')
    .replace('Dorne Prensi & Kızıl Engerek', 'Prince of Dorne & The Red Viper')
    .replace('Dreadfort Lordu & Kuzey’in Muhafızı', 'Lord of the Dreadfort & Warden of the North')
    .replace('Dreadfort ve Winterfell Lordu', 'Lord of the Dreadfort & Winterfell')
    .replace('Karasu Şövalyesi & Paralı Asker', 'Knight of the Blackwater & Sellsword')
    .replace('Devlerin Felaketi & Yabanıl Lideri', 'Giantsbane & Leader of the Free Folk')
    .replace('Lekesizler (Unsullied) Başkomutanı', 'Commander of the Unsullied')
    .replace('Naath’lı Başdanışman ve Tercüman', 'Trusted Advisor & Herald of Naath')
    .replace('Sürgün Şövalye', 'Exiled Knight of Bear Island')
    .replace('Asshai’li Kızıl Rahibe', 'Red Priestess of Asshai')
    .replace('Soğan Şövalyesi', 'The Onion Knight')
    .replace('Gece Nöbeti Üstadı & Büyük Üstat', 'Maester of the Night’s Watch & Grand Maester')
    .replace('Tarth’lı Brienne & Yeminli Şövalye', 'Maid of Tarth & Sworn Knight')
    .replace('Yürüyen Dağ', 'The Mountain That Rides')
    .replace('Tazı', 'The Hound')
    .replace('Örümcek & Fısıltılar Efendisi', 'The Spider & Master of Whisperers')
    .replace('Sikke Efendisi & Vadi’nin Koruyucusu', 'Master of Coin & Lord Protector of the Vale')
    .replace('Dikenler Kraliçesi', 'The Queen of Thorns')
    .replace('Highgarden’ın Gülü & Kraliçe', 'Rose of Highgarden & Queen')
    .replace('Demir Taht’ın Genç Kralı', 'Young King on the Iron Throne')
    .replace('Yedi Krallık Kralı & İsyanın Çekici', 'King of the Seven Kingdoms & Demon of the Trident')
    .replace('Storm’s End Lordu', 'Lord of Storm’s End')
    .replace('Dragonstone Lordu & Meşru Kral İddiacısı', 'Lord of Dragonstone & Rightful Claimant')
    .replace('Karga Gözü & Silence Kaptanı', 'Crow’s Eye & Captain of the Silence')
    .replace('Demir Donanma Kaptanı & Demir Adalar Hükümdarı', 'Captain of the Iron Fleet & Ruler of the Iron Islands')
    .replace('Demir Adalar Prensi', 'Prince of the Iron Islands')
    .replace('Winterfell Leydisi', 'Lady of Winterfell');
}

function translateTraitToEn(t: string): string {
  const map: Record<string, string> = {
    Onurlu: 'Honorable',
    Fedakâr: 'Selfless',
    Kararlı: 'Resolute',
    Melankolik: 'Melancholic',
    Zeki: 'Clever',
    Kurnaz: 'Cunning',
    Sadık: 'Loyal',
    Cesur: 'Brave',
    Acımasız: 'Ruthless',
    Kibirli: 'Arrogant',
    Bilge: 'Wise',
    Sabırlı: 'Patient',
    Tutkulu: 'Passionate',
    Disiplinli: 'Disciplined',
    Sert: 'Stern',
    Adil: 'Just',
    Hırslı: 'Ambitious',
    Gizemli: 'Mysterious',
    Korkusuz: 'Fearless',
  };
  return map[t] || t;
}

export function getRelationshipTierLocalized(score: number, lang: GameLanguage) {
  const base = getRelationshipTierInfo(score);
  if (lang === 'tr') return base;
  const en = EN_RELATIONSHIP_TIERS[base.id];
  return {
    ...base,
    label: en?.label || base.label,
    description: en?.description || base.description,
  };
}

// ============================================================================
// SCENARIO POOL & CANON CARDS ENGLISH TRANSLATION MAPS
// ============================================================================
export const EN_CRISIS_LENSES: Array<{
  titleSuffix: string;
  narrativePrefix: string;
  leftActionSuffix: string;
  rightActionSuffix: string;
}> = [
  {
    titleSuffix: 'Opening Balance',
    narrativePrefix: 'As the balance of power in the realm begins to take shape, in ',
    leftActionSuffix: 'and establish your authority early.',
    rightActionSuffix: 'and build long-term trust.',
  },
  {
    titleSuffix: 'Omens of Winter',
    narrativePrefix: 'As freezing winds from the North herald the approaching winter, in ',
    leftActionSuffix: 'and enforce winter discipline immediately.',
    rightActionSuffix: 'and compromise while protecting the granaries.',
  },
  {
    titleSuffix: 'Call to Arms',
    narrativePrefix: 'As the war horns of the bannermen echo along the borders, in ',
    leftActionSuffix: 'and grant full authority to frontline commanders.',
    rightActionSuffix: 'and keep diplomatic channels open.',
  },
  {
    titleSuffix: 'Whispers at Court',
    narrativePrefix: 'While secret scrolls pass from hand to hand in the great halls, in ',
    leftActionSuffix: 'and seize the list of informants.',
    rightActionSuffix: 'and outmaneuver your rivals at their own game.',
  },
  {
    titleSuffix: 'Gold Shortage',
    narrativePrefix: 'As rising campaign costs and guild demands strain the treasury, in ',
    leftActionSuffix: 'and refuse to compromise on fiscal discipline.',
    rightActionSuffix: 'and raise funds through trade charters.',
  },
  {
    titleSuffix: 'Square Unrest',
    narrativePrefix: 'As voices of discontent rise in town squares and villages, in ',
    leftActionSuffix: 'and respond directly to the smallfolk’s petitions.',
    rightActionSuffix: 'and tighten garrison patrols.',
  },
  {
    titleSuffix: 'Council of Lords',
    narrativePrefix: 'As envoys of ancient houses gather to demand new privileges, in ',
    leftActionSuffix: 'and renew the oaths of fealty of the noble houses.',
    rightActionSuffix: 'and defend the supremacy of the crown without compromise.',
  },
  {
    titleSuffix: 'Trial of Faith',
    narrativePrefix: 'As prophecies of the Faith of the Seven and Red Priests stir the populace, in ',
    leftActionSuffix: 'and secure the backing of the temples.',
    rightActionSuffix: 'and uphold secular law and order.',
  },
  {
    titleSuffix: 'Narrow Sea Blockade',
    narrativePrefix: 'As pirates and rival fleets appear along the Narrow Sea and coastal ports, in ',
    leftActionSuffix: 'and launch the war galleys immediately.',
    rightActionSuffix: 'and strike a deal with the Free Cities guilds.',
  },
  {
    titleSuffix: 'Shadow of Blood Vendetta',
    narrativePrefix: 'As unhealed wounds of past wars begin to bleed anew, in ',
    leftActionSuffix: 'and quench the fires of vengeance with a decisive decree.',
    rightActionSuffix: 'and establish peace by paying the blood price.',
  },
  {
    titleSuffix: 'Harvest & Supply Season',
    narrativePrefix: 'As the autumn harvest is gathered into winter cellars, in ',
    leftActionSuffix: 'and personally oversee the distribution of rations.',
    rightActionSuffix: 'and convert surplus grain into gold.',
  },
  {
    titleSuffix: 'Secret Raven Scroll',
    narrativePrefix: 'As an unsealed intelligence scroll arriving at midnight changes everything, in ',
    leftActionSuffix: 'and strike the first blow against the threat in the shadows.',
    rightActionSuffix: 'and quietly tighten the defensive perimeter.',
  },
  {
    titleSuffix: 'Fire in the Sky',
    narrativePrefix: 'As dragon shadows and rumors of fire sweep across the realm, in ',
    leftActionSuffix: 'and harness this immense power for your banner.',
    rightActionSuffix: 'and calm the terrified keeps.',
  },
  {
    titleSuffix: 'Chill Beyond the Wall',
    narrativePrefix: 'As the dark threat beyond the Wall grows stronger each day, in ',
    leftActionSuffix: 'and fortify the shield of the living.',
    rightActionSuffix: 'and preserve unity on the home front.',
  },
  {
    titleSuffix: 'Dilemma of Honor & Gold',
    narrativePrefix: 'As knightly vows clash with the cold calculations of realpolitik, in ',
    leftActionSuffix: 'and bear the cost of the honorable path.',
    rightActionSuffix: 'and choose pragmatic gain.',
  },
  {
    titleSuffix: 'Imperial Reckoning',
    narrativePrefix: 'As your reign reaches a historic turning point, in ',
    leftActionSuffix: 'and demonstrate your iron will to all of Westeros.',
    rightActionSuffix: 'and reach consensus with the Great Houses.',
  },
];

export const EN_STRATEGIC_STANCES: Array<{
  contextClause: string;
  leftOutcomeAddon: string;
  rightOutcomeAddon: string;
}> = [
  {
    contextClause: 'Your advisors urge an uncompromising display of strength.',
    leftOutcomeAddon: 'Your resolve forced your rivals to back down.',
    rightOutcomeAddon: 'Your unexpectedly measured stance opened new doors.',
  },
  {
    contextClause: 'At court, many whisper that diplomatic grace will cut deeper than steel.',
    leftOutcomeAddon: 'Your calculated move yielded results without shaking the realm.',
    rightOutcomeAddon: 'Diplomatic compromise satisfied the factions.',
  },
  {
    contextClause: 'Treasury clerks remind you that gold opens every gate.',
    leftOutcomeAddon: 'Efficient use of resources strengthened your hand.',
    rightOutcomeAddon: 'The crisis was overcome while preserving economic balance.',
  },
  {
    contextClause: 'The smallfolk in the streets await your judgment with hope.',
    leftOutcomeAddon: 'The town squares speak of your justice.',
    rightOutcomeAddon: 'Public order was preserved without upheaval.',
  },
  {
    contextClause: 'Spies in the shadows whisper that you must not miss this opportunity.',
    leftOutcomeAddon: 'The quietly laid plan worked flawlessly.',
    rightOutcomeAddon: 'Your cautious move foiled a potential trap.',
  },
  {
    contextClause: 'Knights and bannermen expect an honorable stand.',
    leftOutcomeAddon: 'Your bannermen’s respect for you redoubled.',
    rightOutcomeAddon: 'Your realistic decision safeguarded the keep.',
  },
  {
    contextClause: 'Dispatches from the front show there is no time to lose.',
    leftOutcomeAddon: 'Your swift intervention relieved the frontline.',
    rightOutcomeAddon: 'A prudent defensive plan prevented losses.',
  },
  {
    contextClause: 'The eyes of the Great Houses are fixed on the alliance this decision will forge.',
    leftOutcomeAddon: 'Your standing among the dynasties grew stronger.',
    rightOutcomeAddon: 'Your balanced policy prevented new blood feuds.',
  },
  {
    contextClause: 'Maesters counsel conserving resources for the long winter ahead.',
    leftOutcomeAddon: 'Strategic reserves were successfully protected.',
    rightOutcomeAddon: 'Your sharing policy reinforced domestic peace.',
  },
  {
    contextClause: 'Beacons on the watchtowers signal movement along the border.',
    leftOutcomeAddon: 'Border garrisons went on full alert.',
    rightOutcomeAddon: 'Diplomatic calm was restored along the marches.',
  },
  {
    contextClause: 'Ancient traditions and the laws of the First Men are invoked.',
    leftOutcomeAddon: 'Your devotion to tradition pleased the ancient houses.',
    rightOutcomeAddon: 'Your innovative solution brought fresh vitality to the realm.',
  },
  {
    contextClause: 'The stakes are high, yet victory could reshape the entire realm.',
    leftOutcomeAddon: 'Your bold gambit succeeded beyond expectations!',
    rightOutcomeAddon: 'By choosing a safe harbor, you shielded the realm from peril.',
  },
];

export const EN_ARCHETYPE_SEEDS: Array<{
  titleRoot: string;
  CoreSituation: string;
  leftOptionRoot: string;
  leftOutcomeRoot: string;
  leftReason: string;
  rightOptionRoot: string;
  rightOutcomeRoot: string;
  rightReason: string;
}> = [
  // 1
  {
    titleRoot: 'Royal Edict of the Seven Kingdoms',
    CoreSituation: '{{playerTitle}} {{playerName}}, regional wardens challenging the authority of the Iron Throne resist the new royal decree. Shall we enforce central authority or grant autonomy?',
    leftOptionRoot: 'Enforce the decree without compromise using royal inspectors and garrisons',
    leftOutcomeRoot: 'Central authority was restored; military deterrence rose though local lords grumbled.',
    leftReason: 'The royal edict was enforced with military discipline.',
    rightOptionRoot: 'Grant tax relief and local council rights to regional houses',
    rightOutcomeRoot: 'Great houses and smallfolk welcomed the compromise, though treasury revenues dipped.',
    rightReason: 'Autonomy granted to the houses boosted political support.',
  },
  // 2
  {
    titleRoot: 'Border Keeps & Banner Clash',
    CoreSituation: 'Bannermen of two ancient houses have drawn swords over fertile valley mills and silver mines. {{playerTitle}} {{playerName}}, what is your arbitration?',
    leftOptionRoot: 'Place the mines under direct crown protection and disarm both houses',
    leftOutcomeRoot: 'Silver revenues flowed into the treasury and border fighting ceased, though proud lords took offense.',
    leftReason: 'Border mines were annexed directly to the treasury.',
    rightOptionRoot: 'Establish a joint council and split the revenue between both houses',
    rightOutcomeRoot: 'The blood feud subsided and the nobility praised your fairness.',
    rightReason: 'Compromise between the houses strengthened noble support.',
  },
  // 3
  {
    titleRoot: 'Legitimacy & Claim to the Throne',
    CoreSituation: 'A new claim to the throne based on ancient royal lineages circulates through palace corridors. {{playerTitle}} {{playerName}}, how will you quell this claim?',
    leftOptionRoot: 'Arrest the claimants for high treason and seize their seats',
    leftOutcomeRoot: 'The rival faction was crushed with an iron fist; military and financial power held firm while fear grew at court.',
    leftReason: 'Rival claimants were harshly purged.',
    rightOptionRoot: 'Convene an open debate in the Great Council and renew noble oaths of fealty',
    rightOutcomeRoot: 'The nobility reaffirmed your legitimacy, though the concessions granted weighed on the treasury.',
    rightReason: 'Oaths of fealty were renewed in the Great Council.',
  },
  // 4
  {
    titleRoot: 'Sealed Letters & Blackmail',
    CoreSituation: '{{playerTitle}} {{playerName}}, documents proving illicit trade and secret alliances by a powerful councilor have fallen into your hands. How will you use this leverage?',
    leftOptionRoot: 'Keep the letters secret, bind the lord to your will, and take a share of his gold',
    leftOutcomeRoot: 'The lord handed over heavy purses of gold in fear and backed your vote in council.',
    leftReason: 'Secret blackmail leverage enriched the treasury and secured council votes.',
    rightOptionRoot: 'Expose the corruption publicly, dismiss the lord, and uphold justice',
    rightOutcomeRoot: 'The smallfolk cheered your integrity, though corrupt nobles at court grew wary of you.',
    rightReason: 'Corruption was exposed; the people rejoiced while nobles bristled.',
  },
  // 5
  {
    titleRoot: 'Assassin in the Night Corridor',
    CoreSituation: 'Your guards cornered a hired killer armed with a Valyrian steel dagger near your bedchamber! {{playerTitle}} {{playerName}}, the assassin seems ready to talk.',
    leftOptionRoot: 'Interrogate the killer and launch a retaliatory raid against the house that hired him',
    leftOutcomeRoot: 'The faction behind the plot was punished with a devastating military raid!',
    leftReason: 'A stern military operation struck the assassination ring.',
    rightOptionRoot: 'Turn the assassin into a double agent and lure the enemy into a trap with false intelligence',
    rightOutcomeRoot: 'Thinking you dead, your rivals overextended and walked straight into your political trap!',
    rightReason: 'A counter-intelligence trap paralyzed your rivals.',
  },
  // 6
  {
    titleRoot: 'Defection of a Bannerman',
    CoreSituation: 'Word arrives that a key border commander has secretly struck a deal with a rival house to open the castle gates! {{playerTitle}} {{playerName}}, time is running out.',
    leftOptionRoot: 'Launch a night raid to depose the traitor commander and post loyal knights on the walls',
    leftOutcomeRoot: 'The treason was crushed before it began; the castle defenses were saved.',
    leftReason: 'Treason at the border keep was suppressed in time.',
    rightOptionRoot: 'Outbid the enemy with higher titles and gold to buy back the commander’s loyalty',
    rightOutcomeRoot: 'The commander handed over the enemy’s war plans to you, though your treasury shrank.',
    rightReason: 'The bannerman’s loyalty was bought back with gold and titles.',
  },
  // 7
  {
    titleRoot: 'Summit of Envoys & Truce Table',
    CoreSituation: 'Envoys of rival houses have gathered in a neutral pavilion. {{playerTitle}} {{playerName}}, they demand shared border keeps and trade transit for a lasting truce.',
    leftOptionRoot: 'Sign the treaty; share customs revenues and secure peace along the borders',
    leftOutcomeRoot: 'Peace ravens flew; trade routes reopened and the smallfolk breathed a sigh of relief.',
    leftReason: 'A diplomatic truce revived trade and public peace.',
    rightOptionRoot: 'Refuse territorial concessions and press your advantage through military deterrence',
    rightOutcomeRoot: 'Intimidated by your army’s strength, the envoys backed down, though tension lingered.',
    rightReason: 'An uncompromising stance elevated military prestige.',
  },
  // 8
  {
    titleRoot: 'Dynastic Betrothal & Dowry Bargain',
    CoreSituation: 'A wealthy house proposes a grand marriage alliance to unite your bloodlines. {{playerTitle}} {{playerName}}, this match will shift the balance of power.',
    leftOptionRoot: 'Accept the marriage proposal and host a seven-day royal wedding feast',
    leftOutcomeRoot: 'Two great houses united! Dowry gold and allied armies bolstered your strength.',
    leftReason: 'The dynastic marriage brought both dowry gold and a powerful alliance.',
    rightOptionRoot: 'Politely decline the offer to preserve your political independence',
    rightOutcomeRoot: 'You remained beholden to no house, and your own bannermen admired your independence.',
    rightReason: 'Independence was maintained, though the proposing house felt slighted.',
  },
  // 9
  {
    titleRoot: 'Trial of Heart and Crown',
    CoreSituation: 'Amid the storm of war and politics, {{characterName}} takes your hand on the moonlit terrace: "{{playerName}}, our duty is heavy, yet I cannot hide my heart from you."',
    leftOptionRoot: 'Listen to your heart and deepen this intimate bond',
    leftOutcomeRoot: 'The trust and romance between you became an unbreakable bond; together you can weather any storm.',
    leftReason: 'A deepening romantic bond elevated devotion to its peak.',
    rightOptionRoot: 'Say you treasure these feelings, but propose securing the realm’s safety first',
    rightOutcomeRoot: 'Your mature sense of duty deepened their respect and prevented court gossip.',
    rightReason: 'Duty and discretion preserved political balance at court.',
  },
  // 10
  {
    titleRoot: 'Pitched Battle & Flank Assault',
    CoreSituation: 'At misty dawn the enemy host has formed battle lines at the river ford! {{playerTitle}} {{playerName}}, your commanders await the order to charge.',
    leftOptionRoot: 'Shatter the enemy center with heavy cavalry and strike their command tent!',
    leftOutcomeRoot: 'The bold cavalry charge broke the enemy lines! Despite casualties, victory on the field is yours.',
    leftReason: 'Victory in the pitched battle established military supremacy.',
    rightOptionRoot: 'Hold the line with archers and a spear wall, luring the enemy into the marshland',
    rightOutcomeRoot: 'Thanks to your tactical patience, the enemy host bogged down in the mire and your troops triumphed with minimal losses!',
    rightReason: 'Terrain advantage secured a bloodless tactical victory.',
  },
  // 11
  {
    titleRoot: 'Rations & Ramparts Under Siege',
    CoreSituation: 'Siege trebuchets pound the walls while food stores inside the keep dwindle. {{playerTitle}} {{playerName}}, how will you hold the defense?',
    leftOptionRoot: 'Lead a midnight sally through the postern gate and burn the enemy trebuchets!',
    leftOutcomeRoot: 'The daring raid set the enemy siege towers ablaze; garrison morale soared!',
    leftReason: 'Enemy siege engines were destroyed in a night raid.',
    rightOptionRoot: 'Bring in secret grain supplies by sea with smuggler ships and reinforce the walls',
    rightOutcomeRoot: 'Sacks of onions and grain reached the keep; the threat of starvation was lifted.',
    rightReason: 'Secret sea provisions saved the smallfolk and garrison.',
  },
  // 12
  {
    titleRoot: 'War Council & Supply Lines',
    CoreSituation: 'Around the Painted Table your commanders debate: should we disperse our forces across border keeps or form a central strike army, {{playerTitle}} {{playerName}}?',
    leftOptionRoot: 'Form a professional heavy-armored central army and longbow corps',
    leftOutcomeRoot: 'Your central host gained the striking power to intervene rapidly on any front.',
    leftReason: 'A professional central army raised military power to its peak.',
    rightOptionRoot: 'Fortify border keeps and local militias to create defense in depth',
    rightOutcomeRoot: 'Villages and mountain passes were secured; the smallfolk feel safe.',
    rightReason: 'Border garrisons strengthened public security.',
  },
  // 13
  {
    titleRoot: 'Street Uprising & Bread Riot',
    CoreSituation: 'Driven by soaring food prices, an angry mob has gathered in the square and begun throwing stones! "{{playerTitle}} {{playerName}}, we want bread and justice!" they cry.',
    leftOptionRoot: 'Open the royal granaries, distribute free grain to the people, and cap guild prices',
    leftOutcomeRoot: 'The angry crowd calmed and your name echoed through the squares as a savior.',
    leftReason: 'Opening the granaries turned a popular revolt into devotion.',
    rightOptionRoot: 'Clear the square with the City Watch and arrest the ringleaders',
    rightOutcomeRoot: 'Order was harshly restored in the streets, though resentment smoldered in the people’s hearts.',
    rightReason: 'The riot was suppressed by force; popular support fell.',
  },
  // 14
  {
    titleRoot: 'The Iron Bank & Treasury Balance',
    CoreSituation: 'An envoy from the Iron Bank of Braavos reminds you of maturing debts and new loan terms: "The Iron Bank will have its due, {{playerTitle}} {{playerName}}."',
    leftOptionRoot: 'Levy a wealth tax on rich nobles and luxury port trade to pay off the debt',
    leftOutcomeRoot: 'The Iron Bank debt was settled and treasury credit rose, though the nobility complained.',
    leftReason: 'A noble wealth tax strengthened the treasury and Iron Bank standing.',
    rightOptionRoot: 'Restructure the debt with new trade charters and allocate gold to the army and public works',
    rightOutcomeRoot: 'Production and the army grew stronger, though interest payments will require future care.',
    rightReason: 'Resources were directed toward domestic investment and the army.',
  },
  // 15
  {
    titleRoot: 'Merchant Fleet & Winter Granaries',
    CoreSituation: 'Grand trade caravans from the Free Cities and the Reach have arrived in port. {{playerTitle}} {{playerName}}, how shall we allocate the supplies?',
    leftOptionRoot: 'Stockpile grain and timber in winter granaries and offer them to the people at fair prices',
    leftOutcomeRoot: 'Winter reserves were secured; public prosperity and loyalty grew.',
    leftReason: 'Winter granaries were filled, protecting the populace.',
    rightOptionRoot: 'Export the goods at high profit and fill the treasury vaults with gold',
    rightOutcomeRoot: 'The treasury vaults overflowed with gold dragons!',
    rightReason: 'Maritime trade brought a massive influx of gold to the treasury.',
  },
  // 16
  {
    titleRoot: 'Old Gods, Faith of the Seven & Red Priests',
    CoreSituation: 'Tensions rise among followers of different faiths. Temple priests demand official privileges and judicial authority from the court, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Guarantee freedom of worship for all faiths but keep judicial power strictly with the crown',
    leftOutcomeRoot: 'Your secular and fair ruling pleased both Northmen and sensible nobles.',
    leftReason: 'Religious freedom and unified law brought stability.',
    rightOptionRoot: 'Donate gold to the temples and win the priests’ influence over the commonfolk',
    rightOutcomeRoot: 'Your name was blessed in sermons; popular support climbed rapidly.',
    rightReason: 'Temple donations expanded your support among the people.',
  },
  // 17
  {
    titleRoot: 'Raven from Castle Black & Watch on the Wall',
    CoreSituation: 'A black-winged raven has arrived from Castle Black: the Night’s Watch urgently needs provisions, arrows, and recruits, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Send elite guards, master blacksmiths, and two hundred wagons of supplies to the Wall',
    leftOutcomeRoot: 'The Night’s Watch was fortified! Your northern border stands strong as iron.',
    leftReason: 'The Wall garrison was reinforced, strengthening Northern defense.',
    rightOptionRoot: 'Empty the dungeons into the Night’s Watch to spare treasury expense',
    rightOutcomeRoot: 'The dungeons were cleared and manpower reached the Wall, though trained soldiers remained scarce.',
    rightReason: 'Prisoner conscription supplied recruits to the Wall without draining gold.',
  },
  // 18
  {
    titleRoot: 'Tracks of the Dead & Dragonglass',
    CoreSituation: 'Northern rangers encountered blue-eyed corpses in the haunted forest that nothing but fire or obsidian can kill! {{playerTitle}} {{playerName}}, how will you prepare for this supernatural threat?',
    leftOptionRoot: 'Work the Dragonstone obsidian mines at full capacity and arm all hosts with fire arrows',
    leftOutcomeRoot: 'Thousands of dragonglass spears and arrowheads were forged; your army is ready for the darkness!',
    leftReason: 'Dragonglass armament multiplied your military strength.',
    rightOptionRoot: 'Send proof to all Great Houses to forge a united Northern defense pact',
    rightOutcomeRoot: 'Old feuds were set aside as nobles united for the common defense.',
    rightReason: 'A grand coalition against the darkness united the nobility.',
  },
  // 19
  {
    titleRoot: 'Dragon Wings Across the Sky',
    CoreSituation: 'Colossal dragons glide through the clouds, striking terror into enemy armies, yet villagers fear for their flocks, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Unleash the dragons as a deterrent over enemy fleets and military fortifications',
    leftOutcomeRoot: 'Enemy lines scattered at a single dragon roar; your military power is unmatched!',
    leftReason: 'Dragon power elevated military deterrence to its zenith.',
    rightOptionRoot: 'Compensate shepherds and villagers with gold and keep dragon flights strictly controlled',
    rightOutcomeRoot: 'The smallfolk took pride in the dragons’ protection and admired your mercy.',
    rightReason: 'Smallfolk losses were compensated, preserving public trust.',
  },
  // 20
  {
    titleRoot: 'Legacy of Fire and Blood',
    CoreSituation: 'Old Targaryen loyalists rally beneath the three-headed dragon banner. {{playerTitle}} {{playerName}}, how will you represent the heritage of Valyria?',
    leftOptionRoot: 'Promise justice and reform to rally the smallfolk and young lords beneath the new banner',
    leftOutcomeRoot: 'The Targaryen restoration gained strength through hope and reform rather than fear.',
    leftReason: 'A reformist Targaryen vision gathered broad support.',
    rightOptionRoot: 'Follow Aegon the Conqueror’s way: raise up those who kneel, warn with fire those who defy!',
    rightOutcomeRoot: 'Unshakable military authority was established and hesitant castles threw open their gates.',
    rightReason: 'Aegon the Conqueror’s strategy expanded military might.',
  },
  // 21
  {
    titleRoot: 'The Heart Tree of Winterfell & Northern Honor',
    CoreSituation: 'Northern lords have gathered in the snowy courtyard of Winterfell. {{playerTitle}} {{playerName}}, how will you fulfill the words "Winter Is Coming"?',
    leftOptionRoot: 'Expand the glass gardens and winter grain vaults of the Northern keeps',
    leftOutcomeRoot: 'The people of the North will not starve even in the harshest winter; devotion to the Stark banner deepened.',
    leftReason: 'Winterfell’s winter preparations united the North.',
    rightOptionRoot: 'Put Northern spearmen and archers through rigorous winter warfare drills',
    rightOutcomeRoot: 'The Northern host became invincible in snowstorms against southern armies.',
    rightReason: 'Winter warfare drills strengthened the Northern army.',
  },
  // 22
  {
    titleRoot: 'Gold of Casterly Rock & Roar of the Lion',
    CoreSituation: 'Lannister goldsmiths and Lannisport bankers present a new trade and military financing plan: "A Lannister always pays his debts, {{playerTitle}} {{playerName}}."',
    leftOptionRoot: 'Expand the Lannisport merchant fleet and channel gold revenues into the royal treasury',
    leftOutcomeRoot: 'The flow of gold accelerated; the treasury grew rich as merchant guilds celebrated.',
    leftReason: 'Lannisport gold trade enriched the treasury.',
    rightOptionRoot: 'Equip the crimson-cloaked Lannister infantry with the finest steel plate',
    rightOutcomeRoot: 'Lannister legions struck fear into all rivals with their discipline and armor.',
    rightReason: 'The Lannister host was outfitted in full steel.',
  },
  // 23
  {
    titleRoot: 'Storm’s End & Banner of the Stag',
    CoreSituation: 'The lords of the Stormlands have raised their banners proclaiming "Ours Is the Fury." {{playerTitle}} {{playerName}}, where will you direct this fierce strength?',
    leftOptionRoot: 'Deploy Stormlands knights for border security and naval defense',
    leftOutcomeRoot: 'Shipbreaker Bay and the eastern coasts were secured like a fortress.',
    leftReason: 'Stormlands knights became the backbone of the army.',
    rightOptionRoot: 'Host a grand unity feast at Storm’s End to reconcile estranged Baratheon bannermen',
    rightOutcomeRoot: 'Storm lords once divided by sibling strife raised their goblets and united anew!',
    rightReason: 'Baratheon bannermen united at the peace feast.',
  },
  // 24
  {
    titleRoot: 'The Iron Price & The Seastone Chair',
    CoreSituation: 'On the rope bridges of Pyke, the Ironborn grow restless for sea campaigns. {{playerTitle}} {{playerName}}, what course will you chart for the Iron Fleet?',
    leftOptionRoot: 'Task the Iron Fleet with clearing pirates and guarding maritime trade routes',
    leftOutcomeRoot: 'Captains grew rich on prize shares and customs duties while sea trade flourished.',
    leftReason: 'The Iron Fleet protected maritime trade and generated wealth.',
    rightOptionRoot: 'Launch a lightning raid on enemy ports and capture their shipyards',
    rightOutcomeRoot: 'The enemy fleet was caught off guard at anchor; naval supremacy is yours!',
    rightReason: 'A naval raid boosted military power and plunder.',
  },
  // 25
  {
    titleRoot: 'The Golden Rose & Bounty of the Reach',
    CoreSituation: 'Highgarden has yielded a record harvest of wheat, fruit, and golden roses this year. {{playerTitle}} {{playerName}}, Olenna and Margaery Tyrell ask how to use this abundance.',
    leftOptionRoot: 'Send the harvest to cities across the Seven Kingdoms at fair prices to win the people’s love',
    leftOutcomeRoot: 'Supply wagons rolling down the Roseroad were greeted with cheers in every city!',
    leftReason: 'Highgarden’s harvest brought abundance across the realm.',
    rightOptionRoot: 'Turn half the harvest into army campaign rations and export the rest for gold',
    rightOutcomeRoot: 'Both the treasury and the army’s logistical strength grew immensely.',
    rightReason: 'Harvest exports and army provisioning increased your strength.',
  },
  // 26
  {
    titleRoot: 'Sun and Spear: Unbowed Dorne',
    CoreSituation: 'Dornish lords and the Sand Snakes have gathered in the Water Gardens of Sunspear. {{playerTitle}} {{playerName}}, how shall we strengthen Dorne’s ancient laws and desert borders?',
    leftOptionRoot: 'Ratify Dorne’s equal primogeniture law and autonomous trade rights',
    leftOutcomeRoot: 'Dornish houses pledged full loyalty to you; your southern desert borders are secure.',
    leftReason: 'Respect for Dornish laws forged a strong southern alliance.',
    rightOptionRoot: 'Fortify the Boneway passes with Dornish spearmen and scorpion batteries',
    rightOutcomeRoot: 'The passes of Dorne became a lethal fortress no invading army could breach.',
    rightReason: 'The Boneway passes were militarily fortified.',
  },
  // 27
  {
    titleRoot: 'The Eyrie & Knights of the Bloody Gate',
    CoreSituation: 'Mountain clans of the Moon threaten Vale roads while the Knights of the Vale await orders. {{playerTitle}} {{playerName}}, what will you decree at the Eyrie?',
    leftOptionRoot: 'Clear the mountain passes with the Knights of the Vale and reinforce allied fronts',
    leftOutcomeRoot: 'The finest heavy cavalry in Westeros turned the tide on the battlefield!',
    leftReason: 'The Knights of the Vale added immense strength to your army.',
    rightOptionRoot: 'Provide steel weapons and provisions to the mountain clans and employ them as border wardens',
    rightOutcomeRoot: 'Using Tyrion’s tactic, the mountain clans were won over to your side and the roads became safe.',
    rightReason: 'Mountain clans were enlisted as border guardians.',
  },
  // 28
  {
    titleRoot: 'Family, Duty, Honor: Defense of the Trident',
    CoreSituation: 'The Trident is in flood season and riverfolk seek refuge in Riverrun from raiders, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Open the castle gates to the villagers and use the river sluices as a defensive line',
    leftOutcomeRoot: 'Public gratitude soared and the river channels halted the enemy advance.',
    leftReason: 'Riverfolk were protected and river defenses established.',
    rightOptionRoot: 'Set up a rapid supply line with river barges and tax customs crossings',
    rightOutcomeRoot: 'River trade was disciplined and your army’s supply capacity grew.',
    rightReason: 'River trade supplied resources to the treasury and army.',
  },
  // 29
  {
    titleRoot: 'Small Council Session & Budget Crisis',
    CoreSituation: 'In the Small Council chamber, the Master of Coin and Master of Ships clash over budget priorities. {{playerTitle}} {{playerName}}, the final word is yours.',
    leftOptionRoot: 'Channel the budget into the Royal Fleet and City Watch garrison',
    leftOutcomeRoot: 'War galleys and rampart guards were reinforced.',
    leftReason: 'Small Council funds were directed to the fleet and army.',
    rightOptionRoot: 'Invest the budget in trade guildhalls, aqueducts, and treasury reserves',
    rightOutcomeRoot: 'City infrastructure and tax revenues rose steadily.',
    rightReason: 'Infrastructure and trade investment grew the treasury.',
  },
  // 30
  {
    titleRoot: 'Conscience, Oaths & Redemption',
    CoreSituation: '{{characterName}} comes to you burdened by remorse over a grave past mistake: "{{playerTitle}} {{playerName}}, everyone judges me by my past. Will you grant me a chance at redemption?"',
    leftOptionRoot: 'Show your trust and assign them a critical mission to prove their honor',
    leftOutcomeRoot: '{{characterName}} did not betray your trust and fought tooth and nail to win victory!',
    leftReason: 'A chance at redemption yielded unshakable loyalty and success.',
    rightOptionRoot: 'Say past mistakes carry a price; keep them in the rear under strict supervision',
    rightOutcomeRoot: 'Discipline was maintained and complaining nobles were appeased, though {{characterName}} grew sorrowful.',
    rightReason: 'Strict discipline satisfied the nobility.',
  },
  // 31
  {
    titleRoot: 'Blood Ties & Sibling Disagreement',
    CoreSituation: 'Siblings within the dynasty have fallen into a fierce dispute over ruling strategy. {{playerTitle}} {{playerName}}, how will you mend the rift within the family?',
    leftOptionRoot: 'Convene a family council; show that outside enemies seek to divide them and reconcile them',
    leftOutcomeRoot: 'The lone wolf dies, but the pack survives! Family unity is stronger than ever.',
    leftReason: 'Internal dynastic unity was restored.',
    rightOptionRoot: 'Divide authority with clear boundaries, assigning each sibling a separate front',
    rightOutcomeRoot: 'Rivalry turned into a productive division of labor.',
    rightReason: 'Clear division of duties improved military and administrative efficiency.',
  },
  // 32
  {
    titleRoot: 'Young Heirs & Leaders of Tomorrow',
    CoreSituation: 'The education and wardship of young dynastic heirs is on the agenda. {{playerTitle}} {{playerName}}, how shall we raise the next generation?',
    leftOptionRoot: 'Train the young heirs in both scholarship with Citadel maesters and warfare with master knights',
    leftOutcomeRoot: 'The future lords and ladies are growing up both wise and valiant!',
    leftReason: 'Comprehensive education of heirs secured the future of the houses.',
    rightOptionRoot: 'Host the heirs of Great Houses at court as honored wards to guarantee their families’ loyalty',
    rightOutcomeRoot: 'No house dared rebel at the risk of endangering their heir at court.',
    rightReason: 'Keeping noble wards at court prevented rebellion.',
  },
  // 33
  {
    titleRoot: 'Little Birds & Coded Ravens',
    CoreSituation: 'Your spy network intercepted a coded raven scroll from an enemy keep, though there is a chance it may be bait, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Spend gold to verify the intelligence through a second source and set a quiet ambush',
    leftOutcomeRoot: 'The intelligence proved true! The enemy supply column was ambushed and captured.',
    leftReason: 'Verified spy intelligence brought victory and plunder.',
    rightOptionRoot: 'Place informants in every port and inn to expand the spy network across the realm',
    rightOutcomeRoot: 'Now not even a bird flies in the Seven Kingdoms without your knowledge!',
    rightReason: 'An expanded intelligence network increased political control.',
  },
  // 34
  {
    titleRoot: 'Voice of Blacksmiths, Farmers & Inns',
    CoreSituation: 'Craft guild masters and peasant spokesmen appear before you: "{{playerTitle}} {{playerName}}, we seek your support for road safety and fair market rules."',
    leftOptionRoot: 'Increase Kingsroad patrols and support the guilds with tax exemptions',
    leftOutcomeRoot: 'Markets bustled, forges worked day and night, and the smallfolk blessed your name.',
    leftReason: 'Support for artisans and farmers delighted the smallfolk.',
    rightOptionRoot: 'Bind the guilds to standardized weapon and ration production for the army',
    rightOutcomeRoot: 'Military output and treasury discipline rose rapidly.',
    rightReason: 'Guild production strengthened both army and treasury.',
  },
  // 35
  {
    titleRoot: 'Port Outbreak & Threat of Greyscale',
    CoreSituation: 'Signs of Greyscale and fever have been spotted aboard a merchant ship arriving from the East! {{playerTitle}} {{playerName}}, you must act before the plague spreads into the city.',
    leftOptionRoot: 'Quarantine the port and establish infirmaries with Citadel maesters to treat the sick',
    leftOutcomeRoot: 'Using Samwell Tarly’s methods, the outbreak was contained; the people are grateful you saved their lives.',
    leftReason: 'Scientific quarantine and infirmaries halted the epidemic.',
    rightOptionRoot: 'Burn the infected ships before they dock and temporarily close all maritime trade',
    rightOutcomeRoot: 'The plague was stopped cold and the army was spared, though merchants suffered losses.',
    rightReason: 'A strict quarantine protected the health of the army.',
  },
  // 36
  {
    titleRoot: 'Freezing Blizzard & Famine at the Gates',
    CoreSituation: 'The white raven has arrived from the Citadel: a freezing storm ruined the crops and hunger has begun in distant villages, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Cancel court feasts, open noble granaries, and send emergency relief caravans to the villages',
    leftOutcomeRoot: 'Thousands of villagers were saved from freezing and starvation; the smallfolk sang ballads of your justice.',
    leftReason: 'Famine relief saved the lives of the smallfolk.',
    rightOptionRoot: 'Ration provisions primarily for the army and strategic fortresses',
    rightOutcomeRoot: 'Garrisons and the treasury weathered the winter strongly, though the countryside suffered.',
    rightReason: 'Military reserves were preserved, though the populace struggled.',
  },
  // 37
  {
    titleRoot: 'Highborn Captive & Exile Bargain',
    CoreSituation: 'The family of a high-ranking noble captured in battle offers a heavy gold ransom and prisoner exchange, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Accept the gold ransom and prisoner exchange to free your own captured knights',
    leftOutcomeRoot: 'Your treasury filled with gold and your freed knights rejoined your ranks!',
    leftReason: 'Ransom and prisoner exchange strengthened the treasury and army.',
    rightOptionRoot: 'Refuse the ransom; hold the captive as a political hostage to paralyze the enemy house',
    rightOutcomeRoot: 'Fearing for the captive’s life, the rival house was forced to halt its attacks.',
    rightReason: 'A strategic hostage restrained the enemy house.',
  },
  // 38
  {
    titleRoot: 'The King’s Justice & Trial by Combat',
    CoreSituation: 'A powerful lord stands accused of seizing peasant lands and demands a Trial by Combat in court, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Send your finest champion into the arena and restore the seized lands to the villagers',
    leftOutcomeRoot: 'Your champion triumphed! Your justice inspired awe among both smallfolk and honorable knights.',
    leftReason: 'Fair judgment and victory crowned public trust.',
    rightOptionRoot: 'Impose a heavy treasury fine on the lord and settle the case without bloodshed',
    rightOutcomeRoot: 'The treasury gained a hefty indemnity and a noble blood feud was averted.',
    rightReason: 'A compensation settlement filled the treasury.',
  },
  // 39
  {
    titleRoot: 'Grand Knightly Tourney & The Lists',
    CoreSituation: 'Knights from across the realm have gathered for a grand joust and melee. {{playerTitle}} {{playerName}}, how will you preside over the tourney?',
    leftOptionRoot: 'Host a grand joust and archery tourney with gold prizes and recruit the victors into your guard',
    leftOutcomeRoot: 'The tourney thrilled the populace and the realm’s finest warriors entered your service!',
    leftReason: 'The grand tourney cheered the people and recruited elite knights.',
    rightOptionRoot: 'Collect treasury revenue from tourney wagers and highborn viewing boxes',
    rightOutcomeRoot: 'The tourney paid for itself and left net gold in the royal vaults!',
    rightReason: 'Tourney organization generated revenue for the treasury.',
  },
  // 40
  {
    titleRoot: 'Braavos, Qarth & Uncharted Seas',
    CoreSituation: 'Sea captains and explorers request permission for an expedition to Braavos, Volantis, and new trade routes west of Westeros, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Finance the exploration and trade fleet; establish embassies in distant realms',
    leftOutcomeRoot: 'Rare spices, Valyrian manuscripts, and lucrative customs treaties arrived from afar!',
    leftReason: 'An overseas expedition brought wealth to the treasury.',
    rightOptionRoot: 'Assign the fleet to coastal defense and strategic island outposts',
    rightOutcomeRoot: 'Strategic islands in the Narrow Sea were brought under control; naval power grew.',
    rightReason: 'Naval outposts reinforced dominance at sea.',
  },
  // 41
  {
    titleRoot: 'Vision in the Flames & Warning of the Three-Eyed Raven',
    CoreSituation: '{{characterName}} claims to have seen a great approaching storm and a hidden ambush in the flames and the rustling weirwood leaves, {{playerTitle}} {{playerName}}.',
    leftOptionRoot: 'Heed the vision; alter the army’s march route and send out vanguard scouts',
    leftOutcomeRoot: 'The prophecy proved true! The enemy ambush failed and your host seized the high ground unscathed.',
    leftReason: 'Heeding the prophetic warning foiled an enemy ambush.',
    rightOptionRoot: 'Keep magic at arm’s length, but take rational defensive precautions with Citadel maesters',
    rightOutcomeRoot: 'Skeptical lords appreciated your rational stance and the defense held firm.',
    rightReason: 'Prudent defensive measures increased noble confidence.',
  },
  // 42
  {
    titleRoot: 'Nexus of Fate: The Unexpected Summit',
    CoreSituation: 'Two great powers that would never meet in ordinary history have sat down at the same table through your mediation! {{playerTitle}} {{playerName}}, what move will rewrite the history of Westeros?',
    leftOptionRoot: 'Seal the Grand Pact of Westeros, ending the historic blood feud!',
    leftOutcomeRoot: 'The course of history changed! Former enemies shook hands under your leadership for a shared future.',
    leftReason: 'An alternate-history pact established a new balance of power in Westeros.',
    rightOptionRoot: 'Use the strategic advantage of this summit to forge your own independent empire',
    rightOutcomeRoot: 'While your rivals stood stunned, your army and treasury took control of the most strategic keeps!',
    rightReason: 'A bold strategic maneuver elevated military and economic power.',
  },
];

export const EN_CANON_CARDS: Record<
  string,
  {
    title: string;
    text: string;
    leftLabel: string;
    leftOutcome: string;
    leftReason: string;
    rightLabel: string;
    rightOutcome: string;
    rightReason: string;
  }
> = {
  canon_001_robert_arrival: {
    title: 'King Robert’s Summons & The Death of Jon Arryn',
    text: '{{playerTitle}} {{playerName}}, Hand of the King Jon Arryn has died suddenly. King Robert Baratheon raises his wine goblet and roars: "I am surrounded by Lannister flatterers! I want you and Ned Stark to hold the reins of the realm together."',
    leftLabel: 'Secretly investigate Jon Arryn’s death alongside Ned Stark.',
    leftOutcome: 'In Grand Maester Pycelle’s records, you discover Jon Arryn spent his final days studying the lineages of the Great Houses, repeating "The seed is strong."',
    leftReason: 'The secret investigation drew notice at court but earned Ned Stark’s trust.',
    rightLabel: 'Decline the investigation; strengthen King Robert’s grand tourney and royal host.',
    rightOutcome: 'Treasury gold flowed into tourney prizes as knights and smallfolk celebrated, though assassins in the shadows breathed easy.',
    rightReason: 'The King’s tourney delighted the people and knights but drained the treasury.',
  },
  canon_002_ned_secret_book: {
    title: 'The Baratheon Line & Golden-Haired Children',
    text: 'Ned Stark places the heavy tome of lineages before you: "{{playerName}}, every Baratheon in history has had black hair—yet Joffrey, Myrcella, and Tommen are golden-haired. Cersei’s children were not fathered by King Robert, but by Jaime Lannister!"',
    leftLabel: 'Warn Ned: "Do not confront Cersei! Let us take the proof straight to Robert and the guards!"',
    leftOutcome: 'Ned heeded your counsel and rallied the guards before warning Cersei. The poisoned wine plot during the royal hunt was foiled at the last moment!',
    leftReason: 'The Lannister conspiracy was exposed; tension at court reached a fever pitch.',
    rightLabel: 'Give Cersei a chance to flee the city first to spare the children’s lives.',
    rightOutcome: 'Cersei viewed your mercy as weakness: "When you play the game of thrones, you win or you die!" King Robert was mortally wounded on the hunt.',
    rightReason: 'Cersei bought time and bribed the Gold Cloaks.',
  },
  canon_003_boar_hunt: {
    title: 'Shadow of Treason in the Throne Room',
    text: 'King Robert lies on his deathbed. Littlefinger whispers in your ear: "{{playerTitle}} {{playerName}}, Ned Stark wants to hand the throne to Stannis. The Gold Cloaks answer to me; if we arrest Ned, you will be the most powerful figure at court."',
    leftLabel: 'Foil Littlefinger’s plot! Fight your way out of the palace with your own guards to rescue Ned Stark.',
    leftOutcome: 'Through a fierce skirmish you got Ned Stark out of the Red Keep alive! Retreating North, Ned swore an oath of eternal gratitude to you.',
    leftReason: 'Ned Stark was saved from execution! The Northern houses salute your honor.',
    rightLabel: 'Stand with Joffrey and Cersei in the throne room and witness Ned Stark’s judgment at the Sept of Baelor.',
    rightOutcome: 'Joffrey broke his promise and ordered Ser Ilyn Payne: "Bring me his head!" Ned Stark’s execution set the North and all Westeros ablaze!',
    rightReason: 'Ned Stark was executed; the North rose in rebellion and the War of the Five Kings erupted.',
  },
  canon_004_ned_survival_branch: {
    title: 'Alternate History: Safe Return of the Wolf',
    text: 'Thanks to you, Ned Stark survived the conspiracy and raised the banners of the North in alliance with you: "{{playerTitle}} {{playerName}}, I owe you my life and my daughters’ lives. The swords of Winterfell now march at your word."',
    leftLabel: 'Unite with Ned and Stannis to try the Lannisters before a lawful Great Council.',
    leftOutcome: 'With the North and Dragonstone united, Tywin Lannister was forced to step back.',
    leftReason: 'The Stark-Baratheon bloc established an unshakable balance in the realm.',
    rightLabel: 'Sign a secret non-aggression pact with the North and strengthen your own claim to the throne.',
    rightOutcome: 'Ned Stark secured the North while you consolidated your power in the capital.',
    rightReason: 'The Northern front was secured and the treasury recovered.',
  },
  canon_005_tyrion_secret_warning: {
    title: 'Midnight Visit of the Little Lion',
    text: 'Tyrion Lannister slips into your chambers through a secret passage at midnight. He warns that Cersei is preparing a lethal plot against you and extends his hand: "If you want to foil my sister’s plan, you must trust me, {{playerTitle}} {{playerName}}."',
    leftLabel: 'Trust Tyrion and forge a secret alliance with him.',
    leftOutcome: 'With Tyrion’s intelligence, Cersei’s agent was captured. Tyrion now stands as your chief advisor in the most critical political crises.',
    leftReason: 'The alliance forged with Tyrion strengthened your standing among the nobility.',
    rightLabel: 'Reject Tyrion and report this secret meeting to Cersei.',
    rightOutcome: 'Cersei smiled with satisfaction, though the cold calculation in her eyes never changed. Tyrion whispered that he would never forget this betrayal.',
    rightReason: 'Loyalty was shown to the Queen, but trust at court was eroded.',
  },
  canon_006_tyrion_crisis_solution: {
    title: 'Tyrion’s Blackwater Chain & Treasury Move',
    text: 'Tyrion Lannister, whom you trusted earlier, lays an ingenious agreement with the harbor guilds on your table: "{{playerName}}, we have both fortified naval defenses with a great chain and seized the gold of customs smugglers."',
    leftLabel: 'Invest the gold into the defensive chain and city garrison.',
    leftOutcome: 'Harbor defenses became impregnable, and commanders applauded your partnership with Tyrion.',
    leftReason: 'Tyrion’s strategic plan boosted both military strength and the treasury.',
    rightLabel: 'Distribute the proceeds to Flea Bottom bakeries and the smallfolk.',
    rightOutcome: 'Prayers were offered in the streets of the capital in honor of you and Tyrion.',
    rightReason: 'The hunger of the smallfolk was relieved, eliminating the risk of revolt.',
  },
  canon_007_cersei_manipulation_backfire: {
    title: 'Cersei’s Poisoned Favor',
    text: 'After betraying Tyrion, you thought you had won Cersei’s friendship. Yet Cersei issued a decree shifting her own debts onto the taxes of your lands: "You are loyal to me, aren’t you, {{playerName}}? Then you will gladly bear this burden."',
    leftLabel: 'Grit your teeth and pay the Lannister debt from your own treasury.',
    leftOutcome: 'Your treasury took a heavy blow while Tyrion raised his goblet from afar with a bitter smile.',
    leftReason: 'Cersei used you for her own ends; your treasury was drained.',
    rightLabel: 'Tear up the decree and openly defy Cersei!',
    rightOutcome: 'You protected your gold, but Cersei Lannister is now preparing assassins for you.',
    rightReason: 'Bridges with Cersei were burned; a cold war began at court.',
  },
  canon_008_red_wedding_warning: {
    title: 'Wedding Invitation at the Twins & The Rains of Castamere',
    text: 'Walder Frey has invited Robb Stark and the Northern host to the Twins for Edmure Tully’s wedding. Yet Robb’s direwolf Grey Wind howls uneasily, and your spies whisper that Roose Bolton has been corresponding with Tywin Lannister!',
    leftLabel: 'Stop Robb Stark! Expose the Frey and Bolton treason and lay siege to the Twins!',
    leftOutcome: 'The crossbowmen in the feast gallery were caught unprepared! The Red Wedding conspiracy was crushed; Robb Stark and Catelyn Stark survived!',
    leftReason: 'The Red Wedding was prevented! The Northern army was saved from destruction.',
    rightLabel: 'Say guest right is sacred; do not object to entering the feast unarmed.',
    rightOutcome: 'The heavy doors were barred and the musicians began to play "The Rains of Castamere." As Roose Bolton drove his dagger home, he whispered, "The Lannisters send their regards."',
    rightReason: 'The Red Wedding massacre occurred; the heart of the North was shattered.',
  },
  canon_009_robb_northern_triumph: {
    title: 'Alternate History: Victory Oath of the Young Wolf',
    text: 'Robb Stark, whom you saved from the Red Wedding trap, took control of the Twins crossing and raised a goblet in your honor at Winterfell: "{{playerTitle}} {{playerName}}, the North remembers! Whenever you call your banners, the Stark hosts will march beside you."',
    leftLabel: 'Launch a joint campaign with Robb against Casterly Rock and King’s Landing.',
    leftOutcome: 'The Young Wolf’s cavalry tore through Lannister supply lines!',
    leftReason: 'A joint offensive with the Northern host brought major military and economic spoils.',
    rightLabel: 'Task the armies with fortifying the Wall and Northern keeps for the coming winter.',
    rightOutcome: 'The granaries of Winterfell and Castle Black were filled to the brim; the North is stronger than ever.',
    rightReason: 'Northern keeps were fortified against winter and the army of the dead.',
  },
  canon_010_purple_wedding: {
    title: 'The Purple Wedding & The Poisoned Goblet',
    text: 'At the wedding feast of King Joffrey and Margaery Tyrell, Joffrey chokes and collapses after drinking from his royal chalice! As Cersei screams accusations at Tyrion, Olenna Tyrell quietly winks as she walks past you.',
    leftLabel: 'Ensure a fair trial for Tyrion and support Oberyn Martell as his champion.',
    leftOutcome: 'Joffrey is dead. The Red Viper Oberyn Martell stepped forward as Tyrion’s champion against Gregor Clegane!',
    leftReason: 'Cruel Joffrey’s death relieved the populace; the trial echoed across the capital.',
    rightLabel: 'Stand with Cersei and testify for Tyrion’s conviction.',
    rightOutcome: 'Tyrion roared in fury, "I wish I had enough poison for the whole pack of you!" and demanded a trial by combat.',
    rightReason: 'The Lannister court faction was pleased, but Tyrion and Dorne grew hostile.',
  },
  canon_011_viper_vs_mountain: {
    title: 'The Red Viper and the Mountain: Trial by Combat',
    text: 'Oberyn Martell has pinned Gregor Clegane to the ground with his spear, but paces around the Mountain demanding a confession: "Elia Martell! You raped her! You murdered her! You killed her children! Who gave you the order?!" The Mountain lies in wait!',
    leftLabel: 'Shout into the arena to warn Oberyn: "Step back, Prince Oberyn—the Mountain still lives!"',
    leftOutcome: 'At your warning, Oberyn leapt back at the last second and drove his spear through the Mountain’s throat! Oberyn Martell survived and Tyrion was exonerated!',
    leftReason: 'Oberyn Martell triumphed! An unbreakable friendship was forged with Dorne.',
    rightLabel: 'Watch in silence; then help Jaime and Varys smuggle Tyrion out of the dungeons by night.',
    rightOutcome: 'With his last strength, the Mountain killed Oberyn. Escaping the dungeons that night, Tyrion shot his father Tywin Lannister with a crossbow and sailed for Essos!',
    rightReason: 'Oberyn and Tywin Lannister died; a massive power vacuum opened in the capital.',
  },
  canon_012_meereen_harpy: {
    title: 'Sons of the Harpy & Daznak’s Pit',
    text: 'In Meereen, gold-masked Sons of the Harpy ambush the Unsullied in the streets. Daenerys Targaryen turns to you: "{{playerTitle}} {{playerName}}, should I reopen the fighting pits to compromise with the noble families, or burn their pyramids with my dragons?"',
    leftLabel: 'Open Daznak’s Pit, but secretly surround the perimeter with the Unsullied and Second Sons.',
    leftOutcome: 'When the Sons of the Harpy sprung their trap in the arena, your prepared troops and Drogon descending from the sky annihilated the insurgents!',
    leftReason: 'The Harpy insurgency was crushed; Meereen and Slaver’s Bay were secured.',
    rightLabel: 'Confiscate the wealth of the slave masters and arm the popular councils.',
    rightOutcome: 'The freed populace formed a living wall around you and Daenerys, while the noble masters retreated in fury.',
    rightReason: 'The treasuries of Slaver’s Bay were seized and popular support peaked.',
  },
  canon_013_hardhome: {
    title: 'Massacre at Hardhome & Blue Eyes',
    text: 'On the shore of Hardhome beyond the Wall, a blizzard suddenly descends! Hundreds of thousands of wights hurl themselves off the cliffs to attack. Shattering a White Walker with Longclaw, Jon Snow shouts: "{{playerName}}, load the ships! The Night King is watching the pier!"',
    leftLabel: 'Hold the beach until the final moment to board thousands of Free Folk warriors onto the ships.',
    leftOutcome: 'You suffered heavy losses, but Tormund and thousands of Free Folk were saved. As the Night King raised his arms, the dead on the shore rose with glowing blue eyes.',
    leftReason: 'Thousands of lives were saved; the Free Folk are now ready to march into death for you.',
    rightLabel: 'Pull the fleet offshore immediately and launch an urgent dragonglass shipment from Dragonstone.',
    rightOutcome: 'You saved your fleet and core army without losses; dragonglass spears were immediately distributed to all keeps.',
    rightReason: 'The army was preserved and obsidian weapon production began against the White Walkers.',
  },
  canon_014_high_sparrow_trial: {
    title: 'Judgment at the Sept of Baelor & Wildfire',
    text: 'The High Sparrow has gathered the nobility in the Great Sept of Baelor for trial. Meanwhile, Qyburn reports that Cersei is about to ignite the barrels of wildfire beneath the Sept! Time is running out, {{playerTitle}} {{playerName}}!',
    leftLabel: 'Raid the vaults to extinguish the wildfire candles and arrest the High Sparrow under your own court!',
    leftOutcome: 'The catastrophic explosion was prevented at the last second! Margaery and Olenna Tyrell were saved, and the High Sparrow’s fanatics were disarmed!',
    leftReason: 'The Sept of Baelor and House Tyrell were saved from destruction!',
    rightLabel: 'Step back onto the Red Keep balcony and watch the green flames swallow the Sept of Baelor.',
    rightOutcome: 'With a deafening roar, the Sept of Baelor vanished in green flames! The High Sparrow and your rivals turned to ash, though the populace was struck with terror.',
    rightReason: 'The Sept of Baelor was destroyed with wildfire; rivals were erased but people and nobles were shaken.',
  },
  canon_015_battle_of_bastards: {
    title: 'Battle of the Bastards',
    text: 'On the snowfields before Winterfell, Ramsay Bolton’s spear wall is about to encircle your host. As Jon Snow fights in the vanguard, Sansa Stark tells you the Knights of the Vale await your signal behind the hills!',
    leftLabel: 'Launch a heavy cavalry charge with the Knights of the Vale into the Bolton flanks and breach Winterfell’s gate!',
    leftOutcome: 'The horns blew and the Vale cavalry shattered the Bolton ring! The Stark direwolf flies once more over the ramparts of Winterfell!',
    leftReason: 'Winterfell was retaken and Ramsay Bolton was overthrown!',
    rightLabel: 'Offer a general amnesty to the Bolton bannermen (Umber and Karstark) to leave Ramsay isolated on the field.',
    rightOutcome: 'Weary of Ramsay’s cruelty, the Northern houses lowered their banners. Without another Stark soldier dying, Ramsay was fed to his own hounds!',
    rightReason: 'The Northern army united without further bloodshed!',
  },
  canon_016_long_night_battle: {
    title: 'The Long Night: Last Stand in the Godswood',
    text: 'The army of the dead has breached the walls and the fire trenches are dying! The Night King walks toward Bran Stark beneath the Heart Tree. As Theon Greyjoy grips his spear, Arya Stark waits in the shadows for you to create a distraction!',
    leftLabel: 'Charge the White Walker generals with dragonfire and Valyrian steel guards to open a corridor for Arya!',
    leftOutcome: 'Arya Stark leapt from the shadows, dropped her Valyrian steel dagger into her other hand, and drove it into the Night King’s heart! The Night King and the entire army of the dead shattered into ice crystals!',
    leftReason: 'The Night King was destroyed! The Long Night ended and humanity was saved!',
    rightLabel: 'Lure the Night King into an obsidian trap using Bran’s warg power and Melisandre’s ring of fire!',
    rightOutcome: 'Ancient fire and dragonglass spears pierced the Night King simultaneously! Dawn rose once more over the North!',
    rightReason: 'The army of darkness was annihilated in a strategic trap; dawn returned.',
  },
  canon_017_bells_of_kings_landing: {
    title: 'The Bells of King’s Landing & The Iron Throne',
    text: 'The Golden Company has scattered, the Scorpion ballistas are silent, and the bells of surrender are ringing across the city! Atop Drogon, Daenerys Targaryen glares furiously at the Red Keep. Your decision now will seal the fate of the capital and the Iron Throne!',
    leftLabel: 'Calm Daenerys; take the Red Keep without burning the city and convene the Great Council.',
    leftOutcome: 'Half a million innocent people were spared from the flames! The people of the capital hailed you and Daenerys as saviors as the foundation of a new constitutional order was laid.',
    leftReason: 'King’s Landing was spared destruction; an era of peace and justice began in Westeros.',
    rightLabel: 'Melt the Red Keep with dragonfire and forge the new order of the Iron Throne from the ashes!',
    rightOutcome: 'Drogon’s flames melted the Red Keep and the Iron Throne. Fear silenced all opposition, though a deep wound remained in the hearts of the people.',
    rightReason: 'The Red Keep fell in fire and blood; absolute authority was established.',
  },
  chain_assassin_01_poison_cup: {
    title: 'Tears of Lys in the Night Wine',
    text: 'Your royal cupbearer collapsed seconds after taking a sip of your wine! Lord Varys hurries to your side: "{{playerTitle}} {{playerName}}, this is the Tears of Lys poison. Shall we interrogate the kitchen guards or track the Braavosi merchant who sold the vial?"',
    leftLabel: 'Secretly shadow the Braavosi poison merchant using the little birds.',
    leftOutcome: 'The merchant was spotted at the harbor receiving a heavy purse of gold from an officer in a gold cloak!',
    leftReason: 'Patient intelligence tracking uncovered the trail to the financier of the assassination.',
    rightLabel: 'Throw the palace kitchen staff and guards into the dungeons immediately for interrogation!',
    rightOutcome: 'Terrified, a squire confessed who had left the vial of poison.',
    rightReason: 'Harsh interrogation spread fear at court, but yielded a vital lead.',
  },
  chain_assassin_02_interrogation: {
    title: 'The Seal Behind the Assassination',
    text: 'A wax-sealed letter was found on the captured courier. Arya Stark steps out of the shadows and drives her dagger into the table: "{{playerName}}, the ambitious council lord who ordered the hit is preparing to flee the harbor tonight. Will you bring him to open court or shall we finish him quietly?"',
    leftLabel: 'Put the culprit on open trial before all the lords and confiscate his estates for the treasury.',
    leftOutcome: 'A fair trial demonstrated the rule of law to nobles and smallfolk alike, while the traitor’s wealth flowed into the treasury.',
    leftReason: 'The conspirator was convicted before the law and his wealth confiscated.',
    rightLabel: 'Give Arya leave; eliminate the conspirators quietly in the dead of night.',
    rightOutcome: 'By morning, none of the conspirators remained alive. Your rivals tremble in fear.',
    rightReason: 'The conspiracy was silently purged, sending a chilling warning to your enemies.',
  },
  rare_001_valyrian_blade_discovery: {
    title: 'Rare Event: Lost Valyrian Steel Sword',
    text: 'In the deep vaults of Dragonstone, a Valyrian steel sword from the old Targaryen era—its rippled dark blade still razor-sharp—has been unearthed! Gendry examines the blade in awe: "{{playerTitle}} {{playerName}}, this is a priceless treasure!"',
    leftLabel: 'Buckle on the sword and wield it yourself at the head of your army!',
    leftOutcome: 'With the legendary Valyrian blade in your hand, the morale of your soldiers and the respect of your knights reached new heights!',
    leftReason: 'The rare Valyrian steel sword multiplied your military strength and prestige!',
    rightLabel: 'Pledge it as collateral to the Iron Bank of Braavos to open a massive gold fund for the realm.',
    rightOutcome: 'Backed by the Valyrian blade, the Iron Bank granted the treasury unprecedented credit and trade privileges!',
    rightReason: 'The Valyrian heirloom filled the treasury with gold.',
  },
  rare_002_dragon_bonding_moment: {
    title: 'Rare Event: Dragon’s Breath & Trust',
    text: 'On the rocky cliffside, a colossal dragon lands before you. Baring its teeth and exhaling smoke as Daenerys watches breathlessly, the dragon lowers its massive snout toward your outstretched hand, {{playerTitle}} {{playerName}}!',
    leftLabel: 'Do not look away—place your hand fearlessly upon the dragon’s scales.',
    leftOutcome: 'With a deep rumble, the dragon bowed its head to your palm! Daenerys whispered in awe: "My dragons do not bow to just anyone, {{playerName}}."',
    leftReason: 'You won the dragon’s trust! The power of the skies is with you.',
    rightLabel: 'Step back respectfully and order a dedicated feeding and sanctuary ground built for the dragons.',
    rightOutcome: 'Your wise caution ensured both the dragons’ safety and calmed the fears of the populace.',
    rightReason: 'The dragons were safely placed under royal protection.',
  },
  rare_003_secret_marriage_pact: {
    title: 'Rare Event: Secret Marriage Proposal Beneath the Heart Tree',
    text: 'As moonlight bathes the garden, Margaery Tyrell takes your hand: "{{playerTitle}} {{playerName}}, I am weary of false bargains at court. Will you unite both our hearts and our houses in a secret vow?"',
    leftLabel: 'Accept the proposal and unite your lives with a sacred vow.',
    leftOutcome: 'The secret marriage vow warmed your heart and secured the boundless backing of Highgarden!',
    leftReason: 'The secret dynastic marriage boosted both the treasury and popular support.',
    rightLabel: 'Though your heart desires it, propose holding the wedding by official council decree for the balance of the realm.',
    rightOutcome: 'Margaery respected your prudence, and official betrothal preparations began with the approval of all the nobility.',
    rightReason: 'An official betrothal won the praise of all the Great Houses.',
  },
};

export function localizeCard(card: ScenarioCard, lang: GameLanguage, state?: GameRunState): ScenarioCard {
  if (lang === 'tr') return card;

  // Strip any Turkish relationship lead-in prefix before localizing
  let cleanCard = card;
  const trPrefixes = [
    /^\[Kalbinin Ortağı\]\s*/,
    /^\[Açık Düşmanlık\][^:]+:\s*/,
    /^\[Güvensiz Bakışlar\]\s*/,
    /^\[Sadık Dostun\]\s*/,
  ];
  let strippedText = card.text;
  for (const rx of trPrefixes) {
    strippedText = strippedText.replace(rx, '');
  }

  // 1. Check if it's a Canon / Chain card
  const canonEn = EN_CANON_CARDS[card.id];
  if (canonEn) {
    cleanCard = {
      ...card,
      title: canonEn.title,
      text: canonEn.text,
      leftChoice: {
        ...card.leftChoice,
        label: canonEn.leftLabel,
        outcomeText: canonEn.leftOutcome,
        indicators: {
          ...card.leftChoice.indicators,
          reason: canonEn.leftReason,
        },
      },
      rightChoice: {
        ...card.rightChoice,
        label: canonEn.rightLabel,
        outcomeText: canonEn.rightOutcome,
        indicators: {
          ...card.rightChoice.indicators,
          reason: canonEn.rightReason,
        },
      },
    };
  } else {
    // 2. Check if it's a contextual card card_v_XX_YY_ZZ_W
    const match = /^card_v_(\d+)_(\d+)_(\d+)_(\d+)$/.exec(card.id);
    if (match) {
      const seedIndex = (parseInt(match[1], 10) - 1) % EN_ARCHETYPE_SEEDS.length;
      const lensIndex = (parseInt(match[2], 10) - 1) % EN_CRISIS_LENSES.length;
      const stanceIndex = (parseInt(match[3], 10) - 1) % EN_STRATEGIC_STANCES.length;

      const enSeed = EN_ARCHETYPE_SEEDS[seedIndex];
      const enLens = EN_CRISIS_LENSES[lensIndex];
      const enStance = EN_STRATEGIC_STANCES[stanceIndex];
      const charDef = CHARACTER_MAP[card.characterId] || CHARACTERS[0];
      const regionMeta = REGIONS[card.region] || REGIONS.kings_landing;

      if (enSeed && enLens && enStance) {
        const rawSituation = enSeed.CoreSituation.replace(/\{\{characterName\}\}/g, charDef.name);
        const fullText = `${enLens.narrativePrefix}${regionMeta.name}, ${rawSituation} ${enStance.contextClause}`;

        cleanCard = {
          ...card,
          title: `${enSeed.titleRoot}: ${enLens.titleSuffix}`,
          text: fullText,
          leftChoice: {
            ...card.leftChoice,
            label: `${enSeed.leftOptionRoot} ${enLens.leftActionSuffix}`,
            outcomeText: `${enSeed.leftOutcomeRoot} ${enStance.leftOutcomeAddon}`,
            indicators: {
              ...card.leftChoice.indicators,
              reason: enSeed.leftReason,
            },
          },
          rightChoice: {
            ...card.rightChoice,
            label: `${enSeed.rightOptionRoot} ${enLens.rightActionSuffix}`,
            outcomeText: `${enSeed.rightOutcomeRoot} ${enStance.rightOutcomeAddon}`,
            indicators: {
              ...card.rightChoice.indicators,
              reason: enSeed.rightReason,
            },
          },
        };
      }
    }
  }

  // Re-apply English relationship lead-in if state is provided
  if (state) {
    const charRuntime = state.characters[cleanCard.characterId];
    const charDef = CHARACTER_MAP[cleanCard.characterId];
    if (charRuntime && charDef) {
      let leadIn = '';
      if (charRuntime.isRomanced) {
        leadIn = `[Partner of Your Heart] `;
      } else if (charRuntime.relation <= -50) {
        leadIn = `[Open Hostility] ${charDef.name} speaks in a cold, threatening tone: `;
      } else if (charRuntime.relation <= -21) {
        leadIn = `[Guarded Gaze] `;
      } else if (charRuntime.relation >= 60) {
        leadIn = `[Loyal Friend] `;
      }
      if (leadIn) {
        cleanCard = { ...cleanCard, text: `${leadIn}${cleanCard.text}` };
      }
    }
  }

  return cleanCard;
}

export const EN_ACHIEVEMENTS: Record<string, { title: string; description: string }> = {
  ach_iron_balance_100: {
    title: 'Unshakable Throne',
    description: 'Rule for 100 consecutive decisions without letting any indicator drop below 20.',
  },
  ach_loyal_companion: {
    title: 'Sworn Friend of Blood and Oath',
    description: 'Reach +85 or higher maximum loyalty relationship with a major character.',
  },
  ach_romance_bloom: {
    title: 'Heart of Ice and Fire',
    description: 'Forge a romantic bond built on mutual trust with a character.',
  },
  ach_save_ned_stark: {
    title: 'Salvation of the Wolf',
    description: 'Change history by rescuing Ned Stark alive from the King’s Landing conspiracy.',
  },
  ach_prevent_red_wedding: {
    title: 'Hand That Broke the Red Wedding',
    description: 'Foil Walder Frey and Roose Bolton’s Red Wedding betrayal and keep Robb Stark alive.',
  },
  ach_defeat_night_king: {
    title: 'Shield of the Dawn',
    description: 'Defeat the Night King and the army of the dead to end the Long Night.',
  },
  ach_golden_age_90: {
    title: 'Monarch of the Golden Age',
    description: 'Raise all four core indicators to 85 or above simultaneously.',
  },
  ach_diplomat_10_friends: {
    title: 'Architect of the Great Council',
    description: 'Establish favorable (+25 or higher) relations with at least 10 different characters in a single run.',
  },
  ach_win_quick: {
    title: 'Survivor of the Storm (300 Decisions)',
    description: 'Successfully complete 300 decisions in Quick Mode.',
  },
  ach_win_normal: {
    title: 'Ruler of the Seven Kingdoms (600 Decisions)',
    description: 'Successfully complete 600 decisions in Normal Mode.',
  },
  ach_win_long: {
    title: 'Thousand-Year Dynasty (1,200 Decisions)',
    description: 'Successfully complete 1,200 decisions in Long Mode.',
  },
  ach_win_competitive: {
    title: 'Immortal Legend of the Iron Throne (6,000 Decisions)',
    description: 'Make history in Westeros by completing 6,000 decisions in Competitive Mode.',
  },
};

export function localizeEndingSummary(
  summary: GameEndSummary,
  state: GameRunState,
  lang: GameLanguage
): GameEndSummary {
  if (lang === 'tr') return summary;
  const roleEn = EN_PLAYER_ROLES[state.roleId] || EN_PLAYER_ROLES.noble_bannerman;
  const modeEn = EN_GAME_MODES[state.modeId] || EN_GAME_MODES.normal;
  const regName = REGIONS[state.currentRegion]?.name || "King's Landing";

  const statusEnMap: Record<string, string> = {
    Hayatta: 'Alive',
    Öldü: 'Dead',
    Esir: 'Captured',
    Sürgünde: 'Exiled',
    Kayıp: 'Missing',
    Alive: 'Alive',
    Dead: 'Dead',
    Captured: 'Captured',
    Exiled: 'Exiled',
    Missing: 'Missing',
  };

  const localizedFates = summary.keyCharacterFates.map((cf) => ({
    ...cf,
    status: statusEnMap[cf.status] || cf.status,
  }));

  if (summary.isVictory) {
    return {
      ...summary,
      title: 'Iron Will & Lasting Peace: Golden Age of Westeros',
      subtitle: `${modeEn.name} (${state.targetDecisions} Decisions) Completed in Victory`,
      storyText: `${roleEn.titlePrefix} ${state.playerName}, across ${state.turn} perilous decisions you weathered assassinations, famines, wars, and courtly intrigues with mastery. Centered in ${regName}, your rule is hailed from Flea Bottom to Winterfell as the dawn of a prosperous new era.`,
      causeOfEnd: `The ${modeEn.name} goal of ${state.targetDecisions} decisions was achieved without letting any indicator fall to zero!`,
      keyCharacterFates: localizedFates,
    };
  }

  const trig = summary.triggerIndicator;
  if (trig === 'people') {
    return {
      ...summary,
      title: 'Red Square Uprising & Wrath of the Smallfolk',
      subtitle: `Fallen Banner in the Streets of ${regName}`,
      storyText: `${roleEn.titlePrefix} ${state.playerName}, pushed beyond endurance in the streets of ${regName}, thousands of villagers, blacksmiths, and townsfolk broke down the palace gates with torches. Even your guards refused to draw steel against the starving crowd, bringing your reign to an end.`,
      causeOfEnd: 'Support of the People hit zero: hunger and heavy burdens ignited a massive popular uprising.',
      keyCharacterFates: localizedFates,
    };
  }
  if (trig === 'military') {
    return {
      ...summary,
      title: 'Shattered Shields & Defeat on the Battlefield',
      subtitle: `The Walls of ${regName} Have Fallen`,
      storyText: `${roleEn.titlePrefix} ${state.playerName}, with your military strength exhausted, rival heavy cavalry tore through your weakened defenses. As your banner was lowered from the ramparts of ${regName}, your reign fell to steel and siege.`,
      causeOfEnd: 'Military Might hit zero: your armies scattered and your defensive lines collapsed.',
      keyCharacterFates: localizedFates,
    };
  }
  if (trig === 'treasury') {
    return {
      ...summary,
      title: 'The Iron Bank Collects Its Due',
      subtitle: 'Braavosi Gold Bought Your Enemies',
      storyText: `"The Iron Bank will have its due." When your treasury ran dry in ${regName}, Braavosi bankers financed your rivals and unpaid sellswords switched sides overnight, ending your rule without a single arrow fired.`,
      causeOfEnd: 'Treasury hit zero: financial bankruptcy paralyzed the realm and turned mercenaries against you.',
      keyCharacterFates: localizedFates,
    };
  }
  return {
    ...summary,
    title: 'Daggers in the Dark Corridor: Palace Coup',
    subtitle: 'The Council of Nobles Overthrew You',
    storyText: `${roleEn.titlePrefix} ${state.playerName}, you lost the backing of the Great Houses and court councilors completely. Summoned to the Small Council chamber at midnight, what awaited you was not a meeting, but the cold daggers of conspirators.`,
    causeOfEnd: 'Support of the Nobles hit zero: the Great Houses overthrew you in a secret palace coup.',
    keyCharacterFates: localizedFates,
  };
}

export function formatPlayTimeLocalized(totalSeconds: number, lang: GameLanguage): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (lang === 'en') {
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  }

  if (days > 0) return `${days} gün ${hours} saat ${minutes} dakika`;
  if (hours > 0) return `${hours} saat ${minutes} dakika`;
  if (minutes > 0) return `${minutes} dakika ${seconds} saniye`;
  return `${seconds} saniye`;
}

export function formatProgressLocalized(turn: number, target: number, lang: GameLanguage): string {
  if (target <= 0) return lang === 'en' ? '0.00%' : '%0,00';
  const pct = Math.min(100, Math.max(0, (turn / target) * 100));
  if (lang === 'en') return `${pct.toFixed(2)}%`;
  return `%${pct.toFixed(2).replace('.', ',')}`;
}
