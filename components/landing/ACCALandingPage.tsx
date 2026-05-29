'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ACCA APM Landing Page — feat/acca-apm-landing
// Demand-test page: email capture only, no product or payment behind it.
// Design system: copied from IBLandingPage.tsx (Fraunces/Geist/Geist Mono, oklch).
// Scope renamed .ib-lp → .acca-lp to avoid style collisions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ACCALandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 68, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('waitlist')
        .insert({ email: email.trim(), source: 'acca_apm' });
      if (error) throw error;
      setSubmitted(true);
    } catch {
      setSubmitError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>

      <div className="acca-lp">
        <div className="bg-grain" aria-hidden="true" />

        {/* ── NAV ── */}
        <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
          <div className="wrap nav-inner">
            <a href="#" className="nav-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:22,width:'auto',display:'block'}} />
            </a>
            <nav className="nav-links" aria-label="Primary">
              {[
                { id: 'features',  label: 'Features'         },
                { id: 'marking',   label: 'How it marks'     },
                { id: 'waitlist',  label: 'Get early access' },
              ].map(({ id, label }) => (
                <button key={id} className="nav-link-btn" onClick={() => scrollTo(id)}>{label}</button>
              ))}
            </nav>
            <div className="nav-cta">
              <button className="btn btn-rust btn-sm" onClick={() => scrollTo('waitlist')}>
                Reserve my place <span className="arrow">→</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow eyebrow">
                <span>ACCA APM</span><span className="dot" /><span>Advanced Performance Management</span>
              </div>
              <h1 className="hero-h1 h-display">
                Failed APM? Pass it next sitting — with an AI tutor that actually <span className="em underline">teaches</span> it.
              </h1>
              <p className="hero-sub">
                APM has one of the lowest pass rates in ACCA. Most tools just mark your answer and leave you to it. This one teaches you the paper from where you&apos;re stuck to exam-ready — and marks every answer like the examiner, free.
              </p>
              <p className="hero-thesis">
                Gradd doesn&apos;t just score APM answers. It trains you to write the evaluation and application the examiner rewards.
              </p>
              <div className="hero-cta">
                <button className="btn btn-rust" onClick={() => scrollTo('waitlist')}>Reserve your place — it&apos;s free <span className="arrow">→</span></button>
              </div>
              <div className="hero-meta">
                <span>Launching for the next APM sitting</span>
                <span className="dot" />
                <span>Free to reserve</span>
                <span className="dot" />
                <span>No payment needed</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="chat" aria-label="Live session with Mia, your AI tutor">
                <div className="chat-hd">
                  <div className="chat-logo">
                    <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:16,width:'auto',display:'block'}} />
                  </div>
                  <div className="chat-name-pill"><span className="live" />Mia</div>
                  <div className="chat-course">
                    <div className="em">Strategic Costing</div>
                    <div>ACCA APM · Session 3</div>
                  </div>
                </div>
                <div className="chat-body">
                  <div className="chat-row">
                    <div className="mia-av">M</div>
                    <div className="mia-msg">
                      <p>Last time we worked on target costing — you got the mechanics right but your answer missed the strategic rationale the examiner expects. That&apos;s what we&apos;re fixing today.</p>
                      <p>The APM examiner doesn&apos;t want calculations alone. They want <span className="key">evaluation</span> — why does this matter to the business? What are the limitations?</p>
                      <p><strong>Target costing</strong> works backwards from what the market will pay. The examiner wants to know: what happens when the cost gap can&apos;t be closed?</p>
                    </div>
                  </div>
                  <div className="chat-row from-user">
                    <div className="user-bubble">I never know how much evaluation to write</div>
                    <div className="user-av">S</div>
                  </div>
                  <div className="chat-row">
                    <div className="mia-av">M</div>
                    <div className="mia-msg">
                      <p>Good — that&apos;s exactly what costs marks. Let me show you the structure the examiner rewards.</p>
                      <h4>The APM evaluation formula</h4>
                      <p>For each point: application to the scenario, one limitation or counter-argument, one judgement. The marks are in that third step.</p>
                    </div>
                  </div>
                </div>
                <div className="chat-input">
                  <div className="ph">Reply to Mia…</div>
                  <div className="send">↵</div>
                </div>
                <div className="chat-foot">Session 3 · ACCA APM · Mia online 24/7</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST BAR ── */}
        <section className="trust">
          <div className="wrap trust-inner">
            <div className="trust-label">Built around the ACCA APM examiner approach</div>
            <div className="trust-stats">
              <div className="trust-stat"><span className="num">~35%</span><span className="lbl">average pass rate</span></div>
              <div className="trust-stat"><span className="num">P5</span><span className="lbl">Strategic level</span></div>
              <div className="trust-stat"><span className="num">15+</span><span className="lbl">core APM topics</span></div>
              <div className="trust-stat"><span className="num">24/7</span><span className="lbl">availability</span></div>
            </div>
          </div>
        </section>

        {/* ── PAIN ── */}
        <section className="section pain">
          <div className="wrap pain-grid">
            <div>
              <div className="eyebrow">The problem<span className="dot" />Why candidates fail APM</div>
              <h2 className="h-section" style={{marginTop:18}}>
                APM isn&apos;t hard because the content is complex.<br/>
                It&apos;s hard because most candidates <em className="italic" style={{color:'var(--rust)'}}>answer the wrong way.</em>
              </h2>
            </div>
            <div className="pain-cards">
              <div className="pain-card">
                <div className="stat">Generic<span className="unit">answers</span></div>
                <div>
                  <div className="label">Textbook answers don&apos;t pass APM</div>
                  <div className="desc">The examiner wants application to the scenario — not definitions. Most marking tools can&apos;t tell the difference, and neither can revision kits.</div>
                </div>
              </div>
              <div className="pain-card">
                <div className="stat">Weak<span className="unit">evaluation</span></div>
                <div>
                  <div className="label">Description without judgement</div>
                  <div className="desc">APM requires evaluation at every level. Candidates explain the model, then stop. The marks are in the &ldquo;so what?&rdquo; — and most never reach it.</div>
                </div>
              </div>
              <div className="pain-card">
                <div className="stat">Time<span className="unit">pressure</span></div>
                <div>
                  <div className="label">3.5 hours isn&apos;t enough without structure</div>
                  <div className="desc">APM rewards a specific answer structure per question type. Without drilling it repeatedly, you run out of time every sitting.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* ── FEATURES ── */}
        <section className="section one-sub" id="features">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How Gradd fixes it<span className="dot" />Three things done right</span>
              <h2 className="h-section">
                Not notes. Not a marking engine. An AI tutor that <em className="italic">trains</em> you for APM.
              </h2>
              <p className="lead">
                Built on the approach that actually moves APM grades — not re-reading, not generic feedback. Teaching, marking, and drilling the way the examiner expects.
              </p>
            </div>
            <div className="one-sub-grid">
              <div className="os-card">
                <div className="num">01 / Taught</div>
                <h3>Taught, not just marked — built on the methods proven to move grades, not notes to re-read.</h3>
                <p>Mia teaches the APM way of answering — application, evaluation, judgement — through live worked examples, not flashcards.</p>
              </div>
              <div className="os-card">
                <div className="num">02 / Marked</div>
                <h3>Marked like the real examiner — every answer scored against the actual criteria, instantly.</h3>
                <p>Every answer is evaluated against the APM mark scheme: application to the scenario, quality of evaluation, and whether you reached a conclusion.</p>
              </div>
              <div className="os-card">
                <div className="num">03 / Targeted</div>
                <h3>Built for resitters — targets exactly why candidates fail APM: generic answers, weak application, time pressure.</h3>
                <p>Mia starts from where you lost marks. What the examiner wanted instead — and how to fix it before the next sitting.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT MARKS ── */}
        <section className="section band-dark" id="marking">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" style={{color:'color-mix(in oklab,var(--forest-ink) 60%,transparent)'}}>Marking<span className="dot" />Built for APM</span>
              <h2 className="h-section">
                Marked the way the <em className="italic">APM examiner</em> marks.
              </h2>
              <p className="lead">
                APM marks reward evaluation and scenario application — not textbook recitation. Mia scores every answer the same way: does it apply the scenario? Does it evaluate? Does it reach a judgement?
              </p>
            </div>
            <div className="pillars">
              <div className="pillar">
                <div className="num">01</div>
                <h3>Application first.</h3>
                <p>Every answer is checked against the scenario in the question — not just against the model. Generic answers score poorly, because that&apos;s how the real examiner marks.</p>
              </div>
              <div className="pillar">
                <div className="num">02</div>
                <h3>Evaluation always.</h3>
                <p>Mia flags every answer that describes without evaluating. The examiner expects a &ldquo;so what&rdquo; for every point. Mia trains that instinct until it&apos;s automatic.</p>
              </div>
              <div className="pillar">
                <div className="num">03</div>
                <h3>Structure, drilled.</h3>
                <p>Each APM question type has a structure the examiner rewards. Mia teaches it, then drills it under time pressure until you produce it without thinking.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHO IT'S FOR ── */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Who it&apos;s for</span>
              <h2 className="h-section">Who Gradd APM <em className="italic">is</em> for.</h2>
            </div>
            <div className="who-grid">
              <div className="who-card">
                <span className="who-tag">Resitting APM</span>
                <h3>You&apos;ve sat APM before and the marks weren&apos;t there.</h3>
                <p>Generic answers. Decent knowledge, wrong structure. Mia diagnoses exactly what cost you marks and rebuilds from there — not from the beginning, from where you lost points.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">First attempt</span>
                <h3>You know the models. You&apos;re not sure how to answer.</h3>
                <p>APM is the paper where knowing the content isn&apos;t enough. You need the examiner&apos;s language, the structure they reward, the way they weight evaluation vs description.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Self-studying</span>
                <h3>No class, no tutor, just you and the exam.</h3>
                <p>Revision kits give you the knowledge. Mia gives you the training. The difference is feedback on every answer — not just a mark, but what to change.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Time-pressured</span>
                <h3>Working full-time while studying for Strategic level.</h3>
                <p>Mia works when you have 30 minutes. Every session targets your worst areas and runs exam-style questions. No wasted revision time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── EMAIL CAPTURE / WAITLIST ── */}
        <section className="section pricing-band" id="waitlist">
          <div className="wrap">
            <div className="waitlist-block">
              <div className="waitlist-copy">
                <span className="eyebrow" style={{display:'block',marginBottom:18}}>Early access</span>
                <h2 className="h-section">
                  Launching for the next APM sitting — <em className="italic">reserve your place.</em>
                </h2>
                <p className="lead" style={{marginTop:22}}>
                  We&apos;re building this for the next sitting. Reserve your place now — it&apos;s free, no payment needed, and you&apos;ll be first to know when it&apos;s ready.
                </p>
              </div>
              <div className="waitlist-form-wrap">
                {submitted ? (
                  <div className="waitlist-success">
                    <div className="success-icon">✓</div>
                    <h3>You&apos;re on the list.</h3>
                    <p>We&apos;ll email you as soon as Gradd APM is ready for the next sitting.</p>
                  </div>
                ) : (
                  <form className="waitlist-form" onSubmit={handleSubmit} noValidate>
                    <div className="waitlist-input-row">
                      <input
                        type="email"
                        className="waitlist-input"
                        placeholder="your@email.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                        aria-label="Email address"
                        disabled={submitting}
                      />
                      <button
                        type="submit"
                        className="btn btn-rust waitlist-btn"
                        disabled={submitting || !email.trim()}
                      >
                        {submitting ? 'Reserving…' : <><span>Reserve my place</span> <span className="arrow">→</span></>}
                      </button>
                    </div>
                    {submitError && <p className="waitlist-error">{submitError}</p>}
                    <p className="waitlist-small">No payment. No account needed yet. We&apos;ll email you when we&apos;re live.</p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="final-cta">
          <div className="wrap final-cta-inner">
            <div className="tag-pill" style={{marginBottom:30,color:'color-mix(in oklab,var(--forest-ink) 80%,transparent)',borderColor:'color-mix(in oklab,var(--forest-ink) 30%,transparent)'}}>
              <span className="dot" /> Free to reserve · No payment needed
            </div>
            <h2 className="h-display">Pass APM <em className="italic">next sitting.</em></h2>
            <p className="lead">Built for the next ACCA APM sitting. Reserve your place — it&apos;s free.</p>
            <div className="hero-cta" style={{justifyContent:'center',marginTop:36}}>
              <button className="btn btn-rust" onClick={() => scrollTo('waitlist')}>
                Reserve my place <span className="arrow">→</span>
              </button>
            </div>
            <div className="small">Launching for the next APM sitting · free to reserve · no payment needed</div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="wrap footer-inner">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:16,width:'auto',display:'block'}} />
              <span style={{fontSize:12,color:'var(--ink-3)',marginLeft:14}}>© 2026 · AI tutor for ACCA APM</span>
            </div>
            <div className="footer-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookies">Cookies</Link>
              <a href="mailto:hello@gradd.ai">Contact</a>
            </div>
          </div>
          <div className="wrap" style={{textAlign:'center',marginTop:20,paddingBottom:8}}>
            <p style={{fontFamily:'var(--sans)',fontSize:11,color:'var(--ink-3)',lineHeight:1.5}}>
              Gradd.ai is an independent learning platform and is not affiliated with or endorsed by ACCA (the Association of Chartered Certified Accountants).
            </p>
          </div>
        </footer>

        {/* Back to top */}
        <button
          className={`to-top${showTop ? ' visible' : ''}`}
          aria-label="Back to top"
          onClick={() => window.scrollTo({top:0,behavior:'smooth'})}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// All selectors prefixed with .acca-lp — no collision with .ib-lp or LC landing.
