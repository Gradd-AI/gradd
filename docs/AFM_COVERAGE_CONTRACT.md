# AFM COVERAGE CONTRACT — definitive product-readiness definition
**Created 12/07/2026, from the ACCA AFM Syllabus & Study Guide Sep 2026–Jun 2027 (no syllabus changes this cycle). This doc defines what "viable" and "exam-ready" mean for the AFM product, by exact LO coverage. Update status columns as batches ship; do not change tier definitions without a logged decision. Mirrored from the project master 18/07/2026 — keep both in sync at batch close.**

**STATUS 18/07/2026: 37 drills LIVE (published) across B1–B5 + A6a (direct-link-only) · 10 calculators shipped · delivery layer complete and in production · batch #10 (international) closed incl. student walk · next calculator = #3 risk & uncertainty (last for B-section-live tier), then B narrative cluster (~5 prose drills — first narrative-marking build).**

## Exam facts (source: syllabus §7)
- 3h15 CBE. Section A: one 50-mark case (40 technical + 10 professional skills), spans ≥2 syllabus sections. Section B: two 25-mark scenario questions (20 + 5 PS each), never wholly narrative.
- **Every exam has question(s) focused on syllabus sections B and E.** This is the load-bearing fact: B+E complete = majority of guaranteed marks covered → defines the viable-launch tier.
- Professional skills = 20/100 marks (communication, analysis & evaluation, scepticism, commercial acumen). Examiner reports (J24→D25) consistently flag scepticism + commercial acumen as the weakest-earned marks — only exam-format practice (mocks) trains these.
- Pass mark 50%.

## Calculator families → LO map (quant drills, 4 kinds each)

