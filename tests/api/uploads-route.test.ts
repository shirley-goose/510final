import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/uploads/route';

const { getUserMock, storageUploadMock, insertChain, mockAdmin } = vi.hoisted(() => {
  const getUserMock = vi.fn();
  const storageUploadMock = vi.fn();
  const insertChain = vi.fn(() => ({
    select: vi.fn(() =>
      Promise.resolve({
        data: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            storage_path: 'uploads/test-user-1/photo.png',
            original_name: 'cat.png',
          },
        ],
        error: null,
      })
    ),
  }));
  const mockAdmin = {
    auth: {
      getUser: getUserMock,
    },
    storage: {
      from: vi.fn(() => ({
        upload: storageUploadMock,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'pet_uploads') {
        return { insert: insertChain };
      }
      return {};
    }),
  };
  return { getUserMock, storageUploadMock, insertChain, mockAdmin };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockAdmin,
}));

describe('POST /api/uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'test-user-1' } },
      error: null,
    });
    storageUploadMock.mockResolvedValue({ error: null });
  });

  it('returns 401 when Authorization header is missing', async () => {
    const form = new FormData();
    form.append('files', new File([Buffer.from('x')], 'a.png', { type: 'image/png' }));
    const req = new NextRequest('http://localhost/api/uploads', { method: 'POST', body: form });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when token is invalid', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: { message: 'bad' } });
    const form = new FormData();
    form.append('files', new File([Buffer.from('x')], 'a.png', { type: 'image/png' }));
    const req = new NextRequest('http://localhost/api/uploads', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad' },
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with upload ids when file is valid', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const form = new FormData();
    form.append('files', new File([png], 'tiny.png', { type: 'image/png' }));

    const req = new NextRequest('http://localhost/api/uploads', {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-test-token' },
      body: form,
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = (await res.json()) as { uploads: { id: string }[] };
    expect(json.uploads).toHaveLength(1);
    expect(json.uploads[0].id).toBeTruthy();
    expect(storageUploadMock).toHaveBeenCalled();
    expect(insertChain).toHaveBeenCalled();
  });
});
