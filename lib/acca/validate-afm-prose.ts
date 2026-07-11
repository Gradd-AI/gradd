// lib/acca/validate-afm-prose.ts
// Authoring-time PROSE lints for AFM drills — the complement to validate-schema.ts (which
// is numeric-only). Pure, deterministic, no model/DB. Two gates from the batch-1 review
// adjudication (both are "the model authored something code/policy should own"):
//
//   P4 jurisdiction-specifics — the invented-fact rule, one layer up. Prose must not name
//      tax classes, statutory rules, named regulators, or market-structure specifics that
//      the scenario does not state. Scenarios state RATES; advice may only say "confirm the
//      correct tax classification" generically. (Killed the Class 43 / Class 10 / half-year
//      / Health Canada / provincial-formulary claims.)
//   P5 question-completeness — every element the question demands must have a delivered
//      component in the model answer (the Drill-1 "demanded sensitivity, delivered none"
//      defect; same lesson as the IB missing-step gate).

export interface ProseIssue {
  gate: 'jurisdiction' | 'completeness';
  field: string;
  code: string;
  message: string;
}

// The ONE allowed jurisdiction phrase: the standard simplification line added to every
// context. It names the half-year rule only to instruct the student to ignore it, so it is
// exempted from the jurisdiction lint (stripped before matching).
export const STD_SIMPLIFICATION =
  'For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.';

const JURISDICTION_PATTERNS: { re: RegExp; what: string }[] = [
  { re: /\bClass\s+\d+\b/i,                                    what: 'a named tax/CCA class' },
  { re: /half[-\s]?year rule/i,                                what: 'the half-year rule' },
  { re: /Income Tax Act|Capital Cost Allowance Act/i,          what: 'a named statute' },
  { re: /\bCCA class\b/i,                                      what: 'a named CCA class' },
  { re: /Health Canada|\bthe FDA\b|\bthe EMA\b/i,              what: 'a named regulator' },
  { re: /provincial formulary|formulary listing|formulary cycle|formulary[- ]negotiation/i, what: 'a market-structure specific' },
];

/** P4 — flag jurisdiction specifics in any field (the STD_SIMPLIFICATION line is exempt). */
export function lintJurisdiction(fields: Record<string, string>): ProseIssue[] {
  const issues: ProseIssue[] = [];
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    const text = raw.split(STD_SIMPLIFICATION).join(' '); // exempt the allowed simplification line
    for (const p of JURISDICTION_PATTERNS) {
      const m = text.match(p.re);
      if (m) {
        issues.push({
          gate: 'jurisdiction',
          field,
          code: 'named-jurisdiction-specific',
          message: `names ${p.what} ("${m[0].trim()}") not stated generically — scenarios state RATES; advice may only recommend "confirm the correct tax classification"`,
        });
      }
    }
  }
  return issues;
}

/** P5 — every element the question demands must be delivered in the model answer. */
export function lintCompleteness(question: string, modelAnswer: string): ProseIssue[] {
  const issues: ProseIssue[] = [];
  const q = (question || '').toLowerCase();
  const a = (modelAnswer || '').toLowerCase();
  const demands: { re: RegExp; needs: RegExp; label: string }[] = [
    { re: /sensitiv/,                                  needs: /sensitiv/,                            label: 'sensitivity analysis' },
    { re: /profitability index|capital ration|\brank/, needs: /profitability index|capital ration/,  label: 'a profitability-index / capital-rationing ranking' },
    { re: /net present value|\bnpv\b/,                  needs: /\bnpv\b|net present value/,           label: 'an NPV appraisal' },
  ];
  for (const d of demands) {
    if (d.re.test(q) && !d.needs.test(a)) {
      issues.push({
        gate: 'completeness',
        field: 'model_answer',
        code: 'demanded-element-not-delivered',
        message: `the question demands ${d.label} but the model answer delivers none`,
      });
    }
  }
  return issues;
}

/** Run both prose gates over whatever fields are present. */
export function lintAfmProse(fields: {
  question: string;
  context_text: string;
  model_answer: string;
  hint?: string;
  full_reveal?: string;
}): ProseIssue[] {
  return [
    ...lintJurisdiction({
      question: fields.question,
      context_text: fields.context_text,
      model_answer: fields.model_answer,
      hint: fields.hint ?? '',
      full_reveal: fields.full_reveal ?? '',
    }),
    ...lintCompleteness(fields.question, fields.model_answer),
  ];
}
