import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticateBearer } from '@/lib/api/bearer-user';

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      getUser: getUserMock,
    },
  }),
}));

describe('authenticateBearer', () => {
  it('returns 401 payload when Authorization is missing', async () => {
    const req = new NextRequest('http://localhost/api/x');
    const out = await authenticateBearer(req);
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.response.status).toBe(401);
  });

  it('returns user when token validates', async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: 'usr-1', email: 'a@b.co' } },
      error: null,
    });
    const req = new NextRequest('http://localhost/api/x', {
      headers: { Authorization: 'Bearer good' },
    });
    const out = await authenticateBearer(req);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.user.id).toBe('usr-1');
  });
});