// Design system ported from IBLandingPage.tsx (oklch palette, Fraunces/Geist/Geist Mono).

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

.acca-lp {
  --paper:    oklch(96.2% 0.012 78);
  --paper-2:  oklch(93.5% 0.015 78);
  --paper-3:  oklch(89% 0.018 78);
  --ink:      oklch(18% 0.012 60);
  --ink-2:    oklch(34% 0.012 60);
  --ink-3:    oklch(54% 0.012 60);
  --rule:     oklch(86% 0.014 78);
  --rule-strong: oklch(74% 0.018 78);
  --forest:   oklch(22% 0.035 168);
  --forest-2: oklch(28% 0.04 168);
  --forest-ink: oklch(94% 0.025 80);
  --sage:     oklch(91% 0.018 140);
  --sage-2:   oklch(86% 0.025 140);
  --rust:     oklch(64% 0.17 47);
  --rust-2:   oklch(58% 0.17 47);
  --rust-ink: oklch(98% 0.01 70);
  --gold:     oklch(70% 0.14 75);
  --serif:    "Fraunces", "Times New Roman", Georgia, serif;
  --sans:     "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --mono:     "Geist Mono", ui-monospace, "JetBrains Mono", Menlo, monospace;
  --max:      1240px;
  --gut:      clamp(20px, 4vw, 56px);
  --section:  clamp(72px, 9vw, 128px);
  --radius:   14px;
  --radius-sm:10px;
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  font-size: 16px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* ── Base ── */
.acca-lp *, .acca-lp *::before, .acca-lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
.acca-lp *::selection { background: var(--rust); color: var(--rust-ink); }
.acca-lp img, .acca-lp svg { display: block; max-width: 100%; }
.acca-lp a { color: inherit; text-decoration: none; }
.acca-lp button { font: inherit; cursor: pointer; border: none; background: none; }
.acca-lp h1, .acca-lp h2, .acca-lp h3, .acca-lp h4 { font-weight: 400; }

/* ── Noise grain ── */
.acca-lp .bg-grain {
  position: fixed; inset: 0; z-index: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0);
  background-size: 22px 22px;
  pointer-events: none; opacity: 0.3;
}

