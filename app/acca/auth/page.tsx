'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

function ACCAAuthForm() {
  const searchParams = useSearchParams();
  const next        = searchParams.get('next') ?? '/acca';
  const hasError    = searchParams.get('error') === 'auth_failed';
  const supabase    = createClient();

  const [email,     setEmail]     = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(
    hasError ? 'That link expired or was already used — request a new one.' : ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (otpError) {
      setError(otpError.message);
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div style={cardStyle}>
        <h1 style={headingStyle}>Check your email</h1>
        <p style={subStyle}>
          We sent a sign-in link to <strong>{email}</strong>. Click it to open your drills.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 12 }}>
          No email? Check spam, or{' '}
          <button
            onClick={() => { setSubmitted(false); setEmail(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontSize: 13, padding: 0, textDecoration: 'underline' }}
          >
            try a different address
          </button>.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <h1 style={headingStyle}>Sign in to continue</h1>
      <p style={subStyle}>Enter your email — we&apos;ll send a sign-in link. No password needed.</p>

      {error && (
        <div style={{
          background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.3)',
          borderRadius: 8,
          padding: '10px 14px',
          marginBottom: 20,
          fontSize: 13,
          color: '#b91c1c',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="email"
            style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: 'var(--text)' }}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={loading || !email.trim()}
          style={{ marginTop: 4 }}
        >
          {loading
            ? <><span className="spinner" />Sending link…</>
            : 'Send sign-in link →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-muted)' }}>
        By continuing you agree to our{' '}
        <Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Terms</Link>
        {' & '}
        <Link href="/privacy" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Privacy Policy</Link>
      </p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  padding: '40px 36px',
  boxShadow: 'var(--shadow-lg)',
};

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontSize: 24,
  fontWeight: 700,
  color: 'var(--text)',
  marginBottom: 8,
  letterSpacing: '-0.3px',
};

const subStyle: React.CSSProperties = {
  fontSize: 15,
  color: 'var(--text-muted)',
  lineHeight: 1.55,
  marginBottom: 28,
};

export default function ACCAAuthPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px 16px',
      gap: 24,
    }}>
      <Link href="/" style={{ textDecoration: 'none' }}>
        <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 24, width: 'auto' }} />
      </Link>
      <Suspense>
        <ACCAAuthForm />
      </Suspense>
    </div>
  );
}