| # | Calculator | LOs covered | Status |
|---|---|---|---|
| 1 | NPV (inflation, tax-allowable depn, tax lag, scrap) | B1a(i,ii) | **LIVE 13/07** — 4 drills published |
| 2 | IRR / MIRR | B1c | **LIVE 13/07** — 4 drills published |
| 3 | Risk & uncertainty (sensitivity margins, probability/expected NPV, RADR, project duration, PV-at-risk interpretation) | B1a(iv,v,vi), B1b(ii) | **NEXT** — last calculator of the B-section-live tier. Convention layers (EV decision rules, VaR one-tail/root-T, sensitivity base) → sources FETCHED at Step-0 per doctrine |
| 4 | APV (financing side-effects, issue costs, tax shield) | B3j, B3k | **LIVE 13/07** — 4 drills published (2 hostile rounds; P6 loss-relief gate + issue-cost convention born here) |
| 5 | Cost of capital (CAPM, asset-beta ungear/regear, project-specific WACC) | B3d, B3e | **LIVE 13/07** — 4 drills published (APV/CAPM boundary closed: APV states Keu, CAPM derives it) |
| 6 | Duration (Macaulay + modified) | B3f (B3g narrative rider) | **LIVE 14/07** — 4 drills (distinct-factor OFR gate + issuer-perspective doctrine born here) |
| 7 | Credit risk (spreads, term structure, cost of debt) | B3h, B4a(debt) | **LIVE 15/07** — 4 drills (GATE 9 spread↔rating monotonicity) |
| 8 | BSOP + real options (delay, expand, redeploy, withdraw) | B2a, B2b, B2c | **LIVE 15/07** — 4 drills (GATE 10 no-arbitrage; genuine table-read pairs) |
| 9 | FCF / FCFE valuation + dividend capacity | B4a(equity), B4b, B4c, A6a, A6b | **LIVE 16/07** — 5 drills (GATE 11/11b; K2 FCFF↔FCFE reconciliation by construction; walked 17/07) |
| 10 | International NPV (forex-forecast cash flows, remittance blocks, double tax) | B5a, B5b, B5c + A6a rider (K4, direct-link-only) | **LIVE 18/07** — 4 drills (GATES 12/13/14/14b; corporate-differential three-branch tax w/ Rule 22 evidence; 4 fix rounds + GPT 2-accept round; walked 18/07) |
| 11 | FX hedging — kinds: forward+money-market, currency futures, currency options, currency/FOREX swaps (+netting as texture) | E2b, E2c | — (viable tier) |
| 12 | IR hedging — kinds: FRA, IR futures, IR swaps, options/collars | E3a | — (viable tier; issuer-perspective doctrine from #6 applies) |
| 13 | M&A valuation (book-plus, market/PE, FCF models, synergy classes, growth estimation) | C2a, C2b, C2c, C1e | — (exam-ready tier) |
| 14 | Acquisition financing impact (cash vs share offer, EPS/gearing impact) | C4a, C4b, C4c | — (exam-ready tier) |
| 15 | Business reorganisation & reconstruction schedules (scheme design, capital-market response, unbundling numbers, MBO) | D1a, D1b, D2a, D2b, D2c | — (exam-ready tier) |
| 16 | Ratio/trend performance assessment (light) | A2a | — (candidate for merge into 9 or narrative) |

Quant total: 16 families × 4 kinds = **~64 drills** (allow 60–64 if 16 merges). **Shipped: 37/64** (incl. the A6a rider; B5 browse-count = K1–K3 only per the hard rule).

Parked candidates (not in any batch): 47c9d5ce (A3a ESG) — queued for its own mixed-family review pass. (d0727187 deleted 16/07 at flip — constraint fallback, journalled.)

## Narrative drill clusters (no calculator; graded prose, L2/L3)

| Cluster | LOs | Drills |
|---|---|---|
| Adviser role & financial strategy | A1a–c, A2b–h | 3 |
| ESG & ethics | A3a–h | 2 |
| International trade, institutions, planning frameworks | A4a–g, A5a | 3 |
| Monte Carlo interpretation | B1b | 1 |
| Sources of finance incl. Islamic + green | B3a, B3b, B3c | 2 |
| Capital-structure theory (M&M, trade-off, pecking order, agency) | B3i, B3g | 1 |
| BSOP for equity/debt/default risk (conceptual) | B4d | 1 |
| International finance sources / exchange controls | B5c, B5d | 1 |
| M&A rationale, target choice, failure, listing routes | C1a–d, C1f | 2 |
| M&A regulation & defences; start-up valuation procedure | C3a, C3b, C2d | 2 |
| Treasury function & derivatives-market operations (basis risk, margin, greeks) | E1a, E1b | 2 |
| Forex risk types (translation/transaction/economic) | E2a | 1 |
| Reconstruction narrative rider | D (with calc 15) | 1 |
| **Total** | | **~22** |

**The B narrative cluster (~5: Monte Carlo, sources of finance ×2, capital structure, B4d conceptual + B5c/d) is required for the B-section-live tier and is the FIRST narrative-marking build — the pilot for the rubric-deterministic second pipeline that C/D/A narrative and future narrative-heavy papers depend on.**

## Mock exams (exam-rehearsal engine — NOT drills)
- 1 mock = 1×50-mark Section A case (≥2 sections, all 4 PS skills) + 2×25-mark Section B questions (B and E always represented).
- Viable launch: 1 full mock. Exam-ready claim: 3 mocks (styled on recent sittings; examiner reports in project are the calibration source).
- Mocks are generated by the exam-rehearsal engine specced in AFM_SURFACED — do not hand-author mocks before that engine exists.

## Tier definitions (the contract)

| Tier | Definition | Count | Claim permitted (selling bible binds) |
|---|---|---|---|
| Demo | Calculators 1–2 | 8 drills | None — no public claims |
| **B-section live** | Calculators 1–10 + B narrative (5) | 45 drills | "Complete advanced investment appraisal practice" — free tier, demand signal. **ADS TRIGGER: landing template + "Failed AFM?" ads into the December-sitting window** |
| **VIABLE PAID LAUNCH** | B+E complete: calcs 1–12 + 8 narrative + 1 mock | ~56 drills + 1 mock | "Covers the sections guaranteed on every AFM exam" |
| **EXAM-READY** | Full A–E: 16 calcs + 22 narrative + 3 mocks | ~86 drills + 3 mocks | "Scratch to exam-ready for the AFM written paper" |

**Progress against tiers (18/07): 10 of 10 calculators toward B-section-live — remaining for the tier: calculator #3 + the 5 B narrative drills. 10 of 12 calculators toward viable paid launch. Measured pace holds at ~1 calculator batch per session, even through batch #10's 4 fix rounds.**

## Standing rules
- No "exam-ready" or full-coverage claim before the EXAM-READY tier is shipped and verified (GRADD_SELLING_BIBLE — do not sell what isn't built).
- Every batch follows the proven pipeline: author + code-build → gates (now 14+ incl. family gates) → **double independent recompute (adjudicator + blind GPT)** → adjudication → flip by explicit-id reviewed SQL with reconcile-before-flip (parked ids ENUMERATED in the flip spec) → student walk as final exit criterion. Journal in docs/APM_BUILD_CONTRACT.md.
- **CONVENTIONS ARE FETCHED, NOT REMEMBERED** (batch #10): any family with a convention layer cites the authoritative ACCA source verbatim at Step-0, before the engine is built.
- Review packs: regenerate the FULL pack after every fix round (never stale); packs carry a CLOSED RULINGS section (house OFR wording; adjudicated LO tags; scenario-stated fiscal regimes) so reviewers don't re-litigate settled matters.
- Map-before-close: every batch's final commit updates the CLAUDE.md code map; a batch with no map entry is not closed.
- Build order actual: 1 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → **3 next**, then B narrative (5), then E (11–12) + mock engine, then C/D/A quant, remaining narrative interleaved.
- Delivery layer: COMPLETE and live. Remaining surfaced: persona-hardening slot (false-complete + hint-base-wobble + invented-inventory — HIGH), coordinator paper-awareness (due at first mixed cohort), v1-FULL live numeric grader (post-launch), landing-page template + AFM ads at B-section-live tier (~August, into the December-sitting window).