/* ── Type ── */
.acca-lp .eyebrow {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-3); font-weight: 500;
}
.acca-lp .eyebrow .dot {
  display: inline-block; width: 5px; height: 5px; background: var(--rust);
  border-radius: 50%; vertical-align: middle; margin: 0 8px 2px;
}
.acca-lp .italic { font-style: italic; }
.acca-lp .h-section .italic,
.acca-lp .h-display .italic { color: var(--rust); }
.acca-lp .h-display {
  font-family: var(--serif); font-size: clamp(48px, 7.4vw, 104px);
  line-height: 0.96; letter-spacing: -0.025em; text-wrap: balance;
}
.acca-lp .h-section {
  font-family: var(--serif); font-size: clamp(34px, 4.6vw, 60px);
  line-height: 1.02; letter-spacing: -0.02em; text-wrap: balance;
}
.acca-lp .lead {
  font-size: clamp(17px, 1.45vw, 20px); line-height: 1.5;
  color: var(--ink-2); max-width: 56ch; text-wrap: pretty;
}

/* ── Layout ── */
.acca-lp .wrap { max-width: var(--max); margin: 0 auto; padding: 0 var(--gut); }
.acca-lp .section { padding: var(--section) 0; }
.acca-lp .section-head { max-width: 780px; margin-bottom: 56px; }
.acca-lp .section-head .eyebrow { display: block; margin-bottom: 18px; }
.acca-lp .section-head .lead { margin-top: 22px; }
.acca-lp .rule { border: 0; border-top: 1px solid var(--rule); margin: 0; }

