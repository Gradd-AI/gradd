'use client';

// ─────────────────────────────────────────────────────────────────────────────
// IB Landing Page — redesign/ib-landing
// Design system: docs/styles.css (Fraunces / Geist / Geist Mono, oklch palette)
// Copy: docs/Gradd_IB_Landing_Copy_Deck.md — DECK WINS over prototype on every
//       conflict. All copy-deck instructions applied (KEEP / FIX / CUT / REBUILD).
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// ── Pricing data ──────────────────────────────────────────────────────────────

const SINGLE = {
  monthly: { amount: '44', cents: '.99', per: '/ month', note: null },
  annual:  { amount: '349', cents: '', per: '/ year', note: '≈ €29 / month' },
};
const BUNDLE = {
  monthly: { amount: '74', cents: '.99', per: '/ month', note: 'Save €15/mo vs separate' },
  annual:  { amount: '579', cents: '', per: '/ year', note: '≈ €48 / month · save ~35%' },
};

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'Is Gradd actually built for the IB syllabus — or is it ChatGPT with a wrapper?',
    a: 'Built specifically for IB. Mia runs on the official IB Economics (2022) and IB Business Management (2024) subject guides and the IBO assessment framework — command terms, AO levels, markband criteria. Generic LLMs don\'t pass IB: they hallucinate command terms, draw wrong diagrams, and ignore markbands.',
  },
  {
    q: 'Can Gradd really replace a private tutor?',
    a: 'For the core of what a tutor does — explanation, exam-style questioning within lessons, marking, accountability — yes. For pastoral support and human encouragement, no. Gradd is built to be the primary tutor; keep your school teacher for the human side.',
  },
  {
    q: 'My exam is in three weeks. Is it worth starting now?',
    a: 'Yes. From your very first session, Mia gets you working on the topics you\'re weakest on straight away — no re-reading textbooks, no warm-up busywork.',
  },
  {
    q: 'What about Maths, English, Sciences?',
    a: 'Not yet — and on purpose. Generic IB tutors are bad because they cover everything shallowly. We picked two subjects, built them properly, and intend to stay that way until each is the best in the world.',
  },
  {
    q: 'How does diagram marking actually work?',
    a: 'You upload a photo of a diagram you\'ve drawn on paper. Mia checks it against the IBO mark scheme criteria for that question type: axes, curve shape, equilibrium markers, shading. You get a numeric mark and the specific feedback that gets you the missing marks next time.',
  },
  {
    q: 'What if Gradd.ai isn\'t right for me?',
    a: 'Every plan comes with a 7-day money-back guarantee. If you decide it\'s not for you within the first week, email us and we refund you in full — no forms, no friction.',
  },
  {
    q: 'Can my school sign up a whole cohort?',
    a: 'School plans are in development. Email schools@gradd.ai to register interest and we\'ll be in touch as soon as they\'re available.',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function IBLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const single = SINGLE[billing];
  const bundle = BUNDLE[billing];

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
      {/* ── Scoped design-system styles ── */}
      <style>{CSS}</style>

      <div className="ib-lp">
        <div className="bg-grain" aria-hidden="true" />

        {/* ── NAV ── */}
        <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
          <div className="wrap nav-inner">
            <a href="#" className="nav-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:22,width:'auto',display:'block'}} />
            </a>
            <nav className="nav-links" aria-label="Primary">
              {['curriculum','mia','parents','pricing','faq'].map(id => (
                <button key={id} className="nav-link-btn" onClick={() => scrollTo(id)}>
                  {id === 'mia' ? 'Meet Mia' : id === 'faq' ? 'FAQ' : id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </nav>
            <div className="nav-cta">
              <Link href="/demo" className="btn btn-see-it btn-sm">Try the live demo — no account needed</Link>
              <Link href="/auth/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">Start <span className="arrow">→</span></Link>
            </div>
          </div>
        </header>

        {/* ── HERO ── */}
        <section className="hero">
          <div className="wrap hero-grid">
            <div className="hero-copy">
              <div className="hero-eyebrow eyebrow">
                <span>IB Economics</span><span className="dot" /><span>IB Business Management</span>
              </div>
              <h1 className="hero-h1 h-display">
                Walk into your IB exam <span className="em underline">knowing</span> exactly what to do.
              </h1>
              <p className="hero-sub">
                Gradd.ai is the AI tutor built only for IB Economics and IB Business Management. Full syllabus. IBO-standard diagrams marked instantly. Available the night before the exam.
              </p>
              <p className="hero-thesis">
                Gradd doesn&apos;t just explain IB Economics and Business Management.
                {' '}It trains students to write the answers IB examiners reward.
              </p>
              <div className="hero-cta">
                <Link href="/auth/signup" className="btn btn-rust">Start learning with Mia <span className="arrow">→</span></Link>
                <Link href="/demo" className="btn btn-ghost">Try the live demo — no account needed</Link>
              </div>
              <div className="hero-meta">
                <span>From €44.99 / month</span>
                <span className="dot" />
                <span>7-day money-back guarantee</span>
                <span className="dot" />
                <span>Cancel anytime</span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="chat" aria-label="Live session with Mia, your AI tutor">
                <div className="chat-hd">
                  <div className="chat-logo"><img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:16,width:'auto',display:'block'}} /></div>
                  <div className="chat-name-pill"><span className="live" />Mia</div>
                  <div className="chat-course">
                    <div className="em">Economics as a Social Science</div>
                    {/* Deck: drop "of 150" — false denominator */}
                    <div>IB Economics · SL · Session 12</div>
                  </div>
                </div>
                <div className="chat-body">
                  <div className="chat-row">
                    <div className="mia-av">M</div>
                    <div className="mia-msg">
                      <p>Welcome back. Last session we started <em>Economics as a Social Science</em> — we did one exchange and didn&apos;t finish. Today we&apos;re continuing that lesson, which appears on Papers 1 and 2 for your SL exam.</p>
                      <p>Let me pick up where we left off. We were establishing what economics actually <em>is</em> — not just &ldquo;the study of money&rdquo;, but something deeper.</p>
                      <p><strong>Economics is a social science.</strong> That means it studies human behaviour and decision-making in society. The fundamental problem it solves: <span className="key">we have unlimited wants, but limited resources.</span></p>
                      <p>This fact — called <strong>scarcity</strong> — forces every economic decision. Everyone must choose, and every choice involves giving up something else. That trade-off is your <strong>opportunity cost</strong>.</p>
                    </div>
                  </div>
                  <div className="chat-row from-user">
                    <div className="user-bubble">say all that but for me to understand — break it down</div>
                    <div className="user-av">T</div>
                  </div>
                  <div className="chat-row">
                    <div className="mia-av">M</div>
                    <div className="mia-msg">
                      <p>You&apos;re right — let me slow down.</p>
                      <h4>Start here: what is economics?</h4>
                      <p>Economics is the study of <em>choice under pressure</em>. You want loads of things. You can&apos;t have everything. So you have to pick.</p>
                    </div>
                  </div>
                </div>
                <div className="chat-input">
                  <button className="attach" aria-label="Upload photo or sketch">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 7h3l1.7-2.5A1 1 0 0 1 8.5 4h7a1 1 0 0 1 .8.5L18 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                      <circle cx="12" cy="13" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                  <div className="ph">Reply to Mia…</div>
                  <div className="send">↵</div>
                </div>
                <div className="chat-foot">Session 12 · IB Economics SL · Mia online 24/7</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TRUST BAR — REBUILT per deck ── */}
        {/* Old bar invented "136 question banks" and "153 worked exemplars" — replaced with real figures */}
        <section className="trust">
          <div className="wrap trust-inner">
            <div className="trust-label">Built around the official IBO syllabus</div>
            <div className="trust-stats">
              <div className="trust-stat"><span className="num">346</span><span className="lbl">structured lessons</span></div>
              <div className="trust-stat"><span className="num">2</span><span className="lbl">subjects, HL &amp; SL</span></div>
              <div className="trust-stat"><span className="num">61</span><span className="lbl">IBO-standard diagrams</span></div>
              <div className="trust-stat"><span className="num">24/7</span><span className="lbl">availability</span></div>
            </div>
          </div>
        </section>

        {/* ── DEMO SIGNPOST ── */}
        <section className="demo-signpost-band">
          <div className="wrap">
            <div className="demo-signpost">
              <div className="demo-signpost-copy">
                <h3 className="demo-signpost-h">Try a real IB lesson before signing up.</h3>
                <p className="demo-signpost-body">Mia walks you through a live lesson one question at a time — correcting mistakes, drawing diagrams, and showing the answer structure IB examiners reward.</p>
                <p className="demo-signpost-sub">No account needed.</p>
              </div>
              <Link href="/demo" className="btn btn-rust demo-signpost-cta">Try the live demo <span className="arrow">→</span></Link>
            </div>
          </div>
        </section>

        {/* ── PAIN ── */}
        <section className="section pain">
          <div className="wrap pain-grid">
            <div>
              <div className="eyebrow">The problem<span className="dot" />Private tutoring</div>
              <h2 className="h-section" style={{marginTop:18}}>
                IB tutoring costs too much.<br/>
                And it <em className="italic" style={{color:'var(--rust)'}}>still</em>{' '}doesn&apos;t cover the whole course.
              </h2>
              {/* Deck: pull-quote attribution ("— IB student, May 2024") CUT — fabricated */}
            </div>
            <div className="pain-cards">
              <div className="pain-card">
                <div className="stat">€90<span className="unit">/ hour</span></div>
                <div>
                  <div className="label">Tutors are priced like therapists</div>
                  <div className="desc">Most families spend €3,500–€9,000 over the two years. And that&apos;s for two hours a week — not full coverage.</div>
                </div>
              </div>
              {/* Deck: remove "38% of syllabus" fabricated stat — use "Paper 3" label */}
              <div className="pain-card">
                <div className="stat">Paper 3<span className="unit">first to go</span></div>
                <div>
                  <div className="label">Coverage gaps everywhere</div>
                  <div className="desc">A weekly tutor reaches maybe two-thirds of the course. Paper 3, HL extensions and exam technique are the bits that get left behind.</div>
                </div>
              </div>
              <div className="pain-card">
                <div className="stat">0<span className="unit">at 11pm</span></div>
                <div>
                  <div className="label">Never there when you need them</div>
                  <div className="desc">The exam is tomorrow. Your tutor is asleep. The doubt about monopoly diagrams isn&apos;t going to resolve itself.</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <hr className="rule" />

        {/* ── ONE SUBSCRIPTION ── */}
        <section className="section one-sub">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The answer<span className="dot" />One subscription</span>
              <h2 className="h-section">
                One subscription. The <em className="italic">complete</em> IB Economics and IB Business Management curriculum.
              </h2>
              <p className="lead">
                No more piecing together five tutors, three textbooks and a YouTube playlist. Gradd is the whole course, taught and marked to IBO standards, in one place.
              </p>
            </div>
            <div className="one-sub-grid">
              <div className="os-card">
                <div className="num">01 / Lessons</div>
                <h3>Every topic from the official IB syllabus — Economics 2022, Business Management 2024.</h3>
                <p>Micro, macro, global, development for Econ. Strategy, marketing, finance &amp; ops for BM. HL and SL extensions, at the depth IB actually expects.</p>
              </div>
              <div className="os-card">
                <div className="num">02 / Marking</div>
                <h3>Every paper format. Marked the way IB marks.</h3>
                <p>Mia works through Paper 1, 2 and 3-style questions with you in session — IBO command terms, diagram marking — graded against the official IBO markbands and assessment criteria, not generic AI hand-waving.</p>
              </div>
              <div className="os-card">
                <div className="num">03 / Tutor</div>
                <h3>Mia, the tutor on call.</h3>
                <p>Ask anything, any time — drawing diagrams, working questions, making sense of an exam question worded to trip you up.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SUBJECTS ── */}
        <section className="section" id="curriculum">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Coverage<span className="dot" />HL + SL</span>
              <h2 className="h-section">
                IB Economics and IB Business Management — <em className="italic" style={{color:'var(--rust)'}}>fully covered.</em>
              </h2>
              <p className="lead">Both subjects taught at HL and SL, with the depth the IBO command terms actually require.</p>
            </div>
            <div className="subjects-grid">
              <article className="subj">
                <div className="subj-hd">
                  <h3>IB Economics</h3>
                  <span className="code">HL · SL · 2022 syllabus</span>
                </div>
                <div className="subj-body">
                  <div className="subj-row"><div className="key">Unit 1</div><div className="val">Introduction — scarcity, choice and economic systems.</div></div>
                  <div className="subj-row"><div className="key">Unit 2</div><div className="val">Microeconomics — demand, supply, elasticities, market failure, intervention.</div></div>
                  <div className="subj-row"><div className="key">Unit 3</div><div className="val">Macroeconomics — AD/AS, unemployment, inflation, fiscal &amp; monetary policy.</div></div>
                  <div className="subj-row"><div className="key">Unit 4</div><div className="val">Global economy — trade, exchange rates, balance of payments, integration.</div></div>
                  <div className="subj-row"><div className="key">HL only</div><div className="val">Productive/allocative efficiency, monopoly diagrams, sustainable development quant.</div></div>
                  <div className="subj-row"><div className="key">Papers</div><div className="val">P1 essays · P2 data response · P3 quantitative (HL) · exam technique.</div></div>
                </div>
                <div className="subj-foot">
                  <div className="price-inline">€44<span style={{fontSize:'0.7em'}}>.99</span> <span className="small">/ month</span></div>
                  <Link className="btn btn-primary btn-sm" href="/auth/signup">Get started <span className="arrow">→</span></Link>
                </div>
              </article>

              <article className="subj">
                <div className="subj-hd">
                  <h3>IB Business Management</h3>
                  {/* Deck FIX: "2022 syllabus" → "2024 syllabus" */}
                  <span className="code">HL · SL · 2024 syllabus</span>
                </div>
                <div className="subj-body">
                  <div className="subj-row"><div className="key">Unit 1</div><div className="val">Business organisation &amp; environment — stakeholders, growth, evolution.</div></div>
                  <div className="subj-row"><div className="key">Unit 2</div><div className="val">Human resource management — leadership, motivation, organisational culture.</div></div>
                  <div className="subj-row"><div className="key">Unit 3</div><div className="val">Finance &amp; accounts — sources of finance, ratios, investment appraisal.</div></div>
                  <div className="subj-row"><div className="key">Unit 4</div><div className="val">Marketing — research, the 7Ps, branding, e-commerce, international marketing.</div></div>
                  <div className="subj-row"><div className="key">Unit 5</div><div className="val">Operations — production, quality, R&amp;D, crisis &amp; contingency planning.</div></div>
                  <div className="subj-row"><div className="key">Papers</div><div className="val">P1 case study · P2 quantitative · P3 social enterprise (HL) · exam technique.</div></div>
                </div>
                <div className="subj-foot">
                  <div className="price-inline">€44<span style={{fontSize:'0.7em'}}>.99</span> <span className="small">/ month</span></div>
                  <Link className="btn btn-primary btn-sm" href="/auth/signup">Get started <span className="arrow">→</span></Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── EXAM-READY BAND ── */}
        <section className="section band-dark">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow" style={{color:'color-mix(in oklab,var(--forest-ink) 60%,transparent)'}}>Why Gradd<span className="dot" />Built for outcomes</span>
              <h2 className="h-section">
                Start at zero. Finish <em className="italic">exam-ready.</em>
              </h2>
              <p className="lead">
                Whether you&apos;re starting Year 1 in September or cramming the week before May exams, Gradd meets you where you are and pushes you to a 7.
              </p>
            </div>
            <div className="pillars">
              <div className="pillar">
                <div className="num">01</div>
                <h3>From day one.</h3>
                <p>Mia teaches from scratch and adapts as you go — every session builds on where you actually are, not where a curriculum assumes you should be.</p>
              </div>
              <div className="pillar">
                <div className="num">02</div>
                <h3>On demand.</h3>
                <p>Lessons, exam-style questions, marking and explanation — whenever you have ten minutes between calculus and football.</p>
              </div>
              <div className="pillar">
                <div className="num">03</div>
                <h3>Built around your exam.</h3>
                <p>Everything Mia does is pointed at the papers you&apos;re sitting — structured teaching, exam-style questions, and your weak areas, all working toward the same result.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── DIAGRAMS ── KEEP ENTIRELY — true and shipped */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Feature<span className="dot" />Diagram marking</span>
              <h2 className="h-section">
                IBO-standard diagrams. Drawn inline. <em className="italic" style={{color:'var(--rust)'}}>Marked instantly.</em>
              </h2>
              <p className="lead">
                The thing examiners actually grade you on — and the one thing other AI tutors get wrong. Mia draws to IBO conventions, then marks against the official criteria. You can also upload a photo of a diagram you&apos;ve drawn on paper and get it marked the same way.
              </p>
            </div>
            <div className="diag-demo">
              <div className="diag-canvas">
                <div className="diag-canvas-hd"><span>Student attempt · positive externality</span><span>2.4 — market failure</span></div>
                <svg viewBox="0 0 360 220" xmlns="http://www.w3.org/2000/svg" style={{color:'var(--ink)',width:'100%',height:'auto'}}>
                  <defs>
                    <pattern id="hatch2" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
                      <line x1="0" y1="0" x2="0" y2="6" stroke="#B14624" strokeWidth="1.2" opacity="0.35"/>
                    </pattern>
                  </defs>
                  <line x1="50" y1="20" x2="50" y2="190" stroke="currentColor" strokeWidth="1.4"/>
                  <line x1="50" y1="190" x2="330" y2="190" stroke="currentColor" strokeWidth="1.4"/>
                  <text x="42" y="20" fontFamily="Geist Mono,monospace" fontSize="10" textAnchor="end">P</text>
                  <text x="332" y="200" fontFamily="Geist Mono,monospace" fontSize="10">Q</text>
                  <line x1="70" y1="170" x2="320" y2="40" stroke="currentColor" strokeWidth="1.8"/>
                  <text x="324" y="40" fontFamily="Geist Mono,monospace" fontSize="10">MSC = MPC</text>
                  <line x1="70" y1="40" x2="320" y2="170" stroke="currentColor" strokeWidth="1.8" opacity="0.85"/>
                  <text x="324" y="170" fontFamily="Geist Mono,monospace" fontSize="10">MPB</text>
                  <line x1="120" y1="40" x2="330" y2="120" stroke="#B14624" strokeWidth="1.8"/>
                  <text x="118" y="36" fontFamily="Geist Mono,monospace" fontSize="10" fill="#B14624">MSB</text>
                  <polygon points="195,105 240,80 240,135" fill="url(#hatch2)" stroke="#B14624" strokeWidth="1" strokeDasharray="2 3"/>
                  <text x="222" y="118" fontFamily="serif" fontStyle="italic" fontSize="12" fill="#B14624">welfare gain</text>
                  <line x1="195" y1="190" x2="195" y2="105" stroke="currentColor" strokeDasharray="2 3" opacity="0.6"/>
                  <line x1="240" y1="190" x2="240" y2="80" stroke="currentColor" strokeDasharray="2 3" opacity="0.6"/>
                  <text x="195" y="204" fontFamily="Geist Mono,monospace" fontSize="10" textAnchor="middle">Q*</text>
                  <text x="240" y="204" fontFamily="Geist Mono,monospace" fontSize="10" textAnchor="middle">Qopt</text>
                </svg>
              </div>
              <div className="diag-marking">
                <div className="diag-canvas-hd" style={{marginBottom:6}}><span>Mia · marking</span><span>IBO criteria</span></div>
                <div className="criterion"><div className="tick">✓</div><div className="label">Axes labelled correctly (P / Q).</div><div className="points">1 / 1</div></div>
                <div className="criterion"><div className="tick">✓</div><div className="label">MSB curve plotted right of MPB.</div><div className="points">1 / 1</div></div>
                <div className="criterion"><div className="tick">✓</div><div className="label">Welfare gain triangle shaded.</div><div className="points">1 / 1</div></div>
                <div className="criterion miss"><div className="tick">!</div><div className="label">Mark Q* and Q optimum on x-axis.</div><div className="points">0 / 1</div></div>
                <div className="diag-score">
                  <div>
                    <div className="kicker" style={{fontFamily:'var(--mono)',fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase'}}>Total</div>
                    <div className="big">3<span style={{fontFamily:'var(--mono)',fontStyle:'normal',fontSize:18,color:'var(--ink-3)'}}> / 4</span></div>
                  </div>
                  <Link className="btn btn-primary btn-sm" href="/auth/signup">Try a diagram <span className="arrow">→</span></Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MEET MIA — FIXED per deck ── */}
        <section className="section" id="mia" style={{background:'color-mix(in oklab,var(--paper) 92%,var(--paper-2))'}}>
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Meet Mia<span className="dot" />The tutor</span>
              {/* Deck FIX: headline drops "read every mark scheme since 2016" implication */}
              <h2 className="h-section">
                A tutor who knows the <em className="italic">mark scheme</em> — not just the subject.
              </h2>
              {/* Deck FIX: lead drops "examiners' reports, and 50+ past papers" */}
              <p className="lead">
                Mia is not ChatGPT in a costume. Mia is built on the IB Economics and IB Business Management subject guides and the official IBO assessment framework — command terms, AO levels and the markband descriptors examiners actually score against.
              </p>
            </div>
            <div className="cap-list">
              <div className="cap">
                <h4>Speaks IB command terms.</h4>
                <p>&ldquo;Evaluate&rdquo; is not &ldquo;describe&rdquo;. Mia calibrates answers to AO2/AO3 the way real examiners do.</p>
              </div>
              <div className="cap">
                <h4>Draws to IBO convention.</h4>
                <p>Curves correctly labelled, axes correctly oriented, shading where shading earns marks.</p>
              </div>
              <div className="cap">
                <h4>Generates exam-style questions in session.</h4>
                <p>Mia asks questions in the real exam idiom — including the ones written to confuse you — as part of normal teaching.</p>
              </div>
              <div className="cap">
                <h4>Gives feedback that improves marks.</h4>
                <p>Not &ldquo;good attempt!&rdquo; Specific: &ldquo;para 2 needs an evaluative judgement to access band 3&rdquo;.</p>
              </div>
              <div className="cap">
                <h4>Drills exam technique, paper by paper.</h4>
                <p>Paper 1 essays, Paper 2 data response, Paper 3 quant — the structure examiners reward, learned by doing it.</p>
              </div>
              <div className="cap">
                <h4>Tracks what you actually know.</h4>
                <p>Your weak topics surface daily until they don&apos;t. No more revising what you already mastered.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── BIG NUMBERS — CUT per deck ── */}
        {/* Deck: "Delete it. It duplicated the trust bar and repeated the same fabricated trio." */}

        {/* ── PARENTS — REBUILT per deck ── */}
        {/* Deck: remove "separate parent login", "one login multiple students", "every Sunday" → "every Monday" */}
        <section className="section parents" id="parents">
          <div className="wrap parents-grid">
            <div className="parents-copy">
              <span className="eyebrow">For parents<span className="dot" />Weekly digest</span>
              <h2 className="h-section" style={{marginTop:18}}>Parents see the progress that <em className="italic">matters.</em></h2>
              <p className="lead">A dashboard view built for parents, plus a weekly progress email. No more &ldquo;did you study today?&rdquo; guesswork — you&apos;ll see where they are, what they&apos;ve struggled with, and whether they&apos;re on pace for May.</p>
              <ul className="parents-bullets">
                <li><span><b>Parent view of the dashboard.</b> Sessions completed, weak topics flagged, days to exam, study streak.</span></li>
                <li><span><b>Weekly progress email, every Monday.</b> What they covered, a pace check, and what&apos;s next.</span></li>
                <li><span><b>Pace, in plain sight.</b> The dashboard and the weekly email both flag it the moment they fall behind.</span></li>
              </ul>
              <Link href="/demo" className="btn btn-ghost">See the parent view <span className="arrow">→</span></Link>
            </div>

            <div className="parents-visual">
              <div className="dash-preview" aria-label="Student dashboard — parent view">
                <div className="dash-preview-hd">
                  <div className="name">Louise&apos;s progress.</div>
                  <div className="meta">Week 12 · IB Econ SL · <span style={{fontStyle:'italic'}}>parent view</span></div>
                </div>
                <div className="dash-stats">
                  <div className="dash-stat ok"><div className="lbl">Streak</div><div className="val">3<span className="small">d</span></div></div>
                  <div className="dash-stat"><div className="lbl">Sessions</div><div className="val">5</div></div>
                  <div className="dash-stat warn"><div className="lbl">Pace</div><div className="val">1.3<span className="small">/wk</span></div></div>
                  <div className="dash-stat"><div className="lbl">Exam</div><div className="val">361<span className="small">d</span></div></div>
                </div>
                <div className="dash-week" aria-label="Last 7 days">
                  {['S','M','T','W','T','F','S'].map((d,i) => (
                    <div key={i} className={`dash-day${[3,4,5].includes(i) ? ' active' : ''}`}>{[3,4,5].includes(i) ? '✓' : d}</div>
                  ))}
                </div>
              </div>

              <div className="email-preview" aria-label="Weekly email preview">
                <div className="email-hd">
                  <div className="from">
                    <div className="ico">g</div>
                    <div>
                      <div className="from-name">gradd.ai</div>
                      <div className="from-addr">progress@gradd.ai</div>
                    </div>
                  </div>
                  <div className="time">Mon · 07:00</div>
                </div>
                <div className="email-subject">Weekly progress · <em>Louise</em> · Week 12</div>
                <div className="email-body">
                  <p>This week Louise completed <b>3 sessions</b> across Introduction to Economics — solid streak Wed → Fri.</p>
                  <p>Pace check: averaging <b>1.3 sessions/week</b> — to stay on track for May 2027, target is 3/wk.</p>
                  <p>No weak topics flagged yet. Next up: <b>Scarcity &amp; opportunity cost</b>.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHO IT'S FOR — KEEP ── */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Who it&apos;s for</span>
              <h2 className="h-section">Who Gradd <em className="italic">is</em> for.</h2>
            </div>
            <div className="who-grid">
              <div className="who-card">
                <span className="who-tag">Aiming for a 7</span>
                <h3>The student who&apos;s already strong, going for the edge.</h3>
                <p>You&apos;re at a 6 and you want the predicted that gets you into LSE. Gradd is the unfair advantage that runs on your timetable, not your tutor&apos;s.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Falling behind</span>
                <h3>The student who missed three weeks and won&apos;t say it out loud.</h3>
                <p>Catch up without anyone knowing. Mia won&apos;t sigh. Mia won&apos;t bill your parents €90 an hour. Start at the topic you fell off and rebuild.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Self-studying</span>
                <h3>Taking the subject without a teacher.</h3>
                <p>Online IB students, anticipated candidates, or just a school where Business isn&apos;t offered. The whole course, structured, in your pocket.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Paying parent</span>
                <h3>The parent who&apos;s done with €9,000 tutor bills.</h3>
                <p>Same coverage. Better depth. 1/40th the price.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMPARE — KEEP, one FIX ── */}
        <section className="section" id="compare" style={{background:'var(--sage)'}}>
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it stacks up</span>
              <h2 className="h-section">Gradd vs <em className="italic">other</em> IB tutoring options.</h2>
            </div>
            <div className="cmp-wrap">
              <div className="cmp-scroll">
                <table className="cmp">
                  <thead>
                    <tr>
                      <th></th>
                      <th className="gradd-col">Gradd</th>
                      <th>Private tutor</th>
                      <th>Group classes</th>
                      <th>Self-study</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cost</td>
                      <td className="gradd-col"><span className="y">€44.99 / month</span></td>
                      <td>€60–€120 / hour</td>
                      <td>€25–€45 / hour</td>
                      <td>Free–€120 (books)</td>
                    </tr>
                    <tr>
                      <td>Full syllabus</td>
                      <td className="gradd-col"><span className="y">✓ HL &amp; SL, both subjects</span></td>
                      <td>Depends on tutor</td>
                      <td>Cohort-paced</td>
                      <td>You decide</td>
                    </tr>
                    <tr>
                      <td>Diagram marking</td>
                      <td className="gradd-col"><span className="y">✓ Instant, IBO criteria</span></td>
                      <td>Weekly</td>
                      <td>Rare</td>
                      <td><span className="n">—</span></td>
                    </tr>
                    {/* Deck FIX: "Past paper coverage — 2016 → today" row replaced */}
                    <tr>
                      <td>IBO-standard marking</td>
                      <td className="gradd-col"><span className="y">✓ command terms + markbands, instant</span></td>
                      <td>Varies by tutor</td>
                      <td>Generic</td>
                      <td><span className="n">—</span></td>
                    </tr>
                    <tr>
                      <td>Availability</td>
                      <td className="gradd-col"><span className="y">24/7</span></td>
                      <td>1–2 hours / week</td>
                      <td>Fixed schedule</td>
                      <td>Whenever</td>
                    </tr>
                    <tr>
                      <td>Tracks your progress</td>
                      <td className="gradd-col"><span className="y">✓ Adaptive</span></td>
                      <td>In their head</td>
                      <td><span className="n">—</span></td>
                      <td><span className="n">—</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="cmp-hint" aria-hidden="true">← swipe to compare →</p>
          </div>
        </section>

        {/* ── PRICING — REBUILT per deck: toggle + 2 plan cards ── */}
        {/* Deck: dropped fabricated tier features (revision planner, predicted-grade tracker,
              cross-topic synthesis, priority Mia, mock cycles, university essay help) */}
        <section className="section pricing-band" id="pricing">
          <div className="wrap">
            <div className="section-head" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto'}}>
              <span className="eyebrow" style={{display:'inline-block',margin:'0 auto 18px'}}>Pricing</span>
              <h2 className="h-section" style={{marginLeft:'auto',marginRight:'auto'}}>Simple pricing. <em className="italic">Full</em> IB curriculum. Global access.</h2>
              <p className="lead" style={{margin:'22px auto 0'}}>Cancel anytime. 7-day money-back guarantee on every plan. Every subscription includes Mia — your full-time AI tutor.</p>
            </div>

            {/* Billing toggle */}
            <div className="billing-toggle">
              <button
                className={`toggle-btn${billing === 'monthly' ? ' active' : ''}`}
                onClick={() => setBilling('monthly')}
              >Monthly</button>
              <button
                className={`toggle-btn${billing === 'annual' ? ' active' : ''}`}
                onClick={() => setBilling('annual')}
              >Annual <span className="save-badge">Save ~35%</span></button>
            </div>

            <div className="price-grid-2">
              {/* Card 1: Single subject */}
              <article className="price">
                <span className="price-tag">Single subject</span>
                <h3>IB Economics <span style={{color:'var(--ink-3)',fontSize:'0.62em',fontFamily:'var(--mono)',fontStyle:'normal'}}>or</span> IB Business Management</h3>
                <div className="amount">
                  <span className="cur">€</span>
                  {single.amount}
                  {single.cents && <span style={{fontSize:'0.55em'}}>{single.cents}</span>}
                  <span className="per">{single.per}</span>
                </div>
                {single.note && <p className="price-note">{single.note}</p>}
                <p className="blurb">IB Economics or IB Business Management. Full course, all features, Mia on demand.</p>
                <ul className="price-features">
                  <li><span>Full IB syllabus — HL &amp; SL</span></li>
                  <li><span>Paper 1, 2 &amp; 3 (HL) exam-style questions worked through in lessons</span></li>
                  <li><span>IBO-standard diagrams — taught inline, your hand-drawn diagrams marked</span></li>
                  <li><span>Unlimited sessions with Mia</span></li>
                  <li><span>Automatic progress tracking + weak-area drilling</span></li>
                  <li><span>Works on any device</span></li>
                </ul>
                <Link href="/auth/signup" className="btn btn-ghost">Start learning <span className="arrow">→</span></Link>
              </article>

              {/* Card 2: Both subjects — featured */}
              <article className="price featured">
                <span className="price-tag">Save €15/month vs separate</span>
                <h3>Both subjects</h3>
                <div className="amount">
                  <span className="cur">€</span>
                  {bundle.amount}
                  {bundle.cents && <span style={{fontSize:'0.55em'}}>{bundle.cents}</span>}
                  <span className="per">{bundle.per}</span>
                </div>
                {bundle.note && <p className="price-note" style={{color:'color-mix(in oklab,var(--forest-ink) 70%,transparent)'}}>{bundle.note}</p>}
                <p className="blurb">IB Economics and IB Business Management. One subscription. Both courses.</p>
                <ul className="price-features">
                  <li><span>Everything in single-subject — for both courses</span></li>
                  <li><span>Progress tracked separately per subject</span></li>
                  <li><span>One subscription, both tutors</span></li>
                </ul>
                <Link href="/auth/signup" className="btn btn-rust">Start learning <span className="arrow">→</span></Link>
              </article>
            </div>
          </div>
        </section>

        {/* ── FAQ — KEEP most, FIX three ── */}
        <section className="section" id="faq">
          <div className="wrap" style={{maxWidth:880}}>
            <div className="section-head">
              <span className="eyebrow">FAQ</span>
              <h2 className="h-section">Frequently asked questions.</h2>
            </div>
            <div className="faq-list">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className="faq-item"
                  data-open={openFaq === i ? '1' : '0'}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <div className="faq-q">
                    {faq.q}
                    <span className="toggle">+</span>
                  </div>
                  <div className="faq-a">{faq.a}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA — KEEP ── */}
        <section className="final-cta">
          <div className="wrap final-cta-inner">
            <div className="tag-pill" style={{marginBottom:30,color:'color-mix(in oklab,var(--forest-ink) 80%,transparent)',borderColor:'color-mix(in oklab,var(--forest-ink) 30%,transparent)'}}>
              <span className="dot" /> 7-day money-back guarantee
            </div>
            <h2 className="h-display">Pass IB Econ. Pass IB Business. <em className="italic">Period.</em></h2>
            <p className="lead">Start tonight. Be ahead of your class by next Monday.</p>
            <div className="hero-cta">
              <Link href="/auth/signup" className="btn btn-rust">Start learning with Mia <span className="arrow">→</span></Link>
              <button className="btn btn-ghost" onClick={() => scrollTo('pricing')}>See pricing</button>
            </div>
            <div className="small">From €44.99 / month · cancel anytime · 7-day money-back guarantee</div>
          </div>
        </section>

        {/* ── FOOTER — wired to real pages ── */}
        <footer className="footer">
          <div className="wrap footer-inner">
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:16,width:'auto',display:'block'}} />
              <span style={{fontSize:12,color:'var(--ink-3)',marginLeft:14}}>© 2026 · The AI tutor for IB Econ &amp; BM</span>
            </div>
            <div className="footer-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/cookies">Cookies</Link>
              <a href="mailto:hello@gradd.ai">Contact</a>
            </div>
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
// All selectors are prefixed with .ib-lp to avoid conflicts with the LC landing.
// Design system ported from docs/styles.css (oklch palette, Fraunces/Geist/Geist Mono).

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

