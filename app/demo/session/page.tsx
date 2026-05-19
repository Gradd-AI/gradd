'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import MessageRenderer from '@/components/chat/MessageRenderer';
import { DiagramRenderer } from '@/components/diagrams';
import { parseDiagramSignal } from '@/components/diagrams/diagram-integration';

// ─── Scripted exchange ────────────────────────────────────────────────────────

type Role = 'tutor' | 'student';
interface ScriptMsg { role: Role; content: string; }

const SCRIPT: ScriptMsg[] = [
  {
    role: 'tutor',
    content: `## Demand — Shifts and Determinants

Welcome back, Alex. Today we're building on the demand curve work from last session.

You know the curve slopes downward — price rises, quantity demanded falls. That's a *movement along* the curve. But the whole curve can also move.

[DIAGRAM:DEMAND_CURVE]

This is the baseline. Everything except price is held constant — *ceteris paribus*.

The question driving today's session: **what causes the entire demand curve to shift left or right?**

What do you think? Take a guess at one factor that could move the whole curve.`,
  },
  {
    role: 'student',
    content: `Income? If people earn more they can afford more of most things.`,
  },
  {
    role: 'tutor',
    content: `Exactly right — income is one of the five non-price determinants of demand.

When income rises, consumers can afford more at *every* price point. The whole curve shifts **rightward** — a demand increase.

[DIAGRAM:DEMAND_SHIFT]

The curve moves from D₁ to D₂. At the same price, quantity demanded is now higher.

The five determinants to know for IB:

- **Income** — higher income → rightward shift (for normal goods)
- **Prices of related goods** — substitutes and complements work in opposite directions
- **Tastes and preferences** — advertising, trends, health campaigns
- **Expectations** — expected price rises → buy now → demand rises today
- **Demographics** — larger population → more buyers → rightward shift

Let's test one. Coffee and tea are substitutes. If the price of coffee rises sharply — what happens to the demand curve for tea?`,
  },
  {
    role: 'student',
    content: `People switch to tea so demand for tea goes up — shifts right?`,
  },
  {
    role: 'tutor',
    content: `*Correct.* And that's the full IB chain of reasoning:

*Price of a substitute rises → consumers switch to the cheaper alternative → demand for the good increases → rightward shift.*

Now the opposite. Petrol and cars are **complements** — you need both together. If the price of petrol doubles, what happens to the demand curve for cars?`,
  },
  {
    role: 'student',
    content: `If petrol's more expensive, owning a car costs more overall… demand for cars falls. Shifts left?`,
  },
  {
    role: 'tutor',
    content: `**Yes — full marks.**

*Price of a complement rises → combined cost of consumption rises → demand for the good falls → leftward shift.*

One more. If consumers believe laptop prices will fall significantly next month — what happens to current demand for laptops?`,
  },
  {
    role: 'student',
    content: `They'd wait and buy next month instead — current demand drops.`,
  },
  {
    role: 'tutor',
    content: `**Exactly.**

*Expected price fall → consumers delay purchases → current demand decreases → leftward shift.*

The reverse also holds: expected price rises trigger a surge in current demand — the reason supermarkets see panic-buying before a budget announcement.

=== QUICK CHECK ===

A government bans advertising for sugary drinks. What happens to the demand curve for sugary drinks, and why? What labels go on each axis for a standard IB diagram?`,
  },
  {
    role: 'student',
    content: `Shifts left — tastes change, people want them less without the ads. Price on the vertical axis, quantity demanded on the horizontal.`,
  },
  {
    role: 'tutor',
    content: `**That is a full-mark IB answer.**

**Direction:** leftward shift ✓
**Cause:** change in tastes and preferences — advertising ban reduces consumer desire ✓
**Axes:** Price (P) on vertical, Quantity Demanded (QD) on horizontal ✓

*In Paper 1 you'd also label the curves D₁ and D₂ and mark Q₁ and Q₂ on the horizontal axis to show the fall in equilibrium quantity. We'll practise the full annotated diagram next session.*

**Today's three takeaways:**

- Movement *along* the demand curve → caused only by the good's own price changing
- *Shift* of the demand curve → caused by any non-price determinant (income, related prices, tastes, expectations, demographics)
- Rightward = demand increase. Leftward = demand decrease.

Strong session, Alex. Every case correct today.`,
  },
];

