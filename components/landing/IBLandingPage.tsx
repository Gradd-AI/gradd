'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useState, useEffect } from 'react';

// ── Data ──────────────────────────────────────────────────────

const IB_ECON_UNITS = [
  { code: 'Unit 1', title: 'Introduction to Economics', desc: 'Scarcity, choice, resource allocation, economic systems, and the production possibility frontier. The foundation everything else builds on.' },
  { code: 'Unit 2', title: 'Microeconomics', desc: 'Supply, demand, elasticity, market failure, externalities, public goods, and government intervention. The core of Paper 1 Part A.' },
  { code: 'Unit 3', title: 'Macroeconomics', desc: 'GDP, unemployment, inflation, fiscal and monetary policy, Keynesian and monetarist models. Paper 2 data-response territory.' },
  { code: 'Unit 4', title: 'The Global Economy', desc: 'International trade, exchange rates, balance of payments, economic development, and sustainability. Full HL extension coverage included.' },
];

const IB_BM_UNITS = [
  { code: 'Unit 1', title: 'Business Organisation & Environment', desc: 'Types of organisations, business objectives, stakeholders, and the external environment (STEEPLE). Foundation for case study analysis.' },
  { code: 'Unit 2', title: 'Human Resource Management', desc: 'Motivation theories, leadership styles, organisational structure, and workforce planning. Paper 1 essay staples.' },
  { code: 'Unit 3', title: 'Finance & Accounts', desc: 'Financial statements, ratio analysis, investment appraisal, and sources of finance. The highest-weight unit at HL.' },
  { code: 'Unit 4', title: 'Marketing', desc: 'The marketing mix, market research, product lifecycle, pricing strategies, and consumer behaviour. Core to the structured case study.' },
  { code: 'Unit 5', title: 'Operations Management', desc: 'Production methods, quality management, supply chain, and lean production. HL extension includes crisis management.' },
];

const PAIN_CARDS = [
  { icon: '💷', title: '£720 for 10 hours', body: "Lanterna's flagship tutoring package. That's £72 per hour for a fraction of the curriculum. Covering IB Economics fully at that rate would cost thousands." },
  { icon: '📅', title: 'Tutors don\'t deliver the full course', body: 'A weekly session covers whatever comes up that week — not necessarily what the exam will test. There\'s no curriculum sequence. No unit plan. No continuity.' },
  { icon: '📝', title: 'The IB exam rewards specific technique', body: 'AO1, AO2, AO3 command terms. Diagram analysis. Evaluation frameworks. Textbooks teach content. Most tutors assume you already have the technique.' },
  { icon: '🌍', title: 'Good IB support is unevenly distributed', body: 'Students in Singapore, Nairobi, Berlin, or Buenos Aires sit the same IB exam — but don\'t have the same access to specialist tutors. Gradd fixes that.' },
];

const FEATURES = [
  { title: 'Structured, not conversational', body: 'Gradd teaches units in sequence. Supply and demand before market failure. Microeconomics before macroeconomics. The syllabus unfolds in order — not on request.' },
  { title: 'Command term fluency from session 1', body: 'Every response models the AO1–AO3 language IB examiners reward. Students learn to define, explain, and evaluate from their very first session.' },
  { title: 'SL and HL tracks both covered', body: 'Your exam level determines your content. SL students follow Papers 1 & 2. HL students get Paper 3 content, quantitative skills, and all HL extension topics.' },
  { title: 'Diagrams taught and tested', body: 'Every core diagram — supply/demand, PPF, AD/AS, Laffer curve — explained with precision. Axes, curves, shifts, and exactly what each area represents on the mark scheme.' },
  { title: 'Progress tracked automatically', body: 'Every session is logged. Weak areas are flagged and revisited. You always know exactly where you are in the curriculum and what needs work.' },
];

const COMPARISON_ROWS: [string, string, string, string, string][] = [
  ['Full IB curriculum delivery', '✓ if you can afford it', 'Content only', '✗', '✓'],
  ['IB command term technique', 'Varies by tutor', '✗', '✗', '✓'],
  ['SL & HL both covered', '✓', '✓', 'Partial', '✓'],
  ['Available 24/7 worldwide', '✗', '✓', '✓', '✓'],
  ['Progress tracked automatically', '✗', '✗', 'Partial', '✓'],
  ['Monthly cost', '£720+ per 10 hrs', '£30–60 once', '€10–40', '€44.99/subject'],
];

const PRICING_FEATURES_ECON = [
  'Full IB Economics curriculum — Units 1–4',
  'SL track (Papers 1 & 2) and HL track (Papers 1, 2 & 3)',
  'Structured AI tutor sessions with Mia',
  'AO1–AO3 command term technique built in from session 1',
  'All core diagrams taught and tested with precision',
  'Quantitative skills for HL Paper 3',
  'Automatic progress tracking and weak-area targeting',
  'Works on any device — desktop, tablet, phone',
];

const PRICING_FEATURES_BM = [
  'Full IB Business Management curriculum — Units 1–5',
  'SL track (Papers 1 & 2) and HL track with extension content',
  'Structured AI tutor sessions',
  'Case study technique and command term fluency from session 1',
  'Finance and accounts — the highest-weight HL unit, fully covered',
  'Automatic progress tracking and weak-area targeting',
  'Works on any device — desktop, tablet, phone',
];

const PRICING_FEATURES_BUNDLE = [
  'Everything in IB Economics — full curriculum, SL & HL',
  'Everything in IB Business Management — full curriculum, SL & HL',
  'Two AI tutors, two full curricula, one subscription',
  'Progress tracked separately per subject',
  'Save €15/month versus paying for each subject individually',
  'Works on any device — desktop, tablet, phone',
];

// ── Component ─────────────────────────────────────────────────

