'use client';

// PUBLIC, no-auth page — deliberately omits the per-page auth guard that
// /acca/tutor, /acca/mock, /acca/cases use (same pattern as /acca/auth and
// /acca/subscribe). This is the free resit diagnostic wedge; anyone can reach it.

import { useState } from 'react';
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';
import {
  TOPIC_GROUPS,
  HABIT_QUESTIONS,
  type Rating,
  type ResitProfile,
} from '@/lib/acca/resit-engine';
import { trackMetaEvent } from '@/lib/meta-consent';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MONTHS = ['Mar', 'Jun', 'Sep', 'Dec'];
const YEARS = ['2026', '2025', '2024', '2023'];
const RATINGS: { value: Rating; label: string }[] = [
  { value: 'weak', label: 'Weak' },
  { value: 'mixed', label: 'Mixed' },
  { value: 'ok', label: 'OK' },
];

export default function ResitPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1
  const [score, setScore] = useState('');
  const [month, setMonth] = useState('Jun');
  const [year, setYear] = useState('2026');
  const [attempts, setAttempts] = useState('1');

  // Step 2 / 3
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [answers, setAnswers] = useState<Record<string, 'a' | 'b' | 'c'>>({});

  // Plan
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState('');
  const [profile, setProfile] = useState<ResitProfile | null>(null);

  // Email capture
  const [email, setEmail] = useState('');
  const [emailState, setEmailState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  const scoreNum = Number(score);
  const step1Valid =
    score !== '' && Number.isInteger(scoreNum) && scoreNum >= 0 && scoreNum <= 49 && Number(attempts) >= 1;
  const allHabitsAnswered = HABIT_QUESTIONS.every((q) => answers[q.habit]);

  function inputsBody() {
    return {
      score: scoreNum,
      sitting: `${month} ${year}`,
      attempts: Number(attempts),
      topic_ratings: ratings,
      habit_answers: answers,
    };
  }

  async function submitPlan() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/acca/resit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'plan', ...inputsBody() }),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      setPlan(data.plan);
      setProfile(data.profile ?? null);
      setStep(4);
      window.scrollTo({ top: 0 });
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  async function submitCapture() {
    if (!EMAIL_RE.test(email.trim())) {
      setEmailState('error');
      return;
    }
    setEmailState('sending');
    try {
      const res = await fetch('/api/acca/resit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'capture', email: email.trim(), plan, ...inputsBody() }),
      });
      if (!res.ok) {
        setEmailState('error');
        return;
      }
      setEmailState('done');
      // Consent- + host-gated Meta 'Lead' (no-op unless gradd.ai + granted). Fired
      // after the state flip so it never delays the capture response or plan render.
      trackMetaEvent('Lead');
    } catch {
      setEmailState('error');
    }
  }

  return (
    <div className="resit">
      {/* First-touch utm_* / fbclid → cookie → read server-side by /api/acca/resit to stamp
          resit_runs.attribution. This route had NO capture until 21/07 (the ad-measurement
          blind spot): the cookie-reader existed in the API route but nothing ever set the
          cookie on this, the primary paid-traffic landing page. */}
      <AttributionCapture />
      <style>{CSS}</style>

      <div className="resit-logo">
        {/* Root, not /acca — this page is public/no-auth (see file-top note), and /acca
            only redirects an anonymous visitor straight back to root now. */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 22, width: 'auto', display: 'block' }} />
        </Link>
      </div>

      {step < 4 && (
        <div className="resit-head">
          <p className="resit-kicker">Free ACCA APM resit diagnostic</p>
          <h1 className="resit-title">Turn your result into a plan</h1>
          <p className="resit-sub">
            Three quick steps. We map your result to the exact areas and habits to fix — no sign-up needed to see it.
          </p>
          <div className="resit-steps" aria-hidden="true">
            {[1, 2, 3].map((n) => (
              <span key={n} className={`resit-dot${step === n ? ' is-active' : ''}${step > n ? ' is-done' : ''}`} />
            ))}
          </div>
        </div>
      )}

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="resit-card">
          <h2 className="resit-card-title">Your last APM attempt</h2>

          <label className="resit-field">
            <span className="resit-label">Your last score (out of 100)</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={49}
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="e.g. 44"
              className="resit-input"
            />
            <span className="resit-help">A fail is 0–49. Your result slip shows this mark.</span>
          </label>

          <div className="resit-field">
            <span className="resit-label">Which sitting?</span>
            <div className="resit-row">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="resit-input">
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select value={year} onChange={(e) => setYear(e.target.value)} className="resit-input">
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="resit-field">
            <span className="resit-label">How many times have you sat APM?</span>
            <select value={attempts} onChange={(e) => setAttempts(e.target.value)} className="resit-input">
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n === 5 ? '5 or more' : n}</option>
              ))}
            </select>
          </label>

          <div className="resit-actions">
            <button className="resit-btn resit-btn--primary" disabled={!step1Valid} onClick={() => setStep(2)}>
              Next →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="resit-card">
          <h2 className="resit-card-title">How did each area go?</h2>
          <p className="resit-card-sub">
            Rate how each area felt in the exam. Your result slip’s section breakdown will help — mark honestly.
          </p>

          <div className="resit-groups">
            {TOPIC_GROUPS.map((g) => (
              <div key={g.id} className="resit-group">
                <div className="resit-group-text">
                  <span className="resit-group-label">{g.label}</span>
                  <span className="resit-group-hint">{g.hint}</span>
                </div>
                <div className="resit-seg" role="group" aria-label={g.label}>
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      className={`resit-seg-btn resit-seg-btn--${r.value}${ratings[g.id] === r.value ? ' is-active' : ''}`}
                      onClick={() => setRatings((prev) => ({ ...prev, [g.id]: r.value }))}
                      type="button"
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="resit-actions resit-actions--split">
            <button className="resit-btn resit-btn--ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="resit-btn resit-btn--primary" onClick={() => setStep(3)}>Next →</button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="resit-card">
          <h2 className="resit-card-title">A few honest questions</h2>
          <p className="resit-card-sub">
            These find the exam habits that cost marks. There are no right answers here — pick what’s truest for you.
          </p>

          <div className="resit-questions">
            {HABIT_QUESTIONS.map((q, i) => (
              <fieldset key={q.habit} className="resit-q">
                <legend className="resit-q-prompt">{i + 1}. {q.prompt}</legend>
                <div className="resit-q-options">
                  {q.options.map((o) => (
                    <label key={o.value} className={`resit-opt${answers[q.habit] === o.value ? ' is-active' : ''}`}>
                      <input
                        type="radio"
                        name={q.habit}
                        checked={answers[q.habit] === o.value}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.habit]: o.value }))}
                      />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          {error && <div className="resit-error" role="alert">{error}</div>}

          <div className="resit-actions resit-actions--split">
            <button className="resit-btn resit-btn--ghost" onClick={() => setStep(2)} disabled={loading}>← Back</button>
            <button
              className="resit-btn resit-btn--primary"
              disabled={!allHabitsAnswered || loading}
              onClick={submitPlan}
            >
              {loading ? <><span className="spinner" />Building your plan…</> : 'See my plan →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4 — PLAN (shown FIRST, before any email ask) ── */}
      {step === 4 && (
        <div className="resit-plan">
          <div className="resit-plan-head">
            <p className="resit-kicker">Your APM resit plan</p>
            <h1 className="resit-title">Here’s where to start</h1>
          </div>

          {profile && profile.weak_groups.length > 0 && (
            <div className="resit-chips">
              {profile.weak_groups.map((g) => (
                <span key={g.id} className={`resit-chip resit-chip--${g.rating}`}>{g.label}</span>
              ))}
            </div>
          )}

          <div className="resit-plan-body">
            {plan.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* CTA into the free drills — thread the diagnosed weakest area into ?next= so the
              post-signup first-run dashboard (F3) deep-links the first drill to it. */}
          <Link
            href={`/acca/auth?next=${encodeURIComponent(
              profile && profile.weak_prefixes.length > 0 ? `/acca?area=${profile.weak_prefixes[0]}` : '/acca'
            )}`}
            className="resit-btn resit-btn--primary resit-btn--cta"
          >
            Start the free drills for your weak areas →
          </Link>

          {/* Email capture — the plan is already on screen; this saves it. */}
          <div className="resit-capture">
            {emailState === 'done' ? (
              <p className="resit-capture-done">
                Sent. Check your inbox for your plan — including the areas to drill first.
              </p>
            ) : (
              <>
                <p className="resit-capture-label">Want this plan to keep? We’ll email it to you.</p>
                <div className="resit-capture-row">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (emailState === 'error') setEmailState('idle'); }}
                    placeholder="you@email.com"
                    className="resit-input"
                    aria-label="Email address"
                  />
                  <button
                    className="resit-btn resit-btn--rust"
                    disabled={emailState === 'sending'}
                    onClick={submitCapture}
                  >
                    {emailState === 'sending' ? <><span className="spinner" />Sending…</> : 'Email me this plan'}
                  </button>
                </div>
                {emailState === 'error' && <span className="resit-help resit-help--err">Please enter a valid email.</span>}
              </>
            )}
          </div>

          <p className="resit-fine">
            <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link>
          </p>
        </div>
      )}
    </div>
  );
}

const CSS = `
.resit {
  --rust: oklch(64% 0.17 47);
  --rust-dark: oklch(58% 0.17 47);
  --rust-ink: #fff8f4;
  --weak: oklch(58% 0.17 27);
  --mixed: oklch(70% 0.13 75);
  --ok: oklch(58% 0.11 155);
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: clamp(28px, 5vw, 56px) clamp(16px, 4vw, 32px);
  gap: 24px;
}
.resit *, .resit *::before, .resit *::after { box-sizing: border-box; }

.resit-logo { display: flex; justify-content: center; }

.resit-head { text-align: center; max-width: 560px; display: flex; flex-direction: column; gap: 8px; align-items: center; }
.resit-kicker {
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--rust); margin: 0;
}
.resit-title {
  font-family: var(--font-display);
  font-size: clamp(26px, 4vw, 36px); font-weight: 700; letter-spacing: -0.5px;
  color: var(--text); margin: 0; line-height: 1.1;
}
.resit-sub { font-size: 15px; color: var(--text-muted); line-height: 1.55; margin: 4px 0 0; }

.resit-steps { display: flex; gap: 8px; margin-top: 10px; }
.resit-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: background 0.2s; }
.resit-dot.is-active { background: var(--rust); }
.resit-dot.is-done { background: var(--brand); }

.resit-card, .resit-plan {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: clamp(22px, 4vw, 32px);
  width: 100%;
  max-width: 620px;
  box-shadow: var(--shadow-lg);
}
.resit-card-title { font-family: var(--font-display); font-size: 21px; font-weight: 700; color: var(--text); margin: 0 0 4px; }
.resit-card-sub { font-size: 14px; color: var(--text-muted); line-height: 1.5; margin: 0 0 22px; }

.resit-field { display: flex; flex-direction: column; gap: 7px; margin-bottom: 22px; }
.resit-label { font-size: 14px; font-weight: 600; color: var(--text); }
.resit-help { font-size: 12.5px; color: var(--text-muted); }
.resit-help--err { color: var(--weak); }
.resit-row { display: flex; gap: 12px; }
.resit-row .resit-input { flex: 1; }

.resit-input {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  width: 100%;
}
.resit-input:focus { outline: none; border-color: var(--rust); box-shadow: 0 0 0 3px oklch(64% 0.17 47 / 0.15); }

.resit-groups { display: flex; flex-direction: column; gap: 14px; }
.resit-group {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding-bottom: 14px; border-bottom: 1px solid var(--border);
}
.resit-group:last-child { border-bottom: none; padding-bottom: 0; }
.resit-group-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.resit-group-label { font-size: 14.5px; font-weight: 600; color: var(--text); line-height: 1.3; }
.resit-group-hint { font-size: 12px; color: var(--text-muted); line-height: 1.35; }

.resit-seg { display: flex; gap: 4px; flex-shrink: 0; background: var(--surface-2); padding: 3px; border-radius: 999px; }
.resit-seg-btn {
  font-family: var(--font-body); font-size: 12.5px; font-weight: 600;
  color: var(--text-muted); background: transparent; border: none; cursor: pointer;
  padding: 6px 12px; border-radius: 999px; transition: all 0.12s;
}
.resit-seg-btn:hover { color: var(--text); }
.resit-seg-btn.is-active { color: #fff; }
.resit-seg-btn--weak.is-active { background: var(--weak); }
.resit-seg-btn--mixed.is-active { background: var(--mixed); color: #3a2c05; }
.resit-seg-btn--ok.is-active { background: var(--ok); }

.resit-questions { display: flex; flex-direction: column; gap: 22px; }
.resit-q { border: none; padding: 0; margin: 0; }
.resit-q-prompt { font-size: 14.5px; font-weight: 600; color: var(--text); line-height: 1.4; margin-bottom: 10px; padding: 0; }
.resit-q-options { display: flex; flex-direction: column; gap: 8px; }
.resit-opt {
  display: flex; align-items: flex-start; gap: 10px;
  font-size: 13.5px; color: var(--text); line-height: 1.45;
  padding: 11px 13px; border: 1px solid var(--border); border-radius: 10px;
  cursor: pointer; transition: border-color 0.12s, background 0.12s;
}
.resit-opt:hover { border-color: var(--text-muted); }
.resit-opt.is-active { border-color: var(--rust); background: oklch(64% 0.17 47 / 0.06); }
.resit-opt input { margin-top: 2px; accent-color: var(--rust); flex-shrink: 0; }

.resit-actions { display: flex; justify-content: flex-end; margin-top: 26px; }
.resit-actions--split { justify-content: space-between; }

.resit-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 22px; border-radius: 999px;
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  border: 1.5px solid transparent; cursor: pointer; transition: all 0.15s ease;
  text-decoration: none;
}
.resit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.resit-btn--primary { background: var(--brand); color: #fff; border-color: var(--brand); }
.resit-btn--primary:not(:disabled):hover { filter: brightness(1.15); }
.resit-btn--ghost { background: transparent; color: var(--text); border-color: var(--border); }
.resit-btn--ghost:not(:disabled):hover { background: var(--surface-2); }
.resit-btn--rust { background: var(--rust); color: var(--rust-ink); border-color: var(--rust); }
.resit-btn--rust:not(:disabled):hover { background: var(--rust-dark); }
.resit-btn--cta { width: 100%; margin: 6px 0 4px; padding: 15px 22px; font-size: 15px; }

.resit-plan-head { text-align: center; display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; }
.resit-chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 22px; }
.resit-chip {
  font-size: 12.5px; font-weight: 600; padding: 5px 12px; border-radius: 999px;
  border: 1px solid var(--border); color: var(--text);
}
.resit-chip--weak { border-color: var(--weak); color: var(--weak); }
.resit-chip--mixed { border-color: var(--mixed); color: #7a5c0a; }

.resit-plan-body { margin-bottom: 24px; }
.resit-plan-body p { font-size: 15.5px; color: var(--text); line-height: 1.7; margin: 0 0 16px; }
.resit-plan-body p:last-child { margin-bottom: 0; }

.resit-capture {
  margin-top: 24px; padding-top: 22px; border-top: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 10px;
}
.resit-capture-label { font-size: 14px; font-weight: 600; color: var(--text); margin: 0; }
.resit-capture-row { display: flex; gap: 10px; }
.resit-capture-row .resit-input { flex: 1; }
.resit-capture-done { font-size: 14px; color: var(--ok); font-weight: 600; margin: 0; }

.resit-error {
  background: #fff0f0; border: 1px solid #f5c6c6; color: #c0392b;
  border-radius: 10px; padding: 11px 14px; font-size: 13px; margin-top: 18px;
}

.resit-fine { font-size: 12px; color: var(--text-muted); text-align: center; margin: 20px 0 0; }
.resit-fine a { color: inherit; text-decoration: underline; }

@media (max-width: 560px) {
  .resit-group { flex-direction: column; align-items: stretch; }
  .resit-seg { justify-content: space-between; }
  .resit-seg-btn { flex: 1; }
  .resit-capture-row { flex-direction: column; }
}
`;
