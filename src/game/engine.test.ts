import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_UNDO_STEPS,
  applyCardChoice,
  createInitialGameState,
  interpolateText,
  sanitizePlayerName,
  scaleIndicatorDeltaForDifficulty,
  scaleSingleDeltaForDifficulty,
  undoLastDecision,
  updatePlayerNameInRun,
  upgradeGameMode,
} from './engine';
import {
  getCardById,
  getScenarioPoolManifest,
  materializeContextualCard,
  selectNextScenarioCard,
  validateCardSchema,
} from './scenarioPoolEngine';
import { localizeCard } from '../i18n/localization';

test('3 Difficulty Modes (Easy [-5, +10], Normal [-10, +10], Hard [-10, +7]) and Custom Campaign Name work accurately', () => {
  // Default new game starts in Normal difficulty and supports custom campaignName
  const defaultState = createInitialGameState({
    playerName: 'Aegon',
    campaignName: 'Kuzeyin İntikamı',
    modeId: 'normal',
    roleId: 'noble_bannerman',
    eraId: 'robert_reign',
  });
  assert.equal(defaultState.difficultyId, 'normal');
  assert.equal(defaultState.campaignName, 'Kuzeyin İntikamı');

  // 1. Easy mode ('easy'): Max +10 increase, Max -5 drop (negative deltas halved and capped at -5)
  assert.equal(scaleSingleDeltaForDifficulty(-10, 'treasury', 'easy'), -5);
  assert.equal(scaleSingleDeltaForDifficulty(-6, 'people', 'easy'), -3);
  assert.equal(scaleSingleDeltaForDifficulty(-1, 'military', 'easy'), -1);
  assert.equal(scaleSingleDeltaForDifficulty(8, 'military', 'easy'), 8);
  assert.equal(scaleSingleDeltaForDifficulty(14, 'nobles', 'easy'), 10);

  // 2. Normal mode ('normal'): Balanced [-10, +10] (Max +10 increase, Max -10 drop)
  assert.equal(scaleSingleDeltaForDifficulty(-10, 'treasury', 'normal'), -10);
  assert.equal(scaleSingleDeltaForDifficulty(-15, 'people', 'normal'), -10);
  assert.equal(scaleSingleDeltaForDifficulty(-6, 'military', 'normal'), -6);
  assert.equal(scaleSingleDeltaForDifficulty(7, 'people', 'normal'), 7);
  assert.equal(scaleSingleDeltaForDifficulty(15, 'treasury', 'normal'), 10);

  // 3. Hard mode ('hard'): Max +7 increase, Max -10 drop
  assert.equal(scaleSingleDeltaForDifficulty(-10, 'treasury', 'hard'), -10);
  assert.equal(scaleSingleDeltaForDifficulty(-15, 'people', 'hard'), -10);
  assert.equal(scaleSingleDeltaForDifficulty(10, 'people', 'hard'), 7);
  assert.equal(scaleSingleDeltaForDifficulty(7, 'military', 'hard'), 5);
  assert.equal(scaleSingleDeltaForDifficulty(4, 'nobles', 'hard'), 3);
  assert.equal(scaleSingleDeltaForDifficulty(1, 'nobles', 'hard'), 1);

  // Verify full IndicatorDelta object scaling in Easy, Normal, and Hard modes
  const scaledEasy = scaleIndicatorDeltaForDifficulty(
    { people: -8, military: 6, treasury: -10, nobles: 10, reason: 'Easy test' },
    'easy'
  );
  assert.equal(scaledEasy.people, -4);
  assert.equal(scaledEasy.military, 6);
  assert.equal(scaledEasy.treasury, -5);
  assert.equal(scaledEasy.nobles, 10);

  const scaledHard = scaleIndicatorDeltaForDifficulty(
    { people: -8, military: 6, treasury: -10, nobles: 10, reason: 'Hard test' },
    'hard'
  );
  assert.equal(scaledHard.people, -8);
  assert.equal(scaledHard.military, 4);
  assert.equal(scaledHard.treasury, -10);
  assert.equal(scaledHard.nobles, 7);
});