.ib-lp {
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
.ib-lp *, .ib-lp *::before, .ib-lp *::after { box-sizing: border-box; margin: 0; padding: 0; }
.ib-lp img, .ib-lp svg { display: block; max-width: 100%; }
.ib-lp a { color: inherit; text-decoration: none; }
.ib-lp button { font: inherit; cursor: pointer; border: none; background: none; }
.ib-lp h1, .ib-lp h2, .ib-lp h3, .ib-lp h4 { font-weight: 400; }
::selection { background: var(--rust); color: var(--rust-ink); }

/* ── Noise grain ── */
.ib-lp .bg-grain {
  position: fixed; inset: 0; z-index: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0);
  background-size: 22px 22px;
  pointer-events: none; opacity: 0.3;
}

/* ── Type ── */
.ib-lp .eyebrow {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--ink-3); font-weight: 500;
}
.ib-lp .eyebrow .dot {
  display: inline-block; width: 5px; height: 5px; background: var(--rust);
  border-radius: 50%; vertical-align: middle; margin: 0 8px 2px;
}
.ib-lp .italic { font-style: italic; }
.ib-lp .h-section .italic,
.ib-lp .h-display .italic { color: var(--rust); }
.ib-lp .h-display {
  font-family: var(--serif); font-size: clamp(48px, 7.4vw, 104px);
  line-height: 0.96; letter-spacing: -0.025em; text-wrap: balance;
}
.ib-lp .h-section {
  font-family: var(--serif); font-size: clamp(34px, 4.6vw, 60px);
  line-height: 1.02; letter-spacing: -0.02em; text-wrap: balance;
}
.ib-lp .lead {
  font-size: clamp(17px, 1.45vw, 20px); line-height: 1.5;
  color: var(--ink-2); max-width: 56ch; text-wrap: pretty;
}

