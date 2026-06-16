'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const PRICING = {
  monthly: { amount: '44', cents: '.99', per: '/ month', note: null },
  annual:  { amount: '349', cents: '', per: '/ year', note: '≈ €29 / month · save ~35%' },
};

const FAQS = [
  {
    q: 'Is Gradd actually built for the IB syllabus — or is it a generic chatbot?',
    a: 'Not a generic chatbot — a tutor built around IB marking. Mia runs on the official IB Economics (2022) and IB Business Management (2024) subject guides and the IB assessment framework — command terms, AO levels, markband criteria. Generic LLMs don\'t pass IB: they hallucinate command terms, draw wrong diagrams, and ignore markbands.',
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
    a: 'You upload a photo of a diagram you\'ve drawn on paper. Mia checks it against the IB mark scheme criteria for that question type: axes, curve shape, equilibrium markers, shading. You get a numeric mark and the specific feedback that gets you the missing marks next time.',
  },
  {
    q: 'What if Gradd.ai isn\'t right for me?',
    a: 'Paid plans come with a 7-day money-back guarantee. If you decide it\'s not for you within the first week, email us and we refund you in full — no forms, no friction.',
  },
  {
    q: 'Can my school sign up a whole cohort?',
    a: 'School plans are in development. Email schools@gradd.ai to register interest and we\'ll be in touch as soon as they\'re available.',
  },
];

