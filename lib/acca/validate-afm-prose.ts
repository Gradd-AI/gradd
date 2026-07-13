// lib/acca/validate-afm-prose.ts
// Authoring-time PROSE lints for AFM drills — the complement to validate-schema.ts (which
// is numeric-only). Pure, deterministic, no model/DB. Two gates from the batch-1 review:
//
//   P4 jurisdiction-specifics — scoped, NOT blunt. Factual regulator/institution NAMES are
//      legitimate scenario framing and are ALLOWED in scenario fields (context_text,
//      question) — "holds a Health Canada licence" is fine. The lint targets CLAIM FORMS:
//        (A) named tax/CCA classes and statutory mechanics (Class 43, half-year rule, …) —
//            banned in ALL fields (scenarios state RATES), except the exempt simplification
//            line;
//        (B) regulator behaviour / timeline claims in EVALUATIVE fields (model answer
//            advice, hint, full_reveal) — flagged only when the named regulator is NOT
//            stated in the scenario (i.e. absent from context_text);
//        (C) market-structure specifics (formulary …) in EVALUATIVE fields — flagged only
//            when not stated in the scenario.
//      This lets advice engage risks the SCENARIO raises while blocking advice that invents
//      jurisdiction specifics of its own.
//   P5 question-completeness — every element the question demands has a delivered component
//      in the model answer (the Drill-1 "demanded sensitivity, delivered none" defect).

export interface ProseIssue {
  gate: 'jurisdiction' | 'completeness' | 'loss-relief';
  field: string;
  code: string;
  message: string;
}

// P6 loss-relief — pattern rule (APV round-1 FIX 1). When the tax schedule drives taxable
// profit negative in ANY year, the worked answer takes a NEGATIVE tax (a credit) in that
// year; that is only valid if the firm can use the loss immediately (relief against other
// profits). Such a drill MUST state a loss-relief assumption in its context, or the negative
// tax is an unstated assumption. Detected from the computed tax schedule (taxable < 0) AND
// the absence of a relief line in the context.
const LOSS_RELIEF_RE = /tax loss|loss relief|sufficient taxable profit|taxable profits (from|elsewhere)|use any project (tax )?loss|group relief|offset the loss/i;

export function lintLossRelief(hasLossYear: boolean, context: string): ProseIssue[] {
  if (!hasLossYear) return [];
  if (LOSS_RELIEF_RE.test(context ?? '')) return [];
  return [{
    gate: 'loss-relief', field: 'context_text', code: 'loss-relief-assumption-missing',
    message: 'a year has negative taxable profit (the worked answer takes a tax credit) but the context states no loss-relief assumption — add e.g. "assume sufficient taxable profits from other operations to use any project tax loss immediately, with the tax effect received one year in arrears"',
  }];
}

// The ONE allowed jurisdiction phrase: the standard simplification line added to every
// context. It names the half-year rule only to instruct the student to ignore it, so it is
// stripped before matching.
export const STD_SIMPLIFICATION =
  'For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.';

const EVALUATIVE_FIELDS = new Set(['model_answer', 'hint', 'full_reveal']);

// (A) Tax/CCA classes + statutory mechanics — a jurisdiction TAX specific, never an
//     institution name. Banned in ALL fields (scenarios state rates).
const TAX_SPECIFIC_PATTERNS: { re: RegExp; what: string }[] = [
  { re: /\bClass\s+\d+\b/i,                           what: 'a named tax/CCA class' },
  { re: /half[-\s]?year rule/i,                       what: 'the half-year rule' },
  { re: /Income Tax Act|Capital Cost Allowance Act/i, what: 'a named statute' },
  { re: /\bCCA class\b/i,                             what: 'a named CCA class' },
];

// (B) Regulator/agency names — factual in a scenario, a claim when paired with a
//     behaviour/timeline word in evaluative prose.
const REGULATOR = /(Health Canada|the FDA|the EMA|Bank of Canada|Canada Revenue Agency|\bCRA\b)/gi;
const BEHAVIOUR = /(approv\w*|licens\w*|listing|timeline|delay|cycle|clearance|guidance|corridor|reimbursement|formulary|negotiat\w*)/i;