/* ── Layout ── */
.ib-lp .wrap { max-width: var(--max); margin: 0 auto; padding: 0 var(--gut); }
.ib-lp .section { padding: var(--section) 0; }
.ib-lp .section-head { max-width: 780px; margin-bottom: 56px; }
.ib-lp .section-head .eyebrow { display: block; margin-bottom: 18px; }
.ib-lp .section-head .lead { margin-top: 22px; }
.ib-lp .rule { border: 0; border-top: 1px solid var(--rule); margin: 0; }

/* ── Buttons ── */
.ib-lp .btn {
  display: inline-flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-radius: 999px; font-weight: 500;
  font-size: 15px; letter-spacing: -0.005em; border: 1px solid transparent;
  transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease;
  white-space: nowrap; cursor: pointer; text-decoration: none;
}
.ib-lp .btn:hover { transform: translateY(-1px); }
.ib-lp .btn .arrow { transition: transform 0.18s ease; }
.ib-lp .btn:hover .arrow { transform: translateX(3px); }
.ib-lp .btn-sm { padding: 9px 14px; font-size: 13px; min-height: 44px; }
.ib-lp .btn-primary { background: var(--ink); color: var(--paper); }
.ib-lp .btn-primary:hover { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.ib-lp .btn-rust { background: var(--rust); color: var(--rust-ink); }
.ib-lp .btn-rust:hover { background: var(--rust-2); }
.ib-lp .btn-ghost { background: transparent; color: var(--ink); border-color: var(--rule-strong); }
.ib-lp .btn-ghost:hover { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.ib-lp .btn-see-it { background: transparent; color: var(--ink-2); border-color: var(--rule); font-size: 13px; padding: 8px 14px; }
.ib-lp .btn-see-it:hover { color: var(--ink); border-color: var(--rule-strong); background: transparent; }

/* ── Nav ── */
.ib-lp .nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  background: color-mix(in oklab, var(--paper) 78%, transparent);
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.ib-lp .nav--scrolled { border-bottom-color: color-mix(in oklab, var(--rule) 60%, transparent); }
.ib-lp .nav-inner {
  display: flex; align-items: center; justify-content: space-between; height: 68px;
}
.ib-lp .nav-wordmark {
  font-family: var(--serif); font-size: 20px; letter-spacing: -0.02em; color: var(--ink);
}
.ib-lp .nav-ai { font-style: italic; color: var(--rust); }
.ib-lp .nav-links { display: flex; align-items: center; gap: 28px; }
.ib-lp .nav-link-btn {
  font-size: 14px; color: var(--ink-2); background: none; border: none;
  cursor: pointer; font-family: var(--sans); padding: 0;
  transition: color 0.15s;
}
.ib-lp .nav-link-btn:hover { color: var(--ink); }
.ib-lp .nav-cta { display: flex; align-items: center; gap: 8px; }
@media (max-width: 860px) { .ib-lp .nav-links { display: none; } }
@media (max-width: 480px) {
  .ib-lp .nav-inner { height: 56px; }
  .ib-lp .btn-see-it { display: none; }
  .ib-lp .nav-cta { gap: 4px; }
}

/* ── Hero ── */
.ib-lp .hero {
  position: relative; z-index: 1;
  padding: clamp(64px, 9vw, 112px) 0 clamp(48px, 7vw, 88px);
}
.ib-lp .hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(0, 1fr);
  gap: clamp(40px, 5vw, 80px); align-items: center;
}
@media (max-width: 940px) { .ib-lp .hero-grid { grid-template-columns: 1fr; } }
.ib-lp .hero-eyebrow { margin-bottom: 24px; }
.ib-lp .hero-h1 .em { font-style: italic; color: var(--forest); }
.ib-lp .hero-h1 .underline {
  position: relative; display: inline-block; font-style: italic; margin-right: 0.08em;
}
.ib-lp .hero-h1 .underline::after {
  content: ""; position: absolute; left: 0; right: 0; bottom: 0.06em;
  height: 0.22em; background: var(--rust); opacity: 0.85; z-index: -1; border-radius: 2px;
}
.ib-lp .hero-sub {
  margin-top: 28px; font-size: clamp(17px, 1.4vw, 19px);
  line-height: 1.55; color: var(--ink-2); max-width: 52ch;
}
.ib-lp .hero-cta { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-top: 36px; }
.ib-lp .hero-meta {
  display: flex; gap: 22px; align-items: center; flex-wrap: wrap;
  margin-top: 22px; font-size: 13px; color: var(--ink-3);
}
.ib-lp .hero-meta .dot {
  width: 4px; height: 4px; background: var(--ink-3);
  border-radius: 50%; display: inline-block; vertical-align: middle;
}
@media (max-width: 480px) {
  .ib-lp .hero-cta { flex-direction: column; align-items: stretch; gap: 10px; }
  .ib-lp .hero-cta .btn { width: 100%; justify-content: center; }
  .ib-lp .hero-meta { gap: 12px; font-size: 12px; }
}

/* ── Chat preview ── */
.ib-lp .chat {
  background: var(--paper); border: 1px solid var(--rule-strong);
  border-radius: 22px; padding: 22px 24px;
  box-shadow: 0 30px 60px -30px rgba(20,24,22,0.2), 0 2px 6px rgba(20,24,22,0.08);
  display: flex; flex-direction: column; gap: 16px; min-height: 480px; overflow: hidden;
  position: relative;
}
.ib-lp .chat::before {
  content: ""; position: absolute; inset: -16px;
  border: 1px dashed var(--rule); border-radius: 30px; z-index: -1; opacity: 0.5;
}
.ib-lp .chat-hd {
  display: flex; align-items: center; gap: 10px;
  padding-bottom: 14px; border-bottom: 1px solid var(--rule);
}
.ib-lp .chat-logo {
  font-family: var(--serif); font-size: 17px; letter-spacing: -0.02em; color: var(--ink);
  display: flex; align-items: baseline;
}
.ib-lp .chat-logo .ai { font-style: italic; color: var(--rust); }
.ib-lp .chat-name-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 12px; border: 1px solid var(--rule-strong); border-radius: 999px;
  font-size: 12px; color: var(--ink);
}
.ib-lp .chat-name-pill .live {
  width: 6px; height: 6px; border-radius: 50%; background: var(--rust);
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--rust) 25%, transparent);
}
.ib-lp .chat-course {
  margin-left: auto; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.04em; color: var(--ink-3); text-align: right;
}
.ib-lp .chat-course .em { color: var(--ink); }
.ib-lp .chat-body {
  display: flex; flex-direction: column; gap: 14px;
  font-family: var(--sans); font-size: 13.5px; line-height: 1.65; color: var(--ink);
}
.ib-lp .chat-row { display: flex; align-items: flex-start; gap: 12px; }
.ib-lp .chat-row.from-user { justify-content: flex-end; }
.ib-lp .mia-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--forest); color: var(--gold);
  display: grid; place-items: center; font-family: var(--mono);
  font-size: 11px; font-weight: 500;
}
.ib-lp .mia-msg { display: flex; flex-direction: column; gap: 10px; max-width: 90%; }
.ib-lp .mia-msg p { margin: 0; }
.ib-lp .mia-msg strong { color: var(--forest); font-weight: 600; }
.ib-lp .mia-msg em { font-style: italic; font-family: var(--serif); font-size: 1.12em; color: var(--rust); }
.ib-lp .mia-msg .key { color: var(--forest); font-style: italic; font-family: var(--serif); font-size: 1.12em; }
.ib-lp .mia-msg h4 {
  font-family: var(--serif); font-style: italic; font-size: 19px;
  font-weight: 400; color: var(--forest); letter-spacing: -0.012em; line-height: 1.2;
}
.ib-lp .user-bubble {
  background: var(--forest); color: var(--forest-ink); padding: 10px 16px;
  border-radius: 18px; font-size: 13.5px; line-height: 1.45; max-width: 80%;
}
.ib-lp .user-av {
  width: 26px; height: 26px; flex: 0 0 26px; border-radius: 50%;
  background: var(--rust); color: var(--rust-ink);
  display: grid; place-items: center; font-family: var(--mono); font-size: 11px;
}
.ib-lp .chat-input {
  margin-top: auto; display: flex; align-items: center; gap: 8px;
  padding: 8px 8px 8px 10px; border: 1px solid var(--rule-strong);
  border-radius: 14px; background: var(--paper-2);
}
.ib-lp .chat-input .attach {
  width: 30px; height: 30px; border-radius: 8px; background: transparent;
  border: 1px solid var(--rule); color: var(--ink-2);
  display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
}
.ib-lp .chat-input .attach svg { width: 16px; height: 16px; }
.ib-lp .chat-input .ph { flex: 1; min-width: 0; font-size: 13px; color: var(--ink-3); }
.ib-lp .chat-input .send {
  width: 30px; height: 30px; border-radius: 8px; background: var(--rust);
  color: var(--rust-ink); display: grid; place-items: center; font-size: 13px;
}
.ib-lp .chat-foot {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.04em;
  color: var(--ink-3); text-align: center;
}

