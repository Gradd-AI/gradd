// lib/acca/tutor-discriminants.ts
//
// THE DIRECTION FENCE for the teaching loop. Pure — no I/O, no model, no DB.
//
// WHY THIS EXISTS. Measured 2026-08-01 over n=20 fresh turns on a seeded WRONG-DIRECTION answer
// ("Castlereagh is borrowing so it should BUY futures" — a borrower SELLS):
//   • 4/20 the tutor AFFIRMED THE INVERSE RULE as correct ("a borrower hedges rising rates by
//     buying futures"), i.e. actively taught the #1 examiner-flagged error in the family;
//   • ~10/20 never adjudicated direction at all and went straight to the contract count.
//
// The cause was not the model being careless. `answer_schema.params` carries `side: "sell"` and
// `direction: "borrower"` as CODE-OWNED discriminants, and NOTHING READ THEM. The case teach route
// never selected `answer_schema` at all, and `buildGroundingPack` — which the drill route does use
// — reads only `components[].working_steps` and labels. **Both paths had the same hole.** The tutor
// was inferring direction from `model_answer` PROSE and getting the polarity backwards.
//
// STRUCTURAL, NOT INSTRUCTED (docs/TEACHING_ARCHITECTURE.md). This module does NOT add a rule
// telling the tutor "check the direction first" — a prohibition/instruction loses to the
// helpfulness prior, banked twice in this codebase already (the withhold engine, the marker's
// reference block, and a third time in teach-demand.ts). Instead:
//
//   1. the discriminant is surfaced as a STATED FACT the tutor reads ("This trade is a SELL"),
//      exactly like a scenario fact — nothing to obey, only something to know;
//   2. the CONTRADICTION IS COMPUTED IN CODE. `detectContradictions` matches the student's own
//      words against the closed enum of surface forms and, when the student has asserted the
//      opposite of a code-owned value, states THAT as a fact too ("The candidate wrote 'buy'; the
//      code-owned side for this trade is 'sell'"). The tutor is not asked to notice the
//      contradiction — it is handed it.
//
// WHY A SURFACE-FORM TABLE IS LEGITIMATE HERE AND WAS NOT FOR ADVICE-vs-COMPUTED. The scoping
// report rejected a phrase table as the primary defence against free-form advice prose, because
// author prose is open-ended and a table silently passes every paraphrase. These discriminants are
// CLOSED ENUMS owned by the calculator — `side` is exactly 'buy' | 'sell', `direction` is exactly
// 'borrower' | 'depositor'. The surface forms of a two-valued enum are enumerable; the surface
// forms of "threatens the outlay" are not. The table is over VALUES, not over claims.

/** One code-owned discriminant, rendered for the tutor as a fact. */
export interface DiscriminantFact {
  key: string;        // the params key, e.g. 'side'
  value: string;      // the code-owned value, e.g. 'sell'
  statement: string;  // student-safe statement of fact, e.g. 'This hedge is a SELL of futures.'
}

/** A detected contradiction between the student's own words and a code-owned value. */
export interface ContradictionFact {
  key: string;
  expected: string;   // the code-owned value
  wrote: string;      // the surface form the student actually used
  statement: string;  // stated as a finding, not as an instruction
}

interface ValueSpec {
  /** How the correct value is stated to the tutor as a fact. */
  say: string;
  /** Surface forms that ASSERT this value in a student's answer. Closed set — see header. */
  forms: RegExp;
}

interface DiscriminantSpec {
  label: string;
  values: Record<string, ValueSpec>;
}

/**
 * THE REGISTRY. Only keys listed here are surfaced; an unregistered params key is ignored rather
 * than guessed at, because a half-understood discriminant stated as fact is worse than silence.
 *
 * Every `forms` pattern must match ONLY an assertion of that value. They are deliberately narrow:
 * a false contradiction ("you said buy" when they did not) would have the tutor correcting
 * something the student never wrote, which is the same class of harm as the defect being fixed.
 */
