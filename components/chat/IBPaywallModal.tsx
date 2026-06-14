'use client';

import { useState } from 'react';

interface IBPaywallModalProps {
  subject?: string;
  reason?: 'cap' | 'burn';
  onClose?: () => void;
}

const IB_LABEL = 'IB Economics + Business Management';
const IB_PRICES = { monthly: '€44.99', annual: '€349', annualSaving: 'Save €191 vs monthly' };

export default function IBPaywallModal({ reason, onClose }: IBPaywallModalProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const label = IB_LABEL;
  const prices = IB_PRICES;

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
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
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(14,43,30,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: 24,
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
        padding: '40px 36px', maxWidth: 480, width: '100%',
        boxShadow: 'var(--shadow-lg)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--brand)', margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
              <path d="M2 10L9 17L22 3" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700,
            color: 'var(--brand)', letterSpacing: '-0.3px', marginBottom: 8,
          }}>
            {reason === 'burn' ? 'Keep going with this' : 'Lesson 1 complete'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {reason === 'burn'
              ? `You're right at the point that turns confusion into understanding. Subscribe to finish this teaching and unlock all of ${label}.`
              : `Subscribe to continue with ${label} and unlock every lesson.`}
          </p>
        </div>

        {/* Billing toggle */}
        <div style={{
          display: 'flex', background: 'var(--surface-2)',
          borderRadius: 'var(--radius-sm)', padding: 4, marginBottom: 24, gap: 4,
        }}>
          {(['monthly', 'annual'] as const).map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
                fontWeight: billing === b ? 700 : 500, fontSize: 14,
                background: billing === b ? 'var(--surface)' : 'transparent',
                color: billing === b ? 'var(--brand)' : 'var(--text-muted)',
                boxShadow: billing === b ? 'var(--shadow-sm)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              {b === 'monthly' ? 'Monthly' : 'Annual'}
              {b === 'annual' && (
                <span style={{
                  marginLeft: 6, background: 'var(--accent)', color: '#fff',
                  fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 700,
                }}>
                  Best value
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Price */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 700,
            color: 'var(--brand)', lineHeight: 1, letterSpacing: '-1px',
          }}>
            {billing === 'monthly' ? prices.monthly : prices.annual}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 4 }}>
            {billing === 'monthly' ? '/month' : '/year'}
          </div>
          {billing === 'annual' && (
            <div style={{ marginTop: 6, color: 'var(--success)', fontSize: 14, fontWeight: 600 }}>
              {prices.annualSaving}
            </div>
          )}
        </div>

        {/* Guarantee note */}
        <div style={{
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px',
          fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
          marginBottom: 20, lineHeight: 1.5,
        }}>
          7-day money-back guarantee · Cancel any time
        </div>

        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={handleSubscribe}
          disabled={loading}
          style={{ marginBottom: 12 }}
        >
          {loading
            ? <><span className="spinner" />Redirecting to checkout…</>
            : `Subscribe — ${billing === 'monthly' ? prices.monthly + '/month' : prices.annual + '/year'}`
          }
        </button>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '11px 16px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontWeight: 500,
            }}
          >
            Keep practising your questions free
          </button>
        )}
      </div>
    </div>
  );
}
