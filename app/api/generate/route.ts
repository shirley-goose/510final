import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  createMeshyImageTo3dTask,
  fetchMeshyImageTo3dTask,
} from '@/lib/generation/providers/meshy';
import {
  createThreeDAiStudioImageTo3dTask,
  fetchThreeDAiStudioTask,
  threeDAiStudioPrimaryModelUrl,
  threeDAiStudioTerminalFailed,
  threeDAiStudioThumbnailUrl,
} from '@/lib/generation/providers/three-d-ai-studio';
import { GENERATION_SERVER_DEADLINE_MS, getActiveAiProvider } from '@/lib/generation/config';
import { parseCompanionPersonality } from '@/lib/companion-overlay/personalities';

export const runtime = 'nodejs';

/** Enough headroom on hosting plans that support long-lived functions (e.g. Vercel) to download + re-upload models. */
export const maxDuration = 120;

const PET_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pet-uploads';
const MODEL_BUCKET = process.env.COMPANION_MODEL_STORAGE_BUCKET ?? 'companion-models';

function meshyApiKeyOrNull(): string | null {
  const k = process.env.MESHY_API_KEY?.trim();
  return k?.length ? k : null;
}

function requireMeshyKey(): string {
  const k = meshyApiKeyOrNull();
  if (!k) {
    throw new Error('MESHY_API_KEY is not configured on the server.');
  }
  return k;
}

function threeDAiStudioApiKeyOrNull(): string | null {
  const k = process.env.THREED_AI_STUDIO_API_KEY?.trim();
  return k?.length ? k : null;
}

function requireThreeDAiStudioKey(): string {
  const k = threeDAiStudioApiKeyOrNull();
  if (!k) {
    throw new Error('THREED_AI_STUDIO_API_KEY is not configured on the server.');
  }
  return k;
}

async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: NextResponse.json({ error: 'Missing authorization token.' }, { status: 401 }),
    };
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const { data: userData, error: userError } = await getSupabaseAdmin().auth.getUser(token);
  if (userError || !userData.user) {
    return {
      error: NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 }),
    };
  }
  return { user: userData.user };
}

type CompanionRow = {
  id: string;
  user_id: string;
  name: string;
  status: 'pending' | 'success' | 'failed';
  api_task_id: string | null;
  model_url: string | null;
  thumbnail_url: string | null;
  generation_error: string | null;
  generation_started_at: string | null;
  source_upload_ids: string[] | null;
};

