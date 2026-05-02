'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabaseClient = getSupabaseClient();
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const hydrateSession = async () => {
      if (!supabaseClient) return;

      const { data: existing } = await supabaseClient.auth.getSession();
      if (existing.session) {
        setHasSession(true);
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabaseClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!error) {
          setHasSession(true);
        } else {
          setMessage(error.message);
        }
        return;
      }

      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');
      if (code) {
        const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (!error) {
          setHasSession(true);
        } else {
          setMessage(error.message);
        }
      }
    };

    hydrateSession();
  }, [supabaseClient]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (!supabaseClient) {
      setMessage('Missing Supabase environment variables.');
      return;
    }

    if (!hasSession) {
      setMessage('Open the reset link from your email in this browser first.');
      return;
    }

    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password updated. You can sign in now.');
    }
    setLoading(false);
  };

  return (
    <main>
      <div className="card" style={{ display: 'grid', gap: 16, maxWidth: 460 }}>
        <h1 style={{ margin: 0 }}>Reset password</h1>
        <p style={{ margin: 0 }}>Set a new password for your account.</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            className="input"
            type="password"
            placeholder="New password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
        {message && (
          <div className={message.includes('updated') ? 'success' : 'error'}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
