@AGENTS.md

# Gradd — session brief

Auto-loaded every session. The standing discipline, distilled. This is a map, not the
territory — follow the links for depth. Keep it under ~150 lines.

## Environment
- **Windows, PowerShell-first.** Write shell as PowerShell. Avoid `&&` chaining and
  heredocs — they don't run reliably here; use PowerShell idioms (`;`, here-strings only
  when needed). The Bash tool exists but PowerShell is the default.
- **Two machines** — the repo is cloned at different absolute paths on each. Never hardcode
  a machine path in committed code; use repo-relative paths.
- **The scratchpad is an absolute temp dir OUTSIDE the repo**, not repo-relative — report
  scratchpad files by their full absolute path, or copy into the repo before handing off.
- **Ad-hoc DB queries:** inline `npx tsx --env-file=.env.local -e "..."` on a SINGLE line
  (a multi-line `-e` string exits silently with no output). Never leave temp query files in
  `scripts/`; a self-deleting temp file at the repo ROOT is the only tolerated fallback.

## Workflow (non-negotiable)
- **Atomic commits** — one concern per commit; commit per numbered task item.
- **No `Co-Authored-By` trailer** on commits.
- **`main` is production.** `next build` must be GREEN before ANY push to main. Large
  features go on a branch + PR, not direct to main; small fixes may commit to main when the
  task says so.
- **Migrations: file AND manual apply.** Write the migration as a file in
  `supabase/migrations/`, AND apply it by hand in the Supabase SQL Editor as ONE block,
  followed by verification queries that prove it landed. There is no automated migration
  runner. (Backfill debt: see `memory/project_migration_hygiene`.)
- **Publish flips: reconcile DB against the journal FIRST.** Before any `published=true`
  (or `status='approved'`) content flip, query the DB's actual approved-set and reconcile
  it against the journal's reviewed-set. A mismatch (a row `approved` with no review record,
  or a reviewed row missing) is a HARD STOP — surface it, never flip past it. Flip by
  EXPLICIT id (never a bare `WHERE status='approved'`), demote any un-reviewed `approved`
  rows back to `candidate` in the same transaction, and prove it with pre/post counts. A
  status written without a review record is a pipeline leak — find and journal its source.
  **GATE-P (Grant-ruled 2026-07-14):** Claude Code MAY execute the flip directly (guarded
  service-client update or SQL) once the standing guards all hold — reconcile passed, the
  explicit-id guarded statement shown in the report, pre/post counts verified, journal entry
  written. The adjudication-close block is the authorization; no separate SQL-Editor step.
- **Verify every file write by reading it back** before reporting it done; report the real
  path. (Two "the file is missing" incidents this project traced to unverified writes /
  scratchpad-vs-repo path confusion.)
- **Long outputs for Grant** go in `ClaudeSend.txt`, not dumped into chat.
- Actions that are outward-facing or hard to reverse (deploys, sends, deletes): confirm
  first unless the task already authorised it.

## SESSION CLOSE

**Every session ends PUSHED.** After the final merge to `main`: `git push origin main`, then
confirm the Vercel deploy is **green** (state `READY`, target `production`, and the commit SHA
matches `main`) before reporting done. A push whose deploy is still `BUILDING` is not confirmed —
wait for it, or say plainly that it was still building.

- **Never leave `main` ahead of `origin/main`.** Check with `git rev-list --count origin/main..main`
  — it must be `0` at close. Unpushed work on a production branch is invisible to the other
  machine and to the deploy, and "merged" reads as "shipped" when it is not.
- **Never leave a known-stale doc or review pack open across a session boundary.** Either
  regenerate it in-session, or record it as an explicit open item in `docs/AFM_SURFACED.md`.
  Silence is the failure mode: a review pack that quietly contradicts the DB gets reviewed as if
  it were current. Review packs are DB snapshots — after ANY content write, re-audit every pack
  that quotes the affected rows (audit, don't assume: a grep for a drill id proves a pack
  MENTIONS the row, not that it quotes a body that moved).
- A DB write to published rows is **not** covered by any of this — it ships the moment it runs,
  independent of git. See `GENERATOR_DOCTRINE.md` process rules **P-DB1..3**.

## Architecture
- **One codebase, one Supabase, one Stripe** serve all products. **Two hosts:**
  `gradd.ie` = Leaving Cert Business; `gradd.ai` = IB (Economics + Business Management, at
  `/ib`) AND ACCA (APM + AFM, at `/acca`).
- **Product is resolved by ENTITLEMENT, never by host.** Use `lib/entitlements.ts`
  (`resolveProducts`). `resolveIsIB` resolves the HOST, not the product (gradd.ai carries
  both IB and APM) — never branch product behaviour on it. `/dashboard` + `/session` are
  the LC/IB surfaces (guarded); `/acca/*` is the ACCA surface (auth-only by design — the
  free funnel is product-agnostic). See `memory/project_product_scoping`.
- **Structural beats instructed.** To make a teaching model withhold the answer (or any
  behaviour), ARCHITECT its absence — never instruct it; the helpfulness prior overrides
  "do not reveal". Canonical: `docs/TEACHING_ARCHITECTURE.md`.
- **Code owns every number — IN DRILL GENERATION.** In numeric drills (AFM), deterministic
  code owns every figure AND every figure-vs-figure verdict (allocation, ranking, sensitivity,
  accept/reject); the model supplies raw inputs + prose, and never states or re-checks a number.
  Canonical: `docs/AFM_NUMERIC_VERIFICATION_DESIGN.md` + `lib/acca/{npv,numeric-verifier,
  validate-schema,validate-afm-prose}.ts`.
- **MARKING DOES NOT EARN THAT CLAIM — corrected 2026-07-30.** In `lib/acca/case-marking.ts`
  code owns **band→marks only** (`apportion` / `apportionTechnicalMarks`). The MODEL owns the
  band, and **the feedback prose is model-authored and un-code-verified**: it asserts figures no
  schema component owns — **114 of 1,518 asserted figures** (20 runs × 8 requirements), **96.5%
  of them in STRONG-band feedback**. Mechanism: it COMPUTES where the `model_answer` rounds or
  omits an intermediate (E2b renders "EUR 0.4m" → marker supplies 0.438m; B1a shows NPVs but no
  discount factors → marker supplies them). `judgeTechnicalMarking` receives `model_answer` PROSE
  ONLY — `answer_schema` is NOT a field of `TechnicalRequirementInput`, so it cannot cite a
  component; `judgeCaseMarking` (PS) receives no code-owned reference at all, by design. **N1–N5
  (`narrative-marker.ts`) are AUTHORING gates, not marking** — the mark route does not import
  them; every requirement, numeric or narrative, is marked by the two model passes. Opened by a
  sighting: a fall-scenario futures loss stated as €216,000 against the code-owned €264,000, a
  figure with no owning component. State the claim the way `docs/NARRATIVE_MARKING_DESIGN.md:11`
  states its own: structured and consistency-checked, NEVER "code owns the marks".

## Doc map — which file is canonical for what
- **Build/incident rules (LC + IB):** `docs/GRADD_BUILD_HARDENING.md` — TOP PREVENTION
  RULES + searchable issue catalogue. Read the top rules before any build session.
