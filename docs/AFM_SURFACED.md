# AFM_SURFACED — the single living open-items list

**This is the ONE place current open items live.** It is rewritten each session (edited in place, not appended). As of 2026-07-11 the `APM_BUILD_CONTRACT.md` journal is **append-only pure chronology** — do not scatter new "STILL OPEN" blocks through per-session banks; update THIS file instead. Standing rulings → `GENERATOR_DOCTRINE.md`; incident rules → `GRADD_BUILD_HARDENING.md`.

*Last refreshed: 2026-07-11.*

## AFM build track (live)
- **AFM batch-1 (NPV/B1a) — ALL FOUR `status='approved'`** (`published=false`). Round-2 fix-verification cleared; P1 portfolio-NPV line + D2 teaching sentence + D4 "overseas"→"North American" applied; all five gates green on all four. **NEXT GATE: the publish decision** (`published=true` is a separate go-live call — not automatic).
- **IRR/MIRR (B1c) = calculator #2** — opening now per the roadmap; component DAG + fixtures + batch spec proposed (awaiting approval).
- Banked idle-session: exhaustive journal-lesson-vs-rulebook reconciliation (audit item (c)).
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

## Enterprise / pilot-ready
- **Enterprise transcript visibility — TIERED design** (decided in principle 2026-07-11; built at pilot-contract stage):
  - **Tier 1 (default, exists today):** coordinator dashboard shows verdicts / heatmaps / readiness / activity — about the work, never the words.
  - **Tier 2 (the sellable middle, NOT YET BUILT):** per-trainee evidence view — attempt-level outcomes with Ezra's content-neutral diagnosis labels ("evaluated the company, not the report — scepticism gap") repurposed as manager-readable evidence. Coachable specifics without raw transcripts. The `acca_drill_messages` schema (`call_type`, `outcome`, `drill_id`) already carries what this needs.
  - **Tier 3 (full transcripts):** contract-level toggle ONLY, disclosed-by-design at org enrolment (trainee told at invite that sessions are visible to firm L&D), positioned as exam-prep support not performance management. Never a silent default — surveillance kills the practise-badly-in-private signal the product depends on.
  - **Privacy:** employer transcript access = new third-party disclosure; the privacy-page line (flagged in the persistence diagnosis) ships WITH whichever tier is built, shown to Grant before commit.
  - **KPMG discovery question** to add to the pitch set: *"When a trainee is flagged at-risk, what evidence does your L&D team want to see — the verdict, the diagnosed gaps, or the actual practice sessions?"*

## Product / roadmap
- **EXAM REHEARSAL — flagship** (upgraded from "fidelity strategy" 2026-07-11, Grant's call). The differentiator is the COMPLETE experience nobody else offers — a full paper under true exam conditions in a faithful interface + instant descriptor-marked results + per-requirement pacing diagnosis + coached debrief. ACCA's platform = empty shell, no marking; Kaplan = human-marked, days turnaround. We already own the hard 80% (marking engine, mock runner, descriptors, Ezra debrief). Positioning: **"Sit APM before you sit APM."** Anchors the €99 pass (B2C) and pre-exam-entry readiness verdicts (enterprise).
  - **Phased build** (~3–6 weeks of sessions; starts after AFM batch momentum, NOT now):
    1. Timed shell + exhibits split-pane (reading fidelity, clock pressure, no pause).
    2. Per-requirement pacing capture + pacing feedback in the marked debrief (time-starvation failure class — unique, we mark inside our own runner).
    3. Coached debrief surface: descriptor bands rendered student-visible (**closes the existing "bands invisible in UI" surfaced item** inside this build), Ezra walks the mark loss.
    4. Structured workings grid for AFM calc answers (doubles as verifier / OFR per-component capture).
    5. Spreadsheet response area LAST — built properly or not at all; until then, openly advise ACCA's free platform for spreadsheet-interface familiarity.
  - **Quality bar:** a janky exam shell is worse than none — each phase ships at house standard or holds.

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
