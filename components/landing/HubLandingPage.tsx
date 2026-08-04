// components/landing/HubLandingPage.tsx
// The gradd.ai HUB. Sells the METHOD, then routes to /acca or /ib.
//
// A CONVERSION TOOL, NOT A CATALOGUE. The temptation with a hub is to list everything —
// papers, subjects, features, counts — which produces a directory that ranks for nothing
// and converts nobody. This page makes ONE argument (marking is a commodity; teaching is
// not) and then gets out of the way with two doors. Everything specific to a product is
// the pillar's job, and everything specific to a paper is the spoke's.
//
// ── WHY THERE IS NO AUTO-ROUTING HERE ───────────────────────────────────────
// `resolveProductIntent` (lib/product-router.ts) can return null, and for a cold visitor
// landing on `/` it usually does — nothing in the request evidences a product. That null is
// the reason this page exists: the honest response to "I don't know what you're here for"
// is to ask, not to guess. Where intent IS evidenced (a campaign link, a referrer, a held
// entitlement) the caller redirects before rendering this — see app/page.tsx.
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';

export default function HubLandingPage() {
  return (
    <>
      <AttributionCapture />
      <style>{CSS}</style>
      <div className="hub">
        <div className="bg-grain" aria-hidden="true" />
        <header className="hub-header">
          <div className="hub-wrap hub-header-inner">
            <span className="hub-logo">
              <img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block' }} />
            </span>
            <nav className="hub-nav" aria-label="Primary">
              <Link href="/acca" className="hub-navlink">ACCA</Link>
              <Link href="/ib" className="hub-navlink">IB</Link>
              <Link href="/blog" className="hub-navlink">Blog</Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="hub-hero">
            <div className="hub-wrap">
              <h1 className="hub-h1">Taught, not just marked.</h1>
              <p className="hub-sub">
                Anything can tell you an answer is wrong. Almost nothing can tell you{' '}
                <em>why</em> — and then coach you until it would score. Gradd withholds the
                model answer until you have genuinely attempted, names the specific gap in
                what you wrote, and gives you one concrete next move.
              </p>
            </div>
          </section>

          <section className="hub-method" aria-label="How it works">
            <div className="hub-wrap hub-steps">
              <div className="hub-step">
                <span className="hub-step-n">1</span>
                <h2 className="hub-step-h">You attempt first</h2>
                <p className="hub-step-b">
                  The worked answer stays sealed until you have written something. Recall is
                  what builds the skill; reading a solution is not.
                </p>
              </div>
              <div className="hub-step">
                <span className="hub-step-n">2</span>
                <h2 className="hub-step-h">The gap gets named</h2>
                <p className="hub-step-b">
                  Not a score. The specific thing that was missing from{' '}
                  <em>your</em> answer — the step, the fact, the judgement the question
                  actually asked for.
                </p>
              </div>
              <div className="hub-step">
                <span className="hub-step-n">3</span>
                <h2 className="hub-step-h">You fix it, then prove it</h2>
                <p className="hub-step-b">
                  One concrete next move, sized to what you already wrote — then another
                  attempt, so the loop closes on you producing the answer.
                </p>
              </div>
            </div>
          </section>

          <section className="hub-routes" aria-label="Choose your qualification">
            <div className="hub-wrap">
              <h2 className="hub-h2">Which are you sitting?</h2>
              <div className="hub-route-grid">
                <Link href="/acca" className="hub-route">
                  <span className="hub-route-code">ACCA</span>
                  <span className="hub-route-name">Strategic Professional</span>
                  <span className="hub-route-detail">
                    APM and AFM. Examiner-style marking, professional-skills feedback, full
                    exam cases and timed mocks.
                  </span>
                  <span className="hub-route-cta">See ACCA <span aria-hidden="true">→</span></span>
                </Link>
                <Link href="/ib" className="hub-route">
                  <span className="hub-route-code">IB</span>
                  <span className="hub-route-name">Diploma Programme</span>
                  <span className="hub-route-detail">
                    Economics and Business Management, HL &amp; SL. The full curriculum,
                    taught and marked to IB standards.
                  </span>
                  <span className="hub-route-cta">See IB <span aria-hidden="true">→</span></span>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="hub-footer">
          <div className="hub-wrap hub-footer-inner">
            <span>© 2026 Gradd.ai</span>
            <div className="hub-footer-links">
              <Link href="/acca">ACCA</Link>
              <Link href="/ib">IB</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const CSS = `
.hub-wrap { max-width: 960px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); width: 100%; }
.hub-header-inner { height: 56px; display: flex; align-items: center; justify-content: space-between; }
.hub-logo { display: flex; align-items: center; }
.hub-nav { display: flex; align-items: center; gap: 18px; }
.hub-hero { padding: clamp(48px, 9vw, 96px) 0 clamp(24px, 4vw, 40px); }
.hub-h1 { margin: 0 0 20px; }
.hub-h2 { margin: 0 0 18px; }
.hub-sub { margin: 0; max-width: 680px; }
.hub-method { padding: clamp(20px, 4vw, 44px) 0; }
.hub-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
@media (max-width: 760px) { .hub-steps { grid-template-columns: 1fr; } }
.hub-step { border-top: 2px solid color-mix(in oklab, var(--rust) 40%, transparent); padding-top: 16px; }
.hub-step-n { margin-bottom: 10px; }
.hub-step-h { font-size: 17px; margin: 0 0 8px; letter-spacing: -.2px; }
.hub-step-b { font-size: 14.5px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.hub-routes { padding: clamp(24px, 4vw, 48px) 0 clamp(36px, 6vw, 64px); }
.hub-route-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
@media (max-width: 760px) { .hub-route-grid { grid-template-columns: 1fr; } }
.hub-route { display: flex; flex-direction: column; gap: 8px;
  border: 1px solid var(--border); padding: 26px; text-decoration: none;
  color: inherit; transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease; }
.hub-route:hover { border-color: var(--rust); box-shadow: var(--shadow-lg); transform: translateY(-2px); }
.hub-route-code { font-size: 28px; letter-spacing: -.5px; }
.hub-route-name { font-size: 13px; font-weight: 600; color: var(--text-muted); }
.hub-route-detail { font-size: 14.5px; line-height: 1.55; color: var(--text-muted); margin-top: 4px; }
.hub-route-cta { font-size: 14.5px; font-weight: 700; color: var(--rust); margin-top: 10px; }
.hub-footer { margin-top: auto; border-top: 1px solid var(--border-light, var(--border)); padding: 18px 0; }
.hub-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
  gap: 10px; font-size: 11.5px; color: var(--text-muted); }
.hub-footer-links { display: flex; gap: 16px; }
.hub-footer-links a { font-size: 11.5px; color: var(--text-muted); text-decoration: none; }
.hub-footer-links a:hover { color: var(--text); }
`;
