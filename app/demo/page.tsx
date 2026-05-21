'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CSS as DASH_CSS } from '@/components/dashboard/IBDashboardClient';

// ─── Fake demo data ───────────────────────────────────────────────────────────

const STUDENT = 'Alex';
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
        <a href="/auth/signup/ib" className="demo-nav-cta">Start learning →</a>
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

// ─── Main ─────────────────────────────────────────────────────────────────────

type View = 'student' | 'parent';

export default function DemoDashboard() {
  const [view, setView] = useState<View>('student');

  return (
    <div className="ib-dash">
      <style>{DASH_CSS + DEMO_CSS}</style>

      {/* Demo notice */}
      <div className="demo-notice">
        👋 You&apos;re viewing a demo — no account needed.{' '}
        <a href="/auth/signup/ib">Sign up free</a> to start your real sessions with Mia.
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
            {/* Pace banner */}
            <div className="alert alert-on-track">
              <div className="icn">→</div>
              <p>
                Averaging <b>2.2/week</b> against a target of <b>2</b>. {STUDENT} is on track to complete the curriculum before the exam.
              </p>
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
