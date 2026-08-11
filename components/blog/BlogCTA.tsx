import Link from 'next/link';
import { ctaCopyFor, type BlogSubject } from '@/lib/blog-subject';

// Subject-aware end-of-post CTA. IB posts (Econ/BM) get the Mia copy and the IB signup;
// ACCA posts get the Ezra copy and the account-gated drills FOR THEIR OWN PAPER.
// Copy is intentionally soft (teach-first) — one CTA per post, rendered by the template.
//
// ── THE CONVERSION POINT WAS THE WORST PLACE THIS BUG LIVED ─────────────────────────────
// This component decided everything from `isAPM = subject === 'APM'`, so ACCA meant APM and
// everything else meant IB. An AFM post would have been offered MIA, the IB curriculum note,
// and `/auth/signup/ib` — a cross-PRODUCT mis-send: wrong tutor, wrong price, wrong signup
// form, at the one place on the page where the reader is being asked to act. It is now keyed
// on the post's own subject through the shared table, and `subject` is TYPED (it was `string`,
// which is how a value that never matched 'APM' silently meant IB).
export default function BlogCTA({ subject }: { subject: BlogSubject }) {
  const { headline, sub, note, href, button } = ctaCopyFor(subject);

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
