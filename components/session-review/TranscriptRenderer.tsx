'use client';

import MessageRenderer from '@/components/chat/MessageRenderer';
import { DiagramRenderer, getDiagram } from '@/components/diagrams';
import { parseDiagramSignal, parseDynamicDiagramSignal } from '@/components/diagrams/diagram-integration';
import { stripSignals } from '@/lib/signal-parser';

export interface TranscriptMessage {
  id: string;
  role: string;
  content: string;
  turn_index: number;
}

interface TranscriptRendererProps {
  messages: TranscriptMessage[];
  studentName: string;
  tutorName?: string;
}

function TurnBubble({
  message,
  studentInitial,
  tutorInitial,
}: {
  message: TranscriptMessage;
  studentInitial: string;
  tutorInitial: string;
}) {
  const isUser = message.role === 'user';

  // Critical order per spec:
  // 1. parseDiagramSignal → extract [DIAGRAM: CODE] for re-render
  // 2. parseDynamicDiagramSignal → capture [DIAGRAM_DYNAMIC: ...] for placeholder (no re-generation)
  // 3. stripSignals → remove all remaining machine tokens
  const { cleanText: afterDiagram, diagramCode } = parseDiagramSignal(message.content);
  const { cleanText: afterDynamic, dynamicPrompt } = parseDynamicDiagramSignal(afterDiagram);
  const displayText = stripSignals(afterDynamic);

  if (isUser) {
    if (!displayText) return null;
    return (
      <div className="ib-chat-row-user">
        <div className="ib-user-bubble">{displayText}</div>
        <div className="ib-avatar-user">{studentInitial}</div>
      </div>
    );
  }

  // Assistant / tutor turn — skip if nothing to show
  if (!displayText && !diagramCode && !dynamicPrompt) return null;

  return (
    <div className="ib-chat-row-tutor">
      <div className="ib-avatar-tutor">{tutorInitial}</div>
      <div className="ib-mia-content">
        {displayText && <MessageRenderer content={displayText} />}
        {diagramCode && getDiagram(diagramCode) && (
          <div style={{ margin: '16px 0', maxWidth: 520 }}>
            <DiagramRenderer code={diagramCode} />
          </div>
        )}
        {/* DIAGRAM_DYNAMIC: not re-generated in read-only review — show a muted placeholder */}
        {dynamicPrompt && (
          <span style={{
            display: 'inline-block',
            marginTop: 8,
            padding: '3px 8px',
            borderRadius: 4,
            background: 'var(--paper-2, oklch(93.5% 0.015 78))',
            border: '1px solid var(--rule, oklch(88% 0.01 78))',
            fontFamily: 'var(--mono, "Geist Mono",ui-monospace,monospace)',
            fontSize: 11,
            color: 'var(--ink-3, oklch(54% 0.012 60))',
            letterSpacing: '0.05em',
          }}>
            [diagram]
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Standalone, self-contained transcript renderer.
 * Renders a session's messages in the same bubble style as the live chat.
 * No input, no streaming — pure read-only. Designed to be reused for PDF export.
 *
 * Signal processing per turn (in order):
 *   parseDiagramSignal → parseDynamicDiagramSignal → stripSignals
 */
export default function TranscriptRenderer({
  messages,
  studentName,
  tutorName = 'Mia',
}: TranscriptRendererProps) {
  const studentInitial = (studentName[0] ?? 'S').toUpperCase();
  const tutorInitial   = (tutorName[0]   ?? 'M').toUpperCase();

  if (messages.length === 0) {
    return (
      <p style={{ fontFamily: 'var(--sans, "Geist",ui-sans-serif,system-ui,sans-serif)', fontSize: 14, color: 'var(--ink-3, oklch(54% 0.012 60))', textAlign: 'center', padding: '40px 0' }}>
        No messages found for this session.
      </p>
    );
  }

  return (
    <div className="ib-session" style={{ background: 'transparent' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {messages.map(msg => (
          <TurnBubble
            key={msg.id}
            message={msg}
            studentInitial={studentInitial}
            tutorInitial={tutorInitial}
          />
        ))}
      </div>
    </div>
  );
}
