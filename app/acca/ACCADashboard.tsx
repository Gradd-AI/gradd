'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AreaPicker, { type PickerArea } from './AreaPicker';

interface ACCADashboardProps {
  areas: PickerArea[];
  teachThroughsUsed: number;
  hasActiveAccess: boolean;
  casesEnabled?: boolean;
  paper: string;
  hasAttempted?: boolean;
  firstDrillArea?: string | null;
  firstDrillFromResit?: boolean;
}

const FREE_TEACH_THROUGHS = 3;

export default function ACCADashboard({ areas, teachThroughsUsed, hasActiveAccess, casesEnabled = false, paper, hasAttempted = false, firstDrillArea = null, firstDrillFromResit = false }: ACCADashboardProps) {
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  const capHit = !hasActiveAccess && teachThroughsUsed >= FREE_TEACH_THROUGHS;
  // Carry the active paper on same-surface links; APM URLs stay clean (default).
  const paperQ = paper === 'APM' ? '' : `&paper=${encodeURIComponent(paper)}`;
  // First-run (F3): a zero-attempt user gets one unmissable primary action above the grid.
  const showFirstRun = areas.length > 0 && !hasAttempted && !!firstDrillArea;
  const progressHref = paper === 'APM' ? '/acca/progress' : `/acca/progress?paper=${encodeURIComponent(paper)}`;
  // Same convention — the "Go unlimited" CTA below used to be bare '/acca/subscribe', which
  // resolved the right paper only via a document.referrer regex on the subscribe page
  // (absent under common privacy settings / Referrer-Policy). Threading it explicitly, like
  // every other paper-aware link in this component, removes that dependency.
  const subscribeHref = paper === 'APM' ? '/acca/subscribe' : `/acca/subscribe?paper=${encodeURIComponent(paper)}`;
  // The timed mock is a per-paper SURFACE, not a query param: /acca/mock renders
  // <SitRunner paper="APM" /> and /acca/afm/mock renders <SitRunner paper="AFM" />.
  const mockHref = paper === 'AFM' ? '/acca/afm/mock' : '/acca/mock';

  function handleSelect(subArea: string) {
    setNavigating(true);
    router.push(`/acca/tutor?area=${encodeURIComponent(subArea)}${paperQ}`);
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="apm-dash">

        <header className="apm-dash-header">
          <div className="apm-dash-header-inner">
            <Link href="/" className="apm-dash-logo" aria-label="Gradd home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
            </Link>
            <div className="apm-dash-header-right">
              {/* Paper switcher — the AFM discovery entry (bundle: one ACCA entitlement). */}
              <div className="apm-dash-paper-switch" role="group" aria-label="Choose ACCA paper">
                <Link href="/acca" className={`apm-dash-paper-tab${paper === 'APM' ? ' active' : ''}`}>APM</Link>
                <Link href="/acca?paper=AFM" className={`apm-dash-paper-tab${paper === 'AFM' ? ' active' : ''}`}>AFM</Link>
              </div>
              <Link href={progressHref} className="apm-dash-navlink">Progress</Link>
              <div className="apm-dash-breadcrumb">
                <span className="apm-dash-paper">ACCA {paper}</span>
                <span className="apm-dash-sep">·</span>
                <span className="apm-dash-badge">Drill</span>
              </div>
            </div>
          </div>
        </header>

        <main className="apm-dash-main">

          {/* First-run primary action (F3) — the seam a brand-new signup bounced on. One
              banner, one link, deep into a sensible default drill. Grid stays below. */}
          {showFirstRun && (
            <a className="apm-firstrun" href={`/acca/tutor?area=${encodeURIComponent(firstDrillArea!)}${paperQ}`}>
              <div className="apm-firstrun-text">
                <span className="apm-firstrun-eyebrow">{firstDrillFromResit ? 'From your resit diagnosis' : 'Start here'}</span>
                <span className="apm-firstrun-title">{firstDrillFromResit ? 'Start with your weakest area' : 'Start your first drill'}</span>
                <span className="apm-firstrun-sub">
                  {firstDrillFromResit
                    ? 'Ezra coaches you through the first drill in the area your diagnosis flagged — no need to choose.'
                    : 'Jump straight in — Ezra coaches you through your first drill, step by step.'}
                </span>
              </div>
              <span className="apm-firstrun-cta">Start your first drill →</span>
            </a>
          )}

          <div className="apm-dash-hero">
            <h1 className="apm-dash-title">{showFirstRun ? 'Or pick your area' : 'Pick your area'}</h1>
            <p className="apm-dash-sub">
              Ezra diagnoses exactly where you stalled and teaches from there — targeted coaching, not generic hints.
            </p>
          </div>

          {/* Cap status bar — count comes from server (SSR), no hydration flash. */}
          <div className="apm-dash-status apm-dash-status--on">
            {teachThroughsUsed > 0 && (
              <div className={`apm-status-bar${capHit ? ' apm-status-bar--capped' : ''}`}>
                <div className="apm-status-left">
                  <div className="apm-status-pips">
                    {Array.from({ length: FREE_TEACH_THROUGHS }, (_, i) => (
                      <span key={i} className={`apm-status-pip${i < teachThroughsUsed ? ' used' : ''}`} />
                    ))}
                  </div>
                  <span className="apm-status-text">
                    {capHit
                      ? 'All 3 free teach-throughs used'
                      : `${teachThroughsUsed} of ${FREE_TEACH_THROUGHS} free teach-throughs used`}
                  </span>
                </div>
                {capHit && (
                  <a href={subscribeHref} className="apm-status-cta">Go unlimited →</a>
                )}
              </div>
            )}
          </div>

          {/* Entry cards. Progress is always available; exam-cases + timed-mock only when
              APM_CASES is on (server-gated boolean). */}
          <div className={`apm-dash-cases-row${casesEnabled ? '' : ' apm-dash-cases-row--solo'}`}>
            <Link href={progressHref} className="apm-dash-cases-card">
              <div className="apm-dash-cases-text">
                <span className="apm-dash-cases-title">Your progress</span>
                <span className="apm-dash-cases-sub">
                  Where you stand and the next thing to work on — weak areas, stuck drills, and what you haven&apos;t tried yet.
                </span>
              </div>
              <span className="apm-dash-cases-cta" aria-hidden="true">→</span>
            </Link>
            {casesEnabled && (
              <>
              <Link href="/acca/cases" className="apm-dash-cases-card">
                <div className="apm-dash-cases-text">
                  <span className="apm-dash-cases-title">Exam cases</span>
                  <span className="apm-dash-cases-sub">
                    Full exam-style cases — shared scenario, linked requirements, professional-skills marking.
                  </span>
                </div>
                <span className="apm-dash-cases-cta" aria-hidden="true">→</span>
              </Link>
              {/* ROUTED BY THE ACTIVE PAPER (fixed 2026-08-01). This was hardcoded to
                  /acca/mock — the APM surface — and gated only on `casesEnabled`, so an AFM
                  student clicking "Timed mock" was served the APM paper: Halworth, Rivenor and
                  Bexley scenarios, requirements and marks. A cross-paper content leak, not just
                  a wrong screen.
                  Entitlement is bundle-wide, so "if they hold both, they choose" is already
                  answered by the APM/AFM switch above — this card simply follows the paper the
                  student is looking at, like every other link on the page. */}
              <Link href={mockHref} className="apm-dash-cases-card">
                <div className="apm-dash-cases-text">
                  <span className="apm-dash-cases-title">Timed mock</span>
                  <span className="apm-dash-cases-sub">
                    A full {paper} paper against the clock — three cases sat back to back, marked as one.
                  </span>
                </div>
                <span className="apm-dash-cases-cta" aria-hidden="true">→</span>
              </Link>
              </>
            )}
          </div>

          <div className="apm-dash-picker-wrap">
            {areas.length > 0 ? (
              <AreaPicker
                areas={areas}
                onSelect={handleSelect}
                loading={navigating}
              />
            ) : (
              <p className="apm-dash-empty">No ACCA {paper} areas are published yet — check back shortly.</p>
            )}
          </div>

        </main>

        <footer className="apm-dash-footer">
          <span>© 2026 Gradd.ai · Not affiliated with ACCA</span>
          <div className="apm-dash-footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </footer>

      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .apm-dash
// Standard scrollable page layout (not fixed-height like the tutor).
// max-width 720px keeps the picker comfortable on wide screens.

const CSS = `
.apm-dash {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
.apm-dash *, .apm-dash *::before, .apm-dash *::after { box-sizing: border-box; }

/* ── Header ── */
.apm-dash-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}
.apm-dash-header-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 32px);
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.apm-dash-logo { display: flex; align-items: center; text-decoration: none; }
.apm-dash-header-right { display: flex; align-items: center; gap: 16px; }
.apm-dash-navlink { font-size: 13px; font-weight: 600; color: var(--brand); text-decoration: none; white-space: nowrap; }
.apm-dash-navlink:hover { text-decoration: underline; }
.apm-dash-paper-switch { display: inline-flex; border: 1px solid var(--border); border-radius: 7px; overflow: hidden; background: var(--surface); }
.apm-dash-paper-tab { font-size: 12px; font-weight: 700; color: var(--text-muted); text-decoration: none; padding: 4px 11px; line-height: 1.5; letter-spacing: .02em; transition: background 0.12s, color 0.12s; }
.apm-dash-paper-tab + .apm-dash-paper-tab { border-left: 1px solid var(--border); }
.apm-dash-paper-tab:hover { color: var(--text); }
.apm-dash-paper-tab.active { background: var(--brand); color: #fff; }
.apm-dash-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.apm-dash-paper { font-weight: 600; color: var(--text); font-size: 12px; }
.apm-dash-sep { color: var(--border); }
.apm-dash-badge {
  background: rgba(192,94,60,0.1);
  color: var(--rust);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── Main ── */
.apm-dash-main {
  flex: 1;
  max-width: 720px;
  margin: 0 auto;
  width: 100%;
  padding: clamp(36px, 6vw, 64px) clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── First-run banner (F3) ── */
.apm-firstrun {
  display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 22px 26px; border-radius: 16px; text-decoration: none;
  background: linear-gradient(135deg, oklch(64% 0.17 47 / 0.10), oklch(64% 0.17 47 / 0.04));
  border: 1.5px solid var(--rust);
  transition: transform 0.15s, box-shadow 0.15s;
}
.apm-firstrun:hover { transform: translateY(-2px); box-shadow: 0 8px 24px oklch(64% 0.17 47 / 0.20); }
.apm-firstrun-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.apm-firstrun-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--rust); }
.apm-firstrun-title { font-family: var(--font-display); font-size: 21px; font-weight: 700; letter-spacing: -0.3px; color: var(--text); }
.apm-firstrun-sub { font-size: 13.5px; color: var(--text-muted); line-height: 1.5; }
.apm-firstrun-cta { flex-shrink: 0; background: var(--rust); color: #fff8f4; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 999px; white-space: nowrap; }
@media (max-width: 560px) {
  .apm-firstrun { flex-direction: column; align-items: stretch; }
  .apm-firstrun-cta { text-align: center; }
}

/* ── Hero ── */
.apm-dash-hero { display: flex; flex-direction: column; gap: 10px; }
.apm-dash-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
  margin: 0;
  line-height: 1.1;
}
.apm-dash-sub {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
  max-width: 480px;
}

/* ── Cap status bar —— count is SSR so no hydration flash; container collapses when count=0 */
.apm-dash-status { }

.apm-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  flex-wrap: wrap;
}
.apm-status-bar.apm-status-bar--capped {
  border-color: rgba(192,94,60,0.3);
  background: rgba(192,94,60,0.06);
}
.apm-status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.apm-status-pips { display: flex; gap: 6px; }
.apm-status-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
}
.apm-status-pip.used { background: var(--rust); }
.apm-status-text {
  font-size: 13px;
  color: var(--text-muted);
}
.apm-status-bar--capped .apm-status-text { color: var(--text); font-weight: 500; }
.apm-status-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--rust);
  text-decoration: none;
  white-space: nowrap;
  flex-shrink: 0;
}
.apm-status-cta:hover { text-decoration: underline; }

/* ── Exam-cases + timed-mock entry cards ── */
.apm-dash-cases-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.apm-dash-cases-row--solo { grid-template-columns: 1fr; }
@media (max-width: 640px) { .apm-dash-cases-row { grid-template-columns: 1fr; } }
.apm-dash-cases-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 22px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.apm-dash-cases-card:hover {
  border-color: var(--rust);
  transform: translateY(-2px);
  box-shadow: var(--shadow, 0 4px 16px rgba(14,43,30,0.12));
}
.apm-dash-cases-text { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.apm-dash-cases-badge {
  align-self: flex-start;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rust);
  background: rgba(192,94,60,0.1);
  border: 1px solid rgba(192,94,60,0.2);
  padding: 2px 7px;
  border-radius: 4px;
  margin-bottom: 2px;
}
.apm-dash-cases-title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.2px;
  color: var(--text);
}
.apm-dash-cases-sub { font-size: 13px; color: var(--text-muted); line-height: 1.5; }
.apm-dash-cases-cta { font-size: 20px; color: var(--brand); flex-shrink: 0; }

/* ── Picker card ── */
.apm-dash-picker-wrap {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 8px 4px;
}
.apm-dash-empty { margin: 0; padding: 28px 24px; text-align: center; font-size: 14px; color: var(--text-muted); }

/* ── Footer ── */
.apm-dash-footer {
  border-top: 1px solid var(--border-light);
  padding: 16px clamp(16px, 4vw, 32px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 11px;
  color: var(--text-muted);
}
.apm-dash-footer-links { display: flex; gap: 18px; }
.apm-dash-footer-links a { font-size: 11px; color: var(--text-muted); text-decoration: none; }
.apm-dash-footer-links a:hover { color: var(--text); }
`;
