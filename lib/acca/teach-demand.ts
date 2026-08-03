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

/**
 * What each command verb actually asks the candidate to DO, in words a student would use.
 *
 * TWO PHRASINGS PER VERB, and the split is load-bearing:
 *   • `solo` — a complete sentence-tail, used when the verb stands alone.
 *   • `act`  — a terse imperative clause, used when the verb is one PART of a compound
 *              ("calculate and evaluate"). `solo` phrasings often already carry their own
 *              "…and then…" tail, which reads as a stutter once the composer supplies the
 *              conjunction; `act` is the same demand with that tail removed.
 *
 * A single string cannot serve both jobs — that is why this is a record of objects rather
 * than of strings. See `composeCompound` for what the two are composed into.
 */
interface VerbDemand {
  solo: string;
  act: string;
}

const VERB_DEMAND: Record<string, VerbDemand> = {
  calculate:   { solo: 'produce the figures and then use them — a number without a conclusion drawn from it is incomplete',
                 act:  'produce the figures' },
  evaluate:    { solo: 'weigh the considerations against each other and reach a supported position, not list them',
                 act:  'weigh the considerations against each other and reach a supported position' },
  assess:      { solo: 'judge how much each factor actually matters here, and say so',
                 act:  'judge how much each factor actually matters here' },
  discuss:     { solo: 'set out the competing considerations and show which carries more weight',
                 act:  'set out the competing considerations and show which carries more weight' },
  advise:      { solo: 'give a recommendation the reader can act on, with the reason it follows',
                 act:  'give a recommendation the reader can act on, with the reason it follows' },
  explain:     { solo: 'make the mechanism clear — why it works this way, not just that it does',
                 act:  'make the mechanism clear — why it works this way, not just that it does' },
  recommend:   { solo: 'commit to one course of action and justify it against the alternatives',
                 act:  'commit to one course of action and justify it against the alternatives' },
  identify:    { solo: 'name the relevant items precisely, and describe each rather than listing it',
                 act:  'name the relevant items precisely' },
  analyse:     { solo: 'break the position into its parts and show what each contributes',
                 act:  'break the position into its parts and show what each contributes' },
  compare:     { solo: 'set the options side by side on the same basis and say which wins',
                 act:  'set the options side by side on the same basis' },
  demonstrate: { solo: 'show the working that establishes the point, step by step',
                 act:  'show the working that establishes the point, step by step' },
  estimate:    { solo: 'produce a defensible figure and state what it depends on',
                 act:  'produce a defensible figure and state what it depends on' },
  prepare:     { solo: 'produce the schedule or statement in a form the reader can use',
                 act:  'produce the schedule or statement in a form the reader can use' },
  comment:     { solo: 'give an informed view on what the position means, not a description of it',
                 act:  'give an informed view on what the position means' },

  // ── Added 2026-08-03, DERIVED FROM THE LIVE CORPUS, not from imagination ────
  // Every verb below was measured in `acca_drills` (approved + published) and was previously
  // UNREGISTERED — either standing alone or as a part inside a compound. Before this change 68
  // of 154 live drills carried a verb this table could not resolve; see
  // `scripts/audit-verb-coverage.ts` for the standing measurement.
  apply:       { solo: 'put the technique to work on this scenario\'s own facts, not on a general case',
                 act:  'put the technique to work on this scenario\'s own facts' },
  forecast:    { solo: 'project the position forward and state the assumptions the projection rests on',
                 act:  'project the position forward and state what it assumes' },
  determine:   { solo: 'establish the figure or the position and show what settles it',
                 act:  'establish the figure or the position' },
  value:       { solo: 'produce a defensible valuation and be explicit about the basis it uses',
                 act:  'produce a defensible valuation on a stated basis' },
  conclude:    { solo: 'close with a position that follows from what you have just shown',
                 act:  'close with a position that follows from what you have just shown' },
  interpret:   { solo: 'say what the numbers or the position actually mean for this organisation',
                 act:  'say what it actually means for this organisation' },
  distinguish: { solo: 'draw the line between them and say why the difference matters here',
                 act:  'draw the line between them and say why the difference matters' },
};

// ── COMPOUND VERBS — the join is the thing being tested ──────────────────────
// 24 of the 35 distinct verbs in the live corpus are compounds ("calculate and evaluate",
// "assess, value and advise", "evaluate, explain, advise, assess"). They are the MAJORITY of
// level-3 drills, and they were the whole coverage hole: `describeDemand` looked the raw string
// up in a single-verb table, missed, and fell through to a shrug — on 62 of 154 live drills.
//
// They are handled COMPOSITIONALLY rather than by enumerating 24 literals. Enumeration would
// close today's hole and reopen it the moment an author writes the 25th combination, which is
// exactly how this defect arrived. Composition also cannot drift out of step with the single-verb
// table, because it reads that table.
//
// THE RULE, and it is a real ACCA one rather than a formatting convenience: in a compound
// requirement the LEADING verbs are the floor and the TERMINAL verb carries the marks. "Calculate
// and evaluate" is not two equal halves — the calculation is the price of entry and the marks are
// in what you conclude from it. That is the single most common shape in the corpus (13 drills) and
// it generalises: identify→assess, apply→advise, assess,value→advise. Naming the join is therefore
// not decoration; it is the statement of where the marks actually are.

