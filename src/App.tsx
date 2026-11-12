import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AmbientStageCanvas } from './components/AmbientStageCanvas';
import { DecisionCard } from './components/DecisionCard';
import { IndicatorsBar } from './components/IndicatorsBar';
import {
  CharactersModal,
  JournalAndArchiveModal,
  SavedGamesModal,
  SettingsAndAboutModal,
  StatsAndAchievementsModal,
} from './components/ModalsAndDrawers';
import { DIFFICULTY_MODES, ERAS, GAME_MODES, PLAYER_ROLES, REGIONS } from './data/categoriesAndEras';
import {
  MAX_UNDO_STEPS,
  applyCardChoice,
  createInitialGameState,
  sanitizePlayerName,
  scaleIndicatorDeltaForDifficulty,
  undoLastDecision,
  updatePlayerNameInRun,
  upgradeGameMode,
} from './game/engine';
import { getScenarioPoolManifest } from './game/scenarioPoolEngine';
import {
  EN_DIFFICULTY_MODES,
  EN_ERAS,
  EN_GAME_MODES,
  EN_PLAYER_ROLES,
  EN_REGIONS,
  formatPlayTimeLocalized,
  formatProgressLocalized,
  loadLanguage,
  localizeEndingSummary,
  saveLanguage,
} from './i18n/localization';
import {
  DifficultyId,
  EraId,
  GameLanguage,
  GameModeId,
  GameRunState,
  GlobalPlayerStatistics,
  IndicatorDelta,
  PlayerRoleId,
} from './types/game';
import { soundEngine } from './utils/audio';
import {
  AudioSettings,
  deleteAllGameRuns,
  deleteGameRun,
  getActiveSaveId,
  importSavesFromJsonString,
  loadAllGameRuns,
  loadAudioSettings,
  loadGlobalStats,
  loadLastPlayerName,
  recordDecisionInGlobalStats,
  saveAudioSettings,
  saveGameRun,
  saveLastPlayerName,
} from './utils/storage';

type ShellScreen = 'title' | 'setup' | 'playing' | 'paused' | 'gameover';
type ActiveModal = 'none' | 'characters' | 'saves' | 'journal' | 'stats' | 'settings' | 'about';

