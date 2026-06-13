'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ── Topic name lookup maps ────────────────────────────────────────────────────
// Keys are the IBO sub-topic codes stored in lessons.topic_code.
// Separate maps per subject because Econ and BM share the same numbering scheme
// (both start at 1.1) — subject is detected from lesson_code prefixes at runtime.

const IB_ECON_TOPICS: Record<string, string> = {
  // Unit 1 — Introduction to economics
  '1.1': 'Scope of economics',
  '1.2': 'How economists approach the world',
  '1.3': 'The economic problem',
  // Unit 2 — Microeconomics
  '2.1': 'Demand',
  '2.2': 'Supply',
  '2.3': 'Competitive market equilibrium',
  '2.4': 'Critique of the maximizing assumption',
  '2.5': 'Theory of the firm and market structures',
  '2.6': 'Price elasticity of demand',
  '2.7': 'Income elasticity of demand',
  '2.8': 'Cross-price elasticity of demand',
  '2.9': 'Price elasticity of supply',
  '2.10': 'Role of government in markets',
  '2.11': 'Market failure — externalities',
  '2.12': 'Market failure — public goods',
  '2.13': 'Market failure — asymmetric information',
  '2.14': 'Market failure — common pool resources',
  // Unit 3 — Macroeconomics
  '3.1': 'Measuring economic activity',
  '3.2': 'Aggregate demand and aggregate supply',
  '3.3': 'Economic growth',
  '3.4': 'Low unemployment',
  '3.5': 'Low and stable inflation',
  '3.6': 'Sustainable current account',
  '3.7': 'Fiscal policy',
  '3.8': 'Monetary policy',
  '3.9': 'Supply-side policies',
  '3.10': 'Direct provision of public goods',
  '3.11': 'Poverty and income inequality',
  // Unit 4 — The global economy
  '4.1': 'Benefits of international trade',
  '4.2': 'Types of trade protection',
  '4.3': 'Arguments for and against protection',
  '4.4': 'Economic integration',
  '4.5': 'Exchange rates',
  '4.6': 'Balance of payments',
  '4.7': 'Sustainable development',
  '4.8': 'Measuring development',
  '4.9': 'Barriers to development',
  '4.10': 'Development strategies',
};

const IB_BM_TOPICS: Record<string, string> = {
  // Unit 1 — Business organisation and environment
  '1.1': 'Introduction to business management',
  '1.2': 'Types of organizations',
  '1.3': 'Organizational objectives',
  '1.4': 'Stakeholders',
  '1.5': 'External environment',
  '1.6': 'Growth and evolution',
  // Unit 2 — Human resource management
  '2.1': 'Introduction to HRM',
  '2.2': 'Organizational structure',
  '2.3': 'Leadership and management',
  '2.4': 'Motivation',
  '2.5': 'Organizational culture',
  '2.6': 'Communication',
  '2.7': 'Industrial/employee relations',
  // Unit 3 — Finance and accounts
  '3.1': 'Introduction to finance',
  '3.2': 'Sources of finance',
  '3.3': 'Costs and revenues',
  '3.4': 'Final accounts',
  '3.5': 'Profitability and liquidity',
  '3.6': 'Efficiency ratios',
  '3.7': 'Cash flow',
  '3.8': 'Investment appraisal',
  '3.9': 'Budgets',
  // Unit 4 — Marketing
  '4.1': 'Introduction to marketing',
  '4.2': 'Marketing planning',
  '4.3': 'Sales forecasting',
  '4.4': 'Market research',
  '4.5': 'The marketing mix',
  '4.6': 'International marketing',
  '4.7': 'E-commerce',
  // Unit 5 — Operations management
  '5.1': 'Introduction to operations management',
  '5.2': 'Operations methods',
  '5.3': 'Lean production and quality management',
  '5.4': 'Location',
  '5.5': 'Production planning',
  '5.6': 'Crisis management',
  '5.7': 'Research and development',
  '5.8': 'Management information systems',
  // Toolkit
  'TK': 'Business management toolkit',
};

export interface PickerLesson {
  lesson_code: string;
  lesson_name: string;
  unit_code: string;
  unit_name: string;
  topic_code: string | null;
  level: string;
}

interface CoursePickerProps {
  lessons: PickerLesson[];
  completedCodes: string[];
  weakAreaCodes: string[];
  currentLessonCode: string;
  examLevel: string;
}

