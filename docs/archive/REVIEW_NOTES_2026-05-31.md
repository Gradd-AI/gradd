# Candidate Review Notes — 31 May 2026

## Question-text typos
- **df6ce882** (Verantia multiplier): scheme correct at 2m, but `question_text` says "[4 marks]" — should be "[2 marks]". Scheme approved; fix question text only.

## Flawed-source questions (reject question + scheme)
- **058 / 042** (prior session): previously rejected; included here for completeness.
- **b1e1480a** (comparative advantage, Meridia/Valcora): agreed trade rate 2.25 lies outside the OC band (1.5–2.0); trade irrational for Meridia. Rejected.

- **fc8b97af** (DWL from price ceiling, Valdoria): question dictates an economically wrong formula. DWL height should be the demand-supply gap at the traded quantity (Q=500m), not (equilibrium price − ceiling)=$0.08. Tell: question gives quantity demanded=950m but the formula never uses it — fingerprint of a wrong-formula question. Scheme faithfully applies the bad formula. Reject question + scheme. Incompatible with a teaching product even under a "follow the given formula" reading — would train students in incorrect DWL methodology.

- **70199970** (insurance EV / behavioural): scheme maths correct (A=$15, B=$25, rational=B), but context is internally contradictory. Stimulus says consumer "influenced by possibility bias selects Option B despite the mathematical evidence" — but B *is* the mathematically rational choice ($25>$15). Behavioural narrative claims irrationality while pointing at the rational option. Likely generator error: payoffs set so the "biased" choice is actually the better EV. Reject question + scheme. Fix at question level: adjust payoffs so the biased choice is genuinely worse EV, OR rewrite narrative.

## Question-wording polish (scheme correct, wording loose — low priority)
- **fb2fecfa** (PED at points X/Y): "using the midpoint method where required" on a single-point PED question is confusing; scheme resolves it correctly. Approved. Polish wording later.

## Content-accuracy errors (not deterministically catchable by verifier)
- **9cd45583** (production externality): scheme wrongly equates MSB > MPB with MSC < MPC — conflating production and consumption externality logic. A negative production externality raises MSC above MPC; it does not shift the benefit curves. The question/scheme applies consumption-externality reasoning to a production-externality scenario. Reject question + scheme. Not a generator-regex failure; requires domain-level economic accuracy checking that the verifier cannot currently enforce.

## ENGINE GAP — pattern 5b (FIXED in this commit)

- **8952cbe8** ("Explain two costs of unemployment", 4m content_checklist): scheme produced a flat pool — "1 mark per distinct point, max 4" with 4 standalone points — instead of the breadth+depth structure (2 costs × [1m name + 1m develop]). A student could score 4m by naming 4 costs shallowly, defeating "explain two". Reject this scheme.
- **Root cause confirmed:** EXPLAIN_N_RE used a hardcoded noun list that did not include "cost". "Explain two costs of…" never fired the breadth+depth path.
- **Fix:** EXPLAIN_N_RE now matches `explain (two|three|2|3) <any word>` structurally — noun list removed entirely. Robust to any IB command-term noun. T43–T48 added to meta-test suite; 48/48 pass.

## Upstream patterns to audit
- **Mark-count mismatch** (from df6ce882): scan all IB_ECON `question_text` for "[N marks]" vs `marks` column — flag any that diverge.
- **CA trade-rate out of band** (from b1e1480a): validate trade rate within OC band for all comparative-advantage questions.
- **Embedded wrong formula** (from fc8b97af): audit all questions containing "Use the formula:" — the generator is inventing simplified formulas that are economically incorrect, which the scheme then faithfully applies. Most dangerous upstream pattern: produces confident, internally-consistent, economically-wrong marking. Flag any question where the embedded formula deviates from standard economic methodology.
- **Behavioural/EV narrative-maths conflict** (from 70199970): audit all behavioural-economics and EV questions — generator is creating "irrational choice" scenarios where the flagged choice is actually the optimal EV option. Flag any question where stated bias and maths don't genuinely conflict.
- **Production/consumption externality conflation** (from 9cd45583): audit all externality questions to confirm MSC/MSB shift direction matches the stated externality type (production vs consumption). Generator is applying consumption-externality curve logic to production-externality scenarios.

## Top-line verdict — 31 May 2026 review

Hybrid CALCULATION engine fix **holds**. Of 5 rejects:
- 1 is an engine gap (8952cbe8 — pattern 5b, **now fixed**: EXPLAIN_N_RE is noun-agnostic, 48/48)
- 4 are question-generation / content-accuracy failures (b1e1480a, 70199970, fc8b97af, 9cd45583) — not attributable to the engine fix

**Action before launch:** a separate quality pass targeting (a) embedded-formula economic correctness, (b) behavioural narrative-maths consistency, and (c) externality curve direction.
