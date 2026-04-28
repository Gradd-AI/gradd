'use client';

import MessageRenderer from '@/components/chat/MessageRenderer';
import { getDiagramPath } from '@/lib/diagram-map';
import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

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
}

export default function ChatInterface({
  studentName,
  lessonName,
  unitName,
  sessionNumber,
  lessonCode,
}: ChatInterfaceProps) {
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
        const res = await fetch('/api/session/start', { method: 'POST' });
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

  // Get first message from Aoife once session is started
  useEffect(() => {
    if (!sessionId || messages.length > 0) return;
    sendMessage('__SESSION_START__', true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

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

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }

      if (fullText.includes('[LESSON_COMPLETE:')) {
        setLessonComplete(true);
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--chat-bg)', color: 'var(--chat-text)', fontFamily: 'var(--font-body)' }}>

      {/* Header */}
      <header style={{ padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--chat-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/dashboard" style={{ color: 'var(--chat-muted)', fontSize: 20, textDecoration: 'none', lineHeight: 1 }}>←</Link>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--chat-text)' }}>{lessonName}</div>
            <div style={{ fontSize: 12, color: 'var(--chat-muted)' }}>{unitName} · Session {sessionNumber}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: 20, padding: '5px 12px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80' }} />
            <span style={{ fontSize: 13, color: 'var(--chat-text)', fontWeight: 500 }}>Aoife</span>
          </div>
          <button
            onClick={endSession}
            disabled={ending || initialising}
            style={{ background: 'transparent', border: '1px solid var(--chat-border)', borderRadius: 7, padding: '6px 14px', fontSize: 13, color: 'var(--chat-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s ease' }}
          >
            {ending ? 'Ending…' : 'End session'}
          </button>
        </div>
      </header>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>

          {/* Diagram panel — shown above first message if a diagram exists for this lesson */}
          {diagramPath && !diagramDismissed && messages.length > 0 && (
            <div
              style={{
                marginBottom: 24,
                borderRadius: 10,
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
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--chat-muted)', letterSpacing: '0.5px' }}>
                  REFERENCE DIAGRAM — {lessonName.toUpperCase()}
                </span>
                <button
                  onClick={() => setDiagramDismissed(true)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--chat-muted)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
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
                <MessageBubble message={msg} studentName={studentName} />
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
      <div style={{ borderTop: '1px solid var(--chat-border)', padding: '16px 24px', flexShrink: 0, background: 'var(--chat-bg)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {lessonComplete && !streaming ? (
            <LessonCompletePanel onContinue={continueToNextLesson} onEnd={endSession} ending={ending} />
          ) : (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={initialising ? 'Starting session…' : 'Reply to Aoife…'}
                  // WS0A: disabled covers the visual state; isSubmittingRef covers the race condition
                  disabled={loading || streaming || initialising || ended}
                  rows={1}
                  style={{ flex: 1, resize: 'none', background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: 12, padding: '12px 16px', fontSize: 15, color: 'var(--chat-text)', fontFamily: 'var(--font-body)', outline: 'none', lineHeight: 1.5, minHeight: 48, maxHeight: 160, overflowY: 'auto' }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  // WS0A: button disabled during loading OR streaming — no gap
                  disabled={loading || streaming || !input.trim() || initialising}
                  style={{ width: 48, height: 48, borderRadius: 12, border: 'none', background: streaming ? 'var(--chat-border)' : 'var(--accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s ease' }}
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
              <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--chat-muted)', marginTop: 8, opacity: 0.7 }}>
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

function LessonCompletePanel({ onContinue, onEnd, ending }: { onContinue: () => void; onEnd: () => void; ending: boolean }) {
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

function MessageBubble({ message, studentName }: { message: Message; studentName: string }) {
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
    return (
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
        <AvatarAoife />
        <div style={{ background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: '4px 16px 16px 16px', padding: '12px 16px', display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--chat-muted)', display: 'inline-block', animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5; } 30% { transform: translateY(-5px); opacity: 1; } }`}</style>
      </div>
    );
  }

  if (!displayContent) return null;

  if (isUser) {
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

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-start' }}>
      <AvatarAoife />
      <div style={{ maxWidth: '80%' }}>
        <div style={{ background: 'var(--chat-surface)', border: '1px solid var(--chat-border)', borderRadius: '4px 16px 16px 16px', padding: '14px 18px', fontSize: 15, color: 'var(--chat-text)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
          <MessageRenderer content={displayContent} />
        </div>
      </div>
    </div>
  );
}

function AvatarAoife() {
  return (
    <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand-light) 0%, var(--brand) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-display)', flexShrink: 0, marginTop: 2 }}>
      A
    </div>
  );
}