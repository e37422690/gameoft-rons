import { ERAS, GAME_MODES, PLAYER_ROLES } from '../data/categoriesAndEras';
import { CHARACTER_MAP, CHARACTERS } from '../data/characters';
import { EN_PLAYER_ROLES, localizeCard } from '../i18n/localization';
import {
  CharacterRuntimeState,
  DecisionLogEntry,
  DifficultyId,
  EraId,
  GameLanguage,
  GameModeId,
  GameRunState,
  IndicatorDelta,
  IndicatorKey,
  Indicators,
  PlayerRoleId,
  UndoSnapshot,
} from '../types/game';
import { buildDefeatEnding, buildVictoryEnding } from './endingsAndAchievements';
import { selectNextScenarioCard } from './scenarioPoolEngine';

export const MAX_UNDO_STEPS = 10;

export function getDifficultyBounds(difficultyId: DifficultyId = 'normal'): {
  minDrop: number;
  maxGain: number;
} {
  if (difficultyId === 'easy') {
    return { minDrop: -5, maxGain: 10 };
  }
  if (difficultyId === 'hard') {
    return { minDrop: -10, maxGain: 7 };
  }
  return { minDrop: -10, maxGain: 10 };
}

/**
 * Scales and clamps a single indicator delta according to the selected DifficultyId:
 * - 'easy' (Kolay Mod): Positive decisions increase up to +10; negative decisions drop by at most -5 (0.5x scaled, capped to [-5, -1]).
 * - 'normal' (Normal Mod - Default): Positive decisions increase up to +10; negative decisions drop by at most -10 (capped to [-10, +10]).
 * - 'hard' (Zor Mod): Positive decisions increase by at most +7 (~0.7x scaled, capped to [+1, +7]); negative decisions drop by at most -10.
 */
export function scaleSingleDeltaForDifficulty(
  val: number | undefined,
  _key: IndicatorKey,
  difficultyId: DifficultyId = 'normal'
): number {
  if (!val) return 0;
  const base = Math.max(-10, Math.min(10, Math.round(val)));
  if (base === 0) return 0;

  if (difficultyId === 'easy') {
    if (base > 0) {
      return Math.min(10, base);
    }
    return Math.max(-5, Math.min(-1, Math.round(base * 0.5)));
  }

  if (difficultyId === 'hard') {
    if (base > 0) {
      return Math.min(7, Math.max(1, Math.round(base * 0.7)));
    }
    return Math.max(-10, base);
  }

  // 'normal' mode: symmetric [-10, +10]
  return base;
}

export function scaleIndicatorDeltaForDifficulty(
  raw: IndicatorDelta,
  difficultyId: DifficultyId = 'normal'
): IndicatorDelta {
  return {
    people: scaleSingleDeltaForDifficulty(raw.people, 'people', difficultyId),
    military: scaleSingleDeltaForDifficulty(raw.military, 'military', difficultyId),
    treasury: scaleSingleDeltaForDifficulty(raw.treasury, 'treasury', difficultyId),
    nobles: scaleSingleDeltaForDifficulty(raw.nobles, 'nobles', difficultyId),
    reason: raw.reason,
  };
}

/**
 * Safely sanitizes user-supplied player or campaign names against HTML/script injection (Section 14 & 18).
 */
