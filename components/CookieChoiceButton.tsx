'use client';

// "Change your cookie choice" — cookies page control (gradd.ai only; the page
// host-gates it). Clears the stored consent choice and, if consent had been
// granted, deletes the first-party _fbp cookie; then the banner re-appears on
// this page immediately (clearConsent dispatches CONSENT_RESET_EVENT).

import React from 'react';
import { clearConsent } from '@/lib/meta-consent';

export default function CookieChoiceButton() {
  return (
    <button type="button" onClick={() => clearConsent()} style={btn}>
      Change your cookie choice
    </button>
  );
}

const btn: React.CSSProperties = {
  display: 'inline-block',
  fontFamily: "'Georgia', serif",
  fontSize: '14px',
  fontWeight: 700,
  color: '#1B3D2F',
  background: '#FFFFFF',
  border: '1.5px solid #1B3D2F',
  borderRadius: '8px',
  padding: '10px 18px',
  cursor: 'pointer',
  marginTop: '4px',
};
