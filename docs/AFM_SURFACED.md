# AFM_SURFACED — the single living open-items list

**This is the ONE place current open items live.** It is rewritten each session (edited in place, not appended). As of 2026-07-11 the `APM_BUILD_CONTRACT.md` journal is **append-only pure chronology** — do not scatter new "STILL OPEN" blocks through per-session banks; update THIS file instead. Standing rulings → `GENERATOR_DOCTRINE.md`; incident rules → `GRADD_BUILD_HARDENING.md`.

*Last refreshed: 2026-07-12.*

## AFM GO-LIVE — delivery layer (IN FLIGHT, 2026-07-12)
Audit found the 8 approved AFM drills are **unreachable** if published — every student-facing ACCA route hardcodes `paper_code='APM'`. Sequenced plan APPROVED (full artefact: `ClaudeSend.txt`; decision bank: `APM_BUILD_CONTRACT.md` session 2026-07-12 pt.2). Build order **0 → G3 → G1 → G4 → G2** (G5 interleaved). **G3/G1/G4/G5/G2 DONE + pushed to main (2026-07-12).** Only **G7 (publish flip) remains** — gated on Grant's explicit confirm + `next build` green + the mandatory post-flip authenticated HTTP AFM transcript. **APV-batch precondition RESCINDED (Grant + adjudicator, 2026-07-12): no dependency — the 8 drills (batch 1 NPV + batch 2 IRR/MIRR) are fully verified and stand on their own; content batches continue in parallel and never gate the flip.**
- **Billing = BUNDLE** (ruled): one ACCA entitlement covers all papers; `apm_*` columns stay as the ACCA flag (no entitlement migration); free counter goes PER-PAPER (new `profiles.afm_teach_throughs_used` — the one migration). No AFM Stripe SKU (G6 skipped) — APM payers get AFM = zero-cost beta cohort for demand data.
- **G3 (teaching branch) = v1-LITE** (ruled): paper-aware system prompt + pre-baked verified reveal. **HOLD: persona string + sample transcript to Grant before commit.**
- **G5a/G5b DONE (2026-07-12):** `hasActiveAPMAccess`→`hasActiveACCAAccess` (bundle; old name kept as `@deprecated` alias for the APM case/mock routes); 3 inline copies collapsed. Per-paper counter live: `profiles.afm_teach_throughs_used` migration applied + verified (integer/default 0/NOT NULL; 9 profiles all 0). APM payer now unlocks AFM (beta cohort). Stripe/checkout untouched (G6 skipped).
  - **SURFACED DEBT — `capColumn` ternary.** The `paper === 'AFM' ? 'afm_teach_throughs_used' : 'apm_teach_throughs_used'` ternary is duplicated in 3 files (tutor route, tutor page, dashboard). Fine for 2 papers; at **paper #3 it must become a lookup map** (e.g. `TEACH_THROUGH_COL: Record<AccaPaper,string>`) in `lib/acca/paper.ts`, referenced everywhere — before adding the third paper's counter, not after.
- **G7 (publish flip) DONE — AFM IS LIVE (2026-07-12).** Flipped the 8 reviewed drills → `published=true` (SQL Editor, guarded, `published_afm=8`/`approved_unpublished_afm=0`). All exit criteria passed on the LIVE production route (authenticated): 3a AFM transcript (bundle proof — paid erasmoose got AFM teaching) acked by Grant; 3b discovery (switcher/areas/tutor load, demoted A3/B4 absent); 3c APM regression clean; 3d per-paper counter (`afm_` 0→1, `apm_` 0, via reversible free-toggle, pass restored).
  - **Pipeline leak found + demoted:** DB had 10 approved AFM rows vs 8 reviewed — `47c9d5ce` (A3a ESG) + `d0727187` (B4c valuation), early 07-09 pilot exemplars set `approved` manually with NO review record, were DEMOTED to `candidate` (not deleted). **If wanted, they re-enter the FULL pipeline (gates → blind GPT → adjudication) as their own A3/B4 batch.** Reconcile-before-flip rule now in `CLAUDE.md`.
  - **Follow-ups (not blockers):** (a) optional explicit "early access / new drills weekly" framing on the AFM view (today: no coverage claim, 1 area shown — honest by construction); (b) `/acca/subscribe` is APM-branded ("Full APM drill bank") — AFM free user at the cap sees APM copy; neutralise to ACCA under the bundle.
- **PRE-EXISTING GAP — coordinator/org layer is paper-BLIND.** G4 made the STUDENT `/acca/progress` view paper-aware (JOIN-based, no migration); the COORDINATOR functions (`getCohortReadiness` / `getCohortHeatmap` / `getTraineeDetail` in `lib/org/queries.ts`) were deliberately left paper-blind — they read `acca_drill_attempts` unfiltered and bucket by the 2-char LO prefix, which collides across papers. **Harmless today (KPMG demo + any real cohort is APM-only), becomes real the DAY a mixed APM+AFM cohort exists** — a trainee's AFM attempts would blend into APM cells under APM labels. `cohorts` already has a `paper` column to key the fix off. Close at pilot-time when a mixed cohort is actually on the table; not a go-live blocker.
- **DEFERRED post-launch — v1-FULL live numeric grader.** Wire `lib/acca/numeric-verifier.ts` live (parse student figures → per-component verdicts → diagnosis). Needs a jsonb→runtime registry (serialized `answer_schema` has string refs; runtime `AnswerSchema` needs function-valued `recompute` — `numeric-verifier.ts:16-20`), a figure-entry UI, verdict plumbing. Not needed for go-live: numbers are already frozen in the prose fields at generation. Revisit once real AFM attempts exist (ties into EXAM REHEARSAL phase 4 workings grid).

