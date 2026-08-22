'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { caseMarkReady } from '@/lib/acca/case-sit';
import MessageRenderer from '@/components/chat/MessageRenderer';
import type { ClientSessionState } from '@/app/api/acca/tutor/route';
import ACCASignOutButton from '@/components/acca/ACCASignOutButton';
import type { ServedPaper } from '@/lib/acca/paper';
import { paperHref } from '@/lib/acca/paper-url';
import { caseOpened } from '@/lib/acca/surface-events';
import { emitSurfaceEvent } from '@/lib/acca/surface-event-client';

// ── Types (client-safe subset of the case/turn + case load responses) ──────────
interface Exhibit { exhibit_order: number; title: string | null; body: string | null }
interface Requirement {
  id: string;
  requirement_order: number;
  label: string | null;
  question: string | null;
  marks_guide: number | null;
}
interface CaseHeader {
  id: string;
  title: string | null;
  scenario_intro: string | null;
  response_format: string | null;
  total_marks: number | null;
  professional_skills_marks: number | null;
}
interface Message { role: 'student' | 'ezra'; content: string; kind?: string }
interface ProgressRow { requirement_id: string; passed: boolean; resolved: boolean; miss_count: number }

// No per-skill MARK. The route deliberately stopped returning `mark_awarded`: it is a
// largest-remainder apportionment artefact, not a score for that skill (same band →
// different marks in one run; a skill's mark moves when a DIFFERENT skill's band moves).
// The band is the actual per-skill judgement; the case total carries the number.
interface PerSkillMark { skill: string; band: string; feedback: string }
interface Marking {
  professional_marks_awarded: number;
  professional_marks_available: number;
  per_skill: PerSkillMark[];
}

// message_kind → badge, same map the drill UI uses (quiet kinds render no badge)
const KIND_LABEL: Record<string, string> = {
  teaching: 'Teaching', hint: 'Hint', correct: 'Correct',
  reveal: 'Model answer', answer: 'Answer', coaching: 'Coaching',
};

// Humanise the stored professional_skill_tags for the marking panel
const SKILL_LABEL: Record<string, string> = {
  communication: 'Communication',
  analysis_and_evaluation: 'Analysis and evaluation',
  scepticism: 'Scepticism',
  commercial_acumen: 'Commercial acumen',
};
function humaniseSkill(s: string): string {
  return SKILL_LABEL[s] ?? s.replace(/_/g, ' ').replace(/\b\w/, (c) => c.toUpperCase());
}

function openingFor(req: Requirement): Message {
  const label = (req.label ?? `Requirement ${req.requirement_order}`).trim();
  return {
    role: 'ezra',
    content: `Now on **${label}**. Read the scenario and exhibits on the left, then write your full attempt to this requirement below — treat it as an exam answer. I'll read exactly what you wrote and diagnose from there.`,
  };
}

// Short marker for a requirement, e.g. "(iii)" from "(iii) Data governance",
// falling back to "Requirement N" when the label carries no leading parenthetical.
function shortMarker(req: Requirement): string {
  const label = (req.label ?? '').trim();
  const m = label.match(/^\(([^)]+)\)/);
  return m ? `(${m[1]})` : `Requirement ${req.requirement_order}`;
}

function joinMarkers(markers: string[]): string {
  if (markers.length <= 1) return markers[0] ?? '';
  if (markers.length === 2) return `${markers[0]} and ${markers[1]}`;
  return `${markers.slice(0, -1).join(', ')} and ${markers[markers.length - 1]}`;
}

// Opening line when resuming a partially-complete case — acknowledges the parts
// already done and points at the active requirement. Derived purely from progress;
// no chat history is restored.
function resumeOpening(passed: Requirement[], active: Requirement): Message {
  const done = joinMarkers(passed.map(shortMarker));
  const verb = passed.length === 1 ? 'is' : 'are';
  return {
    role: 'ezra',
    content: `Resuming — ${done} ${verb} done; you're on **${shortMarker(active)}**. Read the scenario and exhibits on the left, then write your full attempt to this requirement below.`,
  };
}

// Opening line when the whole case is already complete on load — marking renders below.
function completedOpening(): Message {
  return {
    role: 'ezra',
    content: `This case is complete — every requirement is done. Your professional-skills marking is below.`,
  };
}