export function sanitizePlayerName(input: string): string {
  const stripped = input
    .replace(/[<>"'`&/;\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 32);
}

export function sanitizeCampaignName(input: string): string {
  const stripped = input
    .replace(/[<>"'`&/;\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.slice(0, 44);
}

/**
 * Interpolates {{playerName}} and {{playerTitle}} into any card or dialogue text.
 */
export function interpolateText(
  template: string,
  playerName: string,
  roleId: PlayerRoleId,
  lang: GameLanguage = 'tr'
): string {
  const roleMeta = PLAYER_ROLES.find((r) => r.id === roleId) || PLAYER_ROLES[0];
  const titlePrefix =
    lang === 'en'
      ? EN_PLAYER_ROLES[roleId]?.titlePrefix || roleMeta.titlePrefix
      : roleMeta.titlePrefix;
  const fallbackName = lang === 'en' ? 'Traveler' : 'Gezgin';
  const safeName = sanitizePlayerName(playerName) || fallbackName;
  return template
    .replace(/\{\{playerName\}\}/g, safeName)
    .replace(/\{\{playerTitle\}\}/g, titlePrefix);
}

function clampIndicator(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function clampRelation(v: number): number {
  return Math.max(-100, Math.min(100, Math.round(v)));
}

export interface CreateGameOptions {
  playerName: string;
  campaignName?: string;
  modeId: GameModeId;
  difficultyId?: DifficultyId;
  roleId: PlayerRoleId;
  eraId: EraId;
  saveId?: string;
}

export function createInitialGameState(opts: CreateGameOptions): GameRunState {
  const safeName = sanitizePlayerName(opts.playerName);
  const safeCampaignName = opts.campaignName ? sanitizeCampaignName(opts.campaignName) : undefined;
  const modeMeta = GAME_MODES[opts.modeId] || GAME_MODES.normal;
  const difficultyId: DifficultyId = opts.difficultyId || 'normal';
  const roleMeta = PLAYER_ROLES.find((r) => r.id === opts.roleId) || PLAYER_ROLES[0];
  const eraMeta = ERAS.find((e) => e.id === opts.eraId) || ERAS[0];

  const characters: Record<string, CharacterRuntimeState> = {};
  for (const c of CHARACTERS) {
    const bonus = roleMeta.bonusCharacterRelations[c.id] || 0;
    characters[c.id] = {
      id: c.id,
      status: c.initialStatus,
      region: c.defaultRegion,
      relation: clampRelation(c.initialRelation + bonus),
      isRomanced: false,
      romanceStage: 0,
      knownSecrets: 0,
      lastInteractionTurn: 0,
      lastInteractionSummary: 'Henüz doğrudan bir etkileşim yaşanmadı.',
    };
  }

  // Era-specific canon initial states
  if (
    opts.eraId === 'war_of_five_kings' ||
    opts.eraId === 'essos_and_dragons' ||
    opts.eraId === 'faith_and_sparrows' ||
    opts.eraId === 'battle_for_north' ||
    opts.eraId === 'long_night' ||
    opts.eraId === 'iron_throne_endgame'
  ) {
    if (characters.robert_baratheon) characters.robert_baratheon.status = 'dead';
  }

  const now = Date.now();
  const initialIndicators: Indicators = { ...roleMeta.startingIndicators };

  const draftState: GameRunState = {
    saveId: opts.saveId || `got_save_${now}_${Math.random().toString(36).slice(2, 7)}`,
    version: 1,
    campaignName: safeCampaignName || undefined,
    playerName: safeName,
    roleId: roleMeta.id,
    modeId: modeMeta.id,
    difficultyId,
    eraId: eraMeta.id,
    currentRegion: eraMeta.defaultRegion,
    turn: 0,
    targetDecisions: modeMeta.targetDecisions,
    indicators: initialIndicators,
    lastDelta: null,
    characters,
    flags: [...eraMeta.initialFlags],
    activeWars: [],
    activeSiege: null,
    queuedChainCardIds: [],
    recentCardIds: [],
    recentBaseScenarioIds: [],
    recentCharacterIds: [],
    recentCategories: [],
    currentCard: null as any,
    journal: [],
    majorDecisions: [],
    categoryCounts: {},
    choiceArchetypeCounts: {},
    peakIndicators: { ...initialIndicators },
    minIndicatorStreak20: 0,
    maxStreak20Reached: 0,
    warsWon: 0,
    warsLost: 0,
    activePlayTimeSeconds: 0,
    createdAt: now,
    updatedAt: now,
    status: 'playing',
    undoStack: [],
  };

  draftState.currentCard = selectNextScenarioCard(draftState);
  return draftState;
}

function createUndoSnapshot(state: GameRunState): UndoSnapshot {
  const clonedChars: Record<string, CharacterRuntimeState> = {};
  for (const [k, v] of Object.entries(state.characters)) {
    clonedChars[k] = { ...v };
  }
  return {
    turn: state.turn,
    currentRegion: state.currentRegion,
    indicators: { ...state.indicators },
    lastDelta: state.lastDelta ? { ...state.lastDelta } : null,
    characters: clonedChars,
    flags: [...state.flags],
    activeWars: state.activeWars.map((w) => ({ ...w })),
    activeSiege: state.activeSiege ? { ...state.activeSiege } : null,
    queuedChainCardIds: [...state.queuedChainCardIds],
    recentCardIds: [...state.recentCardIds],
    recentBaseScenarioIds: [...state.recentBaseScenarioIds],
    recentCharacterIds: [...state.recentCharacterIds],
    recentCategories: [...state.recentCategories],
    currentCard: state.currentCard,
    journal: [...state.journal],
    majorDecisions: [...state.majorDecisions],
    categoryCounts: { ...state.categoryCounts },
    choiceArchetypeCounts: { ...state.choiceArchetypeCounts },
    peakIndicators: { ...state.peakIndicators },
    minIndicatorStreak20: state.minIndicatorStreak20,
    maxStreak20Reached: state.maxStreak20Reached,
    warsWon: state.warsWon,
    warsLost: state.warsLost,
  };
}

/**
 * Reverts the last decision (up to MAX_UNDO_STEPS = 10 consecutive undos).
 */
export function undoLastDecision(state: GameRunState): GameRunState | null {
  const stack = state.undoStack || [];
  if (stack.length === 0) return null;

  const snapshot = stack[stack.length - 1];
  const remainingStack = stack.slice(0, -1);

  return {
    ...state,
    turn: snapshot.turn,
    currentRegion: snapshot.currentRegion,
    indicators: { ...snapshot.indicators },
    lastDelta: snapshot.lastDelta ? { ...snapshot.lastDelta } : null,
    characters: snapshot.characters,
    flags: [...snapshot.flags],
    activeWars: snapshot.activeWars,
    activeSiege: snapshot.activeSiege,
    queuedChainCardIds: [...snapshot.queuedChainCardIds],
    recentCardIds: [...snapshot.recentCardIds],
    recentBaseScenarioIds: [...snapshot.recentBaseScenarioIds],
    recentCharacterIds: [...snapshot.recentCharacterIds],
    recentCategories: [...snapshot.recentCategories],
    currentCard: snapshot.currentCard,
    journal: [...snapshot.journal],
    majorDecisions: [...snapshot.majorDecisions],
    categoryCounts: { ...snapshot.categoryCounts },
    choiceArchetypeCounts: { ...snapshot.choiceArchetypeCounts },
    peakIndicators: { ...snapshot.peakIndicators },
    minIndicatorStreak20: snapshot.minIndicatorStreak20,
    maxStreak20Reached: snapshot.maxStreak20Reached,
    warsWon: snapshot.warsWon,
    warsLost: snapshot.warsLost,
    status: 'playing',
    endingSummary: undefined,
    undoStack: remainingStack,
    updatedAt: Date.now(),
  };
}

/**
 * Applies the player's Left ('left') or Right ('right') decision to the current card
 * and returns a brand-new immutable GameRunState while pushing a snapshot to undoStack (max 10).
 */
export function applyCardChoice(
  state: GameRunState,
  side: 'left' | 'right',
  lang: GameLanguage = 'tr'
): GameRunState {
  if (state.status !== 'playing') return state;

  // Push current state snapshot onto rolling 10-decision undo stack
  const snapshot = createUndoSnapshot(state);
  const nextUndoStack = [...(state.undoStack || []).slice(-(MAX_UNDO_STEPS - 1)), snapshot];

  const localizedCard = localizeCard(state.currentCard, lang, state);
  const card = state.currentCard;
  const choice = side === 'left' ? card.leftChoice : card.rightChoice;
  const localizedChoice = side === 'left' ? localizedCard.leftChoice : localizedCard.rightChoice;
  const difficultyId: DifficultyId = state.difficultyId || 'normal';

  let dPeople = scaleSingleDeltaForDifficulty(choice.indicators.people, 'people', difficultyId);
  let dMilitary = scaleSingleDeltaForDifficulty(choice.indicators.military, 'military', difficultyId);
  let dTreasury = scaleSingleDeltaForDifficulty(choice.indicators.treasury, 'treasury', difficultyId);
  let dNobles = scaleSingleDeltaForDifficulty(choice.indicators.nobles, 'nobles', difficultyId);

  // Over-saturation political dynamics
  let extraReason = '';
  if (state.indicators.people >= 95 && dPeople > 0) {
    dNobles -= 2;
    extraReason =
      lang === 'en'
        ? ' (Extreme popular power alarmed the nobility: Nobles -2)'
        : ' (Halkın aşırı güçlenmesi soyluları tedirgin etti: Soylular -2)';
  } else if (state.indicators.nobles >= 95 && dNobles > 0) {
    dPeople -= 2;
    extraReason =
      lang === 'en'
        ? ' (Excessive noble privileges angered the smallfolk: People -2)'
        : ' (Soyluların aşırı imtiyazı halkı rahatsız etti: Halk -2)';
  } else if (state.indicators.treasury >= 95 && dTreasury > 0) {
    dMilitary -= 2;
    extraReason =
      lang === 'en'
        ? ' (Hoarded gold whetted mercenary appetites: Military -2)'
        : ' (Aşırı altın birikimi paralı askerlerin iştahını kabarttı: Askerî -2)';
  }

  // Enforce strict difficulty bounds on final single-decision deltas:
  // Easy: [-5, +10] | Normal: [-10, +10] | Hard: [-10, +7]
  const bounds = getDifficultyBounds(difficultyId);
  const clampToBounds = (d: number) => Math.max(bounds.minDrop, Math.min(bounds.maxGain, d));
  dPeople = clampToBounds(dPeople);
  dMilitary = clampToBounds(dMilitary);
  dTreasury = clampToBounds(dTreasury);
  dNobles = clampToBounds(dNobles);

  const nextIndicators: Indicators = {
    people: clampIndicator(state.indicators.people + dPeople),
    military: clampIndicator(state.indicators.military + dMilitary),
    treasury: clampIndicator(state.indicators.treasury + dTreasury),
    nobles: clampIndicator(state.indicators.nobles + dNobles),
  };

  const baseReason = localizedChoice.indicators.reason || localizedChoice.outcomeText;
  const appliedDelta: IndicatorDelta = {
    people: nextIndicators.people - state.indicators.people,
    military: nextIndicators.military - state.indicators.military,
    treasury: nextIndicators.treasury - state.indicators.treasury,
    nobles: nextIndicators.nobles - state.indicators.nobles,
    reason: interpolateText(baseReason, state.playerName, state.roleId, lang) + extraReason,
  };

  const nextTurn = state.turn + 1;

  // Update characters & inter-character ripples
  const nextCharacters: Record<string, CharacterRuntimeState> = { ...state.characters };
  if (choice.relations && choice.relations.length > 0) {
    for (const relEffect of choice.relations) {
      const existing = nextCharacters[relEffect.characterId];
      if (!existing) continue;

      const updatedRel = clampRelation(existing.relation + relEffect.delta);
      const charDef = CHARACTER_MAP[relEffect.characterId];
      let isRomanced = existing.isRomanced;
      let romanceStage = existing.romanceStage;

      if (
        relEffect.triggerRomance &&
        charDef?.romanceEligible &&
        updatedRel >= 35
      ) {
        isRomanced = true;
        romanceStage = Math.min(3, existing.romanceStage + 1);
      }

      nextCharacters[relEffect.characterId] = {
        ...existing,
        status: relEffect.setStatus || existing.status,
        relation: updatedRel,
        isRomanced,
        romanceStage,
        knownSecrets: relEffect.revealSecret
          ? Math.min(2, existing.knownSecrets + 1)
          : existing.knownSecrets,
        lastInteractionTurn: nextTurn,
        lastInteractionSummary: interpolateText(
          localizedChoice.outcomeText,
          state.playerName,
          state.roleId,
          lang
        ),
      };

      // Ripple to enemies/allies of this character
      if (charDef && Math.abs(relEffect.delta) >= 12) {
        for (const inter of charDef.interRelations) {
          const targetChar = nextCharacters[inter.targetId];
          if (!targetChar || targetChar.status !== 'alive') continue;
          if (inter.type === 'enemy' && relEffect.delta > 0) {
            nextCharacters[inter.targetId] = {
              ...targetChar,
              relation: clampRelation(targetChar.relation - Math.max(2, Math.round(relEffect.delta * 0.25))),
            };
          } else if (inter.type === 'ally' && relEffect.delta > 0) {
            nextCharacters[inter.targetId] = {
              ...targetChar,
              relation: clampRelation(targetChar.relation + Math.max(1, Math.round(relEffect.delta * 0.2))),
            };
          }
        }
      }
    }
  }

  // Update flags
  const flagSet = new Set(state.flags);
  if (choice.setFlags) {
    for (const f of choice.setFlags) flagSet.add(f);
  }
  if (choice.clearFlags) {
    for (const f of choice.clearFlags) flagSet.delete(f);
  }

  // Update queued chain cards
  const nextQueue = state.queuedChainCardIds.filter((id) => id !== card.id);
  if (choice.nextChainCardId && !nextQueue.includes(choice.nextChainCardId)) {
    nextQueue.unshift(choice.nextChainCardId);
  }

  // Update wars
  let warsWon = state.warsWon;
  let warsLost = state.warsLost;
  const nextWars = [...state.activeWars];
  if (choice.warUpdate) {
    const wu = choice.warUpdate;
    const idx = nextWars.findIndex((w) => w.warId === wu.warId);
    if (idx >= 0) {
      const updatedBalance = Math.max(-100, Math.min(100, nextWars[idx].balance + wu.progressDelta));
      if (wu.resolved || updatedBalance >= 100) {
        warsWon++;
        nextWars.splice(idx, 1);
      } else if (updatedBalance <= -100) {
        warsLost++;
        nextWars.splice(idx, 1);
      } else {
        nextWars[idx] = { ...nextWars[idx], balance: updatedBalance };
      }
    } else if (!wu.resolved) {
      nextWars.push({
        warId: wu.warId,
        name: wu.name,
        enemyHouse: wu.enemyHouse,
        balance: wu.progressDelta,
        startedTurn: nextTurn,
      });
    }
  }

  // Record journal & major decision log
  const charDef = CHARACTER_MAP[card.characterId] || CHARACTERS[0];
  const logEntry: DecisionLogEntry = {
    turn: nextTurn,
    cardId: card.id,
    cardTitle: localizedCard.title,
    characterId: card.characterId,
    characterName: charDef.name,
    region: card.region,
    choiceSide: side,
    choiceLabel: interpolateText(localizedChoice.label, state.playerName, state.roleId, lang),
    outcomeText: interpolateText(localizedChoice.outcomeText, state.playerName, state.roleId, lang),
    indicatorDelta: appliedDelta,
    isMajor: Boolean(choice.isMajorDecision || card.isCanon || card.isRare),
    timestamp: Date.now(),
  };

  // Keep journal bounded in memory for 6,000-decision performance while retaining all major decisions
  const nextJournal = [...state.journal.slice(-249), logEntry];
  const nextMajorDecisions = logEntry.isMajor
    ? [...state.majorDecisions.slice(-299), logEntry]
    : state.majorDecisions;

  const allAbove20 =
    nextIndicators.people >= 20 &&
    nextIndicators.military >= 20 &&
    nextIndicators.treasury >= 20 &&
    nextIndicators.nobles >= 20;
  const nextStreak20 = allAbove20 ? state.minIndicatorStreak20 + 1 : 0;
  const nextMaxStreak20 = Math.max(state.maxStreak20Reached, nextStreak20);

  const nextPeak: Indicators = {
    people: Math.max(state.peakIndicators.people, nextIndicators.people),
    military: Math.max(state.peakIndicators.military, nextIndicators.military),
    treasury: Math.max(state.peakIndicators.treasury, nextIndicators.treasury),
    nobles: Math.max(state.peakIndicators.nobles, nextIndicators.nobles),
  };

  const nextCategoryCounts = {
    ...state.categoryCounts,
    [card.category]: (state.categoryCounts[card.category] || 0) + 1,
  };

  const nextArchetypeCounts = {
    ...state.choiceArchetypeCounts,
    [choice.choiceArchetype]: (state.choiceArchetypeCounts[choice.choiceArchetype] || 0) + 1,
  };

  const nextState: GameRunState = {
    ...state,
    currentRegion: choice.changeRegion || card.region || state.currentRegion,
    turn: nextTurn,
    indicators: nextIndicators,
    lastDelta: appliedDelta,
    characters: nextCharacters,
    flags: Array.from(flagSet),
    activeWars: nextWars,
    queuedChainCardIds: nextQueue,
    recentCardIds: [...state.recentCardIds.slice(-6000), card.id],
    recentBaseScenarioIds: [...state.recentBaseScenarioIds.slice(-80), card.baseScenarioId],
    recentCharacterIds: [...state.recentCharacterIds.slice(-10), card.characterId],
    recentCategories: [...state.recentCategories.slice(-12), card.category],
    journal: nextJournal,
    majorDecisions: nextMajorDecisions,
    categoryCounts: nextCategoryCounts,
    choiceArchetypeCounts: nextArchetypeCounts,
    peakIndicators: nextPeak,
    minIndicatorStreak20: nextStreak20,
    maxStreak20Reached: nextMaxStreak20,
    warsWon,
    warsLost,
    updatedAt: Date.now(),
    undoStack: nextUndoStack,
  };

  // Check if any indicator dropped to 0 (Defeat takes precedence on the decision it hits 0)
  const zeroKey = (['people', 'military', 'treasury', 'nobles'] as IndicatorKey[]).find(
    (k) => nextIndicators[k] <= 0
  );

  if (zeroKey) {
    nextState.status = 'defeat';
    nextState.endingSummary = buildDefeatEnding(nextState, zeroKey);
    return nextState;
  }

  // Check if player reached targetDecisions for the current mode (300, 600, 1200, or 6000)
  if (nextTurn >= nextState.targetDecisions) {
    nextState.status = 'victory';
    nextState.endingSummary = buildVictoryEnding(nextState);
    return nextState;
  }

  // Otherwise select the next card
  nextState.currentCard = selectNextScenarioCard(nextState);
  return nextState;
}

/**
 * Upgrades a victorious run to the next game mode tier (Section 3):
 * - quick (300) -> normal (600)
 * - normal (600) -> long (1200)
 * - long (1200) -> competitive (6000)
 */
export function upgradeGameMode(state: GameRunState): GameRunState {
  if (state.status !== 'victory') return state;
  const currentModeConfig = GAME_MODES[state.modeId];
  if (!currentModeConfig.nextModeId) return state;

  const nextModeConfig = GAME_MODES[currentModeConfig.nextModeId];
  if (!nextModeConfig || nextModeConfig.targetDecisions <= state.targetDecisions) {
    return state;
  }

  const upgradedState: GameRunState = {
    ...state,
    modeId: nextModeConfig.id,
    targetDecisions: nextModeConfig.targetDecisions,
    status: 'playing',
    endingSummary: undefined,
    updatedAt: Date.now(),
  };

  upgradedState.currentCard = selectNextScenarioCard(upgradedState);
  return upgradedState;
}

/**
 * Safely renames the player and/or campaign title in an active save without altering past logs or losing state (Section 14).
 */
export function updatePlayerNameInRun(
  state: GameRunState,
  newRawName: string,
  newRawCampaignName?: string
): GameRunState {
  const cleaned = sanitizePlayerName(newRawName);
  const nextCampaignName =
    newRawCampaignName !== undefined
      ? sanitizeCampaignName(newRawCampaignName) || undefined
      : state.campaignName;
  if (!cleaned) return state;
  return {
    ...state,
    playerName: cleaned,
    campaignName: nextCampaignName,
    updatedAt: Date.now(),
  };
}