// ─── .ib-session CSS (trimmed — input bar and LCP panel omitted) ──────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

.session-header {
  padding: 0 24px; height: 60px;
  display: flex; flex-direction: row; align-items: center; justify-content: space-between;
}
.session-header-row1 { display: flex; align-items: center; gap: 12px; }
.session-header-left  { display: flex; align-items: center; }
.session-header-centre { display: flex; align-items: center; }
.session-header-right  { display: flex; align-items: center; }
.session-header-row2 { font-size: 13px; font-weight: 600; }
.session-subtitle { font-size: 12px; }
.session-logo { height: 28px; width: auto; max-width: 110px; display: block; }
@keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-5px);opacity:1} }

.ib-session {
  --paper:         oklch(96.2% 0.012 78);
  --paper-2:       oklch(93.5% 0.015 78);
  --paper-3:       oklch(89% 0.018 78);
  --ink:           oklch(18% 0.012 60);
  --ink-2:         oklch(34% 0.012 60);
  --ink-3:         oklch(54% 0.012 60);
  --rule:          oklch(86% 0.014 78);
  --rule-strong:   oklch(74% 0.018 78);
  --forest:        oklch(22% 0.035 168);
  --forest-2:      oklch(28% 0.04 168);
  --forest-deep:   oklch(16% 0.028 168);
  --forest-ink:    oklch(94% 0.025 80);
  --forest-ink-2:  oklch(78% 0.025 75);
  --rust:          oklch(64% 0.17 47);
  --rust-2:        oklch(58% 0.17 47);
  --rust-ink:      oklch(98% 0.01 70);
  --gold:          oklch(70% 0.14 75);
  --serif:         "Fraunces","Times New Roman",Georgia,serif;
  --sans:          "Geist",ui-sans-serif,system-ui,-apple-system,sans-serif;
  --mono:          "Geist Mono",ui-monospace,"JetBrains Mono",Menlo,monospace;
  --chat-bg:        var(--paper);
  --chat-surface:   var(--paper-2);
  --chat-surface-2: var(--paper-3);
  --chat-border:    var(--rule);
  --chat-text:      var(--ink);
  --chat-muted:     var(--ink-3);
  --chat-accent:    var(--rust);
  --font-body:      var(--sans);
  --font-display:   var(--serif);
  --chat-strong:      var(--forest);
  --chat-em:          var(--rust);
  --chat-thead-bg:    var(--paper-3);
  --chat-thead-color: var(--ink-2);
  --chat-em-font:     var(--serif);
  --chat-em-size:     1.12em;
  --chat-p-lh:        1.72;
  --chat-h2-style:    italic;
  --chat-h2-size:     24px;
  --chat-h2-color:    var(--forest);
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
}

.ib-session .session-header {
  background:    var(--paper) !important;
  border-bottom: 1px solid var(--rule) !important;
  color: var(--ink); height: 64px;
}
.ib-session .session-logo { height: 22px; filter: none; opacity: 1; }
.ib-session .ib-live-pill {
  display: inline-flex; align-items: center; gap: 7px; padding: 6px 12px;
  border: 1px solid var(--rule-strong); border-radius: 999px;
  color: var(--ink); font-family: var(--sans); font-size: 12px;
}
.ib-session .ib-live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--rust);
  box-shadow: 0 0 0 3px color-mix(in oklab,var(--rust) 25%,transparent);
}
.ib-session .session-header-row2 {
  font-family: var(--mono) !important;
  font-size: 11px !important; font-weight: 400 !important;
  letter-spacing: 0.04em; color: var(--ink-3) !important;
}
.ib-session .session-subtitle { color: inherit; }

