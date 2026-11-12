import React, { useEffect, useRef, useState } from 'react';
import { CARD_CATEGORIES, REGIONS } from '../data/categoriesAndEras';
import { interpolateText, scaleIndicatorDeltaForDifficulty } from '../game/engine';
import {
  EN_CARD_CATEGORIES,
  getCharacterLocalized,
  getRelationshipTierLocalized,
  localizeCard,
} from '../i18n/localization';
import {
  CharacterRuntimeState,
  GameLanguage,
  GameRunState,
  IndicatorDelta,
  PlayerRoleId,
  ScenarioCard,
} from '../types/game';
import { CharacterPortrait } from './CharacterPortrait';

interface DecisionCardProps {
  card: ScenarioCard;
  runState?: GameRunState;
  playerName: string;
  roleId: PlayerRoleId;
  characterState?: CharacterRuntimeState;
  language?: GameLanguage;
  keyboardPreviewSide?: 'left' | 'right' | null;
  onClearKeyboardPreview?: () => void;
  onChoose: (side: 'left' | 'right') => void;
  onPreviewDelta: (delta: IndicatorDelta | null) => void;
  onInspectCharacter: (characterId: string) => void;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({
  card,
  runState,
  playerName,
  roleId,
  characterState,
  language = 'tr',
  keyboardPreviewSide = null,
  onClearKeyboardPreview,
  onChoose,
  onPreviewDelta,
  onInspectCharacter,
}) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    setDragX(0);
    setExitDirection(null);
  }, [card.id]);

  const localizedCard = localizeCard(card, language, runState);
  const activeDifficulty = runState?.difficultyId || 'normal';
  const leftScaledPreview = scaleIndicatorDeltaForDifficulty(
    localizedCard.leftChoice.indicators,
    activeDifficulty
  );
  const rightScaledPreview = scaleIndicatorDeltaForDifficulty(
    localizedCard.rightChoice.indicators,
    activeDifficulty
  );

  const charDef = getCharacterLocalized(card.characterId, language);
  const regionMeta = REGIONS[card.region] || REGIONS.kings_landing;
  const categoryMetaTr = CARD_CATEGORIES.find((c) => c.id === card.category);
  const categoryName =
    language === 'en'
      ? EN_CARD_CATEGORIES[card.category]?.name || 'Realm Event'
      : categoryMetaTr?.name || 'Krallık Olayı';

  const relScore = characterState?.relation ?? 0;
  const relTier = getRelationshipTierLocalized(relScore, language);

  const storyText = interpolateText(localizedCard.text, playerName, roleId, language);
  const leftLabel = interpolateText(localizedCard.leftChoice.label, playerName, roleId, language);
  const rightLabel = interpolateText(localizedCard.rightChoice.label, playerName, roleId, language);

  const triggerChoiceWithAnimation = (side: 'left' | 'right') => {
    if (exitDirection) return;
    setExitDirection(side);
    onPreviewDelta(null);
    onClearKeyboardPreview?.();
    setTimeout(() => {
      setExitDirection(null);
      setDragX(0);
      onChoose(side);
    }, 150);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    startXRef.current = e.clientX;
    setIsDragging(true);
    onClearKeyboardPreview?.();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || startXRef.current === null) return;
    const dx = e.clientX - startXRef.current;
    setDragX(dx);
    if (dx < -35) {
      onPreviewDelta(leftScaledPreview);
    } else if (dx > 35) {
      onPreviewDelta(rightScaledPreview);
    } else {
      onPreviewDelta(null);
    }
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    startXRef.current = null;
    if (dragX <= -95) {
      triggerChoiceWithAnimation('left');
    } else if (dragX >= 95) {
      triggerChoiceWithAnimation('right');
    } else {
      setDragX(0);
      onPreviewDelta(null);
    }
  };

  const effectiveDragX =
    dragX !== 0
      ? dragX
      : keyboardPreviewSide === 'left'
      ? -52
      : keyboardPreviewSide === 'right'
      ? 52
      : 0;

  const rotation =
    exitDirection === 'left'
      ? -14
      : exitDirection === 'right'
      ? 14
      : Math.max(-12, Math.min(12, effectiveDragX * 0.06));

  const translateX =
    exitDirection === 'left'
      ? -340
      : exitDirection === 'right'
      ? 340
      : effectiveDragX;

  const opacity = exitDirection ? 0 : 1;

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center px-3 pointer-events-auto">
      {/* Central Reigns-style Parchment & Dark Stone Decision Card */}
      <div
        data-testid="decision-card"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translate3d(${translateX}px, 0, 0) rotate(${rotation}deg)`,
          opacity,
          transition: isDragging
            ? 'none'
            : 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease',
        }}
        className="w-full bg-[#17141d] border-2 border-[#b48e4b]/65 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-5 cursor-grab active:cursor-grabbing relative overflow-hidden"
      >
        {/* Subtle top decorative gold trim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />

        {/* Directional Swipe or Keyboard 1st-Press Preview Stamp Indicator */}
        {(dragX < -40 || keyboardPreviewSide === 'left') && (
          <div
            data-testid="card-preview-badge-left"
            className="absolute top-3 left-3 z-20 px-2.5 py-1 border border-[#f59e0b] bg-[#1c140a]/95 text-[#fbbf24] text-xs font-bold tracking-wider rounded shadow-lg"
          >
            {keyboardPreviewSide === 'left'
              ? language === 'en'
                ? '← PREVIEW: Press [A / ←] again to confirm'
                : '← ÖNİZLEME: Onaylamak için tekrar [A / ←] basın'
              : language === 'en'
              ? '← LEFT CHOICE'
              : '← SOL SEÇENEK'}
          </div>
        )}
        {(dragX > 40 || keyboardPreviewSide === 'right') && (
          <div
            data-testid="card-preview-badge-right"
            className="absolute top-3 right-3 z-20 px-2.5 py-1 border border-[#38bdf8] bg-[#0a1824]/95 text-[#38bdf8] text-xs font-bold tracking-wider rounded shadow-lg"
          >
            {keyboardPreviewSide === 'right'
              ? language === 'en'
                ? 'PREVIEW: Press [D / →] again to confirm →'
                : 'ÖNİZLEME: Onaylamak için tekrar [D / →] basın →'
              : language === 'en'
              ? 'RIGHT CHOICE →'
              : 'SAĞ SEÇENEK →'}
          </div>
        )}

        {/* Top Metadata Line (Unboxed clean text with · separators) */}
        <div className="flex items-center justify-center gap-2 text-xs text-[#a89b84] mb-3 flex-wrap">
          <span className="text-[#d4af37] font-medium">{regionMeta.name}</span>
          <span aria-hidden="true">·</span>
          <span>{categoryName}</span>
          {card.isCanon && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#f59e0b]">
                {language === 'en' ? 'Canon Saga' : 'Ana Destan'}
              </span>
            </>
          )}
          {card.isRare && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#38bdf8]">
                {language === 'en' ? 'Rare Event' : 'Nadir Olay'}
              </span>
            </>
          )}
        </div>

        {/* Character Header & Portrait */}
        <div className="flex items-center gap-3.5 pb-3.5 border-b border-[#b48e4b]/25">
          <button
            type="button"
            onClick={() => onInspectCharacter(charDef.id)}
            className="group relative focus:outline-none"
            aria-label={
              language === 'en'
                ? `Inspect ${charDef.name} profile`
                : `${charDef.name} profilini incele`
            }
          >
            <CharacterPortrait characterId={charDef.id} mood={card.mood} size="lg" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onInspectCharacter(charDef.id)}
                className="text-left text-base sm:text-lg font-bold font-display text-[#f5ebd6] hover:text-[#d4af37] transition-colors truncate"
              >
                {charDef.name}
              </button>
              <span
                className="font-mono-tabular text-xs font-medium shrink-0"
                style={{ color: relTier.color }}
              >
                {relTier.label} ({relScore > 0 ? `+${relScore}` : relScore})
              </span>
            </div>

            <p className="text-xs text-[#b8a990] truncate mt-0.5">
              {charDef.title} · {charDef.house}
            </p>

            <p
              data-testid="card-title"
              className="text-xs text-[#d4af37]/90 font-semibold mt-1.5 truncate"
            >
              {localizedCard.title}
            </p>
          </div>
        </div>

        {/* Story Narrative Body */}
        <div className="py-4 min-h-[108px] flex items-center">
          <p
            data-testid="card-story-text"
            className="text-[15px] sm:text-base leading-relaxed text-[#efe5d1] font-normal"
          >
            {storyText}
          </p>
        </div>

        {/* Subtle Swipe Hint Footer Inside Card */}
        <div className="pt-2 border-t border-[#b48e4b]/15 flex items-center justify-between text-[11px] text-[#8c7e6a]">
          <span>
            {language === 'en'
              ? '← Swipe left or press A / Left twice'
              : '← Sola kaydır veya 2 kez A / Sol Ok'}
          </span>
          <span>
            {language === 'en'
              ? 'Swipe right or press D / Right twice →'
              : 'Sağa kaydır veya 2 kez D / Sağ Ok →'}
          </span>
        </div>
      </div>

      {/* Explicit Clickable Left & Right Decision Buttons Below Card */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
        <button
          type="button"
          data-testid="choice-left-btn"
          onClick={() => triggerChoiceWithAnimation('left')}
          onMouseEnter={() => onPreviewDelta(leftScaledPreview)}
          onMouseLeave={() => {
            if (!keyboardPreviewSide) onPreviewDelta(null);
          }}
          className={`group text-left px-4 py-3 rounded-lg transition-all shadow-md flex flex-col justify-between border ${
            keyboardPreviewSide === 'left'
              ? 'bg-[#281e12] border-[#fbbf24] ring-2 ring-[#fbbf24]/50'
              : 'bg-[#18141f] hover:bg-[#241d2e] border-[#b48e4b]/45 hover:border-[#d4af37]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-[#d4af37] font-semibold mb-1">
            <span>
              {keyboardPreviewSide === 'left'
                ? language === 'en'
                  ? '← CONFIRM OPTION A'
                  : '← SEÇENEK A (ONAYLA)'
                : language === 'en'
                ? '← OPTION A (SWIPE LEFT)'
                : '← SEÇENEK A (SOLA KAYDIR)'}
            </span>
            <span className="font-mono-tabular text-[#9c8e78]">[A / ←]</span>
          </div>
          <p className="text-xs sm:text-sm text-[#f3e9d2] font-medium leading-snug">
            {leftLabel}
          </p>
        </button>

        <button
          type="button"
          data-testid="choice-right-btn"
          onClick={() => triggerChoiceWithAnimation('right')}
          onMouseEnter={() => onPreviewDelta(rightScaledPreview)}
          onMouseLeave={() => {
            if (!keyboardPreviewSide) onPreviewDelta(null);
          }}
          className={`group text-left px-4 py-3 rounded-lg transition-all shadow-md flex flex-col justify-between border ${
            keyboardPreviewSide === 'right'
              ? 'bg-[#102330] border-[#38bdf8] ring-2 ring-[#38bdf8]/50'
              : 'bg-[#18141f] hover:bg-[#241d2e] border-[#b48e4b]/45 hover:border-[#d4af37]'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-[#38bdf8] font-semibold mb-1">
            <span>
              {keyboardPreviewSide === 'right'
                ? language === 'en'
                  ? 'CONFIRM OPTION B →'
                  : 'SEÇENEK B (ONAYLA) →'
                : language === 'en'
                ? 'OPTION B (SWIPE RIGHT) →'
                : 'SEÇENEK B (SAĞA KAYDIR) →'}
            </span>
            <span className="font-mono-tabular text-[#9c8e78]">[D / →]</span>
          </div>
          <p className="text-xs sm:text-sm text-[#f3e9d2] font-medium leading-snug">
            {rightLabel}
          </p>
        </button>
      </div>
    </div>
  );
};