- **Drill generation doctrine + standing rulings:** `docs/GENERATOR_DOCTRINE.md` — the
  canonical law (code-owns-decisions, the gate suite, OFR / named-risk / batch / BSOP
  rulings, roadmap order, the 5-field-sweep rule). Deep design:
  `docs/AFM_NUMERIC_VERIFICATION_DESIGN.md`; structural withholding:
  `docs/TEACHING_ARCHITECTURE.md`; code: `scripts/generate-afm-drills.ts` +
  `lib/acca/{validate-schema,validate-afm-prose}.ts`.
- **Current open items (living list):** `docs/AFM_SURFACED.md` — the single source of
  what's open now, rewritten each session.
- **Session journal (append-only chronology):** `docs/APM_BUILD_CONTRACT.md` — per-session
  banks, never edited. Open items → `AFM_SURFACED.md`; standing rulings →
  `GENERATOR_DOCTRINE.md`.
- **Teaching personas / quality specs:** `docs/TEACHING_PRINCIPLES.md` (Mia, IB),
  `docs/TEACHING_PRINCIPLES_EZRA.md` (Ezra, APM), `docs/TEACHING_PRINCIPLES_EZRA_AFM.md`
  (AFM failure catalogue), `docs/TEACHING_ARCHITECTURE.md` (structural, LOCKED, product-
  agnostic).
- **Marking:** `docs/MARK_SCHEME_EVIDENCE.md` (evidence standard),
  `docs/APM_PROF_SKILLS_MARKING_SPEC.md` (APM professional-skills).
- **Product model + roadmap:** `docs/GRADD_PRODUCT_MODEL.md`, `docs/GRADD_PRODUCT_ROADMAP.md`.
- **Curriculum structure:** `docs/CURRICULUM_ARCHITECTURE.md`.
- **This-is-not-vanilla-Next.js:** `AGENTS.md` (imported above) — read the guide in
  `node_modules/next/dist/docs/` before writing Next.js code.

## Code map + pipeline runbook (banked — STOP re-deriving this every session)
- **Drill content lives in the DB ONLY** — table `acca_drills`, editable fields
  `question / context_text / model_answer / hint / full_reveal / answer_schema` (+
  `lo_code / paper_code / status / published`). **No repo seed files.** Review packs in
  `docs/reviews/*.md` are DB SNAPSHOTS (hand-maintained preamble + per-drill bodies copied
  from the row fields).
- **Calculator-family pattern** (one per calc #): `lib/acca/<family>.ts` (compute +
  `build*Schema` + `build*ModelAnswer` — code owns EVERY figure) · fixtures
  `scripts/test-<family>.ts` (`npm run test:<family>`) · generator wiring in
  `scripts/generate-afm-drills.ts` (`draft*Drill` + `submit_*_scenario` tool +
  `build*UserPrompt` + `--*-batch` flag). Duration = calc #6: `lib/acca/duration.ts` +
  `scripts/test-duration.ts` (`npm run test:duration`).
- **Calc #3 — risk & uncertainty (LAST B-section calc):** `lib/acca/risk.ts`. COMPOSES `discountFactor`
  (npv.ts) + `computeCapm` (capm.ts) ONE-WAY. Four kinds: **enpv** (Σ(p×NPV) from stated scenario streams
  + P(neg NPV)) · **sensitivity** (variable margin 100×NPV÷PV-affected + disc-rate (IRR−r)/r×100; bare
  IRR−r = headroom, never sensitivity) · **radr_compare** (company rate vs proxy-beta project RADR → the
  FLIP) · **risk_measures** (comparative project duration Σ(t·PV)/ΣPV + one-tail VaR z·σ·√N). Gates
  **G-a**…**G-e** (validate-schema.ts). Fixtures `scripts/test-risk.ts` (`npm run test:risk`). **Conventions
  page-verified — `docs/evidence/AFM_RISK_EVIDENCE.md` (S1–S7); source PDFs git-ignored, re-fetch via
  `docs/evidence/fetch_acca_sources.ps1`.** area-entry ranks 13–16 (B1 entry stays NPV).
- **Calc #10 — international investment & financing:** `lib/acca/international.ts`. COMPOSES
  `fcffFromBuild` (`valuation.ts`) + `discountFactor` (`npv.ts`) ONE-WAY (no back-imports).
  Four kinds: **K1** home-currency standard NPV · **K2** FX sensitivity (decision FLIP) · **K3**
  restricted remittance (blocked-funds reinvest+release) · **K4** multinational dividend capacity
  (A6a, direct-link-only, EXCLUDED from B-tier counts). Tax = corporate-**differential** credit
  base, THREE branches (a nil-by-corporate / b nil-by-WHT-credit / c charged); Rule 22 evidence
  comment in-file. Gates beyond the 6: **12** parity-consistency, **13** currency/unit-scale, **14**
  double-tax cap, **14b** tax-prose consistency (all in `validate-schema.ts`, cores in
  `international.ts`). Fixtures: `scripts/test-international.ts` (`npm run test:international`).
