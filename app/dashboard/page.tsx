import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: progress }, { data: weakAreas }, { data: recentSessions }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('student_progress').select('*').eq('student_id', user.id).single(),
      supabase
        .from('weak_areas')
        .select('*')
        .eq('student_id', user.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('sessions')
        .select('session_number, session_type, lesson_code, started_at, lesson_complete')
        .eq('student_id', user.id)
        .order('started_at', { ascending: false })
        .limit(5),
    ]);

  if (!profile || !progress) redirect('/login');

  const unitLabels: Record<string, string> = {
    UNIT_1: 'People in Business',
    UNIT_2: 'Business Management',
    UNIT_3: 'Business Management (cont.)',
    UNIT_4A: 'Finance — Accounts',
    UNIT_4B: 'Finance — Ratios',
    UNIT_4C: 'Finance — Cash Flow',
    UNIT_5: 'Domestic Environment',
    UNIT_6: 'International Environment',
    EXAM_PREP: 'Exam Preparation',
  };

  const totalUnits = Object.keys(unitLabels).length;
  const completedUnits = (progress.units_completed as string[])?.length ?? 0;
  const progressPct = Math.round((completedUnits / totalUnits) * 100);

  const sessionTypeLabel: Record<string, string> = {
    NEW_TOPIC: 'New Topic',
    REVISION: 'Revision',
    EXAM_PRACTICE: 'Exam Practice',
    ABQ_DRILL: 'ABQ Drill',
    SHORT_Q_DRILL: 'Short Questions',
    UNIT_CHECKPOINT: 'Unit Checkpoint',
  };

  const nextSessionType = progress.pending_unit_checkpoint
    ? 'Unit Checkpoint'
    : progress.abq_drill_due
    ? 'ABQ Drill'
    : progress.session_type === 'REVISION'
    ? 'Revision'
    : 'New Topic';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top nav */}
      <nav
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 32px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: 'var(--brand)',
              borderRadius: 7,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
              fontFamily: 'var(--font-display)',
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            G
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--brand)',
            }}
          >
            Gradd
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {profile.student_name}
          </span>
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 14px',
                fontSize: 13,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 40 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 32,
              fontWeight: 700,
              color: 'var(--brand)',
              letterSpacing: '-0.5px',
              marginBottom: 6,
            }}
          >
            Good to see you, {profile.student_name}.
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
            LC Business · {profile.exam_level === 'higher' ? 'Higher Level' : 'Ordinary Level'} ·
            Session {progress.session_number ?? 0} completed
          </p>
        </div>

        {/* Start session CTA */}
        <div
          style={{
            background: 'var(--brand)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 40px',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div>
            <p
              style={{
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              Next session
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 4,
                letterSpacing: '-0.3px',
              }}
            >
              {progress.current_lesson_name}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              {unitLabels[progress.current_unit_code]} · {nextSessionType}
            </p>
          </div>
          <Link
            href="/session"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              padding: '14px 32px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Start session →
          </Link>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 20,
            marginBottom: 32,
          }}
        >
          {[
            {
              label: 'Curriculum progress',
              value: `${progressPct}%`,
              sub: `${completedUnits} of ${totalUnits} units complete`,
            },
            {
              label: 'Sessions completed',
              value: progress.total_session_count ?? 0,
              sub: 'total sessions',
            },
            {
              label: 'Weak areas flagged',
              value: weakAreas?.length ?? 0,
              sub: weakAreas?.length === 1 ? 'active flag' : 'active flags',
            },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '24px 28px',
              }}
            >
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--text-light)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                {stat.label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 36,
                  fontWeight: 700,
                  color: 'var(--brand)',
                  lineHeight: 1,
                  marginBottom: 6,
                }}
              >
                {stat.value}
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '28px 32px',
            marginBottom: 32,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16,
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              Curriculum progress
            </h3>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              {completedUnits}/{totalUnits} units
            </span>
          </div>

          <div
            style={{
              height: 8,
              background: 'var(--surface-2)',
              borderRadius: 4,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: 'var(--brand)',
                borderRadius: 4,
                transition: 'width 0.5s ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(unitLabels).map(([code, name]) => {
              const isComplete = (progress.units_completed as string[])?.includes(code);
              const isCurrent = progress.current_unit_code === code;
              return (
                <div
                  key={code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: isCurrent ? 'var(--brand)' : 'transparent',
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: isComplete
                        ? 'var(--success)'
                        : isCurrent
                        ? 'var(--accent)'
                        : 'var(--border)',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isComplete && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d="M1 4L3.5 6.5L9 1"
                          stroke="white"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: 14,
                      color: isCurrent ? '#fff' : isComplete ? 'var(--text)' : 'var(--text-light)',
                      fontWeight: isCurrent ? 600 : 400,
                    }}
                  >
                    {name}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 11,
                        color: 'var(--accent)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Current
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weak areas */}
        {weakAreas && weakAreas.length > 0 && (
          <div
            style={{
              background: '#fdf8f0',
              border: '1px solid #e8d9b0',
              borderRadius: 'var(--radius)',
              padding: '28px 32px',
              marginBottom: 32,
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 16,
              }}
            >
              Weak areas to revisit
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {weakAreas.map((area: any) => (
                <div
                  key={area.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '12px 16px',
                    background: '#fff',
                    borderRadius: 8,
                    border: '1px solid #e8d9b0',
                  }}
                >
                  <span
                    style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      whiteSpace: 'nowrap',
                      height: 'fit-content',
                      marginTop: 1,
                    }}
                  >
                    {area.lesson_code}
                  </span>
                  <div>
                    <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                      {area.error_description}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {area.recommended_action}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {recentSessions && recentSessions.length > 0 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '28px 32px',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 17,
                fontWeight: 700,
                color: 'var(--text)',
                marginBottom: 16,
              }}
            >
              Recent sessions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSessions.map(s => (
                <div
                  key={s.session_number}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--border-light)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-light)',
                        minWidth: 28,
                      }}
                    >
                      #{s.session_number}
                    </span>
                    <div>
                      <span style={{ fontSize: 14, color: 'var(--text)' }}>
                        {s.lesson_code}
                      </span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {sessionTypeLabel[s.session_type] ?? s.session_type}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {s.lesson_complete && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--success)',
                          fontWeight: 700,
                          background: '#f0faf4',
                          padding: '2px 8px',
                          borderRadius: 4,
                        }}
                      >
                        ✓ Complete
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                      {new Date(s.started_at).toLocaleDateString('en-IE', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