## AFM build track (live)
- **AFM batch-1 (NPV/B1a) — 4 drills PUBLISHED (2026-07-12, G7).** `status='approved'`, `published=true`, live on `/acca` (AFM). Round-2 fix-verification cleared; P1 portfolio-NPV line + D2 teaching sentence + D4 "overseas"→"North American" applied; all five gates green.
- **IRR/MIRR (B1c) batch 2 — 4 drills PUBLISHED (2026-07-12, G7).** `status='approved'`, `published=true`, live. Two hostile rounds (blind GPT) to convergence: round-1 findings 1–5 accepted (FIX 1 conflict fund-choice decision [pattern-level] · FIX 2 · FIX 3 "stated reinvestment rate" · FIX 4 · FIX 5) / 6 rejected; round-2 cleared with one tidy (712cf3aa same-basis dedupe). All gates green. **Next calculator: APV (roadmap).**
- Round-2 review pack (`docs/reviews/AFM_BATCH1_NPV_ROUND2_REVIEW_PACK.md`) — delete when stale.
- **Generator IRR path (`draftIrrDrill` + prompt + `--irr-batch`) unbuilt** — build when IRR volume justifies it (batch 2 authored by hand via the shipped calculator, Option A).
- Banked idle-session: exhaustive journal-lesson-vs-rulebook reconciliation (audit item (c)).

## APM content + launch
- Professional-skills marking = biggest exam-readiness gap (~20% of the paper currently unassessed).
- Timed mock / exam-craft mode — none exists (examiner reports cite time management as a failure cause).
- APM content thin: Section A one-drill-per-LO (11/12 live-untested); Section B sub-areas; compound-verb LOs untested.
- **PAYWALL on the case path** — `APM_CASES` must NOT reach Production without it (auth + flag only today; counted tracked but unconsumed).

## Data capture & persistence
- **APM/AFM tutor transcript persistence — WRITE LIVE** (Horizon-1 gap closed 2026-07-11). `acca_drill_messages` migration applied + 7-check verified (`6f5d143`) + §10 two-row append shipped (`e94a6ec`) — every response-producing leg logged (attempt/hint/teach/correct/warm/reveal), swallowed like the attempt-log, RLS student-reads-own.
  - **Look-back UI on `/acca/progress` = normal-queue build (STILL OPEN).**
  - **Production proof pending:** Grant's next erasmoose drilling session verifies the transcript + attempt-log writes together.

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
  - **Pricing (decided in principle 2026-07-11):** NO per-try charging — metering rehearsal attempts taxes the practise-failing behaviour we sell and poisons subscription psychology. Structure: free tier = ONE full rehearsal sitting (the conversion taste; "sit APM before you sit APM, free, marked" = ad / results-day hook); pass + subscription = unlimited rehearsals (reserved mock cases stay reserved per attempt window). The free-single + unlimited-on-paid structure stands as the working model. **OPEN QUESTION** (downgraded from decided-in-principle): a one-off "Rehearsal + coached debrief" downsell SKU (~€25–29 on €99-checkout abandonment) — Grant reconsidering; may not want any standalone charge at all. If ever built, a fixed product for the check-before-the-real-exam buyer, never a per-attempt meter. Final call deferred to flagship build time, with conversion data in hand.
  - **Content / IP position (decided 2026-07-11):** all scenarios are ORIGINAL works built to the public syllabus structure — never reproduce or derive from ACCA past papers, specimens, or marking schemes (copyright + brand-fatal for enterprise). Exam FORMAT facts (timing, sections, marks splits, descriptors as marking criteria) are uncopyrightable facts; the rehearsal interface is exam-SHAPED in house design, never a pixel-clone of ACCA's CBE trade dress. Marketing: "exam-standard conditions", never "real ACCA questions"; non-affiliation line everywhere. Adversarial generation from the framework = provably original by construction. Solicitor blessing of the content position when enterprise contracts arrive — procurement may request it.
  - **Conversion design — free rehearsal gate placement (decided 2026-07-11):** the VERDICT is fully free and ungated — score, per-requirement marks, pacing diagnosis, descriptor bands (the proof-of-power moment; a fuzzy verdict reads as a demo). The gate is the REPAIR: Ezra's coached debrief per weakness + drill-back into each flagged area = paid. Conversion line pattern: *"You'd have scored 41 today. Here are the six habits that cost you 23 marks — Ezra can coach every one before [sitting]."* Same structural split as the resit diagnostic: diagnosis free, cure paid. Secondary: retake-in-30-days framing (improvement measurement needs the coaching). NEVER: gated scores, pay-to-see-marks, countdown pressure — converts by being genuinely revealing, then charging for the fix.

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
