// lib/acca/certainty-lint.ts — the P-N3 CERTAINTY LINT. Pure: no DB, no model, no network.
//
// ── WHAT IT IS FOR ────────────────────────────────────────────────────────────────────
// Doctrine P-N3 (GENERATOR_DOCTRINE.md): NEVER LET THE RUBRIC OR THE GOLDEN GOOD KNOW MORE
// THAN THE EXHIBIT KNOWS. The rubric is written by someone who can see the whole design;
// the candidate can see only the exhibit. Five disguises have been found in SBL batch A —
// asserted direction, manufactured alternatives, an absolute built from a hedge, a
// population inferred from a sample, and proof claimed from correlation.
//
// Every one of them surfaces in the PROSE as a certainty word doing work the exhibit cannot
// support: the criterion says an episode "demonstrates" what it can only make plausible, or
// says a route is the "only" one, or says a control "was shut down" when the case records a
// person being removed from a project. The word is the tell. It is not the defect.
//
// ── IT REPORTS. IT DOES NOT REFUSE. ───────────────────────────────────────────────────
// There is deliberately NO `ok` boolean, no `blocking` field, and nothing here throws. Every
// term on the list is legitimate prose where an exhibit fact closes the weaker reading —
// "the retainer sits below his authority limit" IS confirmed by the exhibit, and a criterion
// saying so is correct. Whether the exhibit closes the reading is a semantic judgement with
// no structural discriminator, exactly like N6's claim ceiling, and it belongs to a human
// reader. A gate that refused on a word list would be gamed by an author writing to the
// detector inside a week — the P-DB5 lesson — and would refuse correct prose today.
//
// So the output is a WORK LIST, not a verdict: the sentences a cold reader should look at
// first, because these are the words that have historically been the tell.
//
// ── CLAIM CEILING, VERBATIM ───────────────────────────────────────────────────────────
//  (a) A HIT IS NOT A DEFECT. It is a sentence worth reading against the exhibit.
//  (b) A CLEAN FIELD IS NOT P-N3 CLEAN. The term list is CLOSED. An absolute phrased outside
//      it — "the pipeline has none", "there is no route but" — passes silently. This lint
//      cannot say a drill is safe; it can only say where to start.
//  (c) THE HEDGE TEST IS PROXIMITY, NOT ATTACHMENT. A hedge anywhere in the same sentence
//      suppresses the hit, including one attached to a different clause. That is the
//      false-NEGATIVE direction and it is the dangerous one, which is why hedged occurrences
//      are still RETURNED and still PRINTED — they are merely not counted in the work list.
//      Never report the unhedged count as though it were the number of occurrences.

/** The fields a drill exposes to this lint. `full_reveal` and `model_answer` are served to
 *  the candidate; `required_point` is what the marker marks against. All three can overclaim. */
export type CertaintyField = 'required_point' | 'model_answer' | 'full_reveal';

/** One canonical term. `pattern` is global + case-insensitive; callers must not rely on lastIndex. */
export type CertaintyTermSpec = {
  /** Canonical name, as it appears on the ruled list. */
  term: string;
  pattern: RegExp;
  /** Why this word has been the tell. Printed with the hit so the reader knows what to check. */
  note: string;
};

