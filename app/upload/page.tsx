'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';
import { validateFiles, getValidationConstants } from '@/lib/uploads/validation';

const { MAX_FILE_SIZE } = getValidationConstants();

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
  }, []);

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

  return (
    <main>
      <div className="card" style={{ display: 'grid', gap: 20 }}>
        <div>
          <span className="badge">Step 1</span>
          <h1 style={{ margin: '12px 0 6px' }}>Upload pet photos</h1>
          <p style={{ margin: 0 }}>
            Drag & drop 1–5 JPEG/PNG files. Max 10MB each.
          </p>
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

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}
      </div>
    </main>
  );
}