/* ── Buttons ── */
.acca-lp .btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-radius: 999px; font-weight: 500;
  font-size: 15px; letter-spacing: -0.005em; border: 1px solid transparent;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
  white-space: nowrap; cursor: pointer; text-decoration: none;
}
.acca-lp .btn:hover { transform: translateY(-1px); }
.acca-lp .btn .arrow { transition: transform 0.18s ease; }
.acca-lp .btn:hover .arrow { transform: translateX(3px); }
.acca-lp .btn-sm { padding: 9px 14px; font-size: 13px; min-height: 44px; }
.acca-lp .btn-primary { background: var(--ink); color: var(--paper); }
.acca-lp .btn-primary:hover { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.acca-lp .btn-rust { background: var(--rust); color: var(--rust-ink); }
.acca-lp .btn-rust:hover { background: var(--rust-2); }
.acca-lp .btn-ghost { background: transparent; color: var(--ink); border-color: var(--rule-strong); }
.acca-lp .btn-ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.acca-lp .btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

/* ── Nav ── */
.acca-lp .nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  background: color-mix(in oklab, var(--paper) 78%, transparent);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.acca-lp .nav--scrolled { border-bottom-color: color-mix(in oklab, var(--rule) 60%, transparent); }
.acca-lp .nav-inner {
  display: flex; align-items: center; justify-content: space-between; height: 68px;
}
.acca-lp .nav-links { display: flex; align-items: center; gap: 28px; }
.acca-lp .nav-link-btn {
  font-size: 14px; color: var(--ink-2); background: none; border: none;
  cursor: pointer; font-family: var(--sans); padding: 0;
  transition: color 0.15s;
}
.acca-lp .nav-link-btn:hover { color: var(--ink); }
.acca-lp .nav-cta { display: flex; align-items: center; gap: 8px; }
@media (max-width: 860px) { .acca-lp .nav-links { display: none; } }
@media (max-width: 480px) {
  .acca-lp .nav-inner { height: 56px; }
  .acca-lp .nav-cta { gap: 4px; }
}

/* ── Hero ── */
.acca-lp .hero {
  position: relative; z-index: 1;
  padding: clamp(64px, 9vw, 112px) 0 clamp(48px, 7vw, 88px);
}
.acca-lp .hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr);
  gap: clamp(40px, 5vw, 80px); align-items: center;
}
@media (max-width: 940px) { .acca-lp .hero-grid { grid-template-columns: 1fr; } }
.acca-lp .hero-eyebrow { margin-bottom: 24px; }
.acca-lp .hero-h1 .em { font-style: italic; color: var(--forest); }
.acca-lp .hero-h1 .underline {
  position: relative; display: inline-block; font-style: italic; margin-right: 0.08em;
}
.acca-lp .hero-h1 .underline::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0.06em;
  height: 0.22em; background: var(--rust); opacity: 0.85; z-index: -1; border-radius: 2px;
}
.acca-lp .hero-sub {
  margin-top: 28px; font-size: clamp(17px, 1.4vw, 19px);
  line-height: 1.55; color: var(--ink-2); max-width: 52ch;
}
.acca-lp .hero-thesis {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(18px, 1.6vw, 22px);
  color: var(--forest);
  letter-spacing: -0.01em;
  line-height: 1.4;
  margin-top: 24px;
  max-width: 42ch;
}
.acca-lp .hero-cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 36px; }
.acca-lp .hero-meta {
  display: flex; gap: 22px; align-items: center; flex-wrap: wrap;
  margin-top: 22px; font-size: 13px; color: var(--ink-3);
}
.acca-lp .hero-meta .dot {
  width: 4px; height: 4px; background: var(--ink-3);
  border-radius: 50%; display: inline-block; vertical-align: middle;
}
@media (max-width: 480px) {
  .acca-lp .hero-cta { flex-direction: column; align-items: stretch; gap: 10px; }
  .acca-lp .hero-cta .btn { width: 100%; justify-content: center; }
  .acca-lp .hero-meta { gap: 12px; font-size: 12px; }
}

