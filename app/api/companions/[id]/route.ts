import { NextRequest, NextResponse } from 'next/server';
import { authenticateBearer } from '@/lib/api/bearer-user';
import { companionModelObjectPaths } from '@/lib/companion-storage-paths';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MODEL_BUCKET = process.env.COMPANION_MODEL_STORAGE_BUCKET ?? 'companion-models';

const NAME_MAX = 120;

export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const auth = await authenticateBearer(req);
  if (!auth.ok) return auth.response;

  const { id: companionId } = context.params;
  if (!companionId) {
    return NextResponse.json({ error: 'Missing companion id.' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be a JSON object.' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  if (!('activate' in raw) && !('name' in raw)) {
    return NextResponse.json({ error: 'Body must include either name or activate.' }, { status: 400 });
  }

  if ('activate' in raw) {
    if (raw.activate !== true && raw.activate !== false) {
      return NextResponse.json({ error: 'activate must be a boolean.' }, { status: 400 });
    }
    if ('name' in raw) {
      return NextResponse.json({ error: 'Send either name or activate, not both.' }, { status: 400 });
    }

    const { data: row, error: selErr } = await supabaseAdmin
      .from('companions')
      .select('id,status,model_url')
      .eq('id', companionId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (selErr || !row) {
      return NextResponse.json({ error: 'Companion not found.' }, { status: 404 });
    }

    if (raw.activate === true) {
      const st = typeof row.status === 'string' ? row.status : '';
      const mu = typeof row.model_url === 'string' ? row.model_url : null;
      if (st !== 'success' || !mu) {
        return NextResponse.json(
          { error: 'Only companions with a finished model can be set active.' },
          { status: 400 }
        );
      }

      const { error: clearErr } = await supabaseAdmin
        .from('companions')
        .update({ is_active: false })
        .eq('user_id', auth.user.id);

      if (clearErr) {
        return NextResponse.json({ error: clearErr.message }, { status: 500 });
      }

      const { error: setErr } = await supabaseAdmin
        .from('companions')
        .update({ is_active: true })
        .eq('id', companionId)
        .eq('user_id', auth.user.id);

      if (setErr) {
        return NextResponse.json({ error: setErr.message }, { status: 500 });
      }
    } else {
      /** Deactivate this companion only; overlay falls back to latest success. */
      const { error: offErr } = await supabaseAdmin
        .from('companions')
        .update({ is_active: false })
        .eq('id', companionId)
        .eq('user_id', auth.user.id);

      if (offErr) {
        return NextResponse.json({ error: offErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, companion_id: companionId });
  }

  const nameRaw = raw.name;
  if (typeof nameRaw !== 'string') {
    return NextResponse.json({ error: 'name must be a string.' }, { status: 400 });
  }

  const name = nameRaw.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > NAME_MAX) {
    return NextResponse.json(
      { error: `name must be between 1 and ${NAME_MAX} characters.` },
      { status: 400 }
    );
  }

  const { data: updated, error: upErr } = await supabaseAdmin
    .from('companions')
    .update({ name })
    .eq('id', companionId)
    .eq('user_id', auth.user.id)
    .select('id,name')
    .maybeSingle();

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  if (!updated) {
    return NextResponse.json({ error: 'Companion not found.' }, { status: 404 });
  }

  return NextResponse.json({ ok: true, companion: updated });
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const auth = await authenticateBearer(req);
  if (!auth.ok) return auth.response;

  const { id: companionId } = context.params;
  if (!companionId) {
    return NextResponse.json({ error: 'Missing companion id.' }, { status: 400 });
  }

  const { data: row, error: selErr } = await supabaseAdmin
    .from('companions')
    .select('id,user_id')
    .eq('id', companionId)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (selErr || !row) {
    return NextResponse.json({ error: 'Companion not found.' }, { status: 404 });
  }

  const paths = companionModelObjectPaths(auth.user.id, companionId);
  const { error: rmErr } = await supabaseAdmin.storage.from(MODEL_BUCKET).remove(paths);
  /* Missing objects are acceptable; ignore non-fatal storage errors */
  void rmErr;

  const { error: delErr } = await supabaseAdmin
    .from('companions')
    .delete()
    .eq('id', companionId)
    .eq('user_id', auth.user.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, companion_id: companionId });
}
