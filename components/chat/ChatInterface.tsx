'use client';

import MessageRenderer from '@/components/chat/MessageRenderer';
import { getDiagramPath } from '@/lib/diagram-map';
import { DiagramRenderer } from '@/components/diagrams';
import { parseDiagramSignal, parseDynamicDiagramSignal } from '@/components/diagrams/diagram-integration';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import IBPaywallModal from '@/components/chat/IBPaywallModal';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  studentName: string;
  lessonName: string;
  unitName: string;
  sessionNumber: number;
  lessonCode?: string;
  subject?: string;
  tutorName: string;
  activeSubject?: string;
  examLabel?: string;
  pickedLessonCode?: string;
}

export default function ChatInterface({
  studentName,
  lessonName,
  unitName,
  sessionNumber,
  lessonCode,
  subject = 'LC_BUSINESS',
  tutorName,
  activeSubject,
  examLabel,
  pickedLessonCode,
}: ChatInterfaceProps) {
  const isIB = subject.startsWith('IB_');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const [ended, setEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const [diagramDismissed, setDiagramDismissed] = useState(false);
  const [showPaywall, setShowPaywall] = useState<null | 'cap' | 'burn'>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  // WS0A: Synchronous lock — prevents double-submit during the React state update gap.
  // React setState is async; this ref is read/written synchronously so no race condition.
  const isSubmittingRef = useRef(false);

  // Resolve diagram path from lessonCode
  const diagramPath = lessonCode ? getDiagramPath(lessonCode) : null;

  const scrollToLatestMessage = useCallback(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    scrollToLatestMessage();
  }, [messages.length, scrollToLatestMessage]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  // beforeunload warning — fires when student closes/navigates away mid-session
  useEffect(() => {
    if (!sessionId || ended) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sessionId, ended]);

  // Initialise session on mount
  useEffect(() => {
    async function startSession() {
      try {
        const res = await fetch('/api/session/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(activeSubject      && { activeSubject }),
            ...(pickedLessonCode   && { lessonCode: pickedLessonCode }),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setSessionId(data.sessionId);
      } catch (err: unknown) {
        setError('Failed to start session. Please refresh and try again.');
        console.error(err);
      } finally {
        setInitialising(false);
      }
    }
    startSession();
  }, []);

  // Get first message from tutor once session is started
  useEffect(() => {
    if (!sessionId || messages.length > 0) return;
    sendMessage('__SESSION_START__', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function handleDiagramUpload(base64: string, mimeType: string) {
    if (isSubmittingRef.current || !sessionId || loading || streaming) return;
    isSubmittingRef.current = true;

    setMessages(prev => [
      ...prev,
      { role: 'user', content: '📷 Diagram uploaded for evaluation' },
      { role: 'assistant', content: '' },
    ]);
    setStreaming(true);
    setLoading(true);
    setError('');

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/session/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, content: '__DIAGRAM_EVALUATION__', diagramImage: { base64, mimeType } }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to evaluate diagram');
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError('Something went wrong evaluating the diagram. Please try again.');
        setMessages(prev => prev.slice(0, -2));
      }
    } finally {
      isSubmittingRef.current = false;
      setStreaming(false);
      setLoading(false);
    }
  }

  async function sendMessage(text: string, isInitial = false) {
    // WS0A: Check synchronous ref FIRST — catches rapid double-submits before
    // React state (loading/streaming) has had a chance to propagate.
    if (isSubmittingRef.current) return;
    if (!sessionId || loading || streaming) return;
    if (!isInitial && !text.trim()) return;

    // WS0A: Set the lock synchronously — no await, no state update delay.
    isSubmittingRef.current = true;

    const userMessage = isInitial ? '' : text.trim();

    if (!isInitial) {
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      setInput('');
    }

    setStreaming(true);
    setLoading(true);
    setError('');
    setLessonComplete(false);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/session/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          studentMessage: isInitial
            ? `[SESSION_OPEN] Begin the session now. Teach ${lessonCode ?? 'the current lesson'} from the start.`
            : userMessage,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to get response');
      }

      // Free-tier cap: backend returns JSON { paywall: true } instead of a stream when the cap is hit.
      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => ({}));
        if (data.paywall) {
          setShowPaywall('cap');
          setLoading(false);
          setStreaming(false);
          return;
        }
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Hide signal tokens while streaming so they never flash on screen.
        // Strips COMPLETE signal tokens, and also any TRAILING partial signal whose
        // closing ] hasn't streamed in yet. Matches only known signal names -- never
        // touches mark allocations like [4 marks] or ordinary brackets.
        const SIGNAL_NAMES = 'BURN_WALL|TEACH_BACK|WEAK_AREA_FLAG|LESSON_COMPLETE|LESSON_INCOMPLETE|UNIT_COMPLETE|SESSION_SUMMARY|SESSION_FLAG';
        const streamDisplay = fullText
          .replace(new RegExp(`\\[(?:${SIGNAL_NAMES})(?::[^\\]]*)?\\]`, 'g'), '')
          .replace(new RegExp(`\\[(?:${SIGNAL_NAMES})(?::[^\\]]*)?$`), '')
          .trimStart();
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: streamDisplay };
          return updated;
        });
      }

      if (fullText.includes('[LESSON_COMPLETE:')) {
        setLessonComplete(true);
      }

      // Burn: the cap walled a teach-through. Mia streamed the diagnosis hook
      // (visible), then [BURN_WALL] (stripped from display). Pop the paywall over
      // the hook — the unresolved teach-through is the conversion moment.
      if (fullText.includes('[BURN_WALL]')) {
        setShowPaywall('burn');
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError('Something went wrong. Please try again.');
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      // WS0A: Release the lock only after stream is fully complete and state is updated.
      // This is the correct moment — both streaming and loading cleared together.
      isSubmittingRef.current = false;
      setStreaming(false);
      setLoading(false);
    }
  }

  async function continueToNextLesson() {
    setLessonComplete(false);
    await sendMessage('Continue to the next lesson.');
  }

  async function endSession() {
    if (!sessionId || ending) return;
    setEnding(true);
    abortRef.current?.abort();
    try {
      await fetch('/api/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.error('Session complete error:', err);
    } finally {
      setEnded(true);
      setEnding(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (ended) {
    if (isIB) {
      return (
        <div style={{
          minHeight: '100vh',
          background: 'oklch(96.2% 0.012 78)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 20, padding: 32,
        }}>
          <div style={{
            width: 64, height: 64,
            background: 'oklch(22% 0.035 168)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
              <path d="M2 11L10 19L26 3" stroke="oklch(70% 0.14 75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 style={{ fontFamily: '"Fraunces","Times New Roman",Georgia,serif', fontSize: 26, fontWeight: 400, fontStyle: 'italic', color: 'oklch(22% 0.035 168)', textAlign: 'center', letterSpacing: '-0.02em', margin: 0 }}>
            Session saved
          </h2>
          <p style={{ color: 'oklch(54% 0.012 60)', textAlign: 'center', maxWidth: 340, fontFamily: '"Geist",ui-sans-serif,system-ui,sans-serif', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Your progress has been recorded. Well done, {studentName}.
          </p>
          <Link href="/dashboard" style={{ background: 'oklch(64% 0.17 47)', color: 'oklch(98% 0.01 70)', padding: '12px 28px', borderRadius: 10, fontWeight: 500, fontSize: 15, textDecoration: 'none', marginTop: 8, fontFamily: '"Geist",ui-sans-serif,system-ui,sans-serif' }}>
            Back to dashboard
          </Link>
          <button onClick={() => { window.location.href = '/session'; }} style={{ background: 'oklch(22% 0.035 168)', color: 'oklch(94% 0.025 80)', padding: '12px 28px', borderRadius: 10, fontWeight: 500, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: '"Geist",ui-sans-serif,system-ui,sans-serif' }}>
            Continue learning →
          </button>
        </div>
      );
    }
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--chat-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 20,
          padding: 32,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            background: 'var(--brand-light)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="28" height="22" viewBox="0 0 28 22" fill="none">
            <path d="M2 11L10 19L26 3" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--chat-text)', textAlign: 'center' }}>
          Session saved
        </h2>
        <p style={{ color: 'var(--chat-muted)', textAlign: 'center', maxWidth: 340 }}>
          Your progress has been recorded. Well done, {studentName}.
        </p>
        <Link href="/dashboard" style={{ background: 'var(--accent)', color: '#fff', padding: '13px 28px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', marginTop: 8 }}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className={isIB ? 'ib-session' : ''} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--chat-bg)', color: 'var(--chat-text)', fontFamily: 'var(--font-body)' }}>
      {showPaywall && (
        <IBPaywallModal
          subject={activeSubject ?? subject ?? 'IB_ECONOMICS'}
          reason={showPaywall}
          onClose={() => { setShowPaywall(null); setLoading(false); setStreaming(false); }}
        />
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

        /* ── LC session (unchanged) ── */
        .tutor-message-row { display: flex; align-items: flex-start; }
        .tutor-message-bubble { display: flex; gap: 12px; align-items: flex-start; position: relative; max-width: 92%; }
        .session-header {
          padding: 0 24px; height: 60px;
          display: flex; flex-direction: row; align-items: center; justify-content: space-between;
        }
        .session-header-row1 { display: flex; align-items: center; gap: 12px; }
        .session-header-left  { display: flex; align-items: center; }
        .session-header-centre { display: flex; align-items: center; }
        .session-header-right  { display: flex; align-items: center; }
        .session-header-row2 { font-size: 13px; font-weight: 600; color: var(--chat-text); }
        .session-subtitle { font-size: 12px; color: var(--chat-muted); }
        .session-logo { height: 28px; width: auto; max-width: 110px; display: block; }
        .end-session-btn {
          background: transparent; border: 1px solid var(--chat-border); border-radius: 7px;
          padding: 6px 14px; font-size: 13px; color: var(--chat-muted);
          cursor: pointer; font-family: var(--font-body); transition: all 0.15s ease;
        }
        @keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-5px); opacity: 1; } }
        @media (max-width: 480px) {
          .session-header { display: flex; flex-direction: column; padding: 8px 12px; gap: 4px; min-height: 56px; height: auto; }
          .session-header-row1 { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; width: 100%; }
          .session-header-left  { display: flex; justify-content: flex-start; }
          .session-header-centre { display: flex; justify-content: center; }
          .session-header-right  { display: flex; justify-content: flex-end; }
          .session-header-row2 { text-align: center; font-size: 11px; color: var(--chat-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; }
          .session-subtitle { display: none; }
          .session-logo { height: 20px; }
          .end-session-btn { font-size: 11px; padding: 5px 8px; }
          .tutor-message-bubble { display: block; padding-top: 28px; max-width: 96%; }
          .tutor-avatar { position: absolute; top: -12px; left: 12px; width: 24px; height: 24px; font-size: 11px; }
          .tutor-message-row { gap: 0; }
          .chat-messages-container { scrollbar-width: none; -ms-overflow-style: none; }
          .chat-messages-container::-webkit-scrollbar { display: none; }
        }

      `}</style>

      {/* Header — sticky so End session is always visible regardless of scroll position */}
      <header className="session-header" style={{ borderBottom: '1px solid var(--chat-border)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50, background: 'var(--chat-bg)' }}>
        {/* Row 1: logo (left) · Mia indicator (centre) · End session (right) */}
        <div className="session-header-row1">
          <div className="session-header-left">
            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", textDecoration: "none" }}>
              <img src={isIB ? '/gradd-ai-logo.png' : '/gradd-logo.svg'} alt="Gradd" className="session-logo" />
            </Link>
          </div>
          <div className="session-header-centre">
            {isIB ? (
              <div className="ib-live-pill">
                <div className="ib-live-dot" />
                <span>{tutorName}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: 20, padding: '5px 12px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: 13, color: 'var(--chat-text)', fontWeight: 500 }}>{tutorName}</span>
              </div>
            )}
          </div>
          <div className="session-header-right">
            <button
              className="end-session-btn"
              onClick={endSession}
              disabled={ending || initialising}
            >
              {ending ? 'Ending…' : 'End session'}
            </button>
          </div>
        </div>
        {/* Row 2: lesson title centred */}
        <div className="session-header-row2">
          {lessonName}
          <span className="session-subtitle"> · {examLabel ?? unitName} · Session {sessionNumber}</span>
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages-container" style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>

          {/* Diagram panel — shown above first message if a diagram exists for this lesson */}
          {diagramPath && !diagramDismissed && messages.length > 0 && (
            <div
              style={{
                marginBottom: 24,
                borderRadius: isIB ? 12 : 10,
                border: '1px solid var(--chat-border)',
                background: 'var(--chat-surface)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--chat-border)',
                }}
              >
                <span style={{ fontSize: isIB ? 11 : 12, fontWeight: 600, color: 'var(--chat-muted)', letterSpacing: isIB ? '0.08em' : '0.5px', fontFamily: isIB ? 'var(--mono)' : undefined, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 'calc(100% - 60px)' }}>
                  REFERENCE DIAGRAM — {lessonName.toUpperCase()}
                </span>
                <button
                  onClick={() => setDiagramDismissed(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--chat-muted)', fontSize: 16, lineHeight: 1, padding: '12px', minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  aria-label="Dismiss diagram"
                >
                  ×
                </button>
              </div>
              <div style={{ padding: '16px', overflowX: 'auto' }}>
                <img
                  src={diagramPath}
                  alt={`Reference diagram for ${lessonName}`}
                  style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            </div>
          )}

          {initialising && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'var(--chat-muted)', fontSize: 14 }}>
                <span className="spinner" style={{ borderColor: 'var(--chat-muted)', borderTopColor: 'transparent' }} />
                Starting session…
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            const isLastMsg = i === messages.length - 1;
            return (
              <div key={i} ref={isLastMsg ? lastMessageRef : undefined}>
                <MessageBubble message={msg} studentName={studentName} tutorInitial={tutorName[0]} isIB={isIB} />
              </div>
            );
          })}

          {error && (
            <div style={{ background: 'rgba(192, 57, 43, 0.12)', border: '1px solid rgba(192, 57, 43, 0.3)', borderRadius: 8, padding: '10px 16px', fontSize: 14, color: '#e07070', marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div
        className={isIB ? 'ib-input-bar' : ''}
        style={isIB ? undefined : { borderTop: '1px solid var(--chat-border)', padding: '16px 24px', flexShrink: 0, background: 'var(--chat-bg)' }}
      >
        <div style={isIB ? undefined : { maxWidth: 760, margin: '0 auto' }}>

          {lessonComplete && !streaming ? (
            <LessonCompletePanel onContinue={continueToNextLesson} onEnd={endSession} ending={ending} isIB={isIB} />
          ) : (
            <>
              <div
                className={isIB ? 'ib-input-inner' : ''}
                style={isIB ? undefined : { display: 'flex', gap: 10, alignItems: 'flex-end' }}
              >
                {isIB && (
                  <DiagramUploadButton onUpload={handleDiagramUpload} disabled={loading || streaming || initialising} isIB />
                )}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={initialising ? 'Starting session…' : `Reply to ${tutorName}…`}
                  // WS0A: disabled covers the visual state; isSubmittingRef covers the race condition
                  disabled={loading || streaming || initialising || ended}
                  rows={1}
                  className={isIB ? 'ib-textarea' : ''}
                  style={isIB ? undefined : { flex: 1, resize: 'none', background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: 'var(--chat-text)', fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.5, minHeight: 48, maxHeight: 160, overflowY: 'auto' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  // WS0A: button disabled during loading OR streaming — no gap
                  disabled={loading || streaming || !input.trim() || initialising}
                  className={isIB ? 'ib-send-btn' : ''}
                  style={isIB ? undefined : { width: 48, height: 48, borderRadius: 12, border: 'none', background: streaming ? 'var(--chat-border)' : 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s ease' }}
                >
                  {streaming ? (
                    <span className="spinner" style={{ borderColor: '#fff', borderTopColor: 'transparent', width: 18, height: 18 }} />
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M16 2L2 8.5L9 9.5M16 2L10.5 16L9 9.5M16 2L9 9.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
              <p
                className={isIB ? 'ib-input-hint' : ''}
                style={isIB ? undefined : { textAlign: 'center', fontSize: 11, color: 'var(--chat-muted)', marginTop: 8, opacity: 0.7 }}
              >
                Enter to send · Shift+Enter for new line
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Lesson complete panel ---

function LessonCompletePanel({ onContinue, onEnd, ending, isIB }: { onContinue: () => void; onEnd: () => void; ending: boolean; isIB?: boolean }) {
  if (isIB) {
    return (
      <div className="ib-lesson-complete">
        <div className="ib-lcp-row">
          <div className="ib-lcp-icon">
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
              <path d="M1 5.5L5 9.5L13 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div className="ib-lcp-heading">Lesson complete</div>
            <div className="ib-lcp-sub">Your progress has been saved automatically.</div>
          </div>
        </div>
        <div className="ib-lcp-actions">
          <button onClick={onContinue} className="ib-lcp-btn-continue">Continue to next lesson →</button>
          <button onClick={onEnd} disabled={ending} className="ib-lcp-btn-end">
            {ending ? 'Saving…' : 'End session & save progress'}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--chat-border)', background: 'var(--chat-surface)', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <path d="M1 5.5L5 9.5L13 1.5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--chat-text)', fontFamily: 'var(--font-display)' }}>Lesson complete</div>
          <div style={{ fontSize: 12, color: 'var(--chat-muted)', marginTop: 1 }}>Your progress has been saved automatically.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onContinue} style={{ flex: 1, padding: '11px 16px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Continue to next lesson →
        </button>
        <button onClick={onEnd} disabled={ending} style={{ flex: 1, padding: '11px 16px', borderRadius: 9, border: '1px solid var(--chat-border)', background: 'transparent', color: 'var(--chat-muted)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          {ending ? 'Saving…' : 'End session & save progress'}
        </button>
      </div>
    </div>
  );
}

// --- MessageBubble ---

function MessageBubble({ message, studentName, tutorInitial, isIB }: { message: Message; studentName: string; tutorInitial: string; isIB?: boolean }) {
  const isUser = message.role === 'user';

  const displayContent = message.content
    .replace(/\[SESSION_SUMMARY:[^\]]+\]/g, '')
    .replace(/\[LESSON_COMPLETE:[^\]]+\]/g, '')
    .replace(/\[LESSON_INCOMPLETE:[^\]]+\]/g, '')
    .replace(/\[UNIT_COMPLETE:[^\]]+\]/g, '')
    .replace(/\[WEAK_AREA_FLAG:[^\]]+\]/g, '')
    .replace(/\[SESSION_FLAG:[^\]]+\]/g, '')
    .trim();

  if (!displayContent && message.role === 'assistant') {
    if (isIB) {
      return (
        <div className="ib-chat-row-tutor">
          <div className="ib-avatar-tutor">{tutorInitial}</div>
          <div className="ib-loading-dots">
            {[0, 1, 2].map(i => (
              <span key={i} className="ib-dot" style={{ animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }} />
            ))}
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
        <AvatarTutor initial={tutorInitial} />
        <div style={{ background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--chat-muted)', display: 'inline-block', animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!displayContent) return null;

  if (isUser) {
    if (isIB) {
      return (
        <div className="ib-chat-row-user">
          <div className="ib-user-bubble">{displayContent}</div>
          <div className="ib-avatar-user">{studentName[0]?.toUpperCase()}</div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 10, alignItems: 'flex-end' }}>
        <div style={{ maxWidth: '72%', background: 'var(--brand-mid)', borderRadius: '16px 4px 16px 16px', padding: '12px 16px', fontSize: 15, color: '#fff', lineHeight: 1.55 }}>
          {displayContent}
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
          {studentName[0]?.toUpperCase()}
        </div>
      </div>
    );
  }

  if (isIB) {
    return (
      <div className="ib-chat-row-tutor">
        <div className="ib-avatar-tutor">{tutorInitial}</div>
        <div className="ib-mia-content">
          <MessageContent content={displayContent} />
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-message-row" style={{ marginBottom: 20 }}>
      <div className="tutor-message-bubble">
        <AvatarTutor initial={tutorInitial} className="tutor-avatar" />
        <div style={{ background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', fontSize: 15, color: 'var(--chat-text)', lineHeight: 1.65 }}>
          <MessageContent content={displayContent} />
        </div>
      </div>
    </div>
  );
}

function AvatarTutor({ initial, className }: { initial: string; className?: string }) {
  return (
    <div className={className} style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', flexShrink: 0, marginTop: 2 }}>
      {initial}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const { cleanText, diagramCode } = parseDiagramSignal(content);
  const { cleanText: finalText, dynamicPrompt } = parseDynamicDiagramSignal(cleanText);
  return (
    <>
      {finalText && <MessageRenderer content={finalText} />}
      {diagramCode && <DiagramRenderer code={diagramCode} />}
      {dynamicPrompt && <DynamicDiagramRenderer prompt={dynamicPrompt} />}
    </>
  );
}

function DynamicDiagramRenderer({ prompt }: { prompt: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function generate() {
      try {
        const res = await fetch('/api/diagram/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!cancelled) setSvg(data.svg ?? null);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    generate();
    return () => { cancelled = true; };
  }, [prompt]);

  // Strip fixed pixel dimensions from injected SVG so it scales with the container.
  // Belt-and-braces: the generate prompt requests width="100%", but we enforce it here too.
  useEffect(() => {
    if (!containerRef.current || !svg) return;
    const svgEl = containerRef.current.querySelector('svg');
    if (!svgEl) return;
    svgEl.removeAttribute('width');
    svgEl.removeAttribute('height');
    svgEl.style.maxWidth = '100%';
    svgEl.style.height = 'auto';
    svgEl.style.display = 'block';
  }, [svg]);

  if (loading) return (
    <div style={{ padding: '12px 0', color: 'var(--chat-muted)', fontSize: 12 }}>Generating diagram…</div>
  );
  if (error || !svg) return null;
  return (
    <div style={{ margin: '12px 0', padding: 16, background: 'var(--chat-surface)', borderRadius: 8, border: '1px solid var(--chat-border)', maxWidth: 560, overflow: 'hidden' }}>
      <div ref={containerRef} style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  );
}

function DiagramUploadButton({ onUpload, disabled, isIB }: { onUpload: (base64: string, mimeType: string) => void; disabled?: boolean; isIB?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const [header, base64] = result.split(',');
      const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
      onUpload(base64, mimeType);
    };
    reader.readAsDataURL(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Upload your diagram for feedback"
        className={isIB ? 'ib-attach-btn' : ''}
        style={isIB ? undefined : {
          background: 'transparent',
          border: '1px solid var(--chat-border)',
          borderRadius: 10,
          width: 48,
          height: 48,
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--chat-muted)',
          fontSize: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          opacity: disabled ? 0.4 : 1,
          transition: 'all 0.15s',
        }}
      >
        {isIB ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M3 7h3l1.7-2.5A1 1 0 0 1 8.5 4h7a1 1 0 0 1 .8.5L18 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
            <circle cx="12" cy="13" r="3.6" />
          </svg>
        ) : '📷'}
      </button>
    </>
  );
}
