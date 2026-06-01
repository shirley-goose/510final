import type { CompanionPersonality } from './personalities';

export type BehaviorMode = 'idle' | 'follow' | 'sleep' | 'walk' | 'chase-tail' | 'roll' | 'seek-user';

/** No mouse movement for this long → companion sleeps. */
export const MOUSE_SLEEP_AFTER_MS = 5 * 60 * 1000;
/** No user interaction for this long → companion seeks user. */
export const SEEK_USER_AFTER_MS = 40 * 60 * 1000;

/** How long each autonomous behavior lasts (ms) before returning to idle. */
export const AUTONOMOUS_DURATION_MS: Partial<Record<BehaviorMode, number>> = {
  walk: 9000,
  'chase-tail': 5500,
  roll: 6000,
  'seek-user': 15000,
};

export type BehaviorAnimParams = {
  followSmoothness: number;
  idleAfterStillMs: number;
  idleSwayScale: number;
  idleSpeed: number;
  followLeanScale: number;
  playfulFlourishChance: number;
  walkChance: number;
  chaseTailChance: number;
  rollChance: number;
};

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
        walkChance: 0.06,        // ~17s average
        chaseTailChance: 0.08,   // ~12s average
        rollChance: 0.05,        // ~20s average
      };
    case 'playful':
      return {
        followSmoothness: 2.55,
        idleAfterStillMs: 260,
        idleSwayScale: 1,
        idleSpeed: 1.2,
        followLeanScale: 1.25,
        playfulFlourishChance: 0.12,
        walkChance: 0.05,        // ~20s average
        chaseTailChance: 0.10,   // ~10s average
        rollChance: 0.07,        // ~14s average
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
        walkChance: 0.033,       // ~30s average
        chaseTailChance: 0.05,   // ~20s average
        rollChance: 0.025,       // ~40s average
      };
  }
}

export function resolveBehaviorModeWithIdleThreshold(
  nowMs: number,
  lastMouseMoveMs: number,
): 'sleep' | 'idle' {
  if (nowMs - lastMouseMoveMs >= MOUSE_SLEEP_AFTER_MS) return 'sleep';
  return 'idle';
}