export default function IBLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      setShowTop(window.scrollY > 600);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        /* ── SCOPED VARS & RESET ── */
        .ib-wrap *, .ib-wrap *::before, .ib-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .ib-wrap {
          --g900: #0d1f14;
          --g800: #122a1c;
          --g750: #1B3D2F;
          --g700: #1a3d28;
          --g600: #2e6e39;
          --g500: #3a8a48;
          --g400: #52a861;
          --g200: #a8d9b0;
          --g100: #d4eed8;
          --g50:  #edf7ef;
          --mint: #7EC8A4;
          --amber: #d97706;
          --amber-lt: #f59e0b;
          --amber-200: #fcd34d;
          --cream: #faf8f3;
          --cream-dk: #f2ede2;
          --white: #ffffff;
          --ink900: #111810;
          --ink700: #2d3a30;
          --ink500: #4f6353;
          --ink300: #8fa993;
          --ink100: #d4e0d6;
          --fd: var(--font-display, 'Playfair Display', Georgia, serif);
          --fb: var(--font-body, 'Plus Jakarta Sans', system-ui, sans-serif);
          font-family: var(--fb);
          background: var(--cream);
          color: var(--ink900);
          font-size: 17px;
          line-height: 1.65;
          -webkit-font-smoothing: antialiased;
        }

        /* ── NAV ── */
        .ib-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(250,248,243,0.96);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid transparent;
          padding: 0 2rem;
          transition: border-color .2s, box-shadow .2s;
        }
        .ib-nav.ib-scrolled {
          border-bottom-color: var(--ink100);
          box-shadow: 0 1px 12px rgba(0,0,0,.05);
        }
        .ib-nav-inner {
          max-width: 1080px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          height: 64px; gap: 1.5rem;
        }
        .ib-logo {
          font-family: var(--fd); font-size: 1.5rem; font-weight: 700;
          color: var(--g700); text-decoration: none; letter-spacing: -.02em;
          flex-shrink: 0;
        }
        .ib-logo-dot { color: var(--amber); }
        .ib-nav-links {
          display: flex; align-items: center; gap: 1.75rem;
          list-style: none; margin-left: auto;
        }
        .ib-nav-links a {
          font-size: .9rem; font-weight: 500; color: var(--ink700);
          text-decoration: none; transition: color .2s; white-space: nowrap;
        }
        .ib-nav-links a:hover { color: var(--g700); }
        .ib-nav-login { color: var(--ink500) !important; }
        .ib-nav-cta {
          background: var(--g700); color: var(--white) !important;
          padding: .5rem 1.2rem; border-radius: 6px;
          font-weight: 600 !important; transition: background .2s !important;
          white-space: nowrap;
        }
        .ib-nav-cta:hover { background: var(--g600) !important; }

        /* ── SECTION SHARED ── */
        .ib-sec { padding: 5rem 2rem; }
        .ib-inn { max-width: 1080px; margin: 0 auto; }
        .ib-tag {
          display: inline-block; font-size: .75rem; font-weight: 600;
          letter-spacing: .1em; text-transform: uppercase;
          color: var(--g600); margin-bottom: .85rem;
        }
        .ib-h2 {
          font-family: var(--fd);
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 700; color: var(--ink900);
          line-height: 1.18; letter-spacing: -.025em;
          margin-bottom: 1.25rem;
        }
        .ib-h2 em { font-style: italic; color: var(--g600); }
        .ib-sub {
          font-size: 1.05rem; color: var(--ink500);
          max-width: 560px; line-height: 1.65;
        }

        /* ── HERO ── */
        .ib-hero {
          background: var(--g800); position: relative;
          overflow: hidden; padding: 7rem 2rem 6rem;
        }
        .ib-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 60% at 60% 50%, rgba(58,138,72,.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .ib-hero-inn {
          max-width: 820px; margin: 0 auto;
          text-align: center; position: relative; z-index: 1;
        }
        .ib-badge {
          display: inline-flex; align-items: center; gap: .5rem;
          background: rgba(126,200,164,.14);
          border: 1px solid rgba(126,200,164,.32);
          color: var(--mint); font-size: .8rem; font-weight: 600;
          letter-spacing: .06em; text-transform: uppercase;
          padding: .4rem 1rem; border-radius: 100px; margin-bottom: 2rem;
        }
        .ib-badge-dot {
          width: 7px; height: 7px;
          background: var(--mint); border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(126,200,164,.3);
          animation: ib-pulse 2.2s ease-in-out infinite;
        }
        @keyframes ib-pulse {
          0%,100% { box-shadow: 0 0 0 2px rgba(126,200,164,.3); }
          50%      { box-shadow: 0 0 0 6px rgba(126,200,164,.08); }
        }
        .ib-h1 {
          font-family: var(--fd);
          font-size: clamp(2.4rem, 5.5vw, 3.8rem);
          font-weight: 700; color: var(--white);
          line-height: 1.12; letter-spacing: -.03em;
          margin-bottom: 1.5rem;
        }
        .ib-h1 em { font-style: italic; color: var(--g200); }
        .ib-hero-sub {
          font-size: 1.15rem; color: rgba(255,255,255,.7);
          max-width: 620px; margin: 0 auto 2.5rem; line-height: 1.6;
        }
        .ib-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: .75rem; }
        .ib-btn-a {
          display: inline-block; background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-weight: 700; font-size: 1rem;
          padding: .9rem 2rem; border-radius: 8px; text-decoration: none;
          transition: background .2s, transform .15s;
        }
        .ib-btn-a:hover { background: var(--amber-lt); transform: translateY(-1px); }
        .ib-btn-b {
          display: inline-block; background: transparent;
          border: 1px solid rgba(255,255,255,.28); color: rgba(255,255,255,.85);
          font-family: var(--fb); font-weight: 500; font-size: 1rem;
          padding: .9rem 2rem; border-radius: 8px; text-decoration: none;
          transition: border-color .2s, color .2s;
        }
        .ib-btn-b:hover { border-color: rgba(255,255,255,.6); color: var(--white); }
        .ib-hero-note { font-size: .82rem; color: rgba(255,255,255,.35); margin-top: .5rem; }
        .ib-stats {
          display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;
          margin-top: 4rem; padding-top: 3rem;
          border-top: 1px solid rgba(255,255,255,.1);
        }
        .ib-stat { text-align: center; }
        .ib-stat-n {
          font-family: var(--fd); font-size: 2rem; font-weight: 700;
          color: var(--white); line-height: 1; display: block;
        }
        .ib-stat-l { font-size: .82rem; color: rgba(255,255,255,.45); margin-top: .3rem; letter-spacing: .02em; }

        /* ── PROBLEM ── */
        .ib-prob { background: var(--white); }
        .ib-prob-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 3rem; align-items: start; margin-top: 3.5rem;
        }
        .ib-prob-text p { color: var(--ink500); font-size: 1rem; line-height: 1.7; margin-bottom: 1.25rem; }
        .ib-pain-cards { display: flex; flex-direction: column; gap: 1rem; }
        .ib-pain {
          background: var(--cream); border: 1px solid var(--ink100);
          border-radius: 10px; padding: 1.25rem 1.5rem;
          display: flex; gap: 1rem; align-items: flex-start;
        }
        .ib-pain-ico {
          width: 36px; height: 36px; border-radius: 8px;
          background: #fee2e2; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; font-size: 1rem;
        }
        .ib-pain h4 { font-size: .95rem; font-weight: 600; color: var(--ink900); margin-bottom: .25rem; }
        .ib-pain p  { font-size: .88rem; color: var(--ink500); line-height: 1.5; }

        /* ── SOLUTION ── */
        .ib-sol { background: var(--cream); }
        .ib-sol-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 1.5rem; margin-top: 3.5rem;
        }
        .ib-sol-card {
          background: var(--white); border: 1px solid var(--ink100);
          border-radius: 12px; padding: 2rem 1.75rem;
          transition: border-color .2s, transform .2s;
        }
        .ib-sol-card:hover { border-color: var(--g400); transform: translateY(-2px); }
        .ib-sol-card.ib-feat { border-color: var(--g500); background: var(--g50); }
        .ib-sol-num {
          font-family: var(--fd); font-size: .75rem; font-weight: 700;
          color: var(--g500); letter-spacing: .08em; text-transform: uppercase; margin-bottom: .75rem;
        }
        .ib-sol-card h3 {
          font-family: var(--fd); font-size: 1.2rem; font-weight: 600;
          color: var(--ink900); margin-bottom: .75rem; line-height: 1.3;
        }
        .ib-sol-card p { font-size: .92rem; color: var(--ink500); line-height: 1.65; }

        /* ── SUBJECTS ── */
        .ib-subj { background: var(--cream-dk); }
        .ib-subj-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 2rem; margin-top: 3.5rem;
        }
        .ib-subj-card {
          background: var(--white); border: 1px solid var(--ink100);
          border-radius: 16px; overflow: hidden;
        }
        .ib-subj-hd {
          background: var(--g700); padding: 1.75rem 2rem;
        }
        .ib-subj-hd h3 {
          font-family: var(--fd); font-size: 1.4rem; font-weight: 700;
          color: var(--white); line-height: 1.2; margin-bottom: .4rem;
        }
        .ib-subj-hd p { font-size: .88rem; color: rgba(255,255,255,.55); }
        .ib-subj-body { padding: 1.75rem 2rem; }
        .ib-subj-units { display: flex; flex-direction: column; gap: .9rem; margin-bottom: 1.75rem; }
        .ib-subj-unit { display: flex; gap: .75rem; align-items: flex-start; }
        .ib-subj-unit-code {
          font-size: .7rem; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; color: var(--g600);
          min-width: 52px; flex-shrink: 0; padding-top: .15rem;
        }
        .ib-subj-unit-info h5 {
          font-size: .92rem; font-weight: 600; color: var(--ink900);
          margin-bottom: .15rem; line-height: 1.3;
        }
        .ib-subj-unit-info p { font-size: .8rem; color: var(--ink500); line-height: 1.45; }
        .ib-subj-price-row {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 1.25rem; border-top: 1px solid var(--ink100);
        }
        .ib-subj-price {
          font-family: var(--fd); font-size: 1.75rem; font-weight: 700;
          color: var(--ink900); line-height: 1;
        }
        .ib-subj-price span { font-size: .95rem; font-weight: 400; color: var(--ink500); }
        .ib-subj-btn {
          display: inline-block; background: var(--g700); color: var(--white);
          font-family: var(--fb); font-weight: 600; font-size: .88rem;
          padding: .65rem 1.3rem; border-radius: 8px; text-decoration: none;
          transition: background .2s;
        }
        .ib-subj-btn:hover { background: var(--g600); }

        /* ── HOW IT WORKS ── */
        .ib-how { background: var(--g800); }
        .ib-how .ib-tag  { color: var(--g200); }
        .ib-how .ib-h2   { color: var(--white); }
        .ib-how .ib-h2 em{ color: var(--g200); }
        .ib-how .ib-sub  { color: rgba(255,255,255,.58); }
        .ib-steps {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 2rem; margin-top: 3.5rem; position: relative;
        }
        .ib-steps::before {
          content: ''; position: absolute;
          top: 1.2rem; left: calc(16.66% + 1rem);
          width: calc(66.66% - 2rem); height: 1px;
          background: rgba(255,255,255,.1);
        }
        .ib-step { text-align: center; }
        .ib-step-dot {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.2);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--fd); font-size: 1rem; font-weight: 700;
          color: var(--white); margin: 0 auto 1.5rem; position: relative; z-index: 1;
        }
        .ib-step h3 {
          font-family: var(--fd); font-size: 1.15rem; font-weight: 600;
          color: var(--white); margin-bottom: .6rem; line-height: 1.3;
        }
        .ib-step p { font-size: .9rem; color: rgba(255,255,255,.55); line-height: 1.65; }

        /* ── TUTOR PREVIEW ── */
        .ib-tutor { background: var(--white); }
        .ib-tutor-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center;
        }
        .ib-chat {
          background: var(--cream); border: 1px solid var(--ink100);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 8px 48px rgba(0,0,0,.08);
        }
        .ib-chat-hd {
          background: var(--g700); padding: 1rem 1.25rem;
          display: flex; align-items: center; gap: .75rem;
        }
        .ib-chat-av {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--g600); display: flex; align-items: center;
          justify-content: center; font-family: var(--fd);
          font-size: .85rem; font-weight: 700; color: var(--white); flex-shrink: 0;
        }
        .ib-chat-hd h4 { font-size: .9rem; font-weight: 600; color: var(--white); }
        .ib-chat-hd p  { font-size: .75rem; color: rgba(255,255,255,.5); }
        .ib-chat-body  { padding: 1.5rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .ib-msg {
          max-width: 88%; padding: .75rem 1rem; border-radius: 12px;
          font-size: .87rem; line-height: 1.55;
        }
        .ib-msg.ib-mia {
          background: var(--white); border: 1px solid var(--ink100);
          color: var(--ink700); align-self: flex-start; border-bottom-left-radius: 3px;
        }
        .ib-msg.ib-stu {
          background: var(--g700); color: var(--white);
          align-self: flex-end; border-bottom-right-radius: 3px;
        }
        .ib-tfeats { list-style: none; display: flex; flex-direction: column; gap: 1.25rem; margin-top: 2rem; }
        .ib-tfeat  { display: flex; gap: .75rem; align-items: flex-start; }
        .ib-fcheck {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--g50); border: 1px solid var(--g200);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: .1rem;
        }
        .ib-tfeat h4 { font-size: .95rem; font-weight: 600; color: var(--ink900); margin-bottom: .15rem; }
        .ib-tfeat p  { font-size: .85rem; color: var(--ink500); line-height: 1.5; }

        /* ── WHY GRADD STATS ── */
        .ib-why { background: var(--cream); }
        .ib-why-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 2rem; margin-top: 3rem;
        }
        .ib-why-stat {
          background: var(--white); border: 1px solid var(--ink100);
          border-radius: 12px; padding: 2rem 1.75rem; text-align: center;
        }
        .ib-why-num {
          font-family: var(--fd); font-size: 3rem; font-weight: 700;
          color: var(--g700); line-height: 1; margin-bottom: .6rem; display: block;
        }
        .ib-why-label { font-size: .88rem; color: var(--ink500); line-height: 1.5; }

        /* ── COMPARISON ── */
        .ib-vs { background: var(--white); }
        .ib-twrap { overflow-x: auto; margin-top: 3rem; -webkit-overflow-scrolling: touch; }
        .ib-scroll-hint {
          display: none; font-size: .8rem; color: var(--ink300);
          text-align: right; margin-bottom: .5rem;
        }
        @media (max-width: 780px) {
          .ib-scroll-hint { display: block; }
          .ib-mobile-summary { display: flex !important; flex-direction: column; gap: .6rem; margin-top: 2rem; margin-bottom: 1.5rem; }
        }
        .ib-mobile-summary { display: none; }
        .ib-msrow {
          display: flex; align-items: center; justify-content: space-between;
          background: var(--g50); border: 1px solid var(--g200);
          border-radius: 8px; padding: .65rem 1rem; font-size: .9rem;
        }
        .ib-msrow-label { color: var(--ink700); font-weight: 500; }
        .ib-msrow-val { color: var(--g600); font-weight: 700; }
        .ib-ctable {
          width: 100%; border-collapse: collapse;
          font-size: .95rem; min-width: 640px;
        }
        .ib-ctable thead th {
          padding: 1rem 1.5rem; text-align: left;
          font-size: .8rem; font-weight: 600; letter-spacing: .06em;
          text-transform: uppercase; color: var(--ink300);
          border-bottom: 1px solid var(--ink100);
        }
        .ib-ctable thead th.ib-hl {
          background: var(--g50); color: var(--g600);
          border-radius: 8px 8px 0 0;
          border: 1px solid var(--g200); border-bottom: none;
        }
        .ib-ctable tbody td {
          padding: 1rem 1.5rem; border-bottom: 1px solid var(--ink100);
          color: var(--ink700); vertical-align: middle;
        }
        .ib-ctable tbody td.ib-hl {
          background: var(--g50); color: var(--g700);
          border-left: 1px solid var(--g200); border-right: 1px solid var(--g200);
          font-weight: 500;
        }
        .ib-ctable tbody td.ib-hl.ib-last {
          border-bottom: 1px solid var(--g200); border-radius: 0 0 8px 8px;
        }
        .ib-ctable .ib-rl { font-weight: 500; color: var(--ink900); }
        .ib-yes { color: var(--g600); }
        .ib-noo { color: #d1d5db; }

        /* ── PRICING ── */
        .ib-price-sec { background: var(--g800); }
        .ib-price-sec .ib-tag  { color: var(--g200); }
        .ib-price-sec .ib-h2   { color: var(--white); }
        .ib-price-sec .ib-sub  { color: rgba(255,255,255,.58); }
        .ib-pcards {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 1.5rem; margin-top: 3.5rem;
        }
        .ib-pcard {
          background: var(--white); border-radius: 20px;
          padding: 2.25rem 2rem; position: relative;
          text-align: left;
        }
        .ib-pcard.ib-bundle { border: 2px solid var(--amber); }
        .ib-pbadge {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-size: .75rem; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase;
          padding: .35rem 1rem; border-radius: 100px; white-space: nowrap;
        }
        .ib-pbadge.ib-pbadge-dark {
          background: #0d4a28; color: #ffffff;
          border: 1px solid rgba(255,255,255,.2);
        }
        .ib-psubject {
          font-size: .72rem; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--g600);
          margin-bottom: .65rem;
        }
        .ib-pcard h3 {
          font-family: var(--fd); font-size: 1.15rem; font-weight: 700;
          color: var(--ink900); margin-bottom: 1rem; line-height: 1.25;
        }
        .ib-prdisp { display: flex; align-items: flex-start; gap: .2rem; margin-bottom: 1rem; }
        .ib-pr-curr { font-family: var(--fd); font-size: 1.4rem; font-weight: 700; color: var(--ink900); margin-top: .5rem; }
        .ib-pr-amt  { font-family: var(--fd); font-size: 3.5rem; font-weight: 700; color: var(--ink900); line-height: 1; }
        .ib-pr-per  { font-size: .88rem; color: var(--ink500); align-self: flex-end; margin-bottom: .35rem; }
        .ib-pfeats {
          list-style: none; display: flex; flex-direction: column; gap: .75rem;
          margin-bottom: 1.75rem; padding-top: 1.25rem; border-top: 1px solid var(--ink100);
        }
        .ib-pfeats li { display: flex; align-items: flex-start; gap: .65rem; font-size: .875rem; color: var(--ink700); }
        .ib-pcheck {
          width: 18px; height: 18px; background: var(--g100);
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; margin-top: .15rem;
        }
        .ib-btn-sub {
          display: block; width: 100%; text-align: left;
          background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-weight: 700; font-size: .95rem;
          padding: .85rem; border-radius: 10px; text-decoration: none;
          transition: background .2s;
        }
        .ib-btn-sub:hover { background: var(--amber-lt); }
        .ib-btn-sub-green { background: var(--g700) !important; color: var(--white) !important; }
        .ib-btn-sub-green:hover { background: var(--g600) !important; }
        .ib-pguarantee { text-align: left; font-size: .78rem; color: var(--ink300); margin-top: 1rem; }
        .ib-pcmp {
          text-align: center; margin-top: 2.5rem;
          font-size: .9rem; color: rgba(255,255,255,.38);
        }
        .ib-pcmp span { color: rgba(255,255,255,.7); font-weight: 500; }

        /* ── BILLING TOGGLE ── */
        .ib-billing-toggle {
          display: inline-flex; align-items: center;
          background: rgba(255,255,255,.1); border-radius: 100px;
          padding: .25rem; margin-top: 1.75rem; margin-bottom: 0;
        }
        .ib-billing-opt {
          font-family: var(--fb); font-size: .875rem; font-weight: 600;
          padding: .5rem 1.25rem; border-radius: 100px; cursor: pointer;
          border: none; background: transparent; color: rgba(255,255,255,.55);
          transition: background .2s, color .2s; line-height: 1;
          display: flex; align-items: center; gap: .5rem;
        }
        .ib-billing-opt.ib-billing-active { background: var(--white); color: var(--ink900); }
        .ib-billing-save-pill {
          font-size: .7rem; font-weight: 700; letter-spacing: .05em;
          text-transform: uppercase; background: var(--amber); color: var(--ink900);
          padding: .2rem .5rem; border-radius: 100px;
        }
        .ib-pr-annual-mo {
          font-size: .82rem; color: var(--ink400); margin-top: .15rem;
          margin-bottom: .75rem; text-align: left;
        }
        .ib-pr-save {
          display: inline-block; background: #d4f0dd; color: #1a5c30;
          font-family: var(--fb); font-size: .75rem; font-weight: 700;
          letter-spacing: .05em; text-transform: uppercase;
          padding: .25rem .75rem; border-radius: 100px; margin-bottom: 1rem;
        }

        /* ── FINAL CTA ── */
        .ib-fcta { background: var(--g900); text-align: center; }
        .ib-fcta-inn { max-width: 600px; margin: 0 auto; }
        .ib-fcta .ib-tag { color: var(--g200); }
        .ib-fcta .ib-h2  { color: var(--white); }
        .ib-fcta .ib-sub { color: rgba(255,255,255,.52); margin: 0 auto 2.5rem; text-align: center; max-width: none; }
        .ib-fcta-btn {
          display: inline-block; background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-weight: 700; font-size: 1.05rem;
          padding: 1rem 2.5rem; border-radius: 8px; text-decoration: none;
          transition: background .2s, transform .15s;
        }
        .ib-fcta-btn:hover { background: var(--amber-lt); transform: translateY(-1px); }
        .ib-fcta-note { font-size: .82rem; color: rgba(255,255,255,.28); margin-top: 1rem; }

        /* ── SCROLL TO TOP ── */
        .ib-scroll-top {
          position: fixed; bottom: 1.5rem; right: 1.5rem; z-index: 200;
          width: 42px; height: 42px; border-radius: 50%;
          background: var(--g700); color: var(--white);
          border: none; cursor: pointer; font-size: 1.1rem;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 12px rgba(0,0,0,.2);
          opacity: 0; pointer-events: none;
          transition: opacity .2s, transform .2s;
        }
        .ib-scroll-top.ib-visible { opacity: 1; pointer-events: auto; }
        .ib-scroll-top:hover { transform: translateY(-2px); background: var(--g600); }

        /* ── FOOTER ── */
        .ib-footer {
          background: var(--ink900); padding: 3rem 2rem;
          color: rgba(255,255,255,.4); font-size: .85rem;
        }
        .ib-footer-inn {
          max-width: 1080px; margin: 0 auto;
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 1rem;
        }
        .ib-flogo {
          font-family: var(--fd); font-size: 1.3rem; font-weight: 700;
          color: var(--white); text-decoration: none; letter-spacing: -.02em;
        }
        .ib-flogo-dot { color: var(--amber-200); }
        .ib-flinks { display: flex; gap: 1.5rem; list-style: none; flex-wrap: wrap; }
        .ib-flinks a { color: rgba(255,255,255,.4); text-decoration: none; transition: color .2s; }
        .ib-flinks a:hover { color: rgba(255,255,255,.75); }

        /* ── RESPONSIVE ── */
        @media (max-width: 960px) {
          .ib-pcards { grid-template-columns: 1fr; max-width: 460px; margin-left: auto; margin-right: auto; }
        }
        @media (max-width: 780px) {
          .ib-prob-grid, .ib-tutor-grid, .ib-subj-grid { grid-template-columns: 1fr; gap: 2rem; }
          .ib-sol-grid, .ib-steps { grid-template-columns: 1fr 1fr; }
          .ib-why-grid { grid-template-columns: 1fr; }
          .ib-steps::before { display: none; }
          .ib-stats { gap: 1.5rem; }
        }
        @media (max-width: 768px) {
          .ib-nav-links { display: none; }
          .ib-mobile-nav { display: flex !important; }
        }
        @media (max-width: 520px) {
          .ib-sol-grid, .ib-steps { grid-template-columns: 1fr; }
          .ib-h1 { font-size: 2rem; }
          .ib-hero { padding: 4rem 1.5rem 4rem; }
        }
        .ib-mobile-nav {
          display: none;
          align-items: center; gap: .6rem;
        }
        .ib-mobile-login {
          font-size: .85rem; font-weight: 500; color: var(--ink500);
          text-decoration: none; padding: .4rem .6rem; white-space: nowrap;
        }
        .ib-mobile-cta {
          background: var(--g700); color: var(--white);
          font-size: .85rem; font-weight: 600;
          padding: .45rem 1rem; border-radius: 6px; text-decoration: none;
          white-space: nowrap;
        }
      `}</style>

      <div className="ib-wrap">

        {/* ── NAVIGATION ── */}
        <nav className={`ib-nav${scrolled ? ' ib-scrolled' : ''}`}>
          <div className="ib-nav-inner">
            <Link href="/"><img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 28, width: 'auto', display: 'block', maxWidth: 120 }} /></Link>
            <ul className="ib-nav-links">
              <li><a href="#subjects">Subjects</a></li>
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link href="/auth/login" className="ib-nav-login">Log in</Link></li>
              <li><Link href="/auth/signup" className="ib-nav-cta">Start 7-day free trial</Link></li>
            </ul>
            <div className="ib-mobile-nav">
              <Link href="/auth/login" className="ib-mobile-login">Log in</Link>
              <Link href="/auth/signup" className="ib-mobile-cta">Start →</Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="ib-hero">
          <div className="ib-hero-inn">
            <div className="ib-badge">
              <span className="ib-badge-dot" />
              Now live · IB Economics · IB Business Management
            </div>
            <h1 className="ib-h1">
              The first AI platform delivering the{' '}
              <em>full IB curriculum</em> from scratch
            </h1>
            <p className="ib-hero-sub">
              Lanterna charges £720 for 10 hours. Gradd delivers the full IB Economics or Business Management curriculum for €44.99 per month.
              <br />
              Structured lessons, IB exam technique, progress tracking. 24/7.
            </p>
            <div className="ib-ctas">
              <Link href="/auth/signup" className="ib-btn-a">Start 7-day free trial</Link>
              <a href="#how-it-works" className="ib-btn-b">See how it works</a>
            </div>
            <p className="ib-hero-note">Cancel any time before day 7. No charge.</p>
            <div className="ib-stats">
              <div className="ib-stat">
                <span className="ib-stat-n">2</span>
                <span className="ib-stat-l">IB subjects covered</span>
              </div>
              <div className="ib-stat">
                <span className="ib-stat-n">SL & HL</span>
                <span className="ib-stat-l">both tracks covered</span>
              </div>
              <div className="ib-stat">
                <span className="ib-stat-n">€44.99</span>
                <span className="ib-stat-l">per subject / month</span>
              </div>
              <div className="ib-stat">
                <span className="ib-stat-n">24/7</span>
                <span className="ib-stat-l">anywhere in the world</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section className="ib-sec ib-prob" id="problem">
          <div className="ib-inn">
            <div className="ib-prob-grid">
              <div className="ib-prob-text">
                <span className="ib-tag">The problem</span>
                <h2 className="ib-h2">IB tutoring costs too much. And it still doesn't deliver the full course.</h2>
                <p>Lanterna charges £720 for 10 hours of human tutoring. That covers a few topics — not a full curriculum. Preparing for IB Economics from scratch at that rate would cost thousands.</p>
                <p>And even when students can access quality tutors, the sessions are disconnected. There's no structured curriculum delivery, no continuity between lessons, no tracking of what's been covered and what hasn't.</p>
                <p>Gradd is the first platform to deliver the complete IB written exam curriculum through a structured AI tutor — covering every unit, in sequence, from session 1 to exam day.</p>
              </div>
              <div className="ib-pain-cards">
                {PAIN_CARDS.map(c => (
                  <div key={c.title} className="ib-pain">
                    <div className="ib-pain-ico">{c.icon}</div>
                    <div>
                      <h4>{c.title}</h4>
                      <p>{c.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── SOLUTION ── */}
        <section className="ib-sec ib-sol" id="solution">
          <div className="ib-inn">
            <span className="ib-tag">The solution</span>
            <h2 className="ib-h2">One subscription. The whole IB course.</h2>
            <p className="ib-sub">Gradd delivers the complete IB written exam curriculum through AI tutors who know the IBO syllabus, teach command term technique, and never let you move on until you're ready.</p>
            <div className="ib-sol-grid">
              <div className="ib-sol-card">
                <div className="ib-sol-num">01</div>
                <h3>Not a chatbot. A structured tutor.</h3>
                <p>Gradd's tutors teach units in sequence. Supply and demand before market failure. Microeconomics before macroeconomics. The curriculum unfolds in order — not on request. You can't skip ahead until you've demonstrated understanding.</p>
              </div>
              <div className="ib-sol-card ib-feat">
                <div className="ib-sol-num">02</div>
                <h3>IB command term fluency from session 1.</h3>
                <p>Every response models the AO1–AO3 language IB examiners reward. Students learn to define, explain, and evaluate — building the exam voice the mark scheme requires from their very first lesson.</p>
              </div>
              <div className="ib-sol-card">
                <div className="ib-sol-num">03</div>
                <h3>A fraction of the cost. The full curriculum.</h3>
                <p>Lanterna charges £720 for 10 hours. One month of Gradd gives you the entire IB Economics curriculum — unlimited sessions, structured from Unit 1, for €44.99. Both subjects together: €74.99/month.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── SUBJECTS ── */}
        <section className="ib-sec ib-subj" id="subjects">
          <div className="ib-inn">
            <span className="ib-tag">Our subjects</span>
            <h2 className="ib-h2">IB Economics and IB Business Management — <em>fully covered</em>.</h2>
            <p className="ib-sub">Both subjects available now. SL and HL tracks. Every unit, from the beginning.</p>
            <div className="ib-subj-grid">

              {/* IB Economics */}
              <div className="ib-subj-card">
                <div className="ib-subj-hd">
                  <h3>IB Economics</h3>
                  <p>Tutor: Mia · SL & HL · Papers 1, 2 & 3</p>
                </div>
                <div className="ib-subj-body">
                  <div className="ib-subj-units">
                    {IB_ECON_UNITS.map(u => (
                      <div key={u.code} className="ib-subj-unit">
                        <div className="ib-subj-unit-code">{u.code}</div>
                        <div className="ib-subj-unit-info">
                          <h5>{u.title}</h5>
                          <p>{u.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ib-subj-price-row">
                    <div className="ib-subj-price">€44.99<span> / month</span></div>
                    <div style={{ textAlign: 'center' }}>
                      <Link href="/auth/signup" className="ib-subj-btn">Start 7-day free trial</Link>
                      <p style={{ fontSize: '.72rem', color: 'var(--ink300)', marginTop: '.3rem' }}>Cancel any time before day 7. No charge.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* IB Business Management */}
              <div className="ib-subj-card">
                <div className="ib-subj-hd">
                  <h3>IB Business Management</h3>
                  <p>Tutor: Mia · SL & HL · Papers 1, 2 & 3 (HL)</p>
                </div>
                <div className="ib-subj-body">
                  <div className="ib-subj-units">
                    {IB_BM_UNITS.map(u => (
                      <div key={u.code} className="ib-subj-unit">
                        <div className="ib-subj-unit-code">{u.code}</div>
                        <div className="ib-subj-unit-info">
                          <h5>{u.title}</h5>
                          <p>{u.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="ib-subj-price-row">
                    <div className="ib-subj-price">€44.99<span> / month</span></div>
                    <div style={{ textAlign: 'center' }}>
                      <Link href="/auth/signup" className="ib-subj-btn">Start 7-day free trial</Link>
                      <p style={{ fontSize: '.72rem', color: 'var(--ink300)', marginTop: '.3rem' }}>Cancel any time before day 7. No charge.</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--ink300)', lineHeight: 1.65, marginTop: '2.5rem', maxWidth: 700 }}>
              Looking for an <strong style={{ fontWeight: 600, color: 'var(--ink500)' }}>IB Economics tutor</strong> or{' '}
              <strong style={{ fontWeight: 600, color: 'var(--ink500)' }}>IB Business Management tutor</strong> that covers the complete syllabus?
              Gradd delivers structured <strong style={{ fontWeight: 600, color: 'var(--ink500)' }}>IB revision</strong> for{' '}
              <strong style={{ fontWeight: 600, color: 'var(--ink500)' }}>Paper 1, Paper 2, and Paper 3</strong> — teaching every concept in
              sequence, from Unit 1 to exam day, for both SL and HL students.
            </p>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="ib-sec ib-how" id="how-it-works">
          <div className="ib-inn">
            <span className="ib-tag">How it works</span>
            <h2 className="ib-h2">Start at zero. Finish <em>exam-ready</em>.</h2>
            <p className="ib-sub">No prior knowledge required. Gradd takes you from the beginning of the IB syllabus through to full written exam readiness.</p>
            <div className="ib-steps">
              <div className="ib-step">
                <div className="ib-step-dot">1</div>
                <h3>Create your account</h3>
                <p>Choose your subject, select SL or HL, and your tutor opens Unit 1. No placement test. No setup. You just start.</p>
              </div>
              <div className="ib-step">
                <div className="ib-step-dot">2</div>
                <h3>Learn with your AI tutor</h3>
                <p>Each session runs 25–35 minutes. Your tutor explains concepts, checks understanding with IB-style questions, and teaches the command term language the mark scheme requires.</p>
              </div>
              <div className="ib-step">
                <div className="ib-step-dot">3</div>
                <h3>Build to exam confidence</h3>
                <p>As you progress through the units, sessions shift toward past-paper practice, diagram analysis, and AO3 evaluation. Weak areas are flagged and revisited automatically.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── TUTOR PREVIEW ── */}
        <section className="ib-sec ib-tutor" id="tutor">
          <div className="ib-inn">
            <div className="ib-tutor-grid">
              <div>
                <span className="ib-tag">Meet your IB Economics tutor</span>
                <h2 className="ib-h2">Mia knows every line of the IB Economics syllabus.</h2>
                <p className="ib-sub">She teaches in plain English, uses global examples, and never lets you move on until a concept is properly understood. She models AO1–AO3 command term language from session 1.</p>
                <p style={{ fontSize: '.9rem', color: 'var(--ink500)', marginTop: '1rem', lineHeight: 1.65, maxWidth: 480 }}>
                  Gradd isn't a chatbot you ask questions to. It follows the IBO syllabus in order — teaching each topic, checking understanding, correcting errors — until you can answer exam questions the way the mark scheme requires.
                </p>
                <ul className="ib-tfeats">
                  {FEATURES.map(f => (
                    <li key={f.title} className="ib-tfeat">
                      <div className="ib-fcheck">
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                          <path d="M1 5l3.5 3.5L11 1" stroke="#2e6e39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h4>{f.title}</h4>
                        <p>{f.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="ib-chat">
                <div className="ib-chat-hd">
                  <div className="ib-chat-av">M</div>
                  <div>
                    <h4>Mia</h4>
                    <p>Session in progress · Unit 2 · Microeconomics · Market Failure</p>
                  </div>
                </div>
                <div className="ib-chat-body">
                  <div className="ib-msg ib-mia">
                    Before we get into negative externalities — what's the core reason a free market produces too much of a good that generates external costs? Don't look it up. Tell me what you remember.
                  </div>
                  <div className="ib-msg ib-stu">
                    Because producers only count their private costs? They ignore the costs to third parties?
                  </div>
                  <div className="ib-msg ib-mia">
                    Exactly right. Producers optimise at MPC = MPB, not MSC = MSB. That divergence between private and social cost is why the market overproduces.
                    <br /><br />
                    In an AO2 "explain" question, you'd need to show this on a diagram. Tell me: where does the free market equilibrium sit relative to the socially optimum output, and which area represents welfare loss?
                  </div>
                  <div className="ib-msg ib-stu">The free market produces too much, so it's to the right of the optimum?</div>
                  <div className="ib-msg ib-mia">
                    Correct — Q<sub>FP</sub> sits to the right of Q<sub>opt</sub>. The welfare loss triangle sits between those two output levels, bounded by the MSC and MPB curves. That triangle is your deadweight loss. Let me walk you through drawing this precisely — because the examiner needs to see labelled axes, both curves, and both equilibria marked clearly…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHY STUDENTS CHOOSE GRADD ── */}
        <section className="ib-sec ib-why">
          <div className="ib-inn">
            <span className="ib-tag">Why students choose Gradd</span>
            <h2 className="ib-h2">Built for the full IB curriculum. Not just revision.</h2>
            <div className="ib-why-grid">
              <div className="ib-why-stat">
                <span className="ib-why-num">210</span>
                <div className="ib-why-label">structured IB Economics lessons across Units 1–4, SL and HL</div>
              </div>
              <div className="ib-why-stat">
                <span className="ib-why-num">136</span>
                <div className="ib-why-label">structured IB Business Management lessons across Units 1–5, SL and HL</div>
              </div>
              <div className="ib-why-stat">
                <span className="ib-why-num">153</span>
                <div className="ib-why-label">countries where the IB is delivered</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMPARISON ── */}
        <section className="ib-sec ib-vs" id="compare">
          <div className="ib-inn">
            <span className="ib-tag">How we compare</span>
            <h2 className="ib-h2">Gradd vs. everything else</h2>
            <p className="ib-sub">An honest comparison. Judge for yourself.</p>
            <div className="ib-mobile-summary">
              <div className="ib-msrow"><span className="ib-msrow-label">Full IB curriculum delivery</span><span className="ib-msrow-val">✓ Gradd</span></div>
              <div className="ib-msrow"><span className="ib-msrow-label">IB command term technique</span><span className="ib-msrow-val">✓ Gradd</span></div>
              <div className="ib-msrow"><span className="ib-msrow-label">SL & HL both covered</span><span className="ib-msrow-val">✓ Gradd</span></div>
              <div className="ib-msrow"><span className="ib-msrow-label">Available 24/7 worldwide</span><span className="ib-msrow-val">✓ Gradd</span></div>
              <div className="ib-msrow"><span className="ib-msrow-label">Progress tracked automatically</span><span className="ib-msrow-val">✓ Gradd</span></div>
              <div className="ib-msrow"><span className="ib-msrow-label">Monthly cost</span><span className="ib-msrow-val">€44.99 vs £720+ per 10 hrs</span></div>
            </div>
            <p className="ib-scroll-hint">← Swipe to compare →</p>
            <div className="ib-twrap">
              <table className="ib-ctable">
                <thead>
                  <tr>
                    <th></th>
                    <th>Lanterna / private tutor</th>
                    <th>Textbook</th>
                    <th>Other AI apps</th>
                    <th className="ib-hl">Gradd</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(([label, tutor, book, other, gradd], i) => (
                    <tr key={label}>
                      <td className="ib-rl">{label}</td>
                      <td className={tutor === '✗' ? 'ib-noo' : ''}>{tutor}</td>
                      <td className={book === '✗' ? 'ib-noo' : ''}>{book}</td>
                      <td className={other === '✗' ? 'ib-noo' : ''}>{other}</td>
                      <td
                        className={`ib-hl${i === COMPARISON_ROWS.length - 1 ? ' ib-last' : ''}${gradd === '✓' ? ' ib-yes' : ''}`}
                        style={label === 'Monthly cost' ? { fontWeight: 700 } : {}}
                      >
                        {gradd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section className="ib-sec ib-price-sec" id="pricing">
          <div className="ib-inn" style={{ textAlign: 'center' }}>
            <span className="ib-tag">Pricing</span>
            <h2 className="ib-h2">Simple pricing. Full curriculum.</h2>
            <p className="ib-sub" style={{ margin: '0 auto' }}>One subject or both. Cancel any time. Everything included from day one.</p>
            <div role="group" aria-label="Billing period" className="ib-billing-toggle">
              <button
                className={`ib-billing-opt${billingPeriod === 'monthly' ? ' ib-billing-active' : ''}`}
                onClick={() => setBillingPeriod('monthly')}
              >Monthly</button>
              <button
                className={`ib-billing-opt${billingPeriod === 'annual' ? ' ib-billing-active' : ''}`}
                onClick={() => setBillingPeriod('annual')}
              >Annual <span className="ib-billing-save-pill">Save 35%</span></button>
            </div>
            <div className="ib-pcards">

              {/* IB Economics */}
              <div className="ib-pcard">
                <div className="ib-pbadge">7-day money-back guarantee</div>
                <div className="ib-psubject">IB Economics</div>
                <h3>Full curriculum, SL & HL</h3>
                <div className="ib-prdisp">
                  <span className="ib-pr-curr">€</span>
                  <span className="ib-pr-amt">{billingPeriod === 'annual' ? '349' : '44.99'}</span>
                  <span className="ib-pr-per">{billingPeriod === 'annual' ? '/ year' : '/ month'}</span>
                </div>
                {billingPeriod === 'annual' && (
                  <>
                    <p className="ib-pr-annual-mo">€29.08 / month</p>
                    <span className="ib-pr-save">Save €190</span>
                  </>
                )}
                <ul className="ib-pfeats">
                  {PRICING_FEATURES_ECON.map(f => (
                    <li key={f}>
                      <div className="ib-pcheck">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#2e6e39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="ib-btn-sub">Start 7-day free trial — IB Economics</Link>
                <p className="ib-pguarantee">Cancel any time before day 7. No charge.</p>
              </div>

              {/* Bundle */}
              <div className="ib-pcard ib-bundle">
                <div className="ib-pbadge ib-pbadge-dark">
                  {billingPeriod === 'annual' ? 'Best value — save €321/year' : 'Best value — save €15/month'}
                </div>
                <div className="ib-psubject">IB Economics + IB Business Management</div>
                <h3>Both subjects, one subscription</h3>
                <div className="ib-prdisp">
                  <span className="ib-pr-curr">€</span>
                  <span className="ib-pr-amt">{billingPeriod === 'annual' ? '579' : '74.99'}</span>
                  <span className="ib-pr-per">{billingPeriod === 'annual' ? '/ year' : '/ month'}</span>
                </div>
                {billingPeriod === 'annual' && (
                  <>
                    <p className="ib-pr-annual-mo">€48.25 / month</p>
                    <span className="ib-pr-save">Save €321</span>
                  </>
                )}
                <p style={{ fontSize: '.85rem', color: 'var(--g600)', fontWeight: 600, marginBottom: '1.25rem', textAlign: 'left' }}>
                  {billingPeriod === 'annual'
                    ? 'Save €119/year versus two individual annual plans'
                    : 'Save €15/month versus subscribing to each subject individually'}
                </p>
                <ul className="ib-pfeats">
                  {PRICING_FEATURES_BUNDLE.map(f => (
                    <li key={f}>
                      <div className="ib-pcheck">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#2e6e39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className={`ib-btn-sub ib-btn-sub-green`}>Start 7-day free trial — Bundle</Link>
                <p className="ib-pguarantee">Cancel any time before day 7. No charge.</p>
              </div>

              {/* IB Business Management */}
              <div className="ib-pcard">
                <div className="ib-pbadge">7-day money-back guarantee</div>
                <div className="ib-psubject">IB Business Management</div>
                <h3>Full curriculum, SL & HL</h3>
                <div className="ib-prdisp">
                  <span className="ib-pr-curr">€</span>
                  <span className="ib-pr-amt">{billingPeriod === 'annual' ? '349' : '44.99'}</span>
                  <span className="ib-pr-per">{billingPeriod === 'annual' ? '/ year' : '/ month'}</span>
                </div>
                {billingPeriod === 'annual' && (
                  <>
                    <p className="ib-pr-annual-mo">€29.08 / month</p>
                    <span className="ib-pr-save">Save €190</span>
                  </>
                )}
                <ul className="ib-pfeats">
                  {PRICING_FEATURES_BM.map(f => (
                    <li key={f}>
                      <div className="ib-pcheck">
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#2e6e39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup" className="ib-btn-sub">Start 7-day free trial — IB Business</Link>
                <p className="ib-pguarantee">Cancel any time before day 7. No charge.</p>
              </div>

            </div>
            <p className="ib-pcmp">
              Compare: Lanterna charges <span>£720 for 10 hours</span> of human tutoring.
              {billingPeriod === 'annual'
                ? <> Gradd delivers the full IB curriculum for <span>€349/subject/year</span> — or <span>€579/year for both subjects</span>.</>
                : <> Gradd delivers the full IB curriculum for <span>€44.99/subject/month</span> — or <span>€74.99/month for both subjects</span>.</>}
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="ib-sec ib-fcta">
          <div className="ib-inn">
            <div className="ib-fcta-inn">
              <span className="ib-tag">Get started today</span>
              <div
                className="trustpilot-widget"
                style={{ marginBottom: '32px' }}
                data-locale="en-US"
                data-template-id="56278e9abfbbba0bdcd568bc"
                data-businessunit-id="6a04306a38bea9c74de5e972"
                data-style-height="52px"
                data-style-width="100%"
                data-token="b6521a98-abe3-40ee-9f94-dd5d60cd5ee3"
              >
                <a href="https://www.trustpilot.com/review/gradd.ai" target="_blank" rel="noopener">Trustpilot</a>
              </div>
              <h2 className="ib-h2">Start your first IB lesson right now.</h2>
              <p className="ib-sub">
                Full IB curriculum. Command term technique built in. Progress tracked automatically.
                Available 24/7, wherever you are in the world.
              </p>
              <p style={{ fontSize: '.95rem', color: 'rgba(255,255,255,.6)', marginBottom: '2rem', fontStyle: 'italic', lineHeight: 1.6 }}>
                IB Year 1 starting in September? The students who start now arrive at their first exam with the full curriculum covered.
              </p>
              <Link href="/auth/signup" className="ib-fcta-btn">Start 7-day free trial</Link>
              <p className="ib-fcta-note">Cancel any time before day 7. No charge.</p>
            </div>
          </div>
        </section>

        {/* ── SCROLL TO TOP ── */}
        <button
          className={`ib-scroll-top${showTop ? ' ib-visible' : ''}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Scroll to top"
        >
          ↑
        </button>

        {/* ── FOOTER ── */}
        <footer className="ib-footer">
          <div className="ib-footer-inn">
            <Link href="/"><img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block', maxWidth: 100, filter: 'brightness(0) invert(1)' }} /></Link>
            <ul className="ib-flinks">
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
              <li><a href="mailto:hello@gradd.ai">hello@gradd.ai</a></li>
            </ul>
            <p>© 2026 Gradd.</p>
          </div>
        </footer>

      </div>

      <Script
        src="//widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js"
        strategy="afterInteractive"
      />
    </>
  );
}
