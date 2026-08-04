'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import MessageRenderer from '@/components/chat/MessageRenderer';
import type { ClientSessionState } from '@/app/api/acca/tutor/route';
import AreaPicker, { type PickerArea } from '@/app/acca/AreaPicker';
import ACCASignOutButton from '@/components/acca/ACCASignOutButton';

interface Drill {
  id: string;
  lo_code: string;
  topic: string;
  question: string;
  context_text: string | null;
  section_changed?: boolean;   // item 4: next-drill crossed into a new section (interleave tier 4)
}

// Section titles (apm-framework.ts) — for the cross-section transition note (item 4)
const SECTION_NAME: Record<string, string> = {
  A: 'Strategic management and value creation',
  B: 'Performance optimisation',
  C: 'Performance reporting',
  D: 'Data science and technology',
};

interface Message {
  role: 'student' | 'ezra';
  content: string;
  kind?: string;            // server message_kind → badge (Ezra messages only)
}

// kinds with no entry (reveal_locked, chat) render no badge — deliberately quiet
const KIND_LABEL: Record<string, string> = {
  teaching: 'Teaching', hint: 'Hint', correct: 'Correct',
  reveal: 'Model answer', answer: 'Answer', coaching: 'Coaching',
};

function fireEvent(userId: string, payload: { event_type: string; drill_lo?: string; metadata?: Record<string, unknown> }) {
  void fetch('/api/acca/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, ...payload }),
  });
}

function ezraOpening(drill: Drill): Message {
  return {
    role: 'ezra',
    content: `Take a look at the **${drill.topic}** question — it's on the left. Write your full attempt in the box below; treat it as an exam answer. I'll read exactly what you wrote and diagnose from there.`,
  };
}

