// components/dashboard/ParentStudentDashboard.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import SessionSummaryCard, { SessionSummaryCardEmpty } from '@/components/dashboard/SessionSummaryCard'
import { DashboardData } from '@/hooks/useDashboardData'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sessionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    NEW_TOPIC: 'New Topic', REVISION: 'Revision', EXAM_PRACTICE: 'Exam Practice',
    ABQ_DRILL: 'ABQ Drill', SHORT_Q_DRILL: 'Short Q Drill', UNIT_CHECKPOINT: 'Unit Checkpoint',
  }
  return map[type] ?? type
}

function encouragingCopy(percent: number, completed: number, total: number): string {
  if (percent === 0) return 'Just getting started — every expert was once a beginner.'
  if (percent < 20) return `Off to a strong start. ${completed} lessons in and building momentum.`
  if (percent < 50) return `Good progress — ${completed} of ${total} lessons complete. Keep the sessions consistent.`
  if (percent < 80) return `Over halfway through the Business course. Excellent consistency.`
  return `Nearly exam-ready. ${completed} of ${total} lessons complete.`
}

// ─── Toggle ─────────────────────────────────────────────────────────────────

type ViewMode = 'parent' | 'student'

function Toggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="view-toggle">
      {(['parent', 'student'] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={`view-toggle-btn${mode === m ? ' active' : ''}`}
        >
          {m === 'parent' ? 'Parent view' : 'Student view'}
        </button>
      ))}
    </div>
  )
}

// ─── Parent view ─────────────────────────────────────────────────────────────

function ParentView({ d }: { d: DashboardData }) {
  const { progress, curriculumPercent, totalLessonsCompleted, totalLessons, sessionsThisWeek, weakAreasCount, weakAreas, recentSessions, lastSession } = d

  return (
    <div>
      <div className="dashboard-banner">
        {encouragingCopy(curriculumPercent, totalLessonsCompleted, totalLessons)}
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Curriculum complete</div>
          <div className="stat-value accent">{curriculumPercent}%</div>
          <div className="stat-sub">{totalLessonsCompleted} / {totalLessons} lessons</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Sessions this week</div>
          <div className="stat-value">{sessionsThisWeek}</div>
          <div className="stat-sub">Mon – today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Weak areas active</div>
          <div className={`stat-value${weakAreasCount > 0 ? ' warn' : ' accent'}`}>{weakAreasCount}</div>
          <div className="stat-sub">{weakAreasCount === 0 ? 'None flagged' : 'Aoife is tracking'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Units completed</div>
          <div className="stat-value">{(progress?.units_completed ?? []).length}</div>
          <div className="stat-sub">of 7 units</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="dash-section">
        <div className="dash-card dash-card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Overall curriculum progress</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>{curriculumPercent}%</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${curriculumPercent}%` }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            Currently in: <strong style={{ color: 'var(--text)' }}>{progress?.current_unit_name ?? '—'}</strong>
          </div>
        </div>
      </div>

      {/* Last session */}
      <div className="dash-section">
        <div className="dash-section-label">Last session</div>
        {lastSession && progress
          ? <SessionSummaryCard lastSession={lastSession} progress={progress} />
          : <SessionSummaryCardEmpty />}
      </div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label">
            Active weak areas{weakAreasCount > 5 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — showing top 5 of {weakAreasCount}</span>}
          </div>
          {weakAreas.map((w) => (
            <div key={w.id} className="weak-flag-row">
              <div className="weak-flag-icon">!</div>
              <div>
                <div className="weak-flag-desc">{w.error_description}</div>
                <div className="weak-flag-meta">
                  Lesson {w.lesson_code}{w.occurrence_count > 1 ? ` · flagged ${w.occurrence_count}×` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="dash-section">
          <div className="dash-section-label">Recent sessions</div>
          <div className="sessions-list">
            {recentSessions.map((s) => (
              <div key={s.id} className="session-row">
                <div className="session-row-left">
                  <span className="session-row-date">{formatDateShort(s.started_at)}</span>
                  <span className="session-row-lesson">{s.lesson_code ?? '—'}</span>
                  <span className="session-row-type">{sessionTypeLabel(s.session_type)}</span>
                </div>
                {s.weak_flags_count > 0 ? (
                  <span style={{ fontSize: 12, color: '#7a5c00', fontWeight: 600 }}>
                    <span className="session-flag-dot" />
                    {s.weak_flags_count} flag{s.weak_flags_count !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="session-ok">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Student view ─────────────────────────────────────────────────────────────

function StudentView({ d }: { d: DashboardData }) {
  const { progress, lastSession, curriculumPercent, totalLessonsCompleted, totalLessons } = d

  return (
    <div>
      <div className="student-lesson-card">
        <div className="student-working-label">You&apos;re working on</div>
        <div className="student-lesson-title">{progress?.current_lesson_name ?? '—'}</div>
        <div className="student-lesson-unit">{progress?.current_unit_name}</div>

        <div className="progress-meta">
          <span>Overall progress</span>
          <span className="progress-pct">{curriculumPercent}%</span>
        </div>
        <div className="progress-bar-wrap">
          <div className="progress-bar-fill" style={{ width: `${curriculumPercent}%` }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, marginTop: 6 }}>
          {totalLessonsCompleted} of {totalLessons} lessons complete
        </p>

        <Link href="/session" className="btn btn-primary btn-full">
          Start session with Aoife →
        </Link>
      </div>

      <div className="dash-section">
        <div className="dash-section-label">Last session</div>
        {lastSession && progress
          ? <SessionSummaryCard lastSession={lastSession} progress={progress} />
          : <SessionSummaryCardEmpty />}
      </div>

      {progress?.spaced_rep_due && (
        <div className="nudge-banner nudge-recall">
          🔁 Aoife will kick off today&apos;s session with a quick recall block — a few questions from recent lessons to lock the material in.
        </div>
      )}
      {progress?.abq_drill_due && (
        <div className="nudge-banner nudge-abq">
          📄 ABQ drill due — today&apos;s session includes Applied Business Question practice. One of the highest-value things you can do for your exam grade.
        </div>
      )}
    </div>
  )
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ height: 40, width: 180 }} />
      <div className="skeleton" style={{ height: 52, borderRadius: 12 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
      <div className="skeleton" style={{ height: 160, borderRadius: 12 }} />
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ParentStudentDashboard({
  dashboardData: d,
  studentName,
}: {
  dashboardData: DashboardData
  studentName: string
}) {
  const [mode, setMode] = useState<ViewMode>('parent')

  if (d.loading) return <LoadingSkeleton />

  if (d.error) {
    return (
      <div className="alert alert-error" style={{ borderRadius: 12, padding: '20px 24px' }}>
        Couldn&apos;t load dashboard data. Refresh to try again.
        <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>{d.error}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <div className="dashboard-title">
            {mode === 'parent' ? `${studentName}'s progress` : `Hi ${studentName} 👋`}
          </div>
          <div className="dashboard-subtitle">
            {mode === 'parent' ? 'LC Business · Gradd' : 'Ready when you are'}
          </div>
        </div>
        <Toggle mode={mode} onChange={setMode} />
      </div>

      {mode === 'parent' ? <ParentView d={d} /> : <StudentView d={d} />}
    </div>
  )
}
