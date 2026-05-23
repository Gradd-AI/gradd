'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const ADMIN_EMAIL = 'testbundle@gradd.ai';

type Question = {
  id: string;
  topic_code: string;
  paper: string;
  question_type: string;
  command_term: string;
  marks: number;
  ao_level: string;
  level: string;
  subject: string;
  question_text: string;
  context_text: string | null;
  verification_notes: Record<string, unknown> | null;
  verification_status: string;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
};

type Bucket = 'pass' | 'borderline' | 'fail';

const BUCKET_LABEL: Record<Bucket, string> = { pass: 'PASS', borderline: 'BORDERLINE', fail: 'FAIL' };
const BUCKET_COLOR: Record<Bucket, string> = {
  pass: 'var(--success)',
  borderline: 'var(--accent)',
  fail: 'var(--error)',
};

export default function SeedReviewPage() {
  const router  = useRouter();
  const sb      = getSupabaseBrowserClient();

  const [authorized,    setAuthorized]    = useState<boolean | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [bucket,        setBucket]        = useState<Bucket>('pass');
  const [allQs,         setAllQs]         = useState<Record<Bucket, Question[]>>({ pass: [], borderline: [], fail: [] });
  const [counts,        setCounts]        = useState<Record<Bucket, number>>({ pass: 0, borderline: 0, fail: 0 });
  const [idx,           setIdx]           = useState(0);
  const [notesOpen,     setNotesOpen]     = useState(false);
  const [helpOpen,      setHelpOpen]      = useState(false);
  const [editMode,      setEditMode]      = useState(false);
  const [editText,      setEditText]      = useState('');
  const [editCtx,       setEditCtx]       = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);

  // ── Auth ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user || user.email !== ADMIN_EMAIL) router.replace('/dashboard');
      else setAuthorized(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async (): Promise<Record<Bucket, Question[]>> => {
    setLoading(true);
    // Fetch via service-role API route — browser Supabase client is blocked by RLS
    const res = await fetch('/api/admin/questions');
    const { data } = res.ok ? await res.json() : { data: null };

    const grouped: Record<Bucket, Question[]> = { pass: [], borderline: [], fail: [] };
    if (data) {
      for (const q of data as Question[]) {
        const b = q.verification_status as Bucket;
        if (b in grouped) grouped[b].push(q);
      }
    }
    setAllQs(grouped);
    setCounts({ pass: grouped.pass.length, borderline: grouped.borderline.length, fail: grouped.fail.length });
    setLoading(false);
    return grouped;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (authorized) load(); }, [authorized, load]);

  // ── Keyboard ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (editMode || !authorized) return;
    const qs = allQs[bucket];

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          setIdx(i => Math.min(i + 1, qs.length - 1));
          setNotesOpen(false);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setIdx(i => Math.max(i - 1, 0));
          setNotesOpen(false);
          break;
        case 'a': case 'A': doAction('approve'); break;
        case 'r': case 'R': doAction('reject');  break;
        case 'e': case 'E': openEdit(qs[idx]);  break;
        case 'v': case 'V': setNotesOpen(o => !o); break;
        case '?':           setHelpOpen(o => !o);  break;
        case 'Escape':      setHelpOpen(false);     break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, authorized, bucket, idx, allQs]);

  // ── Actions ───────────────────────────────────────────────────────────────────
  const openEdit = (q: Question | undefined) => {
    if (!q) return;
    setEditText(q.question_text);
    setEditCtx(q.context_text ?? '');
    setEditMode(true);
    setTimeout(() => editRef.current?.focus(), 40);
  };

  const doAction = async (action: 'approve' | 'reject' | 'reset') => {
    const q = allQs[bucket][idx];
    if (!q || saving) return;
    setSaving(true);
    await fetch(`/api/admin/questions/${q.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const fresh = await load();
    const freshBucket = fresh[bucket];
    const nextUnreviewed = freshBucket.findIndex(x => !x.approved_at && x.status === 'candidate');
    setIdx(nextUnreviewed !== -1 ? nextUnreviewed : Math.min(idx, freshBucket.length - 1));
    setNotesOpen(false);
    setSaving(false);
  };

  const doEdit = async () => {
    const q = allQs[bucket][idx];
    if (!q || saving) return;
    setSaving(true);
    await fetch(`/api/admin/questions/${q.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit', question_text: editText, context_text: editCtx || null }),
    });
    await load();
    setEditMode(false);
    setSaving(false);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const switchBucket = (b: Bucket) => {
    setBucket(b);
    setIdx(0);
    setNotesOpen(false);
    setEditMode(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  if (authorized === null || (loading && allQs.pass.length === 0)) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
        Loading…
      </div>
    );
  }

  const qs          = allQs[bucket];
  const q           = qs[idx] ?? null;
  const isApproved  = q?.status === 'seed';
  const isRejected  = q?.status === 'rejected';
  const unreviewed  = qs.filter(x => !x.approved_at && x.status === 'candidate').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font-body)' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: 'var(--brand)', color: '#fff', padding: '0 32px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
          🌿 Seed Review
        </span>
        <button
          onClick={() => setHelpOpen(o => !o)}
          style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)', letterSpacing: '0.03em' }}
        >
          ? shortcuts
        </button>
      </header>

      {/* ── Bucket tabs ────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 32px', display: 'flex', gap: 0, position: 'sticky', top: 52, zIndex: 99 }}>
        {(['pass', 'borderline', 'fail'] as Bucket[]).map(b => (
          <button
            key={b}
            onClick={() => switchBucket(b)}
            style={{
              background: 'transparent', border: 'none',
              borderBottom: bucket === b ? `3px solid var(--brand)` : '3px solid transparent',
              color: bucket === b ? 'var(--brand)' : 'var(--text-muted)',
              fontFamily: 'var(--font-body)', fontWeight: bucket === b ? 700 : 400,
              fontSize: 12, letterSpacing: '0.07em', textTransform: 'uppercase',
              padding: '14px 18px 11px', cursor: 'pointer', transition: 'all 0.12s',
            }}
          >
            {BUCKET_LABEL[b]}
            <span style={{
              marginLeft: 8, borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700,
              background: bucket === b ? 'var(--brand)' : 'var(--surface-2)',
              color: bucket === b ? '#fff' : 'var(--text-muted)',
            }}>
              {counts[b]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 840, margin: '28px auto', padding: '0 24px' }}>
        {qs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 15 }}>
            No questions in this bucket.
          </div>
        ) : (
          <>
            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {unreviewed > 0 ? `${unreviewed} unreviewed` : '✓ All reviewed'}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => { setIdx(i => Math.max(i - 1, 0)); setNotesOpen(false); }}
                  disabled={idx === 0}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 14px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.35 : 1, fontSize: 14 }}
                >
                  ←
                </button>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 52, textAlign: 'center' }}>
                  {idx + 1} / {qs.length}
                </span>
                <button
                  onClick={() => { setIdx(i => Math.min(i + 1, qs.length - 1)); setNotesOpen(false); }}
                  disabled={idx === qs.length - 1}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 14px', cursor: idx === qs.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === qs.length - 1 ? 0.35 : 1, fontSize: 14 }}
                >
                  →
                </button>
              </div>
            </div>

            {q && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>

                {/* Metadata bar */}
                <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-light)', padding: '10px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0 0' }}>
                  {[q.topic_code, q.paper, q.question_type, q.command_term.replace(/_/g, ' '), `${q.marks}m`, q.ao_level, q.level].map((item, i) => (
                    <span key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {i > 0 && <span style={{ margin: '0 8px', opacity: 0.35 }}>·</span>}
                      {item}
                    </span>
                  ))}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.7 }}>
                      {bucket.toUpperCase()}
                    </span>
                    {isApproved && (
                      <span style={{ background: 'var(--success)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                        ✓ Seed
                      </span>
                    )}
                    {isRejected && (
                      <span style={{ background: 'var(--error)', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                        ✗ Rejected
                      </span>
                    )}
                  </div>
                </div>

                {/* Question body */}
                <div style={{ padding: '28px 32px' }}>
                  {editMode ? (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
                        Editing question_text
                      </div>
                      <textarea
                        ref={editRef}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doEdit(); }
                          if (e.key === 'Escape') setEditMode(false);
                        }}
                        style={{ width: '100%', minHeight: 130, fontFamily: 'var(--font-display)', fontSize: 17, lineHeight: 1.75, color: 'var(--text)', background: 'var(--surface-2)', border: '1.5px solid var(--brand)', borderRadius: 'var(--radius-sm)', padding: '14px 16px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', margin: '16px 0 8px' }}>
                        context_text (optional)
                      </div>
                      <textarea
                        value={editCtx}
                        onChange={e => setEditCtx(e.target.value)}
                        onKeyDown={e => {
                          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); doEdit(); }
                          if (e.key === 'Escape') setEditMode(false);
                        }}
                        placeholder="Leave empty to clear context"
                        style={{ width: '100%', minHeight: 80, fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.6, color: 'var(--text)', background: 'var(--surface-2)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
                      />
                      <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                        <button onClick={doEdit} disabled={saving} style={{ background: 'var(--brand)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 20px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                          {saving ? 'Saving…' : 'Save  Ctrl+↵'}
                        </button>
                        <button onClick={() => setEditMode(false)} style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 20px', fontFamily: 'var(--font-body)', fontSize: 13, cursor: 'pointer' }}>
                          Cancel  Esc
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: 19, lineHeight: 1.78, color: 'var(--text)', margin: 0 }}>
                        {q.question_text}
                      </p>
                      {q.context_text && (
                        <div style={{ marginTop: 20, background: 'var(--surface-2)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '14px 18px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                            Context / Stimulus
                          </div>
                          <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.65, color: 'var(--text-muted)', margin: 0 }}>
                            {q.context_text}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Verification notes toggle */}
                <div style={{ borderTop: '1px solid var(--border-light)', padding: '10px 24px' }}>
                  <button
                    onClick={() => setNotesOpen(o => !o)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}
                  >
                    <span style={{ display: 'inline-block', transition: 'transform 0.12s', transform: notesOpen ? 'rotate(90deg)' : 'none', fontSize: 10 }}>▶</span>
                    verification_notes
                    <span style={{ opacity: 0.45, fontSize: 10 }}>[v]</span>
                    {q.verification_notes && (
                      <span style={{ marginLeft: 4, background: BUCKET_COLOR[bucket], color: '#fff', borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 700 }}>
                        {String((q.verification_notes as Record<string, unknown>).overall ?? '—')}
                      </span>
                    )}
                  </button>
                  {notesOpen && q.verification_notes && (
                    <pre style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', overflowX: 'auto', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '10px 0 0' }}>
                      {JSON.stringify(q.verification_notes, null, 2)}
                    </pre>
                  )}
                </div>

                {/* Action bar */}
                {!editMode && (
                  <div style={{ borderTop: '1px solid var(--border-light)', background: 'var(--surface-2)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      onClick={() => doAction('approve')}
                      disabled={saving || isApproved}
                      style={{ background: isApproved ? 'var(--success)' : 'transparent', color: isApproved ? '#fff' : 'var(--success)', border: '1.5px solid var(--success)', borderRadius: 'var(--radius-sm)', padding: '7px 18px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: (saving || isApproved) ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all 0.12s' }}
                    >
                      {isApproved ? '✓ Approved' : '[A] Approve'}
                    </button>

                    <button
                      onClick={() => doAction('reject')}
                      disabled={saving || isRejected}
                      style={{ background: isRejected ? 'var(--error)' : 'transparent', color: isRejected ? '#fff' : 'var(--error)', border: '1.5px solid var(--error)', borderRadius: 'var(--radius-sm)', padding: '7px 18px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: (saving || isRejected) ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all 0.12s' }}
                    >
                      {isRejected ? '✗ Rejected' : '[R] Reject'}
                    </button>

                    <button
                      onClick={() => openEdit(q)}
                      disabled={saving}
                      style={{ background: 'transparent', color: 'var(--text-muted)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '7px 18px', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, transition: 'all 0.12s' }}
                    >
                      [E] Edit
                    </button>

                    {(isApproved || isRejected) && !saving && (
                      <button
                        onClick={() => doAction('reset')}
                        style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'var(--font-body)', padding: 0 }}
                      >
                        change verdict
                      </button>
                    )}
                  </div>
                )}
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
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '32px 40px', maxWidth: 440, width: '90%', boxShadow: 'var(--shadow-lg)' }}
          >
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--brand)', marginBottom: 20, letterSpacing: '-0.3px' }}>
              Keyboard shortcuts
            </h2>
            {([
              ['A',         'Approve — set status = seed'],
              ['R',         'Reject question'],
              ['E',         'Edit question text / context'],
              ['→ / Space', 'Next question'],
              ['←',         'Previous question'],
              ['V',         'Toggle verification notes'],
              ['?',         'Toggle this overlay'],
              ['Esc',       'Close overlay / cancel edit'],
              ['Ctrl + ↵',  'Save edit (in edit mode)'],
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
