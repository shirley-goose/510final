/** Meshy Image-to-3D REST client (keys stay server-side). */

export type MeshyTaskStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED';

export type MeshyImageTo3dTask = {
  id: string;
  status: MeshyTaskStatus;
  progress: number;
  model_urls?: { glb?: string };
  thumbnail_url?: string;
  task_error?: { message?: string };
};

const MESHY_BASE = 'https://api.meshy.ai/openapi/v1';

async function meshyJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    throw new Error(text.slice(0, 280) || `Meshy HTTP ${res.status}`);
  }
  if (!res.ok) {
    const msg =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message: unknown }).message === 'string'
        ? (data as { message: string }).message
        : typeof data === 'object' &&
            data !== null &&
            'error' in data &&
            typeof (data as { error: unknown }).error === 'string'
          ? (data as { error: string }).error
          : text.slice(0, 280);
    throw new Error(msg || `Meshy request failed (${res.status}).`);
  }
  return data as T;
}

/**
 * Starts an async image→3d job. Meshy pulls `image_url` (signed URL ok).
 */
export async function createMeshyImageTo3dTask(
  apiKey: string,
  imageUrl: string
): Promise<string> {
  const res = await fetch(`${MESHY_BASE}/image-to-3d`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image_url: imageUrl,
      target_formats: ['glb'],
      should_texture: true,
      ai_model: 'latest',
    }),
  });

  const data = await meshyJson<{ result: string }>(res);
  if (!data.result) {
    throw new Error('Meshy returned no task id.');
  }
  return data.result;
}

export async function fetchMeshyImageTo3dTask(
  apiKey: string,
  taskId: string
): Promise<MeshyImageTo3dTask> {
  const res = await fetch(`${MESHY_BASE}/image-to-3d/${taskId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
  return meshyJson<MeshyImageTo3dTask>(res);
}
