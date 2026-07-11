// components/dashboard/IBDashboardClient.tsx
// IB dashboard client — Stage 1 re-skin: shell, nav, page head, toggle.
// Scoped under .ib-dash — cannot affect DashboardClient.tsx (LC) or globals.css.
// Individual cards (hero, stat grid, curriculum, etc.) restyled in later stages.
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { resolveIsIBClient } from '@/lib/site-client';
import CoursePicker, { type PickerLesson } from './CoursePicker';

interface Unit { code: string; name: string; }
interface RecentSession {
  id: string; session_number: number; session_type: string;
  lesson_code: string | null; started_at: string; ended_at: string | null; weak_flags_count: number;
}
interface WeakArea {
  id: string; concept_slug: string; error_description: string;
  lesson_code: string; occurrence_count: number;
}
interface LastSession {
  id: string; session_number: number; session_type: string;
  lesson_code: string | null; lesson_name: string | null; concepts_covered: string[];
  weak_flags_count: number; started_at: string; apply_scores: string | null;
}
interface Props {
  studentName: string; examLevel: string; sessionNumber: number;
  subject?: string;
  activeSubject?: string;
  isBundle?: boolean;
  currentLessonCode: string; currentLessonName: string;
  currentUnitName: string; currentUnitCode: string; sessionType: string;
  curriculumPercent: number; totalCompleted: number; totalLessons: number;
  totalSessions: number; weakAreasCount: number; unitsCompleted: string[];
  units: Unit[]; recentSessions: RecentSession[]; weakAreas: WeakArea[];
  lastSession: LastSession | null; spaced_rep_due: boolean; abq_drill_due: boolean;
  pickerLessons?: PickerLesson[];
  pickerCompletedCodes?: string[];
  pickerWeakAreaCodes?: string[];
  subscriptionStatus?: string;
}

const IB_SUBJECTS = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'];

function getTutorName(subject?: string): string {
  return subject && IB_SUBJECTS.includes(subject) ? 'Mia' : 'Aoife';
}

function getSubjectLabel(subject?: string): string {
  const map: Record<string, string> = {
    LC_BUSINESS:  'LC Business',
    IB_ECONOMICS: 'IB Economics',
    IB_BUSINESS:  'IB Business Management',
  };
  return (subject && map[subject]) ? map[subject] : 'LC Business';
}

const LC_EXAM_DATE = new Date('2026-06-08T09:00:00');
const IB_EXAM_DATE = new Date('2027-05-12T09:00:00');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} at ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function sessionLabel(type: string): string {
  const map: Record<string,string> = {
    NEW_TOPIC: 'New Topic', REVISION: 'Revision', EXAM_PRACTICE: 'Exam Practice',
    ABQ_DRILL: 'ABQ Drill', SHORT_Q_DRILL: 'Short Q Drill', UNIT_CHECKPOINT: 'Unit Checkpoint',
  };
  return map[type] ?? type;
}

function examDateFor(subject?: string) {
  return subject && IB_SUBJECTS.includes(subject) ? IB_EXAM_DATE : LC_EXAM_DATE;
}
function examHasPassed(subject?: string) { return examDateFor(subject).getTime() <= Date.now(); }
function daysToExam(subject?: string) {
  return Math.max(0, Math.ceil((examDateFor(subject).getTime() - Date.now()) / 86400000));
}
// No 0.5 floor: a passed/imminent exam must not inflate the target (the old
// Math.max(0.5, …) produced absurd "N sessions/week" once the date went by).
function weeksToExam(subject?: string) { return daysToExam(subject) / 7; }

function sessionsPerWeekNeeded(totalCompleted: number, totalLessons: number, subject?: string): number | null {
  if (examHasPassed(subject)) return null;
  const weeks = weeksToExam(subject);
  if (weeks <= 0) return null;
  return Math.ceil(Math.max(0, totalLessons - totalCompleted) / weeks);
}

function calcStreak(sessions: RecentSession[]): number {
  if (!sessions.length) return 0;
  const days = new Set(sessions.map(s => new Date(s.started_at).toDateString()));
  const d = new Date();
  if (!days.has(d.toDateString())) {
    d.setDate(d.getDate() - 1);
    if (!days.has(d.toDateString())) return 0;
  }
  let streak = 0;
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

function sessionsThisWeek(sessions: RecentSession[]): number {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  monday.setHours(0,0,0,0);
  return sessions.filter(s => new Date(s.started_at) >= monday).length;
}

function avgSessionsPerWeek(sessions: RecentSession[]): number {
  if (!sessions.length) return 0;
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 28);
  const recent = sessions.filter(s => new Date(s.started_at) >= cutoff);
  return Math.round((recent.length / 4) * 10) / 10;
}

function last7Days(sessions: RecentSession[]): { label: string; had: boolean }[] {
  const sessionDays = new Set(sessions.map(s => new Date(s.started_at).toDateString()));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    return { label: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], had: sessionDays.has(d.toDateString()) };
  });
}

type Pace = 'on-track' | 'behind' | 'ahead' | 'no-data' | 'exam-passed';
function calcPace(avg: number, needed: number | null): Pace {
  if (needed == null) return 'exam-passed';   // exam date has passed → pace is meaningless
  if (avg === 0) return 'no-data';
  const r = avg / needed;
  if (r >= 1.1) return 'ahead';
  if (r >= 0.85) return 'on-track';
  return 'behind';
}
const PACE_CONF: Record<Pace, { label: string; color: string; bg: string; border: string }> = {
  'ahead':       { label: 'Ahead of pace',  color: '#1e7e44', bg: '#f0faf4', border: '#b7e4c7' },
  'on-track':    { label: 'On track',       color: '#1a4a7a', bg: '#f0f7ff', border: '#c3daf5' },
  'behind':      { label: 'Falling behind', color: '#7a5c00', bg: '#fffbf0', border: '#e8d89a' },
  'no-data':     { label: 'No data yet',    color: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--border)' },
  'exam-passed': { label: 'Exam passed',    color: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--border)' },
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ studentName, subscriptionStatus }: {
  studentName: string;
  subscriptionStatus?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [logoSrc, setLogoSrc] = useState('/gradd-logo.svg');
  useEffect(() => {
    if (resolveIsIBClient()) setLogoSrc('/gradd-ai-logo.png');
  }, []);
  const [portalLoading, setPortalLoading] = useState(false);
  const isSubscribed = subscriptionStatus === 'active';

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalLoading(false);
      }
    } catch {
      setPortalLoading(false);
    }
  };

  return (
    <header className="app-nav">
      <img src={logoSrc} alt="Gradd" />
      <div className="app-nav-right">
        <span>{studentName}</span>
        {isSubscribed ? (
          <button
            className="app-btn"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            style={{ cursor: portalLoading ? 'not-allowed' : 'pointer', opacity: portalLoading ? 0.6 : 1 }}
          >
            {portalLoading ? 'Opening…' : 'Manage subscription'}
          </button>
        ) : (
          <Link href="/subscribe/ib" className="app-btn app-btn-cta">
            Go unlimited →
          </Link>
        )}
        <button
          className="app-btn-ghost"
          onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

type ViewMode = 'parent' | 'student';
function Toggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="view-toggle" role="tablist" aria-label="Dashboard view">
      {(['parent', 'student'] as ViewMode[]).map(m => (
        <button
          key={m}
          role="tab"
          aria-pressed={mode === m}
          onClick={() => onChange(m)}
        >
          {m === 'parent' ? 'Parent view' : 'My view'}
        </button>
      ))}
    </div>
  );
}

