// lib/acca/resit-engine.ts
//
// STRUCTURAL engine for the free /acca/resit diagnostic. Code decides the
// profile; the model only narrates it. This module is the single source of
// truth for the topic groups, the habit questions, and the deterministic
// mapping from raw inputs → { weak_prefixes, habits }. It is pure and
// unit-testable: no I/O, no model calls, no randomness.
//
// The page renders the paper's TOPIC_GROUPS / HABIT_QUESTIONS, the API validates
// against them, and computeProfile() is the one function that turns answers into
// the weak-area + habit profile that both the narrative call and the drill CTA
// consume. lo_code prefixes here match app/api/acca/next-drill's LIKE keying
// (e.g. 'A3' → drills where lo_code LIKE 'A3%').
//
// ── KEYED BY PAPER (2026-08-08) ──────────────────────────────────────────────
// The three DATA constants are per-paper; the LOGIC is untouched and always was
// paper-agnostic — computeProfile ranks ratings and habit scores and never knew
// which paper it was scoring. The shape follows SKILL_DESCRIPTORS_BY_PAPER in
// case-marking.ts: named per-paper constants, a Record<ServedPaper, …>, and a
// getter. Never merged across papers.
//
// ⚠️ WHY THE SEPARATION IS LOAD-BEARING, not cosmetic: AFM and APM lo_code
// prefixes COLLIDE EXACTLY — A3, B1, B2, B3, B4 are live in both papers. APM's
// B1 is budgetary control; AFM's B1 is discounted cash flow. A group id accepted
// against the wrong paper therefore does not 404, it silently serves the other
// paper's drills. computeProfile drops any id it does not recognise for the
// paper it was given, and the API validates against THAT paper's id set. Neither
// this module nor the route may fall back on resolvePaper's APM default.

import type { ServedPaper } from './paper';

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