// ── THE LIST ──────────────────────────────────────────────────────────────────────────
// The 17 terms are Grant's, ruled 2026-08-21 off the SBL batch A cold reads. Inflections are
// folded into their canonical term (prove/proves/proved/proven) because the defect is the
// CERTAINTY CLAIM, not the tense — a criterion saying an episode "proved" it is the same
// defect as one saying it "proves" it. ONE extension beyond the literal list is marked
// EXTENSION below and is the author's, not the ruling's, so it can be dropped without argument.
export const CERTAINTY_TERMS: readonly CertaintyTermSpec[] = [
  { term: 'proves', pattern: /\b(prove|proves|proved|proven)\b/gi,
    note: 'proof claimed from what may only be correlation or plausibility' },
  { term: 'confirms', pattern: /\b(confirm|confirms|confirmed|confirming)\b/gi,
    note: 'a finding treated as settled where the exhibit reports an assertion' },
  { term: 'demonstrates', pattern: /\b(demonstrate|demonstrates|demonstrated|demonstrating)\b/gi,
    note: 'the episode made to show what it can only make plausible' },
  { term: 'ensures', pattern: /\b(ensure|ensures|ensured|ensuring)\b/gi,
    note: 'a safeguard promised an outcome the exhibit cannot guarantee' },
  { term: 'prevents', pattern: /\b(prevent|prevents|prevented|preventing)\b/gi,
    note: 'a control credited with closing a route the exhibit leaves open' },
  { term: 'no one', pattern: /\bno[-\s]one\b/gi,
    note: 'a population claim from a sample — the exhibit rarely enumerates everybody' },
  { term: 'every', pattern: /\bevery\b/gi,
    note: 'a population claim from a sample' },
  { term: 'only', pattern: /\bonly\b/gi,
    note: 'manufactured alternatives, or their mirror — a route declared the sole one' },
  // EXTENSION: `absence` is the noun form of the same claim and is how this corpus phrases it.
  { term: 'absent', pattern: /\b(absent|absence)\b/gi,
    note: 'an absolute built from a hedge — the case often says "rarely", not "never"' },
  { term: 'primary', pattern: /\bprimary\b/gi,
    note: 'a ranking the exhibit does not establish' },
  { term: 'directly', pattern: /\bdirectly\b/gi,
    note: 'asserted direction — a causal link the exhibit records only as sequence' },
  { term: 'certainly', pattern: /\b(almost certainly|certainly)\b/gi,
    note: 'certainty stated outright' },
  { term: 'must have', pattern: /\bmust\s+have\b/gi,
    note: 'inference to the only explanation, from an exhibit that offers several' },
  { term: 'cannot be verified', pattern: /\bcannot\s+be\s+verified\b/gi,
    note: 'unverifiability asserted — stronger than "has not been verified"' },
  { term: 'will fail', pattern: /\bwill\s+fail\b/gi,
    note: 'a predicted outcome stated as fact' },
  { term: 'will leave', pattern: /\bwill\s+leave\b/gi,
    note: 'a predicted outcome stated as fact' },
  { term: 'was shut down', pattern: /\b(was|were)\s+shut\s+down\b/gi,
    note: 'an event escalated past what the exhibit records' },
] as const;

// ── HEDGES ────────────────────────────────────────────────────────────────────────────
// A hedge is anything in the sentence that reopens the weaker reading: a modal, an epistemic
// verb, or an explicit statement about the LIMITS of the exhibit ("the case is silent",
// "management asserts"). The last group matters most — it is the shape the A5 fix used to
// repair "the only available lever", and a criterion carrying it is doing P-N3 correctly.
//
// ⚠️ THE LIST IS DELIBERATELY CONSERVATIVE, AND FIVE CANDIDATES WERE REMOVED AFTER MEASURING
// THEM AGAINST THIS CORPUS. A hedge SUPPRESSES a hit, so every entry is a potential false
// NEGATIVE — the dangerous direction under claim ceiling (c). An extra sentence to read costs
// a reader ten seconds; a suppressed defect ships. The five dropped, with the reason:
//   • `would`      — counterfactual, not epistemic, and ubiquitous in rubric prose ("the
//                    process that WOULD have verified his claim was shut down"). It suppressed
//                    a real `was shut down` hit in SBL-A4 c3.
//   • `can`        — "a candidate CAN earn" is not a hedge on the author's own claim.
//   • `risk(s)`    — the SUBJECT of every governance drill in this batch, not a hedge on it.
//   • `assertion`  — likewise: SBL-A4 is ABOUT an assertion, so the noun appears in almost
//                    every sentence of it. The attributing VERBS are kept; the bare noun is not.
//   • `states`     — neutral in this corpus ("the answer STATES which course to take").
export const HEDGES: readonly RegExp[] = [
  /\b(may|might|could)\b/gi,
  /\b(likely|unlikely|probably|probable|possibly|possible|potentially|plausibly|plausible|arguably|perhaps)\b/gi,
  /\b(appears?|appeared|seems?|seemed|suggests?|suggested|indicates?|indicated|implies|implied)\b/gi,
  /\b(tends?|tended)\s+to\b/gi,
  /\b(rarely|seldom|sometimes|often|generally|typically|usually|frequently)\b/gi,
  /\b(not necessarily|need not|does not follow|no basis|not established)\b/gi,
  /\b(asserts?|asserted|claims|claimed|contends?|contended)\b/gi,
  /\b(is|are|was|were)\s+silent\b/gi,
  /\bdo(es)?\s+not\s+(establish|show|state|say|record|prove|demonstrate)\b/gi,
  /\bis\s+not\s+(stated|established|shown|recorded)\b/gi,
  /\bon\s+the\s+(evidence|facts)\s+(available|before|given)\b/gi,
  /\b(some|several|a number of)\b/gi,
] as const;

