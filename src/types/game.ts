export type IndicatorKey = 'people' | 'military' | 'treasury' | 'nobles';

export interface Indicators {
  people: number;   // Halkın Desteği (0-100)
  military: number; // Askerî Güç (0-100)
  treasury: number; // Hazine (0-100)
  nobles: number;   // Soyluların ve Siyasi Güçlerin Desteği (0-100)
}

export interface IndicatorDelta {
  people?: number;
  military?: number;
  treasury?: number;
  nobles?: number;
  reason?: string;
}

export type DifficultyId = 'easy' | 'normal' | 'hard';

export interface DifficultyConfig {
  id: DifficultyId;
  name: string;
  shortRule: string;
  description: string;
}

export type GameModeId = 'quick' | 'normal' | 'long' | 'competitive';

export interface GameModeConfig {
  id: GameModeId;
  name: string;
  targetDecisions: number;
  description: string;
  difficultyMultiplier: number;
  nextModeId?: GameModeId;
}

export type EraId =
  | 'robert_reign'
  | 'kings_landing_crisis'
  | 'war_of_five_kings'
  | 'essos_and_dragons'
  | 'faith_and_sparrows'
  | 'battle_for_north'
  | 'long_night'
  | 'iron_throne_endgame';

export interface EraConfig {
  id: EraId;
  name: string;
  years: string;
  summary: string;
  defaultRegion: RegionId;
  initialFlags: string[];
}

export type PlayerRoleId =
  | 'noble_bannerman'
  | 'minor_lord'
  | 'small_council_advisor'
  | 'sworn_commander'
  | 'courtier'
  | 'diplomat'
  | 'sellsword_captain'
  | 'throne_claimant';

export interface PlayerRoleConfig {
  id: PlayerRoleId;
  titlePrefix: string;
  name: string;
  description: string;
  startingIndicators: Indicators;
  bonusCharacterRelations: Record<string, number>;
}

export type RegionId =
  | 'kings_landing'
  | 'winterfell'
  | 'dragonstone'
  | 'the_wall'
  | 'meereen_essos'
  | 'casterly_rock'
  | 'highgarden'
  | 'sunspear_dorne'
  | 'pyke_iron_islands'
  | 'riverrun'
  | 'eyrie_vale'
  | 'storms_end';

export interface RegionConfig {
  id: RegionId;
  name: string;
  turkishSubtitle: string;
  house: string;
  atmosphereColor: string;
  accentColor: string;
  particleType: 'embers' | 'snow' | 'gold' | 'sand' | 'rain' | 'mist';
  description: string;
}

export type CharacterMood =
  | 'normal'
  | 'happy'
  | 'angry'
  | 'suspicious'
  | 'sad'
  | 'afraid'
  | 'threatening';

export type CharacterStatus = 'alive' | 'dead' | 'missing' | 'captured' | 'exiled';

export type RelationshipTierId =
  | 'mortal_enemy'
  | 'enemy'
  | 'distrust'
  | 'neutral'
  | 'favorable'
  | 'friend'
  | 'loyal_ally';

export interface InterCharacterRelation {
  targetId: string;
  type: 'ally' | 'rival' | 'family' | 'enemy' | 'romance' | 'betrayal';
  description: string;
}

export interface CharacterPortraitSpec {
  skinTone: string;
  hairColor: string;
  hairStyle: 'short' | 'long' | 'wavy' | 'braided' | 'bald' | 'crown_veil' | 'hooded' | 'ice_horns';
  facialHair: 'none' | 'stubble' | 'full_beard' | 'goatee' | 'mustache';
  eyeColor: string;
  attireColor: string;
  cloakColor: string;
  accentColor: string;
  headgear: 'none' | 'crown_gold' | 'crown_stag' | 'crown_winter' | 'circlet' | 'helm' | 'hood' | 'maester_chain' | 'miter';
  scar?: 'left_eye' | 'cheek' | 'burn_right' | 'nose';
  sigil: 'wolf' | 'dragon' | 'lion' | 'stag' | 'kraken' | 'rose' | 'sun' | 'falcon' | 'trout' | 'flayed' | 'mockingbird' | 'spider' | 'flame' | 'crow' | 'skull';
}

export interface CharacterDefinition {
  id: string;
  name: string;
  house: string;
  title: string;
  defaultRegion: RegionId;
  initialStatus: CharacterStatus;
  initialRelation: number;
  romanceEligible: boolean;
  romancePreferenceNote: string;
  personality: string[];
  motivation: string;
  fears: string;
  ideals: string;
  politicalGoal: string;
  behaviorModel: string;
  secretIntel: string;
  interRelations: InterCharacterRelation[];
  greetings: {
    enemy: string;
    neutral: string;
    friend: string;
    romance?: string;
  };
  portrait: CharacterPortraitSpec;
}

