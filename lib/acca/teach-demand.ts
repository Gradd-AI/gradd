// lib/acca/teach-demand.ts
//
// THE TAXONOMY FENCE for the teaching loop. Pure — no I/O, no model, no DB.
//
// WHY THIS EXISTS. `acca_case_requirements` carries `command_verb` ("calculate") and
// `intellectual_level` (2 or 3). Those are INTERNAL authoring fields: the sit route already
// withholds both, on the ground that a real exam gives no such steer. The teaching loop was
// passing them into the prompt raw, under an instruction that told the model to SAY them —
// `teach-engine.ts` read "Authored command verb + intellectual level (name these — do not infer)".
// The model did as it was told, and students were shown lines like:
//
//     "At ACCA intellectual level 3, where 'calculate' sits, you need to …"
//     "To hit ACCA intellectual level 3 on this calculate verb …"
//
// Two sightings on two different cases (Kestrel, Castlereagh), so a pattern rather than a slip.
//
// STRUCTURAL, NOT INSTRUCTED (docs/TEACHING_ARCHITECTURE.md). The fix is NOT to add "do not
// mention the intellectual level" to the prompt — the helpfulness prior beats that, and the same
// lesson is already banked twice in this codebase (the withhold engine, and the marker's
// reference block). The fix is that the RAW LABEL NEVER ENTERS THE PROMPT. The route translates
// (verb, level) into a plain-English statement of what the requirement demands, and that is all
// the model ever sees. There is no code left to leak.
//
// This mirrors `sitDisplayLabel`, which strips the LO code AT THE SERVE BOUNDARY rather than in
// the component — for the same reason: something removed downstream has already been shipped.
//
// The demand is still REAL calibration. A level-3 "evaluate" genuinely demands more than a
// level-2 "explain", and the diagnosis should reflect that; it just does not need the vocabulary.

/** What each command verb actually asks the candidate to DO, in words a student would use. */
const VERB_DEMAND: Record<string, string> = {
  calculate:   'produce the figures and then use them — a number without a conclusion drawn from it is incomplete',
  evaluate:    'weigh the considerations against each other and reach a supported position, not list them',
  assess:      'judge how much each factor actually matters here, and say so',
  discuss:     'set out the competing considerations and show which carries more weight',
  advise:      'give a recommendation the reader can act on, with the reason it follows',
  explain:     'make the mechanism clear — why it works this way, not just that it does',
  recommend:   'commit to one course of action and justify it against the alternatives',
  identify:    'name the relevant items precisely, and describe each rather than listing it',
  analyse:     'break the position into its parts and show what each contributes',
  compare:     'set the options side by side on the same basis and say which wins',
  demonstrate: 'show the working that establishes the point, step by step',
  estimate:    'produce a defensible figure and state what it depends on',
  prepare:     'produce the schedule or statement in a form the reader can use',
  comment:     'give an informed view on what the position means, not a description of it',
};

/** What the intellectual level demands, expressed as depth rather than as a number. */
const LEVEL_DEMAND: Record<number, string> = {
  1: 'This requirement tests whether the candidate knows the material.',
  2: 'This requirement tests APPLICATION: the technique must be applied to this scenario\'s own facts, not described in general terms.',
  3: 'This requirement tests JUDGEMENT: applying the technique correctly is the floor, and the marks are in what the candidate concludes from it for this organisation.',
};

/**
 * Translate the internal authoring fields into a demand description safe to put in a prompt.
 *
 * Returns '' when neither field is present, so callers that build a prompt line with
 * `demand ? ... : ''` keep their existing behaviour exactly.
 *
 * NOTHING in the output contains the verb taxonomy, the level number, or the words "command
 * verb" / "intellectual level" — that is the property this function exists to guarantee, and
 * `scripts/test-teach-demand.ts` asserts it over EVERY registered verb and level rather than
 * over a sample.
 */
export function describeDemand(
  commandVerb: string | null | undefined,
  intellectualLevel: number | null | undefined,
): string {
  const parts: string[] = [];

  const level = typeof intellectualLevel === 'number' ? LEVEL_DEMAND[intellectualLevel] : undefined;
  if (level) parts.push(level);

  const verb = typeof commandVerb === 'string' ? commandVerb.trim().toLowerCase() : '';
  const verbLine = verb ? VERB_DEMAND[verb] : undefined;
  if (verbLine) {
    parts.push(`What the requirement asks the candidate to do: ${verbLine}.`);
  } else if (verb) {
    // UNREGISTERED VERB — say so rather than passing the raw verb through as a fallback, which
    // would reintroduce exactly the leak this module closes. Named, never silent.
    parts.push('What the requirement asks for is stated in the requirement itself; judge against that.');
  }

  return parts.join(' ');
}

/** The tokens that must never appear in a demand description. Exported so the fixtures and any
 *  future caller assert against ONE list rather than each keeping its own copy. */
export const TAXONOMY_TOKENS = [
  'intellectual level',
  'command verb',
  'level 1', 'level 2', 'level 3',
  'authored',
] as const;

/** True when a string is free of every internal taxonomy token. */
export function isTaxonomyFree(s: string): boolean {
  const low = s.toLowerCase();
  return !TAXONOMY_TOKENS.some((t) => low.includes(t));
}

/** Every verb the demand table knows — exported so fixtures can assert coverage of the whole
 *  table rather than of a hand-picked few. */
export const REGISTERED_VERBS = Object.keys(VERB_DEMAND);
export const REGISTERED_LEVELS = Object.keys(LEVEL_DEMAND).map(Number);
