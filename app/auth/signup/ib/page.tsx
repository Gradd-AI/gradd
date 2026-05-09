'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type IBSubject = 'IB_ECONOMICS' | 'IB_BUSINESS' | 'IB_BUNDLE';
type IBLevel = 'SL' | 'HL';

// ── Card helpers ──────────────────────────────────────────────────────────────

function selCard(selected: boolean): React.CSSProperties {
  return {
    background: selected ? 'var(--brand)' : 'var(--surface)',
    border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
    borderRadius: 'var(--radius)',
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
    width: '100%',
  };
}

function selTitle(selected: boolean): React.CSSProperties {
  return {
    fontFamily: 'var(--font-display)',
    fontSize: 15,
    fontWeight: 700,
    color: selected ? '#fff' : 'var(--text)',
    marginBottom: 3,
  };
}

function selDesc(selected: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    color: selected ? 'rgba(255,255,255,0.72)' : 'var(--text-muted)',
    lineHeight: 1.4,
  };
}

// ── Password strength ─────────────────────────────────────────────────────────

function checkPassword(pw: string): { score: number; label: string; color: string; issues: string[] } {
  const issues: string[] = [];
  if (pw.length < 12) issues.push('At least 12 characters');
  if (!/[A-Z]/.test(pw)) issues.push('One uppercase letter');
  if (!/[a-z]/.test(pw)) issues.push('One lowercase letter');
  if (!/[0-9]/.test(pw)) issues.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('One symbol (!@#$%...)');
  const score = 5 - issues.length;
  if (score <= 1) return { score, label: 'Too weak', color: '#dc2626', issues };
  if (score <= 2) return { score, label: 'Weak', color: '#ea580c', issues };
  if (score <= 3) return { score, label: 'Fair', color: '#d97706', issues };
  if (score <= 4) return { score, label: 'Good', color: '#16a34a', issues };
  return { score, label: 'Strong', color: '#15803d', issues };
}

// ── Level picker — compact SL / HL toggle ─────────────────────────────────────

function LevelPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: IBLevel | null;
  onChange: (l: IBLevel) => void;
}) {
  return (
    <div>
      <p style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8,
      }}>
        {label}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        {(['SL', 'HL'] as IBLevel[]).map(level => {
          const active = value === level;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(level)}
              style={{
                flex: 1,
                padding: '11px 0',
                background: active ? 'var(--brand)' : 'var(--surface)',
                border: `2px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14,
                color: active ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.15s ease',
              }}
            >
              {level}
            </button>
          );
        })}
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 5 }}>
        {value === 'SL'
          ? 'Standard Level'
          : value === 'HL'
          ? 'Higher Level — extended content and an extra paper'
          : 'Choose your exam level'}
      </p>
    </div>
  );
}

// ── Subjects ──────────────────────────────────────────────────────────────────

const SUBJECTS: { id: IBSubject; title: string; desc: string }[] = [
  {
    id: 'IB_ECONOMICS',
    title: 'IB Economics',
    desc: 'Microeconomics, macroeconomics, international economics, and development economics.',
  },
  {
    id: 'IB_BUSINESS',
    title: 'IB Business Management',
    desc: 'Business organisation, HR, finance, marketing, and operations management.',
  },
  {
    id: 'IB_BUNDLE',
    title: 'IB Bundle',
    desc: 'Both subjects — Economics and Business Management from one account.',
  },
];

// ── Step 1 — Subject + level ──────────────────────────────────────────────────

function StepChoose({
  subject, onSubject,
  econLevel, onEconLevel,
  bmLevel, onBmLevel,
  onNext,
}: {
  subject: IBSubject | null;
  onSubject: (s: IBSubject) => void;
  econLevel: IBLevel | null;
  onEconLevel: (l: IBLevel) => void;
  bmLevel: IBLevel | null;
  onBmLevel: (l: IBLevel) => void;
  onNext: () => void;
}) {
  const canContinue =
    subject === 'IB_ECONOMICS' ? econLevel !== null :
    subject === 'IB_BUSINESS'  ? bmLevel !== null :
    subject === 'IB_BUNDLE'    ? (econLevel !== null && bmLevel !== null) :
    false;

  return (
    <div>
      <h1 className="auth-heading" style={{ marginBottom: 6 }}>Create your IB account</h1>
      <p className="auth-subheading" style={{ marginBottom: 24 }}>
        First lesson is free — no payment needed to get started.
      </p>

      <p className="form-label" style={{ marginBottom: 10 }}>Which subject are you studying?</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {SUBJECTS.map(s => (
          <button key={s.id} type="button" onClick={() => onSubject(s.id)} style={selCard(subject === s.id)}>
            <div style={selTitle(subject === s.id)}>{s.title}</div>
            <div style={selDesc(subject === s.id)}>{s.desc}</div>
          </button>
        ))}
      </div>

      {subject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {(subject === 'IB_ECONOMICS' || subject === 'IB_BUNDLE') && (
            <LevelPicker
              label={subject === 'IB_BUNDLE' ? 'IB Economics level' : 'Your exam level'}
              value={econLevel}
              onChange={onEconLevel}
            />
          )}
          {(subject === 'IB_BUSINESS' || subject === 'IB_BUNDLE') && (
            <LevelPicker
              label={subject === 'IB_BUNDLE' ? 'IB Business Management level' : 'Your exam level'}
              value={bmLevel}
              onChange={onBmLevel}
            />
          )}
        </div>
      )}

      <button
        type="button"
        className="btn btn-primary btn-full btn-lg"
        disabled={!canContinue}
        onClick={onNext}
        style={{ marginBottom: 0 }}
      >
        Continue →
      </button>

      <p className="auth-footer">
        Already have an account?{'  '}
        <Link href="/login">Sign in</Link>
      </p>
    </div>
  );
}

// ── Step 2 — Account details ──────────────────────────────────────────────────

function StepAccount({
  studentName, setStudentName,
  email, setEmail,
  password, setPassword,
  onBack,
  onSubmit,
  loading,
  error,
}: {
  studentName: string;
  setStudentName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  error: string;
}) {
  const [showStrength, setShowStrength] = useState(false);
  const pwStrength = checkPassword(password);

  return (
    <div>
      <h1 className="auth-heading" style={{ marginBottom: 6 }}>Create your account</h1>
      <p className="auth-subheading" style={{ marginBottom: 24 }}>
        Your IB tutor Mia is ready when you are.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="studentName">Student's first name</label>
          <input
            id="studentName"
            type="text"
            className="input"
            placeholder="e.g. James"
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            required
            autoComplete="given-name"
          />
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
            Mia will use this in sessions.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            className="input"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="input"
            placeholder="Min. 12 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onFocus={() => setShowStrength(true)}
            required
            autoComplete="new-password"
          />

          {showStrength && password.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i <= pwStrength.score ? pwStrength.color : 'var(--border)',
                    transition: 'background 0.2s',
                  }} />
                ))}
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: pwStrength.color, marginBottom: 4 }}>
                {pwStrength.label}
              </p>
              {pwStrength.issues.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {pwStrength.issues.map(issue => (
                    <li key={issue} style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onBack}
            style={{ flexShrink: 0 }}
          >
            ← Back
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? (<><span className="spinner" />Creating account…</>) : 'Create account'}
          </button>
        </div>
      </form>

      <p className="auth-footer">
        Already have an account?{'  '}
        <Link href="/login">Sign in</Link>
      </p>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-light)' }}>
        By creating an account you agree to our Terms &amp; Privacy Policy.
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IBSignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [subject, setSubject] = useState<IBSubject | null>(null);
  const [econLevel, setEconLevel] = useState<IBLevel | null>(null);
  const [bmLevel, setBmLevel] = useState<IBLevel | null>(null);
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject) return;
    setError('');

    const { issues } = checkPassword(password);
    if (issues.length > 0) {
      setError('Password must have: ' + issues.join(', ') + '.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: studentName,
          student_name: studentName,
          ib_subject: subject,
          ...(econLevel && { ib_economics_level: econLevel }),
          ...(bmLevel && { ib_business_level: bmLevel }),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({
        subject,
        ...(econLevel && { ib_economics_level: econLevel }),
        ...(bmLevel && { ib_business_level: bmLevel }),
      }).eq('id', user.id);
    }

    // Persist IB selections for the subscribe page (1 hour)
    const opts = 'path=/; max-age=3600; SameSite=Lax';
    document.cookie = `curriculum=ib; ${opts}`;
    document.cookie = `ib_subject=${subject}; ${opts}`;
    if (econLevel) document.cookie = `ib_econ_level=${econLevel}; ${opts}`;
    if (bmLevel)   document.cookie = `ib_bm_level=${bmLevel}; ${opts}`;

    try {
      await fetch('/api/auth/confirm-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendWelcome: true }),
      });
    } catch {
      // Non-fatal
    }

    router.push('/subscribe');
  };

  return (
    <div className="auth-page">
      {/* Slightly wider card to breathe with subject cards */}
      <div className="auth-card" style={{ maxWidth: 500 }}>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 700,
              color: 'var(--brand)',
              letterSpacing: '-0.3px',
              display: 'block',
            }}>
              Gradd.ai
            </span>
          </Link>
        </div>

        {step === 1 && (
          <StepChoose
            subject={subject}
            onSubject={s => { setSubject(s); setEconLevel(null); setBmLevel(null); }}
            econLevel={econLevel}
            onEconLevel={setEconLevel}
            bmLevel={bmLevel}
            onBmLevel={setBmLevel}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && subject && (
          <StepAccount
            studentName={studentName}
            setStudentName={setStudentName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            onBack={() => setStep(1)}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        )}

      </div>
    </div>
  );
}