export default function IBLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [compareOpen, setCompareOpen] = useState(false);
  const pricing = PRICING[billing];

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

      <div className="ib-lp">
        <div className="bg-grain" aria-hidden="true" />

        {/* ── NAV ── */}
        <header className={`nav${scrolled ? ' nav--scrolled' : ''}`}>
          <div className="nav-inner">
            <a href="#" className="nav-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:22,width:'auto',display:'block'}} />
            </a>
            <nav className="nav-links" aria-label="Primary">
              {['curriculum','parents','pricing','faq'].map(id => (
                <button key={id} className="nav-link-btn" onClick={() => scrollTo(id)}>
                  {id === 'faq' ? 'FAQ' : id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </nav>
            <div className="nav-cta">
              <Link href="/demo" className="btn btn-see-it btn-sm">Try the live demo — no account needed</Link>
              <Link href="/auth/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm">Start free <span className="arrow">→</span></Link>
            </div>
          </div>
        </header>

        {/* ── 1. HERO ── */}
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
                Most tools tell you the right answer. Mia finds the faulty thinking behind your answer, rebuilds it, and checks that it sticks.
              </p>
              <div className="hero-cta">
                <Link href="/auth/signup" className="btn btn-rust">Start free <span className="arrow">→</span></Link>
                <Link href="/demo" className="btn btn-ghost">Try the live demo — no account needed</Link>
              </div>
              <p className="hero-reassure">Start free. No card needed. Subscribe when you&apos;re ready.</p>
            </div>

            <div className="hero-visual">
              <div className="chat" aria-label="Live session with Mia, your AI tutor">
                <div className="chat-hd">
                  <div className="chat-logo"><img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{height:16,width:'auto',display:'block'}} /></div>
                  <div className="chat-name-pill"><span className="live" />Mia</div>
                  <div className="chat-course">
                    <div className="em">Economics as a Social Science</div>
                    <div>IB Economics · SL · Session 12</div>
                  </div>
                </div>
                <div className="chat-body">
                  <div className="chat-row">
                    <div className="mia-av">M</div>
                    <div className="mia-msg">
                      <p>Welcome back. Last session we started <em>Economics as a Social Science</em> — we did one exchange and didn&apos;t finish. Today we&apos;re continuing that lesson, which appears on Papers 1 and 2 for your SL exam.</p>
                      <p><strong>Economics is a social science.</strong> That means it studies human behaviour and decision-making in society. The fundamental problem it solves: <span className="key">we have unlimited wants, but limited resources.</span></p>
                      <p>This fact — called <strong>scarcity</strong> — forces every economic decision. Every choice involves giving up something else. That trade-off is your <strong>opportunity cost</strong>.</p>
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

        {/* ── TRUST BAR ── */}
        <section className="trust">
          <div className="wrap trust-inner">
            <div className="trust-label">Built around the official IB syllabus</div>
            <div className="trust-stats">
              <div className="trust-stat"><span className="num">346</span><span className="lbl">structured lessons</span></div>
              <div className="trust-stat"><span className="num">2</span><span className="lbl">subjects, HL &amp; SL</span></div>
              <div className="trust-stat"><span className="num">61</span><span className="lbl">IB-standard diagrams</span></div>
              <div className="trust-stat"><span className="num">24/7</span><span className="lbl">availability</span></div>
            </div>
          </div>
        </section>

        {/* ── 2. DIAGNOSIS DEMO ── */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Diagnosis</span>
              <h2 className="h-section">
                You don&apos;t lose marks randomly.<br />
                You lose them <em className="italic">in patterns.</em>
              </h2>
              <p className="lead">
                Mia spots the faulty thinking behind a wrong answer, rebuilds the model, then retests it until the mistake stops repeating.
              </p>
            </div>

            <div className="diag-exchange">
              <div className="dx-row dx-student">
                <div className="dx-bubble-student">
                  A private limited company is better than a sole trader because it makes more profit.
                </div>
                <div className="dx-av dx-av-student">S</div>
              </div>

              <div className="dx-row">
                <div className="dx-av dx-av-mia">M</div>
                <div className="dx-msg">
                  <div className="dx-label">diagnosis</div>
                  <p>Here&apos;s the faulty model: you&apos;re treating legal structure as a profit guarantee. It isn&apos;t. Legal structure changes ownership, liability, control and access to finance — not profit. Profit depends on business performance.</p>
                </div>
              </div>

              <div className="dx-row">
                <div className="dx-av dx-av-mia">M</div>
                <div className="dx-msg">
                  <div className="dx-label dx-label-rebuild">rebuild</div>
                  <p>The IB-strong version: becoming a private limited company can help raise capital while keeping ownership relatively controlled — but it adds admin and legal obligations. So the judgement depends on whether the business needs growth capital more than simplicity.</p>
                </div>
              </div>

              <div className="dx-row">
                <div className="dx-av dx-av-mia">M</div>
                <div className="dx-msg">
                  <div className="dx-label dx-label-retest">retest</div>
                  <p>Now — give me one reason a sole trader might deliberately <em>stay</em> a sole trader.</p>
                </div>
              </div>
            </div>

            <p className="dx-caption">
              Most tools correct the answer. Mia corrects the thinking that produced it — and brings the weak point back until it sticks.
            </p>
          </div>
        </section>

        <hr className="rule" />

        {/* ── 3. THE GRADD METHOD ── */}
        <section className="section" id="how-it-works">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it works</span>
              <h2 className="h-section">The Gradd Method.</h2>
            </div>
            <div className="method-steps">
              <div className="method-step">
                <div className="method-n">01</div>
                <div className="method-body">
                  <h3>Learn the concept.</h3>
                  <p>Mia teaches the topic at the level your paper requires.</p>
                </div>
              </div>
              <div className="method-step">
                <div className="method-n">02</div>
                <div className="method-body">
                  <h3>Attempt an exam-style question.</h3>
                  <p>You don&apos;t just read notes, you write.</p>
                </div>
              </div>
              <div className="method-step">
                <div className="method-n">03</div>
                <div className="method-body">
                  <h3>Diagnose the misconception.</h3>
                  <p>Mia identifies the faulty thinking behind your answer.</p>
                </div>
              </div>
              <div className="method-step">
                <div className="method-n">04</div>
                <div className="method-body">
                  <h3>Rebuild the model.</h3>
                  <p>She corrects the concept, shows the diagram or structure, and explains what examiners reward.</p>
                </div>
              </div>
              <div className="method-step">
                <div className="method-n">05</div>
                <div className="method-body">
                  <h3>Retest until it sticks.</h3>
                  <p>The weak area comes back until you stop making the same mistake.</p>
                </div>
              </div>
            </div>
            <p className="method-closing">
              Diagnosis alone is feedback. Diagnosis plus retesting is how you actually stop losing the marks.
            </p>
          </div>
        </section>

        {/* ── 4. LIVE DEMO CTA ── */}
        <section className="demo-cta-band">
          <div className="wrap">
            <div className="demo-cta-inner">
              <div className="demo-cta-copy">
                <h2 className="demo-cta-h">Don&apos;t take our word for it.</h2>
                <p className="demo-cta-sub">Try a real IB lesson. Watch Mia diagnose a wrong answer, rebuild it, and test the next step — no account needed.</p>
              </div>
              <Link href="/demo" className="btn btn-rust demo-cta-btn">Try the live demo <span className="arrow">→</span></Link>
            </div>
          </div>
        </section>

        {/* ── 5. DIAGRAM MARKING PROOF (existing — kept as-is) ── */}
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">Feature<span className="dot" />Diagram marking</span>
              <h2 className="h-section">
                IB-standard diagrams. Drawn inline. <em className="italic" style={{color:'var(--rust)'}}>Marked instantly.</em>
              </h2>
              <p className="lead">
                The thing examiners actually grade you on — and the thing generic AI tutors often get wrong. Mia draws to IB conventions, then marks against the official criteria. You can also upload a photo of a diagram you&apos;ve drawn on paper and get it marked the same way.
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
                <div className="diag-canvas-hd" style={{marginBottom:6}}><span>Mia · marking</span><span>IB criteria</span></div>
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

        {/* ── 6. THE PROBLEM (existing — kept as-is) ── */}
        <section className="section pain">
          <div className="wrap pain-grid">
            <div>
              <div className="eyebrow">The problem<span className="dot" />Private tutoring</div>
              <h2 className="h-section" style={{marginTop:18}}>
                IB tutoring costs too much.<br/>
                And it <em className="italic" style={{color:'var(--rust)'}}>still</em>{' '}doesn&apos;t cover the whole course.
              </h2>
            </div>
            <div className="pain-cards">
              <div className="pain-card">
                <div className="stat">€90<span className="unit">/ hour</span></div>
                <div>
                  <div className="label">That&apos;s an hour with Lanterna &mdash; Gradd is a month</div>
                  <div className="desc">Most families spend €3,500–€9,000 over the two years. And that&apos;s for two hours a week — not full coverage.</div>
                </div>
              </div>
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

        {/* ── 7. WHAT'S INCLUDED ── */}
        <section className="section one-sub">
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">The answer<span className="dot" />One subscription</span>
              <h2 className="h-section">
                One subscription. The <em className="italic">complete</em> IB Economics and IB Business Management curriculum.
              </h2>
              <p className="lead">
                No more piecing together five tutors, three textbooks and a YouTube playlist. Gradd is the full Economics and Business Management course, taught and marked to IB standards, in one place.
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
                <p>Mia works through Paper 1, 2 and 3-style questions with you in session — command terms, diagram marking — graded against the official IB markbands and assessment criteria, not generic AI hand-waving.</p>
              </div>
              <div className="os-card">
                <div className="num">03 / Tutor</div>
                <h3>Mia, on call.</h3>
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
              <p className="lead">Both subjects taught at HL and SL, with the depth the IB command terms actually require.</p>
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
                  <span className="subj-included">Included in your subscription</span>
                </div>
              </article>

              <article className="subj">
                <div className="subj-hd">
                  <h3>IB Business Management</h3>
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
                  <span className="subj-included">Included in your subscription</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── 8. PARENT DASHBOARD (light reframe) ── */}
        <section className="section parents" id="parents">
          <div className="wrap parents-grid">
            <div className="parents-copy">
              <span className="eyebrow">For parents<span className="dot" />Dashboard</span>
              <h2 className="h-section" style={{marginTop:18}}>Parents see the progress that <em className="italic">matters.</em></h2>
              <p className="lead">A real-time dashboard view built for parents. No more &ldquo;did you study today?&rdquo; guesswork — you&apos;ll see where they are, what they&apos;ve struggled with, and whether they&apos;re on pace for their exams.</p>
              <p className="lead" style={{marginTop:16}}>Parents don&apos;t just see activity. They see the topics and skills Mia keeps having to rebuild — and whether they&apos;re changing.</p>
              <ul className="parents-bullets">
                <li><span><b>Parent view of the dashboard.</b> Sessions completed, weak topics flagged, days to exam, study streak.</span></li>
                <li><span><b>Pace, in plain sight.</b> The dashboard flags it the moment they fall behind.</span></li>
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
            </div>
          </div>
        </section>

        {/* ── WHO IT'S FOR ── */}
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
                <p>You&apos;re at a 6 and you want the predicted that gets you into LSE. Gradd gives you the kind of feedback most students only get from an excellent private tutor — whenever you need it.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Falling behind</span>
                <h3>The student who missed three weeks and won&apos;t say it out loud.</h3>
                <p>Catch up without anyone knowing. Mia won&apos;t sigh. Mia won&apos;t bill your parents €90 an hour. Start at the topic you fell off and rebuild.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Self-studying</span>
                <h3>Taking the subject without a teacher.</h3>
                <p>Online IB students, anticipated candidates, or just a school where Business isn&apos;t offered. The full Economics and Business Management course, structured, in your pocket.</p>
              </div>
              <div className="who-card">
                <span className="who-tag">Paying parent</span>
                <h3>The parent who&apos;s done with €9,000 tutor bills.</h3>
                <p>Same coverage. Better depth. 1/40th the price.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. BEFORE / AFTER PROOF (NEW) ── */}
        <section className="section" style={{background:'color-mix(in oklab,var(--paper) 50%,var(--sage))'}}>
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">What changes</span>
              <h2 className="h-section">From misconception to exam-ready answer.</h2>
            </div>
            <div className="ba-grid">
              <div className="ba-card ba-before">
                <div className="ba-tag">Before</div>
                <p className="ba-label">Student answer</p>
                <blockquote className="ba-quote">
                  &ldquo;A subsidy lowers price and increases demand.&rdquo;
                </blockquote>
              </div>
              <div className="ba-card ba-diag">
                <div className="ba-tag ba-tag-diag">Mia&apos;s diagnosis</div>
                <p className="ba-label">The misconception</p>
                <blockquote className="ba-quote">
                  &ldquo;You&apos;re confusing demand with quantity demanded. The demand curve doesn&apos;t shift — the subsidy shifts the supply curve right, lowering price and raising quantity.&rdquo;
                </blockquote>
              </div>
              <div className="ba-card ba-after">
                <div className="ba-tag ba-tag-after">After</div>
                <p className="ba-label">Rebuilt answer</p>
                <blockquote className="ba-quote">
                  &ldquo;A subsidy reduces producers&apos; costs, shifting supply right. Price falls from P1 to P2 and quantity rises from Q1 to Q2. The size of the effect depends on PED and PES.&rdquo;
                </blockquote>
              </div>
            </div>
          </div>
        </section>

        {/* ── 10. COMPARISON TABLE (existing + 2 new rows) ── */}
        <section className="section" id="compare" style={{background:'var(--sage)'}}>
          <div className="wrap">
            <div className="section-head">
              <span className="eyebrow">How it stacks up</span>
              <h2 className="h-section">How Gradd compares to other IB tutoring options</h2>
              <p className="lead">There&apos;s no shortage of ways to prepare for IB Economics or IB Business. Here&apos;s how Gradd actually stacks up against what most students do — at a fraction of the price, with feedback the second you finish writing.</p>
            </div>

            <div className="cmp-wrap cmp-desktop">
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
                    <td>Full syllabus, HL &amp; SL</td>
                    <td className="gradd-col"><span className="y">✓ Both subjects, every topic</span></td>
                    <td><span className="n">Depends on tutor</span></td>
                    <td><span className="n">Cohort-paced</span></td>
                    <td>You decide</td>
                  </tr>
                  <tr>
                    <td>Past-paper-style questions</td>
                    <td className="gradd-col"><span className="y">✓ Unlimited, on demand</span></td>
                    <td><span className="n">Homework from textbooks</span></td>
                    <td><span className="n">Generic worksheets</span></td>
                    <td><span className="n">Limited to what you find</span></td>
                  </tr>
                  <tr>
                    <td>Diagnoses your misconceptions</td>
                    <td className="gradd-col"><span className="y">✓</span></td>
                    <td><span className="n">Depends on tutor</span></td>
                    <td><span className="n">✗</span></td>
                    <td><span className="n">✗</span></td>
                  </tr>
                  <tr>
                    <td>Retests weak thinking until it sticks</td>
                    <td className="gradd-col"><span className="y">✓</span></td>
                    <td><span className="n">Limited by session time</span></td>
                    <td><span className="n">✗</span></td>
                    <td><span className="n">✗</span></td>
                  </tr>
                  <tr>
                    <td>Diagram marking</td>
                    <td className="gradd-col"><span className="y">✓ Instant, IB criteria</span></td>
                    <td><span className="n">If you book a session</span></td>
                    <td><span className="n">Rare</span></td>
                    <td><span className="n">Not available</span></td>
                  </tr>
                  <tr>
                    <td>IB-standard marking</td>
                    <td className="gradd-col"><span className="y">✓ Command terms + markbands, instant</span></td>
                    <td><span className="n">Varies by tutor</span></td>
                    <td><span className="n">Generic</span></td>
                    <td><span className="n">Not available</span></td>
                  </tr>
                  <tr>
                    <td>Marking turnaround</td>
                    <td className="gradd-col"><span className="y">Seconds</span></td>
                    <td><span className="n">3–7 days</span></td>
                    <td><span className="n">1–2 weeks</span></td>
                    <td><span className="n">You mark yourself</span></td>
                  </tr>
                  <tr>
                    <td>Availability</td>
                    <td className="gradd-col"><span className="y">24/7</span></td>
                    <td><span className="n">1–2 hours / week</span></td>
                    <td><span className="n">Fixed schedule</span></td>
                    <td>Whenever</td>
                  </tr>
                  <tr>
                    <td>Tracks your progress</td>
                    <td className="gradd-col"><span className="y">✓ Adaptive to your weak areas</span></td>
                    <td><span className="n">In the tutor&apos;s head</span></td>
                    <td><span className="n">Not available</span></td>
                    <td><span className="n">Not available</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="cmp-mobile">
              <div className="cmp-mobile-gradd">
                <div className="cmp-mobile-col-header">Gradd</div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Cost</span><span className="y">€44.99 / month</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Full syllabus, HL &amp; SL</span><span className="y">✓ Both subjects, every topic</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Past-paper-style questions</span><span className="y">✓ Unlimited, on demand</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Diagnoses your misconceptions</span><span className="y">✓</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Retests weak thinking until it sticks</span><span className="y">✓</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Diagram marking</span><span className="y">✓ Instant, IB criteria</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">IB-standard marking</span><span className="y">✓ Command terms + markbands</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Marking turnaround</span><span className="y">Seconds</span></div>
                <div className="cmp-mobile-row"><span className="cmp-lbl">Availability</span><span className="y">24/7</span></div>
                <div className="cmp-mobile-row cmp-mobile-last"><span className="cmp-lbl">Tracks your progress</span><span className="y">✓ Adaptive to your weak areas</span></div>
              </div>
              <button
                className="cmp-toggle"
                onClick={() => setCompareOpen(o => !o)}
                aria-expanded={compareOpen}
              >
                {compareOpen ? 'Hide alternatives ↑' : 'Tap to compare with alternatives ↓'}
              </button>
              {compareOpen && (
                <div className="cmp-mobile-alts">
                  <div className="cmp-mobile-alt">
                    <div className="cmp-mobile-col-header">Private tutor</div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Cost</span><span className="n">€60–€120 / hour</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Full syllabus, HL &amp; SL</span><span className="n">Depends on tutor</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Past-paper-style questions</span><span className="n">Homework from textbooks</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Diagnoses your misconceptions</span><span className="n">Depends on tutor</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Retests weak thinking until it sticks</span><span className="n">Limited by session time</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Diagram marking</span><span className="n">If you book a session</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">IB-standard marking</span><span className="n">Varies by tutor</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Marking turnaround</span><span className="n">3–7 days</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Availability</span><span className="n">1–2 hours / week</span></div>
                    <div className="cmp-mobile-row cmp-mobile-last"><span className="cmp-lbl">Tracks your progress</span><span className="n">In the tutor&apos;s head</span></div>
                  </div>
                  <div className="cmp-mobile-alt">
                    <div className="cmp-mobile-col-header">Group classes</div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Cost</span><span className="n">€25–€45 / hour</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Full syllabus, HL &amp; SL</span><span className="n">Cohort-paced</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Past-paper-style questions</span><span className="n">Generic worksheets</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Diagnoses your misconceptions</span><span className="n">✗</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Retests weak thinking until it sticks</span><span className="n">✗</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Diagram marking</span><span className="n">Rare</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">IB-standard marking</span><span className="n">Generic</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Marking turnaround</span><span className="n">1–2 weeks</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Availability</span><span className="n">Fixed schedule</span></div>
                    <div className="cmp-mobile-row cmp-mobile-last"><span className="cmp-lbl">Tracks your progress</span><span className="n">Not available</span></div>
                  </div>
                  <div className="cmp-mobile-alt">
                    <div className="cmp-mobile-col-header">Self-study</div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Cost</span><span>Free–€120 (books)</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Full syllabus, HL &amp; SL</span><span>You decide</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Past-paper-style questions</span><span className="n">Limited to what you find</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Diagnoses your misconceptions</span><span className="n">✗</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Retests weak thinking until it sticks</span><span className="n">✗</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Diagram marking</span><span className="n">Not available</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">IB-standard marking</span><span className="n">Not available</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Marking turnaround</span><span className="n">You mark yourself</span></div>
                    <div className="cmp-mobile-row"><span className="cmp-lbl">Availability</span><span>Whenever</span></div>
                    <div className="cmp-mobile-row cmp-mobile-last"><span className="cmp-lbl">Tracks your progress</span><span className="n">Not available</span></div>
                  </div>
                </div>
              )}
            </div>

            <p className="cmp-closing">Most students stitch two or three of these together — a tutor for the hard bits, group classes for the social side, self-study for everything else. Gradd does the work of all three, every day, in your pocket.</p>
            <div className="cmp-cta">
              <Link href="/auth/signup" className="btn btn-rust">Start free <span className="arrow">→</span></Link>
            </div>
          </div>
        </section>

        {/* ── 11. PRICING (reframe free-first) ── */}
        <section className="section pricing-band" id="pricing">
          <div className="wrap">
            <div className="section-head" style={{textAlign:'center',marginLeft:'auto',marginRight:'auto'}}>
              <span className="eyebrow" style={{display:'inline-block',margin:'0 auto 18px'}}>Pricing</span>
              <h2 className="h-section" style={{marginLeft:'auto',marginRight:'auto'}}>Start free. Subscribe for unlimited teaching.</h2>
              <p className="lead" style={{margin:'22px auto 0'}}>Free, no card: unlimited questions, instant marking, and your first teaching moments with Mia — the real product, not a trial.</p>
            </div>

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

            <div className="price-grid-1">
              <article className="price featured">
                <h3>Unlimited teaching</h3>
                <p className="blurb">IB Economics + IB Business Management. Everything, one subscription.</p>
                <div className="amount">
                  <span className="cur">€</span>
                  {pricing.amount}
                  {pricing.cents && <span style={{fontSize:'0.55em'}}>{pricing.cents}</span>}
                  <span className="per">{pricing.per}</span>
                </div>
                {pricing.note && <p className="price-note">{pricing.note}</p>}
                <ul className="price-features">
                  <li><span>Unlimited diagnosis-led teaching — every misconception rebuilt, every time</span></li>
                  <li><span>Full IB Economics + IB Business Management syllabus — HL &amp; SL</span></li>
                  <li><span>Paper 1, 2 &amp; 3 (HL) exam-style questions worked through in lessons</span></li>
                  <li><span>IB-standard diagram marking — taught inline, your hand-drawn diagrams marked</span></li>
                  <li><span>Progress tracked per subject — weak-area retesting built in</span></li>
                  <li><span>Works on any device</span></li>
                </ul>
                <Link href="/auth/signup" className="btn btn-rust">Start free <span className="arrow">→</span></Link>
              </article>
            </div>
            <p className="pricing-reassure">Start free. No card needed for the demo. Paid plans include a 7-day money-back guarantee. Cancel anytime.</p>
          </div>
        </section>

        {/* ── FAQ ── */}
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

        {/* ── FINAL CTA ── */}
        <section className="final-cta">
          <div className="wrap final-cta-inner">
            <h2 className="h-display">Turn understanding into <em className="italic">exam marks.</em></h2>
            <p className="lead">Start tonight. Stop repeating the same mistakes by next week.</p>
            <div className="hero-cta">
              <Link href="/auth/signup" className="btn btn-rust">Start free <span className="arrow">→</span></Link>
              <Link href="/demo" className="btn btn-ghost">Try the live demo</Link>
            </div>
            <div className="small">No card needed to start · paid plans from €44.99 / month · 7-day money-back guarantee</div>
          </div>
        </section>

        {/* ── FOOTER ── */}
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
          <div className="wrap" style={{textAlign:'center',marginTop:20,paddingBottom:8}}>
            <p style={{fontFamily:'var(--sans)',fontSize:11,color:'var(--ink-3)',lineHeight:1.5}}>
              Gradd.ai is an independent learning platform and is not affiliated with or endorsed by the International Baccalaureate Organization (IBO).
            </p>
          </div>
        </footer>

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
  --max:      1320px;
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
  padding: 0 28px;
}
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
.ib-lp .hero-reassure {
  margin-top: 14px; font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
}
@media (max-width: 480px) {
  .ib-lp .hero-cta { flex-direction: column; align-items: stretch; gap: 10px; }
  .ib-lp .hero-cta .btn { width: 100%; justify-content: center; }
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
.ib-lp .subj-included {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-3);
}

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
@media (max-width: 480px) {
  .ib-lp .dash-stats { grid-template-columns: repeat(2,1fr); }
  .ib-lp .dash-preview { padding: 16px 18px; }
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
.ib-lp .cmp-desktop { display: block; }
.ib-lp .cmp-wrap {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); overflow: hidden;
}
.ib-lp .cmp { width: 100%; border-collapse: collapse; font-size: 14px; }
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
  background: color-mix(in oklab,var(--forest) 12%,var(--paper));
  border-left: 2px solid color-mix(in oklab,var(--forest) 60%,var(--rule));
  border-right: 1px solid color-mix(in oklab,var(--forest) 20%,var(--rule));
  font-weight: 600;
}
.ib-lp .cmp tbody tr td:first-child {
  font-family: var(--mono); font-size: 12px; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--ink-3); width: 22%;
}
.ib-lp .cmp .y { color: oklch(45% 0.13 145); font-weight: 600; }
.ib-lp .cmp .n { color: var(--ink-3); }

