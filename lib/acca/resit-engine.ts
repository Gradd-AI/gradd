// lib/acca/resit-engine.ts
//
// STRUCTURAL engine for the free /acca/resit diagnostic. Code decides the
// profile; the model only narrates it. This module is the single source of
// truth for the topic groups, the habit questions, and the deterministic
// mapping from raw inputs → { weak_prefixes, habits }. It is pure and
// unit-testable: no I/O, no model calls, no randomness.
//
// The page renders TOPIC_GROUPS / HABIT_QUESTIONS, the API validates against
// them, and computeProfile() is the one function that turns answers into the
// weak-area + habit profile that both the narrative call and the drill CTA
// consume. lo_code prefixes here match app/api/acca/next-drill's LIKE keying
// (e.g. 'A3' → drills where lo_code LIKE 'A3%').

export type Rating = 'weak' | 'mixed' | 'ok';

// ── Topic groups ──────────────────────────────────────────────────────────────
// Plain-English areas rather than syllabus letters: pre-S26 sitters have the
// OLD-syllabus breakdown on their result slip, so we never ask them to map
// their result onto A1/B3/etc. Each group carries the lo_code prefix(es) the
// deterministic mapping targets in acca_drills.

export interface TopicGroup {
  id: string;
  label: string;
  hint: string;        // short clarifier shown under the label
  prefixes: string[];  // lo_code prefixes for drill selection
}

export const TOPIC_GROUPS: TopicGroup[] = [
  { id: 'kpis',           label: 'Strategic performance measurement & KPIs', hint: 'ROI, RI, EVA, financial vs non-financial measures', prefixes: ['A3', 'A4'] },
  { id: 'strategy',       label: 'Strategy, mission & stakeholders',         hint: 'strategic planning, mission, stakeholder goals',      prefixes: ['A1', 'A2'] },
  { id: 'sustainability', label: 'Sustainability & ESG',                     hint: 'environmental / social performance, ESG reporting',   prefixes: ['A5'] },
  { id: 'budgeting',      label: 'Budgeting & variances',                    hint: 'budgetary control, variance analysis',                prefixes: ['B1'] },
  { id: 'reward',         label: 'Reward & incentives',                      hint: 'reward schemes, behavioural effects, targets',        prefixes: ['B2'] },
  { id: 'improvement',    label: 'Improvement models',                       hint: 'Building Block model, performance pyramid, BSC',      prefixes: ['B3'] },
  { id: 'complex',        label: 'Complex structures & SLAs',                hint: 'divisions, transfer pricing, service-level agreements', prefixes: ['B4'] },
  { id: 'reports',        label: 'Performance reports & their weaknesses',   hint: 'management reports, what makes them misleading',       prefixes: ['C1'] },
  { id: 'tech',           label: 'Tech & information systems',               hint: 'information systems, sources, data for decisions',     prefixes: ['D1'] },
  { id: 'data',           label: 'Data & analytics',                         hint: 'big data, analytics, data-driven performance insight', prefixes: ['D2'] },
];

export const TOPIC_GROUP_IDS = new Set(TOPIC_GROUPS.map((g) => g.id));

// ── Habit diagnostic ──────────────────────────────────────────────────────────
// The six failure habits behind most APM fails (from TEACHING_PRINCIPLES_EZRA.md).
// Questions are student-voiced, no jargon. For every question option 'a' is the
// habit at its worst (score 2), 'b' is partial (1), 'c' is the strong behaviour
// (0). Severity is read straight off the chosen option's score.

export type HabitId =
  | 'describe_vs_apply'
  | 'verb_object_drift'
  | 'scepticism'
  | 'prof_skills'
  | 'pacing'
  | 'requirement_planning';

export interface HabitMeta {
  id: HabitId;
  label: string; // what the habit is, one line
  fix: string;   // the move that fixes it
}

