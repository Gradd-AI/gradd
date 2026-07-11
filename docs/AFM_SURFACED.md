# AFM_SURFACED — the single living open-items list

**This is the ONE place current open items live.** It is rewritten each session (edited in place, not appended). As of 2026-07-11 the `APM_BUILD_CONTRACT.md` journal is **append-only pure chronology** — do not scatter new "STILL OPEN" blocks through per-session banks; update THIS file instead. Standing rulings → `GENERATOR_DOCTRINE.md`; incident rules → `GRADD_BUILD_HARDENING.md`.

*Last refreshed: 2026-07-11.*

## AFM build track (live)
- **AFM batch-1 (NPV/B1a) — round-2 fix-verification review PENDING.** 4 drills `status='candidate'`; patterns P1–P5 fixed in code, drills re-gated (all five gates green). Reviewer pack: `docs/reviews/AFM_BATCH1_NPV_ROUND2_REVIEW_PACK.md` (Drill 2 + Drill 4 full; Drill 1 + Drill 3 changed fields). Focus: Drill 2 allocation + Drill 3 13.24% sensitivity. **No approval flip / `published=true` until round-2 clears.**
- Next calculator after batch-1 approval: **IRR/MIRR** (roadmap order in `GENERATOR_DOCTRINE.md`).
- Banked idle-session: exhaustive journal-lesson-vs-rulebook reconciliation (audit item (c)).

## APM content + launch
- Professional-skills marking = biggest exam-readiness gap (~20% of the paper currently unassessed).
- Timed mock / exam-craft mode — none exists (examiner reports cite time management as a failure cause).
- APM content thin: Section A one-drill-per-LO (11/12 live-untested); Section B sub-areas; compound-verb LOs untested.
- **PAYWALL on the case path** — `APM_CASES` must NOT reach Production without it (auth + flag only today; counted tracked but unconsumed).

## Data capture & persistence
- **APM/AFM tutor transcripts are NOT persisted.** IB/LC has `session_messages` + a look-back path; APM has **nothing** (no `message_history`, no `session_messages` row — the sessions table is IB/LC-shaped). Violates the Horizon-1 capture rule; blocks the weekly transcript-review ritual, student look-back, and a future enterprise audit view. **Split:**
  - **Persistence WRITE = NEAR-TERM** — conversations are being LOST daily under live ad traffic. Best-effort append per turn, mirroring the `acca_drill_attempts` swallow; recommended new `acca_drill_messages` table (RLS: student reads own, `user_id = auth.uid()`). Diagnosed 2026-07-11 (design ready).
  - **Look-back UI on `/acca/progress` = normal-queue build.**

## Banked — product-scoping Phase 2 (from the /dashboard leak fix)
- Per-account nullable `exam_date` + student-settable affordance (replaces the baked `LC_EXAM_DATE`/`IB_EXAM_DATE` constants).
- `subject`-default retirement with onboarding (retire the `LC_BUSINESS` masquerade at the schema).
- Name capture for non-onboarded (magic-link / admin-seeded) accounts.

## KPMG demo (near-term)
- **Coffee message to the KPMG contact — NOTHING GATES IT; highest-value action on the board.**
- One-pager final export; demo dry-run on Grant's device the day before the meeting.

## GTM + campaign (mostly hands-off)
- Core campaign (UK/IE/UAE @ €10/day) judgement **~24/07** — hands-off until then; metric = core-market signups.
- Blog post 1 self-publishes Sun 13/07; partner sends; redpen ad (Canva); Search Console; Reddit karma (r/ACCA ~5-comment-karma gate — build in r/Accounting first).
- Demand test: r/ACCA + OpenTuition; free-drill + paid-tutor simultaneous launch; Stripe ~€49–69/mo.

## Cross-product
- IB a generation behind: Mia/Aoife still on the leaky instructed-withholding engine (APM proved the structural fix — now unblocked to rebuild); IB Econ Layer 2 hybrid generator broken (~75% reject, needs pattern-level regen); IB BM Layer 2 ungenerated.
- W_WEAK weakness-steering session after ~2 weeks of real attempt-log data (`memory/project_wweak_unblocked`).

## Security & ops
- **Rotate the Supabase secret API key** (pasted in chat 04/07 — live security item).
- Migration hygiene backfill — 4 missing Supabase migrations (`memory/project_migration_hygiene`).