/* ── Compare: closing + CTA ── */
.ib-lp .cmp-closing {
  margin: 36px 0 28px; font-size: 16px; line-height: 1.65; color: var(--ink-2); max-width: 680px;
}
.ib-lp .cmp-cta { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }

/* ── Compare: mobile card layout (<768px) ── */
.ib-lp .cmp-mobile { display: none; }
.ib-lp .cmp-mobile-gradd {
  background: color-mix(in oklab,var(--forest) 12%,var(--paper));
  border: 1px solid var(--rule); border-left: 3px solid var(--forest);
  border-radius: var(--radius); overflow: hidden;
}
.ib-lp .cmp-mobile-col-header {
  background: var(--forest); color: var(--rust-ink);
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em;
  text-transform: uppercase; font-weight: 600; padding: 12px 18px;
}
.ib-lp .cmp-mobile-alt .cmp-mobile-col-header {
  background: var(--paper-2); color: var(--ink-3);
}
.ib-lp .cmp-mobile-row {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px 18px; border-bottom: 1px solid var(--rule);
}
.ib-lp .cmp-mobile-last { border-bottom: 0; }
.ib-lp .cmp-lbl {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-3);
}
.ib-lp .cmp-mobile-gradd .y { color: oklch(45% 0.13 145); font-weight: 600; font-size: 15px; }
.ib-lp .cmp-mobile .n { color: var(--ink-3); font-size: 14px; }
.ib-lp .cmp-toggle {
  display: block; width: 100%; margin-top: 14px;
  background: var(--paper); border: 1px solid var(--rule); border-radius: var(--radius-sm);
  padding: 14px 18px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--forest); cursor: pointer; text-align: center;
}
.ib-lp .cmp-toggle:hover { background: var(--sage-2); }
.ib-lp .cmp-mobile-alts { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; }
.ib-lp .cmp-mobile-alt {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); overflow: hidden;
}

