'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CSS as DASH_CSS } from '@/components/dashboard/IBDashboardClient';

// ─── Fake demo data ───────────────────────────────────────────────────────────

const STUDENT = 'Louise';
const SUBJECT_LABEL = 'IB Economics';
const EXAM_LEVEL = 'SL';
const SESSION_NUMBER = 7;
const CURRICULUM_PCT = 34;
const TOTAL_COMPLETED = 49;
const TOTAL_LESSONS = 147;
const STREAK = 4;
const EXAM_DAYS = 312;
const THIS_WEEK = 2;
const TOTAL_SESSIONS = 7;
const WEAK_COUNT = 1;
const CURRENT_LESSON = 'Demand — shifts and determinants';
const CURRENT_UNIT = 'Microeconomics';

// Fake sessions — 4 consecutive days for streak
const FAKE_SESSIONS = [0, 1, 2, 3].map(d => ({
  id: String(d),
  session_number: 7 - d,
  session_type: 'NEW_TOPIC' as const,
  lesson_code: ['2.3', '2.2', '2.1', '1.4'][d],
  started_at: new Date(Date.now() - d * 86400000).toISOString(),
  ended_at:   new Date(Date.now() - d * 86400000 + 3600000).toISOString(),
  weak_flags_count: d === 1 ? 2 : 0,
}));

const LAST_SESSION = {
  id: '1', session_number: 6, session_type: 'NEW_TOPIC',
  lesson_code: '2.2', lesson_name: 'Elasticity of Demand',
  concepts_covered: ['Price elasticity of demand', 'Cross-price elasticity'],
  weak_flags_count: 2,
  started_at: new Date(Date.now() - 86400000).toISOString(),
  apply_scores: null,
};

const WEAK_AREAS = [
  {
    id: '1', concept_slug: 'ped-diagram-reading',
    error_description: 'Reading PED values from a price–demand diagram',
    lesson_code: '2.2', occurrence_count: 2,
  },
];

const UNITS = [
  { code: 'UNIT_1', name: 'Introduction to Economics' },
  { code: 'UNIT_2', name: 'Microeconomics' },
  { code: 'UNIT_3', name: 'Macroeconomics' },
  { code: 'UNIT_4', name: 'The Global Economy' },
];

// ─── Demo course picker — static IB Econ + BM data ───────────────────────────
type DemoLesson   = { code: string; name: string; status: 'done' | 'current' | 'todo'; weak?: true };
type DemoTopic    = { code: string; name: string; done: number; total: number; lessons: DemoLesson[] };
type DemoUnit     = { code: string; name: string; done: number; total: number; topics: DemoTopic[] };
type PickerSubject = 'IB_ECONOMICS' | 'IB_BUSINESS';

