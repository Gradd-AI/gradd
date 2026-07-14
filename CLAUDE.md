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

## Where work is tracked
- Persistent cross-session memory: `memory/MEMORY.md` (index) + `memory/*.md` (one fact
  each). Check it at session start; write project/feedback facts as they arise.
