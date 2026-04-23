// components/dashboard/ParentStudentDashboard.tsx
// Full dashboard with parent/student toggle.
// Toggle state: React state only, no persistence. Defaults to parent on every mount.
// Parent view: curriculum %, sessions this week, weak areas, recent sessions.
// Student view: current lesson, progress bar, Start Session CTA.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import SessionSummaryCard, {
  SessionSummaryCardEmpty,
} from '@/components/dashboard/SessionSummaryCard'
import { DashboardData } from '@/hooks/useDashboardData'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDateShort(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function sessionTypeLabel(type: string): string {
  const map: Record<string, string> = {
    NEW_TOPIC: 'New Topic',
    REVISION: 'Revision',
    EXAM_PRACTICE: 'Exam Practice',
    ABQ_DRILL: 'ABQ Drill',
    SHORT_Q_DRILL: 'Short Q Drill',
    UNIT_CHECKPOINT: 'Unit Checkpoint',
  }
  return map[type] ?? type
}

// ─── Sub-components ────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
      <div
        className="h-full bg-teal-500 rounded-full transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub?: string
  accent?: 'teal' | 'amber' | 'slate'
}) {
  const valueColour =
    accent === 'amber'
      ? 'text-amber-600'
      : accent === 'teal'
      ? 'text-teal-600'
      : 'text-slate-800'

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${valueColour}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

// ─── Parent View ────────────────────────────────────────────────────────────

function ParentView({ d }: { d: DashboardData }) {
  const { progress, curriculumPercent, totalLessonsCompleted, totalLessons, sessionsThisWeek, weakAreasCount, weakAreas, recentSessions, lastSession } = d

  const encouragingCopy = (): string => {
    if (curriculumPercent === 0) return 'Just getting started — every expert was once a beginner.'
    if (curriculumPercent < 20) return `Off to a strong start. ${totalLessonsCompleted} lessons in and building momentum.`
    if (curriculumPercent < 50) return `Good progress — ${totalLessonsCompleted} of ${totalLessons} lessons complete. Keep the sessions consistent.`
    if (curriculumPercent < 80) return `Over halfway through the Business course. Excellent consistency.`
    return `Excellent — nearly exam-ready. ${totalLessonsCompleted} of ${totalLessons} lessons complete.`
  }

  return (
    <div className="space-y-6">
      {/* Encouraging summary */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4">
        <p className="text-sm font-medium text-teal-800">{encouragingCopy()}</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Curriculum complete"
          value={`${curriculumPercent}%`}
          sub={`${totalLessonsCompleted} / ${totalLessons} lessons`}
          accent="teal"
        />
        <StatCard
          label="Sessions this week"
          value={sessionsThisWeek}
          sub="Mon – today"
          accent="slate"
        />
        <StatCard
          label="Weak areas active"
          value={weakAreasCount}
          sub={weakAreasCount === 0 ? 'None flagged' : 'Aoife is tracking'}
          accent={weakAreasCount > 0 ? 'amber' : 'teal'}
        />
        <StatCard
          label="Units completed"
          value={(progress?.units_completed ?? []).length}
          sub={`of 7 units`}
          accent="slate"
        />
      </div>

      {/* Curriculum progress bar */}
      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Overall curriculum progress</p>
          <span className="text-sm font-semibold text-teal-600">{curriculumPercent}%</span>
        </div>
        <ProgressBar percent={curriculumPercent} />
        <p className="mt-2 text-xs text-slate-400">
          Currently in: <span className="font-medium text-slate-600">{progress?.current_unit_name ?? '—'}</span>
        </p>
      </div>

      {/* Last session summary */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">Last session</h3>
        {lastSession && progress ? (
          <SessionSummaryCard lastSession={lastSession} progress={progress} />
        ) : (
          <SessionSummaryCardEmpty />
        )}
      </div>

      {/* Active weak areas */}
      {weakAreas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            Active weak areas{' '}
            {weakAreasCount > 5 && (
              <span className="text-xs font-normal text-slate-400">
                (showing top 5 of {weakAreasCount})
              </span>
            )}
          </h3>
          <div className="space-y-2">
            {weakAreas.map((w) => (
              <div
                key={w.id}
                className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3"
              >
                <div className="mt-0.5 flex-shrink-0 h-5 w-5 rounded-full bg-amber-200 flex items-center justify-center">
                  <svg
                    className="h-3 w-3 text-amber-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-amber-800 leading-snug">
                    {w.error_description}
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Lesson {w.lesson_code}
                    {w.occurrence_count > 1 && ` · flagged ${w.occurrence_count}×`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions list */}
      {recentSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Recent sessions</h3>
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
                    {formatDateShort(s.started_at)}
                  </span>
                  <span className="text-xs text-slate-600 font-medium truncate">
                    {s.lesson_code ?? '—'}
                  </span>
                  <span className="hidden sm:inline-block text-xs text-slate-400">
                    {sessionTypeLabel(s.session_type)}
                  </span>
                </div>
                {s.weak_flags_count > 0 ? (
                  <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />
                    {s.weak_flags_count} flag{s.weak_flags_count !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span className="flex-shrink-0 text-xs text-emerald-500 font-medium">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Student View ───────────────────────────────────────────────────────────

function StudentView({ d }: { d: DashboardData }) {
  const { progress, lastSession, curriculumPercent, totalLessonsCompleted, totalLessons } = d

  const lessonsInUnit = progress?.lessons_completed_this_unit?.length ?? 0

  // Estimate unit progress: use lessonsInUnit / avg unit size (~22 lessons based on 279 / ~7 units)
  // In practice, could query total lessons in current unit from lessons table.
  // For now, use overall curriculum progress for the bar — clear and honest.

  return (
    <div className="space-y-5">
      {/* Current lesson card */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
            You&apos;re working on
          </p>
          <p className="text-xl font-bold text-slate-900 leading-snug">
            {progress?.current_lesson_name ?? 'Loading…'}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {progress?.current_unit_name}
          </p>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-slate-400">Overall progress</p>
            <p className="text-xs font-semibold text-teal-600">{curriculumPercent}%</p>
          </div>
          <ProgressBar percent={curriculumPercent} />
          <p className="mt-1.5 text-xs text-slate-400">
            {totalLessonsCompleted} of {totalLessons} lessons complete
          </p>
        </div>

        {/* Start session CTA */}
        <Link
          href="/session"
          className="block w-full rounded-xl bg-teal-600 px-4 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:bg-teal-800 transition-colors"
        >
          Start session with Aoife →
        </Link>
      </div>

      {/* Session summary card — compact placement in student view */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 mb-2">Last session</h3>
        {lastSession && progress ? (
          <SessionSummaryCard lastSession={lastSession} progress={progress} />
        ) : (
          <SessionSummaryCardEmpty />
        )}
      </div>

      {/* Spaced rep / ABQ nudges */}
      {progress?.spaced_rep_due && (
        <div className="rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 text-sky-500 flex-shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <p className="text-xs text-sky-700 font-medium">
            Aoife will kick off today&apos;s session with a quick recall block — a few questions from recent lessons to lock the material in.
          </p>
        </div>
      )}

      {progress?.abq_drill_due && (
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 flex items-start gap-3">
          <div className="mt-0.5 text-violet-500 flex-shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-violet-700 font-medium">
            ABQ drill due — today&apos;s session includes an Applied Business Question practice. This is one of the highest-value things you can do for your exam grade.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Toggle ─────────────────────────────────────────────────────────────────

type ViewMode = 'parent' | 'student'

function Toggle({
  mode,
  onChange,
}: {
  mode: ViewMode
  onChange: (m: ViewMode) => void
}) {
  return (
    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1"
      {(['parent', 'student'] as ViewMode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          className={[
            'rounded-lg px-4 py-1.5 text-xs font-semibold transition-all',
            mode === m
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          ].join(' ')}
        >
          {m === 'parent' ? 'Parent view' : 'Student view'}
        </button>
      ))}
    </div>
  )
}

// ─── Loading skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 w-48 bg-slate-200 rounded-lg" />
      <div className="h-24 bg-slate-100 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="h-40 bg-slate-100 rounded-2xl" />
    </div>
  )
}

// ─── Main export ────────────────────────────────────────────────────────────

interface ParentStudentDashboardProps {
  dashboardData: DashboardData
  studentName: string
}

export default function ParentStudentDashboard({
  dashboardData: d,
  studentName,
}: ParentStudentDashboardProps) {
  // Default: parent view on every mount (per spec)
  const [mode, setMode] = useState<ViewMode>('parent')

  if (d.loading) return <LoadingSkeleton />

  if (d.error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 px-5 py-6 text-center">
        <p className="text-sm font-medium text-red-600">
          Couldn&apos;t load dashboard data. Refresh to try again.
        </p>
        <p className="text-xs text-red-400 mt-1">{d.error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row: name + toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {mode === 'parent'
              ? `${studentName}'s progress`
              : `Hi ${studentName} 👋`}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'parent'
              ? 'LC Business · Gradd'
              : 'Ready when you are'}
          </p>
        </div>
        <Toggle mode={mode} onChange={setMode} />
      </div>

      {/* View content */}
      {mode === 'parent' ? (
        <ParentView d={d} />
      ) : (
        <StudentView d={d} />
      )}
    </div>
  )
}
