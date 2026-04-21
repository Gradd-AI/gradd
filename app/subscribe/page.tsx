'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function SubscribePage() {
  const router = useRouter();
  const [billing, setBilling] = useState<BillingPeriod>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 40,
            justifyContent: 'center',
          }}
        >
          <div className="auth-logo-mark">G</div>
          <span className="auth-logo-name">Gradd</span>
        </div>

        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '48px 40px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <h1
            className="auth-heading"
            style={{ textAlign: 'center', marginBottom: 8 }}
          >
            Start learning today
          </h1>
          <p
            style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 15,
              marginBottom: 36,
            }}
          >
            LC Business — full curriculum, Aoife as your personal tutor.
          </p>

          {/* Billing toggle */}
          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              padding: 4,
              marginBottom: 32,
              gap: 4,
            }}
          >
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
                  <span
                    style={{
                      marginLeft: 6,
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 11,
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 700,
                    }}
                  >
                    Best value
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Price display */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 52,
                fontWeight: 700,
                color: 'var(--brand)',
                lineHeight: 1,
                letterSpacing: '-1px',
              }}
            >
              {plan.price}
            </div>
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: 16,
                marginTop: 6,
              }}
            >
              {plan.period}
            </div>
            {plan.saving && (
              <div
                style={{
                  marginTop: 8,
                  color: 'var(--success)',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {plan.saving}
              </div>
            )}
          </div>

          {/* Features */}
          <ul
            style={{
              listStyle: 'none',
              marginBottom: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {[
              'Full LC Business curriculum — all 6 units',
              'Structured lessons from scratch to exam-ready',
              'Aoife — your personal AI tutor',
              'Progress tracking & weak area alerts',
              'Exam technique & past paper practice',
              'Cancel anytime',
            ].map(feature => (
              <li
                key={feature}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 14,
                  color: 'var(--text)',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    background: 'var(--brand)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                    <path
                      d="M1 4L4 7L10 1"
                      stroke="white"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {feature}
              </li>
            ))}
          </ul>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Redirecting to checkout…
              </>
            ) : (
              `Subscribe — ${plan.price}${plan.period}`
            )}
          </button>

          <p
            style={{
              textAlign: 'center',
              marginTop: 16,
              fontSize: 12,
              color: 'var(--text-light)',
            }}
          >
            Secure payment via Stripe. Cancel anytime in account settings.
          </p>
        </div>

        <p
          style={{
            textAlign: 'center',
            marginTop: 24,
            fontSize: 13,
            color: 'var(--text-muted)',
          }}
        >
          Less than one grind session — for an entire month of structured study.
        </p>
      </div>
    </div>
  );
}
