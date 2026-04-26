'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

type BillingPeriod = 'monthly' | 'annual';

const PLANS = {
  monthly: {
    price: '€24.99',
    period: '/month',
    saving: null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY,
  },
  annual: {
    price: '€199',
    period: '/year',
    saving: 'Save €101 vs monthly',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL,
  },
};

// ── Post-payment polling ──────────────────────────────────────
// Stripe redirects back to /subscribe?success=true before the webhook
// has updated subscription_status. Poll until it flips to active,
// then redirect to dashboard. Gives up after 15 seconds.

function SuccessPoller() {
  const router = useRouter();
  const supabase = createClient();
  const [attempt, setAttempt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (timedOut) return;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (profile?.subscription_status === 'active') {
        router.push('/dashboard');
        return;
      }

      if (attempt >= 14) {
        setTimedOut(true);
        return;
      }

      setTimeout(() => setAttempt(a => a + 1), 1000);
    };

    check();
  }, [attempt, timedOut]);

  if (timedOut) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16, padding: 32 }}>
        <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>G</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand)', fontWeight: 700 }}>Payment received</h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 380 }}>
          Your payment went through but we're still activating your account. This usually takes a few seconds — refresh the page or go to your dashboard.
        </p>
        <button
          onClick={() => router.push('/dashboard')}
          className="btn btn-primary"
          style={{ marginTop: 8 }}
        >
          Go to dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>G</div>
      <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 8 }}>Setting up your account…</p>
    </div>
  );
}

// ── Main subscribe page ───────────────────────────────────────

function SubscribePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('success') === 'true';

  const [billing, setBilling] = useState<BillingPeriod>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (paymentSuccess) {
    return <SuccessPoller />;
  }

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ billing }),
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      setError(data.error ?? 'Something went wrong. Please try again.');
      setLoading(false);
      return;
    }

    window.location.href = data.url;
  };

  const plan = PLANS[billing];

  return (
    <div className="auth-page" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40, justifyContent: 'center' }}>
          <div className="auth-logo-mark">G</div>
          <span className="auth-logo-name">Gradd</span>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px 40px', boxShadow: 'var(--shadow-lg)' }}>
          <h1 className="auth-heading" style={{ textAlign: 'center', marginBottom: 8 }}>
            Start learning today
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 15, marginBottom: 36 }}>
            LC Business — full curriculum, Aoife as your personal tutor.
          </p>

          {/* Billing toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: 32, gap: 4 }}>
            {(['monthly', 'annual'] as BillingPeriod[]).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: 'none',
                  background: billing === b ? 'var(--surface)' : 'transparent',
                  color: billing === b ? 'var(--brand)' : 'var(--text-muted)',
                  fontWeight: billing === b ? 700 : 500, fontSize: 14, cursor: 'pointer',
                  boxShadow: billing === b ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease', fontFamily: 'var(--font-body)',
                }}
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span style={{ marginLeft: 6, background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    Best value
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Price display */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 52, fontWeight: 700, color: 'var(--brand)', lineHeight: 1, letterSpacing: '-1px' }}>
              {plan.price}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 6 }}>{plan.period}</div>
            {plan.saving && (
              <div style={{ marginTop: 8, color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>{plan.saving}</div>
            )}
          </div>

          {/* What's included */}
          <ul style={{ listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              'Full LC Business curriculum — all 6 units',
              'Structured lessons from scratch to exam-ready',
              'Aoife — your personal AI tutor',
              'Progress tracking & weak area alerts',
              'Exam technique & past paper practice',
              'Cancel any time',
            ].map(feature => (
              <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                <span style={{ width: 20, height: 20, background: 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>

          {/* Parent reassurance */}
          <div style={{
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '12px 16px',
            marginBottom: 24, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--text)', fontWeight: 600 }}>For parents:</strong> Gradd is a structured academic tool, not open-ended AI chat. Every session follows the SEC syllabus. You can view your child's progress from the parent dashboard at any time.
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <><span className="spinner" />Redirecting to checkout…</>
            ) : (
              `Subscribe — ${plan.price}${plan.period}`
            )}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-light)' }}>
            Secure payment via Stripe. 7-day money-back guarantee. Cancel any time in account settings.{' '}
            <Link href="/terms" style={{ color: 'var(--text-light)', textDecoration: 'underline' }}>Terms</Link>
            {' '}·{' '}
            <Link href="/privacy" style={{ color: 'var(--text-light)', textDecoration: 'underline' }}>Privacy</Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          Less than one grind session — for an entire month of structured study.
        </p>
      </div>
    </div>
  );
}

export default function SubscribePage() {
  return (
    <Suspense>
      <SubscribePageInner />
    </Suspense>
  );
}
