#!/usr/bin/env node
/**
 * After `next build`, scans all `.js` files under `.next/static/chunks/` (recursive)
 * for forbidden substrings that would indicate a server-only secret leaked into the browser bundle.
 *
 * Run: npm run security:scan-bundles (expects a prior production build)
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHUNKS_DIR = join(process.cwd(), '.next', 'static', 'chunks');

const FORBIDDEN = [
  { re: /SUPABASE_SERVICE_ROLE_KEY/gi, name: 'SUPABASE_SERVICE_ROLE_KEY' },
  { re: /MESHY_API_KEY/gi, name: 'MESHY_API_KEY' },
  { re: /TRIPO_API_KEY/gi, name: 'TRIPO_API_KEY' },
  { re: /process\.env\.(SUPABASE_SERVICE|MESHY_API|TRIPO_API)/gi, name: 'process.env server key' },
];

function collectJsFiles(dir, acc = []) {
  let st;
  try {
    st = statSync(dir);
  } catch {
    return acc;
  }
  if (!st.isDirectory()) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) collectJsFiles(p, acc);
    else if (name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

function main() {
  const files = collectJsFiles(CHUNKS_DIR);
  if (files.length === 0) {
    console.error(
      'security:scan-bundles: no files under .next/static/chunks. Run `npm run build` first.'
    );
    process.exit(1);
  }

  const hits = [];
  for (const file of files) {
    let src;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const { re, name } of FORBIDDEN) {
      re.lastIndex = 0;
      if (re.test(src)) {
        hits.push({ file: file.replace(process.cwd(), '.'), pattern: name });
      }
    }
  }

  if (hits.length) {
    console.error('security:scan-bundles: forbidden patterns found in client chunks:\n');
    for (const h of hits) console.error(`  ${h.pattern} → ${h.file}`);
    process.exit(1);
  }

  console.log(`security:scan-bundles: OK (${files.length} chunk files scanned).`);
}

main();
