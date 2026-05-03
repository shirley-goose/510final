/** Tripo3D OpenAPI v2 client — matches official SDK base URL & payloads. Keys stay server-side. */

export type TripoTaskStatus =
  | 'queued'
  | 'running'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'unknown'
  | 'banned'
  | 'expired';

export type TripoTaskResponse = {
  task_id: string;
  type?: string;
  status: TripoTaskStatus | string;
  progress: number;
  output?: {
    model?: string;
    base_model?: string;
    pbr_model?: string;
    rendered_image?: string;
  };
  error_code?: number;
  error_msg?: string;
};

export function defaultTripoBaseUrl(): string {
  const cn = process.env.TRIPO_REGION?.trim().toLowerCase();
  if (cn === 'cn' || cn === 'china') {
    return 'https://api.tripo3d.com/v2/openapi';
  }
  return process.env.TRIPO_API_BASE_URL?.trim() || 'https://api.tripo3d.ai/v2/openapi';
}

function inferContentTypeSuffix(imageUrl: string): 'jpg' | 'png' {
  const pathPart = imageUrl.split('?')[0]?.toLowerCase() ?? '';
  if (pathPart.includes('.png')) return 'png';
  return 'jpg';
}

function tripoJson<T>(data: unknown, context: string): T {
  if (!data || typeof data !== 'object') {
    throw new Error(`${context}: unexpected response.`);
  }
  const obj = data as Record<string, unknown>;
  const inner = obj.data;
  if (inner && typeof inner === 'object') {
    return inner as T;
  }
  return obj as unknown as T;
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
      typeof obj.message === 'string'
        ? obj.message
        : typeof obj.error === 'string'
          ? obj.error
          : rawText.slice(0, 240);
    throw new Error(msg || `${okContext} failed (${res.status}).`);
  }
  return tripoJson<T>(parsed, okContext);
}

/**
 * Starts image → 3D. `imageUrl` can be a public or signed HTTPS URL (Tripo fetches server-side).
 */
export async function createTripoImageToModelTask(
  apiKey: string,
  imageUrl: string,
  options?: {
    baseUrl?: string;
    modelVersion?: string;
  }
): Promise<string> {
  const base = options?.baseUrl ?? defaultTripoBaseUrl();
  const model_version =
    process.env.TRIPO_MODEL_VERSION?.trim() || options?.modelVersion || 'v2.5-20250123';

  const fileSuffix = inferContentTypeSuffix(imageUrl);
  const payload = {
    type: 'image_to_model',
    file: {
      type: fileSuffix,
      url: imageUrl,
    },
    model_version,
    texture: true,
    pbr: true,
    texture_quality: 'standard',
  };

  const res = await fetch(`${base.replace(/\/$/, '')}/task`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await parseResponse<{ task_id: string }>(res, 'Tripo create task');
  if (!data.task_id) {
    throw new Error('Tripo returned no task_id.');
  }
  return data.task_id;
}

export async function fetchTripoTask(apiKey: string, taskId: string, baseUrl?: string): Promise<TripoTaskResponse> {
  const base = baseUrl ?? defaultTripoBaseUrl();
  const res = await fetch(`${base.replace(/\/$/, '')}/task/${encodeURIComponent(taskId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  const data = await parseResponse<TripoTaskResponse>(res, 'Tripo get task');

  /** Normalize snake task id field */
  const id = data.task_id || taskId;
  return {
    ...data,
    task_id: id,
  };
}

/** Preferred download URL for a completed image_to_model task. */
export function tripoPrimaryModelUrl(task: TripoTaskResponse): string | undefined {
  const o = task.output;
  if (!o) return undefined;
  return o.model || o.pbr_model || o.base_model;
}
