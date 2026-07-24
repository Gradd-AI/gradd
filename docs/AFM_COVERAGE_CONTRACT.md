# AFM COVERAGE CONTRACT — definitive product-readiness definition
**Created 12/07/2026, from the ACCA AFM Syllabus & Study Guide Sep 2026–Jun 2027 (no syllabus changes this cycle). This doc defines what "viable" and "exam-ready" mean for the AFM product, by exact LO coverage. Update status columns as batches ship; do not change tier definitions without a logged decision. Mirrored from the project master 18/07/2026 — keep both in sync at batch close.**

**STATUS 24/07/2026: 54 drills LIVE (published) across B1–B5 + A6a (direct-link-only) + E2 + E3 · 12 calculators total + the 5-drill B narrative cluster (pipeline #2) FLIPPED LIVE 21/07 AND WALKED 21/07 · delivery layer complete and in production. B-SECTION-LIVE TIER CONTENT IS COMPLETE AND WALKED** (calcs #1–#10 + B narrative all published, all walked — calculator #3 walked 18/07, the narrative cluster walked 21/07, frozen-layer PASS across both drills walked). **TIER-CONTENT-COMPLETE CLAIM STANDS** (both provenance-gate conditions — content shipped, pipeline walked — are satisfied). **AD SPEND RULING (Grant, 21/07/2026): the ads trigger does NOT fire on tier-content-complete alone — it is conditioned on the persona-hardening slot (7 categories, `AFM_SURFACED.md`) SHIPPING and VERIFYING before any ad spend.** The December-sitting-window ads timeline is unaffected by this condition. **E-SECTION OPEN (23/07/2026): calculator #11 (FX hedging, E2b) GATE-P-flipped LIVE — the FIRST-EVER AFM section E rows (4 drills: `51163dac`/`1528e10f`/`359207f6`/`ba811dd0`), FIX ROUND 2-adjudicated (all figures accepted unchanged).** **E3 CLOSED (24/07/2026): calculator #12 (IR hedging, E3a) GATE-P-flipped LIVE — 4 drills (`56989d69`/`1c133573`/`f088daa5`/`26a4167b`), FR1-patched, co-founder recompute + GPT adjudication both passed. ALL 12 CALCULATORS FOR THE VIABLE PAID LAUNCH TIER ARE NOW SHIPPED.** Pending: Grant's student walk on both E2 and E3 batches (non-blocking on this content-complete claim).**

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
| 3 | Risk & uncertainty (expected NPV, sensitivity margins, RADR compare, project duration + VaR) | B1a(iv,v,vi), B1b(ii) | **LIVE 18/07** — 4 drills published (enpv/sensitivity/radr-flip/duration+VaR); conventions page-verified (S1–S7, docs/evidence/AFM_RISK_EVIDENCE.md); G-a…G-e gates; composes npv.ts+capm.ts one-way. Co-founder recompute (FR1 outlay distractor) + blind GPT round 1 (FR2, 4 accepts) + FR3 (residual relabel, sweep-all-fields); reconcile-before-flip clean. Last of the 10 B-section calculators |
| 4 | APV (financing side-effects, issue costs, tax shield) | B3j, B3k | **LIVE 13/07** — 4 drills published (2 hostile rounds; P6 loss-relief gate + issue-cost convention born here) |
| 5 | Cost of capital (CAPM, asset-beta ungear/regear, project-specific WACC) | B3d, B3e | **LIVE 13/07** — 4 drills published (APV/CAPM boundary closed: APV states Keu, CAPM derives it) |
| 6 | Duration (Macaulay + modified) | B3f (B3g narrative rider) | **LIVE 14/07** — 4 drills (distinct-factor OFR gate + issuer-perspective doctrine born here) |
| 7 | Credit risk (spreads, term structure, cost of debt) | B3h, B4a(debt) | **LIVE 15/07** — 4 drills (GATE 9 spread↔rating monotonicity) |
| 8 | BSOP + real options (delay, expand, redeploy, withdraw) | B2a, B2b, B2c | **LIVE 15/07** — 4 drills (GATE 10 no-arbitrage; genuine table-read pairs) |
| 9 | FCF / FCFE valuation + dividend capacity | B4a(equity), B4b, B4c, A6a, A6b | **LIVE 16/07** — 5 drills (GATE 11/11b; K2 FCFF↔FCFE reconciliation by construction; walked 17/07) |
| 10 | International NPV (forex-forecast cash flows, remittance blocks, double tax) | B5a, B5b, B5c + A6a rider (K4, direct-link-only) | **LIVE 18/07** — 4 drills (GATES 12/13/14/14b; corporate-differential three-branch tax w/ Rule 22 evidence; 4 fix rounds + GPT 2-accept round; walked 18/07) |
| 11 | FX hedging — kinds: forward+money-market, currency futures, currency options, currency/FOREX swaps (+netting as texture) | E2b, E2c | **LIVE 23/07** — 4 drills published (K1 `51163dac` forward+MMH · K2 `1528e10f` futures · K3 `359207f6` options · K4 `ba811dd0` swap; GATES 15–19+17b; FIX ROUND 1 co-founder recompute + FIX ROUND 2 GPT round, both adjudicated; K2/K3 formula corrections independently source-verified — `docs/evidence/sources.json` T1/T2/T3/S8/S9). Student walk pending |
| 12 | IR hedging — kinds: futures, options-on-futures, collar, swap (comparative advantage) | E3a | **LIVE 24/07** — 4 drills published (K1 `56989d69` futures · K2 `1c133573` options · K3 `f088daa5` collar · K4 `26a4167b` swap; GATES 20–25; shares ZERO code with fxhedge.ts — the two families' premium/basis/lock-in conventions are structurally different; Rule 22 evidence — `docs/evidence/sources.json` T4–T7 + Abertafol/Sohbet/Northney examiner reports; FR1 wording-only patch). Student walk pending. FRA is background scenario texture, not a computed kind (Step-0 ruling) |
| 13 | M&A valuation (book-plus, market/PE, FCF models, synergy classes, growth estimation) | C2a, C2b, C2c, C1e | — (exam-ready tier) |
| 14 | Acquisition financing impact (cash vs share offer, EPS/gearing impact) | C4a, C4b, C4c | — (exam-ready tier) |
| 15 | Business reorganisation & reconstruction schedules (scheme design, capital-market response, unbundling numbers, MBO) | D1a, D1b, D2a, D2b, D2c | — (exam-ready tier) |
| 16 | Ratio/trend performance assessment (light) | A2a | — (candidate for merge into 9 or narrative) |

Quant total: 16 families × 4 kinds = **~64 drills** (allow 60–64 if 16 merges). **Shipped: 49/64** (incl. the A6a rider; B5 browse-count = K1–K3 only per the hard rule).

Parked candidates (not in any batch): 47c9d5ce (A3a ESG) — queued for its own mixed-family review pass. (d0727187 deleted 16/07 at flip — constraint fallback, journalled.)

## Narrative drill clusters (no calculator; graded prose, L2/L3)

| Cluster | LOs | Drills | Status |
|---|---|---|---|
| Adviser role & financial strategy | A1a–c, A2b–h | 3 | — |
| ESG & ethics | A3a–h | 2 | — (47c9d5ce parked, own pass) |
| International trade, institutions, planning frameworks | A4a–g, A5a | 3 | — |
| Monte Carlo interpretation | B1b | 1 | **LIVE 21/07** — `cb9b411c` |
| Sources of finance incl. Islamic + green | B3a, B3b, B3c | 1 | **LIVE 21/07** — `08044fb6` (ijara sukuk + green bond, IFRS 16 covenant-measure fix FR2) |
| Capital-structure theory (M&M, trade-off, pecking order, agency) | B3i, B3g | 1 | **LIVE 21/07** — `fda46d99` (Jensen FCF two-sided agency treatment) |
| BSOP for equity/debt/default risk (conceptual) | B4d | 1 | **LIVE 21/07** — `d413fbe7` |
| International finance sources / exchange controls | B5c, B5d | 1 | **LIVE 21/07** — `32ef124c` (bounded transfer-pricing mitigation framing FR3) |
| M&A rationale, target choice, failure, listing routes | C1a–d, C1f | 2 | — |
| M&A regulation & defences; start-up valuation procedure | C3a, C3b, C2d | 2 | — |
| Treasury function & derivatives-market operations (basis risk, margin, greeks) | E1a, E1b | 2 | — |
| Forex risk types (translation/transaction/economic) | E2a | 1 | — |
| Reconstruction narrative rider | D (with calc 15) | 1 | — |
| **Total** | | **~21** (5 shipped) | |

**The B narrative cluster (5: Monte Carlo, sources of finance, capital structure, B4d conceptual, B5c/d exchange controls) was required for the B-section-live tier and is the FIRST narrative-marking build to ship — the pilot for the rubric-deterministic second pipeline that C/D/A narrative and future narrative-heavy papers depend on. FLIPPED LIVE 21/07/2026** (co-founder rubric review FR2 + blind GPT round 1 FR3, both adjudicated, all fixes re-gated N1–N5 clean before the flip). **Live marking is v1 AUTHORING-TIME ONLY** — the N1–N5 gate validated the rubric+reveal+golden-pair before insert; there is no live per-student narrative marking yet (Horizon-2). Student walk is the tier's one remaining exit criterion before the tier CLAIM/ads gate lifts.

## Mock exams (exam-rehearsal engine — NOT drills)
- 1 mock = 1×50-mark Section A case (≥2 sections, all 4 PS skills) + 2×25-mark Section B questions (B and E always represented).
- Viable launch: 1 full mock. Exam-ready claim: 3 mocks (styled on recent sittings; examiner reports in project are the calibration source).
- Mocks are generated by the exam-rehearsal engine specced in AFM_SURFACED — do not hand-author mocks before that engine exists.

## Tier definitions (the contract)

| Tier | Definition | Count | Claim permitted (selling bible binds) |
|---|---|---|---|
| Demo | Calculators 1–2 | 8 drills | None — no public claims |
| **B-section live** | Calculators 1–10 + B narrative (5) | **46 drills — CONTENT SHIPPED + WALKED 21/07** | "Complete advanced investment appraisal practice" — free tier, demand signal (content claim stands as-is). **ADS TRIGGER (Grant-ruled 21/07): conditioned on the persona-hardening slot shipping + verifying — landing template + "Failed AFM?" ads do NOT fire on tier-content-complete alone. December-sitting-window timeline unaffected.** |
| **VIABLE PAID LAUNCH** | B+E complete: calcs 1–12 + 8 narrative + 1 mock | ~56 drills + 1 mock (**54 drills shipped — all 12 calculators now LIVE**; 3 narrative + 1 mock remain) | "Covers the sections guaranteed on every AFM exam" |
| **EXAM-READY** | Full A–E: 16 calcs + 22 narrative + 3 mocks | ~86 drills + 3 mocks | "Scratch to exam-ready for the AFM written paper" |

**Progress against tiers (24/07): B-SECTION-LIVE TIER CONTENT COMPLETE AND WALKED — all 10 calculators (calcs #1–#10) + the 5-drill B narrative cluster (pipeline #2) are LIVE, and both the calculator content (walked 18/07) and the narrative cluster (walked 21/07, frozen-layer PASS) have cleared their student walks. The tier-content-complete claim stands. AD SPEND is Grant-ruled (21/07): conditioned on the persona-hardening slot shipping + verifying before any spend — NOT unlocked by tier-content-complete alone. E-SECTION FULLY OPEN: calculator #11 (FX hedging) GATE-P-flipped LIVE 23/07, calculator #12 (IR hedging) GATE-P-flipped LIVE 24/07 (both student walks pending, non-blocking) — **ALL 12 of 12 calculators toward the VIABLE PAID LAUNCH tier are now shipped**; remaining to close that tier: 3 narrative drills (Treasury function & derivatives E1a/E1b, Forex risk types E2a) + the mock-rehearsal engine. Measured pace holds at ~1 calculator batch per session.**

## Standing rules
- No "exam-ready" or full-coverage claim before the EXAM-READY tier is shipped and verified (GRADD_SELLING_BIBLE — do not sell what isn't built).
- Every batch follows the proven pipeline: author + code-build → gates (now 14+ incl. family gates) → **double independent recompute (adjudicator + blind GPT)** → adjudication → flip by explicit-id reviewed SQL with reconcile-before-flip (parked ids ENUMERATED in the flip spec) → student walk as final exit criterion. Journal in docs/APM_BUILD_CONTRACT.md.
- **CONVENTIONS ARE FETCHED, NOT REMEMBERED** (batch #10): any family with a convention layer cites the authoritative ACCA source verbatim at Step-0, before the engine is built.
- Review packs: regenerate the FULL pack after every fix round (never stale); packs carry a CLOSED RULINGS section (house OFR wording; adjudicated LO tags; scenario-stated fiscal regimes) so reviewers don't re-litigate settled matters.
- Map-before-close: every batch's final commit updates the CLAUDE.md code map; a batch with no map entry is not closed.
- Build order actual: 1 → 2 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → **3 next**, then B narrative (5), then E (11–12) + mock engine, then C/D/A quant, remaining narrative interleaved.
- Delivery layer: COMPLETE and live. Remaining surfaced: persona-hardening slot (7 categories — `AFM_SURFACED.md`; **Grant-ruled 21/07/2026: must SHIP + VERIFY before any AFM ad spend, not merely be scoped**), coordinator paper-awareness (due at first mixed cohort), v1-FULL live numeric grader (post-launch), landing-page template + AFM ads at B-section-live tier (~August, into the December-sitting window — timeline unaffected by the persona-hardening condition).
