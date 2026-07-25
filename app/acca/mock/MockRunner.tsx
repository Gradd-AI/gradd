'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CaseSession from '@/app/acca/cases/[id]/CaseSession';
import { getMockPaper, type MockPaper } from '@/lib/acca/mocks';

// ── APM timed-mock runner ──────────────────────────────────────────────────────
// One client component drives every phase of a mock: paper list → start
// confirmation → sequential timed run (reusing the EXISTING CaseSession per case
// under one server-authoritative clock) → combined results. The clock lives in
// acca_mock_attempts.ends_at; the client only ticks the display, and a refresh
// resumes the same clock (never resets). Case ids come from lib/acca/mocks.ts
// (public config); the /api/acca/mock endpoint owns the flag + entitlement gate.

type Phase = 'loading' | 'list' | 'confirm' | 'running' | 'results' | 'locked' | 'error';

interface PaperSummary { id: string; title: string; duration_minutes: number; case_count: number }
interface AttemptRow { mock_id: string; started_at: string; ends_at: string; completed: boolean }

interface CaseResult {
  caseId: string;
  title: string | null;
  passed: number;
  total: number;
  profAwarded: number | null;   // null = not marked: case genuinely not complete, OR marking failed (see markFailed)
  profAvailable: number;
  complete: boolean;
  loadFailed?: boolean;
  marking?: boolean;            // true while the mark call (incl. retries) is in flight
  markFailed?: boolean;        // completed case whose mark call failed after retries — retryable, NOT "not completed"
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// Mock-engine Phase 2b: the `sitting` flag is plumbed MockRunner → CaseSession →
// case/turn + case (GET). It stays FALSE until the lean sit UI ships (one answer box
// per requirement, submit-and-move-on, completion driven off answers-recorded not
// requirements-passed) — flipping this to true without that UI would break the teach
// surface CaseSession still renders. The backend sit branches + technical marking
// are already live; this flag is the last switch the sit-UI step flips.
const MOCK_SIT_MODE = false;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// Outcome of marking one case. `marked` carries the award. `incomplete` means the
// server still reports the case as not-complete (a genuine, persistent 409 — e.g.
// the progress-write race never resolved). `failed` means an already-complete case
// could NOT be marked because of a transient/terminal error (network, 5xx, 502, a
// 504 gateway timeout, or the 120s abort). Only `incomplete` may ever be shown as
// "case not completed"; `failed` is an honest, retryable error state.
type MarkOutcome =
  | { kind: 'marked'; awarded: number }
  | { kind: 'incomplete' }
  | { kind: 'failed' }
  | { kind: 'locked' };

// Mark one case. A single mark POST can be slow on the biggest cases: a Section A
// case examines the most professional skills (the union across all its
// requirements) against the largest pool, and the marker retries its OWN allocation
// once when the sum overflows the pool → up to TWO sequential model calls. So each
// POST gets a generous 120s ceiling (never shorter) and is only aborted past it.
// Retry policy — the two failure classes must NOT be conflated:
//   • 409 "case not complete": the final requirement's progress write can lag its
//     turn response, so mark can 409 moments before it would succeed. Retry after
//     1.5s then 3s (the progress-write-race tolerance). A 409 that persists is a
//     genuine not-complete → `incomplete`.
//   • transient error (network / 5xx / 502 / 504 gateway timeout / 120s abort) on an
//     already-complete case: retry ONCE after 1.5s. If it persists → `failed`
//     (a marking failure on a completed case — never "not completed").
async function markCase(caseId: string): Promise<MarkOutcome> {
  const attempt = async (): Promise<'conflict' | 'error' | 'locked' | { awarded: number }> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    try {
      const res = await fetch('/api/acca/case/mark', {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ case_id: caseId }),
        signal: controller.signal,
      });
      if (res.ok) {
        const m = await res.json().catch(() => ({} as Record<string, unknown>));
        return { awarded: typeof m.professional_marks_awarded === 'number' ? m.professional_marks_awarded : 0 };
      }
      if (res.status === 409) return 'conflict';
      // 402 = subscription/pass lapsed mid-session. Terminal, NOT retryable (a lapsed
      // entitlement won't recover on retry) — surfaced as `locked` so the caller routes
      // to the subscribe upsell instead of a dead-end Retry button.
      if (res.status === 402) return 'locked';
      // Any other non-2xx (5xx / 502 / 504) is a transient-or-terminal FAILURE,
      // not a not-complete signal — it is retried and never labelled "not completed".
      return 'error';
    } catch {
      return 'error';   // network error, or the 120s abort fired
    } finally {
      clearTimeout(timer);
    }
  };

  let conflictRetries = 2;   // 3 attempts total on a persistent 409 (delays 1.5s, 3s)
  let errorRetries = 1;      // one retry on a transient error
  const conflictDelays = [1500, 3000];
  let ci = 0;

  for (;;) {
    const r = await attempt();
    if (typeof r === 'object') return { kind: 'marked', awarded: r.awarded };
    if (r === 'locked') return { kind: 'locked' };   // terminal — no retry on a lapse
    if (r === 'conflict') {
      if (conflictRetries-- <= 0) return { kind: 'incomplete' };
      await delay(conflictDelays[ci++] ?? 3000);
    } else {
      if (errorRetries-- <= 0) return { kind: 'failed' };
      await delay(1500);
    }
  }
}

