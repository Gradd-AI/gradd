#!/usr/bin/env tsx
/**
 * generate-seed-questions.ts
 *
 * Drafts IB examination question candidates via Claude Sonnet and inserts
 * them into the `questions` table with status='candidate'.
 *
 * Usage:
 *   npm run generate-seed -- --subject IB_ECONOMICS [--count 50] [--dry-run]
 *   npm run generate-seed -- --subject IB_BUSINESS_MANAGEMENT --regen-rejected [--dry-run]
 *
 * Args:
 *   --subject         Required. IB_ECONOMICS | IB_BUSINESS | IB_BUSINESS_MANAGEMENT
 *   --count           How many questions to generate (default: config total)
 *   --dry-run         Print spec list and exit — no Claude API or DB calls
 *   --regen-rejected  Fetch status='rejected' rows for --subject; generate fresh replacements
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * ANTHROPIC_API_KEY.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Env vars loaded by tsx --env-file=.env.local in the npm script.

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CommandTermEntry {
  command_term: string;
  count: number;
  marks: number;
  ao_level: string;
  paper: string;
  level: string;
  question_type: string;
}

interface SubjectConfig {
  subject: string;
  lessonPattern: string;
  examinerPersona: string;
  totalCount: number;
  specs: CommandTermEntry[];
}

interface QuestionSpec {
  subject: string;
  level: string;
  paper: string;
  topic_code: string;   // lessons.lesson_code FK
  lesson_name: string;  // for prompt context (not inserted)
  unit_code: string;    // for dry-run display (not inserted)
  command_term: string;
  marks: number;
  ao_level: string;
  question_type: string;
}

type LessonRow = {
  lesson_code: string;
  lesson_name: string;
  unit_code: string;
  level: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Distribution configs — add LC_BUSINESS / ACCA_BT here when needed
// ─────────────────────────────────────────────────────────────────────────────

export const IB_ECONOMICS_CONFIG: SubjectConfig = {
  subject: 'IB_ECONOMICS',
  lessonPattern: 'IB_ECON_%',
  totalCount: 100,
  examinerPersona:
    'You are an IB Economics senior examiner. You write wholly original questions — never from any ' +
    'IBO past paper. You follow the 2022 IB Economics Subject Guide paper formats precisely: ' +
    'P1 Part (a) is 10 marks, AO1/AO2/AO4 only — use AO1 or AO2 command terms (explain, distinguish, ' +
    'describe, analyse); AO3 terms cannot appear in Part (a). ' +
    'P1 Part (b) is 15 marks AO3 markbands — evaluate ("make an appraisal by weighing up the ' +
    'strengths and limitations") or another AO3 term. ' +
    'P2 is the data-response paper with seven sub-parts per question: ' +
    '(a)(i+ii) 2m AO1/AO4 (define/calculate); (b) 3-5m AO1/AO2/AO4 (explain/calculate); ' +
    '(c-f) 4m AO1/AO2/AO4 (explain/distinguish/analyse/calculate); ' +
    '(g) 15m AO3 markbands (any AO3 term: evaluate/discuss/examine). ' +
    'P3 Part (a) is 20m total, AO1/AO2/AO4, quantitative analytic markscheme (calculate/show/derive). ' +
    'P3 Part (b) is ALWAYS 10m recommend — verbatim from the guide markband heading: ' +
    '"Recommend — present an advisable course of action with appropriate supporting evidence/reason." ' +
    'calculate is AO4 (not AO2) per the guide glossary.',
  specs: [
    // ── P1 extended response — SL (16 total) ─────────────────────────────────
    // Part (a): 10m — AO1/AO2/AO4; AO3 terms invalid
    { command_term: 'explain',    count: 8, marks: 10, ao_level: 'AO2', paper: 'P1', level: 'SL', question_type: 'P1_part_a'   },
    // Part (b): 15m — AO3 markbands
    { command_term: 'evaluate',   count: 8, marks: 15, ao_level: 'AO3', paper: 'P1', level: 'SL', question_type: 'P1_part_b'   },

    // ── P2 data-response per-sub-part — SL (50 total) ────────────────────────
    // Parts (a)(i+ii): 2m — AO1+AO4 (no AO2, no AO3)
    { command_term: 'define',     count: 6, marks: 2,  ao_level: 'AO1', paper: 'P2', level: 'SL', question_type: 'P2_part_a'   },
    { command_term: 'calculate',  count: 4, marks: 2,  ao_level: 'AO4', paper: 'P2', level: 'SL', question_type: 'P2_part_a'   },
    // Part (b): 3m — AO1+AO2+AO4
    { command_term: 'explain',    count: 4, marks: 3,  ao_level: 'AO2', paper: 'P2', level: 'SL', question_type: 'P2_part_b'   },
    { command_term: 'calculate',  count: 4, marks: 3,  ao_level: 'AO4', paper: 'P2', level: 'SL', question_type: 'P2_part_b'   },
    // Parts (c)(d)(e)(f): 4m — AO1+AO2+AO4
    { command_term: 'explain',    count: 8, marks: 4,  ao_level: 'AO2', paper: 'P2', level: 'SL', question_type: 'P2_part_c_f' },
    { command_term: 'distinguish',count: 6, marks: 4,  ao_level: 'AO2', paper: 'P2', level: 'SL', question_type: 'P2_part_c_f' },
    { command_term: 'analyse',    count: 4, marks: 4,  ao_level: 'AO2', paper: 'P2', level: 'SL', question_type: 'P2_part_c_f' },
    { command_term: 'calculate',  count: 6, marks: 4,  ao_level: 'AO4', paper: 'P2', level: 'SL', question_type: 'P2_part_c_f' },
    // Part (g): 15m — AO3 markbands (any AO3 term valid per guide)
    { command_term: 'evaluate',   count: 3, marks: 15, ao_level: 'AO3', paper: 'P2', level: 'SL', question_type: 'P2_part_g'   },
    { command_term: 'discuss',    count: 3, marks: 15, ao_level: 'AO3', paper: 'P2', level: 'SL', question_type: 'P2_part_g'   },
    { command_term: 'examine',    count: 2, marks: 15, ao_level: 'AO3', paper: 'P2', level: 'SL', question_type: 'P2_part_g'   },

    // ── P3 policy paper — HL (34 total) ──────────────────────────────────────
    // Part (a) sub-parts: 4m each — AO1+AO2+AO4 quantitative analytic markscheme
    { command_term: 'calculate',  count: 18, marks: 4,  ao_level: 'AO4', paper: 'P3', level: 'HL', question_type: 'P3_part_a'  },
    // Part (b): 10m — AO3 markbands — command term is ALWAYS recommend per guide
    { command_term: 'recommend',  count: 16, marks: 10, ao_level: 'AO3', paper: 'P3', level: 'HL', question_type: 'P3_part_b'  },
    // ── Totals: P1=16, P2=50, P3=34 | SL=66, HL=34 | grand=100 ──────────────
  ],
};

export const IB_BUSINESS_CONFIG: SubjectConfig = {
  subject: 'IB_BUSINESS',
  lessonPattern: 'IB_BM_%',
  totalCount: 50,
  examinerPersona:
    'You are an IB Business Management senior examiner. You write wholly original questions — ' +
    'never from any IBO past paper. You follow IBO BM paper formats precisely: ' +
    'P1 uses the pre-released case study — Section A has 2/4/6-mark structured questions, ' +
    'Section B has a 10-mark extended response; both sections are identical for SL and HL. ' +
    'P2 uses an unseen stimulus — Section A has structured questions (quantitative focus, ' +
    'AO1/AO2/AO4), Section B has 10-mark structured sub-questions and a 10-mark extended response; ' +
    'HL Section A is worth 30 marks (vs 20 for SL). ' +
    'P3 (HL only) has three fixed questions: Q1 is 2 marks AO1 (define/state), ' +
    'Q2 is 6 marks AO1/AO2 (explain/analyse), Q3 is 17 marks AO1-AO4 (criteria-based ' +
    'evaluation using resource materials — Criteria A: resource use 4m, B: tools 4m, ' +
    'C: evaluation 6m, D: plan of action 3m). ' +
    'Command terms: define/outline/state → AO1; analyse/explain/calculate → AO2/AO4; ' +
    'discuss/evaluate/to_what_extent/examine → AO3.',
  specs: [
    // ── P1 pre-released case study — SL+HL identical (10 total) ──────────────
    // Section A: structured 2/4/6m
    { command_term: 'define',          count: 2, marks: 2,  ao_level: 'AO1', paper: 'P1', level: 'SL', question_type: 'structured'    },
    { command_term: 'outline',         count: 3, marks: 4,  ao_level: 'AO1', paper: 'P1', level: 'SL', question_type: 'structured'    },
    { command_term: 'analyse',         count: 2, marks: 6,  ao_level: 'AO2', paper: 'P1', level: 'SL', question_type: 'structured'    },
    // Section B: 10m extended response
    { command_term: 'discuss',         count: 3, marks: 10, ao_level: 'AO3', paper: 'P1', level: 'SL', question_type: 'essay'         },
    // ── P2 unseen stimulus — SL (15) + HL (10) = 25 total ────────────────────
    // Section A: structured, quantitative focus, AO1/AO2/AO4
    { command_term: 'state',           count: 2, marks: 2,  ao_level: 'AO1', paper: 'P2', level: 'SL', question_type: 'structured'    },
    { command_term: 'describe',        count: 3, marks: 4,  ao_level: 'AO1', paper: 'P2', level: 'SL', question_type: 'structured'    },
    { command_term: 'explain',         count: 4, marks: 6,  ao_level: 'AO2', paper: 'P2', level: 'SL', question_type: 'structured'    },
    { command_term: 'calculate',       count: 3, marks: 6,  ao_level: 'AO4', paper: 'P2', level: 'SL', question_type: 'calculate'     },
    // Section B: 10m structured sub + 10m extended; HL gets additional Section A marks
    { command_term: 'evaluate',        count: 3, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'SL', question_type: 'data_response' },
    { command_term: 'evaluate',        count: 5, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'HL', question_type: 'data_response' },
    { command_term: 'to_what_extent',  count: 5, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'HL', question_type: 'data_response' },
    // ── P3 HL only — Q1 2m / Q2 6m / Q3 17m criteria-based (15 total) ────────
    { command_term: 'state',           count: 5, marks: 2,  ao_level: 'AO1', paper: 'P3', level: 'HL', question_type: 'structured'    },
    { command_term: 'analyse',         count: 5, marks: 6,  ao_level: 'AO2', paper: 'P3', level: 'HL', question_type: 'structured'    },
    { command_term: 'to_what_extent',  count: 5, marks: 17, ao_level: 'AO3', paper: 'P3', level: 'HL', question_type: 'policy'        },
    // ── Totals: P1=10, P2=25, P3=15 | SL=27, HL=23 | grand=50 ───────────────
  ],
};

export const IB_BUSINESS_MANAGEMENT_CONFIG: SubjectConfig = {
  subject:      'IB_BUSINESS_MANAGEMENT',
  lessonPattern: 'IB_BM_%',
  totalCount:    87,
  examinerPersona:
    'You are an IB Business Management senior examiner (guide: IB_BM_2024). You write wholly ' +
    'original questions — never from any IBO past paper. ' +
    'STRUCTURAL RULES (non-negotiable): ' +
    '(1) AO3 command terms (compare, contrast, discuss, evaluate, examine, justify, recommend, ' +
    'to what extent) are FORBIDDEN in P1 Section A and P2 Section A — those sections use ' +
    'AO1, AO2, AO4 only. ' +
    '(2) Single-AO sub-parts use exactly ONE command term — never compound two terms ' +
    '(e.g. "Analyse and evaluate" is wrong; pick one). ' +
    '(3) P1 uses a pre-released case study; P1 excludes HL extension material. Generator may ' +
    'reference pre-released statement framing but must not require HL-only sub-topic knowledge. ' +
    '(4) P2 Section A has a quantitative focus — all calculate questions must be solvable on a ' +
    'four-function (plus, minus, multiply, divide) calculator only. ' +
    '(5) P3 (HL only) is about a social enterprise. Fixed mark structure: Q1=2m (AO1, state/define), ' +
    'Q2=6m (AO1/AO2, explain/analyse), Q3=17m (criteria-based recommendation — NOT markbands). ' +
    'Q3 assessment criteria: A resource use (0–4), B tools (0–4), C evaluation (0–6), ' +
    'D sequencing (0–3) = 17 total. Q3 command term: recommend or to what extent. ' +
    '(6) HL-only sub-topics are 2.5, 2.7, 3.6, 3.9, 4.3, 4.6, 5.3, 5.6, 5.7, 5.8, 5.9 — ' +
    'sub-topic-level filtering, NOT unit-level. SL questions must not target these. ' +
    'Business Management Toolkit is cross-cutting (not a 6th unit) — toolkit questions may ' +
    'reference tools from any unit context. ' +
    "'comment' is AO2 (not AO3). 'calculate' is AO4 (not AO2).",
  specs: [
    // ── P1 pre-released case study — level='SL' (P1 identical for SL+HL) ─────
    // Section A: AO1/AO2/AO4 only (AO3 FORBIDDEN here)
    { command_term: 'define',         count: 2, marks: 2,  ao_level: 'AO1', paper: 'P1', level: 'SL', question_type: 'P1_sec_a'        },
    { command_term: 'state',          count: 1, marks: 2,  ao_level: 'AO1', paper: 'P1', level: 'SL', question_type: 'P1_sec_a'        },
    { command_term: 'outline',        count: 3, marks: 4,  ao_level: 'AO1', paper: 'P1', level: 'SL', question_type: 'P1_sec_a'        },
    { command_term: 'comment',        count: 2, marks: 4,  ao_level: 'AO2', paper: 'P1', level: 'SL', question_type: 'P1_sec_a'        },
    { command_term: 'analyse',        count: 4, marks: 6,  ao_level: 'AO2', paper: 'P1', level: 'SL', question_type: 'P1_sec_a'        },
    // Section B: 10m extended response, AO3 (markbands)
    { command_term: 'discuss',        count: 3, marks: 10, ao_level: 'AO3', paper: 'P1', level: 'SL', question_type: 'P1_sec_b'        },
    { command_term: 'evaluate',       count: 3, marks: 10, ao_level: 'AO3', paper: 'P1', level: 'SL', question_type: 'P1_sec_b'        },
    { command_term: 'to_what_extent', count: 3, marks: 10, ao_level: 'AO3', paper: 'P1', level: 'SL', question_type: 'P1_sec_b'        },
    { command_term: 'examine',        count: 1, marks: 10, ao_level: 'AO3', paper: 'P1', level: 'SL', question_type: 'P1_sec_b'        },
    // ── P2 SL unseen stimulus — Section A (quantitative focus, AO3 FORBIDDEN) ─
    { command_term: 'state',          count: 4, marks: 2,  ao_level: 'AO1', paper: 'P2', level: 'SL', question_type: 'P2_sec_a'        },
    { command_term: 'describe',       count: 4, marks: 4,  ao_level: 'AO1', paper: 'P2', level: 'SL', question_type: 'P2_sec_a'        },
    { command_term: 'explain',        count: 4, marks: 6,  ao_level: 'AO2', paper: 'P2', level: 'SL', question_type: 'P2_sec_a'        },
    { command_term: 'calculate',      count: 4, marks: 6,  ao_level: 'AO4', paper: 'P2', level: 'SL', question_type: 'P2_sec_a'        },
    // P2 SL Section B: 10m extended response (markbands, AO3)
    { command_term: 'evaluate',       count: 4, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'SL', question_type: 'P2_sec_b'        },
    { command_term: 'to_what_extent', count: 4, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'SL', question_type: 'P2_sec_b'        },
    // ── P2 HL — larger Section A (30m vs 20m); HL-only sub-topics seeded here ─
    { command_term: 'describe',       count: 3, marks: 4,  ao_level: 'AO1', paper: 'P2', level: 'HL', question_type: 'P2_sec_a'        },
    { command_term: 'outline',        count: 1, marks: 4,  ao_level: 'AO1', paper: 'P2', level: 'HL', question_type: 'P2_sec_a'        },
    { command_term: 'explain',        count: 2, marks: 6,  ao_level: 'AO2', paper: 'P2', level: 'HL', question_type: 'P2_sec_a'        },
    { command_term: 'analyse',        count: 1, marks: 6,  ao_level: 'AO2', paper: 'P2', level: 'HL', question_type: 'P2_sec_a'        },
    { command_term: 'calculate',      count: 3, marks: 6,  ao_level: 'AO4', paper: 'P2', level: 'HL', question_type: 'P2_sec_a'        },
    { command_term: 'evaluate',       count: 3, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'HL', question_type: 'P2_sec_b'        },
    { command_term: 'discuss',        count: 3, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'HL', question_type: 'P2_sec_b'        },
    { command_term: 'to_what_extent', count: 2, marks: 10, ao_level: 'AO3', paper: 'P2', level: 'HL', question_type: 'P2_sec_b'        },
    // ── P3 HL only — social enterprise stimulus; fixed 2/6/17 structure ───────
    { command_term: 'state',          count: 8, marks: 2,  ao_level: 'AO1', paper: 'P3', level: 'HL', question_type: 'P3_q1'           },
    { command_term: 'explain',        count: 5, marks: 6,  ao_level: 'AO2', paper: 'P3', level: 'HL', question_type: 'P3_q2'           },
    { command_term: 'analyse',        count: 2, marks: 6,  ao_level: 'AO2', paper: 'P3', level: 'HL', question_type: 'P3_q2'           },
    { command_term: 'recommend',      count: 5, marks: 17, ao_level: 'AO3', paper: 'P3', level: 'HL', question_type: 'P3_q3_criteria'  },
    { command_term: 'to_what_extent', count: 3, marks: 17, ao_level: 'AO3', paper: 'P3', level: 'HL', question_type: 'P3_q3_criteria'  },
    // ── Totals: P1=22, P2_SL=24, P2_HL=18, P3=23 | SL=46, HL=41 | grand=87 ──
  ],
};

const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
  IB_ECONOMICS:           IB_ECONOMICS_CONFIG,
  IB_BUSINESS:            IB_BUSINESS_CONFIG,
  IB_BUSINESS_MANAGEMENT: IB_BUSINESS_MANAGEMENT_CONFIG,
};

// ─────────────────────────────────────────────────────────────────────────────
// Spec builder — deterministic topic distribution across lessons
// ─────────────────────────────────────────────────────────────────────────────

// Deterministic Fisher-Yates shuffle with a fixed seed so the spec list is
// reproducible across runs while avoiding the early-lesson bias of step sampling.
function deterministicShuffle<T>(arr: T[], seed = 2026): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Largest-remainder method: rounds an array of floats to integers while preserving
// the exact total (avoids the off-by-one that plain floor+ceil produces).
function largestRemainderRound(floats: number[], total: number): number[] {
  const floors   = floats.map(Math.floor);
  const deficit  = total - floors.reduce((a, b) => a + b, 0);
  const ranked   = floats.map((f, i) => ({ i, frac: f - Math.floor(f) }))
                         .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < deficit; k++) floors[ranked[k].i]++;
  return floors;
}

// Proportionally allocate `totalSpecs` specs across units by lesson count.
// Guarantees every unit that has lessons gets ≥ 1 spec (floor), taking from the
// largest allocation when the floor kicks in.
function proportionalAlloc(lessons: LessonRow[], totalSpecs: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const l of lessons) counts[l.unit_code] = (counts[l.unit_code] ?? 0) + 1;

  const units  = Object.keys(counts).sort();
  const total  = lessons.length;
  const raw    = units.map(u => (counts[u] / total) * totalSpecs);
  const alloc  = largestRemainderRound(raw, totalSpecs);
  const result: Record<string, number> = {};
  units.forEach((u, i) => { result[u] = alloc[i]; });

  // Apply floor of 1 per unit; take from the unit with the largest share
  for (const u of units) {
    if (result[u] === 0) {
      const maxUnit = units.reduce((a, b) => result[a] >= result[b] ? a : b);
      if (result[maxUnit] > 1) { result[maxUnit]--; result[u] = 1; }
    }
  }
  return result;
}

function buildSpecList(cfg: SubjectConfig, allLessons: LessonRow[], count: number): QuestionSpec[] {
  // Expand config specs into a flat ordered array
  const flat: CommandTermEntry[] = [];
  for (const entry of cfg.specs) {
    for (let i = 0; i < entry.count; i++) flat.push(entry);
  }
  // Cycle through the config when count > flat.length (e.g. --count 100 on a 50-spec config)
  const specs: CommandTermEntry[] = Array.from({ length: count }, (_, i) => flat[i % flat.length]);

  const slLessons = allLessons.filter(l => l.level === 'SL_AND_HL');
  const hlLessons = allLessons;

  const slSpecCount = specs.filter(s => s.level === 'SL').length;
  const hlSpecCount = specs.filter(s => s.level === 'HL').length;

  // Proportional quota per unit
  const slAlloc = proportionalAlloc(slLessons, slSpecCount);
  const hlAlloc = proportionalAlloc(hlLessons, hlSpecCount);

  // Group lessons by unit and shuffle each unit's pool with a unit-specific seed
  // (FNV-1a hash of the unit_code string keeps it deterministic and distinct per unit)
  const groupAndShuffle = (lessons: LessonRow[]): Record<string, LessonRow[]> => {
    const byUnit: Record<string, LessonRow[]> = {};
    for (const l of lessons) (byUnit[l.unit_code] ??= []).push(l);
    for (const unit of Object.keys(byUnit)) {
      let seed = 2166136261;
      for (let i = 0; i < unit.length; i++) {
        seed ^= unit.charCodeAt(i);
        seed  = Math.imul(seed, 16777619) >>> 0;
      }
      byUnit[unit] = deterministicShuffle(byUnit[unit], seed);
    }
    return byUnit;
  };

  const slByUnit = groupAndShuffle(slLessons);
  const hlByUnit = groupAndShuffle(hlLessons);

  // Build flat assigned-lesson lists by iterating units in sorted order,
  // appending `alloc[unit]` shuffled lessons per unit.
  const buildAssigned = (
    byUnit: Record<string, LessonRow[]>,
    alloc: Record<string, number>,
  ): LessonRow[] => {
    const out: LessonRow[] = [];
    for (const unit of Object.keys(alloc).sort()) {
      const pool = byUnit[unit] ?? [];
      const n    = alloc[unit];
      for (let i = 0; i < n; i++) out.push(pool[i % pool.length]);
    }
    return out;
  };

  const slAssigned = buildAssigned(slByUnit, slAlloc);
  const hlAssigned = buildAssigned(hlByUnit, hlAlloc);

  let slIdx = 0;
  let hlIdx = 0;

  return specs.map(entry => {
    const lesson = entry.level === 'SL' ? slAssigned[slIdx++] : hlAssigned[hlIdx++];
    return {
      subject:       cfg.subject,
      level:         entry.level,
      paper:         entry.paper,
      topic_code:    lesson.lesson_code,
      lesson_name:   lesson.lesson_name,
      unit_code:     lesson.unit_code,
      command_term:  entry.command_term,
      marks:         entry.marks,
      ao_level:      entry.ao_level,
      question_type: entry.question_type,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude API — structured output via tool use
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_QUESTION_TOOL: Anthropic.Tool = {
  name: 'submit_question',
  description: 'Submit the drafted IB examination question',
  input_schema: {
    type: 'object' as const,
    properties: {
      question_text: {
        type: 'string',
        description: 'Full question text starting with the command term (capitalised)',
      },
      context_text: {
        type: 'string',
        description: 'Stimulus for P2/P3: 2–3 sentence original scenario with quantitative data. Omit entirely for P1.',
      },
    },
    required: ['question_text'],
  },
};

function buildUserPrompt(spec: QuestionSpec): string {
  const term = spec.command_term.replace(/_/g, ' ');
  const capitalised = term.charAt(0).toUpperCase() + term.slice(1);
  let contextInstruction: string;
  if (spec.paper === 'P1') {
    contextInstruction = `- Leave context_text empty — Paper 1 is unseen; no stimulus material.`;
  } else if (spec.question_type === 'P2_part_a' || spec.question_type === 'P2_part_b') {
    contextInstruction = spec.command_term === 'calculate'
      ? `- Include context_text: 1–2 sentences with the specific numeric values needed for the calculation (prices, quantities, income figures, etc.).`
      : `- Leave context_text empty — P2 Part (a)/(b) structured questions stand alone as seed anchors.`;
  } else if (spec.question_type === 'P2_part_c_f') {
    contextInstruction = spec.command_term === 'calculate'
      ? `- Include context_text: 1–2 sentences with the quantitative data required (all figures needed to solve).`
      : `- Include context_text: 1–2 sentences of economic scenario providing context for ${spec.lesson_name}.`;
  } else if (spec.question_type === 'P2_part_g') {
    contextInstruction = `- Include context_text: a 3–4 sentence case study with quantitative economic data (GDP, inflation rate, unemployment %, exchange rate, etc.) realistic for ${spec.lesson_name}. This is the P2 data stimulus.`;
  } else if (spec.question_type === 'P3_part_a') {
    contextInstruction = `- Include context_text: provide ALL numeric data needed for the calculation — specific figures (e.g. national income, price levels, quantities, percentage changes). No working should be impossible without the data.`;
  } else if (spec.question_type === 'P3_part_b') {
    contextInstruction = `- Include context_text: a 2–3 sentence policy case study naming a country, the specific economic problem, and 1–2 relevant data points for the recommendation.`;
  } else if (spec.question_type === 'P3_q1') {
    contextInstruction = `- Include context_text: a 2–3 sentence social enterprise scenario naming the organisation and the SPECIFIC HUMAN NEED it exists to address (e.g. food insecurity, lack of affordable housing, access to clean water). question_text MUST ask the student to describe or identify this human need — not the organisation's general purpose or strategy. Frame as: "State the human need that [organisation] was established to address." or equivalent phrasing that explicitly centres the human need.`;
  } else if (spec.question_type === 'P3_q2') {
    contextInstruction = `- Include context_text: a 2–3 sentence social enterprise scenario naming the organisation, the human need it addresses, and the SPECIFIC ORGANISATIONAL CHALLENGES it faces in meeting that need (e.g. limited funding, lack of trained staff, supply chain constraints). question_text MUST ask the student to explain these key challenges — not general strategy or purpose.`;
  } else {
    contextInstruction = `- Include context_text: brief relevant context for this question if applicable.`;
  }

  // P1_part_b and P2_part_g are 15m markbands — extended response, one command term covers
  // the full essay. All other sub-parts are single-AO analytic markscheme items.
  const isExtendedResponse = spec.question_type === 'P1_part_b' || spec.question_type === 'P2_part_g';
  const structuralRule = isExtendedResponse ? '' :
    `- STRUCTURAL RULE — Use exactly ONE command term: "${capitalised}". Do not combine with a second command term (e.g. "${capitalised} ... and analyse", "${capitalised} ... and evaluate"). One command term, one AO objective. Compound questions are structurally wrong for this sub-part.\n`;

  return `Write one original ${spec.subject.replace('_', ' ')} examination question.

Specification:
- Topic: ${spec.lesson_name} (${spec.topic_code}, ${spec.unit_code})
- Paper: ${spec.paper}
- Command term: ${term}
- Marks: ${spec.marks}
- Assessment objective: ${spec.ao_level}
- Level: ${spec.level}
- Question type: ${spec.question_type}

Requirements:
- Begin question_text with "${capitalised}" (the command term, capitalised)
- Wholly original — never replicate any IBO past paper question
- Depth and complexity calibrated to ${spec.marks} marks at ${spec.ao_level}
${structuralRule}${contextInstruction}`;
}

async function draftQuestion(
  anthropic: Anthropic,
  spec: QuestionSpec,
  persona: string,
): Promise<{ question_text: string; context_text: string | null }> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: persona,
    tools: [SUBMIT_QUESTION_TOOL],
    tool_choice: { type: 'tool', name: 'submit_question' },
    messages: [{ role: 'user', content: buildUserPrompt(spec) }],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in response');
  const inp = block.input as { question_text: string; context_text?: string };
  return { question_text: inp.question_text, context_text: inp.context_text ?? null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function col(s: string | number, w: number): string {
  return String(s).slice(0, w).padEnd(w);
}

function tally(specs: QuestionSpec[], key: keyof QuestionSpec): Record<string, number> {
  return specs.reduce((acc, s) => {
    const v = String(s[key]);
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const subjectArg    = arg('--subject');
  const dryRun        = flag('--dry-run');
  const regenRejected = flag('--regen-rejected');

  if (!subjectArg) {
    console.error('Error: --subject is required (e.g. --subject IB_ECONOMICS)');
    process.exit(1);
  }
  const cfg = SUBJECT_CONFIGS[subjectArg];
  if (!cfg) {
    console.error(`Error: unknown subject "${subjectArg}". Available: ${Object.keys(SUBJECT_CONFIGS).join(', ')}`);
    process.exit(1);
  }
  const countArg   = parseInt(arg('--count') ?? String(cfg.totalCount), 10);

  // Supabase service-role client — mirrors createServiceClient() in lib/supabase/server.ts
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log(`\nFetching ${cfg.lessonPattern} lessons from Supabase...`);
  const { data: lessons, error: dbErr } = await supabase
    .from('lessons')
    .select('lesson_code, lesson_name, unit_code, level')
    .like('lesson_code', cfg.lessonPattern)
    .order('lesson_code');

  if (dbErr || !lessons?.length) {
    console.error('Failed to fetch lessons:', dbErr?.message ?? 'no rows returned');
    process.exit(1);
  }
  console.log(`Found ${lessons.length} lessons for ${subjectArg}.`);

  // ── Regen-rejected mode ───────────────────────────────────────────────────
  if (regenRejected) {
    const { data: rejected, error: rejErr } = await supabase
      .from('questions')
      .select('paper, question_type, command_term, marks, ao_level, level')
      .eq('subject', subjectArg)
      .eq('status', 'rejected');

    if (rejErr) { console.error('DB error fetching rejected rows:', rejErr.message); process.exit(1); }
    if (!rejected?.length) { console.log('No rejected rows found for', subjectArg); return; }

    console.log(`Found ${rejected.length} rejected row(s) — building regen specs (seed 2027).`);

    const shuffled = deterministicShuffle(lessons as LessonRow[], 2027);
    const regenSpecs: QuestionSpec[] = rejected.map((row, i) => {
      const lesson = shuffled[i % shuffled.length];
      return {
        subject:       cfg.subject,
        level:         row.level,
        paper:         row.paper,
        topic_code:    lesson.lesson_code,
        lesson_name:   lesson.lesson_name,
        unit_code:     lesson.unit_code,
        command_term:  row.command_term,
        marks:         row.marks,
        ao_level:      row.ao_level,
        question_type: row.question_type,
      };
    });

    if (dryRun) {
      regenSpecs.forEach((s, i) =>
        console.log(`[${i + 1}/${regenSpecs.length}] ${s.topic_code} · ${s.paper} · ${s.command_term} · ${s.marks}m · ${s.level} · ${s.question_type}`)
      );
      return;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const regenFailed: number[] = [];

    for (let i = 0; i < regenSpecs.length; i++) {
      const spec  = regenSpecs[i];
      const label = `[${i + 1}/${regenSpecs.length}] ${spec.topic_code} · ${spec.paper} · ${spec.command_term} · ${spec.marks}m`;
      let draft: { question_text: string; context_text: string | null } | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          draft = await draftQuestion(anthropic, spec, cfg.examinerPersona);
          break;
        } catch (err) {
          if (attempt === 0) {
            console.warn(`  ↻ ${label} retry (${(err as Error).message})`);
            await sleep(2000);
          } else {
            console.error(`  ✗ ${label} FAILED: ${(err as Error).message}`);
            regenFailed.push(i + 1);
          }
        }
      }

      if (draft) {
        const { error: insErr } = await supabase.from('questions').insert({
          subject:       spec.subject,
          level:         spec.level,
          paper:         spec.paper,
          topic_code:    spec.topic_code,
          question_type: spec.question_type,
          command_term:  spec.command_term,
          marks:         spec.marks,
          ao_level:      spec.ao_level,
          question_text: draft.question_text,
          context_text:  draft.context_text,
          status:        'candidate',
          created_by:    'claude_draft',
          source:        'gradd_original',
        });
        if (insErr) {
          console.error(`  ✗ ${label} INSERT failed: ${insErr.message}`);
          regenFailed.push(i + 1);
        } else {
          console.log(`  ✓ ${label} — drafted`);
        }
      }

      await sleep(200);
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Regen done. ${regenSpecs.length - regenFailed.length}/${regenSpecs.length} inserted.`);
    if (regenFailed.length) console.log(`Failed spec indices: ${regenFailed.join(', ')}`);
    return;
  }

  const specs = buildSpecList(cfg, lessons as LessonRow[], countArg);

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    const LINE = '─'.repeat(110);
    console.log(`\n${LINE}`);
    console.log(`DRY RUN — ${specs.length} specs for ${subjectArg}  (no API or DB calls)`);
    console.log(`${LINE}`);
    console.log(
      col('#',            4) + col('topic_code',   14) + col('unit_code',   22) +
      col('lesson',      32) + col('lvl',           5) + col('paper',        6) +
      col('command_term',20) + col('mks',            5) + col('ao',           5) + 'type',
    );
    console.log(LINE);
    specs.forEach((s, i) => {
      console.log(
        col(i + 1,         4) + col(s.topic_code,  14) + col(s.unit_code,  22) +
        col(s.lesson_name,32) + col(s.level,        5) + col(s.paper,       6) +
        col(s.command_term,20) + col(s.marks,       5) + col(s.ao_level,    5) + s.question_type,
      );
    });
    console.log(LINE);
    console.log('\nSummary:');
    console.log('  paper        :', tally(specs, 'paper'));
    console.log('  level        :', tally(specs, 'level'));
    console.log('  command_term :', tally(specs, 'command_term'));

    // Per-unit breakdown: SL and HL spec counts per unit
    const unitMap: Record<string, { SL: number; HL: number }> = {};
    for (const s of specs) {
      if (!unitMap[s.unit_code]) unitMap[s.unit_code] = { SL: 0, HL: 0 };
      unitMap[s.unit_code][s.level as 'SL' | 'HL']++;
    }
    console.log('\nPer-unit coverage:');
    console.log(`  ${'unit_code'.padEnd(24)} ${'SL'.padEnd(6)} ${'HL'.padEnd(6)} total`);
    console.log(`  ${'─'.repeat(44)}`);
    for (const [unit, counts] of Object.entries(unitMap).sort()) {
      console.log(`  ${unit.padEnd(24)} ${String(counts.SL).padEnd(6)} ${String(counts.HL).padEnd(6)} ${counts.SL + counts.HL}`);
    }

    console.log(`\n  Total: ${specs.length}`);
    return;
  }

  // ── Live run ──────────────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const failed: number[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec  = specs[i];
    const label = `[${i + 1}/${specs.length}] ${spec.topic_code} · ${spec.paper} · ${spec.command_term} · ${spec.marks}m`;

    let draft: { question_text: string; context_text: string | null } | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        draft = await draftQuestion(anthropic, spec, cfg.examinerPersona);
        break;
      } catch (err) {
        if (attempt === 0) {
          console.warn(`  ↻ ${label} retry (${(err as Error).message})`);
          await sleep(2000);
        } else {
          console.error(`  ✗ ${label} FAILED: ${(err as Error).message}`);
          failed.push(i + 1);
        }
      }
    }

    if (draft) {
      const { error: insErr } = await supabase.from('questions').insert({
        subject:       spec.subject,
        level:         spec.level,
        paper:         spec.paper,
        topic_code:    spec.topic_code,
        question_type: spec.question_type,
        command_term:  spec.command_term,
        marks:         spec.marks,
        ao_level:      spec.ao_level,
        question_text: draft.question_text,
        context_text:  draft.context_text,
        status:        'candidate',
        created_by:    'claude_draft',
        source:        'gradd_original',
      });

      if (insErr) {
        console.error(`  ✗ ${label} INSERT failed: ${insErr.message}`);
        failed.push(i + 1);
      } else {
        console.log(`  ✓ ${label} — drafted`);
      }
    }

    await sleep(200);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done. ${specs.length - failed.length}/${specs.length} questions inserted.`);
  if (failed.length) console.log(`Failed spec indices: ${failed.join(', ')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