/* ── Chat preview ── */
.acca-lp .chat {
  background: var(--paper); border: 1px solid var(--rule-strong);
  border-radius: 22px; padding: 22px 24px;
  box-shadow: 0 30px 60px -30px rgba(20,24,22,0.2), 0 2px 6px rgba(20,24,22,0.08);
  display: flex; flex-direction: column; gap: 16px; min-height: 480px; overflow: hidden;
  position: relative;
}
.acca-lp .chat::before {
  content: ""; position: absolute; inset: -16px;
  border: 1px dashed var(--rule); border-radius: 30px; z-index: -1; opacity: 0.5;
}
.acca-lp .chat-hd {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 14px; border-bottom: 1px solid var(--rule);
}
.acca-lp .chat-logo {
  font-family: var(--serif); font-size: 17px; letter-spacing: -0.02em; color: var(--ink);
  display: flex; align-items: baseline;
}
.acca-lp .chat-name-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px; border: 1px solid var(--rule-strong); border-radius: 999px;
  font-size: 12px; color: var(--ink);
}
.acca-lp .chat-name-pill .live {
  width: 6px; height: 6px; border-radius: 50%; background: var(--rust);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--rust) 25%, transparent);
}
.acca-lp .chat-course {
  margin-left: auto; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.04em; color: var(--ink-3); text-align: right;
}
.acca-lp .chat-course .em { color: var(--ink); }
.acca-lp .chat-body {
  display: flex; flex-direction: column; gap: 14px;
  font-family: var(--sans); font-size: 13.5px; line-height: 1.65; color: var(--ink);
}
.acca-lp .chat-row { display: flex; align-items: flex-start; gap: 12px; }
.acca-lp .chat-row.from-user { justify-content: flex-end; }
.acca-lp .mia-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--forest); color: var(--gold);
  display: grid; place-items: center; font-family: var(--mono);
  font-size: 11px; font-weight: 500;
}
.acca-lp .mia-msg { display: flex; flex-direction: column; gap: 10px; max-width: 90%; }
.acca-lp .mia-msg p { margin: 0; }
.acca-lp .mia-msg strong { color: var(--forest); font-weight: 600; }
.acca-lp .mia-msg em { font-style: italic; font-family: var(--serif); font-size: 1.12em; color: var(--rust); }
.acca-lp .mia-msg .key { color: var(--forest); font-style: italic; font-family: var(--serif); font-size: 1.12em; }
.acca-lp .mia-msg h4 {
  font-family: var(--serif); font-style: italic; font-size: 19px;
  font-weight: 400; color: var(--forest); letter-spacing: -0.012em; line-height: 1.2;
}
.acca-lp .user-bubble {
  background: var(--forest); color: var(--forest-ink); padding: 10px 16px;
  border-radius: 18px; font-size: 13.5px; line-height: 1.45; max-width: 80%;
}
.acca-lp .user-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--rust); color: var(--rust-ink);
  display: grid; place-items: center; font-family: var(--mono); font-size: 11px;
}
.acca-lp .chat-input {
  margin-top: auto; display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 8px 10px; border: 1px solid var(--rule-strong);
  border-radius: 14px; background: var(--paper-2);
}
.acca-lp .chat-input .ph { flex: 1; min-width: 0; font-size: 13px; color: var(--ink-3); }
.acca-lp .chat-input .send {
  width: 30px; height: 30px; border-radius: 8px; background: var(--rust);
  color: var(--rust-ink); display: grid; place-items: center; font-size: 13px;
}
.acca-lp .chat-foot {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em;
  color: var(--ink-3); text-align: center;
}

