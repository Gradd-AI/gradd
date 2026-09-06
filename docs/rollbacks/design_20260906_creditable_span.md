# DESIGN — `creditable_span`: the credit claim is bound to bytes the student wrote

**DESIGN ONLY. Nothing in this document is built.** Requested 2026-09-06 §4, after the merge of
`fix/reveal-quotation-and-sanitizer-cut` at `ab194fe`.

---

## 0. The target, in one shape

The remaining defect is one behaviour on both surfaces: **the tutor credits the student with the
position they argued against.**

| site | rate | leg | verdict in scope on that turn? |
|---|---|---|---|
| case reveal, seed A (confidently wrong) | **1/10** | `call4_reveal` | ❌ — carried, session-sticky |
| case reveal, seed B (creditable) | **1/30** | `call4_reveal` | ❌ — carried, session-sticky |
| drill hint, first miss | **6–8/10** | `call3_hint` | ✅ — same turn |

⚠️ **The three rates are NOT comparable to one another** (`P-M6`) — different seeds, different
legs, different n. What they share is the SHAPE, and the shape is what this design targets.

**This is `P-T5`'s pattern, third application.** *The model may not name what code has not
validated.* The closed inventory here is **the student's own words**, and the validator is a byte
comparison against the exact text the model was shown.

---

## 1. THE DIAGNOSE PROMPT CHANGE

One block appended to `GAP_VERDICT_FORMAT` (`lib/acca/gap-verdict.ts:65`) — **the only place the
output shape is stated**, and it reaches both surfaces because both `call2_diagnose`
implementations import it rather than transcribing it (already fixture-pinned,
`test-case-envelope.ts` §6).

> Also return "creditable_span": a substring of the student's answer, COPIED CHARACTER FOR
> CHARACTER, that earns credit against this requirement — or null if there is none. Copy it from
> their answer exactly as written: do not paraphrase it, do not correct its spelling or grammar,
> do not join text from two places, do not use an ellipsis, do not add or remove words. It must be
> one continuous run of their own text. If nothing in the answer earns credit, return null.

**Three properties of that wording, each load-bearing:**

1. **It asks for a QUOTATION, not a decision.** The ordinal contract (`P-M1`) bans a model-chosen
   WORD standing for a decision — `derived` is `0|1` and never `"underived"`, because a model
   paraphrases every string it is asked to reproduce. **A span is the opposite case and the
   distinction must be stated in the module or the next reader will read this as a violation:**
   the string here IS the datum, not a label for one, and **code verifies it against a source it
   holds**. Nothing downstream parses it for meaning.
2. **`null` is an explicit, named output**, not an omission. An absent field and a declared `null`
   are different observations and the metric in §7 separates them.
3. **No prohibition is added anywhere else** (`P-T2` / `P-M4(a)`). The demand is stated once, in
   positive terms, in the block that defines the output shape. Nothing tells the model not to
   invent — that instruction has been tried three times on this defect and each time moved its
   primary metric the wrong way.

⚠️ **`max_tokens` MUST RISE AND THE FIXTURE PINS THE CURRENT VALUE.** The case leg is at
`max_tokens: 160` (`teach-engine.ts:438`), sized for a 12–15 word label plus two integers. A span
of 10–25 words does not fit, and **a truncated body fails `parseGapVerdict` on every turn**, which
would produce a run measuring a parser that never parses. `test-case-envelope.ts` asserts
`/max_tokens: 160,/` — that check moves with this change and the new value is what it pins.

---

## 2. THE PARSER CHANGE

`parseGapVerdict` (`gap-verdict.ts:98`) gains one optional field, read with the **same strictness
discipline `creditable` already has**:

```ts
creditable_span?: string | null;
```

- Accepted: a **non-empty string** after trim, or **`null`**.
- Anything else — a number, an array, an object, `""`, `undefined` — is **dropped to `undefined`**.
- **It can never fail the parse.** `derived` IS wired to production behaviour; a required field the
  model sometimes omits would fail the parse, burn four retries through `withParseRetry` on the
  drill route, and degrade the live path in order to measure something.
- **`null` and `undefined` are kept apart in the returned object**, not collapsed. They are
  different facts: `null` is the model saying *there is nothing to credit*; `undefined` is the
  model not answering. The metric needs both, and the handler treats them the same — deliberately,
  and only in v1.

