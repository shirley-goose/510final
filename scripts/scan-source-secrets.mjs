#!/usr/bin/env node
/**
 * Scans application source (not node_modules / .next) for obvious hardcoded secrets.
 * Complements `security:scan-bundles` (client chunks after build). Run: npm run security:scan-source
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();

const SKIP_DIR = new Set([
  'node_modules',
  '.next',
  '.git',
  'dist',
  'coverage',
]);

const EXT = new Set(['.ts', '.tsx', '.mjs', '.js']);

/** Obvious hardcoded secrets (narrow names to avoid e.g. MESHY_BASE public URL). */
const HARDCODED_ASSIGN = [
  /^\s*(?:export\s+)?(?:const|let|var)\s+MESHY_API_KEY\s*=\s*['"][^'"]{8,}['"]/m,
  /^\s*(?:export\s+)?(?:const|let|var)\s+THREED_AI_STUDIO_API_KEY\s*=\s*['"][^'"]{8,}['"]/m,
  /^\s*SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]{12,}['"]/m,
];

function walk(dir, acc = []) {
  let st;
  try {
    st = statSync(dir);
  } catch {
    return acc;
  }
  if (!st.isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else {
      const ext = name.slice(name.lastIndexOf('.'));
      if (EXT.has(ext) && !name.includes('.test.') && !name.endsWith('.config.ts')) acc.push(p);
    }
  }
  return acc;
}

function main() {
  const dirs = [join(ROOT, 'app'), join(ROOT, 'lib'), join(ROOT, 'components')].filter((d) => {
      try {
        return statSync(d).isDirectory();
      } catch {
        return false;
      }
    });

  const files = [];
  for (const d of dirs) walk(d, files);

  /** @type {{ file: string; reason: string }[]} */
  const hits = [];

  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const re of HARDCODED_ASSIGN) {
      re.lastIndex = 0;
      if (re.test(src)) {
        hits.push({
          file: relative(ROOT, file),
          reason: `possible hardcoded secret (${re.source.slice(0, 40)}…)`,
        });
        break;
      }
    }
  }

  if (hits.length) {
    console.error('security:scan-source: suspicious patterns:\n');
    for (const h of hits) console.error(`  ${h.file} — ${h.reason}`);
    process.exit(1);
  }

  console.log(`security:scan-source: OK (${files.length} source files scanned).`);
}

main();
