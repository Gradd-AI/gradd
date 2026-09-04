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
- **⚠️ NEVER ROUND-TRIP A JSON FILE THROUGH POWERSHELL.** `ConvertFrom-Json | ConvertTo-Json |
  Set-Content` on `package.json` **reformatted 257 lines to add one** (2026-08-22) — it re-indents,
  re-escapes and reorders, and `tsx` then failed to parse the result at all, taking every npm
  script down with it. Edit JSON with the `Edit` tool, matching the surrounding text exactly. The
  same applies to any file whose formatting is load-bearing: the round trip is not a no-op, and
  the diff stat is how you find out (`git diff --stat` should show `1 insertion(+)`, not 129).

## Workflow (non-negotiable)
- **Atomic commits** — one concern per commit; commit per numbered task item.
- **No `Co-Authored-By` trailer** on commits.
- **`main` is production.** `next build` must be GREEN before ANY push to main. Large
  features go on a branch + PR, not direct to main; small fixes may commit to main when the
  task says so.
- **`next build` now RUNS THE FIXTURES** — `prebuild` → `npm run test:contracts`
  (`scripts/run-contracts.ts`), every pure `scripts/test-*.ts`, ~2.3s, locally and on Vercel.
  It **discovers**, so a new fixture is armed automatically; keeping one out needs an
  `EXCLUDED` entry with a reason. Only `test:exam-questions` + `test:sit-timing` are out (live
  DB) and the runner names them on every run. Doctrine `P-G5` in `GENERATOR_DOCTRINE.md`:
  before this, 44 of 44 `test:*` scripts were reachable from NO automatic path.
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
confirm the deploy from the **BUILD LOG**, not from `readyState`.

**CONFIRM THE DEPLOY FROM THE BUILD LOG. CHECK ONCE, IMMEDIATELY.** (Grant's amendment,
2026-08-05.) Find the deployment whose `githubCommitSha` matches the pushed SHA
(`list_deployments`, `target: "production"`), then call
`mcp__plugin_vercel_vercel__get_deployment_build_logs` on it — **once**. If the log shows the
contract gate passing and `Build Completed` / `Deployment completed`, report the SHA and move
on. Project/team ids are in `.vercel/project.json` (`projectId` / `orgId`).
**⚠️ THE MCP 403s ON DEPLOYMENTS — USE THE CLI (corrected 2026-08-11).** `list_deployments`
returns `403 forbidden … resource: deployment` on this token, and "no Vercel CLI is installed
on either machine" was ALSO wrong: it is at `%APPDATA%\npm\vercel.ps1`, authed, and the
plugin's "not installed" banner is a known Windows spawn false-negative
(`memory/reference_vercel_plugin_cli_detection_windows.md`). Working route, both used this
session: `vercel ls --meta githubCommitSha=<sha>` → `vercel inspect --logs <url>`, filtered for
`contract gate` / `Build Completed` / `Deployment completed`. Same rule stands — read it ONCE.
A branch push produces a **Preview** deployment, not production; that is the one to confirm
when the session ends on a branch.
- **DO NOT poll `readyState` in a loop, and DO NOT arm a background sleep timer.** The API
  reports `BUILDING` for MINUTES after the log says `Build Completed` — the flip waits on the
  build-cache write, not on the deploy. This lag has been hit repeatedly and is banked in
  `memory/reference_vercel_deploy_state_lag.md`. Polling it converts a 50-second deploy into
  several minutes of waiting and invites reporting "still building" about something already live.
- **A FAILING LOG IS THE FINDING, AND IT MATTERS. REPORT IT AT ONCE** — do not re-check, do not
  wait to see whether it recovers, do not bury it under the rest of the close.