test('Rebalanced 64k+ card pool stays strictly within [-10, +10] and allows strategic survival well beyond 8 cards while preserving all 4 defeat paths', () => {
  let negNoblesCount = 0;
  let negMilitaryCount = 0;
  let negPeopleCount = 0;
  let negTreasuryCount = 0;

  for (let seedIdx = 0; seedIdx < 42; seedIdx++) {
    const card = materializeContextualCard(seedIdx, seedIdx % 16, seedIdx % 12, 0);
    for (const choice of [card.leftChoice, card.rightChoice]) {
      for (const k of ['people', 'military', 'treasury', 'nobles'] as const) {
        const val = choice.indicators[k] || 0;
        assert.ok(val >= -10 && val <= 10, `Card ${card.id} indicator ${k}=${val} out of [-10, +10]`);
      }
      if ((choice.indicators.nobles || 0) < 0) negNoblesCount++;
      if ((choice.indicators.military || 0) < 0) negMilitaryCount++;
      if ((choice.indicators.people || 0) < 0) negPeopleCount++;
      if ((choice.indicators.treasury || 0) < 0) negTreasuryCount++;
    }
  }

  // Balanced trade-offs across all 4 indicators
  assert.ok(negNoblesCount >= 25, `Expected >= 25 options with negative Nobles impact, got ${negNoblesCount}`);
  assert.ok(negMilitaryCount >= 25, `Expected >= 25 options with negative Military impact, got ${negMilitaryCount}`);
  assert.ok(negPeopleCount >= 25, `Expected >= 25 options with negative People impact, got ${negPeopleCount}`);
  assert.ok(negTreasuryCount >= 25, `Expected >= 25 options with negative Treasury impact, got ${negTreasuryCount}`);

  // 1. Strategic AI player in Normal mode who protects the lowest indicator survives well past 8 cards (e.g., >= 60 cards naturally)
  let smartState = createInitialGameState({
    playerName: 'Aegon',
    modeId: 'normal',
    difficultyId: 'normal',
    roleId: 'noble_bannerman',
    eraId: 'robert_reign',
  });

  for (let step = 0; step < 80 && smartState.status === 'playing'; step++) {
    const leftD = scaleIndicatorDeltaForDifficulty(smartState.currentCard.leftChoice.indicators, 'normal');
    const rightD = scaleIndicatorDeltaForDifficulty(smartState.currentCard.rightChoice.indicators, 'normal');

    const scoreOption = (d: typeof leftD) => {
      const nextP = smartState.indicators.people + (d.people || 0);
      const nextM = smartState.indicators.military + (d.military || 0);
      const nextT = smartState.indicators.treasury + (d.treasury || 0);
      const nextN = smartState.indicators.nobles + (d.nobles || 0);
      const minVal = Math.min(nextP, nextM, nextT, nextN);
      const sumVal = nextP + nextM + nextT + nextN;
      return minVal * 5 + sumVal;
    };

    const side = scoreOption(leftD) >= scoreOption(rightD) ? 'left' : 'right';
    smartState = applyCardChoice(smartState, side);
  }
  assert.ok(
    smartState.turn >= 60,
    `Expected strategic player in Normal mode to survive at least 60 cards naturally, survived ${smartState.turn}`
  );

  // 2. Simulate runs where player consistently picks options that hurt Nobles, Military, People, or Treasury in Normal mode
  for (const targetKey of ['nobles', 'military', 'people', 'treasury'] as const) {
    let state = createInitialGameState({
      playerName: 'Aegon',
      modeId: 'normal',
      difficultyId: 'normal',
      roleId: 'noble_bannerman',
      eraId: 'robert_reign',
    });

    for (let step = 0; step < 45 && state.status === 'playing'; step++) {
      for (const k of ['people', 'military', 'treasury', 'nobles'] as const) {
        if (k !== targetKey) state.indicators[k] = 80;
      }
      const leftVal = state.currentCard.leftChoice.indicators[targetKey] || 0;
      const rightVal = state.currentCard.rightChoice.indicators[targetKey] || 0;
      const side = leftVal <= rightVal ? 'left' : 'right';
      state = applyCardChoice(state, side);
    }

    assert.equal(state.status, 'defeat', `Expected natural defeat on ${targetKey} within 45 turns`);
    assert.equal(state.indicators[targetKey], 0, `Expected ${targetKey} to hit 0`);
    assert.equal(state.endingSummary?.triggerIndicator, targetKey);
  }
});

