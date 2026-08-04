// components/landing/ACCAPillarPage.tsx
// The ACCA PILLAR — what /acca serves to a visitor who is not signed in.
//
// This is where ACCA-level search intent lands ("ACCA tutor", "ACCA Strategic Professional
// practice") and where cross-sell happens: a student who came for APM discovers AFM exists,
// and vice versa. The two SPOKES (/acca/apm, /acca/afm) sell a paper each; this page sells
// the qualification and routes.
//
// DELIBERATELY NOT ProductLandingPage. That template renders one product's hero + a 3-up
// grid + one pricing card; a pillar's job is comparison and routing, which it has no
// primitive for. Generalising it was ruled out of this pass. This page is small and plain
// on purpose — it is a junction, not a sales letter, and the spokes do the selling.
//
// PRICING IS PER PAPER (ruled 2026-08-03) and this page says so explicitly. Under the old
// bundle a pillar could have implied one purchase covered everything; that is now false and
// stating it here — before the student reaches a spoke — is what stops them assuming it.
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';

interface PaperCard {
  code: string;
  name: string;
  href: string;
  status: string;
  blurb: string;
  live: string;
}

// Coverage strings state EXACTLY what is live, per the standing honesty rule on the AFM
// landing — no breadth implication, no counts that drift silently. If these numbers move,
// they move here and on the spoke together.
const PAPERS: PaperCard[] = [
  {
    code: 'APM',
    name: 'Advanced Performance Management',
    href: '/acca/apm',
    status: 'Live',
    blurb:
      'Ezra diagnoses why an answer lost marks — describing a model instead of applying it, stopping short of the judgement the verb demanded — then coaches the fix until the answer would score.',
    live: 'Every drill free to attempt · full exam cases · professional-skills marking · a timed mock, marked as one paper.',
  },
  {
    code: 'AFM',
    name: 'Advanced Financial Management',
    href: '/acca/afm',
    status: 'Live',
    blurb:
      'The senior-adviser register: your arithmetic is usually fine, but the ADVICE would not survive a boardroom. Ezra pushes from a correct number to a committed recommendation.',
    live: 'Drills across investment appraisal, risk, valuation and hedging · exam cases · a timed mock.',
  },
];

