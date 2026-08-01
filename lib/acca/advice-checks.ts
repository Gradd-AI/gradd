// lib/acca/advice-checks.ts
//
// ADVICE-vs-COMPUTED. Pure — no I/O, no model, no DB.
//
// THE PROBLEM, twice. Author-written advice prose has contradicted its own code-owned figures:
//   • Kestrel (B5b) — prose written for a tax branch the calculator did not produce;
//   • Halvard (B1a) — "the delayed scenario is the only one that threatens the outlay", against a
//     computed set in which TWO of three scenarios have a negative NPV and P(negative) is 70%.
// Both were caught by a human reading the built output. That does not scale.
//
// THE DESIGN IS INJECTION-FIRST, AND THIS MODULE IS THE BACKSTOP.
//
//   PRIMARY (not here — it lives in each `build*ModelAnswer`): the computed verdict AND the
//   computed counts are INJECTED into the model answer as code-owned sentences. An author writing
//   the advice slot has no reason to state either, because both are already on the page above
//   them. Halvard's failure was a count the builder never stated, so the author supplied one from
//   memory. Injection removes the vacuum rather than policing what fills it.
//
//   BACKSTOP (here): if advice prose states a count or a verdict ANYWAY, check it against the
//   computed facts. This is a second line, deliberately, because a check that must interpret free
//   prose can only ever catch the phrasings it knows.
//
// WHY QUANTIFIERS AND NOT A PHRASE TABLE. The scoping report rejected a phrase table as the
// PRIMARY defence and that ruling stands. What is checked here is not a table of claims — it is
// the **closed grammatical class of English quantifiers** ("the only", "neither", "both", "all",
// "two of"). "Threatens the outlay", "puts the capital at risk" and "loses money" are three
// phrasings of one claim and no table can enumerate them; "the only" is a quantifier and the list
// of quantifiers is finite. The check reads HOW MANY the prose asserts, never WHAT it asserts.
//
// REGISTRATION DISCIPLINE. A family either declares its checkable facts or declares
// NO_ADVICE_CHECKS with a reason. There is no third state, and no silent pass: `checkAdvice`
// returns an explicit `not_registered` issue for a family that has declared nothing, so a family
// that is not covered LOOKS uncovered in the gate output instead of looking clean.

export interface CountFact {
  id: string;
  /** What is being counted, e.g. /scenario|case|outcome/i. Matched in the same sentence. */
  subject: RegExp;
  /** How many satisfy the predicate. */
  n: number;
  /** How many there are in total. */
  total: number;
  /** Plain description used in the failure message, e.g. "scenarios with a negative NPV". */
  describes: string;
}

export interface VerdictFact {
  id: string;
  /** The label the prose would name, e.g. 'the forward', 'the money-market hedge'. */
  label: string;
  /** Whether this label is the one the calculator selected / the verdict holds for. */
  holds: boolean;
  describes: string;
}

export type AdviceFacts =
  | { kind: 'checks'; counts: CountFact[]; verdicts: VerdictFact[] }
  | { kind: 'none'; reason: string };

/** Declare a family as unchecked, WITH a reason. The reason is printed by the gate. */
export function noAdviceChecks(reason: string): AdviceFacts {
  if (!reason.trim()) throw new Error('noAdviceChecks requires a reason — an unexplained exemption is a silent pass');
  return { kind: 'none', reason };
}

export interface AdviceIssue { code: string; message: string }

// ── The closed quantifier class ──────────────────────────────────────────────
// Each entry maps a quantifier to the count it asserts, given the total. `null` total-dependence
// means the quantifier names an absolute number; a function means it depends on the total.
const QUANTIFIERS: { re: RegExp; asserts: (total: number) => number; say: string }[] = [
  { re: /\bthe only\b/i,                 asserts: () => 1,      say: '"the only" asserts exactly one' },
  { re: /\bonly one\b/i,                 asserts: () => 1,      say: '"only one" asserts exactly one' },
  { re: /\bjust one\b/i,                 asserts: () => 1,      say: '"just one" asserts exactly one' },
  { re: /\bneither\b/i,                  asserts: () => 0,      say: '"neither" asserts none' },
  { re: /\bnone of\b/i,                  asserts: () => 0,      say: '"none of" asserts none' },
  { re: /\bboth\b/i,                     asserts: () => 2,      say: '"both" asserts exactly two' },
  { re: /\ball (?:three|four|five)\b/i,  asserts: (t) => t,     say: '"all" asserts every one' },
  { re: /\ball of them\b/i,              asserts: (t) => t,     say: '"all of them" asserts every one' },
  { re: /\btwo of the\b/i,               asserts: () => 2,      say: '"two of the" asserts exactly two' },
  { re: /\bthree of the\b/i,             asserts: () => 3,      say: '"three of the" asserts exactly three' },
];

