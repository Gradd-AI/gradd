'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

// ── Data ──────────────────────────────────────────────────────

const UNITS = [
  { code: 'Unit 1', title: 'People in Business', desc: 'Stakeholders, consumers, employment law, industrial relations, WRC, and IBEC. The foundation everything else builds on.', sessions: '18–22 sessions' },
  { code: 'Unit 2', title: 'Enterprise', desc: 'Business planning, forms of business ownership, expansion, and government enterprise agencies. ABQ-heavy unit.', sessions: '20–24 sessions' },
  { code: 'Unit 3', title: 'Managing 1 — People & Leadership', desc: 'HRM, motivation theories, leadership styles, management functions, and organisational structure.', sessions: '22–26 sessions' },
  { code: 'Unit 4A', title: 'Managing 2 — Marketing', desc: 'The full marketing mix, market research, branding, pricing strategies, and consumer behaviour.', sessions: '18–22 sessions' },
  { code: 'Unit 4C', title: 'Managing 2 — Finance', desc: 'Accounts, ratio analysis, cash flow, sources of finance, and financial planning. The highest-weight unit in the paper.', sessions: '35–40 sessions' },
  { code: 'Unit 6', title: 'International Business', desc: 'Globalisation, FDI, EU, IDA, Enterprise Ireland, international marketing, and economic integration.', sessions: '18–22 sessions' },
];

const PAIN_CARDS = [
  { icon: '💸', title: 'Grinds cost a fortune', body: "One month of weekly grinds at €50/hour = €200+. That's per subject. Per month. Most homeschool families are paying for multiple subjects." },
  { icon: '📚', title: "Textbooks don't teach", body: "They tell you what's on the syllabus. They don't explain it, check your understanding, or prepare you to write for the marking scheme." },
  { icon: '🗓️', title: 'Homeschool has no structure', body: "No teacher setting the pace. No class to keep up with. No one to notice when something hasn't clicked. You're on your own — until now." },
  { icon: '📝', title: 'The exam has a specific language', body: 'SEC marking schemes reward a particular answer structure. Most students only discover this when they see their results. Gradd builds it in from Session 1.' },
];

const FEATURES = [
  { title: "Teaches, doesn't tell", body: 'Explanations, examples, check questions — every session uses the same four-stage loop that great teachers use.' },
  { title: 'Real Irish examples', body: 'AIB, Ryanair, Penneys, the WRC — the same names your examiner expects to see on the day.' },
  { title: 'Marks your written answers', body: 'Submit your answer. Aoife marks it against the SRP framework, identifies exactly where marks were lost, and shows you how to fix it.' },
  { title: 'Progress tracked automatically', body: 'Every session is logged. Weak areas are flagged and revisited. You always know exactly where you stand.' },
];

const TESTIMONIALS = [
  { initials: 'CM', quote: "We were spending €180 a month on a Business grind teacher. Gradd does more in a week than we were getting in a month — and my daughter actually enjoys it because she can go at her own pace.", name: 'Catherine M.', role: 'Homeschool parent · Co. Galway' },
  { initials: 'JS', quote: "I'm doing the LC as an external candidate with no school support. I couldn't find a grind teacher who'd take me on properly. Gradd is the first thing I've found that actually teaches the full course.", name: 'James S.', role: 'External LC candidate · Dublin' },
  { initials: 'PK', quote: "The SRP structure alone is worth the subscription. My son had no idea how SEC examiners marked answers until Aoife showed him. Three weeks in and he's writing differently already.", name: 'Paul K.', role: 'Homeschool parent · Co. Cork' },
];

const COMPARISON_ROWS: [string, string, string, string, string][] = [
  ['Full curriculum delivery', '✓ if you can afford it', 'Content only', '✗', '✓'],
  ['SEC exam technique built in', 'Varies by teacher', '✗', '✗', '✓'],
  ['Works around your schedule', '✗', '✓', '✓', '✓'],
  ['Answers marked with feedback', '✓', '✗', 'Partial', '✓'],
  ['Progress tracked automatically', '✗', '✗', 'Partial', '✓'],
  ['Monthly cost', '€160–240+', '€30–50 once', '€10–40', '€24.99'],
  ['Built for homeschool students', 'Rarely', '✗', '✗', '✓'],
];

const PRICING_FEATURES = [
  'Full LC Business curriculum — all 6 units, Higher and Ordinary Level',
  '155+ structured AI tutor sessions with Aoife',
  'SRP exam technique and past-paper answer marking',
  'ABQ preparation woven in from Unit 3 onwards',
  'Automatic progress tracking and weak-area targeting',
  'No textbooks, no supplementary materials required',
  'Works on any device — desktop, tablet, phone',
];

