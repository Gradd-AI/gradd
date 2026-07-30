'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  fmtElapsed,
  nextUnsubmittedIndex,
  isPaperComplete,
} from '@/lib/acca/sit-preview';
import type { AccaPaper } from '@/lib/acca/paper';

// ── Lean sit runner — BOTH PAPERS (generalised 2026-07-30) ────────────────────
// Was AFM-only, with 'AFM' written into the case/turn body. It now takes the paper as a
// prop and threads it through every call; the server resolves which mock paper that maps
// to. /acca/mock (APM) and /acca/afm/mock (AFM) both render this one component, so the
// two papers cannot drift into two sit behaviours — which is what the old split gave us
// (CaseSession's teach surface for APM, this one for AFM).
// Authentic exam conditions, and deliberately nothing more:
//   • one answer box per requirement, in paper order
//   • "Submit and move on" ONLY — no back navigation, no editing a submitted answer
//   • no Ezra, no hints, no marks, no feedback of any kind during the sit
//   • a visible ELAPSED timer — no countdown, no auto-submit
//   • each answer is persisted as it is submitted, so a dropped connection loses at
//     most the requirement being typed, never the paper
//   • on finish: a plain "paper submitted" screen and nothing else
//
// Marking and debrief are OUT of this build. Nothing here scores, ranks or reacts to
// what the candidate wrote — the only response to a submission is advancing the page.
//
// There is intentionally NO draft autosave: persistence is per-requirement AS
// SUBMITTED, which is what protects the paper. Autosaving keystrokes would mean the
// server holding an answer the candidate has not committed, which the immutable-
// submission rule below then could not cleanly reconcile.

type Phase = 'loading' | 'error' | 'intro' | 'sitting' | 'done';

interface Exhibit { exhibit_order: number; title: string | null; body: string | null }
interface SitCase {
  id: string;
  title: string | null;
  section: string | null;
  scenario_intro: string | null;
  total_marks: number | null;
  professional_skills_marks: number | null;
  exhibits: Exhibit[];
}
interface Slot {
  requirement_id: string;
  case_id: string;
  case_title: string | null;
  case_section: string | null;
  requirement_order: number;
  // Already candidate-facing: the API reduces the stored label to the PART alone
  // ("(i) B3e — 10 marks" → "(i)"). Render it as-is; do NOT re-derive it here, or the two
  // strippers can disagree and the API's is the one that matters.
  label: string | null;
  // Marks per requirement, from the `marks_guide` COLUMN. The label no longer carries them
  // — AFM's used to spell them in prose and APM's never did, so taking them from the
  // column is what makes both papers show marks for the same reason.
  marks: number | null;
  question: string;
}
interface Attempt { mock_id: string; started_at: string; ends_at: string; completed: boolean }
interface PaperData {
  paper: { id: string; paper: AccaPaper; title: string; duration_minutes: number };
  cases: SitCase[];
  slots: Slot[];
  submitted: string[];
  attempt: Attempt | null;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function SitRunner({ paper }: { paper: AccaPaper }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<PaperData | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  const slots = useMemo(() => data?.slots ?? [], [data]);
  const slotIds = useMemo(() => slots.map((s) => s.requirement_id), [slots]);

  // ── Load: resume an open sit, or offer to start one ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/acca/sit?paper=${encodeURIComponent(paper)}`);
        if (!res.ok) { if (!cancelled) setPhase('error'); return; }
        const json = (await res.json()) as PaperData;
        if (cancelled) return;
        setData(json);
        setAttempt(json.attempt);

        const done = new Set(json.submitted);
        const ids = json.slots.map((s) => s.requirement_id);
        if (isPaperComplete(ids, done)) {
          setPhase('done');
        } else if (json.attempt && !json.attempt.completed) {
          // Resume mid-sit: the clock never restarted, and the paper picks up at the
          // first requirement with no recorded answer.
          setIndex(nextUnsubmittedIndex(ids, done));
          setPhase('sitting');
        } else {
          setPhase('intro');
        }
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [paper]);

