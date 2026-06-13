'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type IBSubject = 'IB_BUNDLE';
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

// ── Step 1 — Level selection ──────────────────────────────────────────────────

function StepChoose({
  econLevel, onEconLevel,
  bmLevel, onBmLevel,
  onNext,
}: {
  econLevel: IBLevel | null;
  onEconLevel: (l: IBLevel) => void;
  bmLevel: IBLevel | null;
  onBmLevel: (l: IBLevel) => void;
  onNext: () => void;
}) {
  const canContinue = econLevel !== null && bmLevel !== null;

  return (
    <div>
      <h1 className="auth-heading" style={{ marginBottom: 6 }}>Create your IB account</h1>
      <p className="auth-subheading" style={{ marginBottom: 24 }}>
        Economics + Business Management, one subscription. Subscribe and start straight away — 7-day money-back guarantee.
      </p>

      <p className="form-label" style={{ marginBottom: 10 }}>Set your level for each subject:</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        <LevelPicker label="IB Economics level" value={econLevel} onChange={onEconLevel} />
        <LevelPicker label="IB Business Management level" value={bmLevel} onChange={onBmLevel} />
      </div>

      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: 13,
        color: 'var(--text-muted)',
        lineHeight: 1.5,
      }}>
        <strong style={{ color: 'var(--text)', display: 'block', marginBottom: 3 }}>Written examination only</strong>
        Gradd covers the full IB written examination curriculum — Papers 1, 2, and 3. The Internal Assessment (IA) is supervised by your school teacher and is not covered here.
      </div>

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

// ── Step 2 — IA scope acknowledgement ────────────────────────────────────────

function StepIAScope({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div>
      <h1 className="auth-heading" style={{ marginBottom: 6 }}>Before you continue</h1>
      <p className="auth-subheading" style={{ marginBottom: 24 }}>What Gradd covers</p>

      <div style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px 18px',
        marginBottom: 24,
        fontSize: 14,
        color: 'var(--text)',
        lineHeight: 1.65,
      }}>
        Gradd delivers the full IB written examination curriculum: Paper 1, Paper 2, and Paper 3 (HL only). The Internal Assessment (IA) is a separate piece of coursework supervised by your school teacher. Gradd does not cover the IA.
      </div>

      <label style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        cursor: 'pointer',
        marginBottom: 28,
        fontSize: 14,
        color: 'var(--text)',
        lineHeight: 1.5,
      }}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={e => setAcknowledged(e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0, width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand)' }}
        />
        I understand that Gradd covers the written examination curriculum only and does not include Internal Assessment (IA) support.
      </label>

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-outline" onClick={onBack} style={{ flexShrink: 0 }}>
          ← Back
        </button>
        <button
          type="button"
          className="btn btn-primary btn-full btn-lg"
          disabled={!acknowledged}
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — Account details ──────────────────────────────────────────────────

function StepAccount({
  studentName, setStudentName,
  email, setEmail,
  password, setPassword,
  billing, setBilling,
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
  billing: 'monthly' | 'annual';
  setBilling: (v: 'monthly' | 'annual') => void;
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
        7-day money-back guarantee — cancel within 7 days for a full refund.
      </p>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={onSubmit}>
        <div className="form-group">
          <p className="form-label" style={{ marginBottom: 8 }}>Your plan</p>
          <div style={{
            display: 'flex',
            background: 'var(--surface-2)',
            borderRadius: 'var(--radius-sm)',
            padding: 4,
            gap: 4,
          }}>
            {(['monthly', 'annual'] as const).map(b => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: billing === b ? 'var(--surface)' : 'transparent',
                  color: billing === b ? 'var(--brand)' : 'var(--text-muted)',
                  fontWeight: billing === b ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  boxShadow: billing === b ? 'var(--shadow-sm)' : 'none',
                  transition: 'all 0.15s ease',
                  fontFamily: 'var(--font-body)',
                }}
              >
                {b === 'monthly' ? 'Monthly' : 'Annual'}
                {b === 'annual' && (
                  <span style={{
                    marginLeft: 6,
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: 11,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                  }}>
                    Best value
                  </span>
                )}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 6 }}>
            Cancel any time. 7-day money-back guarantee.
          </p>
        </div>
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

        <style>{`
          @media (max-width: 479px) {
            .ib-signup-btns { flex-direction: column-reverse !important; }
            .ib-signup-btns button { width: 100%; }
          }
        `}</style>
        <div className="ib-signup-btns" style={{ display: 'flex', gap: 10, marginTop: 8 }}>
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
            {loading ? (<><span className="spinner" />Setting up…</>) : 'Start learning →'}
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
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const subject: IBSubject = 'IB_BUNDLE';
  const [econLevel, setEconLevel] = useState<IBLevel | null>(null);
  const [bmLevel, setBmLevel] = useState<IBLevel | null>(null);
  const [iaAcknowledged, setIaAcknowledged] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { issues } = checkPassword(password);
    if (issues.length > 0) {
      setError('Password must have: ' + issues.join(', ') + '.');
      return;
    }

    setLoading(true);

    const { data: { user, session }, error: signUpError } = await supabase.auth.signUp({
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

    if (user) {
      await supabase.from('profiles').update({
        subject,
        ia_scope_acknowledged: iaAcknowledged,
        ia_scope_acknowledged_at: iaAcknowledged ? new Date().toISOString() : null,
        ...(econLevel && { ib_economics_level: econLevel }),
        ...(bmLevel && { ib_business_level: bmLevel }),
      }).eq('id', user.id);
    }

    try {
      await fetch('/api/auth/confirm-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendWelcome: true }),
      });
    } catch {
      // Non-fatal
    }

    // Derive a single exam_level for checkout metadata
    const examLevel = (econLevel === 'HL' || bmLevel === 'HL') ? 'HL' : 'SL';

    const checkoutRes = await fetch('/api/checkout/ib', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify({ billing, exam_level: examLevel }),
    });

    const checkoutData = await checkoutRes.json();

    if (!checkoutRes.ok || !checkoutData.url) {
      setError(checkoutData.error ?? 'Failed to start checkout. Please try again.');
      setLoading(false);
      return;
    }

    window.location.href = checkoutData.url;
  };

  return (
    <div className="auth-card" style={{ maxWidth: 500 }}>

        {step === 1 && (
          <StepChoose
            econLevel={econLevel}
            onEconLevel={setEconLevel}
            bmLevel={bmLevel}
            onBmLevel={setBmLevel}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepIAScope
            onBack={() => setStep(1)}
            onNext={() => { setIaAcknowledged(true); setStep(3); }}
          />
        )}

        {step === 3 && (
          <StepAccount
            studentName={studentName}
            setStudentName={setStudentName}
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            billing={billing}
            setBilling={setBilling}
            onBack={() => setStep(2)}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        )}

    </div>
  );
}
