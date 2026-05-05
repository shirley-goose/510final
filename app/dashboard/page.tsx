'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

type CompanionRow = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  model_url: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
  personality: string;
};

function notifyOverlayRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('pet2companion-model-ready'));
}

function statusLabel(status: string): string {
  switch (status) {
    case 'success':
      return 'Ready';
    case 'pending':
      return 'Generating';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export default function DashboardPage() {
  const supabase = getSupabaseClient();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [companions, setCompanions] = useState<CompanionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const [pendingDelete, setPendingDelete] = useState<CompanionRow | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!supabase) {
      setFetchError('Missing Supabase configuration.');
      setLoading(false);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setCompanions([]);
      setFetchError(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('companions')
      .select('id,name,thumbnail_url,model_url,status,is_active,created_at,personality')
      .order('created_at', { ascending: false });

    if (error) {
      setFetchError(error.message);
      setCompanions([]);
    } else {
      setFetchError(null);
      setCompanions((data ?? []) as CompanionRow[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (!supabase) {
        setSessionToken(null);
        setLoading(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) setSessionToken(session?.access_token ?? null);
      void loadRows();
    };

    void init();

    if (!supabase) return undefined;

    const { data: listener } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSessionToken(session?.access_token ?? null);
      void loadRows();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [supabase, loadRows]);

  async function callApi(id: string, init: RequestInit) {
    if (!sessionToken) throw new Error('Not signed in.');
    const res = await fetch(`/api/companions/${encodeURIComponent(id)}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
    });
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      throw new Error(typeof payload.error === 'string' ? payload.error : `Request failed (${res.status}).`);
    }
    return payload;
  }

  const startRename = (row: CompanionRow) => {
    setEditingId(row.id);
    setEditDraft(row.name);
    setMutationError(null);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveRename = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!editingId || !sessionToken) return;

    const name = editDraft.trim().replace(/\s+/g, ' ');
    if (name.length < 1 || name.length > 120) {
      setMutationError('Name must be between 1 and 120 characters.');
      return;
    }

    setBusyId(editingId);
    setMutationError(null);
    try {
      await callApi(editingId, { method: 'PATCH', body: JSON.stringify({ name }) });
      cancelRename();
      await loadRows();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Rename failed.');
    } finally {
      setBusyId(null);
    }
  };

  const setActive = async (row: CompanionRow, activate: boolean) => {
    if (!sessionToken) return;

    setBusyId(row.id);
    setMutationError(null);
    try {
      await callApi(row.id, { method: 'PATCH', body: JSON.stringify({ activate }) });
      notifyOverlayRefresh();
      await loadRows();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Could not update active companion.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete || !sessionToken) return;

    setBusyId(pendingDelete.id);
    setMutationError(null);
    try {
      await callApi(pendingDelete.id, { method: 'DELETE' });
      setPendingDelete(null);
      notifyOverlayRefresh();
      await loadRows();
    } catch (err) {
      setMutationError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setBusyId(null);
    }
  };

  const canUseApi = !!supabase && !!sessionToken;

  return (
    <main>
      <div className="card" style={{ display: 'grid', gap: 22 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <span className="badge">Dashboard</span>
            <h1 style={{ margin: '12px 0 8px', fontSize: 32 }}>Your companions</h1>
            <p style={{ margin: 0, maxWidth: 560 }}>
              Rename, activate for the floating viewer, or remove models you no longer need.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <a className="btn secondary" href="/upload">
              Upload &amp; generate
            </a>
            <a className="btn secondary" href="/">
              Home
            </a>
          </div>
        </div>

        {!supabase && (
          <div className="error">
            Supabase env vars are missing: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
          </div>
        )}

        {!loading && supabase && !sessionToken && (
          <div className="error" style={{ margin: 0 }}>
            Sign in at <a href="/login">/login</a> to manage your companions.
          </div>
        )}

        {fetchError && <div className="error">{fetchError}</div>}
        {mutationError && <div className="error">{mutationError}</div>}

        {loading && canUseApi && <p style={{ margin: 0 }}>Loading…</p>}

        {!loading && canUseApi && companions.length === 0 && (
          <div
            style={{
              borderRadius: 14,
              border: '1px dashed rgba(0,0,0,0.18)',
              padding: 36,
              textAlign: 'center',
              background: '#fafafa',
              display: 'grid',
              gap: 14,
            }}
          >
            <strong>No companions yet</strong>
            <span style={{ color: '#444' }}>
              Upload pet photos and run generation — your saved models show up here.
            </span>
            <div>
              <a className="btn" href="/upload">
                Upload photos
              </a>
            </div>
          </div>
        )}

        {companions.length > 0 && (
          <div
            style={{
              display: 'grid',
              gap: 16,
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            }}
          >
            {companions.map((row) => {
              const created = row.created_at ? new Date(row.created_at).toLocaleDateString() : '—';
              const isReady = row.status === 'success' && !!row.model_url;
              const isBusy = busyId === row.id;

              return (
                <article
                  key={row.id}
                  style={{
                    border: '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 14,
                    padding: 14,
                    display: 'grid',
                    gap: 10,
                    background: row.is_active ? 'linear-gradient(180deg, #fff8ec, #fff)' : '#fff',
                    boxShadow: row.is_active ? '0 8px 24px rgba(255,140,42,0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      aspectRatio: '4/3',
                      borderRadius: 10,
                      overflow: 'hidden',
                      background: '#eee',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {row.thumbnail_url ? (
                      <img
                        src={row.thumbnail_url}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <span style={{ fontSize: 42, opacity: 0.25 }} aria-hidden>
                        🐾
                      </span>
                    )}
                  </div>

                  {editingId === row.id ? (
                    <form onSubmit={(e) => void saveRename(e)} style={{ display: 'grid', gap: 8 }}>
                      <input
                        className="input"
                        value={editDraft}
                        onChange={(ev) => setEditDraft(ev.target.value)}
                        maxLength={120}
                        aria-label={`Rename ${row.name}`}
                      />
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn" type="submit" disabled={isBusy}>
                          Save
                        </button>
                        <button className="btn secondary" type="button" onClick={cancelRename} disabled={isBusy}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: 18 }}>{row.name}</h2>
                        {row.is_active && (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              letterSpacing: 0.03,
                              textTransform: 'uppercase',
                              color: '#b35a00',
                              background: '#ffe6b7',
                              padding: '3px 8px',
                              borderRadius: 6,
                            }}
                          >
                            Active
                          </span>
                        )}
                      </div>
                      <small style={{ color: '#444' }}>
                        Added {created} ·{' '}
                        <span title={row.status}>{statusLabel(row.status)}</span> ·{' '}
                        <span style={{ textTransform: 'capitalize' }}>{row.personality}</span>
                      </small>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button
                          type="button"
                          className="btn secondary"
                          style={{ flex: '1 1 auto' }}
                          onClick={() => startRename(row)}
                          disabled={isBusy}
                        >
                          Rename
                        </button>
                        {isReady && !row.is_active && (
                          <button
                            type="button"
                            className="btn"
                            style={{ flex: '1 1 auto' }}
                            onClick={() => void setActive(row, true)}
                            disabled={isBusy}
                          >
                            Set active
                          </button>
                        )}
                        {isReady && row.is_active && (
                          <button
                            type="button"
                            className="btn secondary"
                            style={{ flex: '1 1 auto' }}
                            onClick={() => void setActive(row, false)}
                            disabled={isBusy}
                          >
                            Deactivate
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn secondary"
                          style={{
                            flex: '1 1 100%',
                            background: '#8b2b2b',
                            color: '#fff',
                          }}
                          onClick={() => {
                            setPendingDelete(row);
                            setMutationError(null);
                          }}
                          disabled={isBusy}
                        >
                          Delete…
                        </button>
                      </div>
                    </>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {pendingDelete && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            onClick={() => !busyId && setPendingDelete(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(20,20,20,0.45)',
              display: 'grid',
              placeItems: 'center',
              padding: 20,
              zIndex: 50,
            }}
          >
            <div
              className="card"
              style={{ maxWidth: 420, width: '100%', display: 'grid', gap: 14 }}
              onClick={(evt) => evt.stopPropagation()}
            >
              <h2 id="delete-dialog-title" style={{ margin: 0, fontSize: 20 }}>
                Delete companion?
              </h2>
              <p style={{ margin: 0 }}>
                This permanently removes “{pendingDelete.name}”, its database row, and the generated model files from
                storage. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => setPendingDelete(null)}
                  disabled={busyId === pendingDelete.id}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#8b2b2b' }}
                  onClick={() => void confirmDelete()}
                  disabled={busyId === pendingDelete.id}
                >
                  {busyId === pendingDelete.id ? 'Deleting…' : 'Delete permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
