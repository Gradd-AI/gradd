'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Drill {
  id: string;
  lo_code: string;
  topic: string;
  question: string;
  context_text: string;
  hint: string;
  full_reveal: string;
}

type Stage =
  | 'attempt'       // 1: context + question + textarea
  | 'hint_prompt'   // 2: attempt shown readonly + hint button
  | 'reattempt'     // 3: hint shown + fresh textarea
  | 'reveal_prompt' // 4: re-attempt readonly + reveal button
  | 'revealed';     // 5: full_reveal + email wall

const STAGE_LABELS: Record<Stage, string> = {
  attempt:      'Step 1 of 4 — Your attempt',
  hint_prompt:  'Step 2 of 4 — Review your answer',
  reattempt:    'Step 3 of 4 — Try again',
  reveal_prompt:'Step 4 of 4 — Before the reveal',
  revealed:     'Complete',
};

export default function DrillFunnel({ drill }: { drill: Drill }) {
  const [stage, setStage]       = useState<Stage>('attempt');
  const [attempt1, setAttempt1] = useState('');
  const [attempt2, setAttempt2] = useState('');
  const [email, setEmail]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [leadError, setLeadError]   = useState<string | null>(null);

  const router = useRouter();

  // PAYWALL AT LAUNCH: replace goToTutor with subscription checkout gate.
  // The {false && (...)} wall block below preserves the email-capture code for repurposing.
  const goToTutor = () => {
    sessionStorage.setItem('apm_drill_handoff', JSON.stringify({ attempt: attempt2 }));
    router.push(`/acca/tutor?lo=${encodeURIComponent(drill.lo_code)}`);
  };

  const submitAttempt1 = () => {
    if (!attempt1.trim()) return;
    setStage('hint_prompt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showHint = () => {
    setStage('reattempt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitAttempt2 = () => {
    if (!attempt2.trim()) return;
    setStage('reveal_prompt');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showReveal = () => {
    setStage('revealed');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setLeadError(null);
    try {
      const res = await fetch('/api/acca/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), drill_lo: drill.lo_code, outcome: 'revealed' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      setSubmitted(true);
    } catch (err) {
      setLeadError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="df">

        {/* ── Header ── */}
        <header className="df-header">
          <div className="df-wrap df-header-inner">
            <Link href="/acca" className="df-logo" aria-label="Back to Gradd ACCA">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
            </Link>
            <div className="df-breadcrumb">
              <span className="df-breadcrumb-paper">ACCA APM</span>
              <span className="df-breadcrumb-sep">·</span>
              <span className="df-breadcrumb-label">Free Drill</span>
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="df-main">
          <div className="df-wrap">

            {/* Stage indicator */}
            <div className="df-stage-label">{STAGE_LABELS[stage]}</div>

            {/* ── LO tag + topic ── */}
            <div className="df-meta">
              <span className="df-lo-tag">{drill.lo_code}</span>
              <span className="df-topic">{drill.topic}</span>
            </div>

            {/* ── Context card (always visible) ── */}
            <div className="df-card df-card--context">
              <div className="df-card-label">Scenario</div>
              <p className="df-context-text">{drill.context_text}</p>
            </div>

            {/* ── Question card (always visible) ── */}
            <div className="df-card df-card--question">
              <div className="df-card-label">Question</div>
              <p className="df-question-text">{drill.question}</p>
            </div>

            {/* ─────────────────────────────────────
                STAGE 1 — ATTEMPT
            ───────────────────────────────────── */}
            {stage === 'attempt' && (
              <div className="df-stage">
                <div className="df-card df-card--input">
                  <div className="df-card-label">Your answer</div>
                  <p className="df-input-nudge">Write your answer in full — treat this as an exam attempt.</p>
                  <textarea
                    className="df-textarea"
                    placeholder="Start writing your answer here…"
                    value={attempt1}
                    onChange={e => setAttempt1(e.target.value)}
                    rows={10}
                    aria-label="Your first attempt"
                  />
                  <div className="df-action-row">
                    <button
                      className="df-btn df-btn--rust"
                      onClick={submitAttempt1}
                      disabled={!attempt1.trim()}
                    >
                      Submit my answer <span className="df-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────
                STAGE 2 — HINT PROMPT
                Show their attempt + request hint
            ───────────────────────────────────── */}
            {(stage === 'hint_prompt' || stage === 'reattempt' || stage === 'reveal_prompt' || stage === 'revealed') && (
              <div className="df-card df-card--attempt-ro">
                <div className="df-card-label">Your first attempt</div>
                <p className="df-attempt-text">{attempt1}</p>
              </div>
            )}

            {stage === 'hint_prompt' && (
              <div className="df-stage">
                <div className="df-card df-card--cta-only">
                  <p className="df-cta-copy">
                    Read your answer. Did you apply the specific technique to the scenario, or did you describe it generically?
                  </p>
                  <div className="df-action-row">
                    <button className="df-btn df-btn--ghost" onClick={showHint}>
                      Show me a hint <span className="df-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────
                STAGE 3 — REATTEMPT
                Hint shown + fresh textarea
            ───────────────────────────────────── */}
            {(stage === 'reattempt' || stage === 'reveal_prompt' || stage === 'revealed') && (
              <div className="df-card df-card--hint">
                <div className="df-card-label">Hint</div>
                <p className="df-hint-text">{drill.hint}</p>
              </div>
            )}

            {stage === 'reattempt' && (
              <div className="df-stage">
                <div className="df-card df-card--input">
                  <div className="df-card-label">Your revised answer</div>
                  <p className="df-input-nudge">Now re-attempt with the hint in mind. Write it fully — this is the version that counts.</p>
                  <textarea
                    className="df-textarea"
                    placeholder="Revise your answer here…"
                    value={attempt2}
                    onChange={e => setAttempt2(e.target.value)}
                    rows={10}
                    aria-label="Your revised attempt"
                  />
                  <div className="df-action-row">
                    <button
                      className="df-btn df-btn--rust"
                      onClick={submitAttempt2}
                      disabled={!attempt2.trim()}
                    >
                      Submit revised answer <span className="df-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────
                STAGE 4 — REVEAL PROMPT
                Re-attempt shown + request reveal
            ───────────────────────────────────── */}
            {(stage === 'reveal_prompt' || stage === 'revealed') && (
              <div className="df-card df-card--attempt-ro df-card--attempt-ro-2">
                <div className="df-card-label">Your revised answer</div>
                <p className="df-attempt-text">{attempt2}</p>
              </div>
            )}

            {stage === 'reveal_prompt' && (
              <div className="df-stage">
                <div className="df-card df-card--cta-only df-card--cta-reveal">
                  <p className="df-cta-copy">
                    You&apos;ve made two attempts. Now see how an APM examiner diagnoses this type of question — what misconception most candidates bring, and what the correct mental model is.
                  </p>
                  <div className="df-action-row">
                    <button className="df-btn df-btn--rust" onClick={showReveal}>
                      Show me how an examiner sees it <span className="df-arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────────────────────────
                STAGE 5 — REVEALED
                Teaching reveal + email wall
            ───────────────────────────────────── */}
            {stage === 'revealed' && (
              <>
                <div className="df-card df-card--reveal">
                  <div className="df-card-label">How an examiner sees it</div>
                  <p className="df-reveal-text">{drill.full_reveal}</p>
                </div>

                {/* PAYWALL AT LAUNCH: remove `false &&` and restore this email wall,
                    or replace the form with a subscription checkout call.
                    submitLead + all email state vars are preserved and still typed. */}
                {false && (
                <div className="df-wall">
                  <div className="df-wall-inner">
                    <div className="df-wall-copy">
                      <div className="df-wall-eyebrow">That&apos;s one of 73</div>
                      <h2 className="df-wall-h2">
                        Every APM learning objective. One drill each. The same teaching reveal.
                      </h2>
                      <ul className="df-wall-bullets">
                        <li>73 wholly original APM drills — one per ACCA 2026–27 LO</li>
                        <li>Attempt → hint → re-attempt → examiner reveal for every drill</li>
                        <li>Built around what actually fails APM candidates: generic answers, weak application, missed evaluation</li>
                        <li>No subscription yet — get first access when we launch</li>
                      </ul>
                    </div>

                    <div className="df-wall-form-wrap">
                      {submitted ? (
                        <div className="df-wall-success">
                          <div className="df-success-icon">✓</div>
                          <h3 className="df-success-h3">You&apos;re on the list.</h3>
                          <p className="df-success-p">We&apos;ll email you as soon as the full APM drill set is ready.</p>
                        </div>
                      ) : (
                        <form className="df-wall-form" onSubmit={submitLead} noValidate>
                          <p className="df-wall-form-label">Get the full APM drill set</p>
                          <div className="df-wall-input-row">
                            <input
                              type="email"
                              className="df-wall-input"
                              placeholder="your@email.com"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                              required
                              aria-label="Email address"
                              disabled={submitting}
                            />
                            <button
                              type="submit"
                              className="df-btn df-btn--rust df-wall-btn"
                              disabled={submitting || !email.trim()}
                            >
                              {submitting ? 'Saving…' : <>Get access <span className="df-arrow">→</span></>}
                            </button>
                          </div>
                          {leadError && <p className="df-wall-error">{leadError}</p>}
                          <p className="df-wall-small">Free. No payment. We&apos;ll email you when it&apos;s ready.</p>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
                )}

                {/* TUTOR CTA — temporary testing handoff; replaced by subscription gate at launch */}
                <div className="df-wall">
                  <div className="df-wall-inner">
                    <div className="df-wall-copy">
                      <div className="df-wall-eyebrow">That&apos;s one of 73</div>
                      <h2 className="df-wall-h2">
                        Every APM learning objective. One drill each. The same examiner insight.
                      </h2>
                      <ul className="df-wall-bullets">
                        <li>73 wholly original APM drills — one per ACCA 2026–27 LO</li>
                        <li>Attempt → hint → re-attempt → examiner reveal for every drill</li>
                        <li>Live coaching from Eli on exactly where your answer stalled</li>
                        <li>The apply/evaluate jump that wins APM marks</li>
                      </ul>
                    </div>
                    <div className="df-wall-form-wrap">
                      <div className="df-wall-form">
                        <p className="df-wall-form-label">Work through this with Eli</p>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 18px' }}>
                          You&apos;ve seen how an examiner reads it. Now get coached through your own answer — Eli diagnoses exactly where you stalled and teaches from there.
                        </p>
                        <button
                          className="df-btn df-btn--rust"
                          style={{ width: '100%', justifyContent: 'center', borderRadius: 10 }}
                          onClick={goToTutor}
                        >
                          Work through this with Eli <span className="df-arrow">→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="df-footer">
          <div className="df-wrap df-footer-inner">
            <span className="df-footer-copy">© 2026 Gradd.ai · Not affiliated with ACCA</span>
            <div className="df-footer-links">
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
// Prefix: .df  (drill funnel)
// Uses global vars: --bg, --surface, --surface-2, --brand, --text, --text-muted,
//   --text-light, --border, --border-light, --font-display, --font-body
// Adds local var: --rust (ACCA brand CTA colour, shared with ACCA landing page)

const CSS = `
.df {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
  --reveal-bg: oklch(22% 0.035 168);
  --reveal-ink: oklch(94% 0.02 80);
  --hint-bg: oklch(96% 0.018 80);
  --hint-border: oklch(84% 0.028 78);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

.df *, .df *::before, .df *::after { box-sizing: border-box; }

.df-wrap {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 clamp(20px, 4vw, 40px);
}

/* ── Header ── */
.df-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg);
  border-bottom: 1px solid var(--border-light);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.df-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}
.df-logo { display: flex; align-items: center; text-decoration: none; }
.df-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  font-family: var(--font-body);
}
.df-breadcrumb-paper { font-weight: 600; color: var(--text); }
.df-breadcrumb-sep { color: var(--border); }
.df-breadcrumb-label {
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
.df-main {
  flex: 1;
  padding: clamp(32px, 5vw, 56px) 0 64px;
}

/* Stage label */
.df-stage-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

/* LO meta */
.df-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.df-lo-tag {
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
.df-topic {
  font-size: 13px;
  color: var(--text-muted);
  font-style: italic;
}

/* ── Cards ── */
.df-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: clamp(20px, 3vw, 32px);
  margin-bottom: 16px;
}
.df-card-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.df-card--context { background: var(--surface-2); border-color: var(--border-light); }
.df-context-text {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text);
}

.df-card--question { border-color: var(--border); }
.df-question-text {
  font-family: var(--font-display);
  font-size: clamp(18px, 2.2vw, 22px);
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
  letter-spacing: -0.3px;
}

/* Input card */
.df-card--input { border-color: var(--border); }
.df-input-nudge {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 14px;
  line-height: 1.5;
}
.df-textarea {
  width: 100%;
  padding: 14px 16px;
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
}
.df-textarea:focus { border-color: var(--brand); }
.df-textarea::placeholder { color: var(--text-light); }

/* Read-only attempt */
.df-card--attempt-ro {
  background: var(--surface-2);
  border-color: var(--border-light);
}
.df-card--attempt-ro-2 {
  border-left: 3px solid var(--rust);
}
.df-attempt-text {
  font-size: 14px;
  line-height: 1.65;
  color: var(--text);
  white-space: pre-wrap;
}

/* Hint card */
.df-card--hint {
  background: var(--hint-bg);
  border-color: var(--hint-border);
}
.df-hint-text {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  line-height: 1.45;
  color: var(--brand);
  letter-spacing: -0.2px;
  font-style: italic;
}

/* CTA-only card */
.df-card--cta-only {
  background: var(--surface);
  border-color: var(--border);
}
.df-card--cta-reveal {
  background: var(--surface-2);
}
.df-cta-copy {
  font-size: 15px;
  line-height: 1.6;
  color: var(--text-muted);
  margin-bottom: 20px;
  max-width: 56ch;
}

/* Reveal card */
.df-card--reveal {
  background: var(--reveal-bg);
  border-color: transparent;
  color: var(--reveal-ink);
}
.df-card--reveal .df-card-label {
  color: oklch(70% 0.025 80);
}
.df-reveal-text {
  font-size: 16px;
  line-height: 1.7;
  color: var(--reveal-ink);
}

/* ── Buttons ── */
.df-action-row {
  display: flex;
  margin-top: 18px;
  gap: 10px;
  flex-wrap: wrap;
}
.df-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 22px;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  white-space: nowrap;
  line-height: 1;
}
.df-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.df-btn:not(:disabled):hover { transform: translateY(-1px); }
.df-arrow { transition: transform 0.15s ease; }
.df-btn:not(:disabled):hover .df-arrow { transform: translateX(3px); }

.df-btn--rust {
  background: var(--rust);
  color: var(--rust-ink);
  border-color: var(--rust);
}
.df-btn--rust:not(:disabled):hover { background: var(--rust-dark); border-color: var(--rust-dark); }

.df-btn--ghost {
  background: transparent;
  color: var(--brand);
  border-color: var(--border);
}
.df-btn--ghost:not(:disabled):hover {
  background: var(--brand);
  color: #fff;
  border-color: var(--brand);
}

/* ── Stage wrapper ── */
.df-stage { /* no extra styling needed — child cards handle it */ }

/* ── Email wall ── */
.df-wall {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  overflow: hidden;
  margin-top: 8px;
}
.df-wall-inner {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}
@media (max-width: 680px) {
  .df-wall-inner { grid-template-columns: 1fr; }
}

.df-wall-copy {
  padding: clamp(28px, 4vw, 44px);
  background: var(--brand);
  color: oklch(94% 0.02 80);
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.df-wall-eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: oklch(70% 0.025 80);
}
.df-wall-h2 {
  font-family: var(--font-display);
  font-size: clamp(22px, 2.8vw, 30px);
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.4px;
  color: oklch(96% 0.01 80);
}
.df-wall-bullets {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.df-wall-bullets li {
  font-size: 14px;
  line-height: 1.5;
  color: oklch(84% 0.018 80);
  padding-left: 18px;
  position: relative;
}
.df-wall-bullets li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--rust);
  font-weight: 700;
}

.df-wall-form-wrap {
  padding: clamp(28px, 4vw, 44px);
  display: flex;
  align-items: center;
}
.df-wall-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.df-wall-form-label {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.df-wall-input-row {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.df-wall-input {
  width: 100%;
  padding: 13px 16px;
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text);
  background: var(--bg);
  border: 1.5px solid var(--border);
  border-radius: 10px;
  outline: none;
  transition: border-color 0.15s;
}
.df-wall-input:focus { border-color: var(--brand); }
.df-wall-input::placeholder { color: var(--text-light); }
.df-wall-input:disabled { opacity: 0.6; }
.df-wall-btn { width: 100%; justify-content: center; border-radius: 10px; }
.df-wall-error {
  font-size: 13px;
  color: #c0392b;
}
.df-wall-small {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Success */
.df-wall-success {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  text-align: center;
  padding: 12px 0;
}
.df-success-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #1e7e44;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 22px;
}
.df-success-h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.3px;
}
.df-success-p {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 30ch;
  line-height: 1.5;
}

/* ── Footer ── */
.df-footer {
  border-top: 1px solid var(--border-light);
  padding: 20px 0;
}
.df-footer-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}
.df-footer-copy {
  font-size: 12px;
  color: var(--text-muted);
}
.df-footer-links {
  display: flex;
  gap: 20px;
}
.df-footer-links a {
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.15s;
}
.df-footer-links a:hover { color: var(--text); }

@media (max-width: 480px) {
  .df-card { padding: 18px 16px; }
  .df-wall-copy, .df-wall-form-wrap { padding: 24px 20px; }
}
`;