/* ── Trust bar ── */
.ib-lp .trust {
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
  padding: 22px 0; background: color-mix(in oklab, var(--paper) 90%, var(--paper-2));
  position: relative; z-index: 1;
}
.ib-lp .trust-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 32px; flex-wrap: wrap;
}
.ib-lp .trust-label {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3);
}
.ib-lp .trust-stats { display: flex; align-items: baseline; gap: clamp(20px,4vw,56px); flex-wrap: wrap; justify-content: center; }
.ib-lp .trust-stat { display: flex; align-items: baseline; gap: 8px; }
.ib-lp .trust-stat .num {
  font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em;
  font-style: italic; color: var(--ink);
}
.ib-lp .trust-stat .lbl { font-size: 12px; color: var(--ink-3); }

/* ── Pain section ── */
.ib-lp .pain { background: var(--paper); }
.ib-lp .pain-grid {
  display: grid; grid-template-columns: minmax(0,1.05fr) minmax(0,1fr);
  gap: clamp(40px,6vw,80px); align-items: start;
}
@media (max-width: 940px) { .ib-lp .pain-grid { grid-template-columns: 1fr; } }
.ib-lp .pain-cards { display: grid; grid-template-columns: 1fr; gap: 14px; }
.ib-lp .pain-card {
  border: 1px solid var(--rule); border-radius: var(--radius); padding: 22px 24px;
  background: var(--paper); display: grid; grid-template-columns: 80px 1fr;
  gap: 18px; align-items: start;
}
.ib-lp .pain-card .stat {
  font-family: var(--serif); font-size: 30px; line-height: 1.1;
  color: var(--rust); letter-spacing: -0.02em;
}
.ib-lp .pain-card .stat .unit {
  font-size: 11px; font-family: var(--mono); color: var(--ink-3);
  display: block; margin-top: 4px; letter-spacing: 0.04em;
}
.ib-lp .pain-card .label { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
.ib-lp .pain-card .desc { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── One subscription ── */
.ib-lp .one-sub {
  background: var(--sage); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}
.ib-lp .one-sub .h-section em { font-style: italic; color: var(--rust); }
.ib-lp .one-sub-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-top: 40px;
}
@media (max-width: 860px) { .ib-lp .one-sub-grid { grid-template-columns: 1fr; } }
.ib-lp .os-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 26px;
}
.ib-lp .os-card .num {
  font-family: var(--mono); font-size: 11px; color: var(--ink-3);
  letter-spacing: 0.1em; margin-bottom: 14px;
}
.ib-lp .os-card h3 {
  font-family: var(--serif); font-size: 24px; line-height: 1.15;
  letter-spacing: -0.015em; margin-bottom: 10px;
}
.ib-lp .os-card p { font-size: 14px; color: var(--ink-2); line-height: 1.55; }

