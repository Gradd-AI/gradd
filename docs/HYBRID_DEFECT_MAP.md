# Hybrid Mark-Scheme Defect Map
**Date:** 28/05/2026
**Branch:** feat/admin-mark-schemes
**Context:** IB Economics Layer 2. Grant reviewed all 99 generated mark schemes. band_descriptor and content_checklist held up. HYBRIDS failed heavily — ~13 of 16 reviewed rejected (~75%). The failure is at the GENERATOR/PROMPT level, not bad individual schemes. Fix the generator pattern, regenerate ALL 31 hybrids, re-review. Do NOT patch schemes one by one.

**Note on question IDs:** The short IDs below (007, 020, etc.) were review-session placeholders, not DB primary keys. Real DB IDs are UUIDs. Where resolved, the UUID is listed alongside.

## The five defect patterns

### 1. MISSING-STEP (most common)
Multi-value calculations drop the marked method step for the 2nd (or later) value — the scheme marks the working for the first value but not the others.
**Affected question IDs:** 007, 020, 025, 103 (placeholder IDs — UUIDs not yet resolved)
**Fix invariant:** every value the question asks for must have its own distinct marked method step. If a question asks for two values, the scheme must contain a marked step for each.

### 2. WRONG FORMULA
Generator selects the wrong formula/multiplier for the question type.
- Multiplier: MPM (marginal propensity to import) used where the bracket calls for MPC (marginal propensity to consume) — placeholder id 143 (UUID not yet resolved)
- Externality: direction confusion (which way the welfare/quantity effect runs) — placeholder id 063 (UUID not yet resolved)
**Fix:** add formula-selection guardrails to the prompt, keyed per question type.

### 3. FLAWED SOURCE QUESTIONS (fix at question level, NOT generator)
The underlying question is broken — regenerating a scheme against it can't fix it.
- DWL (deadweight loss) question — placeholder id 058 → **resolved: `44e39d56-f6bc-482e-a486-49bc2e3f9f62`** (DWL natural monopoly, references missing stimulus data). Status set to `rejected` 30/05/2026.
- midpoint vs single-point elasticity question — placeholder id 042 → **resolved: `b885195b-1001-4c67-8196-5b407766c54d`** (PES handmade tiles, references Price Levels A/B/C with no accompanying data). Status set to `rejected` 30/05/2026.
**Action:** both questions excluded from regeneration. Do NOT regenerate schemes against them.

### 4. INVERTED INTERPRETATION
Behavioural/trade label attached to the wrong option relative to the maths — the numeric result and its interpretation are mismatched.
**Affected question IDs:** 152, 032 (placeholder IDs — UUIDs not yet resolved)
**Fix:** prompt must explicitly map each numeric result to its interpretation, stating which result means which conclusion.

### 5. MARKS MISMATCH / EXPLAIN-TWO-THREE
- Marks mismatch: method_marks + answer_marks don't sum to questions.marks — placeholder id 103 (also appears in #1)
- Explain-two/three regex gap: parser/verifier misses multi-part "explain two/three" marking — placeholder id 112 (UUID not yet resolved)
**Fix:** verifier check that marks sum to max_marks; fix the explain-two/three detection in the parser/verifier.

## Fix sequence (next session)
1. Fix generator prompt for patterns 1, 2, 4, 5.
2. Fix questions 058, 042 at source (or exclude).
3. Update verifier + meta-tests in the same commit (new tests: every-value-has-a-step, marks-sum, explain-two/three).
4. Regenerate ALL 31 hybrids with --regen, status='candidate'.
5. Full meta-test suite 100% green before commit.
6. Grant re-reviews regenerated hybrids in /admin/mark-schemes.

## Status (30/05/2026)
Steps 1–3 complete (commit 9d61962, feat/admin-mark-schemes). Meta-tests: 42/42 green.
Pattern 3 questions resolved and excluded (see §3 above).
Steps 4–6 pending: regenerate hybrids, then Grant reviews in /admin/mark-schemes.

## Verification anchor
Note (29/05/2026): verifier already has `flagHybridSingleStep` heuristic (commit ad7ea19) and meta-tests at 31/31. The generator prompt fix should make that flag rarely fire on fresh generation — if it still fires often post-fix, the prompt fix didn't take.
