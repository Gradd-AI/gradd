// components/dashboard/DashboardClient.tsx
// Client Component — handles parent/student toggle only.
// All data arrives as props from the Server Component.

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Unit { code: string; name: string; }

interface RecentSession {
  id: string;
  session_number: number;
  session_type: string;
  lesson_code: string | null;
  started_at: string;
  ended_at: string | null;
  weak_flags_count: number;
}

interface WeakArea {
  id: string;
  concept_slug: string;
  error_description: string;
  lesson_code: string;
  occurrence_count: number;
}

interface LastSession {
  id: string;
  session_number: number;
  session_type: string;
  lesson_code: string | null;
  lesson_name: string | null;
  concepts_covered: string[];
  weak_flags_count: number;
  started_at: string;
  apply_scores: string | null;
}

interface Props {
  studentName: string;
  examLevel: string;
  sessionNumber: number;
  currentLessonCode: string;
  currentLessonName: string;
  currentUnitName: string;
  currentUnitCode: string;
  sessionType: string;
  curriculumPercent: number;
  totalCompleted: number;
  totalLessons: number;
  totalSessions: number;
  weakAreasCount: number;
  unitsCompleted: string[];
  units: Unit[];
  recentSessions: RecentSession[];
  weakAreas: WeakArea[];
  lastSession: LastSession | null;
  spaced_rep_due: boolean;
  abq_drill_due: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} at ${hh}:${min}`;
}

function sessionLabel(type: string): string {
  const map: Record<string, string> = {
    NEW_TOPIC: 'New Topic', REVISION: 'Revision', EXAM_PRACTICE: 'Exam Practice',
    ABQ_DRILL: 'ABQ Drill', SHORT_Q_DRILL: 'Short Q Drill', UNIT_CHECKPOINT: 'Unit Checkpoint',
  };
  return map[type] ?? type;
}

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]}`;
}

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
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/auth/login'); }}
          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 14px', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >Sign out</button>
      </div>
    </nav>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

type ViewMode = 'student' | 'parent';

function Toggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, gap: 2 }}>
      {(['student', 'parent'] as ViewMode[]).map(m => (
        <button key={m} onClick={() => onChange(m)} style={{
          padding: '6px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          background: mode === m ? 'var(--surface)' : 'transparent',
          color: mode === m ? 'var(--text)' : 'var(--text-muted)',
          boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
        }}>
          {m === 'student' ? 'My view' : 'Parent view'}
        </button>
      ))}
    </div>
  );
}

// ─── Hero card ────────────────────────────────────────────────────────────────

