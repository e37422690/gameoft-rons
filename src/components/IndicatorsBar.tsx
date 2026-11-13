import React from 'react';
import { GameLanguage, IndicatorDelta, IndicatorKey, Indicators } from '../types/game';

interface IndicatorsBarProps {
  indicators: Indicators;
  lastDelta: IndicatorDelta | null;
  previewDelta: IndicatorDelta | null;
  language?: GameLanguage;
}

const INDICATOR_META: Array<{
  key: IndicatorKey;
  labelTr: string;
  shortTr: string;
  labelEn: string;
  shortEn: string;
  accent: string;
}> = [
  {
    key: 'people',
    labelTr: 'Halkın Desteği',
    shortTr: 'Halk',
    labelEn: 'Support of the People',
    shortEn: 'People',
    accent: '#38bdf8',
  },
  {
    key: 'military',
    labelTr: 'Askerî Güç',
    shortTr: 'Askerî',
    labelEn: 'Military Might',
    shortEn: 'Military',
    accent: '#ef4444',
  },
  {
    key: 'treasury',
    labelTr: 'Hazine',
    shortTr: 'Hazine',
    labelEn: 'Royal Treasury',
    shortEn: 'Treasury',
    accent: '#eab308',
  },
  {
    key: 'nobles',
    labelTr: 'Soyluların Desteği',
    shortTr: 'Soylular',
    labelEn: 'Support of the Nobles',
    shortEn: 'Nobles',
    accent: '#a855f7',
  },
];

function renderIndicatorSvgIcon(key: IndicatorKey, isCritical: boolean) {
  const strokeColor = isCritical ? '#ef4444' : '#e8dcc4';
  switch (key) {
    case 'people':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke={strokeColor} strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" fill="rgba(56, 189, 248, 0.2)" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'military':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke={strokeColor} strokeWidth="1.8">
          <path d="M14.5 17.5L3 6V3h3l11.5 11.5" fill="rgba(239, 68, 68, 0.2)" />
          <path d="M13 19l6-6" />
          <path d="M16 16l4 4" />
          <path d="M19 21l2-2" />
          <path d="M9.5 6.5L21 18v3h-3L6.5 9.5" />
        </svg>
      );
    case 'treasury':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke={strokeColor} strokeWidth="1.8">
          <circle cx="12" cy="12" r="8" fill="rgba(234, 179, 8, 0.2)" />
          <path d="M12 8v8" />
          <path d="M9.5 10.5c0-1.1 1.1-2 2.5-2s2.5.9 2.5 2-1.1 1.5-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.9 2.5-2" />
        </svg>
      );
    case 'nobles':
      return (
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" fill="none" stroke={strokeColor} strokeWidth="1.8">
          <path
            d="M3 18h18l-2-11-5 4-2-6-2 6-5-4-2 11z"
            fill="rgba(168, 85, 247, 0.22)"
          />
          <path d="M4 21h16" />
        </svg>
      );
  }
}

