'use client';

import { FormEvent, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabaseClient = getSupabaseClient();

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!supabaseClient) {
      setMessage('Missing Supabase environment variables.');
      setLoading(false);
      return;
    }

    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signed in. You can upload photos now.');
    }

    setLoading(false);
  };

  const handleSignUp = async () => {
    setMessage(null);
    setLoading(true);

    if (!supabaseClient) {
      setMessage('Missing Supabase environment variables.');
      setLoading(false);
      return;
    }

    const { error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Account created. Check your email to confirm if required.');
    }

    setLoading(false);
  };

  const handleForgotPassword = async () => {
    setMessage(null);

    if (!supabaseClient) {
      setMessage('Missing Supabase environment variables.');
      return;
    }

    if (!email) {
      setMessage('Enter your email to reset your password.');
      return;
    }

    setLoading(true);
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Password reset email sent. Check your inbox.');
    }

    setLoading(false);
  };

  return (
    <main>
      <div className="card" style={{ display: 'grid', gap: 16, maxWidth: 460 }}>
        <h1 style={{ margin: 0 }}>Sign in</h1>
        <p style={{ margin: 0 }}>
          Use an existing account or create one to log in and upload pet photos.
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <button className="btn secondary" onClick={handleSignUp} disabled={loading}>
          Create account
        </button>
        <button className="btn secondary" onClick={handleForgotPassword} disabled={loading}>
          Forgot password
        </button>
        {!supabaseClient && (
          <div className="error">
            Supabase env vars are missing. Set `NEXT_PUBLIC_SUPABASE_URL` and
            `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
          </div>
        )}
        {message && (
          <div className={message.includes('Signed in') ? 'success' : 'error'}>
            {message}
          </div>
        )}
      </div>
    </main>
  );
}
