'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

type APMProduct = 'pass' | 'monthly';

// One ACCA subscription is a BUNDLE — it covers every live paper (APM + AFM today, more as
// they ship), so the feature copy is paper-neutral: no APM-only breadth claim, no hardcoded
// counts to drift. The paper the student came from only drives the lead line below.
const PASS_FEATURES = [
  'Every drill across APM and AFM — and every ACCA paper we add',
  'Unlimited teach-throughs with Ezra for 90 days',
  'Application & evaluation diagnosis on the specific scenario',
  'Command-verb + ACCA intellectual-level coaching on every answer',
  'One payment — no recurring charge',
];

const MONTHLY_FEATURES = [
  'Every drill across APM and AFM — and every ACCA paper we add',
  'Unlimited teach-throughs with Ezra',
  'Application & evaluation diagnosis on the specific scenario',
  'Command-verb + ACCA intellectual-level coaching on every answer',
  'Cancel any time',
];

// Polls the fail-closed access gate after the Stripe redirect. The webhook flips
// the profile a beat after payment, so we poll until access is confirmed, then land
// the student straight in the tutor. Critically we NEVER route a just-paid user
// forward while access is still false — that would drop them back on the paywall.
// Instead we keep polling: 15× at 1s, then every 3s out to ~60s, after which the UI
// switches to an honest "still activating" panel BUT the poll keeps running in the
// background, so a late webhook still auto-routes the paid user in. The only forward
// route is on a confirmed access===true.
const FAST_POLLS = 15;            // 15 × 1s
const FAST_INTERVAL_MS = 1000;
const SLOW_INTERVAL_MS = 3000;
const SLOW_AFTER_ATTEMPTS = 30;   // ~60s total (15×1s + 15×3s) → switch UI, keep polling

function SuccessPoller() {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const stillActivating = attempt >= SLOW_AFTER_ATTEMPTS;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const res = await fetch('/api/acca/access', { cache: 'no-store' });
        // Fail-closed on the client too: only a 200 with access===true routes the
        // user through. Any non-200, parse failure, or access!==true falls through
        // to another poll — a paid user is never pushed forward on unconfirmed access.
        if (!cancelled && res.ok) {
          const json = await res.json();
          if (json.access === true) {
            router.push('/acca/tutor');
            return;
          }
        }
      } catch {
        // swallow — fall through to retry
      }
      if (cancelled) return;
      // Never give up: back off after the fast phase; past the ~60s budget the UI
      // switches to the honest panel, but this timer keeps polling regardless.
      const delay = attempt < FAST_POLLS ? FAST_INTERVAL_MS : SLOW_INTERVAL_MS;
      timer = setTimeout(() => { if (!cancelled) setAttempt((a) => a + 1); }, delay);
    })();

    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [attempt, router]);

  if (stillActivating) {
    // Honest holding state — still polling in the background. "Check again" forces
    // an immediate re-poll; there is deliberately NO manual "go to the tutor" that
    // would push on unconfirmed access. The moment access lands, the poll above
    // auto-routes the user in.
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16, padding: 32 }}>
        <img src="/gradd-ai-logo.png" alt="Gradd" height={28} style={{ display: 'block', marginBottom: 8 }} />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--brand)', fontWeight: 700 }}>Payment received</h2>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 400 }}>
          Your access is taking a moment to activate. This usually resolves in under a minute — we&apos;re still checking, and you&apos;ll go straight to the tutor the moment it&apos;s ready.
        </p>
        <button onClick={() => setAttempt((a) => a + 1)} className="btn btn-primary" style={{ marginTop: 8 }}>
          Check again
        </button>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
          Still checking…
        </span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <img src="/gradd-ai-logo.png" alt="Gradd" height={28} style={{ display: 'block', marginBottom: 8 }} />
      <span className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginTop: 8 }}>Activating your access…</p>
    </div>
  );
}

// Resolve which paper the student came from: explicit ?paper= first, then an AFM referrer
// heuristic (the burn CTA + tutor upsells pass ?paper=, so this is mostly the direct signal),
// else null → paper-neutral lead. Bundle access is identical whichever paper they arrived on.
function resolvePaperContext(param: string | null): 'APM' | 'AFM' | null {
  const p = (param || '').toUpperCase();
  if (p === 'APM' || p === 'AFM') return p;
  if (typeof document !== 'undefined' && /(?:paper=afm|\/acca\/afm|\/afm)/i.test(document.referrer)) return 'AFM';
  return null;
}