export function App() {
  const [screen, setScreen] = useState<ShellScreen>('title');
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [inspectCharId, setInspectCharId] = useState<string | null>(null);
  const [language, setLanguage] = useState<GameLanguage>(() => loadLanguage());

  // Game Run & Saves State
  const [runState, setRunState] = useState<GameRunState | null>(null);
  const [saves, setSaves] = useState<GameRunState[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalPlayerStatistics>(() => loadGlobalStats());
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => loadAudioSettings());

  // New Game Setup Form State (Pre-filled from previous player name, never hardcoded to "Ahmet")
  const [setupName, setSetupName] = useState<string>(() => loadLastPlayerName());
  const [setupNameError, setSetupNameError] = useState<string>('');
  const [setupDifficulty, setSetupDifficulty] = useState<DifficultyId>('normal');
  const [setupMode, setSetupMode] = useState<GameModeId>('normal');
  const [setupRole, setSetupRole] = useState<PlayerRoleId>('noble_bannerman');
  const [setupEra, setSetupEra] = useState<EraId>('robert_reign');
  const [showAdvancedSetup, setShowAdvancedSetup] = useState<boolean>(false);

  // Visual, 2-Press Keyboard Preview & Juice State
  const [previewDelta, setPreviewDelta] = useState<IndicatorDelta | null>(null);
  const [keyboardPreviewSide, setKeyboardPreviewSide] = useState<'left' | 'right' | null>(null);
  const [impulseCounter, setImpulseCounter] = useState<number>(0);
  const [impulseSeverity, setImpulseSeverity] = useState<'light' | 'heavy'>('light');

  const runStateRef = useRef<GameRunState | null>(null);
  runStateRef.current = runState;
  const setupInputRef = useRef<HTMLInputElement | null>(null);

  const manifest = getScenarioPoolManifest();
  const isEn = language === 'en';

  // Sync document.body.dataset.state for verification contract
  useEffect(() => {
    const mapped = screen === 'setup' ? 'title' : screen;
    document.body.dataset.state = mapped;
  }, [screen]);

  // Focus player name input when entering setup screen
  useEffect(() => {
    if (screen === 'setup') {
      const storedPrev = loadLastPlayerName();
      if (!setupName && storedPrev) {
        setSetupName(storedPrev);
      }
      window.setTimeout(() => {
        setupInputRef.current?.focus();
        setupInputRef.current?.select();
      }, 40);
    }
  }, [screen, setupName]);

  // Start gentle GoT background theme music on first user gesture
  useEffect(() => {
    const unlockAudio = () => {
      soundEngine.ensureBackgroundMusic();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Initial load of saved games & ?autostart=1 support
  useEffect(() => {
    let mounted = true;
    loadAllGameRuns().then((loadedSaves) => {
      if (!mounted) return;
      setSaves(loadedSaves);
      const lastActiveId = getActiveSaveId();
      const matched = loadedSaves.find((s) => s.saveId === lastActiveId) || loadedSaves[0] || null;
      const rememberedName = loadLastPlayerName();

      if (matched) {
        setRunState(matched);
        if (!rememberedName && matched.playerName) {
          setSetupName(matched.playerName);
          saveLastPlayerName(matched.playerName);
        }
      }

      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        if (matched && matched.status === 'playing') {
          setRunState(matched);
          setScreen('playing');
        } else {
          const initialName = rememberedName || matched?.playerName || (loadLanguage() === 'en' ? 'Aegon' : 'Eddard');
          const fresh = createInitialGameState({
            playerName: initialName,
            modeId: 'normal',
            difficultyId: 'normal',
            roleId: 'noble_bannerman',
            eraId: 'robert_reign',
          });
          setRunState(fresh);
          saveGameRun(fresh).then(() => loadAllGameRuns().then(setSaves));
          setGlobalStats(recordDecisionInGlobalStats(fresh, true, false));
          setScreen('playing');
        }
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Real-time active play time tracker
  useEffect(() => {
    if (screen !== 'playing' || activeModal !== 'none') return;

    const timer = window.setInterval(() => {
      if (document.hidden) return;
      setRunState((prev) => {
        if (!prev || prev.status !== 'playing') return prev;
        const updated: GameRunState = {
          ...prev,
          activePlayTimeSeconds: prev.activePlayTimeSeconds + 1,
        };
        if (updated.activePlayTimeSeconds % 10 === 0) {
          saveGameRun(updated);
        }
        return updated;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [screen, activeModal]);

  const refreshSavesList = useCallback(async () => {
    const all = await loadAllGameRuns();
    setSaves(all);
  }, []);

  const handleChangeLanguage = useCallback((nextLang: GameLanguage) => {
    setLanguage(nextLang);
    saveLanguage(nextLang);
    soundEngine.playUiClick();
  }, []);

  const openSetupWithRememberedName = useCallback(() => {
    const prevName = loadLastPlayerName() || runStateRef.current?.playerName || '';
    setSetupName(prevName);
    setSetupNameError('');
    setScreen('setup');
  }, []);

  const handleQuickStartFromTitle = useCallback(() => {
    soundEngine.playUiClick();
    soundEngine.ensureBackgroundMusic();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (runState && runState.status === 'playing') {
      setScreen('playing');
      return;
    }
    // Always ask for player's preferred name/title when starting a new game (pre-filled with previous name)
    openSetupWithRememberedName();
  }, [runState, openSetupWithRememberedName]);

  const handleStartConfiguredGame = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizePlayerName(setupName);
    if (!clean) {
      setSetupNameError(
        isEn
          ? 'Please enter how you wish to be addressed in Westeros.'
          : 'Lütfen Westeros’ta size nasıl hitap edilmesini istediğinizi girin.'
      );
      return;
    }
    setSetupNameError('');
    saveLastPlayerName(clean);
    soundEngine.playUiClick();
    soundEngine.ensureBackgroundMusic();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const fresh = createInitialGameState({
      playerName: clean,
      modeId: setupMode,
      difficultyId: setupDifficulty,
      roleId: setupRole,
      eraId: setupEra,
    });
    setRunState(fresh);
    setKeyboardPreviewSide(null);
    setPreviewDelta(null);
    saveGameRun(fresh).then(refreshSavesList);
    setGlobalStats(recordDecisionInGlobalStats(fresh, true, false));
    setScreen('playing');
  };

  const handleCardChoice = useCallback(
    (side: 'left' | 'right') => {
      const current = runStateRef.current;
      if (!current || current.status !== 'playing') return;

      const choiceObj = side === 'left' ? current.currentCard.leftChoice : current.currentCard.rightChoice;
      const isHeavy = Boolean(
        choiceObj.isMajorDecision ||
          current.currentCard.isCanon ||
          Math.abs(choiceObj.indicators.military || 0) >= 10 ||
          Math.abs(choiceObj.indicators.people || 0) >= 10
      );

      soundEngine.playCardDecision(side, isHeavy);
      setImpulseSeverity(isHeavy ? 'heavy' : 'light');
      setImpulseCounter((c) => c + 1);
      setPreviewDelta(null);
      setKeyboardPreviewSide(null);

      const nextState = applyCardChoice(current, side, language);
      setRunState(nextState);
      saveGameRun(nextState).then(refreshSavesList);

      const didFinish = nextState.status === 'victory' || nextState.status === 'defeat';
      const updatedStats = recordDecisionInGlobalStats(nextState, false, didFinish);
      setGlobalStats(updatedStats);

      const anyCritical =
        nextState.indicators.people <= 20 ||
        nextState.indicators.military <= 20 ||
        nextState.indicators.treasury <= 20 ||
        nextState.indicators.nobles <= 20;

      if (didFinish) {
        if (nextState.status === 'victory') {
          soundEngine.playVictoryFanfare();
        } else {
          soundEngine.playDefeatSting();
        }
        setScreen('gameover');
      } else if (anyCritical) {
        soundEngine.playCriticalWarning();
      }
    },
    [refreshSavesList, language]
  );

  // Undo last decision (up to MAX_UNDO_STEPS = 10)
  const handleUndoDecision = useCallback(() => {
    const current = runStateRef.current;
    if (!current || !current.undoStack || current.undoStack.length === 0) return;

    const restored = undoLastDecision(current);
    if (!restored) return;

    soundEngine.playUndoSound();
    setPreviewDelta(null);
    setKeyboardPreviewSide(null);
    setRunState(restored);
    saveGameRun(restored).then(refreshSavesList);
    if (screen === 'gameover') {
      setScreen('playing');
    }
  }, [refreshSavesList, screen]);

  const handleUpgradeMode = () => {
    if (!runState || runState.status !== 'victory') return;
    soundEngine.playVictoryFanfare();
    const upgraded = upgradeGameMode(runState);
    setRunState(upgraded);
    saveGameRun(upgraded).then(refreshSavesList);
    setScreen('playing');
  };

  const handleToggleMute = useCallback(() => {
    setAudioSettings((prev) => {
      const next: AudioSettings = {
        ...prev,
        sfxEnabled: !prev.sfxEnabled,
        musicEnabled: !prev.musicEnabled,
      };
      saveAudioSettings(next);
      soundEngine.updateSettings(next);
      return next;
    });
  }, []);

  // Global Keyboard Navigation with 2-Press A/D Decision Preview & Confirmation + Z Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (activeModal !== 'none') {
          setActiveModal('none');
          return;
        }
        if (screen === 'playing' && keyboardPreviewSide !== null) {
          setKeyboardPreviewSide(null);
          setPreviewDelta(null);
          return;
        }
        if (screen === 'playing') {
          setScreen('paused');
          return;
        }
        if (screen === 'paused') {
          setScreen('playing');
          return;
        }
        if (screen === 'setup') {
          setScreen('title');
          return;
        }
      }

      if (activeModal !== 'none') return;

      if (screen === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleQuickStartFromTitle();
        return;
      }

      if (screen === 'playing') {
        const current = runStateRef.current;
        if (!current || current.status !== 'playing') return;

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          // 2-Press logic: 1st press previews Left choice & top indicators; 2nd press commits Left choice
          if (keyboardPreviewSide === 'left') {
            handleCardChoice('left');
          } else {
            soundEngine.playCardHover();
            setKeyboardPreviewSide('left');
            setPreviewDelta(
              scaleIndicatorDeltaForDifficulty(
                current.currentCard.leftChoice.indicators,
                current.difficultyId || 'normal'
              )
            );
          }
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          // 2-Press logic: 1st press previews Right choice & top indicators; 2nd press commits Right choice
          if (keyboardPreviewSide === 'right') {
            handleCardChoice('right');
          } else {
            soundEngine.playCardHover();
            setKeyboardPreviewSide('right');
            setPreviewDelta(
              scaleIndicatorDeltaForDifficulty(
                current.currentCard.rightChoice.indicators,
                current.difficultyId || 'normal'
              )
            );
          }
        } else if (e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') {
          e.preventDefault();
          handleUndoDecision();
        } else if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          setScreen('paused');
        } else if (e.key === 'm' || e.key === 'M') {
          e.preventDefault();
          handleToggleMute();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    screen,
    activeModal,
    keyboardPreviewSide,
    handleQuickStartFromTitle,
    handleCardChoice,
    handleUndoDecision,
    handleToggleMute,
  ]);

  const activeRegionId = runState?.currentRegion || 'kings_landing';
  const activeRegionBase = REGIONS[activeRegionId] || REGIONS.kings_landing;
  const activeRegionSubtitle = isEn
    ? EN_REGIONS[activeRegionId]?.subtitle || activeRegionBase.turkishSubtitle
    : activeRegionBase.turkishSubtitle;
  const activeModeId = runState ? runState.modeId : setupMode;
  const activeModeMeta = isEn ? EN_GAME_MODES[activeModeId] : GAME_MODES[activeModeId];
  const activeDifficultyId: DifficultyId = runState?.difficultyId || setupDifficulty || 'normal';
  const activeDifficultyMeta = isEn
    ? EN_DIFFICULTY_MODES[activeDifficultyId]
    : DIFFICULTY_MODES[activeDifficultyId];
  const activeRoleId = runState?.roleId || setupRole;
  const activeRoleMeta = isEn
    ? EN_PLAYER_ROLES[activeRoleId]
    : PLAYER_ROLES.find((r) => r.id === activeRoleId) || PLAYER_ROLES[0];

  const undoCount = runState?.undoStack?.length || 0;
  const localizedEnding =
    runState?.endingSummary && runState
      ? localizeEndingSummary(runState.endingSummary, runState, language)
      : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none flex flex-col justify-between">
      {/* Isolated 60fps Canvas2D Ambient Stage */}
      <AmbientStageCanvas
        regionId={activeRegionId}
        impulseCounter={impulseCounter}
        impulseSeverity={impulseSeverity}
      />

      {/* =====================================================================
          1. TITLE SCREEN (ANA MENÜ / MAIN MENU)
         ===================================================================== */}
      {screen === 'title' && (
        <main className="relative z-10 w-full h-full flex flex-col items-center justify-between px-4 py-6 sm:py-10 pointer-events-auto overflow-y-auto">
          {/* Top Quiet Status Line + Quick Language Switcher */}
          <div className="w-full max-w-4xl flex items-center justify-between gap-2 text-xs text-[#a89b84] tracking-wider flex-wrap">
            <div className="flex items-center gap-2">
              <span>
                {isEn
                  ? 'Westeros & Essos Political Fate Simulation'
                  : 'Westeros & Essos Siyasi Kader Simülasyonu'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-tabular text-[#d4af37]">
                {manifest.totalUniquePlayableCards.toLocaleString(isEn ? 'en-US' : 'tr-TR')}{' '}
                {isEn ? 'Verified Scenario Cards' : 'Doğrulanmış Senaryo Kartı'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-testid="quick-lang-toggle"
                onClick={() => handleChangeLanguage(isEn ? 'tr' : 'en')}
                className="px-2.5 py-1 rounded bg-[#15121c]/95 hover:bg-[#241e30] border border-[#b48e4b]/45 text-[11px] font-bold text-[#d4af37]"
              >
                {isEn ? 'Dil: EN (Türkçe’ye Geç)' : 'Dil: TR (Switch to English)'}
              </button>
            </div>
          </div>

          {/* Centerpiece SVG Emblem Lockup & Primary Actions */}
          <div className="max-w-2xl w-full flex flex-col items-center text-center my-auto py-4">
            <svg
              viewBox="0 0 220 110"
              className="w-44 h-24 sm:w-52 sm:h-28 mb-3 drop-shadow-[0_10px_25px_rgba(212,175,55,0.28)]"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="throneGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fde68a" />
                  <stop offset="50%" stopColor="#d4af37" />
                  <stop offset="100%" stopColor="#92400e" />
                </linearGradient>
              </defs>
              <g stroke="#64748b" strokeWidth="2" strokeLinecap="round">
                <line x1="110" y1="95" x2="110" y2="8" />
                <line x1="110" y1="95" x2="88" y2="14" />
                <line x1="110" y1="95" x2="132" y2="14" />
                <line x1="110" y1="95" x2="68" y2="26" />
                <line x1="110" y1="95" x2="152" y2="26" />
                <line x1="110" y1="95" x2="50" y2="42" />
                <line x1="110" y1="95" x2="170" y2="42" />
              </g>
              <polygon
                points="65,82 75,46 93,65 110,34 127,65 145,46 155,82"
                fill="url(#throneGold)"
                stroke="#451a03"
                strokeWidth="2"
              />
              <rect x="65" y="82" width="90" height="9" rx="2" fill="url(#throneGold)" stroke="#451a03" strokeWidth="1.5" />
              <circle cx="110" cy="58" r="4" fill="#991b1b" />
              <circle cx="88" cy="68" r="3" fill="#991b1b" />
              <circle cx="132" cy="68" r="3" fill="#991b1b" />
            </svg>

            <h1 className="text-3xl sm:text-5xl font-extrabold font-display tracking-wide text-[#f5ebd6] drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
              {isEn ? 'IN THE SHADOW OF THE THRONE' : 'TAHTIN GÖLGESİNDE'}
            </h1>
            <p className="text-sm sm:text-base font-display tracking-widest text-[#d4af37] mt-1">
              {isEn
                ? 'GAME OF THRONES · STRATEGIC DECISION & SURVIVAL SAGA'
                : 'GAME OF THRONES · STRATEJİK KARAR VE HAYATTA KALMA DESTANI'}
            </p>

            {/* Primary CTA & Menu Buttons */}
            <div className="w-full max-w-xl mt-7 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  data-start="true"
                  data-testid="start-quick-btn"
                  onClick={handleQuickStartFromTitle}
                  className="w-full py-3.5 px-5 rounded-lg bg-[#b48e4b] hover:bg-[#d4af37] text-[#0b0a0e] font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-all whitespace-nowrap"
                >
                  {runState && runState.status === 'playing'
                    ? isEn
                      ? `Continue Last Game (${runState.turn}/${runState.targetDecisions})`
                      : `Son Oyuna Devam Et (${runState.turn}/${runState.targetDecisions})`
                    : isEn
                    ? 'Play Now [Enter]'
                    : 'Hemen Başla [Enter]'}
                </button>

                <button
                  type="button"
                  data-testid="open-new-game-setup-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    soundEngine.ensureBackgroundMusic();
                    openSetupWithRememberedName();
                  }}
                  className="w-full py-3.5 px-5 rounded-lg bg-[#1d1826] hover:bg-[#2a2236] text-[#f5ebd6] border border-[#d4af37]/60 font-bold text-sm tracking-wide transition-all whitespace-nowrap"
                >
                  {isEn ? 'Set Up New Game' : 'Yeni Oyun Kur'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                <button
                  type="button"
                  data-testid="menu-saves-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveModal('saves');
                  }}
                  className="py-2.5 px-3 rounded-md bg-[#15121c]/95 hover:bg-[#221d2d] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40 whitespace-nowrap"
                >
                  {isEn ? `Saved Games (${saves.length})` : `Kayıtlı Oyunlarım (${saves.length})`}
                </button>

                <button
                  type="button"
                  data-testid="menu-characters-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setInspectCharId(null);
                    setActiveModal('characters');
                  }}
                  className="py-2.5 px-3 rounded-md bg-[#15121c]/95 hover:bg-[#221d2d] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40 whitespace-nowrap"
                >
                  {isEn ? 'Characters' : 'Karakterler'}
                </button>

                <button
                  type="button"
                  data-testid="menu-stats-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveModal('stats');
                  }}
                  className="py-2.5 px-3 rounded-md bg-[#15121c]/95 hover:bg-[#221d2d] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40 whitespace-nowrap"
                >
                  {isEn ? 'Statistics' : 'İstatistikler'}
                </button>

                <button
                  type="button"
                  data-testid="menu-settings-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveModal('settings');
                  }}
                  className="py-2.5 px-3 rounded-md bg-[#15121c]/95 hover:bg-[#221d2d] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40 whitespace-nowrap"
                >
                  {isEn ? 'Settings & Language' : 'Ayarlar & Dil'}
                </button>
              </div>
            </div>
          </div>

          {/* Flat Single-Line Control Hint in Bottom Safe Margin */}
          <div className="text-xs text-[#9c8e78] text-center">
            {isEn
              ? 'A / Left & D / Right: 1st Press Previews Impact, 2nd Press Confirms · Z Undo (Last 10) · Esc Pause'
              : 'A / Sol Ok ve D / Sağ Ok: 1. Basış Sonucu Önizler, 2. Basış Kararı Verir · Z Geri Al (Son 10) · Esc Duraklat'}
          </div>
        </main>
      )}

      {/* =====================================================================
          2. NEW GAME SETUP SCREEN (YENİ OYUN KURULUMU)
         ===================================================================== */}
      {screen === 'setup' && (
        <main className="relative z-10 w-full h-full flex items-center justify-center p-3 sm:p-6 pointer-events-auto overflow-y-auto">
          <form
            onSubmit={handleStartConfiguredGame}
            className="w-full max-w-3xl bg-[#131118] border-2 border-[#b48e4b]/65 rounded-xl shadow-2xl p-5 sm:p-6 space-y-5 my-auto max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#b48e4b]/30 pb-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-display text-[#f5ebd6]">
                  {isEn ? 'Begin a New Westeros Saga' : 'Yeni Westeros Destanı Başlat'}
                </h2>
                <p className="text-xs text-[#a89b84]">
                  {isEn
                    ? 'Enter your preferred name of address, select a target decision mode, and choose your starting era'
                    : 'Hitap isminizi, hedef karar modunu ve başlangıç koşullarını belirleyin'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScreen('title')}
                className="px-3 py-1.5 rounded bg-[#272230] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/35"
              >
                {isEn ? 'Back to Menu' : 'Ana Menüye Dön'}
              </button>
            </div>

            {/* Step 1: Player Name / Title of Address (Asked every setup, pre-filled with previous name) */}
            <div className="space-y-1.5">
              <label htmlFor="player-name-input" className="block text-xs font-bold text-[#d4af37]">
                {isEn
                  ? '1. HOW SHALL THE REALM ADDRESS YOU? (YOUR NAME / TITLE)'
                  : '1. DİYAR SİZE NASIL HİTAP ETSİN? (HÜKÜMDAR / HİTAP İSMİNİZ)'}
              </label>
              <input
                ref={setupInputRef}
                id="player-name-input"
                data-testid="setup-name-input"
                type="text"
                value={setupName}
                onChange={(e) => {
                  setSetupName(e.target.value);
                  if (setupNameError) setSetupNameError('');
                }}
                placeholder={
                  isEn
                    ? 'Enter your name of address (e.g., Aegon, Rhaenyra, Eddard...)'
                    : 'Hitap isminizi yazın (Örn: Aegon, Rhaenyra, Eddard, Alparslan...)'
                }
                maxLength={32}
                className="w-full px-3.5 py-2.5 rounded-lg bg-[#0d0b11] border border-[#b48e4b]/50 text-[#f5ebd6] text-sm focus:outline-none focus:border-[#d4af37]"
              />
              {setupNameError && <p className="text-xs text-[#f87171]">{setupNameError}</p>}
              <p className="text-[11px] text-[#9c8e78]">
                {isEn ? (
                  <>
                    Across all council decrees and dialogues you will be addressed as{' '}
                    <strong className="text-[#e8dcc4]">
                      "{EN_PLAYER_ROLES[setupRole].titlePrefix} {sanitizePlayerName(setupName) || '...'}"
                    </strong>
                    . (Your last used name is automatically remembered for future games.)
                  </>
                ) : (
                  <>
                    Hikâyede ve tüm karakter diyaloglarında{' '}
                    <strong className="text-[#e8dcc4]">
                      "{PLAYER_ROLES.find((r) => r.id === setupRole)?.titlePrefix}{' '}
                      {sanitizePlayerName(setupName) || '...'}"
                    </strong>{' '}
                    olarak anılacaksınız. (Bir önceki hitap isminiz sonraki oyunlar için otomatik hatırlanır.)
                  </>
                )}
              </p>
            </div>

            {/* Step 2: 3 Difficulty / Balance Modes (Easy, Normal [Default], Hard) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#d4af37]">
                {isEn
                  ? '2. SELECT DIFFICULTY & INDICATOR BALANCE MODE (DEFAULT: NORMAL)'
                  : '2. ZORLUK VE DEĞER DENGESİ MODU SEÇİN (VARSAYILAN: NORMAL MOD)'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(['easy', 'normal', 'hard'] as DifficultyId[]).map((dId) => {
                  const dMeta = isEn ? EN_DIFFICULTY_MODES[dId] : DIFFICULTY_MODES[dId];
                  const selected = setupDifficulty === dId;
                  return (
                    <button
                      key={dId}
                      type="button"
                      data-testid={`difficulty-select-${dId}`}
                      onClick={() => setSetupDifficulty(dId)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selected
                          ? 'bg-[#251e30] border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.25)]'
                          : 'bg-[#17141f] border-[#b48e4b]/25 hover:border-[#b48e4b]/50'
                      }`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-sm font-bold font-display text-[#f5ebd6]">
                            {dMeta.name}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${
                            dId === 'easy'
                              ? 'bg-[#064e3b]/60 text-[#6ee7b7]'
                              : dId === 'normal'
                              ? 'bg-[#78350f]/60 text-[#fde68a]'
                              : 'bg-[#7f1d1d]/60 text-[#fca5a5]'
                          }`}
                        >
                          {dMeta.shortRule}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#b8a990] mt-1.5 leading-snug">
                        {dMeta.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: 4 Target Decision Game Modes */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#d4af37]">
                {isEn
                  ? '3. SELECT CAMPAIGN LENGTH & TARGET DECISIONS'
                  : '3. SEFER UZUNLUĞU VE HEDEF KARAR SAYISI SEÇİN'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(Object.keys(GAME_MODES) as GameModeId[]).map((mId) => {
                  const m = GAME_MODES[mId];
                  const mLoc = isEn ? EN_GAME_MODES[mId] : m;
                  const selected = setupMode === mId;
                  return (
                    <button
                      key={mId}
                      type="button"
                      data-testid={`mode-select-${mId}`}
                      onClick={() => setSetupMode(mId)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selected
                          ? 'bg-[#251e30] border-[#d4af37] shadow-[0_0_15px_rgba(212,175,55,0.2)]'
                          : 'bg-[#17141f] border-[#b48e4b]/25 hover:border-[#b48e4b]/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold font-display text-[#f5ebd6]">
                          {mLoc.name}
                        </span>
                        <span className="font-mono-tabular text-xs font-bold text-[#d4af37]">
                          {m.targetDecisions.toLocaleString(isEn ? 'en-US' : 'tr-TR')}{' '}
                          {isEn ? 'Decisions' : 'Karar'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#b8a990] mt-1 leading-snug">
                        {mLoc.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Optional Role & Era Selection */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedSetup(!showAdvancedSetup)}
                className="text-xs font-semibold text-[#d4af37] hover:underline"
              >
                {showAdvancedSetup
                  ? isEn
                    ? '▼ Hide Optional Starting Role & Era Selection'
                    : '▼ İsteğe Bağlı Rol ve Başlangıç Dönemi Seçimini Gizle'
                  : isEn
                  ? '▶ Choose Optional Starting Role & Era (Default: Noble Bannerman / Reign of King Robert)'
                  : '▶ İsteğe Bağlı Başlangıç Rolü ve Dönemi Seç (Varsayılan: Soylu Lord / Robert Dönemi)'}
              </button>

              {showAdvancedSetup && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3.5 rounded-lg bg-[#17141f] border border-[#b48e4b]/25">
                  <div>
                    <label htmlFor="role-select" className="block text-xs font-semibold text-[#e8dcc4] mb-1">
                      {isEn ? 'Starting Role:' : 'Başlangıç Rolünüz:'}
                    </label>
                    <select
                      id="role-select"
                      value={setupRole}
                      onChange={(e) => setSetupRole(e.target.value as PlayerRoleId)}
                      className="w-full px-3 py-2 text-xs bg-[#0d0b11] border border-[#b48e4b]/40 rounded text-[#f5ebd6]"
                    >
                      {PLAYER_ROLES.map((r) => {
                        const rLoc = isEn ? EN_PLAYER_ROLES[r.id] : r;
                        return (
                          <option key={r.id} value={r.id}>
                            {rLoc.name} ({rLoc.titlePrefix})
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[11px] text-[#9c8e78] mt-1">
                      {isEn
                        ? EN_PLAYER_ROLES[setupRole].description
                        : PLAYER_ROLES.find((r) => r.id === setupRole)?.description}
                    </p>
                  </div>

                  <div>
                    <label htmlFor="era-select" className="block text-xs font-semibold text-[#e8dcc4] mb-1">
                      {isEn ? 'Starting Historical Era:' : 'Hikâye Başlangıç Dönemi:'}
                    </label>
                    <select
                      id="era-select"
                      value={setupEra}
                      onChange={(e) => setSetupEra(e.target.value as EraId)}
                      className="w-full px-3 py-2 text-xs bg-[#0d0b11] border border-[#b48e4b]/40 rounded text-[#f5ebd6]"
                    >
                      {ERAS.map((era) => {
                        const eLoc = isEn ? EN_ERAS[era.id] : era;
                        return (
                          <option key={era.id} value={era.id}>
                            {eLoc.name} ({eLoc.years})
                          </option>
                        );
                      })}
                    </select>
                    <p className="text-[11px] text-[#9c8e78] mt-1">
                      {isEn
                        ? EN_ERAS[setupEra].summary
                        : ERAS.find((e) => e.id === setupEra)?.summary}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Start Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="submit"
                data-testid="confirm-start-game-btn"
                className="w-full sm:w-auto px-8 py-3 rounded-lg bg-[#b48e4b] hover:bg-[#d4af37] text-[#0b0a0e] font-bold text-sm tracking-wide shadow-lg transition-all"
              >
                {isEn ? 'Begin the Struggle for the Throne →' : 'Taht Mücadelesini Başlat →'}
              </button>
            </div>
          </form>
        </main>
      )}

      {/* =====================================================================
          3. ACTIVE PLAYING HUD & CARD TABLE
         ===================================================================== */}
      {(screen === 'playing' || screen === 'paused' || screen === 'gameover') && runState && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between pb-3 pointer-events-none overflow-y-auto">
          {/* Top Zone: Compact Status Bar + 4 Indicators */}
          <div className="w-full">
            <div className="w-full max-w-4xl mx-auto px-3 pt-2.5 flex items-center justify-between gap-2 pointer-events-auto flex-wrap">
              {/* Left Run Identity & Progress */}
              <div className="flex items-center gap-2 text-xs text-[#e8dcc4] bg-[#131118]/95 border border-[#b48e4b]/35 px-3 py-1.5 rounded-lg flex-wrap">
                <span className="font-bold text-[#d4af37]">
                  {activeRoleMeta.titlePrefix} {runState.playerName}
                </span>
                <span aria-hidden="true">·</span>
                <span
                  data-testid="hud-difficulty-badge"
                  className="font-semibold text-[#fde68a]"
                >
                  {activeDifficultyMeta.name}
                </span>
                <span aria-hidden="true">·</span>
                <span>{activeModeMeta.name}</span>
                <span aria-hidden="true">·</span>
                <span data-testid="hud-decision-counter" className="font-mono-tabular font-bold text-[#f5ebd6]">
                  {isEn ? 'Decision' : 'Karar'}: {runState.turn} / {runState.targetDecisions}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular text-[#34d399]">
                  {formatProgressLocalized(runState.turn, runState.targetDecisions, language)}
                </span>
              </div>

              {/* Right Utility Controls including Undo (Last 10 Decisions) */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  data-testid="hud-undo-btn"
                  disabled={undoCount === 0}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleUndoDecision();
                  }}
                  title={
                    isEn
                      ? `Undo last decision (Up to ${MAX_UNDO_STEPS} steps remaining: ${undoCount}/${MAX_UNDO_STEPS})`
                      : `Son kararı geri al (Yalnızca son ${MAX_UNDO_STEPS} karar: ${undoCount}/${MAX_UNDO_STEPS})`
                  }
                  className={`px-2.5 py-1.5 rounded border text-xs font-mono-tabular font-bold transition-all whitespace-nowrap ${
                    undoCount > 0
                      ? 'bg-[#251e30] hover:bg-[#342944] border-[#d4af37] text-[#fde68a] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                      : 'bg-[#131118]/60 border-[#b48e4b]/20 text-[#6e6456] cursor-not-allowed'
                  }`}
                >
                  ↶ {isEn ? 'Undo' : 'Geri Al'} ({undoCount}/{MAX_UNDO_STEPS}) [Z]
                </button>

                <button
                  type="button"
                  data-testid="hud-characters-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setInspectCharId(null);
                    setActiveModal('characters');
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#131118]/95 hover:bg-[#221d2d] border border-[#b48e4b]/35 text-xs font-medium text-[#e8dcc4] whitespace-nowrap"
                >
                  {isEn ? 'Characters' : 'Karakterler'}
                </button>
                <button
                  type="button"
                  data-testid="hud-journal-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveModal('journal');
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#131118]/95 hover:bg-[#221d2d] border border-[#b48e4b]/35 text-xs font-medium text-[#e8dcc4] whitespace-nowrap"
                >
                  {isEn ? 'Journal' : 'Günlük'}
                </button>
                <button
                  type="button"
                  data-testid="hud-stats-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveModal('stats');
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#131118]/95 hover:bg-[#221d2d] border border-[#b48e4b]/35 text-xs font-medium text-[#e8dcc4] whitespace-nowrap"
                >
                  {isEn ? 'Stats' : 'İstatistik'}
                </button>
                <button
                  type="button"
                  data-testid="hud-settings-btn"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setActiveModal('settings');
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#131118]/95 hover:bg-[#221d2d] border border-[#b48e4b]/35 text-xs font-medium text-[#e8dcc4] whitespace-nowrap"
                >
                  {isEn ? 'Settings' : 'Ayarlar'}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isEn ? 'Mute or Unmute Audio' : 'Sesi Aç veya Kapat'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    handleToggleMute();
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#131118]/95 hover:bg-[#221d2d] border border-[#b48e4b]/35 text-xs font-mono-tabular text-[#e8dcc4]"
                >
                  {audioSettings.sfxEnabled || audioSettings.musicEnabled
                    ? isEn
                      ? 'Audio [M]'
                      : 'Ses [M]'
                    : isEn
                    ? 'Muted [M]'
                    : 'Sessiz [M]'}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-pause-btn"
                  aria-label={isEn ? 'Pause Game' : 'Oyunu Duraklat'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    soundEngine.playUiClick();
                    setScreen('paused');
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#131118]/95 hover:bg-[#221d2d] border border-[#b48e4b]/35 text-xs font-semibold text-[#d4af37]"
                >
                  {isEn ? 'Pause [P]' : 'Duraklat [P]'}
                </button>
              </div>
            </div>

            {/* 4 Core Indicators Bar with Live Impact Arrows */}
            <IndicatorsBar
              indicators={runState.indicators}
              lastDelta={runState.lastDelta}
              previewDelta={previewDelta}
              language={language}
            />
          </div>

          {/* Center Zone: Decision Card */}
          <div className="my-auto py-2">
            <DecisionCard
              card={runState.currentCard}
              playerName={runState.playerName}
              roleId={runState.roleId}
              language={language}
              runState={runState}
              characterState={runState.characters[runState.currentCard.characterId]}
              keyboardPreviewSide={keyboardPreviewSide}
              onClearKeyboardPreview={() => setKeyboardPreviewSide(null)}
              onChoose={handleCardChoice}
              onPreviewDelta={setPreviewDelta}
              onInspectCharacter={(cId) => {
                setInspectCharId(cId);
                setActiveModal('characters');
              }}
            />
          </div>

          {/* Bottom Safe Margin Info Strip */}
          <div className="w-full max-w-4xl mx-auto px-3 flex items-center justify-between text-[11px] text-[#9c8e78] pointer-events-auto">
            <span>
              {isEn ? 'Region:' : 'Bölge:'}{' '}
              <strong className="text-[#d4af37]">{activeRegionBase.name}</strong> ({activeRegionSubtitle})
            </span>
            <span className="font-mono-tabular">
              {isEn ? 'Active Playtime:' : 'Aktif Süre:'}{' '}
              {formatPlayTimeLocalized(runState.activePlayTimeSeconds, language)}
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. PAUSE MODAL (DURAKLATMA MENÜSÜ)
         ===================================================================== */}
      {screen === 'paused' && runState && (
        <div
          role="dialog"
          aria-label={isEn ? 'Game Paused' : 'Oyun Duraklatıldı'}
          className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4 pointer-events-auto"
        >
          <div className="w-full max-w-md bg-[#131118] border-2 border-[#b48e4b]/65 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-2xl font-bold font-display text-[#f5ebd6]">
              {isEn ? 'GAME PAUSED' : 'OYUN DURAKLATILDI'}
            </h2>
            <p className="text-xs text-[#b8a990] font-mono-tabular">
              {activeRoleMeta.titlePrefix} {runState.playerName} · {activeModeMeta.name} ·{' '}
              {isEn ? 'Decision:' : 'Karar:'} {runState.turn} / {runState.targetDecisions}
            </p>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                data-testid="resume-game-btn"
                onClick={() => setScreen('playing')}
                className="w-full py-3 rounded-lg bg-[#b48e4b] hover:bg-[#d4af37] text-[#0b0a0e] font-bold text-sm"
              >
                {isEn ? 'Resume Game [Esc]' : 'Oyuna Devam Et [Esc]'}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('saves')}
                className="w-full py-2.5 rounded-lg bg-[#1d1826] hover:bg-[#2a2236] text-[#e8dcc4] border border-[#b48e4b]/40 text-xs font-semibold"
              >
                {isEn ? 'Saved Games & JSON Backup' : 'Kayıtlı Oyunlar ve JSON Yedekleme'}
              </button>
              <button
                type="button"
                onClick={() => setActiveModal('settings')}
                className="w-full py-2.5 rounded-lg bg-[#1d1826] hover:bg-[#2a2236] text-[#e8dcc4] border border-[#b48e4b]/40 text-xs font-semibold"
              >
                {isEn ? 'Settings, Language & Rename Ruler' : 'Ayarlar, Dil ve Hitap İsmi Değiştir'}
              </button>
              <button
                type="button"
                onClick={() => setScreen('title')}
                className="w-full py-2.5 rounded-lg bg-[#271519] hover:bg-[#381c22] text-[#fca5a5] border border-[#ef4444]/40 text-xs font-semibold"
              >
                {isEn ? 'Return to Main Menu (Progress Saved)' : 'Ana Menüye Dön (İlerleme Kaydedildi)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. VICTORY / GAME OVER MODAL (OYUN SONU VE MOD YÜKSELTME EKRANI)
         ===================================================================== */}
      {screen === 'gameover' && runState && localizedEnding && (
        <div
          role="dialog"
          aria-label={localizedEnding.isVictory ? (isEn ? 'Victory Screen' : 'Zafer Ekranı') : isEn ? 'Game Over Screen' : 'Oyun Sonu Ekranı'}
          className="fixed inset-0 z-40 bg-black/88 flex items-center justify-center p-3 sm:p-6 pointer-events-auto overflow-y-auto"
        >
          <div className="w-full max-w-2xl bg-[#131118] border-2 border-[#d4af37] rounded-xl p-5 sm:p-7 space-y-4 shadow-2xl my-auto max-h-[92vh] overflow-y-auto">
            <div className="text-center border-b border-[#b48e4b]/30 pb-4">
              <div
                className={`text-xs font-bold tracking-widest mb-1 ${
                  localizedEnding.isVictory ? 'text-[#34d399]' : 'text-[#f87171]'
                }`}
              >
                {localizedEnding.isVictory
                  ? isEn
                    ? '★ VICTORY: MASTER OF THE THRONE ★'
                    : '★ ZAFER: TAHTIN HÂKİMİ ★'
                  : isEn
                  ? '✖ THE END OF YOUR REIGN ✖'
                  : '✖ İKTİDARIN SONU ✖'}
              </div>
              <h2
                data-testid="ending-title"
                className="text-2xl sm:text-3xl font-extrabold font-display text-[#f5ebd6]"
              >
                {localizedEnding.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#d4af37] mt-1">{localizedEnding.subtitle}</p>
            </div>

            {/* Ending Narrative */}
            <div className="p-4 rounded-lg bg-[#181420] border border-[#b48e4b]/35 space-y-2">
              <p className="text-sm sm:text-base text-[#f3e9d2] leading-relaxed">
                {localizedEnding.storyText}
              </p>
              <p className="text-xs text-[#fca5a5] pt-2 border-t border-[#b48e4b]/20">
                <strong>{isEn ? 'Cause of End:' : 'Sonuç Nedeni:'}</strong> {localizedEnding.causeOfEnd}
              </p>
            </div>

            {/* Run Metrics Tiles (tabular-nums) */}
            <div className="grid grid-cols-3 gap-2.5 text-center font-mono-tabular">
              <div className="p-2.5 rounded bg-[#16131d] border border-[#b48e4b]/25">
                <div className="text-[11px] text-[#9c8e78]">
                  {isEn ? 'TOTAL DECISIONS' : 'TOPLAM KARAR'}
                </div>
                <div className="text-lg font-bold text-[#f5ebd6]">
                  {runState.turn} / {runState.targetDecisions}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#16131d] border border-[#b48e4b]/25">
                <div className="text-[11px] text-[#9c8e78]">
                  {isEn ? 'GAME MODE' : 'OYUN MODU'}
                </div>
                <div className="text-sm sm:text-base font-bold text-[#d4af37]">
                  {activeModeMeta.name}
                </div>
              </div>
              <div className="p-2.5 rounded bg-[#16131d] border border-[#b48e4b]/25">
                <div className="text-[11px] text-[#9c8e78]">
                  {isEn ? 'PLAYTIME' : 'OYUN SÜRESİ'}
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#f5ebd6]">
                  {formatPlayTimeLocalized(runState.activePlayTimeSeconds, language)}
                </div>
              </div>
            </div>

            {/* Key Character Fates */}
            <div className="p-3.5 rounded bg-[#16131d] border border-[#b48e4b]/25 text-xs">
              <div className="font-bold text-[#d4af37] mb-2">
                {isEn ? 'Final Status of Notable Characters:' : 'Önemli Karakterlerin Son Durumu:'}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {localizedEnding.keyCharacterFates.map((cf) => (
                  <div key={cf.id} className="p-2 rounded bg-[#100e14] flex items-center justify-between">
                    <span className="font-medium text-[#f5ebd6] truncate">{cf.name}</span>
                    <span className="font-mono-tabular text-[#a89b84] ml-1">
                      {cf.status} ({cf.relation > 0 ? `+${cf.relation}` : cf.relation})
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode Upgrade CTA, Undo Last Decision, or Start New Game */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
              {localizedEnding.isVictory &&
                localizedEnding.canUpgradeMode &&
                localizedEnding.nextModeId && (
                  <button
                    type="button"
                    data-testid="upgrade-mode-btn"
                    onClick={handleUpgradeMode}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#06120e] font-extrabold text-sm shadow-lg transition-all"
                  >
                    {isEn ? 'Upgrade Mode & Continue:' : 'Üst Moda Yükselt ve Devam Et:'}{' '}
                    {isEn
                      ? EN_GAME_MODES[localizedEnding.nextModeId].name
                      : GAME_MODES[localizedEnding.nextModeId].name}{' '}
                    ({GAME_MODES[localizedEnding.nextModeId].targetDecisions}{' '}
                    {isEn ? 'Decisions' : 'Karar'}) →
                  </button>
                )}

              {undoCount > 0 && (
                <button
                  type="button"
                  data-testid="gameover-undo-btn"
                  onClick={handleUndoDecision}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-[#251e30] hover:bg-[#342944] border border-[#d4af37] text-[#fde68a] font-bold text-xs font-mono-tabular transition-all"
                >
                  ↶ {isEn ? 'Undo Fatal Decision' : 'Son Kararı Geri Al'} ({undoCount}/{MAX_UNDO_STEPS})
                </button>
              )}

              <button
                type="button"
                data-start="true"
                data-testid="gameover-play-again-btn"
                onClick={() => {
                  openSetupWithRememberedName();
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-lg bg-[#b48e4b] hover:bg-[#d4af37] text-[#0b0a0e] font-bold text-sm transition-all"
              >
                {isEn ? 'Start New Game' : 'Yeni Oyun Başlat'}
              </button>

              <button
                type="button"
                onClick={() => setScreen('title')}
                className="w-full sm:w-auto px-5 py-3 rounded-lg bg-[#231e2d] hover:bg-[#2f283c] text-[#e8dcc4] text-xs font-semibold border border-[#b48e4b]/40"
              >
                {isEn ? 'Main Menu' : 'Ana Menü'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. SECONDARY MODALS (CHARACTERS, SAVES, JOURNAL, STATS, SETTINGS)
         ===================================================================== */}
      {activeModal === 'characters' && (
        <CharactersModal
          runState={runState}
          initialSelectedCharId={inspectCharId}
          language={language}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'saves' && (
        <SavedGamesModal
          saves={saves}
          activeSaveId={runState?.saveId || null}
          language={language}
          onContinueSave={(selectedSave) => {
            setRunState(selectedSave);
            setActiveModal('none');
            setScreen(selectedSave.status === 'playing' ? 'playing' : 'gameover');
          }}
          onRenameSave={(saveId, newName) => {
            const target = saves.find((s) => s.saveId === saveId);
            if (!target) return;
            const updated = updatePlayerNameInRun(target, newName);
            saveLastPlayerName(updated.playerName);
            if (runState?.saveId === saveId) {
              setRunState(updated);
            }
            saveGameRun(updated).then(refreshSavesList);
          }}
          onDeleteSave={(saveId) => {
            deleteGameRun(saveId).then(() => {
              refreshSavesList();
              if (runState?.saveId === saveId) {
                setRunState(null);
                setScreen('title');
              }
            });
          }}
          onDeleteAllSaves={() => {
            deleteAllGameRuns().then(() => {
              setSaves([]);
              setRunState(null);
              setScreen('title');
            });
          }}
          onImportJson={async (jsonStr) => {
            const res = await importSavesFromJsonString(jsonStr);
            if (res.success) {
              await refreshSavesList();
              setGlobalStats(loadGlobalStats());
              setAudioSettings(loadAudioSettings());
            }
            return res;
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'journal' && (
        <JournalAndArchiveModal
          runState={runState}
          language={language}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'stats' && (
        <StatsAndAchievementsModal
          stats={globalStats}
          currentRun={runState}
          language={language}
          onClose={() => setActiveModal('none')}
        />
      )}

      {(activeModal === 'settings' || activeModal === 'about') && (
        <SettingsAndAboutModal
          initialTab={activeModal === 'about' ? 'about' : 'settings'}
          audioSettings={audioSettings}
          currentPlayerName={runState?.playerName || setupName}
          language={language}
          onUpdateLanguage={handleChangeLanguage}
          onUpdateAudio={(next) => {
            setAudioSettings(next);
            saveAudioSettings(next);
            soundEngine.updateSettings(next);
          }}
          onUpdatePlayerName={(newName) => {
            setSetupName(newName);
            saveLastPlayerName(newName);
            if (runState) {
              const updated = updatePlayerNameInRun(runState, newName);
              setRunState(updated);
              saveGameRun(updated).then(refreshSavesList);
            }
          }}
          onClose={() => setActiveModal('none')}
        />
      )}
    </div>
  );
}
export default App;