- `state: READY` is still the right thing to quote **if you already have it**; it is simply not
  the thing to WAIT for. Never claim READY without having seen it.

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
  **BATCH 2 — LIVE (GATE-P flip, 2026-08-02). AFM published 60 → 63; THE PS ROUTING GAP IS CLOSED —
  all 7 measured (area × skill) cells now have a LIVE server, confirmed with `psScore` over the live
  set.** D9 `36edda4f` B5c communication (rank 66) · D10 `de0c2676` E3a scepticism (85) · D11
  `d2b06649` A3c communication (67). Reconcile clean, explicit-id flip, **P-DB4 14/14 immutable fields
  byte-identical**, snapshot `docs/rollbacks/AFM_ps_cell_2_publish_flip_20260802.json`. Entries
  unmoved. Pack `docs/reviews/AFM_BATCH_PS_CELL_2_REVIEW_PACK.md`. **E1 × a_and_e was NOT authored** —
  it closed via the `55181aa8` re-tag instead. **`47c9d5ce` was ALLOW-LISTED by registration in the
  reconcile, not hard-stopped** — what the permanent-candidate disposition exists for; an
  *unregistered* candidate still hard-stops. Proven with a control: matched over ALL rows, A3 ×
  communication returns `d2b06649` AND `47c9d5ce`; over the LIVE set, only `d2b06649`.
  **✏️ D9's `full_reveal` was REWRITTEN because the TEACHING LEG COACHED A DIFFERENT SKILL FROM THE ONE
  THE RUBRIC MARKS.** It led on FENCE-SITTING — a commitment failure (F4) carried by ONE criterion
  worth 2 of 12 — while the drill's declared skill is `communication` and its four F10 criteria
  (8/12) are all about the READER. Reframed on the failure its own golden BAD exhibits: that BAD is
  technically accurate throughout and closes by tasking *"BalticPack's treasury team"*, handing the
  only action item to a party the two named recipients do not control. Its `hint` carried the identical
  lean and was rewritten the same way. **Banked as doctrine `P-N2`: the teaching pair can coach a
  different skill from the one the rubric marks, and NO GATE CATCHES IT — P7 checks that a
  `"…misconception…: "` sentence EXISTS, never that it names the failure the criteria penalise. Check
  the reveal's headline failure against the rubric's own arithmetic (which criteria carry the skill's
  disqualifier, and what share of the marks they hold), and anchor the reframe on the drill's own
  golden BAD.**
  **`--narrative-regate-from` now runs P4 + P7 as well as N1–N6.** N1–N6 read only the rubric and the
  golden pair — none of them touches `hint` or `full_reveal` — so a hand edit to a TEACHING field
  could be reported "re-gated GREEN" by checks that had never looked at the field that changed. **N6b CANNOT gate a `communication`
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
- **THE TEACHING-REVEAL CATALOGUE — three sites, all unpinned but one (2026-08-20).** The
  `full_reveal` misconception list is stated in `EZRA_TEACHING_PERSONA_<PAPER>` (system block),
  `buildRevealPrompt<Paper>` (user prompt) and **`SUBMIT_REVEAL_TOOL`, which is SHARED BY BOTH
  PAPERS** — an eighth paper-coupled site the seven-site sweep missed; it is now paper-neutral and
  carries no enumeration, because a third copy in a tool schema cannot be overridden and will
  drift. AFM's list is CLOSED (`"drawn from the catalogue: A…or E"`), APM's is exemplary (`e.g.`).
  **The enumeration is the `else` of `designed_failure` in BOTH builders now** — with no AFM plan
  declaring a mode the absent branch renders byte-identical, which is what keeps **PIN4** green;
  an unconditional-plus-append edit moves eleven pinned shas and `test-narrative-paper-pins.ts`'s
  terms are that a moved pin kills the claim rather than being re-captured. **Only the user prompt
  is pinned**; the persona and the tool schema are invisible to the gate suite and reach every
  future reveal on both papers, calculator batches included. 📐 AFM gained **SUPERFICIAL-COMMENTARY**
  (F6) and **UNCHALLENGED-ASSERTION** (F10) because F6 (33 criteria/10 rows) and F10 (24/6) were
  the two most-marked modes in the published corpus and neither had a name, while **F3 — marked on
  ZERO of 74 criteria — was the only development name available** and three rows headlined it.
  ⚠️ **UNCHALLENGED-ASSERTION names the SCEPTICISM act only**: F10's six rows span three skill tags,
  so its communication and commercial-acumen halves stay unnameable until F10 is split. ⚠️ **P7
  (`lintMisconceptionLead`) was being satisfied by an ACCIDENT** — no AFM prompt ever instructed the
  `"…misconception…:"` lead form; naming a catalogue label produced it as a side-effect, and removing
  the enumeration failed three attempts until SBL's explicit instruction was ported in. **P7 still
  only checks the sentence EXISTS**, so a lead named in sentence three is a 100-word blob the tutor
  broadcasts; the 220-char shape gate in `rewrite-afm-reveal.ts` covers that ONE path only.
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
- **THE PERMANENT RESULTS PAGE — `/acca/results` + `/acca/results/[attemptId]`, and ONE assembly
  behind every reader of a sat paper (built 2026-09-04).** `lib/acca/sit-report.ts` holds the
  chain — `orderPaper → toPacingInputs → computePacing` + `toDebriefRequirements +
  toDebriefCases → buildDebrief` — and `lib/org/trainee-sit.ts` is now AUTHORISATION ONLY
  (org/cohort re-check → pick the attempt → `assembleSitReport`). It was a second copy of that
  chain with a header explaining why a second copy was acceptable; that held at two, and the
  student's own page would have been a **third**, at which point the question stops being *do
  these agree* and becomes *which is right*. `buildSitReport(sb, userId, attemptId)` applies
  `.eq('user_id', …)` to the attempt lookup **and re-checks the returned row** — a fact about the
  row, not a promise about the query, the same discipline `rowsForAttempt` applies one level down.
  **IT CANNOT MARK, STRUCTURALLY:** a server component importing a module that imports no
  `runCaseMarking`, no `claimCase`, no model. It also carries **no `paperFullySubmitted ||
  attemptIsClosed` gate** — that gate protects MARKING, and a read has nothing to protect, so an
  unmarked paper renders `technical_awarded: null` rather than being marked by whoever opens the
  link. Marking keeps its single trigger (the client POSTing `sit/results` from the `done` phase),
  and **revisiting `/acca/afm/mock` on a completed attempt still POSTs** — that is unchanged and
  deliberate; the mock surface owns first-marking and the retry, this page owns the revisit.
  **ID-ADDRESSED, NO `?paper=`** on the detail route (the attempt owns the paper via `mock_id`);
  the LIST is paper-parameterised. Same split as `/acca/cases` vs `/acca/cases/<id>`, and both new
  files joined `test-paper-link-sweep`'s population with an ID-ADDRESSED exemption.
  ⚠️ **`model_answer` IS NOT SELECTED AND MUST NOT BE.** Four sites now state this (`case`, `sit`,
  `sit/results`, and these two). Grant ruled it 2026-09-04: a mock case is `mock_only` reserved
  content, there is exactly ONE mock per paper, disclosure is per-student irreversible, and a
  re-sit cannot be marked anyway — a paper whose model answers have been read is SPENT. The
  withhold is also ARCHITECTURAL (`TEACHING_ARCHITECTURE.md`, LOCKED), and most case
  `model_answer`s are hand-typed literals never code-verified (`answer_schema` NULL). **What ships
  instead is `full_reveal`** — the teaching field, same one the drill loop's earned reveal serves —
  plus `question`, which is not a disclosure at all (the student read it during the paper) and
  without which an answer is not revisable. Both are a SIBLING map (`study`), never threaded
  through `buildDebrief`: that function produces a marking artefact and must not become the
  carrier of a disclosure decision.
  ⚠️ **`listSitAttempts` DOES NOT LIST ON `completed`, and the gap is enormous.** Measured live:
  **13 of 15 completed attempts hold NO progress rows** (pre-`attempt_id` APM sittings whose work
  went through the practice path, so those rows carry a NULL `attempt_id` and by doctrine can
  never reach a sit debrief). One real account has 5 completed attempts, 1 with content — listing
  on `completed` would offer it four blank papers. The rule is pure (`summariseSittings`) and
  fixtured for exactly that reason: an `.eq()` cannot be tested and this can.
  **HELD DECISION, NOT SETTLED (Grant, 2026-09-04): a LAPSED subscription hides a paper the student
  sat while paying.** The gate matches `sit/results` (`hasPaperAccess`, per paper, SERVICE client
  per the 2026-08-09 lesson) and renders SitRunner's locked copy. The reversible direction; the
  policy question is open. The `/acca/progress` index panel is deliberately **NOT** behind the paid
  lock — it names papers and dates them, and every mark lives one click away behind the gate.
  Fixtures `npm run test:sit-report` (18, gate 76 → 77) + `test-surface-events` 52 → **67**
  (`mock_results_viewed`). **VERIFIED LIVE, read-only:** 8/8 requirements, answers, questions and
  reveals assembled; `model_answer` absent from the serialised report; a cross-user read and a
  bogus attempt id both refused; APM's 4 completed-but-empty attempts correctly listed as 0.
  🔴 **AND IT FIXED A FIVE-WEEK LIVE BUG ON THE WAY IN.** `getMyProgress` read
  `paper === 'APM' ? rows.marks : []` for BOTH marks and mocks, justified by a comment saying
  *"no AFM cases/mocks exist"* — true when written, **false from 2026-07-29** when AFM Mock 1 was
  published. Every AFM student's progress page showed no mock and no case marks, and the one
  account with real banded sit data is the AFM one. Now scoped properly: mocks through the
  registry (pure), marks through `casePaperCodes` (one id-addressed lookup — mock cases could have
  come from the registry, but standalone cases are not in it, and a rule covering half the rows is
  how the next reader concludes the other half do not exist). **Measured before/after: AFM 0 mocks
  + 0 marks → 1 + 3; and APM 8 marks → 5, because three AFM case marks had been showing on the APM
  page.** **The ORG readers were scoped the same day, after measuring** — the rule now lives in
  `rawRowsForUsers` beside the drill join (ONE site, so no caller can forget; `getMyProgress`
  keeps nothing of its own), as pure `scopeMarkRows` / `scopeMockRows`, fixtured both directions
  in `test-org-readiness` (T21–T29) with the unscoped reader pinned WRONG.
  📐 **MEASURED BEFORE APPLYING, real readers, fixed clock, all 26 demo-advisory trainees across
  all three cohorts: every cohort row BYTE-IDENTICAL.** Only 5 of 26 hold any marks or mocks and
  all five are APM-only. ⚠️ Exactly one account moved and it is **in no cohort** — `ee07f08c`,
  assessment 0.792 → 0.900, mockAvg 0.8125 → 1.0, mocksCompleted 4 → 3, composite 0.240 → 0.256
  (band `red` either way): a near-blank **AFM** sitting had been dragging an **APM** readiness
  score down. The trainee page 404s for it (`cohortMemberDecision` — org member, no cohort
  membership, verified), so nothing a coordinator can open changed.
  📐 **`caseAvg` did not move, and that is the trap:** the leak reached readiness through
  `mockScores`, NOT `caseMarkRatios` — `buildInput` already excludes mock cases from the case
  average via `MOCK_CASE_IDS`, so a check looking only at `caseAvg` would have called the bug
  absent.
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
  **THE DRILL PATH WRITES TOO (2026-08-12, unflagged).** Decision pure in `weak-areas.ts`
  (`drillBandFor` / `drillLedgerAction`), write shared with the sit via **`lib/acca/
  weak-area-store.ts`** (`openWeakness`/`closeWeakness` — moved out of `case-mark-run.ts`,
  where `source:'sit'` was a LITERAL on both the insert and the close filter, so a drill row
  would have been unopenable with its own source and permanently unclosable). Called from
  `app/api/acca/tutor/route.ts` **§10a**, best-effort, paper from the DRILL'S OWN `paper_code`.
  **OPENS at `miss_count >= 2` and not `resolved`** — a miss is a designed beat of the TEACH
  loop, and 83 of 115 miss-carrying pairs were a SINGLE miss; 2 is the number the earned-reveal
  gate and `stuckDrills` already use. Band: `competent` at 2, `weak` at ≥3. **CLOSES on a later
  `outcome='correct'` — NEVER on `tutor_progress.resolved`**, which the EARNED REVEAL also sets:
  closing on it would resolve a weakness the moment a struggling student asked for the answer.
  **`SOURCE_WEIGHT` sit 1.0 / drill 0.6, explicit** (a rule living only in a threshold is one
  the next reader must reverse-engineer); `weaknessScore` takes the MAX not the sum, so sit and
  drill rows on one LO never compound, and a source-less row scores as a sit. **Sit and drill
  rows are independent by the unique key — a drill success must NOT close a sit finding.**
  Backfill `npm run backfill:drill-weak-areas` (replays the attempt log; `--revert` deletes
  only drill rows). ⚠️ **311 of 644 attempts are DEMO-ORG SEED rows** (`seed-demo-org.ts`,
  fabricated `drill_id`s) — the paper join skips them rather than defaulting, without which the
  ledger would invent weaknesses for 24 users who do not exist. **The real population is 3
  users / 333 attempts**, one of them a dev account.
  📐 **MEASURED THE DAY IT SHIPPED — `npm run probe:steering`, and the finding is that the LO
  term BARELY STEERS.** In 4 of 5 (user, paper) cases every candidate in the pool scored
  IDENTICALLY (`distinct scores in pool: 1/N`), so `pickWeighted` degraded to the uniform random
  pick it makes with NO ledger. Cause is structural, not a magnitude problem: the live `area=`
  and `lo=` paths already scope the pool to ONE sub-area, so every candidate is the same kind of
  match and the weakness term becomes a CONSTANT OFFSET, which cannot change who wins. It only
  discriminates across a pool spanning sub-areas — i.e. the `APM_INTERLEAVE` scorer, which is
  OFF in production. The only term observed to change a winner was **PS** (`D2h` at 2.20 vs
  1.20, on a `communication` tag). **Raising `W_WEAK` would not fix this** — n×constant is still
  a constant. Report `distinct scores in pool`, never the score.
  ✅ **FIXED BY CHANGING THE POOL, NOT THE WEIGHTS (2026-08-12).** `currentDrillExclusion`
  (`weak-areas.ts`) — the live `lo=` tiers now exclude the **current DRILL by id**, not its whole
  LO, so the weak LO's own drills are back in the pool and score an exact match against a field
  of siblings. Finishes an intent stated TWICE in the route already (`drill_id` is declared
  *"item 4: exclude current DRILL, not LO"*, and the sameArea tier's comment read *"exclude
  current drill"* while the code excluded the LO). Falls back to the LO when no `drill_id` is
  supplied — the narrowest exclusion it can identify, since a legacy client leaves no other way
  to guarantee a different drill. **Weights UNTOUCHED**: exact-over-sibling was modelled at
  0.25/1, 0.2/1.5 and 0/1 and changed the distinct count in NONE of five real serves, and would
  swamp the PS term. ⚠️ **THE `.limit()` IS PART OF THE POOL** — at 10, with no `ORDER BY`, an
  arbitrary 10 came back and AFM B1 (14 drills, 8 on B1a) returned ten B1a rows in which the
  weak LO's drills were never FETCHED, silently undoing the change. Raised to **50**.
  📐 **MEASURED AFTER: 3 of 5 serves now discriminate (1/N → 2/N), not 5 of 5.** The pre-build
  model predicted 5/5 and was WRONG because it did not exclude the current drill by id. The
  remaining two are blocked by **CONTENT DEPTH, not code**: APM A1 is 10 LOs across 10 drills and
  D2 is 9 across 11, so excluding the current drill removes the ONLY drill on the weak LO and the
  pool is all siblings again. **The fix's ceiling is drills-per-LO** — AFM (B1c: 4, B1a: 8) has
  it, APM does not.
  ⚠️ **OCCURRENCE-CAP SATURATION — KNOWN, LOGGED, NOT FIXED.** The cap saturates at 3 misses, so
  `weak×18` and `weak×5` score identically (both at `MAX_WEAKNESS_SCORE`); **9 of the 12 live rows
  sit at the cap**. The ledger can say an LO is weak but CANNOT RANK two weak LOs against each
  other, and the pool fix does not touch that. Fixtured as a known limit.
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
- **THE REQUIREMENT LABEL AT TWO BOUNDARIES — `lib/acca/requirement-label.ts` (pure, 2026-08-13).**
  `strippedLabel(label, loCode, {sweepCodeShape})` + `markerLabel` (the marking form). ONE rule, TWO
  readers: the CANDIDATE (`sitDisplayLabel`, serve boundary) and the PS MARKER (`case-mark-run.ts`).
  **`sweepCodeShape` is a REQUIRED parameter, not a default, because the right answer inverts.** The
  exact-`lo_code` removal is safe everywhere; the GENERIC sweep is a SHAPE (`<A-E><digit(s)><letter?>`),
  so **true** at the serve boundary (a leaked code on a candidate's screen is the worse failure) and
  **false** in marking (an APM label naming a division "B2" would be silently gutted before the marker
  bands the candidate on it). **Measured before dropping it: 38 requirement rows, 0 null `lo_code`, 8
  labels carrying a code shape, 0 where `lo_code` was absent or disagreed** — the exact removal handles
  every code that exists. Fixtures `npm run test:requirement-label` (110; all 16 real APM labels pinned
  byte-identical, BOTH AFM label shapes — mock-1 code+marks and `author-afm-case`'s marks-only — and
  B2-in-prose pinned MUST-FAIL in both directions). ⚠️ **THE TECHNICAL PASS STILL READS THE RAW LABEL**
  (`case-marking.ts:595`) — ruled PS-only, logged in `case-mark-run.ts`; its `feedback` is student-facing
  under the same "never point at anything they cannot see" ban, so it is open, not closed.
- **THE PS LADDER HAS A FLOOR — `nothing` (2026-08-13).** `BANDS`/`SkillBand`/`isBand` are **DELETED**;
  ONE lexicon (`TECHNICAL_BANDS`) serves both passes. `weak` pays 25% and described a POOR attempt, not
  an ABSENT one, so the marker could not say "no credit"; Option A's short-circuit only caught the FULLY
  blank case, and `"asdf"` cleared `isBlankAnswer`'s 3-char threshold and floored at `weak`. **Three
  prompt changes, all load-bearing:** the floor bullet · `weak` RE-ANCHORED (the line is a question of
  FACT — is there writing to judge — not a further question of degree) · **THE RULE-4 CARVE-OUT, which
  is what makes the band selectable** (rule 4's "quote a short phrase" is unsatisfiable on a near-blank
  answer, and a model facing an unsatisfiable rule picks a band whose feedback it CAN write — left
  alone it would have quietly repealed the new bullet, which would then pass every calibration bar
  while changing nothing). 📐 **MEASURED: `nothing` 120/120 cells, 0 marks, BOTH papers; and 60/60 on
  the RAW-label join too, so THE LADDER does the work and the LABEL STRIP IS NOT LOAD-BEARING FOR THE
  FLOOR.** PS recalibration 30 chains: case ranges identical to baseline, paper total 16–18 vs 17–19.
  ⚠️ **The carve-out's FIRST wording was itself the defect** — passive examples the model reproduced
  verbatim (0/6 second person); second-person examples now name the wrong outputs as forbidden.
  ⚠️ **PS steering STOPS for a near-blank paper** (`WEAKNESS_BANDS` excludes `nothing`) — ruled correct.
- **THE PS PROMPT IS A PURE BUILDER WITH NAMED VARIANTS — `buildPsSystemPrompt(paper, variant)`
  (2026-08-13).** `judgeCaseMarking` takes an optional `promptVariant`; **production default is
  `ladder`**. Fixtures `npm run test:ps-prompt-variants` (57) pin `shipped` **BYTE-IDENTICAL** to the
  pre-refactor string, so the historical calibration control survives and the refactor cannot
  silently reword the live prompt. **A calibration arm now drives the REAL core** instead of a hand
  transcription beside it — the first round had to copy the prompt to get a control, which put a
  transcription of the one string under test at the centre of the measurement.
  **THE LEAK AND ITS SOURCE.** ~1 in 10 PS feedback strings named *"the descriptor"* to the
  candidate. Rule 2 **already** banned it in capitals, *"HOWEVER NAMED"*, and was losing at 12.9% —
  because **FIVE of the prompt's NINE `descriptor` mentions WERE the band definitions** (*"meets the
  descriptor in full"* …) and rule 4 demands *"no band without a named reason"*, so the model
  warranted the band by restating the band's own definition. **8 of the first 9 sightings sat on
  `exemplary`**, where the old rule 2 (*"where the band is below exemplary…"*) offered no closing
  move at all. Fixed by rewriting those five to describe the QUALITY OF THE WRITING (*"demonstrates
  the skill"*), 9 → 4 mentions, **every severity anchor preserved verbatim** — which is what keeps it
  band-neutral. **The descriptor block, its `(the standard)` header and all three instructions to
  judge against it are UNTOUCHED** (fence the output, never the input — P-M3).
  📐 **CALIBRATED, 3 arms × 264 paired skill-cells** (11 real cases, interleaved): control 12.9% ·
  **ladder +0.019 bands (t=0.66), 78% cells identical, leak 6.4% (z=2.50)** · ladder+P-T2 −0.030
  bands but **25.4% (z=−3.65)**.
  ⛔ **TWO ATTEMPTS FAILED FIRST AND THEY ARE THE EVIDENCE (doctrine `P-M4`).** The
  judgement/feedback split (P-M3 ported here) took mentions 9 → 22 and **doubled the leak while
  moving bands HARSHER** (`competent` 7/92 → 17/92) — reverted, never merged. The P-T2 half (rule 2
  restated + an `exemplary` carve-out on rule 4) hit **z = −3.65** and did not fix the band it was
  written for (exemplary 19% → 25%). **Any instruction ADDED to the feedback rules that names the
  referent raises the rate by priming it; removing it from the band DEFINITIONS lowers it.** P-M3's
  split works only where the reference has CONCRETE RESIDUE that survives the rewrite (*"your WACC of
  9.59% is correct"*); a descriptor has none. `ladder_p_t2` is retained in the builder as a **recorded
  loser, not an option**.
  🔴 **OPEN — CLASS C, and the fix made it WORSE at `nothing`.** *"There is nothing here to assess
  **against the requirement to** investigate information, estimate outcomes…"* attributes descriptor
  content to the requirement — a document the student **IS** holding, which does not say that; the
  worst of the three classes. **BY HAND: control 4/16 → ladder 9/16.** The n-gram detector cannot see
  it (the model paraphrases), **so the 6.4% does not cover it** — never quote that figure as though it
  did. `n=16` is one near-blank case × 2 skills × 8 runs, too small to act on; needs a
  paraphrase-tolerant detector and a corpus with real weak/nothing answers. See `AFM_SURFACED.md`.
- **THE PAPER AT A URL BOUNDARY — `lib/acca/paper-url.ts` (pure).** `paperHref(path, paper)` WRITES
  the paper into a link; `resolveSubscribePaper(param, referrer)` READS one back. One rule, two ends,
  one module — the round trip is the property that has to hold. **`DEFAULT_PAPER` (`paper.ts`) is
  SHARED with `resolvePaper`**: paperHref omits the param for it, resolvePaper reads an absent param
  as it, and if they ever diverge a link built for one paper resolves to the other with nothing
  typechecking differently. **`paperHref('/acca','APM') === '/acca'`** byte-for-byte — that is what
  makes it a drop-in for the ~17 hand-built ternaries rather than a change to every APM URL.
  **THREE CATEGORIES STAY BARE and must NOT be passed through it:** cross-product (`/` wordmark) ·
  id-addressed (`?drill_id=`, `/acca/cases/<id>` — a primary key is globally unique, so no paper
  scoping applies) · auth (`/acca/auth?next=` — the paper rides INSIDE the encoded `next=`). A
  per-paper SURFACE (`/acca/mock` vs `/acca/afm/mock`) is a different path, not a param, and stays a
  ternary. Fixtures: `npm run test:paper-url` (38, P-G3 pins three wrong implementations + the
  pre-fix subscribe rule as MUST-FAIL) **and `npm run test:paper-link-sweep` (21) — a STATIC SWEEP
  over every authed ACCA surface, because the unit suite proves the rule is RIGHT and cannot prove it
  is USED, which is what every defect in this class actually was.** The sweep blanks comments to
  spaces (indices preserved) and finds `paperHref` calls by balanced-paren spans; a line-prefix/
  same-line version reported four false positives against doc comments that quote the bad literals.
  Waivers are PER-LITERAL where one link in a clean file is blocked, and **a waiver that matches
  nothing FAILS** (it outlived its bug and is unguarding a fixed line). **`WAIVED` IS NOW EMPTY**
  (2026-08-11) — all three entries were defect (a) and defect (a) is fixed — so the waiver arms are
  driven by SYNTHETIC findings via `verdictFor` (P-G3: an empty list makes every branch unreachable,
  and unreachable is untested). ⚠️ **CLAIM CEILING:** green means no link silently DROPS the paper —
  never that every link carries the CORRECT one.
- **THE EXAM-CASE SURFACE IS PER-PAPER — `lib/acca/case-surface.ts` (pure).** `/acca/cases` was
  APM in five places (list fetch, load fetch, turn/mark bodies, two breadcrumbs, two titles, and a
  `SECTION_NAME` holding APM's four-section taxonomy) while five published AFM cases sat servable
  behind `?paper=AFM`. **TWO RESOLUTIONS, because the two URLs are different kinds:** the LIST is
  paper-parameterised → `paperFromRouteParam(searchParams.paper)`; the DETAIL page is ID-ADDRESSED →
  `paperForCaseRow(row.paper_code)`, one `cache`d query in `[id]/page.tsx` shared with
  `generateMetadata`. **Never put `?paper=` on `/acca/cases/<id>`** — the row owns that fact, and a
  bare bookmark would resolve to APM and 404 against `.eq('paper_code', …)`. **`paperFromRouteParam`
  is NOT `resolvePaper`** (P-G6): Next hands a page `string | string[] | undefined`, and
  `resolvePaper` tests `raw === 'AFM'`, so `?paper=AFM&paper=AFM` (array) and `?paper=afm` both
  resolved to APM; `resolvePaper` stays correct for a request BODY field our own client writes.
  `caseSectionName(paper, anchor_area)` — **`acca_cases.section` (exam section A/B) and `anchor_area`
  (syllabus area) are BOTH called "section" on one card and are different columns**; the AFM table is
  fixture-asserted equal to `scripts/afm-framework.ts` SECTIONS A–E. Fixtures: `npm run
  test:case-surface` (52; pins a hardcoded paper, `resolvePaper` on a route param, and one section
  table for both papers as MUST-FAIL; APM metadata pinned byte-identical). ⚠️ **THIS SURFACE CANNOT
  BE VERIFIED FROM SERVER HTML** — `CaseSession` returns "Loading case…" until a client fetch
  resolves, so `includes('ACCA AFM')` fails on correct output AND `!includes('ACCA APM')` passes on
  any output. Walk it in a real browser; and strip React's `<!-- -->` text/expression separator
  before asserting on `ACCA {paper}` (P-G3(a)).
- **THE UNENTITLED SIT SOLD NOTHING — three dead ends, one root cause (fixed 2026-08-12).**
  A 402 `subscription_required` reached the sit surface at THREE points and all three collapsed
  into copy that told the student to retry something that could never succeed: load →
  *"Couldn't load the paper. Reload to try again."* · mid-sit write → *"That didn't save. Press
  submit again."* · **results → *"Marking did not complete… try again"* under a "Try marking
  again" button, AFTER a 3h15m paper had been sat.** Root cause was type-shaped in both places:
  `Phase` had no member for "refused, and why", and `recordAnswer` returned a BARE BOOLEAN
  (`res.ok || res.status === 409`), so no caller could have told 402 from 500.
  **Mapping is now PURE and fixtured — `lib/acca/sit-preview.ts`:** `sitRefusalFor` (402 →
  `paper_locked`, 404 → `not_available`, else `failed`; **401 is deliberately `failed`** because
  the mock PAGE redirects server-side so "reload" IS honest for it) · `sitPhaseForRefusal` ·
  `resultsOutcomeFor(status, code)` — **two args because `paper_not_finished` is itself a 409**,
  so status alone cannot decide it · `sitWriteOutcomeFor(status, code)` → discriminated.
  ⚠️ **THE BOOLEAN WAS WRONG, NOT MERELY UNINFORMATIVE:** `case/turn` returns 409 for
  `already_submitted` (saved), `attempt_closed` AND `no_open_attempt` (both refusals) — the last
  two were reported to the student **as saved work**. Now refusals; `attempt_closed` sends the
  runner to the results instead of leaving "press submit again" up forever. An UNKNOWN 409 is
  `failed`, the safe and self-correcting direction (a retry on a landed write returns
  `already_submitted` → saved; claiming saved has no recovery).
  **COPY REGISTER IS CaseSession's, NOT A NEW ONE** — that surface already sells from this exact
  status code, and one status code must not get two voices. **Mid-sit lapse = PRESERVE, THEN
  SELL:** phase stays `sitting`, subscribe opens in a **NEW TAB** (the in-progress answer lives
  only in React state, so navigating this tab is the one thing that would destroy it), the
  existing Submit button IS the retry, and the banner **says the clock does not stop** — `ends_at`
  is server-authoritative and pausing it would let a candidate stop a timed exam by letting a card
  lapse. Amber, not the red of `.sit-err`: a lapse is not a fault.
  **RESULTS ARM LEADS WITH THE WORK BEING SAFE**, then the subscription — verified literally true
  (8/8 answers durable, attempt-linked, `submitted_at` set) before the copy was written. Retry
  re-labelled *"I've subscribed — mark my paper"*. Fixtures: `npm run test:sit-preview`
  (+43 checks, **P-G3 pins all three shipped collapses as MUST-FAIL**).
  **Two comments CORRECTED because they asserted this already worked:**
  `app/acca/afm/mock/page.tsx` ("the runner renders its own error state" — it could not say WHY)
  and `ACCADashboard.tsx` (**"That is an upsell, not a leak"** — the not-a-leak half was true, the
  upsell half was false for the surface's whole life). **Generalisable:** *"the API owns the
  decision"* and *"the client can explain the decision"* are TWO requirements, and satisfying the
  first says nothing about the second.
- **THE TIMED-OUT PAPER WENT BACK TO THE START SCREEN — the load-effect fall-through
  (fixed 2026-08-12, `fix/sit-completed-attempt-intro-fallthrough`).** A sit that ends on the
  CLOCK carries **`completed=true` AND an incomplete submitted set** — the auto-submit records
  the requirement being written and deliberately does not back-fill the tail (`not_reached` ≠
  `blank`). `SitRunner`'s load effect asked *"is every slot submitted?"* FIRST and *"is the
  attempt open?"* second, so that pair matched neither arm and fell through the `else` to
  **`intro`**. A returning student got the **Start screen**: debrief unreachable (the `done`
  phase is the only route to `sit/results`), the "I've subscribed — mark my paper" retry
  unreachable, and a Start click **minted a new attempt**, after which `attemptFor` resolves the
  NEW one on every later results POST and the old paper's answers are unmarkable through the UI
  for good. **THE RULE: the ATTEMPT'S STATE decides, not the submitted set** — "is this paper
  over?" is a fact about the attempt (completed, or past `ends_at`), and completeness is
  downstream of it, not a second opinion. Arms now live in **`sitLoadDecision`
  (`lib/acca/sit-preview.ts`, pure)**, tested `completed → expired → complete → resume`; it
  returns `phase`/`index`/`finishAttempt`/`expiredOut`/`reportIntro` so the component decides
  nothing. **`endedOnClock` compares `completed_at` against `ends_at`, NEVER against `now`** —
  every past paper has `ends_at` in the past when revisited, so a now-based test headlines
  "Time's up." at someone who finished early; a NULL `completed_at` returns false (unknown beats
  a false accusation). **The server half was VERIFIED, not assumed:** the fixtures import
  `caseMarkReady` ACROSS MODULES and pin that a closed attempt with an unreached tail is
  markable, that the same paper is refused without the flag, and that one still running stays
  refused. **Also narrowed correctly — the old `else` caught completed attempts too, so a
  returning student emitted `mock_intro_viewed` while never seeing the intro; those rows were
  miscounted.** Fixtures `npm run test:sit-preview` (+43; the shipped collapse transcribed as
  `LEGACY_phase` and pinned MUST-FAIL, state built the way production builds it — `ends_at` from
  the registry's own `duration_minutes`). **PROVEN LIVE** on a real expired attempt through the
  real routes (`docs/rollbacks/sit_expired_walk_20260812.json`): OLD → INTRO, NEW → DONE on the
  served payload, then results 200 marking 3/3 in 27s with the tail reported `not_reached`.
- **NOTHING RETRIES A FAILED SIT MARKING — `npm run audit:unmarked-sits` (read-only,
  2026-08-12).** Marking has exactly ONE trigger: the client POSTing `sit/results` from the
  `done` phase. No queue, no retry beyond a button, **no server-side sweep** — the two crons in
  `vercel.json` touch no ACCA table — and no observation: there is no "a sit finished" event and
  the surface telemetry does not cover it. `scripts/audit-unmarked-sits.ts` is that missing
  observation, committed so it is run rather than rediscovered. It reads a marking row as a
  RESULT only when `technical_marks_available` is non-null (a NULL is a `claimCase` CLAIM, and
  counting one as a result reports a crashed run as a marked paper), and resolves entitlement
  through `hasPaperAccess` so "unmarked because unentitled" is verified. Out of the contract gate
  by construction — the `audit-` prefix misses `run-contracts.ts`'s `test-*.ts` discovery, so no
  `EXCLUDED` entry is needed. **THE SWEEP AND THE RETRY ARE LOGGED, NOT BUILT** (Grant-ruled
  2026-08-12): a cron before the fall-through was fixed treats the symptom.
- **CASE/MOCK SURFACE TELEMETRY — three events, and only three (built 2026-08-12).**
  `lib/acca/surface-events.ts` (PURE — the closed vocabulary `SURFACE_EVENTS`, the three builders,
  and `parseSurfaceEvent`, so the write shape and the read shape are ONE definition) ·
  `lib/acca/surface-event-client.ts` (`emitSurfaceEvent` — fire-and-forget, silent on failure) ·
  `app/api/acca/surface-event/route.ts` (the AUTHED sink) · fixtures
  `scripts/test-surface-events.ts` (`npm run test:surface-events`, 52 checks, in the contract gate).
  **THE DIAGNOSIS THAT SIZED IT:** nothing wrote a row when a student OPENED a case or a mock — the
  first case row needs a turn (practice) or a submit (sit), the first mock row needs the Start
  click — so *opened-and-bounced* and *never-opened* were the same observation, and there is no
  pageview layer to fall back on (**Vercel Web Analytics is NOT enabled** for this project; no
  `@vercel/analytics`, no third-party analytics). **Everything else was DELIBERATELY NOT BUILT**:
  every other moment on these surfaces is reconstructable from a stored row
  (`acca_case_progress.created_at` = first requirement attempted on PRACTICE;
  `.submitted_at` = **SIT-ONLY**; `acca_mock_attempts.started_at`/`completed`/`completed_at`;
  `acca_case_marking.marked_at` = marked AND first debrief view; mock ABANDONED =
  `completed=false AND ends_at<now()`), and duplicating a durable row with an event is the
  `reveal_shown` mistake. See `docs/AFM_SURFACED.md` for the eight moments left open on purpose.
  **CASE IDENTITY IS `metadata` JSONB, NOT `drill_lo`, NOT NEW COLUMNS** — `drill_lo` is
  drill-shaped and writing a case id into it would poison every funnel query that groups by it;
  columns cost a manual migration for no query benefit at this volume. Keys are fixed:
  `case_list_viewed{paper}` · `case_opened{paper,case_id}` · `mock_intro_viewed{paper,mock_id}`.
  **jsonb's typo hazard is closed STRUCTURALLY, not by convention:** `parseSurfaceEvent` is strict
  in BOTH directions (a missing required key AND an unknown key are refusals), and the row stored
  is the BUILDER'S output, never the caller's object.
  **TWO SINKS, ONE TABLE, AND EACH REFUSES THE OTHER'S VOCABULARY.** `/api/acca/event` stays
  auth-free and client-attributed because it serves the ANONYMOUS pre-signup drill funnel (45
  anon-keyed rows, by design) — it now 400s on any `SURFACE_EVENTS` string. `/api/acca/surface-event`
  requires a session, takes `user_id` from `auth.getUser()` and NEVER from the body (`user_id` is
  rejected as an unknown metadata key), and writes `anon_id: null` always. **There is no code path
  in it that writes an unattributable row.** 87 of the 504 pre-existing rows have neither identity
  — **CORRECTED 2026-08-12: that is ONE CLOSED two-day window** (2026-06-25 + 06-27, 100% of both
  days) where the emitter sent neither, not scattered coercion and not the FK below; the sink's null
  tolerance let them land rather than causing them, and nothing has produced one since. The
  conclusion stands even though the cause did not: a sink that accepts a null identity stores
  whatever a mis-wired emitter sends. **`mock_id` is validated against the REAL registry and CROSS-CHECKED against
  `paper`** (`{mock_id:'paper-1', paper:'AFM'}` is refused), so one mis-wired emitter cannot file
  every APM intro under AFM.
  ⚠️ **CLAIM CEILING, verbatim:** all three are CLIENT-TRIGGERED, so **WHO is trusted and WHETHER is
  not** — a blocked fetch undercounts, an authed student with curl overcounts their own row.
  Affordable only because **NOTHING READS THESE AT SERVE TIME**; a wrong row costs a wrong count,
  never a wrong serve. Do not wire a serving decision to one without revisiting that.
  `case_opened` is client-side ON PURPOSE: a Next `<Link>` prefetch renders the RSC payload on
  hover, so a server-side emit would report a case as opened by a student who moved their mouse
  past it, and an overcount is the one error a bounce metric cannot absorb. It fires on the SUCCESS
  arm only — 404 redirects, `!ok` is an error page, and 402 shows an upsell rather than a case.
  Walked live end-to-end 2026-08-12 (synthetic user, scoped-deleted, zero residue): all four rows
  attributed, one per view despite Strict Mode, and the walk user ended with **0 rows on
  `acca_case_progress`/`acca_mock_attempts`/`acca_case_marking`** — i.e. it WAS the
  opened-and-bounced case, previously invisible. Evidence:
  `docs/rollbacks/surface_events_walk_20260812.json`.
  **MIGRATION BACKFILLED 2026-08-12 — `supabase/migrations/20260812120000_acca_funnel_events.sql`.**
  The table was hand-created with no file, so it existed in production and NOWHERE in the repo: a
  fresh `supabase db reset` produced a schema where both sink routes fail at their INSERT, silently
  on the older one. Written from the LIVE catalogue (pg_attribute/pg_constraint/pg_indexes/pg_class),
  not inferred from the inserts — which would have missed the PK, all three btree indexes, the FK
  and RLS. No-op against production; carries a DRIFT CHECK that RAISES rather than half-applying,
  because `event_type` is NOT NULL with no default and an `ADD COLUMN` convergence would leave a
  state no environment has. ⚠️ **`user_id` is `ON DELETE SET NULL`, which is a LIVE ANALYTICS
  HAZARD**: deleting an auth user silently converts their funnel rows into rows attributable to
  nobody instead of removing them, so any synthetic/burner teardown must delete the funnel rows
  FIRST or the counts quietly rot. Not changed to CASCADE — that migration reconciles the repo with
  production and must not alter it. Flagged, not fixed.
  ⚠️ **`APM_CASES` IS NOT IN `.env.local`** — a local walk of these surfaces must set it explicitly
  or every route 404s. It IS set for Production; confirm the flag from an UNAUTHENTICATED probe
  (`/api/acca/case/list?paper=AFM` → **401 = flag on**, 404 = flag off; both routes check the flag
  before auth).
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
- **SBL — THE THIRD ACCA PAPER (2026-08-17/22, `feat/sbl-foundation` **MERGED to `main` at
  `4918b17`**).** Foundation + **batch A: 5 drills in `acca_drills`, `approved` and
  `published=false` BY DECISION** (P-DB9 — see the GATE-P bullets below). Still no routes, no
  price, no entitlement; `SERVED_PAPERS` deliberately excludes SBL.
  **`scripts/sbl-framework.ts`** is the AFM/APM analogue: 138 outcomes, 33 sub-areas, sections A–H,
  92 at [3] / 46 at [2]. **GENERATED, never hand-written** — `npm run build:sbl-ledger --
  --emit-framework` emits it from the SAME parse that builds the crosswalk (one parser, two
  artefacts); the file says EDIT THE EMITTER. Fixture `npm run test:sbl-framework` (1509 checks,
  auto-discovered, gate 58 → 59) tests the EMITTER as much as the file.
  **THREE WAYS SBL IS NOT APM/AFM, each fixture-pinned, each a live mis-mapping risk:**
  **(1) FIVE professional skills, and NOT a superset** — APM/AFM carry one combined
  `analysis_and_evaluation`; SBL marks **Analysis** and **Evaluation** separately, Evaluation
  absorbing ESTIMATE and Analysis absorbing ENQUIRE. The fixture pins that
  `analysis_and_evaluation` must NEVER appear here. **(2) NO EXAM SECTIONS** — one 100% integrated
  case study, three compulsory tasks, 20 of 100 PS marks, pre-seen two weeks ahead;
  `section_a`/`section_b` are asserted ABSENT so a consumer branching on them cannot be pointed
  here. **(3) NO mode / calculation set** — AFM's `LoMode` + `QUANTITATIVE/MIXED/DISCURSIVE_LOS`
  and APM's `CALCULATION_LOS` route numeric verification; SBL has no calculator families and a
  per-LO mode judgement does not exist, so inventing one would be fabricated routing data wearing
  the shape of parsed data. `COMMAND_VERBS` are DERIVED (leading word + observed levels), so they
  cannot drift from the descriptors.
  ⚠️ **TWO LEVEL MARKERS ARE MALFORMED IN THE PUBLISHED PDF** — A2d renders `[3}`, H5a renders
  `[3)`. Both are level 3. A strict `]` match yields 95/43 instead of 92/46; the regex is a
  character class **on purpose** — do not "tidy" it.
  **THE CROSSWALK — `docs/SBL_CROSSWALK_LEDGER.md` + its committed generator
  `scripts/authoring/build-sbl-crosswalk-ledger.ts`.** One row per outcome, a STATED ADAPT
  threshold (object · output · content-survives), a named NEAREST on every NEW. **35 of 138
  (25.4%) covered, REUSE 0.** Replaces a 35% headline whose defensible range was 17–53%.
  **T1 EXCLUDES `mock_only` REQUIREMENTS** (Grant-ruled 2026-08-18) — reserved exam content
  teaches nobody until it is sat and spending it consumes the mock; a standing property of
  reserved content, not an SBL decision. Eligible pool = 154 drills + 23 practice case
  requirements = **177**, of which 35 are claimed, so **142 published assets back no SBL outcome**;
  a further 15 requirements are reserved and excluded.
  **THREE GATES, and the second and third exist because the first was not enough:** completeness
  (a parsed outcome with no verdict refuses the write) · **`assertNarrativeNumbers` — PROSE vs
  TALLIES**, because the verdict gate read verdicts and never read prose, which is how *"Five of
  the six sit in section G"* shipped wrong (it is four). Every narrative number-word must be
  DERIVED (recomputed here from `los` + `VERDICTS`, deliberately NOT from `render()`'s variables —
  a gate that trusts the renderer cannot catch the renderer being wrong), ASSERTED (undrivable,
  with a written reason) or RHETORICAL. **Ceiling: number-WORDS only; a hand-typed DIGIT in prose
  still gets through.** · **`assertCorpusSnapshot`** — the corpus counts were listed as DERIVED and
  never were (this script has no DB access by design), so they are now a declared `CORPUS` block
  with an `as_at` date and its query, printed in the rendered ledger. `--verify-corpus` is the
  derived path, opt-in (needs env), importing supabase-js dynamically so the PDF path never loads
  it. **A false DERIVED claim is worse than an honest JUDGED one — it tells the next reader not to
  check.**
  ⚠️ **`docs/sbl/` is gitignored WHOLE-DIRECTORY** (`docs/*.pdf` does not cross a `/`); all nine
  sources are registered fetched-not-stored in `docs/evidence/sources.json` (`SBL-GUIDE`,
  `SBL-E1`..`SBL-E7`, `SBL-CHANGES`).
  ⚠️ **OPEN:** outcomes ≠ marks (weighting needs `SBL-E1`..`SBL-E7`, of which four pages of one
  report have been read) · an ADAPT is not a small job (34 ADAPTs ≠ 34 easy wins) · nothing is
  wired to the framework yet. See `docs/AFM_SURFACED.md`.
- **DECLARED IS NOT SERVED — `ACCA_PAPERS` vs `SERVED_PAPERS` (`lib/acca/paper.ts`, 2026-08-18).**
  `ACCA_PAPERS` = APM · AFM · **SBL** (declared: vocabulary exists). `SERVED_PAPERS` = APM · AFM
  (content, a Stripe price, a resit diagnostic, a surface). **`strictPaper` RETURNS 'SBL'** — an
  authorisation gate must be able to NAME a paper to refuse it — and **`servedPaper()` refuses
  it**. Use `AccaPaper` for VOCABULARY (syllabus sections, PS descriptors); use **`ServedPaper`
  for anything a customer can reach**, because a key in a price map is a promise the thing
  exists, and the compiler should refuse an SBL price rather than accept a blank one.
  **THE COMMERCE BOUNDARY IS THE SHARP CASE:** left alone, `paper=SBL` would have passed
  checkout's null check and died indexing `PRICE_IDS` — a clean 400 turned into a 500 about a
  missing env var. `resolvePaper` / `paperFromRouteParam` / `paperForCaseRow` / `paperHref` /
  the surface-event sink are all **`ServedPaper`** now.
  📐 **THE EXHAUSTIVE BREAK FOUND NINE SITES, NOT THE SIX PREDICTED** (the extra three were
  checkout, subscribe and the resit runner), then ten more UI/route sites and **four FIXTURES
  that iterated `ACCA_PAPERS` where they meant served papers**. Adding the member early is what
  produced that list; adding it late would have produced the same list as bugs.
- **PER-PAPER CASE-GATE CONFIG — `GATE_CONFIG` (`lib/acca/case-gates.ts`).** C1/C2/C3 ask
  questions about A/B sections. **SBL has no sections** (one 100% integrated case study, three
  compulsory tasks), so for SBL they return **`applicable: false` with a reason**.
  ⚠️ **INAPPLICABLE IS NOT PASS** — an n/a gate is EXCLUDED from the aggregate, never counted
  green: a gate that passes for want of anything to check reads identically to one that checked
  and was satisfied. The field is set ONLY on inapplicable results, so an **APM/AFM report is
  byte-identical to the pre-SBL shape**. C4 is properly paper-aware: unchanged for a sectioned
  paper; for SBL it demands the whole five-skill set across the PAPER — the same rule asked of
  the unit that exists. `runCaseGates(paper, paperCode = 'AFM')`; the default is IMMATERIAL
  between served papers and that is fixture-proven, not asserted.
- **⚠️ THE FREE-TEXT SKILL-TAG TRAP, CLOSED.** `professional_skill_tags` is `text` with **no
  CHECK and no enum**; the marking path SPLITS it, and `judgeCaseMarking` fell back to
  *"(no authored descriptor on file for this skill)"*. **That is a silent MIS-SCORE, not
  degradation:** the unknown skill still enters the numbered rubric, still takes an equal share
  of the pool (`ceiling = pool / examinedSkills.length`), and is still banded by the model —
  against nothing. One typo mints a skill and takes marks off the real ones. Invisible while
  every paper had the same four tags; **live the moment a five-skill paper whose set OVERLAPS
  but does not match exists** (`analysis` vs `analysis_and_evaluation`). Now `unknownSkillTags()`
  validates against the paper's declared set, `case-mark-run` **REFUSES with a 409**, and the
  descriptor lookup **THROWS** — a throw, not a filter, because dropping the skill would silently
  re-weight the pool instead. Verified before shipping: **all 38 published case requirements and
  all 155 tagged drills validate**, so no live row's behaviour changed.
- **⚠️ SBL'S FIVE SKILLS ARE NOT THE FOUR PLUS ONE.** APM/AFM carry ONE combined
  `analysis_and_evaluation`; SBL marks **`analysis`** and **`evaluation`** SEPARATELY, and
  neither is that skill halved — SBL's Analysis absorbs **ENQUIRE**, its Evaluation absorbs
  **ESTIMATE**, and neither act appears in the four-skill descriptors at all. **NEVER map an SBL
  tag onto an APM/AFM one by name.** Fixtures pin that `analysis_and_evaluation` must never
  appear in the SBL map and `analysis`/`evaluation` never in the APM/AFM ones.
- **THE BAR FOR ADDING A PAPER — `npm run test:paper-vocabulary` (53 checks, gate 59 → 60).**
  Adding a paper touches `AccaPaper`, which keys the PS descriptor maps and the gate config —
  **two inputs to a MARKING CALL**, so **P-M1** applies. The claim defended is narrow and
  mechanical: *for APM and AFM the model sees the same bytes, so the call's SHAPE is unchanged,
  so no band matrix is owed.* **If any pin moves, that argument collapses and the matrix IS
  owed.** Five pin families: prompt bytes (2 papers × 3 variants) · the numbered
  `examinedSkills` rubric string · the descriptor maps · `apportion` across the full 5⁴ band
  cross-product · `runCaseGates` output. Plus a **live-corpus `runCaseGates` diff** over both
  published papers (default AND explicit `paperCode`, violation strings included).
  ⚠️ **THREE OF THE FIVE WERE CAPTURED PRE-CHANGE; TWO WERE NOT, and the fixture says so.**
  PIN1/3/5 are true pre-change captures. PIN2 and PIN4 were captured after — PIN2's pre-change
  validity rests on PIN3 (it is a pure function of the descriptor maps plus a one-line template),
  PIN4's on `git diff` showing `apportion`/`BAND_MULTIPLIER`/the ceiling formula untouched.
- **RE-TAGGING A PUBLISHED CASE REQUIREMENT — `scripts/authoring/retag-afm-case-requirement.ts`
  (COMMITTED, P-DB6).** SEPARATE from `retag-afm-drill.ts` for a load-bearing reason: **a
  requirement's `lo_code` is DUPLICATED INSIDE `answer_schema`** (every criterion carries its own
  `"lo"`), so moving the column alone leaves a rubric marking against the old code — **and a
  P-DB4 check asserting "exactly one field moved" would PASS on that half-done state**. It
  asserts BOTH fields move together AND that the schema differs from before by exactly the
  rewritten `lo` values, every other key byte-identical, with no stale reference surviving.
  **First use 2026-08-18: Castlereagh Utilities (iv) `A3a` → `A1c`** — 13/13 other fields
  byte-identical, 2 criterion `lo` values rewritten, `professional_skill_tags` unchanged, gate
  barrier re-run LIVE (C1–C4 all PASS, span still B/E/A).
  📐 **THE FINDING GENERALISES BEYOND THE ROW: A GATE THAT REQUIRES COVERAGE THE CONTENT DOES
  NOT NATURALLY SUPPLY WILL MAKE AN AUTHOR REACH FOR A CODE, AND THE GATE CANNOT SEE THAT IT
  CAUSED IT.** C4 requires a Section A case to examine all four skills; (i)(ii)(iii) held the
  other three, so (iv) had to be `communication` — and a communication act still needs a
  technical `lo_code` to hang on. The author reached into section A and landed on the ESG
  outcome. **C4 passes either way — it reads `professional_skill_tags` and never looks at
  `lo_code`.** The rubric awarded 3 marks for cost-of-capital content and 3 for the audience,
  and **zero for ESG**.
- **Batch lifecycle:** generate (`--*-batch`) → 6 gates → co-founder independent recompute →
  blind GPT adversarial review (CLOSED RULINGS present) → adjudicate → **CONTENT SYNC (see
  below)** → **flip by EXPLICIT-id SQL** in the Supabase editor (reconcile approved-set vs
  journal FIRST; demote any un-reviewed `approved` row back to `candidate` in the same
  transaction).
- **⚠️ GATE-P's THIRD ARM — CONTENT (doctrine `P-DB8`, ruled 2026-08-21).** **A FLIP CARRIES
  STATUS, NOT CONTENT.** The reconcile compares the DB's approved-set against the journal's
  reviewed-set — two sets of IDENTIFIERS, entirely a check on STATUS. It never opens a row. So a
  row can be correctly `candidate`, correctly journalled as reviewed with every finding applied,
  and still hold text superseded days ago, **because the reviewing happened somewhere the
  reconcile does not look** — which is exactly what the five SBL rows did between 2026-08-19 and
  2026-08-21 (four cold reads applied only to `docs/rollbacks/*.json`; a flip would have
  published two blockers and a live arithmetic error).
  **The arm:** `lib/acca/reconcile-content.ts` — pure, diffs `context_text` / `model_answer` /
  `answer_schema` / `hint` / `full_reveal` against the reviewed draft, resolved through the
  SHARED `loadDraft` (so A4 reads `SBL-A4.2.json`, never its superseded namesake) and printing
  which file it read. Object KEY order is not a difference (jsonb); **ARRAY order is** (`criteria`
  is an ordered rubric); strings are BYTE-EXACT; unpaired blocks BOTH ways; an ambiguous pairing
  key is refused, never guessed. `CONTENT_FIELDS` is imported by the check AND the sync so they
  cannot disagree about what "content" means. Fixtures `npm run test:reconcile-content` (61,
  every failure path). Runner `npm run reconcile:sbl-content`. **The sync that makes it green:**
  `scripts/authoring/sync-sbl-content.ts` (P-DB3 snapshot → explicit-id writes → P-DB4 both
  halves → re-runs the arm). **Build the arm BEFORE the sync so you can watch it go red** — and
  if a row reports green, that may be correct (SBL-A5's read predated the insert); never tune the
  check to match a prediction.
- **⚠️ A FLIP GATED ON A CODE CHANGE NEEDS THAT CODE DEPLOYED, NOT COMMITTED (`P-DB8(b)`).** Per
  P-DB1 a DB write is not branch-scoped: the flip ships the instant it runs while the guard sits
  on a branch. Merge and confirm the deploy first, then flip.
- **⚠️ THE TWO-STEP GATE MAY BE RUN HALF-WAY, DELIBERATELY (doctrine `P-DB9`, ruled 2026-08-22).**
  `approved` = the content passed review; `published` = **intent to serve**. SBL batch A is
  `approved`/`published=false` because it cleared five cold reads and all three arms while SBL has
  no surface, no price and no entitlement. Leaving it at `candidate` would cost `candidate` its
  meaning — a reader could not tell "not reviewed" from "reviewed, deliberately not served".
  **Runner: `scripts/authoring/approve-sbl-batch-a.ts` (committed P-DB6, DRY RUN by default,
  re-runnable read-only so step two's owner can re-run the arms).**
  🔴 **AN INVARIANT DIED WITH IT: `acca_drills` was `approved == published == 154`, so
  "approved-but-unpublished" read as a leak on sight. It no longer does** — approved is now 159,
  published still 154. **Every future reconcile must ALLOW-LIST those five by id**, the same
  disposition `47c9d5ce` has; an *unregistered* approved-but-unpublished row still hard-stops,
  because the register is the only thing separating a decision from a leak.
  **`P-DB9(a)` — THE JOURNAL ARM.** The status arm compares the DB's approved-set against a
  reviewed-set it is HANDED (a `--journalled` flag, a literal), so it takes on trust the very thing
  it looks like it verifies. The third arm opens `APM_BUILD_CONTRACT.md` + the review packs and
  asserts a record EXISTS and NAMES the row in full. ⚠️ **Ceiling: it cannot prove the review was
  good and is not a substitute for reading the pack.**
  **`P-DB9(b)` — SAY "NOT A TRANSACTION".** supabase-js has no transaction wrapper, so the script
  REFUSES to write when a demotion is required and prints the `BEGIN`/`COMMIT` block instead.
  **Step two carries a RE-READ obligation** — by then the content is months old and the reviewer's
  context gone, and **all three arms go green on stale-but-unchanged rows**. Green means the row
  still holds what was reviewed, never that the review is still right. Stated for its owner in
  `docs/AFM_SURFACED.md` beside the SBL surface item, not only in the batch's own block.
- **Serving scope sweep:** `scripts/test-drill-paper-scope-sweep.ts` (`npm run
  test:drill-paper-scope-sweep`) — every `acca_drills` query under `app/` and `lib/` must
  CONSTRAIN `paper_code` (`.eq`/`.in`), or carry a written exemption keyed on its own select-list.
  Built when both id-addressed tutor fetches were found with no paper predicate at all — safe only
  while every published row belonged to a served paper, and unsafe the moment SBL rows exist.
  **`SERVED_PAPERS`, not one guessed paper:** an id is globally unique, so pinning an id-addressed
  fetch to a single resolved paper 404s a legitimate AFM resume (the G1 regression).
- **MAP BEFORE YOU CLOSE (standing lifecycle rule).** Every batch's FINAL commit MUST update
  this CODE MAP with the new family: module path, its gates, its fixture suite, and any new
  mechanism it introduces. **A batch whose map entry is missing is NOT closed.**

## Where work is tracked
- Persistent cross-session memory: `memory/MEMORY.md` (index) + `memory/*.md` (one fact
  each). Check it at session start; write project/feedback facts as they arise.
