# BM Candidate Review Notes — 01 June 2026

## Flawed-source questions (reject scheme; fix question at source)

### 78d468ed / scheme 19b1a369 — command_term/marks mismatch (found Stage 2 Wave 1)
**Question text:** "Evaluate the most suitable location for SolarNest Ltd's new manufacturing facility using the information provided. [10]"
**DB metadata:** command_term=`calculate`, marks=6, scheme_type=`hybrid`
**Contradiction:** an Evaluate [10] is extended-response (band_descriptor, AO3), not a 6m calculate (hybrid, AO4). Generator correctly refused to fabricate method steps — scheme produced empty method_marks (schema violation flagged).
**Action:** Reject scheme 19b1a369. Fix question 78d468ed at source: either correct command_term to `evaluate` and marks to `10` (routes to band_descriptor), OR reject the question entirely.

## Upstream patterns to audit

- **BM command_term/marks/scheme_type mismatch** (from 78d468ed): scan all 86 BM seed questions for `[N marks]` in question_text vs `marks` column, and command_term vs question_text verb — same class as Econ's flawed-source questions. There may be more mismatches beyond this one.

## Stage 2 Wave 2 — content_checklist Check 6 results (2026-06-01)

**Summary:** 45 correct, 1 incorrect, 0 uncertain out of 46

### Incorrect

**1f762143:** "State two internal sources of finance that RetroRide could use to fund the new inventory management software. [2]"
- Error: Owner's personal savings are an external source of finance (a personal injection into the business from outside the firm), not an internal source, and should not be listed as an accepted answer for internal sources of finance.
- Reasoning: The scheme lists four accepted points, but one of them — "owner's personal savings / personal funds" — is not classified as an internal source of finance under standard IB Business Management theory. Internal sources of finance are funds generated from within the business itself (e.g., retained profit, sale of assets, reduction in working capital). Owner's personal savings are a personal/external injection of capital into the business from outside the business entity, and are therefore categorised as an external source of finance in IB BM. The remaining three points (retained profit, sale of assets, and working capital reduction) are correctly identified as internal sources. However, including owner's personal savings as an accepted internal source is a conceptual classification error that would mislead students.

## VERIFIER GAP — "state/identify N" pool marking (fix next session)

Scheme 17878488 (regenerated f48dac30, "State two internal sources of finance") and the class of AO1 "state two/three" questions offer a POOL of 3+ valid 1m points where any 2 are awardable — correct IB practice. But `marks_sum_invariant` expects accepted_points to sum exactly to `max_marks`, so it flags a false violation (3m points vs 2m question).

**Do NOT fix by trimming schemes to exactly 2 points** — that removes the marking flexibility IB intends. Fix the invariant to understand pool-marking.

**Required fix (next session):** the invariant for state/identify pool questions should be "max_marks awardable from a pool of ≥ N valid points", not "points sum to max_marks". This requires either:
- a `pool: true` flag in the scheme_data that the invariant checks before applying the sum rule, OR
- detecting "state/identify" AO1 questions and applying a looser invariant (sum ≥ max_marks, all individual marks = 1).

**Scope:** affects all BM "state two" questions (at least 3 in this batch) and equivalent Econ AO1 pool questions.
