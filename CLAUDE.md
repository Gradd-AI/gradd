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
- **Code owns every number.** In numeric drills (AFM) and marking, deterministic code owns
  every figure AND every figure-vs-figure verdict (allocation, ranking, sensitivity,
  accept/reject, band→marks); the model authors PROSE only, and never re-checks a number.
  Canonical: `docs/AFM_NUMERIC_VERIFICATION_DESIGN.md` + `lib/acca/{npv,numeric-verifier,
  validate-schema,validate-afm-prose}.ts`.

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
  futures (whole contracts, linear basis decay → lock-in rate) · **K3** currency options (whole
  contracts, premium in the quoted currency, assume-exercised) · **K4** currency swap (stated
  fraction × swap rate + residual × forward rate — thin evidence, flagged). `quote_direction`
  (foreign-per-home / home-per-foreign) and `residual_policy` (immaterial / forward-topup) are
  PARAMETERISED PER DRILL, code-decided, never hardcoded or model-chosen (Step-0 ruling,
  2026-07-22) — sources genuinely quote both directions. Gates beyond the 6: **15** whole-contract
  integrity, **16** basis-decay reconciliation, **17** currency-direction integrity (catches a quote
  inversion either way — the canonical student AND authoring error), **18** premium-currency check,
  **19** best-method verdict integrity (all in `validate-schema.ts`, cores in `fxhedge.ts`). Money
  components use a PLAIN relative tolerance (no floor) — fx-hedge outcomes are never legitimately
  near-zero, unlike international.ts's near-nil-tax edge case the floor kind was built for; rate-shaped
  components (`unexpired_basis`/`lock_in_rate`) use a tight ABSOLUTE tolerance with `unit:'rate'`
  (never a currency-pair unit string, which the tolerance lint misreads as money). Fixtures:
  `scripts/test-fxhedge.ts` (`npm run test:fxhedge`) — reproduces the Okan Co MMH figures and the
  Abertafol premium formula exactly. `--fxhedge-batch` in `scripts/generate-afm-drills.ts`
  (`draftFxHedgeDrill` + `SUBMIT_FXHEDGE_SCENARIO_TOOL` + `buildFxHedgeUserPrompt`; `spec.fx_*`
  fields carry the code-decided conventions). area-entry ranks 70–73 (own band, K1 forward+MMH
  entry). 4 candidates generated + gated 2026-07-22 (`docs/reviews/AFM_BATCH_FXHEDGE_REVIEW_PACK.md`)
  — awaiting co-founder recompute, not flipped.
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
