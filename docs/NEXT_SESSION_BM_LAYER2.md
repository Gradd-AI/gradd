# Next Session — BM Layer 2 Build

## Status at handoff (01/06/2026)
- IB Economics: correctness-clean. All 92 seed schemes confirmed correct, fixed, or rejected. Check 6 economic-correctness gate built + subject-aware. Generator guardrails (calculation + content_checklist conceptual) shipped.
- IB Business Management: 86 seed QUESTIONS exist (13 rejected). ZERO mark schemes generated yet. This is the build.
- Check 6 is now subject-aware: BM branch covers break-even, investment appraisal (NPV/payback/ARR), ratio interpretation, BM tools (Ansoff/SWOT/BCG). Ready for BM.

## Dry-run sample findings (print-only, no DB writes)
- BM scheme generation is HEALTHY. 5/5 high-risk samples (Ansoff, profitability ratios, 3 hybrid calcs) generated correct. Net benefit, profit-per-model, labour turnover + stability index all correct. Guardrails held.
- ONE gap found: scheme e1051697 (profitability ratios, "describe two X") had a muddled marking rule — "2 marks per strategy" contradicting "1 mark per distinct point". This is the BM analogue of the Econ explain-N/5b issue: describe/explain-two questions need breadth+depth structure (N strategies x [name + develop]), not a flat pool or contradictory rule.

## Plan, in order
1. FIX FIRST (before mass generation): extend the explain-N/describe-N structure guardrail to BM in generate-mark-schemes.ts. Use the Econ explain-N fix (EXPLAIN_N_RE structural match) as the template. BM has many "explain two / describe two / analyse two" questions — fix the pattern once, then generate clean. Add meta-tests.
2. GENERATE: run live mark-scheme generation for all 86 BM seed questions (status=candidate, no auto-promote).
3. VERIFY: run through Check 6 (subject-aware, BM framework) + all deterministic checks.
4. AUDIT: review flagged (incorrect/uncertain) schemes; expect a handful per Econ experience. Fix at generator/pattern level where systemic, reject flawed-source questions at question level.
5. REVIEW + PROMOTE: review candidates in /admin/mark-schemes, promote clean ones, supersede where needed.

## Still open beyond BM (the wider "correct" workstream)
- COVERAGE audit (both subjects): map live seed schemes against syllabus question types — find MISSING schemes (separate from correctness). Not yet done.
- UPSTREAM flawed-QUESTION pass: the "Use the formula:" economically-wrong-question issue + flawed-source questions logged in REVIEW_NOTES_2026-05-31.md. Check 6 catches bad schemes; bad questions need the question generator fixed.
- Econ minor: 81737f5f kept as acceptable (illustrative approximation); 4625c8f1 patched. Both closed.

## Then (locked sequence: correct -> taught -> sold)
- Teaching audit: Mia transcripts vs TEACHING_PRINCIPLES.md (the moat).
- Commercial: Meta demand test (page live at gradd.ai/acca, pixel pending Meta account verification), pricing (free capped questions + free instant marking on haiku; paid teaching unlimited on sonnet; model the CAC ratio), APM port after the demand gate.

## Discipline reminders
- One machine per session, commit + push at the end (two-machine drift cost real time on 31/05).
- Content fixes live in Supabase; code/generator fixes live in git. The audit docs bridge them.
- Fix the pattern, not the instance. Sample hard cases before mass-generating.
- Human review of Check 6 flags stays (it over-flags slightly — false positives on illustrative approximations). Escalate-don't-auto-act.