function APMSubscribeInner() {
  const searchParams = useSearchParams();
  const paymentSuccess = searchParams.get('success') === 'true';
  const paper = resolvePaperContext(searchParams.get('paper'));
  // Lead with the paper they came from; the offer (bundle) is identical either way.
  const leadSub = paper
    ? `Unlock the full ${paper} bank — and everything else. One Gradd subscription covers every drill across APM and AFM, plus every ACCA paper we add.`
    : 'One Gradd subscription covers every drill across APM and AFM — unlimited coaching with Ezra, plus every ACCA paper we add.';

  const [selected, setSelected] = useState<APMProduct>('pass');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (paymentSuccess) {
    return <SuccessPoller />;
  }

  const handleCheckout = async (product: APMProduct) => {
    setSelected(product);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout/acca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product }),
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
    <div className="apm-sub">
      <style>{CSS}</style>

      <div className="apm-sub-logo">
        <Link href="/acca" style={{ textDecoration: 'none' }}>
          <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 22, width: 'auto', display: 'block' }} />
        </Link>
      </div>

      <div className="apm-sub-head">
        <h1 className="apm-sub-title">Keep drilling with Ezra</h1>
        <p className="apm-sub-sub">{leadSub}</p>
      </div>

      <div className="apm-sub-cards">

        {/* HERO — 90-day pass */}
        <div className={`apm-card apm-card--hero${selected === 'pass' ? ' is-active' : ''}`}>
          <div className="apm-card-flag">Best value</div>
          <div className="apm-card-label">90-day pass</div>
          <div className="apm-card-price">
            <span className="apm-card-amount">€99</span>
            <span className="apm-card-period">one-time · 90 days</span>
          </div>
          <p className="apm-card-blurb">Full access through exam season. Pay once, no recurring charge.</p>
          <ul className="apm-card-features">
            {PASS_FEATURES.map(f => (
              <li key={f}>
                <span className="apm-tick" aria-hidden="true">
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            className="apm-btn apm-btn--rust"
            onClick={() => handleCheckout('pass')}
            disabled={loading}
          >
            {loading && selected === 'pass' ? <><span className="spinner" />Redirecting…</> : 'Get the 90-day pass — €99'}
          </button>
        </div>

        {/* Monthly */}
        <div className={`apm-card${selected === 'monthly' ? ' is-active' : ''}`}>
          <div className="apm-card-label">Monthly</div>
          <div className="apm-card-price">
            <span className="apm-card-amount">€49</span>
            <span className="apm-card-period">/month</span>
          </div>
          <p className="apm-card-blurb">Flexible — keep it for as long as you&apos;re revising, cancel any time.</p>
          <ul className="apm-card-features">
            {MONTHLY_FEATURES.map(f => (
              <li key={f}>
                <span className="apm-tick" aria-hidden="true">
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            className="apm-btn apm-btn--ghost"
            onClick={() => handleCheckout('monthly')}
            disabled={loading}
          >
            {loading && selected === 'monthly' ? <><span className="spinner" />Redirecting…</> : 'Subscribe — €49/month'}
          </button>
        </div>

      </div>

      {error && <div className="apm-sub-error" role="alert">{error}</div>}

      <p className="apm-sub-fine">
        Secure payment via Stripe.{' '}
        <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
      </p>
    </div>
  );
}

export default function APMSubscribePage() {
  return (
    <Suspense>
      <APMSubscribeInner />
    </Suspense>
  );
}

const CSS = `
.apm-sub {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(32px, 6vw, 64px) clamp(16px, 4vw, 32px);
  gap: 28px;
}
.apm-sub *, .apm-sub *::before, .apm-sub *::after { box-sizing: border-box; }

.apm-sub-logo { display: flex; justify-content: center; }
.apm-sub-head { text-align: center; max-width: 560px; display: flex; flex-direction: column; gap: 10px; }
.apm-sub-title {
  font-family: var(--font-display);
  font-size: clamp(26px, 4vw, 36px);
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
  margin: 0;
  line-height: 1.1;
}
.apm-sub-sub { font-size: 15px; color: var(--text-muted); line-height: 1.55; margin: 0; }

.apm-sub-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  width: 100%;
  max-width: 760px;
  align-items: start;
}
@media (max-width: 720px) { .apm-sub-cards { grid-template-columns: 1fr; max-width: 440px; } }

.apm-card {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.apm-card.is-active { border-color: var(--rust); box-shadow: 0 0 0 1px var(--rust); }
.apm-card--hero { border-color: rgba(192,94,60,0.4); box-shadow: var(--shadow-lg); }

.apm-card-flag {
  position: absolute;
  top: -11px;
  left: 26px;
  background: var(--rust);
  color: var(--rust-ink);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 999px;
}
.apm-card-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.apm-card-price { display: flex; align-items: baseline; gap: 8px; }
.apm-card-amount {
  font-family: var(--font-display);
  font-size: 44px;
  font-weight: 700;
  color: var(--brand);
  line-height: 1;
  letter-spacing: -1px;
}
.apm-card-period { font-size: 14px; color: var(--text-muted); }
.apm-card-blurb { font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0; }

.apm-card-features { list-style: none; margin: 4px 0 6px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.apm-card-features li { display: flex; align-items: flex-start; gap: 10px; font-size: 13.5px; color: var(--text); line-height: 1.45; }
.apm-tick {
  width: 18px; height: 18px; margin-top: 1px;
  background: var(--rust);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

.apm-btn {
  margin-top: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 22px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: normal;
}
.apm-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.apm-btn--rust { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.apm-btn--rust:not(:disabled):hover { background: var(--rust-dark); border-color: var(--rust-dark); }
.apm-btn--ghost { background: transparent; color: var(--text); border-color: var(--border); }
.apm-btn--ghost:not(:disabled):hover { background: var(--surface-2); border-color: var(--text-muted); }

.apm-sub-error {
  background: #fff0f0;
  border: 1px solid #f5c6c6;
  color: #c0392b;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
  max-width: 760px;
  width: 100%;
  text-align: center;
}

.apm-sub-fine { font-size: 12px; color: var(--text-light, var(--text-muted)); text-align: center; }
.apm-sub-fine a { color: inherit; text-decoration: underline; }
`;
