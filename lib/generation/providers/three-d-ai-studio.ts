/** 3D AI Studio REST client — image-to-3D (Tripo model). Keys stay server-side. */

export type ThreeDAiStudioTaskStatus = 'PENDING' | 'PROCESSING' | 'FINISHED' | 'FAILED' | string;

export type ThreeDAiStudioResult = {
  asset: string;
  asset_type: string;
  metadata?: unknown;
};

export type ThreeDAiStudioTaskResponse = {
  status: ThreeDAiStudioTaskStatus;
  progress?: number;
  failure_reason?: string | null;
  results?: ThreeDAiStudioResult[];
};

const DEFAULT_BASE = 'https://api.3daistudio.com';

export function defaultThreeDAiStudioBaseUrl(): string {
  return process.env.THREED_AI_STUDIO_API_BASE_URL?.trim() || DEFAULT_BASE;
}

function imageTo3dPath(modelVersion?: string): string {
  const version = process.env.THREED_AI_STUDIO_MODEL_VERSION?.trim() || modelVersion?.trim();
  if (version === '3.1' || version === '3.0') {
    return `/v1/3d-models/tripo/image-to-3d/${version}/`;
  }
  return '/v1/3d-models/tripo/image-to-3d/';
}

async function parseResponse<T>(res: Response, okContext: string): Promise<T> {
  const rawText = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(`${okContext}: HTTP ${res.status} ${rawText.slice(0, 200)}`);
  }
  if (!res.ok) {
    const obj = parsed as Record<string, unknown>;
    const msg =
      typeof obj.detail === 'string'
        ? obj.detail
        : typeof obj.message === 'string'
          ? obj.message
          : typeof obj.error === 'string'
            ? obj.error
            : rawText.slice(0, 240);
    throw new Error(msg || `${okContext} failed (${res.status}).`);
  }
  return parsed as T;
}

/**
 * Starts image → 3D. `imageUrl` must be a public or signed HTTPS URL (3D AI Studio fetches server-side).
 */
export async function createThreeDAiStudioImageTo3dTask(
  apiKey: string,
  imageUrl: string,
  options?: {
    baseUrl?: string;
    modelVersion?: string;
  }
): Promise<string> {
  const base = options?.baseUrl ?? defaultThreeDAiStudioBaseUrl();
  const path = imageTo3dPath(options?.modelVersion);

  const payload = {
    image_url: imageUrl,
    texture: true,
    pbr: true,
    texture_alignment: 'original_image',
  };

  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ task_id: string }>(res, '3D AI Studio create task');
  if (!data.task_id) {
    throw new Error('3D AI Studio returned no task_id.');
  }
  return data.task_id;
}

export async function fetchThreeDAiStudioTask(
  apiKey: string,
  taskId: string,
  baseUrl?: string
): Promise<ThreeDAiStudioTaskResponse> {
  const base = baseUrl ?? defaultThreeDAiStudioBaseUrl();
  const res = await fetch(
    `${base.replace(/\/$/, '')}/v1/generation-request/${encodeURIComponent(taskId)}/status/`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    }
  );
  return parseResponse<ThreeDAiStudioTaskResponse>(res, '3D AI Studio get task');
}

/** Preferred GLB download URL from a finished task. */
export function threeDAiStudioPrimaryModelUrl(task: ThreeDAiStudioTaskResponse): string | undefined {
  const results = task.results;
  if (!results?.length) return undefined;

  const model =
    results.find((r) => r.asset_type === '3D_MODEL') ??
    results.find((r) => r.asset?.toLowerCase().includes('.glb'));
  return model?.asset;
}

/** Optional preview/thumbnail URL when the provider returns one. */
export function threeDAiStudioThumbnailUrl(task: ThreeDAiStudioTaskResponse): string | undefined {
  const results = task.results;
  if (!results?.length) return undefined;

  const thumb = results.find(
    (r) =>
      r.asset_type === 'IMAGE' ||
      r.asset_type === 'THUMBNAIL' ||
      r.asset_type === 'RENDER'
  );
  return thumb?.asset;
}

export function threeDAiStudioTerminalFailed(status: string, failureReason?: string | null): boolean {
  const st = status.toUpperCase();
  if (['FAILED', 'CANCELLED', 'CANCELED', 'ERROR', 'EXPIRED'].includes(st)) {
    return true;
  }
  return Boolean(failureReason?.trim()) && st !== 'FINISHED';
}
