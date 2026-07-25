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

import { ratingInfo } from './credit';

export interface ProseIssue {
  gate: 'jurisdiction' | 'completeness' | 'loss-relief' | 'frozen-facts' | 'rating-symbol' | 'misconception-lead' | 'zero-additional-tax-phrasing' | 'recommendation-consistency';
  field: string;
  code: string;
  message: string;
}

// GATE 26 recommendation-consistency (AFM mock FR1, 2026-07-25). Where a requirement's
// CODE computes a comparison verdict (a winning method — e.g. fxhedge's compareHedgeMethods
// exposes `selected_method`), the authored advice must NAME that same method in a
// recommendation-position sentence, and must NOT name a losing method in one. A
// recommendation-position sentence is any sentence containing should / recommend / advise /
// opt for. Method labels are matched on their core (leading "the " stripped). Self-contained
// regex — zero coupling to any live path. LOUD FAIL at authoring time.
const RECOMMEND_CUE = /\b(?:should|recommend(?:ed|s)?|advise[ds]?|opt(?:s|ed)?\s+for)\b/i;
// Split on NEWLINES first, then sentence terminators within each line — so a markdown
// table row or a heading (e.g. "| Money-market hedge | EUR 31.3m |") is its OWN unit and
// is never merged into a following recommendation sentence just because the block lacks
// interior punctuation. Without the newline split, the whole "comparison + recommendation"
// block reads as one sentence and a losing method named in the comparison TABLE would
// falsely trip the losing-method-in-recommendation check.
function splitSentences(text: string): string[] {
  return text.split(/\n+/).flatMap((line) => line.split(/(?<=[.!?])\s+/)).map((s) => s.trim()).filter(Boolean);
}
function methodCore(label: string): string {
  return label.replace(/^the\s+/i, '').trim().toLowerCase();
}
export function lintRecommendationConsistency(selectedMethod: string, allMethods: string[], fields: { model_answer?: string; full_reveal?: string }): ProseIssue[] {
  const issues: ProseIssue[] = [];
  const selected = methodCore(selectedMethod);
  const losers = Array.from(new Set(allMethods.map(methodCore))).filter((m) => m && m !== selected);
  let selectedNamedInRecPosition = false;
  for (const [field, text] of Object.entries(fields)) {
    if (typeof text !== 'string') continue;
    for (const sentence of splitSentences(text)) {
      if (!RECOMMEND_CUE.test(sentence)) continue;
      const low = sentence.toLowerCase();
      if (low.includes(selected)) selectedNamedInRecPosition = true;
      for (const loser of losers) {
        if (low.includes(loser)) {
          issues.push({
            gate: 'recommendation-consistency', field, code: 'losing-method-in-recommendation',
            message: `${field} names the LOSING method "${loser}" in a recommendation-position sentence, but the calculator selected "${selectedMethod}": "${sentence.slice(0, 220)}"`,
          });
        }
      }
    }
  }
  if (!selectedNamedInRecPosition) {
    issues.push({
      gate: 'recommendation-consistency', field: 'model_answer+full_reveal', code: 'selected-method-not-recommended',
      message: `the calculator selected "${selectedMethod}" as the winning method, but no recommendation-position sentence (should/recommend/advise/opt for) in the model answer or reveal names it.`,
    });
  }
  return issues;
}

// P8 rating-symbol realism (credit-risk batch, calculator #7, 2026-07-15). Rating symbols named
// in a drill must be REAL agency symbols (S&P/Fitch AAA…D or Moody's Aaa…C), a single agency's
// scale within one drill, with the investment-grade / high-yield boundary at BBB−/Baa3 (encoded
// in ratingInfo). We scan only fields that carry a rating CUE (so a bare "A" or "BBB" outside a
// ratings context never trips), extract rating-SHAPED tokens (a suffix, a 3–4 letter block, or an
// agency-number form — never a bare single/double letter), and flag any token the canonical
// scales reject, plus any drill that mixes the two agencies' scales.
const RATING_CUE = /\b(rating|rated|grade|notch|downgrad|upgrad|Moody|Fitch|S&P|investment[- ]grade|high[- ]yield|speculative[- ]grade)\b/i;
// Rating-shaped tokens: X+/X- suffix forms, 3–4 letter blocks (catches AAA/BBB and BBBB/AAB), and
// Moody's agency-number forms. The (?![A-Za-z]) lookahead keeps "C-suite"/"A-rated" from matching.
const SHAPED_RATING = /\b(?:[A-C]{1,3}[+-]|[A-C]{3,4}|Aaa|Aa\d|A\d|Baa\d|Ba\d|B\d|Caa\d|Ca)(?![A-Za-z])/g;

