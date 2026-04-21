'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    fullName: '',
    studentName: '',
    email: '',
    password: '',
    examLevel: 'higher',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.fullName,
          student_name: formData.studentName,
          exam_level: formData.examLevel,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Update profile with exam level (auth trigger creates profile row)
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .update({ exam_level: formData.examLevel })
        .eq('id', user.id);
    }

    router.push('/subscribe');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-mark">G</div>
          <span className="auth-logo-name">Gradd</span>
        </div>

        <h1 className="auth-heading">Create your account</h1>
        <p className="auth-subheading">
          Start studying for the Leaving Cert — no textbook required.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              Your name (parent or student)
            </label>
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
            <label className="form-label" htmlFor="studentName">
              Student's first name
            </label>
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
              Aoife will use this in sessions.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="examLevel">
              Exam level
            </label>
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

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email address
            </label>
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
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? (
              <>
                <span className="spinner" />
                Creating account…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{' '}
          <Link href="/login">Sign in</Link>
        </p>

        <p
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 12,
            color: 'var(--text-light)',
          }}
        >
          By creating an account you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </div>
  );
}
