'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAnonId } from '@/lib/acca/anon-id';
import { marked } from 'marked';
import type { ClientSessionState } from '@/app/api/acca/tutor/route';

interface Drill {
  id: string;
  lo_code: string;
  topic: string;
  question: string;
  context_text: string | null;
}

interface Message {
  role: 'student' | 'eli';
  content: string;
}

const FREE_TEACH_THROUGHS = 3;

function fireEvent(payload: { event_type: string; drill_lo?: string; metadata?: Record<string, unknown> }) {
  const anonId = getAnonId();
  void fetch('/api/acca/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ anon_id: anonId, user_id: null, ...payload }),
  });
}

export default function TutorChat({ drill }: { drill: Drill }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionState, setSessionState] = useState<ClientSessionState | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachThroughDone, setTeachThroughDone] = useState(false);
  const [capHit, setCapHit] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Pre-fill textarea from drill handoff written by DrillFunnel on CTA click
  useEffect(() => {
    const raw = sessionStorage.getItem('apm_drill_handoff');
    if (!raw) return;
    sessionStorage.removeItem('apm_drill_handoff');
    try {
      const { attempt } = JSON.parse(raw) as { attempt?: string };
      if (attempt) setInput(attempt);
    } catch {
      // malformed entry — ignore
    }
  }, []);

  const missCount = sessionState?.miss_count ?? 0;

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

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
          drill_lo: drill.lo_code,
          session_state: sessionState,
          student_message: trimmed,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong');

      setSessionState(json.session_state);
      setMessages(prev => [...prev, { role: 'eli', content: json.eli_response }]);

      if (json.teach_through_delivered) {
        const raw = localStorage.getItem('apm_teach_throughs_used');
        const count = parseInt(raw ?? '0', 10);
        const newCount = count + 1;
        localStorage.setItem('apm_teach_throughs_used', String(newCount));
        fireEvent({
          event_type: 'teach_through_delivered',
          drill_lo: drill.lo_code,
          metadata: { diagnosis: json.session_state?.last_diagnosis ?? null },
        });
        setTeachThroughDone(true);
        if (newCount >= FREE_TEACH_THROUGHS) setCapHit(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reach Eli — please try again.');
      // Roll back the student message on failure
      setMessages(prev => prev.slice(0, -1));
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  };

  const handleTryAnother = async () => {
    fireEvent({ event_type: 'try_another_clicked', drill_lo: drill.lo_code });
    setNavigating(true);
    try {
      const res = await fetch(`/api/acca/next-drill?lo=${encodeURIComponent(drill.lo_code)}`);
      const data = await res.json() as { lo_code?: string };
      const nextLo = data.lo_code ?? drill.lo_code;
      router.push(`/acca/drill?lo=${encodeURIComponent(nextLo)}`);
    } catch {
      setNavigating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendLabel =
    messages.length === 0 ? 'Submit attempt'
    : missCount === 1 ? 'Re-attempt'
    : 'Send';

  return (
    <>
      <style>{CSS}</style>
      <div className="et">

        {/* ── Header ── */}
        <header className="et-header">
          <div className="et-wrap et-header-inner">
            <Link href="/acca" className="et-logo" aria-label="Back to Gradd ACCA">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
            </Link>
            <div className="et-breadcrumb">
              <span className="et-breadcrumb-paper">ACCA APM</span>
              <span className="et-breadcrumb-sep">·</span>
              <span className="et-breadcrumb-label">Tutor</span>
            </div>
          </div>
        </header>

        {/* ── Main layout ── */}
        <div className="et-layout">

          {/* ── Left panel: drill context (fixed) ── */}
          <aside className="et-sidebar">
            <div className="et-sidebar-inner">

              <div className="et-meta">
                <span className="et-lo-tag">{drill.lo_code}</span>
                <span className="et-topic">{drill.topic}</span>
              </div>

              {drill.context_text && (
                <div className="et-panel et-panel--context">
                  <div className="et-panel-label">Scenario</div>
                  <p className="et-context-text">{drill.context_text}</p>
                </div>
              )}

              <div className="et-panel et-panel--question">
                <div className="et-panel-label">Question</div>
                <p className="et-question-text">{drill.question}</p>
              </div>

              <div className="et-eli-intro">
                <div className="et-eli-avatar" aria-hidden="true">E</div>
                <div className="et-eli-intro-text">
                  <strong>Eli</strong> — APM tutor
                  <span className="et-eli-intro-sub">
                    Attempt the question. Eli diagnoses where you stalled and teaches from there.
                  </span>
                </div>
              </div>

            </div>
          </aside>

          {/* ── Right panel: chat ── */}
          <main className="et-chat-panel">

            {/* Messages */}
            <div className="et-messages">
              {messages.length === 0 && (
                <div className="et-empty-state">
                  <p className="et-empty-copy">
                    Write your answer to the question on the left. Treat it as an exam attempt — Eli reads what you actually wrote, not what you meant to write.
                  </p>
                  <p className="et-empty-hint">
                    Tip: if you&apos;re stuck after a hint, try typing &ldquo;just tell me&rdquo; — Eli will switch to a full teach-through.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`et-msg et-msg--${msg.role}`}>
                  {msg.role === 'eli' && (
                    <div className="et-msg-avatar" aria-hidden="true">E</div>
                  )}
                  <div className="et-msg-body">
                    <div className="et-msg-sender">
                      {msg.role === 'eli' ? 'Eli' : 'You'}
                    </div>
                    {msg.role === 'eli' ? (
                      <div
                        className="et-msg-content et-msg-content--eli"
                        dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
                      />
                    ) : (
                      <div className="et-msg-content et-msg-content--student">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="et-msg et-msg--eli">
                  <div className="et-msg-avatar" aria-hidden="true">E</div>
                  <div className="et-msg-body">
                    <div className="et-msg-sender">Eli</div>
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
                      {/* TODO: replace href with Stripe checkout route when wired */}
                      <a
                        href="/acca"
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

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {!teachThroughDone && (
            <div className="et-input-area">
              <div className="et-input-wrap">
                <textarea
                  ref={textareaRef}
                  className="et-textarea"
                  placeholder={
                    messages.length === 0
                      ? 'Write your full attempt here…'
                      : missCount === 1
                      ? 'Re-attempt, or type "just tell me" for a full teach-through…'
                      : 'Continue…'
                  }
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={5}
                  disabled={loading}
                  aria-label="Your message to Eli"
                />
                <div className="et-input-footer">
                  <span className="et-input-hint">⌘↵ to send</span>
                  <button
                    className="et-btn et-btn--rust"
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                  >
                    {loading ? 'Thinking…' : <>{sendLabel} <span className="et-arrow">→</span></>}
                  </button>
                </div>
              </div>
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
// Prefix: .et  (eli tutor)
// Uses global vars: --bg, --surface, --surface-2, --brand, --text, --text-muted,
//   --border, --border-light, --text-light, --font-display, --font-body
// Adds local vars: --rust, --rust-dark, --rust-ink

const CSS = `
.et {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
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
}
.et-header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
}
.et-logo { display: flex; align-items: center; text-decoration: none; }
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

/* ── Two-column layout ── */
.et-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 380px 1fr;
  height: calc(100vh - 56px - 48px); /* header + footer */
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
  padding: 0 clamp(16px, 3vw, 32px);
  gap: 0;
}

@media (max-width: 820px) {
  .et-layout {
    grid-template-columns: 1fr;
    height: auto;
  }
  .et-sidebar {
    border-right: none !important;
    border-bottom: 1px solid var(--border-light);
  }
}

/* ── Sidebar (drill context) ── */
.et-sidebar {
  border-right: 1px solid var(--border-light);
  overflow-y: auto;
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
.et-panel--question { border-color: var(--border); }
.et-question-text {
  font-family: var(--font-display);
  font-size: clamp(16px, 1.8vw, 19px);
  font-weight: 700;
  line-height: 1.35;
  color: var(--text);
  letter-spacing: -0.2px;
}

.et-eli-intro {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 0 0;
}
.et-eli-avatar {
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
.et-eli-intro-text {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-top: 2px;
}
.et-eli-intro-sub {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.4;
}

/* ── Chat panel ── */
.et-chat-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-left: 24px;
}

/* Messages */
.et-messages {
  flex: 1;
  overflow-y: auto;
  padding: 28px 0 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.et-empty-state {
  background: var(--surface-2);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 560px;
}
.et-empty-copy {
  font-size: 14px;
  line-height: 1.65;
  color: var(--text);
  margin-bottom: 10px;
}
.et-empty-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Message rows */
.et-msg {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  max-width: 680px;
}
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
}
.et-msg-sender {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.et-msg--student .et-msg-sender {
  text-align: right;
}

/* Message content */
.et-msg-content {
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.65;
}
.et-msg-content--student {
  background: var(--surface-2);
  border: 1px solid var(--border-light);
  padding: 14px 18px;
  color: var(--text);
  white-space: pre-wrap;
}
.et-msg-content--eli {
  background: var(--surface);
  border: 1px solid var(--border);
  padding: 16px 20px;
  color: var(--text);
}

/* Eli markdown styles */
.et-msg-content--eli p { margin: 0 0 10px; }
.et-msg-content--eli p:last-child { margin-bottom: 0; }
.et-msg-content--eli strong { font-weight: 700; color: var(--brand); }
.et-msg-content--eli em { font-style: italic; }
.et-msg-content--eli h1, .et-msg-content--eli h2, .et-msg-content--eli h3 {
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.2px;
  margin: 14px 0 8px;
  color: var(--text);
}
.et-msg-content--eli h1 { font-size: 18px; }
.et-msg-content--eli h2 { font-size: 16px; }
.et-msg-content--eli h3 { font-size: 14px; }
.et-msg-content--eli ul, .et-msg-content--eli ol {
  margin: 8px 0;
  padding-left: 20px;
}
.et-msg-content--eli li { margin-bottom: 4px; }
.et-msg-content--eli hr {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 14px 0;
}
.et-msg-content--eli code {
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 13px;
  font-family: ui-monospace, monospace;
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
.et-input-hint {
  font-size: 11px;
  color: var(--text-muted);
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

/* ── Footer ── */
.et-footer {
  border-top: 1px solid var(--border-light);
  padding: 14px 0;
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

@media (max-width: 820px) {
  .et-chat-panel { padding-left: 0; padding-top: 16px; }
  .et-sidebar { padding: 20px 0 16px; }
  .et-layout { padding: 0 clamp(16px, 4vw, 24px); height: auto; gap: 0; }
  .et-messages { height: 60vh; }
}

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
`;
