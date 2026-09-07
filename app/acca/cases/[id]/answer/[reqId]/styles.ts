// app/acca/cases/[id]/answer/[reqId]/styles.ts
//
// ONE STYLESHEET, BOTH DOORS. The standalone page and the intercepted overlay share it so the
// document itself cannot look like two different documents — only the chrome around it differs.
//
// ── THE MEASURE IS THE WHOLE POINT OF THIS CONTROL ───────────────────────────
// In the chat the reveal is boxed into a ~706px pane: `.ec-layout` is capped at `max-width:
// 1200px` with a 400px sidebar, so `.ec-msg--kind-reveal { max-width: 100% }` recovers 26px and
// nothing more (measured, and recorded in CaseSession's own comment). A worked answer with pipe
// tables and eight build steps is a DOCUMENT, and that pane is the wrong container for one.
//
// Here the measure is set for reading rather than for chatting: 78ch of prose, and tables allowed
// to run to the full width of the sheet. 78ch is above the 66–75ch typographic band on purpose —
// a worked answer is scanned as much as read, its lines are dense with figures, and a narrower
// column pushes a three-column table into horizontal scrolling on a 1280px screen.
//
// Tables get their own `overflow-x: auto` container (they already do inside `MessageRenderer`),
// so a wide one scrolls inside itself and the PAGE never scrolls sideways.

export const REVEAL_DOCUMENT_CSS = `
.rd-page {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  padding: 40px 24px 96px;
  display: flex;
  justify-content: center;
}
.rd-page *, .rd-page *::before, .rd-page *::after { box-sizing: border-box; }

/* The sheet. A document, not a bubble: white ground, one hairline, generous gutters. */
.rd {
  --chat-text: var(--text);
  --chat-border: var(--border);
  --chat-rule: #8a8172;
  --chat-accent: var(--brand);
  --chat-muted: var(--text-muted);
  --chat-surface-2: var(--surface-2);
  --chat-thead-bg: var(--surface-2);
  --chat-strong: var(--brand);
  --chat-p-lh: 1.7;

  width: 100%;
  max-width: 900px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 40px 48px 36px;
}

.rd-head { border-bottom: 1px solid var(--border-light); padding-bottom: 22px; margin-bottom: 30px; }
.rd-eyebrow { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.rd-badge {
  display: inline-block; padding: 3px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  background: var(--brand); color: #fff;
}
.rd-case { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-muted); }
.rd-title {
  font-family: var(--font-display); font-weight: 700;
  font-size: 30px; line-height: 1.2; margin: 0; color: var(--text);
}
.rd-question {
  margin: 14px 0 0; font-size: 15px; line-height: 1.6; color: var(--text-muted);
  max-width: 72ch;
}

/* The artefact. Prose is held to a reading measure; tables are not — they carry the figures and
   a squeezed table is worse than a wide one. */
.rd-body { font-size: 15px; }
.rd-body > p, .rd-body > ul, .rd-body > ol, .rd-body > blockquote { max-width: 78ch; }
.rd-body h1, .rd-body h2, .rd-body h3 { max-width: 78ch; }
.rd-body table { font-size: 14px; }

.rd-foot {
  margin-top: 34px; padding-top: 20px; border-top: 1px solid var(--border-light);
  display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap;
}
.rd-copy { margin: 0; font-size: 12px; font-style: italic; color: var(--text-muted); }
.rd-back { font-size: 13px; font-weight: 600; color: var(--brand); text-decoration: none; }
.rd-back:hover { text-decoration: underline; }

/* ── The overlay chrome (intercepted route only) ── */
.rd-overlay {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(26, 18, 8, 0.55);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 40px 24px;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.rd-overlay .rd {
  max-width: 900px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.28);
  margin: auto 0;
}
/* FIXED, not absolute. The overlay is itself the scrolling container, so an absolutely
   positioned close button scrolls away with the sheet — measured on a 1,959px document, it was
   gone by Step 3. A modal whose dismiss control leaves the screen has, in practice, no dismiss
   control: Escape and the backdrop still work, but neither is visible. */
.rd-overlay-close {
  position: fixed; top: 0; right: 0;
  margin: 14px 18px;
  z-index: 61;
  font-size: 13px; font-weight: 600; letter-spacing: 0.02em;
  color: #fff; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.3);
  border-radius: 999px; padding: 7px 15px; cursor: pointer;
  font-family: var(--font-body);
}
.rd-overlay-close:hover { background: rgba(0,0,0,0.5); }

@media (max-width: 900px) {
  .rd-page { padding: 20px 12px 64px; }
  .rd { padding: 26px 22px 24px; border-radius: 12px; }
  .rd-title { font-size: 24px; }
  .rd-overlay { padding: 16px 10px; }
}
`;
