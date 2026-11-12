import { CHARACTER_MAP } from '../data/characters';
import { evaluateUnlockedAchievements } from '../game/endingsAndAchievements';
import { sanitizePlayerName } from '../game/engine';
import {
  GameModeId,
  GameRunState,
  GlobalPlayerStatistics,
} from '../types/game';

const DB_NAME = 'got_tahtin_golgesinde_db';
const DB_VERSION = 1;
const STORE_SAVES = 'saves';
const LS_SAVES_BACKUP_KEY = 'got_tg_saves_backup_v1';
const LS_ACTIVE_SAVE_ID_KEY = 'got_tg_active_save_id_v1';
const LS_GLOBAL_STATS_KEY = 'got_tg_global_stats_v1';
const LS_AUDIO_SETTINGS_KEY = 'got_tg_audio_settings_v1';
const LS_LAST_PLAYER_NAME_KEY = 'got_tg_last_player_name_v1';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  volume: number; // 0 to 1
}

export function loadLastPlayerName(): string {
  try {
    return localStorage.getItem(LS_LAST_PLAYER_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function saveLastPlayerName(name: string): void {
  try {
    const cleaned = sanitizePlayerName(name);
    if (cleaned) {
      localStorage.setItem(LS_LAST_PLAYER_NAME_KEY, cleaned);
    }
  } catch {
    // ignore
  }
}

export function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(LS_AUDIO_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        musicEnabled: Boolean(parsed.musicEnabled ?? true),
        sfxEnabled: Boolean(parsed.sfxEnabled ?? true),
        volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : 0.65,
      };
    }
  } catch {
    // ignore
  }
  return { musicEnabled: true, sfxEnabled: true, volume: 0.65 };
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(LS_AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SAVES)) {
          db.createObjectStore(STORE_SAVES, { keyPath: 'saveId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readBackupMap(): Record<string, GameRunState> {
  try {
    const raw = localStorage.getItem(LS_SAVES_BACKUP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // ignore
  }
  return {};
}

function writeBackupMap(map: Record<string, GameRunState>): void {
  try {
    // Trim recentCardIds and undoStack in localStorage mirror while keeping full 10-step undoStack in IndexedDB
    const compactMap: Record<string, GameRunState> = {};
    for (const [k, v] of Object.entries(map)) {
      compactMap[k] = {
        ...v,
        recentCardIds: v.recentCardIds.slice(-600),
        undoStack: (v.undoStack || []).slice(-10),
      };
    }
    localStorage.setItem(LS_SAVES_BACKUP_KEY, JSON.stringify(compactMap));
  } catch {
    // ignore quota errors on fallback
  }
}

export async function saveGameRun(run: GameRunState): Promise<void> {
  // 1. Synchronous backup mirror so page refresh/close never loses the latest decision
  const map = readBackupMap();
  map[run.saveId] = run;
  writeBackupMap(map);
  setActiveSaveId(run.saveId);

  // 2. Primary IndexedDB atomic write
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVES, 'readwrite');
      const store = tx.objectStore(STORE_SAVES);
      store.put(run);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function loadAllGameRuns(): Promise<GameRunState[]> {
  const backupMap = readBackupMap();
  const db = await openDatabase();
  if (!db) {
    return Object.values(backupMap).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVES, 'readonly');
      const store = tx.objectStore(STORE_SAVES);
      const req = store.getAll();
      req.onsuccess = () => {
        db.close();
        const dbList: GameRunState[] = Array.isArray(req.result) ? req.result : [];
        const merged: Record<string, GameRunState> = { ...backupMap };
        for (const item of dbList) {
          if (item && item.saveId) {
            const existing = merged[item.saveId];
            if (!existing || item.updatedAt >= existing.updatedAt) {
              merged[item.saveId] = item;
            }
          }
        }
        resolve(Object.values(merged).sort((a, b) => b.updatedAt - a.updatedAt));
      };
      req.onerror = () => {
        db.close();
        resolve(Object.values(backupMap).sort((a, b) => b.updatedAt - a.updatedAt));
      };
    } catch {
      db.close();
      resolve(Object.values(backupMap).sort((a, b) => b.updatedAt - a.updatedAt));
    }
  });
}

