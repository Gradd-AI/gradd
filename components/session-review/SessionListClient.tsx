'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

export type SessionRow = {
  id: string;
  subject: string | null;
  lesson_code: string | null;
  unit_name: string | null;
  session_type: string | null;
  started_at: string;
  apply_scores: string | null;
  weak_flags_count: number | null;
  lesson_complete: boolean | null;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function sessionTypeLabel(type: string | null): string {
  const map: Record<string, string> = {
    NEW_TOPIC: 'New topic', REVISION: 'Revision', EXAM_PRACTICE: 'Exam practice',
    ABQ_DRILL: 'ABQ drill', SHORT_Q_DRILL: 'Short Q drill', UNIT_CHECKPOINT: 'Checkpoint',
  };
  return (type && map[type]) || (type ?? '');
}

type SubjectFilter = 'all' | 'IB_ECONOMICS' | 'IB_BUSINESS';

const SUBJECT_LABELS: Record<SubjectFilter, string> = {
  all: 'All',
  IB_ECONOMICS: 'IB Economics',
  IB_BUSINESS: 'IB Business',
};

const CSS = `
.sl-controls { margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
.sl-tabs { display: flex; gap: 4px; background: var(--paper-2, oklch(93.5% 0.015 78)); border: 1px solid var(--rule, oklch(88% 0.01 78)); border-radius: 10px; padding: 3px; width: fit-content; }
.sl-tab {
  padding: 6px 16px; border-radius: 7px; border: none;
  background: transparent; cursor: pointer;
  font-family: var(--sans, "Geist",ui-sans-serif,system-ui,sans-serif);
  font-size: 13px; font-weight: 400;
  color: var(--ink-3, oklch(54% 0.012 60));
  transition: background 0.12s, color 0.12s;
  white-space: nowrap;
}
.sl-tab:hover:not(.active) { background: color-mix(in oklab, var(--paper) 70%, var(--paper-2)); color: var(--ink-2, oklch(34% 0.012 60)); }
.sl-tab.active { background: var(--paper, oklch(96.2% 0.012 78)); color: var(--ink, oklch(18% 0.012 60)); font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.10); }
.sl-search-input {
  width: 100%; padding: 9px 14px;
  border: 1px solid var(--rule-strong, oklch(82% 0.015 78));
  border-radius: 8px;
  background: var(--paper-2, oklch(93.5% 0.015 78));
  font-family: var(--sans, "Geist",ui-sans-serif,system-ui,sans-serif);
  font-size: 13.5px; color: var(--ink, oklch(18% 0.012 60));
  outline: none; transition: border-color 0.15s;
  box-sizing: border-box;
}
.sl-search-input:focus { border-color: color-mix(in oklab, var(--forest, oklch(22% 0.035 168)) 50%, var(--rule-strong)); }
.sl-search-input::placeholder { color: var(--ink-3, oklch(54% 0.012 60)); }
.sr-row { display:flex; align-items:center; gap:14px; padding:16px 20px; border-radius:12px; border:1px solid var(--rule, oklch(88% 0.01 78)); background:var(--paper, oklch(96.2% 0.012 78)); margin-bottom:8px; text-decoration:none; color:inherit; cursor:pointer; transition:background .12s,border-color .12s; }
.sr-row:hover { background:var(--paper-2, oklch(93.5% 0.015 78)); border-color:var(--rule-strong, oklch(82% 0.015 78)); }
.sr-row:active { background:var(--paper-3, oklch(89% 0.018 78)); border-color:var(--rule-strong, oklch(82% 0.015 78)); }
.sr-row-left { flex:1; min-width:0; }
.sr-lesson { font-family:var(--sans); font-size:14.5px; font-weight:500; color:var(--ink); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sr-meta { font-family:var(--mono, "Geist Mono",ui-monospace,monospace); font-size:11px; color:var(--ink-3); margin-top:4px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }
.sr-type { background:color-mix(in oklab,var(--forest, oklch(22% 0.035 168)) 8%,var(--paper)); padding:2px 7px; border-radius:4px; font-size:10.5px; color:var(--forest); }
.sr-row-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.sr-score { font-family:var(--mono); font-size:12px; color:var(--ink-2, oklch(34% 0.012 60)); }
.sr-weak-dot { width:7px; height:7px; border-radius:50%; background:var(--rust, oklch(58% 0.18 47)); flex-shrink:0; }
.sr-complete { font-size:13px; color:var(--forest); }
.sr-arrow { font-family:var(--mono); font-size:13px; color:var(--ink-3); }
.sr-empty { padding:48px 0; text-align:center; font-family:var(--sans); font-size:14px; color:var(--ink-3); }
@media (max-width:640px) {
  .sl-tabs { width: 100%; }
  .sl-tab { flex: 1; text-align: center; font-size: 12px; padding: 6px 10px; }
  .sr-row { padding:14px 16px; }
  .sr-lesson { font-size:14px; white-space:normal; }
}
`;

export default function SessionListClient({
  sessions,
  nameMap,
}: {
  sessions: SessionRow[];
  nameMap: Record<string, string>;
}) {
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const [query, setQuery] = useState('');

  // Only show subject tabs if sessions span multiple subjects
  const hasMultipleSubjects = useMemo(() => {
    const subjects = new Set(sessions.map(s => s.subject).filter(Boolean));
    return subjects.size > 1;
  }, [sessions]);

  const filtered = useMemo(() => {
    let result = sessions;
    if (hasMultipleSubjects && subjectFilter !== 'all') {
      result = result.filter(s => s.subject === subjectFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter(s => {
        const name = (s.lesson_code && nameMap[s.lesson_code]) || s.lesson_code || '';
        const unit  = s.unit_name ?? '';
        return name.toLowerCase().includes(q) || unit.toLowerCase().includes(q);
      });
    }
    return result;
  }, [sessions, subjectFilter, query, nameMap, hasMultipleSubjects]);

  return (
    <>
      <style>{CSS}</style>

      <div className="sl-controls">
        {hasMultipleSubjects && (
          <div className="sl-tabs" role="tablist" aria-label="Filter by subject">
            {(['all', 'IB_ECONOMICS', 'IB_BUSINESS'] as SubjectFilter[]).map(s => (
              <button
                key={s}
                role="tab"
                aria-pressed={subjectFilter === s}
                className={`sl-tab${subjectFilter === s ? ' active' : ''}`}
                onClick={() => setSubjectFilter(s)}
              >
                {SUBJECT_LABELS[s]}
              </button>
            ))}
          </div>
        )}

        <input
          className="sl-search-input"
          type="search"
          placeholder="Search lessons — e.g. elasticity, motivation, pricing"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search sessions by lesson name"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="sr-empty">
          {query || subjectFilter !== 'all'
            ? 'No sessions match — try a different search or filter.'
            : 'No completed sessions yet.'}
        </div>
      ) : (
        filtered.map(s => {
          const lessonName = (s.lesson_code && nameMap[s.lesson_code]) || s.lesson_code || '—';
          const date       = formatDate(s.started_at);
          const firstScore = s.apply_scores ? s.apply_scores.split(',')[0] : null;

          return (
            <Link key={s.id} href={`/sessions/${s.id}`} className="sr-row">
              <div className="sr-row-left">
                <div className="sr-lesson">{lessonName}</div>
                <div className="sr-meta">
                  <span>{date}</span>
                  {s.unit_name && <span>{s.unit_name}</span>}
                  <span className="sr-type">{sessionTypeLabel(s.session_type)}</span>
                </div>
              </div>
              <div className="sr-row-right">
                {firstScore && <span className="sr-score">{firstScore}</span>}
                {(s.weak_flags_count ?? 0) > 0 && (
                  <span className="sr-weak-dot" title="Weak areas flagged in this session" />
                )}
                {s.lesson_complete && (
                  <span className="sr-complete" title="Lesson complete">✓</span>
                )}
                <span className="sr-arrow">→</span>
              </div>
            </Link>
          );
        })
      )}
    </>
  );
}