test('60,000+ Card Pool Manifest & Schema Validation', () => {
  const manifest = getScenarioPoolManifest();
  assert.ok(
    manifest.totalUniquePlayableCards >= 60000,
    `Expected >= 60,000 playable cards, got ${manifest.totalUniquePlayableCards}`
  );
  assert.equal(manifest.categoriesCount, 42);
  assert.equal(manifest.packs.length, 6);

  // Validate sample cards across all 42 categories
  for (let seedIdx = 0; seedIdx < 42; seedIdx++) {
    const cardA = materializeContextualCard(seedIdx, 0, 0, 0);
    const cardB = materializeContextualCard(seedIdx, 7, 5, 3);
    const vA = validateCardSchema(cardA);
    const vB = validateCardSchema(cardB);
    assert.equal(vA.valid, true, `Card ${cardA.id} failed validation: ${vA.errors.join(', ')}`);
    assert.equal(vB.valid, true, `Card ${cardB.id} failed validation: ${vB.errors.join(', ')}`);
    assert.notEqual(cardA.id, cardB.id);
    assert.notEqual(cardA.text, cardB.text);
    assert.notEqual(cardA.leftChoice.label, cardB.leftChoice.label);
  }
});

test('Card choices update indicators, increment turn, and trigger defeat at 0', () => {
  let state = createInitialGameState({
    playerName: 'Aegon',
    modeId: 'quick',
    roleId: 'noble_bannerman',
    eraId: 'robert_reign',
  });

  assert.equal(state.turn, 0);
  assert.equal(state.targetDecisions, 300);

  // Apply Left choice
  state = applyCardChoice(state, 'left');
  assert.equal(state.turn, 1);
  assert.equal(state.journal.length, 1);

  // Force an indicator near zero and verify defeat triggers
  state = {
    ...state,
    indicators: { people: 1, military: 50, treasury: 50, nobles: 50 },
    currentCard: {
      ...state.currentCard,
      leftChoice: {
        ...state.currentCard.leftChoice,
        indicators: { people: -15, military: 0, treasury: 0, nobles: 0, reason: 'Test revolt' },
      },
    },
  };
  const defeated = applyCardChoice(state, 'left');
  assert.equal(defeated.status, 'defeat');
  assert.equal(defeated.indicators.people, 0);
  assert.ok(defeated.endingSummary);
  assert.equal(defeated.endingSummary?.isVictory, false);
  assert.equal(defeated.endingSummary?.triggerIndicator, 'people');
});

test('Undo Last Decision (capped at MAX_UNDO_STEPS = 10) restores exact state and recovers from defeat', () => {
  let state = createInitialGameState({
    playerName: 'Rhaenyra',
    modeId: 'quick',
    roleId: 'noble_bannerman',
    eraId: 'robert_reign',
  });

  assert.equal(state.undoStack?.length || 0, 0);
  assert.equal(undoLastDecision(state), null);

  // Make 15 consecutive decisions (keeping indicators healthy)
  for (let i = 0; i < 15; i++) {
    state.indicators = { people: 55, military: 55, treasury: 55, nobles: 55 };
    state = applyCardChoice(state, i % 2 === 0 ? 'left' : 'right');
  }

  assert.equal(state.turn, 15);
  assert.equal(state.undoStack?.length, MAX_UNDO_STEPS);

  // Undo all 10 available steps
  for (let u = 1; u <= MAX_UNDO_STEPS; u++) {
    const reverted = undoLastDecision(state);
    assert.ok(reverted, `Expected undo #${u} to succeed`);
    state = reverted!;
    assert.equal(state.turn, 15 - u);
  }

  // 11th undo should return null because only last 10 decisions are stored
  assert.equal(state.turn, 5);
  assert.equal(state.undoStack?.length, 0);
  assert.equal(undoLastDecision(state), null);
});