export default function CoursePicker({
  lessons,
  completedCodes,
  weakAreaCodes,
  currentLessonCode,
  examLevel,
}: CoursePickerProps) {
  const router = useRouter();
  const completedSet = useMemo(() => new Set(completedCodes), [completedCodes]);
  const weakSet     = useMemo(() => new Set(weakAreaCodes),  [weakAreaCodes]);
  const isSL        = examLevel === 'SL';

  const [query, setQuery] = useState('');

  const visibleLessons = useMemo(
    () => (isSL ? lessons.filter(l => l.level !== 'HL_ONLY') : lessons),
    [lessons, isSL]
  );

  // Detect subject from lesson code prefixes so Econ and BM topic codes resolve correctly.
  const topicNames = useMemo(() => {
    const first = lessons[0]?.lesson_code ?? '';
    if (first.startsWith('IB_ECON_')) return IB_ECON_TOPICS;
    if (first.startsWith('IB_BM_'))   return IB_BM_TOPICS;
    return {};
  }, [lessons]);

  // Search: filter visibleLessons against lesson_name, unit_name, and topic name.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return visibleLessons.filter(l => {
      const topicName = l.topic_code ? (topicNames[l.topic_code] ?? '') : '';
      return (
        l.lesson_name.toLowerCase().includes(q) ||
        l.unit_name.toLowerCase().includes(q) ||
        topicName.toLowerCase().includes(q)
      );
    });
  }, [query, visibleLessons, topicNames]);

  // Group: unit_code → topic_key → PickerLesson[]
  // Map preserves insertion order → units/topics stay in lesson_code order.
  type TopicMap = Map<string, PickerLesson[]>;
  type UnitEntry = { unit_name: string; topics: TopicMap };
  const tree = useMemo(() => {
    const map = new Map<string, UnitEntry>();
    for (const lesson of visibleLessons) {
      if (!map.has(lesson.unit_code))
        map.set(lesson.unit_code, { unit_name: lesson.unit_name, topics: new Map() });
      const unit = map.get(lesson.unit_code)!;
      const tKey = lesson.topic_code ?? '_';
      if (!unit.topics.has(tKey)) unit.topics.set(tKey, []);
      unit.topics.get(tKey)!.push(lesson);
    }
    return map;
  }, [visibleLessons]);

  // Locate the current lesson to auto-expand its unit + topic on mount.
  const currentLesson  = visibleLessons.find(l => l.lesson_code === currentLessonCode);
  const currentUnit    = currentLesson?.unit_code ?? '';
  const currentTopicKey = currentUnit
    ? `${currentUnit}:${currentLesson?.topic_code ?? '_'}`
    : '';

  const [expandedUnits,  setExpandedUnits]  = useState<Set<string>>(() => new Set(currentUnit    ? [currentUnit]    : []));
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => new Set(currentTopicKey ? [currentTopicKey] : []));

  function toggleUnit(code: string) {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleTopic(key: string) {
    setExpandedTopics(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <div className="picker-tree">

      {/* ── Search input ── */}
      <div className="picker-search">
        <input
          className="picker-search-input"
          type="search"
          placeholder="Search topics — e.g. elasticity, mergers, inflation"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search lessons"
        />
      </div>

      {/* ── Results or tree ── */}
      {searchResults !== null ? (

        searchResults.length === 0 ? (
          <div className="picker-empty">No topics match — try another term</div>
        ) : (
          searchResults.map(lesson => {
            const isDone    = completedSet.has(lesson.lesson_code);
            const isCurrent = lesson.lesson_code === currentLessonCode;
            const hasWeak   = weakSet.has(lesson.lesson_code);
            const topicName = lesson.topic_code ? (topicNames[lesson.topic_code] ?? null) : null;
            const ctx       = [lesson.unit_name, topicName].filter(Boolean).join(' · ');
            return (
              <div
                key={lesson.lesson_code}
                className={`picker-lesson picker-result${isCurrent ? ' current' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/session?lesson=${encodeURIComponent(lesson.lesson_code)}`)}
                onKeyDown={e => e.key === 'Enter' && router.push(`/session?lesson=${encodeURIComponent(lesson.lesson_code)}`)}
              >
                <span className={`picker-marker${isDone ? ' done' : isCurrent ? ' here' : ' todo'}`}>
                  {isDone ? '✓' : isCurrent ? '◉' : '○'}
                </span>
                <div className="picker-result-body">
                  <div className="picker-lesson-name">{lesson.lesson_name}</div>
                  {ctx && <div className="picker-result-ctx">{ctx}</div>}
                </div>
                {hasWeak && <span className="picker-weak-dot" title="Active weak area" />}
                <span className="picker-lesson-cta">{isCurrent ? 'resume →' : 'study →'}</span>
              </div>
            );
          })
        )

      ) : (

        Array.from(tree.entries()).map(([unitCode, { unit_name, topics }]) => {
          const allInUnit     = Array.from(topics.values()).flat();
          const doneInUnit    = allInUnit.filter(l => completedSet.has(l.lesson_code)).length;
          const hasReview     = allInUnit.some(l => weakSet.has(l.lesson_code));
          const pct           = allInUnit.length ? Math.round((doneInUnit / allInUnit.length) * 100) : 0;
          const isUnitOpen    = expandedUnits.has(unitCode);

          return (
            <div key={unitCode} className="picker-unit">
              <button
                className="picker-unit-hd"
                onClick={() => toggleUnit(unitCode)}
                aria-expanded={isUnitOpen}
              >
                <span className={`picker-chevron${isUnitOpen ? ' open' : ''}`}>▶</span>
                <span className="picker-unit-name">{unit_name}</span>
                {hasReview && <span className="picker-review-dot" title="Active weak areas in this unit" />}
                <span className="picker-unit-meta">
                  <span className="picker-unit-bar">
                    <span className="picker-unit-bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="picker-unit-count">{doneInUnit}/{allInUnit.length}</span>
                </span>
              </button>

              {isUnitOpen && Array.from(topics.entries()).map(([topicKey, topicLessons]) => {
                const tKey        = `${unitCode}:${topicKey}`;
                const isTopicOpen = expandedTopics.has(tKey);
                const topicDone   = topicLessons.filter(l => completedSet.has(l.lesson_code)).length;
                const topicReview = topicLessons.some(l => weakSet.has(l.lesson_code));
                const showTopicHd = topicKey !== '_';

                return (
                  <div key={tKey} className="picker-topic">
                    {showTopicHd ? (
                      <button
                        className="picker-topic-hd"
                        onClick={() => toggleTopic(tKey)}
                        aria-expanded={isTopicOpen}
                      >
                        <span className="picker-topic-code">{topicKey}</span>
                        {topicNames[topicKey] && (
                          <>
                            <span className="picker-topic-sep">·</span>
                            <span className="picker-topic-name">{topicNames[topicKey]}</span>
                          </>
                        )}
                        <span className="picker-topic-count">{topicDone}/{topicLessons.length}</span>
                        {topicReview && <span className="picker-topic-review-dot" title="Active weak areas in this topic" />}
                        <span className={`picker-chevron small${isTopicOpen ? ' open' : ''}`}>▶</span>
                      </button>
                    ) : null}

                    {(!showTopicHd || isTopicOpen) && topicLessons.map(lesson => {
                      const isDone    = completedSet.has(lesson.lesson_code);
                      const isCurrent = lesson.lesson_code === currentLessonCode;
                      const hasWeak   = weakSet.has(lesson.lesson_code);

                      return (
                        <div
                          key={lesson.lesson_code}
                          className={`picker-lesson${isCurrent ? ' current' : ''}`}
                          role="button"
                          tabIndex={0}
                          onClick={() => router.push(`/session?lesson=${encodeURIComponent(lesson.lesson_code)}`)}
                          onKeyDown={e => e.key === 'Enter' && router.push(`/session?lesson=${encodeURIComponent(lesson.lesson_code)}`)}
                        >
                          <span className={`picker-marker${isDone ? ' done' : isCurrent ? ' here' : ' todo'}`}>
                            {isDone ? '✓' : isCurrent ? '◉' : '○'}
                          </span>
                          <span className="picker-lesson-name">{lesson.lesson_name}</span>
                          {hasWeak && <span className="picker-weak-dot" title="Active weak area" />}
                          <span className="picker-lesson-cta">{isCurrent ? 'resume →' : 'study →'}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })

      )}
    </div>
  );
}
