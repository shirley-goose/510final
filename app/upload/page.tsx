'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { LAST_MODEL_LS } from '@/lib/companion-overlay/constants';
import type { CompanionPersonality } from '@/lib/companion-overlay/personalities';
import { validateFiles, getValidationConstants } from '@/lib/uploads/validation';

const { MAX_FILE_SIZE } = getValidationConstants();

const GENERATION_POLL_INTERVAL_MS = 10_000;
const GENERATION_SOFT_TIMEOUT_MS = 120_000;

type UploadResult = {
  id: string;
  storage_path: string;
  original_name: string;
};

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const supabaseClient = getSupabaseClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [lastUploadIds, setLastUploadIds] = useState<string[] | null>(null);
  const [companionPersonality, setCompanionPersonality] = useState<CompanionPersonality>('calm');

  /** Active companion polled by GET /api/generate */
  const [pollingCompanionId, setPollingCompanionId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<number | null>(null);
  const [genPhase, setGenPhase] = useState<string | null>(null);
  const [genMessage, setGenMessage] = useState<string | null>(null);
  const [genWarning, setGenWarning] = useState<string | null>(null);
  const [generationStartMs, setGenerationStartMs] = useState<number | null>(null);
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genSuccess, setGenSuccess] = useState<{
    model_url: string;
    thumbnail_url: string | null;
  } | null>(null);

  /** Last companion job (for retries after failure); updated when a POST starts. */
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);

  /** Live clock while polling so elapsed time stays accurate. */
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const getSession = async () => {
      if (!supabaseClient) return;
      const { data } = await supabaseClient.auth.getSession();
      setSessionToken(data.session?.access_token ?? null);
    };
    getSession();

    if (!supabaseClient) return;

    const { data: authListener } = supabaseClient.auth.onAuthStateChange(
      (_event, session) => {
        setSessionToken(session?.access_token ?? null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabaseClient]);

  const fileSummary = useMemo(() => {
    return files.map((file) => ({
      name: file.name,
      size: (file.size / (1024 * 1024)).toFixed(2),
    }));
  }, [files]);

  const onFilesSelected = (selected: FileList | null) => {
    setError(null);
    setSuccess(null);
    if (!selected) return;
    const nextFiles = Array.from(selected);
    const validation = validateFiles(nextFiles);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid files.');
      return;
    }
    setFiles(nextFiles);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    onFilesSelected(event.dataTransfer.files);
  };

  const handleUpload = async () => {
    setError(null);
    setSuccess(null);

    if (!supabaseClient) {
      setError('Missing Supabase environment variables.');
      return;
    }

    if (!sessionToken) {
      setError('You must be signed in to upload.');
      return;
    }

    const validation = validateFiles(files);
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid files.');
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    setUploading(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/uploads');
    xhr.setRequestHeader('Authorization', `Bearer ${sessionToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    xhr.onload = () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText) as { uploads: UploadResult[] };
        setSuccess(`Uploaded ${response.uploads.length} files successfully.`);
        setLastUploadIds(response.uploads.map((u) => u.id));
        setFiles([]);
        setProgress(100);
      } else {
        const response = JSON.parse(xhr.responseText) as { error?: string };
        setError(response.error ?? 'Upload failed.');
      }
    };

    xhr.onerror = () => {
      setUploading(false);
      setError('Upload failed due to a network error.');
    };

    xhr.send(formData);
  };

  useEffect(() => {
    if (!pollingCompanionId || !sessionToken) return undefined;

    let cancelled = false;

    const pollOnce = async () => {
      try {
        const res = await fetch(
          `/api/generate?companion_id=${encodeURIComponent(pollingCompanionId)}`,
          { headers: { Authorization: `Bearer ${sessionToken}` } }
        );
        const payload = (await res.json()) as Record<string, unknown>;

        if (cancelled) return;

        if (!res.ok) {
          const err =
            typeof payload.error === 'string' ? payload.error : 'Generation status check failed.';
          const trackingId =
            typeof payload.companion_id === 'string' ? payload.companion_id : pollingCompanionId;
          setGenError(err);
          setPollingCompanionId(null);
          setGenPhase(null);
          if (trackingId) setGenerationJobId(trackingId);
          return;
        }

        const phase = typeof payload.phase === 'string' ? payload.phase : null;
        setGenPhase(phase);
        if (typeof payload.warning === 'string' && payload.warning) {
          setGenWarning(payload.warning);
        }

        const st = typeof payload.status === 'string' ? payload.status : '';
        const progress =
          typeof payload.progress === 'number' ? payload.progress : payload.progress === null ? null : null;

        if (progress !== null && progress !== undefined) {
          setGenProgress(progress);
        }

        if (st === 'success') {
          const mu = typeof payload.model_url === 'string' ? payload.model_url : '';
          setGenSuccess({
            model_url: mu,
            thumbnail_url:
              typeof payload.thumbnail_url === 'string' ? payload.thumbnail_url : null,
          });
          try {
            if (mu.startsWith('http')) {
              localStorage.setItem(LAST_MODEL_LS, mu);
              window.dispatchEvent(new Event('pet2companion-model-ready'));
            }
          } catch {
            /* quota / deny */
          }
          setGenMessage(null);
          setGenWarning(null);
          setGenPhase(null);
          setPollingCompanionId(null);
          setGenProgress(100);
          return;
        }

        if (st === 'failed') {
          const err =
            typeof payload.error === 'string' ? payload.error : 'Generation failed.';
          setGenError(err);
          setPollingCompanionId(null);
          return;
        }

        if (!payload.message || typeof payload.message !== 'string') {
          setGenMessage('Generating 3D model…');
        } else {
          setGenMessage(payload.message);
        }
      } catch {
        if (!cancelled) {
          setGenWarning('Temporary network issue while checking status. Still trying…');
        }
      }
    };

    void pollOnce();
    const iv = window.setInterval(() => void pollOnce(), GENERATION_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [pollingCompanionId, sessionToken]);

  useEffect(() => {
    if (!pollingCompanionId) return undefined;
    const i = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(i);
  }, [pollingCompanionId]);

  void tick;

  const elapsedSeconds =
    pollingCompanionId && generationStartMs !== null
      ? Math.floor(Math.max(0, Date.now() - generationStartMs) / 1000)
      : null;

  const startGeneration = async () => {
    setGenError(null);
    setGenWarning(null);
    setGenSuccess(null);
    setGenMessage(null);
    setGenPhase(null);

    if (!sessionToken) {
      setGenError('You must be signed in.');
      return;
    }
    if (!lastUploadIds?.length) {
      setGenError('Upload pet photos first, then generate.');
      return;
    }

    setGenSubmitting(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ upload_ids: lastUploadIds, personality: companionPersonality }),
      });
      const data = (await res.json()) as { companion_id?: string; error?: string };

      if (!res.ok || !data.companion_id) {
        if (typeof data.companion_id === 'string') {
          setGenerationJobId(data.companion_id);
        }
        setGenError(data.error ?? `Could not start generation (${res.status}).`);
        setGenSubmitting(false);
        return;
      }

      setGenerationStartMs(Date.now());
      setGenProgress(0);
      setPollingCompanionId(data.companion_id);
      setGenerationJobId(data.companion_id);
      setGenMessage('Submitted to 3D AI Studio. This usually completes within two minutes.');
    } catch {
      setGenError('Network error while starting generation.');
    }
    setGenSubmitting(false);
  };

  const retryGeneration = async () => {
    setGenError(null);
    setGenWarning(null);
    setGenPhase(null);

    if (!sessionToken) {
      setGenError('You must be signed in.');
      return;
    }
    const jobId = generationJobId;
    if (!jobId) {
      setGenError('Nothing to retry. Upload photos and start a new generation.');
      return;
    }

    setGenSubmitting(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companion_id: jobId, retry: true }),
      });
      const data = (await res.json()) as { companion_id?: string; error?: string };

      if (!res.ok) {
        setGenError(data.error ?? `Retry failed (${res.status}).`);
        setGenSubmitting(false);
        return;
      }

      setGenSuccess(null);
      setGenerationStartMs(Date.now());
      setGenProgress(0);
      setPollingCompanionId(data.companion_id ?? jobId);
      setGenMessage('Retry submitted. We check status every ten seconds.');
    } catch {
      setGenError('Network error while retrying.');
    }
    setGenSubmitting(false);
  };

  const showSlowNotice =
    elapsedSeconds !== null && elapsedSeconds * 1000 >= GENERATION_SOFT_TIMEOUT_MS;

  return (
    <main>
      <div className="card" style={{ display: 'grid', gap: 20 }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <span className="badge">Step 1</span>
            <h1 style={{ margin: '12px 0 6px' }}>Upload pet photos</h1>
            <p style={{ margin: 0 }}>
              Drag & drop 1–5 JPEG/PNG files. Max 10MB each.
            </p>
          </div>
          <a className="btn secondary" href="/dashboard" style={{ padding: '8px 14px', fontSize: 14 }}>
            Dashboard
          </a>
        </div>

        {!sessionToken && (
          <div className="error">
            You are not signed in. Go to <a href="/login">/login</a> first.
          </div>
        )}
        {!supabaseClient && (
          <div className="error">
            Supabase env vars are missing. Set `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
          </div>
        )}

        <div
          className={`dropzone ${dragActive ? 'active' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
        >
          <strong>Drop files here</strong>
          <p style={{ margin: '8px 0 0' }}>or click to browse</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          hidden
          onChange={(event) => onFilesSelected(event.target.files)}
        />

        {fileSummary.length > 0 && (
          <div style={{ display: 'grid', gap: 6 }}>
            <strong>Selected files</strong>
            {fileSummary.map((file) => (
              <div key={file.name} style={{ fontSize: 14 }}>
                {file.name} — {file.size} MB
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gap: 8 }}>
          <button className="btn" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload photos'}
          </button>
          <small>Max file size: {(MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)}MB</small>
        </div>

        {uploading && (
          <div style={{ display: 'grid', gap: 8 }}>
            <span>Uploading... {progress}%</span>
            <div className="progress">
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {(lastUploadIds?.length ?? 0) > 0 && (
          <section
            style={{
              display: 'grid',
              gap: 14,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: 20,
            }}
          >
            <div>
              <span className="badge">Step 2</span>
              <h2 style={{ margin: '12px 0 6px', fontSize: 22 }}>Generate a 3D model</h2>
              <p style={{ margin: 0, fontSize: 15 }}>
                The backend sends your first uploaded photo to <strong>3D AI Studio</strong> as a temporary signed URL,
                polls until the `.glb` is ready, then saves it under the path prefix `models/` for your account
                in Supabase Storage. Your 3D AI Studio API key stays on the server only.
              </p>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <strong>Companion personality</strong>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.88 }}>
                Chooses how energetic the desktop companion feels: movement speed, sway, and playful flourishes.
              </p>
              <div
                role="radiogroup"
                aria-label="Companion personality"
                style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}
              >
                {(['active', 'calm', 'playful'] as const).map((p) => (
                  <label
                    key={p}
                    style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}
                  >
                    <input
                      type="radio"
                      name="companion-personality"
                      value={p}
                      checked={companionPersonality === p}
                      onChange={() => setCompanionPersonality(p)}
                      disabled={!!pollingCompanionId && !genSuccess}
                    />
                    <span style={{ textTransform: 'capitalize' }}>{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                className="btn"
                type="button"
                disabled={
                  !!pollingCompanionId || genSubmitting || !sessionToken || !supabaseClient
                }
                onClick={() => void startGeneration()}
              >
                {pollingCompanionId
                  ? 'Generating…'
                  : genSubmitting
                    ? 'Starting…'
                    : genSuccess
                      ? 'Generate another model'
                      : 'Generate 3D model'}
              </button>
              {genError &&
                !!generationJobId &&
                !pollingCompanionId &&
                !genSubmitting && (
                  <button className="btn secondary" type="button" onClick={() => void retryGeneration()}>
                    Retry generation
                  </button>
                )}
            </div>

            {genError && <div className="error">{genError}</div>}

            {pollingCompanionId && (
              <div style={{ display: 'grid', gap: 10 }}>
                <strong>Progress</strong>
                <div className="progress">
                  <div style={{ width: `${Math.min(100, genProgress ?? 3)}%` }} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14 }}>
                  {elapsedSeconds !== null && (
                    <span>
                      Elapsed: {Math.floor(elapsedSeconds / 60)}:
                      {(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  )}
                  {genProgress !== null && <span>Provider: {genProgress}%</span>}
                  {genPhase && <span>Phase: {genPhase.replace(/_/g, ' ')}</span>}
                  <span>Polling every {GENERATION_POLL_INTERVAL_MS / 1000}s</span>
                </div>
                {genMessage && (
                  <p style={{ margin: 0 }} role="status" aria-live="polite">
                    {genMessage}
                  </p>
                )}
                {showSlowNotice && (
                  <p style={{ margin: 0 }} className="error">
                    This is slower than usual. 3D AI Studio jobs can still succeed—keep this tab open—or retry if it
                    eventually fails or times out.
                  </p>
                )}
              </div>
            )}

            {genWarning && (
              <p style={{ margin: 0 }} className="error">
                {genWarning}
              </p>
            )}

            {genSuccess?.model_url && (
              <div className="success" style={{ display: 'grid', gap: 8 }}>
                <strong>Companion model is ready.</strong>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  <a className="btn secondary" href={genSuccess.model_url} target="_blank" rel="noreferrer">
                    Open .glb URL
                  </a>
                  {genSuccess.thumbnail_url && (
                    <a
                      className="btn secondary"
                      href={genSuccess.thumbnail_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open thumbnail
                    </a>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
      </div>
    </main>
  );
}