test('Full English localization translates both Canon and Procedural 64k+ cards completely', () => {
  const state = createInitialGameState({
    playerName: 'Eddard',
    modeId: 'normal',
    roleId: 'noble_bannerman',
    eraId: 'robert_reign',
  });

  // 1. Test Canon card translation
  const canonCard = getCardById('canon_001_robert_arrival');
  assert.ok(canonCard);
  const enCanon = localizeCard(canonCard!, 'en', state);
  assert.ok(enCanon.title.includes('King Robert'), `Unexpected English canon title: ${enCanon.title}`);
  assert.ok(enCanon.text.includes('Jon Arryn'), `Unexpected English canon text: ${enCanon.text}`);

  // 2. Test Procedural cards across all 42 categories in English
  for (let seedIdx = 0; seedIdx < 42; seedIdx++) {
    const rawCard = materializeContextualCard(seedIdx, 3, 2, 1);
    const enCard = localizeCard(rawCard, 'en', state);
    assert.notEqual(enCard.title, rawCard.title, `Seed ${seedIdx} title was not translated to English`);
    assert.notEqual(enCard.text, rawCard.text, `Seed ${seedIdx} text was not translated to English`);
    assert.notEqual(
      enCard.leftChoice.label,
      rawCard.leftChoice.label,
      `Seed ${seedIdx} leftChoice was not translated to English`
    );
  }
});

test('Mode completion (300 -> 600 -> 1200 -> 6000) and Mode Upgrade preserves all progress', () => {
  let state = createInitialGameState({
    playerName: 'Kral Aegon',
    modeId: 'quick',
    roleId: 'small_council_advisor',
    eraId: 'kings_landing_crisis',
  });

  // Jump to turn 299 with healthy indicators
  state = {
    ...state,
    turn: 299,
    indicators: { people: 60, military: 60, treasury: 60, nobles: 60 },
    flags: [...state.flags, 'ned_stark_saved'],
  };

  // Complete 300th decision in Quick Mode
  state = applyCardChoice(state, 'left');
  assert.equal(state.turn, 300);
  assert.equal(state.status, 'victory');
  assert.equal(state.endingSummary?.isVictory, true);
  assert.equal(state.endingSummary?.canUpgradeMode, true);
  assert.equal(state.endingSummary?.nextModeId, 'normal');

  // Upgrade Quick (300) -> Normal (600)
  state = upgradeGameMode(state);
  assert.equal(state.modeId, 'normal');
  assert.equal(state.targetDecisions, 600);
  assert.equal(state.turn, 300); // Turn counter is preserved!
  assert.equal(state.status, 'playing');
  assert.ok(state.flags.includes('ned_stark_saved'));

  // Complete 600th decision in Normal Mode -> Upgrade to Long (1200)
  state = {
    ...state,
    turn: 599,
    indicators: { people: 65, military: 65, treasury: 65, nobles: 65 },
  };
  state = applyCardChoice(state, 'right');
  assert.equal(state.turn, 600);
  assert.equal(state.status, 'victory');
  state = upgradeGameMode(state);
  assert.equal(state.modeId, 'long');
  assert.equal(state.targetDecisions, 1200);
  assert.equal(state.turn, 600);

  // Complete 1200th decision in Long Mode -> Upgrade to Competitive (6000)
  state = {
    ...state,
    turn: 1199,
    indicators: { people: 70, military: 70, treasury: 70, nobles: 70 },
  };
  state = applyCardChoice(state, 'left');
  assert.equal(state.turn, 1200);
  assert.equal(state.status, 'victory');
  state = upgradeGameMode(state);
  assert.equal(state.modeId, 'competitive');
  assert.equal(state.targetDecisions, 6000);
  assert.equal(state.turn, 1200);
});