@media (max-width: 767px) {
  .ib-lp .cmp-desktop { display: none; }
  .ib-lp .cmp-mobile { display: block; }
  .ib-lp .cmp-cta { flex-direction: column; align-items: flex-start; gap: 14px; }
  .ib-lp .cmp-cta .btn { white-space: normal; text-align: center; }
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
.ib-lp .price-grid-1 {
  display: grid; grid-template-columns: 1fr; gap: 16px; margin-top: 32px;
  max-width: 640px; margin-left: auto; margin-right: auto;
}
.ib-lp .price {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 32px;
  display: flex; flex-direction: column; gap: 14px;
}
.ib-lp .price.featured { background: var(--forest); color: var(--forest-ink); border-color: var(--forest); }
.ib-lp .price.featured .price-features li { border-color: color-mix(in oklab,var(--forest-ink) 20%,transparent); }
.ib-lp .price.featured .price-features li::before { color: var(--rust); }
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
.ib-lp .pricing-reassure {
  font-family: var(--mono); font-size: 11px; letter-spacing: 0.06em;
  color: var(--ink-3); text-align: center; margin-top: 28px;
  max-width: 640px; margin-left: auto; margin-right: auto;
}

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
  .ib-lp .final-cta .hero-cta { flex-direction: column; align-items: center; max-width: 340px; margin-left: auto; margin-right: auto; }
}