export const IndicatorsBar: React.FC<IndicatorsBarProps> = ({
  indicators,
  lastDelta,
  previewDelta,
  language = 'tr',
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-3 pt-1.5 sm:pt-2 pointer-events-auto">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-[#121017]/95 border border-[#b48e4b]/45 rounded-lg p-1.5 sm:p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
        {INDICATOR_META.map((item) => {
          const val = Math.round(indicators[item.key]);
          const deltaVal = lastDelta?.[item.key] ?? 0;
          const previewVal = previewDelta?.[item.key] ?? 0;
          const isCriticalLow = val <= 20;
          const isHighWarning = val >= 92;
          const fullLabel = language === 'en' ? item.labelEn : item.labelTr;
          const shortLabel = language === 'en' ? item.shortEn : item.shortTr;
          const projectedVal = Math.max(0, Math.min(100, val + previewVal));

          return (
            <div
              key={item.key}
              data-testid={`indicator-${item.key}`}
              className={`relative flex flex-col justify-between px-1.5 py-1 sm:px-2.5 sm:py-1.5 rounded border transition-all duration-150 ${
                previewVal !== 0
                  ? previewVal > 0
                    ? 'bg-[#112921] border-[#34d399] shadow-[0_0_14px_rgba(52,211,153,0.3)] -translate-y-0.5'
                    : 'bg-[#2d1116] border-[#f87171] shadow-[0_0_14px_rgba(248,113,113,0.3)] -translate-y-0.5'
                  : isCriticalLow
                  ? 'bg-[#2a0c10] border-[#ef4444]/80'
                  : isHighWarning
                  ? 'bg-[#231c0d] border-[#eab308]/60'
                  : 'bg-[#18151f] border-[#b48e4b]/20'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  {renderIndicatorSvgIcon(item.key, isCriticalLow)}
                  <span className="hidden sm:inline text-[11px] font-semibold tracking-wider text-[#cbbfa8] truncate">
                    {fullLabel}
                  </span>
                  <span className="sm:hidden text-[10px] font-bold tracking-wide text-[#e8dcc4] truncate">
                    {shortLabel}
                  </span>
                </div>

                {/* Preview impact indicator when hovering/dragging or pressing A/D once */}
                {previewVal !== 0 && (
                  <span
                    data-testid={`indicator-preview-${item.key}`}
                    className={`font-mono-tabular text-[10px] sm:text-xs font-extrabold px-1 sm:px-1.5 py-0.5 rounded shrink-0 animate-pulse ${
                      previewVal > 0
                        ? 'bg-[#064e3b] text-[#34d399] border border-[#34d399]/60'
                        : 'bg-[#450a0a] text-[#f87171] border border-[#f87171]/60'
                    }`}
                    title={
                      language === 'en'
                        ? 'Estimated impact of selected choice'
                        : 'Seçimin tahmini etkisi'
                    }
                  >
                    {previewVal > 0
                      ? Math.abs(previewVal) >= 7
                        ? '▲▲'
                        : '▲'
                      : Math.abs(previewVal) >= 7
                      ? '▼▼'
                      : '▼'}
                  </span>
                )}
              </div>

              {/* Numeric readout & last delta */}
              <div className="flex items-baseline justify-between mt-0.5 sm:mt-1">
                <span
                  data-testid={`indicator-val-${item.key}`}
                  className={`font-mono-tabular text-sm sm:text-xl font-bold leading-none ${
                    previewVal > 0
                      ? 'text-[#6ee7b7]'
                      : previewVal < 0
                      ? 'text-[#fca5a5]'
                      : isCriticalLow
                      ? 'text-[#f87171]'
                      : isHighWarning
                      ? 'text-[#facc15]'
                      : 'text-[#f5ebd6]'
                  }`}
                >
                  {val}
                  <span className="text-[9px] sm:text-[11px] font-normal text-[#8c7e6a]">/100</span>
                </span>

                <div className="flex items-center gap-1">
                  {isCriticalLow && previewVal === 0 && (
                    <span className="hidden md:inline text-[10px] font-semibold text-[#f87171]">
                      {language === 'en' ? 'CRITICAL' : 'KRİTİK'}
                    </span>
                  )}
                  {deltaVal !== 0 && previewVal === 0 && (
                    <span
                      className={`font-mono-tabular text-[10px] sm:text-xs font-semibold ${
                        deltaVal > 0 ? 'text-[#34d399]' : 'text-[#f87171]'
                      }`}
                    >
                      {deltaVal > 0 ? `+${deltaVal}` : deltaVal}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Bar with Live Drag Preview Projection & Ghost Trail */}
              <div className="w-full h-1.5 sm:h-2 bg-[#09080c] rounded-sm overflow-hidden mt-1 sm:mt-1.5 relative border border-white/5">
                {deltaVal < 0 && previewVal === 0 && (
                  <div
                    className="absolute top-0 left-0 h-full bg-[#ef4444]/40 transition-all duration-500"
                    style={{ width: `${Math.min(100, val - deltaVal)}%` }}
                  />
                )}
                {previewVal > 0 && (
                  <div
                    className="absolute top-0 left-0 h-full bg-[#34d399]/65 transition-all duration-150"
                    style={{ width: `${projectedVal}%` }}
                  />
                )}
                <div
                  className="h-full transition-all duration-200 relative z-10"
                  style={{
                    width: `${
                      previewVal < 0 ? projectedVal : Math.max(0, Math.min(100, val))
                    }%`,
                    backgroundColor: isCriticalLow ? '#ef4444' : item.accent,
                  }}
                />
                {previewVal < 0 && (
                  <div
                    className="absolute top-0 h-full bg-[#ef4444]/85 animate-pulse z-20"
                    style={{
                      left: `${projectedVal}%`,
                      width: `${Math.max(0, val - projectedVal)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Last Decision Outcome Explanation Line */}
      {lastDelta?.reason && (
        <div
          data-testid="last-outcome-banner"
          className="mt-1 sm:mt-1.5 px-2.5 py-0.5 sm:py-1 bg-[#14111a]/95 border border-[#b48e4b]/30 rounded text-center text-[11px] sm:text-xs text-[#d8cbb3] truncate"
          title={lastDelta.reason}
        >
          <span className="text-[#d4af37] font-semibold mr-1.5">
            {language === 'en' ? 'Last Outcome:' : 'Son Karar:'}
          </span>
          <span>{lastDelta.reason}</span>
        </div>
      )}
    </div>
  );
};
