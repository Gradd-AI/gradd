// lib/acca/warning-drift.ts — the P-N3 WARNING-DRIFT CHECK. Pure: no DB, no model, no network.
//
// ── THE PATTERN IT HUNTS (GPT, cold read 3, 2026-08-21) ──────────────────────────────
//   "Whenever a criterion contains an explicit evidential warning ('the case does not
//    say…', 'do not infer…', 'either reading earns…'), search the GOOD and reveal for the
//    very proposition that warning forbids."
//
// By cold read 3 the batch's defect class had MOVED. It was no longer crude overclaiming in
// the rubric — that had been repaired — it was **rubric → GOOD → reveal DRIFT**: a criterion
// correctly refuses to assume a fact, and then the model answer or the teaching paragraph
// quietly reintroduces it. That is worse than the original defect, because the criterion now
// reads as evidence that the drill has been disciplined.
//
// ── WHAT IS ACTUALLY IMPLEMENTABLE, AND WHAT IS NOT ──────────────────────────────────
// The match is SEMANTIC and cannot be regexed. What IS regexable, in two stages:
//
//   STAGE 1 — FIND THE WARNING. Reliable. These criteria are house-authored in a narrow
//   register, so the warning lead forms are a closed-ish set ("the case does not record",
//   "it does not establish that", "EITHER verdict earns", "is reading the exhibit
//   correctly"). Precision here is high.
//
//   STAGE 2 — NAME WHAT IS FORBIDDEN. This is the hard half, and the thing that makes it
//   tractable is that a well-written warning SAYS THE FORBIDDEN THING OUT LOUD in order to
//   forbid it. Three sub-forms carry almost all of it:
//     (a) a NEGATIVE-EXEMPLAR clause — "rather than asserting that X", "not that X"
//     (b) an ENUMERATION of invented routes — "— an outside leadership hire, an
//         arm's-length division, an acquisition —"
//     (c) the complement of "does not <say|tell|record|establish|show> …"
//   Terms are harvested from those, stemmed, and filtered to the DISTINCTIVE ones (a term in
//   a quarter of the drill's sentences is register, not signal). Every GOOD/reveal sentence
//   is then scored by how many distinctive forbidden terms it carries.
//
// 📐 STAGE 2 IS WHY THE OBVIOUS DESIGN FAILS. Plain term-overlap against the warning SENTENCE
// misses A4 c3 — the clearest of the three known failures — because the warning's first
// clause ("the case does not record what happened to Ríos's report") shares NO vocabulary
// with the GOOD's breach ("the mechanism by which his claim would have been TESTED"). The
// overlap lives in the negative-exemplar clause that follows: "rather than asserting that the
// arrangement cannot be TESTED from inside CA at all". Sub-form (a) is not a refinement; it
// is the difference between a check that works and one that does not.
//
// ── IT REPORTS. IT DOES NOT REFUSE. ───────────────────────────────────────────────────
// No `ok` boolean, nothing throws, exit 0 always — same contract as `certainty-lint.ts`.
// A pair means "this sentence talks about the distinctive things the warning forbids". It
// CANNOT tell an allowed mention from a forbidden one: A3 c5 legitimately discusses roles and
// so does its GOOD. Every pair needs a reader holding the exhibit.
//
// ── CLAIM CEILING, VERBATIM ───────────────────────────────────────────────────────────
//  (a) THIS IS A RECALL TOOL, NOT A PRECISION TOOL. It is tuned so the three known failures
//      surface; the false pairs that come with them are the price and are not a defect.
//  (b) IT CANNOT SEE SYNONYM DRIFT. A GOOD that says "a separate business unit" where the
//      warning says "division" scores ZERO. The check only works while author and warning
//      share vocabulary — which is exactly when drift is EASIEST for a human to spot anyway.
//  (c) A WARNING WITH NO LEAD FORM IS INVISIBLE. An implicitly hedged criterion is not
//      scanned at all, so a clean report is not evidence that a drill has no drift.
//  (d) IT CANNOT SEE DRIFT BY IMPLICATION — a GOOD that assumes the forbidden fact without
//      naming it carries none of its terms.

export type DriftField = 'model_answer' | 'full_reveal';

/** Lead forms that mark a sentence as an explicit evidential warning. Stage 1. */
export const WARNING_LEADS: readonly RegExp[] = [
  /\bthe case (does not|never)\b/i,
  /\bthe (exhibit|scenario|papers?) (does not|do not|never|provides? no|gives? no|supplies? nothing|records? no)\b/i,
  /\b(it|which) does not (establish|tell|record|say|show|prove|isolate|mention)\b/i,
  /\bnothing in the (case|exhibit|scenario|review)\b/i,
  /\bdo(es)? not (infer|assume|require them to know)\b/i,
  /\b(is|are) silent\b/i,
  /\bEITHER (verdict|reading|conclusion)\b/i,
  /\bboth readings are open\b/i,
  /\bis reading the (exhibit|case|evidence) correctly\b/i,
  /\bwould (be )?mark(ing)? agreement with its author\b/i,
  /\bknows? more than the exhibit\b/i,
  /\bhas made the same error\b/i,
  /\band no more\b/i,
  /\bnot that it proves it\b/i,
  /\bcannot require them to know\b/i,
  /\bdoes not (say when|record what)\b/i,
];