export default function ACCAPillarPage() {
  return (
    <>
      <AttributionCapture />
      <style>{CSS}</style>
      <div className="pil">
        <div className="bg-grain" aria-hidden="true" />
        <header className="pil-header">
          <div className="pil-wrap pil-header-inner">
            <Link href="/" className="pil-logo" aria-label="Gradd home">
              <img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block' }} />
            </Link>
            <nav className="pil-nav" aria-label="Primary">
              <Link href="/acca/apm" className="pil-navlink">APM</Link>
              <Link href="/acca/afm" className="pil-navlink">AFM</Link>
              <Link href="/acca/resit" className="pil-navlink">Resit diagnostic</Link>
              <Link href="/acca/auth?next=/acca" className="btn btn-rust btn-sm">Start free</Link>
            </nav>
          </div>
        </header>

        <main>
          <section className="pil-hero">
            <div className="pil-wrap">
              <p className="pil-eyebrow">ACCA Strategic Professional</p>
              <h1 className="pil-h1">Taught, not just marked.</h1>
              <p className="pil-sub">
                Marking is everywhere. What almost nothing does is tell you <em>why</em> the answer
                lost the mark and then coach you until it would score. Gradd withholds the model
                answer until you have genuinely attempted, names the specific gap in what you
                wrote, and gives you one concrete next move.
              </p>
              <p className="pil-note">
                <strong>Each paper is bought separately.</strong> One purchase covers one paper —
                pick the one you are sitting.
              </p>
            </div>
          </section>

          <section className="pil-papers" aria-label="Papers">
            <div className="pil-wrap pil-grid">
              {PAPERS.map((p) => (
                <article key={p.code} className="pil-card">
                  <div className="pil-card-head">
                    <h2 className="pil-card-code">{p.code}</h2>
                    <span className="pil-chip">{p.status}</span>
                  </div>
                  <p className="pil-card-name">{p.name}</p>
                  <p className="pil-card-blurb">{p.blurb}</p>
                  <p className="pil-card-live"><strong>What’s live:</strong> {p.live}</p>
                  <Link href={p.href} className="btn btn-rust pil-card-btn">
                    {p.code} in detail <span aria-hidden="true">→</span>
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="pil-pricing" aria-label="Pricing">
            <div className="pil-wrap">
              <h2 className="pil-h2">Pricing, per paper</h2>
              <p className="pil-price-line">
                <strong>Free</strong> — every drill in the paper, unlimited, plus three full
                teach-throughs with Ezra. No card.
              </p>
              <p className="pil-price-line">
                <strong>€99</strong> — a sitting-dated pass: unlimited coaching, exam cases,
                professional-skills marking and the timed mock, through your sitting.
              </p>
              <p className="pil-price-line">
                <strong>€49/month</strong> — the same access, month to month, cancel any time.
              </p>
              <p className="pil-note">
                Prices are <strong>per paper</strong>. Buying APM does not include AFM.
              </p>
            </div>
          </section>

          <section className="pil-resit" aria-label="Free resit diagnostic">
            <div className="pil-wrap">
              <h2 className="pil-h2">Failed a paper? Find out exactly why.</h2>
              <p className="pil-sub">
                A three-minute diagnostic that names the habits that cost you marks, then points
                you at the areas to fix first.
              </p>
              <Link href="/acca/resit" className="btn btn-rust">
                Get my free resit diagnosis <span aria-hidden="true">→</span>
              </Link>
            </div>
          </section>
        </main>

        <footer className="pil-footer">
          <div className="pil-wrap pil-footer-inner">
            <span>
              © 2026 Gradd.ai · Gradd is not affiliated with or endorsed by ACCA. Scenarios are
              original works built to the public syllabus structure.
            </span>
            <div className="pil-footer-links">
              <Link href="/">Gradd home</Link>
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
.pil-wrap { max-width: 960px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); width: 100%; }
.pil-header-inner { height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pil-logo { display: flex; align-items: center; text-decoration: none; }
.pil-nav { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.pil-card-btn { align-self: flex-start; margin-top: auto; }
.pil-hero { padding: clamp(40px, 7vw, 76px) 0 clamp(20px, 3vw, 32px); }
.pil-eyebrow { margin: 0 0 14px; }
.pil-h1 { margin: 0 0 18px; }
.pil-h2 { margin: 0 0 14px; }
.pil-sub { margin: 0 0 18px; max-width: 660px; }
.pil-note { font-size: 14px; line-height: 1.55; color: var(--text); background: color-mix(in oklab, var(--rust) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--rust) 28%, transparent); border-radius: 10px;
  padding: 11px 15px; margin: 0; max-width: 660px; }
.pil-papers { padding: clamp(20px, 4vw, 40px) 0; }
.pil-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; }
@media (max-width: 760px) { .pil-grid { grid-template-columns: 1fr; } }
.pil-card { border: 1px solid var(--border); border-radius: 14px;
  padding: 24px; display: flex; flex-direction: column; gap: 10px; }
.pil-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pil-card-code { font-size: 26px; margin: 0; letter-spacing: -.4px; }
.pil-chip { font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
  color: var(--rust); border: 1px solid color-mix(in oklab, var(--rust) 35%, transparent);
  border-radius: 999px; padding: 3px 10px; }
.pil-card-name { font-size: 13.5px; font-weight: 600; color: var(--text-muted); margin: 0; }
.pil-card-blurb { font-size: 14.5px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.pil-card-live { font-size: 13px; line-height: 1.5; color: var(--text-muted); margin: 0 0 6px; }
.pil-card-live strong { color: var(--rust); }
.pil-pricing { padding: clamp(20px, 4vw, 40px) 0; }
.pil-price-line { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0 0 10px; max-width: 660px; }
.pil-price-line strong { color: var(--text); }
.pil-resit { padding: clamp(20px, 4vw, 44px) 0 clamp(30px, 5vw, 56px); }
.pil-footer { margin-top: auto; border-top: 1px solid var(--border-light, var(--border)); padding: 18px 0; }
.pil-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
  gap: 10px; font-size: 11.5px; color: var(--text-muted); }
.pil-footer-links { display: flex; gap: 16px; }
.pil-footer-links a { font-size: 11.5px; color: var(--text-muted); text-decoration: none; }
.pil-footer-links a:hover { color: var(--text); }
`;
