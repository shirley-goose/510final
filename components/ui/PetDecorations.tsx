import type { CSSProperties } from 'react';

type DecoProps = { size?: number; color?: string; className?: string; style?: CSSProperties };

/** Inline SVG pet illustrations used as page decorations. */

export function DogSitting({ size = 120, color = '#c8915a', className = '', style }: DecoProps) {
  const ear = '#a06838';
  const dark = '#2d1a0e';
  const light = '#e8b07a';
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none" className={className} style={style} aria-hidden>
      {/* tail */}
      <path d="M74 82 Q92 68 85 52" stroke={color} strokeWidth="9" fill="none" strokeLinecap="round"/>
      {/* body */}
      <ellipse cx="50" cy="82" rx="28" ry="28" fill={color}/>
      {/* ears */}
      <ellipse cx="31" cy="37" rx="11" ry="15" fill={ear} transform="rotate(-18 31 37)"/>
      <ellipse cx="69" cy="37" rx="11" ry="15" fill={ear} transform="rotate(18 69 37)"/>
      {/* head */}
      <circle cx="50" cy="44" r="22" fill={color}/>
      {/* snout */}
      <ellipse cx="50" cy="52" rx="9" ry="7" fill={light}/>
      {/* eyes */}
      <circle cx="42" cy="41" r="4" fill={dark}/>
      <circle cx="58" cy="41" r="4" fill={dark}/>
      <circle cx="43.5" cy="39.5" r="1.2" fill="white"/>
      <circle cx="59.5" cy="39.5" r="1.2" fill="white"/>
      {/* nose */}
      <ellipse cx="50" cy="50" rx="4.5" ry="3" fill={dark}/>
      {/* mouth */}
      <path d="M46 55 Q50 59 54 55" stroke={dark} strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      {/* paws */}
      <ellipse cx="37" cy="106" rx="11" ry="7" fill={ear}/>
      <ellipse cx="63" cy="106" rx="11" ry="7" fill={ear}/>
      {/* collar */}
      <rect x="36" y="63" width="28" height="6" rx="3" fill="#ff8c2a"/>
      <circle cx="50" cy="66" r="2.5" fill="#ffce7a"/>
    </svg>
  );
}

export function DogRunning({ size = 100, color = '#d4a96a', className = '', style }: DecoProps) {
  const ear = '#a07040';
  const dark = '#2d1a0e';
  const light = '#eec090';
  return (
    <svg width={size} height={size * 0.85} viewBox="0 0 120 102" fill="none" className={className} style={style} aria-hidden>
      {/* tail up */}
      <path d="M108 30 Q118 12 105 6" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"/>
      {/* body */}
      <ellipse cx="70" cy="58" rx="36" ry="22" fill={color}/>
      {/* head */}
      <circle cx="28" cy="42" r="20" fill={color}/>
      {/* ear floppy */}
      <ellipse cx="22" cy="28" rx="9" ry="13" fill={ear} transform="rotate(-20 22 28)"/>
      {/* snout */}
      <ellipse cx="14" cy="46" rx="9" ry="7" fill={light}/>
      {/* eye */}
      <circle cx="24" cy="40" r="3.5" fill={dark}/>
      <circle cx="25.2" cy="38.8" r="1" fill="white"/>
      {/* nose */}
      <ellipse cx="12" cy="44" rx="4" ry="2.8" fill={dark}/>
      {/* legs */}
      <rect x="44" y="72" width="10" height="22" rx="5" fill={ear} transform="rotate(-15 44 72)"/>
      <rect x="62" y="74" width="10" height="22" rx="5" fill={ear} transform="rotate(10 62 74)"/>
      <rect x="82" y="72" width="10" height="22" rx="5" fill={ear} transform="rotate(-8 82 72)"/>
      <rect x="98" y="68" width="10" height="22" rx="5" fill={ear} transform="rotate(18 98 68)"/>
      {/* spots */}
      <circle cx="78" cy="52" r="8" fill={ear} opacity="0.5"/>
      <circle cx="58" cy="62" r="5" fill={ear} opacity="0.4"/>
    </svg>
  );
}

export function CatSitting({ size = 100, color = '#9b8ec4', className = '', style }: DecoProps) {
  const dark = '#2d1a0e';
  const inner = '#f9a8b4';
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 100 110" fill="none" className={className} style={style} aria-hidden>
      {/* tail curl */}
      <path d="M68 90 Q88 95 85 78 Q82 65 72 72" stroke={color} strokeWidth="8" fill="none" strokeLinecap="round"/>
      {/* body */}
      <ellipse cx="48" cy="80" rx="26" ry="26" fill={color}/>
      {/* ears pointy */}
      <polygon points="30,30 22,10 40,26" fill={color}/>
      <polygon points="68,30 78,10 60,26" fill={color}/>
      <polygon points="31,29 25,15 39,27" fill={inner}/>
      <polygon points="67,29 75,15 61,27" fill={inner}/>
      {/* head */}
      <circle cx="48" cy="38" r="22" fill={color}/>
      {/* eyes — almond */}
      <ellipse cx="40" cy="36" rx="5" ry="4" fill={dark}/>
      <ellipse cx="56" cy="36" rx="5" ry="4" fill={dark}/>
      <circle cx="41.5" cy="34.5" r="1.5" fill="white"/>
      <circle cx="57.5" cy="34.5" r="1.5" fill="white"/>
      {/* nose tiny triangle */}
      <polygon points="48,44 45,48 51,48" fill={inner}/>
      {/* whiskers */}
      <line x1="26" y1="45" x2="42" y2="47" stroke={dark} strokeWidth="1" opacity="0.5"/>
      <line x1="26" y1="49" x2="42" y2="49" stroke={dark} strokeWidth="1" opacity="0.5"/>
      <line x1="70" y1="45" x2="54" y2="47" stroke={dark} strokeWidth="1" opacity="0.5"/>
      <line x1="70" y1="49" x2="54" y2="49" stroke={dark} strokeWidth="1" opacity="0.5"/>
      {/* paws */}
      <ellipse cx="36" cy="104" rx="10" ry="6" fill={color} opacity="0.8"/>
      <ellipse cx="60" cy="104" rx="10" ry="6" fill={color} opacity="0.8"/>
    </svg>
  );
}

export function PawPrint({ size = 40, color = '#ffb56a', className = '', style }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" fill={color} className={className} style={style} aria-hidden>
      <ellipse cx="30" cy="36" rx="14" ry="12"/>
      <circle cx="14" cy="20" r="7"/>
      <circle cx="30" cy="15" r="7"/>
      <circle cx="46" cy="20" r="7"/>
    </svg>
  );
}

export function Bone({ size = 48, color = '#ffd9a8', className = '', style }: DecoProps) {
  return (
    <svg width={size} height={size * 0.45} viewBox="0 0 110 50" fill={color} className={className} style={style} aria-hidden>
      <circle cx="15" cy="15" r="12"/>
      <circle cx="15" cy="35" r="12"/>
      <circle cx="95" cy="15" r="12"/>
      <circle cx="95" cy="35" r="12"/>
      <rect x="15" y="17" width="80" height="16" rx="8"/>
    </svg>
  );
}

export function Star({ size = 32, color = '#ffd166', className = '', style }: DecoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill={color} className={className} style={style} aria-hidden>
      <polygon points="25,3 31,18 47,18 34,28 39,44 25,34 11,44 16,28 3,18 19,18"/>
    </svg>
  );
}