// ── Component ─────────────────────────────────────────────────

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        /* ── SCOPED VARS & RESET ── */
        .lp-wrap *, .lp-wrap *::before, .lp-wrap *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lp-wrap {
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
        .lp-nav {
          position: sticky; top: 0; z-index: 100;
          background: rgba(250,248,243,0.96);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border-bottom: 1px solid transparent;
          padding: 0 2rem;
          transition: border-color .2s, box-shadow .2s;
        }
        .lp-nav.lp-scrolled {
          border-bottom-color: var(--ink100);
          box-shadow: 0 1px 12px rgba(0,0,0,.05);
        }
        .lp-nav-inner {
          max-width: 1080px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          height: 64px; gap: 1.5rem;
        }
        .lp-logo {
          font-family: var(--fd); font-size: 1.5rem; font-weight: 700;
          color: var(--g700); text-decoration: none; letter-spacing: -.02em;
          flex-shrink: 0;
        }
        .lp-logo span { color: var(--amber); }
        .lp-nav-links {
          display: flex; align-items: center; gap: 1.75rem;
          list-style: none; margin-left: auto;
        }
        .lp-nav-links a {
          font-size: .9rem; font-weight: 500; color: var(--ink700);
          text-decoration: none; transition: color .2s;
        }
        .lp-nav-links a:hover { color: var(--g700); }
        .lp-nav-login { color: var(--ink500) !important; }
        .lp-nav-cta {
          background: var(--g700); color: var(--white) !important;
          padding: .5rem 1.2rem; border-radius: 6px;
          font-weight: 600 !important; transition: background .2s !important;
        }
        .lp-nav-cta:hover { background: var(--g600) !important; }

        /* ── SECTION SHARED ── */
        .lp-sec { padding: 5rem 2rem; }
        .lp-inn { max-width: 1080px; margin: 0 auto; }
        .lp-tag {
          display: inline-block; font-size: .75rem; font-weight: 600;
          letter-spacing: .1em; text-transform: uppercase;
          color: var(--g600); margin-bottom: .85rem;
        }
        .lp-h2 {
          font-family: var(--fd);
          font-size: clamp(1.8rem, 3.5vw, 2.6rem);
          font-weight: 700; color: var(--ink900);
          line-height: 1.18; letter-spacing: -.025em;
          margin-bottom: 1.25rem;
        }
        .lp-h2 em { font-style: italic; color: var(--g600); }
        .lp-sub {
          font-size: 1.05rem; color: var(--ink500);
          max-width: 560px; line-height: 1.65;
        }

        /* ── HERO ── */
        .lp-hero {
          background: var(--g800); position: relative;
          overflow: hidden; padding: 7rem 2rem 6rem;
        }
        .lp-hero::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 60% at 60% 50%, rgba(58,138,72,.18) 0%, transparent 70%);
          pointer-events: none;
        }
        .lp-hero-inn {
          max-width: 780px; margin: 0 auto;
          text-align: center; position: relative; z-index: 1;
        }
        .lp-badge {
          display: inline-flex; align-items: center; gap: .5rem;
          background: rgba(126,200,164,.14);
          border: 1px solid rgba(126,200,164,.32);
          color: var(--mint); font-size: .8rem; font-weight: 600;
          letter-spacing: .06em; text-transform: uppercase;
          padding: .4rem 1rem; border-radius: 100px; margin-bottom: 2rem;
        }
        .lp-badge-dot {
          width: 7px; height: 7px;
          background: var(--mint); border-radius: 50%;
          box-shadow: 0 0 0 2px rgba(126,200,164,.3);
          animation: lp-pulse 2.2s ease-in-out infinite;
        }
        @keyframes lp-pulse {
          0%,100% { box-shadow: 0 0 0 2px rgba(126,200,164,.3); }
          50%      { box-shadow: 0 0 0 6px rgba(126,200,164,.08); }
        }
        .lp-h1 {
          font-family: var(--fd);
          font-size: clamp(2.4rem, 5.5vw, 3.8rem);
          font-weight: 700; color: var(--white);
          line-height: 1.12; letter-spacing: -.03em;
          margin-bottom: 1.5rem;
        }
        .lp-h1 em { font-style: italic; color: var(--g200); }
        .lp-hero-sub {
          font-size: 1.15rem; color: rgba(255,255,255,.7);
          max-width: 580px; margin: 0 auto 2.5rem; line-height: 1.6;
        }
        .lp-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: .75rem; }
        .lp-btn-a {
          display: inline-block; background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-weight: 700; font-size: 1rem;
          padding: .9rem 2rem; border-radius: 8px; text-decoration: none;
          transition: background .2s, transform .15s;
        }
        .lp-btn-a:hover { background: var(--amber-lt); transform: translateY(-1px); }
        .lp-btn-b {
          display: inline-block; background: transparent;
          border: 1px solid rgba(255,255,255,.28); color: rgba(255,255,255,.85);
          font-family: var(--fb); font-weight: 500; font-size: 1rem;
          padding: .9rem 2rem; border-radius: 8px; text-decoration: none;
          transition: border-color .2s, color .2s;
        }
        .lp-btn-b:hover { border-color: rgba(255,255,255,.6); color: var(--white); }
        .lp-hero-note { font-size: .82rem; color: rgba(255,255,255,.35); margin-top: .5rem; }
        .lp-stats {
          display: flex; gap: 2.5rem; justify-content: center; flex-wrap: wrap;
          margin-top: 4rem; padding-top: 3rem;
          border-top: 1px solid rgba(255,255,255,.1);
        }
        .lp-stat { text-align: center; }
        .lp-stat-n {
          font-family: var(--fd); font-size: 2rem; font-weight: 700;
          color: var(--white); line-height: 1; display: block;
        }
        .lp-stat-l { font-size: .82rem; color: rgba(255,255,255,.45); margin-top: .3rem; letter-spacing: .02em; }

        /* ── PROBLEM ── */
        .lp-prob { background: var(--white); }
        .lp-prob-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 3rem; align-items: start; margin-top: 3.5rem;
        }
        .lp-prob-text p { color: var(--ink500); font-size: 1rem; line-height: 1.7; margin-bottom: 1.25rem; }
        .lp-pain-cards { display: flex; flex-direction: column; gap: 1rem; }
        .lp-pain {
          background: var(--cream); border: 1px solid var(--ink100);
          border-radius: 10px; padding: 1.25rem 1.5rem;
          display: flex; gap: 1rem; align-items: flex-start;
        }
        .lp-pain-ico {
          width: 36px; height: 36px; border-radius: 8px;
          background: #fee2e2; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0; font-size: 1rem;
        }
        .lp-pain h4 { font-size: .95rem; font-weight: 600; color: var(--ink900); margin-bottom: .25rem; }
        .lp-pain p  { font-size: .88rem; color: var(--ink500); line-height: 1.5; }

        /* ── SOLUTION ── */
        .lp-sol { background: var(--cream); }
        .lp-sol-grid {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 1.5rem; margin-top: 3.5rem;
        }
        .lp-sol-card {
          background: var(--white); border: 1px solid var(--ink100);
          border-radius: 12px; padding: 2rem 1.75rem;
          transition: border-color .2s, transform .2s;
        }
        .lp-sol-card:hover { border-color: var(--g400); transform: translateY(-2px); }
        .lp-sol-card.lp-feat { border-color: var(--g500); background: var(--g50); }
        .lp-sol-num {
          font-family: var(--fd); font-size: .75rem; font-weight: 700;
          color: var(--g500); letter-spacing: .08em; text-transform: uppercase; margin-bottom: .75rem;
        }
        .lp-sol-card h3 {
          font-family: var(--fd); font-size: 1.2rem; font-weight: 600;
          color: var(--ink900); margin-bottom: .75rem; line-height: 1.3;
        }
        .lp-sol-card p { font-size: .92rem; color: var(--ink500); line-height: 1.65; }

        /* ── HOW IT WORKS ── */
        .lp-how { background: var(--g800); }
        .lp-how .lp-tag  { color: var(--g200); }
        .lp-how .lp-h2   { color: var(--white); }
        .lp-how .lp-h2 em{ color: var(--g200); }
        .lp-how .lp-sub  { color: rgba(255,255,255,.58); }
        .lp-steps {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: 2rem; margin-top: 3.5rem; position: relative;
        }
        .lp-steps::before {
          content: ''; position: absolute;
          top: 1.2rem; left: calc(16.66% + 1rem);
          width: calc(66.66% - 2rem); height: 1px;
          background: rgba(255,255,255,.1);
        }
        .lp-step { text-align: center; }
        .lp-step-dot {
          width: 40px; height: 40px; border-radius: 50%;
          background: rgba(255,255,255,.08);
          border: 1px solid rgba(255,255,255,.2);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--fd); font-size: 1rem; font-weight: 700;
          color: var(--white); margin: 0 auto 1.5rem; position: relative; z-index: 1;
        }
        .lp-step h3 {
          font-family: var(--fd); font-size: 1.15rem; font-weight: 600;
          color: var(--white); margin-bottom: .6rem; line-height: 1.3;
        }
        .lp-step p { font-size: .9rem; color: rgba(255,255,255,.55); line-height: 1.65; }

        /* ── CURRICULUM ── */
        .lp-curr { background: var(--cream-dk); }
        .lp-units {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1rem; margin-top: 3rem;
        }
        .lp-unit {
          background: var(--white); border: 1px solid var(--ink100);
          border-radius: 10px; padding: 1.5rem;
          border-left: 3px solid var(--g500);
        }
        .lp-unit-code {
          font-size: .72rem; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--g600); margin-bottom: .4rem;
        }
        .lp-unit h4 { font-size: 1rem; font-weight: 600; color: var(--ink900); margin-bottom: .4rem; line-height: 1.3; }
        .lp-unit p  { font-size: .83rem; color: var(--ink500); line-height: 1.55; }
        .lp-unit-sess { margin-top: .75rem; font-size: .75rem; color: var(--ink300); font-weight: 500; }

        /* ── TUTOR PREVIEW ── */
        .lp-tutor { background: var(--white); }
        .lp-tutor-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 4rem; align-items: center;
        }
        .lp-chat {
          background: var(--cream); border: 1px solid var(--ink100);
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 8px 48px rgba(0,0,0,.08);
        }
        .lp-chat-hd {
          background: var(--g700); padding: 1rem 1.25rem;
          display: flex; align-items: center; gap: .75rem;
        }
        .lp-chat-av {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--g600); display: flex; align-items: center;
          justify-content: center; font-family: var(--fd);
          font-size: .85rem; font-weight: 700; color: var(--white); flex-shrink: 0;
        }
        .lp-chat-hd h4 { font-size: .9rem; font-weight: 600; color: var(--white); }
        .lp-chat-hd p  { font-size: .75rem; color: rgba(255,255,255,.5); }
        .lp-chat-body  { padding: 1.5rem 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
        .lp-msg {
          max-width: 88%; padding: .75rem 1rem; border-radius: 12px;
          font-size: .87rem; line-height: 1.55;
        }
        .lp-msg.lp-aoife {
          background: var(--white); border: 1px solid var(--ink100);
          color: var(--ink700); align-self: flex-start; border-bottom-left-radius: 3px;
        }
        .lp-msg.lp-stu {
          background: var(--g700); color: var(--white);
          align-self: flex-end; border-bottom-right-radius: 3px;
        }
        .lp-tfeats { list-style: none; display: flex; flex-direction: column; gap: 1.25rem; margin-top: 2rem; }
        .lp-tfeat  { display: flex; gap: .75rem; align-items: flex-start; }
        .lp-fcheck {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--g50); border: 1px solid var(--g200);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; margin-top: .1rem;
        }
        .lp-tfeat h4 { font-size: .95rem; font-weight: 600; color: var(--ink900); margin-bottom: .15rem; }
        .lp-tfeat p  { font-size: .85rem; color: var(--ink500); line-height: 1.5; }

        /* ── TESTIMONIALS ── */
        .lp-social { background: var(--cream); }
        .lp-tgrid {
          display: grid; grid-template-columns: repeat(3,1fr);
          gap: 1.5rem; margin-top: 3rem;
        }
        .lp-tcard {
          background: var(--white); border: 1px solid var(--ink100);
          border-radius: 12px; padding: 1.75rem; position: relative;
        }
        .lp-qmark {
          font-family: var(--fd); font-size: 3.5rem; color: var(--g100);
          line-height: 1; position: absolute; top: 1rem; right: 1.5rem;
        }
        .lp-ttext {
          font-family: var(--fd); font-size: .95rem; color: var(--ink700);
          line-height: 1.65; font-style: italic; margin-bottom: 1.25rem;
        }
        .lp-tauth { display: flex; align-items: center; gap: .75rem; }
        .lp-tav {
          width: 38px; height: 38px; border-radius: 50%;
          background: var(--g100); display: flex; align-items: center;
          justify-content: center; font-size: .8rem; font-weight: 700;
          color: var(--g600); flex-shrink: 0;
        }
        .lp-tname { font-size: .88rem; font-weight: 600; color: var(--ink900); }
        .lp-trole { font-size: .78rem; color: var(--ink300); }
        .lp-proof-note { text-align: center; margin-top: 2rem; font-size: .82rem; color: var(--ink300); }

        /* ── COMPARISON ── */
        .lp-vs { background: var(--white); }
        .lp-twrap { overflow-x: auto; margin-top: 3rem; }
        .lp-ctable {
          width: 100%; border-collapse: collapse;
          font-size: .95rem; min-width: 640px;
        }
        .lp-ctable thead th {
          padding: 1rem 1.5rem; text-align: left;
          font-size: .8rem; font-weight: 600; letter-spacing: .06em;
          text-transform: uppercase; color: var(--ink300);
          border-bottom: 1px solid var(--ink100);
        }
        .lp-ctable thead th.lp-hl {
          background: var(--g50); color: var(--g600);
          border-radius: 8px 8px 0 0;
          border: 1px solid var(--g200); border-bottom: none;
        }
        .lp-ctable tbody td {
          padding: 1rem 1.5rem; border-bottom: 1px solid var(--ink100);
          color: var(--ink700); vertical-align: middle;
        }
        .lp-ctable tbody td.lp-hl {
          background: var(--g50); color: var(--g700);
          border-left: 1px solid var(--g200); border-right: 1px solid var(--g200);
          font-weight: 500;
        }
        .lp-ctable tbody td.lp-hl.lp-last {
          border-bottom: 1px solid var(--g200); border-radius: 0 0 8px 8px;
        }
        .lp-ctable .lp-rl { font-weight: 500; color: var(--ink900); }
        .lp-yes { color: var(--g600); }
        .lp-noo { color: #d1d5db; }

        /* ── PRICING ── */
        .lp-price-sec { background: var(--g800); }
        .lp-price-sec .lp-tag  { color: var(--g200); }
        .lp-price-sec .lp-h2   { color: var(--white); }
        .lp-price-sec .lp-sub  { color: rgba(255,255,255,.58); }
        .lp-price-wrap { display: flex; justify-content: center; margin-top: 3.5rem; }
        .lp-pcard {
          background: var(--white); border-radius: 20px;
          padding: 2.5rem 3rem; max-width: 520px; width: 100%; position: relative;
        }
        .lp-pbadge {
          position: absolute; top: -14px; left: 50%; transform: translateX(-50%);
          background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-size: .75rem; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase;
          padding: .35rem 1rem; border-radius: 100px; white-space: nowrap;
        }
        .lp-prdisp { display: flex; align-items: flex-start; gap: .25rem; margin-bottom: .5rem; }
        .lp-pr-curr { font-family: var(--fd); font-size: 1.5rem; font-weight: 700; color: var(--ink900); margin-top: .6rem; }
        .lp-pr-amt  { font-family: var(--fd); font-size: 4rem; font-weight: 700; color: var(--ink900); line-height: 1; }
        .lp-pr-per  { font-size: .9rem; color: var(--ink500); align-self: flex-end; margin-bottom: .4rem; }
        .lp-pfeats {
          list-style: none; display: flex; flex-direction: column; gap: .85rem;
          margin-bottom: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--ink100);
        }
        .lp-pfeats li { display: flex; align-items: flex-start; gap: .75rem; font-size: .95rem; color: var(--ink700); text-align: left; }
        .lp-pcheck {
          width: 20px; height: 20px; background: var(--g100);
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .lp-btn-sub {
          display: block; width: 100%; text-align: center;
          background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-weight: 700; font-size: 1rem;
          padding: .95rem; border-radius: 10px; text-decoration: none;
          transition: background .2s;
        }
        .lp-btn-sub:hover { background: var(--amber-lt); }
        .lp-pguarantee { text-align: center; font-size: .82rem; color: var(--ink300); margin-top: 1.25rem; }
        .lp-pcmp {
          text-align: center; margin-top: 2.5rem;
          font-size: .9rem; color: rgba(255,255,255,.38);
        }
        .lp-pcmp span { color: rgba(255,255,255,.68); font-weight: 500; }

        /* ── FINAL CTA ── */
        .lp-fcta { background: var(--g900); text-align: center; }
        .lp-fcta-inn { max-width: 600px; margin: 0 auto; }
        .lp-fcta .lp-tag { color: var(--g200); }
        .lp-fcta .lp-h2  { color: var(--white); }
        .lp-fcta .lp-sub { color: rgba(255,255,255,.52); margin: 0 auto 2.5rem; text-align: center; max-width: none; }
        .lp-fcta-btn {
          display: inline-block; background: var(--amber); color: var(--ink900);
          font-family: var(--fb); font-weight: 700; font-size: 1.05rem;
          padding: 1rem 2.5rem; border-radius: 8px; text-decoration: none;
          transition: background .2s, transform .15s;
        }
        .lp-fcta-btn:hover { background: var(--amber-lt); transform: translateY(-1px); }
        .lp-fcta-note { font-size: .82rem; color: rgba(255,255,255,.28); margin-top: 1rem; }

        /* ── FOOTER ── */
        .lp-footer {
          background: var(--ink900); padding: 3rem 2rem;
          color: rgba(255,255,255,.4); font-size: .85rem;
        }
        .lp-footer-inn {
          max-width: 1080px; margin: 0 auto;
          display: flex; justify-content: space-between;
          align-items: center; flex-wrap: wrap; gap: 1rem;
        }
        .lp-flogo {
          font-family: var(--fd); font-size: 1.3rem; font-weight: 700;
          color: var(--white); text-decoration: none;
        }
        .lp-flogo span { color: var(--amber-200); }
        .lp-flinks { display: flex; gap: 1.5rem; list-style: none; flex-wrap: wrap; }
        .lp-flinks a { color: rgba(255,255,255,.4); text-decoration: none; transition: color .2s; }
        .lp-flinks a:hover { color: rgba(255,255,255,.75); }

        /* ── RESPONSIVE ── */
        @media (max-width: 780px) {
          .lp-prob-grid, .lp-tutor-grid { grid-template-columns: 1fr; gap: 2rem; }
          .lp-sol-grid, .lp-steps, .lp-units, .lp-tgrid { grid-template-columns: 1fr 1fr; }
          .lp-steps::before { display: none; }
          .lp-pcard { padding: 2rem 1.5rem; }
          .lp-stats { gap: 1.5rem; }
        }
        @media (max-width: 520px) {
          .lp-sol-grid, .lp-steps, .lp-units, .lp-tgrid { grid-template-columns: 1fr; }
          .lp-nav-links { display: none; }
          .lp-h1 { font-size: 2rem; }
          .lp-hero { padding: 4rem 1.5rem 4rem; }
        }
      `}</style>

      <div className="lp-wrap">

        {/* ── NAVIGATION ── */}
        <nav className={`lp-nav${scrolled ? ' lp-scrolled' : ''}`}>
          <div className="lp-nav-inner">
            <Link href="/" className="lp-logo" style={{ display: 'flex', alignItems: 'center' }}>
              <img src="/gradd-logo.svg" alt="Gradd" height="30" style={{ display: 'block' }} />
            </Link>
            <ul className="lp-nav-links">
              <li><a href="#how-it-works">How it works</a></li>
              <li><a href="#curriculum">Curriculum</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><Link href="/auth/login" className="lp-nav-login">Log in</Link></li>
              <li><Link href="/subscribe" className="lp-nav-cta">Start learning</Link></li>
            </ul>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-hero-inn">
            <div className="lp-badge">
              <span className="lp-badge-dot" />
              Live now · LC Business
            </div>
            <h1 className="lp-h1">
              The LC Business tutor<br />your student actually <em>needs</em>
            </h1>
            <p className="lp-hero-sub">
              Full curriculum. From Unit 1 to exam day. No textbook, no teacher, no grinds required.
              Gradd's AI tutor knows the SEC syllabus inside out — and works around your homeschool schedule.
            </p>
            <div className="lp-ctas">
              <Link href="/subscribe" className="lp-btn-a">Start learning — €24.99/month</Link>
              <a href="#how-it-works" className="lp-btn-b">See how it works</a>
            </div>
            <p className="lp-hero-note">7-day money-back guarantee. Cancel any time.</p>
            <div className="lp-stats">
              <div className="lp-stat"><span className="lp-stat-n">155+</span><span className="lp-stat-l">structured AI sessions</span></div>
              <div className="lp-stat"><span className="lp-stat-n">6</span><span className="lp-stat-l">full syllabus units</span></div>
              <div className="lp-stat"><span className="lp-stat-n">€24.99</span><span className="lp-stat-l">per month, all in</span></div>
              <div className="lp-stat"><span className="lp-stat-n">€0</span><span className="lp-stat-l">textbooks needed</span></div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM ── */}
        <section className="lp-sec lp-prob" id="problem">
          <div className="lp-inn">
            <div className="lp-prob-grid">
              <div className="lp-prob-text">
                <span className="lp-tag">The problem</span>
                <h2 className="lp-h2">LC Business is <em>doable</em>. The current options aren't.</h2>
                <p>Every year, thousands of Irish students sit LC Business. Most of them are paying €40–60 an hour for grind teachers. Homeschool students are starting from scratch with a textbook that reads like a regulatory filing.</p>
                <p>The structured knowledge is out there. The problem is accessing it — clearly, sequentially, at a pace that fits your life — without spending a fortune.</p>
                <p>That's what Gradd fixes. Not a quiz app. Not a document library. An actual tutor, teaching the actual course, from the actual start.</p>
              </div>
              <div className="lp-pain-cards">
                {PAIN_CARDS.map(c => (
                  <div key={c.title} className="lp-pain">
                    <div className="lp-pain-ico">{c.icon}</div>
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
        <section className="lp-sec lp-sol" id="solution">
          <div className="lp-inn">
            <span className="lp-tag">The solution</span>
            <h2 className="lp-h2">One subscription. The whole course.</h2>
            <p className="lp-sub">Gradd delivers the full LC Business curriculum through a conversational AI tutor who knows the SEC syllabus, marks your answers, and never lets you move on until you're ready.</p>
            <div className="lp-sol-grid">
              <div className="lp-sol-card">
                <div className="lp-sol-num">01</div>
                <h3>Not a chatbot. A structured tutor.</h3>
                <p>Gradd's AI tutor — Aoife — teaches in a specific sequence. Unit 1 first, then 2, then 3. You don't unlock Unit 4 until the checkpoints are passed. Curriculum first, chat second.</p>
              </div>
              <div className="lp-sol-card lp-feat">
                <div className="lp-sol-num">02</div>
                <h3>Exam technique from day one.</h3>
                <p>Every answer Aoife models uses the SRP structure (State → Relevance → Point) that SEC markers reward. Students see marking-scheme language from their very first session — not the week before the exam.</p>
              </div>
              <div className="lp-sol-card">
                <div className="lp-sol-num">03</div>
                <h3>Replaces grinds. Completely.</h3>
                <p>One month of Gradd costs less than a single grind session. It delivers more curriculum hours, more exam practice, and more progress tracking than any weekly grind teacher can offer.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="lp-sec lp-how" id="how-it-works">
          <div className="lp-inn">
            <span className="lp-tag">How it works</span>
            <h2 className="lp-h2">Start at zero. Finish <em>exam-ready</em>.</h2>
            <p className="lp-sub">No prior Business knowledge needed. Gradd takes students from scratch through all six units to full exam readiness.</p>
            <div className="lp-steps">
              <div className="lp-step">
                <div className="lp-step-dot">1</div>
                <h3>Start where you are</h3>
                <p>Create your account, pick your level (Higher or Ordinary), and Aoife opens Unit 1. No placement test. No setup. You just start.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-dot">2</div>
                <h3>Learn with Aoife</h3>
                <p>Each session runs 25–35 minutes. Aoife explains concepts, uses real Irish examples you'll recognise, asks check questions, and only moves forward when you've got it.</p>
              </div>
              <div className="lp-step">
                <div className="lp-step-dot">3</div>
                <h3>Build exam confidence</h3>
                <p>From mid-curriculum, Aoife drills past-paper questions, marks your answers against the SEC scheme, and targets the exact areas you're weakest on before exam day.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CURRICULUM ── */}
        <section className="lp-sec lp-curr" id="curriculum">
          <div className="lp-inn">
            <span className="lp-tag">Full syllabus coverage</span>
            <h2 className="lp-h2">All six units. Nothing left out.</h2>
            <p className="lp-sub">The complete SEC Leaving Certificate Business syllabus — Higher and Ordinary Level. 155+ structured AI sessions across 10–12 months at 4 sessions per week.</p>
            <div className="lp-units">
              {UNITS.map(u => (
                <div key={u.code} className="lp-unit">
                  <div className="lp-unit-code">{u.code}</div>
                  <h4>{u.title}</h4>
                  <p>{u.desc}</p>
                  <div className="lp-unit-sess">{u.sessions}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TUTOR PREVIEW ── */}
        <section className="lp-sec lp-tutor" id="tutor">
          <div className="lp-inn">
            <div className="lp-tutor-grid">
              <div>
                <span className="lp-tag">Meet your tutor</span>
                <h2 className="lp-h2">Aoife knows every line of the SEC syllabus.</h2>
                <p className="lp-sub">She teaches in plain English, uses Irish companies as examples, and never lets you move on until a concept is properly understood. She marks your answers the way an SEC examiner would.</p>
                <ul className="lp-tfeats">
                  {FEATURES.map(f => (
                    <li key={f.title} className="lp-tfeat">
                      <div className="lp-fcheck">
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
              <div className="lp-chat">
                <div className="lp-chat-hd">
                  <div className="lp-chat-av">A</div>
                  <div>
                    <h4>Aoife</h4>
                    <p>Session in progress · Unit 3 · Managing People</p>
                  </div>
                </div>
                <div className="lp-chat-body">
                  <div className="lp-msg lp-aoife">
                    Right, Niamh — before we get into Herzberg, tell me: what's the difference between a financial and a non-financial reward? Don't look it up — just tell me what you remember.
                  </div>
                  <div className="lp-msg lp-stu">
                    Financial is like wages and bonuses. Non-financial is… stuff like promotions or flexible hours?
                  </div>
                  <div className="lp-msg lp-aoife">
                    Exactly right — you've already given me two strong exam examples. Financial rewards are monetary: wages, salary, bonuses, profit-sharing. Non-financial are non-monetary: promotion, job enrichment, flexible working, recognition.
                    <br /><br />
                    Now here's where Herzberg fits in. His two-factor theory splits those into hygiene factors and motivators. Which do you think financial rewards fall into?
                  </div>
                  <div className="lp-msg lp-stu">Motivators?</div>
                  <div className="lp-msg lp-aoife">
                    Close — but this is the trick Herzberg plays on everyone. Financial rewards like salary are actually <strong>hygiene factors</strong>, not motivators. They prevent dissatisfaction when they're fair — but they don't actively motivate. That's the core of his theory. Let me show you how this appears on a Section 3 question…
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="lp-sec lp-social" id="testimonials">
          <div className="lp-inn">
            <span className="lp-tag">Early feedback</span>
            <h2 className="lp-h2">What families are saying</h2>
            <p className="lp-sub">Reactions from parents and students in our early testing community.</p>
            <div className="lp-tgrid">
              {TESTIMONIALS.map(t => (
                <div key={t.initials} className="lp-tcard">
                  <div className="lp-qmark">"</div>
                  <p className="lp-ttext">{t.quote}</p>
                  <div className="lp-tauth">
                    <div className="lp-tav">{t.initials}</div>
                    <div>
                      <div className="lp-tname">{t.name}</div>
                      <div className="lp-trole">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p className="lp-proof-note">* Testimonials collected during pre-launch testing. Individual results depend on time committed and starting level.</p>
          </div>
        </section>

        {/* ── COMPARISON ── */}
        <section className="lp-sec lp-vs" id="compare">
          <div className="lp-inn">
            <span className="lp-tag">How we compare</span>
            <h2 className="lp-h2">Gradd vs. everything else</h2>
            <p className="lp-sub">One honest comparison. Judge for yourself.</p>
            <div className="lp-twrap">
              <table className="lp-ctable">
                <thead>
                  <tr>
                    <th></th>
                    <th>Grind teacher</th>
                    <th>Textbook</th>
                    <th>Other AI apps</th>
                    <th className="lp-hl">Gradd</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map(([label, grind, book, other, gradd], i) => (
                    <tr key={label}>
                      <td className="lp-rl">{label}</td>
                      <td className={grind === '✗' ? 'lp-noo' : ''}>{grind}</td>
                      <td className={book  === '✗' ? 'lp-noo' : ''}>{book}</td>
                      <td className={other === '✗' ? 'lp-noo' : ''}>{other}</td>
                      <td
                        className={`lp-hl${i === COMPARISON_ROWS.length - 1 ? ' lp-last' : ''}${gradd === '✓' ? ' lp-yes' : ''}`}
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
        <section className="lp-sec lp-price-sec" id="pricing">
          <div className="lp-inn" style={{ textAlign: 'center' }}>
            <span className="lp-tag">Pricing</span>
            <h2 className="lp-h2">One plan. Everything included.</h2>
            <p className="lp-sub" style={{ margin: '0 auto' }}>No tiers, no add-ons. One flat subscription covers the complete LC Business curriculum.</p>
            <div className="lp-price-wrap">
              <div className="lp-pcard">
                <div className="lp-pbadge">7-day money-back guarantee</div>
                <div className="lp-prdisp">
                  <span className="lp-pr-curr">€</span>
                  <span className="lp-pr-amt">24.99</span>
                  <span className="lp-pr-per">/ month</span>
                </div>
                <p style={{ fontSize: '.88rem', color: 'var(--g600)', fontWeight: 500, marginBottom: '.75rem' }}>
                  Or €199/year — save two months
                </p>
                <p style={{ fontSize: '.95rem', color: 'var(--ink500)', marginBottom: '2rem', textAlign: 'left' }}>
                  Less than one grind session. Covers the full SEC Business syllabus. Cancel any time — no questions, no penalties.
                </p>
                <ul className="lp-pfeats">
                  {PRICING_FEATURES.map(f => (
                    <li key={f}>
                      <div className="lp-pcheck">
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                          <path d="M1 4L4 7L10 1" stroke="#2e6e39" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/subscribe" className="lp-btn-sub">Subscribe now — €24.99/month</Link>
                <p className="lp-pguarantee">
                  7-day money-back guarantee. Cancel any time.{' '}
                  <Link href="/terms" style={{ color: 'var(--ink300)', textDecoration: 'underline' }}>Terms</Link>
                  {' '}·{' '}
                  <Link href="/privacy" style={{ color: 'var(--ink300)', textDecoration: 'underline' }}>Privacy</Link>
                </p>
              </div>
            </div>
            <p className="lp-pcmp">
              Compare: one weekly grind session = <span>€200+/month</span>.
              Gradd = <span>€24.99/month</span> — or <span>€199/year</span>. Full curriculum. Any time. Any pace.
            </p>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="lp-sec lp-fcta">
          <div className="lp-inn">
            <div className="lp-fcta-inn">
              <span className="lp-tag">Get started today</span>
              <h2 className="lp-h2">Ready to replace the grind teacher?</h2>
              <p className="lp-sub">
                Full LC Business curriculum, exam technique built in, progress tracked automatically.
                Start learning today for €24.99/month — less than one grind session.
              </p>
              <Link href="/subscribe" className="lp-fcta-btn">Start learning — €24.99/month</Link>
              <p className="lp-fcta-note">7-day money-back guarantee. Cancel any time. No lock-in.</p>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <div className="lp-footer-inn">
            <Link href="/" className="lp-flogo">
              <img src="/gradd-logo.svg" alt="Gradd" height="26" style={{ display: 'block', filter: 'brightness(0) invert(1)' }} />
            </Link>
            <ul className="lp-flinks">
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
              <li><Link href="/cookies">Cookies</Link></li>
              <li><a href="mailto:hello@gradd.ie">hello@gradd.ie</a></li>
            </ul>
            <p>© 2025 Gradd. Irish-built, Irish-focused.</p>
          </div>
        </footer>

      </div>
    </>
  );
}
