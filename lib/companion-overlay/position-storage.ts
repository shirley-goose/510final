import type { CompanionCorner } from './constants';
import { OVERLAY_LS_POSITION } from './constants';

export type SavedOverlayPosition = {
  /** Pixel offset from viewport left */
  left: number;
  /** Pixel offset from viewport top */
  top: number;
};

const MARGIN = 12;

export function cornerInitialPosition(
  corner: CompanionCorner,
  vw: number,
  vh: number,
  boxW: number,
  boxH: number
): SavedOverlayPosition {
  switch (corner) {
    case 'tl':
      return { left: MARGIN, top: MARGIN };
    case 'tr':
      return { left: vw - boxW - MARGIN, top: MARGIN };
    case 'bl':
      return { left: MARGIN, top: vh - boxH - MARGIN };
    case 'br':
    default:
      return { left: vw - boxW - MARGIN, top: vh - boxH - MARGIN };
  }
}

export function clampPosition(
  left: number,
  top: number,
  vw: number,
  vh: number,
  boxW: number,
  boxH: number
): SavedOverlayPosition {
  return {
    left: Math.round(
      Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - boxW - MARGIN))
    ),
    top: Math.round(
      Math.min(Math.max(top, MARGIN), Math.max(MARGIN, vh - boxH - MARGIN))
    ),
  };
}

export function loadSavedOverlayPosition(): SavedOverlayPosition | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OVERLAY_LS_POSITION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    const left = obj.left;
    const top = obj.top;
    if (typeof left === 'number' && typeof top === 'number') {
      return { left, top };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveOverlayPosition(pos: SavedOverlayPosition) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OVERLAY_LS_POSITION, JSON.stringify(pos));
  } catch {
    /* ignore quota / privacy mode */
  }
}