export async function deleteGameRun(saveId: string): Promise<void> {
  const map = readBackupMap();
  delete map[saveId];
  writeBackupMap(map);

  if (getActiveSaveId() === saveId) {
    localStorage.removeItem(LS_ACTIVE_SAVE_ID_KEY);
  }

  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVES, 'readwrite');
      tx.objectStore(STORE_SAVES).delete(saveId);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function deleteAllGameRuns(): Promise<void> {
  writeBackupMap({});
  try {
    localStorage.removeItem(LS_ACTIVE_SAVE_ID_KEY);
  } catch {
    // ignore
  }

  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SAVES, 'readwrite');
      tx.objectStore(STORE_SAVES).clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export function getActiveSaveId(): string | null {
  try {
    return localStorage.getItem(LS_ACTIVE_SAVE_ID_KEY);
  } catch {
    return null;
  }
}

export function setActiveSaveId(saveId: string): void {
  try {
    localStorage.setItem(LS_ACTIVE_SAVE_ID_KEY, saveId);
  } catch {
    // ignore
  }
}

export function createDefaultGlobalStats(): GlobalPlayerStatistics {
  return {
    totalGamesStarted: 0,
    completedGames: 0,
    lostGames: 0,
    wonGames: 0,
    totalDecisionsMade: 0,
    longestSurvivalStreak: 0,
    longestGameTimeSeconds: 0,
    choiceArchetypeTotals: {},
    characterBestRelations: {},
    highestIndicatorsReached: { people: 50, military: 50, treasury: 50, nobles: 50 },
    categoryEncounterCounts: {},
    modeWins: { quick: 0, normal: 0, long: 0, competitive: 0 },
    unlockedAchievementIds: [],
  };
}

export function loadGlobalStats(): GlobalPlayerStatistics {
  try {
    const raw = localStorage.getItem(LS_GLOBAL_STATS_KEY);
    if (!raw) return createDefaultGlobalStats();
    const parsed = JSON.parse(raw);
    return { ...createDefaultGlobalStats(), ...parsed };
  } catch {
    return createDefaultGlobalStats();
  }
}