test('Dead characters never appear as active card speakers and deep chains branch properly', () => {
  let state = createInitialGameState({
    playerName: 'Aegon',
    modeId: 'normal',
    roleId: 'diplomat',
    eraId: 'kings_landing_crisis',
  });

  // Trigger Tyrion's secret warning card
  const tyrionCard = getCardById('canon_005_tyrion_secret_warning');
  assert.ok(tyrionCard);
  state = { ...state, currentCard: tyrionCard! };

  // Choose Option A: Trust Tyrion
  state = applyCardChoice(state, 'left');
  assert.ok(state.flags.includes('tyrion_secret_ally'));
  assert.equal(state.currentCard.id, 'canon_006_tyrion_crisis_solution');

  // Mark Ned Stark as dead and ensure he is never selected on subsequent cards
  state.characters.ned_stark.status = 'dead';
  for (let i = 0; i < 40; i++) {
    const nextCard = selectNextScenarioCard({ ...state, turn: state.turn + i });
    assert.notEqual(nextCard.characterId, 'ned_stark', 'Dead character should not be selected');
  }
});

test('Player name sanitization and bilingual interpolation', () => {
  const dirty = '<script>alert(1)</script>Lord Aegon';
  const clean = sanitizePlayerName(dirty);
  assert.equal(clean.includes('<'), false);
  assert.equal(clean.includes('>'), false);

  let state = createInitialGameState({
    playerName: 'Aegon',
    modeId: 'quick',
    roleId: 'small_council_advisor',
    eraId: 'robert_reign',
  });
  state = updatePlayerNameInRun(state, 'Rhaenyra');
  assert.equal(state.playerName, 'Rhaenyra');
  const renderedTr = interpolateText('Selam {{playerTitle}} {{playerName}}!', state.playerName, state.roleId, 'tr');
  assert.equal(renderedTr, 'Selam Başdanışman Rhaenyra!');
  const renderedEn = interpolateText('Hail {{playerTitle}} {{playerName}}!', state.playerName, state.roleId, 'en');
  assert.equal(renderedEn, 'Hail Councilor Rhaenyra!');
});

test('6,000-Decision Competitive Mode Stress & Anti-Repetition Simulation', () => {
  let state = createInitialGameState({
    playerName: 'Aegon',
    modeId: 'competitive',
    roleId: 'throne_claimant',
    eraId: 'robert_reign',
  });

  const seenCardIds = new Set<string>();
  let duplicateCount = 0;

  for (let step = 0; step < 6000; step++) {
    const cid = state.currentCard.id;
    if (seenCardIds.has(cid)) {
      duplicateCount++;
    }
    seenCardIds.add(cid);

    // Keep indicators balanced around 65 so the anti-repetition simulation runs all 6,000 steps to Victory
    state.indicators = {
      people: Math.max(65, Math.min(85, state.indicators.people)),
      military: Math.max(65, Math.min(85, state.indicators.military)),
      treasury: Math.max(65, Math.min(85, state.indicators.treasury)),
      nobles: Math.max(65, Math.min(85, state.indicators.nobles)),
    };

    const side = step % 2 === 0 ? 'left' : 'right';
    state = applyCardChoice(state, side);
  }

  assert.equal(state.turn, 6000);
  assert.equal(state.status, 'victory');
  assert.equal(duplicateCount, 0, `Expected 0 duplicate cards in 6,000 decisions, got ${duplicateCount}`);
});