export default function TutorChat({ drill, initialCapHit, userId, paper }: { drill: Drill; initialCapHit: boolean; userId: string; paper: string }) {
  // Carry the paper into every upsell link so /acca/subscribe leads with the paper they came
  // from (bundle copy is paper-aware; neutral fallback when absent).
  const subscribeHref = `/acca/subscribe?paper=${encodeURIComponent(paper)}`;
  const [currentDrill, setCurrentDrill]           = useState<Drill>(drill);
  const [messages, setMessages]                   = useState<Message[]>([ezraOpening(drill)]);
  const [sessionState, setSessionState]           = useState<ClientSessionState | null>(null);
  const [input, setInput]                         = useState('');
  const [loading, setLoading]                     = useState(false);
  const [error, setError]                         = useState<string | null>(null);
  const [teachThroughDone, setTeachThroughDone]   = useState(false);
  const [resolvedDone, setResolvedDone]           = useState(false);
  const [capHit, setCapHit]                       = useState(initialCapHit);
  const [canReveal, setCanReveal]                 = useState(false);  // drill solved → model answer earned
  const [navigating, setNavigating]               = useState(false);
  const [mobileExpanded, setMobileExpanded]       = useState(false);
  const [showPicker, setShowPicker]               = useState(false);
  const [pickerAreas, setPickerAreas]             = useState<PickerArea[] | null>(null);
  const [pickerLoading, setPickerLoading]         = useState(false);
  const messagesEndRef                            = useRef<HTMLDivElement>(null);
  const textareaRef                               = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Analytics: fire drill_shown on mount
  useEffect(() => {
    fireEvent(userId, { event_type: 'drill_shown', drill_lo: drill.lo_code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const missCount  = sessionState?.miss_count ?? 0;
  const hasAttempt = messages.some(m => m.role === 'student');

  const sendMessage = async (explicitText?: string) => {
    const trimmed = (explicitText ?? input).trim();
    if (!trimmed || loading) return;

    // Last Ezra turn (before this send) — lets the server intent classifier disambiguate
    // context-dependent replies (e.g. "yes" / "go on" after an offer to walk through).
    const lastEzra = [...messages].reverse().find(m => m.role === 'ezra')?.content ?? null;

    const studentMessage: Message = { role: 'student', content: trimmed };
    setMessages(prev => [...prev, studentMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/acca/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drill_id:        currentDrill.id,      // primary key of the exact drill on screen
          drill_lo:        currentDrill.lo_code,  // retained: legacy fallback during rollout
          session_state:   sessionState,
          student_message: trimmed,
          last_ezra_message: lastEzra,  // intent-layer context (server ignores when flag off)
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (json.error === 'cap_hit') {
          setCapHit(true);
          setMessages(prev => prev.slice(0, -1));
          setInput(trimmed);
          return;
        }
        throw new Error(json.error ?? 'Something went wrong');
      }

      setSessionState(json.session_state);
      setMessages(prev => [...prev, { role: 'ezra', content: json.ezra_response, kind: json.message_kind }]);

      // Solved (confirmed-correct or revealed) → the model answer is earned. Surface the
      // "View the model answer" affordance; retire it once the reveal itself is delivered.
      if (json.resolved && json.intent !== 'reveal') setCanReveal(true);
      if (json.intent === 'reveal') setCanReveal(false);

      if (json.intent) {
        fireEvent(userId, {
          event_type: 'tutor_intent',
          drill_lo:   currentDrill.lo_code,
          metadata:   { intent: json.intent },
        });
      }

      if (json.teach_through_delivered) {
        if (!teachThroughDone) {
          fireEvent(userId, {
            event_type: 'teach_through_delivered',
            drill_lo:   currentDrill.lo_code,
            metadata:   { diagnosis: json.session_state?.last_diagnosis ?? null },
          });
        }
        setTeachThroughDone(true);
      }

      if (json.intent === 'reveal' && !resolvedDone) {
        fireEvent(userId, { event_type: 'drill_resolved', drill_lo: currentDrill.lo_code });
        setResolvedDone(true);
      }

      if (json.cap_now_hit) {
        setCapHit(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach Ezra — please try again.');
      setMessages(prev => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  // "Try another" swaps left panel in-place; no navigation
  const handleTryAnother = async () => {
    fireEvent(userId, { event_type: 'try_another_clicked', drill_lo: currentDrill.lo_code });
    const fromSection = currentDrill.lo_code[0];   // captured before the swap, for the transition note
    setNavigating(true);
    try {
      const res  = await fetch(
        `/api/acca/next-drill?lo=${encodeURIComponent(currentDrill.lo_code)}&drill_id=${encodeURIComponent(currentDrill.id)}&paper=${encodeURIComponent(paper)}`,
      );
      if (!res.ok) return;            // 404/error → keep current drill (finally resets navigating)
      const next = await res.json() as Drill;
      if (!next?.id) return;          // never blank currentDrill with an id-less object
      setCurrentDrill(next);
      // Item 4: when interleaving crosses a section, the student MUST see the move — never a silent jump.
      const toSection = next.lo_code[0];
      setMessages(
        next.section_changed
          ? [{ role: 'ezra', content: `You've worked through Section ${fromSection} (${SECTION_NAME[fromSection] ?? ''}) — moving to Section ${toSection} (${SECTION_NAME[toSection] ?? ''}).` }, ezraOpening(next)]
          : [ezraOpening(next)],
      );
      setSessionState(null);
      setTeachThroughDone(false);
      setResolvedDone(false);
      setCanReveal(false);
      setMobileExpanded(false);
      setInput('');
      fireEvent(userId, { event_type: 'drill_shown', drill_lo: next.lo_code });
    } catch {
      // silently fail — student stays on current drill
    } finally {
      setNavigating(false);
    }
  };

  // Lazy-fetch areas from API when "Change area" is first opened
  const handleOpenPicker = async () => {
    setShowPicker(true);
    if (pickerAreas === null) {
      setPickerLoading(true);
      try {
        const res = await fetch(`/api/acca/areas?paper=${encodeURIComponent(paper)}`);
        setPickerAreas(await res.json());
      } catch {
        setPickerAreas([]);
      } finally {
        setPickerLoading(false);
      }
    }
  };

  // Swap drill in-place from a picked sub-area — same pattern as handleTryAnother
  const handleAreaSelect = async (subArea: string) => {
    fireEvent(userId, { event_type: 'area_selected', drill_lo: currentDrill.lo_code, metadata: { area: subArea } });
    setShowPicker(false);
    setNavigating(true);
    try {
      const res  = await fetch(`/api/acca/next-drill?area=${encodeURIComponent(subArea)}&paper=${encodeURIComponent(paper)}`);
      if (!res.ok) return;            // 404/error → keep current drill (finally resets navigating)
      const next = await res.json() as Drill;
      if (!next?.id) return;          // never blank currentDrill with an id-less object
      setCurrentDrill(next);
      setMessages([ezraOpening(next)]);
      setSessionState(null);
      setTeachThroughDone(false);
      setResolvedDone(false);
      setCanReveal(false);
      setMobileExpanded(false);
      setInput('');
      fireEvent(userId, { event_type: 'drill_shown', drill_lo: next.lo_code });
    } catch {
      // silently fail — student stays on current drill
    } finally {
      setNavigating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendLabel = !hasAttempt ? 'Submit attempt' : missCount === 1 ? 'Re-attempt' : 'Send';

  return (
    <>
      <style>{CSS}</style>
      <div className="et">

        {/* ── Header ── */}
        <header className="et-header">
          <div className="et-wrap et-header-inner">
            <Link href={paper === 'APM' ? '/acca' : `/acca?paper=${paper}`} className="et-logo" aria-label="Back to Gradd ACCA">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
            </Link>
            <div className="et-header-right">
              <div className="et-breadcrumb">
                <span className="et-breadcrumb-paper">ACCA {paper}</span>
                <span className="et-breadcrumb-sep">·</span>
                <span className="et-breadcrumb-label">Tutor</span>
              </div>
              <ACCASignOutButton />
            </div>
          </div>
        </header>

        {/* Mobile drill bar — hidden on desktop, always visible on mobile.
            Shows LO + topic + tap-to-expand toggle. Student is one tap from
            re-reading the scenario without losing chat scroll position. */}
        <div
          className="et-mobile-bar"
          onClick={() => setMobileExpanded(v => !v)}
          role="button"
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? 'Collapse question' : 'View question and scenario'}
        >
          <span className="et-mobile-bar-lo">{currentDrill.lo_code}</span>
          <span className="et-mobile-bar-sep">·</span>
          <span className="et-mobile-bar-topic">{currentDrill.topic}</span>
          <span className="et-mobile-bar-cta">{mobileExpanded ? 'hide ▴' : 'view question ▾'}</span>
        </div>
        {mobileExpanded && (
          <div className="et-mobile-panel">
            {currentDrill.context_text && (
              <div className="et-panel et-panel--context">
                <div className="et-panel-label">Scenario</div>
                <div className="et-context-text"><MessageRenderer content={currentDrill.context_text} breaks /></div>
              </div>
            )}
            <div className="et-panel et-panel--question">
              <div className="et-panel-label">Question</div>
              <p className="et-question-text">{currentDrill.question}</p>
            </div>
          </div>
        )}

        {/* ── Two-panel layout ──
            Desktop: left panel scrolls independently (question stays visible while chat scrolls).
            Achieved via height:100vh + overflow:hidden on .et, overflow:hidden on .et-layout,
            and overflow-y:auto on each column — no position:sticky needed.
        ── */}
        <div className="et-layout">

          {/* LEFT: scenario + question (or area picker when toggled), independent scroll */}
          <aside className="et-sidebar">
            <div className="et-sidebar-inner">

              {showPicker ? (
                <>
                  <div className="et-picker-header">
                    <span className="et-picker-header-title">Change area</span>
                    <button
                      className="et-picker-close"
                      onClick={() => setShowPicker(false)}
                      aria-label="Close area picker"
                    >✕</button>
                  </div>
                  {pickerLoading ? (
                    <p className="et-picker-loading">Loading areas…</p>
                  ) : (
                    <AreaPicker
                      areas={pickerAreas ?? []}
                      onSelect={handleAreaSelect}
                      loading={navigating}
                      currentSubArea={currentDrill.lo_code.slice(0, 2)}
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="et-meta">
                    <span className="et-lo-tag">{currentDrill.lo_code}</span>
                    <span className="et-topic">{currentDrill.topic}</span>
                  </div>

                  {currentDrill.context_text && (
                    <div className="et-panel et-panel--context">
                      <div className="et-panel-label">Scenario</div>
                      {/* MUST route through MessageRenderer with `breaks` (same as the mobile panel
                          above) — a raw <p> collapses the context's newlines (white-space:normal)
                          into a wall. Regressed once (6b584a8 sidebar refactor); keep them in sync. */}
                      <div className="et-context-text"><MessageRenderer content={currentDrill.context_text} breaks /></div>
                    </div>
                  )}

                  <div className="et-panel et-panel--question">
                    <div className="et-panel-label">Question</div>
                    <p className="et-question-text">{currentDrill.question}</p>
                  </div>

                  <div className="et-ezra-intro">
                    <div className="et-ezra-avatar" aria-hidden="true">E</div>
                    <div className="et-ezra-intro-text">
                      <strong>Ezra</strong> — {paper} tutor
                      <span className="et-ezra-intro-sub">
                        Attempt the question. Ezra diagnoses where you stalled and teaches from there.
                      </span>
                    </div>
                  </div>

                  <button className="et-change-area" onClick={handleOpenPicker}>
                    Change area <span className="et-arrow">→</span>
                  </button>
                </>
              )}

            </div>
          </aside>

          {/* RIGHT: conversation, independent scroll */}
          <main className="et-chat-panel">

            <div className="et-messages">

              {messages.map((msg, i) => (
                <div key={i} className={`et-msg et-msg--${msg.role}${msg.kind === 'reveal' ? ' et-msg--wide' : ''}`}>
                  {msg.role === 'ezra' && (
                    <div className="et-msg-avatar" aria-hidden="true">E</div>
                  )}
                  <div className="et-msg-body">
                    <div className="et-msg-sender">
                      {msg.role === 'ezra' ? 'Ezra' : 'You'}
                      {msg.role === 'ezra' && msg.kind && KIND_LABEL[msg.kind] && (
                        <span className={`et-msg-badge et-msg-badge--${msg.kind}`}>{KIND_LABEL[msg.kind]}</span>
                      )}
                    </div>
                    {msg.role === 'ezra' ? (
                      <div className="et-msg-content et-msg-content--ezra">
                        <MessageRenderer content={msg.content} />
                      </div>
                    ) : (
                      <div className="et-msg-content et-msg-content--student">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="et-msg et-msg--ezra">
                  <div className="et-msg-avatar" aria-hidden="true">E</div>
                  <div className="et-msg-body">
                    <div className="et-msg-sender">Ezra</div>
                    <div className="et-thinking">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="et-error" role="alert">{error}</div>
              )}

              {teachThroughDone && !loading && (
                <div className="et-teach-cta">
                  {capHit ? (
                    <>
                      <p className="et-teach-cta-title">That&apos;s 3 free teach-throughs</p>
                      <p className="et-teach-cta-copy">
                        Continue coaching — €99 for 90 days, or €49/month.
                      </p>
                      <a
                        href={subscribeHref}
                        className="et-btn et-btn--rust"
                        style={{ textDecoration: 'none', alignSelf: 'flex-start' }}
                      >
                        Get access <span className="et-arrow">→</span>
                      </a>
                    </>
                  ) : (
                    <button
                      className="et-btn et-btn--rust"
                      onClick={handleTryAnother}
                      disabled={navigating}
                    >
                      {navigating
                        ? 'Finding next drill…'
                        : <>Try another drill <span className="et-arrow">→</span></>}
                    </button>
                  )}
                </div>
              )}

              {canReveal && !loading && (
                <div className="et-reveal-cta">
                  <button
                    className="et-btn et-btn--ghost et-reveal-btn"
                    onClick={() => sendMessage('Show me the model answer.')}
                    disabled={loading}
                  >
                    View the model answer <span className="et-arrow">→</span>
                  </button>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area: live throughout. Cap wall replaces only for returning capped users
                who haven't yet had a teach-through this session (capHit && !teachThroughDone).
                When capHit && teachThroughDone (just finished drill-3) the input stays live for
                follow-ups; the ghost "Try another" button is replaced by an inline paywall nudge. */}
            {capHit && !teachThroughDone ? (
              <div className="et-cap-wall">
                <p className="et-cap-title">You&apos;ve used your 3 free teach-throughs</p>
                <p className="et-cap-copy">Continue coaching — €99 for 90 days, or €49/month.</p>
                <a
                  href={subscribeHref}
                  className="et-btn et-btn--rust"
                  style={{ textDecoration: 'none', alignSelf: 'flex-start' }}
                >
                  Get access <span className="et-arrow">→</span>
                </a>
              </div>
            ) : (
              <div className="et-input-area">
                <div className="et-input-wrap">
                  <textarea
                    ref={textareaRef}
                    className="et-textarea"
                    placeholder={
                      !hasAttempt
                        ? 'Write your full attempt here…'
                        : missCount === 1
                        ? 'Re-attempt, or type "just tell me" for a full teach-through…'
                        : teachThroughDone
                        ? 'Ask Ezra a follow-up…'
                        : 'Continue…'
                    }
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={5}
                    disabled={loading}
                    aria-label="Your message to Ezra"
                  />
                  <div className="et-input-footer">
                    <span className="et-input-hint">⌘↵ to send</span>
                    <button
                      className="et-btn et-btn--rust"
                      onClick={() => sendMessage()}
                      disabled={!input.trim() || loading}
                    >
                      {loading ? 'Thinking…' : <>{sendLabel} <span className="et-arrow">→</span></>}
                    </button>
                  </div>
                </div>
                {teachThroughDone && (
                  capHit
                    ? <p className="et-cap-nudge">Go unlimited to drill the next question — <a href={subscribeHref}>Get access →</a></p>
                    : <button
                        className="et-btn et-btn--ghost et-try-another"
                        onClick={handleTryAnother}
                        disabled={navigating}
                      >
                        {navigating ? 'Finding next drill…' : <>Try another drill <span className="et-arrow">→</span></>}
                      </button>
                )}
              </div>
            )}

          </main>
        </div>

        {/* ── Footer ── */}
        <footer className="et-footer">
          <div className="et-wrap et-footer-inner">
            <span className="et-footer-copy">© 2026 Gradd.ai · Not affiliated with ACCA</span>
            <div className="et-footer-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .et  (ezra tutor)
// Layout approach: .et is height:100vh + overflow:hidden so the PAGE never scrolls.
//   Each panel (.et-sidebar, .et-messages) has its own overflow-y:auto scroll container.
//   min-height:0 on flex/grid children allows them to shrink below content size (required
//   for inner scroll to work). This keeps the left panel always visible while the right
//   panel's conversation scrolls independently.
// MessageRenderer vars: --chat-* mapped to existing --text/--border/--brand/--text-muted/--surface-2.

const CSS = `
.et {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
  --hint-bg: oklch(96% 0.018 80);
  --hint-border: oklch(84% 0.028 78);
  /* MessageRenderer CSS variable wiring */
  --chat-text:      var(--text);
  --chat-border:    var(--border);
  --chat-accent:    var(--brand);
  --chat-muted:     var(--text-muted);
  --chat-surface-2: var(--surface-2);
  --chat-thead-bg:  var(--surface-2);
  --chat-strong:    var(--brand);
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

.et *, .et *::before, .et *::after { box-sizing: border-box; }

.et-wrap {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 clamp(16px, 3vw, 32px);
}

/* ── Header ── */
.et-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  flex-shrink: 0;
}
.et-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}
.et-logo { display: flex; align-items: center; text-decoration: none; }
.et-header-right { display: flex; align-items: center; gap: 14px; }
.et-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.et-breadcrumb-paper { font-weight: 600; color: var(--text); }
.et-breadcrumb-sep { color: var(--border); }
.et-breadcrumb-label {
  background: rgba(192,94,60,0.1);
  color: var(--rust);
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── Two-column layout ──
   flex:1 + min-height:0 lets .et-layout fill remaining viewport height without overflow.
   overflow:hidden contains each column's independent scroll. */
.et-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 380px 1fr;
  overflow: hidden;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 clamp(16px, 3vw, 32px);
  gap: 0;
}

/* ── Left sidebar — independent scroll; question stays visible as chat scrolls ── */
.et-sidebar {
  border-right: 1px solid var(--border-light);
  overflow-y: auto;
  min-height: 0;
  padding: 28px 24px 28px 0;
}
.et-sidebar-inner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.et-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.et-lo-tag {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rust);
  background: rgba(192,94,60,0.1);
  border: 1px solid rgba(192,94,60,0.2);
  padding: 3px 9px;
  border-radius: 4px;
}
.et-topic {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
}

.et-panel {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px 20px;
}
.et-panel-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.et-panel--context {
  background: var(--surface-2);
  border-color: var(--border-light);
}
.et-context-text {
  font-size: 13px;
  line-height: 1.65;
  color: var(--text);
}
/* MessageRenderer emits block children (p/hr/list/table); trim the trailing margin so the
   parsed scenario sits flush in the panel. */
.et-context-text > :last-child { margin-bottom: 0; }
.et-panel--question { border-color: var(--border); }
.et-question-text {
  font-family: var(--font-display);
  font-size: clamp(16px, 1.8vw, 19px);
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
  letter-spacing: -0.2px;
}

.et-ezra-intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 0 0;
}
.et-ezra-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--brand);
  color: oklch(94% 0.02 80);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.et-ezra-intro-text {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}
.et-ezra-intro-sub {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

/* ── Right chat panel ── */
.et-chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
  padding-left: 24px;
}

/* Messages — independent scroll container */
.et-messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 28px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* Message rows */
.et-msg {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 680px;
}
/* The verbatim reveal is a DOCUMENT, not a chat line — give it up to the pane width so the
   worked-answer tables (spot curve, WDA/tax) mostly fit without scrolling on desktop. */
.et-msg--wide { max-width: min(940px, 100%); }
.et-msg--student {
  flex-direction: row-reverse;
  align-self: flex-end;
}
.et-msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--brand);
  color: oklch(94% 0.02 80);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}
.et-msg-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;   /* let a wide reveal table scroll WITHIN its own overflow-x box instead of
                     forcing the bubble/page to grow (flex children default to min-width:auto) */
}
.et-msg-sender {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.et-msg--student .et-msg-sender { text-align: right; }

/* Message-type badge: small pill next to "Ezra". Quiet by default; heavier accent for
   the teach-through / model-answer (the moments a student should clearly register). */
.et-msg-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  vertical-align: 1px;
  background: var(--surface-2);
  color: var(--text-muted);
  border: 1px solid var(--border, rgba(0,0,0,0.08));
}
.et-msg-badge--teaching,
.et-msg-badge--reveal {
  background: var(--brand);
  color: #fff;
  border-color: transparent;
}
.et-msg-badge--correct {
  background: rgba(34, 160, 90, 0.12);
  color: #1c8b4e;
  border-color: rgba(34, 160, 90, 0.25);
}

.et-msg-content {
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.65;
  min-width: 0;   /* see .et-msg-body — required for per-table horizontal scroll containment */
}
.et-msg-content--student {
  background: var(--surface-2);
  border: 1px solid var(--border-light);
  padding: 14px 18px;
  color: var(--text);
  white-space: pre-wrap;
}
.et-msg-content--ezra {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 16px 20px;
  color: var(--text);
}

/* Thinking dots */
.et-thinking {
  display: flex;
  gap: 5px;
  align-items: center;
  padding: 14px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.et-thinking span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: et-dot 1.2s infinite ease-in-out;
}
.et-thinking span:nth-child(2) { animation-delay: 0.2s; }
.et-thinking span:nth-child(3) { animation-delay: 0.4s; }
@keyframes et-dot {
  0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

.et-error {
  background: #fff0f0;
  border: 1px solid #f5c6c6;
  color: #c0392b;
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 13px;
}

/* ── Input area ── */
.et-input-area {
  border-top: 1px solid var(--border-light);
  padding: 16px 0 20px;
  flex-shrink: 0;
}
.et-input-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.et-textarea {
  width: 100%;
  padding: 14px 16px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  background: var(--surface);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.et-textarea:focus { border-color: var(--brand); }
.et-textarea::placeholder { color: var(--text-light, var(--text-muted)); opacity: 0.7; }
.et-textarea:disabled { opacity: 0.6; }

.et-input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.et-input-hint { font-size: 11px; color: var(--text-muted); }

/* ── Cap wall — shown instead of input for returning users already at cap ── */
.et-cap-wall {
  border-top: 1px solid var(--border-light);
  padding: 20px 0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.et-cap-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.2px;
  margin: 0;
}
.et-cap-copy {
  font-size: 14px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.5;
}

/* ── Buttons ── */
.et-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  line-height: 1;
}
.et-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.et-btn:not(:disabled):hover { transform: translateY(-1px); }
.et-arrow { transition: transform 0.15s ease; }
.et-btn:not(:disabled):hover .et-arrow { transform: translateX(3px); }

.et-btn--rust {
  background: var(--rust);
  color: var(--rust-ink);
  border-color: var(--rust);
}
.et-btn--rust:not(:disabled):hover {
  background: var(--rust-dark);
  border-color: var(--rust-dark);
}
.et-btn--ghost {
  background: transparent;
  color: var(--text-muted);
  border-color: var(--border);
}
.et-btn--ghost:not(:disabled):hover {
  background: var(--surface-2);
  color: var(--text);
  border-color: var(--border);
}
.et-try-another {
  align-self: flex-start;
  margin-top: 6px;
}

/* Earned "View the model answer" affordance — shown once a drill is resolved (solved or
   revealed). The reveal itself still routes through the single call4 path server-side. */
.et-reveal-cta {
  display: flex;
  justify-content: flex-start;
}
.et-reveal-btn {
  border-color: var(--rust);
  color: var(--rust);
}
.et-reveal-btn:not(:disabled):hover {
  background: rgba(192,94,60,0.08);
  color: var(--rust-dark);
  border-color: var(--rust-dark);
}

/* Inline nudge replacing "Try another" when cap hit mid-drill-3 */
.et-cap-nudge {
  font-size: 13px;
  color: var(--text-muted);
  margin: 6px 0 0;
  line-height: 1.4;
}
.et-cap-nudge a {
  color: var(--rust);
  text-decoration: none;
  font-weight: 600;
}
.et-cap-nudge a:hover { text-decoration: underline; }

/* ── Teach-through CTA ── */
.et-teach-cta {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px 24px;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.et-teach-cta-title {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.2px;
  margin: 0;
}
.et-teach-cta-copy {
  font-size: 14px;
  line-height: 1.55;
  color: var(--text-muted);
  margin: 0;
}

/* ── Footer ── */
.et-footer {
  border-top: 1px solid var(--border-light);
  padding: 14px 0;
  flex-shrink: 0;
}
.et-footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.et-footer-copy { font-size: 11px; color: var(--text-muted); }
.et-footer-links { display: flex; gap: 18px; }
.et-footer-links a {
  font-size: 11px;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s;
}
.et-footer-links a:hover { color: var(--text); }

/* ── "Change area" link + in-sidebar picker ── */
.et-change-area {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background: none;
  border: none;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.15s;
}
.et-change-area:hover { color: var(--text); }
.et-change-area:hover .et-arrow { transform: translateX(3px); }

.et-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-light);
}
.et-picker-header-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.et-picker-close {
  background: none;
  border: none;
  font-size: 14px;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.12s, background 0.12s;
}
.et-picker-close:hover { color: var(--text); background: var(--surface-2); }

.et-picker-loading {
  font-size: 13px;
  color: var(--text-muted);
  padding: 12px 0;
  margin: 0;
}

/* ── Mobile-only elements — hidden on desktop ── */
.et-mobile-bar   { display: none; }
.et-mobile-panel { display: none; }  /* also hides on desktop if mobileExpanded somehow true */

/* ── Mobile layout ≤ 820px ──
   .et stays height:100vh/overflow:hidden (same as desktop — matches Mia's pattern).
   Desktop sidebar hides; mobile bar takes its place as the sticky question anchor.
   Panels scroll independently; footer drops out to give keyboard more room. */
@media (max-width: 820px) {
  /* Show drill bar */
  .et-mobile-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px clamp(16px, 4vw, 24px);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    flex-shrink: 0;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    min-height: 44px;
  }
  .et-mobile-bar:active { background: var(--surface-2); }
  .et-mobile-bar-lo {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--rust);
    background: rgba(192,94,60,0.1);
    border: 1px solid rgba(192,94,60,0.2);
    padding: 2px 7px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .et-mobile-bar-sep { color: var(--border); font-size: 12px; flex-shrink: 0; }
  .et-mobile-bar-topic {
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .et-mobile-bar-cta {
    font-size: 11px;
    font-weight: 600;
    color: var(--brand);
    flex-shrink: 0;
    padding-left: 8px;
  }
  /* Expandable scenario+question panel — max-height caps it so chat isn't buried */
  .et-mobile-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    max-height: 45vh;
    flex-shrink: 0;
    padding: 16px clamp(16px, 4vw, 24px);
    background: var(--bg);
    border-bottom: 1px solid var(--border);
  }
  /* Desktop sidebar hidden — mobile bar replaces it */
  .et-sidebar { display: none; }
  /* Single-column layout, no sidebar column */
  .et-layout { grid-template-columns: 1fr; padding: 0; }
  /* Chat panel spans full width */
  .et-chat-panel { padding-left: 0; }
  /* Footer hidden on mobile — saves keyboard space */
  .et-footer { display: none; }
}
`;
