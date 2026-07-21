// components/landing/ProductLandingPage.tsx
// Parameterised product landing (first instance: AFM). Renders from a ProductLandingConfig.
// Server component — the only client piece is AttributionCapture (first-touch utm/fbclid).
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';
import type { ProductLandingConfig } from './product-landing-config';

export default function ProductLandingPage({ config: c }: { config: ProductLandingConfig }) {
  return (
    <>
      {/* First-touch utm_* / fbclid → cookie → persisted to the profile at signup. */}
      <AttributionCapture />
      <style>{CSS}</style>
      <div className="plp">
        <header className="plp-header">
          <div className="plp-wrap plp-header-inner">
            <Link href="/" className="plp-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 22, width: 'auto', display: 'block' }} />
            </Link>
            <nav className="plp-nav">
              {c.proof && <Link href={c.proof.href} className="plp-navlink">{c.proof.label}</Link>}
              <Link href="/" className="plp-navlink">ACCA APM</Link>
              <Link href={c.freeCta.href} className="btn btn-rust btn-sm">Start free <span className="arrow">→</span></Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="plp-hero">
            <div className="plp-wrap plp-hero-inner">
              <p className="plp-eyebrow">{c.eyebrow}</p>
              <h1 className="plp-h1">{c.headline}</h1>
              <p className="plp-sub">{c.subhead}</p>
              <p className="plp-coverage"><strong>What’s live:</strong> {c.coverage}</p>
              <div className="plp-cta-row">
                <Link href={c.freeCta.href} className="btn btn-rust btn-lg">{c.freeCta.label} <span className="arrow">→</span></Link>
              </div>
              <p className="plp-microcopy">Free to start · no card · {c.examName} ({c.paper})</p>
              {c.proof && (
                <p className="plp-microcopy">
                  <Link href={c.proof.href} className="plp-prooflink">{c.proof.label} — a real, unedited transcript →</Link>
                </p>
              )}
            </div>
          </section>

          <section className="plp-points">
            <div className="plp-wrap plp-points-grid">
              {c.points.map((p) => (
                <div key={p.title} className="plp-point">
                  <h2 className="plp-point-title">{p.title}</h2>
                  <p className="plp-point-body">{p.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="plp-pricing">
            <div className="plp-wrap">
              <div className="plp-price-card">
                <h2 className="plp-price-h">Free to start. One pass covers every ACCA paper.</h2>
                <p className="plp-price-line">{c.pricing.free}</p>
                <p className="plp-price-line">{c.pricing.paid}</p>
                <div className="plp-cta-row" style={{ marginTop: 20 }}>
                  <Link href={c.freeCta.href} className="btn btn-rust btn-lg">{c.freeCta.label} <span className="arrow">→</span></Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="plp-footer">
          <div className="plp-wrap plp-footer-inner">
            <span>© 2026 Gradd.ai · {c.footnote}</span>
            <div className="plp-footer-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/">ACCA APM</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const CSS = `
.plp { --rust: oklch(64% 0.17 47); background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; min-height: 100vh; display: flex; flex-direction: column; }
.plp *, .plp *::before, .plp *::after { box-sizing: border-box; }
.plp-wrap { max-width: 920px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); width: 100%; }
.plp-header { position: sticky; top: 0; z-index: 40; background: color-mix(in oklab, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-light, var(--border)); }
.plp-header-inner { height: 56px; display: flex; align-items: center; justify-content: space-between; }
.plp-logo { display: flex; align-items: center; text-decoration: none; }
.plp-nav { display: flex; align-items: center; gap: 16px; }
.plp-navlink { font-size: 13px; font-weight: 600; color: var(--text-muted); text-decoration: none; white-space: nowrap; }
.plp-navlink:hover { color: var(--text); }
.plp-hero { padding: clamp(44px, 8vw, 88px) 0 clamp(28px, 5vw, 52px); }
.plp-hero-inner { max-width: 720px; }
.plp-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--rust); margin: 0 0 14px; }
.plp-h1 { font-family: var(--font-display); font-size: clamp(30px, 5.5vw, 46px); font-weight: 700; letter-spacing: -0.6px; line-height: 1.08; margin: 0 0 18px; color: var(--text); }
.plp-sub { font-size: clamp(16px, 2.2vw, 19px); line-height: 1.55; color: var(--text-muted); margin: 0 0 20px; max-width: 620px; }
.plp-coverage { font-size: 14.5px; line-height: 1.55; color: var(--text); background: color-mix(in oklab, var(--rust) 8%, transparent); border: 1px solid color-mix(in oklab, var(--rust) 28%, transparent); border-radius: 12px; padding: 12px 16px; margin: 0 0 26px; max-width: 620px; }
.plp-coverage strong { color: var(--rust); }
.plp-cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
.plp-microcopy { font-size: 12.5px; color: var(--text-muted); margin: 14px 0 0; }
.plp-prooflink { color: var(--rust); font-weight: 600; text-decoration: none; }
.plp-prooflink:hover { text-decoration: underline; }
.plp-points { padding: clamp(24px, 4vw, 40px) 0; }
.plp-points-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
@media (max-width: 720px) { .plp-points-grid { grid-template-columns: 1fr; } }
.plp-point { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px; }
.plp-point-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; letter-spacing: -0.2px; margin: 0 0 8px; color: var(--text); }
.plp-point-body { font-size: 14px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.plp-pricing { padding: clamp(24px, 4vw, 48px) 0; }
.plp-price-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: clamp(24px, 4vw, 36px); box-shadow: var(--shadow-lg); max-width: 620px; margin: 0 auto; text-align: center; }
.plp-price-h { font-family: var(--font-display); font-size: clamp(20px, 3vw, 26px); font-weight: 700; letter-spacing: -0.3px; margin: 0 0 14px; color: var(--text); }
.plp-price-line { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0 0 8px; }
.plp-footer { margin-top: auto; border-top: 1px solid var(--border-light, var(--border)); padding: 18px 0; }
.plp-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 11.5px; color: var(--text-muted); }
.plp-footer-links { display: flex; gap: 16px; }
.plp-footer-links a { font-size: 11.5px; color: var(--text-muted); text-decoration: none; }
.plp-footer-links a:hover { color: var(--text); }
`;
