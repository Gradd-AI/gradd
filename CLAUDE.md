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
- **Session journal + standing decisions + SURFACED backlog (APM/AFM era):**
  `docs/APM_BUILD_CONTRACT.md` — reverse-chronological session banks; the live "SURFACED"
  open-items list and standing rulings live inside it.
- **Drill generation doctrine:** there is **no single `GENERATOR_DOCTRINE.md`** — it is
  spread across `docs/AFM_NUMERIC_VERIFICATION_DESIGN.md` (the numeric layer),
  `docs/TEACHING_ARCHITECTURE.md` (structural withholding), the generator
  (`scripts/generate-afm-drills.ts`) and its gates (`lib/acca/validate-schema.ts`,
  `lib/acca/validate-afm-prose.ts`). (Audit-flagged gap — see below.)
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

## Where work is tracked
- Persistent cross-session memory: `memory/MEMORY.md` (index) + `memory/*.md` (one fact
  each). Check it at session start; write project/feedback facts as they arise.
