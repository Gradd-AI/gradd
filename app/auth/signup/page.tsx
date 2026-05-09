'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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

const CURRICULA = [
  {
    value: 'lc' as const,
    title: 'Leaving Certificate',
    region: 'Ireland',
    desc: 'LC Business, Higher and Ordinary Level',
  },
  {
    value: 'ib' as const,
    title: 'IB Diploma Programme',
    region: 'International',
    desc: 'IB Economics and Business Management, SL & HL',
  },
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [curriculum, setCurriculum] = useState<'lc' | 'ib'>('lc');
  const [formData, setFormData] = useState({
    fullName: '',
    studentName: '',
    email: '',
    password: '',
    examLevel: 'higher',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showStrength, setShowStrength] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    if (host === 'gradd.ai' || host.endsWith('.gradd.ai')) {
      setCurriculum('ib');
    }
    // gradd.ie and localhost both default to 'lc' (initial state)
  }, []);

  const pwStrength = checkPassword(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { issues } = checkPassword(formData.password);
    if (issues.length > 0) {
      setError('Password must have: ' + issues.join(', ') + '.');
      return;
    }

    setLoading(true);

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          student_name: formData.studentName,
          ...(curriculum === 'lc' && { exam_level: formData.examLevel }),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (curriculum === 'lc') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ exam_level: formData.examLevel })
          .eq('id', user.id);
      }
    }

    // Cookie tells subscribe page which product to show (1 hour TTL)
    document.cookie = `curriculum=${curriculum}; path=/; max-age=3600; SameSite=Lax`;

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

  const tutorName = curriculum === 'ib' ? 'Mia' : 'Aoife';

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Link href="/">
            <img src="/gradd-logo.svg" alt="Gradd" height="34" style={{ display: 'block' }} />
          </Link>
        </div>

        {/* Curriculum selector — shown before anything else */}
        <div style={{ marginBottom: 28 }}>
          <p className="form-label" style={{ marginBottom: 10 }}>Choose your curriculum</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CURRICULA.map(({ value, title, region, desc }) => {
              const selected = curriculum === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCurriculum(value)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    padding: '14px 16px',
                    background: selected ? '#eef4f0' : 'var(--surface)',
                    border: `1.5px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                    width: '100%',
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
                      background: selected ? 'var(--brand)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                      transition: 'border-color 0.15s ease, background 0.15s ease',
                    }}
                  >
                    {selected && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                      {title}{' '}
                      <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)' }}>
                        {region}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 3 }}>
                      {desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">
          {curriculum === 'lc'
            ? 'Start studying for the Leaving Cert — no textbook required.'
            : 'Start studying for the IB Diploma — no textbook required.'}
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Your name (parent or student)</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              className="input"
              placeholder="e.g. Siobhán Murphy"
              value={formData.fullName}
              onChange={handleChange}
              required
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="studentName">Student's first name</label>
            <input
              id="studentName"
              name="studentName"
              type="text"
              className="input"
              placeholder="e.g. Ciarán"
              value={formData.studentName}
              onChange={handleChange}
              required
            />
            <p style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 4 }}>
              {tutorName} will use this in sessions.
            </p>
          </div>

          {curriculum === 'lc' && (
            <div className="form-group">
              <label className="form-label" htmlFor="examLevel">Exam level</label>
              <select
                id="examLevel"
                name="examLevel"
                className="input"
                value={formData.examLevel}
                onChange={handleChange}
                style={{ cursor: 'pointer' }}
              >
                <option value="higher">Higher Level</option>
                <option value="ordinary">Ordinary Level</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="Min. 12 characters"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setShowStrength(true)}
              required
              autoComplete="new-password"
            />

            {showStrength && formData.password.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: i <= pwStrength.score ? pwStrength.color : 'var(--border)',
                      transition: 'background 0.2s'
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

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (<><span className="spinner" />Creating account…</>) : 'Create account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{'  '}
          <Link href="/login">Sign in</Link>
        </p>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-light)' }}>
          By creating an account you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}
