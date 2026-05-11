// ─── Diagram Integration for ChatInterface ────────────────────────────────────
// Drop this into ChatInterface.tsx:
// 1. Import DiagramRenderer and parseDiagramSignal
// 2. Replace message text rendering with renderMessageContent()
// 3. Add <DiagramUploadButton> to the input area
// 4. Add the upload handler to the session message handler

// ─── PART 1: Signal parser ────────────────────────────────────────────────────
// Add to ChatInterface.tsx — import this at the top of the file

/**
 * Parses [DIAGRAM: CODE] signals from message text.
 * Returns { cleanText, diagramCode } where cleanText has the signal stripped.
 */
export function parseDiagramSignal(text: string): {
  cleanText: string;
  diagramCode: string | null;
} {
  const match = text.match(/\[DIAGRAM:\s*([A-Z_0-9]+)\s*\]/);
  if (!match) return { cleanText: text, diagramCode: null };
  return {
    cleanText: text.replace(match[0], '').trim(),
    diagramCode: match[1],
  };
}

/**
 * Parses [DIAGRAM_DYNAMIC: <description>] for fallback dynamic diagrams.
 */
export function parseDynamicDiagramSignal(text: string): {
  cleanText: string;
  dynamicPrompt: string | null;
} {
  const match = text.match(/\[DIAGRAM_DYNAMIC:\s*([^\]]+)\]/);
  if (!match) return { cleanText: text, dynamicPrompt: null };
  return {
    cleanText: text.replace(match[0], '').trim(),
    dynamicPrompt: match[1].trim(),
  };
}


// ─── PART 2: Message renderer ─────────────────────────────────────────────────
// Replace the plain text render in ChatInterface with this.
// Import DiagramRenderer from '@/components/diagrams'

/*
EXISTING CODE (before change) — find the message bubble render:
  <div className="message-text">{message.content}</div>

REPLACE WITH:
  <MessageContent content={message.content} />

Then add this component to ChatInterface.tsx:
*/

// MessageContent component — add to ChatInterface.tsx
// import { DiagramRenderer } from '@/components/diagrams';
// import { parseDiagramSignal, parseDynamicDiagramSignal } from './diagram-integration';

/*
function MessageContent({ content }: { content: string }) {
  const { cleanText, diagramCode } = parseDiagramSignal(content);
  const { cleanText: finalText, dynamicPrompt } = parseDynamicDiagramSignal(cleanText);

  return (
    <>
      {finalText && <span style={{ whiteSpace: 'pre-wrap' }}>{finalText}</span>}
      {diagramCode && <DiagramRenderer code={diagramCode} />}
      {dynamicPrompt && <DynamicDiagramRenderer prompt={dynamicPrompt} />}
    </>
  );
}
*/


// ─── PART 3: Dynamic diagram renderer ────────────────────────────────────────
// Calls the API to generate an SVG for diagram types not in the library.

/*
function DynamicDiagramRenderer({ prompt }: { prompt: string }) {
  const [svg, setSvg] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    async function generate() {
      try {
        const res = await fetch('/api/diagram/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        setSvg(data.svg);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    generate();
  }, [prompt]);

  if (loading) return (
    <div style={{ padding: 16, color: 'var(--chat-muted)', fontSize: 12 }}>
      Generating diagram...
    </div>
  );
  if (error || !svg) return null;

  return (
    <div
      style={{
        margin: '12px 0',
        padding: '16px',
        background: 'var(--chat-surface, rgba(255,255,255,0.04))',
        borderRadius: 8,
        border: '1px solid var(--chat-border, rgba(255,255,255,0.08))',
        maxWidth: 560,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
*/


// ─── PART 4: Upload button component ─────────────────────────────────────────
// Add <DiagramUploadButton onUpload={handleDiagramUpload} /> to the ChatInterface input area.

/*
function DiagramUploadButton({ onUpload }: { onUpload: (base64: string, mimeType: string) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null);

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
        capture="environment"
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
        title="Upload your diagram for feedback"
        style={{
          background: 'transparent',
          border: '1px solid var(--chat-border, rgba(255,255,255,0.15))',
          borderRadius: 8,
          padding: '8px 10px',
          cursor: 'pointer',
          color: 'var(--chat-muted)',
          fontSize: 18,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--brand, #2d5a3d)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--brand, #2d5a3d)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--chat-border, rgba(255,255,255,0.15))';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--chat-muted)';
        }}
      >
        📷
      </button>
    </>
  );
}
*/


// ─── PART 5: Upload handler ───────────────────────────────────────────────────
// Add to ChatInterface — call this when the user uploads an image.

/*
async function handleDiagramUpload(base64: string, mimeType: string) {
  // Show a loading message in the chat
  const uploadingMsg: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: '[Diagram uploaded for evaluation]',
    type: 'image_upload',
  };
  setMessages(prev => [...prev, uploadingMsg]);

  // Send to the session message API with the image
  const res = await fetch('/api/session/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId,
      content: '__DIAGRAM_EVALUATION__',
      diagramImage: { base64, mimeType },
    }),
  });

  // Handle streaming response as normal
  // (same as text message handling)
}
*/


// ─── PART 6: Session message API changes ──────────────────────────────────────
// In app/api/session/message/route.ts — add diagram evaluation handling.

/*
// After parsing the request body, check for diagram image:
const { content, sessionId, diagramImage } = await request.json();

if (content === '__DIAGRAM_EVALUATION__' && diagramImage) {
  // Build evaluation prompt
  const evalPrompt = `
The student has uploaded a photograph of a hand-drawn diagram for evaluation.
Current lesson: ${progress.current_lesson_name}
Subject: ${effectiveSubject}

Evaluate the student's diagram against IB marking criteria:
1. Are the axes correctly labelled?
2. Are curves/lines the correct shape?
3. Are labels, arrows, and key points present?
4. Is the diagram complete for what was taught?
5. What specific improvements are needed?

Give specific, actionable feedback. Reference exact IB marking criteria.
Be encouraging but precise about errors.
`.trim();

  // Switch to claude-sonnet-4-6 for vision
  const evalResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    system: injectedSystemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: diagramImage.mimeType,
              data: diagramImage.base64,
            },
          },
          { type: 'text', text: evalPrompt },
        ],
      },
    ],
  });

  // Stream the evaluation response back
  // ... (use same streaming pattern as text messages)
}
*/


// ─── PART 7: Dynamic diagram generation API route ─────────────────────────────
// Create: app/api/diagram/generate/route.ts

/*
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request: Request) {
  const { prompt } = await request.json();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Create a clean, exam-standard SVG diagram for IB Economics or Business Management.

Diagram description: ${prompt}

Rules:
- Output ONLY the SVG element, nothing else — no markdown, no explanation
- viewBox="0 0 500 400" (adjust height as needed)
- Use these colors: axes/text=#e8e0d0, brand/positive=#2d5a3d, blue=#2980b9, red=#c0392b, amber=#c9903a, muted=#9a9080
- fontFamily="Georgia, serif" throughout
- No external dependencies — pure SVG
- Include clear labels on all axes, curves, and key points
- Match IBO examination standard diagram conventions exactly`,
    }],
  });

  const svgContent = response.content[0].type === 'text' ? response.content[0].text : '';
  const svgMatch = svgContent.match(/<svg[\s\S]*<\/svg>/);
  const svg = svgMatch ? svgMatch[0] : '';

  return NextResponse.json({ svg });
}
*/
