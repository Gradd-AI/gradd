// components/dashboard/SessionSummaryCard.tsx

import { LastSession, StudentProgress } from '@/hooks/useDashboardData'

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

interface SessionSummaryCardProps {
  lastSession: LastSession
  progress: StudentProgress
}

export default function SessionSummaryCard({ lastSession, progress }: SessionSummaryCardProps) {
  return (
    <div className="dash-card">
      <div className="dash-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="dash-card-header-label">Last session</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>·</span>
          <span className="dash-card-header-date">{formatDate(lastSession.started_at)}</span>
        </div>
        <span className="dash-card-header-badge">{sessionTypeLabel(lastSession.session_type)}</span>
      </div>

      <div className="dash-card-body">
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
            Lesson covered
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-display)', letterSpacing: '-0.2px' }}>
            {lastSession.lesson_name ?? lastSession.lesson_code ?? '—'}
          </p>
          {lastSession.apply_scores && (
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Apply score: <strong style={{ color: 'var(--brand)' }}>{lastSession.apply_scores}</strong>
            </p>
          )}
        </div>

        {lastSession.concepts_covered.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 6 }}>
              Concepts covered
            </p>
            <div className="concept-tags">
              {lastSession.concepts_covered.map((c) => (
                <span key={c} className="concept-tag">{c}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
              Weak flags
            </p>
            {lastSession.weak_flags_count > 0 ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: '#7a5c00' }}>
                ⚠ {lastSession.weak_flags_count} concept{lastSession.weak_flags_count !== 1 ? 's' : ''} to revisit
              </p>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)' }}>✓ All clear</p>
            )}
          </div>
          <div style={{ width: 1, background: 'var(--border-light)', flexShrink: 0 }} />
          <div style={{ flex: 2 }}>
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 4 }}>
              Up next
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{progress.current_lesson_name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{progress.current_unit_name}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function SessionSummaryCardEmpty() {
  return <div className="dash-empty">Your first session summary will appear here after you complete a session with Aoife.</div>
}