export function lintRatingSymbols(fields: Record<string, string>): ProseIssue[] {
  const issues: ProseIssue[] = [];
  const agencies = new Set<'SP' | 'Moodys'>();
  const seenInvented = new Set<string>();
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw || !RATING_CUE.test(raw)) continue;
    const tokens = raw.match(SHAPED_RATING) ?? [];
    for (const tok of tokens) {
      const info = ratingInfo(tok);
      if (info === null) {
        if (!seenInvented.has(tok)) {
          seenInvented.add(tok);
          issues.push({ gate: 'rating-symbol', field, code: 'invented-rating-symbol', message: `"${tok}" is not a real credit-rating symbol — use an S&P/Fitch (AAA…D) or Moody's (Aaa…C) scale symbol` });
        }
      } else {
        agencies.add(info.agency);
      }
    }
  }
  if (agencies.size > 1) {
    issues.push({ gate: 'rating-symbol', field: 'model_answer', code: 'mixed-rating-agencies', message: `the drill mixes rating agencies (S&P/Fitch and Moody's symbols) — pick ONE agency's scale and use it throughout` });
  }
  return issues;
}

// P4b frozen-market-facts (duration round-1 FIX 6; NARROWED — lint ruling 2026-07-14). A
// scenario is a dated snapshot, not a live feed: a present-tense MARKET fact ("current market
// rates", "currently yields 6%") ages the moment a rate moves and must be frozen as a dated
// assumption ("at the valuation date"). But fictional scenario-STATE ("currently uses ROI",
// "currently at 71% utilisation", "utilisation rate (currently 71%)", "sector benchmark") is
// legitimate exam framing and must NOT flag. So we trigger ONLY on:
//   (1) "current market …" — a live market claim by construction; or
//   (2) "currently" (the adverb) within proximity of a MARKET-QUALIFIED term (yield, inflation,
//       credit spread, exchange/interest/policy/market/swap/discount/coupon/benchmark rate,
//       benchmark yield, basis points, a named reference rate, market price/level/data/input).
// Bare "rate"/"benchmark" and the adjective "current" (as in "current yield level" = the
// evaluation point, "current duration profile") deliberately do NOT trigger.
const MARKET_QUALIFIED =
  /\b(?:yields?|inflation|(?:credit )?spreads?|(?:exchange|interest|policy|market|swap|discount|coupon|benchmark) rates?|swap curve|benchmark yields?|basis points?|libor|sofr|euribor|jibor|sonia|market (?:price|level|data|input)s?)\b/i;
const CURRENT_MARKET = /\bcurrent market\b/i;
const CURRENTLY = /\bcurrently\b/gi;
const PROXIMITY = 45;

export function lintFrozenMarketFacts(fields: Record<string, string>): ProseIssue[] {
  const issues: ProseIssue[] = [];
  const flag = (field: string, raw: string, idx: number) => issues.push({
    gate: 'frozen-facts', field, code: 'live-market-claim',
    message: `states a live market fact ("…${raw.slice(Math.max(0, idx - 12), idx + 42).replace(/\s+/g, ' ').trim()}…") — a scenario is a dated snapshot; freeze it as a dated assumption (e.g. "at the valuation date" / "as assumed in the scenario")`,
  });
  for (const [field, raw] of Object.entries(fields)) {
    if (!raw) continue;
    const cm = CURRENT_MARKET.exec(raw);
    if (cm) flag(field, raw, cm.index);
    CURRENTLY.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = CURRENTLY.exec(raw))) {
      const window = raw.slice(Math.max(0, m.index - PROXIMITY), m.index + m[0].length + PROXIMITY);
      if (MARKET_QUALIFIED.test(window)) flag(field, raw, m.index);
    }
  }
  return issues;
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
    // "duration" is satisfied by EITHER a bond Macaulay/modified duration (calc #6) OR a PROJECT
    // duration = Σ(t×PV)÷ΣPV (calc #3 risk & uncertainty, B1a vi — S1/S2; ACCA calls it "project
    // duration"/PV-weighted average time, NOT "Macaulay"). Accept both so the risk family passes P5.
    { re: /macaulay|modified duration|\bduration\b/,           needs: /macaulay|modified|project duration|present-value-weighted|pv-weighted/, label: 'a Macaulay/modified or project (Σ(t×PV)÷ΣPV) duration calculation' },
    { re: /credit spread/,                                     needs: /spread/,                                                label: 'a credit-spread figure' },
    { re: /cost of debt/,                                      needs: /cost of debt|\bkd\b/,                                   label: 'a cost-of-debt figure' },
    { re: /fair value|over-?valued|under-?valued|mispric/,     needs: /fair value/,                                            label: 'a fair-value calculation' },
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

