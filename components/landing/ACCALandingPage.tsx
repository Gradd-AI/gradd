'use client';

// ─────────────────────────────────────────────────────────────────────────────
// ACCA APM Landing Page — flagship root marketing page (gradd.ai).
// Live launch page: free-tier + paid pricing, real CTAs into /acca, examiner-thinking
// proof (judgement paper, the withhold, professional-skills marking), FAQ + FAQPage
// JSON-LD. Exactly one <h1> (hero); every section is a labelled <section> with an <h2>.
// Design system: copied from IBLandingPage.tsx (Fraunces/Geist/Geist Mono, oklch).
// Scope renamed .ib-lp → .acca-lp to avoid style collisions.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Real entry points into the live APM product. The auth wall carries the
// post-login destination: free lands in the drill dashboard, paid on subscribe.
const AUTH_FREE = '/acca/auth?next=/acca';
const AUTH_SUBSCRIBE = '/acca/auth?next=/acca/subscribe';

// Single source of truth for the FAQ — the visible list and the FAQPage JSON-LD are
// both rendered from this, so the structured data mirrors the on-page copy exactly.
const FAQS: { q: string; a: string }[] = [
  { q: 'Is this based on the current APM syllabus?', a: 'Yes — S26–J27, verified against the official guide.' },
  { q: 'How is this different from a general AI chatbot?', a: 'Structured drills and cases built from the syllabus, examiner failure modes, sealed model answers, and professional-skills marking against ACCA’s published professional-skills descriptors — not a chat window.' },
  { q: 'Can I use it if I failed before?', a: 'Yes — built for exactly that: understanding why your answers didn’t score.' },
  { q: 'Does it give model answers?', a: 'Yes — after you’ve attempted, been coached, and repaired your answer.' },
  { q: 'What’s free?', a: 'All 91 drills, 3 full teach-throughs, no card.' },
  { q: 'What do I pay for?', a: 'Unlimited teach-throughs, full exam cases, professional-skills marking, the timed mock.' },
];

const FAQ_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
};