/* ── Subjects ── */
.ib-lp .subjects-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 860px) { .ib-lp .subjects-grid { grid-template-columns: 1fr; } }
.ib-lp .subj {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); overflow: hidden;
  display: flex; flex-direction: column;
}
.ib-lp .subj-hd {
  background: var(--forest); color: var(--forest-ink);
  padding: 22px 26px; display: flex; align-items: center;
  justify-content: space-between; gap: 14px;
}
.ib-lp .subj-hd h3 { font-family: var(--serif); font-size: 26px; letter-spacing: -0.015em; font-style: italic; }
.ib-lp .subj-hd .code { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; opacity: 0.7; }
.ib-lp .subj-body { padding: 26px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.ib-lp .subj-row {
  display: grid; grid-template-columns: 110px 1fr; gap: 18px;
  padding: 10px 0; border-bottom: 1px dashed var(--rule);
}
.ib-lp .subj-row:last-of-type { border-bottom: 0; }
.ib-lp .subj-row .key {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-3); padding-top: 2px;
}
.ib-lp .subj-row .val { font-size: 14px; color: var(--ink); line-height: 1.5; }
.ib-lp .subj-foot {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 26px; border-top: 1px solid var(--rule); background: var(--paper-2);
}
.ib-lp .price-inline { font-family: var(--serif); font-size: 28px; font-style: italic; }
.ib-lp .price-inline .small { font-family: var(--mono); font-size: 12px; color: var(--ink-3); font-style: normal; }

