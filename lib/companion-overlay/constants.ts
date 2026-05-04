export type CompanionCorner = 'tl' | 'tr' | 'bl' | 'br';

/** Sync with CSS (`.companion-overlay` width/height incl. chrome). */
export const OVERLAY_OUTER_WIDTH = 280;
export const OVERLAY_OUTER_HEIGHT = 296;

export const OVERLAY_LS_POSITION = 'pet2companion:overlay-position';
export const LAST_MODEL_LS = 'pet2companion:last-model-url';

/** Browser tabs cannot lift above other desktop apps — use a detached popup for a smaller always-on-browser-stack window (see overlay UI). */

export function readDefaultCorner(): CompanionCorner {
  const raw =
    typeof process.env.NEXT_PUBLIC_DEFAULT_COMPANION_CORNER === 'string'
      ? process.env.NEXT_PUBLIC_DEFAULT_COMPANION_CORNER.toLowerCase().trim()
      : 'br';
  if (raw === 'tl' || raw === 'tr' || raw === 'bl' || raw === 'br') {
    return raw;
  }
  return 'br';
}
