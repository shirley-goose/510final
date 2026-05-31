/** Client hint: matches server polling expectations (UX only). */
export const GENERATION_POLL_INTERVAL_MS = 10_000;

/** Client: stop showing "normal" wait after this and show slow/timeout copy. */
export const GENERATION_UI_SOFT_TIMEOUT_MS = 120_000;

/** Server: mark job failed if still running after this from generation_started_at. */
export const GENERATION_SERVER_DEADLINE_MS = 10 * 60_000;

/** Default: 3D AI Studio. Use `meshy` only if you set MESHY_API_KEY + AI_3D_PROVIDER=meshy. */
export function getActiveAiProvider(): 'meshy' | '3daistudio' {
  const raw = process.env.AI_3D_PROVIDER?.trim().toLowerCase();
  if (raw === 'meshy') return 'meshy';
  return '3daistudio';
}
