'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  fmtDuration,
  // `isPaperComplete` is no longer imported here: completeness is one input to
  // `sitLoadDecision` and is not a screen decision on its own any more.
  nextUnsubmittedIndex,
  remainingMs,
  isExpired,
  clockState,
  sitRefusalFor,
  sitPhaseForRefusal,
  resultsOutcomeFor,
  sitWriteOutcomeFor,
  sitLoadDecision,
  type SitRefusal,
  type SitWriteOutcome,
} from '@/lib/acca/sit-preview';
import type { ServedPaper } from '@/lib/acca/paper';
import { paperHref } from '@/lib/acca/paper-url';
import { mockIntroViewed } from '@/lib/acca/surface-events';
import { emitSurfaceEvent } from '@/lib/acca/surface-event-client';
import ACCASignOutButton from '@/components/acca/ACCASignOutButton';

// ── Lean sit runner — BOTH PAPERS (generalised 2026-07-30) ────────────────────
// Was AFM-only, with 'AFM' written into the case/turn body. It now takes the paper as a
// prop and threads it through every call; the server resolves which mock paper that maps
// to. /acca/mock (APM) and /acca/afm/mock (AFM) both render this one component, so the
// two papers cannot drift into two sit behaviours — which is what the old split gave us
// (CaseSession's teach surface for APM, this one for AFM).
//
// It LIVES HERE, not under app/acca/afm/mock/, as of 2026-07-31. That was its authoring
// home and the generalisation left it there, so the APM route was importing a component
// out of the AFM route's folder — a path that asserted an ownership the component no
// longer has. Nothing about the move is behavioural.
// Authentic exam conditions, and deliberately nothing more:
//   • one answer box per requirement, in paper order
//   • "Submit and move on" ONLY — no back navigation, no editing a submitted answer
//   • no Ezra, no hints, no marks, no feedback of any kind during the sit
//   • a visible COUNTDOWN, flagged in its last 15 minutes, and an AUTO-SUBMIT at zero
//   • each answer is persisted as it is submitted, so a dropped connection loses at
//     most the requirement being typed, never the paper
//
// ── THE COUNTDOWN IS BACK (restored 2026-07-31, for BOTH papers) ─────────────
// This runner shipped counting UP with no expiry, and `MockRunner` — which it replaced —
// had a countdown and an auto-submit. That was a REGRESSION for APM candidates, not a port:
// the skill a timed mock rehearses is finishing inside the time, and a stopwatch that never
// runs out cannot rehearse it.
//
// AT ZERO the auto-submit records the requirement CURRENTLY BEING WRITTEN — whatever is in
// the box, including nothing — and then finishes the paper. It does NOT back-fill the
// requirements after it. Those stay with no row at all, which is the truth of what happened
// and is a materially different finding from a blank the candidate chose to submit:
// `not_reached` vs `blank`, which pacing and the debrief report differently. Immutability is
// untouched — the auto-submit posts through the same case/turn path and gets the same 409 if
// the requirement was already recorded.
//
// ── AFTER THE PAPER: THE DEBRIEF (added 2026-07-31) ──────────────────────────
// Finishing used to land on a bare "Paper submitted." screen, because marking did not
// exist yet. It now posts once to /api/acca/sit/results — which marks any unmarked case,
// then returns the coached debrief — and renders it.
//
// NOTHING DURING THE SIT CHANGES. No marks, no bands, no feedback, no reaction of any
// kind reaches the candidate before the last submission; the only response to a submission
// is still advancing the page. The results request is fired strictly AFTER the paper is
// finished, and the fetch cannot be triggered from any other phase.
//
// The render follows the debrief's own structure and adds nothing to it: the report's
// `headline` leads, cases group their own requirements with a subtotal, and each
// requirement prints its marks, its band, the marker's verbatim reasoning and one next
// action. PACING SITS ADJACENT AND IS NEVER MERGED — it is a separate labelled line under
// the marks line, exactly as lib/acca/pacing.ts and lib/acca/debrief.ts require. Nothing
// here computes, rewords, ranks or combines anything: every string on the screen comes
// from the report as-authored.
//
// There is intentionally NO draft autosave: persistence is per-requirement AS
// SUBMITTED, which is what protects the paper. Autosaving keystrokes would mean the
// server holding an answer the candidate has not committed, which the immutable-
// submission rule below then could not cleanly reconcile.

// `locked` added 2026-08-12. The union previously had nowhere to put "refused, and here is
// why", so a 402 subscription_required landed in `error` beside a 500 and rendered the same
// generic "Couldn't load the paper. Reload to try again." — advice that can never work.
type Phase = 'loading' | 'error' | 'locked' | 'intro' | 'sitting' | 'done';