export default function ACCALandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

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
              <button className="nav-link-btn" onClick={() => scrollTo('taught')}>The approach</button>
              <button className="nav-link-btn" onClick={() => scrollTo('features')}>What&apos;s included</button>
              <button className="nav-link-btn" onClick={() => scrollTo('pricing')}>Pricing</button>
            </nav>
            <div className="nav-cta">
              {/* Quiet text link — magic-link flow handles returning users and new
                  signups at the same destination, so Sign in shares AUTH_FREE. Lives
                  in nav-cta (always visible) so it persists in the collapsed nav. */}
              <Link href="/blog?subject=apm" className="nav-signin">Blog</Link>
              <Link href={AUTH_FREE} className="nav-signin">Sign in</Link>
              <Link href={AUTH_FREE} className="btn btn-rust btn-sm">Start free <span className="arrow">→</span></Link>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero" aria-label="Introduction">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow eyebrow">
                <span>ACCA APM</span><span className="dot" /><span>Advanced Performance Management</span>
              </div>
              <h1 className="hero-h1 h-display">
                Failed APM? <span className="em underline">Fix the reason you lost marks.</span>
              </h1>
              <p className="hero-sub">
                APM is not passed by memorising models. It is passed by applying them to the scenario, evaluating properly, showing scepticism and writing commercially. Gradd diagnoses why your answer lost marks, then Ezra coaches you until your answer is strong enough to score.
              </p>
              <p className="hero-note">Built on the live S26–J27 syllabus. Every drill free to start. No card.</p>
              <div className="hero-cta">
                <Link href={AUTH_FREE} className="btn btn-rust">Start free — every drill, no card <span className="arrow">→</span></Link>
                <button className="btn btn-ghost" onClick={() => scrollTo('pricing')}>See pricing</button>
              </div>
              <div className="hero-meta">
                <span>Every drill free</span>
                <span className="dot" />
                <span>No card to start</span>
                <span className="dot" />
                <span>Upgrade for cases, marking and mock</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="chat" role="img" aria-label="Ezra withholding a model answer while coaching an APM requirement">
                <div className="chat-hd">
                  <div className="chat-logo">
                    <img src="/gradd-ai-logo.png" alt="" style={{height:16,width:'auto',display:'block'}} />
                  </div>
                  <div className="chat-name-pill"><span className="live" />Ezra</div>
                  <div className="chat-course">
                    <div className="em">Evaluating the board report</div>
                    <div>ACCA APM · Requirement (b)</div>
                  </div>
                </div>
                <div className="chat-body">
                  <div className="chat-row from-user">
                    <div className="user-bubble">Retention fell from 82% to 74% and revenue per member is down 4%, so the company is underperforming and the board should act on retention.</div>
                    <div className="user-av">S</div>
                  </div>
                  <div className="chat-row">
                    <div className="ezra-av">E</div>
                    <div className="ezra-msg">
                      <span className="hint-badge">Hint</span>
                      <p>You&apos;ve analysed the company — but the requirement asks you to evaluate the <em>report</em>. Does the board&apos;s pack let them <strong>see</strong> any of what you just worked out? That&apos;s where the marks are.</p>
                    </div>
                  </div>
                  <div className="chat-row from-user">
                    <div className="user-bubble">…so I anchor every point to the report against a criterion, not the performance itself?</div>
                    <div className="user-av">S</div>
                  </div>
                  <div className="chat-row">
                    <div className="ezra-av">E</div>
                    <div className="ezra-msg">
                      <p>Exactly. Fluent answers to the wrong question are the biggest mark-loser on this requirement type. Go again.</p>
                    </div>
                  </div>
                </div>
                <div className="chat-input">
                  <div className="ph">Reply to Ezra…</div>
                  <div className="send">↵</div>
                </div>
                <div className="chat-foot">The answer stays sealed · Ezra online 24/7</div>
              </div>
              <p className="visual-caption">The answer stays sealed. Ezra teaches until your answer is strong enough to score.</p>
            </div>
          </div>
        </section>

        {/* ── A. JUDGEMENT PAPER (before / after) ── */}
        <section className="section judgement" aria-label="Why APM is a judgement paper">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The real test</span>
              <h2 className="h-section">APM is not a knowledge test. It is a <em className="italic">judgement paper.</em></h2>
              <p className="lead">APM is one of ACCA&apos;s toughest papers, with pass rates consistently around 40% — among the lowest in the ACCA qualification. The candidates who fail rarely lack knowledge — they answer without applying, evaluating or judging.</p>
            </div>
            <div className="ja-card">
              <div className="ja-col ja-weak">
                <div className="ja-tag">Weak answer</div>
                <p>Target costing helps a business reduce costs by setting a target cost based on the market price.</p>
              </div>
              <div className="ja-chip" aria-hidden="true">↓</div>
              <div className="ja-diag">
                <div className="ja-tag ja-tag-diag">Diagnosis</div>
                <p>Knows the model. No scenario application, no limitation, no judgement.</p>
              </div>
              <div className="ja-chip" aria-hidden="true">↓</div>
              <div className="ja-col ja-coached">
                <div className="ja-tag ja-tag-coached">Coached answer</div>
                <p>Target costing fits here because the market price is fixed by customer expectations, so the product must be designed backwards from an acceptable margin. However, if the cost gap cannot close without cutting quality, the strategy risks the premium positioning — so the board should set a floor on specification before committing.</p>
              </div>
            </div>
            <p className="ja-caption">The difference is not knowledge. It is application, limitation, judgement.</p>
          </div>
        </section>

        {/* ── TAUGHT, NOT JUST MARKED ── */}
        <section className="section one-sub" id="taught" aria-label="Taught, not just marked">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The approach<span className="dot" />Taught, not just marked</span>
              <h2 className="h-section">Taught, not just <em className="italic">marked.</em></h2>
              <p className="lead">
                The paper punishes describing instead of applying. Gradd coaches the thinking the examiner actually rewards — and withholds the answer until you&apos;ve done the work.
              </p>
            </div>
            <div className="one-sub-grid">
              <div className="os-card">
                <div className="num">01 / Diagnosis</div>
                <h3>Finds the gap in your thinking.</h3>
                <p>Ezra doesn&apos;t hand you the model answer — he diagnoses exactly where your attempt stalled and teaches from there. The answer stays sealed until you&apos;ve earned it.</p>
              </div>
              <div className="os-card">
                <div className="num">02 / Marking</div>
                <h3>Marks like the examiner.</h3>
                <p>Every case is marked against ACCA&apos;s published professional-skills descriptors — communication, analysis &amp; evaluation, scepticism, commercial acumen. The 20% of the paper most candidates never practise.</p>
              </div>
              <div className="os-card">
                <div className="num">03 / Failure modes</div>
                <h3>Trained on how candidates actually fail.</h3>
                <p>Answering the wrong question, describing instead of applying, listing instead of developing — the exact failure modes the examiner&apos;s reports cite, coached out of you.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── C. HOW A TEACH-THROUGH WORKS ── */}
        <section className="section" aria-label="How a teach-through works">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The loop</span>
              <h2 className="h-section">How a teach-through <em className="italic">works.</em></h2>
            </div>
            <ol className="tt-steps">
              <li className="tt-step"><span className="tt-n">1</span><span className="tt-t">Attempt the drill.</span></li>
              <li className="tt-step"><span className="tt-n">2</span><span className="tt-t">Ezra marks it against the requirement.</span></li>
              <li className="tt-step"><span className="tt-n">3</span><span className="tt-t">He names the failure mode.</span></li>
              <li className="tt-step"><span className="tt-n">4</span><span className="tt-t">You repair the answer.</span></li>
              <li className="tt-step"><span className="tt-n">5</span><span className="tt-t">Only then is the model answer revealed.</span></li>
            </ol>
          </div>
        </section>

        {/* ── D. THE 20% MOST NEVER PRACTISE ── */}
        <section className="section one-sub" aria-label="Professional-skills marking">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Professional skills</span>
              <h2 className="h-section">The 20% most candidates <em className="italic">never practise.</em></h2>
              <p className="lead">A fifth of every APM answer is the professional skills. Gradd marks them against ACCA&apos;s published professional-skills descriptors — and names the evidence.</p>
            </div>
            <div className="d-grid">
              <div className="skills-grid">
                <div className="skill-tile">
                  <h3>Communication</h3>
                  <p>Structure, clarity, report style.</p>
                </div>
                <div className="skill-tile">
                  <h3>Analysis &amp; evaluation</h3>
                  <p>Developed points, judgement, prioritisation.</p>
                </div>
                <div className="skill-tile">
                  <h3>Scepticism</h3>
                  <p>Challenge assumptions, limitations, reliability.</p>
                </div>
                <div className="skill-tile">
                  <h3>Commercial acumen</h3>
                  <p>Business impact, practical recommendations.</p>
                </div>
              </div>
              <div className="mark-panel" role="img" aria-label="Professional-skills marking panel showing evidence-cited feedback">
                <div className="mark-panel-hd">
                  <span className="mark-panel-title">Professional skills</span>
                  <span className="mark-panel-score">7<span className="mark-panel-of">/10</span></span>
                </div>
                <div className="mark-row">
                  <div className="mark-row-hd"><span className="mark-skill">Scepticism</span><span className="mark-band mark-band--strong">strong</span></div>
                  <p className="mark-evidence">&ldquo;challenged the covering note&apos;s &lsquo;record revenue&rsquo; framing against falling ROCE and EPS…&rdquo;</p>
                </div>
                <div className="mark-row">
                  <div className="mark-row-hd"><span className="mark-skill">Communication</span><span className="mark-band mark-band--mid">competent</span></div>
                  <p className="mark-evidence">&ldquo;reads as notes, not a board report — no structure, conversational register…&rdquo;</p>
                </div>
              </div>
            </div>
            <p className="ja-caption">Marked against ACCA&apos;s published professional-skills descriptors, with the evidence named.</p>
          </div>
        </section>

        {/* ── EVERYTHING THE PAPER DEMANDS ── */}
        <section className="section" id="features" aria-label="What is included">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">What&apos;s included</span>
              <h2 className="h-section">Everything the paper <em className="italic">demands.</em></h2>
            </div>
            <div className="who-grid">
              <div className="who-card">
                <span className="who-tag">Drills</span>
                <h3>91 exam-style drills.</h3>
                <p>Every examinable learning outcome in the live S26–J27 syllabus covered.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Cases</span>
                <h3>Full exam cases.</h3>
                <p>Multi-exhibit, multi-requirement, CBE-style. Section A 50-markers and Section B 25-markers.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Marking</span>
                <h3>Professional-skills marking.</h3>
                <p>On your whole answer, with evidence-cited feedback per skill.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Mock</span>
                <h3>A full timed mock.</h3>
                <p>3h 15m, one clock, three cases, marked as one paper.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── E. COMPARISON STRIP ── */}
        <section className="section" aria-label="How Gradd compares">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it compares</span>
              <h2 className="h-section">Taught, marked and mocked — <em className="italic">for one sitting price.</em></h2>
            </div>
            <div className="compare-strip">
              <div className="compare-col">
                <div className="compare-name">Question banks</div>
                <p>Practice, no teaching; you mark yourself.</p>
              </div>
              <div className="compare-col">
                <div className="compare-name">Human tuition</div>
                <p>One hour at a time.</p>
              </div>
              <div className="compare-col compare-col--gradd">
                <div className="compare-name">Gradd</div>
                <p>Taught, marked and mocked, €99 for the whole sitting.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="section pricing-band" id="pricing" aria-label="Pricing">
          <div className="wrap">
            <div className="section-head" style={{marginLeft:'auto',marginRight:'auto',textAlign:'center'}}>
              <span className="eyebrow" style={{display:'inline-block',marginBottom:18}}>Pricing</span>
              <h2 className="h-section" style={{marginLeft:'auto',marginRight:'auto'}}>Start free. Pay only when you commit to the sitting.</h2>
              <p className="lead" style={{margin:'22px auto 0'}}>Drills are free so you can test the method. Upgrade when you want full coaching, cases, marking and the mock.</p>
            </div>
            <div className="price-grid">
              <article className="price-card">
                <span className="price-name">Free</span>
                <div className="price-amount"><span className="cur">€</span>0</div>
                <p className="price-tagline">All 91 drills. 3 full teach-throughs. No card.</p>
                <ul className="price-features">
                  <li>Every APM drill, unlimited</li>
                  <li>3 full teach-throughs with Ezra</li>
                  <li>No card, no commitment</li>
                </ul>
                <Link href={AUTH_FREE} className="btn btn-ghost">Start free <span className="arrow">→</span></Link>
              </article>

              <article className="price-card featured">
                <span className="price-badge">Best for one sitting</span>
                <span className="price-name">90-day exam pass</span>
                <div className="price-amount"><span className="cur">€</span>99<span className="per">one-time · 90 days</span></div>
                <p className="price-tagline">Full access through your sitting — drills, cases, marking and the timed mock.</p>
                <ul className="price-features">
                  <li>Unlimited teach-throughs with Ezra</li>
                  <li>Full exam cases + professional-skills marking</li>
                  <li>The timed mock, marked as one paper</li>
                  <li>One payment — no recurring charge</li>
                </ul>
                <Link href={AUTH_SUBSCRIBE} className="btn btn-rust">Get the 90-day pass <span className="arrow">→</span></Link>
              </article>

              <article className="price-card">
                <span className="price-badge price-badge--muted">Flexible</span>
                <span className="price-name">Monthly</span>
                <div className="price-amount"><span className="cur">€</span>49<span className="per">/ month</span></div>
                <p className="price-tagline">Everything in the pass, month to month.</p>
                <ul className="price-features">
                  <li>Unlimited teach-throughs with Ezra</li>
                  <li>Full exam cases + professional-skills marking</li>
                  <li>The timed mock, marked as one paper</li>
                  <li>Cancel any time</li>
                </ul>
                <Link href={AUTH_SUBSCRIBE} className="btn btn-ghost">Subscribe monthly <span className="arrow">→</span></Link>
              </article>
            </div>
            <p className="price-note">14-day money-back guarantee.</p>
          </div>
        </section>

        {/* ── F. FAQ (+ FAQPage JSON-LD) ── */}
        <section className="section" id="faq" aria-label="Frequently asked questions">
          <div className="wrap" style={{maxWidth:820}}>
            <div className="section-head">
              <span className="eyebrow">FAQ</span>
              <h2 className="h-section">Questions, <em className="italic">answered.</em></h2>
            </div>
            <dl className="faq-list">
              {FAQS.map((f, i) => (
                <div className="faq-item" key={i}>
                  <dt className="faq-q">{f.q}</dt>
                  <dd className="faq-a">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
          />
        </section>

        {/* ── FINAL CTA ── */}
        <section className="final-cta" aria-label="Get started">
          <div className="wrap final-cta-inner">
            <div className="tag-pill" style={{marginBottom:30,color:'color-mix(in oklab,var(--forest-ink) 80%,transparent)',borderColor:'color-mix(in oklab,var(--forest-ink) 30%,transparent)'}}>
              <span className="dot" /> Every drill free · No card
            </div>
            <h2 className="h-display">Preparing for the <em className="italic">next APM sitting?</em></h2>
            <p className="lead">Start with every drill free — no card. Upgrade when you commit to the sitting.</p>
            <div className="hero-cta" style={{justifyContent:'center',marginTop:36}}>
              <Link href={AUTH_FREE} className="btn btn-rust">Start free <span className="arrow">→</span></Link>
            </div>
            <div className="small">Every drill free · €99 for 90 days or €49/month · 14-day money-back guarantee</div>
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
              <Link href="/blog?subject=apm">Blog</Link>
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
  overflow-x: clip;
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
  position: sticky; top: 0; z-index: 100;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  background: var(--paper);
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
.acca-lp .nav-cta { display: flex; align-items: center; gap: 14px; }
.acca-lp .nav-signin {
  font-size: 14px; color: var(--ink-2); text-decoration: none;
  white-space: nowrap; transition: color 0.15s;
}
.acca-lp .nav-signin:hover { color: var(--ink); }
@media (max-width: 480px) { .acca-lp .nav-signin { font-size: 13px; } }
@media (max-width: 860px) { .acca-lp .nav-links { display: none; } }
@media (max-width: 480px) {
  .acca-lp .nav-inner { height: 56px; }
  .acca-lp .nav-cta { gap: 10px; }
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
.acca-lp .ezra-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--forest); color: var(--gold);
  display: grid; place-items: center; font-family: var(--mono);
  font-size: 11px; font-weight: 500;
}
.acca-lp .ezra-msg { display: flex; flex-direction: column; gap: 10px; max-width: 90%; }
.acca-lp .ezra-msg p { margin: 0; }
.acca-lp .ezra-msg strong { color: var(--forest); font-weight: 600; }
.acca-lp .ezra-msg em { font-style: italic; font-family: var(--serif); font-size: 1.12em; color: var(--rust); }
.acca-lp .ezra-msg .key { color: var(--forest); font-style: italic; font-family: var(--serif); font-size: 1.12em; }
.acca-lp .ezra-msg h4 {
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
.acca-lp .trust-footnote {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.05em;
  color: var(--ink-3); margin-top: 8px; text-align: center;
}

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
  background: var(--paper); display: grid; grid-template-columns: auto 1fr;
  gap: 18px; align-items: start;
}
.acca-lp .pain-card .stat {
  font-family: var(--serif); font-size: clamp(22px, 3.5vw, 30px); line-height: 1.1;
  color: var(--rust); letter-spacing: -0.02em;
  overflow-wrap: break-word; word-break: break-word;
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

/* ── Hero note + trust strip + visual caption + hint badge ── */
.acca-lp .hero-note { margin-top: 16px; font-size: 13.5px; color: var(--ink-2); line-height: 1.5; font-weight: 500; }
.acca-lp .visual-caption {
  margin-top: 16px; text-align: center; font-family: var(--serif); font-style: italic;
  font-size: 15px; color: var(--forest); line-height: 1.4;
}
.acca-lp .hint-badge {
  display: inline-block; align-self: flex-start; font-family: var(--mono);
  font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--rust);
  background: color-mix(in oklab, var(--rust) 14%, transparent);
  border: 1px solid color-mix(in oklab, var(--rust) 30%, transparent);
  padding: 2px 8px; border-radius: 999px; margin-bottom: 4px;
}

/* ── A. Judgement (before / diagnosis / after) ── */
.acca-lp .ja-card {
  display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: stretch; gap: 14px; margin-top: 8px;
}
@media (max-width: 860px) { .acca-lp .ja-card { grid-template-columns: 1fr; } }
.acca-lp .ja-col, .acca-lp .ja-diag {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 22px; display: flex; flex-direction: column; gap: 10px;
}
.acca-lp .ja-diag { background: color-mix(in oklab, var(--paper) 84%, var(--sage)); }
.acca-lp .ja-coached { border-color: var(--rust); }
.acca-lp .ja-tag { font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }
.acca-lp .ja-tag-diag { color: var(--forest); }
.acca-lp .ja-tag-coached { color: var(--rust); }
.acca-lp .ja-col p, .acca-lp .ja-diag p { font-size: 14px; line-height: 1.55; color: var(--ink); }
.acca-lp .ja-weak p { color: var(--ink-2); }
.acca-lp .ja-chip { align-self: center; justify-self: center; color: var(--rust); font-size: 18px; }
.acca-lp .ja-caption {
  margin-top: 22px; text-align: center; font-family: var(--serif); font-style: italic; font-size: 16px; color: var(--forest);
}

/* ── C. Teach-through steps ── */
.acca-lp .tt-steps { list-style: none; display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 8px; }
@media (max-width: 860px) { .acca-lp .tt-steps { grid-template-columns: 1fr; } }
.acca-lp .tt-step {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 22px 18px; display: flex; flex-direction: column; gap: 12px; align-items: flex-start;
}
.acca-lp .tt-n { font-family: var(--serif); font-style: italic; font-size: 30px; line-height: 1; color: var(--rust); }
.acca-lp .tt-t { font-size: 14px; line-height: 1.45; color: var(--ink); }

/* ── D. Skills grid + marking panel ── */
.acca-lp .d-grid {
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(24px, 4vw, 48px); align-items: start; margin-top: 8px;
}
@media (max-width: 940px) { .acca-lp .d-grid { grid-template-columns: 1fr; } }
.acca-lp .skills-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .acca-lp .skills-grid { grid-template-columns: 1fr; } }
.acca-lp .skill-tile { background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius); padding: 20px; }
.acca-lp .skill-tile h3 { font-family: var(--serif); font-size: 19px; letter-spacing: -0.01em; margin-bottom: 6px; }
.acca-lp .skill-tile p { font-size: 13px; color: var(--ink-2); line-height: 1.45; }
.acca-lp .mark-panel {
  background: var(--paper); border: 1px solid var(--rule-strong); border-radius: var(--radius);
  padding: 22px 24px; box-shadow: 0 20px 40px -28px rgba(20,24,22,0.18);
  display: flex; flex-direction: column; gap: 14px;
}
.acca-lp .mark-panel-hd { display: flex; align-items: baseline; justify-content: space-between; padding-bottom: 12px; border-bottom: 1px solid var(--rule); }
.acca-lp .mark-panel-title { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); }
.acca-lp .mark-panel-score { font-family: var(--serif); font-size: 30px; color: var(--forest); line-height: 1; }
.acca-lp .mark-panel-of { font-size: 16px; color: var(--ink-3); }
.acca-lp .mark-row { display: flex; flex-direction: column; gap: 6px; }
.acca-lp .mark-row-hd { display: flex; align-items: center; gap: 10px; }
.acca-lp .mark-skill { font-size: 13.5px; font-weight: 600; color: var(--ink); }
.acca-lp .mark-band { font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; }
.acca-lp .mark-band--strong { color: oklch(45% 0.12 145); background: oklch(90% 0.06 145); }
.acca-lp .mark-band--mid { color: oklch(48% 0.11 75); background: color-mix(in oklab, var(--gold) 20%, transparent); }
.acca-lp .mark-evidence { font-size: 13px; color: var(--ink-2); line-height: 1.5; font-style: italic; }