export const HABITS: Record<HabitId, HabitMeta> = {
  describe_vs_apply: {
    id: 'describe_vs_apply',
    label: 'Describing models instead of applying them to the company',
    fix: 'Lead with the company’s situation; bring in only the parts of the model that earn a mark there.',
  },
  verb_object_drift: {
    id: 'verb_object_drift',
    label: 'Drifting off the command verb and the exact thing it names',
    fix: 'Do what the verb says — evaluate means weigh up and judge — on the specific thing named, not the topic in general.',
  },
  scepticism: {
    id: 'scepticism',
    label: 'Taking the scenario’s numbers and claims at face value',
    fix: 'Challenge the figures: what’s behind them, what’s excluded, could they be flattering or short-termist.',
  },
  prof_skills: {
    id: 'prof_skills',
    label: 'Not consciously showing the professional skill being marked',
    fix: 'Notice who you’re writing to and which skill the question rewards — analysis, scepticism, communication, commercial acumen.',
  },
  pacing: {
    id: 'pacing',
    label: 'Losing marks to time — a requirement left thin or blank',
    fix: 'Split your time by the marks and move on when the clock says so; a finished B-grade beats a perfect half-answer.',
  },
  requirement_planning: {
    id: 'requirement_planning',
    label: 'Writing before planning against the requirement',
    fix: 'Break the requirement into its parts first and plan a line for each before you write a word.',
  },
};

export interface HabitOption {
  value: 'a' | 'b' | 'c';
  text: string;
  score: 0 | 1 | 2;
}

export interface HabitQuestion {
  habit: HabitId;
  prompt: string;
  options: HabitOption[];
}

export const HABIT_QUESTIONS: HabitQuestion[] = [
  {
    habit: 'describe_vs_apply',
    prompt: 'A question names a model — say the Building Block model or the balanced scorecard. What do you usually end up writing?',
    options: [
      { value: 'a', text: 'I explain what the model is and its parts. I know the theory well, so I set it out.', score: 2 },
      { value: 'b', text: 'I explain the model, then try to link a bit of it to the company at the end.', score: 1 },
      { value: 'c', text: 'I go straight at the company’s situation and only pull in the bits of the model that fit it.', score: 0 },
    ],
  },
  {
    habit: 'verb_object_drift',
    prompt: 'The question says “evaluate the proposed bonus scheme.” Be honest — what does your answer actually do?',
    options: [
      { value: 'a', text: 'I write what I know about bonus schemes in general.', score: 2 },
      { value: 'b', text: 'I give some good and bad points about this scheme but don’t really come down on a verdict.', score: 1 },
      { value: 'c', text: 'I weigh up this specific scheme and reach a clear judgement on it.', score: 0 },
    ],
  },
  {
    habit: 'scepticism',
    prompt: 'The scenario tells you “the new division improved ROI to 18%.” What goes through your head?',
    options: [
      { value: 'a', text: 'Good — I use it. The numbers in the question are there to be used.', score: 2 },
      { value: 'b', text: 'I use it, and add a line that results can sometimes be flattering.', score: 1 },
      { value: 'c', text: 'I ask what’s behind it — how it was measured, what’s left out, whether it’s short-term.', score: 0 },
    ],
  },
  {
    habit: 'prof_skills',
    prompt: 'APM gives marks for professional skills — analysis, scepticism, communication, commercial sense. When you’re writing, how aware of them are you?',
    options: [
      { value: 'a', text: 'Honestly, I’ve never really thought about those while writing.', score: 2 },
      { value: 'b', text: 'I’ve heard of them but don’t consciously aim for them in the moment.', score: 1 },
      { value: 'c', text: 'I think about who I’m writing to and which skill the question is testing.', score: 0 },
    ],
  },
  {
    habit: 'pacing',
    prompt: 'Think about your last attempt under exam time. What actually happened?',
    options: [
      { value: 'a', text: 'I ran out of time and left a requirement half-done or blank.', score: 2 },
      { value: 'b', text: 'I finished, but the last answer was rushed and thin.', score: 1 },
      { value: 'c', text: 'I paced it to the marks and gave every part a proper go.', score: 0 },
    ],
  },
  {
    habit: 'requirement_planning',
    prompt: 'You open a 20-mark question. What’s the first thing you do?',
    options: [
      { value: 'a', text: 'Start writing — I think best once I get going.', score: 2 },
      { value: 'b', text: 'Jot a couple of words, then dive in.', score: 1 },
      { value: 'c', text: 'Break the requirement into its parts and plan a line for each before writing.', score: 0 },
    ],
  },
];

