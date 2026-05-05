import { describe, it, expect } from 'vitest';
import { validateFiles, getValidationConstants } from '@/lib/uploads/validation';

function pngFile() {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([sig], 't.png', { type: 'image/png' });
}

describe('validateFiles', () => {
  it('rejects empty selection', () => {
    expect(validateFiles([]).valid).toBe(false);
  });

  it('accepts a single PNG within limits', () => {
    const r = validateFiles([pngFile()]);
    expect(r.valid).toBe(true);
  });

  it('rejects more than 5 files', () => {
    const files = Array.from({ length: 6 }, () => pngFile());
    expect(validateFiles(files).valid).toBe(false);
  });

  it('rejects wrong mime type', () => {
    const f = new File([Buffer.from('x')], 'x.gif', { type: 'image/gif' });
    expect(validateFiles([f]).valid).toBe(false);
  });

  it('exports sensible limits', () => {
    const { MAX_FILE_SIZE } = getValidationConstants();
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
  });
});