**The parser does NOT validate the span.** It has no attempt to validate against, and giving it one
would make a pure text parser depend on turn state. Validation is §3.

---

## 3. THE VALIDATOR — a new pure function, and it is the whole mechanical claim

```ts
export type SpanOutcome =
  | 'absent'          // field not returned at all
  | 'declared_null'   // model returned null
  | 'inadmissible'    // failed the admissibility rule below
  | 'not_in_attempt'  // FAILED THE BYTE CHECK — what the §7 metric exists for
  | 'valid';

export function validateCreditableSpan(
  verdict: GapVerdict | null,
  attempt: string,
): { span: string | null; outcome: SpanOutcome };
```

Pure: no I/O, no model, no env. Lives in `gap-verdict.ts` beside the parser.

### 3a. NORMALISATION — stated exactly, and it is SHORTER than the quotation check's

**WHITESPACE ONLY.** Every run of whitespace (space, tab, CR, LF) collapses to one space on both
sides; both sides are trimmed. Then `haystack.includes(needle)`.

**Nothing else is normalised.** Not letter case, not apostrophe shape (`'` vs `’`), not
punctuation, not markdown, not unicode dashes or quote glyphs, not spelling. Each is a real
difference between what the student wrote and what the model claims they wrote.

📐 **AND `dropOneTrailingPunctuation` IS DELIBERATELY NOT CARRIED OVER FROM
`reveal-quotation.ts`.** That normalisation exists there for one reason: American typography puts
the CARRIER SENTENCE's own comma inside the quotation marks, so a faithful citation would fail a
byte compare on punctuation that is not part of the citation. **There are no quotation marks
here.** The span is a JSON field the model copied out of a prompt, so there is no carrier sentence
and no convention to forgive. Importing the exemption would widen the check for a reason that does
not apply to it.

**No fuzzy matching, no stemming, no edit distance, no token overlap, no substring-of-substring
recovery. A failed match is `null`.** An ellipsis, a joined pair of clauses and a paraphrase all
fail for free — they are simply not substrings.

### 3b. ADMISSIBILITY — the code-owned rule, run BEFORE the byte check

A span can be verbatim and still incapable of carrying a credit claim. **Run 9 is the case:** the
only material the student wrote that the reply's credit sentence could have quoted was the number
`94%`, and the proposition attached to it (*"needs hard scrutiny against the base rate"*) was the
student's opposite. A bare figure names a THING; it does not assert anything, so it cannot support
*"you spotted that …"*.

**The rule:** a span is inadmissible unless it contains **at least four words, of which at least
two are not function words** (reusing the stop set already in `reveal-quotation.ts:245`), and it is
not **figure-only** (every token a number, currency symbol, percent sign or unit).

⚠️ **THESE TWO CONSTANTS ARE A JUDGEMENT ENCODED AS NUMBERS, AND §8 SAYS SO.** They are
fixture-coverable — which is different from being right — and they must be derived from the
captured corpus before they are chosen, not picked here.

### 3c. THE ORDER, and it is not arbitrary

`absent` → `declared_null` → `inadmissible` → `not_in_attempt` → `valid`. Admissibility runs before
the byte check so that **the metric in §7 counts only spans that were CAPABLE of being right**. A
one-word span that fails the byte check would otherwise inflate the invention rate with cases that
were never candidates — the same over-attribution that `[reveal:unsourced-figures]` made when
collision and word-form misses were folded into one number (`AFM_SURFACED.md` (h2)).

---

## 4. EVERY CALLER OF THE VERDICT, AND WHAT THE ADDED FIELD DOES TO EACH

Exhaustive. Eighteen sites.

### Unchanged by construction — they read a different field