// ─── Subject switcher (IB Bundle only) ───────────────────────────────────────

function SubjectSwitcher({ active }: { active: string }) {
  const router = useRouter();
  const tabs = [
    { value: 'IB_ECONOMICS', label: 'IB Economics' },
    { value: 'IB_BUSINESS',  label: 'IB Business Management' },
  ];
  return (
    <div className="subj-tabs" role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.value}
          role="tab"
          aria-pressed={active === tab.value}
          onClick={() => {
            document.cookie = `gradd-active-subject=${tab.value}; path=/; max-age=31536000; SameSite=Lax`;
            router.refresh();
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Hero cards — Stage 2a ────────────────────────────────────────────────────

function StudentHeroCard({ currentLessonName, currentUnitName, sessionType, spaced_rep_due, abq_drill_due }: {
  currentLessonName: string; currentUnitName: string; sessionType: string;
  spaced_rep_due: boolean; abq_drill_due: boolean;
}) {
  const label = spaced_rep_due ? '🔁 Recall + New Topic' : abq_drill_due ? '📄 ABQ Drill due' : 'Next session';
  return (
    <div className="next-session">
      <div>
        <div className="ns-label">{label}</div>
        <h2>{currentLessonName}</h2>
        <div className="ns-meta">{currentUnitName} · {sessionType}</div>
      </div>
      <Link href="/session" className="start-btn">Start session →</Link>
    </div>
  );
}

function ParentPositionCard({ currentLessonName, currentUnitName, sessionType, lastSession }: {
  currentLessonName: string; currentUnitName: string; sessionType: string; lastSession: LastSession | null;
}) {
  return (
    <div className="next-session">
      <div>
        <div className="ns-label">Currently studying</div>
        <h2>{currentLessonName}</h2>
        <div className="ns-meta">{currentUnitName} · {sessionType}</div>
      </div>
      {lastSession && (
        <div className="right-meta">
          Last active
          <span className="em">{formatDateShort(lastSession.started_at)}</span>
        </div>
      )}
    </div>
  );
}

// ─── Last session card — Stage 2a ────────────────────────────────────────────

function LastSessionCard({ s, href }: { s: LastSession; href?: string }) {
  const inner = (
    <>
      <div className="last-session-hd">
        <span className="ls-label">Last session · {formatDate(s.started_at)}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="ls-pill">{sessionLabel(s.session_type)}</span>
          {href && <span className="ls-arrow">→</span>}
        </div>
      </div>
      <div className="last-session-body">
        <h3>{s.lesson_name ?? s.lesson_code ?? '—'}</h3>
        {s.apply_scores && (
          <p className="ls-apply">Apply score: <strong>{s.apply_scores}</strong></p>
        )}
        {s.concepts_covered.length > 0 && (
          <div className="ls-chips">
            {s.concepts_covered.map(c => (
              <span key={c} className="ls-chip">{c}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          {s.weak_flags_count > 0
            ? <div className="ls-warn">⚠ {s.weak_flags_count} concept{s.weak_flags_count !== 1 ? 's' : ''} to revisit</div>
            : <div className="ls-ok">✓ All clear — no weak flags</div>}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link href={href} className="last-session last-session-link">
        {inner}
      </Link>
    );
  }
  return <div className="last-session">{inner}</div>;
}

// ─── Activity strip — Stage 2b ───────────────────────────────────────────────

function ActivityStrip({ sessions }: { sessions: RecentSession[] }) {
  const days = last7Days(sessions);
  const activeDays = days.filter(d => d.had).length;
  return (
    <div className="week-track">
      <div className="week-track-hd">
        <span className="wt-title">Last 7 days</span>
        <span className="wt-sub">
          <strong style={{ color: 'var(--ink)', fontWeight: 500 }}>{activeDays}</strong> of 7 days active
        </span>
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

// ─── Pace banner — Stage 2b ───────────────────────────────────────────────────

function PaceBanner({ pace, avg, needed, studentName }: { pace: Pace; avg: number; needed: number | null; studentName: string }) {
  const alertClass = pace === 'ahead' ? 'alert alert-ahead'
    : pace === 'on-track' ? 'alert alert-on-track'
    : (pace === 'no-data' || pace === 'exam-passed') ? 'alert alert-no-data'
    : 'alert';
  const icon = pace === 'ahead' ? '✓' : pace === 'on-track' ? '→' : (pace === 'no-data' || pace === 'exam-passed') ? '–' : '!';
  const n = needed ?? 0;
  const gap = n - avg;
  let msg: React.ReactNode;
  if (pace === 'exam-passed') {
    msg = <>This year&apos;s exam has passed — pace targets are paused. A good time to consolidate before next year&apos;s syllabus.</>;
  } else if (pace === 'no-data') {
    msg = <>{studentName} hasn&apos;t completed enough sessions to assess pace yet. Target is <b>{n}</b> sessions per week.</>;
  } else if (pace === 'ahead') {
    msg = <>Averaging <b>{avg}/week</b> against a target of <b>{n}</b>. {studentName} is ahead of pace — exam preparation is on track.</>;
  } else if (pace === 'on-track') {
    msg = <>Averaging <b>{avg}/week</b> against a target of <b>{n}</b>. {studentName} is on track to complete the curriculum before the exam.</>;
  } else {
    msg = <>Averaging <b>{avg}/week</b> but need <b>{n}</b> to stay on track. {studentName} needs to pick up the pace — <b>{gap} more session{gap !== 1 ? 's' : ''}/week</b> required.</>;
  }
  return (
    <div className={alertClass}>
      <div className="icn">{icon}</div>
      <p>{msg}</p>
    </div>
  );
}

// ─── Stat grid — Stage 2b ────────────────────────────────────────────────────

function StatGrid({ curriculumPercent, totalCompleted, totalLessons, totalSessions, weakAreasCount, streak, thisWeek, examDays, neededPerWeek, avgPerWeek, pace, subject, tutorName }: {
  curriculumPercent: number; totalCompleted: number; totalLessons: number; totalSessions: number;
  weakAreasCount: number; streak: number; thisWeek: number; examDays: number;
  neededPerWeek: number | null; avgPerWeek: number; pace: Pace; subject?: string; tutorName: string;
}) {
  const timeHrs = Math.round((totalSessions * 45) / 60 * 10) / 10;
  const paceConf = PACE_CONF[pace];
  const passed = pace === 'exam-passed';
  const isIB = subject && IB_SUBJECTS.includes(subject);
  const examLabel = isIB ? `${getSubjectLabel(subject)} · May 2027` : 'LC Business · 08/06/2026';
  const stats: { label: string; main: number | string; unit: string; sub: string; warn?: boolean; isStreak?: boolean }[] = [
    { label: 'Lessons completed',   main: totalCompleted,    unit: '',  sub: `of ${totalLessons} lessons` },
    { label: 'Sessions completed',  main: totalSessions,     unit: '',  sub: `≈ ${timeHrs} hrs invested` },
    { label: 'This week',           main: thisWeek,          unit: '',  sub: passed ? 'sessions logged' : `target: ${neededPerWeek ?? 0}/wk` },
    { label: 'Sessions/wk needed',  main: passed ? '—' : (neededPerWeek ?? 0), unit: '',  sub: passed ? 'exam has passed' : `${Math.round(weeksToExam(subject))} weeks to exam`, warn: !passed && (neededPerWeek ?? 0) > 10 },
    { label: '4-wk avg / week',     main: avgPerWeek,        unit: '',  sub: paceConf.label.toLowerCase(), warn: pace === 'behind' },
    { label: 'Days to exam',        main: passed ? 'Passed' : examDays, unit: passed ? '' : 'd', sub: examLabel },
    { label: 'Study streak',        main: streak,            unit: 'd', sub: streak === 1 ? 'day in a row' : 'days in a row', isStreak: true },
    { label: 'Weak areas',          main: weakAreasCount,    unit: '',  sub: weakAreasCount === 0 ? 'none flagged' : `${tutorName} is tracking`, warn: weakAreasCount > 0 },
  ];
  return (
    <div className="stats stats-8">
      {stats.map(({ label, main, unit, sub, warn, isStreak }) => (
        <div key={label} className="stat-card">
          <div className="lbl">{label}</div>
          <div className={`val${isStreak ? ' streak' : ''}`}>
            {main}{unit && <span className="small">{unit}</span>}
          </div>
          <div className={`hint${warn ? ' warn' : ''}`}>{sub}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Curriculum progress — Stage 2b ──────────────────────────────────────────

function CurriculumProgress({ units, currentUnitCode, unitsCompleted, curriculumPercent, totalCompleted, totalLessons }: {
  units: Unit[]; currentUnitCode: string; unitsCompleted: string[];
  curriculumPercent: number; totalCompleted: number; totalLessons: number;
}) {
  return (
    <div className="curr">
      <div className="curr-hd">
        <h3>Curriculum progress</h3>
        <span className="of">{totalCompleted} / {totalLessons} lessons</span>
      </div>
      <div className="curr-bar">
        <div className="fill" style={{ width: `${curriculumPercent}%` }} />
      </div>
      <div className="curr-list">
        {units.map(unit => {
          const isCompleted = unitsCompleted.includes(unit.code);
          const isCurrent = unit.code === currentUnitCode && !isCompleted;
          return (
            <div key={unit.code} className={`curr-row${isCompleted ? ' done' : isCurrent ? ' current' : ''}`}>
              <span className="dot" />
              <span>{unit.name}</span>
              {isCurrent && <span className="count">Current</span>}
              {isCompleted && <span className="count">Done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weak areas — Stage 2b ───────────────────────────────────────────────────

function WeakAreasSection({ weakAreas, nameMap }: { weakAreas: WeakArea[]; nameMap?: Record<string, string> }) {
  if (!weakAreas.length) return null;
  return (
    <div className="weak-card">
      <h3>Weak areas to watch</h3>
      {weakAreas.map(w => {
        const lessonName = (w.lesson_code && nameMap?.[w.lesson_code]) || null;
        return (
          <div key={w.id} className="weak-row">
            <div className="weak-icn">!</div>
            <div>
              <div className="weak-desc">{w.error_description}</div>
              <div className="weak-meta">
                {lessonName ?? w.lesson_code}
                {w.occurrence_count > 1 ? ` · flagged ${w.occurrence_count}×` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Recent sessions — Stage 2b ──────────────────────────────────────────────

function RecentSessions({ sessions, nameMap }: { sessions: RecentSession[]; nameMap?: Record<string, string> }) {
  if (!sessions.length) return null;
  const shown = sessions.slice(0, 5);
  return (
    <div className="sess-list">
      <h3>Recent sessions</h3>
      {shown.map(s => {
        const name = (s.lesson_code && nameMap?.[s.lesson_code]) || s.lesson_code || '—';
        return (
          <div key={s.id} className="sess-row">
            <span className="num">#{s.session_number}</span>
            <div>
              <span className="topic">{name}</span>
              <span className="tag">{sessionLabel(s.session_type)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {s.weak_flags_count > 0 && <span className="warn-flag">⚠ {s.weak_flags_count}</span>}
              <span className="date">{formatDateShort(s.started_at)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────────
// All selectors are prefixed with .ib-dash so this cannot affect DashboardClient.tsx
// (LC dashboard) or any other page. Pattern mirrors the IB landing page (.ib-lp).

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400;1,9..144,500&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

/* ── Design-system foundation ── */
.ib-dash {
  --paper:       oklch(96.2% 0.012 78);
  --paper-2:     oklch(93.5% 0.015 78);
  --paper-3:     oklch(89% 0.018 78);
  --ink:         oklch(18% 0.012 60);
  --ink-2:       oklch(34% 0.012 60);
  --ink-3:       oklch(54% 0.012 60);
  --rule:        oklch(86% 0.014 78);
  --rule-strong: oklch(74% 0.018 78);
  --forest:      oklch(22% 0.035 168);
  --forest-2:    oklch(28% 0.04 168);
  --forest-deep: oklch(16% 0.028 168);
  --forest-ink:  oklch(94% 0.025 80);
  --rust:        oklch(64% 0.17 47);
  --rust-2:      oklch(58% 0.17 47);
  --rust-ink:    oklch(98% 0.01 70);
  --gold:        oklch(70% 0.14 75);
  --gold-2:      oklch(64% 0.15 75);
  --gold-ink:    oklch(20% 0.02 80);
  --green-ok:    oklch(48% 0.13 145);
  --serif:       "Fraunces", "Times New Roman", Georgia, serif;
  --sans:        "Geist", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --mono:        "Geist Mono", ui-monospace, "JetBrains Mono", Menlo, monospace;

  font-family: var(--sans);
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink);
  background: var(--paper);
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
}
.ib-dash *, .ib-dash *::before, .ib-dash *::after { box-sizing: border-box; }
.ib-dash img, .ib-dash svg { display: block; max-width: 100%; }
.ib-dash a { color: inherit; text-decoration: none; }
.ib-dash button { font: inherit; cursor: pointer; }

/* ── Nav ── */
.ib-dash .app-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--paper);
  border-bottom: 1px solid var(--rule);
  padding: 0 28px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ib-dash .app-nav img { height: 22px; width: auto; }
.ib-dash .app-nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--ink-2);
}
.ib-dash .app-btn {
  padding: 7px 14px;
  border: 1px solid var(--rule-strong);
  border-radius: 999px;
  font-size: 13px;
  color: var(--ink);
  background: var(--paper);
  font-family: var(--sans);
  transition: background 0.15s ease;
}
.ib-dash .app-btn:hover { background: var(--paper-2); }
.ib-dash .app-btn-cta {
  background: var(--rust);
  color: var(--rust-ink);
  border-color: var(--rust);
  font-weight: 600;
}
.ib-dash .app-btn-cta:hover { background: var(--rust-2); border-color: var(--rust-2); }
.ib-dash .app-btn-ghost {
  padding: 7px 14px;
  border: 0;
  background: transparent;
  color: var(--ink-2);
  font-size: 13px;
  font-family: var(--sans);
}
.ib-dash .app-btn-ghost:hover { color: var(--ink); }

/* ── Page shell ── */
.ib-dash .app-wrap {
  max-width: 880px;
  margin: 0 auto;
  padding: 56px 28px 80px;
}

/* ── Page heading ── */
.ib-dash .page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}
.ib-dash .page-head h1 {
  font-family: var(--serif);
  font-size: clamp(40px, 5vw, 56px);
  font-weight: 400;
  letter-spacing: -0.025em;
  line-height: 1.02;
  margin: 0;
  color: var(--forest);
  max-width: 14ch;
}
.ib-dash .page-head h1 em { font-style: italic; }
.ib-dash .page-head .sub {
  margin-top: 12px;
  font-size: 14px;
  color: var(--ink-3);
}

/* ── View toggle ── */
.ib-dash .view-toggle {
  display: inline-flex;
  padding: 4px;
  background: var(--paper);
  border: 1px solid var(--rule);
  border-radius: 10px;
  flex-shrink: 0;
}
.ib-dash .view-toggle button {
  appearance: none;
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-3);
  padding: 8px 16px;
  border-radius: 7px;
  cursor: pointer;
  font-family: var(--sans);
  transition: background 0.15s, color 0.15s;
}
.ib-dash .view-toggle button[aria-pressed="true"] {
  background: var(--paper-2);
  color: var(--ink);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* ── Subject tabs (Bundle only) ── */
.ib-dash .subj-tabs {
  display: inline-flex;
  padding: 4px;
  background: color-mix(in oklab, var(--paper-2) 80%, var(--paper));
  border: 1px solid var(--rule);
  border-radius: 10px;
  margin-bottom: 28px;
}
.ib-dash .subj-tabs button {
  appearance: none;
  border: 0;
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-3);
  padding: 8px 18px;
  border-radius: 7px;
  cursor: pointer;
  font-family: var(--sans);
}
.ib-dash .subj-tabs button[aria-pressed="true"] {
  background: var(--paper);
  color: var(--forest);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

/* ── Footer ── */
.ib-dash .app-footer {
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 28px 48px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-3);
  border-top: 1px solid var(--rule);
}
.ib-dash .app-footer a {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
  color: inherit;
}

/* ── Stage 2a: Session / hero cards ── */

.ib-dash .next-session {
  background: var(--forest-deep);
  color: var(--forest-ink);
  border: 1px solid var(--forest);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}
.ib-dash .next-session .ns-label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--gold);
  margin-bottom: 14px;
}
.ib-dash .next-session h2 {
  font-family: var(--serif);
  font-size: 36px;
  font-weight: 400;
  letter-spacing: -0.015em;
  line-height: 1.1;
  color: var(--forest-ink);
  margin: 0 0 6px;
}
.ib-dash .next-session .ns-meta {
  font-size: 13px;
  color: color-mix(in oklab, var(--forest-ink) 65%, transparent);
}
.ib-dash .next-session .start-btn {
  flex-shrink: 0;
  background: var(--gold);
  color: var(--gold-ink);
  font-weight: 500;
  font-size: 15px;
  padding: 14px 24px;
  border: 0;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  text-decoration: none;
  font-family: var(--sans);
  transition: background 0.15s;
}
.ib-dash .next-session .start-btn:hover { background: var(--gold-2); }
.ib-dash .next-session .right-meta {
  flex-shrink: 0;
  text-align: right;
  font-size: 12px;
  color: color-mix(in oklab, var(--forest-ink) 55%, transparent);
}
.ib-dash .next-session .right-meta .em {
  display: block;
  font-family: var(--serif);
  font-size: 22px;
  font-style: italic;
  color: var(--forest-ink);
  margin-top: 2px;
}

.ib-dash .last-session {
  border: 1px solid var(--rule);
  border-radius: 14px;
  overflow: hidden;
  background: var(--paper);
  margin-bottom: 28px;
}
.ib-dash .last-session-hd {
  background: var(--forest);
  color: var(--forest-ink);
  padding: 14px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}
.ib-dash .last-session-hd .ls-label {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--forest-ink);
}
.ib-dash .last-session-hd .ls-pill {
  background: var(--rust);
  color: var(--rust-ink);
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-family: var(--mono);
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.ib-dash .last-session-body {
  padding: 22px 24px;
}
.ib-dash .last-session-body h3 {
  font-family: var(--serif);
  font-size: 22px;
  font-weight: 400;
  letter-spacing: -0.012em;
  margin: 0 0 8px;
  color: var(--ink);
}
.ib-dash .last-session-body .ls-apply {
  font-size: 12px;
  color: var(--ink-3);
  margin-bottom: 10px;
}
.ib-dash .last-session-body .ls-apply strong {
  color: var(--forest);
  font-weight: 500;
}
.ib-dash .last-session-body .ls-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  margin-bottom: 12px;
}
.ib-dash .last-session-body .ls-chip {
  font-size: 11.5px;
  background: var(--paper-2);
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 3px 10px;
  color: var(--ink-3);
}
.ib-dash .last-session-body .ls-ok {
  font-size: 13px;
  color: var(--green-ok);
  display: flex;
  align-items: center;
  gap: 6px;
}
.ib-dash .last-session-body .ls-warn {
  font-size: 13px;
  color: var(--rust);
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Clickable variant — wraps the card in an <a> */
.ib-dash .last-session.last-session-link {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.ib-dash .last-session.last-session-link:hover {
  border-color: var(--rule-strong);
  box-shadow: 0 2px 10px rgba(0,0,0,0.06);
}
.ib-dash .last-session.last-session-link:active {
  background: var(--paper-2);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border-color: var(--rule-strong);
}
.ib-dash .last-session-hd .ls-arrow {
  font-family: var(--mono);
  font-size: 12px;
  color: color-mix(in oklab, var(--forest-ink) 55%, transparent);
}

/* ── Stage 2b: Data cards ── */

.ib-dash .alert {
  display: flex; align-items: flex-start; gap: 14px;
  background: color-mix(in oklab, var(--gold) 18%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--gold) 45%, var(--rule));
  border-radius: 12px; padding: 16px 20px; margin-bottom: 22px;
}
.ib-dash .alert.alert-ahead {
  background: color-mix(in oklab, var(--green-ok) 10%, var(--paper));
  border-color: color-mix(in oklab, var(--green-ok) 28%, var(--rule));
}
.ib-dash .alert.alert-on-track {
  background: color-mix(in oklab, var(--forest) 6%, var(--paper));
  border-color: color-mix(in oklab, var(--forest) 18%, var(--rule));
}
.ib-dash .alert.alert-no-data { background: var(--paper-2); border-color: var(--rule); }
.ib-dash .alert .icn {
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--gold); color: var(--gold-ink);
  display: grid; place-items: center;
  font-size: 11px; font-weight: 600; flex-shrink: 0; margin-top: 2px;
}
.ib-dash .alert.alert-ahead .icn { background: var(--green-ok); color: var(--paper); }
.ib-dash .alert.alert-on-track .icn { background: var(--forest); color: var(--forest-ink); }
.ib-dash .alert.alert-no-data .icn { background: var(--ink-3); color: var(--paper); }
.ib-dash .alert p { margin: 0; font-size: 13.5px; color: var(--ink); line-height: 1.5; }
.ib-dash .alert b { font-weight: 500; }

.ib-dash .week-track {
  border: 1px solid var(--rule); border-radius: 14px;
  padding: 22px 24px; background: var(--paper); margin-bottom: 16px;
}
.ib-dash .week-track-hd {
  display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px;
}
.ib-dash .week-track-hd .wt-title { font-size: 14px; font-weight: 500; color: var(--ink); }
.ib-dash .week-track-hd .wt-sub { font-size: 12px; color: var(--ink-3); }
.ib-dash .days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; }
.ib-dash .day { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ib-dash .day .box {
  width: 100%; height: 44px; border-radius: 8px;
  background: var(--paper-2); border: 1px solid var(--rule);
  display: grid; place-items: center; color: var(--ink-3); font-size: 14px;
}
.ib-dash .day .box.active { background: var(--forest); border-color: var(--forest); color: var(--gold); }
.ib-dash .day .wt-lbl {
  font-family: var(--mono); font-size: 10px;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-3);
}

.ib-dash .stats { display: grid; gap: 12px; margin-bottom: 28px; }
.ib-dash .stats-4 { grid-template-columns: repeat(4, 1fr); }
.ib-dash .stats-8 { grid-template-columns: repeat(4, 1fr); }
.ib-dash .stat-card {
  background: var(--paper); border: 1px solid var(--rule); border-radius: 14px; padding: 20px;
}
.ib-dash .stat-card .lbl {
  font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 10px;
}
.ib-dash .stat-card .val {
  font-family: var(--serif); font-size: 38px; font-weight: 400;
  letter-spacing: -0.02em; line-height: 1; color: var(--ink);
}
.ib-dash .stat-card .val.streak { color: var(--green-ok); font-style: italic; }
.ib-dash .stat-card .val .small {
  font-size: 0.55em; color: var(--ink-3);
  font-family: var(--mono); letter-spacing: 0; margin-left: 2px; font-style: normal;
}
.ib-dash .stat-card .hint { margin-top: 8px; font-size: 11.5px; color: var(--ink-3); }
.ib-dash .stat-card .hint.warn { color: var(--rust); }

.ib-dash .curr {
  border: 1px solid var(--rule); border-radius: 14px;
  padding: 22px 24px; background: var(--paper); margin-bottom: 16px;
}
.ib-dash .curr-hd { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
.ib-dash .curr-hd h3 {
  font-family: var(--serif); font-size: 22px; font-weight: 400;
  letter-spacing: -0.012em; margin: 0; color: var(--ink);
}
.ib-dash .curr-hd .of { font-size: 12px; color: var(--ink-3); }
.ib-dash .curr-bar {
  height: 4px; background: var(--paper-3); border-radius: 999px; overflow: hidden; margin-bottom: 18px;
}
.ib-dash .curr-bar .fill { height: 100%; background: var(--rust); border-radius: inherit; transition: width 0.5s ease; }
.ib-dash .curr-list { display: flex; flex-direction: column; }
.ib-dash .curr-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px dashed var(--rule); font-size: 14px; color: var(--ink-2);
}
.ib-dash .curr-row:last-child { border-bottom: 0; }
.ib-dash .curr-row .dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
  background: var(--paper-3); border: 1px solid var(--rule-strong);
}
.ib-dash .curr-row.done .dot { background: var(--green-ok); border-color: var(--green-ok); }
.ib-dash .curr-row.current { color: var(--ink); font-weight: 500; }
.ib-dash .curr-row.current .dot { background: var(--rust); border-color: var(--rust); }
.ib-dash .curr-row .count { margin-left: auto; font-family: var(--mono); font-size: 11px; color: var(--ink-3); }

.ib-dash .weak-card {
  border: 1px solid var(--rule); border-radius: 14px;
  padding: 22px 24px; background: var(--paper); margin-bottom: 16px;
}
.ib-dash .weak-card h3 {
  font-family: var(--serif); font-size: 22px; font-weight: 400;
  letter-spacing: -0.012em; margin: 0 0 14px; color: var(--ink);
}
.ib-dash .weak-row {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 12px 0; border-bottom: 1px dashed var(--rule);
}
.ib-dash .weak-row:last-child { border-bottom: 0; }
.ib-dash .weak-icn {
  width: 18px; height: 18px; border-radius: 50%; flex-shrink: 0; margin-top: 2px;
  background: color-mix(in oklab, var(--gold) 25%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--gold) 40%, var(--rule));
  display: grid; place-items: center; font-size: 11px; font-weight: 600;
  color: color-mix(in oklab, var(--gold-2) 80%, var(--ink));
}
.ib-dash .weak-desc { font-size: 13.5px; color: var(--ink); line-height: 1.45; }
.ib-dash .weak-meta { margin-top: 3px; font-family: var(--mono); font-size: 11px; color: var(--ink-3); }

.ib-dash .sess-list {
  border: 1px solid var(--rule); border-radius: 14px;
  padding: 22px 24px; background: var(--paper); margin-bottom: 16px;
}
.ib-dash .sess-list h3 {
  font-family: var(--serif); font-size: 22px; font-weight: 400;
  letter-spacing: -0.012em; margin: 0 0 12px; color: var(--ink);
}
.ib-dash .sess-row {
  display: grid; grid-template-columns: 40px 1fr auto; gap: 14px;
  align-items: center; padding: 13px 0; border-bottom: 1px dashed var(--rule); font-size: 13.5px;
}
.ib-dash .sess-row:last-child { border-bottom: 0; }
.ib-dash .sess-row .num { font-family: var(--mono); font-size: 12px; color: var(--ink-3); }
.ib-dash .sess-row .topic { font-family: var(--mono); font-size: 12.5px; color: var(--ink); }
.ib-dash .sess-row .tag {
  display: inline-block; padding: 2px 8px;
  background: color-mix(in oklab, var(--rust) 14%, transparent);
  color: var(--rust); font-family: var(--mono); font-size: 10.5px;
  letter-spacing: 0.04em; border-radius: 999px; margin-left: 8px;
}
.ib-dash .sess-row .warn-flag { font-family: var(--mono); font-size: 11px; color: var(--rust); }
.ib-dash .sess-row .date { font-size: 12px; color: var(--ink-3); }

.ib-dash .ib-empty {
  border: 1px dashed var(--rule-strong); border-radius: 14px; padding: 22px 24px;
  text-align: center; font-size: 13px; color: var(--ink-3);
  margin-bottom: 28px; background: var(--paper-2);
}

.ib-dash .ib-inline-banner {
  border-radius: 10px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; line-height: 1.5;
}
.ib-dash .ib-inline-banner.recall {
  background: color-mix(in oklab, var(--forest) 8%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--forest) 20%, var(--rule));
  color: var(--forest);
}
.ib-dash .ib-inline-banner.abq {
  background: color-mix(in oklab, var(--rust) 8%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--rust) 20%, var(--rule));
  color: var(--rust-2);
}

/* ── Mobile ── */
@media (max-width: 760px) {
  .ib-dash .app-nav { padding: 0 14px; height: 56px; }
  .ib-dash .app-nav img { height: 18px; }
  .ib-dash .app-nav-right { gap: 8px; }
  .ib-dash .app-nav-right > span:first-child { display: none; }
  .ib-dash .app-btn { padding: 6px 10px; font-size: 12px; min-height: 44px; }
  .ib-dash .app-btn-ghost { padding: 6px 4px; font-size: 12px; min-height: 44px; }
  .ib-dash .app-wrap { padding: 32px 18px 60px; }
  .ib-dash .page-head { gap: 16px; }
  .ib-dash .page-head h1 { font-size: clamp(36px, 9vw, 44px); max-width: none; }
  .ib-dash .view-toggle { align-self: flex-start; }
  .ib-dash .subj-tabs { width: 100%; overflow-x: auto; }
  .ib-dash .next-session { flex-direction: column; align-items: stretch; padding: 24px; gap: 16px; }
  .ib-dash .next-session h2 { font-size: 28px; }
  .ib-dash .next-session .start-btn { width: 100%; justify-content: center; }
  .ib-dash .next-session .right-meta { text-align: left; }
  .ib-dash .last-session-hd { padding: 12px 18px; gap: 8px; flex-wrap: wrap; }
  .ib-dash .last-session-body { padding: 20px; }
  .ib-dash .last-session-body h3 { font-size: 20px; }
  .ib-dash .stats-4 { grid-template-columns: repeat(2, 1fr); }
  .ib-dash .stats-8 { grid-template-columns: repeat(2, 1fr); }
  .ib-dash .stat-card { padding: 16px; }
  .ib-dash .stat-card .val { font-size: 32px; }
  .ib-dash .days { gap: 6px; }
  .ib-dash .day .box { height: 38px; }
  .ib-dash .day .wt-lbl { font-size: 11px; }
  .ib-dash .week-track { padding: 18px; }
  .ib-dash .curr { padding: 18px; }
  .ib-dash .curr-hd h3 { font-size: 20px; }
  .ib-dash .sess-list { padding: 18px; }
  .ib-dash .sess-list h3 { font-size: 20px; }
  .ib-dash .sess-row { grid-template-columns: 32px 1fr auto; gap: 10px; }
  .ib-dash .alert { padding: 14px 16px; gap: 10px; }
  .ib-dash .alert p { font-size: 13px; }
  .ib-dash .view-toggle button { min-height: 44px; }
  .ib-dash .subj-tabs button { min-height: 44px; }
  .ib-dash .app-footer a { padding: 12px 0; display: block; text-align: center; }
}
@media (max-width: 480px) {
  .ib-dash .page-head h1 { font-size: 34px; }
  .ib-dash .stats-4 { grid-template-columns: repeat(2, 1fr); }
  .ib-dash .stats-8 { grid-template-columns: repeat(2, 1fr); }
  .ib-dash .stat-card .val { font-size: 28px; }
}

/* ── Course picker ── */
.ib-dash .picker-browse-btn {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 20px; background: var(--paper); border: 1px solid var(--rule);
  border-radius: 14px; cursor: pointer; font-family: var(--sans);
  font-size: 14px; font-weight: 500; color: var(--ink-2); text-align: left;
  margin-bottom: 8px; transition: background 0.15s, color 0.15s;
}
.ib-dash .picker-browse-btn:hover { background: var(--paper-2); color: var(--ink); }
.ib-dash .picker-browse-btn.open {
  background: var(--paper-2); border-color: var(--rule-strong); color: var(--ink);
  border-radius: 14px 14px 0 0; margin-bottom: 0; border-bottom: 0;
}
.ib-dash .picker-browse-chevron {
  font-size: 10px; color: var(--ink-3); transition: transform 0.18s; flex-shrink: 0;
}
.ib-dash .picker-browse-btn.open .picker-browse-chevron { transform: rotate(90deg); }

.ib-dash .picker-tree {
  border: 1px solid var(--rule-strong); border-radius: 0 0 14px 14px;
  background: var(--paper); overflow: hidden; margin-bottom: 16px;
}
.ib-dash .picker-browse-btn:not(.open) + .picker-tree { display: none; }

.ib-dash .picker-unit-hd {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 18px; background: var(--forest);
  cursor: pointer; border: none; border-top: 1px solid var(--forest-deep);
  width: 100%; text-align: left; font-family: var(--sans); transition: background 0.12s;
}
.ib-dash .picker-unit:first-child .picker-unit-hd { border-top: none; }
.ib-dash .picker-unit-hd:hover { background: var(--forest-2); }
.ib-dash .picker-chevron {
  color: color-mix(in oklab, var(--forest-ink) 55%, transparent);
  font-size: 10px; flex-shrink: 0; transition: transform 0.18s;
}
.ib-dash .picker-chevron.open { transform: rotate(90deg); }
.ib-dash .picker-chevron.small { color: var(--ink-3); font-size: 9px; }
.ib-dash .picker-unit-name {
  font-family: var(--serif); font-size: 14.5px; font-weight: 400;
  color: var(--forest-ink); flex: 1; line-height: 1.25;
}
.ib-dash .picker-review-dot {
  width: 5px; height: 5px; border-radius: 50%; background: var(--rust); flex-shrink: 0;
}
.ib-dash .picker-unit-meta {
  display: flex; align-items: center; gap: 8px; flex-shrink: 0;
}
.ib-dash .picker-unit-bar {
  width: 52px; height: 3px;
  background: color-mix(in oklab, var(--forest-ink) 18%, transparent);
  border-radius: 999px; overflow: hidden;
}
.ib-dash .picker-unit-bar-fill {
  height: 100%; background: var(--gold); border-radius: inherit; transition: width 0.3s ease;
}
.ib-dash .picker-unit-count {
  font-family: var(--mono); font-size: 10px;
  color: color-mix(in oklab, var(--forest-ink) 60%, transparent); white-space: nowrap;
}

.ib-dash .picker-topic-hd {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 18px 9px 32px;
  background: color-mix(in oklab, var(--paper-2) 60%, var(--paper));
  border: none; border-top: 1px solid var(--rule);
  width: 100%; text-align: left; font-family: var(--sans); cursor: pointer;
  transition: background 0.12s;
}
.ib-dash .picker-topic-hd:hover { background: var(--paper-2); }
.ib-dash .picker-topic-code {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.05em; color: var(--ink-3);
  background: var(--paper-3); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
}
.ib-dash .picker-topic-sep {
  color: var(--rule-strong); font-size: 12px; flex-shrink: 0; user-select: none;
}
.ib-dash .picker-topic-name {
  flex: 1; font-size: 13px; color: var(--ink-2); line-height: 1.3; text-align: left;
}
.ib-dash .picker-topic-count {
  font-family: var(--mono); font-size: 10px; color: var(--ink-3); flex-shrink: 0;
}
.ib-dash .picker-topic-review-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: color-mix(in oklab, var(--gold) 70%, var(--rust)); flex-shrink: 0;
}

.ib-dash .picker-lesson {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px 10px 48px;
  border-top: 1px solid var(--rule); cursor: pointer; background: var(--paper);
  transition: background 0.1s; outline: none;
}
.ib-dash .picker-lesson:hover { background: color-mix(in oklab, var(--paper-2) 70%, var(--paper)); }
.ib-dash .picker-lesson:focus-visible { outline: 2px solid var(--forest); outline-offset: -2px; }
.ib-dash .picker-lesson.current { background: color-mix(in oklab, var(--rust) 5%, var(--paper)); }
.ib-dash .picker-lesson.current:hover { background: color-mix(in oklab, var(--rust) 10%, var(--paper)); }
.ib-dash .picker-marker {
  font-size: 12px; flex-shrink: 0; width: 14px; text-align: center; line-height: 1;
}
.ib-dash .picker-marker.done { color: var(--green-ok); }
.ib-dash .picker-marker.here { color: var(--rust); }
.ib-dash .picker-marker.todo { color: var(--rule-strong); }
.ib-dash .picker-lesson-name {
  flex: 1; font-size: 13px; color: var(--ink-2); line-height: 1.35;
}
.ib-dash .picker-lesson.current .picker-lesson-name { color: var(--ink); font-weight: 500; }
.ib-dash .picker-weak-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--gold-2); flex-shrink: 0;
}
.ib-dash .picker-lesson-cta {
  font-family: var(--mono); font-size: 10px; color: var(--ink-3);
  letter-spacing: 0.03em; flex-shrink: 0; opacity: 0; transition: opacity 0.12s;
}
.ib-dash .picker-lesson:hover .picker-lesson-cta { opacity: 1; }
.ib-dash .picker-lesson.current .picker-lesson-cta { color: var(--rust); opacity: 1; }

@media (max-width: 760px) {
  .ib-dash .picker-lesson { padding-left: 38px; }
  .ib-dash .picker-topic-hd { padding-left: 24px; }
  .ib-dash .picker-lesson-cta { opacity: 1; }
}

/* ── Picker search ── */
.ib-dash .picker-search {
  padding: 14px 18px;
  border-bottom: 1px solid var(--rule);
  background: var(--paper);
}
.ib-dash .picker-search-input {
  width: 100%;
  padding: 9px 14px;
  border: 1px solid var(--rule-strong);
  border-radius: 8px;
  background: var(--paper-2);
  font-family: var(--sans);
  font-size: 13.5px;
  color: var(--ink);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  transition: border-color 0.15s, background 0.15s;
}
.ib-dash .picker-search-input:focus {
  border-color: color-mix(in oklab, var(--forest) 38%, var(--rule));
  background: var(--paper);
}
.ib-dash .picker-search-input::placeholder { color: var(--ink-3); }
.ib-dash .picker-search-input::-webkit-search-cancel-button { cursor: pointer; }

/* Search result rows — flat list, reuses .picker-lesson + adds context line */
.ib-dash .picker-result {
  align-items: flex-start;
  padding-left: 18px;
}
.ib-dash .picker-result .picker-marker { margin-top: 1px; flex-shrink: 0; }
.ib-dash .picker-result-body { flex: 1; min-width: 0; }
.ib-dash .picker-result-ctx {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.04em;
  color: var(--ink-3); margin-top: 2px;
}

/* Empty search state */
.ib-dash .picker-empty {
  padding: 22px 18px;
  font-size: 13px;
  color: var(--ink-3);
  text-align: center;
  border-top: 1px solid var(--rule);
}

/* ── Student view: compact page heading ── */
.ib-dash .page-head.page-head-compact h1 {
  font-size: clamp(24px, 3vw, 32px);
}
.ib-dash .page-head.page-head-compact .sub { margin-top: 6px; }

/* ── Browse section (first-class secondary action) ── */
.ib-dash .browse-section { margin-bottom: 28px; }
.ib-dash .browse-hd {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 18px 22px;
  background: color-mix(in oklab, var(--gold) 6%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--gold) 24%, var(--rule));
  border-radius: 14px;
  cursor: pointer; font-family: var(--sans); text-align: left;
  transition: background 0.15s, border-color 0.15s;
}
.ib-dash .browse-hd:hover { background: color-mix(in oklab, var(--gold) 11%, var(--paper)); }
.ib-dash .browse-hd.open {
  border-radius: 14px 14px 0 0; border-bottom: 0;
  background: color-mix(in oklab, var(--gold) 11%, var(--paper));
}
.ib-dash .browse-title {
  font-family: var(--serif); font-size: 18px; font-weight: 400;
  letter-spacing: -0.012em; color: var(--ink); line-height: 1.2;
}
.ib-dash .browse-sub { margin-top: 3px; font-size: 12px; color: var(--ink-3); }
.ib-dash .browse-chevron {
  font-size: 10px; color: var(--ink-3); transition: transform 0.18s; flex-shrink: 0;
}
.ib-dash .browse-hd.open .browse-chevron { transform: rotate(90deg); }
.ib-dash .browse-section .picker-tree { margin-bottom: 0; border-top: 0; }

/* ── Context divider ── */
.ib-dash .context-divider {
  font-family: var(--mono); font-size: 10.5px; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--ink-3);
  display: flex; align-items: center; gap: 12px; margin: 8px 0 16px;
}
.ib-dash .context-divider::before, .ib-dash .context-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--rule);
}

/* ── Last session: compact in student view ── */
.ib-dash .ls-compact .last-session { margin-bottom: 16px; }
.ib-dash .ls-compact .last-session-hd { padding: 10px 18px; }
.ib-dash .ls-compact .last-session-body { padding: 16px 20px; }
.ib-dash .ls-compact .last-session-body h3 { font-size: 18px; }

/* ── Mini stat cards (student view context row) ── */
.ib-dash .stats-mini .stat-card { padding: 14px 16px; }
.ib-dash .stats-mini .stat-card .val { font-size: 28px; }
.ib-dash .stats-mini .stat-card .lbl { margin-bottom: 6px; }

@media (max-width: 760px) {
  .ib-dash .browse-hd { padding: 14px 18px; }
  .ib-dash .browse-title { font-size: 16px; }
  .ib-dash .page-head.page-head-compact h1 { font-size: clamp(22px, 6vw, 28px); }
}
`;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IBDashboardClient(props: Props) {
  const [mode, setMode]           = useState<ViewMode>('student');
  const [showPicker, setShowPicker] = useState(false);

  const subject = props.subject ?? 'LC_BUSINESS';
  const effectiveSubject = (subject === 'IB_BUNDLE')
    ? (props.activeSubject ?? 'IB_ECONOMICS')
    : subject;
  const tutorName = getTutorName(effectiveSubject);
  const subjectLabel = getSubjectLabel(effectiveSubject);

  const lessonNameMap: Record<string, string> = Object.fromEntries(
    (props.pickerLessons ?? []).map(l => [l.lesson_code, l.lesson_name])
  );

  const streak = calcStreak(props.recentSessions);
  const thisWeek = sessionsThisWeek(props.recentSessions);
  const examDays = daysToExam(effectiveSubject);
  const neededPerWeek = sessionsPerWeekNeeded(props.totalCompleted, props.totalLessons, effectiveSubject);
  const avgPerWeek = avgSessionsPerWeek(props.recentSessions);
  const pace = calcPace(avgPerWeek, neededPerWeek);

  const emptyState = (
    <div className="ib-empty">
      Your first session summary will appear here after completing a session with {tutorName}.
    </div>
  );

  return (
    <div className="ib-dash">
      <style>{CSS}</style>
      <Nav studentName={props.studentName} subscriptionStatus={props.subscriptionStatus} />
      <main className="app-wrap">

        {/* Page heading */}
        <div className={`page-head${mode === 'student' ? ' page-head-compact' : ''}`} style={{ marginBottom: props.isBundle ? 12 : (mode === 'student' ? 20 : 40) }}>
          <div>
            <h1>
              {/* Name fallback: student_name is empty for accounts created without signup
                  metadata (magic-link / admin-seeded). Root cause banked for Phase 2
                  (name capture for non-onboarded accounts). */}
              {mode === 'student'
                ? (props.studentName
                    ? <>Good to see you, <em style={{ color: 'var(--rust)' }}>{props.studentName}.</em></>
                    : <>Good to see you.</>)
                : (props.studentName
                    ? <><em style={{ color: 'var(--rust)' }}>{props.studentName}&apos;s</em> progress.</>
                    : <>Your progress.</>)
              }
            </h1>
            <div className="sub">
              {subjectLabel} · {props.examLevel} · Session {props.sessionNumber}
            </div>
          </div>
          <Toggle mode={mode} onChange={setMode} />
        </div>

        {/* Subject switcher — Bundle only */}
        {props.isBundle && <SubjectSwitcher active={effectiveSubject} />}

        {/* PARENT VIEW */}
        {mode === 'parent' && (
          <>
            <PaceBanner pace={pace} avg={avgPerWeek} needed={neededPerWeek} studentName={props.studentName} />
            <ParentPositionCard currentLessonName={props.currentLessonName} currentUnitName={props.currentUnitName} sessionType={props.sessionType} lastSession={props.lastSession} />
            {props.lastSession ? <LastSessionCard s={props.lastSession} /> : emptyState}
            <ActivityStrip sessions={props.recentSessions} />
            <StatGrid
              curriculumPercent={props.curriculumPercent} totalCompleted={props.totalCompleted}
              totalLessons={props.totalLessons} totalSessions={props.totalSessions}
              weakAreasCount={props.weakAreasCount} streak={streak} thisWeek={thisWeek}
              examDays={examDays} neededPerWeek={neededPerWeek} avgPerWeek={avgPerWeek} pace={pace}
              subject={effectiveSubject} tutorName={tutorName}
            />
            <CurriculumProgress units={props.units} currentUnitCode={props.currentUnitCode} unitsCompleted={props.unitsCompleted} curriculumPercent={props.curriculumPercent} totalCompleted={props.totalCompleted} totalLessons={props.totalLessons} />
            <WeakAreasSection weakAreas={props.weakAreas} nameMap={lessonNameMap} />
            <RecentSessions sessions={props.recentSessions} nameMap={lessonNameMap} />
          </>
        )}

        {/* STUDENT VIEW */}
        {mode === 'student' && (
          <>
            {/* 1. Continue — dominant primary action */}
            <StudentHeroCard currentLessonName={props.currentLessonName} currentUnitName={props.currentUnitName} sessionType={props.sessionType} spaced_rep_due={props.spaced_rep_due} abq_drill_due={props.abq_drill_due} />

            {/* 2. Browse — first-class secondary section, directly below Continue */}
            {(props.pickerLessons?.length ?? 0) > 0 && (
              <div className="browse-section">
                <button
                  className={`browse-hd${showPicker ? ' open' : ''}`}
                  onClick={() => setShowPicker(v => !v)}
                >
                  <div>
                    <div className="browse-title">Jump to any topic</div>
                    <div className="browse-sub">{props.totalLessons} lessons — pick any topic to study</div>
                  </div>
                  <span className="browse-chevron">▶</span>
                </button>
                {showPicker && (
                  <CoursePicker
                    lessons={props.pickerLessons ?? []}
                    completedCodes={props.pickerCompletedCodes ?? []}
                    weakAreaCodes={props.pickerWeakAreaCodes ?? []}
                    currentLessonCode={props.currentLessonCode}
                    examLevel={props.examLevel}
                  />
                )}
              </div>
            )}

            {/* 3. Supporting context — demoted below the two study actions */}
            <div className="context-divider">Recent activity</div>

            {props.lastSession ? (
              <>
                <div className="ls-compact">
                  <LastSessionCard s={props.lastSession} href={`/sessions/${props.lastSession.id}`} />
                </div>
                <div style={{ textAlign: 'right', marginTop: -4, marginBottom: 12 }}>
                  <Link href="/sessions" style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.04em', color: 'var(--ink-3)', textDecoration: 'none' }}>
                    View all sessions →
                  </Link>
                </div>
              </>
            ) : emptyState}

            {props.spaced_rep_due && (
              <div className="ib-inline-banner recall">
                🔁 {tutorName} will start today with a quick recall block — locking in recent material before moving forward.
              </div>
            )}
            {props.abq_drill_due && (
              <div className="ib-inline-banner abq">
                📄 ABQ drill due today — one of the highest-value things you can do for your exam grade.
              </div>
            )}

            {/* 4. Stats — context row, not headline. Lessons count replaces demoralising 0% */}
            <div className="stats stats-4 stats-mini" style={{ marginTop: 8 }}>
              {([
                { label: 'Lessons',  main: props.totalCompleted, unit: '',  sub: `of ${props.totalLessons}` },
                { label: 'Sessions', main: props.totalSessions,  unit: '',  sub: '' },
                { label: 'Streak',   main: streak,               unit: 'd', sub: '', isStreak: true },
                { label: 'To exam',  main: examDays,             unit: 'd', sub: '' },
              ] as { label: string; main: number; unit: string; sub: string; isStreak?: boolean }[]).map(({ label, main, unit, sub, isStreak }) => (
                <div key={label} className="stat-card">
                  <div className="lbl">{label}</div>
                  <div className={`val${isStreak ? ' streak' : ''}`}>
                    {main}{unit && <span className="small">{unit}</span>}
                  </div>
                  {sub && <div className="hint">{sub}</div>}
                </div>
              ))}
            </div>
          </>
        )}

      </main>
      <footer className="app-footer">
        <a href="/subscribe/manage">Manage subscription</a>
      </footer>
    </div>
  );
}
