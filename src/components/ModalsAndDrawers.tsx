import React, { useMemo, useRef, useState } from 'react';
import {
  CARD_CATEGORIES,
  DIFFICULTY_MODES,
  GAME_MODES,
  PLAYER_ROLES,
  REGIONS,
} from '../data/categoriesAndEras';
import { CHARACTER_MAP, CHARACTERS } from '../data/characters';
import { ACHIEVEMENTS } from '../game/endingsAndAchievements';
import { interpolateText, sanitizeCampaignName, sanitizePlayerName } from '../game/engine';
import {
  getScenarioPoolManifest,
  materializeContextualCard,
  validateCardSchema,
} from '../game/scenarioPoolEngine';
import {
  EN_ACHIEVEMENTS,
  EN_CARD_CATEGORIES,
  EN_DIFFICULTY_MODES,
  EN_GAME_MODES,
  EN_PLAYER_ROLES,
  formatPlayTimeLocalized,
  formatProgressLocalized,
  getCharacterLocalized,
  getRelationshipTierLocalized,
  localizeCard,
} from '../i18n/localization';
import {
  CharacterMood,
  GameLanguage,
  GameRunState,
  GlobalPlayerStatistics,
} from '../types/game';
import {
  AudioSettings,
  exportAllAppDataToJsonString,
  exportSingleSaveToJsonString,
} from '../utils/storage';
import { CharacterPortrait } from './CharacterPortrait';

const MOOD_LABELS: Array<{ id: CharacterMood; labelTr: string; labelEn: string }> = [
  { id: 'normal', labelTr: 'Normal', labelEn: 'Normal' },
  { id: 'happy', labelTr: 'Mutlu', labelEn: 'Happy' },
  { id: 'angry', labelTr: 'Öfkeli', labelEn: 'Angry' },
  { id: 'suspicious', labelTr: 'Şüpheli', labelEn: 'Suspicious' },
  { id: 'sad', labelTr: 'Üzgün', labelEn: 'Sad' },
  { id: 'afraid', labelTr: 'Korkmuş', labelEn: 'Afraid' },
  { id: 'threatening', labelTr: 'Tehditkâr', labelEn: 'Threatening' },
];

const STATUS_LABELS: Record<string, { textTr: string; textEn: string; color: string }> = {
  alive: { textTr: 'Hayatta', textEn: 'Alive', color: '#34d399' },
  dead: { textTr: 'Öldü', textEn: 'Dead', color: '#f87171' },
  captured: { textTr: 'Esir', textEn: 'Captured', color: '#fbbf24' },
  exiled: { textTr: 'Sürgünde', textEn: 'Exiled', color: '#a855f7' },
  missing: { textTr: 'Kayıp', textEn: 'Missing', color: '#94a3b8' },
};

// ============================================================================
// 1. CHARACTERS & RELATIONSHIPS MODAL
// ============================================================================
interface CharactersModalProps {
  runState: GameRunState | null;
  initialSelectedCharId?: string | null;
  language?: GameLanguage;
  onClose: () => void;
}