function HeroCard({ currentLessonName, currentUnitName, sessionType, spaced_rep_due, abq_drill_due }: {
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

// ─── Last session card ────────────────────────────────────────────────────────

function LastSessionCard({ s }: { s: LastSession }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ background: 'var(--brand-light)', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.65)' }}>Last session</span>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>·</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{formatDate(s.started_at)}</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(200,151,46,0.25)', color: 'var(--accent)', padding: '2px 10px', borderRadius: 99 }}>{sessionLabel(s.session_type)}</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', marginBottom: 2 }}>{s.lesson_name ?? s.lesson_code ?? '—'}</p>
        {s.apply_scores && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Apply score: <strong style={{ color: 'var(--brand)' }}>{s.apply_scores}</strong></p>}
        {s.concepts_covered.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {s.concepts_covered.map(c => (
              <span key={c} style={{ fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', color: 'var(--text-muted)' }}>{c}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {s.weak_flags_count > 0
            ? <span style={{ fontSize: 13, fontWeight: 600, color: '#7a5c00' }}>⚠ {s.weak_flags_count} concept{s.weak_flags_count !== 1 ? 's' : ''} to revisit</span>
            : <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>✓ All clear — no weak flags</span>
          }
        </div>
      </div>
    </div>
  );
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

function StatCards({ curriculumPercent, totalCompleted, totalLessons, totalSessions, weakAreasCount, unitsCompleted }: {
  curriculumPercent: number; totalCompleted: number; totalLessons: number;
  totalSessions: number; weakAreasCount: number; unitsCompleted: string[];
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
      {[
        { label: 'Curriculum progress', value: `${curriculumPercent}%`, sub: `${totalCompleted} of ${totalLessons} lessons` },
        { label: 'Sessions completed', value: totalSessions, sub: 'total sessions' },
        { label: 'Weak areas flagged', value: weakAreasCount, sub: 'active flags', warn: weakAreasCount > 0 },
      ].map(({ label, value, sub, warn }) => (
        <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px 28px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: warn ? '#a07000' : 'var(--brand)', lineHeight: 1, marginBottom: 6 }}>{value}</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Curriculum progress section ──────────────────────────────────────────────

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {units.map(unit => {
          const isCompleted = unitsCompleted.includes(unit.code);
          const isCurrent = unit.code === currentUnitCode && !isCompleted;
          return (
            <div key={unit.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: isCurrent ? 'var(--brand)' : 'transparent' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--accent)' : 'var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isCompleted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
              </div>
              <span style={{ fontSize: 14, color: isCurrent ? '#fff' : isCompleted ? 'var(--text)' : 'var(--text-light)', fontWeight: isCurrent || isCompleted ? 600 : 400 }}>
                {unit.name}
              </span>
              {isCurrent && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current</span>}
              {isCompleted && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Done</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recent sessions section ──────────────────────────────────────────────────

function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  if (sessions.length === 0) return null;
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {s.weak_flags_count > 0 && (
                <span style={{ fontSize: 12, color: '#7a5c00', fontWeight: 600 }}>⚠ {s.weak_flags_count}</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--text-light)' }}>{formatDateShort(s.started_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Weak areas section ───────────────────────────────────────────────────────

function WeakAreasSection({ weakAreas }: { weakAreas: WeakArea[] }) {
  if (weakAreas.length === 0) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '28px 32px', marginBottom: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Weak areas to watch</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {weakAreas.map(w => (
          <div key={w.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fffbf0', border: '1px solid #e8d89a', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f5e49a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#7a5c00', flexShrink: 0, marginTop: 1 }}>!</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{w.error_description}</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Lesson {w.lesson_code}{w.occurrence_count > 1 ? ` · flagged ${w.occurrence_count}×` : ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function DashboardClient(props: Props) {
  const [mode, setMode] = useState<ViewMode>('student');
  const { studentName, examLevel, sessionNumber } = props;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Nav studentName={studentName} />
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.5px', marginBottom: 6 }}>
              {mode === 'student' ? `Good to see you, ${studentName}.` : `${studentName}'s progress`}
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
              LC Business · {examLevel} · Session {sessionNumber} completed
            </p>
          </div>
          <Toggle mode={mode} onChange={setMode} />
        </div>

        {/* Hero card — both views */}
        <HeroCard
          currentLessonName={props.currentLessonName}
          currentUnitName={props.currentUnitName}
          sessionType={props.sessionType}
          spaced_rep_due={props.spaced_rep_due}
          abq_drill_due={props.abq_drill_due}
        />

        {/* Last session — both views */}
        {props.lastSession
          ? <LastSessionCard s={props.lastSession} />
          : (
            <div style={{ background: 'var(--surface-2)', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)', padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
              Your first session summary will appear here after you complete a session with Aoife.
            </div>
          )
        }

        {/* Student view stops here */}
        {mode === 'student' && (
          <>
            {props.spaced_rep_due && (
              <div style={{ background: '#f0f7ff', border: '1px solid #c3daf5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1a4a7a', marginBottom: 16 }}>
                🔁 Aoife will start today with a quick recall block — a few questions from recent sessions to lock the material in.
              </div>
            )}
            {props.abq_drill_due && (
              <div style={{ background: '#f5f0ff', border: '1px solid #d5c3f5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#3a1a7a', marginBottom: 16 }}>
                📄 ABQ drill due today — one of the highest-value things you can do for your exam grade.
              </div>
            )}
          </>
        )}

        {/* Parent view — full stats + progress + sessions + weak areas */}
        {mode === 'parent' && (
          <>
            <StatCards
              curriculumPercent={props.curriculumPercent}
              totalCompleted={props.totalCompleted}
              totalLessons={props.totalLessons}
              totalSessions={props.totalSessions}
              weakAreasCount={props.weakAreasCount}
              unitsCompleted={props.unitsCompleted}
            />
            <CurriculumProgress
              units={props.units}
              currentUnitCode={props.currentUnitCode}
              unitsCompleted={props.unitsCompleted}
              curriculumPercent={props.curriculumPercent}
              totalCompleted={props.totalCompleted}
              totalLessons={props.totalLessons}
            />
            <WeakAreasSection weakAreas={props.weakAreas} />
            <RecentSessions sessions={props.recentSessions} />
          </>
        )}

      </main>
    </div>
  );
}
