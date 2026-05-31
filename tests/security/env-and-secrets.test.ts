import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * Rubric-oriented security checks: env template, ignore rules, and client/server boundary
 * (no live pentest; pair with SECURITY_REVIEW.md + npm run security:scan-*).
 */
describe('security: .env.example and secret hygiene', () => {
  it('.env.example lists public + server Supabase and AI provider keys (placeholders only)', () => {
    const p = join(process.cwd(), '.env.example');
    expect(existsSync(p)).toBe(true);
    const raw = readFileSync(p, 'utf8');
    expect(raw).toContain('NEXT_PUBLIC_SUPABASE_URL=');
    expect(raw).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY=');
    expect(raw).toContain('SUPABASE_SERVICE_ROLE_KEY=');
    expect(raw).toMatch(/THREED_AI_STUDIO_API_KEY=|MESHY_API_KEY=/);
    // No filled-in secrets in the template (long non-empty value on same line as KEY=)
    const bad = raw
      .split('\n')
      .filter((l) => {
        const t = l.trim();
        if (t.startsWith('#') || !t.includes('=')) return false;
        const v = t.split('=').slice(1).join('=').trim();
        return v.length > 24 && !v.includes('your-') && !v.includes('example');
      });
    expect(bad, '`.env.example` must not contain real-looking secret values').toEqual([]);
  });

  it('.gitignore keeps .env and .env.local out of version control', () => {
    const g = readFileSync(join(process.cwd(), '.gitignore'), 'utf8');
    expect(g).toMatch(/^\.env$/m);
    expect(g).toMatch(/\.env\.local/);
  });

  it('browser Supabase client does not reference server-only env identifiers', () => {
    const p = join(process.cwd(), 'lib', 'supabase', 'client.ts');
    expect(existsSync(p)).toBe(true);
    const src = readFileSync(p, 'utf8');
    expect(src).not.toMatch(/SUPABASE_SERVICE_ROLE/);
    expect(src).not.toMatch(/MESHY_API_KEY/);
    expect(src).not.toMatch(/THREED_AI_STUDIO_API_KEY/);
  });
});

function walkClientFiles(dir: string, acc: string[] = []): string[] {
  const skip = new Set(['node_modules', '.next']);
  let st;
  try {
    st = statSync(dir);
  } catch {
    return acc;
  }
  if (!st.isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkClientFiles(p, acc);
    else if (name.endsWith('.tsx') || name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

function fileStartsWithUseClient(src: string): boolean {
  const firstMeaningful = src
    .trimStart()
    .split(/\r?\n/)
    .find((line) => line.trim().length > 0);
  if (!firstMeaningful) return false;
  const t = firstMeaningful.trim();
  return t === "'use client'" || t === '"use client"';
}

describe('security: client bundle boundary (source-level)', () => {
  it('files marked use client do not reference service-role or provider API key env names', () => {
    const roots = [join(process.cwd(), 'app'), join(process.cwd(), 'components')].filter((d) =>
      existsSync(d)
    );

    const forbidden = [/SUPABASE_SERVICE_ROLE/i, /MESHY_API_KEY/, /THREED_AI_STUDIO_API_KEY/, /process\.env\.SUPABASE_SERVICE/i];

    for (const root of roots) {
      for (const file of walkClientFiles(root)) {
        const src = readFileSync(file, 'utf8');
        if (!fileStartsWithUseClient(src)) continue;
        for (const re of forbidden) {
          expect(
            src,
            `${relative(process.cwd(), file)} must not mention server secrets in client code`
          ).not.toMatch(re);
        }
      }
    }
  });
});