/* ── Trust bar ── */
.acca-lp .trust {
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
  padding: 22px 0; background: color-mix(in oklab, var(--paper) 90%, var(--paper-2));
  position: relative; z-index: 1;
}
.acca-lp .trust-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 32px; flex-wrap: wrap;
}
.acca-lp .trust-label {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3);
}
.acca-lp .trust-stats { display: flex; align-items: baseline; gap: clamp(20px,4vw,56px); flex-wrap: wrap; justify-content: center; }
.acca-lp .trust-stat { display: flex; align-items: baseline; gap: 8px; }
.acca-lp .trust-stat .num {
  font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em;
  font-style: italic; color: var(--ink);
}
.acca-lp .trust-stat .lbl { font-size: 12px; color: var(--ink-3); }

/* ── Pain section ── */
.acca-lp .pain { background: var(--paper); }
.acca-lp .pain-grid {
  display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr);
  gap: clamp(40px,6vw,80px); align-items: start;
}
@media (max-width: 940px) { .acca-lp .pain-grid { grid-template-columns: 1fr; } }
.acca-lp .pain-cards { display: grid; grid-template-columns: 1fr; gap: 14px; }
.acca-lp .pain-card {
  border: 1px solid var(--rule); border-radius: var(--radius); padding: 22px 24px;
  background: var(--paper); display: grid; grid-template-columns: 80px 1fr;
  gap: 18px; align-items: start;
}
.acca-lp .pain-card .stat {
  font-family: var(--serif); font-size: 30px; line-height: 1.1;
  color: var(--rust); letter-spacing: -0.02em;
}
.acca-lp .pain-card .stat .unit {
  font-size: 11px; font-family: var(--mono); color: var(--ink-3);
  display: block; margin-top: 4px; letter-spacing: 0.04em;
}
.acca-lp .pain-card .label { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.acca-lp .pain-card .desc { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── One subscription / Features ── */
.acca-lp .one-sub {
  background: var(--sage); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}
.acca-lp .one-sub .h-section em { font-style: italic; color: var(--rust); }
.acca-lp .one-sub-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 40px;
}
@media (max-width: 860px) { .acca-lp .one-sub-grid { grid-template-columns: 1fr; } }
.acca-lp .os-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 26px;
}
.acca-lp .os-card .num {
  font-family: var(--mono); font-size: 11px; color: var(--ink-3);
  letter-spacing: 0.1em; margin-bottom: 14px;
}
.acca-lp .os-card h3 {
  font-family: var(--serif); font-size: 24px; line-height: 1.15;
  letter-spacing: -0.015em; margin-bottom: 10px;
}
.acca-lp .os-card p { font-size: 14px; color: var(--ink-2); line-height: 1.55; }