// Econ: 8 + 120 + 52 + 30 = 210 lessons (HL + SL combined)
const PICKER_DATA_ECON: DemoUnit[] = [
  {
    code: 'UNIT_1', name: 'Introduction to Economics', done: 8, total: 8,
    topics: [
      { code: '1.1', name: 'Scope of economics', done: 3, total: 3, lessons: [
        { code: 'p_1_1_1', name: 'What is economics?', status: 'done' },
        { code: 'p_1_1_2', name: 'Scarcity, choice and opportunity cost', status: 'done' },
        { code: 'p_1_1_3', name: 'Free goods and economic goods', status: 'done' },
      ]},
      { code: '1.2', name: 'How economists approach the world', done: 2, total: 2, lessons: [
        { code: 'p_1_2_1', name: 'Positive and normative economics', status: 'done' },
        { code: 'p_1_2_2', name: 'Economic models and assumptions', status: 'done' },
      ]},
      { code: '1.3', name: 'The economic problem', done: 3, total: 3, lessons: [
        { code: 'p_1_3_1', name: 'Factors of production', status: 'done' },
        { code: 'p_1_3_2', name: 'Production possibility curves', status: 'done' },
        { code: 'p_1_3_3', name: 'PPC and opportunity cost', status: 'done' },
      ]},
    ],
  },
  {
    code: 'UNIT_2', name: 'Microeconomics', done: 41, total: 120,
    topics: [
      { code: '2.1', name: 'Demand', done: 5, total: 5, lessons: [
        { code: 'p_2_1_1', name: 'The law of demand', status: 'done' },
        { code: 'p_2_1_2', name: 'The demand curve', status: 'done' },
        { code: 'p_2_1_3', name: 'Shifts in demand', status: 'done' },
        { code: 'p_2_1_4', name: 'Non-price determinants of demand', status: 'done' },
        { code: 'p_2_1_5', name: 'Consumer surplus', status: 'done' },
      ]},
      { code: '2.2', name: 'Supply', done: 4, total: 4, lessons: [
        { code: 'p_2_2_1', name: 'The law of supply', status: 'done' },
        { code: 'p_2_2_2', name: 'The supply curve', status: 'done' },
        { code: 'p_2_2_3', name: 'Shifts in supply', status: 'done' },
        { code: 'p_2_2_4', name: 'Producer surplus', status: 'done' },
      ]},
      { code: '2.3', name: 'Competitive market equilibrium', done: 2, total: 6, lessons: [
        { code: 'p_2_3_1', name: 'Market equilibrium — price and quantity', status: 'done' },
        { code: 'p_2_3_2', name: 'Changes in equilibrium', status: 'done' },
        { code: 'p_2_3_3', name: 'Demand — shifts and determinants', status: 'current' },
        { code: 'p_2_3_4', name: 'Surplus and shortage', status: 'todo' },
        { code: 'p_2_3_5', name: 'Price signals and resource allocation', status: 'todo' },
        { code: 'p_2_3_6', name: 'Effects of simultaneous shifts', status: 'todo' },
      ]},
      { code: '2.4', name: 'Critique of the maximizing assumption', done: 0, total: 4, lessons: [] },
      { code: '2.5', name: 'Theory of the firm and market structures', done: 0, total: 40, lessons: [] },
      { code: '2.6', name: 'Price elasticity of demand', done: 0, total: 12, lessons: [
        { code: 'p_2_6_1', name: 'PED — concept and formula', status: 'todo', weak: true },
        { code: 'p_2_6_2', name: 'PED diagrams and interpreting values', status: 'todo' },
      ]},
      { code: '2.7', name: 'Income elasticity of demand', done: 0, total: 4, lessons: [] },
      { code: '2.8', name: 'Cross-price elasticity of demand', done: 0, total: 3, lessons: [] },
      { code: '2.9', name: 'Price elasticity of supply', done: 0, total: 5, lessons: [] },
      { code: '2.10', name: 'Role of government in markets', done: 0, total: 12, lessons: [] },
      { code: '2.11', name: 'Market failure — externalities', done: 0, total: 10, lessons: [] },
      { code: '2.12', name: 'Market failure — public goods', done: 0, total: 9, lessons: [] },
      { code: '2.13', name: 'Market failure — asymmetric information', done: 0, total: 3, lessons: [] },
      { code: '2.14', name: 'Market failure — common pool resources', done: 0, total: 3, lessons: [] },
    ],
  },
  {
    code: 'UNIT_3', name: 'Macroeconomics', done: 0, total: 52,
    topics: [
      { code: '3.1', name: 'Measuring economic activity', done: 0, total: 5, lessons: [] },
      { code: '3.2', name: 'Aggregate demand and aggregate supply', done: 0, total: 10, lessons: [] },
      { code: '3.3', name: 'Economic growth', done: 0, total: 6, lessons: [] },
      { code: '3.4', name: 'Low unemployment', done: 0, total: 4, lessons: [] },
      { code: '3.5', name: 'Low and stable inflation', done: 0, total: 4, lessons: [] },
      { code: '3.6', name: 'Sustainable current account', done: 0, total: 2, lessons: [] },
      { code: '3.7', name: 'Fiscal policy', done: 0, total: 7, lessons: [] },
      { code: '3.8', name: 'Monetary policy', done: 0, total: 7, lessons: [] },
      { code: '3.9', name: 'Supply-side policies', done: 0, total: 7, lessons: [] },
    ],
  },
  {
    code: 'UNIT_4', name: 'The Global Economy', done: 0, total: 30,
    topics: [
      { code: '4.1', name: 'Benefits of international trade', done: 0, total: 4, lessons: [] },
      { code: '4.2', name: 'Types of trade protection', done: 0, total: 4, lessons: [] },
      { code: '4.3', name: 'Arguments for and against protection', done: 0, total: 3, lessons: [] },
      { code: '4.4', name: 'Economic integration', done: 0, total: 2, lessons: [] },
      { code: '4.5', name: 'Exchange rates', done: 0, total: 7, lessons: [] },
      { code: '4.6', name: 'Balance of payments', done: 0, total: 5, lessons: [] },
      { code: '4.7', name: 'Sustainable development', done: 0, total: 2, lessons: [] },
      { code: '4.8', name: 'Measuring development', done: 0, total: 2, lessons: [] },
      { code: '4.9', name: 'Barriers to development', done: 0, total: 1, lessons: [] },
    ],
  },
];

