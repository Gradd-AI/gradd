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

function daysToExam(subject?: string) {
  const date = subject && IB_SUBJECTS.includes(subject) ? IB_EXAM_DATE : LC_EXAM_DATE;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}
function weeksToExam(subject?: string) { return Math.max(0.5, daysToExam(subject) / 7); }

function sessionsPerWeekNeeded(totalCompleted: number, totalLessons: number, subject?: string): number {
  return Math.ceil(Math.max(0, totalLessons - totalCompleted) / weeksToExam(subject));
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

type Pace = 'on-track' | 'behind' | 'ahead' | 'no-data';
function calcPace(avg: number, needed: number): Pace {
  if (avg === 0) return 'no-data';
  const r = avg / needed;
  if (r >= 1.1) return 'ahead';
  if (r >= 0.85) return 'on-track';
  return 'behind';
}
const PACE_CONF: Record<Pace, { label: string; color: string; bg: string; border: string }> = {
  'ahead':    { label: 'Ahead of pace',  color: '#1e7e44', bg: '#f0faf4', border: '#b7e4c7' },
  'on-track': { label: 'On track',       color: '#1a4a7a', bg: '#f0f7ff', border: '#c3daf5' },
  'behind':   { label: 'Falling behind', color: '#7a5c00', bg: '#fffbf0', border: '#e8d89a' },
  'no-data':  { label: 'No data yet',    color: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--border)' },
};

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ studentName }: { studentName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [logoSrc, setLogoSrc] = useState('/gradd-logo.svg');
  useEffect(() => {
    if (resolveIsIBClient()) setLogoSrc('/gradd-ai-logo.png');
  }, []);
  const [portalLoading, setPortalLoading] = useState(false);

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
        <button
          className="app-btn"
          onClick={handleManageSubscription}
          disabled={portalLoading}
          style={{ cursor: portalLoading ? 'not-allowed' : 'pointer', opacity: portalLoading ? 0.6 : 1 }}
        >
          {portalLoading ? 'Opening…' : 'Manage subscription'}
        </button>
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

function LastSessionCard({ s }: { s: LastSession }) {
  return (
    <div className="last-session">
      <div className="last-session-hd">
        <span className="ls-label">Last session · {formatDate(s.started_at)}</span>
        <span className="ls-pill">{sessionLabel(s.session_type)}</span>
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
    </div>
  );
}

// ─── Activity strip (unchanged — Stage 2) ────────────────────────────────────

function ActivityStrip({ sessions }: { sessions: RecentSession[] }) {
  const days = last7Days(sessions);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Last 7 days</h3>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{days.filter(d => d.had).length} of 7 days active</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {days.map(({ label, had }) => (
          <div key={label} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{
              height: 36, borderRadius: 6, marginBottom: 6,
              background: had ? 'var(--brand)' : 'var(--surface-2)',
              border: `1px solid ${had ? 'var(--brand-mid)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {had && <span style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: had ? 'var(--text)' : 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pace banner (unchanged — Stage 2) ───────────────────────────────────────

function PaceBanner({ pace, avg, needed, studentName }: { pace: Pace; avg: number; needed: number; studentName: string }) {
  const conf = PACE_CONF[pace];
  let msg = '';
  if (pace === 'no-data') msg = `${studentName} hasn't completed enough sessions to assess pace yet. Target is ${needed} sessions per week.`;
  else if (pace === 'ahead') msg = `Averaging ${avg}/week against a target of ${needed}. ${studentName} is ahead of pace — exam preparation is on track.`;
  else if (pace === 'on-track') msg = `Averaging ${avg}/week against a target of ${needed}. ${studentName} is on track to complete the curriculum before the exam.`;
  else msg = `Averaging ${avg}/week but need ${needed} to stay on track. ${studentName} needs to pick up the pace — ${needed - avg} more session${(needed - avg) !== 1 ? 's' : ''}/week required.`;
  return (
    <div style={{ background: conf.bg, border: `1px solid ${conf.border}`, borderRadius: 'var(--radius-sm)', padding: '12px 18px', marginBottom: 20, fontSize: 14, color: conf.color, fontWeight: 500 }}>
      {msg}
    </div>
  );
}

// ─── Stat grid (unchanged — Stage 2) ─────────────────────────────────────────

function StatGrid({ curriculumPercent, totalCompleted, totalLessons, totalSessions, weakAreasCount, streak, thisWeek, examDays, neededPerWeek, avgPerWeek, pace, subject, tutorName }: {
  curriculumPercent: number; totalCompleted: number; totalLessons: number; totalSessions: number;
  weakAreasCount: number; streak: number; thisWeek: number; examDays: number;
  neededPerWeek: number; avgPerWeek: number; pace: Pace; subject?: string; tutorName: string;
}) {
  const timeHrs = Math.round((totalSessions * 45) / 60 * 10) / 10;
  const paceConf = PACE_CONF[pace];
  const isIB = subject && IB_SUBJECTS.includes(subject);
  const examLabel = isIB
    ? `${getSubjectLabel(subject)} · May 2027`
    : 'LC Business · 08/06/2026';
  const stats = [
    { label: 'Curriculum progress', value: `${curriculumPercent}%`, sub: `${totalCompleted} of ${totalLessons} lessons` },
    { label: 'Sessions completed', value: totalSessions, sub: `≈ ${timeHrs} hrs invested` },
    { label: 'This week', value: thisWeek, sub: `target: ${neededPerWeek}/wk` },
    { label: 'Sessions/wk needed', value: neededPerWeek, sub: `${Math.round(weeksToExam(subject))} weeks to exam`, warn: neededPerWeek > 10 },
    { label: '4-wk avg / week', value: avgPerWeek, sub: paceConf.label.toLowerCase(), accent: pace === 'ahead' || pace === 'on-track', warn: pace === 'behind' },
    { label: 'Days to exam', value: examDays, sub: examLabel },
    { label: 'Study streak', value: `${streak}d`, sub: streak === 1 ? 'day in a row' : 'days in a row', accent: streak >= 3 },
    { label: 'Weak areas', value: weakAreasCount, sub: weakAreasCount === 0 ? 'none flagged' : `${tutorName} is tracking`, warn: weakAreasCount > 0 },
  ];
  return (
    <div className="dash-stat-grid">
      {stats.map(({ label, value, sub, warn, accent }) => (
        <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: warn ? '#a07000' : accent ? 'var(--success)' : 'var(--brand)', lineHeight: 1, marginBottom: 4 }}>{value}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Curriculum progress (unchanged — Stage 2) ───────────────────────────────

function CurriculumProgress({ units, currentUnitCode, unitsCompleted, curriculumPercent, totalCompleted, totalLessons }: {
  units: Unit[]; currentUnitCode: string; unitsCompleted: string[];
  curriculumPercent: number; totalCompleted: number; totalLessons: number;
}) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Curriculum progress</h3>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{totalCompleted} / {totalLessons} lessons</span>
      </div>
      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ height: '100%', width: `${curriculumPercent}%`, background: 'var(--brand)', borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {units.map(unit => {
          const isCompleted = unitsCompleted.includes(unit.code);
          const isCurrent = unit.code === currentUnitCode && !isCompleted;
          return (
            <div key={unit.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: isCurrent ? 'var(--brand)' : 'transparent' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--border)' }}>
                {isCompleted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, color: isCurrent ? '#fff' : isCompleted ? 'var(--text)' : 'var(--text-light)', fontWeight: isCurrent || isCompleted ? 600 : 400 }}>{unit.name}</span>
              {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current</span>}
              {isCompleted && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Weak areas (unchanged — Stage 2) ────────────────────────────────────────

function WeakAreasSection({ weakAreas }: { weakAreas: WeakArea[] }) {
  if (!weakAreas.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', marginBottom: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Weak areas to watch</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {weakAreas.map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbf0', border: '1px solid #e8d89a', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f5e49a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7a5c00', flexShrink: 0, marginTop: 1 }}>!</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{w.error_description}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Lesson {w.lesson_code}{w.occurrence_count > 1 ? ` · flagged ${w.occurrence_count}×` : ''}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent sessions (unchanged — Stage 2) ───────────────────────────────────

function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  if (!sessions.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', marginBottom: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Recent sessions</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {sessions.map(s => (
          <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', minWidth: 28 }}>#{s.session_number}</span>
              <div>
                <span style={{ fontSize: 14, color: 'var(--text)' }}>{s.lesson_code ?? '—'}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>{sessionLabel(s.session_type)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {s.weak_flags_count > 0 && <span style={{ fontSize: 12, color: '#7a5c00', fontWeight: 600 }}>⚠ {s.weak_flags_count}</span>}
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{formatDateShort(s.started_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scoped CSS ───────────────────────────────────────────────────────────────
// All selectors are prefixed with .ib-dash so this cannot affect DashboardClient.tsx
// (LC dashboard) or any other page. Pattern mirrors the IB landing page (.ib-lp).

const CSS = `
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
  text-align: center;
  padding: 40px 0;
  font-size: 12px;
  color: var(--ink-3);
}
.ib-dash .app-footer a {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1px;
  color: inherit;
}

/* ── Stat grid (layout only — card internals unchanged until Stage 2) ── */
.ib-dash .dash-stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 28px;
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

/* ── Mobile ── */
@media (max-width: 760px) {
  .ib-dash .app-nav { padding: 0 14px; height: 56px; }
  .ib-dash .app-nav img { height: 18px; }
  .ib-dash .app-nav-right { gap: 8px; }
  .ib-dash .app-nav-right > span:first-child { display: none; }
  .ib-dash .app-btn { padding: 6px 10px; font-size: 12px; }
  .ib-dash .app-btn-ghost { padding: 6px 4px; font-size: 12px; }
  .ib-dash .app-wrap { padding: 32px 18px 60px; }
  .ib-dash .page-head { gap: 16px; }
  .ib-dash .page-head h1 { font-size: clamp(36px, 9vw, 44px); max-width: none; }
  .ib-dash .view-toggle { align-self: flex-start; }
  .ib-dash .subj-tabs { width: 100%; overflow-x: auto; }
  .ib-dash .dash-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .ib-dash .next-session { flex-direction: column; align-items: stretch; padding: 24px; gap: 16px; }
  .ib-dash .next-session h2 { font-size: 28px; }
  .ib-dash .next-session .start-btn { width: 100%; justify-content: center; }
  .ib-dash .next-session .right-meta { text-align: left; }
  .ib-dash .last-session-hd { padding: 12px 18px; gap: 8px; flex-wrap: wrap; }
  .ib-dash .last-session-body { padding: 20px; }
  .ib-dash .last-session-body h3 { font-size: 20px; }
}
@media (max-width: 480px) {
  .ib-dash .page-head h1 { font-size: 34px; }
  .ib-dash .dash-stat-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .ib-dash .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
}
`;

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function IBDashboardClient(props: Props) {
  const [mode, setMode] = useState<ViewMode>('parent');

  const subject = props.subject ?? 'LC_BUSINESS';
  const effectiveSubject = (subject === 'IB_BUNDLE')
    ? (props.activeSubject ?? 'IB_ECONOMICS')
    : subject;
  const tutorName = getTutorName(effectiveSubject);
  const subjectLabel = getSubjectLabel(effectiveSubject);

  const streak = calcStreak(props.recentSessions);
  const thisWeek = sessionsThisWeek(props.recentSessions);
  const examDays = daysToExam(effectiveSubject);
  const neededPerWeek = sessionsPerWeekNeeded(props.totalCompleted, props.totalLessons, effectiveSubject);
  const avgPerWeek = avgSessionsPerWeek(props.recentSessions);
  const pace = calcPace(avgPerWeek, neededPerWeek);

  const emptyState = (
    <div style={{ background: 'var(--surface-2)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Your first session summary will appear here after completing a session with {tutorName}.
    </div>
  );

  return (
    <div className="ib-dash">
      <style>{CSS}</style>
      <Nav studentName={props.studentName} />
      <main className="app-wrap">

        {/* Page heading */}
        <div className="page-head" style={{ marginBottom: props.isBundle ? 12 : 40 }}>
          <div>
            <h1>
              {mode === 'student'
                ? <>Good to see you, <em style={{ color: 'var(--rust)' }}>{props.studentName}.</em></>
                : <><em style={{ color: 'var(--rust)' }}>{props.studentName}&apos;s</em> progress.</>
              }
            </h1>
            <div className="sub">
              {subjectLabel} · {props.examLevel} · Session {props.sessionNumber} completed
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
            <WeakAreasSection weakAreas={props.weakAreas} />
            <RecentSessions sessions={props.recentSessions} />
          </>
        )}

        {/* STUDENT VIEW */}
        {mode === 'student' && (
          <>
            <StudentHeroCard currentLessonName={props.currentLessonName} currentUnitName={props.currentUnitName} sessionType={props.sessionType} spaced_rep_due={props.spaced_rep_due} abq_drill_due={props.abq_drill_due} />
            {props.lastSession ? <LastSessionCard s={props.lastSession} /> : emptyState}
            {props.spaced_rep_due && (
              <div style={{ background: '#f0f7ff', border: '1px solid #c3daf5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1a4a7a', marginBottom: 16 }}>
                🔁 {tutorName} will start today with a quick recall block — locking in recent material before moving forward.
              </div>
            )}
            {props.abq_drill_due && (
              <div style={{ background: '#f5f0ff', border: '1px solid #d5c3f5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#3a1a7a', marginBottom: 16 }}>
                📄 ABQ drill due today — one of the highest-value things you can do for your exam grade.
              </div>
            )}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 8 }}>
              {[
                { label: 'Progress', value: `${props.curriculumPercent}%` },
                { label: 'Sessions', value: props.totalSessions },
                { label: 'Streak', value: `${streak}d` },
                { label: 'To exam', value: `${examDays}d` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', textAlign: 'center' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--brand)', lineHeight: 1 }}>{value}</p>
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