/* ── Exam-ready band ── */
.ib-lp .band-dark { background: var(--forest); color: var(--forest-ink); }
.ib-lp .band-dark .h-section { color: var(--forest-ink); }
.ib-lp .band-dark .lead { color: color-mix(in oklab,var(--forest-ink) 78%,transparent); }
.ib-lp .band-dark .h-section em { font-style: italic; color: var(--rust); }
.ib-lp .pillars {
  display: grid; grid-template-columns: repeat(3,1fr);
  gap: 1px; background: color-mix(in oklab,var(--forest-ink) 18%,transparent);
  border: 1px solid color-mix(in oklab,var(--forest-ink) 18%,transparent);
  border-radius: var(--radius); overflow: hidden; margin-top: 48px;
}
@media (max-width: 860px) { .ib-lp .pillars { grid-template-columns: 1fr; } }
.ib-lp .pillar { background: var(--forest); padding: 32px 28px; }
.ib-lp .pillar .num {
  font-family: var(--serif); font-size: 48px; font-style: italic;
  letter-spacing: -0.02em; line-height: 1; color: var(--rust); margin-bottom: 16px;
}
.ib-lp .pillar h3 { font-family: var(--serif); font-size: 24px; letter-spacing: -0.015em; margin-bottom: 8px; color: var(--forest-ink); }
.ib-lp .pillar p { font-size: 14px; line-height: 1.55; color: color-mix(in oklab,var(--forest-ink) 72%,transparent); }

/* ── Diagrams ── */
.ib-lp .diag-demo {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); display: grid; grid-template-columns: 1.1fr 1fr; overflow: hidden;
}
@media (max-width: 900px) { .ib-lp .diag-demo { grid-template-columns: 1fr; } }
.ib-lp .diag-canvas {
  padding: 28px; border-right: 1px solid var(--rule);
  background: linear-gradient(var(--paper-2),var(--paper-2)) 0 0/100% 100%,
              radial-gradient(circle at 1px 1px, var(--rule) 1px,transparent 0) 0 0/24px 24px;
}
@media (max-width: 900px) { .ib-lp .diag-canvas { border-right: 0; border-bottom: 1px solid var(--rule); } }
.ib-lp .diag-canvas-hd {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 14px; font-family: var(--mono); font-size: 11px;
  color: var(--ink-3); text-transform: uppercase; letter-spacing: 0.08em;
}
.ib-lp .diag-marking { padding: 28px; display: flex; flex-direction: column; gap: 16px; }
.ib-lp .criterion {
  display: grid; grid-template-columns: 24px 1fr auto; gap: 12px;
  align-items: center; padding: 12px 0; border-bottom: 1px dashed var(--rule);
}
.ib-lp .criterion:last-child { border-bottom: 0; }
.ib-lp .criterion .tick {
  width: 22px; height: 22px; border-radius: 50%;
  background: oklch(58% 0.15 145); color: white;
  display: grid; place-items: center; font-size: 12px; font-weight: 600;
}
.ib-lp .criterion.miss .tick { background: var(--rust); }
.ib-lp .criterion .label { font-size: 14px; color: var(--ink); }
.ib-lp .criterion .points { font-family: var(--mono); font-size: 12px; color: var(--ink-3); }
.ib-lp .diag-score {
  margin-top: auto; padding-top: 18px; border-top: 1px solid var(--rule);
  display: flex; align-items: baseline; justify-content: space-between;
}
.ib-lp .diag-score .big {
  font-family: var(--serif); font-size: 56px; font-style: italic; line-height: 1; color: var(--forest);
}