// BM: 22 + 26 + 36 + 28 + 24 = 136 lessons
const PICKER_DATA_BM: DemoUnit[] = [
  {
    code: 'UNIT_1', name: 'Business Organisation and Environment', done: 0, total: 22,
    topics: [
      { code: '1.1', name: 'Introduction to business management', done: 0, total: 4, lessons: [
        { code: 'bm_1_1_1', name: 'What is business management?', status: 'todo' },
        { code: 'bm_1_1_2', name: 'Business sectors and types of activity', status: 'todo' },
        { code: 'bm_1_1_3', name: 'Business purpose and vision', status: 'todo' },
        { code: 'bm_1_1_4', name: 'Entrepreneurship and intrapreneurship', status: 'todo' },
      ]},
      { code: '1.2', name: 'Types of organizations', done: 0, total: 4, lessons: [
        { code: 'bm_1_2_1', name: 'Sole traders and partnerships', status: 'todo' },
        { code: 'bm_1_2_2', name: 'Private and public limited companies', status: 'todo' },
        { code: 'bm_1_2_3', name: 'Not-for-profit organizations', status: 'todo' },
        { code: 'bm_1_2_4', name: 'The role of shareholders', status: 'todo' },
      ]},
      { code: '1.3', name: 'Organizational objectives', done: 0, total: 4, lessons: [
        { code: 'bm_1_3_1', name: 'Vision, mission and aims', status: 'todo' },
        { code: 'bm_1_3_2', name: 'SMART objectives', status: 'todo' },
        { code: 'bm_1_3_3', name: 'Business ethics', status: 'todo' },
        { code: 'bm_1_3_4', name: 'Corporate social responsibility', status: 'todo' },
      ]},
      { code: '1.4', name: 'Stakeholders', done: 0, total: 3, lessons: [
        { code: 'bm_1_4_1', name: 'Internal stakeholders', status: 'todo' },
        { code: 'bm_1_4_2', name: 'External stakeholders', status: 'todo' },
        { code: 'bm_1_4_3', name: 'Stakeholder conflict and management', status: 'todo' },
      ]},
      { code: '1.5', name: 'External environment', done: 0, total: 4, lessons: [] },
      { code: '1.6', name: 'Growth and evolution', done: 0, total: 3, lessons: [] },
    ],
  },
  {
    code: 'UNIT_2', name: 'Human Resource Management', done: 0, total: 26,
    topics: [
      { code: '2.1', name: 'Introduction to HRM', done: 0, total: 4, lessons: [
        { code: 'bm_2_1_1', name: 'Human resource planning', status: 'todo' },
        { code: 'bm_2_1_2', name: 'Recruitment and selection', status: 'todo' },
        { code: 'bm_2_1_3', name: 'Training and development', status: 'todo' },
        { code: 'bm_2_1_4', name: 'Appraisal and dismissal', status: 'todo' },
      ]},
      { code: '2.2', name: 'Organizational structure', done: 0, total: 5, lessons: [
        { code: 'bm_2_2_1', name: 'Hierarchies and span of control', status: 'todo' },
        { code: 'bm_2_2_2', name: 'Centralisation and decentralisation', status: 'todo' },
        { code: 'bm_2_2_3', name: 'Delegation and accountability', status: 'todo' },
        { code: 'bm_2_2_4', name: 'Flat vs tall structures', status: 'todo' },
        { code: 'bm_2_2_5', name: 'Matrix and project-based structures', status: 'todo' },
      ]},
      { code: '2.3', name: 'Leadership and management', done: 0, total: 4, lessons: [] },
      { code: '2.4', name: 'Motivation', done: 0, total: 5, lessons: [] },
      { code: '2.5', name: 'Organizational culture', done: 0, total: 3, lessons: [] },
      { code: '2.6', name: 'Communication', done: 0, total: 3, lessons: [] },
      { code: '2.7', name: 'Industrial and employee relations', done: 0, total: 2, lessons: [] },
    ],
  },
  {
    code: 'UNIT_3', name: 'Finance and Accounts', done: 0, total: 36,
    topics: [
      { code: '3.1', name: 'Introduction to finance', done: 0, total: 3, lessons: [] },
      { code: '3.2', name: 'Sources of finance', done: 0, total: 4, lessons: [] },
      { code: '3.3', name: 'Costs and revenues', done: 0, total: 5, lessons: [] },
      { code: '3.4', name: 'Final accounts', done: 0, total: 5, lessons: [] },
      { code: '3.5', name: 'Profitability and liquidity ratios', done: 0, total: 5, lessons: [] },
      { code: '3.6', name: 'Efficiency ratios', done: 0, total: 4, lessons: [] },
      { code: '3.7', name: 'Cash flow', done: 0, total: 4, lessons: [] },
      { code: '3.8', name: 'Investment appraisal', done: 0, total: 4, lessons: [] },
      { code: '3.9', name: 'Budgets', done: 0, total: 2, lessons: [] },
    ],
  },
  {
    code: 'UNIT_4', name: 'Marketing', done: 0, total: 28,
    topics: [
      { code: '4.1', name: 'Introduction to marketing', done: 0, total: 5, lessons: [] },
      { code: '4.2', name: 'Marketing planning', done: 0, total: 5, lessons: [] },
      { code: '4.3', name: 'Sales forecasting', done: 0, total: 4, lessons: [] },
      { code: '4.4', name: 'Market research', done: 0, total: 5, lessons: [] },
      { code: '4.5', name: 'The marketing mix', done: 0, total: 5, lessons: [] },
      { code: '4.6', name: 'International marketing', done: 0, total: 2, lessons: [] },
      { code: '4.7', name: 'E-commerce', done: 0, total: 2, lessons: [] },
    ],
  },
  {
    code: 'UNIT_5', name: 'Operations Management', done: 0, total: 24,
    topics: [
      { code: '5.1', name: 'Introduction to operations management', done: 0, total: 4, lessons: [] },
      { code: '5.2', name: 'Operations methods', done: 0, total: 4, lessons: [] },
      { code: '5.3', name: 'Lean production and quality management', done: 0, total: 5, lessons: [] },
      { code: '5.4', name: 'Location', done: 0, total: 2, lessons: [] },
      { code: '5.5', name: 'Production planning', done: 0, total: 4, lessons: [] },
      { code: '5.6', name: 'Crisis management', done: 0, total: 2, lessons: [] },
      { code: '5.7', name: 'Research and development', done: 0, total: 2, lessons: [] },
      { code: '5.8', name: 'Management information systems', done: 0, total: 1, lessons: [] },
    ],
  },
];

