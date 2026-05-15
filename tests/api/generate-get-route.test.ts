import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/generate/route';

const { getUserMock, mockAdmin } = vi.hoisted(() => {
  const getUserMock = vi.fn();
  const mockAdmin = {
    auth: { getUser: getUserMock },
    from: vi.fn(),
  };
  return { getUserMock, mockAdmin };
});

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => mockAdmin,
}));

describe('GET /api/generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    });
  });

  it('returns 401 when Authorization is missing', async () => {
    const req = new NextRequest('http://localhost/api/generate?companion_id=x');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when companion_id query param is missing', async () => {
    const req = new NextRequest('http://localhost/api/generate', {
      headers: { Authorization: 'Bearer tok' },
    });
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when companion is not found for user', async () => {
    const mockFrom = mockAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: 'not found' },
          })
        ),
      })),
    });

    const req = new NextRequest(
      'http://localhost/api/generate?companion_id=cccccccc-cccc-cccc-cccc-cccccccccccc',
      { headers: { Authorization: 'Bearer tok' } }
    );
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns success payload when companion is complete', async () => {
    const mockFrom = mockAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
              user_id: 'user-1',
              name: 'Pet',
              status: 'success',
              api_task_id: null,
              model_url: 'https://cdn.example/model.glb',
              thumbnail_url: null,
              generation_error: null,
              generation_started_at: null,
              source_upload_ids: null,
            },
            error: null,
          })
        ),
      })),
    });

    const req = new NextRequest(
      'http://localhost/api/generate?companion_id=cccccccc-cccc-cccc-cccc-cccccccccccc',
      { headers: { Authorization: 'Bearer tok' } }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; model_url: string };
    expect(body.status).toBe('success');
    expect(body.model_url).toContain('.glb');
  });
});