/* ── Meet Mia capabilities ── */
.ib-lp .cap-list {
  display: grid; grid-template-columns: repeat(2,1fr); gap: 1px;
  background: var(--rule); border: 1px solid var(--rule);
  border-radius: var(--radius); overflow: hidden;
}
@media (max-width: 640px) { .ib-lp .cap-list { grid-template-columns: 1fr; } }
.ib-lp .cap { background: var(--paper); padding: 24px; display: flex; flex-direction: column; gap: 8px; }
.ib-lp .cap .icn {
  width: 32px; height: 32px; border-radius: 8px; background: var(--sage);
  color: var(--forest); display: grid; place-items: center; margin-bottom: 6px;
  font-family: var(--serif); font-style: italic; font-size: 17px;
}
.ib-lp .cap h4 { font-family: var(--serif); font-size: 20px; letter-spacing: -0.012em; line-height: 1.15; }
.ib-lp .cap p { font-size: 13.5px; color: var(--ink-2); line-height: 1.5; }

/* ── Parents ── */
.ib-lp .parents { background: var(--sage); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); }
.ib-lp .parents-grid {
  display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1.05fr);
  gap: clamp(40px,6vw,80px); align-items: center;
}
@media (max-width: 940px) { .ib-lp .parents-grid { grid-template-columns: 1fr; } }
.ib-lp .parents-copy > .eyebrow { display: block; margin-bottom: 18px; }
.ib-lp .parents-copy .lead { margin-top: 22px; }
.ib-lp .parents-copy .h-section em { font-style: italic; color: var(--rust); }
.ib-lp .parents-bullets {
  list-style: none; padding: 0; margin: 28px 0;
  display: flex; flex-direction: column; gap: 14px;
}
.ib-lp .parents-bullets li {
  display: grid; grid-template-columns: 24px 1fr; gap: 12px;
  align-items: start; font-size: 15px; line-height: 1.5; color: var(--ink-2);
}
.ib-lp .parents-bullets li::before {
  content: ""; width: 18px; height: 18px; border-radius: 50%;
  background: var(--forest); margin-top: 3px;
}
.ib-lp .parents-bullets li b { font-weight: 500; color: var(--ink); }
.ib-lp .parents-visual { display: flex; flex-direction: column; gap: 14px; }

/* Dashboard preview */
.ib-lp .dash-preview {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: 16px; padding: 22px 24px;
  box-shadow: 0 20px 40px -25px rgba(20,24,22,0.15);
}
.ib-lp .dash-preview-hd {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--rule); margin-bottom: 16px;
}
.ib-lp .dash-preview-hd .name {
  font-family: var(--serif); font-size: 22px; font-style: italic;
  letter-spacing: -0.012em; color: var(--forest);
}
.ib-lp .dash-preview-hd .meta {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--ink-3);
}
.ib-lp .dash-stats {
  display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 18px;
}
.ib-lp .dash-stat .lbl {
  font-family: var(--mono); font-size: 9.5px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-3); margin-bottom: 6px;
}
.ib-lp .dash-stat .val {
  font-family: var(--serif); font-size: 26px; letter-spacing: -0.02em; line-height: 1; color: var(--ink);
}
.ib-lp .dash-stat.warn .val { color: var(--rust); }
.ib-lp .dash-stat.ok .val { color: oklch(48% 0.13 145); }
.ib-lp .dash-stat .val .small { font-size: 0.5em; color: var(--ink-3); font-family: var(--mono); }
.ib-lp .dash-week { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
.ib-lp .dash-day {
  height: 24px; border-radius: 5px; background: var(--paper-2);
  border: 1px solid var(--rule); display: grid; place-items: center;
  font-size: 11px; color: var(--ink-3);
}
.ib-lp .dash-day.active { background: var(--forest); border-color: var(--forest); color: var(--gold); font-weight: 500; }

/* Email preview */
.ib-lp .email-preview {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: 14px; padding: 18px 22px;
  box-shadow: 0 16px 32px -22px rgba(20,24,22,0.12);
}
.ib-lp .email-hd {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--rule); margin-bottom: 12px;
}
.ib-lp .email-hd .from { display: flex; align-items: center; gap: 10px; }
.ib-lp .email-hd .ico {
  width: 28px; height: 28px; border-radius: 50%; background: var(--forest);
  color: var(--gold); display: grid; place-items: center; font-family: var(--mono); font-size: 11px;
}
.ib-lp .email-hd .from-name { font-size: 13px; font-weight: 500; }
.ib-lp .email-hd .from-addr { font-size: 11px; font-family: var(--mono); color: var(--ink-3); }
.ib-lp .email-hd .time { font-size: 11px; font-family: var(--mono); color: var(--ink-3); }
.ib-lp .email-subject { font-family: var(--serif); font-size: 19px; letter-spacing: -0.012em; margin-bottom: 12px; }
.ib-lp .email-subject em { font-style: italic; color: var(--rust); }
.ib-lp .email-body { font-size: 13.5px; line-height: 1.55; color: var(--ink-2); }
.ib-lp .email-body p { margin: 0 0 8px; }
.ib-lp .email-body p:last-child { margin-bottom: 0; }
.ib-lp .email-body b { color: var(--ink); font-weight: 500; }
@media (max-width: 480px) {
  .ib-lp .dash-stats { grid-template-columns: repeat(2,1fr); }
  .ib-lp .dash-preview, .ib-lp .email-preview { padding: 16px 18px; }
}

/* ── Who it's for ── */
.ib-lp .who-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
@media (max-width: 760px) { .ib-lp .who-grid { grid-template-columns: 1fr; } }
.ib-lp .who-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 26px 28px;
  display: flex; flex-direction: column; gap: 10px;
}
.ib-lp .who-card .who-tag {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--rust);
}
.ib-lp .who-card h3 { font-family: var(--serif); font-size: 24px; letter-spacing: -0.015em; line-height: 1.15; }
.ib-lp .who-card p { font-size: 14px; color: var(--ink-2); line-height: 1.5; }

/* ── Compare table ── */
.ib-lp .cmp-wrap {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); overflow: hidden;
}
.ib-lp .cmp-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
.ib-lp .cmp { width: 100%; min-width: 640px; border-collapse: collapse; font-size: 14px; }
.ib-lp .cmp th, .ib-lp .cmp td {
  padding: 18px 22px; text-align: left; border-bottom: 1px solid var(--rule); vertical-align: top;
}
.ib-lp .cmp tbody tr:last-child td { border-bottom: 0; }
.ib-lp .cmp thead th {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-3); font-weight: 500;
  background: var(--paper-2); border-bottom: 1px solid var(--rule-strong);
}
.ib-lp .cmp thead th.gradd-col { color: var(--rust-ink); background: var(--forest); }
.ib-lp .cmp tbody td.gradd-col {
  background: color-mix(in oklab,var(--forest) 8%,var(--paper));
  border-left: 1px solid color-mix(in oklab,var(--forest) 30%,var(--rule));
  border-right: 1px solid color-mix(in oklab,var(--forest) 30%,var(--rule));
  font-weight: 500;
}
.ib-lp .cmp tbody tr td:first-child {
  font-family: var(--mono); font-size: 12px; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--ink-3); width: 22%;
}
.ib-lp .cmp .y { color: oklch(45% 0.13 145); font-weight: 500; }
.ib-lp .cmp .n { color: var(--ink-3); }
.ib-lp .cmp-hint {
  display: none; text-align: center; font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3); margin: 12px 0 0;
}
@media (max-width: 720px) { .ib-lp .cmp-hint { display: block; } }
@media (max-width: 760px) {
  .ib-lp .cmp th, .ib-lp .cmp td { padding: 12px 14px; font-size: 13px; }
}

/* ── Pricing ── */
.ib-lp .pricing-band {
  background: var(--paper-2); border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
}
.ib-lp .billing-toggle {
  display: flex; align-items: center; gap: 4px;
  justify-content: center; margin: 36px auto 0;
  background: var(--paper-3); border: 1px solid var(--rule);
  border-radius: 999px; padding: 4px; width: fit-content;
}
.ib-lp .toggle-btn {
  padding: 9px 22px; border-radius: 999px; font-size: 14px;
  font-family: var(--sans); font-weight: 500; cursor: pointer;
  transition: background 0.18s, color 0.18s, box-shadow 0.18s;
  background: transparent; color: var(--ink-2); border: none;
  display: flex; align-items: center; gap: 8px; min-height: 44px;
}
.ib-lp .toggle-btn.active {
  background: var(--paper); color: var(--ink);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}