// `embedded` reuses this component inside the timed-mock runner: it drops the page
// chrome (header/footer) so the mock's countdown header sits above it, and it
// suppresses inline professional-skills marking (the mock marks every case together
// on the results screen). `onComplete` fires once the whole case is complete
// (every requirement passed) so the mock can offer "Next case".
//
// THE `sitting` PROP IS GONE (2026-07-30). It was plumbed for a timed sit this component
// never ended up driving: SitRunner serves both papers now, and every remaining caller of
// CaseSession is PRACTICE. The prop carried the same value (false) at every call site, and
// a mode switch that nothing switches is a trap — it reads as though a sit could arrive
// here and be handled correctly, which was never true. Sit mode lives in SitRunner +
// /api/acca/sit, and this component is unambiguously the teach surface again.
//
// `paper` IS A PROP, resolved server-side from the case's OWN row (page.tsx). It was three
// hardcoded 'APM' literals — the load fetch, every turn body, and the mark body — plus a
// breadcrumb that said so. This surface is no longer APM-only: the five published AFM
// practice cases reach it through the same list. The paper is NOT re-derived here and must
// not be: a client-side second opinion about which paper a case is would be a second source
// of truth for a fact the row owns.
export default function CaseSession({
  caseId,
  paper,
  embedded = false,
  onComplete,
}: {
  caseId: string;
  paper: ServedPaper;
  embedded?: boolean;
  onComplete?: () => void;
}) {
  const router = useRouter();
  // Same-surface links, carrying the paper (lib/acca/paper-url.ts). APM stays byte-identical.
  const casesHref     = paperHref('/acca/cases', paper);
  const subscribeHref = paperHref('/acca/subscribe', paper);

  // ── Case load ──
  const [header, setHeader]             = useState<CaseHeader | null>(null);
  const [exhibits, setExhibits]         = useState<Exhibit[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loadError, setLoadError]       = useState(false);
  const [accessLocked, setAccessLocked] = useState(false);
  const [lockedTitle, setLockedTitle]   = useState<string | null>(null);
  const [loaded, setLoaded]             = useState(false);

  // ── Per-requirement session (all keyed by requirement id) ──
  const [activeReqId, setActiveReqId]   = useState<string | null>(null);
  const [messagesByReq, setMessagesByReq] = useState<Record<string, Message[]>>({});
  const [sessionByReq, setSessionByReq]   = useState<Record<string, ClientSessionState | null>>({});
  const [passedByReq, setPassedByReq]     = useState<Record<string, boolean>>({});

  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  // Set when a turn/mark comes back 402 mid-session (subscription lapsed) — shows
  // the same upsell message inline in chat rather than a generic error.
  const [sessionLapsed, setSessionLapsed] = useState(false);
  const [exhibitsOpen, setExhibitsOpen] = useState(true);
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // ── Marking ──
  const [marking, setMarking]                 = useState<Marking | null>(null);
  const [markingLoading, setMarkingLoading]   = useState(false);
  const [markingError, setMarkingError]       = useState(false);
  const [markingIncomplete, setMarkingIncomplete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Which case id this mount has already reported opening. Keyed on the id, not a boolean,
  // for the same reason CaseList keys on the paper: the effect re-runs when `caseId` changes.
  const openReported = useRef<string | null>(null);

  // ── Initial case load ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/acca/case?case_id=${encodeURIComponent(caseId)}&paper=${paper}`);
        // 404 = flag off OR case not servable → nothing useful to show.
        if (res.status === 404) {
          router.replace(paperHref('/acca', paper));
          return;
        }
        // 402 = no active subscription for THIS paper → focused upsell, not an error. The
        // route returns the (public) case title so the upsell can name the case.
        if (res.status === 402) {
          let title: string | null = null;
          try { title = ((await res.json()) as { title?: string | null }).title ?? null; } catch { /* no title */ }
          if (!cancelled) { setLockedTitle(title); setAccessLocked(true); setLoaded(true); }
          return;
        }
        if (!res.ok) {
          if (!cancelled) { setLoadError(true); setLoaded(true); }
          return;
        }
        const json = await res.json();
        if (cancelled) return;
        const reqs = ((json.requirements ?? []) as Requirement[])
          .slice()
          .sort((a, b) => a.requirement_order - b.requirement_order);

        // Resume state from persisted progress: which requirements are already passed.
        const progressRows = (json.progress ?? []) as ProgressRow[];
        const passedMap: Record<string, boolean> = {};
        for (const p of progressRows) if (p.passed) passedMap[p.requirement_id] = true;

        setHeader(json.case as CaseHeader);
        setExhibits((json.exhibits ?? []) as Exhibit[]);
        setRequirements(reqs);
        setPassedByReq(passedMap);

        if (reqs.length > 0) {
          const passedReqs    = reqs.filter((r) => passedMap[r.id]);
          const firstNotPassed = reqs.find((r) => !passedMap[r.id]) ?? null;
          // Active = first not-yet-passed requirement; if all passed, park on the
          // last one (the completion effect auto-runs marking either way).
          const active = firstNotPassed ?? reqs[reqs.length - 1];
          const opening =
            !firstNotPassed
              ? completedOpening()                          // whole case already done
              : passedReqs.length > 0
              ? resumeOpening(passedReqs, firstNotPassed)   // partial resume
              : openingFor(active);                         // fresh start
          setActiveReqId(active.id);
          setMessagesByReq({ [active.id]: [opening] });
        }
        setLoaded(true);
        // ── case_opened — THE SUCCESS PATH ONLY ───────────────────────────────
        // Reached only once the case itself is served, so the row means "this case was in
        // front of them". The three earlier arms are deliberately silent and each for its own
        // reason: 404 is a redirect to /acca (nothing was opened), !ok is an error page, and
        // 402 shows a SUBSCRIBE UPSELL rather than a case — that one is a real funnel moment
        // but it is `case_locked_upsell_shown`, which was explicitly not built, and quietly
        // folding it in here would make this row mean two different things.
        //
        // CLIENT-SIDE, not from the server component that renders this one, and that is a
        // decision rather than convenience: a Next <Link> prefetch renders the RSC payload on
        // hover, so a server-side emit would report a case as opened by a student who only
        // moved their mouse past it. An overcount is the one error a bounce metric cannot
        // absorb.
        //
        // Skipped when `embedded` — no caller passes it today (MockRunner is deleted, and this
        // component is unambiguously the practice surface again), but if the embedded path is
        // ever revived its views belong to the mock surface, not to this one.
        if (!embedded && openReported.current !== caseId) {
          openReported.current = caseId;
          emitSurfaceEvent(caseOpened(caseId, paper));
        }
      } catch {
        if (!cancelled) { setLoadError(true); setLoaded(true); }
      }
    })();
    return () => { cancelled = true; };
  }, [caseId, paper, router, embedded]);

  const activeReq = useMemo(
    () => requirements.find((r) => r.id === activeReqId) ?? null,
    [requirements, activeReqId],
  );
  const activeIndex = useMemo(
    () => requirements.findIndex((r) => r.id === activeReqId),
    [requirements, activeReqId],
  );
  const nextReq = activeIndex >= 0 && activeIndex < requirements.length - 1
    ? requirements[activeIndex + 1]
    : null;

  const messages = useMemo(
    () => (activeReqId ? messagesByReq[activeReqId] ?? [] : []),
    [activeReqId, messagesByReq],
  );
  const passedCount = requirements.filter((r) => passedByReq[r.id]).length;
  // COMPLETION IS THE SHARED PURE PREDICATE, not a local count (2026-07-30).
  // `caseMarkReady` is what app/api/acca/case/mark uses to decide whether it will mark at
  // all, so computing readiness any other way here is how the client and the server drift
  // into disagreeing — the client offering to mark a case the server then 409s, or (the
  // shape that actually bit) a predicate that can never fire and silently skips marking.
  // This surface is always practice, so `sitting` is false and the rule is "every
  // requirement judged correct"; `final_answer` is not consulted on that branch.
  const allPassed = caseMarkReady(
    false,
    requirements.map((r) => ({ final_answer: null, passed: passedByReq[r.id] === true })),
  ).ready;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  // Case-complete handling. Embedded (mock) mode notifies the parent and does NOT
  // run inline marking — the mock marks all cases together on its results screen.
  // Standalone mode auto-runs the professional-skills marking pass inline.
  useEffect(() => {
    if (!allPassed) return;
    if (embedded) { onComplete?.(); return; }
    if (!marking && !markingLoading && !markingIncomplete) {
      void runMarking();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPassed]);

  function switchRequirement(reqId: string) {
    setActiveReqId(reqId);
    setInput('');
    setTurnError(null);
    setMobileExpanded(false);
    setMessagesByReq((prev) => {
      if (prev[reqId]) return prev;
      const req = requirements.find((r) => r.id === reqId);
      return req ? { ...prev, [reqId]: [openingFor(req)] } : prev;
    });
  }

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !activeReqId) return;

    const current = messagesByReq[activeReqId] ?? [];
    const lastEzra = [...current].reverse().find((m) => m.role === 'ezra')?.content ?? '';

    setMessagesByReq((prev) => ({
      ...prev,
      [activeReqId]: [...(prev[activeReqId] ?? []), { role: 'student', content: trimmed }],
    }));
    setInput('');
    setSending(true);
    setTurnError(null);

    try {
      const res = await fetch('/api/acca/case/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_id:           caseId,
          requirement_id:    activeReqId,
          session_state:     sessionByReq[activeReqId] ?? null,   // null on first turn of each requirement
          student_message:   trimmed,
          last_ezra_message: lastEzra,
          // PER-PAPER ENTITLEMENT (2026-08-03): the gate requires an explicit paper and
          // refuses rather than defaulting. THE PROP, not a literal — this is the line whose
          // own comment said it had to become one when the surface stopped being APM-only.
          // It has: the case's paper comes from its row, so the gate is asked about the
          // paper the student is actually working, not the one this file was written for.
          paper,
        }),
      });
      // 402 = subscription lapsed mid-session → roll the optimistic bubble back and
      // surface the upsell inline (same message as the load-time gate).
      if (res.status === 402) {
        setSessionLapsed(true);
        setMessagesByReq((prev) => ({
          ...prev,
          [activeReqId]: (prev[activeReqId] ?? []).slice(0, -1),
        }));
        setInput(trimmed);
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong');

      setSessionByReq((prev) => ({ ...prev, [activeReqId]: json.session_state }));
      setMessagesByReq((prev) => ({
        ...prev,
        [activeReqId]: [...(prev[activeReqId] ?? []), { role: 'ezra', content: json.ezra_response, kind: json.message_kind }],
      }));
      if (json.requirement_passed) {
        setPassedByReq((prev) => ({ ...prev, [activeReqId]: true }));
      }
    } catch (err) {
      setTurnError(err instanceof Error ? err.message : 'Failed to reach Ezra — please try again.');
      // roll the optimistic student bubble back so they can re-send
      setMessagesByReq((prev) => ({
        ...prev,
        [activeReqId]: (prev[activeReqId] ?? []).slice(0, -1),
      }));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  };

  async function runMarking() {
    setMarkingLoading(true);
    setMarkingError(false);
    setMarkingIncomplete(false);
    try {
      // PRACTICE marking. `sitting` is OMITTED deliberately, not forgotten: this surface
      // is only ever practice now, and the mark route's default (false) is the correct
      // mode for it. A sit is marked from the sit flow, which sends sitting:true itself —
      // and must, because on the default the route skips the TECHNICAL pass entirely.
      const res = await fetch('/api/acca/case/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, paper }),
      });
      if (res.status === 402) { setSessionLapsed(true); return; }
      if (res.status === 409) { setMarkingIncomplete(true); return; }
      if (!res.ok) { setMarkingError(true); return; }
      setMarking((await res.json()) as Marking);
    } catch {
      setMarkingError(true);
    } finally {
      setMarkingLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activePassed = activeReqId ? !!passedByReq[activeReqId] : false;
  const hasAttempt = messages.some((m) => m.role === 'student');

  // ── Render: loading / error / empty guards ──
  if (!loaded) {
    return (
      <div className="ec-fullmsg">
        <style>{CSS}</style>
        <p>Loading case…</p>
      </div>
    );
  }
  // Subscription gate (case load returned 402) — focused upsell, not an error.
  if (accessLocked) {
    return (
      <div className="ec-fullmsg">
        <style>{CSS}</style>
        <div className="ec-upsell">
          <span className="ec-upsell-lock" aria-hidden="true">🔒</span>
          <h1 className="ec-upsell-title">{lockedTitle ?? header?.title ?? 'Exam case'}</h1>
          <p className="ec-upsell-copy">Exam cases are part of the {paper} subscription.</p>
          <Link href={subscribeHref} className="ec-btn ec-btn--rust">Subscribe to unlock <span className="ec-arrow">→</span></Link>
          <Link href={casesHref} className="ec-upsell-back">← Back to cases</Link>
        </div>
      </div>
    );
  }
  if (loadError || !header) {
    return (
      <div className="ec-fullmsg">
        <style>{CSS}</style>
        <p>This case isn&apos;t available right now — <Link href={casesHref}>back to cases</Link>.</p>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className={`ec${embedded ? ' ec--embedded' : ''}`}>

        {/* ── Header (own chrome — suppressed when embedded in the mock runner) ── */}
        {!embedded && (
          <header className="ec-header">
            <div className="ec-wrap ec-header-inner">
              <Link href={casesHref} className="ec-logo" aria-label="Back to cases">
                <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
              </Link>
              <div className="ec-header-right">
                <div className="ec-breadcrumb">
                  <span className="ec-breadcrumb-paper">ACCA {paper}</span>
                  <span className="ec-breadcrumb-sep">·</span>
                  <span className="ec-breadcrumb-label">Exam case</span>
                </div>
                <ACCASignOutButton />
              </div>
            </div>
          </header>
        )}

        {/* Mobile bar — tap to reveal scenario / exhibits / stepper */}
        <div
          className="ec-mobile-bar"
          onClick={() => setMobileExpanded((v) => !v)}
          role="button"
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? 'Collapse case detail' : 'View scenario and requirements'}
        >
          <span className="ec-mobile-bar-title">{header.title ?? 'Exam case'}</span>
          <span className="ec-mobile-bar-cta">{mobileExpanded ? 'hide ▴' : 'scenario ▾'}</span>
        </div>

        <div className="ec-layout">

          {/* LEFT: scenario + exhibits + requirement stepper */}
          <aside className={`ec-sidebar${mobileExpanded ? ' ec-sidebar--open' : ''}`}>
            <div className="ec-sidebar-inner">

              <div className="ec-case-meta">
                <h1 className="ec-case-title">{header.title ?? 'Exam case'}</h1>
                {header.response_format && (
                  <span className="ec-case-format">Respond as: {header.response_format}</span>
                )}
              </div>

              {header.scenario_intro && (
                <div className="ec-panel ec-panel--scenario">
                  <div className="ec-panel-label">Scenario</div>
                  <p className="ec-scenario-text">{header.scenario_intro}</p>
                </div>
              )}

              {exhibits.length > 0 && (
                <div className="ec-exhibits">
                  <button
                    className="ec-exhibits-hd"
                    onClick={() => setExhibitsOpen((v) => !v)}
                    aria-expanded={exhibitsOpen}
                  >
                    <span className={`ec-chevron${exhibitsOpen ? ' open' : ''}`}>▶</span>
                    Exhibits
                    <span className="ec-exhibits-count">{exhibits.length}</span>
                  </button>
                  {exhibitsOpen && (
                    <div className="ec-exhibits-list">
                      {exhibits.map((ex, i) => (
                        <details key={i} className="ec-exhibit" open>
                          <summary className="ec-exhibit-title">{ex.title ?? `Exhibit ${i + 1}`}</summary>
                          <p className="ec-exhibit-body">{ex.body ?? ''}</p>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Requirement stepper */}
              <div className="ec-stepper">
                <div className="ec-panel-label">Requirements</div>
                {requirements.map((r) => {
                  const isActive = r.id === activeReqId;
                  const done = !!passedByReq[r.id];
                  return (
                    <button
                      key={r.id}
                      className={`ec-step${isActive ? ' active' : ''}${done ? ' done' : ''}`}
                      onClick={() => switchRequirement(r.id)}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <span className="ec-step-marker" aria-hidden="true">{done ? '✓' : r.requirement_order}</span>
                      <span className="ec-step-label">{r.label ?? `Requirement ${r.requirement_order}`}</span>
                      {r.marks_guide != null && <span className="ec-step-marks">{r.marks_guide}</span>}
                    </button>
                  );
                })}
              </div>

            </div>
          </aside>

          {/* RIGHT: active requirement question + chat + marking */}
          <main className="ec-chat-panel">

            {activeReq && (
              <div className="ec-req-header">
                <div className="ec-req-header-top">
                  <span className="ec-req-tag">{activeReq.label ?? `Requirement ${activeReq.requirement_order}`}</span>
                  {activePassed && <span className="ec-req-passed">✓ Passed</span>}
                </div>
                {activeReq.question && <p className="ec-req-question">{activeReq.question}</p>}
              </div>
            )}

            <div className="ec-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`ec-msg ec-msg--${msg.role}`}>
                  {msg.role === 'ezra' && <div className="ec-msg-avatar" aria-hidden="true">E</div>}
                  <div className="ec-msg-body">
                    <div className="ec-msg-sender">
                      {msg.role === 'ezra' ? 'Ezra' : 'You'}
                      {msg.role === 'ezra' && msg.kind && KIND_LABEL[msg.kind] && (
                        <span className={`ec-msg-badge ec-msg-badge--${msg.kind}`}>{KIND_LABEL[msg.kind]}</span>
                      )}
                    </div>
                    {msg.role === 'ezra' ? (
                      <div className="ec-msg-content ec-msg-content--ezra">
                        <MessageRenderer content={msg.content} />
                      </div>
                    ) : (
                      <div className="ec-msg-content ec-msg-content--student">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="ec-msg ec-msg--ezra">
                  <div className="ec-msg-avatar" aria-hidden="true">E</div>
                  <div className="ec-msg-body">
                    <div className="ec-msg-sender">Ezra</div>
                    <div className="ec-thinking"><span /><span /><span /></div>
                  </div>
                </div>
              )}

              {turnError && <div className="ec-error" role="alert">{turnError}</div>}

              {/* Subscription lapsed mid-session — same upsell message, inline */}
              {sessionLapsed && (
                <div className="ec-lapse" role="alert">
                  Exam cases are part of the {paper} subscription.{' '}
                  <Link href={subscribeHref} className="ec-lapse-link">Subscribe to continue →</Link>
                </div>
              )}

              {/* Advance controls — after a pass, or manual move-on */}
              {!sending && activePassed && nextReq && (
                <div className="ec-advance">
                  <p className="ec-advance-title">Requirement complete.</p>
                  <button className="ec-btn ec-btn--rust" onClick={() => switchRequirement(nextReq.id)}>
                    Next requirement <span className="ec-arrow">→</span>
                  </button>
                </div>
              )}
              {!sending && !activePassed && nextReq && hasAttempt && (
                <button className="ec-btn ec-btn--ghost ec-moveon" onClick={() => switchRequirement(nextReq.id)}>
                  Move on without finishing <span className="ec-arrow">→</span>
                </button>
              )}

              {/* Case-complete banner — in the mock, marking is deferred to the
                  results screen; the runner offers "Next case" in its own chrome. */}
              {allPassed && embedded && !nextReq && (
                <div className="ec-advance">
                  <p className="ec-advance-title">Case complete — move on to the next case above.</p>
                </div>
              )}

              {/* Marking panel — shown once the whole case is complete (standalone only) */}
              {allPassed && !embedded && (
                <div className="ec-marking">
                  {markingLoading ? (
                    <div className="ec-marking-state">Marking your whole answer against the professional-skills descriptors…</div>
                  ) : markingIncomplete ? (
                    <div className="ec-marking-state">Complete all requirements to receive professional-skills marking.</div>
                  ) : markingError ? (
                    <div className="ec-marking-state ec-marking-state--error">
                      Couldn&apos;t mark right now.
                      <button className="ec-btn ec-btn--ghost ec-retry" onClick={() => void runMarking()}>Try again</button>
                    </div>
                  ) : marking ? (
                    <>
                      <div className="ec-marking-head">
                        <span className="ec-marking-label">Professional skills</span>
                        <span className="ec-marking-score">
                          {marking.professional_marks_awarded}
                          <span className="ec-marking-score-of">/{marking.professional_marks_available}</span>
                        </span>
                      </div>
                      <div className="ec-skill-grid">
                        {marking.per_skill.map((s, i) => (
                          <div key={i} className="ec-skill-card">
                            <div className="ec-skill-top">
                              <span className="ec-skill-name">{humaniseSkill(s.skill)}</span>
                              <span className="ec-skill-band">{s.band}</span>
                            </div>
                            <p className="ec-skill-feedback">{s.feedback}</p>
                          </div>
                        ))}
                      </div>
                      <Link href={casesHref} className="ec-marking-done">← Back to cases</Link>
                    </>
                  ) : null}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input — hidden once the case is fully marked-complete */}
            {!(allPassed && marking) && (
              <div className="ec-input-area">
                <div className="ec-input-wrap">
                  <textarea
                    className="ec-textarea"
                    placeholder={
                      activePassed
                        ? 'Ask Ezra a follow-up, or move to the next requirement…'
                        : !hasAttempt
                        ? 'Write your full attempt to this requirement here…'
                        : 'Continue…'
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={5}
                    disabled={sending}
                    aria-label="Your message to Ezra"
                  />
                  <div className="ec-input-footer">
                    <span className="ec-input-hint">⌘↵ to send</span>
                    <button className="ec-btn ec-btn--rust" onClick={sendMessage} disabled={!input.trim() || sending}>
                      {sending ? 'Thinking…' : <>{!hasAttempt ? 'Submit attempt' : 'Send'} <span className="ec-arrow">→</span></>}
                    </button>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {!embedded && (
          <footer className="ec-footer">
            <div className="ec-wrap ec-footer-inner">
              <span className="ec-footer-copy">© 2026 Gradd.ai · Not affiliated with ACCA</span>
              <div className="ec-footer-links">
                <Link href="/terms">Terms</Link>
                <Link href="/privacy">Privacy</Link>
              </div>
            </div>
          </footer>
        )}

      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .ec (ezra case). Mirrors the tutor's .et layout language (height:100vh,
// independent-scroll columns, --brand/--surface tokens, Georgia display) plus the
// case-specific stepper, exhibits and marking panel.
const CSS = `
.ec {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
  --chat-text: var(--text);
  --chat-border: var(--border);
  --chat-accent: var(--brand);
  --chat-muted: var(--text-muted);
  --chat-surface-2: var(--surface-2);
  --chat-thead-bg: var(--surface-2);
  --chat-strong: var(--brand);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
.ec *, .ec *::before, .ec *::after { box-sizing: border-box; }

/* Embedded in the mock runner: fill the space the runner allots (below its
   countdown header) rather than owning the whole viewport. */
.ec--embedded { height: 100%; min-height: 0; }

.ec-fullmsg {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 24px;
  font-family: var(--font-display);
  font-size: 17px;
  color: var(--text-muted);
  text-align: center;
}
.ec-fullmsg a { color: var(--rust); }

.ec-upsell {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  max-width: 420px; text-align: center;
}
.ec-upsell-lock { font-size: 30px; }
.ec-upsell-title {
  font-family: var(--font-display); font-size: clamp(20px, 2.4vw, 26px);
  font-weight: 700; letter-spacing: -0.3px; line-height: 1.15; color: var(--text); margin: 0;
}
.ec-upsell-copy { font-size: 15px; line-height: 1.55; color: var(--text-muted); margin: 0; }
.ec-upsell .ec-btn { margin-top: 4px; text-decoration: none; }
.ec-upsell-back { font-size: 13px; font-weight: 500; color: var(--text-muted); text-decoration: none; }
.ec-upsell-back:hover { color: var(--text); }

.ec-lapse {
  background: rgba(192,94,60,0.08); border: 1px solid rgba(192,94,60,0.25);
  color: var(--text); border-radius: 10px; padding: 12px 16px; font-size: 13px; line-height: 1.5;
}
.ec-lapse-link { color: var(--rust); font-weight: 600; text-decoration: none; white-space: nowrap; }
.ec-lapse-link:hover { text-decoration: underline; }

.ec-wrap { max-width: 1200px; margin: 0 auto; padding: 0 clamp(16px, 3vw, 32px); }

.ec-header {
  position: sticky; top: 0; z-index: 50;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}
.ec-header-inner { display: flex; align-items: center; justify-content: space-between; height: 56px; }
.ec-logo { display: flex; align-items: center; text-decoration: none; }
.ec-header-right { display: flex; align-items: center; gap: 14px; }
.ec-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted); }
.ec-breadcrumb-paper { font-weight: 600; color: var(--text); }
.ec-breadcrumb-sep { color: var(--border); }
.ec-breadcrumb-label {
  background: rgba(192,94,60,0.1); color: var(--rust);
  padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 11px;
  letter-spacing: 0.04em; text-transform: uppercase;
}

.ec-layout {
  flex: 1; min-height: 0; display: grid;
  grid-template-columns: 400px 1fr;
  overflow: hidden; max-width: 1200px; margin: 0 auto; width: 100%;
  padding: 0 clamp(16px, 3vw, 32px);
}

.ec-sidebar {
  border-right: 1px solid var(--border-light);
  overflow-y: auto; min-height: 0; padding: 24px 24px 24px 0;
}
.ec-sidebar-inner { display: flex; flex-direction: column; gap: 16px; }

.ec-case-meta { display: flex; flex-direction: column; gap: 6px; }
.ec-case-title {
  font-family: var(--font-display);
  font-size: clamp(20px, 2.4vw, 26px);
  font-weight: 700; letter-spacing: -0.3px; line-height: 1.15;
  color: var(--text); margin: 0;
}
.ec-case-format { font-size: 12px; color: var(--text-muted); font-style: italic; }

.ec-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; }
.ec-panel-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--text-muted); margin-bottom: 10px;
}
.ec-panel--scenario { background: var(--surface-2); border-color: var(--border-light); }
.ec-scenario-text { font-size: 13px; line-height: 1.65; color: var(--text); white-space: pre-wrap; margin: 0; }

.ec-exhibits { display: flex; flex-direction: column; gap: 6px; }
.ec-exhibits-hd {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 8px 4px; background: none; border: none; cursor: pointer;
  font-family: var(--font-body); font-size: 11px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); text-align: left;
}
.ec-chevron { font-size: 8px; transition: transform 0.15s ease; display: inline-block; }
.ec-chevron.open { transform: rotate(90deg); }
.ec-exhibits-count {
  font-size: 10px; color: var(--text-muted); background: var(--surface-2);
  border: 1px solid var(--border-light); padding: 1px 7px; border-radius: 10px; font-weight: 600;
}
.ec-exhibits-list { display: flex; flex-direction: column; gap: 8px; }
.ec-exhibit { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px; }
.ec-exhibit-title {
  font-size: 12px; font-weight: 700; color: var(--text); cursor: pointer;
  list-style: none; letter-spacing: 0.01em;
}
.ec-exhibit-title::-webkit-details-marker { display: none; }
.ec-exhibit-body { font-size: 12.5px; line-height: 1.6; color: var(--text); white-space: pre-wrap; margin: 10px 0 0; }

.ec-stepper { display: flex; flex-direction: column; gap: 4px; }
.ec-step {
  display: flex; align-items: center; gap: 10px; width: 100%;
  padding: 10px 12px; border-radius: 8px; background: transparent;
  border: 1px solid transparent; cursor: pointer; text-align: left;
  font-family: var(--font-body); font-size: 13px; color: var(--text); transition: background 0.12s, border-color 0.12s;
}
.ec-step:hover { background: var(--surface-2); }
.ec-step.active { background: rgba(192,94,60,0.07); border-color: rgba(192,94,60,0.25); }
.ec-step-marker {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  display: grid; place-items: center; font-size: 11px; font-weight: 700;
  background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border-light);
}
.ec-step.active .ec-step-marker { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.ec-step.done .ec-step-marker { background: rgba(34,160,90,0.15); color: #1c8b4e; border-color: rgba(34,160,90,0.3); }
.ec-step-label { flex: 1; min-width: 0; }
.ec-step-marks {
  font-size: 11px; color: var(--text-muted); background: var(--surface-2);
  border: 1px solid var(--border-light); padding: 1px 7px; border-radius: 10px; font-weight: 600; flex-shrink: 0;
}

.ec-chat-panel { display: flex; flex-direction: column; overflow: hidden; min-height: 0; padding-left: 24px; }

.ec-req-header {
  flex-shrink: 0; padding: 22px 24px 16px; border-bottom: 1px solid var(--border-light);
}
.ec-req-header-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ec-req-tag {
  font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--rust); background: rgba(192,94,60,0.1); border: 1px solid rgba(192,94,60,0.2);
  padding: 3px 9px; border-radius: 4px;
}
.ec-req-passed { font-size: 12px; font-weight: 600; color: #1c8b4e; }
.ec-req-question {
  font-family: var(--font-display); font-size: clamp(15px, 1.7vw, 18px);
  font-weight: 700; line-height: 1.35; color: var(--text); letter-spacing: -0.2px; margin: 0;
}

.ec-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px; }

.ec-msg { display: flex; align-items: flex-start; gap: 12px; max-width: 680px; }
.ec-msg--student { flex-direction: row-reverse; align-self: flex-end; }
.ec-msg-avatar {
  width: 32px; height: 32px; border-radius: 50%; background: var(--brand);
  color: oklch(94% 0.02 80); font-family: var(--font-display); font-weight: 700; font-size: 14px;
  display: grid; place-items: center; flex-shrink: 0; margin-top: 2px;
}
.ec-msg-body { display: flex; flex-direction: column; gap: 4px; }
.ec-msg-sender { font-size: 11px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); }
.ec-msg--student .ec-msg-sender { text-align: right; }
.ec-msg-badge {
  display: inline-block; margin-left: 8px; padding: 1px 7px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em; vertical-align: 1px;
  background: var(--surface-2); color: var(--text-muted); border: 1px solid var(--border);
}
.ec-msg-badge--teaching, .ec-msg-badge--reveal { background: var(--brand); color: #fff; border-color: transparent; }
.ec-msg-badge--correct { background: rgba(34,160,90,0.12); color: #1c8b4e; border-color: rgba(34,160,90,0.25); }
.ec-msg-content { border-radius: 12px; font-size: 14px; line-height: 1.65; }
.ec-msg-content--student {
  background: var(--surface-2); border: 1px solid var(--border-light);
  padding: 14px 18px; color: var(--text); white-space: pre-wrap;
}
.ec-msg-content--ezra { background: var(--surface); border: 1px solid var(--border); padding: 16px 20px; color: var(--text); }

.ec-thinking { display: flex; gap: 5px; align-items: center; padding: 14px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; }
.ec-thinking span { width: 7px; height: 7px; border-radius: 50%; background: var(--text-muted); animation: ec-dot 1.2s infinite ease-in-out; }
.ec-thinking span:nth-child(2) { animation-delay: 0.2s; }
.ec-thinking span:nth-child(3) { animation-delay: 0.4s; }
@keyframes ec-dot { 0%,80%,100% { transform: scale(0.7); opacity: 0.4; } 40% { transform: scale(1); opacity: 1; } }

.ec-error { background: #fff0f0; border: 1px solid #f5c6c6; color: #c0392b; border-radius: 10px; padding: 12px 16px; font-size: 13px; }

.ec-advance { display: flex; flex-direction: column; gap: 10px; max-width: 480px; }
.ec-advance-title { font-family: var(--font-display); font-size: 15px; font-weight: 700; color: var(--text); margin: 0; }
.ec-moveon { align-self: flex-start; }

/* ── Marking panel ── */
.ec-marking {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 22px 24px; display: flex; flex-direction: column; gap: 16px; max-width: 640px;
}
.ec-marking-state { font-size: 14px; color: var(--text-muted); display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.ec-marking-state--error { color: #c0392b; }
.ec-marking-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.ec-marking-label { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); }
.ec-marking-score { font-family: var(--font-display); font-size: 32px; font-weight: 700; color: var(--brand); line-height: 1; }
.ec-marking-score-of { font-size: 18px; color: var(--text-muted); font-weight: 400; }
.ec-skill-grid { display: flex; flex-direction: column; gap: 12px; }
.ec-skill-card { background: var(--surface-2); border: 1px solid var(--border-light); border-radius: 10px; padding: 14px 16px; }
.ec-skill-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.ec-skill-name { font-size: 13px; font-weight: 700; color: var(--text); }
/* The band is a WORD, not a digit — so no fixed min-width/centring (which was sized for
   a single numeral) and no display face. Reads as a qualitative chip, which is what it is. */
.ec-skill-band {
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--rust); background: rgba(192,94,60,0.1); border: 1px solid rgba(192,94,60,0.2);
  padding: 3px 9px; border-radius: 6px; white-space: nowrap;
}
.ec-skill-feedback { font-size: 13px; line-height: 1.55; color: var(--text); margin: 0; }
.ec-marking-done { font-size: 13px; font-weight: 600; color: var(--text-muted); text-decoration: none; width: fit-content; }
.ec-marking-done:hover { color: var(--text); }

/* ── Input ── */
.ec-input-area { border-top: 1px solid var(--border-light); padding: 16px 24px 20px; flex-shrink: 0; }
.ec-input-wrap { display: flex; flex-direction: column; gap: 10px; }
.ec-textarea {
  width: 100%; padding: 14px 16px; font-family: var(--font-body); font-size: 14px; line-height: 1.6;
  color: var(--text); background: var(--surface); border: 1.5px solid var(--border);
  border-radius: 12px; resize: vertical; outline: none; transition: border-color 0.15s;
}
.ec-textarea:focus { border-color: var(--brand); }
.ec-textarea::placeholder { color: var(--text-light, var(--text-muted)); opacity: 0.7; }
.ec-textarea:disabled { opacity: 0.6; }
.ec-input-footer { display: flex; align-items: center; justify-content: space-between; }
.ec-input-hint { font-size: 11px; color: var(--text-muted); }

/* ── Buttons ── */
.ec-btn {
  display: inline-flex; align-items: center; gap: 8px; padding: 11px 22px; border-radius: 999px;
  font-family: var(--font-body); font-size: 14px; font-weight: 600; border: 1.5px solid transparent;
  cursor: pointer; transition: all 0.15s ease; white-space: nowrap; line-height: 1;
}
.ec-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.ec-btn:not(:disabled):hover { transform: translateY(-1px); }
.ec-arrow { transition: transform 0.15s ease; }
.ec-btn:not(:disabled):hover .ec-arrow { transform: translateX(3px); }
.ec-btn--rust { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.ec-btn--rust:not(:disabled):hover { background: var(--rust-dark); border-color: var(--rust-dark); }
.ec-btn--ghost { background: transparent; color: var(--text-muted); border-color: var(--border); }
.ec-btn--ghost:not(:disabled):hover { background: var(--surface-2); color: var(--text); }
.ec-retry { padding: 6px 14px; font-size: 13px; }

/* ── Footer ── */
.ec-footer { border-top: 1px solid var(--border-light); padding: 14px 0; flex-shrink: 0; }
.ec-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.ec-footer-copy { font-size: 11px; color: var(--text-muted); }
.ec-footer-links { display: flex; gap: 18px; }
.ec-footer-links a { font-size: 11px; color: var(--text-muted); text-decoration: none; transition: color 0.15s; }
.ec-footer-links a:hover { color: var(--text); }

/* ── Mobile ── */
.ec-mobile-bar { display: none; }

@media (max-width: 820px) {
  .ec-mobile-bar {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
    padding: 10px clamp(16px, 4vw, 24px); background: var(--surface);
    border-bottom: 1px solid var(--border); cursor: pointer; flex-shrink: 0;
    user-select: none; -webkit-tap-highlight-color: transparent; min-height: 44px;
  }
  .ec-mobile-bar:active { background: var(--surface-2); }
  .ec-mobile-bar-title {
    font-size: 13px; font-weight: 700; color: var(--text);
    flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ec-mobile-bar-cta { font-size: 11px; font-weight: 600; color: var(--brand); flex-shrink: 0; }

  .ec-layout { grid-template-columns: 1fr; padding: 0; }
  /* Sidebar hidden by default on mobile; revealed via the mobile bar toggle */
  .ec-sidebar { display: none; }
  .ec-sidebar--open {
    display: block; border-right: none; border-bottom: 1px solid var(--border);
    max-height: 55vh; padding: 16px clamp(16px, 4vw, 24px);
  }
  .ec-chat-panel { padding-left: 0; }
  .ec-req-header { padding: 16px clamp(16px, 4vw, 24px) 14px; }
  .ec-messages { padding: 20px clamp(16px, 4vw, 24px); }
  .ec-input-area { padding: 14px clamp(16px, 4vw, 24px) 18px; }
  .ec-footer { display: none; }
}
`;
