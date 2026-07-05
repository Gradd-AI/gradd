import Link from 'next/link';

// Subject-aware end-of-post CTA. IB posts (Econ/BM) keep the Mia copy and link to
// the IB signup; APM posts get the Ezra copy and link to the account-gated drills.
// Copy is intentionally soft (teach-first) — one CTA per post, rendered by the template.
export default function BlogCTA({ subject }: { subject?: string }) {
  const isAPM = subject === 'APM';

  const headline = isAPM
    ? 'Ezra teaches this — and checks you’d score.'
    : 'Stop practising the wrong answer.';
  const sub = isAPM
    ? 'Ezra spots where the marks slipped, coaches the fix, and marks you against the descriptors.'
    : 'Mia spots the misconception, fixes the thinking, and makes you redraw it correctly.';
  const note = isAPM
    ? 'Every APM drill free. No card.'
    : 'Across the full IB Economics and Business Management curriculum. Free to start. No card needed.';
  const href = isAPM ? '/acca/auth?next=/acca' : '/auth/signup/ib';
  const button = isAPM ? 'Try Ezra free →' : 'Try Mia free →';

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
        {headline}
      </p>
      <p style={{
        fontSize: 15,
        color: 'oklch(75% 0.02 80)',
        margin: '0 0 6px',
        lineHeight: 1.55,
      }}>
        {sub}
      </p>
      <p style={{
        fontSize: 14,
        color: 'oklch(65% 0.02 80)',
        margin: '0 0 24px',
        lineHeight: 1.55,
      }}>
        {note}
      </p>
      <Link
        href={href}
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
        {button}
      </Link>
    </div>
  );
}