.ib-session .chat-messages-container { background: var(--paper); }
.ib-session .chat-messages-container > div { max-width: 720px !important; padding: 0 28px !important; }

.ib-session .ib-chat-row-tutor { display: flex; gap: 16px; margin-bottom: 36px; align-items: flex-start; }
.ib-session .ib-chat-row-user  {
  display: flex; justify-content: flex-end; gap: 10px;
  margin-bottom: 36px; align-items: flex-start;
}
.ib-session .ib-avatar-tutor {
  width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%;
  background: var(--forest); color: var(--gold);
  display: grid; place-items: center;
  font-family: var(--mono); font-size: 12px; font-weight: 500;
  border: 1px solid color-mix(in oklab,var(--ink) 8%,transparent);
  margin-top: 2px; flex-shrink: 0;
}
.ib-session .ib-avatar-user {
  width: 30px; height: 30px; flex: 0 0 30px; border-radius: 50%;
  background: var(--rust); color: var(--rust-ink);
  border: 1px solid color-mix(in oklab,var(--rust) 60%,var(--ink));
  display: grid; place-items: center;
  font-family: var(--mono); font-size: 12px; font-weight: 500; flex-shrink: 0;
}
.ib-session .ib-user-bubble {
  background: var(--forest); color: var(--forest-ink);
  border: 1px solid var(--forest);
  padding: 12px 18px; border-radius: 18px;
  font-family: var(--sans); font-size: 14.5px; line-height: 1.5; max-width: 75%;
}
.ib-session .ib-mia-content {
  max-width: 100%; font-family: var(--sans);
  font-size: 16px; line-height: 1.72; color: var(--ink); letter-spacing: -0.003em;
}
.ib-session .ib-mia-content strong { font-weight: 600 !important; }
.ib-session .ib-mia-content h2     { font-weight: 400 !important; }

.ib-session .ib-loading-dots { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
.ib-session .ib-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--ink-3); display: inline-block; }

/* Submit prompt */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.ib-session .demo-submit-wrap {
  display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
  margin-bottom: 36px;
  animation: fade-in-up 0.3s ease both;
}
.ib-session .demo-submit-preview {
  background: var(--paper-2); border: 1px solid var(--rule);
  border-radius: 12px; padding: 10px 16px;
  font-family: var(--sans); font-size: 14px; font-style: italic;
  color: var(--ink-3); max-width: 75%; text-align: right; line-height: 1.5;
}
.ib-session .demo-submit-btn {
  padding: 11px 22px; border-radius: 10px; border: none;
  background: var(--rust); color: var(--rust-ink);
  font-family: var(--sans); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background 0.15s;
}
.ib-session .demo-submit-btn:hover { background: var(--rust-2); }

/* Demo notice bar */
.ib-session .demo-session-notice {
  background: color-mix(in oklab, var(--forest) 6%, var(--paper));
  border-bottom: 1px solid color-mix(in oklab, var(--forest) 14%, var(--rule));
  padding: 9px 28px; text-align: center;
  font-family: var(--sans); font-size: 12.5px; color: var(--forest);
}
.ib-session .demo-session-notice a { font-weight: 600; color: var(--forest); text-decoration: underline; text-underline-offset: 3px; }
.ib-session .demo-header-cta {
  padding: 7px 14px; border-radius: 999px;
  background: var(--rust); color: var(--rust-ink);
  font-size: 12px; font-family: var(--sans); font-weight: 500;
  text-decoration: none; display: inline-block;
  transition: background 0.15s;
}
.ib-session .demo-header-cta:hover { background: var(--rust-2); }