async function signPetImagePath(storagePath: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin().storage
    .from(PET_BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

async function uploadCompanionPreviewImage(
  userId: string,
  companionId: string,
  buf: Buffer,
  contentType: string
): Promise<string | null> {
  const thumbPath = `models/${userId}/${companionId}/preview.png`;
  const { error: tErr } = await getSupabaseAdmin().storage.from(MODEL_BUCKET).upload(thumbPath, buf, {
    contentType,
    upsert: true,
  });
  if (tErr) return null;
  const {
    data: { publicUrl },
  } = getSupabaseAdmin().storage.from(MODEL_BUCKET).getPublicUrl(thumbPath);
  return publicUrl;
}

/** 3D AI Studio Tripo often returns GLB only — use the user's uploaded pet photo as preview. */
async function loadSourceUploadPreview(
  companion: CompanionRow
): Promise<{ buf: Buffer; contentType: string } | null> {
  const uploadIds = companion.source_upload_ids;
  if (!uploadIds?.length) return null;

  const { data: uploadRow, error } = await getSupabaseAdmin()
    .from('pet_uploads')
    .select('storage_path, mime_type')
    .eq('id', uploadIds[0])
    .eq('user_id', companion.user_id)
    .maybeSingle();

  if (error || !uploadRow?.storage_path) return null;

  const { data, error: dlErr } = await getSupabaseAdmin().storage
    .from(PET_BUCKET)
    .download(uploadRow.storage_path as string);

  if (dlErr || !data) return null;

  const mime =
    typeof uploadRow.mime_type === 'string' && uploadRow.mime_type.startsWith('image/')
      ? uploadRow.mime_type
      : 'image/jpeg';

  return { buf: Buffer.from(await data.arrayBuffer()), contentType: mime };
}

async function persistGeneratedOutputs(
  companion: CompanionRow,
  glbUrl: string,
  thumbnailUrl: string | undefined
): Promise<{ model_url: string; thumbnail_url: string | null }> {
  const glbRes = await fetch(glbUrl);
  if (!glbRes.ok) {
    throw new Error(`Failed to download model from provider (${glbRes.status}).`);
  }
  const glbBuf = Buffer.from(await glbRes.arrayBuffer());
  const modelPath = `models/${companion.user_id}/${companion.id}.glb`;
  const { error: glbUploadError } = await getSupabaseAdmin().storage.from(MODEL_BUCKET).upload(modelPath, glbBuf, {
    contentType: 'model/gltf-binary',
    upsert: true,
  });
  if (glbUploadError) {
    throw new Error(glbUploadError.message);
  }
  const {
    data: { publicUrl: modelPublicUrl },
  } = getSupabaseAdmin().storage.from(MODEL_BUCKET).getPublicUrl(modelPath);

  let thumbnailPublic: string | null = null;
  if (thumbnailUrl) {
    const imgRes = await fetch(thumbnailUrl);
    if (imgRes.ok) {
      const buf = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get('content-type')?.startsWith('image/')
        ? imgRes.headers.get('content-type')!
        : 'image/png';
      thumbnailPublic = await uploadCompanionPreviewImage(
        companion.user_id,
        companion.id,
        buf,
        contentType
      );
    }
  }

  if (!thumbnailPublic) {
    const sourcePreview = await loadSourceUploadPreview(companion);
    if (sourcePreview) {
      thumbnailPublic = await uploadCompanionPreviewImage(
        companion.user_id,
        companion.id,
        sourcePreview.buf,
        sourcePreview.contentType
      );
    }
  }

  await getSupabaseAdmin()
    .from('companions')
    .update({
      status: 'success',
      model_url: modelPublicUrl,
      thumbnail_url: thumbnailPublic,
      generation_error: null,
    })
    .eq('id', companion.id);

  return { model_url: modelPublicUrl, thumbnail_url: thumbnailPublic };
}

export async function GET(req: NextRequest) {
  const auth = await getAuthedUser(req);
  if ('error' in auth) return auth.error;

  const companionId = req.nextUrl.searchParams.get('companion_id');
  if (!companionId) {
    return NextResponse.json({ error: 'Query parameter companion_id is required.' }, { status: 400 });
  }

  const provider = getActiveAiProvider();

  const { data: companion, error: loadError } = await getSupabaseAdmin()
    .from('companions')
    .select(
      'id, user_id, name, status, api_task_id, model_url, thumbnail_url, generation_error, generation_started_at, source_upload_ids'
    )
    .eq('id', companionId)
    .eq('user_id', auth.user.id)
    .single();

  if (loadError || !companion) {
    return NextResponse.json({ error: 'Companion not found.' }, { status: 404 });
  }

  const row = companion as CompanionRow;

  if (row.status === 'success') {
    return NextResponse.json({
      status: 'success',
      progress: 100,
      companion_id: row.id,
      name: row.name,
      model_url: row.model_url,
      thumbnail_url: row.thumbnail_url,
    });
  }

  if (row.status === 'failed') {
    return NextResponse.json({
      status: 'failed',
      companion_id: row.id,
      name: row.name,
      error: row.generation_error ?? 'Generation failed.',
    });
  }

  if (row.generation_started_at) {
    const elapsed = Date.now() - new Date(row.generation_started_at).getTime();
    if (elapsed > GENERATION_SERVER_DEADLINE_MS) {
      const errMsg = 'Generation timed out on our servers. Please try again.';
      await getSupabaseAdmin()
        .from('companions')
        .update({ status: 'failed', generation_error: errMsg })
        .eq('id', row.id);
      return NextResponse.json({
        status: 'failed',
        companion_id: row.id,
        error: errMsg,
      });
    }
  }

  if (provider === '3daistudio') {
    const apiKey = threeDAiStudioApiKeyOrNull();
    if (!apiKey) {
      return NextResponse.json(
        { error: '3D generation is not configured (THREED_AI_STUDIO_API_KEY).' },
        { status: 503 }
      );
    }

    if (!row.api_task_id) {
      return NextResponse.json({
        status: 'pending',
        progress: 0,
        companion_id: row.id,
        phase: 'queued',
        message: 'Waiting for 3D AI Studio task to start…',
      });
    }

    let task;
    try {
      task = await fetchThreeDAiStudioTask(apiKey, row.api_task_id);
    } catch (e) {
      const hint = e instanceof Error ? e.message : 'Unable to reach 3D AI Studio.';
      return NextResponse.json({
        status: 'generating',
        progress: null,
        companion_id: row.id,
        phase: 'polling',
        message: 'Checking generation status…',
        warning: hint,
      });
    }

    const st = String(task.status);
    const progress = typeof task.progress === 'number' ? task.progress : 0;

    if (threeDAiStudioTerminalFailed(st, task.failure_reason)) {
      const errMsg =
        task.failure_reason?.trim() ||
        `The 3D provider reported ${st.toUpperCase() === 'CANCELLED' || st.toUpperCase() === 'CANCELED' ? 'cancelled' : 'failure'}.`;
      await getSupabaseAdmin()
        .from('companions')
        .update({
          status: 'failed',
          generation_error: errMsg,
        })
        .eq('id', row.id);
      return NextResponse.json({
        status: 'failed',
        companion_id: row.id,
        error: errMsg,
      });
    }

    if (st.toUpperCase() !== 'FINISHED') {
      return NextResponse.json({
        status: 'generating',
        progress,
        companion_id: row.id,
        phase: '3daistudio_running',
        message: 'Generating your companion model…',
      });
    }

    const glbUrl = threeDAiStudioPrimaryModelUrl(task);
    if (!glbUrl) {
      const errMsg = '3D AI Studio finished but returned no downloadable model URL.';
      await getSupabaseAdmin()
        .from('companions')
        .update({
          status: 'failed',
          generation_error: errMsg,
        })
        .eq('id', row.id);
      return NextResponse.json({ status: 'failed', companion_id: row.id, error: errMsg });
    }

    const thumb = threeDAiStudioThumbnailUrl(task);
    try {
      const { model_url, thumbnail_url } = await persistGeneratedOutputs(row, glbUrl, thumb);
      return NextResponse.json({
        status: 'success',
        progress: 100,
        companion_id: row.id,
        name: row.name,
        model_url,
        thumbnail_url,
      });
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : 'Saving the generated model failed.';
      await getSupabaseAdmin()
        .from('companions')
        .update({
          status: 'failed',
          generation_error: errMsg,
        })
        .eq('id', row.id);
      return NextResponse.json({ status: 'failed', companion_id: row.id, error: errMsg });
    }
  }

  /** Meshy fallback */
  const meshyKey = meshyApiKeyOrNull();
  if (!meshyKey) {
    return NextResponse.json(
      {
        error:
          'Meshy fallback is not configured. Set AI_3D_PROVIDER=3daistudio and THREED_AI_STUDIO_API_KEY, or supply MESHY_API_KEY for meshy.',
      },
      { status: 503 }
    );
  }

  if (!row.api_task_id) {
    return NextResponse.json({
      status: 'pending',
      progress: 0,
      companion_id: row.id,
      phase: 'queued',
      message: 'Waiting for Meshy task to start…',
    });
  }

  let mTask;
  try {
    mTask = await fetchMeshyImageTo3dTask(meshyKey, row.api_task_id);
  } catch (e) {
    const hint = e instanceof Error ? e.message : 'Unable to reach Meshy.';
    return NextResponse.json({
      status: 'generating',
      progress: null,
      companion_id: row.id,
      phase: 'polling',
      message: 'Checking generation status…',
      warning: hint,
    });
  }

  const progress = typeof mTask.progress === 'number' ? mTask.progress : 0;

  if (mTask.status === 'FAILED' || mTask.status === 'CANCELED') {
    const errMsg =
      mTask.task_error?.message?.trim() ||
      `The 3D provider reported ${mTask.status === 'CANCELED' ? 'cancelled' : 'failure'}.`;
    await getSupabaseAdmin()
      .from('companions')
      .update({
        status: 'failed',
        generation_error: errMsg,
      })
      .eq('id', row.id);
    return NextResponse.json({
      status: 'failed',
      companion_id: row.id,
      error: errMsg,
    });
  }

  if (mTask.status !== 'SUCCEEDED') {
    return NextResponse.json({
      status: 'generating',
      progress,
      companion_id: row.id,
      phase: 'meshy_running',
      message: 'Generating your companion model…',
    });
  }

  const glbUrl = mTask.model_urls?.glb;
  if (!glbUrl) {
    const errMsg = 'Meshy succeeded but returned no GLB output.';
    await getSupabaseAdmin()
      .from('companions')
      .update({
        status: 'failed',
        generation_error: errMsg,
      })
      .eq('id', row.id);
    return NextResponse.json({ status: 'failed', companion_id: row.id, error: errMsg });
  }

  try {
    const { model_url, thumbnail_url } = await persistGeneratedOutputs(
      row,
      glbUrl,
      mTask.thumbnail_url
    );
    return NextResponse.json({
      status: 'success',
      progress: 100,
      companion_id: row.id,
      name: row.name,
      model_url,
      thumbnail_url,
    });
  } catch (e) {
    const errMsg =
      e instanceof Error ? e.message : 'Saving the generated model failed.';
    await getSupabaseAdmin()
      .from('companions')
      .update({
        status: 'failed',
        generation_error: errMsg,
      })
      .eq('id', row.id);
    return NextResponse.json({ status: 'failed', companion_id: row.id, error: errMsg });
  }
}

export async function POST(req: NextRequest) {
  const auth = await getAuthedUser(req);
  if ('error' in auth) return auth.error;

  const provider = getActiveAiProvider();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected JSON body.' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  const startProviderTask = async (signedImageUrl: string): Promise<string> => {
    if (provider === '3daistudio') {
      const key = requireThreeDAiStudioKey();
      return createThreeDAiStudioImageTo3dTask(key, signedImageUrl);
    }
    const key = requireMeshyKey();
    return createMeshyImageTo3dTask(key, signedImageUrl);
  };

  const providerStartErrorLabel = provider === '3daistudio' ? '3D AI Studio' : 'Meshy';

  if (provider === '3daistudio' && !threeDAiStudioApiKeyOrNull()) {
    return NextResponse.json(
      { error: 'THREED_AI_STUDIO_API_KEY is required when AI_3D_PROVIDER is 3daistudio (default).' },
      { status: 503 }
    );
  }

  if (provider === 'meshy' && !meshyApiKeyOrNull()) {
    return NextResponse.json(
      { error: 'MESHY_API_KEY is required when AI_3D_PROVIDER=meshy.' },
      { status: 503 }
    );
  }

  /** Retry failed job */
  if (raw.retry === true && typeof raw.companion_id === 'string') {
    const { data: existing, error: exErr } = await getSupabaseAdmin()
      .from('companions')
      .select('id, user_id, status, source_upload_ids')
      .eq('id', raw.companion_id)
      .eq('user_id', auth.user.id)
      .single();

    if (exErr || !existing) {
      return NextResponse.json({ error: 'Companion not found.' }, { status: 404 });
    }
    if ((existing as { status: string }).status !== 'failed') {
      return NextResponse.json(
        { error: 'You can only retry a generation that previously failed.' },
        { status: 400 }
      );
    }

    const uploadIds = (existing as { source_upload_ids: string[] | null }).source_upload_ids;
    if (!uploadIds?.length) {
      return NextResponse.json(
        { error: 'No source uploads stored for this companion; start a new generation instead.' },
        { status: 400 }
      );
    }

    const { data: firstRow, error: upErr } = await getSupabaseAdmin()
      .from('pet_uploads')
      .select('id, storage_path')
      .eq('id', uploadIds[0])
      .eq('user_id', auth.user.id)
      .single();

    if (upErr || !firstRow?.storage_path) {
      return NextResponse.json({ error: 'Could not reload your pet photo for retry.' }, { status: 400 });
    }

    const signed = await signPetImagePath(firstRow.storage_path as string);
    if (!signed) {
      return NextResponse.json({ error: 'Could not generate a readable URL for your photo.' }, { status: 500 });
    }

    await getSupabaseAdmin()
      .from('companions')
      .update({
        status: 'pending',
        api_task_id: null,
        model_url: null,
        thumbnail_url: null,
        generation_error: null,
        generation_started_at: new Date().toISOString(),
      })
      .eq('id', raw.companion_id);

    let taskId: string;
    try {
      taskId = await startProviderTask(signed);
    } catch (e) {
      const errMsg =
        e instanceof Error ? e.message : `Starting ${providerStartErrorLabel} generation failed.`;
      await getSupabaseAdmin()
        .from('companions')
        .update({
          status: 'failed',
          generation_error: errMsg,
        })
        .eq('id', raw.companion_id);
      return NextResponse.json({ error: errMsg, companion_id: raw.companion_id }, { status: 502 });
    }

    await getSupabaseAdmin().from('companions').update({ api_task_id: taskId }).eq('id', raw.companion_id);

    return NextResponse.json({
      companion_id: raw.companion_id,
      status: 'pending',
      message: 'Generation restarted.',
    });
  }

  const upload_ids = raw.upload_ids;
  if (!Array.isArray(upload_ids) || upload_ids.length === 0) {
    return NextResponse.json(
      { error: 'Body must include upload_ids (non-empty UUID array).' },
      { status: 400 }
    );
  }

  const idStrings = upload_ids.filter((id): id is string => typeof id === 'string');
  if (idStrings.length !== upload_ids.length || idStrings.some((id) => !id)) {
    return NextResponse.json({ error: 'Each upload_ids entry must be a string.' }, { status: 400 });
  }

  const { data: uploadRows, error: uploadSelErr } = await getSupabaseAdmin()
    .from('pet_uploads')
    .select('id, storage_path')
    .in('id', idStrings)
    .eq('user_id', auth.user.id);

  if (uploadSelErr || !uploadRows?.length || uploadRows.length !== idStrings.length) {
    return NextResponse.json(
      { error: 'One or more uploads were not found or are not yours.' },
      { status: 400 }
    );
  }

  const primaryPath = (uploadRows as { storage_path: string }[])[0].storage_path;
  const signedUrl = await signPetImagePath(primaryPath);
  if (!signedUrl) {
    return NextResponse.json({ error: 'Could not sign your photo URL for the AI provider.' }, { status: 500 });
  }

  const name =
    typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : 'My companion';

  const personality = parseCompanionPersonality(raw.personality);

  const { data: created, error: createErr } = await getSupabaseAdmin()
    .from('companions')
    .insert({
      user_id: auth.user.id,
      name,
      personality,
      status: 'pending',
      source_upload_ids: idStrings,
      generation_started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createErr || !created?.id) {
    const msg =
      createErr?.message ??
      'Unable to create a companion record — did you apply database migrations for `companions`?';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const companionId = created.id as string;

  let taskId: string;
  try {
    taskId = await startProviderTask(signedUrl);
  } catch (e) {
    const errMsg = e instanceof Error ? e.message : `${providerStartErrorLabel} request failed.`;
    await getSupabaseAdmin()
      .from('companions')
      .update({
        status: 'failed',
        generation_error: errMsg,
      })
      .eq('id', companionId);
    return NextResponse.json({ error: errMsg, companion_id: companionId }, { status: 502 });
  }

  await getSupabaseAdmin().from('companions').update({ api_task_id: taskId }).eq('id', companionId);

  return NextResponse.json({
    companion_id: companionId,
    status: 'pending',
    message: 'Generation job started. Poll GET /api/generate?companion_id=…',
  });
}