// P7 — misconception-lead authoring gate (2026-07-24). `extractMisconceptionLead`
// (lib/acca/tutor-grounding.ts) is consumed LIVE by every conversational tutor leg's
// GroundingPack.misconceptionLead — but it only extracts a REAL fact when full_reveal contains a
// literal "...misconception...: " sentence; otherwise it SILENTLY falls back to full_reveal's first
// sentence (generic scaffolding, not the drill's actual designed failure mode). Measured blast
// radius (2026-07-24, read-only): 70/145 live drills (48%) on the fallback path — AFM 8/54 (15%),
// APM 62/91 (68%). This gate is AUTHORING-TIME ONLY: it stops NEW rows and EDITED rows from joining
// that set. It does NOT touch extractMisconceptionLead or any live/runtime path, and it does NOT
// retroactively block the 70 existing rows (they are inert until next touched — fix-on-touch).
//
// MISCONCEPTION_PATTERN is a byte-identical COPY of extractMisconceptionLead's own primary regex
// (tutor-grounding.ts:59), duplicated deliberately rather than imported so this authoring-time gate
// has zero coupling to — and can never accidentally alter — the live grounding-pack code path. If
// extractMisconceptionLead's primary pattern is ever changed, update this copy to match.
const MISCONCEPTION_PATTERN = /^.*?misconception[^:]*:/i;

export function lintMisconceptionLead(fullReveal: string): ProseIssue[] {
  if (!fullReveal) return []; // empty full_reveal is a separate, pre-existing gap — out of this gate's scope
  if (MISCONCEPTION_PATTERN.test(fullReveal)) return [];
  return [{
    gate: 'misconception-lead', field: 'full_reveal', code: 'fallback-not-real-match',
    message: 'full_reveal has no literal "...misconception...: " sentence — extractMisconceptionLead ' +
      '(lib/acca/tutor-grounding.ts) will silently fall back to the first sentence (generic scaffolding, ' +
      'not a real failure-mode fact), breaking GroundingPack.misconceptionLead for every conversational ' +
      'tutor leg on this drill. Add an explicit sentence naming the drill\'s designed misconception, e.g. ' +
      '"The classic misconception here is X: ..." or "The dominant misconception is Y: ...".',
  }];
}

// P9 zero-additional-tax phrasing (AFM mock FR1, 2026-07-25; same wording family as the
// batch #10 double-tax MAJOR). When a requirement's tax computation yields ZERO additional
// home-country tax (host corporate rate ≥ home rate, so the foreign-tax credit already
// covers the whole home liability), the withholding tax on the remittance is a NET COST —
// it is NOT credited/offset against anything, because there is no residual home charge to
// set it against. Prose that describes the WHT as "credited against" / "offset against" the
// home charge is therefore wrong on the branch and misteaches the rule. This gate fires
// ONLY on the zero-additional-tax branch (the caller passes that boolean) and flags the
// credit-against language in the requirement's OWN prose (model_answer / hint / full_reveal
// — NOT the shared scenario, which may legitimately state the treaty's creditability).
//
// The regex is a self-contained copy — zero coupling to any live grounding/tutor path.
// "credit(ed/able) … against" is matched across an intervening noun phrase (bounded to
// ≤40 non-period chars so it never crosses a sentence) — the real misteaching is
// "credit the withholding against the home charge", not only the bare "credit against".
const CREDIT_AGAINST_PATTERN = /credit(?:ed|able)?[^.]{0,40}\bagainst\b|offset\s+against|set\s+off\s+against/i;

export function lintZeroAdditionalTaxPhrasing(zeroAdditionalTax: boolean, fields: { model_answer?: string; hint?: string; full_reveal?: string }): ProseIssue[] {
  if (!zeroAdditionalTax) return []; // only the nil-additional-tax branch is at risk of this misteaching
  const issues: ProseIssue[] = [];
  for (const [field, text] of Object.entries(fields)) {
    if (typeof text === 'string' && CREDIT_AGAINST_PATTERN.test(text)) {
      issues.push({
        gate: 'zero-additional-tax-phrasing', field, code: 'credit-against-on-nil-branch',
        message: `${field} uses "credit/offset ... against" language for the withholding tax, but this requirement's tax computation yields ZERO additional home-country tax (host corporate rate ≥ home rate). With no residual home charge, the withholding is a NET REMITTANCE COST, not a credit that is set against anything. Reword to the three-branch rule: home > host → additional tax on the differential; home ≤ host → no additional tax and the excess credit is unusable; the withholding is a net cost regardless.`,
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
  const scope = {
    question: fields.question,
    context_text: fields.context_text,
    model_answer: fields.model_answer,
    hint: fields.hint ?? '',
    full_reveal: fields.full_reveal ?? '',
  };
  return [
    ...lintJurisdiction(scope),
    ...lintFrozenMarketFacts(scope),
    ...lintCompleteness(fields.question, fields.model_answer),
    ...lintRatingSymbols(scope),
    ...lintMisconceptionLead(scope.full_reveal),
  ];
}