/* ── Exam-ready / How it marks band ── */
.acca-lp .band-dark { background: var(--forest); color: var(--forest-ink); }
.acca-lp .band-dark .h-section { color: var(--forest-ink); }
.acca-lp .band-dark .lead { color: color-mix(in oklab,var(--forest-ink) 78%,transparent); }
.acca-lp .band-dark .h-section em { font-style: italic; color: var(--rust); }
.acca-lp .pillars {
  display: grid; grid-template-columns: repeat(3,1fr);
  gap: 1px; background: color-mix(in oklab,var(--forest-ink) 18%,transparent);
  border: 1px solid color-mix(in oklab,var(--forest-ink) 18%,transparent);
  border-radius: var(--radius); overflow: hidden; margin-top: 48px;
}
@media (max-width: 860px) { .acca-lp .pillars { grid-template-columns: 1fr; } }
.acca-lp .pillar { background: var(--forest); padding: 32px 28px; }
.acca-lp .pillar .num {
  font-family: var(--serif); font-size: 48px; font-style: italic;
  letter-spacing: -0.02em; line-height: 1; color: var(--rust); margin-bottom: 16px;
}
.acca-lp .pillar h3 { font-family: var(--serif); font-size: 24px; letter-spacing: -0.015em; margin-bottom: 8px; color: var(--forest-ink); }
.acca-lp .pillar p { font-size: 14px; line-height: 1.55; color: color-mix(in oklab,var(--forest-ink) 72%,transparent); }

/* ── Who it's for ── */
.acca-lp .who-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
@media (max-width: 760px) { .acca-lp .who-grid { grid-template-columns: 1fr; } }
.acca-lp .who-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 26px 28px;
  display: flex; flex-direction: column; gap: 10px;
}
.acca-lp .who-card .who-tag {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--rust);
}
.acca-lp .who-card h3 { font-family: var(--serif); font-size: 24px; letter-spacing: -0.015em; line-height: 1.15; }
.acca-lp .who-card p { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── Pricing band (reused for waitlist) ── */
.acca-lp .pricing-band {
  background: var(--paper-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}

/* ── Waitlist block ── */
.acca-lp .waitlist-block {
  display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr);
  gap: clamp(40px,6vw,80px); align-items: center;
}
@media (max-width: 860px) { .acca-lp .waitlist-block { grid-template-columns: 1fr; } }

.acca-lp .waitlist-form-wrap {
  background: var(--paper); border: 1px solid var(--rule-strong);
  border-radius: var(--radius); padding: 36px;
  box-shadow: 0 20px 40px -25px rgba(20,24,22,0.12);
}

.acca-lp .waitlist-form { display: flex; flex-direction: column; gap: 14px; }

.acca-lp .waitlist-input-row {
  display: flex; gap: 10px; align-items: stretch; flex-wrap: wrap;
}

.acca-lp .waitlist-input {
  flex: 1; min-width: 0; padding: 14px 18px;
  border: 1px solid var(--rule-strong); border-radius: 999px;
  font-family: var(--sans); font-size: 15px; color: var(--ink);
  background: var(--paper); outline: none;
  transition: border-color 0.18s;
}
.acca-lp .waitlist-input:focus { border-color: var(--forest); }
.acca-lp .waitlist-input::placeholder { color: var(--ink-3); }
.acca-lp .waitlist-input:disabled { opacity: 0.6; }

.acca-lp .waitlist-btn { flex-shrink: 0; white-space: nowrap; }

.acca-lp .waitlist-error {
  font-size: 13px; color: var(--rust); font-family: var(--mono); letter-spacing: 0.02em;
}

.acca-lp .waitlist-small {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-3); line-height: 1.5;
}

