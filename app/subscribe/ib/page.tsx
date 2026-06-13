'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';

type BillingPeriod = 'monthly' | 'annual';

const IB_CONFIG = {
  label: 'IB Economics + Business Management',
  monthly: '€44.99',
  annual: '€349',
  annualSaving: 'Save €191 vs monthly',
  features: [
    'Full IB Economics curriculum — SL & HL',
    'Full IB Business Management curriculum — SL & HL',
    'Mia — your personal AI IB tutor across both subjects',
    'Command term technique for every exam paper',
    'Paper 1, 2 & 3 exam practice',
    'Progress tracking & weak area alerts',
    'Cancel any time',
  ],
};

function IBSubscribeInner() {
  const config = IB_CONFIG;

  const [billing, setBilling] = useState<BillingPeriod>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    const res = await fetch('/api/checkout/ib', {
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

  const price = billing === 'monthly' ? config.monthly : config.annual;
  const period = billing === 'monthly' ? '/month' : '/year';

  return (
    <div className="auth-page" style={{ background: 'var(--bg)' }}>
      <div style={{ width: '100%', maxWidth: 520 }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--brand)',
              letterSpacing: '-0.3px',
            }}>
              Gradd.ai
            </span>
          </Link>
        </div>

        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '48px 40px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          <h1 className="auth-heading" style={{ textAlign: 'center', marginBottom: 8 }}>
            Start learning today
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 15, marginBottom: 36 }}>
            {config.label} — full IB curriculum, Mia as your personal tutor.
          </p>

          {/* Billing toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            padding: 4,
            marginBottom: 32,
            gap: 4,
          }}>
            {(['monthly', 'annual'] as BillingPeriod[]).map(b => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: billing === b ? 'var(--surface)' : 'transparent',
                  color: billing === b ? 'var(--brand)' : 'var(--text-muted)',
                  fontWeight: billing === b ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: billing === b ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span style={{
                    marginLeft: 6,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                  }}>
                    Best value
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Price */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 52,
              fontWeight: 700,
              color: 'var(--brand)',
              lineHeight: 1,
              letterSpacing: '-1px',
            }}>
              {price}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 6 }}>{period}</div>
            {billing === 'annual' && (
              <div style={{ marginTop: 8, color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
                {config.annualSaving}
              </div>
            )}
          </div>

          {/* Features */}
          <ul style={{ listStyle: 'none', marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {config.features.map(feature => (
              <li key={feature} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--text)' }}>
                <span style={{
                  width: 20,
                  height: 20,
                  background: 'var(--brand)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>

          <div style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 24,
            fontSize: 13,
            color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            Subscribe to access the full IB curriculum with Mia.
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubscribe}
            disabled={loading}
            style={{ whiteSpace: 'normal' }}
          >
            {loading
              ? <><span className="spinner" />Redirecting to checkout…</>
              : `Subscribe — ${price}${period}`}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-light)' }}>
            Secure payment via Stripe. Cancel any time in account settings.{' '}
            <Link href="/terms" style={{ color: 'var(--text-light)', textDecoration: 'underline' }}>Terms</Link>
            {' '}·{' '}
            <Link href="/privacy" style={{ color: 'var(--text-light)', textDecoration: 'underline' }}>Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function IBSubscribePage() {
  return (
    <Suspense>
      <IBSubscribeInner />
    </Suspense>
  );
}
