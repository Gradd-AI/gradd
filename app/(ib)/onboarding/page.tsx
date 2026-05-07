'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type IBSubject = 'IB_ECONOMICS' | 'IB_BUSINESS' | 'IB_BUNDLE';
type IBLevel = 'SL' | 'HL';
type CoursePosition = 'beginning' | 'mid-programme' | 'exam-prep';

// ── Shared card style ──────────────────────────────────────────────────────────

const selCard = (selected: boolean): React.CSSProperties => ({
  background: selected ? 'var(--brand)' : 'var(--surface)',
  border: `2px solid ${selected ? 'var(--brand)' : 'var(--border)'}`,
  borderRadius: 'var(--radius)',
  padding: '20px 24px',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
  textAlign: 'left' as const,
  width: '100%',
});

const selTitle = (selected: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-display)',
  fontSize: 17,
  fontWeight: 700,
  color: selected ? '#fff' : 'var(--text)',
  marginBottom: 4,
});

const selSub = (selected: boolean): React.CSSProperties => ({
  fontSize: 13,
  color: selected ? 'rgba(255,255,255,0.72)' : 'var(--text-muted)',
  lineHeight: 1.4,
});

const selPrice = (selected: boolean): React.CSSProperties => ({
  marginTop: 10,
  fontSize: 18,
  fontWeight: 700,
  fontFamily: 'var(--font-display)',
  color: selected ? 'var(--accent)' : 'var(--brand)',
});

// ── Step 1 — Subject selection ─────────────────────────────────────────────────

function StepSubject({
  value, onChange, onNext,
}: {
  value: IBSubject | null;
  onChange: (s: IBSubject) => void;
  onNext: () => void;
}) {
  const subjects: { id: IBSubject; title: string; desc: string; price: string; annual: string }[] = [
    {
      id: 'IB_ECONOMICS',
      title: 'IB Economics',
      desc: 'Full SL and HL curriculum — micro, macro, international economics and development.',
      price: '€44.99/month',
      annual: '€349/year',
    },
    {
      id: 'IB_BUSINESS',
      title: 'IB Business Management',
      desc: 'Full SL and HL curriculum — organisation, HRM, finance, marketing, and operations.',
      price: '€44.99/month',
      annual: '€349/year',
    },
    {
      id: 'IB_BUNDLE',
      title: 'IB Bundle',
      desc: 'Both subjects together — study Economics and Business Management from a single account.',
      price: '€74.99/month',
      annual: '€579/year',
    },
  ];

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
        Step 1 of 4
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.4px', marginBottom: 8 }}>
        Which subject are you studying?
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 28 }}>
        First lesson is free — no payment required to get started.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {subjects.map(s => (
          <button key={s.id} onClick={() => onChange(s.id)} style={selCard(value === s.id)}>
            <div style={selTitle(value === s.id)}>{s.title}</div>
            <div style={selSub(value === s.id)}>{s.desc}</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'baseline', marginTop: 10 }}>
              <span style={selPrice(value === s.id)}>{s.price}</span>
              <span style={{ fontSize: 12, color: value === s.id ? 'rgba(255,255,255,0.55)' : 'var(--text-light)' }}>
                or {s.annual}
              </span>
            </div>
          </button>
        ))}
      </div>

      <button
        className="btn btn-primary btn-full btn-lg"
        onClick={onNext}
        disabled={!value}
      >
        Continue →
      </button>
    </div>
  );
}

// ── Step 2 — Level selection ───────────────────────────────────────────────────

function LevelSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: IBLevel | null;
  onChange: (l: IBLevel) => void;
}) {
  const levels: { id: IBLevel; title: string; desc: string }[] = [
    { id: 'SL', title: 'Standard Level (SL)', desc: 'The standard IB course.' },
    { id: 'HL', title: 'Higher Level (HL)', desc: 'Extended content and an additional exam paper.' },
  ];
  return (
    <div>
      {label && (
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {levels.map(l => (
          <button key={l.id} onClick={() => onChange(l.id)} style={selCard(value === l.id)}>
            <div style={selTitle(value === l.id)}>{l.title}</div>
            <div style={selSub(value === l.id)}>{l.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepLevel({
  subject,
  economicsLevel, onEconomicsLevel,
  businessLevel, onBusinessLevel,
  onNext, onBack,
}: {
  subject: IBSubject;
  economicsLevel: IBLevel | null;
  onEconomicsLevel: (l: IBLevel) => void;
  businessLevel: IBLevel | null;
  onBusinessLevel: (l: IBLevel) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const isBundle = subject === 'IB_BUNDLE';
  const canContinue = isBundle
    ? (economicsLevel !== null && businessLevel !== null)
    : (subject === 'IB_ECONOMICS' ? economicsLevel !== null : businessLevel !== null);

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
        Step 2 of 4
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.4px', marginBottom: 8 }}>
        What level are you studying?
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 28 }}>
        This determines the content and exam papers Mia will cover with you.
      </p>

      {isBundle ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 28 }}>
          <LevelSelector label="IB Economics" value={economicsLevel} onChange={onEconomicsLevel} />
          <LevelSelector label="IB Business Management" value={businessLevel} onChange={onBusinessLevel} />
        </div>
      ) : subject === 'IB_ECONOMICS' ? (
        <div style={{ marginBottom: 28 }}>
          <LevelSelector label="" value={economicsLevel} onChange={onEconomicsLevel} />
        </div>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <LevelSelector label="" value={businessLevel} onChange={onBusinessLevel} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-outline" onClick={onBack} style={{ flex: '0 0 auto' }}>
          ← Back
        </button>
        <button className="btn btn-primary btn-full" onClick={onNext} disabled={!canContinue}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Step 3 — Course position ───────────────────────────────────────────────────

function StepPosition({
  value, onChange, onNext, onBack,
}: {
  value: CoursePosition | null;
  onChange: (p: CoursePosition) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const positions: { id: CoursePosition; title: string; desc: string }[] = [
    { id: 'beginning',     title: 'Just starting',     desc: "I haven't studied this subject yet." },
    { id: 'mid-programme', title: 'Mid-programme',      desc: "I'm part way through my IB course." },
    { id: 'exam-prep',     title: 'Exam preparation',   desc: 'My exams are coming up soon.' },
  ];

  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
        Step 3 of 4
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.4px', marginBottom: 8 }}>
        Where are you in your course?
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-muted)', marginBottom: 28 }}>
        Mia adjusts how she teaches based on where you are.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {positions.map(p => (
          <button key={p.id} onClick={() => onChange(p.id)} style={selCard(value === p.id)}>
            <div style={selTitle(value === p.id)}>{p.title}</div>
            <div style={selSub(value === p.id)}>{p.desc}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-outline" onClick={onBack} style={{ flex: '0 0 auto' }}>
          ← Back
        </button>
        <button className="btn btn-primary btn-full" onClick={onNext} disabled={!value}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Step 4 — IA boundary ───────────────────────────────────────────────────────

function StepIA({
  loading, error, onConfirm, onBack,
}: {
  loading: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: 8 }}>
        Step 4 of 4
      </p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.4px', marginBottom: 24 }}>
        One thing before you start
      </h1>

      <div style={{
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 28,
        fontSize: 15, color: 'var(--text)', lineHeight: 1.7,
      }}>
        The Internal Assessment is handled by your school teacher — Gradd covers the full written examination curriculum: Papers 1, 2, and 3.
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-outline" onClick={onBack} style={{ flex: '0 0 auto' }}>
          ← Back
        </button>
        <button
          className="btn btn-primary btn-full btn-lg"
          onClick={onConfirm}
          disabled={loading}
        >
          {loading
            ? <><span className="spinner" />Setting up your account…</>
            : "Got it, let's start"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function IBOnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState<IBSubject | null>(null);
  const [economicsLevel, setEconomicsLevel] = useState<IBLevel | null>(null);
  const [businessLevel, setBusinessLevel] = useState<IBLevel | null>(null);
  const [coursePosition, setCoursePosition] = useState<CoursePosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleComplete = async () => {
    if (!subject || !coursePosition) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/onboarding/ib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          economicsLevel: economicsLevel ?? undefined,
          businessLevel: businessLevel ?? undefined,
          coursePosition,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      router.push('/session');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <Link href="/">
            <img src="/gradd-logo.svg" alt="Gradd" height={34} style={{ display: 'block' }} />
          </Link>
        </div>

        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '40px 36px',
          boxShadow: 'var(--shadow-lg)',
        }}>
          {step === 1 && (
            <StepSubject
              value={subject}
              onChange={setSubject}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && subject && (
            <StepLevel
              subject={subject}
              economicsLevel={economicsLevel}
              onEconomicsLevel={setEconomicsLevel}
              businessLevel={businessLevel}
              onBusinessLevel={setBusinessLevel}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <StepPosition
              value={coursePosition}
              onChange={setCoursePosition}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}

          {step === 4 && (
            <StepIA
              loading={loading}
              error={error}
              onConfirm={handleComplete}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