.acca-lp .waitlist-success {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; text-align: center; padding: 8px 0;
}
.acca-lp .success-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: oklch(58% 0.15 145); color: white;
  display: grid; place-items: center; font-size: 22px;
}
.acca-lp .waitlist-success h3 {
  font-family: var(--serif); font-size: 28px; letter-spacing: -0.015em; color: var(--forest);
}
.acca-lp .waitlist-success p { font-size: 15px; color: var(--ink-2); max-width: 34ch; }

@media (max-width: 480px) {
  .acca-lp .waitlist-input-row { flex-direction: column; }
  .acca-lp .waitlist-input { border-radius: var(--radius); }
  .acca-lp .waitlist-btn { width: 100%; justify-content: center; border-radius: var(--radius); }
  .acca-lp .waitlist-form-wrap { padding: 24px 20px; }
}

/* ── Final CTA ── */
.acca-lp .final-cta { background: var(--forest); color: var(--forest-ink); position: relative; overflow: hidden; }
.acca-lp .final-cta::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%,color-mix(in oklab,var(--rust) 30%,transparent),transparent 50%),
              radial-gradient(circle at 10% 90%,color-mix(in oklab,var(--forest-2) 80%,transparent),transparent 60%);
  pointer-events: none;
}
.acca-lp .final-cta-inner {
  position: relative; text-align: center;
  padding: clamp(80px,11vw,140px) 0;
}
.acca-lp .final-cta .h-display { color: var(--forest-ink); max-width: 18ch; margin: 0 auto; }
.acca-lp .final-cta .h-display em { color: var(--rust); }
.acca-lp .final-cta .lead { color: color-mix(in oklab,var(--forest-ink) 80%,transparent); margin: 24px auto 0; }
.acca-lp .final-cta .btn-ghost {
  border-color: color-mix(in oklab,var(--forest-ink) 40%,transparent); color: var(--forest-ink);
}
.acca-lp .final-cta .btn-ghost:hover { background: var(--forest-ink); color: var(--forest); border-color: var(--forest-ink); }
.acca-lp .small {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
  text-transform: uppercase; color: color-mix(in oklab,var(--forest-ink) 55%,transparent); margin-top: 28px;
}
@media (max-width: 480px) {
  .acca-lp .final-cta-inner { padding: clamp(56px,12vw,96px) 0; }
  .acca-lp .final-cta .h-display { padding: 0 4px; font-size: clamp(40px,11vw,56px); }
}

/* ── Footer ── */
.acca-lp .footer { padding: 56px 0 40px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink-3); }
.acca-lp .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.acca-lp .footer-links { display: flex; gap: 24px; }
.acca-lp .footer-links a:hover { color: var(--ink); }

/* ── Tag pill ── */
.acca-lp .tag-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px;
  border: 1px solid var(--rule-strong); border-radius: 999px; font-size: 12px;
  font-family: var(--mono); letter-spacing: 0.04em; color: var(--ink-2);
}
.acca-lp .tag-pill .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--rust); }

/* ── Back to top ── */
.acca-lp .to-top {
  position: fixed; right: 24px; bottom: 24px; z-index: 90;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--rule-strong);
  background: var(--ink); color: var(--paper); display: grid; place-items: center;
  cursor: pointer; opacity: 0; transform: translateY(8px); pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.18s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.acca-lp .to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.acca-lp .to-top:hover { background: var(--rust); border-color: var(--rust); color: var(--rust-ink); }
.acca-lp .to-top svg { width: 16px; height: 16px; }
@media (max-width: 640px) { .acca-lp .to-top { right: 16px; bottom: 16px; } }
@media (max-width: 480px) {
  .acca-lp .hero-meta .dot { display: none; }
  .acca-lp .chat { max-height: 360px; overflow: hidden; position: relative; }
  .acca-lp .chat::after {
    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 72px;
    background: linear-gradient(to bottom, transparent, var(--paper));
    border-radius: 0 0 22px 22px; pointer-events: none; z-index: 1;
  }
}
`;
