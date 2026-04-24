// components/dashboard/DashboardClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  currentLessonCode: string; currentLessonName: string;
  currentUnitName: string; currentUnitCode: string; sessionType: string;
  curriculumPercent: number; totalCompleted: number; totalLessons: number;
  totalSessions: number; weakAreasCount: number; unitsCompleted: string[];
  units: Unit[]; recentSessions: RecentSession[]; weakAreas: WeakArea[];
  lastSession: LastSession | null; spaced_rep_due: boolean; abq_drill_due: boolean;
}

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

const EXAM_DATE = new Date('2026-06-08T09:00:00');
function daysToExam() { return Math.max(0, Math.ceil((EXAM_DATE.getTime() - Date.now()) / 86400000)); }
function weeksToExam() { return Math.max(0.5, daysToExam() / 7); }

function sessionsPerWeekNeeded(totalCompleted: number, totalLessons: number): number {
  return Math.ceil(Math.max(0, totalLessons - totalCompleted) / weeksToExam());
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
  return (
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: 'var(--brand)', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>G</div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--brand)' }}>Gradd</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{studentName}</span>
        <button onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
          Sign out
        </button>
      </div>
    </nav>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

type ViewMode = 'parent' | 'student';
function Toggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
      {(['parent', 'student'] as ViewMode[]).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          background: mode === m ? 'var(--surface)' : 'transparent',
          color: mode === m ? 'var(--text)' : 'var(--text-muted)',
          boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
        }}>
          {m === 'parent' ? 'Parent view' : 'My view'}
        </button>
      ))}
    </div>
  );
}

// ─── Hero cards ───────────────────────────────────────────────────────────────

function StudentHeroCard({ currentLessonName, currentUnitName, sessionType, spaced_rep_due, abq_drill_due }: {
  currentLessonName: string; currentUnitName: string; sessionType: string;
  spaced_rep_due: boolean; abq_drill_due: boolean;
}) {
  return (
    <div style={{ background: 'var(--brand)', borderRadius: 'var(--radius-lg)', padding: '32px 40px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
      <div>
        <p style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
          {spaced_rep_due ? '🔁 Recall + New Topic' : abq_drill_due ? '📄 ABQ Drill due' : 'Next session'}
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.3px' }}>{currentLessonName}</h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{currentUnitName} · {sessionType}</p>
      </div>
      <Link href="/session" style={{ background: 'var(--accent)', color: '#fff', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 15, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
        Start session →
      </Link>
    </div>
  );
}

function ParentPositionCard({ currentLessonName, currentUnitName, sessionType, lastSession }: {
  currentLessonName: string; currentUnitName: string; sessionType: string; lastSession: LastSession | null;
}) {
  return (
    <div style={{ background: 'var(--brand)', borderRadius: 'var(--radius-lg)', padding: '28px 36px', marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Currently studying</p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4, letterSpacing: '-0.3px' }}>{currentLessonName}</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{currentUnitName} · {sessionType}</p>
        </div>
        {lastSession && (
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Last active</p>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 600 }}>{formatDateShort(lastSession.started_at)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Last session card ────────────────────────────────────────────────────────

function LastSessionCard({ s }: { s: LastSession }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ background: 'var(--brand-light)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.65)' }}>Last session</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{formatDate(s.started_at)}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(200,151,46,0.25)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 99 }}>{sessionLabel(s.session_type)}</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: 2 }}>{s.lesson_name ?? s.lesson_code ?? '—'}</p>
        {s.apply_scores && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Apply score: <strong style={{ color: 'var(--brand)' }}>{s.apply_scores}</strong></p>}
        {s.concepts_covered.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 12 }}>
            {s.concepts_covered.map(c => (
              <span key={c} style={{ fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', color: 'var(--text-muted)' }}>{c}</span>
            ))}
          </div>
        )}
        <div style={{ marginTop: 8 }}>
          {s.weak_flags_count > 0
            ? <span style={{ fontSize: 13, fontWeight: 600, color: '#7a5c00' }}>⚠ {s.weak_flags_count} concept{s.weak_flags_count !== 1 ? 's' : ''} to revisit</span>
            : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>✓ All clear — no weak flags</span>}
        </div>
      </div>
    </div>
  );
}

