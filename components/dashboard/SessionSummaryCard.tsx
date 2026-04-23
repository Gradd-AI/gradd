// components/dashboard/SessionSummaryCard.tsx
// Displays the most recently completed session above the Start Session CTA.
// Shown to both parent and student views — positioned differently in each.

import { LastSession, StudentProgress } from '@/hooks/useDashboardData'

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} at ${hh}:${min}`
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

// ─── Props ─────────────────────────────────────────────────────────────────

interface SessionSummaryCardProps {
  lastSession: LastSession
  progress: StudentProgress
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function SessionSummaryCard({
  lastSession,
  progress,
}: SessionSummaryCardProps) {
  const hasWeakFlags = lastSession.weak_flags_count > 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header strip */}
      <div className="bg-teal-600 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/80 text-xs font-medium uppercase tracking-wider">
            Last Session
          </span>
          <span className="text-white/60 text-xs">·</span>
          <span className="text-white/80 text-xs">
            {formatDate(lastSession.started_at)}
          </span>
        </div>
        <span className="inline-flex items-center rounded-full bg-teal-500/40 px-2.5 py-0.5 text-xs font-medium text-white">
          {sessionTypeLabel(lastSession.session_type)}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4 space-y-4">
        {/* Lesson name */}
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
            Lesson covered
          </p>
          <p className="text-base font-semibold text-slate-800 leading-snug">
            {lastSession.lesson_name ?? lastSession.lesson_code ?? '—'}
          </p>
          {lastSession.apply_scores && (
            <p className="text-xs text-slate-500 mt-0.5">
              Apply score: <span className="font-medium text-teal-700">{lastSession.apply_scores}</span>
            </p>
          )}
        </div>

        {/* Concepts covered */}
        {lastSession.concepts_covered.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5">
              Concepts covered
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lastSession.concepts_covered.map((concept) => (
                <span
                  key={concept}
                  className="inline-block rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Weak flags + next lesson — side by side */}
        <div className="flex items-start gap-4 pt-1">
          {/* Weak flags */}
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
              Weak flags
            </p>
            <div className="flex items-center gap-1.5">
              {hasWeakFlags ? (
                <>
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                    {lastSession.weak_flags_count}
                  </span>
                  <span className="text-xs text-amber-700 font-medium">
                    {lastSession.weak_flags_count === 1
                      ? 'concept to revisit'
                      : 'concepts to revisit'}
                  </span>
                </>
              ) : (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  All clear
                </span>
              )}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="w-px self-stretch bg-slate-100" />

          {/* Next lesson */}
          <div className="flex-[2]">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-0.5">
              Up next
            </p>
            <p className="text-xs text-slate-700 font-medium leading-snug">
              {progress.current_lesson_name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {progress.current_unit_name}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── No-session placeholder ─────────────────────────────────────────────────
// Shown when a student has not yet completed any session.

export function SessionSummaryCardEmpty() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-6 text-center">
      <p className="text-sm font-medium text-slate-500">
        Your first session summary will appear here after you complete a session with Aoife.
      </p>
    </div>
  )
}