| # | site | reads | effect |
|---|---|---|---|
| 1 | `nothingEstablished` (`gap-verdict.ts:124`) | `.derived` | none |
| 2 | `resolveNothingEstablished` (`gap-verdict.ts:176`) | `.derived` | none |
| 3 | `nothingCreditable` (`gap-verdict.ts:146`) | `.creditable` | **none — see the ruling below** |
| 4 | `safeLabel` (`gap-verdict.ts:190`) | `.label` | none |
| 5 | `hintOpeningInstruction` (`hint-opening.ts:75`) | two booleans | none until §5's handler passes a third |
| 6 | `ParseRetryFn` / `withParseRetry` (`case-marking.ts:281`) | throw / no-throw | none — the field cannot fail the parse |
| 7 | case `call3_teach` (`teach-engine.ts:681`) | label only | none — miss 2+, out of scope in v1 |
| 8 | case `call3_confirm` (`teach-engine.ts:739`) | — | none |
| 9 | drill `call3_teach` (`route.ts:627`) | label only | none |
| 10 | drill `call3_confirm` (`route.ts:750`) | — | none |

🔴 **RULING ON #3, and it is the one a reader will want to change first.** `nothingCreditable`
**must not** start consulting the span. It is a wired arm measured at **60/60 agreement with a
hand-read including a 20/20 positive control**, and making it read a second field re-opens that
measurement — `P-M1`. The disagreement cell (`creditable: 1` with no valid span) is **logged in §7
and wired to nothing**. It is a candidate for a later arm, not part of this one.

### Changed — the parser and the two envelopes

| # | site | change |
|---|---|---|
| 11 | `parseGapVerdict` (`gap-verdict.ts:98`) | one optional field, §2. **Existing fixtures pass unchanged** because it is optional |
| 12 | case `call2_diagnose` (`teach-engine.ts:414`) | `max_tokens` raised; **return type unchanged** — the span rides inside `verdict` |
| 13 | drill `call2_diagnose` (`route.ts:379`) | same; its return type already carries `codeOwnsUnderived` alongside |

⚠️ **`test-case-envelope.ts` PINS THE CASE RETURN TYPE AS A REGEX**
(`/Promise<\{ label: string; verdict: GapVerdict \| null \}>/`). Keeping the span inside the
verdict object is what leaves that pin standing; adding a fourth top-level return key would move it
for no benefit.

### Changed — the carry, the handlers, and the two logs

| # | site | change |
|---|---|---|
| 14 | case `runCaseTurn` (`teach-engine.ts:1342`) | new `newCreditableSpan`, returned beside `newEverCreditable` |
| 15 | case session blob (`teach-engine.ts:131`, `openPayload`) | new key, **NORMALISED not spread**: `typeof o.creditableSpan === 'string' ? … : undefined` |
| 16 | case `call3_hint` (`teach-engine.ts:608`) → `caseHintOpening` | new optional param, §5 |
| 17 | case `call4_reveal` (`teach-engine.ts:1044`) → `buildRevealWrapperUserPrompt` | new optional field, §5 |
| 18 | drill `call3_hint` (`route.ts:520`) | new optional param, §5 — **the highest-rate site, and the only one where the verdict is in scope on the same turn** |
| — | both gap logs (`teach-engine.ts:487`, `route.ts:490`) | `+ span_outcome`, `+ span_words`, §7 |

### 🔴 THE DRILL REVEAL IS NOT ON THE LIST, AND THAT IS A GAP, NOT AN OMISSION

`route.ts:1059`'s `call4_reveal` receives **no creditable signal of any kind** — the sticky
`everCreditable` carry is CASE-ONLY (`openPayload`; the drill route has no equivalent, grepped).
`revealWrapperSystemFor` is called there with no `opts` at all, so the drill reveal serves the
**unconditioned** credit demand today. Extending the span there needs the sticky-carry mechanism
built on the drill route first, which is a second piece of work and is **not in this design**.

### ⚠️ THE STICKY CARRY RE-VALIDATES, AND THIS IS THE SUBTLE PART

On the case surface the span is produced on an ATTEMPT turn and consumed on the REVEAL turn, which
does not call `call2_diagnose`. So the span is carried — and **a carried span may not be a
substring of the text the reveal is actually looking at**: the reveal's attempt is
`lastRealAttempt ?? studentMessage`, and a span from miss 1 need not appear in miss 2's text.

**The rule is the one `enforceVerbatimQuotation` already follows: validate against the exact bytes
the model is shown, at the moment it is shown them.** So `validateCreditableSpan` runs AGAIN at
`call4_reveal` against that turn's `attempt`, and a failure yields `null`. The span is never handed
to a leg that is not also looking at the text it came from. This produces a **second** metric (§7b)
and it is a different question from §7a.