// ── Debrief payload (mirrors lib/acca/debrief.ts's DebriefReport) ─────────────
// Typed here rather than imported so the client bundle never pulls a server module in
// behind it. The field names are the contract; if they drift, this stops compiling.
interface DebriefLine {
  paper_order: number;
  requirement_id: string;
  case_id: string;
  display_name: string;
  verdict: 'strong' | 'partial' | 'lost' | 'not_reached';
  marks_awarded: number | null;
  marks_available: number;
  marks_lost: number | null;
  band: string | null;
  what_was_lost: string;
  why: string | null;
  why_display: 'expanded' | 'collapsed';
  next_action: string;
  /** Routing target for the practise action; null on strong/exemplary. Never rendered as text. */
  practise_area: string | null;
  pacing_note: string | null;
  pacing_flag: string | null;
  answer_state: string | null;
}
interface DebriefCaseGroup {
  case_id: string;
  title: string | null;
  position: number;
  display_name: string;
  requirements: DebriefLine[];
  technical_awarded: number | null;
  technical_available: number;
}
interface DebriefHeadline { code: string; statement: string }
interface DebriefSkillLine { skill: string; band: string; why: string }
interface DebriefReport {
  not_evaluated: string | null;
  headline: DebriefHeadline;
  secondary: DebriefHeadline[];
  requirements: DebriefLine[];
  cases: DebriefCaseGroup[];
  professional: Array<{ case_id: string; title: string | null; awarded: number | null; available: number | null; skills: DebriefSkillLine[] }>;
  totals: {
    technical_awarded: number | null;
    technical_available: number;
    professional_awarded: number | null;
    professional_available: number | null;
  };
  limitations: string[];
}
interface ResultsData {
  paper: { id: string; paper: ServedPaper; title: string; duration_minutes: number };
  debrief: DebriefReport;
  pacing: { total_elapsed_minutes: number | null; tail_minutes: number | null };
}

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
// `completed_at` is served by the sit GET (lib/acca/sit-attempt.ts selects it) and is what
// distinguishes a paper that ran out of time from one that was finished early — see
// `endedOnClock`. Optional because POST {action:'start'} returns a narrower row that does not
// include it; that row is always an OPEN attempt, where the field would be null anyway.
interface Attempt {
  mock_id: string;
  started_at: string;
  ends_at: string;
  completed: boolean;
  completed_at?: string | null;
}
interface PaperData {
  paper: { id: string; paper: ServedPaper; title: string; duration_minutes: number };
  cases: SitCase[];
  slots: Slot[];
  submitted: string[];
  attempt: Attempt | null;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export default function SitRunner({ paper }: { paper: ServedPaper }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<PaperData | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [index, setIndex] = useState(0);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [nowTs, setNowTs] = useState<number>(() => Date.now());
  // ── Results state. Only ever touched in the 'done' phase. ──
  // `requestedRef` is a REF, not state, on purpose: it guards the effect from firing twice
  // (Strict Mode's double-invoke, and any re-render while the request is in flight) and a
  // guard that itself triggers a render would be the thing it is guarding against.
  const [results, setResults] = useState<ResultsData | null>(null);
  const [resultsError, setResultsError] = useState<string | null>(null);
  // Marking refused for entitlement, AFTER the paper was sat. Its own flag rather than a
  // string in `resultsError`, because it is not an error — the paper is safe and the student
  // has an action. See the locked branch of the `done` render.
  const [resultsLocked, setResultsLocked] = useState(false);
  const requestedRef = useRef(false);
  // The paper ended because the clock ran out rather than because the candidate finished it.
  // Purely for what the done screen SAYS — it changes nothing about what was recorded.
  const [expiredOut, setExpiredOut] = useState(false);
  const autoSubmitRef = useRef(false);
  // WHY a request was refused, when it was. Carried for both the `locked` and `error` phases:
  // `not_available` (flag off / paper not servable) and `failed` share the error screen but
  // must not share its copy — "reload" is honest advice for one of them and not the other.
  const [refusal, setRefusal] = useState<SitRefusal | null>(null);
  // A mid-sit lapse. Distinct from `submitError` because it is not a failure to retry blindly:
  // the answer is still in the box, the paper is not over, and there is an action that makes
  // the retry work. `null` means no lapse.
  const [lapsed, setLapsed] = useState(false);
  // Where the upsell goes, carrying the paper (lib/acca/paper-url.ts). Same href the practice
  // surface uses, so both surfaces sell the same paper from the same status code.
  const subscribeHref = paperHref('/acca/subscribe', paper);
  const hubHref = paperHref('/acca', paper);
  // Which mock paper this mount has already reported an intro view for. The load effect's
  // `cancelled` flag usually absorbs React's Strict Mode double-invoke, but only if the fetch
  // resolves AFTER cleanup — a warm cache can beat it. Keyed on the mock id, like CaseList's
  // paper key and CaseSession's case key.
  const introReported = useRef<string | null>(null);

  const slots = useMemo(() => data?.slots ?? [], [data]);
  const slotIds = useMemo(() => slots.map((s) => s.requirement_id), [slots]);

  // ── Load: resume an open sit, or offer to start one ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/acca/sit?paper=${encodeURIComponent(paper)}`);
        // A non-200 is not one thing. This used to be `setPhase('error')` for every status,
        // so an unentitled student — the highest-intent visitor this surface gets — was told
        // "Couldn't load the paper. Reload to try again." A reload cannot fix a subscription.
        if (!res.ok) {
          if (!cancelled) {
            const why = sitRefusalFor(res.status);
            setRefusal(why);
            setPhase(sitPhaseForRefusal(why));
          }
          return;
        }
        const json = (await res.json()) as PaperData;
        if (cancelled) return;
        setData(json);
        setAttempt(json.attempt);

        const done = new Set(json.submitted);
        const ids = json.slots.map((s) => s.requirement_id);

        // ── ONE DECISION, MADE IN lib/acca/sit-preview.ts ──────────────────────
        // This was an inline if / else-if / else whose `else` was `intro`, and a paper that
        // ended on the CLOCK matched neither of the first two arms — `completed=true` with an
        // incomplete submitted set, because the auto-submit does not back-fill the tail. It
        // fell through to the START SCREEN, taking the debrief and the subscribe-and-mark
        // retry with it, and a Start click there minted a new attempt that made the old
        // paper unmarkable through the UI for good. See `sitLoadDecision`'s header.
        //
        // The arms are now pure and fixtured. Nothing about the intro / resume / expired
        // behaviour changes; the completed-and-incomplete shape simply has somewhere to go.
        const decision = sitLoadDecision(json.attempt, ids, done, Date.now());

        if (decision.finishAttempt) {
          // EXPIRED WHILE AWAY. Closing the tab must not buy time, so a return visit does
          // not resume into a paper whose clock ran out — it closes the attempt and goes
          // to the results. Nothing is submitted here: whatever was in the box when the tab
          // closed was never sent, so those requirements are genuinely unreached.
          await fetch('/api/acca/sit', {
            method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'finish', paper }),
          }).catch(() => {});
          if (cancelled) return;
        }
        if (decision.expiredOut) setExpiredOut(true);
        if (decision.phase === 'sitting') setIndex(decision.index);

        // ── mock_intro_viewed — THE MOCK'S ANSWER TO THE CASE BOUNCE QUESTION ──
        // Fired on the intro arm ALONE: no attempt at all. Reaching it means the student
        // loaded the paper, saw "3h 15m", and has not clicked Start — and until this event
        // that left NO ROW ANYWHERE, because acca_mock_attempts is written only by the Start
        // click. Opening the mock and closing the tab was indistinguishable from never
        // opening it.
        //
        // Deliberately NOT fired on the other arms, which are different findings and already
        // have rows: every one of them has an acca_mock_attempts row that says so.
        //
        // ⚠️ NARROWED BY THIS FIX, and correctly. The old `else` also caught a COMPLETED
        // attempt, so a returning student whose paper was over emitted `mock_intro_viewed` —
        // an intro view recorded for someone who was not being shown the intro. Those rows
        // were miscounted; the arm that produced them was the bug.
        //
        // The mock_id and paper come from the SERVED config (`json.paper`), never from the
        // `paper` prop or a literal — the same discipline recordAnswer follows, and the
        // server cross-checks that the two agree (a mock_id whose paper contradicts the
        // stated paper is refused rather than stored).
        if (decision.reportIntro && introReported.current !== json.paper.id) {
          introReported.current = json.paper.id;
          emitSurfaceEvent(mockIntroViewed(json.paper.id, json.paper.paper));
        }

        setPhase(decision.phase);
      } catch {
        if (!cancelled) setPhase('error');
      }
    })();
    return () => { cancelled = true; };
  }, [paper]);

  // ── Countdown tick: display only. `ends_at` is the server-side authority, so a refresh
  // resumes the same remaining time rather than restarting it. ──
  useEffect(() => {
    if (phase !== 'sitting') return;
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const remaining = attempt ? remainingMs(attempt.ends_at, nowTs) : null;
  const clock = clockState(remaining);

  // ── Results: marked once, then reported ─────────────────────────────────────
  // POST is the marking verb. It is IDEMPOTENT in practice — the endpoint marks only the
  // cases that are not marked yet, so a revisit does no model work and returns the same
  // debrief from what was persisted. That is what makes it safe to fire on every arrival
  // at the done screen rather than tracking "have I marked this" on the client, where a
  // cleared browser would get it wrong.
  //
  // `requestedRef` guards the STRICT MODE double-invoke and a re-render loop, not the
  // idempotency — the server owns that.
  const fetchResults = useCallback(async () => {
    setResultsError(null);
    setResultsLocked(false);
    try {
      const res = await fetch('/api/acca/sit/results', {
        method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ paper }),
      });
      const json = await res.json().catch(() => null);
      // ── THE WORST OF THE THREE DEAD ENDS, AND THE ONE FIXED FIRST ────────────
      // A lapsed subscription 402s here, and this screen is reached only AFTER a 3h15m paper
      // has been sat. The old code sent every non-200 except `paper_not_finished` to
      // "Marking did not complete. Your answers are saved — try again." under a button
      // labelled "Try marking again" — an infinite retry on a request that cannot succeed
      // until something changes outside this screen, at the moment the student has the most
      // invested and the least patience.
      //
      // `resultsOutcomeFor` reads the code as well as the status, because
      // `paper_not_finished` is itself a 409 and the status alone cannot decide it.
      const outcome = resultsOutcomeFor(res.status, json?.error);
      if (outcome === 'paper_locked') {
        // NOT set as `resultsError`: the locked render leads with the work being safe, and
        // reusing the error slot would put it in red beside a genuine failure.
        setResultsLocked(true);
        return;
      }
      if (outcome === 'not_finished') {
        setResultsError('This paper is not finished yet, so it has not been marked.');
        return;
      }
      if (outcome === 'failed') {
        setResultsError('Marking did not complete. Your answers are saved — try again.');
        return;
      }
      setResults(json as ResultsData);
    } catch {
      // A thrown fetch is a transport failure, which IS worth retrying blindly.
      setResultsError('Marking did not complete. Your answers are saved — try again.');
    }
  }, [paper]);

  // Scheduled rather than called inline: this effect's job is to kick off an external
  // request when the terminal screen is reached, not to synchronise state.
  useEffect(() => {
    if (phase !== 'done' || requestedRef.current) return;
    requestedRef.current = true;
    const id = setTimeout(() => { void fetchResults(); }, 0);
    return () => clearTimeout(id);
  }, [phase, fetchResults]);

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

  /** Record ONE requirement through the standard sit write path. Shared by the manual submit
   *  and the auto-submit so there is one write shape.
   *
   *  ── RETURNS A DISCRIMINATED OUTCOME, NOT A BOOLEAN (changed 2026-08-12) ────
   *  It used to be `res.ok || res.status === 409`, which threw the status away — so no caller
   *  could tell a lapsed subscription from a server fault, and both surfaced as "That didn't
   *  save. Press submit again." One of those retries works and the other never will.
   *
   *  The boolean was also WRONG about 409, not merely uninformative: that route returns 409 for
   *  `already_submitted` (the answer IS recorded — the reason this arm existed),
   *  `attempt_closed` and `no_open_attempt`. The last two are refusals and were being reported
   *  to the student as saved work. `sitWriteOutcomeFor` reads the code and separates them. */
  const recordAnswer = useCallback(async (slot: Slot, body: string): Promise<SitWriteOutcome> => {
    // `sitting` makes the turn route skip the teach engine, record `final_answer` and never
    // write `passed`. It is also what makes that route serve mock content at all: the mock
    // guard refuses reserved cases in practice mode and allows them in sit mode.
    // `paper` must be sent because the route defaults to APM and would 404 an AFM case. It
    // comes from the SERVED config, never a literal — hardcoding 'AFM' here is exactly what
    // would have 404'd every APM submission.
    const res = await fetch('/api/acca/case/turn', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        case_id: slot.case_id,
        requirement_id: slot.requirement_id,
        student_message: body,
        sitting: true,
        paper: data?.paper.paper ?? paper,
      }),
    });
    const json = res.ok ? null : await res.json().catch(() => null);
    return sitWriteOutcomeFor(res.status, json?.error);
  }, [data, paper]);

  const finishPaper = useCallback(async () => {
    await fetch('/api/acca/sit', {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ action: 'finish', paper }),
    }).catch(() => {});
  }, [paper]);

  // ── AUTO-SUBMIT AT ZERO ─────────────────────────────────────────────────────
  // Records the requirement being written — whatever is in the box, including nothing — and
  // then finishes the paper. NO CONFIRM DIALOG: the deadline is not a decision, and a modal
  // waiting for a click would let the candidate keep the paper open past the bell, which is
  // the exact thing this exists to stop.
  //
  // It does NOT touch the requirements after this one. They keep no progress row, so they are
  // `not_reached` rather than `blank` — a different finding, reported differently by pacing
  // and the debrief, and back-filling empty strings would have thrown that away.
  //
  // Records BEFORE finishing, in that order: the turn route refuses a sit write once the
  // attempt is completed, so finishing first would discard the answer this is trying to save.
  const autoSubmit = useCallback(async () => {
    const slot = slots[index];
    setSubmitting(true);
    try {
      // The outcome is deliberately DISCARDED here, unlike in submitCurrent. At the bell there
      // is no retry to offer and no screen left to offer it on: the paper closes either way,
      // and a lapse banner on a surface that is about to become the done screen would be a
      // prompt the student cannot act on. If the write was refused, that requirement stays
      // `not_reached` — which is the truth of what happened.
      if (slot) await recordAnswer(slot, text);
    } catch {
      // Nothing to retry against — the clock has run out either way, and the paper must close.
    }
    await finishPaper();
    setExpiredOut(true);
    setPhase('done');
  }, [slots, index, text, recordAnswer, finishPaper]);

  useEffect(() => {
    if (phase !== 'sitting' || !attempt || autoSubmitRef.current) return;
    if (!isExpired(attempt.ends_at, nowTs)) return;
    autoSubmitRef.current = true;
    const id = setTimeout(() => { void autoSubmit(); }, 0);
    return () => clearTimeout(id);
  }, [phase, attempt, nowTs, autoSubmit]);

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
    setLapsed(false);
    try {
      // The ONE sit write path for both papers — see recordAnswer.
      const outcome = await recordAnswer(slot, text);
      if (!outcome.ok) {
        // ── A LAPSE WITH THE CLOCK RUNNING: PRESERVE, THEN SELL ────────────────
        // Chosen treatment, and what it deliberately does NOT do:
        //   • The phase STAYS `sitting`. The paper is not finished, not abandoned, and not
        //     navigated away from — so `text` survives in the box and the submitted
        //     requirements stay durable in acca_case_progress exactly as they were.
        //   • The subscribe link opens in a NEW TAB. This is the whole preservation
        //     mechanism: the in-progress answer exists only in React state, so navigating
        //     this tab would destroy the one thing that is not already saved.
        //   • The existing Submit button IS the retry. Nothing extra to press, and it
        //     re-reads the entitlement server-side on the next attempt.
        //   • THE CLOCK IS NOT PAUSED, and the banner says so rather than implying safety.
        //     `ends_at` is server-authoritative and set once at start; pausing it would mean
        //     a candidate could stop a timed exam by letting a card lapse, which is a change
        //     to what a timed sit MEANS, not a courtesy. Being honest about the running clock
        //     is the difference between preserving their work and misleading them about it.
        if (outcome.reason === 'paper_locked') { setLapsed(true); return; }
        // The server says this attempt is over (finished elsewhere, or closed). There is
        // nothing to retry, so go where the paper actually is — the results — rather than
        // leaving "press submit again" on screen forever. This arm is only reachable now that
        // `attempt_closed` is no longer mis-read as a successful write.
        if (outcome.reason === 'attempt_closed') { setPhase('done'); return; }
        setSubmitError(true);
        return;
      }

      if (last) {
        await finishPaper();
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
  }, [slots, index, text, submitting, recordAnswer, finishPaper]);

  // ── Render ──────────────────────────────────────────────────────────────────
  const shell = (inner: React.ReactNode) => (
    <>
      <style>{CSS}</style>
      <div className="sit">{inner}</div>
    </>
  );

  if (phase === 'loading') return shell(<div className="sit-state">Loading…</div>);

  // ── Refused for entitlement, BEFORE the paper was started ────────────────────
  // The copy register is CaseSession's, not a new one: "Exam cases are part of the {paper}
  // subscription." → "Timed mocks are part of the {paper} subscription.", the same
  // "Subscribe to unlock →" CTA, and the same back-link shape. One status code, one voice.
  //
  // This tab may be navigated away freely — nothing has been written yet and there is no
  // clock running — so the link is a normal in-tab navigation, unlike the two arms below.
  if (phase === 'locked') {
    return shell(
      <main className="sit-locked">
        <h1 className="sit-locked-title">ACCA {paper} timed mock</h1>
        <p className="sit-locked-copy">
          Timed mocks are part of the {paper} subscription — a full paper against the clock,
          sat as three cases back to back and marked as one.
        </p>
        <a className="sit-btn" href={subscribeHref}>
          Subscribe to unlock <span aria-hidden="true">→</span>
        </a>
        <a className="sit-locked-back" href={hubHref}>← Back to drills</a>
      </main>,
    );
  }

  if (phase === 'error') {
    return shell(
      <div className="sit-state sit-state--error" role="alert">
        {/* `not_available` and `failed` share this screen and must not share its copy: a
            reload genuinely retries a transient failure, and cannot conjure a paper that is
            not being served. Telling a student to reload at a paper that does not exist for
            them is the same class of false advice this change exists to remove. */}
        {refusal === 'not_available'
          ? 'This paper isn’t available right now.'
          : 'Couldn’t load the paper. Reload to try again.'}
      </div>,
    );
  }

  if (phase === 'done') {
    // ── MARKING REFUSED FOR ENTITLEMENT, AFTER A FULL PAPER ──────────────────
    // Ordered deliberately: this branch is tested BEFORE `resultsError`, and it leads with
    // what is TRUE and reassuring — the answers are already durable in acca_case_progress,
    // written one at a time as they were submitted — before it mentions the subscription.
    // A student who has just sat 3h15m needs to know their work is not lost first and that
    // there is something to buy second.
    //
    // The subscribe link opens in a NEW TAB. Navigating this tab away would lose the done
    // screen, and with it the only route back to marking is a fresh load of the mock — which
    // now resolves an expired attempt and lands here again. A new tab keeps the retry in reach.
    //
    // The retry is KEPT but re-labelled. "Try marking again" was the dead end; "I've
    // subscribed — mark my paper" names the thing that has to change first, so pressing it is
    // a consequence of an action rather than a hopeful repeat.
    if (resultsLocked) {
      return shell(
        <div className="sit-done">
          <h1 className="sit-done-title">{expiredOut ? 'Time’s up.' : 'Paper submitted.'}</h1>
          <p className="sit-done-note">
            <strong>Your paper is saved.</strong> Every answer you submitted is stored as you
            submitted it — nothing here is lost, and nothing needs re-typing.
          </p>
          <p className="sit-done-note">
            Marking is part of the {paper} subscription. Subscribe and this paper will be
            marked in full, with the debrief.
          </p>
          <a
            className="sit-btn"
            href={subscribeHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            Subscribe to unlock <span aria-hidden="true">→</span>
          </a>
          <div className="sit-locked-actions">
            <button className="sit-linkbtn" onClick={() => { void fetchResults(); }}>
              I’ve subscribed — mark my paper
            </button>
            <a className="sit-locked-back" href={hubHref}>← Back to drills</a>
          </div>
        </div>,
      );
    }
    if (resultsError) {
      return shell(
        <div className="sit-done">
          <h1 className="sit-done-title">{expiredOut ? 'Time’s up.' : 'Paper submitted.'}</h1>
          <p className="sit-done-note" role="alert">{resultsError}</p>
          <button className="sit-btn" onClick={() => { void fetchResults(); }}>
            Try marking again
          </button>
        </div>,
      );
    }
    if (!results) {
      return shell(
        <div className="sit-done">
          <h1 className="sit-done-title">{expiredOut ? 'Time’s up.' : 'Paper submitted.'}</h1>
          {/* States what the clock did, and nothing about how it went — that is the debrief's
              job, and a verdict here would be feedback arriving before the marking. */}
          {expiredOut && (
            <p className="sit-done-note">
              The paper ended on the clock. What you had written was submitted.
            </p>
          )}
          <p className="sit-done-note">Marking your paper — this takes a minute.</p>
        </div>,
      );
    }
    return shell(<Debrief data={results} />);
  }

  if (phase === 'intro' && data) {
    const totalMarks = data.cases.reduce((a, c) => a + (c.total_marks ?? 0), 0);
    return shell(
      <main className="sit-intro">
        <h1 className="sit-intro-title">{data.paper.title}</h1>
        <ul className="sit-intro-facts">
          <li><strong>{data.cases.length} questions · {slots.length} requirements · {totalMarks} marks.</strong></li>
          <li>Answer each requirement in order. <strong>Submitting is final</strong> — you cannot go back to a requirement or edit it.</li>
          <li>You have <strong>{Math.floor(data.paper.duration_minutes / 60)}h {data.paper.duration_minutes % 60}m</strong>. The clock counts <strong>down</strong> and does not pause.</li>
          <li>When it reaches zero the requirement you are writing is <strong>submitted as it stands</strong> and the paper ends. Anything you never reached stays unanswered.</li>
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
          {/* The countdown. `aria-live="polite"` on the WARNING caption only — announcing every
              tick would make a screen reader unusable, but the moment the paper enters its
              last 15 minutes is worth saying once. */}
          <div className={`sit-bar-clock sit-bar-clock--${clock}`}>
            <span className="sit-bar-digits" aria-label="Time remaining">
              {remaining === null ? '—' : fmtDuration(remaining)}
            </span>
            <span className="sit-bar-caption" aria-live="polite">
              {clock === 'warning' ? 'remaining — final 15 minutes' : 'remaining'}
            </span>
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

            {/* A lapse mid-paper. Same copy register as CaseSession's `ec-lapse` line, with
                the two facts a candidate under a running clock actually needs first: the
                answer is still here, and the submitted work is already safe. The link opens
                in a new tab so this one is never navigated away — see submitCurrent. */}
            {lapsed && (
              <div className="sit-lapse" role="alert">
                <strong>Your answer is still here.</strong> Everything you have already
                submitted is saved. This one couldn’t be — timed mocks are part of the{' '}
                {paper} subscription, and it has lapsed.{' '}
                <a
                  className="sit-lapse-link"
                  href={subscribeHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Subscribe to continue →
                </a>{' '}
                then press submit again. <em>The clock does not stop.</em>
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

// ── The debrief ────────────────────────────────────────────────────────────────
// A RENDERER, not a second author. Every sentence on this screen is a string the report
// already contains: the headline, `what_was_lost`, the marker's verbatim `why`, the
// band-derived `next_action`, and the pacing note. This component decides layout and
// nothing else — it never composes a sentence, never rounds a number, never combines marks
// with pacing, and never turns a band into a grade.
//
// Two rules from lib/acca/debrief.ts are load-bearing in the markup:
//   1. PACING IS ADJACENT, NEVER MERGED. It is its own labelled line under the marks line.
//      "You rushed it and lost marks" is a causal claim the debrief refuses to make, and a
//      layout that ran the two together would make it visually anyway.
//   2. `display_name` IS THE ONLY SAFE REFERENCE. The stored `label` carries the syllabus
//      code the sit route strips at the serve boundary; printing it here would re-leak it
//      one screen later. `label` is present on the line for traceability and is not read.

function bandLabel(band: string | null): string | null {
  if (!band) return null;
  return band.charAt(0).toUpperCase() + band.slice(1);
}

function DebriefRequirement({ line, paper }: { line: DebriefLine; paper: ServedPaper }) {
  const href = line.practise_area ? practiseHref(line.practise_area, paper) : null;
  return (
    <li className={`db-req db-req--${line.verdict}`}>
      <div className="db-req-head">
        <span className="db-req-name">{line.display_name}</span>
        {line.band && <span className={`db-band db-band--${line.band}`}>{bandLabel(line.band)}</span>}
      </div>

      {/* MARKS — arithmetic, from the report. */}
      <p className="db-line db-line--marks"><span className="db-key">Marks:</span> {line.what_was_lost}</p>

      {/* PACING — its own line, its own label, never folded into the marks sentence. */}
      {line.pacing_note && (
        <p className="db-line db-line--pacing"><span className="db-key">Pacing:</span> {line.pacing_note}</p>
      )}

      {/* WHY — the marker's own words. Collapsed only where the report says the short
          action already carries the whole message (a strong band that lost nothing); the
          string itself is COMPLETE in both states and is never truncated or rewritten. */}
      {line.why && (
        line.why_display === 'collapsed' ? (
          <details className="db-why db-why--collapsed">
            <summary>Why this scored as it did</summary>
            <p className="db-why-body">{line.why}</p>
          </details>
        ) : (
          <div className="db-why">
            <p className="db-why-label">Why</p>
            <p className="db-why-body">{line.why}</p>
          </div>
        )
      )}

      <p className="db-line db-line--action"><span className="db-key">Next:</span> {line.next_action}</p>

      {/* THE EXIT. Present only where the band is weak or competent — the server decides that
          (practise_area is null otherwise), so the button cannot appear on a requirement that
          scored even if this component is reused elsewhere. */}
      {href && (
        <a className="db-practise" href={href}>
          Practise this →
        </a>
      )}
    </li>
  );
}

// ── WHERE A REQUIREMENT SENDS YOU NEXT ───────────────────────────────────────
// A practise action appears ONLY on a weak or competent band. Those are the two bands the
// marker uses to say something was missed, and they are the same two that open a row in the
// weakness ledger — so the button and the steering agree by construction rather than by
// coincidence.
//
// STRONG AND EXEMPLARY GET NOTHING, deliberately. Manufacturing work on a requirement that
// scored is how a debrief turns into a chore list: it tells a student their good answer was
// also a problem, and it dilutes the actions that matter. The debrief already says "nothing to
// change here" on those bands; a button underneath would contradict it.
const PRACTISABLE_BANDS = new Set(['weak', 'competent']);

/** The drill surface for one syllabus area. `area=` is the 2-character sub-area (E3a → E3):
 *  the LO itself is often a single drill, and the sub-area is what the selector treats as a
 *  practisable bucket. Paper is carried because AFM and APM LO codes collide exactly. */
function practiseHref(loCode: string | null, paper: ServedPaper): string | null {
  const area = (loCode ?? '').trim().slice(0, 2);
  if (!area) return null;
  return paperHref(`/acca/tutor?area=${encodeURIComponent(area)}`, paper);
}

function Debrief({ data }: { data: ResultsData }) {
  const { debrief } = data;
  const t = debrief.totals;
  const paper = data.paper.paper;
  const dashHref = paperHref('/acca', paper);
  const progressHref = paperHref('/acca/progress', paper);

  if (debrief.not_evaluated) {
    return (
      <main className="db">
        <h1 className="db-title">Paper submitted.</h1>
        <p className="db-note">{debrief.not_evaluated}</p>
      </main>
    );
  }

  return (
    <main className="db">
      {/* THE WAY OUT, at the TOP and sticky. The results screen was a cul-de-sac: no link to
          the dashboard or anywhere else, so the only exit was the browser's back button into a
          finished paper. Placed above the marks rather than under the last requirement, because
          a student who wants to leave should not have to read their whole debrief to find the
          door. */}
      <nav className="db-nav">
        <a className="db-nav-back" href={dashHref}>← Dashboard</a>
        <div className="db-nav-right">
          <span className="db-nav-paper">ACCA {paper}</span>
          <ACCASignOutButton />
        </div>
      </nav>

      <header className="db-head">
        <h1 className="db-title">{data.paper.title} — your paper</h1>

        {/* TOTALS ARE FACTS, NOT A GRADE. The debrief deliberately predicts no pass mark
            and this screen adds none. */}
        <div className="db-totals">
          <div className="db-total">
            <span className="db-total-num">
              {t.technical_awarded ?? '—'}<span className="db-total-of">/{t.technical_available}</span>
            </span>
            <span className="db-total-cap">Technical</span>
          </div>
          {t.professional_available != null && (
            <div className="db-total">
              <span className="db-total-num">
                {t.professional_awarded ?? '—'}<span className="db-total-of">/{t.professional_available}</span>
              </span>
              <span className="db-total-cap">Professional skills</span>
            </div>
          )}
          {data.pacing.total_elapsed_minutes != null && (
            <div className="db-total">
              {/* Whole minutes, rounded DOWN — the same convention pacing.ts uses in prose.
                  A tile reading "176.4 min" next to a sentence reading "176 minutes" is the
                  inconsistency this change exists to remove. */}
              <span className="db-total-num">{Math.floor(Math.max(0, data.pacing.total_elapsed_minutes))}<span className="db-total-of"> min</span></span>
              <span className="db-total-cap">Elapsed</span>
            </div>
          )}
        </div>

        {/* THE HEADLINE — one, not eight. Selected by the report, printed as written. */}
        <p className="db-headline">{debrief.headline.statement}</p>
        {debrief.secondary.map((s, i) => (
          <p key={i} className="db-secondary">{s.statement}</p>
        ))}
      </header>

      {/* CASE GROUPING + PER-CASE SUBTOTALS. Eight requirements printed flat put three
          lines beginning "(i)" next to each other with nothing to tell them apart. */}
      {debrief.cases.map((c) => (
        <section key={c.case_id} className="db-case" aria-label={`${c.display_name}${c.title ? ` — ${c.title}` : ''}`}>
          <div className="db-case-head">
            <h2 className="db-case-title">
              <span className="db-case-q">{c.display_name}</span>
              {c.title && <span className="db-case-name">{c.title}</span>}
            </h2>
            <span className="db-case-sub">
              {c.technical_awarded ?? '—'}/{c.technical_available}
            </span>
          </div>
          <ul className="db-reqs">
            {c.requirements.map((r) => <DebriefRequirement key={r.requirement_id} line={r} paper={paper} />)}
          </ul>
        </section>
      ))}

      {/* PROFESSIONAL SKILLS — the PS marker's own words, verbatim. Bands only; the
          per-skill apportioned MARK is never surfaced (it is a largest-remainder artefact,
          not a score for that skill) and the endpoint does not return it. */}
      {debrief.professional.some((p) => p.skills.length > 0) && (
        <section className="db-ps" aria-label="Professional skills">
          <h2 className="db-ps-title">Professional skills</h2>
          {debrief.professional.filter((p) => p.skills.length > 0).map((p) => (
            <div key={p.case_id} className="db-ps-case">
              <div className="db-ps-case-head">
                <span className="db-ps-case-name">{p.title ?? 'Case'}</span>
                {p.available != null && (
                  <span className="db-case-sub">{p.awarded ?? '—'}/{p.available}</span>
                )}
              </div>
              <ul className="db-ps-list">
                {p.skills.map((s) => (
                  <li key={s.skill} className="db-ps-item">
                    <div className="db-req-head">
                      <span className="db-req-name">{s.skill.replace(/_/g, ' ')}</span>
                      <span className={`db-band db-band--${s.band}`}>{bandLabel(s.band)}</span>
                    </div>
                    {s.why && <p className="db-why-body">{s.why}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* THE FOOT OF THE PAPER — one action that follows the ledger rather than one
          requirement. This sit has just written a weakness row for every weak/competent LO, and
          /acca/progress is the surface that reads them, so "practise my weak areas" is the same
          steering the selector already applies, reached deliberately instead of incidentally. */}
      <section className="db-exit" aria-label="What next">
        <a className="db-exit-primary" href={progressHref}>Practise my weak areas →</a>
        <a className="db-exit-secondary" href={dashHref}>Back to dashboard</a>
      </section>

      {/* LIMITATIONS — what this debrief could NOT establish, stated rather than hidden. */}
      {debrief.limitations.length > 0 && (
        <section className="db-limits" aria-label="Limitations">
          <ul>{debrief.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </section>
      )}
    </main>
  );
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

/* ── Locked (entitlement) ──
   Laid out like .sit-intro, not like .sit-state: this is a screen with something to read and
   an action to take, not a one-line status. Deliberately NOT red — a lapsed subscription is
   not a fault, and colouring it as one is what made the old copy read as broken. */
.sit-locked {
  max-width: 560px; margin: 0 auto; min-height: 100vh;
  display: flex; flex-direction: column; justify-content: center;
  align-items: flex-start; gap: 18px;
  padding: 48px clamp(16px, 4vw, 32px);
}
.sit-locked-title {
  font-family: var(--font-display); font-size: clamp(24px, 4vw, 32px);
  font-weight: 700; letter-spacing: -0.4px; margin: 0; color: var(--text);
}
.sit-locked-copy { font-size: 15px; line-height: 1.6; color: var(--text); margin: 0; max-width: 46ch; }
.sit-locked-back { font-size: 14px; color: var(--text-muted); text-decoration: none; }
.sit-locked-back:hover { color: var(--text); }
.sit-locked-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: center; }

/* A text-weight action beside the primary CTA. The retry is secondary here — the thing that
   has to happen first is the subscription. */
.sit-linkbtn {
  background: none; border: none; padding: 0; cursor: pointer;
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  color: var(--brand); text-decoration: underline; text-underline-offset: 2px;
}

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
.sit-bar-clock {
  display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0;
  padding: 2px 10px; border-radius: 8px; border: 1px solid transparent;
}
.sit-bar-digits {
  font-family: var(--font-display); font-variant-numeric: tabular-nums;
  font-size: clamp(20px, 3vw, 26px); font-weight: 700; line-height: 1; color: var(--text);
}
.sit-bar-caption {
  font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-muted);
}
/* The final-15 state. Colour ALONE is never the signal — the caption changes text too, so
   the warning survives a colour-blind reader and a monochrome screen. */
.sit-bar-clock--warning { border-color: #c0392b; background: #fff5f4; }
.sit-bar-clock--warning .sit-bar-digits,
.sit-bar-clock--warning .sit-bar-caption { color: #c0392b; }
.sit-bar-clock--expired { border-color: #c0392b; background: #c0392b; }
.sit-bar-clock--expired .sit-bar-digits,
.sit-bar-clock--expired .sit-bar-caption { color: #fff; }

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
/* A lapse is not an error. Amber, not the red of .sit-err — the answer is safe and there is
   an action, and rendering it in the failure colour is what taught the student to read a
   solvable state as a broken one. */
.sit-lapse {
  font-size: 13px; line-height: 1.55; border-radius: 8px; padding: 10px 12px;
  background: #fff8e6; border: 1px solid #f0dca8; color: var(--text);
}
.sit-lapse-link { color: var(--brand); font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }

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
  min-height: 100vh; display: flex; flex-direction: column; gap: 14px;
  align-items: center; justify-content: center; padding: 48px 24px; text-align: center;
}
.sit-done-title {
  font-family: var(--font-display); font-size: clamp(24px, 4vw, 32px);
  font-weight: 700; color: var(--text); margin: 0; letter-spacing: -0.4px;
}
.sit-done-note { font-size: 15px; color: var(--text-muted); margin: 0; max-width: 44ch; line-height: 1.55; }

/* ── Debrief ── */
.db { max-width: 780px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px) 96px; }

/* Sticky so the exit stays reachable on a long debrief — the cul-de-sac was as much about
   having to scroll back to the top as about there being no link at all. */
.db-nav {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 0 calc(-1 * clamp(16px, 4vw, 32px)) clamp(20px, 4vw, 32px);
  padding: 12px clamp(16px, 4vw, 32px);
  background: var(--surface); border-bottom: 1px solid var(--border);
}
.db-nav-back {
  font-size: 14px; font-weight: 700; color: var(--text); text-decoration: none;
}
.db-nav-back:hover { color: var(--brand); }
.db-nav-right { display: flex; align-items: center; gap: 14px; }
.db-nav-paper {
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-muted);
}

.db-practise {
  align-self: flex-start; margin-top: 4px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 999px;
  border: 1.5px solid var(--brand); color: var(--brand); background: transparent;
  font-size: 13px; font-weight: 600; text-decoration: none; line-height: 1;
}
.db-practise:hover { background: var(--brand); color: #fff; }

.db-exit {
  margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
}
.db-exit-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: 999px;
  background: var(--brand); color: #fff; border: 1.5px solid var(--brand);
  font-size: 15px; font-weight: 600; text-decoration: none; line-height: 1;
}
.db-exit-secondary { font-size: 14px; color: var(--text-muted); text-decoration: none; }
.db-exit-secondary:hover { color: var(--text); }
.db-head { display: flex; flex-direction: column; gap: 18px; margin-bottom: 34px; }
.db-title {
  font-family: var(--font-display); font-size: clamp(24px, 4vw, 32px); font-weight: 700;
  letter-spacing: -0.5px; margin: 0; color: var(--text);
}
.db-note { font-size: 15px; color: var(--text-muted); margin: 0; }

.db-totals { display: flex; flex-wrap: wrap; gap: 10px; }
.db-total {
  display: flex; flex-direction: column; gap: 3px; flex: 1 1 140px;
  padding: 12px 16px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--border);
}
.db-total-num {
  font-family: var(--font-display); font-variant-numeric: tabular-nums;
  font-size: 26px; font-weight: 700; line-height: 1; color: var(--text);
}
.db-total-of { font-size: 15px; font-weight: 600; color: var(--text-muted); }
.db-total-cap {
  font-size: 10px; letter-spacing: 0.09em; text-transform: uppercase; color: var(--text-muted);
}

.db-headline {
  margin: 0; font-size: 16.5px; line-height: 1.6; font-weight: 600; color: var(--text);
  border-left: 3px solid var(--brand); padding-left: 14px;
}
.db-secondary {
  margin: 0; font-size: 14px; line-height: 1.6; color: var(--text-muted); padding-left: 17px;
}

.db-case { margin-bottom: 30px; }
.db-case-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
  padding-bottom: 8px; border-bottom: 1px solid var(--border); margin-bottom: 14px;
}
.db-case-title { display: flex; align-items: baseline; gap: 10px; margin: 0; min-width: 0; }
.db-case-q {
  font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text);
}
.db-case-name {
  font-size: 14px; color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.db-case-sub {
  font-variant-numeric: tabular-nums; font-size: 14px; font-weight: 700;
  color: var(--text); flex-shrink: 0;
}

.db-reqs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
.db-req {
  display: flex; flex-direction: column; gap: 7px;
  padding: 14px 16px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--border);
}
.db-req--not_reached { opacity: 0.9; border-style: dashed; }
.db-req-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.db-req-name { font-size: 15px; font-weight: 700; color: var(--text); }

.db-band {
  font-size: 10px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  padding: 3px 8px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-muted);
}
.db-band--exemplary, .db-band--strong { border-color: #2f855a; color: #2f855a; }
.db-band--competent { border-color: #b7791f; color: #b7791f; }
.db-band--weak, .db-band--nothing { border-color: #c0392b; color: #c0392b; }

.db-line { margin: 0; font-size: 14px; line-height: 1.6; color: var(--text); }
.db-line--pacing { color: var(--text-muted); }
.db-key {
  font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
  color: var(--text-muted); margin-right: 6px;
}

.db-why { margin-top: 2px; }
.db-why-label {
  margin: 0 0 2px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--text-muted);
}
.db-why-body { margin: 0; font-size: 14px; line-height: 1.65; color: var(--text); white-space: pre-wrap; }
.db-why--collapsed > summary {
  cursor: pointer; font-size: 12.5px; font-weight: 600; color: var(--text-muted);
  list-style: revert;
}
.db-why--collapsed[open] > summary { margin-bottom: 6px; }

.db-ps { margin-top: 40px; }
.db-ps-title {
  font-family: var(--font-display); font-size: 18px; font-weight: 700; color: var(--text);
  margin: 0 0 14px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
}
.db-ps-case { margin-bottom: 18px; }
.db-ps-case-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px;
}
.db-ps-case-name { font-size: 14px; font-weight: 700; color: var(--text); }
.db-ps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.db-ps-item {
  display: flex; flex-direction: column; gap: 5px;
  padding: 12px 14px; border-radius: 10px;
  background: var(--surface); border: 1px solid var(--border);
}
.db-ps-item .db-req-name { text-transform: capitalize; }

.db-limits {
  margin-top: 34px; padding-top: 14px; border-top: 1px solid var(--border);
}
.db-limits ul { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.db-limits li { font-size: 12.5px; line-height: 1.55; color: var(--text-muted); }

@media (max-width: 900px) {
  .sit-run { height: auto; min-height: 100vh; overflow: visible; }
  .sit-panes { grid-template-columns: 1fr; }
  .sit-scenario { border-right: none; border-bottom: 1px solid var(--border); overflow-y: visible; }
  .sit-answer { overflow-y: visible; }
  .sit-bar { position: sticky; top: 0; z-index: 20; }
}
`;
