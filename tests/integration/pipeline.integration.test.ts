import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateFiles } from '@/lib/uploads/validation';

/**
 * Integration-style checks that do not require a live Supabase or 3D AI Studio instance.
 * Full upload → generate → 3D display is covered by unit tests on API routes + validation,
 * manual QA, and `scripts/scan-client-bundles.mjs` after production build.
 */
describe('pipeline smoke (offline)', () => {
  it('shared validation module gates uploads before API touch', () => {
    expect(validateFiles([]).valid).toBe(false);
  });

  it('client Supabase module on disk does not reference server-only secrets', () => {
    const p = join(process.cwd(), 'lib', 'supabase', 'client.ts');
    expect(existsSync(p)).toBe(true);
    const src = readFileSync(p, 'utf8');
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    expect(src).not.toMatch(/MESHY_API_KEY/);
    expect(src).not.toMatch(/THREED_AI_STUDIO_API_KEY/);
  });
});