const APM_TOPIC_GROUPS: TopicGroup[] = [
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

// ── AFM topic groups — EIGHT, and the omissions are deliberate ────────────────
// Derived from the LIVE published corpus (63 approved+published AFM drills across
// 27 lo_codes), not from the AFM syllabus. A diagnostic may only offer an area it
// can actually route a sitter to.
//
//   · NO SECTION C, NO SECTION D. Zero published drills for M&A / reorganisation
//     and restructuring. Offering either would route to nothing, so the page
//     states the coverage boundary in words instead (see app/acca/resit/page.tsx).
//   · NO SECTION A AT ALL — and this is a STRUCTURAL exclusion, not a judgement
//     about thinness. isDirectLinkOnlyArea (paper.ts:50) returns true for EVERY
//     AFM lo_code beginning 'A', so A3 (ESG & ethics, 1 drill) is excluded on
//     exactly the same rule as A6 (dividend policy / transfer pricing, 1 drill):
//     AFM section A is not a browsable area and ?area=A3 must not be offered from
//     a browse surface. When section A is intentionally launched, that clause
//     comes out of paper.ts and an ESG group can be added here.
//
// Drill counts at authoring: B1 14 · B2 4 · B3 17 · B4 7 · B5 5 · E1 2 · E2 7 · E3 5.
const AFM_TOPIC_GROUPS: TopicGroup[] = [
  { id: 'appraisal',     label: 'Investment appraisal & NPV',        hint: 'discounted cash flow, project NPV, internal rate of return',        prefixes: ['B1'] },
  { id: 'real_options',  label: 'Real options in projects',          hint: 'option pricing applied to projects — delay, expand, abandon',       prefixes: ['B2'] },
  { id: 'financing',     label: 'Financing decisions & APV',         hint: 'how financing changes a project, adjusted present value, gearing',  prefixes: ['B3'] },
  { id: 'valuation',     label: 'Business valuation',                hint: 'free cash flow valuation, valuing equity and debt, acquisitions',   prefixes: ['B4'] },
  { id: 'international', label: 'International investment',          hint: 'cross-border projects, exchange controls, restricted remittance',   prefixes: ['B5'] },
  { id: 'treasury',      label: 'The treasury function',             hint: 'what group treasury does, centralisation, cash and liquidity',      prefixes: ['E1'] },
  { id: 'fx_hedging',    label: 'Hedging currency risk',             hint: 'forwards, money-market hedges, currency futures, options, swaps',   prefixes: ['E2'] },
  { id: 'ir_hedging',    label: 'Hedging interest-rate risk',        hint: 'interest-rate futures, options, collars, swaps',                    prefixes: ['E3'] },
];

export const TOPIC_GROUPS_BY_PAPER: Record<ServedPaper, TopicGroup[]> = {
  APM: APM_TOPIC_GROUPS,
  AFM: AFM_TOPIC_GROUPS,
};

export function getTopicGroups(paper: ServedPaper): TopicGroup[] {
  return TOPIC_GROUPS_BY_PAPER[paper];
}

// Built once per paper rather than per call — the route validates every submitted
// rating key against this set, so it is on the hot path.
const TOPIC_GROUP_IDS_BY_PAPER: Record<ServedPaper, Set<string>> = {
  APM: new Set(APM_TOPIC_GROUPS.map((g) => g.id)),
  AFM: new Set(AFM_TOPIC_GROUPS.map((g) => g.id)),
};

export function getTopicGroupIds(paper: ServedPaper): Set<string> {
  return TOPIC_GROUP_IDS_BY_PAPER[paper];
}

// ── Habit diagnostic ──────────────────────────────────────────────────────────
// For every question option 'a' is the habit at its worst (score 2), 'b' is
// partial (1), 'c' is the strong behaviour (0). Severity is read straight off the
// chosen option's score.

export type ApmHabitId =
  | 'describe_vs_apply'
  | 'verb_object_drift'
  | 'scepticism'
  | 'prof_skills'
  | 'pacing'
  | 'requirement_planning';

export type AfmHabitId =
  | 'own_figures'
  | 'scenario_repetition'
  | 'lists_without_development'
  | 'undeveloped_assumptions'
  | 'state_the_figure'
  | 'breadth_and_conclusion';

export type HabitId = ApmHabitId | AfmHabitId;

export interface HabitMeta {
  id: HabitId;
  label: string; // what the habit is, one line
  fix: string;   // the move that fixes it
}

// APM's six failure habits (from TEACHING_PRINCIPLES_EZRA.md).
const APM_HABITS: Record<string, HabitMeta> = {
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

// ── AFM's six failure habits — EVIDENCED, not ported ──────────────────────────
// Every one is a mode ACCA's own AFM examiner reports state, catalogued as F1–F12
// in docs/evidence/AFM_NARRATIVE_EVIDENCE.md §1b and page-verified across the five
// registered reports (sources.json E1–E5: MJ25, SD23, SD25, J24, SD24).
//
// ⚠️ PACING DOES NOT CARRY FROM APM. There is NO pacing failure mode anywhere in
// F1–F12 — no AFM examiner report evidences it. Gradd does produce real pacing
// findings, but from the sit loop (lib/acca/pacing.ts), which is a different
// instrument with a different provenance. Carrying APM's pacing question here
// would assert examiner evidence that does not exist. Grant's ruling, 2026-08-08.
//
// F4 (fence-sitting) and F8 (issue≠action) are deliberately NOT used: §1b line 198
// records that neither is independently attested in J24 or SD24, so the six chosen
// modes are the ones with the broadest report coverage.
const AFM_HABITS: Record<string, HabitMeta> = {
  // F9 — own figures not carried into the discussion. Placed FIRST: it is the
  // strongest AFM mode and the one with no APM analogue, because only a numeric
  // paper can fail this way. ACCA states the OFR principle in its own words here.
  // [MJ25 p.12 Sohbet b] [SD25 p.13 Passmore a] [J24 p.14 Littlebredy prof skills]
  // [SD24 p.12 Mortexa a-iii]
  own_figures: {
    id: 'own_figures',
    label: 'Working out the number, then not using it in the discussion',
    fix: 'Bring your own figure into the argument — compare it to the target or the alternative, and let it carry the recommendation. Marks follow your workings even if the figure is wrong.',
  },
  // F1 — scenario repetition earns nothing. The only mode confirmed in ALL FIVE
  // reports as standing text.
  // [MJ25 p.3] [SD23 p.2] [SD25 p.3] [J24 p.3] [SD24 p.3]
  // [SD25 p.8 Halstock] [J24 p.13 Littlebredy c] [SD24 p.10 Mortexa]
  scenario_repetition: {
    id: 'scenario_repetition',
    label: 'Repeating the exhibit back instead of doing something with it',
    fix: 'Never restate a scenario fact on its own — no marks are given for it. Say what that fact means for this decision.',
  },
  // F2 — lists without development.
  // [SD25 p.4] [SD23 p.5 McKeever iv] [MJ25 p.13 Sohbet c]
  // [J24 p.4 Mahoney a] [J24 p.13 Littlebredy c] [SD24 p.7 Northney vi]
  lists_without_development: {
    id: 'lists_without_development',
    label: 'Bullet lists where each point is named but never explained',
    fix: 'Fewer points, each finished: what it is, why it matters here, what follows. A bare bullet earns little or nothing.',
  },
  // F3 — undeveloped assumptions, the state-vs-discuss line.
  // [MJ25 p.6 Kampai iv] [SD25 p.5 Drimpton b-ii] [J24 p.8 Mahoney b-v]
  // [SD24 p.16 Zulla b]
  undeveloped_assumptions: {
    id: 'undeveloped_assumptions',
    label: 'Stating assumptions rather than discussing them',
    fix: 'For each assumption say why it might not hold and which way your answer moves if it does not.',
  },
  // F6 — superficial state-the-figure commentary, including the absolutist
  // overclaim instance ("eliminate all risks").
  // [MJ25 p.17 GCR] [SD23 p.11 Southmed] [SD24 p.16 Zulla b] [J24 p.6 Mahoney b-iii]
  state_the_figure: {
    id: 'state_the_figure',
    label: 'Saying what the figures show instead of challenging them',
    fix: 'Explain what is driving the number and what it does not cover. Avoid absolutes — very little "eliminates all risk".',
  },
  // F11 — breadth/balance and the missing conclusion.
  // [SD25 p.4 Drimpton a] [MJ25 p.8] [SD25 p.6]
  // [J24 p.4 Mahoney a] [J24 p.8 Mahoney prof skills] [SD24 p.7 Northney communication]
  breadth_and_conclusion: {
    id: 'breadth_and_conclusion',
    label: 'Over-explaining one point, and finishing without a conclusion',
    fix: 'Spread the effort across a range of points, then close with a short conclusion — a mark is regularly lost for its absence alone.',
  },
};

export const HABITS_BY_PAPER: Record<ServedPaper, Record<string, HabitMeta>> = {
  APM: APM_HABITS,
  AFM: AFM_HABITS,
};

export function getHabits(paper: ServedPaper): Record<string, HabitMeta> {
  return HABITS_BY_PAPER[paper];
}

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

const APM_HABIT_QUESTIONS: HabitQuestion[] = [
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
    prompt: 'APM gives marks for professional skills — analysis, scepticism, communication, commercial acumen. When you’re writing, how aware of them are you?',
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

// AFM's six, student-voiced, one per evidenced mode. Order is deliberate: F9 leads.
const AFM_HABIT_QUESTIONS: HabitQuestion[] = [
  {
    // F9 — [MJ25 p.12] [SD25 p.13] [J24 p.14] [SD24 p.12]
    habit: 'own_figures',
    prompt: 'You’ve finished the calculation — an NPV, say, or what the hedge costs. What does the written part of your answer do with your number?',
    options: [
      { value: 'a', text: 'The workings are right there above, so I state the result and get on with the discussion.', score: 2 },
      { value: 'b', text: 'I repeat the figure at the start of the discussion, then talk around it more generally.', score: 1 },
      { value: 'c', text: 'I use my own figure to argue the decision — against the target, or against the alternative.', score: 0 },
    ],
  },
  {
    // F1 — [MJ25 p.3] [SD23 p.2] [SD25 p.3] [J24 p.3] [SD24 p.3]
    habit: 'scenario_repetition',
    prompt: 'An exhibit gives you a paragraph on how the company is financed. When you write about it, what ends up on the page?',
    options: [
      { value: 'a', text: 'I set out what the exhibit says — it’s the relevant information, so it belongs in my answer.', score: 2 },
      { value: 'b', text: 'I put it in my own words, then add a comment or two after it.', score: 1 },
      { value: 'c', text: 'I take the fact straight to what it means for this decision — the fact on its own earns nothing.', score: 0 },
    ],
  },
  {
    // F2 — [SD25 p.4] [SD23 p.5] [MJ25 p.13] [J24 p.4] [J24 p.13] [SD24 p.7]
    habit: 'lists_without_development',
    prompt: 'You’re asked to discuss the benefits and drawbacks of a financing route. How does that part of your answer look on the page?',
    options: [
      { value: 'a', text: 'A bullet list. I can get more points down that way, and they’re all valid.', score: 2 },
      { value: 'b', text: 'Bullets, with a short line underneath some of them.', score: 1 },
      { value: 'c', text: 'A few points only, each one explained — what it is and why it matters to this company.', score: 0 },
    ],
  },
  {
    // F3 — [MJ25 p.6] [SD25 p.5] [J24 p.8] [SD24 p.16]
    habit: 'undeveloped_assumptions',
    prompt: 'The requirement asks about the assumptions behind your figures. What do you write?',
    options: [
      { value: 'a', text: 'I list them — the growth rate is assumed accurate, the forecast rates are assumed to hold.', score: 2 },
      { value: 'b', text: 'I list them and add that they may not hold in practice.', score: 1 },
      { value: 'c', text: 'I take each one and say why it might not hold, and which way my answer moves if it doesn’t.', score: 0 },
    ],
  },
  {
    // F6 — [MJ25 p.17] [SD23 p.11] [SD24 p.16] [J24 p.6]
    habit: 'state_the_figure',
    prompt: 'Your workings show the hedge leaves the company better off. What does your discussion say about that?',
    options: [
      { value: 'a', text: 'That it’s better off, and that hedging removes the risk.', score: 2 },
      { value: 'b', text: 'That it’s better off, with a line noting there are still some limitations.', score: 1 },
      { value: 'c', text: 'What is actually driving the difference, and what the hedge still leaves exposed.', score: 0 },
    ],
  },
  {
    // F11 — [SD25 p.4] [MJ25 p.8] [SD25 p.6] [J24 p.4] [J24 p.8] [SD24 p.7]
    habit: 'breadth_and_conclusion',
    prompt: 'You’ve made one strong point and there’s time left. What happens next?',
    options: [
      { value: 'a', text: 'I develop that point properly — depth is worth more than a handful of thin ones.', score: 2 },
      { value: 'b', text: 'I add another point, though it ends up much shorter, and stop when I run out.', score: 1 },
      { value: 'c', text: 'I make a couple more separate points, then finish with a short conclusion.', score: 0 },
    ],
  },
];

export const HABIT_QUESTIONS_BY_PAPER: Record<ServedPaper, HabitQuestion[]> = {
  APM: APM_HABIT_QUESTIONS,
  AFM: AFM_HABIT_QUESTIONS,
};

export function getHabitQuestions(paper: ServedPaper): HabitQuestion[] {
  return HABIT_QUESTIONS_BY_PAPER[paper];
}

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
 *
 * `paper` selects the data set. Anything the given paper does not define — a
 * group id or a habit id belonging to the OTHER paper, or to neither — is
 * dropped rather than scored, which is what stops a cross-paper submission from
 * routing a sitter into the wrong corpus.
 */
export function computeProfile(paper: ServedPaper, inputs: ResitInputs): ResitProfile {
  const groups = getTopicGroups(paper);
  const questions = getHabitQuestions(paper);
  const habitMeta = getHabits(paper);

  // Weak areas: rank groups the sitter rated weak (2) or mixed (1); 'ok' and
  // any un-rated group are dropped. Ties resolve by this paper's group order, so
  // the ranking is stable.
  const weak_groups: WeakGroup[] = groups
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
  // rank by severity desc, ties by this paper's question order (stable).
  const habits: HabitFlag[] = questions
    .map((q) => {
      const choice = inputs.habit_answers[q.habit];
      const opt = q.options.find((o) => o.value === choice);
      const severity = opt ? opt.score : 0;
      return { meta: habitMeta[q.habit], severity };
    })
    .filter((x) => x.severity >= 1 && x.meta !== undefined)
    .sort((a, b) => b.severity - a.severity)
    .map((x) => ({ id: x.meta.id, label: x.meta.label, fix: x.meta.fix, severity: x.severity }));

  return {
    score_band: bandForScore(inputs.score),
    weak_groups,
    weak_prefixes,
    habits,
  };
}