/* ── E. Comparison strip ── */
.acca-lp .compare-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 8px; }
@media (max-width: 760px) { .acca-lp .compare-strip { grid-template-columns: 1fr; } }
.acca-lp .compare-col {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 24px; display: flex; flex-direction: column; gap: 8px;
}
.acca-lp .compare-col--gradd { border-color: var(--rust); background: color-mix(in oklab, var(--paper) 88%, var(--rust)); }
.acca-lp .compare-name { font-family: var(--serif); font-size: 20px; letter-spacing: -0.01em; color: var(--ink); }
.acca-lp .compare-col--gradd .compare-name { color: var(--rust-2); }
.acca-lp .compare-col p { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── F. FAQ ── */
.acca-lp .faq-list { margin-top: 8px; }
.acca-lp .faq-item { padding: 22px 0; border-top: 1px solid var(--rule); }
.acca-lp .faq-item:last-child { border-bottom: 1px solid var(--rule); }
.acca-lp .faq-q { font-family: var(--serif); font-size: 20px; letter-spacing: -0.01em; color: var(--ink); margin-bottom: 8px; }
.acca-lp .faq-a { font-size: 15px; line-height: 1.6; color: var(--ink-2); margin: 0; }

/* ── Muted price badge (Monthly) ── */
.acca-lp .price-badge--muted { background: var(--paper-2); color: var(--ink-3); border: 1px solid var(--rule-strong); }

/* ── Pricing cards ── */
.acca-lp .price-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 44px; align-items: stretch;
}
@media (max-width: 860px) { .acca-lp .price-grid { grid-template-columns: 1fr; max-width: 460px; margin-left: auto; margin-right: auto; } }
.acca-lp .price-card {
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius);
  padding: 30px 28px; display: flex; flex-direction: column; gap: 14px; position: relative;
}
.acca-lp .price-card.featured {
  border-color: var(--rust); box-shadow: 0 24px 50px -30px rgba(20,24,22,0.28);
}
.acca-lp .price-badge {
  position: absolute; top: -11px; left: 24px; background: var(--rust); color: var(--rust-ink);
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 999px;
}
.acca-lp .price-name {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3);
}
.acca-lp .price-amount {
  font-family: var(--serif); font-size: 46px; letter-spacing: -0.02em; line-height: 1; color: var(--ink);
}
.acca-lp .price-amount .cur { font-size: 0.5em; vertical-align: super; margin-right: 2px; }
.acca-lp .price-amount .per {
  font-family: var(--sans); font-size: 14px; color: var(--ink-3); margin-left: 8px; letter-spacing: 0;
}
.acca-lp .price-tagline { font-size: 14px; color: var(--ink-2); line-height: 1.5; }
.acca-lp .price-features { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 4px 0; }
.acca-lp .price-features li {
  font-size: 13.5px; color: var(--ink-2); padding-left: 22px; position: relative; line-height: 1.45;
}
.acca-lp .price-features li::before { content: "✓"; position: absolute; left: 0; color: var(--rust); font-weight: 600; }
.acca-lp .price-card .btn { margin-top: auto; justify-content: center; width: 100%; }
.acca-lp .price-note {
  text-align: center; font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-3); margin-top: 26px;
}

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