// ─── 7-day activity strip ─────────────────────────────────────────────────────

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

// ─── Pace banner ──────────────────────────────────────────────────────────────

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

// ─── Stat grid ────────────────────────────────────────────────────────────────

function StatGrid({ curriculumPercent, totalCompleted, totalLessons, totalSessions, weakAreasCount, streak, thisWeek, examDays, neededPerWeek, avgPerWeek, pace }: {
  curriculumPercent: number; totalCompleted: number; totalLessons: number; totalSessions: number;
  weakAreasCount: number; streak: number; thisWeek: number; examDays: number;
  neededPerWeek: number; avgPerWeek: number; pace: Pace;
}) {
  const timeHrs = Math.round((totalSessions * 45) / 60 * 10) / 10;
  const paceConf = PACE_CONF[pace];
  const stats = [
    { label: 'Curriculum progress', value: `${curriculumPercent}%`, sub: `${totalCompleted} of ${totalLessons} lessons` },
    { label: 'Sessions completed', value: totalSessions, sub: `≈ ${timeHrs} hrs invested` },
    { label: 'This week', value: thisWeek, sub: `target: ${neededPerWeek}/wk` },
    { label: 'Sessions/wk needed', value: neededPerWeek, sub: `${Math.round(weeksToExam())} weeks to exam`, warn: neededPerWeek > 10 },
    { label: '4-wk avg / week', value: avgPerWeek, sub: paceConf.label.toLowerCase(), accent: pace === 'ahead' || pace === 'on-track', warn: pace === 'behind' },
    { label: 'Days to exam', value: examDays, sub: 'LC Business · 08/06/2026' },
    { label: 'Study streak', value: `${streak}d`, sub: streak === 1 ? 'day in a row' : 'days in a row', accent: streak >= 3 },
    { label: 'Weak areas', value: weakAreasCount, sub: weakAreasCount === 0 ? 'none flagged' : 'Aoife is tracking', warn: weakAreasCount > 0 },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
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

// ─── Curriculum progress ──────────────────────────────────────────────────────

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

// ─── Weak areas ───────────────────────────────────────────────────────────────

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

// ─── Recent sessions ──────────────────────────────────────────────────────────

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

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardClient(props: Props) {
  const [mode, setMode] = useState<ViewMode>('parent');

  const streak = calcStreak(props.recentSessions);
  const thisWeek = sessionsThisWeek(props.recentSessions);
  const examDays = daysToExam();
  const neededPerWeek = sessionsPerWeekNeeded(props.totalCompleted, props.totalLessons);
  const avgPerWeek = avgSessionsPerWeek(props.recentSessions);
  const pace = calcPace(avgPerWeek, neededPerWeek);

  const emptyState = (
    <div style={{ background: 'var(--surface-2)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
      Your first session summary will appear here after completing a session with Aoife.
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav studentName={props.studentName} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              {mode === 'student' ? `Good to see you, ${props.studentName}.` : `${props.studentName}'s progress`}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
              LC Business · {props.examLevel} · Session {props.sessionNumber} completed
            </p>
          </div>
          <Toggle mode={mode} onChange={setMode} />
        </div>

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
                🔁 Aoife will start today with a quick recall block — locking in recent material before moving forward.
              </div>
            )}
            {props.abq_drill_due && (
              <div style={{ background: '#f5f0ff', border: '1px solid #d5c3f5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#3a1a7a', marginBottom: 16 }}>
                📄 ABQ drill due today — one of the highest-value things you can do for your exam grade.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 8 }}>
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
    </div>
  );
}