**Rejected alternative:** carrying the source attempt alongside the span and showing both. It would
hand the reveal model text it is not otherwise shown, which is a larger change to what the leg sees
than the fix is worth, and it re-opens the divergence-#5 measurement.

---

## 5. THE HANDLER — three states, matching `sections`

The opening beat receives **the validated span, or nothing to credit**. Three states, exactly the
discipline `sections` uses in `buildRevealWrapperUserPrompt`, and for the same reason:

| state | meaning | beat |
|---|---|---|
| `undefined` | this caller supplies no claim (every leg not wired in this commit) | **byte-identical shipped bytes** |
| `null` | validated, and there is nothing to credit | the existing `CONDITIONED_OPEN` path — unchanged bytes |
| non-empty string | validated span | **NEW**: open by quoting this exact phrase from their answer, word for word |

**`undefined` must not collapse into `null`.** Collapsing them would silently switch every unwired
leg — the drill reveal, `call3_teach`, `call3_confirm` — onto the conditioned opening, which is a
second surface changing inside a one-surface arm.

### 5a. WIRING A vs WIRING B — and A is what this commit ships

- **A (this commit).** The span is offered where `nothingCreditable` is already **false** and the
  span is **valid**. Every other combination is byte-identical to today. **One variable moves.**
- **B (not shipped).** The credit move is conditioned on the span in BOTH directions: no valid span
  → the opening may not credit the student at all. This is the full closed-inventory form, and it
  is the one that would reach seed A.

**A ships and B waits, for a measured reason.** B's risk cell is `creditable: 1` **with no valid
span** — and its size is unknown, because the span field does not exist yet. If the model is bad at
emitting spans, B suppresses credit on answers that genuinely earned it, which is precisely the
failure `nothingCreditable`'s *absent-means-no-claim* rule was written to prevent. **§7's metric is
what sizes that cell**, and it is collected on every turn under A. B is a one-line change to the
handler's `else` once the number exists.

### 5b. THE CREDIT SENTENCE IS THEN POLICED BY A GUARD THAT ALREADY SHIPS

Asking the opening to **quote** the span rather than paraphrase it puts the resulting sentence
inside `enforceVerbatimQuotation`'s jurisdiction — it is already in the chain on both surfaces
(`finishClean` → `sanitizeAfmWrapper` → `enforceVerbatimQuotation` → `assembleAfmReveal`). A quoted
span that survived validation is by construction in the attempt, so the check passes it; a model
that quotes something else loses the marks and the sentence stands as prose. **No new guard is
needed for the citation half.** The credit half is §8.

---

## 6. MALFORMED OR ABSENT — every path, and every one is today's behaviour

| condition | parser | validator | handler |
|---|---|---|---|
| whole response unparseable | `null` verdict (existing) | `absent` | `undefined` → shipped bytes |
| field omitted | verdict parses, no key | `absent` | `undefined` → shipped bytes |
| `null` | kept as `null` | `declared_null` | conditioned opening (existing bytes) |
| `""` / whitespace | dropped to `undefined` | `absent` | shipped bytes |
| number, array, object, boolean | dropped to `undefined` | `absent` | shipped bytes |
| a paraphrase | kept | `not_in_attempt` | shipped bytes **+ the §7 metric fires** |
| verbatim but 2 words / figure-only | kept | `inadmissible` | shipped bytes |
| verbatim and admissible | kept | `valid` | **the span** |

**Every failure path degrades to what ships today.** Nothing new can throw, nothing new can block a
reveal, and nothing new can fail the parse. `derived` — the one field wired to a live guard — is
untouched on every path.

⚠️ **NO RETRY ON THE SPAN.** The case leg deliberately has no `withParseRetry`, and the drill leg's
exists for `derived`. Retrying to recover a span would spend up to four model calls on a field whose
absence is already safe — the reasoning already written into `call2_diagnose`'s comment for
`creditable`, and it applies unchanged.

---

## 7. THE METRIC WE HAVE NEVER HAD