export interface CharacterRuntimeState {
  id: string;
  status: CharacterStatus;
  region: RegionId;
  relation: number; // -100 to +100
  isRomanced: boolean;
  romanceStage: number; // 0 to 3
  knownSecrets: number; // 0 to 2
  lastInteractionTurn: number;
  lastInteractionSummary: string;
}

export type CardCategoryId =
  | 'cat_01_main_story'
  | 'cat_02_dynasty_struggles'
  | 'cat_03_throne_games'
  | 'cat_04_political_intrigues'
  | 'cat_05_assassination_attempts'
  | 'cat_06_betrayals'
  | 'cat_07_diplomatic_talks'
  | 'cat_08_marriage_proposals'
  | 'cat_09_love_and_romance'
  | 'cat_10_wars'
  | 'cat_11_sieges'
  | 'cat_12_military_strategies'
  | 'cat_13_popular_rebellions'
  | 'cat_14_tax_and_economy'
  | 'cat_15_trade_and_resources'
  | 'cat_16_religion_and_faith'
  | 'cat_17_nights_watch_wall'
  | 'cat_18_white_walkers_others'
  | 'cat_19_dragons_and_riders'
  | 'cat_20_house_targaryen'
  | 'cat_21_house_stark'
  | 'cat_22_house_lannister'
  | 'cat_23_house_baratheon'
  | 'cat_24_house_greyjoy'
  | 'cat_25_house_tyrell'
  | 'cat_26_house_martell'
  | 'cat_27_house_arryn'
  | 'cat_28_house_tully'
  | 'cat_29_small_council'
  | 'cat_30_personal_troubles'
  | 'cat_31_family_relations'
  | 'cat_32_children_and_heirs'
  | 'cat_33_spies_and_intel'
  | 'cat_34_commonfolk_daily'
  | 'cat_35_plagues_and_epidemics'
  | 'cat_36_famines_and_disasters'
  | 'cat_37_escape_exile_captivity'
  | 'cat_38_courts_and_justice'
  | 'cat_39_tournaments_chivalry'
  | 'cat_40_explorations_distant'
  | 'cat_41_magic_prophecy'
  | 'cat_42_alternate_history';

export interface CardRelationEffect {
  characterId: string;
  delta: number;
  setStatus?: CharacterStatus;
  triggerRomance?: boolean;
  revealSecret?: boolean;
}

export interface CardOptionConsequence {
  label: string;
  outcomeText: string;
  indicators: IndicatorDelta;
  relations?: CardRelationEffect[];
  setFlags?: string[];
  clearFlags?: string[];
  nextChainCardId?: string;
  changeRegion?: RegionId;
  warUpdate?: {
    warId: string;
    name: string;
    enemyHouse: string;
    progressDelta: number; // -100 to +100
    resolved?: boolean;
  };
  siegeUpdate?: {
    castleName: string;
    suppliesDelta: number;
    defenseDelta: number;
    moraleDelta: number;
    lifted?: boolean;
  };
  isMajorDecision?: boolean;
  choiceArchetype: 'diplomatic' | 'ruthless' | 'generous' | 'martial' | 'cunning' | 'honorable';
}

export interface CardPreconditions {
  minTurn?: number;
  maxTurn?: number;
  eras?: EraId[];
  roles?: PlayerRoleId[];
  regions?: RegionId[];
  requiredFlags?: string[];
  forbiddenFlags?: string[];
  requireAlive?: string[];
  requireDead?: string[];
  minRelation?: { characterId: string; value: number };
  maxRelation?: { characterId: string; value: number };
  requireRomance?: string;
  minIndicator?: { key: IndicatorKey; value: number };
  maxIndicator?: { key: IndicatorKey; value: number };
}

export interface ScenarioCard {
  id: string;
  baseScenarioId: string;
  category: CardCategoryId;
  characterId: string;
  mood: CharacterMood;
  region: RegionId;
  eraContext: EraId | 'any';
  isCanon: boolean;
  isRare?: boolean;
  chainId?: string;
  chainStep?: number;
  title: string;
  text: string; // Supports {{playerName}} and {{playerTitle}}
  preconditions?: CardPreconditions;
  leftChoice: CardOptionConsequence;
  rightChoice: CardOptionConsequence;
}

export interface ActiveWarState {
  warId: string;
  name: string;
  enemyHouse: string;
  balance: number; // -100 (losing badly) to +100 (winning decisively)
  startedTurn: number;
}