// H:MM:SS when ≥ 1h, else M:SS. Never negative.
function fmtClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// 195 → "3h 15m"
function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h > 0 ? `${h}h` : '', m > 0 ? `${m}m` : ''].filter(Boolean).join(' ') || `${min}m`;
}

export default function MockRunner() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [confirmPaper, setConfirmPaper] = useState<PaperSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);

  // Active timed attempt (start or resume) — drives the clock + which paper runs.
  const [attempt, setAttempt] = useState<AttemptRow | null>(null);
  const paper: MockPaper | null = attempt ? getMockPaper(attempt.mock_id) : null;

  const [caseIndex, setCaseIndex] = useState(0);
  const [completedCases, setCompletedCases] = useState<Set<string>>(new Set());
  // Ref mirror of completedCases so completion can decide the results transition
  // synchronously (in the event handler, not an effect) without a stale closure.
  const completedRef = useRef<Set<string>>(new Set());

  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  const [resultsData, setResultsData] = useState<CaseResult[] | null>(null);
  const [resultsLoading, setResultsLoading] = useState(true);
  const resultsFetchedRef = useRef(false);

  // ── Initial load: gate + latest attempt → resume / results / list ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/acca/mock');
        if (res.status === 404) { router.replace('/acca'); return; }
        if (res.status === 402) { if (!cancelled) setPhase('locked'); return; }
        if (!res.ok) { if (!cancelled) setPhase('error'); return; }
        const json = await res.json();
        if (cancelled) return;
        setPapers((json.papers ?? []) as PaperSummary[]);

        const open = (json.attempt ?? null) as AttemptRow | null;
        if (open && !open.completed && getMockPaper(open.mock_id)) {
          setAttempt(open);
          if (new Date(open.ends_at).getTime() > Date.now()) {
            // Live clock — resume the run where the case progress left off.
            setCaseIndex(0);
            setPhase('running');
          } else {
            // Clock already expired — go straight to results of whatever was marked.
            setPhase('results');
          }
        } else {
          setPhase('list');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // ── Display tick (running only). Authority is ends_at; this only refreshes the
  // displayed remaining time. The zero-crossing transition to results happens here
  // in the interval callback (not synchronously in the effect body). ──
  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => {
      const now = Date.now();
      setNowTs(now);
      if (attempt && new Date(attempt.ends_at).getTime() - now <= 0) {
        setPhase('results');
      }
    }, 1000);
    return () => clearInterval(t);
  }, [phase, attempt]);

  const endsAtMs = attempt ? new Date(attempt.ends_at).getTime() : 0;
  const remainingMs = endsAtMs - nowTs;

  // Case completion (from the embedded CaseSession). Records the case and, once
  // every case in the paper is complete, advances to results — decided here in the
  // event path using the ref so it never reads a stale completed count.
  function handleCaseComplete(caseId: string) {
    if (completedRef.current.has(caseId)) return;
    const next = new Set(completedRef.current);
    next.add(caseId);
    completedRef.current = next;
    setCompletedCases(next);
    if (paper && next.size >= paper.case_ids.length) {
      setPhase('results');
    }
  }

  // Patch one case's result row (functional update — safe from any callback,
  // including a manual retry fired long after the initial aggregation settled).
  const patchCase = useCallback((cid: string, p: Partial<CaseResult>) => {
    setResultsData((prev) => (prev ?? []).map((r) => (r.caseId === cid ? { ...r, ...p } : r)));
  }, []);

  // Load one case's authoritative state and, if complete, mark it — mapping the
  // outcome to an HONEST per-case state. Shared by the initial results aggregation
  // and the per-case "Retry" button, so a user is never stuck with a completed but
  // unmarked case. Each case runs independently; a slow retry on one never blocks
  // the others (the case stays "Marking…" until its own retries are exhausted).
  const aggregateCase = useCallback(async (cid: string) => {
    patchCase(cid, { marking: true, markFailed: false, loadFailed: false });
    try {
      const loadRes = await fetch(`/api/acca/case?case_id=${encodeURIComponent(cid)}`);
      // Subscription/pass lapsed mid-session → route to the subscribe upsell, not a
      // dead-end Retry. Other load errors stay retryable via loadFailed.
      if (loadRes.status === 402) { setPhase('locked'); return; }
      if (!loadRes.ok) { patchCase(cid, { marking: false, loadFailed: true }); return; }
      const load = await loadRes.json();
      const requirements = (load.requirements ?? []) as unknown[];
      const progress = (load.progress ?? []) as Array<{ passed?: boolean }>;
      const total = requirements.length;
      const passed = progress.filter((p) => p.passed === true).length;
      const profAvailable = typeof load.case?.professional_skills_marks === 'number' ? load.case.professional_skills_marks : 0;
      const complete = total > 0 && passed === total;
      const title = (load.case?.title ?? null) as string | null;

      // Surface load-derived fields now; keep marking:true until the mark resolves.
      patchCase(cid, { title, passed, total, profAvailable, complete });

      if (!complete) {
        // Genuinely not complete — the ONLY state that reads "case not completed".
        patchCase(cid, { profAwarded: null, marking: false, markFailed: false });
        return;
      }

      const outcome = await markCase(cid);
      if (outcome.kind === 'marked') {
        patchCase(cid, { profAwarded: outcome.awarded, marking: false, markFailed: false });
      } else if (outcome.kind === 'incomplete') {
        // Server still 409s after retries → genuinely not complete.
        patchCase(cid, { profAwarded: null, marking: false, markFailed: false });
      } else if (outcome.kind === 'locked') {
        // Subscription/pass lapsed → subscribe upsell, not a dead-end Retry button.
        setPhase('locked');
      } else {
        // Completed case whose marking failed → honest error state + retry button.
        patchCase(cid, { profAwarded: null, marking: false, markFailed: true });
      }
    } catch {
      patchCase(cid, { marking: false, loadFailed: true });
    }
  }, [patchCase]);

  // ── Results: mark the attempt completed + aggregate every case (authoritative) ──
  useEffect(() => {
    if (phase !== 'results' || !paper) return;
    if (resultsFetchedRef.current) return;
    resultsFetchedRef.current = true;

    // Flip the attempt completed (best-effort — display owns the results).
    fetch('/api/acca/mock', {
      method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ mock_id: paper.id }),
    }).catch(() => {});

    // Seed one placeholder per case (marking) so the grid renders each case's
    // "Marking…" state immediately and never flashes "not marked" mid-race.
    setResultsData(paper.case_ids.map((cid): CaseResult => ({
      caseId: cid, title: null, passed: 0, total: 0, profAwarded: null, profAvailable: 0, complete: false, marking: true, markFailed: false,
    })));
    setResultsLoading(false);

    paper.case_ids.forEach((cid) => { void aggregateCase(cid); });
  }, [phase, paper, aggregateCase]);

  async function startPaper(paperId: string) {
    setStarting(true);
    setStartError(false);
    try {
      const res = await fetch('/api/acca/mock', {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ mock_id: paperId }),
      });
      if (res.status === 402) { setPhase('locked'); return; }
      if (!res.ok) { setStartError(true); return; }
      const json = await res.json();
      setAttempt(json.attempt as AttemptRow);
      setCaseIndex(0);
      completedRef.current = new Set();
      setCompletedCases(new Set());
      resultsFetchedRef.current = false;
      setResultsData(null);
      setResultsLoading(true);
      setNowTs(Date.now());
      setPhase('running');
    } catch {
      setStartError(true);
    } finally {
      setStarting(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const shell = (inner: React.ReactNode) => (
    <>
      <style>{CSS}</style>
      <div className="mck">{inner}</div>
    </>
  );

  if (phase === 'loading') {
    return shell(<div className="mck-state">Loading mock…</div>);
  }

  if (phase === 'locked') {
    return shell(
      <div className="mck-upsell">
        <span className="mck-upsell-lock" aria-hidden="true">🔒</span>
        <h1 className="mck-upsell-title">Timed mocks</h1>
        <p className="mck-upsell-copy">Timed mocks are part of the APM subscription.</p>
        <Link href="/acca/subscribe" className="mck-btn mck-btn--rust">Subscribe to unlock →</Link>
        <Link href="/acca" className="mck-back">← Back to APM</Link>
      </div>,
    );
  }

  if (phase === 'error') {
    return shell(
      <div className="mck-state mck-state--error" role="alert">
        Couldn&apos;t load mocks right now — <Link href="/acca">back to APM</Link>.
      </div>,
    );
  }

  if (phase === 'list') {
    return shell(
      <>
        <header className="mck-topbar">
          <Link href="/acca" className="mck-topbar-back">← APM</Link>
          <span className="mck-topbar-title">Timed mocks</span>
          <span />
        </header>
        <main className="mck-main">
          <div className="mck-hero">
            <h1 className="mck-h1">Sit a timed mock</h1>
            <p className="mck-lead">
              A full paper under one clock — one Section&nbsp;A case and two Section&nbsp;B cases, sat back to back.
              You&apos;re coached through each case exactly as in practice, then the whole paper is marked together.
            </p>
          </div>
          <div className="mck-paper-list">
            {papers.length === 0 ? (
              <div className="mck-state">Mock papers are being prepared — check back soon.</div>
            ) : papers.map((p) => (
              <button key={p.id} className="mck-paper-card" onClick={() => { setConfirmPaper(p); setPhase('confirm'); }}>
                <div className="mck-paper-text">
                  <span className="mck-paper-title">{p.title}</span>
                  <span className="mck-paper-meta">{p.case_count} cases · {fmtDuration(p.duration_minutes)}</span>
                </div>
                <span className="mck-paper-cta" aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        </main>
      </>,
    );
  }

  if (phase === 'confirm' && confirmPaper) {
    return shell(
      <>
        <header className="mck-topbar">
          <button className="mck-topbar-back" onClick={() => { setPhase('list'); setConfirmPaper(null); }}>← Mocks</button>
          <span className="mck-topbar-title">{confirmPaper.title}</span>
          <span />
        </header>
        <main className="mck-main mck-main--center">
          <div className="mck-confirm">
            <h1 className="mck-h1">{confirmPaper.title}</h1>
            <ul className="mck-confirm-facts">
              <li><strong>{confirmPaper.case_count} cases</strong> — one Section&nbsp;A, two Section&nbsp;B, sat in order.</li>
              <li><strong>{fmtDuration(confirmPaper.duration_minutes)} on one clock.</strong> The timer starts when you begin and does not pause.</li>
              <li>Refreshing or leaving does <strong>not</strong> reset the clock — it keeps running until time is up.</li>
              <li>When all cases are done or time runs out, you get one combined result.</li>
            </ul>
            {startError && <div className="mck-inline-error" role="alert">Couldn&apos;t start the mock — please try again.</div>}
            <div className="mck-confirm-actions">
              <button className="mck-btn mck-btn--rust" onClick={() => startPaper(confirmPaper.id)} disabled={starting}>
                {starting ? 'Starting…' : 'Start the clock →'}
              </button>
              <button className="mck-btn mck-btn--ghost" onClick={() => { setPhase('list'); setConfirmPaper(null); }} disabled={starting}>
                Not yet
              </button>
            </div>
          </div>
        </main>
      </>,
    );
  }

  if (phase === 'running' && paper) {
    const caseIds = paper.case_ids;
    const currentCaseId = caseIds[caseIndex];
    const isLastCase = caseIndex >= caseIds.length - 1;
    const currentComplete = currentCaseId ? completedCases.has(currentCaseId) : false;
    const low = remainingMs <= 5 * 60_000;

    return shell(
      <div className="mck-run">
        <header className={`mck-clock${low ? ' mck-clock--low' : ''}`}>
          <div className="mck-clock-left">
            <span className="mck-clock-paper">{paper.title}</span>
            <span className="mck-clock-progress">Case {caseIndex + 1} of {caseIds.length}</span>
          </div>
          <div className="mck-clock-time" aria-label="Time remaining">
            <span className="mck-clock-digits">{fmtClock(remainingMs)}</span>
            <span className="mck-clock-caption">remaining</span>
          </div>
        </header>

        <div className="mck-case-wrap">
          {currentCaseId && (
            <CaseSession
              key={currentCaseId}
              caseId={currentCaseId}
              embedded
              sitting={MOCK_SIT_MODE}
              onComplete={() => handleCaseComplete(currentCaseId)}
            />
          )}
        </div>

        <div className="mck-advance">
          <span className="mck-advance-hint">
            {currentComplete ? 'Case complete.' : 'You can move on before finishing — an exam runs to the clock.'}
          </span>
          {isLastCase ? (
            <button className="mck-btn mck-btn--rust" onClick={() => setPhase('results')}>
              Finish paper →
            </button>
          ) : (
            <button
              className={`mck-btn ${currentComplete ? 'mck-btn--rust' : 'mck-btn--ghost'}`}
              onClick={() => setCaseIndex((i) => i + 1)}
            >
              Next case →
            </button>
          )}
        </div>
      </div>,
    );
  }

  if (phase === 'results') {
    // Derive from the last ticked time (state), not Date.now() — pure during render.
    const timedOut = attempt ? new Date(attempt.ends_at).getTime() <= nowTs : false;
    const anyMarking = (resultsData ?? []).some((r) => r.marking);
    const totalPassed = (resultsData ?? []).reduce((a, r) => a + r.passed, 0);
    const totalReqs = (resultsData ?? []).reduce((a, r) => a + r.total, 0);
    const profAwarded = (resultsData ?? []).reduce((a, r) => a + (r.profAwarded ?? 0), 0);
    const profAvailable = (resultsData ?? []).reduce((a, r) => a + r.profAvailable, 0);

    return shell(
      <>
        <header className="mck-topbar">
          <Link href="/acca" className="mck-topbar-back">← APM</Link>
          <span className="mck-topbar-title">{paper?.title ?? 'Mock'} — results</span>
          <span />
        </header>
        <main className="mck-main">
          {resultsLoading || !resultsData ? (
            <div className="mck-state">Marking your paper…</div>
          ) : (
            <div className="mck-results">
              {timedOut && (
                <div className="mck-timeout" role="status">Time&apos;s up — here is your paper marked as it stood.</div>
              )}

              {/* Totals wait until every case has finished marking (incl. 409 retries)
                  so they never show a mid-race undercount. */}
              {anyMarking ? (
                <div className="mck-state">Marking your paper…</div>
              ) : (
                <>
                  <div className="mck-scoreline">
                    <div className="mck-score-block">
                      <span className="mck-score-num">{totalPassed}<span className="mck-score-of">/{totalReqs}</span></span>
                      <span className="mck-score-label">technical requirements passed</span>
                    </div>
                    <div className="mck-score-block">
                      <span className="mck-score-num">{profAwarded}<span className="mck-score-of">/{profAvailable}</span></span>
                      <span className="mck-score-label">professional-skills marks</span>
                    </div>
                  </div>

                  <p className="mck-plain">
                    Across the paper you passed <strong>{totalPassed} of {totalReqs}</strong> technical requirements
                    and earned <strong>{profAwarded} of {profAvailable}</strong> professional-skills marks.
                  </p>
                </>
              )}

              <div className="mck-case-results">
                {(resultsData ?? []).map((r, i) => (
                  <div key={r.caseId} className="mck-case-result">
                    <div className="mck-case-result-top">
                      <span className="mck-case-result-title">{r.title ?? `Case ${i + 1}`}</span>
                      {r.marking
                        ? null
                        : r.complete
                        ? <span className="mck-tag mck-tag--done">Complete</span>
                        : <span className="mck-tag">Incomplete</span>}
                    </div>
                    {r.marking ? (
                      <span className="mck-case-result-line mck-case-result-line--muted">Marking…</span>
                    ) : r.loadFailed ? (
                      <div className="mck-case-result-fail">
                        <span className="mck-case-result-line mck-case-result-line--muted">Couldn&apos;t load this case&apos;s result.</span>
                        <button className="mck-retry" onClick={() => aggregateCase(r.caseId)}>Retry →</button>
                      </div>
                    ) : (
                      <div className="mck-case-result-lines">
                        <span className="mck-case-result-line">{r.passed} / {r.total} requirements passed</span>
                        {r.markFailed ? (
                          <div className="mck-case-result-fail">
                            <span className="mck-case-result-line mck-case-result-line--warn">
                              Professional skills: marking failed · {r.profAvailable} available
                            </span>
                            <button className="mck-retry" onClick={() => aggregateCase(r.caseId)}>Retry marking →</button>
                          </div>
                        ) : (
                          <span className="mck-case-result-line">
                            {r.profAwarded == null
                              ? `Professional skills: not marked (case not completed) · ${r.profAvailable} available`
                              : `Professional skills: ${r.profAwarded} / ${r.profAvailable}`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation appears once marking is settled so nobody leaves mid-mark. */}
              {!anyMarking && (
                <div className="mck-results-actions">
                  <Link href="/acca" className="mck-btn mck-btn--ghost">← Back to APM</Link>
                  <Link href="/acca/mock" className="mck-btn mck-btn--rust" onClick={() => { resultsFetchedRef.current = false; }}>
                    Another mock →
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </>,
    );
  }

  return shell(<div className="mck-state">Loading…</div>);
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .mck (mock). Reuses the app tokens (--bg/--surface/--text/--brand) and
// the rust accent shared with the case UI.
const CSS = `
.mck {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
.mck *, .mck *::before, .mck *::after { box-sizing: border-box; }

.mck-state {
  margin: auto; padding: 48px 24px; text-align: center;
  font-family: var(--font-display); font-size: 16px; color: var(--text-muted);
}
.mck-state--error { color: #c0392b; }
.mck-state a, .mck-timeout a { color: var(--rust); }

.mck-topbar {
  position: sticky; top: 0; z-index: 40;
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  height: 52px; padding: 0 clamp(16px, 4vw, 32px);
  background: var(--bg); border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
}
.mck-topbar-back {
  justify-self: start; font-size: 13px; font-weight: 600; color: var(--text-muted);
  background: none; border: none; cursor: pointer; text-decoration: none; font-family: var(--font-body);
}
.mck-topbar-back:hover { color: var(--text); }
.mck-topbar-title { font-size: 13px; font-weight: 700; color: var(--text); }

.mck-main {
  flex: 1; width: 100%; max-width: 760px; margin: 0 auto;
  padding: clamp(28px, 5vw, 56px) clamp(16px, 4vw, 32px) 48px;
  display: flex; flex-direction: column; gap: 24px;
}
.mck-main--center { justify-content: center; }

.mck-hero { display: flex; flex-direction: column; gap: 10px; }
.mck-h1 {
  font-family: var(--font-display); font-size: clamp(26px, 4vw, 36px); font-weight: 700;
  letter-spacing: -0.5px; line-height: 1.1; color: var(--text); margin: 0;
}
.mck-lead { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0; max-width: 560px; }

.mck-paper-list { display: flex; flex-direction: column; gap: 12px; }
.mck-paper-card {
  display: flex; align-items: center; gap: 16px; width: 100%; text-align: left;
  padding: 20px 22px; background: var(--surface); border: 1px solid var(--border);
  border-radius: 14px; cursor: pointer; font-family: var(--font-body);
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.mck-paper-card:hover {
  border-color: var(--rust); transform: translateY(-2px);
  box-shadow: var(--shadow, 0 4px 16px rgba(14,43,30,0.12));
}
.mck-paper-text { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
.mck-paper-title { font-family: var(--font-display); font-size: 19px; font-weight: 700; letter-spacing: -0.2px; color: var(--text); }
.mck-paper-meta { font-size: 13px; color: var(--text-muted); }
.mck-paper-cta { font-size: 20px; color: var(--brand); flex-shrink: 0; }

.mck-confirm {
  max-width: 520px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px;
  background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px;
}
.mck-confirm-facts { display: flex; flex-direction: column; gap: 10px; margin: 0; padding-left: 18px; }
.mck-confirm-facts li { font-size: 14px; line-height: 1.55; color: var(--text); }
.mck-confirm-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.mck-inline-error, .mck-timeout {
  font-size: 13px; border-radius: 10px; padding: 10px 14px;
}
.mck-inline-error { background: #fff0f0; border: 1px solid #f5c6c6; color: #c0392b; }
.mck-timeout { background: rgba(192,94,60,0.08); border: 1px solid rgba(192,94,60,0.25); color: var(--text); }

/* ── Running ── */
.mck-run { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.mck-clock {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 10px clamp(16px, 4vw, 32px); background: var(--surface);
  border-bottom: 1px solid var(--border); min-height: 60px;
}
.mck-clock--low { background: #fff4f0; border-bottom-color: rgba(192,94,60,0.4); }
.mck-clock-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mck-clock-paper { font-size: 13px; font-weight: 700; color: var(--text); }
.mck-clock-progress { font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); }
.mck-clock-time { display: flex; flex-direction: column; align-items: flex-end; }
.mck-clock-digits {
  font-family: var(--font-display); font-variant-numeric: tabular-nums;
  font-size: clamp(22px, 3vw, 30px); font-weight: 700; line-height: 1; color: var(--text);
}
.mck-clock--low .mck-clock-digits { color: var(--rust-dark); }
.mck-clock-caption { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }

.mck-case-wrap { flex: 1; min-height: 0; overflow: hidden; }

.mck-advance {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 12px clamp(16px, 4vw, 32px); background: var(--surface); border-top: 1px solid var(--border);
}
.mck-advance-hint { font-size: 12px; color: var(--text-muted); min-width: 0; }

/* ── Results ── */
.mck-results { display: flex; flex-direction: column; gap: 22px; }
.mck-scoreline { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.mck-score-block {
  display: flex; flex-direction: column; gap: 6px; align-items: center; text-align: center;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 22px 16px;
}
.mck-score-num { font-family: var(--font-display); font-size: 34px; font-weight: 700; color: var(--brand); line-height: 1; }
.mck-score-of { font-size: 20px; color: var(--text-muted); font-weight: 400; }
.mck-score-label { font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); font-weight: 600; }
.mck-plain { font-size: 15px; line-height: 1.6; color: var(--text); margin: 0; }
.mck-plain strong { color: var(--text); }

.mck-case-results { display: flex; flex-direction: column; gap: 12px; }
.mck-case-result { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
.mck-case-result-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.mck-case-result-title { font-family: var(--font-display); font-size: 16px; font-weight: 700; color: var(--text); }
.mck-case-result-lines { display: flex; flex-direction: column; gap: 4px; }
.mck-case-result-line { font-size: 13px; color: var(--text); }
.mck-case-result-line--muted { font-size: 13px; color: var(--text-muted); }
.mck-case-result-line--warn { font-size: 13px; color: #c0392b; }
.mck-case-result-fail { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.mck-retry {
  align-self: flex-start; font-family: var(--font-body); font-size: 12px; font-weight: 600;
  color: var(--rust); background: none; border: none; padding: 0; cursor: pointer;
}
.mck-retry:hover { color: var(--rust-dark); text-decoration: underline; }
.mck-tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--text-muted); background: var(--surface-2); border: 1px solid var(--border-light);
  padding: 2px 8px; border-radius: 4px;
}
.mck-tag--done { color: #1c8b4e; background: rgba(34,160,90,0.12); border-color: rgba(34,160,90,0.25); }
.mck-results-actions { display: flex; gap: 12px; flex-wrap: wrap; }

/* ── Upsell ── */
.mck-upsell { margin: auto; display: flex; flex-direction: column; align-items: center; gap: 14px; max-width: 420px; text-align: center; padding: 24px; }
.mck-upsell-lock { font-size: 30px; }
.mck-upsell-title { font-family: var(--font-display); font-size: clamp(22px, 3vw, 28px); font-weight: 700; color: var(--text); margin: 0; }
.mck-upsell-copy { font-size: 15px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.mck-back { font-size: 13px; font-weight: 500; color: var(--text-muted); text-decoration: none; }
.mck-back:hover { color: var(--text); }

/* ── Buttons ── */
.mck-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 999px;
  font-family: var(--font-body); font-size: 14px; font-weight: 600; border: 1.5px solid transparent;
  cursor: pointer; transition: all 0.15s ease; white-space: nowrap; line-height: 1; text-decoration: none;
}
.mck-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.mck-btn:not(:disabled):hover { transform: translateY(-1px); }
.mck-btn--rust { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.mck-btn--rust:not(:disabled):hover { background: var(--rust-dark); border-color: var(--rust-dark); }
.mck-btn--ghost { background: transparent; color: var(--text-muted); border-color: var(--border); }
.mck-btn--ghost:not(:disabled):hover { background: var(--surface-2); color: var(--text); }

@media (max-width: 560px) {
  .mck-scoreline { grid-template-columns: 1fr; }
  .mck-advance { flex-direction: column; align-items: stretch; gap: 8px; }
  .mck-advance .mck-btn { justify-content: center; }
}
`;
