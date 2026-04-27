// components/chat/MessageRenderer.tsx
// Renders Aoife's markdown output into styled HTML.
// Handles: # ## ### headers, === headers, **bold**, *italic*,
//          --- dividers, bullet/numbered lists, paragraphs.
// No external dependencies — custom parser matching exactly what Aoife produces.

interface Props {
  content: string;
}

// Inline markdown: bold, italic
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2]) {
      parts.push(<strong key={i++} style={{ fontWeight: 700, color: 'var(--chat-text)' }}>{match[2]}</strong>);
    } else if (match[3]) {
      parts.push(<em key={i++} style={{ fontStyle: 'italic' }}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function MessageRenderer({ content }: Props) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let paraBuffer: string[] = [];

  function flushParagraph() {
    if (paraBuffer.length === 0) return;
    const text = paraBuffer.join(' ').trim();
    if (text) {
      elements.push(
        <p key={`p-${i++}`} style={{
          margin: '0 0 12px 0',
          lineHeight: 1.65,
          color: 'var(--chat-text)',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}>
          {renderInline(text)}
        </p>
      );
    }
    paraBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    // === SECTION HEADER === — Aoife uses this for stage/part labels
    if (/^={2,}.*={2,}$/.test(line.trim())) {
      flushParagraph();
      const text = line.trim().replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim();
      elements.push(
        <div key={`eq-${i++}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 20,
          marginBottom: 10,
        }}>
          <div style={{ height: 1, flex: 1, background: 'var(--chat-border)', flexShrink: 0, minWidth: 12 }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--chat-accent)',
            wordBreak: 'break-word',
            textAlign: 'center',
          }}>
            {text}
          </span>
          <div style={{ height: 1, flex: 1, background: 'var(--chat-border)', flexShrink: 0, minWidth: 12 }} />
        </div>
      );
      continue;
    }

    // H1 — session open banner
    if (/^#\s+/.test(line) && !/^##/.test(line)) {
      flushParagraph();
      const text = line.replace(/^#\s+/, '').replace(/^—\s*|\s*—$/g, '').trim();
      elements.push(
        <div key={`h1-${i++}`} style={{
          borderBottom: '1px solid var(--chat-border)',
          paddingBottom: 10,
          marginBottom: 16,
          marginTop: 4,
        }}>
          <span style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--chat-muted)',
            wordBreak: 'break-word',
          }}>
            {text}
          </span>
        </div>
      );
      continue;
    }

    // H2 — lesson heading
    if (/^##\s+/.test(line) && !/^###/.test(line)) {
      flushParagraph();
      const text = line.replace(/^##\s+/, '');
      elements.push(
        <h2 key={`h2-${i++}`} style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 700,
          color: 'var(--chat-text)',
          marginBottom: 12,
          marginTop: 16,
          letterSpacing: '-0.2px',
          lineHeight: 1.3,
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
        }}>
          {renderInline(text)}
        </h2>
      );
      continue;
    }

    // H3 — stage label
    if (/^###\s+/.test(line)) {
      flushParagraph();
      const text = line.replace(/^###\s+/, '').replace(/^—\s*|\s*—$/g, '').trim();
      elements.push(
        <div key={`h3-${i++}`} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginTop: 20,
          marginBottom: 10,
        }}>
          <div style={{ height: 1, flex: 1, background: 'var(--chat-border)', flexShrink: 0, minWidth: 12 }} />
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--chat-accent)',
            wordBreak: 'break-word',    // was nowrap — that was the overflow bug
            textAlign: 'center',
          }}>
            {text}
          </span>
          <div style={{ height: 1, flex: 1, background: 'var(--chat-border)', flexShrink: 0, minWidth: 12 }} />
        </div>
      );
      continue;
    }

    // Horizontal rule ---
    if (/^---+$/.test(line.trim())) {
      flushParagraph();
      elements.push(
        <hr key={`hr-${i++}`} style={{
          border: 'none',
          borderTop: '1px solid var(--chat-border)',
          margin: '16px 0',
        }} />
      );
      continue;
    }

    // Bullet list item
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const text = line.replace(/^[-*]\s+/, '');
      elements.push(
        <div key={`li-${i++}`} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
          <span style={{ color: 'var(--chat-accent)', flexShrink: 0, marginTop: 2, fontSize: 13 }}>›</span>
          <span style={{ color: 'var(--chat-text)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {renderInline(text)}
          </span>
        </div>
      );
      continue;
    }

    // Numbered list item
    if (/^\d+\.\s+/.test(line)) {
      flushParagraph();
      const num = line.match(/^(\d+)\./)?.[1] ?? '1';
      const text = line.replace(/^\d+\.\s+/, '');
      elements.push(
        <div key={`nl-${i++}`} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
          <span style={{ color: 'var(--chat-accent)', flexShrink: 0, fontWeight: 700, minWidth: 18, fontSize: 13 }}>
            {num}.
          </span>
          <span style={{ color: 'var(--chat-text)', lineHeight: 1.6, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
            {renderInline(text)}
          </span>
        </div>
      );
      continue;
    }

    // Empty line — flush paragraph buffer
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    // Regular text — accumulate into paragraph
    paraBuffer.push(line);
  }

  flushParagraph();

  return <>{elements}</>;
}