📐 **THE HEADLINE: how often does the diagnose leg return a span that FAILS the byte check.** That
is **the diagnose leg inventing the student's words, caught mechanically, upstream of every rate
this workstream has measured.** Nothing has ever observed it, because until now the leg emitted no
quotation at all — only a 12–15 word label whose content nothing verified.

**7a — INVENTION AT SOURCE (the new one).**
`not_in_attempt / (not_in_attempt + inadmissible + valid)` — the denominator is spans the model
actually offered, so a `declared_null` does not dilute it. Logged per turn:

```
[gap:span] {"surface":"case|drill","span_outcome":"...","span_words":N,
            "creditable":0|1|null,"attempt_len":N,"leg":"hint|reveal"}
```

**7b — CARRY DECAY (case reveal only).** The share of carried spans that fail re-validation against
the reveal's own `attempt`. A **different** question from 7a — it measures the sticky mechanism, not
the model — and conflating them would blame the model for a carry that outlived its text.

**7c — THE DISAGREEMENT CELL.** `creditable: 1` with `span_outcome != 'valid'`. This is the size of
Wiring B's risk, and it is the number that decides whether B ships.

⚠️ **THREE THINGS THIS METRIC IS NOT.**

1. **It is not the inversion rate.** A valid span does not make the sentence around it true (§8).
2. **It is not a rate the corpus can be compared against**, because there is no baseline — the
   field does not exist today. The first run IS the baseline, and it must be reported as such
   rather than as an improvement on anything.
3. **`inadmissible` is not invention.** It is the model offering something real that cannot carry a
   claim. Reporting the two together would repeat the over-attribution `AFM_SURFACED.md` (h2)
   records for the figure audit.

📐 **A GATE ON 7a, SET PER `P-M6(a)`.** It is **mechanical** — a byte comparison, where a survivor
points at a specific span and a specific attempt — so a categorical threshold is legitimate here in
the way it is not on a rate axis. The gate is on the VALIDATOR, not on the model: **0 spans reach a
handler without appearing in the attempt**, which a single occurrence falsifies and locates. The
MODEL's invention rate is a rate, gets an n, and gets a p-value.

---

## 8. WHERE THE JUDGEMENT LIVES — asked plainly, answered plainly

§1 of the last report is the reason this section exists: **both holes were in the classifier, not
the comparison.** The byte comparison never failed; the code deciding WHICH spans to compare was
wrong twice. So:

### 8a. What is MECHANICAL, and is fully fixture-coverable today

- **The byte check.** Pure, one normalisation, no fuzzy matching. Fixtures: verbatim match,
  whitespace-only difference, case difference (**must fail**), apostrophe-shape difference (**must
  fail**), paraphrase, ellipsis, joined clauses, empty, span longer than the attempt.
- **The three-state handler.** `undefined` / `null` / string, with the shipped bytes pinned
  byte-identical on `undefined` — the same pin `sections` already carries.
- **Every degradation path in §6.** Each is a fixture.
- **The re-validation at the reveal.** A span from attempt 1 against attempt 2's text.

**This half is strictly larger than the quotation check's mechanical half**, because the span
arrives as its own field: there is no classifier deciding what to compare. **The first of §1's two
holes cannot exist here** — there is no span-extraction step to get wrong.

### 8b. What is a JUDGEMENT ENCODED AS CODE — fixture-coverable, but the constants are argued

**The admissibility rule (§3b).** Four words / two content words / not figure-only. The *shape* of
the rule is testable and every branch gets a MUST-FAIL case; the *constants* are a choice. **They
must be derived from the captured corpus before they are set** — the distribution of span lengths
the model actually emits, read against a hand judgement of which of those could carry a credit
claim. Picking them in this document and fixturing them afterwards would be `P-G3`'s failure with
extra steps: a green fixture over data chosen to suit the constants.

### 8c. What is a JUDGEMENT AND STAYS ONE — the residual, stated as the claim ceiling

🔴 **A VALID SPAN DOES NOT BIND THE SENTENCE BUILT AROUND IT.** Run 9's shape survives this design
in a weakened form:

> span (valid, verbatim): *"a model that is right 94% of the time is performing far above the
> underlying rate"* → sentence: *"You've done the work to spot that 94% accuracy needs hard
> scrutiny against the base rate."*

