'use client';

// Minimal marketing-consent banner — gradd.ai only (the caller host-gates).
// Accept and Decline carry equal visual weight by design: identical styling,
// no pre-selected default, no dark pattern. House style via global CSS vars.

import React from 'react';

export default function ConsentBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div role="dialog" aria-label="Cookie consent" aria-live="polite" style={wrap}>
      <p style={text}>
        We use one marketing cookie (Meta) to measure our ads. Strictly necessary cookies are always on.{' '}
        <a href="/cookies" style={link}>Learn more</a>.
      </p>
      <div style={btnRow}>
        <button type="button" onClick={onDecline} style={btn}>Decline</button>
        <button type="button" onClick={onAccept} style={btn}>Accept</button>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  position: 'fixed',
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 9999,
  background: 'var(--surface)',
  borderTop: '1px solid var(--border)',
  boxShadow: '0 -4px 24px rgba(14,43,30,0.10)',
  padding: '14px clamp(16px, 4vw, 32px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
  flexWrap: 'wrap',
  fontFamily: 'var(--font-body)',
};

const text: React.CSSProperties = {
  fontSize: 13.5,
  color: 'var(--text)',
  lineHeight: 1.5,
  margin: 0,
  maxWidth: '64ch',
};

const link: React.CSSProperties = {
  color: 'var(--brand)',
  textDecoration: 'underline',
};

const btnRow: React.CSSProperties = {
  display: 'flex',
  gap: 10,
  flexShrink: 0,
};

// Both buttons identical — equal weight, no emphasised primary.
const btn: React.CSSProperties = {
  fontFamily: 'var(--font-body)',
  fontSize: 13.5,
  fontWeight: 600,
  padding: '9px 22px',
  borderRadius: 999,
  cursor: 'pointer',
  border: '1.5px solid var(--brand)',
  background: 'transparent',
  color: 'var(--brand)',
};