export type CertaintyHit = {
  field: CertaintyField;
  /** Where in the drill: a criterion id (`c3`) for required_point, else the field name. */
  locator: string;
  term: string;
  /** The text actually matched, so an inflection is visible in the report. */
  matched: string;
  hedged: boolean;
  /** Which hedges suppressed it — printed so a reader can see whether the hedge is attached. */
  hedges: string[];
  sentence: string;
  /** Character offset of the match within the field's text. */
  offset: number;
};

/**
 * Split into sentences. The unit matters: a hedge two sentences away does NOT reopen the
 * reading of this one, so the scope is deliberately tight.
 *
 * Terminators are `.!?;:` FOLLOWED BY WHITESPACE, plus any newline. Requiring the whitespace
 * is what keeps `COP 4.2 billion` and `55.3%` in one piece — a naive split on `.` cuts every
 * decimal in this corpus in half and reports offsets nobody can find. Markdown bullets and
 * blank lines split, which is correct: a bullet is its own claim.
 */
export function splitSentences(text: string): { text: string; offset: number }[] {
  const out: { text: string; offset: number }[] = [];
  let start = 0;
  const re = /([.!?;:])\s+|\n+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const end = m.index + (m[1] ? 1 : 0);
    if (end > start) out.push({ text: text.slice(start, end), offset: start });
    start = re.lastIndex;
  }
  if (start < text.length) out.push({ text: text.slice(start), offset: start });
  return out.filter((s) => s.text.trim().length > 0);
}

/** Every hedge present in one sentence, deduplicated, lowercased. */
export function hedgesIn(sentence: string): string[] {
  const found = new Set<string>();
  for (const h of HEDGES) {
    const re = new RegExp(h.source, h.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(sentence)) !== null) {
      found.add(m[0].toLowerCase().replace(/\s+/g, ' '));
      if (m.index === re.lastIndex) re.lastIndex++;   // zero-width guard
    }
  }
  return [...found].sort();
}

/**
 * Lint one piece of prose. Returns EVERY occurrence of a listed term, each classified
 * `hedged` or not. Nothing is filtered out here — see claim ceiling (c): the caller decides
 * what to count, and the hedged ones are still worth a reader's eye.
 */
export function lintCertainty(text: string, field: CertaintyField, locator = field): CertaintyHit[] {
  const hits: CertaintyHit[] = [];
  for (const sentence of splitSentences(text)) {
    const hedges = hedgesIn(sentence.text);
    for (const spec of CERTAINTY_TERMS) {
      const re = new RegExp(spec.pattern.source, spec.pattern.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(sentence.text)) !== null) {
        hits.push({
          field,
          locator,
          term: spec.term,
          matched: m[0],
          hedged: hedges.length > 0,
          hedges,
          sentence: sentence.text.trim().replace(/\s+/g, ' '),
          offset: sentence.offset + m.index,
        });
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  return hits.sort((a, b) => a.offset - b.offset || a.term.localeCompare(b.term));
}

/** The note for a term, for printing beside a hit. */
export function noteFor(term: string): string {
  return CERTAINTY_TERMS.find((t) => t.term === term)?.note ?? '';
}

/** The shape this lint reads. Deliberately structural, so it works on a draft OR a DB row. */
export type LintableDrill = {
  label: string;
  model_answer?: string | null;
  full_reveal?: string | null;
  criteria?: { id: string; required_point: string }[];
};

export type CertaintyReport = {
  label: string;
  /** Every occurrence, hedged or not. */
  hits: CertaintyHit[];
  /** Hits with no hedge anywhere in their sentence — THE WORK LIST. */
  unhedged: CertaintyHit[];
  /** Occurrences suppressed by a same-sentence hedge. Printed, never counted as clean. */
  hedged: CertaintyHit[];
  byField: Record<CertaintyField, number>;
  byTerm: Record<string, number>;
};

export function lintDrillCertainty(drill: LintableDrill): CertaintyReport {
  const hits: CertaintyHit[] = [];
  for (const c of drill.criteria ?? []) {
    hits.push(...lintCertainty(c.required_point, 'required_point', c.id));
  }
  if (drill.model_answer) hits.push(...lintCertainty(drill.model_answer, 'model_answer'));
  if (drill.full_reveal) hits.push(...lintCertainty(drill.full_reveal, 'full_reveal'));

  const unhedged = hits.filter((h) => !h.hedged);
  const byField: Record<CertaintyField, number> =
    { required_point: 0, model_answer: 0, full_reveal: 0 };
  const byTerm: Record<string, number> = {};
  for (const h of unhedged) {
    byField[h.field]++;
    byTerm[h.term] = (byTerm[h.term] ?? 0) + 1;
  }
  return { label: drill.label, hits, unhedged, hedged: hits.filter((h) => h.hedged), byField, byTerm };
}