const ALL_PICKER_LESSONS_ECON = PICKER_DATA_ECON.flatMap(u =>
  u.topics.flatMap(t => t.lessons.map(l => ({ ...l, unitName: u.name, topicCode: t.code, topicName: t.name })))
);
const ALL_PICKER_LESSONS_BM = PICKER_DATA_BM.flatMap(u =>
  u.topics.flatMap(t => t.lessons.map(l => ({ ...l, unitName: u.name, topicCode: t.code, topicName: t.name })))
);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} at ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function fmtShort(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// ─── Demo-specific CSS additions ─────────────────────────────────────────────

const DEMO_CSS = `
.demo-notice {
  background: color-mix(in oklab, oklch(22% 0.035 168) 8%, oklch(96.2% 0.012 78));
  border-bottom: 1px solid color-mix(in oklab, oklch(22% 0.035 168) 15%, oklch(86% 0.014 78));
  padding: 10px 28px;
  text-align: center;
  font-size: 12.5px;
  color: oklch(22% 0.035 168);
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
}
.demo-notice a {
  font-weight: 600;
  color: oklch(22% 0.035 168);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.demo-nav-cta {
  padding: 7px 16px;
  background: oklch(64% 0.17 47);
  color: oklch(98% 0.01 70);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  transition: background 0.15s;
}
.demo-nav-cta:hover { background: oklch(58% 0.17 47); }
.demo-nav-login {
  font-size: 13px;
  color: oklch(54% 0.012 60);
  text-decoration: none;
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  padding: 7px 4px;
}
.demo-nav-login:hover { color: oklch(18% 0.012 60); }
@media (max-width: 760px) {
  .demo-nav-cta, .demo-nav-login { min-height: 44px; display: inline-flex; align-items: center; }
}
@media (max-width: 480px) {
  .demo-nav-login { display: none; }
}

@keyframes demo-pulse {
  0%   { transform: scale(1);    box-shadow: 0 0 0 0   rgba(200, 162, 58, 0.5); }
  50%  { transform: scale(1.05); box-shadow: 0 0 0 16px rgba(200, 162, 58, 0); }
  100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(200, 162, 58, 0); }
}
.ib-dash .start-btn-pulse {
  animation: demo-pulse 2s ease-in-out infinite;
  will-change: transform;
}
@keyframes bounce-hint {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-4px); }
}
.ib-dash .demo-cta-hint {
  font-family: "Geist Mono", ui-monospace, "JetBrains Mono", Menlo, monospace;
  font-size: 11px;
  color: oklch(64% 0.17 47);
  letter-spacing: 0.04em;
  text-align: center;
  animation: bounce-hint 1.2s ease-in-out infinite;
}
.ib-dash .demo-cta-wrap {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

/* On-track panel */
.on-track-panel {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: color-mix(in oklab, oklch(44% 0.12 160) 7%, oklch(96.2% 0.012 78));
  border: 1px solid color-mix(in oklab, oklch(44% 0.12 160) 16%, transparent);
  border-radius: 14px;
  padding: 16px 20px;
  margin-bottom: 20px;
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
}
.on-track-panel-icn {
  width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: color-mix(in oklab, oklch(44% 0.12 160) 14%, transparent);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; color: oklch(36% 0.1 160);
}
.on-track-panel-title {
  font-size: 13.5px; font-weight: 600;
  color: oklch(22% 0.035 168); margin-bottom: 3px;
}
.on-track-panel-sub {
  font-size: 12.5px; line-height: 1.55;
  color: oklch(36% 0.03 160);
}

/* Weak area next action */
.weak-next {
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  font-size: 11.5px;
  color: oklch(44% 0.12 160);
  margin-top: 3px;
  font-style: italic;
}

/* Picker start-free banner */
.picker-start-free {
  padding: 10px 16px 4px;
  display: flex;
  justify-content: flex-end;
}
.picker-start-free-cta {
  padding: 6px 14px;
  background: oklch(64% 0.17 47);
  color: oklch(98% 0.01 70);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  transition: background 0.15s;
}
.picker-start-free-cta:hover { background: oklch(58% 0.17 47); }

/* Picker lock */
.picker-lock {
  font-size: 11px;
  opacity: 0.35;
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 8px;
  cursor: default;
}
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function DemoNav() {
  return (
    <header className="app-nav">
      <Link href="/">
        <img src="/gradd-ai-logo.png" alt="Gradd" />
      </Link>
      <div className="app-nav-right">
        <a href="/auth/login" className="demo-nav-login">Already a student? Log in</a>
        <a href="/auth/signup/ib" className="demo-nav-cta">Start free →</a>
      </div>
    </header>
  );
}

function ActivityStrip() {
  const sessionDays = new Set(FAKE_SESSIONS.map(s => new Date(s.started_at).toDateString()));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], had: sessionDays.has(d.toDateString()) };
  });
  const active = days.filter(d => d.had).length;
  return (
    <div className="week-track">
      <div className="week-track-hd">
        <span className="wt-title">Last 7 days</span>
        <span className="wt-sub"><strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{active}</strong> of 7 days active</span>
      </div>
      <div className="days">
        {days.map(({ label, had }) => (
          <div key={label} className="day">
            <div className={`box${had ? ' active' : ''}`}>{had ? '✓' : ''}</div>
            <span className="wt-lbl">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LastSessionCard() {
  const s = LAST_SESSION;
  return (
    <div className="last-session">
      <div className="last-session-hd">
        <span className="ls-label">Last session · {fmtDate(s.started_at)}</span>
        <span className="ls-pill">New Topic</span>
      </div>
      <div className="last-session-body">
        <h3>{s.lesson_name}</h3>
        <div className="ls-chips">
          {s.concepts_covered.map(c => <span key={c} className="ls-chip">{c}</span>)}
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="ls-warn">⚠ {s.weak_flags_count} concepts to revisit</div>
        </div>
      </div>
    </div>
  );
}

function WeakAreasSection() {
  return (
    <div className="weak-card">
      <h3>Weak areas to watch</h3>
      {WEAK_AREAS.map(w => (
        <div key={w.id} className="weak-row">
          <div className="weak-icn">!</div>
          <div>
            <div className="weak-desc">{w.error_description}</div>
            <div className="weak-meta">Lesson {w.lesson_code} · flagged {w.occurrence_count}×</div>
            <div className="weak-next">Mia is retesting this with diagram questions this week.</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CurriculumProgress() {
  return (
    <div className="curr">
      <div className="curr-hd">
        <h3>Curriculum progress</h3>
        <span className="of">{TOTAL_COMPLETED} / {TOTAL_LESSONS} lessons</span>
      </div>
      <div className="curr-bar"><div className="fill" style={{ width: `${CURRICULUM_PCT}%` }} /></div>
      <div className="curr-list">
        {UNITS.map(u => {
          const done = u.code === 'UNIT_1';
          const current = u.code === 'UNIT_2';
          return (
            <div key={u.code} className={`curr-row${done ? ' done' : current ? ' current' : ''}`}>
              <span className="dot" />
              <span>{u.name}</span>
              {current && <span className="count">Current</span>}
              {done    && <span className="count">Done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RecentSessions() {
  return (
    <div className="sess-list">
      <h3>Recent sessions</h3>
      {FAKE_SESSIONS.map(s => (
        <div key={s.id} className="sess-row">
          <span className="num">#{s.session_number}</span>
          <div>
            <span className="topic">{s.lesson_code}</span>
            <span className="tag">New Topic</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {s.weak_flags_count > 0 && <span className="warn-flag">⚠ {s.weak_flags_count}</span>}
            <span className="date">{fmtShort(s.started_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Demo course picker (inert — no router.push) ─────────────────────────────

const ECON_UNITS_DEFAULT  = () => new Set(['UNIT_1', 'UNIT_2']);
const ECON_TOPICS_DEFAULT = () => new Set(['UNIT_1:1.1', 'UNIT_1:1.2', 'UNIT_1:1.3', 'UNIT_2:2.1', 'UNIT_2:2.2', 'UNIT_2:2.3']);
const BM_UNITS_DEFAULT    = () => new Set(['UNIT_1', 'UNIT_2']);
const BM_TOPICS_DEFAULT   = () => new Set(['UNIT_1:1.1', 'UNIT_1:1.2', 'UNIT_1:1.3', 'UNIT_2:2.1', 'UNIT_2:2.2']);

function DemoCoursePicker() {
  const [showPicker,     setShowPicker]     = useState(false);
  const [activeSubject,  setActiveSubject]  = useState<PickerSubject>('IB_ECONOMICS');
  const [expandedUnits,  setExpandedUnits]  = useState<Set<string>>(ECON_UNITS_DEFAULT);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(ECON_TOPICS_DEFAULT);
  const [query,          setQuery]          = useState('');

  const pickerData  = activeSubject === 'IB_ECONOMICS' ? PICKER_DATA_ECON       : PICKER_DATA_BM;
  const allLessons  = activeSubject === 'IB_ECONOMICS' ? ALL_PICKER_LESSONS_ECON : ALL_PICKER_LESSONS_BM;

  function switchSubject(s: PickerSubject) {
    setActiveSubject(s);
    setExpandedUnits(s  === 'IB_ECONOMICS' ? ECON_UNITS_DEFAULT()  : BM_UNITS_DEFAULT());
    setExpandedTopics(s === 'IB_ECONOMICS' ? ECON_TOPICS_DEFAULT() : BM_TOPICS_DEFAULT());
    setQuery('');
  }

  const searchResults = query.trim()
    ? allLessons.filter(l => {
        const q = query.trim().toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.unitName.toLowerCase().includes(q) ||
          l.topicName.toLowerCase().includes(q)
        );
      })
    : null;

  function toggleUnit(code: string) {
    setExpandedUnits(prev => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  }
  function toggleTopic(key: string) {
    setExpandedTopics(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  return (
    <div className="browse-section">
      <button
        className={`browse-hd${showPicker ? ' open' : ''}`}
        onClick={() => setShowPicker(v => !v)}
      >
        <div>
          <div className="browse-title">Jump to any topic</div>
          <div className="browse-sub">346 lessons across both subjects — pick any topic</div>
        </div>
        <span className="browse-chevron">▶</span>
      </button>

      {showPicker && (
        <div className="picker-tree">
          {/* Start free CTA */}
          <div className="picker-start-free">
            <a href="/auth/signup/ib" className="picker-start-free-cta">Start free with Mia →</a>
          </div>

          {/* Subject toggle */}
          <div className="subj-tabs" role="tablist" style={{ margin: '12px 16px 4px' }}>
            {([
              { value: 'IB_ECONOMICS' as PickerSubject, label: 'IB Economics' },
              { value: 'IB_BUSINESS'  as PickerSubject, label: 'IB Business Management' },
            ]).map(tab => (
              <button
                key={tab.value}
                role="tab"
                aria-pressed={activeSubject === tab.value}
                onClick={() => switchSubject(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="picker-search">
            <input
              className="picker-search-input"
              type="search"
              placeholder={activeSubject === 'IB_ECONOMICS'
                ? 'Search — e.g. elasticity, market failure, inflation'
                : 'Search — e.g. motivation, cash flow, marketing mix'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-label="Search lessons"
            />
          </div>

          {searchResults !== null ? (
            searchResults.length === 0 ? (
              <div className="picker-empty">
                No topics match —{' '}
                <a href="/auth/signup/ib" style={{ color: 'var(--rust)' }}>
                  sign up to explore all 346 lessons →
                </a>
              </div>
            ) : (
              searchResults.map(lesson => (
                <div
                  key={lesson.code}
                  className={`picker-lesson picker-result${lesson.status === 'current' ? ' current' : ''}`}
                  style={{ cursor: 'default' }}
                >
                  <span className={`picker-marker${lesson.status === 'done' ? ' done' : lesson.status === 'current' ? ' here' : ' todo'}`}>
                    {lesson.status === 'done' ? '✓' : lesson.status === 'current' ? '◉' : '○'}
                  </span>
                  <div className="picker-result-body">
                    <div className="picker-lesson-name">{lesson.name}</div>
                    <div className="picker-result-ctx">{lesson.unitName} · {lesson.topicName}</div>
                  </div>
                  {lesson.weak && <span className="picker-weak-dot" />}
                  <span className="picker-lock">🔒</span>
                </div>
              ))
            )
          ) : (
            pickerData.map(unit => {
              const pct = unit.total ? Math.round((unit.done / unit.total) * 100) : 0;
              const isOpen = expandedUnits.has(unit.code);
              const hasReview = unit.topics.some(t => t.lessons.some(l => l.weak));
              return (
                <div key={unit.code} className="picker-unit">
                  <button className="picker-unit-hd" onClick={() => toggleUnit(unit.code)} aria-expanded={isOpen}>
                    <span className={`picker-chevron${isOpen ? ' open' : ''}`}>▶</span>
                    <span className="picker-unit-name">{unit.name}</span>
                    {hasReview && <span className="picker-review-dot" title="Active weak areas in this unit" />}
                    <span className="picker-unit-meta">
                      <span className="picker-unit-bar">
                        <span className="picker-unit-bar-fill" style={{ width: `${pct}%` }} />
                      </span>
                      <span className="picker-unit-count">{unit.done}/{unit.total}</span>
                    </span>
                  </button>

                  {isOpen && unit.topics.map(topic => {
                    const tKey = `${unit.code}:${topic.code}`;
                    const isTopicOpen = expandedTopics.has(tKey);
                    const topicReview = topic.lessons.some(l => l.weak);
                    return (
                      <div key={tKey} className="picker-topic">
                        <button className="picker-topic-hd" onClick={() => toggleTopic(tKey)} aria-expanded={isTopicOpen}>
                          <span className="picker-topic-code">{topic.code}</span>
                          <span className="picker-topic-sep">·</span>
                          <span className="picker-topic-name">{topic.name}</span>
                          <span className="picker-topic-count">{topic.done}/{topic.total}</span>
                          {topicReview && <span className="picker-topic-review-dot" title="Active weak area" />}
                          <span className={`picker-chevron small${isTopicOpen ? ' open' : ''}`}>▶</span>
                        </button>

                        {isTopicOpen && (
                          topic.lessons.length > 0 ? (
                            topic.lessons.map(lesson => (
                              <div
                                key={lesson.code}
                                className={`picker-lesson${lesson.status === 'current' ? ' current' : ''}`}
                                style={{ cursor: 'default' }}
                              >
                                <span className={`picker-marker${lesson.status === 'done' ? ' done' : lesson.status === 'current' ? ' here' : ' todo'}`}>
                                  {lesson.status === 'done' ? '✓' : lesson.status === 'current' ? '◉' : '○'}
                                </span>
                                <span className="picker-lesson-name">{lesson.name}</span>
                                {lesson.weak && <span className="picker-weak-dot" title="Active weak area" />}
                                <span className="picker-lock">🔒</span>
                              </div>
                            ))
                          ) : (
                            <div className="picker-lesson" style={{ cursor: 'default' }}>
                              <span className="picker-marker todo">○</span>
                              <span className="picker-lesson-name" style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>
                                {topic.total} lesson{topic.total !== 1 ? 's' : ''} in this topic
                              </span>
                              <span className="picker-lock">🔒</span>
                            </div>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = 'student' | 'parent';

export default function DemoDashboard() {
  const [view, setView] = useState<View>('student');

  return (
    <div className="ib-dash">
      <style>{DASH_CSS + DEMO_CSS}</style>

      {/* Demo notice */}
      <div className="demo-notice">
        Demo session — no account needed.{' '}
        <a href="/auth/signup/ib">Start free</a> to begin real sessions with Mia.
      </div>

      <DemoNav />

      <main className="app-wrap">
        {/* Page heading + toggle */}
        <div className="page-head" style={{ marginBottom: 40 }}>
          <div>
            <h1>
              {view === 'student'
                ? <>Good to see you, <em style={{ color: 'var(--rust)' }}>{STUDENT}.</em></>
                : <><em style={{ color: 'var(--rust)' }}>{STUDENT}&apos;s</em> progress.</>
              }
            </h1>
            <div className="sub">{SUBJECT_LABEL} · {EXAM_LEVEL} · Session {SESSION_NUMBER}</div>
          </div>
          <div className="view-toggle" role="tablist" aria-label="Dashboard view">
            {(['student', 'parent'] as View[]).map(m => (
              <button
                key={m} role="tab"
                aria-pressed={view === m}
                onClick={() => setView(m)}
              >
                {m === 'student' ? 'My view' : 'Parent view'}
              </button>
            ))}
          </div>
        </div>

        {/* ── STUDENT VIEW ── */}
        {view === 'student' && (
          <>
            {/* Hero — Start session CTA */}
            <div className="next-session" style={{ marginBottom: 24 }}>
              <div>
                <div className="ns-label">Next session</div>
                <h2>{CURRENT_LESSON}</h2>
                <div className="ns-meta">{CURRENT_UNIT} · New Topic</div>
              </div>
              <div className="demo-cta-wrap">
                <div className="demo-cta-hint">See a real lesson</div>
                <a href="/demo/session" className="start-btn start-btn-pulse">
                  Start session →
                </a>
              </div>
            </div>

            <DemoCoursePicker />

            <LastSessionCard />

            {/* Mini 4-stat grid */}
            <div className="stats stats-4" style={{ marginTop: 8 }}>
              {([
                { label: 'Progress',  main: CURRICULUM_PCT,   unit: '%' },
                { label: 'Sessions',  main: TOTAL_SESSIONS,   unit: '' },
                { label: 'Streak',    main: STREAK,           unit: 'd', streak: true },
                { label: 'To exam',   main: EXAM_DAYS,        unit: 'd' },
              ]).map(({ label, main, unit, streak }) => (
                <div key={label} className="stat-card">
                  <div className="lbl">{label}</div>
                  <div className={`val${streak ? ' streak' : ''}`}>
                    {main}{unit && <span className="small">{unit}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── PARENT VIEW ── */}
        {view === 'parent' && (
          <>
            {/* On-track panel */}
            <div className="on-track-panel">
              <div className="on-track-panel-icn">✓</div>
              <div>
                <div className="on-track-panel-title">On track for the exam</div>
                <div className="on-track-panel-sub">Louise is averaging 2.2 sessions/week against a target of 2 — on pace to finish IB Economics before her exams.</div>
              </div>
            </div>

            {/* Position card */}
            <div className="next-session">
              <div>
                <div className="ns-label">Currently studying</div>
                <h2>{CURRENT_LESSON}</h2>
                <div className="ns-meta">{CURRENT_UNIT} · New Topic</div>
              </div>
              <div className="demo-cta-wrap">
                <div className="demo-cta-hint">See a real lesson</div>
                <a href="/demo/session" className="start-btn start-btn-pulse">
                  Start session →
                </a>
              </div>
            </div>

            <LastSessionCard />
            <ActivityStrip />

            {/* Full 8-stat grid */}
            <div className="stats stats-8">
              {([
                { label: 'Curriculum progress', main: CURRICULUM_PCT, unit: '%', sub: `${TOTAL_COMPLETED} of ${TOTAL_LESSONS} lessons` },
                { label: 'Sessions completed',  main: TOTAL_SESSIONS, unit: '',  sub: '≈ 5.3 hrs invested' },
                { label: 'This week',           main: THIS_WEEK,      unit: '',  sub: 'target: 2/wk' },
                { label: 'Sessions/wk needed',  main: 2,              unit: '',  sub: '44 weeks to exam' },
                { label: '4-wk avg / week',     main: 2.2,            unit: '',  sub: 'on track' },
                { label: 'Days to exam',        main: EXAM_DAYS,      unit: 'd', sub: 'IB Economics SL · May 2027' },
                { label: 'Study streak',        main: STREAK,         unit: 'd', sub: 'days in a row', streak: true },
                { label: 'Weak areas',          main: WEAK_COUNT,     unit: '',  sub: 'Mia is tracking', warn: true },
              ]).map(({ label, main, unit, sub, streak, warn }) => (
                <div key={label} className="stat-card">
                  <div className="lbl">{label}</div>
                  <div className={`val${streak ? ' streak' : ''}`}>
                    {main}{unit && <span className="small">{unit}</span>}
                  </div>
                  <div className={`hint${warn ? ' warn' : ''}`}>{sub}</div>
                </div>
              ))}
            </div>

            <CurriculumProgress />
            <WeakAreasSection />
            <RecentSessions />
          </>
        )}
      </main>

      <footer className="app-footer">
        <a href="/">gradd.ai</a> · <a href="/terms">Terms</a> · <a href="/privacy">Privacy</a>
      </footer>
    </div>
  );
}
