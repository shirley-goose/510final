import type { CompanionPersonality } from './personalities';

export type BehaviorMode = 'idle' | 'follow' | 'sleep';

/** No mouse movement for this long → companion sleeps. */
export const MOUSE_SLEEP_AFTER_MS = 5 * 60 * 1000;

export type BehaviorAnimParams = {
  /** Larger → companion reaches cursor faster (exponential follow smoothing). */
  followSmoothness: number;
  /** Seconds without movement before we treat cursor as stationary (idle sway). */
  idleAfterStillMs: number;
  /** Base idle sway amplitude (viewer scales radians). */
  idleSwayScale: number;
  /** Idle breathing / sway tempo multiplier. */
  idleSpeed: number;
  /** Tilt toward walk direction multiplier during follow. */
  followLeanScale: number;
  /** Probability per second during idle for a playful flourish (playful only). */
  playfulFlourishChance: number;
};

/** Animation & follow tuning keyed by SPEC personalities. */
export function getBehaviorAnimParams(personality: CompanionPersonality): BehaviorAnimParams {
  switch (personality) {
    case 'active':
      return {
        followSmoothness: 3.2,
        idleAfterStillMs: 220,
        idleSwayScale: 0.75,
        idleSpeed: 1.35,
        followLeanScale: 1.15,
        playfulFlourishChance: 0,
      };
    case 'playful':
      return {
        followSmoothness: 2.55,
        idleAfterStillMs: 260,
        idleSwayScale: 1,
        idleSpeed: 1.2,
        followLeanScale: 1.25,
        playfulFlourishChance: 0.12,
      };
    case 'calm':
    default:
      return {
        followSmoothness: 0.85,
        idleAfterStillMs: 720,
        idleSwayScale: 0.55,
        idleSpeed: 0.65,
        followLeanScale: 0.7,
        playfulFlourishChance: 0,
      };
  }
}

/**
 * Discrete behavior states for the overlay — use one threshold for “cursor active” vs idle sway.
 * Follow runs while mouse is actively moving recently; waking from sleep jumps straight to follow.
 */
export function resolveBehaviorModeWithIdleThreshold(
  nowMs: number,
  lastMouseMoveMs: number,
  idleAfterStillMs: number,
): BehaviorMode {
  const sinceMove = nowMs - lastMouseMoveMs;
  if (sinceMove >= MOUSE_SLEEP_AFTER_MS) return 'sleep';
  if (sinceMove < idleAfterStillMs) return 'follow';
  return 'idle';
}