// ── Inputs & profile ──────────────────────────────────────────────────────────

export interface ResitInputs {
  score: number;                             // 0–49 (a fail score)
  sitting: string;                           // e.g. "Jun 2026"
  attempts: number;                          // 1+
  topic_ratings: Record<string, Rating>;     // group id → rating
  habit_answers: Record<string, 'a' | 'b' | 'c'>; // habit id → chosen option
}

export interface HabitFlag {
  id: HabitId;
  label: string;
  fix: string;
  severity: number; // 1 or 2 (0 = not flagged, excluded)
}

export interface WeakGroup {
  id: string;
  label: string;
  rating: Rating; // 'weak' or 'mixed' (never 'ok' here)
  prefixes: string[];
}

export type ScoreBand = 'narrow' | 'moderate' | 'broad';

export interface ResitProfile {
  score_band: ScoreBand;      // how far off a pass, from the score alone
  weak_groups: WeakGroup[];   // ranked: weak before mixed, then group order
  weak_prefixes: string[];    // ranked, de-duped lo_code prefixes for the drill CTA
  habits: HabitFlag[];        // ranked by severity desc, only flagged (>=1)
}

// A fail is 0–49. The closer to 50, the narrower the gap — used only for
// timeline framing in the narrative, never to decide the profile itself.
function bandForScore(score: number): ScoreBand {
  if (score >= 45) return 'narrow';
  if (score >= 35) return 'moderate';
  return 'broad';
}

const RATING_WEIGHT: Record<Rating, number> = { weak: 2, mixed: 1, ok: 0 };

/**
 * Deterministic: same inputs → same profile. No model, no randomness. The
 * model never sees the raw answers and never decides any of this.
 */
export function computeProfile(inputs: ResitInputs): ResitProfile {
  // Weak areas: rank groups the sitter rated weak (2) or mixed (1); 'ok' and
  // any un-rated group are dropped. Ties resolve by TOPIC_GROUPS order, so the
  // ranking is stable.
  const weak_groups: WeakGroup[] = TOPIC_GROUPS
    .map((g) => ({ g, rating: inputs.topic_ratings[g.id] }))
    .filter((x): x is { g: TopicGroup; rating: Rating } => x.rating === 'weak' || x.rating === 'mixed')
    .sort((a, b) => RATING_WEIGHT[b.rating] - RATING_WEIGHT[a.rating]) // stable sort keeps group order within a rating
    .map(({ g, rating }) => ({ id: g.id, label: g.label, rating, prefixes: g.prefixes }));

  // Flatten to lo_code prefixes, de-duped, preserving the ranked order.
  const seen = new Set<string>();
  const weak_prefixes: string[] = [];
  for (const wg of weak_groups) {
    for (const p of wg.prefixes) {
      if (!seen.has(p)) {
        seen.add(p);
        weak_prefixes.push(p);
      }
    }
  }

  // Habits: read the chosen option's score per question; keep those >= 1,
  // rank by severity desc, ties by HABIT_QUESTIONS order (stable).
  const habits: HabitFlag[] = HABIT_QUESTIONS
    .map((q) => {
      const choice = inputs.habit_answers[q.habit];
      const opt = q.options.find((o) => o.value === choice);
      const severity = opt ? opt.score : 0;
      return { meta: HABITS[q.habit], severity };
    })
    .filter((x) => x.severity >= 1)
    .sort((a, b) => b.severity - a.severity)
    .map((x) => ({ id: x.meta.id, label: x.meta.label, fix: x.meta.fix, severity: x.severity }));

  return {
    score_band: bandForScore(inputs.score),
    weak_groups,
    weak_prefixes,
    habits,
  };
}