/**
 * Register words. A warning is written in rubric prose, so most of its words are rubric
 * prose. Without this the top-scoring pair for every warning is whichever sentence happens
 * to say "the candidate" the most.
 */
const STOP = new Set<string>((
  'a an the and or but if then than that this these those of to in on at by for with from as is are was were be been being it its'
  + ' not no nor so such same other another any all both each either neither one two three four five six'
  + ' case cases exhibit exhibits scenario paper papers candidate candidates criterion criteria rubric mark marks marking'
  + ' full earn earns earned require requires required significance consequence example illustrate illustrated'
  + ' develop developed developing undeveloped point points answer answers reading readings evidence evidential'
  + ' would could may might should must can will does do did has have had who whom which what when where why how'
  // NB: own/owned/owns are deliberately NOT stopped — 'owned action' vs 'naming an owner' is the
  // one stem that makes A3 c5's breach visible. 'record/state/say' stay: they are warning register.
  + ' more most less least very much many few record records recorded state states stated say says said'
  + ' tell tells told show shows shown prove proves proven establish establishes established mention mentions mentioned'
  + ' board management leadership organisation organization company group they them their there here also just only'
  + ' about into over under across within without before after while during between against'
  + ' correctly wrong right open closed given taken made make makes making know knows known rather'
  + ' his her hers him she hers theirs ours yours mine our your'
).split(/\s+/));

