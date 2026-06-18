import Link from 'next/link';

export default function BlogCTA() {
  return (
    <div style={{
      marginTop: 56,
      padding: '36px 32px',
      background: 'var(--brand)',
      borderRadius: 14,
      textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-display), Georgia, serif',
        fontStyle: 'italic',
        fontWeight: 400,
        fontSize: 22,
        color: '#f7f3ec',
        margin: '0 0 8px',
        letterSpacing: '-0.02em',
      }}>
        Stop practising the wrong answer.
      </p>
      <p style={{
        fontSize: 15,
        color: 'oklch(75% 0.02 80)',
        margin: '0 0 6px',
        lineHeight: 1.55,
      }}>
        Mia spots the misconception, fixes the thinking, and makes you redraw it correctly.
      </p>
      <p style={{
        fontSize: 14,
        color: 'oklch(65% 0.02 80)',
        margin: '0 0 24px',
        lineHeight: 1.55,
      }}>
        Across the full IB Economics and Business Management curriculum. Free to start. No card needed.
      </p>
      <Link
        href="/auth/signup/ib"
        style={{
          display: 'inline-block',
          padding: '13px 28px',
          background: 'oklch(64% 0.17 47)',
          color: '#fff',
          borderRadius: 9,
          fontFamily: 'var(--font-body), system-ui, sans-serif',
          fontWeight: 600,
          fontSize: 15,
          textDecoration: 'none',
          letterSpacing: '-0.01em',
        }}
      >
        Try Mia free →
      </Link>
    </div>
  );
}