/* ── Footer ── */
.ib-lp .footer { padding: 56px 0 40px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--ink-3); }
.ib-lp .footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; }
.ib-lp .footer-links { display: flex; gap: 24px; }
.ib-lp .footer-links a:hover { color: var(--ink); }

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
@media (max-width: 640px) { .ib-lp .to-top { right: 16px; bottom: 16px; } }
@media (max-width: 480px) {
  .ib-lp .subj-hd { flex-direction: column; align-items: flex-start; gap: 8px; }
  .ib-lp .subj-foot { flex-direction: column; align-items: stretch; }
  .ib-lp .chat { max-height: 360px; overflow: hidden; position: relative; }
  .ib-lp .chat::after {
    content: ""; position: absolute; bottom: 0; left: 0; right: 0; height: 72px;
    background: linear-gradient(to bottom, transparent, var(--paper));
    border-radius: 0 0 22px 22px; pointer-events: none; z-index: 1;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEW SECTIONS — added for diagnosis-first restructure
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 2. Diagnosis exchange ── */
.ib-lp .diag-exchange {
  background: var(--paper);
  border: 1px solid var(--rule-strong);
  border-radius: 22px;
  padding: 32px 36px;
  display: flex;
  flex-direction: column;
  gap: 26px;
  box-shadow: 0 24px 48px -24px rgba(20,24,22,0.14), 0 2px 6px rgba(20,24,22,0.06);
  max-width: 800px;
}
.ib-lp .dx-row { display: flex; align-items: flex-start; gap: 14px; }
.ib-lp .dx-row.dx-student { justify-content: flex-end; }
.ib-lp .dx-av {
  width: 28px; height: 28px; flex: 0 0 28px; border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--mono); font-size: 11px; font-weight: 500;
}
.ib-lp .dx-av-mia { background: var(--forest); color: var(--gold); }
.ib-lp .dx-av-student { background: var(--rust); color: var(--rust-ink); }
.ib-lp .dx-bubble-student {
  background: var(--forest); color: var(--forest-ink);
  padding: 12px 18px; border-radius: 18px 18px 4px 18px;
  font-size: 15px; line-height: 1.5; max-width: 80%;
}
.ib-lp .dx-msg {
  display: flex; flex-direction: column; gap: 8px;
  max-width: calc(100% - 42px);
}
.ib-lp .dx-msg p {
  margin: 0; font-size: 15px; line-height: 1.65; color: var(--ink);
}
.ib-lp .dx-msg em { font-style: italic; font-family: var(--serif); color: var(--rust); }
.ib-lp .dx-label {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.14em;
  text-transform: uppercase;
  background: color-mix(in oklab,var(--rust) 12%,transparent);
  color: var(--rust); padding: 3px 10px; border-radius: 999px;
  align-self: flex-start; margin-bottom: 2px;
}
.ib-lp .dx-label-rebuild {
  background: color-mix(in oklab,var(--forest) 12%,transparent);
  color: oklch(30% 0.04 168);
}
.ib-lp .dx-label-retest {
  background: color-mix(in oklab,var(--gold) 22%,transparent);
  color: oklch(46% 0.12 75);
}
.ib-lp .dx-caption {
  margin-top: 32px;
  font-family: var(--serif); font-style: italic;
  font-size: clamp(17px,1.5vw,20px); color: var(--ink-2);
  max-width: 68ch; line-height: 1.5;
}
@media (max-width: 640px) {
  .ib-lp .diag-exchange { padding: 22px 20px; gap: 20px; }
  .ib-lp .dx-bubble-student { font-size: 14px; }
  .ib-lp .dx-msg p { font-size: 14px; }
}

/* ── 3. Gradd Method steps ── */
.ib-lp .method-steps {
  border: 1px solid var(--rule); border-radius: var(--radius);
  overflow: hidden; margin-bottom: 32px;
}
.ib-lp .method-step {
  display: grid; grid-template-columns: 72px 1fr;
  border-bottom: 1px solid var(--rule); background: var(--paper);
}
.ib-lp .method-step:last-child { border-bottom: 0; }
.ib-lp .method-step:nth-child(even) { background: color-mix(in oklab,var(--paper) 60%,var(--paper-2)); }
.ib-lp .method-n {
  font-family: var(--serif); font-style: italic; font-size: 32px;
  color: var(--rust); letter-spacing: -0.02em; line-height: 1;
  padding: 28px 0 28px 28px; display: flex; align-items: flex-start; padding-top: 30px;
}
.ib-lp .method-body {
  padding: 26px 28px; display: flex; flex-direction: column; gap: 6px;
  border-left: 1px solid var(--rule);
}
.ib-lp .method-body h3 {
  font-family: var(--serif); font-size: 22px;
  letter-spacing: -0.012em; line-height: 1.2;
}
.ib-lp .method-body p {
  font-size: 14.5px; color: var(--ink-2); line-height: 1.55; margin: 0;
}
.ib-lp .method-closing {
  font-family: var(--serif); font-style: italic;
  font-size: clamp(18px,1.6vw,22px); color: var(--forest);
  max-width: 62ch; line-height: 1.45; letter-spacing: -0.01em;
}
@media (max-width: 520px) {
  .ib-lp .method-step { grid-template-columns: 52px 1fr; }
  .ib-lp .method-n { font-size: 22px; padding: 22px 0 22px 16px; }
  .ib-lp .method-body { padding: 20px 16px; }
  .ib-lp .method-body h3 { font-size: 18px; }
}

/* ── 4. Live demo CTA band ── */
.ib-lp .demo-cta-band {
  padding: clamp(36px,5vw,60px) 0;
  background: var(--forest); color: var(--forest-ink);
}
.ib-lp .demo-cta-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 32px; flex-wrap: wrap;
}
.ib-lp .demo-cta-copy { flex: 1; min-width: 0; }
.ib-lp .demo-cta-h {
  font-family: var(--serif); font-size: clamp(26px,3vw,40px);
  font-weight: 400; letter-spacing: -0.015em; line-height: 1.05; margin-bottom: 10px;
}
.ib-lp .demo-cta-sub {
  font-size: 16px; color: color-mix(in oklab,var(--forest-ink) 80%,transparent);
  line-height: 1.5; max-width: 52ch;
}
.ib-lp .demo-cta-btn { flex-shrink: 0; }
@media (max-width: 640px) {
  .ib-lp .demo-cta-inner { flex-direction: column; align-items: flex-start; }
}

