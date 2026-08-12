'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ACCASignOutButton from '@/components/acca/ACCASignOutButton';
import type { AccaPaper } from '@/lib/acca/paper';
import { paperHref } from '@/lib/acca/paper-url';
import { caseSectionName } from '@/lib/acca/case-surface';
import { caseListViewed } from '@/lib/acca/surface-events';
import { emitSurfaceEvent } from '@/lib/acca/surface-event-client';

interface CaseRow {
  id: string;
  title: string | null;
  section: string | null;
  anchor_area: string | null;
  total_marks: number | null;
  professional_skills_marks: number | null;
  response_format: string | null;
  locked: boolean;
}

// THE PAPER IS A PROP, RESOLVED FROM THE ROUTE (page.tsx) — never a literal in here.
// `paper=APM` was hardcoded on the fetch below, and that single literal was the whole
// reason five published AFM cases had no UI: the list endpoint has been paper-scoped
// since it was written, and it was only ever asked for one paper.
export default function CaseList({ paper }: { paper: AccaPaper }) {
  const router = useRouter();
  const [cases, setCases]   = useState<CaseRow[] | null>(null);
  const [error, setError]   = useState(false);
  // Where "back to the hub" goes, carrying the paper — same rule as every other ACCA
  // link (lib/acca/paper-url.ts); APM stays byte-identical to the bare '/acca'.
  const hubHref = paperHref('/acca', paper);
  // Which paper this mount has already reported a view for. Guards React's Strict Mode
  // double-invoke, and keys on the PAPER rather than a bare boolean so switching
  // /acca/cases?paper=… without a remount still reports the second list as a second view —
  // it is one.
  const viewReported = useRef<AccaPaper | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/acca/case/list?paper=${paper}`);
        // 404 = flag off / feature not live → the case UI renders nothing useful.
        if (res.status === 404) {
          router.replace(paperHref('/acca', paper));
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(true);
          return;
        }
        const json = await res.json();
        if (!cancelled) setCases((json.cases ?? []) as CaseRow[]);
        // ── case_list_viewed — ON SUCCESS ONLY, AND THAT IS THE POINT ──────────
        // Not on mount: the 404 arm above redirects to /acca, and counting a flag-off
        // bounce-through as "viewed the case list" would put a false positive in the one
        // metric that exists to tell looked-and-left from never-looked. Nor on the !ok arm —
        // an error page is not a case list. This fires exactly where the list is about to
        // render, so the row means what its name says.
        //
        // AFTER the cancelled check but NOT gated on it: an unmount mid-flight must not
        // write state, and the view still happened. Locked users are included by design —
        // browsing the list is the act being measured, not entitlement.
        if (viewReported.current !== paper) {
          viewReported.current = paper;
          emitSurfaceEvent(caseListViewed(paper));
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [router, paper]);

  return (
    <>
      <style>{CSS}</style>
      <div className="apm-cl">

        <header className="apm-cl-header">
          <div className="apm-cl-header-inner">
            <Link href="/" className="apm-cl-logo" aria-label="Gradd home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
            </Link>
            <div className="apm-cl-breadcrumb">
              <span className="apm-cl-paper">ACCA {paper}</span>
              <span className="apm-cl-sep">·</span>
              <span className="apm-cl-badge">Exam cases</span>
            </div>
            <ACCASignOutButton />
          </div>
        </header>

        <main className="apm-cl-main">

          <div className="apm-cl-hero">
            <h1 className="apm-cl-title">Exam cases</h1>
            <p className="apm-cl-sub">
              Full exam-style cases — one shared scenario, linked requirements, and
              professional-skills marking. Ezra coaches you through each part, then marks the whole answer.
            </p>
            <Link href={hubHref} className="apm-cl-back">← Back to drills</Link>
          </div>

          {error ? (
            <div className="apm-cl-state apm-cl-state--error" role="alert">
              Couldn&apos;t load cases right now — please try again shortly.
            </div>
          ) : cases === null ? (
            <div className="apm-cl-state">Loading cases…</div>
          ) : cases.length === 0 ? (
            <div className="apm-cl-state">No exam cases are available yet — check back shortly.</div>
          ) : (
            <div className="apm-cl-grid">
              {cases.map((c) => {
                const section = (c.section ?? '').toUpperCase();
                const sectionLabel =
                  section && c.total_marks != null
                    ? `Section ${section} — ${c.total_marks} marks`
                    : section
                    ? `Section ${section}`
                    : null;
                // Locked cases stay visible but route to the subscribe page with a
                // lock indicator and an upsell CTA instead of into the case. The
                // subscribe link CARRIES the paper (it decides what is sold — the
                // `?paper=APM%20subscribe` defect); the case link stays BARE, because
                // a case id is a globally-unique key and the row owns its paper.
                const href = c.locked ? paperHref('/acca/subscribe', paper) : `/acca/cases/${c.id}`;
                return (
                  <Link
                    key={c.id}
                    href={href}
                    className={`apm-cl-card${c.locked ? ' apm-cl-card--locked' : ''}`}
                  >
                    <div className="apm-cl-card-top">
                      {sectionLabel && <span className="apm-cl-card-section">{sectionLabel}</span>}
                      {c.anchor_area && (
                        <span className="apm-cl-card-anchor" title={caseSectionName(paper, c.anchor_area)}>
                          {c.anchor_area}
                        </span>
                      )}
                    </div>
                    <h2 className="apm-cl-card-title">{c.title ?? 'Untitled case'}</h2>
                    {c.professional_skills_marks != null && (
                      <p className="apm-cl-card-prof">
                        {c.professional_skills_marks} professional-skills marks
                      </p>
                    )}
                    {c.locked ? (
                      <span className="apm-cl-card-cta apm-cl-card-cta--locked">
                        <span className="apm-cl-lock" aria-hidden="true">🔒</span> Subscribe to unlock
                      </span>
                    ) : (
                      <span className="apm-cl-card-cta">Start case →</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

        </main>

        <footer className="apm-cl-footer">
          <span>© 2026 Gradd.ai · Not affiliated with ACCA</span>
          <div className="apm-cl-footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </footer>

      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .apm-cl (apm case list). Mirrors .apm-dash: warm beige, Georgia display,
// --brand/--surface/--bg design tokens, sticky header, 720px column.
const CSS = `
.apm-cl {
  --rust: oklch(64% 0.17 47);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
.apm-cl *, .apm-cl *::before, .apm-cl *::after { box-sizing: border-box; }

.apm-cl-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}
.apm-cl-header-inner {
  max-width: 860px;
  margin: 0 auto;
  padding: 0 clamp(16px, 4vw, 32px);
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.apm-cl-logo { display: flex; align-items: center; text-decoration: none; }
.apm-cl-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
.apm-cl-paper { font-weight: 600; color: var(--text); font-size: 12px; }
.apm-cl-sep { color: var(--border); }
.apm-cl-badge {
  background: rgba(192,94,60,0.1);
  color: var(--rust);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.apm-cl-main {
  flex: 1;
  max-width: 860px;
  margin: 0 auto;
  width: 100%;
  padding: clamp(36px, 6vw, 64px) clamp(16px, 4vw, 32px) 48px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.apm-cl-hero { display: flex; flex-direction: column; gap: 10px; }
.apm-cl-title {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 38px);
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--text);
  margin: 0;
  line-height: 1.1;
}
.apm-cl-sub {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
  max-width: 560px;
}
.apm-cl-back {
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  width: fit-content;
}
.apm-cl-back:hover { color: var(--text); }

.apm-cl-state {
  font-size: 14px;
  color: var(--text-muted);
  padding: 24px;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.apm-cl-state--error {
  color: var(--error, #c0392b);
  background: #fff0f0;
  border-color: #f5c6c6;
}

.apm-cl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.apm-cl-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 22px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  text-decoration: none;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.apm-cl-card:hover {
  border-color: var(--rust);
  transform: translateY(-2px);
  box-shadow: var(--shadow, 0 4px 16px rgba(14,43,30,0.12));
}
.apm-cl-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.apm-cl-card-section {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--rust);
}
.apm-cl-card-anchor {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-light);
  padding: 2px 7px;
  border-radius: 4px;
  flex-shrink: 0;
}
.apm-cl-card-title {
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.2px;
  line-height: 1.25;
  color: var(--text);
  margin: 0;
}
.apm-cl-card-prof {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}
.apm-cl-card-cta {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand);
  margin-top: auto;
}
.apm-cl-card-cta--locked { color: var(--rust); display: inline-flex; align-items: center; gap: 6px; }
.apm-cl-lock { font-size: 12px; }
.apm-cl-card--locked:hover { border-color: var(--rust); }

.apm-cl-footer {
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
.apm-cl-footer-links { display: flex; gap: 18px; }
.apm-cl-footer-links a { font-size: 11px; color: var(--text-muted); text-decoration: none; }
.apm-cl-footer-links a:hover { color: var(--text); }
`;