export function saveGlobalStats(stats: GlobalPlayerStatistics): void {
  try {
    localStorage.setItem(LS_GLOBAL_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

export function recordDecisionInGlobalStats(
  run: GameRunState,
  isNewGameStart = false,
  didJustFinish = false
): GlobalPlayerStatistics {
  const stats = loadGlobalStats();

  if (isNewGameStart) {
    stats.totalGamesStarted += 1;
  } else {
    stats.totalDecisionsMade += 1;
  }

  stats.longestSurvivalStreak = Math.max(stats.longestSurvivalStreak, run.turn);
  stats.longestGameTimeSeconds = Math.max(stats.longestGameTimeSeconds, run.activePlayTimeSeconds);

  stats.highestIndicatorsReached = {
    people: Math.max(stats.highestIndicatorsReached.people, run.peakIndicators.people),
    military: Math.max(stats.highestIndicatorsReached.military, run.peakIndicators.military),
    treasury: Math.max(stats.highestIndicatorsReached.treasury, run.peakIndicators.treasury),
    nobles: Math.max(stats.highestIndicatorsReached.nobles, run.peakIndicators.nobles),
  };

  for (const [arch, count] of Object.entries(run.choiceArchetypeCounts)) {
    stats.choiceArchetypeTotals[arch] = Math.max(stats.choiceArchetypeTotals[arch] || 0, count);
  }

  for (const [cat, count] of Object.entries(run.categoryCounts)) {
    stats.categoryEncounterCounts[cat] = Math.max(stats.categoryEncounterCounts[cat] || 0, count);
  }

  for (const charState of Object.values(run.characters)) {
    const charDef = CHARACTER_MAP[charState.id];
    if (!charDef) continue;
    const prev = stats.characterBestRelations[charState.id] || {
      name: charDef.name,
      maxRelation: charState.relation,
      minRelation: charState.relation,
    };
    stats.characterBestRelations[charState.id] = {
      name: charDef.name,
      maxRelation: Math.max(prev.maxRelation, charState.relation),
      minRelation: Math.min(prev.minRelation, charState.relation),
    };
  }

  if (didJustFinish) {
    stats.completedGames += 1;
    if (run.status === 'victory') {
      stats.wonGames += 1;
      stats.modeWins[run.modeId] = (stats.modeWins[run.modeId] || 0) + 1;
    } else if (run.status === 'defeat') {
      stats.lostGames += 1;
    }
  }

  stats.unlockedAchievementIds = evaluateUnlockedAchievements(run, stats.unlockedAchievementIds);
  saveGlobalStats(stats);
  return stats;
}

/**
 * Formats active play time in Turkish: "X gün Y saat Z dakika" (Section 12 & 13).
 */
export function formatPlayTimeTurkish(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(sec / 86400);
  const hours = Math.floor((sec % 86400) / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;

  if (days > 0) {
    return `${days} gün ${hours} saat ${minutes} dakika`;
  }
  if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  }
  if (minutes > 0) {
    return `${minutes} dakika ${seconds} saniye`;
  }
  return `${seconds} saniye`;
}

/**
 * Formats progress percentage in Turkish locale format e.g. "%70,58" (Section 12).
 */
export function formatProgressPercentage(turn: number, target: number): string {
  if (target <= 0) return '%0,00';
  const pct = Math.min(100, Math.max(0, (turn / target) * 100));
  return `%${pct.toFixed(2).replace('.', ',')}`;
}

/**
 * Exports a single saved game run to a portable JSON string.
 */
export function exportSingleSaveToJsonString(save: GameRunState): string {
  return JSON.stringify(
    {
      backupType: 'single_save',
      appVersion: 1,
      exportedAt: Date.now(),
      save,
    },
    null,
    2
  );
}

/**
 * Exports all application data (all saves, global stats, audio settings, last player name) to a JSON string.
 */
export function exportAllAppDataToJsonString(saves: GameRunState[]): string {
  return JSON.stringify(
    {
      backupType: 'full_app_data',
      appVersion: 1,
      exportedAt: Date.now(),
      saves,
      globalStats: loadGlobalStats(),
      audioSettings: loadAudioSettings(),
      lastPlayerName: loadLastPlayerName(),
    },
    null,
    2
  );
}

/**
 * Safely validates and imports JSON backups (supports single save, save array, or full app data bundle).
 */
export async function importSavesFromJsonString(
  jsonText: string
): Promise<{ success: boolean; importedCount: number; restoredAppData?: boolean; error?: string }> {
  if (!jsonText || jsonText.length > 15 * 1024 * 1024) {
    return { success: false, importedCount: 0, error: 'Dosya boyutu geçersiz veya çok büyük (Maksimum 15MB).' };
  }

  try {
    const parsed = JSON.parse(jsonText);
    let restoredAppData = false;

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.globalStats && typeof parsed.globalStats === 'object') {
        saveGlobalStats({ ...createDefaultGlobalStats(), ...parsed.globalStats });
        restoredAppData = true;
      }
      if (parsed.audioSettings && typeof parsed.audioSettings === 'object') {
        saveAudioSettings({
          musicEnabled: Boolean(parsed.audioSettings.musicEnabled ?? true),
          sfxEnabled: Boolean(parsed.audioSettings.sfxEnabled ?? true),
          volume:
            typeof parsed.audioSettings.volume === 'number'
              ? Math.max(0, Math.min(1, parsed.audioSettings.volume))
              : 0.65,
        });
        restoredAppData = true;
      }
      if (typeof parsed.lastPlayerName === 'string' && parsed.lastPlayerName.trim()) {
        saveLastPlayerName(parsed.lastPlayerName);
      }
    }

    const candidates: GameRunState[] = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.saves)
      ? parsed.saves
      : parsed && parsed.save && parsed.save.saveId
      ? [parsed.save]
      : parsed && parsed.saveId
      ? [parsed]
      : [];

    if (candidates.length === 0 && !restoredAppData) {
      return { success: false, importedCount: 0, error: 'Geçerli bir oyun kaydı veya uygulama yedeği yapısı bulunamadı.' };
    }

    let importedCount = 0;
    for (const item of candidates) {
      if (
        !item ||
        typeof item.saveId !== 'string' ||
        typeof item.turn !== 'number' ||
        !item.indicators ||
        typeof item.indicators.people !== 'number' ||
        !item.currentCard
      ) {
        continue;
      }

      const validModes: GameModeId[] = ['quick', 'normal', 'long', 'competitive'];
      const modeId: GameModeId = validModes.includes(item.modeId) ? item.modeId : 'normal';
      const difficultyId =
        item.difficultyId === 'easy' || item.difficultyId === 'normal' || item.difficultyId === 'hard'
          ? item.difficultyId
          : 'normal';

      const sanitizedRun: GameRunState = {
        ...item,
        playerName: sanitizePlayerName(item.playerName || 'Aegon') || 'Aegon',
        modeId,
        difficultyId,
        updatedAt: Date.now(),
      };

      await saveGameRun(sanitizedRun);
      importedCount++;
    }

    if (importedCount === 0 && !restoredAppData) {
      return { success: false, importedCount: 0, error: 'Kayıt şeması doğrulamadan geçemedi.' };
    }

    return { success: true, importedCount, restoredAppData };
  } catch {
    return { success: false, importedCount: 0, error: 'JSON dosyası okunamadı. Dosya bozuk olabilir.' };
  }
}