/** Split a raw command verb into its parts. Handles "a and b", "a, b and c", "a, b, c, d". */
function splitVerbs(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/,|\band\b/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Join a list into "a; b" / "a; b; c" for the floor clause. */
function joinFloor(parts: string[]): string {
  return parts.join('; ');
}

/**
 * Build the demand for a compound verb from its resolved parts.
 *
 * Returns null when fewer than two parts resolve — the caller then falls back rather than
 * emitting a half-composed sentence that names one demand and silently drops the other.
 */
function composeCompound(parts: string[]): string | null {
  const resolved = parts.map((p) => VERB_DEMAND[p]).filter((d): d is VerbDemand => !!d);
  if (resolved.length < 2) return null;

  const floor = resolved.slice(0, -1).map((d) => d.act);
  const marks = resolved[resolved.length - 1].act;

  return (
    `This requirement is in ${resolved.length === 2 ? 'two' : 'several'} parts and the JOIN is what ` +
    `is being tested. The floor is to ${joinFloor(floor)}. The marks are in what comes after it: ` +
    `${marks}. A candidate who does the floor and stops has done the easy half — that is the single ` +
    'most common way this shape of requirement loses marks.'
  );
}

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
  if (verb) {
    // Resolution order: exact single → compound composition → the named fallback.
    // The single lookup runs FIRST so a registered one-word verb keeps its bespoke `solo`
    // phrasing rather than being routed through the compound path as a one-part "compound".
    const single = VERB_DEMAND[verb];
    if (single) {
      parts.push(`What the requirement asks the candidate to do: ${single.solo}.`);
    } else {
      const compound = composeCompound(splitVerbs(verb));
      if (compound) {
        parts.push(compound);
      } else {
        // UNREGISTERED VERB — say so rather than passing the raw verb through as a fallback, which
        // would reintroduce exactly the leak this module closes. Named, never silent.
        parts.push('What the requirement asks for is stated in the requirement itself; judge against that.');
      }
    }
  }

  return parts.join(' ');
}

/**
 * Does this verb resolve to a real demand, or does it fall through to the fallback shrug?
 *
 * Exported so the coverage audit and the fixtures ask the SAME question the prompt builder asks,
 * rather than each re-implementing "is it in the table". That is the property that lets
 * `scripts/test-teach-demand.ts` assert over the live corpus instead of over the table — the
 * check that would have made the original hole visible.
 */
export function verbResolves(commandVerb: string | null | undefined): boolean {
  const verb = typeof commandVerb === 'string' ? commandVerb.trim().toLowerCase() : '';
  if (!verb) return false;
  if (VERB_DEMAND[verb]) return true;
  return composeCompound(splitVerbs(verb)) !== null;
}

// ── THE NEXT-MOVE CONTRACT (level-aware output shape) ────────────────────────
// The teach and hint legs previously carried ONE output contract for every drill: "name the ONE
// gap that matters most and the single next move that unblocks it… 3 sentences, 4 at the most".
// That is a description of a LEVEL-2-SIZED repair, and it was applied unchanged at level 3.
//
// Measured on a real student's transcripts (dd786100, 4 drills, 18 Jul – 1 Aug): at level 2 the
// next moves were edits to what he had already written ("name what current measures would hide
// about customer concentration") and he acted on them three times, improving measurably. At level
// 3 the next moves were fresh analyses — "trace EBIT and interest cover through a 10% sales fall",
// "rebuild capital employed and NOPAT and recalculate EVA" — each as large as the original task.
// He capitulated after ONE attempt on all three level-3 drills while writing his LONGEST answers.
// He was not under-writing; he was being handed a second task instead of a revision.
//
// So the contract is now a FUNCTION of the level. What differs is the SIZE and SHAPE of the move,
// not the tone or the sentence budget.
//
// TAXONOMY-FREE, like everything else this module emits — the level decides the contract, and the
// contract never mentions the level. Asserted in the fixtures over every registered level.
const NEXT_MOVE_CONTRACT: Record<number, string> = {
  1: 'CLOSING MOVE: end with ONE concrete thing they can write and send back — a definition, a ' +
     'named item, a single sentence. Never end on a question you leave them to ponder.',

  2: 'CLOSING MOVE: end with ONE concrete EDIT to the answer they have already written — a ' +
     'sentence to add, a fact to bring in, a claim to tie to the scenario. It must be small ' +
     'enough to do in a sentence or two on top of what they wrote. Never end on a question you ' +
     'leave them to ponder; end on the instruction, so they finish this message knowing exactly ' +
     'what to type next.',

  3: 'CLOSING MOVE — DECOMPOSE, do not restate. This requirement has a floor and a part that ' +
     'carries the marks, and they have almost certainly done the floor. Do NOT ask them to redo, ' +
     'rebuild or recalculate work they have already produced, and do NOT restate the whole ' +
     'requirement back at them — either one hands them a second task the size of the first, ' +
     'which is where students stop. Instead name the FIRST concrete step of the part that ' +
     'carries the marks, phrased so it uses the work they ALREADY have in front of them: ' +
     '"you have the figure — now say in one sentence whether it changes your recommendation" is ' +
     'right; "rebuild the figures, recalculate, then evaluate" is wrong. One step, using what ' +
     'they already hold. Never end on a question you leave them to ponder; end on the ' +
     'instruction, so they finish this message knowing exactly what to type next.',
};

/**
 * The output-shape contract for a teaching leg at this intellectual level.
 *
 * Returns '' for an unknown/absent level, so callers keep their existing behaviour exactly (the
 * same `contract ? line : ''` discipline `describeDemand` already follows). Level 3 is the one
 * that decomposes; levels 1–2 keep the edit-sized move that was already working.
 */
export function nextMoveContract(intellectualLevel: number | null | undefined): string {
  return (typeof intellectualLevel === 'number' ? NEXT_MOVE_CONTRACT[intellectualLevel] : '') ?? '';
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