/* Signup CTA */
.ib-session .demo-signup-cta {
  margin: 48px 0 64px;
  border: 1px solid var(--rule);
  border-radius: 20px;
  background: var(--forest-deep);
  color: var(--forest-ink);
  padding: 48px 40px;
  text-align: center;
}
.ib-session .demo-signup-cta h2 {
  font-family: var(--serif); font-style: italic; font-weight: 400;
  font-size: clamp(24px, 4vw, 36px); letter-spacing: -0.02em;
  line-height: 1.1; margin: 0 0 14px; color: var(--forest-ink);
}
.ib-session .demo-signup-cta p {
  font-size: 15px; line-height: 1.6;
  color: color-mix(in oklab, var(--forest-ink) 75%, transparent);
  max-width: 44ch; margin: 0 auto 32px;
}
.ib-session .demo-cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.ib-session .demo-cta-primary {
  padding: 14px 28px; border-radius: 10px; border: none;
  background: var(--rust); color: var(--rust-ink);
  font-family: var(--sans); font-size: 15px; font-weight: 500;
  text-decoration: none; display: inline-block;
  transition: background 0.15s;
}
.ib-session .demo-cta-primary:hover { background: var(--rust-2); }
.ib-session .demo-cta-ghost {
  padding: 14px 28px; border-radius: 10px;
  border: 1px solid color-mix(in oklab, var(--forest-ink) 30%, transparent);
  background: transparent; color: var(--forest-ink);
  font-family: var(--sans); font-size: 15px; font-weight: 400;
  text-decoration: none; display: inline-block;
  transition: border-color 0.15s;
}
.ib-session .demo-cta-ghost:hover { border-color: color-mix(in oklab, var(--forest-ink) 55%, transparent); }
.ib-session .demo-trust {
  margin-top: 22px; font-family: var(--mono);
  font-size: 11px; letter-spacing: 0.06em;
  color: color-mix(in oklab, var(--forest-ink) 50%, transparent);
}