  // ── Elapsed clock: display tick only. started_at is the server-side authority,
  // so a refresh resumes the same elapsed time rather than restarting it. ──
  useEffect(() => {
    if (phase !== 'sitting') return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startedMs = attempt ? new Date(attempt.started_at).getTime() : 0;
  const elapsedMs = attempt ? nowTs - startedMs : 0;

  const start = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch('/api/acca/sit', {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'start', paper }),
      });
      if (!res.ok) { setPhase('error'); return; }
      const json = await res.json();
      setAttempt(json.attempt as Attempt);
      setIndex(nextUnsubmittedIndex(slotIds, new Set(data?.submitted ?? [])));
      setNowTs(Date.now());
      setText('');
      setPhase('sitting');
    } catch {
      setPhase('error');
    } finally {
      setStarting(false);
    }
  }, [slotIds, data, paper]);

  // Submit the current requirement. IRREVERSIBLE by design — the server refuses to
  // overwrite a recorded answer, so this is confirmed before it fires.
  const submitCurrent = useCallback(async () => {
    const slot = slots[index];
    if (!slot || submitting) return;
    const last = index >= slots.length - 1;
    const confirmed = window.confirm(
      last
        ? 'Submit this answer and finish the paper?\n\nThis is final — you cannot come back to it.'
        : 'Submit this answer and move on?\n\nThis is final — you cannot come back to it.',
    );
    if (!confirmed) return;

    setSubmitting(true);
    setSubmitError(false);
    try {
      // Recording an answer goes through the STANDARD case-turn route in sit mode — the
      // ONE sit write path for both papers, not a bespoke sit endpoint. `sitting` makes it
      // skip the teach engine, record `final_answer` and never write `passed`. It is also
      // what makes the turn route serve mock content at all: the mock guard refuses
      // reserved cases in practice mode and allows them in sit mode.
      // `paper` must be sent because the route defaults to APM and would 404 an AFM case.
      // It comes from the SERVED config, never a literal — hardcoding 'AFM' here is
      // exactly what would have 404'd every APM submission.
      const res = await fetch('/api/acca/case/turn', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({
          case_id: slot.case_id,
          requirement_id: slot.requirement_id,
          student_message: text,
          sitting: true,
          paper: data?.paper.paper ?? paper,
        }),
      });
      // 409 = already recorded (a double-submit or a replayed request). The answer IS
      // saved, so advancing is correct — this is not an error the candidate caused.
      if (!res.ok && res.status !== 409) { setSubmitError(true); return; }

      if (last) {
        await fetch('/api/acca/sit', {
          method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'finish', paper }),
        }).catch(() => {});
        setPhase('done');
        return;
      }
      setIndex((i) => i + 1);
      setText('');
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }, [slots, index, text, submitting, data, paper]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const shell = (inner: React.ReactNode) => (
    <>
      <style>{CSS}</style>
      <div className="sit">{inner}</div>
    </>
  );

  if (phase === 'loading') return shell(<div className="sit-state">Loading…</div>);

  if (phase === 'error') {
    return shell(
      <div className="sit-state sit-state--error" role="alert">
        Couldn’t load the paper. Reload to try again.
      </div>,
    );
  }

  if (phase === 'done') {
    // Deliberately bare: no score, no breakdown, no next step. Marking and debrief
    // are a separate build, and showing anything here would be feedback.
    return shell(
      <div className="sit-done">
        <h1 className="sit-done-title">Paper submitted.</h1>
      </div>,
    );
  }

  if (phase === 'intro' && data) {
    const totalMarks = data.cases.reduce((a, c) => a + (c.total_marks ?? 0), 0);
    return shell(
      <main className="sit-intro">
        <h1 className="sit-intro-title">{data.paper.title}</h1>
        <ul className="sit-intro-facts">
          <li><strong>{data.cases.length} questions · {slots.length} requirements · {totalMarks} marks.</strong></li>
          <li>Answer each requirement in order. <strong>Submitting is final</strong> — you cannot go back to a requirement or edit it.</li>
          <li>The timer counts <strong>up</strong>. Nothing submits automatically, and the paper does not end on its own.</li>
          <li>Each answer is saved as you submit it, so a dropped connection won’t lose submitted work.</li>
        </ul>
        <button className="sit-btn" onClick={start} disabled={starting}>
          {starting ? 'Starting…' : 'Start the paper →'}
        </button>
      </main>,
    );
  }

  if (phase === 'sitting' && data) {
    const slot = slots[index];
    if (!slot) return shell(<div className="sit-state">Loading…</div>);
    const activeCase = data.cases.find((c) => c.id === slot.case_id) ?? null;
    const last = index >= slots.length - 1;

    return shell(
      <div className="sit-run">
        <header className="sit-bar">
          <div className="sit-bar-left">
            <span className="sit-bar-case">
              {activeCase?.title ?? data.paper.title}
              {activeCase?.section ? ` · Section ${activeCase.section}` : ''}
            </span>
            <span className="sit-bar-progress">Requirement {index + 1} of {slots.length}</span>
          </div>
          <div className="sit-bar-clock">
            <span className="sit-bar-digits" aria-label="Time elapsed">{fmtElapsed(elapsedMs)}</span>
            <span className="sit-bar-caption">elapsed</span>
          </div>
        </header>

        <div className="sit-panes">
          {/* Scenario pane — the exhibits stay readable for every requirement of the
              case, exactly as the paper does. */}
          <section className="sit-scenario" aria-label="Scenario and exhibits">
            {activeCase?.scenario_intro && (
              <p className="sit-intro-para">{activeCase.scenario_intro}</p>
            )}
            {(activeCase?.exhibits ?? []).map((ex) => (
              <article key={ex.exhibit_order} className="sit-exhibit">
                {ex.title && <h2 className="sit-exhibit-title">{ex.title}</h2>}
                {ex.body && <div className="sit-exhibit-body">{ex.body}</div>}
              </article>
            ))}
          </section>

          {/* Answer pane */}
          <section className="sit-answer" aria-label="Requirement and answer">
            <div className="sit-req">
              {(slot.label || slot.marks != null) && (
                <span className="sit-req-label">
                  {[slot.label, slot.marks != null ? `${slot.marks} marks` : null].filter(Boolean).join(' — ')}
                </span>
              )}
              <div className="sit-req-question">{slot.question}</div>
            </div>

            <textarea
              className="sit-box"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your answer to this requirement…"
              spellCheck={false}
              aria-label="Your answer"
            />

            {submitError && (
              <div className="sit-err" role="alert">
                That didn’t save. Your answer is still here — press submit again.
              </div>
            )}

            <div className="sit-actions">
              <button className="sit-btn" onClick={submitCurrent} disabled={submitting}>
                {submitting
                  ? 'Submitting…'
                  : last ? 'Submit and finish →' : 'Submit and move on →'}
              </button>
              <span className="sit-final-note">Submitting is final.</span>
            </div>
          </section>
        </div>
      </div>,
    );
  }

  return shell(<div className="sit-state">Loading…</div>);
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .sit. Reuses the app tokens (--bg/--surface/--text/--border). Deliberately
// plain — an exam script, not a product surface.
const CSS = `
.sit {
  --ink: var(--text);
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
.sit *, .sit *::before, .sit *::after { box-sizing: border-box; }

.sit-state {
  display: flex; align-items: center; justify-content: center;
  min-height: 100vh; padding: 48px 24px; text-align: center;
  font-size: 15px; color: var(--text-muted);
}
.sit-state--error { color: #c0392b; }

/* ── Intro ── */
.sit-intro {
  max-width: 620px; margin: 0 auto; min-height: 100vh;
  display: flex; flex-direction: column; justify-content: center; gap: 20px;
  padding: 48px clamp(16px, 4vw, 32px);
}
.sit-intro-title {
  font-family: var(--font-display); font-size: clamp(26px, 4vw, 34px);
  font-weight: 700; letter-spacing: -0.5px; margin: 0; color: var(--text);
}
.sit-intro-facts { display: flex; flex-direction: column; gap: 10px; margin: 0; padding-left: 18px; }
.sit-intro-facts li { font-size: 15px; line-height: 1.55; color: var(--text); }

/* ── Running ── */
.sit-run { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.sit-bar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 10px clamp(16px, 4vw, 28px); min-height: 58px;
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.sit-bar-left { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.sit-bar-case {
  font-size: 14px; font-weight: 700; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sit-bar-progress {
  font-size: 11px; font-weight: 600; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--text-muted);
}
.sit-bar-clock { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.sit-bar-digits {
  font-family: var(--font-display); font-variant-numeric: tabular-nums;
  font-size: clamp(20px, 3vw, 26px); font-weight: 700; line-height: 1; color: var(--text);
}
.sit-bar-caption {
  font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-muted);
}

.sit-panes { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 1fr; }

.sit-scenario {
  min-height: 0; overflow-y: auto;
  padding: clamp(18px, 3vw, 28px);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 18px;
}
.sit-intro-para { font-size: 14.5px; line-height: 1.65; color: var(--text); margin: 0; }
.sit-exhibit { display: flex; flex-direction: column; gap: 6px; }
.sit-exhibit-title {
  font-family: var(--font-display); font-size: 14px; font-weight: 700;
  color: var(--text); margin: 0; letter-spacing: -0.1px;
}
/* pre-wrap so any authored line breaks / tabular layout in an exhibit survive. */
.sit-exhibit-body {
  font-size: 14.5px; line-height: 1.65; color: var(--text); white-space: pre-wrap;
}

.sit-answer {
  min-height: 0; overflow-y: auto;
  padding: clamp(18px, 3vw, 28px);
  display: flex; flex-direction: column; gap: 14px;
}
.sit-req {
  display: flex; flex-direction: column; gap: 6px;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px 16px;
}
.sit-req-label {
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--text-muted);
}
.sit-req-question { font-size: 15px; line-height: 1.6; color: var(--text); white-space: pre-wrap; }

.sit-box {
  flex: 1; min-height: 260px; width: 100%; resize: vertical;
  padding: 14px 16px; border-radius: 10px;
  border: 1px solid var(--border); background: var(--surface); color: var(--text);
  font-family: var(--font-body); font-size: 15px; line-height: 1.6;
}
.sit-box:focus { outline: 2px solid var(--brand); outline-offset: -1px; }

.sit-err {
  font-size: 13px; border-radius: 8px; padding: 9px 12px;
  background: #fff0f0; border: 1px solid #f5c6c6; color: #c0392b;
}
.sit-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.sit-final-note { font-size: 12px; color: var(--text-muted); }

.sit-btn {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 8px;
  padding: 11px 22px; border-radius: 999px; border: 1.5px solid var(--brand);
  background: var(--brand); color: #fff;
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  cursor: pointer; line-height: 1; transition: opacity 0.15s;
}
.sit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

/* ── Done ── */
.sit-done {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 48px 24px;
}
.sit-done-title {
  font-family: var(--font-display); font-size: clamp(24px, 4vw, 32px);
  font-weight: 700; color: var(--text); margin: 0; letter-spacing: -0.4px;
}

@media (max-width: 900px) {
  .sit-run { height: auto; min-height: 100vh; overflow: visible; }
  .sit-panes { grid-template-columns: 1fr; }
  .sit-scenario { border-right: none; border-bottom: 1px solid var(--border); overflow-y: visible; }
  .sit-answer { overflow-y: visible; }
  .sit-bar { position: sticky; top: 0; z-index: 20; }
}
`;
