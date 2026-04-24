'use client';

// components/ManageSubscriptionButton.tsx
// Drop this anywhere in the dashboard — settings section, account page, etc.
// Calls the portal route, redirects to Stripe-hosted portal page.

import { useState } from 'react';

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleManage = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError('Could not open billing portal. Please try again.');
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
    <div>
      <button
        onClick={handleManage}
        disabled={loading}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text-secondary, #4A4A4A)',
          background: 'transparent',
          border: '1px solid var(--border, #E0E0D8)',
          borderRadius: 8,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          transition: 'border-color 0.15s, color 0.15s',
        }}
      >
        {loading ? 'Opening…' : 'Manage subscription'}
      </button>
      {error && (
        <p style={{ marginTop: 8, fontSize: 13, color: '#B91C1C' }}>{error}</p>
      )}
    </div>
  );
}