export const CharactersModal: React.FC<CharactersModalProps> = ({
  runState,
  initialSelectedCharId,
  language = 'tr',
  onClose,
}) => {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'allies' | 'enemies' | 'romance'>('all');
  const [selectedCharId, setSelectedCharId] = useState<string>(
    initialSelectedCharId || CHARACTERS[0].id
  );
  const [previewMood, setPreviewMood] = useState<CharacterMood>('normal');

  const isEn = language === 'en';
  const playerName = runState?.playerName || (isEn ? 'Ruler' : 'Hükümdar');
  const roleId = runState?.roleId || 'noble_bannerman';

  const filteredCharacters = useMemo(() => {
    return CHARACTERS.filter((c) => {
      const loc = getCharacterLocalized(c.id, language);
      const runtime = runState?.characters[c.id];
      const rel = runtime?.relation ?? c.initialRelation;
      if (filterMode === 'allies' && rel < 21) return false;
      if (filterMode === 'enemies' && rel > -21) return false;
      if (filterMode === 'romance' && !c.romanceEligible) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          loc.name.toLowerCase().includes(q) ||
          loc.house.toLowerCase().includes(q) ||
          loc.title.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [search, filterMode, runState, language]);

  const activeDef = getCharacterLocalized(selectedCharId, language);
  const activeRuntime = runState?.characters[activeDef.id];
  const activeRel = activeRuntime?.relation ?? activeDef.initialRelation;
  const activeStatus = activeRuntime?.status ?? activeDef.initialStatus;
  const activeRegion = REGIONS[activeRuntime?.region ?? activeDef.defaultRegion];
  const activeTier = getRelationshipTierLocalized(activeRel, language);

  const dynamicGreeting = useMemo(() => {
    let raw = activeDef.greetings.neutral;
    if (activeRuntime?.isRomanced && activeDef.greetings.romance) {
      raw = activeDef.greetings.romance;
    } else if (activeRel <= -21) {
      raw = activeDef.greetings.enemy;
    } else if (activeRel >= 21) {
      raw = activeDef.greetings.friend;
    }
    return interpolateText(raw, playerName, roleId, language);
  }, [activeDef, activeRuntime, activeRel, playerName, roleId, language]);

  return (
    <div
      role="dialog"
      aria-label={isEn ? 'Characters & Relationships' : 'Karakterler ve İlişkiler'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-5xl h-[86vh] bg-[#131118] border-2 border-[#b48e4b]/60 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#b48e4b]/30 bg-[#181520]">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-[#f5ebd6]">
              {isEn
                ? `Westeros & Essos Character Relations (${CHARACTERS.length} Characters)`
                : `Westeros & Essos Karakter İlişkileri (${CHARACTERS.length} Karakter)`}
            </h2>
            <p className="text-xs text-[#a89b84]">
              {isEn
                ? 'Relationship scores (-100 / +100), dynastic ties, secret intel, and behavior models'
                : 'İlişki puanları (-100 / +100), hanedan bağları, gizli istihbarat ve karakter davranış modelleri'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#272230] hover:bg-[#352e42] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40"
          >
            {isEn ? 'Close [Esc]' : 'Kapat [Esc]'}
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0">
          {/* Left Directory List */}
          <div className="md:col-span-5 border-r border-[#b48e4b]/25 flex flex-col min-h-0 bg-[#100e14]">
            <div className="p-3 border-b border-[#b48e4b]/20 space-y-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  isEn
                    ? 'Search character, house, or title...'
                    : 'Karakter, hanedan veya unvan ara...'
                }
                aria-label={isEn ? 'Search character' : 'Karakter ara'}
                className="w-full px-3 py-1.5 text-xs bg-[#181520] border border-[#b48e4b]/35 rounded text-[#f5ebd6] placeholder-[#7c705e] focus:outline-none focus:border-[#d4af37]"
              />
              <div className="flex items-center gap-1 flex-wrap">
                {(['all', 'allies', 'enemies', 'romance'] as const).map((f) => {
                  const labels = isEn
                    ? {
                        all: 'All',
                        allies: 'Allies (+21)',
                        enemies: 'Enemies (-21)',
                        romance: 'Romance',
                      }
                    : {
                        all: 'Tümü',
                        allies: 'Dostlar (+21)',
                        enemies: 'Düşmanlar (-21)',
                        romance: 'Romantik Adaylar',
                      };
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilterMode(f)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
                        filterMode === f
                          ? 'bg-[#b48e4b] text-[#0b0a0e] font-bold'
                          : 'bg-[#181520] text-[#b8a990] hover:text-[#f5ebd6]'
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#b48e4b]/15">
              {filteredCharacters.map((c) => {
                const rt = runState?.characters[c.id];
                const rel = rt?.relation ?? c.initialRelation;
                const status = rt?.status ?? c.initialStatus;
                const tier = getRelationshipTierLocalized(rel, language);
                const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.alive;
                const isSelected = c.id === activeDef.id;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCharId(c.id);
                      setPreviewMood('normal');
                    }}
                    className={`w-full text-left p-2.5 flex items-center gap-3 transition-colors ${
                      isSelected ? 'bg-[#231d2e]' : 'hover:bg-[#181520]'
                    }`}
                  >
                    <CharacterPortrait characterId={c.id} mood="normal" size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-semibold text-[#f5ebd6] truncate">
                          {c.name}
                        </span>
                        <span
                          className="font-mono-tabular text-xs font-bold shrink-0"
                          style={{ color: tier.color }}
                        >
                          {rel > 0 ? `+${rel}` : rel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#9c8e78] truncate">
                        <span style={{ color: statusInfo.color }}>
                          {isEn ? statusInfo.textEn : statusInfo.textTr}
                        </span>
                        <span>·</span>
                        <span>{tier.label}</span>
                        <span>·</span>
                        <span className="truncate">{c.house}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Detailed Profile */}
          <div className="md:col-span-7 p-4 sm:p-5 overflow-y-auto space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-[#b48e4b]/25">
              <CharacterPortrait characterId={activeDef.id} mood={previewMood} size="xl" />
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold font-display text-[#f5ebd6]">
                  {activeDef.name}
                </h3>
                <p className="text-xs text-[#d4af37] font-medium mt-0.5">
                  {activeDef.title} · {activeDef.house}
                </p>
                <div className="flex items-center gap-2 text-xs text-[#b8a990] mt-1.5 flex-wrap">
                  <span>
                    {isEn ? 'Region:' : 'Bölge:'} {activeRegion.name}
                  </span>
                  <span>·</span>
                  <span style={{ color: STATUS_LABELS[activeStatus]?.color }}>
                    {isEn ? 'Status:' : 'Durum:'}{' '}
                    {isEn
                      ? STATUS_LABELS[activeStatus]?.textEn
                      : STATUS_LABELS[activeStatus]?.textTr}
                  </span>
                  <span>·</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: activeTier.color }}>
                    {isEn ? 'Relation:' : 'İlişki:'} {activeTier.label} (
                    {activeRel > 0 ? `+${activeRel}` : activeRel} / 100)
                  </span>
                  {activeRuntime?.isRomanced && (
                    <>
                      <span>·</span>
                      <span className="text-[#f43f5e] font-semibold">
                        {isEn ? 'Romance Active' : 'Romantik Bağ Aktif'}
                      </span>
                    </>
                  )}
                </div>

                {/* Mood Expression Switcher */}
                <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                  <span className="text-[11px] text-[#8c7e6a] mr-1">
                    {isEn ? 'Mood:' : 'İfade:'}
                  </span>
                  {MOOD_LABELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPreviewMood(m.id)}
                      className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                        previewMood === m.id
                          ? 'bg-[#d4af37] text-[#0b0a0e] font-bold'
                          : 'bg-[#1c1824] text-[#b8a990] hover:text-[#f5ebd6]'
                      }`}
                    >
                      {isEn ? m.labelEn : m.labelTr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dynamic Greeting Box */}
            <div className="p-3.5 rounded-lg bg-[#191522] border border-[#b48e4b]/35">
              <div className="text-[11px] text-[#d4af37] font-semibold mb-1">
                {isEn
                  ? `How They Address You (${activeTier.label}):`
                  : `Sana Hitabı (${activeTier.label}):`}
              </div>
              <p className="text-sm italic text-[#f3e9d2]">"{dynamicGreeting}"</p>
            </div>

            {/* Character Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded bg-[#16131d] border border-[#b48e4b]/20">
                <div className="text-[#d4af37] font-semibold mb-1">
                  {isEn ? 'Personality & Motivation' : 'Kişilik ve Motivasyon'}
                </div>
                <p className="text-[#cfc2ac] mb-1">
                  <strong>{isEn ? 'Traits:' : 'Özellikler:'}</strong>{' '}
                  {activeDef.personality.join(' · ')}
                </p>
                <p className="text-[#cfc2ac]">{activeDef.motivation}</p>
              </div>

              <div className="p-3 rounded bg-[#16131d] border border-[#b48e4b]/20">
                <div className="text-[#d4af37] font-semibold mb-1">
                  {isEn ? 'Fears & Ideals' : 'Korkuları ve İdealleri'}
                </div>
                <p className="text-[#cfc2ac] mb-1">
                  <strong>{isEn ? 'Fears:' : 'Korkusu:'}</strong> {activeDef.fears}
                </p>
                <p className="text-[#cfc2ac]">
                  <strong>{isEn ? 'Ideals:' : 'İdeali:'}</strong> {activeDef.ideals}
                </p>
              </div>

              <div className="p-3 rounded bg-[#16131d] border border-[#b48e4b]/20">
                <div className="text-[#d4af37] font-semibold mb-1">
                  {isEn ? 'Political Goal & Behavior Model' : 'Siyasi Hedef & Davranış Modeli'}
                </div>
                <p className="text-[#cfc2ac] mb-1">{activeDef.politicalGoal}</p>
                <p className="text-[#a89b84]">{activeDef.behaviorModel}</p>
              </div>

              <div className="p-3 rounded bg-[#16131d] border border-[#b48e4b]/20">
                <div className="text-[#d4af37] font-semibold mb-1">
                  {isEn ? 'Secret Intel & Romance' : 'Gizli İstihbarat & Romantizm'}
                </div>
                <p className="text-[#cfc2ac] mb-1">{activeDef.secretIntel}</p>
                <p className="text-[#a89b84]">
                  <strong>{isEn ? 'Romance:' : 'Romantik Durum:'}</strong>{' '}
                  {activeDef.romancePreferenceNote}
                </p>
              </div>
            </div>

            {/* Inter-Character Ties */}
            <div className="p-3 rounded bg-[#16131d] border border-[#b48e4b]/20">
              <div className="text-xs text-[#d4af37] font-semibold mb-2">
                {isEn
                  ? 'Ties with Other Characters & Last Interaction'
                  : 'Diğer Karakterlerle Bağları ve Son Etkileşim'}
              </div>
              <div className="space-y-1.5 text-xs text-[#cfc2ac]">
                {activeDef.interRelations.map((ir, idx) => {
                  const target = CHARACTER_MAP[ir.targetId];
                  return (
                    <div key={idx} className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#f5ebd6]">
                        {target?.name || ir.targetId}
                      </span>
                      <span className="text-[#a89b84] text-right">
                        {isEn ? `(${ir.type.toUpperCase()})` : ir.description}
                      </span>
                    </div>
                  );
                })}
              </div>
              {activeRuntime && (
                <p className="text-[11px] text-[#9c8e78] mt-3 pt-2 border-t border-[#b48e4b]/15">
                  <strong>
                    {isEn
                      ? `Last Interaction (Decision #${activeRuntime.lastInteractionTurn}):`
                      : `Son Etkileşim (${activeRuntime.lastInteractionTurn}. Karar):`}
                  </strong>{' '}
                  {activeRuntime.lastInteractionSummary}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. SAVED GAMES MODAL (KAYITLI OYUNLARIM, TEKİL/TOPLU YEDEKLEME & UYGULAMA İÇİ SİLME ONAYI)
// ============================================================================
interface SavedGamesModalProps {
  saves: GameRunState[];
  activeSaveId: string | null;
  language?: GameLanguage;
  onContinueSave: (save: GameRunState) => void;
  onRenameSave: (saveId: string, newName: string, newCampaignName?: string) => void;
  onDeleteSave: (saveId: string) => void;
  onDeleteAllSaves: () => void;
  onImportJson: (
    jsonString: string
  ) => Promise<{ success: boolean; importedCount: number; restoredAppData?: boolean; error?: string }>;
  onClose: () => void;
}

export const SavedGamesModal: React.FC<SavedGamesModalProps> = ({
  saves,
  activeSaveId,
  language = 'tr',
  onContinueSave,
  onRenameSave,
  onDeleteSave,
  onDeleteAllSaves,
  onImportJson,
  onClose,
}) => {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameCampaignValue, setRenameCampaignValue] = useState('');
  const [confirmDeleteSaveTarget, setConfirmDeleteSaveTarget] = useState<GameRunState | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState<boolean>(false);
  const [detailsSave, setDetailsSave] = useState<GameRunState | null>(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isEn = language === 'en';

  const triggerJsonDownload = (jsonStr: string, filename: string) => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAllAppData = () => {
    const dataStr = exportAllAppDataToJsonString(saves);
    const datePart = new Date().toISOString().slice(0, 10);
    triggerJsonDownload(dataStr, `tahtin_golgesinde_tum_uygulama_verisi_${datePart}.json`);
    setImportFeedback(
      isEn
        ? `Full application backup (${saves.length} saves + statistics + settings) downloaded.`
        : `Tüm uygulama verisi (${saves.length} kayıtlı oyun + istatistikler + ayarlar) toplu olarak indirildi.`
    );
  };

  const handleExportSingleSave = (save: GameRunState) => {
    const dataStr = exportSingleSaveToJsonString(save);
    const safeSlug = (save.playerName || 'oyuncu')
      .toLowerCase()
      .replace(/[^a-z0-9ğüşıöç]/gi, '_')
      .slice(0, 20);
    const datePart = new Date().toISOString().slice(0, 10);
    triggerJsonDownload(
      dataStr,
      `tahtin_golgesinde_kayit_${safeSlug}_karar_${save.turn}_${datePart}.json`
    );
    setImportFeedback(
      isEn
        ? `Save for "${save.playerName}" (Decision ${save.turn}/${save.targetDecisions}) exported individually.`
        : `"${save.playerName}" (${save.turn}/${save.targetDecisions} Karar) oyunu özel yedek olarak indirildi.`
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await onImportJson(text);
    if (res.success) {
      setImportFeedback(
        isEn
          ? `${res.importedCount} game save(s) ${res.restoredAppData ? 'and app statistics/settings ' : ''}imported successfully.`
          : `${res.importedCount} oyun kaydı ${res.restoredAppData ? 've uygulama verileri ' : ''}başarıyla içe aktarıldı.`
      );
    } else {
      setImportFeedback(isEn ? `Error: ${res.error}` : `Hata: ${res.error}`);
    }
    e.target.value = '';
  };

  return (
    <div
      role="dialog"
      aria-label={isEn ? 'My Saved Games & Backups' : 'Kayıtlı Oyunlarım ve Yedekleme'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-4xl max-h-[88vh] bg-[#131118] border-2 border-[#b48e4b]/60 rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#b48e4b]/30 bg-[#181520] flex-wrap gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-[#f5ebd6]">
              {isEn ? `My Saved Games (${saves.length})` : `Kayıtlı Oyunlarım (${saves.length})`}
            </h2>
            <p className="text-xs text-[#a89b84]">
              {isEn
                ? 'Export any game individually, backup all app data at once, or manage your saves'
                : 'Her bir oyunu ayrı yedekleyebilir, tüm uygulama verisini toplu indirebilir veya kayıtları yönetebilirsiniz'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              data-testid="export-all-data-btn"
              onClick={handleExportAllAppData}
              className="px-3 py-1.5 rounded bg-[#1d283a] hover:bg-[#27374f] text-xs font-semibold text-[#93c5fd] border border-[#3b82f6]/45"
            >
              ⬇ {isEn ? 'Backup All App Data (JSON)' : 'Tüm Uygulama Verisini Toplu İndir'}
            </button>
            <button
              type="button"
              data-testid="import-json-btn"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded bg-[#1f2937] hover:bg-[#374151] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/35"
            >
              ⬆ {isEn ? 'Import Save / Backup (JSON)' : 'Yedek İçe Aktar (Tekil / Toplu JSON)'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              data-testid="delete-all-saves-btn"
              disabled={saves.length === 0}
              onClick={() => setConfirmDeleteAll(true)}
              className="px-3 py-1.5 rounded bg-[#2a1216] hover:bg-[#3f181f] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-[#fca5a5] border border-[#ef4444]/45"
            >
              {isEn ? 'Delete All Saves' : 'Tüm Kayıtları Sil'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-[#272230] hover:bg-[#352e42] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40"
            >
              {isEn ? 'Close' : 'Kapat'}
            </button>
          </div>
        </div>

        {importFeedback && (
          <div
            data-testid="saves-feedback-banner"
            className="px-5 py-2 bg-[#1c241e] border-b border-[#10b981]/40 text-xs text-[#34d399] flex items-center justify-between"
          >
            <span>{importFeedback}</span>
            <button
              type="button"
              onClick={() => setImportFeedback(null)}
              className="text-[11px] text-[#a7f3d0] underline ml-3"
            >
              {isEn ? 'Dismiss' : 'Gizle'}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {saves.length === 0 ? (
            <div className="text-center py-12 text-sm text-[#9c8e78]">
              {isEn
                ? 'No saved games found. Start a new game and every decision will be saved here automatically.'
                : 'Henüz kayıtlı bir oyun bulunmuyor. Yeni bir oyun başlattığında her karar otomatik olarak buraya kaydedilir.'}
            </div>
          ) : (
            saves.map((save) => {
              const modeMeta = GAME_MODES[save.modeId] || GAME_MODES.normal;
              const modeName = isEn ? EN_GAME_MODES[save.modeId]?.name || modeMeta.name : modeMeta.name;
              const diffId = save.difficultyId || 'normal';
              const diffName = isEn
                ? EN_DIFFICULTY_MODES[diffId]?.name || 'Normal Mode'
                : DIFFICULTY_MODES[diffId]?.name || 'Normal Mod';
              const roleMeta = PLAYER_ROLES.find((r) => r.id === save.roleId) || PLAYER_ROLES[0];
              const titlePrefix = isEn
                ? EN_PLAYER_ROLES[save.roleId]?.titlePrefix || roleMeta.titlePrefix
                : roleMeta.titlePrefix;
              const progressStr = formatProgressLocalized(save.turn, save.targetDecisions, language);
              const playTimeStr = formatPlayTimeLocalized(save.activePlayTimeSeconds, language);
              const dateStr = new Date(save.updatedAt).toLocaleDateString(
                isEn ? 'en-US' : 'tr-TR',
                {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              const topFriends = Object.values(save.characters || {})
                .sort((a, b) => b.relation - a.relation)
                .slice(0, 3)
                .map(
                  (c) =>
                    `${CHARACTER_MAP[c.id]?.name || c.id} (${
                      c.relation > 0 ? `+${c.relation}` : c.relation
                    })`
                );

              const statusText =
                save.status === 'victory'
                  ? isEn
                    ? 'Victory (Completed)'
                    : 'Zafer (Tamamlandı)'
                  : save.status === 'defeat'
                  ? isEn
                    ? 'Defeat (Ended)'
                    : 'Yenilgi (Sona Erdi)'
                  : isEn
                  ? 'In Progress'
                  : 'Devam Ediyor';

              return (
                <div
                  key={save.saveId}
                  data-testid={`save-slot-${save.saveId}`}
                  className={`p-4 rounded-lg border transition-colors ${
                    save.saveId === activeSaveId
                      ? 'bg-[#1d1826] border-[#d4af37]'
                      : 'bg-[#17141f] border-[#b48e4b]/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#b48e4b]/20">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold font-display text-[#f5ebd6]">
                          {save.campaignName
                            ? `${save.campaignName} (${titlePrefix} ${save.playerName})`
                            : `${titlePrefix} ${save.playerName} – ${modeName}`}
                        </h3>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#251e30] text-[#d4af37] border border-[#b48e4b]/35">
                          {diffName}
                        </span>
                        {save.campaignName && (
                          <span className="text-[11px] text-[#b8a990]">{modeName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#b8a990] mt-1 flex-wrap font-mono-tabular">
                        <span>
                          {isEn ? 'Decision:' : 'Karar:'} {save.turn} / {save.targetDecisions}
                        </span>
                        <span>·</span>
                        <span className="text-[#d4af37] font-semibold">
                          {isEn ? 'Progress:' : 'İlerleme:'} {progressStr}
                        </span>
                        <span>·</span>
                        <span>
                          {isEn ? 'Play time:' : 'Oynama süresi:'} {playTimeStr}
                        </span>
                        <span>·</span>
                        <span>
                          {isEn ? 'Last played:' : 'Son oynama:'} {dateStr}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-xs font-semibold ${
                        save.status === 'victory'
                          ? 'text-[#34d399]'
                          : save.status === 'defeat'
                          ? 'text-[#f87171]'
                          : 'text-[#38bdf8]'
                      }`}
                    >
                      {statusText}
                    </span>
                  </div>

                  {/* Indicators & Top Relations Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 text-xs text-[#cfc2ac]">
                    <div className="font-mono-tabular">
                      <span className="text-[#9c8e78]">
                        {isEn ? 'Indicators: ' : 'Göstergeler: '}
                      </span>
                      {isEn ? 'People' : 'Halk'} {save.indicators.people} ·{' '}
                      {isEn ? 'Military' : 'Askerî'} {save.indicators.military} ·{' '}
                      {isEn ? 'Treasury' : 'Hazine'} {save.indicators.treasury} ·{' '}
                      {isEn ? 'Nobles' : 'Soylular'} {save.indicators.nobles}
                    </div>
                    <div className="truncate">
                      <span className="text-[#9c8e78]">
                        {isEn ? 'Top Relations: ' : 'Öne Çıkan İlişkiler: '}
                      </span>
                      {topFriends.join(' · ')}
                    </div>
                  </div>

                  {/* Rename Input if active */}
                  {renamingId === save.saveId && (
                    <div className="mt-3 p-2.5 rounded bg-[#100e14] border border-[#b48e4b]/30 flex flex-col sm:flex-row sm:items-center gap-2">
                      <input
                        type="text"
                        value={renameCampaignValue}
                        onChange={(e) => setRenameCampaignValue(e.target.value)}
                        placeholder={isEn ? 'Custom game/save name...' : 'Oyuna özel kayıt adı...'}
                        className="px-3 py-1.5 text-xs bg-[#181520] border border-[#b48e4b]/50 rounded text-[#f5ebd6] flex-1"
                      />
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder={isEn ? 'Ruler / address name...' : 'Hükümdar / hitap ismi...'}
                        className="px-3 py-1.5 text-xs bg-[#181520] border border-[#d4af37] rounded text-[#f5ebd6] flex-1"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const cleaned = sanitizePlayerName(renameValue);
                            const cleanedCamp = sanitizeCampaignName(renameCampaignValue);
                            if (cleaned) {
                              onRenameSave(save.saveId, cleaned, cleanedCamp);
                              setRenamingId(null);
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-[#d4af37] text-[#0b0a0e] font-bold rounded"
                        >
                          {isEn ? 'Save' : 'Kaydet'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingId(null)}
                          className="px-2.5 py-1.5 text-xs bg-[#272230] text-[#e8dcc4] rounded"
                        >
                          {isEn ? 'Cancel' : 'İptal'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Details View if active */}
                  {detailsSave?.saveId === save.saveId && (
                    <div className="mt-3 p-3 rounded bg-[#121017] border border-[#b48e4b]/25 text-xs space-y-1.5">
                      <div>
                        <strong>{isEn ? 'Current Region:' : 'Mevcut Bölge:'}</strong>{' '}
                        {REGIONS[save.currentRegion]?.name} ·{' '}
                        <strong>{isEn ? 'Difficulty:' : 'Zorluk Modu:'}</strong> {diffName} ·{' '}
                        <strong>{isEn ? 'Active Story Flags:' : 'Açık Hikâye Bayrakları:'}</strong>{' '}
                        {save.flags.length}
                      </div>
                      <div>
                        <strong>{isEn ? 'Last Decision:' : 'Son Karar:'}</strong>{' '}
                        {save.journal[save.journal.length - 1]?.outcomeText ||
                          (isEn ? 'No decisions made yet.' : 'Henüz karar verilmedi.')}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#b48e4b]/15 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onContinueSave(save)}
                      className="px-3.5 py-1.5 rounded bg-[#b48e4b] hover:bg-[#d4af37] text-xs font-bold text-[#0b0a0e]"
                    >
                      {isEn ? 'Continue' : 'Devam Et'}
                    </button>
                    <button
                      type="button"
                      data-testid={`export-single-save-${save.saveId}`}
                      data-export-single="true"
                      onClick={() => handleExportSingleSave(save)}
                      className="px-3 py-1.5 rounded bg-[#1a2536] hover:bg-[#24344d] text-xs font-semibold text-[#93c5fd] border border-[#3b82f6]/40"
                    >
                      ⬇ {isEn ? 'Export This Save (JSON)' : 'Bu Oyunu Yedekle (JSON)'}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDetailsSave(detailsSave?.saveId === save.saveId ? null : save)
                      }
                      className="px-3 py-1.5 rounded bg-[#231e2d] hover:bg-[#2f283c] text-xs font-medium text-[#e8dcc4] border border-[#b48e4b]/30"
                    >
                      {isEn ? 'View Details' : 'Ayrıntıları Gör'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(save.saveId);
                        setRenameValue(save.playerName);
                        setRenameCampaignValue(save.campaignName || '');
                      }}
                      className="px-3 py-1.5 rounded bg-[#231e2d] hover:bg-[#2f283c] text-xs font-medium text-[#e8dcc4] border border-[#b48e4b]/30"
                    >
                      {isEn ? 'Rename' : 'Yeniden Adlandır'}
                    </button>
                    <button
                      type="button"
                      data-testid={`delete-single-save-${save.saveId}`}
                      data-delete-single="true"
                      onClick={() => setConfirmDeleteSaveTarget(save)}
                      className="px-3 py-1.5 rounded bg-[#2a1216] hover:bg-[#3f181f] text-xs font-medium text-[#f87171] border border-[#ef4444]/40 ml-auto"
                    >
                      {isEn ? 'Delete' : 'Sil'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* =====================================================================
            IN-APP CONFIRMATION WINDOW: SINGLE SAVE DELETION
           ===================================================================== */}
        {confirmDeleteSaveTarget && (
          <div
            role="alertdialog"
            aria-modal="true"
            data-testid="confirm-delete-single-modal"
            className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-[#16121c] border-2 border-[#ef4444] rounded-xl p-5 shadow-2xl space-y-4 text-center">
              <div className="text-xs font-bold tracking-widest text-[#f87171]">
                {isEn ? '⚠ CONFIRM SAVE DELETION' : '⚠ KAYIT SİLME ONAYI'}
              </div>
              <h3 className="text-lg font-bold font-display text-[#f5ebd6]">
                {isEn
                  ? `Delete "${confirmDeleteSaveTarget.playerName}" Save?`
                  : `"${confirmDeleteSaveTarget.playerName}" Kaydı Silinsin mi?`}
              </h3>
              <p className="text-xs text-[#cfc2ac] leading-relaxed">
                {isEn
                  ? `You are about to permanently delete the saved game for "${confirmDeleteSaveTarget.playerName}" (Decision ${confirmDeleteSaveTarget.turn} / ${confirmDeleteSaveTarget.targetDecisions}). This action cannot be undone.`
                  : `"${confirmDeleteSaveTarget.playerName}" adına kayıtlı oyunu (Karar: ${confirmDeleteSaveTarget.turn} / ${confirmDeleteSaveTarget.targetDecisions}) kalıcı olarak silmek üzeresiniz. Bu işlem geri alınamaz.`}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  data-testid="confirm-delete-single-yes-btn"
                  onClick={() => {
                    onDeleteSave(confirmDeleteSaveTarget.saveId);
                    setConfirmDeleteSaveTarget(null);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-lg"
                >
                  {isEn ? 'Yes, Permanently Delete This Save' : 'Evet, Bu Kaydı Kalıcı Olarak Sil'}
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-single-cancel-btn"
                  onClick={() => setConfirmDeleteSaveTarget(null)}
                  className="px-4 py-2.5 rounded-lg bg-[#272230] hover:bg-[#352e42] text-[#e8dcc4] text-xs font-semibold border border-[#b48e4b]/40"
                >
                  {isEn ? 'Cancel' : 'Vazgeç'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            IN-APP CONFIRMATION WINDOW: DELETE ALL SAVES
           ===================================================================== */}
        {confirmDeleteAll && (
          <div
            role="alertdialog"
            aria-modal="true"
            data-testid="confirm-delete-all-modal"
            className="absolute inset-0 z-30 bg-black/85 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-[#16121c] border-2 border-[#ef4444] rounded-xl p-5 shadow-2xl space-y-4 text-center">
              <div className="text-xs font-bold tracking-widest text-[#f87171]">
                {isEn ? '⚠ DELETE ALL SAVED GAMES' : '⚠ TÜM KAYITLARI SİLME ONAYI'}
              </div>
              <h3 className="text-lg font-bold font-display text-[#f5ebd6]">
                {isEn
                  ? `Delete All ${saves.length} Saved Games?`
                  : `Mevcut ${saves.length} Kayıtlı Oyunun Tümü Silinsin mi?`}
              </h3>
              <p className="text-xs text-[#cfc2ac] leading-relaxed">
                {isEn
                  ? `Are you sure you want to permanently delete all ${saves.length} saved games? Unless you have exported a JSON backup, this progress cannot be recovered.`
                  : `Kayıtlı olan ${saves.length} oyunun tamamını kalıcı olarak silmek istediğinize emin misiniz? JSON yedeği almadıysanız bu ilerlemeler geri getirilemez.`}
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  data-testid="confirm-delete-all-yes-btn"
                  onClick={() => {
                    onDeleteAllSaves();
                    setConfirmDeleteAll(false);
                  }}
                  className="px-4 py-2.5 rounded-lg bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold shadow-lg"
                >
                  {isEn ? 'Yes, Delete All Saves' : 'Evet, Tüm Kayıtları Sil'}
                </button>
                <button
                  type="button"
                  data-testid="confirm-delete-all-cancel-btn"
                  onClick={() => setConfirmDeleteAll(false)}
                  className="px-4 py-2.5 rounded-lg bg-[#272230] hover:bg-[#352e42] text-[#e8dcc4] text-xs font-semibold border border-[#b48e4b]/40"
                >
                  {isEn ? 'Cancel' : 'Vazgeç'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. STORY JOURNAL, MAJOR DECISIONS ARCHIVE & 60,000+ POOL INSPECTOR MODAL
// ============================================================================
interface JournalAndArchiveModalProps {
  runState: GameRunState | null;
  language?: GameLanguage;
  onClose: () => void;
}

export const JournalAndArchiveModal: React.FC<JournalAndArchiveModalProps> = ({
  runState,
  language = 'tr',
  onClose,
}) => {
  const [tab, setTab] = useState<'journal' | 'archive' | 'manifest'>('journal');
  const [selectedCatIdx, setSelectedCatIdx] = useState(0);
  const manifest = useMemo(() => getScenarioPoolManifest(), []);
  const isEn = language === 'en';

  const sampleCard = useMemo(() => {
    const raw = materializeContextualCard(selectedCatIdx, 2, 4, 1);
    return localizeCard(raw, language, runState || undefined);
  }, [selectedCatIdx, language, runState]);
  const sampleValidation = useMemo(() => validateCardSchema(sampleCard), [sampleCard]);

  return (
    <div
      role="dialog"
      aria-label={isEn ? 'Story Journal & Decision Archive' : 'Hikâye Günlüğü ve Karar Arşivi'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-4xl h-[84vh] bg-[#131118] border-2 border-[#b48e4b]/60 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#b48e4b]/30 bg-[#181520]">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setTab('journal')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                tab === 'journal'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn
                ? `Story Journal (${runState?.journal.length || 0})`
                : `Hikâye Günlüğü (${runState?.journal.length || 0})`}
            </button>
            <button
              type="button"
              onClick={() => setTab('archive')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                tab === 'archive'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn
                ? `Major Decisions Archive (${runState?.majorDecisions.length || 0})`
                : `Önemli Kararlar Arşivi (${runState?.majorDecisions.length || 0})`}
            </button>
            <button
              type="button"
              onClick={() => setTab('manifest')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                tab === 'manifest'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn ? '60,000+ Scenario Pool Manifest' : '60.000+ Senaryo Havuzu Manifesti'}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#272230] hover:bg-[#352e42] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40"
          >
            {isEn ? 'Close' : 'Kapat'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === 'journal' && (
            <div className="space-y-2.5">
              {!runState || runState.journal.length === 0 ? (
                <p className="text-center py-10 text-sm text-[#9c8e78]">
                  {isEn
                    ? 'No decisions recorded yet. Swipe or choose options to begin writing your chronicle.'
                    : 'Henüz kaydedilmiş bir karar bulunmuyor. Kartları kaydırarak kaderini yazmaya başla.'}
                </p>
              ) : (
                [...runState.journal].reverse().map((entry) => (
                  <div
                    key={`${entry.turn}_${entry.cardId}`}
                    className="p-3 rounded-lg bg-[#17141f] border border-[#b48e4b]/25 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#d4af37] font-semibold">
                      <span>
                        {isEn ? `Decision #${entry.turn}` : `${entry.turn}. Karar`} · {entry.cardTitle} ({entry.characterName})
                      </span>
                      <span className="text-[#9c8e78]">{REGIONS[entry.region]?.name}</span>
                    </div>
                    <p className="text-[#e8dcc4]">
                      <strong>{isEn ? 'Choice:' : 'Seçim:'}</strong> {entry.choiceLabel}
                    </p>
                    <p className="text-[#b8a990]">{entry.outcomeText}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'archive' && (
            <div className="space-y-3">
              {runState && runState.flags.length > 0 && (
                <div className="p-3 rounded-lg bg-[#191522] border border-[#b48e4b]/35 text-xs">
                  <div className="text-[#d4af37] font-semibold mb-1">
                    {isEn
                      ? `Active Historical Consequences & Story Flags (${runState.flags.length}):`
                      : `Aktif Tarihsel Sonuçlar ve Hikâye Bayrakları (${runState.flags.length}):`}
                  </div>
                  <p className="text-[#cfc2ac] font-mono-tabular">
                    {runState.flags.slice(-20).join(' · ')}
                  </p>
                </div>
              )}

              {!runState || runState.majorDecisions.length === 0 ? (
                <p className="text-center py-10 text-sm text-[#9c8e78]">
                  {isEn
                    ? 'No major turning-point decisions recorded yet.'
                    : 'Henüz kritik bir dönüm noktası kararı kaydedilmedi.'}
                </p>
              ) : (
                [...runState.majorDecisions].reverse().map((entry) => (
                  <div
                    key={`maj_${entry.turn}_${entry.cardId}`}
                    className="p-3.5 rounded-lg bg-[#1d1724] border border-[#d4af37]/45 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[#fbbf24] font-bold">
                      <span>
                        ★ {isEn ? `Decision #${entry.turn}` : `${entry.turn}. Karar`}: {entry.cardTitle}
                      </span>
                      <span>{entry.characterName}</span>
                    </div>
                    <p className="text-[#f5ebd6] font-medium">{entry.choiceLabel}</p>
                    <p className="text-[#cfc2ac]">{entry.outcomeText}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'manifest' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-lg bg-[#181520] border border-[#d4af37]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold font-display text-[#f5ebd6]">
                    {isEn
                      ? `Verified Scenario Pool Manifest (v${manifest.version})`
                      : `Doğrulanmış Senaryo Havuzu Manifesti (v${manifest.version})`}
                  </h3>
                  <p className="text-[#b8a990] mt-0.5">
                    {isEn
                      ? 'Schema-verified unique playable cards across 42 categories and 6 thematic data packs'
                      : '42 kategori ve 6 veri paketinde şema doğrulaması tamamlanmış benzersiz oynanabilir kartlar'}
                  </p>
                </div>
                <div className="text-right font-mono-tabular">
                  <div className="text-xl font-bold text-[#34d399]">
                    {manifest.totalUniquePlayableCards.toLocaleString(isEn ? 'en-US' : 'tr-TR')}{' '}
                    {isEn ? 'Cards' : 'Kart'}
                  </div>
                  <div className="text-[11px] text-[#9c8e78]">
                    {isEn ? 'Target:' : 'Hedef:'}{' '}
                    {manifest.targetPoolSize.toLocaleString(isEn ? 'en-US' : 'tr-TR')} (✓)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {manifest.packs.map((pack) => (
                  <div
                    key={pack.packId}
                    className="p-3 rounded bg-[#16131d] border border-[#b48e4b]/25 flex flex-col justify-between"
                  >
                    <div className="font-semibold text-[#f5ebd6]">{pack.name}</div>
                    <div className="flex items-center justify-between mt-2 text-[#a89b84] font-mono-tabular">
                      <span>
                        {pack.categoriesCovered.length} {isEn ? 'Categories' : 'Kategori'}
                      </span>
                      <span className="text-[#d4af37] font-bold">
                        {pack.totalPlayableVariations.toLocaleString(isEn ? 'en-US' : 'tr-TR')}{' '}
                        {isEn ? 'Variations' : 'Varyasyon'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Category & Card Schema Inspector */}
              <div className="p-4 rounded-lg bg-[#16131d] border border-[#b48e4b]/35 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-bold text-[#d4af37]">
                    {isEn
                      ? '42-Category Live Card Schema Inspector:'
                      : '42 Kategori Canlı Kart Şema Denetleyicisi:'}
                  </span>
                  <select
                    aria-label={isEn ? 'Select category' : 'Kategori seçin'}
                    value={selectedCatIdx}
                    onChange={(e) => setSelectedCatIdx(Number(e.target.value))}
                    className="px-2.5 py-1 bg-[#100e14] border border-[#b48e4b]/40 rounded text-[#f5ebd6]"
                  >
                    {CARD_CATEGORIES.map((c, idx) => (
                      <option key={c.id} value={idx}>
                        {c.index}. {isEn ? EN_CARD_CATEGORIES[c.id]?.name || c.name : c.name} (1,536)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3 rounded bg-[#100e14] border border-[#b48e4b]/20 space-y-1.5">
                  <div className="flex items-center justify-between font-mono-tabular text-[11px] text-[#34d399]">
                    <span>ID: {sampleCard.id}</span>
                    <span>
                      {isEn ? 'Schema Validation:' : 'Şema Doğrulaması:'}{' '}
                      {sampleValidation.valid ? (isEn ? 'VALID ✓' : 'GEÇERLİ ✓') : 'INVALID'}
                    </span>
                  </div>
                  <div className="font-bold text-[#f5ebd6]">{sampleCard.title}</div>
                  <p className="text-[#cfc2ac]">{sampleCard.text}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-[11px]">
                    <div className="p-2 rounded bg-[#181520]">
                      <strong className="text-[#d4af37]">
                        {isEn ? 'Left Choice:' : 'Sol Seçenek:'}
                      </strong>{' '}
                      {sampleCard.leftChoice.label}
                    </div>
                    <div className="p-2 rounded bg-[#181520]">
                      <strong className="text-[#38bdf8]">
                        {isEn ? 'Right Choice:' : 'Sağ Seçenek:'}
                      </strong>{' '}
                      {sampleCard.rightChoice.label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. STATISTICS & ACHIEVEMENTS MODAL (WITH RANKED ALLY & ENEMY LEADERBOARDS)
// ============================================================================
interface StatsAndAchievementsModalProps {
  stats: GlobalPlayerStatistics;
  currentRun: GameRunState | null;
  language?: GameLanguage;
  onClose: () => void;
}

export const StatsAndAchievementsModal: React.FC<StatsAndAchievementsModalProps> = ({
  stats,
  currentRun,
  language = 'tr',
  onClose,
}) => {
  const [tab, setTab] = useState<'stats' | 'achievements'>('stats');
  const isEn = language === 'en';

  const topChoiceArchetype = useMemo(() => {
    const mapTr: Record<string, string> = {
      diplomatic: 'Diplomatik ve Uzlaşmacı',
      martial: 'Askerî ve Cesur',
      cunning: 'Kurnaz ve Stratejik',
      generous: 'Cömert ve Halk Dostu',
      honorable: 'Onurlu ve Adil',
      ruthless: 'Acımasız ve Otoriter',
    };
    const mapEn: Record<string, string> = {
      diplomatic: 'Diplomatic & Conciliatory',
      martial: 'Martial & Bold',
      cunning: 'Cunning & Strategic',
      generous: 'Generous & Friend of Smallfolk',
      honorable: 'Honorable & Just',
      ruthless: 'Ruthless & Authoritarian',
    };
    const entries = Object.entries(stats.choiceArchetypeTotals);
    if (entries.length === 0) return isEn ? 'Not Determined Yet' : 'Henüz Belirlenmedi';
    entries.sort((a, b) => b[1] - a[1]);
    return (isEn ? mapEn : mapTr)[entries[0][0]] || entries[0][0];
  }, [stats, isEn]);

  // Combine global historical best/worst character relations with active run relations
  // so the ranked lists ("en"den başlayarak sıralama) always display a complete, accurate ranking!
  const mergedCharacterRecords = useMemo(() => {
    const map: Record<
      string,
      { id: string; name: string; house: string; maxRelation: number; minRelation: number }
    > = {};

    for (const c of CHARACTERS) {
      const globalRec = stats.characterBestRelations[c.id];
      const runRec = currentRun?.characters[c.id];
      const maxRel = Math.max(
        globalRec?.maxRelation ?? c.initialRelation,
        runRec?.relation ?? c.initialRelation
      );
      const minRel = Math.min(
        globalRec?.minRelation ?? c.initialRelation,
        runRec?.relation ?? c.initialRelation
      );
      map[c.id] = {
        id: c.id,
        name: c.name,
        house: c.house,
        maxRelation: maxRel,
        minRelation: minRel,
      };
    }
    return Object.values(map);
  }, [stats, currentRun]);

  // Ranked from highest positive relation downwards (#1, #2, #3...)
  const rankedMostAlliedCharacters = useMemo(() => {
    return [...mergedCharacterRecords]
      .sort((a, b) => b.maxRelation - a.maxRelation)
      .slice(0, 10);
  }, [mergedCharacterRecords]);

  // Ranked from most hostile/lowest relation upwards (#1 most hostile, #2, #3...)
  const rankedMostHostileCharacters = useMemo(() => {
    return [...mergedCharacterRecords]
      .sort((a, b) => a.minRelation - b.minRelation)
      .slice(0, 10);
  }, [mergedCharacterRecords]);

  const topCategoryName = useMemo(() => {
    const entries = Object.entries(stats.categoryEncounterCounts);
    if (entries.length === 0) {
      return isEn ? 'Main Story Events' : 'Ana Hikâye Olayları';
    }
    entries.sort((a, b) => b[1] - a[1]);
    const catId = entries[0][0] as keyof typeof EN_CARD_CATEGORIES;
    if (isEn && EN_CARD_CATEGORIES[catId]) return EN_CARD_CATEGORIES[catId].name;
    const found = CARD_CATEGORIES.find((c) => c.id === catId);
    return found?.name || entries[0][0];
  }, [stats, isEn]);

  const bestModeName = useMemo(() => {
    const entries = Object.entries(stats.modeWins) as Array<[keyof typeof GAME_MODES, number]>;
    entries.sort((a, b) => b[1] - a[1]);
    if (entries[0][1] > 0) {
      const mName = isEn ? EN_GAME_MODES[entries[0][0]].name : GAME_MODES[entries[0][0]].name;
      return `${mName} (${entries[0][1]} ${isEn ? 'Wins' : 'Zafer'})`;
    }
    const fallbackId = currentRun ? currentRun.modeId : 'quick';
    return isEn ? EN_GAME_MODES[fallbackId].name : GAME_MODES[fallbackId].name;
  }, [stats, currentRun, isEn]);

  return (
    <div
      role="dialog"
      aria-label={isEn ? 'Game Statistics & Achievements' : 'Oyun İstatistikleri ve Başarımlar'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-5xl max-h-[88vh] bg-[#131118] border-2 border-[#b48e4b]/60 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#b48e4b]/30 bg-[#181520]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('stats')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold ${
                tab === 'stats'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn ? 'Game Statistics & Rankings' : 'Oyun İstatistikleri ve Sıralamalar'}
            </button>
            <button
              type="button"
              onClick={() => setTab('achievements')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold ${
                tab === 'achievements'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn
                ? `Secret Achievements (${stats.unlockedAchievementIds.length} / ${ACHIEVEMENTS.length})`
                : `Gizli Başarımlar (${stats.unlockedAchievementIds.length} / ${ACHIEVEMENTS.length})`}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#272230] hover:bg-[#352e42] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40"
          >
            {isEn ? 'Close' : 'Kapat'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {tab === 'stats' ? (
            <>
              {/* Summary Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {[
                  {
                    label: isEn ? 'Total Games Played' : 'Toplam Oynanan Oyun',
                    val: stats.totalGamesStarted,
                  },
                  {
                    label: isEn ? 'Completed Games' : 'Tamamlanan Oyun',
                    val: stats.completedGames,
                  },
                  { label: isEn ? 'Games Won' : 'Kazanılan Oyun', val: stats.wonGames },
                  { label: isEn ? 'Games Lost' : 'Kaybedilen Oyun', val: stats.lostGames },
                  {
                    label: isEn ? 'Total Decisions Made' : 'Toplam Karar Sayısı',
                    val: stats.totalDecisionsMade.toLocaleString(isEn ? 'en-US' : 'tr-TR'),
                  },
                  {
                    label: isEn ? 'Longest Survival Streak' : 'En Uzun Hayatta Kalma Serisi',
                    val: `${stats.longestSurvivalStreak} ${isEn ? 'Decisions' : 'Karar'}`,
                  },
                  {
                    label: isEn ? 'Longest Play Time' : 'En Uzun Oyun Süresi',
                    val: formatPlayTimeLocalized(
                      Math.max(stats.longestGameTimeSeconds, currentRun?.activePlayTimeSeconds || 0),
                      language
                    ),
                  },
                  {
                    label: isEn ? 'Most Used Decision Style' : 'En Çok Kullanılan Karar Türü',
                    val: topChoiceArchetype,
                  },
                  {
                    label: isEn ? 'Highest Support of People' : 'En Yüksek Halk Desteği',
                    val: `${stats.highestIndicatorsReached.people} / 100`,
                  },
                  {
                    label: isEn ? 'Highest Military Might' : 'En Yüksek Askerî Güç',
                    val: `${stats.highestIndicatorsReached.military} / 100`,
                  },
                  {
                    label: isEn ? 'Highest Treasury' : 'En Yüksek Hazine',
                    val: `${stats.highestIndicatorsReached.treasury} / 100`,
                  },
                  {
                    label: isEn ? 'Highest Support of Nobles' : 'En Yüksek Soylu Desteği',
                    val: `${stats.highestIndicatorsReached.nobles} / 100`,
                  },
                  {
                    label: isEn ? 'Most Encountered Category' : 'En Sık Karşılaşılan Olay Kategorisi',
                    val: topCategoryName,
                  },
                  {
                    label: isEn ? 'Most Successful Game Mode' : 'En Başarılı Oyun Modu',
                    val: bestModeName,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#17141f] border border-[#b48e4b]/25 flex flex-col justify-between"
                  >
                    <span className="text-[#9c8e78]">{item.label}</span>
                    <span className="text-sm sm:text-base font-bold font-mono-tabular text-[#f5ebd6] mt-1">
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>

              {/* Ranked Character Leaderboards ("En"den Başlayarak Sıralama) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* 1. Ranked Best Allies / Highest Relationships */}
                <div
                  data-testid="stats-ranked-allies"
                  className="p-4 rounded-xl bg-[#16131d] border border-[#10b981]/40 space-y-2.5"
                >
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-display text-[#34d399]">
                      {isEn
                        ? '★ Most Allied & Closest Characters (Ranked #1–#10)'
                        : '★ En Fazla İlişki Kurulan Karakterler Sıralaması (En Yüksekten)'}
                    </h3>
                    <p className="text-[11px] text-[#9c8e78]">
                      {isEn
                        ? 'Ordered from highest relationship score achieved downwards'
                        : 'En yüksek ilişki ve sadakat puanına ulaşılan karakterlerden başlayarak sıralama'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {rankedMostAlliedCharacters.map((item, index) => {
                      const tier = getRelationshipTierLocalized(item.maxRelation, language);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded bg-[#100e14] border border-[#b48e4b]/15"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 text-xs font-mono-tabular font-extrabold text-[#d4af37] shrink-0">
                              #{index + 1}
                            </span>
                            <CharacterPortrait characterId={item.id} mood="happy" size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#f5ebd6] truncate">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-[#9c8e78] truncate">
                                {tier.label} · {item.house}
                              </div>
                            </div>
                          </div>
                          <span
                            className="font-mono-tabular text-xs font-extrabold px-2 py-0.5 rounded bg-[#181520] shrink-0"
                            style={{ color: tier.color }}
                          >
                            {item.maxRelation > 0 ? `+${item.maxRelation}` : item.maxRelation}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Ranked Worst Enemies / Most Hostile Characters */}
                <div
                  data-testid="stats-ranked-enemies"
                  className="p-4 rounded-xl bg-[#16131d] border border-[#ef4444]/40 space-y-2.5"
                >
                  <div>
                    <h3 className="text-sm sm:text-base font-bold font-display text-[#f87171]">
                      {isEn
                        ? '⚔ Most Hostile & Rival Characters (Ranked #1–#10)'
                        : '⚔ En Fazla Düşman Olunan Karakterler Sıralaması (En Düşükten)'}
                    </h3>
                    <p className="text-[11px] text-[#9c8e78]">
                      {isEn
                        ? 'Ordered from most hostile / lowest relationship score achieved'
                        : 'En sert düşmanlık ve en düşük ilişki puanına inilen karakterlerden başlayarak sıralama'}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    {rankedMostHostileCharacters.map((item, index) => {
                      const tier = getRelationshipTierLocalized(item.minRelation, language);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2.5 p-2 rounded bg-[#100e14] border border-[#b48e4b]/15"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-6 text-xs font-mono-tabular font-extrabold text-[#f87171] shrink-0">
                              #{index + 1}
                            </span>
                            <CharacterPortrait characterId={item.id} mood="angry" size="sm" />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#f5ebd6] truncate">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-[#9c8e78] truncate">
                                {tier.label} · {item.house}
                              </div>
                            </div>
                          </div>
                          <span
                            className="font-mono-tabular text-xs font-extrabold px-2 py-0.5 rounded bg-[#181520] shrink-0"
                            style={{ color: tier.color }}
                          >
                            {item.minRelation > 0 ? `+${item.minRelation}` : item.minRelation}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = stats.unlockedAchievementIds.includes(ach.id);
                const enAch = EN_ACHIEVEMENTS[ach.id];
                const title = isEn && enAch ? enAch.title : ach.title;
                const desc = isEn && enAch ? enAch.description : ach.description;
                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-lg border flex items-start gap-3 ${
                      isUnlocked
                        ? 'bg-[#1c1926] border-[#d4af37]'
                        : 'bg-[#14121a] border-[#b48e4b]/20 opacity-65'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isUnlocked
                          ? 'bg-[#d4af37] text-[#0b0a0e]'
                          : 'bg-[#272230] text-[#8c7e6a]'
                      }`}
                    >
                      {isUnlocked ? '★' : '?'}
                    </div>
                    <div>
                      <div className="text-sm font-bold font-display text-[#f5ebd6]">
                        {title}
                        {ach.isSecret && (
                          <span className="ml-2 text-[10px] font-sans font-normal text-[#d4af37]">
                            · {isEn ? 'Secret Achievement' : 'Gizli Başarım'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#b8a990] mt-0.5">{desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. SETTINGS & ABOUT MODAL (LANGUAGE SWITCHER, AUDIO & PLAYER NAME)
// ============================================================================
interface SettingsAndAboutModalProps {
  initialTab?: 'settings' | 'about';
  language: GameLanguage;
  audioSettings: AudioSettings;
  currentPlayerName: string;
  onUpdateLanguage: (lang: GameLanguage) => void;
  onUpdateAudio: (next: AudioSettings) => void;
  onUpdatePlayerName: (newName: string) => void;
  onClose: () => void;
}

export const SettingsAndAboutModal: React.FC<SettingsAndAboutModalProps> = ({
  initialTab = 'settings',
  language,
  audioSettings,
  currentPlayerName,
  onUpdateLanguage,
  onUpdateAudio,
  onUpdatePlayerName,
  onClose,
}) => {
  const [tab, setTab] = useState<'settings' | 'about'>(initialTab);
  const [nameInput, setNameInput] = useState(currentPlayerName);
  const [nameSavedBanner, setNameSavedBanner] = useState(false);

  const isEn = language === 'en';

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizePlayerName(nameInput);
    if (!cleaned) return;
    onUpdatePlayerName(cleaned);
    setNameSavedBanner(true);
    setTimeout(() => setNameSavedBanner(false), 2500);
  };

  return (
    <div
      role="dialog"
      aria-label={isEn ? 'Settings & About' : 'Ayarlar ve Oyun Hakkında'}
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 pointer-events-auto"
    >
      <div className="w-full max-w-2xl max-h-[86vh] bg-[#131118] border-2 border-[#b48e4b]/60 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#b48e4b]/30 bg-[#181520]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold ${
                tab === 'settings'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn ? 'Settings' : 'Ayarlar'}
            </button>
            <button
              type="button"
              onClick={() => setTab('about')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold ${
                tab === 'about'
                  ? 'bg-[#b48e4b] text-[#0b0a0e]'
                  : 'bg-[#231e2d] text-[#cfc2ac]'
              }`}
            >
              {isEn ? 'About the Game' : 'Oyun Hakkında'}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-[#272230] hover:bg-[#352e42] text-xs font-semibold text-[#e8dcc4] border border-[#b48e4b]/40"
          >
            {isEn ? 'Close' : 'Kapat'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs sm:text-sm">
          {tab === 'settings' ? (
            <>
              {/* 1. Language Switcher (Türkçe / English) */}
              <div className="p-4 rounded-lg bg-[#17141f] border border-[#d4af37]/45 space-y-3">
                <h3 className="text-base font-bold font-display text-[#f5ebd6]">
                  {isEn ? 'Game Language / Oyun Dili' : 'Oyun Dili / Game Language'}
                </h3>
                <p className="text-xs text-[#a89b84]">
                  {isEn
                    ? 'Switching language immediately translates all menus, character profiles, and all 64,534+ scenario cards.'
                    : 'Dili değiştirdiğinizde tüm menüler, karakter profilleri ve 64.534+ senaryo kartının tamamı anında seçilen dile döner.'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    data-testid="lang-select-tr"
                    onClick={() => onUpdateLanguage('tr')}
                    className={`py-2.5 px-4 rounded-lg font-bold text-xs border transition-all ${
                      language === 'tr'
                        ? 'bg-[#b48e4b] text-[#0b0a0e] border-[#d4af37] shadow-md'
                        : 'bg-[#100e14] text-[#e8dcc4] border-[#b48e4b]/35 hover:border-[#d4af37]'
                    }`}
                  >
                    Türkçe (TR) {language === 'tr' ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    data-testid="lang-select-en"
                    onClick={() => onUpdateLanguage('en')}
                    className={`py-2.5 px-4 rounded-lg font-bold text-xs border transition-all ${
                      language === 'en'
                        ? 'bg-[#b48e4b] text-[#0b0a0e] border-[#d4af37] shadow-md'
                        : 'bg-[#100e14] text-[#e8dcc4] border-[#b48e4b]/35 hover:border-[#d4af37]'
                    }`}
                  >
                    English (EN) {language === 'en' ? '✓' : ''}
                  </button>
                </div>
              </div>

              {/* 2. Audio & Theme Music Controls */}
              <div className="p-4 rounded-lg bg-[#17141f] border border-[#b48e4b]/30 space-y-3">
                <h3 className="text-base font-bold font-display text-[#f5ebd6]">
                  {isEn ? 'Sound & Game of Thrones Theme Music' : 'Ses ve Game of Thrones Tema Müziği'}
                </h3>

                <div className="flex items-center justify-between">
                  <span>
                    {isEn
                      ? 'Background Theme Music (Cello & Medieval Lute Ostinato)'
                      : 'Arka Plan Tema Müziği (Çello ve Orta Çağ Lavta Ostinatosu)'}
                  </span>
                  <button
                    type="button"
                    data-testid="toggle-music-btn"
                    onClick={() =>
                      onUpdateAudio({ ...audioSettings, musicEnabled: !audioSettings.musicEnabled })
                    }
                    className={`px-3 py-1 rounded text-xs font-bold ${
                      audioSettings.musicEnabled
                        ? 'bg-[#10b981] text-[#0b0a0e]'
                        : 'bg-[#272230] text-[#9c8e78]'
                    }`}
                  >
                    {audioSettings.musicEnabled
                      ? isEn
                        ? 'On'
                        : 'Açık'
                      : isEn
                      ? 'Off'
                      : 'Kapalı'}
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span>
                    {isEn
                      ? 'Sound Effects (Card Swipe, Royal Seal, Battle Steel)'
                      : 'Ses Efektleri (Kart Kaydırma, Mühür, Savaş Çeliği)'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateAudio({ ...audioSettings, sfxEnabled: !audioSettings.sfxEnabled })
                    }
                    className={`px-3 py-1 rounded text-xs font-bold ${
                      audioSettings.sfxEnabled
                        ? 'bg-[#10b981] text-[#0b0a0e]'
                        : 'bg-[#272230] text-[#9c8e78]'
                    }`}
                  >
                    {audioSettings.sfxEnabled
                      ? isEn
                        ? 'On'
                        : 'Açık'
                      : isEn
                      ? 'Off'
                      : 'Kapalı'}
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>{isEn ? 'Master Volume' : 'Ses Seviyesi'}</span>
                    <span className="font-mono-tabular">
                      %{Math.round(audioSettings.volume * 100)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={audioSettings.volume}
                    onChange={(e) =>
                      onUpdateAudio({ ...audioSettings, volume: parseFloat(e.target.value) })
                    }
                    aria-label={isEn ? 'Master Volume' : 'Ses Seviyesi'}
                    className="w-full accent-[#d4af37]"
                  />
                </div>
              </div>

              {/* 3. Player Name / Title of Address Customization */}
              <form
                onSubmit={handleSaveName}
                className="p-4 rounded-lg bg-[#17141f] border border-[#b48e4b]/30 space-y-3"
              >
                <h3 className="text-base font-bold font-display text-[#f5ebd6]">
                  {isEn
                    ? 'Update Player Name / Title of Address'
                    : 'Oyuncu Hitap İsmi Güncelleme'}
                </h3>
                <p className="text-xs text-[#a89b84]">
                  {isEn
                    ? 'Changing your name preserves all saved games and past decisions; all future dialogues and new games will use your updated name.'
                    : 'Hitap ismini değiştirdiğinde mevcut kayıtların ve geçmiş kararların korunur; bundan sonraki tüm diyaloglarda ve yeni oyunlarda bu isim otomatik kullanılır.'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={32}
                    placeholder={isEn ? 'Enter your name...' : 'Hitap isminizi girin...'}
                    aria-label={isEn ? 'Player Name' : 'Oyuncu Adı'}
                    className="flex-1 px-3 py-2 bg-[#100e14] border border-[#b48e4b]/45 rounded text-[#f5ebd6] focus:outline-none focus:border-[#d4af37]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-[#b48e4b] hover:bg-[#d4af37] text-[#0b0a0e] font-bold text-xs"
                  >
                    {isEn ? 'Update Name' : 'İsmi Güncelle'}
                  </button>
                </div>
                {nameSavedBanner && (
                  <p className="text-xs text-[#34d399]">
                    {isEn
                      ? 'Player name updated and saved as default!'
                      : 'Hitap ismi güvenli biçimde güncellendi ve varsayılan olarak kaydedildi!'}
                  </p>
                )}
              </form>
            </>
          ) : (
            <div className="space-y-3 text-[#cfc2ac] leading-relaxed">
              <h3 className="text-lg font-bold font-display text-[#f5ebd6]">
                {isEn
                  ? 'In the Shadow of the Throne – Game of Thrones'
                  : 'Tahtın Gölgesinde – Game of Thrones'}
              </h3>
              <p>
                {isEn
                  ? 'In the Shadow of the Throne combines the eight-season saga of the HBO Game of Thrones universe and alternate-history possibilities with Reigns-style strategic decision mechanics.'
                  : 'Tahtın Gölgesinde, HBO Game of Thrones evreninin sekiz sezonluk destanını ve alternatif tarih olasılıklarını Reigns tarzı karar mekaniğiyle birleştiren kapsamlı bir strateji ve hayatta kalma oyunudur.'}
              </p>
              <div className="p-3.5 rounded bg-[#17141f] border border-[#b48e4b]/25 space-y-1.5 text-xs">
                <div className="font-bold text-[#d4af37]">
                  {isEn ? 'Key Features:' : 'Temel Özellikler:'}
                </div>
                <p>
                  •{' '}
                  {isEn
                    ? 'Four Core Indicators: Support of the People, Military Might, Treasury, and Support of the Nobles. If any hits 0, your reign ends.'
                    : 'Dört Temel Gösterge: Halkın Desteği, Askerî Güç, Hazine ve Soyluların Desteği. Herhangi biri 0’a düşerse iktidarın son bulur.'}
                </p>
                <p>
                  •{' '}
                  {isEn
                    ? 'Undo System (Last 10 Decisions): Revert up to your last 10 decisions at any time with [Z] or the Undo button.'
                    : 'Geri Alma Sistemi (Son 10 Karar): [Z] tuşu veya Geri Al butonuyla son 10 kararınızı istediğiniz an geri alabilirsiniz.'}
                </p>
                <p>
                  •{' '}
                  {isEn
                    ? 'Two-Step Keyboard Preview: Press A/D or Left/Right once to preview indicator impacts at the top, and press a second time to confirm.'
                    : 'İki Aşamalı Klavye Kararı: A/D veya Sol/Sağ Ok tuşuna ilk basışta üstteki göstergelerin nasıl etkileneceğini önizleyin, ikinci basışta kararı onaylayın.'}
                </p>
                <p>
                  •{' '}
                  {isEn
                    ? '64,534+ Playable Cards in Turkish & English across 42 categories.'
                    : '42 kategoride Türkçe ve İngilizce tam destekli 64.534+ oynanabilir senaryo kartı.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
