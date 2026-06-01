import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/extension
 * Returns Pet2Companion Chrome Extension as a downloadable zip.
 */
export async function GET() {
  const extDir = path.join(process.cwd(), 'extension');

  if (!fs.existsSync(extDir)) {
    return new NextResponse('Extension not found', { status: 404 });
  }

  const zip = new JSZip();
  const folder = zip.folder('Pet2Companion-Extension')!;

  function addDir(dirPath: string, zipFolder: JSZip) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.name === 'PLACEHOLDER.md') continue;
      const full = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        addDir(full, zipFolder.folder(entry.name)!);
      } else {
        zipFolder.file(entry.name, fs.readFileSync(full));
      }
    }
  }

  addDir(extDir, folder);

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="Pet2Companion-Extension.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