/** Crude suffix stemmer. Enough to bind owner/owned/owns and test/tested/testing. */
export function stem(word: string): string {
  let w = word.toLowerCase().replace(/[^a-z'-]/g, '');
  w = w.replace(/'s$/, '');

  // PASS 1 — plurals, using the real English rule rather than a suffix list. A naive list that
  // tries `es` before `s` turns `roles` into `rol` while `role` stays `role`, so the two never
  // bind — and `role` is the single stem that makes A3 c5's GOOD breach visible.
  if (/(ss|us|is)$/.test(w)) {
    /* not a plural */
  } else if (/(ses|xes|zes|ches|shes)$/.test(w) && w.length > 4) {
    w = w.slice(0, -2);
  } else if (/ies$/.test(w) && w.length > 4) {
    w = `${w.slice(0, -3)}y`;
  } else if (/s$/.test(w) && w.length > 3) {
    w = w.slice(0, -1);
  }

  // PASS 2 — verbal and agentive endings, so owner/owned/owns and test/tested/testing all bind.
  for (const suf of ['ingly', 'edly', 'ing', 'ed', 'er']) {
    if (w.length > suf.length + 2 && w.endsWith(suf)) { w = w.slice(0, -suf.length); break; }
  }
  return w;
}

/** Split prose into sentences. Same rule as certainty-lint: terminator + whitespace, or newline. */
export function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?;:])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function contentTerms(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[^A-Za-zÀ-ÿ'-]+/)) {
    if (raw.length < 3) continue;
    const s = stem(raw);
    if (s.length < 3 || STOP.has(s) || STOP.has(raw.toLowerCase())) continue;
    out.push(s);
  }
  return out;
}

/**
 * Stage 2. Pull the clauses in which a warning NAMES what it forbids, and harvest their terms.
 * Falls back to the whole sentence when none of the three sub-forms is present.
 */
export function forbiddenTerms(warning: string, preceding = ''): { terms: string[]; clauses: string[] } {
  const clauses: string[] = [];

  // (a) negative exemplar — the highest-value form; see the A4 c3 note in the header.
  for (const m of warning.matchAll(
    /\brather than\s+(?:by\s+)?(\w+ing\s+)?(?:that\s+)?([^,.;—]{8,200})/gi,
  )) clauses.push(m[0]);
  for (const m of warning.matchAll(/\bnot that\s+([^,.;—]{5,200})/gi)) clauses.push(m[0]);

  // (b) an enumeration of invented routes, usually set off by em dashes.
  for (const m of warning.matchAll(/—\s*([^—]{10,240}?)\s*—/g)) {
    if (/,/.test(m[1])) clauses.push(m[1]);
  }

  // (c) the complement of an explicit "does not <verb>".
  for (const m of warning.matchAll(
    /\b(?:does not|do not|never|cannot)\s+(?:establish|tell|record|say|show|prove|isolate|mention|require)\s+(?:that\s+|us\s+|the candidate\s+)?([^.;]{5,200})/gi,
  )) clauses.push(m[1]);

  // (d) THE SANCTIONED FORM, which usually sits in the sentence immediately BEFORE the
  // warning. A bounding warning ("…it does not tell the candidate what else the report
  // contained") often names only the LIMIT, while the permitted claim — and therefore the
  // vocabulary a drifting GOOD exceeds — is in the preceding sentence. A3 c5 is exactly this:
  // the warning shares nothing with its GOOD's breach, but the preceding sanctioned form
  // ("converted into an OWNED action") binds to "naming an OWNER" and catches it.
  const source = [clauses.length > 0 ? clauses.join(' ') : warning, preceding].join(' ');
  return { terms: [...new Set(contentTerms(source))], clauses };
}

export type DriftPair = {
  criterionId: string;
  warning: string;
  /** The clause(s) that named the forbidden proposition, if any were isolated. */
  clauses: string[];
  field: DriftField;
  sentence: string;
  /** Distinctive forbidden terms this sentence carries. */
  matched: string[];
  score: number;
};

export type DriftReport = {
  label: string;
  warnings: { criterionId: string; warning: string; terms: string[] }[];
  pairs: DriftPair[];
};

export type DriftInput = {
  label: string;
  criteria: { id: string; required_point: string }[];
  model_answer?: string | null;
  full_reveal?: string | null;
  /** Extra prose used ONLY to measure how common a term is. Never scanned for drift. */
  context_text?: string | null;
  /** A term in more than this share of the drill's sentences is register, not signal. */
  maxDocFreq?: number;
  /** Minimum distinct forbidden terms for a pair to be reported. */
  minScore?: number;
};

export function findWarnings(required_point: string): string[] {
  return sentences(required_point).filter((s) => WARNING_LEADS.some((re) => re.test(s)));
}

/** Each warning with the sentence before it — see sub-form (d) in . */
export function findWarningsWithContext(required_point: string): { warning: string; preceding: string }[] {
  const all = sentences(required_point);
  return all
    .map((s, i) => ({ warning: s, preceding: i > 0 ? all[i - 1] : '' }))
    .filter((x) => WARNING_LEADS.some((re) => re.test(x.warning)));
}

export function checkWarningDrift(input: DriftInput): DriftReport {
  const maxDocFreq = input.maxDocFreq ?? 0.25;
  const minScore = input.minScore ?? 1;

  const target: { field: DriftField; sentence: string }[] = [];
  for (const s of sentences(input.model_answer ?? '')) target.push({ field: 'model_answer', sentence: s });
  for (const s of sentences(input.full_reveal ?? '')) target.push({ field: 'full_reveal', sentence: s });

  // Document frequency over the CRITERIA AND THE EXHIBIT ONLY — never over the text being
  // scanned. Including the GOOD/reveal inverts the check: the more times a model answer
  // breaches a warning, the commoner its term becomes and the LESS distinctive it scores, so
  // a triple breach hides better than a single one. Found by the acceptance fixture — A2 c6's
  // three "new division" sentences pushed the term to 57% document frequency and silenced it.
  // Register is a property of the rubric and the scenario, which is exactly what is left here.
  const corpus = [
    ...input.criteria.map((c) => c.required_point),
    input.context_text ?? '',
  ].flatMap(sentences);
  const df = new Map<string, number>();
  for (const s of corpus) for (const t of new Set(contentTerms(s))) df.set(t, (df.get(t) ?? 0) + 1);
  // ⚠️ A DOCUMENT-FREQUENCY FILTER NEEDS A DOCUMENT. Below this many sentences the ratio is
  // noise — on a 3-sentence corpus a term used ONCE sits at 33% and is silently discarded as
  // register. Real criteria run to 30+ sentences; the guard matters for short/synthetic input.
  const enoughCorpus = corpus.length >= 15;
  const distinctive = (t: string) =>
    !enoughCorpus || (df.get(t) ?? 0) / corpus.length <= maxDocFreq;

  const warnings: DriftReport['warnings'] = [];
  const pairs: DriftPair[] = [];

  for (const c of input.criteria) {
    for (const { warning, preceding } of findWarningsWithContext(c.required_point)) {
      const { terms, clauses } = forbiddenTerms(warning, preceding);
      const keep = terms.filter(distinctive);
      warnings.push({ criterionId: c.id, warning, terms: keep });
      if (keep.length === 0) continue;

      for (const t of target) {
        const inSentence = new Set(contentTerms(t.sentence));
        const matched = keep.filter((k) => inSentence.has(k));
        if (matched.length >= minScore) {
          pairs.push({
            criterionId: c.id, warning, clauses,
            field: t.field, sentence: t.sentence,
            matched, score: matched.length,
          });
        }
      }
    }
  }

  // DEDUPE. A criterion usually carries several warning sentences, and they overlap, so the
  // same GOOD sentence pairs with each of them and the same finding is printed three or four
  // times. Collapse on (criterion, field, sentence), keeping the best-scoring warning — the
  // reviewer wants the finding once, at its strongest.
  const best = new Map<string, DriftPair>();
  for (const p of pairs) {
    const key = [p.criterionId, p.field, p.sentence].join('|');
    const prev = best.get(key);
    if (!prev || p.score > prev.score) best.set(key, p);
  }
  const deduped = [...best.values()]
    .sort((a, b) => b.score - a.score || a.criterionId.localeCompare(b.criterionId));
  return { label: input.label, warnings, pairs: deduped };
}
