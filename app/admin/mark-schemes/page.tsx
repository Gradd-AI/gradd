'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const ADMIN_EMAIL = 'testbundle@gradd.ai';

// ─── Types ────────────────────────────────────────────────────────────────────

type SchemeTab = 'hybrid' | 'content_checklist';

type MethodMark  = { step: string; marks: number };
type AnswerMarks = { correct_answer: number; partial_credit_rules: string };
type AcceptedPoint = { point: string; marks: number; keywords: string[] };
type AcceptedReasonEntry = { reason: string; keywords: string[] };

type HybridData = {
  method_marks: MethodMark[];
  answer_marks: AnswerMarks;
};

type ContentChecklistData = {
  accepted_points: AcceptedPoint[];
  marking_rule: string;
  accepted_reasons?: AcceptedReasonEntry[];
};

type SchemeData = HybridData | ContentChecklistData;

type ExistingSeed = {
  id: string;
  scheme_type: string;
  scheme_data: SchemeData;
};

type QuestionInfo = {
  id: string;
  question_text: string;
  context_text: string | null;
  marks: number;
  command_term: string;
  paper: string;
  question_type: string;
  ao_level: string;
  level: string;
};

type CandidateCard = {
  id: string;
  question_id: string;
  scheme_type: SchemeTab;
  max_marks: number;
  scheme_data: SchemeData;
  question: QuestionInfo;
  existing_seed: ExistingSeed | null;
};

const SUBJECT_LABEL: Record<string, string> = {
  IB_ECONOMICS:           'IB Economics',
  IB_BUSINESS_MANAGEMENT: 'IB Business Management',
};

const TAB_LABEL: Record<SchemeTab, string> = {
  hybrid:            'Hybrid',
  content_checklist: 'Content Checklist',
};

// ─── Type guard ───────────────────────────────────────────────────────────────

function isHybridData(d: SchemeData): d is HybridData {
  return 'method_marks' in d;
}

// ─── Scheme renderers ─────────────────────────────────────────────────────────

function HybridRenderer({ data }: { data: HybridData }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
        Method marks
      </div>
      <ol style={{ margin: 0, padding: '0 0 0 22px' }}>
        {data.method_marks.map((m, i) => (
          <li key={i} style={{ marginBottom: 9 }}>
            <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>{m.step}</span>
            <span style={{
              display: 'inline-block', marginLeft: 10,
              background: 'var(--brand)', color: '#fff',
              borderRadius: 12, padding: '1px 9px', fontSize: 10, fontWeight: 700,
              verticalAlign: 'middle',
            }}>
              {m.marks}m
            </span>
          </li>
        ))}
      </ol>

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
          Answer marks
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>correct_answer:</span>
          <span style={{
            background: data.answer_marks.correct_answer > 0 ? 'var(--success)' : 'var(--surface-2)',
            color:      data.answer_marks.correct_answer > 0 ? '#fff' : 'var(--text-muted)',
            borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700,
          }}>
            {data.answer_marks.correct_answer} mark{data.answer_marks.correct_answer !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.65 }}>
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginRight: 8, color: 'var(--text-muted)' }}>
            Partial credit:
          </span>
          {data.answer_marks.partial_credit_rules}
        </div>
      </div>
    </div>
  );
}