/* ── 9. Before / After proof ── */
.ib-lp .ba-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 16px;
}
@media (max-width: 860px) { .ib-lp .ba-grid { grid-template-columns: 1fr; } }
.ib-lp .ba-card {
  background: var(--paper); border: 1px solid var(--rule);
  border-radius: var(--radius); padding: 28px 28px 32px;
  display: flex; flex-direction: column; gap: 16px;
}
.ib-lp .ba-before { border-top: 3px solid var(--rule-strong); }
.ib-lp .ba-diag   { border-top: 3px solid var(--rust); }
.ib-lp .ba-after  { border-top: 3px solid oklch(48% 0.13 145); }
.ib-lp .ba-tag {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3); padding: 3px 10px;
  border-radius: 999px; background: var(--paper-2); align-self: flex-start;
}
.ib-lp .ba-tag-diag  { color: var(--rust); background: color-mix(in oklab,var(--rust) 10%,transparent); }
.ib-lp .ba-tag-after { color: oklch(45% 0.13 145); background: color-mix(in oklab,oklch(48% 0.13 145) 10%,transparent); }
.ib-lp .ba-label {
  font-family: var(--mono); font-size: 10px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-3); margin-bottom: -4px;
}
.ib-lp .ba-quote {
  font-family: var(--serif); font-size: clamp(16px,1.35vw,20px);
  font-style: italic; line-height: 1.5; color: var(--ink);
  margin: 0; padding: 0; border: 0;
}
`;
