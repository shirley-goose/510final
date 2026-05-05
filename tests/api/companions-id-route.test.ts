import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH, DELETE } from '@/app/api/companions/[id]/route';

const companionId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const userId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const { getUserMock } = vi.hoisted(() => ({ getUserMock: vi.fn() }));

function authHeader() {
  return { Authorization: 'Bearer test-session-token' };
}

function buildRenameUpdateChain(result: { data: unknown; error: unknown }) {
  const chain = {
    eq: vi.fn(function eqFn() {
      return chain;
    }),
    select: vi.fn(() => ({
      maybeSingle: vi.fn(() => Promise.resolve(result)),
    })),
  };
  return {
    update: vi.fn(() => chain),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    auth: {
      getUser: getUserMock,
    },
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from '@/lib/supabase/server';

describe('PATCH /api/companions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  it('returns 401 without bearer token', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name: 'X' }),
    });
    const res = await PATCH(req, { params: { id: companionId } });
    expect(res.status).toBe(401);
  });

  it('returns 400 when body has neither name nor activate', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await PATCH(req, { params: { id: companionId } });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty after trim', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '   ' }),
    });
    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'companions') {
        return buildRenameUpdateChain({ data: null, error: null });
      }
      return {};
    });

    const res = await PATCH(req, { params: { id: companionId } });
    expect(res.status).toBe(400);
  });

  it('returns 200 and companion when rename succeeds', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '  Luna  ' }),
    });

    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'companions') {
        return buildRenameUpdateChain({
          data: { id: companionId, name: 'Luna' },
          error: null,
        });
      }
      return {};
    });

    const res = await PATCH(req, { params: { id: companionId } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { companion: { name: string } };
    expect(body.companion.name).toBe('Luna');
  });

  it('returns 400 when activating a companion without a finished model', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ activate: true }),
    });

    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'companions') return {};
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() =>
            Promise.resolve({
              data: { id: companionId, status: 'pending', model_url: null },
              error: null,
            })
          ),
        })),
      };
    });

    const res = await PATCH(req, { params: { id: companionId } });
    expect(res.status).toBe(400);
  });

  it('clears other actives then sets is_active when activate true', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'PATCH',
      headers: { ...authHeader(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ activate: true }),
    });

    const clearUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });
    const setUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    let companionsFromCount = 0;
    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'companions') return {};

      companionsFromCount += 1;

      if (companionsFromCount === 1) {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn(() =>
              Promise.resolve({
                data: {
                  id: companionId,
                  status: 'success',
                  model_url: 'https://example.com/m.glb',
                },
                error: null,
              })
            ),
          })),
        };
      }

      if (companionsFromCount === 2) {
        return { update: clearUpdate };
      }

      return { update: setUpdate };
    });

    const res = await PATCH(req, { params: { id: companionId } });
    expect(res.status).toBe(200);
    expect(clearUpdate).toHaveBeenCalledWith({ is_active: false });
    expect(setUpdate).toHaveBeenCalledWith({ is_active: true });
  });
});

describe('DELETE /api/companions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  it('returns 404 when companion does not belong to user', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'DELETE',
      headers: authHeader(),
    });

    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'companions') return {};
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      };
    });

    const res = await DELETE(req, { params: { id: companionId } });
    expect(res.status).toBe(404);
  });

  it('deletes storage objects and row when companion exists', async () => {
    const req = new NextRequest(`http://localhost/api/companions/${companionId}`, {
      method: 'DELETE',
      headers: authHeader(),
    });

    const removeMock = vi.fn().mockResolvedValue({ error: null });
    const storageFrom = supabaseAdmin.storage.from as ReturnType<typeof vi.fn>;
    storageFrom.mockReturnValue({ remove: removeMock });

    const mockFrom = supabaseAdmin.from as ReturnType<typeof vi.fn>;
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'companions') return {};
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn(() =>
            Promise.resolve({ data: { id: companionId, user_id: userId }, error: null })
          ),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })),
      };
    });

    const res = await DELETE(req, { params: { id: companionId } });
    expect(res.status).toBe(200);
    expect(removeMock).toHaveBeenCalled();
    expect(removeMock.mock.calls[0][0]).toContain(`models/${userId}/${companionId}.glb`);
  });
});
