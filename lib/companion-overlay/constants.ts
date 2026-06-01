export type CompanionCorner = 'tl' | 'tr' | 'bl' | 'br';

/** Frameless square canvas — no chrome bar overhead. */
export const OVERLAY_OUTER_WIDTH = 220;
export const OVERLAY_OUTER_HEIGHT = 220;

export const OVERLAY_LS_POSITION = 'pet2companion:overlay-position';
export const LAST_MODEL_LS = 'pet2companion:last-model-url';

export function readDefaultCorner(): CompanionCorner {
  const raw =
    typeof process.env.NEXT_PUBLIC_DEFAULT_COMPANION_CORNER === 'string'
      ? process.env.NEXT_PUBLIC_DEFAULT_COMPANION_CORNER.toLowerCase().trim()
      : 'br';
  if (raw === 'tl' || raw === 'tr' || raw === 'bl' || raw === 'br') return raw;
  return 'br';
}