export interface ActiveSiegeState {
  castleName: string;
  supplies: number; // 0-100
  defense: number;  // 0-100
  morale: number;   // 0-100
  startedTurn: number;
}

export interface DecisionLogEntry {
  turn: number;
  cardId: string;
  cardTitle: string;
  characterId: string;
  characterName: string;
  region: RegionId;
  choiceSide: 'left' | 'right';
  choiceLabel: string;
  outcomeText: string;
  indicatorDelta: IndicatorDelta;
  isMajor: boolean;
  timestamp: number;
}

export interface GameEndSummary {
  isVictory: boolean;
  endingId: string;
  title: string;
  subtitle: string;
  storyText: string;
  causeOfEnd: string;
  triggerIndicator?: IndicatorKey;
  canUpgradeMode: boolean;
  nextModeId?: GameModeId;
  keyCharacterFates: Array<{ id: string; name: string; status: string; relation: number }>;
}

export type GameLanguage = 'tr' | 'en';

export interface UndoSnapshot {
  turn: number;
  currentRegion: RegionId;
  indicators: Indicators;
  lastDelta: IndicatorDelta | null;
  characters: Record<string, CharacterRuntimeState>;
  flags: string[];
  activeWars: ActiveWarState[];
  activeSiege: ActiveSiegeState | null;
  queuedChainCardIds: string[];
  recentCardIds: string[];
  recentBaseScenarioIds: string[];
  recentCharacterIds: string[];
  recentCategories: CardCategoryId[];
  currentCard: ScenarioCard;
  journal: DecisionLogEntry[];
  majorDecisions: DecisionLogEntry[];
  categoryCounts: Record<string, number>;
  choiceArchetypeCounts: Record<string, number>;
  peakIndicators: Indicators;
  minIndicatorStreak20: number;
  maxStreak20Reached: number;
  warsWon: number;
  warsLost: number;
}

export interface GameRunState {
  saveId: string;
  version: number;
  playerName: string;
  roleId: PlayerRoleId;
  modeId: GameModeId;
  difficultyId?: DifficultyId;
  eraId: EraId;
  currentRegion: RegionId;
  turn: number; // Current completed decisions
  targetDecisions: number;
  indicators: Indicators;
  lastDelta: IndicatorDelta | null;
  characters: Record<string, CharacterRuntimeState>;
  flags: string[];
  activeWars: ActiveWarState[];
  activeSiege: ActiveSiegeState | null;
  queuedChainCardIds: string[];
  recentCardIds: string[];
  recentBaseScenarioIds: string[];
  recentCharacterIds: string[];
  recentCategories: CardCategoryId[];
  currentCard: ScenarioCard;
  journal: DecisionLogEntry[];
  majorDecisions: DecisionLogEntry[];
  categoryCounts: Record<string, number>;
  choiceArchetypeCounts: Record<string, number>;
  peakIndicators: Indicators;
  minIndicatorStreak20: number; // Consecutive turns with all indicators >= 20
  maxStreak20Reached: number;
  warsWon: number;
  warsLost: number;
  activePlayTimeSeconds: number;
  createdAt: number;
  updatedAt: number;
  status: 'playing' | 'victory' | 'defeat';
  endingSummary?: GameEndSummary;
  undoStack?: UndoSnapshot[];
}

export interface GlobalPlayerStatistics {
  totalGamesStarted: number;
  completedGames: number;
  lostGames: number;
  wonGames: number;
  totalDecisionsMade: number;
  longestSurvivalStreak: number;
  longestGameTimeSeconds: number;
  choiceArchetypeTotals: Record<string, number>;
  characterBestRelations: Record<string, { name: string; maxRelation: number; minRelation: number }>;
  highestIndicatorsReached: Indicators;
  categoryEncounterCounts: Record<string, number>;
  modeWins: Record<GameModeId, number>;
  unlockedAchievementIds: string[];
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  isSecret?: boolean;
  iconName: 'crown' | 'sword' | 'coin' | 'heart' | 'shield' | 'dragon' | 'scroll' | 'skull';
}

export interface ScenarioPackManifestItem {
  packId: string;
  name: string;
  categoriesCovered: CardCategoryId[];
  baseArchetypeCount: number;
  totalPlayableVariations: number;
  verified: boolean;
}

export interface ScenarioPoolManifest {
  version: string;
  targetPoolSize: number;
  totalUniquePlayableCards: number;
  handcraftedCanonAndChainCards: number;
  contextualVariationCards: number;
  categoriesCount: number;
  packs: ScenarioPackManifestItem[];
}