.ib-lp .save-badge {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em;
  text-transform: uppercase; background: color-mix(in oklab,var(--rust) 15%,transparent);
  color: var(--rust); padding: 2px 7px; border-radius: 999px;
}
.ib-lp .price-grid-2 {
  display: grid; grid-template-columns: repeat(2,1fr); gap: 16px; margin-top: 32px;
}
@media (max-width: 760px) { .ib-lp .price-grid-2 { grid-template-columns: 1fr; } }
.ib-lp .price {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 32px;
  display: flex; flex-direction: column; gap: 14px;
}
.ib-lp .price.featured { background: var(--forest); color: var(--forest-ink); border-color: var(--forest); }
.ib-lp .price.featured .price-features li { border-color: color-mix(in oklab,var(--forest-ink) 20%,transparent); }
.ib-lp .price.featured .price-features li::before { color: var(--rust); }
.ib-lp .price-tag {
  align-self: flex-start; font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.08em; text-transform: uppercase;
  background: color-mix(in oklab,var(--rust) 18%,transparent);
  color: var(--rust); padding: 4px 10px; border-radius: 999px;
}
.ib-lp .price.featured .price-tag { background: var(--rust); color: var(--rust-ink); }
.ib-lp .price h3 { font-family: var(--serif); font-size: 28px; letter-spacing: -0.015em; }
.ib-lp .amount {
  display: flex; align-items: baseline; gap: 4px; font-family: var(--serif);
  font-style: italic; font-size: 64px; line-height: 1; letter-spacing: -0.025em;
}
.ib-lp .amount .cur { font-size: 28px; font-style: normal; font-family: var(--sans); font-weight: 500; align-self: flex-start; padding-top: 8px; }
.ib-lp .amount .per { font-size: 14px; font-family: var(--mono); font-style: normal; color: var(--ink-3); align-self: flex-end; padding-bottom: 8px; }
.ib-lp .price.featured .amount .per { color: color-mix(in oklab,var(--forest-ink) 65%,transparent); }
.ib-lp .price-note { font-family: var(--mono); font-size: 12px; color: var(--ink-3); letter-spacing: 0.04em; margin-top: -4px; }
.ib-lp .blurb { font-size: 14px; line-height: 1.5; color: var(--ink-2); }
.ib-lp .price.featured .blurb { color: color-mix(in oklab,var(--forest-ink) 80%,transparent); }
.ib-lp .price-features {
  list-style: none; padding: 0; margin: 8px 0 0;
  display: flex; flex-direction: column;
}
.ib-lp .price-features li {
  font-size: 14px; padding: 12px 0; border-top: 1px dashed var(--rule);
  display: grid; grid-template-columns: 18px 1fr; gap: 10px;
  align-items: start; line-height: 1.45;
}
.ib-lp .price-features li::before { content: "+"; font-family: var(--mono); font-size: 14px; color: var(--rust); line-height: 1.4; }
.ib-lp .price .btn { margin-top: auto; width: 100%; justify-content: center; }

/* ── FAQ ── */
.ib-lp .faq-list { display: flex; flex-direction: column; }
.ib-lp .faq-item { border-top: 1px solid var(--rule); padding: 22px 0; cursor: pointer; }
.ib-lp .faq-list .faq-item:last-child { border-bottom: 1px solid var(--rule); }
.ib-lp .faq-q {
  display: flex; justify-content: space-between; align-items: center; gap: 24px;
  font-family: var(--serif); font-size: clamp(20px,1.8vw,24px);
  letter-spacing: -0.012em; line-height: 1.25;
}
.ib-lp .faq-q .toggle {
  width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--rule-strong);
  display: grid; place-items: center; font-family: var(--mono); font-size: 14px;
  color: var(--ink-2); flex-shrink: 0; transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
}
.ib-lp .faq-item[data-open="1"] .toggle {
  background: var(--ink); color: var(--paper); border-color: var(--ink); transform: rotate(45deg);
}
.ib-lp .faq-a {
  max-height: 0; overflow: hidden; font-size: 15px; color: var(--ink-2);
  line-height: 1.6; max-width: 64ch; transition: max-height 0.35s ease, margin-top 0.25s ease;
}
.ib-lp .faq-item[data-open="1"] .faq-a { max-height: 400px; margin-top: 16px; }

/* ── Final CTA ── */
.ib-lp .final-cta { background: var(--forest); color: var(--forest-ink); position: relative; overflow: hidden; }
.ib-lp .final-cta::before {
  content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%,color-mix(in oklab,var(--rust) 30%,transparent),transparent 50%),
              radial-gradient(circle at 10% 90%,color-mix(in oklab,var(--forest-2) 80%,transparent),transparent 60%);
  pointer-events: none;
}
.ib-lp .final-cta-inner {
  position: relative; text-align: center;
  padding: clamp(80px,11vw,140px) 0;
}
.ib-lp .final-cta .h-display { color: var(--forest-ink); max-width: 18ch; margin: 0 auto; }
.ib-lp .final-cta .h-display em { color: var(--rust); }
.ib-lp .final-cta .lead { color: color-mix(in oklab,var(--forest-ink) 80%,transparent); margin: 24px auto 0; }
.ib-lp .final-cta .hero-cta { justify-content: center; margin-top: 36px; }
.ib-lp .final-cta .btn-ghost {
  border-color: color-mix(in oklab,var(--forest-ink) 40%,transparent); color: var(--forest-ink);
}
.ib-lp .final-cta .btn-ghost:hover { background: var(--forest-ink); color: var(--forest); border-color: var(--forest-ink); }
.ib-lp .small {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
  text-transform: uppercase; color: color-mix(in oklab,var(--forest-ink) 55%,transparent); margin-top: 28px;
}
@media (max-width: 480px) {
  .ib-lp .final-cta-inner { padding: clamp(56px,12vw,96px) 0; }
  .ib-lp .final-cta .h-display { padding: 0 4px; font-size: clamp(40px,11vw,56px); }
}

/* ── Footer ── */
.ib-lp .footer { padding: 56px 0 40px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink-3); }
.ib-lp .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.ib-lp .footer-logo { font-family: var(--serif); font-size: 18px; letter-spacing: -0.02em; }
.ib-lp .footer-ai { font-style: italic; color: var(--rust); }
.ib-lp .footer-links { display: flex; gap: 24px; }
.ib-lp .footer-links a:hover { color: var(--ink); }

/* ── Tag pill ── */
.ib-lp .tag-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px;
  border: 1px solid var(--rule-strong); border-radius: 999px; font-size: 12px;
  font-family: var(--mono); letter-spacing: 0.04em; color: var(--ink-2);
}
.ib-lp .tag-pill .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--rust); }

/* ── Back to top ── */
.ib-lp .to-top {
  position: fixed; right: 24px; bottom: 24px; z-index: 90;
  width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--rule-strong);
  background: var(--ink); color: var(--paper); display: grid; place-items: center;
  cursor: pointer; opacity: 0; transform: translateY(8px); pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease, background 0.18s ease;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.ib-lp .to-top.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.ib-lp .to-top:hover { background: var(--rust); border-color: var(--rust); color: var(--rust-ink); }
.ib-lp .to-top svg { width: 16px; height: 16px; }
@media (max-width: 640px) { .ib-lp .to-top { right: 16px; bottom: 16px; width: 44px; height: 44px; } }
@media (max-width: 480px) {
  .ib-lp .hero-meta .dot { display: none; }
  .ib-lp .chat { max-height: 360px; overflow: hidden; position: relative; }
  .ib-lp .chat::after {
    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 72px;
    background: linear-gradient(to bottom, transparent, var(--paper));
    border-radius: 0 0 22px 22px; pointer-events: none; z-index: 1;
  }
  .ib-lp .subj-hd { flex-direction: column; align-items: flex-start; gap: 8px; }
  .ib-lp .subj-foot { flex-direction: column; align-items: stretch; }
  .ib-lp .final-cta .hero-cta { max-width: 340px; margin-left: auto; margin-right: auto; }
}

/* ── Hero thesis line ── */
.ib-lp .hero-thesis {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(18px, 1.6vw, 22px);
  color: var(--forest);
  letter-spacing: -0.01em;
  line-height: 1.4;
  margin-top: 24px;
  max-width: 42ch;
}

/* ── Demo signpost band ── */
.ib-lp .demo-signpost-band {
  padding: clamp(24px, 3vw, 40px) 0;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
  background: var(--paper-2);
}
.ib-lp .demo-signpost {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  border: 1.5px solid var(--forest);
  border-radius: var(--radius);
  padding: 28px 32px;
  background: var(--paper);
}
.ib-lp .demo-signpost-copy { flex: 1; min-width: 0; }
.ib-lp .demo-signpost-h {
  font-family: var(--serif);
  font-size: clamp(20px, 2vw, 24px);
  font-weight: 400;
  letter-spacing: -0.015em;
  color: var(--forest);
  margin-bottom: 10px;
}
.ib-lp .demo-signpost-body {
  font-size: 14.5px;
  color: var(--ink-2);
  line-height: 1.55;
  max-width: 56ch;
}
.ib-lp .demo-signpost-sub {
  margin-top: 8px;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-3);
}
.ib-lp .demo-signpost-cta { flex-shrink: 0; }
@media (max-width: 640px) {
  .ib-lp .demo-signpost {
    flex-direction: column;
    align-items: stretch;
    padding: 22px 24px;
    gap: 20px;
  }
  .ib-lp .demo-signpost-cta { text-align: center; justify-content: center; }
}
`;