// (C) Market-structure specifics.
const MARKET_STRUCTURE: { re: RegExp; what: string }[] = [
  { re: /provincial formulary|formulary[- ]?(listing|cycle|negotiation)/i, what: 'a market-structure specific (formulary)' },
];

/** P4 — scoped jurisdiction lint. `opts.context` (default: fields.context_text) is the
 *  scenario reference the evaluative cross-checks use for "stated in the scenario". */
export function lintJurisdiction(fields: Record<string, string>, opts?: { context?: string }): ProseIssue[] {
  const issues: ProseIssue[] = [];
  const context = (opts?.context ?? fields.context_text ?? '').toLowerCase();
  const statedInScenario = (surface: string) => context.includes(surface.toLowerCase());

  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    const text = raw.split(STD_SIMPLIFICATION).join(' '); // exempt the allowed simplification line
    const evaluative = EVALUATIVE_FIELDS.has(field);

    // (A) tax/CCA class + statutory mechanics — everywhere.
    for (const p of TAX_SPECIFIC_PATTERNS) {
      const m = text.match(p.re);
      if (m) {
        issues.push({
          gate: 'jurisdiction', field, code: 'named-tax-specific',
          message: `names ${p.what} ("${m[0].trim()}") — scenarios state RATES; advice may only recommend "confirm the correct tax classification"`,
        });
      }
    }

    if (!evaluative) continue; // scenario fields may name factual regulators/institutions

    // (B) regulator behaviour / timeline claims — flag only when the regulator is NOT in
    //     the scenario (advice inventing its own jurisdiction detail).
    REGULATOR.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = REGULATOR.exec(text))) {
      const name = m[0].trim();
      const window = text.slice(Math.max(0, m.index - 70), m.index + name.length + 70);
      if (BEHAVIOUR.test(window) && !statedInScenario(name)) {
        issues.push({
          gate: 'jurisdiction', field, code: 'regulator-behaviour-claim',
          message: `asserts regulator behaviour/timeline about "${name}" in evaluative prose, and the scenario does not name it — advice may not invent jurisdiction-specific regulator behaviour`,
        });
      }
    }

    // (C) market-structure specifics — flag only when not stated in the scenario.
    for (const p of MARKET_STRUCTURE) {
      const mm = text.match(p.re);
      if (mm && !statedInScenario(mm[0].trim())) {
        issues.push({
          gate: 'jurisdiction', field, code: 'market-structure-specific',
          message: `names ${p.what} ("${mm[0].trim()}") in evaluative prose, and the scenario does not state it`,
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
    { re: /sensitiv/,                                          needs: /sensitiv/,                                              label: 'sensitivity analysis' },
    { re: /profitability index|capital ration/,               needs: /profitability index|capital ration/,                    label: 'a profitability-index / capital-rationing ranking' },
    // generic "rank/ranking" (e.g. mutually-exclusive IRR-vs-NPV) — the answer must actually
    // rank/prefer, not necessarily via a PI table.
    { re: /\brank(?:ing|ed)?\b/,                               needs: /\brank(?:ing|ed)?\b|prefer|mutually exclusive|profitability index|capital ration/, label: 'a ranking of the alternatives' },
    { re: /modified internal rate of return|\bmirr\b/,        needs: /\bmirr\b|modified internal rate of return/,             label: 'a MIRR calculation' },
    { re: /internal rate of return|\birr\b/,                   needs: /\birr\b|internal rate of return/,                        label: 'an IRR appraisal' },
    { re: /net present value|\bnpv\b/,                         needs: /\bnpv\b|net present value/,                             label: 'an NPV appraisal' },
    { re: /macaulay|modified duration|\bduration\b/,           needs: /macaulay|modified/,                                     label: 'a Macaulay/modified duration calculation' },
  ];
  for (const d of demands) {
    if (d.re.test(q) && !d.needs.test(a)) {
      issues.push({
        gate: 'completeness', field: 'model_answer', code: 'demanded-element-not-delivered',
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