- **Calc #11 — FX hedging (E2b, first calc in AFM section E):** `lib/acca/fxhedge.ts`. COMPOSES
  `parityDifferential` (`international.ts`) ONE-WAY for the OPTIONAL IRP-derived forward
  (`buildForwardCurve` itself NOT reused — annual-compounding vs this family's sub-annual periods);
  every sourced question states the forward rate directly, so K1's primary path takes it as a stated
  input. Four kinds: **K1** forward vs money-market hedge compare (receipt: borrow foreign/deposit
  home; payment: deposit foreign/borrow home — F9 technical article + SD2019 Okan Co) · **K2** currency
  futures (whole contracts, linear basis decay → **lock-in = `futures0 + unexpired_basis`**, Fix Round
  1-corrected, GATE 16 cross-checks both algebraic routes) · **K3** currency options (whole contracts,
  ALL-IN premium — no time proration, Fix Round 1-corrected fallback convention, deducted/added AS
  PAID never future-valued; instruction is always "buy N put/call options", never sell) · **K4**
  currency swap (stated fraction × swap rate + residual × forward rate — thin evidence, flagged).
  `quote_direction` (foreign-per-home / home-per-foreign) and `residual_policy` (immaterial /
  forward-topup) are PARAMETERISED PER DRILL, code-decided, never hardcoded or model-chosen (Step-0
  ruling, 2026-07-22) — sources genuinely quote both directions; the scenario's quote-sentence prose
  is CODE-INJECTED via a `{{QUOTE_SENTENCE}}` placeholder (Fix Round 1), never model-authored, so a
  parameter↔prose mismatch is structurally impossible. Gates beyond the 6: **15** whole-contract
  integrity, **16** basis-decay reconciliation (two-route self-check), **17** currency-direction
  integrity (explicit caller-supplied expected side — options always expect 'buy', unlike
  futures/forward/swap which derive it from exposure direction), **17b** quote-sentence structural
  integrity (verifies the canonical injected sentence is present verbatim), **18** premium-currency
  check (all-in, no proration), **19** best-method verdict integrity (all in `validate-schema.ts`,
  cores in `fxhedge.ts`). Money components use a PLAIN relative tolerance (no floor) — fx-hedge
  outcomes are never legitimately near-zero, unlike international.ts's near-nil-tax edge case the
  floor kind was built for; rate-shaped components (`unexpired_basis`/`lock_in_rate`) use a tight
  ABSOLUTE tolerance with `unit:'rate'` (never a currency-pair unit string, which the tolerance lint
  misreads as money). Fixtures: `scripts/test-fxhedge.ts` (`npm run test:fxhedge`, 68 checks) —
  reproduces the Okan Co MMH figures exactly + regression-locks BOTH Fix Round 1 formula corrections
  (old lock-in/premium formulas are pinned as MUST-FAIL cases). `--fxhedge-batch` in
  `scripts/generate-afm-drills.ts` (`draftFxHedgeDrill` + `SUBMIT_FXHEDGE_SCENARIO_TOOL` +
  `buildFxHedgeUserPrompt`; `spec.fx_*` fields carry the code-decided conventions). area-entry ranks
  70–73 (own band, K1 forward+MMH entry). **FIX ROUND 1 (2026-07-22/23):** co-founder independent
  recompute found 3 majors — K2 lock-in formula misencoded (one-sided; now two-route self-checked),
  K3 premium formula unsourced-imported from an interest-rate family (now an all-in fallback
  convention), K4 quote-direction parameter↔prose inversion (now structurally prevented). **FIX ROUND
  2 (2026-07-23):** GPT full-round adjudication — all 4 figure sets accepted unchanged; the K2/K3
  formula corrections upgraded from co-founder-recompute authority to independently source-verified
  (T1/S9 for K2's lock-in, T2/S8 for K3's premium — `docs/evidence/sources.json`); K3's premium
  restated per-unit (wording only, figure unchanged); an inert engine bug fixed (premium-currency
  conversion now uses spot, not strike, when the premium is quoted in a non-home currency — zero
  live-drill impact, the only published K3 quotes home-currency). **LIVE (GATE-P flip, 2026-07-23):**
  all 4 drills (K1 `51163dac`/K2 `1528e10f`/K3 `359207f6`/K4 `ba811dd0`) approved+published — the
  FIRST-EVER AFM section E rows. Pack: `docs/reviews/AFM_BATCH_FXHEDGE_REVIEW_PACK.md`. Grant's
  student walk still owed (post-flip, non-blocking).
- **Calc #12 — interest-rate hedging (E3a, second calc in AFM section E):** `lib/acca/irhedge.ts`.
  SHARES ZERO CODE with `fxhedge.ts` — the two families' premium/basis/lock-in conventions are
  structurally different (IR futures quote as 100−rate, not a currency rate; IR option premium is
  PRORATED by the contract period, the FX currency-option premium is ALL-IN) and were deliberately
  kept separate, not composed. Four kinds: **futures** (borrower SELLS/depositor BUYS, contracts =
  notional/size × hedge/contract-months, linear basis decay, closing price = 100 − expected rate −
  unexpired basis, locks ONE effective annual rate reconciling across rate-rise/rate-fall scenarios —
  reproduces ACCA's own T5 worked example exactly) · **options** (borrower buys PUT / depositor buys
  CALL, premium = premium% × contracts × size × contract-months/12, exercise decided per scenario
  against the strike) · **collar** (Northney 6-step: options needed → contracts → net premium
  [bought − received] → basis/expected price → exercise decision per leg → net effect; borrower buys
  put+sells call, depositor buys call+sells put — ACCA "Options" page confirms both directions) ·
  **swap** (Style A comparative-advantage: saving = fixed-rate differential − floating-rate
  differential, split after a bank fee — the T4 Titans FC/Kendri Co shape; thinnest-evidenced kind,
  flagged). Gates beyond the 6: **20** direction-lock (borrower/depositor × instrument matrix), **21**
  contract-count (seeds the #1 examiner-flagged wrong-period error as a distinct OFR case), **22**
  premium-separation (asserts the IR prorated premium never collapses to the FX all-in shape), **23**
  basis-decay + scepticism-hook presence, **24** convention-sentence presence (the `{{QUOTE_SENTENCE}}`
  analogue, injected via `{{CONVENTION_SENTENCE}}`) + **24b** the unexpired-basis sentence must say "N
  months REMAINING of the contract's M-month life" (never "elapsed" — kills an inversion risk), **25**
  effective-rate reconciliation (a futures lock must agree across every rate scenario) — all in
  `validate-schema.ts`, cores in `irhedge.ts`. Fixtures: `scripts/test-irhedge.ts`
  (`npm run test:irhedge`, 94 checks) — reproduces T5's Sohbet-style futures figures exactly (90-
  contract fixture; the live K1 drill uses its own 64-contract scenario) + Abertafol's prorated
  premium + T4's swap-saving arithmetic; regression-locks the FX lock-in / FX all-in-premium formulas
  as MUST-FAIL cases if ever wrongly imported here. **NO `--irhedge-batch` generator wiring** —
  unlike every other family, this batch was authored directly via a one-off gitignored script
  (`scripts/_author_irhedge_batch.ts`, `scripts/_*`) that builds each drill from literal inputs
  through the calculator, runs every gate in-process, and writes via the service client; a future
  batch needs either a repeat of that script or proper `draft*Drill`/`SUBMIT_*_TOOL` generator wiring
  (Grant's call, not yet done). area-entry ranks 74–77 (E3, own band; K1 futures is the entry — a
  single locked rate is the simplest outcome to reason about). **FR1 (2026-07-24):** two wording-only
  fixes, zero figures changed — the futures gain/loss Rule-22 comment/pack made position-sensitive
  (long: closing−opening; short: opening−closing, the engine itself was already correct) and K1's
  question "guaranteed effective borrowing cost" → "effective borrowing cost locked in" (T4's own
  register; swept all 4 drills × 5 fields for "guaranteed", zero hits remain). **LIVE (GATE-P flip,
  2026-07-24):** all 4 drills (K1 `56989d69`/K2 `1c133573`/K3 `f088daa5`/K4 `26a4167b`)
  approved+published — the SECOND AFM section E family. Pack:
  `docs/reviews/AFM_BATCH_IRHEDGE_REVIEW_PACK.md`.
- **NARRATIVE PIPELINE (#2) — discursive drills (D1–D5), NOT a calculator:** `lib/acca/narrative-marker.ts`
  (rubric type + DETERMINISTIC detectors `scenarioCopyOverlap`/`factUsed`/`missingAnchors`/`hasConclusion`/
  `longestVerbatimRun` + code-owned `aggregate` (partial-credit 0/½/full + disqualifier caps + band→verdict)
  + N1–N5 gate cores) · `lib/acca/narrative-grader.ts` (`makeAnthropicCriterionGrader` — the CONSTRAINED
  per-criterion model layer, injected; NO live wiring in v1). **CLAIM CEILING:** structured/consistency-checked,
  NEVER "code owns the marks" — quality verdict is model-graded. **CONCEPTUAL-ONLY:** interprets a GIVEN
  output, never computes (D1≠calc#3 VaR, D4≠calc#8 BSOP, D5≠calc#10 K3). Gates = **N1** rubric-coverage
  (grader) · **N2** scenario-anchor · **N3** generic/copy · **N4** Rule-23 golden BAD/GOOD (grader, load-bearing)
  · **N5** committed-verdict — cores in narrative-marker.ts, runner in `scripts/generate-afm-drills.ts`
  (`runNarrativeBatch` + `SUBMIT_NARRATIVE_DRILL_TOOL` + `NARRATIVE_PLAN` + `--narrative-batch [--narrative-only Dx]`).
  Fixtures: `scripts/test-narrative-marker.ts` (`npm run test:narrative-marker`, mock grader — pure, no DB/model).
  **FR1:** interpretation criteria `[F1,F5,F6]` (F6=state-the-figure); F9 OFF (carry-a-value-downstream only);
  no `evidence_anchor`; marks credit RECOGNITION not a number. area-entry ranks 60–64 (above every calculator).
  Design: `docs/NARRATIVE_MARKING_DESIGN.md`; evidence F1–F12: `docs/evidence/AFM_NARRATIVE_EVIDENCE.md` §1b.
- **PS-CELL BATCH — pipeline #2's THIRD cluster (D6/D7/D8), authored into named (area × skill) cells
  the corpus could not serve (2026-08-02).** **THE SEAM IT CLOSED:** `plan.skill` reached the DB column
  and the pass-2 Ezra reveal and NOTHING ELSE — `buildNarrativeUserPrompt`, the call that writes the
  criteria, disqualifiers and both golden answers, was never told the skill, so a declared tag and its
  rubric were never connected. Fixed per **P-T2** (change the instruction, never add a prohibition):
  **`SKILL_DEMAND`** (`scripts/generate-afm-drills.ts`) redefines what a `required_point` IS per skill —
  ACCA sub-descriptors VERBATIM (from `PROFESSIONAL_SKILLS`) + a house-authored **ACT** + a **SCENARIO
  PRECONDITION** (what `context_text` must CONTAIN for the act to be possible; without it the rubric
  silently degrades to topic description). Measured discriminator, not asserted: F10 is instructed only
  by the new block, and **0 of the 8 pre-fix narrative rows carry it on any criterion** — including the
  two already tagged `scepticism` — vs 26/36 marks across the new three. **`NarrativePlan.id` is now a
  free string** (the `'D1'|…|'D5'` union made a 6th plan a TYPE edit — a hard authoring ceiling for no
  safety, `scripts/` being outside `tsconfig`), guarded at runtime by **`assertNarrativePlanIds`**:
  duplicate ids throw and `--narrative-only <typo>` errors with the known-id list instead of filtering
  to `[]` and reporting a clean "0/0 passed, 0 inserted" (P-G1). **DRY-RUN NOW CAPTURES** the complete
  row to `docs/rollbacks/AFM_narrative_draft_<id>.json`; **`--narrative-insert-from <file>`** inserts
  those bytes verbatim (no model call, refuses anything not `candidate`/unpublished) — without it,
  reviewing a dry-run then running the real batch ships prose nobody reviewed, because the model does
  not repeat itself. `buildNarrativeRow` is the ONE row definition both paths use.
  **LIVE (GATE-P flip, 2026-08-02) — AFM published 57 → 60.** Reconcile clean (0 approved-but-
  unpublished, 0 published-but-unapproved; candidate set exactly the 3 targets + the known A3a pilot),
  flipped by EXPLICIT id with a guarded `.eq('status','candidate').eq('published',false)`, **P-DB4
  14/14 immutable fields byte-identical** on all three, snapshot
  `docs/rollbacks/AFM_ps_cell_publish_flip_20260802.json`. Confirmed live: all three cells report
  **SERVABLE through `psScore`** (the live scorer, not inspection), and the zero-attempt entries are
  UNMOVED — E2 → fxhedge K1 `51163dac` @70, B1 → NPV @10, against a live E-calculator span of 70–77.
  **Drills:** D6 `1030689b` E2a **scepticism** (testing a "fully hedged" claim) ·
  D7 `68a297a3` E2c **commercial_acumen** (does a netting centre earn its cost) · D8 `f6426c06` B1b
  **scepticism** (challenging a simulation's assumptions — same LO as D1, deliberately the opposite act:
  D1 interprets the output, D8 challenges its credibility). area-entry ranks **83/84** for the E2 pair —
  they share the E2 bucket with fxhedge and must clear the WHOLE E-calculator span (fxhedge 70–73 AND
  irhedge 74–77; a rank of 75 passes a "beats fxhedge" check and is still wrong) — and **65** for D8,
  below D1's 60-band sibling. Ranks verified against the drills' STORED headings, not fixture strings.
  Fixtures: `scripts/test-area-entry.ts` (+11 cases). Pack:
  `docs/reviews/AFM_BATCH_PS_CELL_REVIEW_PACK.md`.
  **GATE N6 — skill-demand STRUCTURE (`checkSkillDemand`, `narrative-marker.ts`).** Three parts:
  **N6a** F10 marks-share ≥50% · **N6b** scenario precondition per skill (scepticism → a quoted
  attributed assertion ≥6 words; commercial_acumen → ≥1 figure AND ≥1 constraint fact; a_and_e → ≥2
  figure facts; **communication → NOT EVALUATED**, its precondition has no test that is not a phrase
  table) · **N6c** claim-anchor link (scepticism only — every F10 criterion must anchor on the fact
  whose key falls inside the quoted assertion). Wired into `runNarrativeGateBarrier` **non-blocking**
  (the pre-fix corpus predates the declared skill; a blocking N6 would refuse to re-gate the rows you
  want to measure) and into the generator's `runNarrativeGates`. **24 fixtures, every failure path
  exercised (P-G3).** Measured over the corpus: **8/8 pre-fix rows FAIL, 3/3 new rows pass.**
  ⚠️ **CLAIM CEILING, verbatim:** a green N6 means *"the scenario admits the act and the rubric names
  the skill as the marking basis"* — **NEVER** *"the rubric demands the skill"*. That is a semantic
  judgement with no structural discriminator and it stays with N1/N4 and a human reader.
  📐 **MEASURED 2026-08-02 — N6a's LABELLING and the actual DEMAND diverge.** D8 labels F10 on 2 of 5
  criteria (**6/12**) while **all 12 marks perform the act** (`c1`/`c4`/`c5` challenge Osprey
  unlabelled) — N6a measured it at HALF its true coverage. Conservative in this instance, but
  two-directional in principle, and the other direction is the dangerous one: a rubric can label F10
  everywhere while demanding only description, which is exactly what an author writing to the detector
  would produce. **Never report an N6a share as a coverage figure** — it measures labelling; act
  coverage is a reader's finding and belongs in the pack. **NO PHRASE
  TABLE** — gameable by an author writing to the detector, and a matched string proves only that some
  sentence renders that way (P-DB5). **F10 covers scepticism AND commercial_acumen in one mode, so
  N6a can never say WHICH skill.** ⚠️ **N6b is a SUFFICIENT-condition test**: it false-positives on a
  drill whose sceptical object is an unquoted model assumption (`d413fbe7` B4d, live) — a FAIL means
  "confirm by hand what the sceptical object is", never "this drill does not demand scepticism".
  **Draft lifecycle flags:** `--narrative-regate-from <draft>` re-runs the full N1–N6 barrier on a
  hand-edited draft and rewrites its `gate_lines` (a hand edit is otherwise ungated and the stored
  gate record would keep asserting a stale green); `--narrative-update-from <draft> --drill-id <uuid>`
  applies it to an EXISTING candidate row (refuses anything published, and refuses an lo_code/skill
  mismatch) rather than re-inserting, which would mint a new id.
  **BATCH 2 (2026-08-02) — DRAFTED, NOT INSERTED, awaiting Grant's read.** D9 `B5c` communication
  (ranked 66) · D10 `E3a` scepticism (85) · D11 `A3c` communication (67). Pack
  `docs/reviews/AFM_BATCH_PS_CELL_2_REVIEW_PACK.md`; drafts
  `docs/rollbacks/AFM_narrative_draft_D{9,10,11}.json`. **E1 × a_and_e deliberately NOT authored** —
  it closes for free if `55181aa8` is re-tagged (ruling owed). **N6b CANNOT gate a `communication`
  drill's precondition** (it reports NOT EVALUATED — no test that is not a phrase table), so D9's and
  D11's audience precondition is a HUMAN check, stated as such in the pack. **📐 N6c SHAPED D10 rather
  than merely measuring it** — it failed 3 of that drill's 4 attempts (no fact key inside the quoted
  assertion; then F10 criteria not anchored on the claim), so the authored rubric changed in response:
  the first time an N6 failure path ran in production authoring rather than a fixture.
  **✅ `--narrative-batch` no longer exits 0 when every drill fails (P-G1).** Found the hard way — a
  run that failed all 5 attempts and wrote no draft still exited 0. `runNarrativeBatch` returns its
  failure count and the caller sets `process.exitCode` (P-G4: never `process.exit()`).
- **RE-TAGGING A PUBLISHED DRILL — `scripts/authoring/retag-afm-drill.ts` (COMMITTED, P-DB6).** It
  writes PUBLISHED content, so the script carries the RULING as a literal and PRINTS it before
  applying; a `--id` with no recorded ruling is refused. P-DB3 snapshots the whole row first; P-DB4
  asserts `professional_skill_tag` is the ONLY field that moved. **First use 2026-08-02 (Grant's
  ruling): `55181aa8` E1a `commercial_acumen` → `analysis_and_evaluation`** — 19/19 other fields
  byte-identical, status/published untouched. **This CLOSED E1 × analysis_and_evaluation without
  authoring**, and E1 × commercial_acumen stays servable via `d0be009d`. **The reasoning, because it
  generalises: the VERB is the discriminator, not the arithmetic.** N5 did not engage, no criterion
  carried F4, and all four `required_point`s opened with "Discuss" — so commercial acumen's defining
  act (*"proposing and recommending commercially viable solutions"*) was never required. An earlier
  "no priced decision — zero figure facts" reading was WRONG and its sibling `d0be009d` refuted it:
  that row also has zero figures and is sound, because it demands "Advise · Advise · Advise ·
  **Commit**" with F4. **A tag edit never moves an area's entry** — `pickEntryDrill` keys on the
  `model_answer` heading, not the tag.
- **⚠️ `47c9d5ce` (A3a) IS A PERMANENT CANDIDATE — the ONE row expected to stay `candidate`
  indefinitely.** Every future GATE-P reconcile must ALLOW-LIST it rather than hard-stop on it. Never
  publish it as tagged: its `communication` tag is the section-A rotation default, its content is a
  SCEPTICISM drill (it refutes a named CFO's quoted ESG claim and commits against the project), and
  its **`answer_schema` is NULL** so N1–N6 cannot gate it. Kept rather than deleted because drill
  content lives in the DB only with no repo copy — deletion is irreversible, keeping costs nothing
  (every serve path filters `approved`+`published`). Content snapshotted outside the DB at
  `docs/rollbacks/AFM_permanent_candidate_47c9d5ce.json`.
  **⚠️ THE NARRATIVE PIPELINE HAS NO NUMERIC VERIFIER, AND IT COST A DRILL.** D7's first version passed
  ALL SIX GATES asserting the exact opposite of its own figures — a rubric requiring the candidate to
  conclude payback was "well within" an 18-month threshold on drivers giving an annual net benefit of
  **−USD 69,472 and no payback at all**. N1/N4 grade rubric coverage and GOOD-vs-BAD separation; the
  prompt's COHERENCE rule covers only STATISTICAL shape claims; the numeric moat belongs to the
  CALCULATOR families. Nothing was looking. Caught by hand pre-insert. Fix is structural — the brief now
  states the economics as GIVEN outputs and forbids the raw drivers, leaving ONE division for a human to
  check. **Any conceptual drill given a derivable multi-step chain has this hazard: state the outcome as
  given, or recompute by hand before insert. Never describe the six gates as covering it.**
- **E-NARRATIVE CLUSTER — pipeline #2's SECOND batch, E1a×2 + E2a×1 (EN1/EN2/EN3), first narrative content in
  Section E.** Same engine as D1–D5 (`narrative-marker.ts`/`narrative-grader.ts`), authored via a one-off
  gitignored script (`scripts/_author_enarrative_batch.ts`) rather than the generator's `runNarrativeBatch`
  loop — hand-authored rubrics so every criterion + disqualifier carries a cited `evidence_anchor`
  (`evidence_anchor` **RE-ENABLED for this batch**, a deliberate deviation from D1–D5's "no evidence_anchor"
  rule — the field is provenance-only, never served/marked on). **Kinds → ids:** EN1 `55181aa8` (E1a,
  establishing/relocating a group treasury — SD24 p.4 Northney "location and control were rarely discussed")
  · EN2 `d0be009d` (E1a, positive financial contribution — SD25 pp.13-14/p.13 Passmore, incl. the
  "additional costs and procedures … not given credit" boundary) · EN3 `f9f4f3d4` (E2a, forex exposure
  types + how managed — F9 J16 p.5 "named-but-not-described" fundamentals-tier evidence, tagged
  `[tier=fundamentals (F9/FM), level-agnostic]` in its `evidence_anchor` to read as level-agnostic, not
  AFM-examiner-specific). **CLOSED RULINGS:** E1b (derivatives-market operations) DEFERRED to exam-ready —
  reads mechanical/definitional, no located E1b-specific examiner evidence; "internal vs external hedging"
  is **NOT ACCA vocabulary** (T8, the only located conceptual source, uses neither word) — EN3's management
  criteria never assert it; E2a's evidence base is thinner than D1–D5 (zero direct hit across the 5
  registered AFM examiner reports — a bounded re-search of older/other reports found ONE hit, F9 June 2016,
  registered **S3**, before this batch closed) so its translation≠transaction confusion disqualifier is
  **HOUSE-AUTHORED**, tagged explicitly, not claimed as examiner-sourced. Designed golden-BAD flags use the
  proven `[F1,F5,F4]` deterministic backbone (matching D1–D5); the SIGNATURE disqualifiers — F7
  generic-centralisation-substitution (E1a) and F2 named-but-not-described (E2a) — are the cited MARKING
  BASIS on the relevant criteria but are grader-judgment calls N4 can't deterministically pre-verify, so
  they sit outside the backbone set (documented in the pack, not silently dropped). **FR1 (GPT-requested):**
  EN3's golden GOOD/full_reveal originally taught translation exposure as "warrant[ing] little more than
  awareness" — reworded to name a concrete reason it still matters (drags on reported gearing / trips a
  loan covenant) while keeping the committed transaction-first priority; re-gated on the REAL grader (N1+N4
  both PASS post-edit) before the DB write. **area-entry ordering subtlety (the reason this cluster needed
  its own rule, not just "copy the D1–D5 band"):** B-narrative (60–64) sits above the B-calculators only
  because every B-calc is ≤53 — automatic. The E-calculators are 70–77 (fxhedge E2b/E2c, irhedge E3a), so
  ranking E-narrative in a low band would let it STEAL an E-area's zero-attempt entry from its calculator —
  the exact failure this module exists to prevent. Ranked **80–82**, strictly above every E-calculator:
  EN1 `74`→`80`, EN2 `81` (E1 has no calculator — EN1 is the E1 entry by construction), EN3 `82` (E2a
  shares the E2 area bucket with fxhedge via the 2-char `lo_code` prefix — EN3 must rank above ALL FOUR
  fxhedge kinds, not merely above K1, so K1 `51163dac` keeps the E2 entry). Proven with REAL mixed data
  (fxhedge K1–K4 + EN3 in one `pickEntryDrill` call) in `test-area-entry.ts`, not rank inspection alone —
  live-data check against real post-flip rows independently confirms the same result. Fixtures:
  `scripts/test-narrative-marker.ts` (unchanged) + `scripts/test-area-entry.ts` (new E2/E1/mixed-E2 cases).
  Pack: `docs/reviews/AFM_BATCH_E_NARRATIVE_REVIEW_PACK.md`. **LIVE (GATE-P flip, 2026-07-24):** all 3
  drills approved+published — AFM narrative cluster now 8/8 (5 B + 3 E).
- **PERSONA-HARDENING — the live tutor's grounding mechanism ("Rule 24 triangulation," shipped 2026-07-21):**
  `lib/acca/tutor-grounding.ts` — `buildGroundingPack(drill, resolvableAreas)` builds a `GroundingPack`
  (narrative: `criteria[]`/`scenario_facts[]` from the rubric; numeric: `**Step N — Label**` headers
  parsed from `model_answer` + `Component.working_steps[]` — NO schema change, NO backfill, works on
  all 46 published rows today) with **trust-tier discipline**: `checklist`/`facts` (fullTrust, SAME
  tier as `model_answer` — diagnose/completeness ONLY) vs `conventions`/`misconceptionLead`
  (method-only, safe broadcast-wide) vs `resolvableTopics` (real published areas only, outro/close).
  **3 injection locations (Rule 24):** (1) system block — `GROUNDING_DISCIPLINE` + `RETRACTION_PROTOCOL`
  in `lib/acca/tutor-personas.ts` (both `EZRA_SYSTEM`/`EZRA_AFM_SYSTEM`); (2) delivery-protocol
  instructions (`GROUNDING_INSTRUCTION_*` exports) — per-leg HOW-to-use text; (3) per-turn anchor —
  the actual pack data, rendered by `renderChecklistAndFacts`/`renderConventionsAndMisconception`/
  `renderResolvableTopics` and threaded through `app/api/acca/tutor/route.ts`'s `call2_diagnose`,
  `completenessCheck`, `call3_hint/teach/confirm`, and `call4_reveal` (each takes a `grounding: GroundingPack`
  param; `drillSelect()` now fetches `answer_schema`, never fetched on this path before). Fixes
  AFM_SURFACED.md's 7-category persona-hardening slot: false-positive diagnosis, fog-retraction,
  false-complete (Nakheel-shaped), hint-base-wobble, invented-inventory, convention-softening,
  K3-hint-diversification. **Red-team regression lock:** `scripts/redteam-probes.ts` PH1–PH7 (one per
  sighting, `drillId` field targets a specific published drill by id) + new `AutoCheck` codes
  (`no-false-diagnosis`/`flags-incomplete`/`concedes-explicitly`/`no-loose-convention`/
  `no-invented-drill-name`/`contains-any-keyword`) in `scripts/redteam-tutor.ts`. Run:
  `npx tsx --env-file=.env.local scripts/redteam-tutor.ts --target local --probes PH1,PH2,PH3,PH4,PH5,PH6,PH7`.
  **Claim discipline:** an LLM-prompted behavioural fix, NOT a deterministic code gate like the numeric
  moat — PH4/PH6 observed ~80-90% clean across repeated sampling, not a hard 100% guarantee.
- **THE SIT LOOP — sit → mark → debrief → steer (closed end to end 2026-07-31, branch
  `feat/sit-loop-end-to-end`).** One surface, both papers, one write path per stage.
  **UI** `components/acca/SitRunner.tsx` (MOVED out of `app/acca/afm/mock/` — it is shared UI, and an
  APM route importing a component from the AFM route folder asserted an ownership it no longer had);
  `app/acca/mock/page.tsx` and `app/acca/afm/mock/page.tsx` differ ONLY in the `paper` prop.
  **READ + CLOCK** `app/api/acca/sit/route.ts`. **WRITE** `app/api/acca/case/turn` (`sitting:true`) —
  the ONE sit write path, which owns the 409 immutability rule. **PAPER RESOLUTION**
  `lib/acca/sit-attempt.ts` (`resolvePaperConfig` — explicit `mock_id` → open attempt → `paper=`;
  the pure precedence rule is `resolveOrder`), shared by the sit and results routes so a student who
  sat AFM can never be handed the APM debrief. **RESULTS** `app/api/acca/sit/results/route.ts` —
  **POST marks, GET reports.** Marking is a paid model call whose output moves run to run, so a
  refresh must never re-mark; POST marks only `casesNeedingMarking` (empty on a revisit → 0 model
  calls, same debrief), GET never marks at all. Both require every requirement to have a recorded
  answer (blank `''` counts) and 409 `paper_not_finished` otherwise; **neither ever writes
  `completed_at`** — opening results an hour later must not record that hour as time on the paper.
  A per-case marking failure returns the cases that DID mark rather than 502-ing the lot.
  **ASSEMBLY** `lib/acca/sit-results.ts` (pure) — `orderPaper` is the load-bearing piece:
  `requirement_order` is scoped to its OWN case so all three cases start at 1, and sorting the eight
  rows by that column alone INTERLEAVES the paper and computes every pacing interval between
  requirements never sat consecutively. `MOCK_PAPERS`' case sequence is the authority.
  **PACING** `lib/acca/pacing.ts` · **DEBRIEF** `lib/acca/debrief.ts` — both pre-existing, both pure,
  now wired. Fixtures: `npm run test:sit-results` (61) + `test-pacing` + `test-debrief` +
  `test-sit-preview`.
  **`acca_case_progress.technical_feedback` IS THE THING THAT MADE THIS POSSIBLE** (migration
  `20260730120000`). The technical marker's per-requirement reasoning used to be returned and
  DROPPED, so the debrief's `why` — carried VERBATIM, never paraphrased — had nothing to read on any
  request that did not itself mark. Now persisted by `runCaseMarking`; a null reads as "no reasoning
  for this one", never as an invented one.
  **MEASURED END TO END 2026-07-31** (local dev, real routes, real session, synthetic user, then
  scoped-deleted and AFM Mock 1 re-proved virgin): 8 submissions → band spread
  exemplary/competent/weak/nothing → 3 cases marked in 60s → 8/8 `technical_feedback` persisted →
  pacing computed → collapse headline selected → second POST re-marked 0 → GET served the persisted
  `why` on 8/8.
- **AFM MOCK PAPER 1 — LEAN SIT SURFACE (preview-gated, 2026-07-25):** `lib/acca/sit-preview.ts`
  (pure: the paper-scoped serving gate `sitCaseGate` + `sitDisplayLabel` + `nextUnsubmittedIndex` /
  `isPaperComplete` / `fmtElapsed`; `canPreviewSit` and `AFM_MOCK_PAPER_1` are DELETED — the paper
  config lives in `lib/acca/mocks.ts`) · route `app/api/acca/sit/route.ts` · fixtures
  `scripts/test-sit-preview.ts`
  (`npm run test:sit-preview`). **THE INVERTED SERVING GATE IS RETIRED** (2026-07-29, branch
  `feat/sit-marking-and-gate`). It formerly gated on the OPPOSITE of every other route
  (`published=false AND status='candidate'`) behind a one-entry email allowlist — correct while the
  paper was unadjudicated, and fatal at the end: publishing it would have stopped the gate matching
  and 404'd the surface (**the publish-flip trap**). It now gates on the STANDARD `mock_only=true
  AND status='approved' AND published=true`, behind the same `APM_CASES` flag and
  `hasActiveACCAAccess` entitlement as `app/api/acca/case/*`; **`canPreviewSit` / the allowlist are
  deleted**, and the uniform-404 posture with them (a lapsed student gets 402, not a surface that
  appears not to exist). `mock_only` is RETAINED — it was never the inverted part; it keeps these
  cases out of the practice library, which lists `mock_only=false`. **ONE SIT WRITE PATH:**
  `action:'submit'` is gone from the sit route — SitRunner records each answer through
  `app/api/acca/case/turn` with `sitting:true` + `paper:'AFM'`, and the immutable-submission rule
  moved there (409 `already_submitted`, tested `!= null` so a BLANK answer is equally final). The
  sit route now owns only the paper-level READ and the attempt clock. **THE PAPER IS LIVE** — the
  3 cases were flipped to `approved`/`published=true` (P-DB2, Grant-approved 2026-07-29;
  `mock_only` stays true; snapshot `docs/rollbacks/AFM_mock1_publish_flip_20260729.json`), and the
  serve was proven end-to-end through the deployed route with a real session: 200, 8 requirements
  in paper order, LO codes stripped, withheld fields absent. Withholds MORE than the live case route: never selects
  `model_answer`/`hint`/`full_reveal`/`answer_schema`, and additionally withholds `marks_guide` (a
  mark scheme = feedback) and `professional_skill_tags`/`intellectual_level` (a steer no real exam
  gives). **Requirement labels are DERIVED, not served raw** (2026-07-26): the stored label carries
  the internal syllabus code (`"(i) B3e — 10 marks"`), which no real paper prints, so
  `sitDisplayLabel(label, lo_code)` strips it to `"(i) — 10 marks"` **at the serve boundary** — not
  in the component, so the code never reaches the browser at all (UI-only stripping would still ship
  it in the JSON payload). `lo_code` is READ to make the removal exact, then discarded — selecting
  is not serving. Marks per requirement ARE authentic and stay. **Nothing stored changes**: marking
  and debrief read `label`/`lo_code` off the row unchanged, and the review pack (which quotes the
  stored labels) stays accurate. Scenario/exhibit/question bodies separately swept clean of codes,
  mode labels, gate names, PS tags, status strings and UUIDs. **Submissions are IMMUTABLE server-side** (a recorded `final_answer` → 409), which is the
  real guarantee behind "no back navigation" — not merely a hidden button; `passed` stays UNSET per
  `case-sit.ts`. Answers land in `acca_case_progress.final_answer`, which the existing `case/mark`
  path already reads, so marking wires in later with no data migration. Clock counts UP from
  `acca_mock_attempts.started_at`. `marks_guide` IS now served (an integer ALLOCATION, not a mark
  scheme) and the label is reduced to the PART alone, so both papers show marks for the same reason
  instead of AFM's labels happening to spell them in prose.
  **THE CLOCK IS A COUNTDOWN AND `ends_at` IS LOAD-BEARING (restored 2026-07-31, BOTH papers).** It
  was a NOT-NULL placeholder nothing read; the surface shipped counting UP with no expiry, which was
  a REGRESSION against `MockRunner`, not a port — a 3h15m paper without a countdown cannot rehearse
  finishing inside the time. Set once at start, never moved. Pure helpers in `sit-preview.ts`:
  `remainingMs` / `isExpired` / `clockState` (15-min warning, a house choice, flagged by TEXT as well
  as colour) / `attemptIsClosed`. **At zero the runner records the requirement BEING WRITTEN and
  finishes — it does NOT back-fill the tail**, so unreached requirements stay `not_reached` rather
  than `blank` (different findings; the debrief's next action for one is about REACHING it). The gate
  moved to suit the data instead: `caseMarkReady(sitting, reqs, attemptClosed)` gains an expiry arm,
  **defaulted false** so every existing caller is unchanged. **ENFORCEMENT IS SPLIT ON PURPOSE:**
  the BROWSER runs the clock and fires the auto-submit; the SERVER owns "this paper is over"
  (`attemptIsClosed` — finished, or past `ends_at`) and `case/turn` refuses further sit writes once
  the attempt is **`completed`** (409 `attempt_closed`). Keyed on `completed`, **NOT** on
  `now > ends_at` — the auto-submit's own POST lands milliseconds after the deadline and refusing on
  the timestamp would discard the answer it exists to rescue; it records first, finishes second, so
  there is no race. Closing the tab buys nothing: the next load sees an expired attempt, closes it,
  and goes to the results.
  `MockRunner.tsx` and `MOCK_SIT_MODE` are **DELETED** (2026-07-30) — the APM "mock" used to drive
  the paper through `CaseSession`, the PRACTICE teach surface, under a countdown, which is why it
  coached the candidate through every requirement until each was judged correct. Both papers render
  `SitRunner`.
- **`sitting` MUST be sent on the mark POST.** `app/api/acca/case/mark` defaults it false and on that
  default skips the TECHNICAL pass entirely — a sit marked without it scores PS only and silently
  loses 80 of 100 marks. **`per_skill[].mark_awarded` is NOT returned to the client** — it is a
  largest-remainder artefact (same band → different marks in one run; a skill's mark moves when a
  DIFFERENT skill's band moves). Band + case total are returned; the apportionment is unchanged and
  still persisted in full to `acca_case_marking.per_skill`.
- **MOCK-CONTENT ACCESS — `lib/acca/mocks.ts` (pure rule) + `lib/acca/mock-access.ts` (query +
  select strings).** A `mock_only` case is reserved exam content. `case/list` excludes it; the
  ID-ADDRESSED `GET /api/acca/case` refuses it **UNCONDITIONALLY**, and `POST /api/acca/case/turn`
  refuses it in PRACTICE mode and allows it in SIT mode — `sitting` decides, nothing else, because
  that route is the sit's single write path. The attempt-scoped carve-out (`attemptUnlocksCase`) is
  **RETIRED**: it existed only because the APM mock loaded through the practice routes, which no
  longer happens. Refusal is the routes' existing 404, so it leaks no existence. Fixtures
  `scripts/test-mock-access.ts` (`npm run test:mock-access`, pure).
- **THE WEAKNESS LEDGER — `acca_weak_areas` + `lib/acca/weak-areas.ts` (pure).** Table per migration
  `20260730120000` — SEPARATE from LC/IB `weak_areas`, which `app/dashboard/page.tsx:141` and
  `app/api/cron/weekly-email/route.ts:159` both read WITHOUT a product filter, so ACCA rows there
  would surface in LC dashboards and weekly emails.
  **OPEN:** `runCaseMarking` (sit only), per requirement, on a **weak or competent** band, keyed on
  the OPEN-row key `(user_id, paper_code, lo_code, source='sit') WHERE resolved_at IS NULL`.
  **`nothing` deliberately writes NOTHING** — it is what a BLANK answer scores with no model call,
  and a requirement never attempted is a PACING finding (the debrief reports it as one), not evidence
  about the syllabus area. Read-then-write, NOT `.upsert()`: the unique index is PARTIAL and
  PostgREST's `on_conflict=` cannot express its `WHERE`, so an upsert ERRORS rather than degrading;
  a lost race hits 23505 and is caught into an increment.
  **CLOSE (`resolved_at`, added 2026-07-31):** a subsequent **strong or exemplary** band on the same
  key resolves the open row — the SAME instrument that opened it, so there is no second mastery
  signal to keep in step. **`competent` does NOT close**: its own published next action says a
  material point was missed, and a material point still missing is not a resolved weakness — the
  open/close boundary sits exactly where the marker stops naming something to fix. **OPEN BEATS CLOSE
  within one marking run** (`ledgerActionsFor`, both arrival orders fixtured): a paper examining one
  LO twice can come back weak on one requirement and strong on another, and resolving on the strength
  of the good half would erase the finding the same paper just produced. Nothing is deleted — the
  closed row is history, and the PARTIAL index is what lets a later weak band open a fresh row rather
  than increment a resolved one. Proved against the live index in the walk: close → reopen → both
  rows survive → the selector sees exactly one open row → a second open row for the same key 23505s.
  **READ:** `app/api/acca/next-drill/route.ts`. `W_WEAK = 0` is **CLOSED** — and the steering is
  applied on the LIVE `area=` and `lo=` paths as well as the `APM_INTERLEAVE`-gated scorer, because
  that flag is NOT set in production and steering only there would have shipped a ledger no student's
  serve reads. **PS steering ships with it:** `acca_drills.professional_skill_tag` existed since the
  generator wrote it and NOTHING read it at serve time; the signal comes from
  `acca_case_marking.per_skill`, NOT from `acca_weak_areas` (that table is keyed by lo_code and a
  professional skill is not an LO). Both terms are paper-scoped — AFM/APM LO codes collide exactly.
  **ROLLBACK PROPERTY, fixtured:** with no ledger every candidate scores 0 and `pickWeighted`
  degrades to the uniform random pick these paths already made, so a student who never sat a mock
  sees identical behaviour. The zero-attempt ENTRY drill still wins outright — arriving in a new area
  on the hardest drill because a mock went badly is the opposite of the point. Fixtures
  `npm run test:weak-areas` (52). **MEASURED LIVE 2026-07-31:** `lo=B5a` 27/40 → **40/40** on the
  weak B5b; PS-only control `lo=B4a` suppressed the untagged B4d **9/40 → 0/40**.
- **MARKING CORE — `lib/acca/case-marking.ts`** (shared by `app/api/acca/case/mark/route.ts` and
  `scripts/calibrate-marking.ts`, so calibration can never drift from production). Two passes, same
  mechanism: the MODEL assigns a quality BAND, deterministic CODE converts bands → marks
  (`apportion`, largest-remainder). **PS pass** `judgeCaseMarking` — whole answer, paper-keyed
  descriptors (`SKILL_DESCRIPTORS_BY_PAPER`, APM and AFM materially different, never merged), 4 bands.
  **Technical pass** `judgeTechnicalMarking` — per requirement against its code-correct
  `model_answer`, 5 bands (adds `nothing`). **BATCHED PER CASE, deliberately** — the sibling context
  is load-bearing and a per-requirement split moved the mark (doctrine **P-M1**). **ORDINAL CONTRACT
  on both cores:** the model echoes a NUMBER, never a skill name or a `requirement_id`; code owns the
  ordinal → id mapping (a one-char UUID slip used to bin a whole case). **`extractJsonBlock`** pulls
  the first BALANCED JSON block out of a response (fences, leading prose, trailing commentary;
  string-aware) and returns `null` on a truncated/malformed body so those still fail.
  **`withParseRetry`** = 1 + 3 attempts, parse failures ONLY (`Error('call')` propagates); every
  failure is CAPTURED to `MARKING_PARSE_FAILURES` + a structured log before the retry. Fixtures
  `scripts/test-marking-json-extract.ts` (`npm run test:marking-json-extract`, 16 checks, pure).
- **The 6 gates:** GATE1 self-consistency+tolerance+OFR-wiring = `validateSchemaSelfConsistency`
  (`lib/acca/validate-schema.ts`); GATE2 answer↔schema figure integrity (1/2/3 dp) =
  model_answer must contain every `fmt1(expected_value)`; GATE3 distinct-factor seeded-OFR
  (`buildOfrProof` in generator ↔ `verifyNumericAnswer`); P4 `lintJurisdiction`, P5
  `lintCompleteness`, P6 `lintLossRelief` — all in `lib/acca/validate-afm-prose.ts`.
- **Apply a content fix to a batch (in-place DB patch — the ACTUAL mechanism):** write/edit a
  `scripts/_patch_afm_*.ts` (gitignored via `scripts/_*` — local throwaways, not committed;
  working template: `scripts/_patch_afm_drill2_b4c.ts`) that holds
  raw inputs + prose as literals → rebuilds `model_answer` + `answer_schema` via the lib
  calculator → runs GATE1/2/3 in-process + a banned-phrase sweep → refuses to write unless
  gates PASS → `supabase.from('acca_drills').update({…}).eq('id', …)` via the service client
  (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Run:
  `npx tsx --env-file=.env.local scripts/_patch_afm_<x>.ts`.
- **PROSE OWNERSHIP RULE — check ownership BEFORE scoping any prose fix (general, every family).**
  `context_text` (scenario + raw-input labels) is a STORED LITERAL → a prose fix there is a
  DB/content change (patch the row string; nothing to rebuild). The `model_answer` **assumption
  line + step-label glue** is CODE-GENERATED by `build*ModelAnswer` → a prose fix there is a
  LIBRARY change (`lib/acca/<family>.ts`) that must be made in code so it SURVIVES regeneration,
  then rebuilt via the calculator. Editing only the row for a code-owned line drifts on the next
  regen. Only the Step-5 advice `prose` arg is model-authored per drill.
- **Regenerate the pack (no dedicated exporter yet):** after patching, query the batch ids and
  rewrite the per-drill sections of `docs/reviews/<PACK>.md` below the hand-maintained
  preamble — inline `npx tsx --env-file=.env.local -e "…"` (SINGLE line). The preamble
  (doctrine + `⛔ CLOSED RULINGS`) is hand-maintained, never auto-generated.
- **Protocol files:** `docs/APM_BUILD_CONTRACT.md` (journal — append-only chronology) ·
  `docs/AFM_SURFACED.md` (living backlog / open items) · `docs/GENERATOR_DOCTRINE.md`
  (standing rulings) · `docs/reviews/*.md` (per-batch review packs).
- `docs/PRODUCT_STRENGTH_STANDARD.md` — the paper-agnostic strength bar every subject must
  meet; AFM coverage contract is the reference implementation.
- **Batch lifecycle:** generate (`--*-batch`) → 6 gates → co-founder independent recompute →
  blind GPT adversarial review (CLOSED RULINGS present) → adjudicate → **flip by EXPLICIT-id
  SQL** in the Supabase editor (reconcile approved-set vs journal FIRST; demote any
  un-reviewed `approved` row back to `candidate` in the same transaction).
- **MAP BEFORE YOU CLOSE (standing lifecycle rule).** Every batch's FINAL commit MUST update
  this CODE MAP with the new family: module path, its gates, its fixture suite, and any new
  mechanism it introduces. **A batch whose map entry is missing is NOT closed.**

## Where work is tracked
- Persistent cross-session memory: `memory/MEMORY.md` (index) + `memory/*.md` (one fact
  each). Check it at session start; write project/feedback facts as they arise.
