import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function authenticateBearer(req: NextRequest): Promise<
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }
> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }),
    };
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }),
    };
  }
  return { ok: true, user: userData.user };
}