const DISCRIMINANTS: Record<string, DiscriminantSpec> = {
  side: {
    label: 'the side of the futures trade',
    values: {
      sell: { say: 'This hedge is a SELL (short) of futures contracts.', forms: /\b(sells?|selling|sold|shorts?|shorting|go(?:es)? short|short position)\b/i },
      buy:  { say: 'This hedge is a BUY (long) of futures contracts.',  forms: /\b(buys?|buying|bought|longs?|go(?:es)? long|long position)\b/i },
    },
  },
  direction: {
    label: 'whether the company is borrowing or depositing',
    values: {
      borrower:  { say: 'The company is a BORROWER here, so its exposure is to a rate RISE.', forms: /\b(borrow(?:s|er|ing)?|loan|facility|drawdown)\b/i },
      depositor: { say: 'The company is a DEPOSITOR here, so its exposure is to a rate FALL.', forms: /\b(deposit(?:s|or|ing)?|invest(?:s|ing)? (?:surplus|cash))\b/i },
      receipt:   { say: 'The exposure is a RECEIPT of foreign currency.', forms: /\b(receipts?|receiv(?:e|es|ing)|inflow)\b/i },
      payment:   { say: 'The exposure is a PAYMENT of foreign currency.', forms: /\b(payments?|pay(?:s|ing)?|outflow)\b/i },
    },
  },
  quote_direction: {
    label: 'which way the exchange rate is quoted',
    values: {
      foreign_per_home: { say: 'The rate is quoted as FOREIGN currency per 1 unit of HOME currency, so DIVIDE a foreign amount by the rate to get home currency.', forms: /\bforeign per home\b|\bdivide by the (?:rate|spot|forward)\b/i },
      home_per_foreign: { say: 'The rate is quoted as HOME currency per 1 unit of FOREIGN currency, so MULTIPLY a foreign amount by the rate to get home currency.', forms: /\bhome per foreign\b|\bmultiply by the (?:rate|spot|forward)\b/i },
    },
  },
};

/** Pull the code-owned discriminants out of an `answer_schema`. Tolerates any schema shape. */
export function extractDiscriminants(answerSchema: unknown): DiscriminantFact[] {
  const schema = answerSchema as { params?: Record<string, unknown> } | null;
  const params = schema && typeof schema === 'object' ? schema.params : undefined;
  if (!params || typeof params !== 'object') return [];

  const out: DiscriminantFact[] = [];
  for (const [key, spec] of Object.entries(DISCRIMINANTS)) {
    const raw = (params as Record<string, unknown>)[key];
    if (typeof raw !== 'string') continue;
    const value = raw.trim().toLowerCase();
    const v = spec.values[value];
    if (!v) continue;                       // unregistered VALUE — ignored, never guessed
    out.push({ key, value, statement: v.say });
  }
  return out;
}

/**
 * Does the student's own text assert the OPPOSITE of a code-owned value?
 *
 * Conservative by construction: a contradiction is reported only when the student's words match a
 * sibling value's forms AND do not match the correct value's forms. A student who writes "I know a
 * borrower sells rather than buys" matches both, and is NOT reported — mentioning the wrong option
 * while stating the right one is not an error, and flagging it would be the false-correction
 * failure mode.
 */
export function detectContradictions(
  studentText: string,
  discriminants: DiscriminantFact[],
): ContradictionFact[] {
  const out: ContradictionFact[] = [];
  if (!studentText.trim()) return out;

  for (const d of discriminants) {
    const spec = DISCRIMINANTS[d.key];
    if (!spec) continue;
    const correct = spec.values[d.value];
    if (!correct) continue;
    if (correct.forms.test(studentText)) continue;   // they stated the right one — nothing to report

    for (const [otherValue, otherSpec] of Object.entries(spec.values)) {
      if (otherValue === d.value) continue;
      const m = otherSpec.forms.exec(studentText);
      if (!m) continue;
      out.push({
        key: d.key,
        expected: d.value,
        wrote: m[0],
        // A FINDING, stated as fact. Not "you must correct this first" — the tutor is handed what
        // is true and left to teach. See the header on why this is not an instruction.
        statement:
          `The candidate's answer says "${m[0]}". For ${spec.label}, the code-owned value for this ` +
          `requirement is "${d.value}". The candidate has the ${spec.label} the wrong way round, ` +
          `and every figure that follows from it is computed on the wrong side of the trade.`,
      });
      break;                                          // one contradiction per discriminant
    }
  }
  return out;
}

/**
 * Render discriminants + contradictions for the per-turn anchor.
 *
 * ORDERING IS THE MECHANISM for the "never adjudicated" half of the defect (~10/20 baseline). A
 * contradiction is rendered FIRST and labelled as what it is, so the most consequential finding is
 * not buried under a checklist of downstream components. Nothing tells the tutor to lead with it;
 * it simply arrives first and arrives as the biggest fact in the block.
 */
export function renderDiscriminants(
  discriminants: DiscriminantFact[],
  contradictions: ContradictionFact[],
): string {
  if (discriminants.length === 0 && contradictions.length === 0) return '';
  const contra = contradictions.length
    ? `CONTRADICTION FOUND — the candidate's answer is on the wrong side of a code-owned choice. ` +
      `Everything downstream of it is affected:\n${contradictions.map((c) => `- ${c.statement}`).join('\n')}\n\n`
    : '';
  const facts = discriminants.length
    ? `CODE-OWNED CHOICES for this requirement (these are settled facts, not opinions):\n` +
      `${discriminants.map((d) => `- ${d.statement}`).join('\n')}\n\n`
    : '';
  return contra + facts;
}

/** Exported for fixtures: the registry's own shape, so tests assert over the WHOLE table. */
export const REGISTERED_DISCRIMINANTS = Object.entries(DISCRIMINANTS).map(([key, s]) => ({
  key, values: Object.keys(s.values),
}));