const RECOMMEND_CUE = /\b(recommend|advise|should|opt for|prefer|choose|select)\b/i;

const splitSentences = (t: string) => t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);

/**
 * Check advice prose against a family's registered computed facts.
 *
 * Returns [] only when the family HAS registered checks and none of them is contradicted.
 * A family that registered nothing yields an explicit `not_registered` issue — see the header
 * on why an unregistered family must not look clean.
 */
export function checkAdvice(prose: string, facts: AdviceFacts): AdviceIssue[] {
  if (facts.kind === 'none') {
    return [{ code: 'not_registered', message: `advice checks NOT RUN for this family — declared reason: ${facts.reason}` }];
  }
  const issues: AdviceIssue[] = [];
  if (!prose.trim()) return issues;

  for (const sentence of splitSentences(prose)) {
    // ── COUNT CLAIMS ──
    for (const cf of facts.counts) {
      if (!cf.subject.test(sentence)) continue;
      for (const q of QUANTIFIERS) {
        if (!q.re.test(sentence)) continue;
        const asserted = q.asserts(cf.total);
        if (asserted === cf.n) continue;
        issues.push({
          code: 'count-claim-contradicts-computed',
          message:
            `advice says ${q.say}, but the calculator computed ${cf.n} of ${cf.total} ${cf.describes}. ` +
            `Sentence: "${sentence.trim().slice(0, 200)}"`,
        });
      }
    }
    // ── VERDICT CLAIMS ──
    // Only in a recommendation-position sentence, mirroring GATE 26's proven shape.
    if (!RECOMMEND_CUE.test(sentence)) continue;
    const low = sentence.toLowerCase();
    for (const vf of facts.verdicts) {
      if (vf.holds) continue;
      if (!low.includes(vf.label.toLowerCase())) continue;
      issues.push({
        code: 'verdict-claim-contradicts-computed',
        message:
          `advice names "${vf.label}" in a recommendation-position sentence, but the calculator ` +
          `did not select it (${vf.describes}). Sentence: "${sentence.trim().slice(0, 200)}"`,
      });
    }
  }
  return issues;
}

// ── Family registrations ─────────────────────────────────────────────────────
// Each returns the facts for ONE computed object. Adding a family here is the only way it gets
// checked; a family with no entry must call noAdviceChecks() at its call site with a reason.

/** ENPV (B1a). The Halvard case: a count claim over scenarios with a negative NPV. */
export function enpvAdviceFacts(c: { scenarios: { npv: number }[]; accept: boolean }): AdviceFacts {
  const negative = c.scenarios.filter((s) => s.npv < 0).length;
  return {
    kind: 'checks',
    counts: [{
      id: 'negative_scenarios',
      subject: /scenario|case|outcome|state\b/i,
      n: negative,
      total: c.scenarios.length,
      describes: 'scenarios with a negative NPV',
    }],
    verdicts: [],
  };
}

/** Forward-vs-MMH comparison (E2b K1). Mirrors GATE 26 at the advice layer. */
export function comparisonAdviceFacts(
  c: { comparison: { best: { method: string } }; },
  allMethods: string[],
): AdviceFacts {
  return {
    kind: 'checks',
    counts: [],
    verdicts: allMethods.map((m) => ({
      id: `method_${m}`,
      label: m,
      holds: m === c.comparison.best.method,
      describes: `the calculator selected "${c.comparison.best.method}"`,
    })),
  };
}
