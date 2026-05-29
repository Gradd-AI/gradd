# Hybrid Mark-Scheme Defect Map
**Date:** 28/05/2026
**Branch:** feat/admin-mark-schemes
**Context:** IB Economics Layer 2. Grant reviewed all 99 generated mark schemes. band_descriptor and content_checklist held up. HYBRIDS failed heavily — ~13 of 16 reviewed rejected (~75%). The failure is at the GENERATOR/PROMPT level, not bad individual schemes. Fix the generator pattern, regenerate ALL 31 hybrids, re-review. Do NOT patch schemes one by one.

## The five defect patterns

### 1. MISSING-STEP (most common)
Multi-value calculations drop the marked method step for the 2nd (or later) value — the scheme marks the working for the first value but not the others.
**Affected question IDs:** 007, 020, 025, 103
**Fix invariant:** every value the question asks for must have its own distinct marked method step. If a question asks for two values, the scheme must contain a marked step for each.

### 2. WRONG FORMULA
Generator selects the wrong formula/multiplier for the question type.
- Multiplier: MPM (marginal propensity to import) used where the bracket calls for MPC (marginal propensity to consume) — id 143
- Externality: direction confusion (which way the welfare/quantity effect runs) — id 063
**Fix:** add formula-selection guardrails to the prompt, keyed per question type.

### 3. FLAWED SOURCE QUESTIONS (fix at question level, NOT generator)
The underlying question is broken — regenerating a scheme against it can't fix it.
- DWL (deadweight loss) question — id 058
- midpoint vs single-point elasticity question — id 042
**Action:** flag these for question-level correction or exclusion. Do NOT regenerate schemes against them.

### 4. INVERTED INTERPRETATION
Behavioural/trade label attached to the wrong option relative to the maths — the numeric result and its interpretation are mismatched.
**Affected question IDs:** 152, 032
**Fix:** prompt must explicitly map each numeric result to its interpretation, stating which result means which conclusion.

### 5. MARKS MISMATCH / EXPLAIN-TWO-THREE
- Marks mismatch: method_marks + answer_marks don't sum to questions.marks — id 103 (also appears in #1)
- Explain-two/three regex gap: parser/verifier misses multi-part "explain two/three" marking — id 112
**Fix:** verifier check that marks sum to max_marks; fix the explain-two/three detection in the parser/verifier.

## Fix sequence (next session)
1. Fix generator prompt for patterns 1, 2, 4, 5.
2. Fix questions 058, 042 at source (or exclude).
3. Update verifier + meta-tests in the same commit (new tests: every-value-has-a-step, marks-sum, explain-two/three).
4. Regenerate ALL 31 hybrids with --regen, status='candidate'.
5. Full meta-test suite 100% green before commit.
6. Grant re-reviews regenerated hybrids in /admin/mark-schemes.

## Verification anchor
Note (29/05/2026): verifier already has `flagHybridSingleStep` heuristic (commit ad7ea19) and meta-tests at 31/31. The generator prompt fix should make that flag rarely fire on fresh generation — if it still fires often post-fix, the prompt fix didn't take.