function ContentChecklistRenderer({ data }: { data: ContentChecklistData }) {
  return (
    <div>
      {data.accepted_reasons && data.accepted_reasons.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 8 }}>
            Accepted reasons (any one earns naming mark)
          </div>
          <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {data.accepted_reasons.map((r, i) => (
              <li key={i} style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
                {r.reason}
                {r.keywords.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
                    — {r.keywords.join(', ')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
        Accepted points
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.accepted_points.map((p, i) => (
          <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.55, flex: 1 }}>{p.point}</span>
              <span style={{ background: 'var(--brand)', color: '#fff', borderRadius: 12, padding: '1px 9px', fontSize: 10, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>
                {p.marks}m
              </span>
            </div>
            {p.keywords.length > 0 && (
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                {p.keywords.join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {data.marking_rule}
      </div>
    </div>
  );
}

// ─── Defect checklist ─────────────────────────────────────────────────────────

const DEFECT_CHECKS: { label: string; desc: string; applies: 'hybrid' | 'content_checklist' | 'both' }[] = [
  {
    label:   '(a) Multi-value steps',
    desc:    'Every value the question names (e.g. price AND quantity, CS AND PS) has its own distinct method_marks step.',
    applies: 'hybrid',
  },
  {
    label:   '(b) Correct formula',
    desc:    'Closed-economy multiplier uses MPC = 1 − MPS, not MPM. MPM only if the question explicitly says open economy or mentions imports.',
    applies: 'hybrid',
  },
  {
    label:   '(c) Interpretation label',
    desc:    'PED: |PED| > 1 → elastic, < 1 → inelastic (not inverted). Comparative advantage = lower opportunity cost. Mapping stated before conclusion.',
    applies: 'hybrid',
  },
  {
    label:   '(d) Explain-N structure',
    desc:    '"Explain two/three [X]" → minimum N naming points + N development points (≥ 2N accepted_points); not a flat pooled list.',
    applies: 'both',
  },
];

function DefectChecklist({ schemeType }: { schemeType: SchemeTab }) {
  return (
    <div style={{ background: '#fffbf0', border: '1px solid #e5d080', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginTop: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#7a5a00', marginBottom: 10 }}>
        Defect checklist — verify before approving
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {DEFECT_CHECKS.map(c => {
          const relevant = c.applies === 'both' || c.applies === schemeType;
          return (
            <li key={c.label} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: relevant ? 1 : 0.3 }}>
              <span style={{ fontSize: 13, lineHeight: 1, marginTop: 2, flexShrink: 0, color: '#7a5a00' }}>□</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7a5a00' }}>{c.label} </span>
                <span style={{ fontSize: 12, color: '#7a5a00' }}>{c.desc}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Supersede panel ──────────────────────────────────────────────────────────

function SupersedePanel({ seed, show, onToggle }: { seed: ExistingSeed; show: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-light)', padding: '14px 28px', background: '#fff8e6' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#7a4f00' }}>
          ⚠ Supersede — this question already has an approved seed scheme
        </span>
        <button
          onClick={onToggle}
          style={{ background: 'none', border: '1px solid #c9a030', borderRadius: 4, padding: '3px 10px', fontSize: 11, color: '#7a4f00', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
        >
          {show ? 'Hide' : 'Show'} old seed
        </button>
      </div>
      <p style={{ margin: '0 0 0', fontSize: 12, color: '#7a4f00', opacity: 0.85 }}>
        Approving this candidate will automatically retire the existing seed (set it to rejected) in the same action.
      </p>
      {show && (
        <div style={{ marginTop: 14, background: '#fdf0c0', border: '1px solid #dfc060', borderRadius: 'var(--radius-sm)', padding: '16px 18px', opacity: 0.9 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7a4f00', marginBottom: 12 }}>
            Old seed scheme — {seed.scheme_type}
          </div>
          {isHybridData(seed.scheme_data)
            ? <HybridRenderer data={seed.scheme_data} />
            : <ContentChecklistRenderer data={seed.scheme_data as ContentChecklistData} />}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function MarkSchemeReviewInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const subject     = searchParams.get('subject') ?? 'IB_ECONOMICS';
  const sb          = getSupabaseBrowserClient();

  const [authorized,   setAuthorized]  = useState<boolean | null>(null);
  const [loading,      setLoading]     = useState(true);
  const [saving,       setSaving]      = useState(false);
  const [tab,          setTab]         = useState<SchemeTab>('hybrid');
  const [allCards,     setAllCards]    = useState<Record<SchemeTab, CandidateCard[]>>({ hybrid: [], content_checklist: [] });
  const [idx,          setIdx]         = useState(0);
  const [showOldSeed,  setShowOldSeed] = useState(false);
  const [helpOpen,     setHelpOpen]    = useState(false);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) router.replace('/dashboard');
      else setAuthorized(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async (): Promise<Record<SchemeTab, CandidateCard[]>> => {
    setLoading(true);
    const res = await fetch(`/api/admin/mark-schemes?subject=${subject}`);
    const { data } = res.ok ? await res.json() : { data: null };
    const grouped: Record<SchemeTab, CandidateCard[]> = { hybrid: [], content_checklist: [] };
    if (data) {
      for (const c of data as CandidateCard[]) {
        if (c.scheme_type in grouped) grouped[c.scheme_type].push(c);
      }
    }
    setAllCards(grouped);
    setLoading(false);
    return grouped;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authorized) return;
    const cards = allCards[tab];

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          setIdx(i => Math.min(i + 1, cards.length - 1));
          setShowOldSeed(false);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setIdx(i => Math.max(i - 1, 0));
          setShowOldSeed(false);
          break;
        case 'a': case 'A': doAction('approve'); break;
        case 'r': case 'R': doAction('reject');  break;
        case '?':            setHelpOpen(o => !o); break;
        case 'Escape':       setHelpOpen(false);   break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized, tab, idx, allCards]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const doAction = async (action: 'approve' | 'reject' | 'reset') => {
    const card = allCards[tab][idx];
    if (!card || saving) return;
    setSaving(true);

    await fetch(`/api/admin/mark-schemes/${card.id}/action`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        ...(action === 'approve' && card.existing_seed
          ? { supersede_id: card.existing_seed.id }
          : {}),
      }),
    });

    const fresh    = await load();
    const freshTab = fresh[tab];
    setIdx(i => Math.min(i, Math.max(0, freshTab.length - 1)));
    setShowOldSeed(false);
    setSaving(false);
  };

  const switchTab = (t: SchemeTab) => { setTab(t); setIdx(0); setShowOldSeed(false); };

  // ── Loading / auth gate ───────────────────────────────────────────────────
  if (authorized === null || (loading && allCards.hybrid.length === 0 && allCards.content_checklist.length === 0)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }

  const cards = allCards[tab];
  const card  = cards[idx] ?? null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--brand)', color: '#fff', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
          Mark Scheme Review — {SUBJECT_LABEL[subject] ?? 'IB Economics'}
        </span>
        <button
          onClick={() => setHelpOpen(o => !o)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', letterSpacing: '0.03em' }}
        >
          ? shortcuts
        </button>
      </header>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', position: 'sticky', top: 52, zIndex: 99 }}>
        {(['hybrid', 'content_checklist'] as SchemeTab[]).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            style={{
              background:   'transparent',
              border:       'none',
              borderBottom: tab === t ? '3px solid var(--brand)' : '3px solid transparent',
              color:        tab === t ? 'var(--brand)' : 'var(--text-muted)',
              fontFamily:   'var(--font-body)',
              fontWeight:   tab === t ? 700 : 400,
              fontSize:     12,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              padding:      '14px 18px 11px',
              cursor:       'pointer',
              transition:   'all 0.12s',
            }}
          >
            {TAB_LABEL[t]}
            <span style={{
              marginLeft:   8,
              borderRadius: 20,
              padding:      '2px 8px',
              fontSize:     11,
              fontWeight:   700,
              background:   tab === t ? 'var(--brand)' : 'var(--surface-2)',
              color:        tab === t ? '#fff' : 'var(--text-muted)',
            }}>
              {allCards[t].length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 860, margin: '28px auto', padding: '0 24px' }}>

        {cards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 15 }}>
            {loading ? 'Loading…' : `No ${TAB_LABEL[tab]} candidates remaining.`}
          </div>
        ) : (
          <>
            {/* Navigation bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {cards.length} candidate{cards.length !== 1 ? 's' : ''} to review
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => { setIdx(i => Math.max(i - 1, 0)); setShowOldSeed(false); }}
                  disabled={idx === 0}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 14px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.35 : 1, fontSize: 14 }}
                >
                  ←
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 52, textAlign: 'center' }}>
                  {idx + 1} / {cards.length}
                </span>
                <button
                  onClick={() => { setIdx(i => Math.min(i + 1, cards.length - 1)); setShowOldSeed(false); }}
                  disabled={idx === cards.length - 1}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 14px', cursor: idx === cards.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === cards.length - 1 ? 0.35 : 1, fontSize: 14 }}
                >
                  →
                </button>
              </div>
            </div>

            {card && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

                {/* Metadata bar */}
                <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-light)', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0 }}>
                  {[
                    card.question.paper,
                    card.question.question_type,
                    card.question.command_term.replace(/_/g, ' '),
                    `${card.max_marks}m`,
                    card.question.ao_level,
                    card.question.level,
                  ].map((item, i) => (
                    <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {i > 0 && <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>}
                      {item}
                    </span>
                  ))}
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.45 }}>
                    {card.id.slice(0, 8)}
                  </span>
                </div>

                {/* Question text */}
                <div style={{ padding: '24px 28px 20px' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, lineHeight: 1.78, color: 'var(--text)', margin: 0 }}>
                    {card.question.question_text}
                  </p>
                  {card.question.context_text && (
                    <div style={{ marginTop: 16, background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '12px 16px' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 6 }}>
                        Context / Stimulus
                      </div>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--text-muted)', margin: 0 }}>
                        {card.question.context_text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Scheme data */}
                <div style={{ borderTop: '1px solid var(--border-light)', padding: '20px 28px 24px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--brand)', marginBottom: 16 }}>
                    {TAB_LABEL[card.scheme_type]} mark scheme
                  </div>

                  {isHybridData(card.scheme_data)
                    ? <HybridRenderer data={card.scheme_data} />
                    : <ContentChecklistRenderer data={card.scheme_data as ContentChecklistData} />}

                  <DefectChecklist schemeType={card.scheme_type} />
                </div>

                {/* Supersede warning */}
                {card.existing_seed && (
                  <SupersedePanel
                    seed={card.existing_seed}
                    show={showOldSeed}
                    onToggle={() => setShowOldSeed(o => !o)}
                  />
                )}

                {/* Action bar */}
                <div style={{ borderTop: '1px solid var(--border-light)', background: 'var(--surface-2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => doAction('approve')}
                    disabled={saving}
                    style={{ background: 'transparent', color: 'var(--success)', border: '1.5px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '7px 18px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all 0.12s' }}
                  >
                    {saving ? 'Saving…' : card.existing_seed ? '[A] Approve & Retire Old' : '[A] Approve'}
                  </button>

                  <button
                    onClick={() => doAction('reject')}
                    disabled={saving}
                    style={{ background: 'transparent', color: 'var(--error)', border: '1.5px solid var(--error)', borderRadius: 'var(--radius-sm)', padding: '7px 18px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all 0.12s' }}
                  >
                    {saving ? 'Saving…' : '[R] Reject'}
                  </button>
                </div>

              </div>
            )}
          </>
        )}
      </div>

      {/* ── Help overlay ───────────────────────────────────────────────────── */}
      {helpOpen && (
        <div
          onClick={() => setHelpOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(14,43,30,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '32px 40px', maxWidth: 460, width: '90%', boxShadow: 'var(--shadow-lg)' }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--brand)', marginBottom: 20, letterSpacing: '-0.3px' }}>
              Keyboard shortcuts
            </h2>
            {([
              ['A',         'Approve — set status = seed (retires old seed if supersede case)'],
              ['R',         'Reject — set status = rejected'],
              ['→ / Space', 'Next card'],
              ['←',         'Previous card'],
              ['?',         'Toggle this overlay'],
              ['Esc',       'Close overlay'],
            ] as [string, string][]).map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', gap: 14, marginBottom: 10, alignItems: 'baseline' }}>
                <kbd style={{ fontFamily: 'monospace', fontSize: 11, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px', minWidth: 72, textAlign: 'center', flexShrink: 0 }}>
                  {key}
                </kbd>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{desc}</span>
              </div>
            ))}
            <button
              onClick={() => setHelpOpen(false)}
              style={{ marginTop: 22, background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 24px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default function MarkSchemeReviewPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    }>
      <MarkSchemeReviewInner />
    </Suspense>
  );
}