The quotation is true. The characterisation of it is the inversion. **Code can prove the words are
the student's; it cannot prove the claim made about them is true.** The admissibility rule raises
the cost — forcing a span to carry a proposition means the model must quote something that
CONTRADICTS the sentence it is writing, which is a harder thing to do than attaching a claim to a
bare number — but it is a cost, not a barrier.

⚠️ **CLAIM CEILING, to go verbatim into the module header:** *a valid span means the tutor is
quoting words the student wrote. It does NOT mean the credit claim is true.* This is the same
distinction `reveal-quotation.ts` carries one level down — **it measures citations, not honesty** —
and it must not be softened when the arm reports a number.

### 8d. What would make 8c fixture-covered rather than argued

Three options, in ascending order of what they actually buy:

1. **A second mechanical check with its proxy NAMED (`P-V4`).** Assert the opening sentence
   CONTAINS the validated span verbatim. **Proxy:** the credit sentence quotes the span.
   **Question:** the credit claim is true of the answer. **They come apart** at exactly run 9's
   shape — quoted correctly, characterised wrongly. Cheap, fixture-coverable, and it must be
   written down as a proxy or it becomes the twelfth `P-V4` instance.
2. **A contradiction check between the span and the label.** `call2_diagnose` already emits a gap
   label naming what the student got WRONG. If the span and the label describe the same clause, the
   reply is about to credit and fault the same sentence. **This is a model judgement to
   implement**, so it buys a check whose own correctness is argued — a second judgement, not a
   removal of the first. Not recommended for v1.
3. **A frozen-rubric hand read, turned into a scored corpus.** The only thing that genuinely covers
   8c. `docs/ATTRIBUTION_RUBRIC.md` is already the instrument; what does not exist is a stored set
   of (span, sentence, verdict) triples to score a change against. ⚠️ **That is a CORPUS, not a
   fixture, and `P-M5(a)` applies: it expires when the prompt or the drill moves, and it must carry
   the date and the build it was captured against.**

**The honest summary: this design moves the credit claim's CITATION from unverifiable to
mechanical, and leaves the credit claim's TRUTH exactly where it is.** That is a real reduction in
surface — the same reduction the quotation check made, applied one level up — and it is not the
same as fixing the inversion. Reporting it as the latter would be this workstream's fourth wrong
diagnosis.

---

## 9. THE COMMIT

**Prompt, parser and handler move together, in one commit** — per the brief, and for the reason the
brief gives it: a prompt that asks for a field nothing parses is dead weight, a parser for a field
nothing emits is untestable, and a handler for a field that never arrives is an unreachable branch
(`P-G3`). Contents:

1. `gap-verdict.ts` — the `GAP_VERDICT_FORMAT` block, `creditable_span` on the interface, the
   parser arm, `validateCreditableSpan`, `SpanOutcome`.
2. `teach-engine.ts` / `route.ts` — `max_tokens`, the two logs, the case sticky carry +
   `openPayload` normalisation, the three wired handlers (case hint, case reveal, drill hint).
3. `hint-opening.ts` / `tutor-personas.ts` — the three-state opening beat.
4. `scripts/test-gap-verdict.ts` — the validator, every outcome, every MUST-FAIL.
5. `scripts/test-case-envelope.ts` — the moved `max_tokens` pin, the wiring pins.
6. `scripts/test-case-reveal-routing.ts` — the three-state beat, `undefined` pinned byte-identical.

**MUST-FAIL cases transcribed from real served text**, per `P-G3(b)`: run 9's inverted credit
sentence with its true source span, and a bare-`94%` span pinned inadmissible. A check with no
wrong implementation named beside it has not been shown to be able to fail.

**Contract gate 83 → 83** (no new fixture file; the checks land in two existing suites).

---

## 10. WHAT THIS DESIGN DOES NOT COVER

- **The drill reveal** — no creditable signal of any kind reaches it; needs the sticky carry built
  on the drill route first (§4).
- **`call3_teach`** (miss 2+) on both surfaces — the same credit reflex, not wired here.
- **The case reveal's closing beat** — items (h) and (h2), a different inventory.
- **`nothingCreditable`'s own accuracy** — untouched by design (`P-M1`).
- **The truth of the credit claim** — §8c, and it is the whole residual.
