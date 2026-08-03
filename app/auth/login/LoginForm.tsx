'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import type { SiteProduct } from '@/lib/product-router';

// Copy per product. `null` is a real case, not a gap: someone reaching /auth/login from a
// password manager has no referrer and no params, and there is nothing to infer from. The
// neutral strings are written to be true for every product rather than to hedge — a
// sign-in page that guesses wrong reads worse than one that stays general.
const SUBHEADING: Record<SiteProduct, string> = {
  ACCA: 'Your ACCA coach — diagnoses why an answer lost marks, then teaches the fix.',
  IB:   'Your AI-powered IB tutor — structured lessons, exam technique, and progress tracking.',
  LC:   'Your AI-powered Leaving Cert Business tutor — guided lessons, exam technique, and progress tracking.',
};
const SUBMIT_LABEL: Record<SiteProduct, string> = {
  ACCA: 'Sign in to continue with Ezra',
  IB:   'Sign in to continue',
  LC:   'Sign in to continue with Aoife',
};
const FOOTNOTE: Record<SiteProduct, string> = {
  ACCA: 'Supporting ACCA Strategic Professional students worldwide.',
  IB:   'Supporting IB Economics and Business Management students worldwide.',
  LC:   'Built for Irish Leaving Cert Business students.',
};

export default function LoginForm({ product }: { product: SiteProduct | null }) {
  const subheading = product ? SUBHEADING[product] : 'Sign in to pick up where you left off.';
  const submitLabel = product ? SUBMIT_LABEL[product] : 'Sign in to continue';
  const footnote = product ? FOOTNOTE[product] : 'Exam coaching for ACCA and IB students.';
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError('Invalid email or password.');
      setLoading(false);
      return;
    }

    router.push('/go');
    router.refresh();
  };

  return (
    <div className="auth-card">

      <h1 className="auth-heading">Welcome back</h1>
      <p className="auth-subheading">
        {subheading}
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-full btn-lg"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? (<><span className="spinner" />Signing in…</>) : submitLabel}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
        {footnote}
      </p>

      <p className="auth-footer" style={{ marginTop: 12 }}>
        Don&rsquo;t have an account?{' '}
        <Link href="/auth/signup">Sign up</Link>
      </p>
    </div>
  );
}
