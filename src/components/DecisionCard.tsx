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
  onSetKeyboardPreviewSide?: (side: 'left' | 'right' | null) => void;
  onClearKeyboardPreview?: () => void;
  onChoose: (side: 'left' | 'right') => void;
  onPreviewDelta: (delta: IndicatorDelta | null) => void;
  onInspectCharacter: (characterId: string) => void;
}

const PREVIEW_THRESHOLD_PX = 14;

export const DecisionCard: React.FC<DecisionCardProps> = ({
  card,
  runState,
  playerName,
  roleId,
  characterState,
  language = 'tr',
  keyboardPreviewSide = null,
  onSetKeyboardPreviewSide,
  onClearKeyboardPreview,
  onChoose,
  onPreviewDelta,
  onInspectCharacter,
}) => {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const startXRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const buttonPointerTypeRef = useRef<string>('mouse');

  useEffect(() => {
    setDragX(0);
    setIsDragging(false);
    setExitDirection(null);
    startXRef.current = null;
    activePointerIdRef.current = null;
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

  const getCommitThreshold = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 75;
    }
    return 95;
  };

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

  const updateDragDelta = (dx: number) => {
    setDragX(dx);
    if (dx <= -PREVIEW_THRESHOLD_PX) {
      onPreviewDelta(leftScaledPreview);
    } else if (dx >= PREVIEW_THRESHOLD_PX) {
      onPreviewDelta(rightScaledPreview);
    } else {
      onPreviewDelta(null);
    }
  };

  const finishDrag = (currentDx: number) => {
    const commitThreshold = getCommitThreshold();
    setIsDragging(false);
    startXRef.current = null;
    activePointerIdRef.current = null;
    if (currentDx <= -commitThreshold) {
      triggerChoiceWithAnimation('left');
    } else if (currentDx >= commitThreshold) {
      triggerChoiceWithAnimation('right');
    } else {
      setDragX(0);
      if (!keyboardPreviewSide) {
        onPreviewDelta(null);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    startXRef.current = e.clientX;
    activePointerIdRef.current = e.pointerId;
    setIsDragging(true);
    onClearKeyboardPreview?.();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if synthetic or unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || startXRef.current === null) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;
    const dx = e.clientX - startXRef.current;
    updateDragDelta(dx);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
    finishDrag(dragX);
  };

  const handleOptionButtonClick = (side: 'left' | 'right') => {
    // On mobile touch devices, 1st tap previews indicator balances & option, 2nd tap confirms!
    if (buttonPointerTypeRef.current === 'touch' && onSetKeyboardPreviewSide) {
      if (keyboardPreviewSide === side) {
        triggerChoiceWithAnimation(side);
      } else {
        onSetKeyboardPreviewSide(side);
        onPreviewDelta(side === 'left' ? leftScaledPreview : rightScaledPreview);
      }
      return;
    }
    triggerChoiceWithAnimation(side);
  };

  const activePreviewSide: 'left' | 'right' | null =
    dragX <= -PREVIEW_THRESHOLD_PX
      ? 'left'
      : dragX >= PREVIEW_THRESHOLD_PX
      ? 'right'
      : keyboardPreviewSide;

  const activePreviewDelta: IndicatorDelta | null =
    activePreviewSide === 'left'
      ? leftScaledPreview
      : activePreviewSide === 'right'
      ? rightScaledPreview
      : null;

  const commitThreshold = getCommitThreshold();
  const isReadyToCommit = Math.abs(dragX) >= commitThreshold;
  const dragProgressPct = Math.min(100, Math.round((Math.abs(dragX) / commitThreshold) * 100));

  const effectiveDragX =
    dragX !== 0
      ? dragX
      : keyboardPreviewSide === 'left'
      ? -44
      : keyboardPreviewSide === 'right'
      ? 44
      : 0;

  const rotation =
    exitDirection === 'left'
      ? -14
      : exitDirection === 'right'
      ? 14
      : Math.max(-11, Math.min(11, effectiveDragX * 0.055));

  const translateX =
    exitDirection === 'left'
      ? -340
      : exitDirection === 'right'
      ? 340
      : effectiveDragX;

  const opacity = exitDirection ? 0 : 1;

  const pillarItems = [
    { key: 'people' as const, label: language === 'en' ? 'People' : 'Halk' },
    { key: 'military' as const, label: language === 'en' ? 'Military' : 'Askerî' },
    { key: 'treasury' as const, label: language === 'en' ? 'Treasury' : 'Hazine' },
    { key: 'nobles' as const, label: language === 'en' ? 'Nobles' : 'Soylular' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center px-2.5 sm:px-3 pointer-events-auto">
      {/* Central Reigns-style Parchment & Dark Stone Decision Card */}
      <div
        data-testid="decision-card"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => finishDrag(0)}
        style={{
          touchAction: 'none',
          transform: `translate3d(${translateX}px, 0, 0) rotate(${rotation}deg)`,
          opacity,
          transition: isDragging
            ? 'none'
            : 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease',
        }}
        className={`w-full bg-[#17141d] border-2 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-3.5 sm:p-5 cursor-grab active:cursor-grabbing relative overflow-hidden ${
          activePreviewSide === 'left'
            ? 'border-[#f59e0b]'
            : activePreviewSide === 'right'
            ? 'border-[#38bdf8]'
            : 'border-[#b48e4b]/65'
        }`}
      >
        {/* Subtle top decorative gold trim or live drag progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent" />
        {isDragging && Math.abs(dragX) >= PREVIEW_THRESHOLD_PX && (
          <div
            className={`absolute top-0 left-0 h-1.5 transition-all ${
              isReadyToCommit ? 'bg-[#34d399]' : 'bg-[#f59e0b]'
            }`}
            style={{ width: `${dragProgressPct}%` }}
          />
        )}

        {/* Live Balance Impact Banner inside Card (Visible on both Mobile Drag, 2-Tap & Keyboard Preview) */}
        {activePreviewSide && activePreviewDelta && (
          <div
            data-testid={
              activePreviewSide === 'left' ? 'card-preview-badge-left' : 'card-preview-badge-right'
            }
            className={`mb-2.5 px-2.5 py-1.5 rounded-lg border text-xs flex flex-col gap-1 shadow-lg ${
              activePreviewSide === 'left'
                ? 'border-[#f59e0b]/80 bg-[#1c140a]/95 text-[#fbbf24]'
                : 'border-[#38bdf8]/80 bg-[#0a1824]/95 text-[#38bdf8]'
            }`}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="font-bold tracking-wide text-[11px] sm:text-xs">
                {keyboardPreviewSide === 'left'
                  ? language === 'en'
                    ? '← PREVIEW: Tap or press [A / ←] again to confirm'
                    : '← ÖNİZLEME: Onaylamak için tekrar dokun veya [A / ←] bas'
                  : keyboardPreviewSide === 'right'
                  ? language === 'en'
                    ? 'PREVIEW: Tap or press [D / →] again to confirm →'
                    : 'ÖNİZLEME: Onaylamak için tekrar dokun veya [D / →] bas →'
                  : isReadyToCommit
                  ? activePreviewSide === 'left'
                    ? language === 'en'
                      ? '✓ RELEASE TO CONFIRM LEFT CHOICE'
                      : '✓ SOL KARARI VERMEK İÇİN BIRAK'
                    : language === 'en'
                    ? '✓ RELEASE TO CONFIRM RIGHT CHOICE'
                    : '✓ SAĞ KARARI VERMEK İÇİN BIRAK'
                  : activePreviewSide === 'left'
                  ? language === 'en'
                    ? '← PREVIEWING LEFT (Slide further to confirm)'
                    : '← SOL SEÇENEK (Karar için biraz daha kaydır)'
                  : language === 'en'
                  ? 'PREVIEWING RIGHT (Slide further to confirm) →'
                  : 'SAĞ SEÇENEK (Karar için biraz daha kaydır) →'}
              </span>

              {/* Mini 4-Pillar Impact Badges right on the card */}
              <div className="flex items-center gap-1.5 font-mono-tabular text-[10px] sm:text-[11px]">
                {pillarItems.map((p) => {
                  const d = activePreviewDelta[p.key] ?? 0;
                  if (d === 0) return null;
                  const isPos = d > 0;
                  const arrows = isPos
                    ? Math.abs(d) >= 7
                      ? '▲▲'
                      : '▲'
                    : Math.abs(d) >= 7
                    ? '▼▼'
                    : '▼';
                  return (
                    <span
                      key={p.key}
                      className={`px-1.5 py-0.5 rounded font-bold border ${
                        isPos
                          ? 'bg-[#064e3b] text-[#34d399] border-[#34d399]/50'
                          : 'bg-[#450a0a] text-[#f87171] border-[#f87171]/50'
                      }`}
                    >
                      {p.label} {arrows}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Top Metadata Line (Unboxed clean text with · separators) */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-[#a89b84] mb-2 sm:mb-3 flex-wrap">
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
        <div className="flex items-center gap-3 pb-2.5 sm:pb-3.5 border-b border-[#b48e4b]/25">
          <button
            type="button"
            onClick={() => onInspectCharacter(charDef.id)}
            className="group relative focus:outline-none shrink-0"
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
                className="text-left text-sm sm:text-lg font-bold font-display text-[#f5ebd6] hover:text-[#d4af37] transition-colors truncate"
              >
                {charDef.name}
              </button>
              <span
                className="font-mono-tabular text-[11px] sm:text-xs font-medium shrink-0"
                style={{ color: relTier.color }}
              >
                {relTier.label} ({relScore > 0 ? `+${relScore}` : relScore})
              </span>
            </div>

            <p className="text-[11px] sm:text-xs text-[#b8a990] truncate mt-0.5">
              {charDef.title} · {charDef.house}
            </p>

            <p
              data-testid="card-title"
              className="text-[11px] sm:text-xs text-[#d4af37]/90 font-semibold mt-1 truncate"
            >
              {localizedCard.title}
            </p>
          </div>
        </div>

        {/* Story Narrative Body */}
        <div className="py-2.5 sm:py-4 min-h-[82px] sm:min-h-[108px] flex items-center">
          <p
            data-testid="card-story-text"
            className="text-xs sm:text-base leading-relaxed text-[#efe5d1] font-normal"
          >
            {storyText}
          </p>
        </div>

        {/* Subtle Swipe Hint Footer Inside Card */}
        <div className="pt-2 border-t border-[#b48e4b]/15 flex items-center justify-between text-[10px] sm:text-[11px] text-[#8c7e6a]">
          <span>
            {language === 'en'
              ? '← Slide slowly to preview balances'
              : '← Dengeleri görmek için yavaşça sola kaydır'}
          </span>
          <span>
            {language === 'en'
              ? 'Slide slowly right to preview →'
              : 'Yavaşça sağa kaydır →'}
          </span>
        </div>
      </div>

      {/* Explicit Clickable Left & Right Decision Buttons Below Card (Side-by-Side on Mobile & Desktop) */}
      <div className="w-full grid grid-cols-2 gap-2 sm:gap-2.5 mt-2 sm:mt-3">
        <button
          type="button"
          data-testid="choice-left-btn"
          onPointerDown={(e) => {
            buttonPointerTypeRef.current = e.pointerType || 'mouse';
          }}
          onClick={() => handleOptionButtonClick('left')}
          onMouseEnter={() => {
            if (buttonPointerTypeRef.current !== 'touch') {
              onPreviewDelta(leftScaledPreview);
            }
          }}
          onMouseLeave={() => {
            if (!keyboardPreviewSide && buttonPointerTypeRef.current !== 'touch') {
              onPreviewDelta(null);
            }
          }}
          className={`group text-left px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg transition-all shadow-md flex flex-col justify-between border ${
            activePreviewSide === 'left'
              ? 'bg-[#281e12] border-[#fbbf24] ring-2 ring-[#fbbf24]/50'
              : 'bg-[#18141f] hover:bg-[#241d2e] border-[#b48e4b]/45 hover:border-[#d4af37]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#d4af37] font-semibold mb-1 gap-1">
            <span className="truncate">
              {activePreviewSide === 'left'
                ? language === 'en'
                  ? '← CONFIRM OPTION A'
                  : '← SEÇENEK A (ONAYLA)'
                : language === 'en'
                ? '← OPTION A'
                : '← SEÇENEK A'}
            </span>
            <span className="hidden sm:inline font-mono-tabular text-[#9c8e78] shrink-0">
              [A / ←]
            </span>
          </div>
          <p className="text-[11px] sm:text-sm text-[#f3e9d2] font-medium leading-snug">
            {leftLabel}
          </p>
        </button>

        <button
          type="button"
          data-testid="choice-right-btn"
          onPointerDown={(e) => {
            buttonPointerTypeRef.current = e.pointerType || 'mouse';
          }}
          onClick={() => handleOptionButtonClick('right')}
          onMouseEnter={() => {
            if (buttonPointerTypeRef.current !== 'touch') {
              onPreviewDelta(rightScaledPreview);
            }
          }}
          onMouseLeave={() => {
            if (!keyboardPreviewSide && buttonPointerTypeRef.current !== 'touch') {
              onPreviewDelta(null);
            }
          }}
          className={`group text-left px-2.5 py-2 sm:px-4 sm:py-3 rounded-lg transition-all shadow-md flex flex-col justify-between border ${
            activePreviewSide === 'right'
              ? 'bg-[#102330] border-[#38bdf8] ring-2 ring-[#38bdf8]/50'
              : 'bg-[#18141f] hover:bg-[#241d2e] border-[#b48e4b]/45 hover:border-[#d4af37]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-[#38bdf8] font-semibold mb-1 gap-1">
            <span className="truncate">
              {activePreviewSide === 'right'
                ? language === 'en'
                  ? 'CONFIRM OPTION B →'
                  : 'SEÇENEK B (ONAYLA) →'
                : language === 'en'
                ? 'OPTION B →'
                : 'SEÇENEK B →'}
            </span>
            <span className="hidden sm:inline font-mono-tabular text-[#9c8e78] shrink-0">
              [D / →]
            </span>
          </div>
          <p className="text-[11px] sm:text-sm text-[#f3e9d2] font-medium leading-snug">
            {rightLabel}
          </p>
        </button>
      </div>
    </div>
  );
};
