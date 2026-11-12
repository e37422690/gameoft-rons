import React from 'react';
import { CHARACTER_MAP, CHARACTERS } from '../data/characters';
import { CharacterMood } from '../types/game';

interface CharacterPortraitProps {
  characterId: string;
  mood?: CharacterMood;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CharacterPortraitProps['size']>, string> = {
  sm: 'w-12 h-12',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-28 h-28',
};

export const CharacterPortrait: React.FC<CharacterPortraitProps> = ({
  characterId,
  mood = 'normal',
  size = 'lg',
  className = '',
}) => {
  const charDef = CHARACTER_MAP[characterId] || CHARACTERS[0];
  const p = charDef.portrait;

  // Mood-specific eyebrow & mouth geometry
  const getBrowPaths = () => {
    switch (mood) {
      case 'angry':
      case 'threatening':
        return (
          <>
            <path d="M35 44 L46 48" stroke="#18181b" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M65 44 L54 48" stroke="#18181b" strokeWidth="2.6" strokeLinecap="round" />
          </>
        );
      case 'suspicious':
        return (
          <>
            <path d="M35 47 L46 46" stroke="#18181b" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M54 44 L65 42" stroke="#18181b" strokeWidth="2.4" strokeLinecap="round" />
          </>
        );
      case 'sad':
      case 'afraid':
        return (
          <>
            <path d="M35 48 L46 45" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M65 48 L54 45" stroke="#18181b" strokeWidth="2.2" strokeLinecap="round" />
          </>
        );
      case 'happy':
      default:
        return (
          <>
            <path d="M35 45 Q40 43 46 45" stroke="#18181b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M54 45 Q60 43 65 45" stroke="#18181b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        );
    }
  };

  const getMouthPath = () => {
    switch (mood) {
      case 'happy':
        return <path d="M43 65 Q50 70 57 65" stroke="#451a03" strokeWidth="2.4" fill="none" strokeLinecap="round" />;
      case 'angry':
      case 'threatening':
        return <path d="M43 67 Q50 63 57 67" stroke="#451a03" strokeWidth="2.6" fill="none" strokeLinecap="round" />;
      case 'sad':
        return <path d="M44 68 Q50 64 56 68" stroke="#451a03" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
      case 'afraid':
        return <ellipse cx="50" cy="66" rx="4.5" ry="3" fill="#27272a" stroke="#451a03" strokeWidth="1.5" />;
      case 'suspicious':
        return <path d="M44 66 L56 65" stroke="#451a03" strokeWidth="2.2" strokeLinecap="round" />;
      default:
        return <path d="M44 66 Q50 67 56 66" stroke="#451a03" strokeWidth="2.2" fill="none" strokeLinecap="round" />;
    }
  };

  const renderSigilGlyph = () => {
    switch (p.sigil) {
      case 'wolf':
        return <path d="M46 88 L50 82 L54 88 L52 93 L48 93 Z" fill={p.accentColor} />;
      case 'dragon':
        return <path d="M44 87 Q50 80 56 87 Q53 93 50 94 Q47 93 44 87 Z" fill={p.accentColor} />;
      case 'lion':
        return <circle cx="50" cy="88" r="5" fill={p.accentColor} />;
      case 'stag':
        return <path d="M45 84 L50 91 L55 84 M50 86 L50 94" stroke={p.accentColor} strokeWidth="2.2" fill="none" />;
      case 'rose':
        return <circle cx="50" cy="88" r="4.5" fill="#fbbf24" stroke="#10b981" strokeWidth="1.5" />;
      case 'sun':
        return <circle cx="50" cy="88" r="5" fill="#f97316" stroke="#facc15" strokeWidth="1.5" />;
      case 'kraken':
        return <path d="M45 92 Q50 82 55 92 M47 93 L50 86 L53 93" stroke={p.accentColor} strokeWidth="2" fill="none" />;
      default:
        return <polygon points="50,83 55,88 50,93 45,88" fill={p.accentColor} />;
    }
  };

  return (
    <div
      className={`relative rounded-full overflow-hidden border-2 border-[#b48e4b]/70 shadow-[0_0_20px_rgba(0,0,0,0.85)] bg-[#121017] shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      title={`${charDef.name} (${charDef.house})`}
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <radialGradient id={`bg_${characterId}`} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={p.cloakColor} />
            <stop offset="100%" stopColor="#09080c" />
          </radialGradient>
        </defs>

        {/* Background vignette */}
        <rect width="100" height="100" fill={`url(#bg_${characterId})`} />

        {/* Subtle gothic arch halo */}
        <circle cx="50" cy="48" r="36" fill="none" stroke={p.accentColor} strokeOpacity="0.22" strokeWidth="1" />

        {/* Back hair for long/wavy/braided styles */}
        {(p.hairStyle === 'long' || p.hairStyle === 'wavy' || p.hairStyle === 'braided') && (
          <path
            d="M26 42 Q22 68 28 84 L72 84 Q78 68 74 42 Z"
            fill={p.hairColor}
          />
        )}

        {/* Shoulders & Cloak */}
        <path
          d="M14 100 Q18 74 36 72 L64 72 Q82 74 86 100 Z"
          fill={p.cloakColor}
          stroke="#09080c"
          strokeWidth="1.5"
        />
        <path
          d="M28 100 L36 73 L64 73 L72 100 Z"
          fill={p.attireColor}
        />
        {/* Collar / Armor trim */}
        <path
          d="M36 73 L50 84 L64 73"
          fill="none"
          stroke={p.accentColor}
          strokeWidth="2"
        />

        {/* Neck */}
        <rect x="43" y="64" width="14" height="13" rx="4" fill={p.skinTone} />

        {/* Head Base */}
        <path
          d="M31 42 C31 26 69 26 69 42 C69 59 60 72 50 72 C40 72 31 59 31 42 Z"
          fill={p.skinTone}
          stroke="#18181b"
          strokeWidth="1.2"
        />

        {/* Scars */}
        {p.scar === 'left_eye' && (
          <path d="M39 39 L41 55" stroke="#7f1d1d" strokeWidth="1.6" strokeOpacity="0.75" />
        )}
        {p.scar === 'nose' && (
          <path d="M43 52 L57 56" stroke="#7f1d1d" strokeWidth="1.8" strokeOpacity="0.8" />
        )}
        {p.scar === 'burn_right' && (
          <path
            d="M54 34 Q67 40 66 60 Q58 67 54 56 Z"
            fill="#7f1d1d"
            fillOpacity="0.45"
          />
        )}

        {/* Facial Hair */}
        {p.facialHair === 'full_beard' && (
          <path
            d="M31 50 Q32 72 50 75 Q68 72 69 50 Q63 62 50 62 Q37 62 31 50 Z"
            fill={p.hairColor}
          />
        )}
        {p.facialHair === 'stubble' && (
          <path
            d="M32 52 Q34 70 50 72 Q66 70 68 52 Q62 61 50 61 Q38 61 32 52 Z"
            fill={p.hairColor}
            fillOpacity="0.38"
          />
        )}
        {p.facialHair === 'goatee' && (
          <path
            d="M42 60 Q50 74 58 60 Q54 63 50 63 Q46 63 42 60 Z"
            fill={p.hairColor}
          />
        )}

        {/* Eyes */}
        <ellipse cx="41" cy="49" rx="3.2" ry={mood === 'afraid' ? 3.4 : 2.3} fill="#f8fafc" />
        <ellipse cx="59" cy="49" rx="3.2" ry={mood === 'afraid' ? 3.4 : 2.3} fill="#f8fafc" />
        <circle cx="41" cy="49" r="1.8" fill={p.eyeColor} />
        <circle cx="59" cy="49" r="1.8" fill={p.eyeColor} />

        {/* Eyebrows */}
        {getBrowPaths()}

        {/* Nose */}
        <path d="M50 48 L48 57 L52 57" fill="none" stroke="#451a03" strokeWidth="1.6" strokeLinecap="round" />

        {/* Mouth */}
        {getMouthPath()}

        {/* Top Hair */}
        {p.hairStyle === 'short' && (
          <path
            d="M30 42 C30 24 70 24 70 42 C66 33 34 33 30 42 Z"
            fill={p.hairColor}
          />
        )}
        {(p.hairStyle === 'long' || p.hairStyle === 'wavy' || p.hairStyle === 'braided') && (
          <path
            d="M28 45 C28 22 72 22 72 45 C65 32 50 31 35 34 Z"
            fill={p.hairColor}
          />
        )}
        {p.hairStyle === 'crown_veil' && (
          <path
            d="M24 44 C24 18 76 18 76 44 L78 82 L68 82 L68 38 L32 38 L32 82 L22 82 Z"
            fill="#065f46"
            stroke="#d4af37"
            strokeWidth="1.5"
          />
        )}
        {p.hairStyle === 'ice_horns' && (
          <g fill="#bae6fd" stroke="#38bdf8" strokeWidth="1">
            <polygon points="35,28 38,16 42,27" />
            <polygon points="47,26 50,13 53,26" />
            <polygon points="58,27 62,16 65,28" />
          </g>
        )}

        {/* Headgear / Crowns */}
        {p.headgear === 'crown_gold' && (
          <polygon
            points="32,31 37,20 44,28 50,17 56,28 63,20 68,31"
            fill="#eab308"
            stroke="#713f12"
            strokeWidth="1.2"
          />
        )}
        {p.headgear === 'crown_stag' && (
          <polygon
            points="31,31 35,19 42,27 50,15 58,27 65,19 69,31"
            fill="#facc15"
            stroke="#422006"
            strokeWidth="1.4"
          />
        )}
        {p.headgear === 'crown_winter' && (
          <rect x="33" y="25" width="34" height="6" rx="1" fill="#94a3b8" stroke="#1e293b" strokeWidth="1.2" />
        )}
        {p.headgear === 'circlet' && (
          <path d="M32 30 Q50 35 68 30" fill="none" stroke="#eab308" strokeWidth="2.2" />
        )}
        {p.headgear === 'helm' && (
          <path
            d="M29 44 C29 22 71 22 71 44 L68 52 L60 40 L40 40 L32 52 Z"
            fill="#52525b"
            stroke="#27272a"
            strokeWidth="1.5"
          />
        )}
        {p.headgear === 'maester_chain' && (
          <path
            d="M36 74 Q50 88 64 74"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3.5"
            strokeDasharray="3 2"
          />
        )}

        {/* Sigil Medallion on Cloak */}
        <circle cx="50" cy="88" r="7.5" fill="#18181b" stroke={p.accentColor} strokeWidth="1.4" />
        {renderSigilGlyph()}
      </svg>
    </div>
  );
};