@media (max-width: 720px) {
  .ib-session .session-header { padding: 0 16px !important; height: 56px !important; }
  .ib-session .session-logo { height: 18px; }
  .ib-session .demo-signup-cta { padding: 36px 24px; }
}
@media (max-width: 640px) {
  .ib-session .ib-chat-row-tutor,
  .ib-session .ib-chat-row-user { margin-bottom: 28px; }
  .ib-session .ib-mia-content   { font-size: 15px; }
  .ib-session .ib-user-bubble   { max-width: 88%; }
  .ib-session .ib-avatar-user   { display: none; }
  .ib-session .chat-messages-container > div { padding: 0 18px !important; }
  .ib-session .demo-cta-row { flex-direction: column; align-items: stretch; }
  .ib-session .demo-cta-primary,
  .ib-session .demo-cta-ghost  { text-align: center; }
}
`;

// ─── Message bubble ────────────────────────────────────────────────────────────

function MsgBubble({ msg }: { msg: ScriptMsg }) {
  if (msg.role === 'student') {
    return (
      <div className="ib-chat-row-user">
        <div className="ib-user-bubble">{msg.content}</div>
        <div className="ib-avatar-user">A</div>
      </div>
    );
  }
  const { cleanText, diagramCode } = parseDiagramSignal(msg.content);
  return (
    <div className="ib-chat-row-tutor">
      <div className="ib-avatar-tutor">M</div>
      <div className="ib-mia-content">
        {cleanText && <MessageRenderer content={cleanText} />}
        {diagramCode && (
          <div style={{ margin: '16px 0', maxWidth: 520 }}>
            <DiagramRenderer code={diagramCode} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Signup CTA ───────────────────────────────────────────────────────────────

function SignupCTA() {
  return (
    <div className="demo-signup-cta">
      <h2>This is what every lesson looks like.</h2>
      <p>
        Full IB Economics and IB Business Management curriculum.
        From zero to exam-ready.
      </p>
      <div className="demo-cta-row">
        <Link href="/auth/signup/ib" className="demo-cta-primary">
          Start learning with Mia →
        </Link>
        <Link href="/#pricing" className="demo-cta-ghost">
          See pricing
        </Link>
      </div>
      <div className="demo-trust">
        €44.99/month · 7-day money-back guarantee · Cancel anytime
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DemoSession() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showTyping, setShowTyping] = useState(false);
  const [submitReady, setSubmitReady] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Drive the session: Mia messages auto-reveal; student messages wait for click
  useEffect(() => {
    if (showSignup) return;

    const next = SCRIPT[visibleCount];
    if (!next) {
      const t = setTimeout(() => setShowSignup(true), 800);
      return () => clearTimeout(t);
    }

    if (next.role === 'student') {
      // Show the submit prompt after a short pause (300ms fade-in via CSS)
      const t = setTimeout(() => setSubmitReady(true), 300);
      return () => clearTimeout(t);
    }

    // Mia: 300ms pre-delay → typing dots (1400ms) → reveal
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t1 = setTimeout(() => {
      setShowTyping(true);
      const t2 = setTimeout(() => {
        setShowTyping(false);
        setVisibleCount(v => v + 1);
      }, 1400);
      timers.push(t2);
    }, 300);
    timers.push(t1);
    return () => timers.forEach(clearTimeout);
  }, [visibleCount, showSignup]);

  function handleSubmit() {
    setSubmitReady(false);
    setVisibleCount(v => v + 1); // reveals student message, triggers next Mia auto-reveal
  }

  // Scroll to bottom as content appears (skip on bare mount)
  useEffect(() => {
    if (visibleCount === 0 && !showTyping && !submitReady && !showSignup) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [visibleCount, showTyping, submitReady, showSignup]);

  const pendingStudent = submitReady ? SCRIPT[visibleCount] : null;

  return (
    <div
      className="ib-session"
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--chat-bg)', color: 'var(--chat-text)', fontFamily: 'var(--font-body)' }}
    >
      <style>{CSS}</style>

      {/* Header */}
      <header
        className="session-header"
        style={{ borderBottom: '1px solid var(--chat-border)', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50, background: 'var(--chat-bg)' }}
      >
        <div className="session-header-row1">
          <div className="session-header-left">
            <Link href="/demo" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="/gradd-ai-logo.png" alt="Gradd" className="session-logo" />
            </Link>
          </div>
          <div className="session-header-centre">
            <div className="ib-live-pill">
              <div className="ib-live-dot" />
              <span>Mia</span>
            </div>
          </div>
          <div className="session-header-right">
            <Link href="/auth/signup/ib" className="demo-header-cta">
              Sign up free →
            </Link>
          </div>
        </div>
        <div className="session-header-row2">
          Demand — Shifts and Determinants
          <span className="session-subtitle"> · IB Economics · SL · Session 7</span>
        </div>
      </header>

      {/* Demo notice */}
      <div className="demo-session-notice">
        👋 Demo session — no account needed.{' '}
        <Link href="/auth/signup/ib">Sign up free</Link> to start your real lessons.
      </div>

      {/* Message stream */}
      <div
        className="chat-messages-container"
        style={{ flex: 1, overflowY: 'auto', padding: '40px 0 48px' }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px' }}>
          {SCRIPT.slice(0, visibleCount).map((msg, i) => (
            <MsgBubble key={i} msg={msg} />
          ))}

          {showTyping && (
            <div className="ib-chat-row-tutor">
              <div className="ib-avatar-tutor">M</div>
              <div className="ib-loading-dots">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="ib-dot"
                    style={{ animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Submit prompt — fades in after Mia finishes, prospect controls pace */}
          {pendingStudent && (
            <div className="demo-submit-wrap">
              <div className="demo-submit-preview">
                Alex: {pendingStudent.content}
              </div>
              <button onClick={handleSubmit} className="demo-submit-btn">
                Submit answer →
              </button>
            </div>
          )}

          {showSignup && <SignupCTA />}

          <div ref={bottomRef} style={{ height: 1 }} />
        </div>
      </div>
    </div>
  );
}
