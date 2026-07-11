> **⚠️ SUPERSEDED / HISTORICAL** — describes the IB/LC "Layer" build phase, now shipped to production. Kept for history. Current architecture: [GRADD_PRODUCT_MODEL.md](GRADD_PRODUCT_MODEL.md); build rules: [GRADD_BUILD_HARDENING.md](GRADD_BUILD_HARDENING.md).

# Layer 1 — Past-Paper Question System
## Start-Here Doc for the Next Build Session

*Drafted: 21 May 2026 evening, end of the diagram-audit / course_position session.*
*Read this first thing tomorrow. Don't start building until every section is read and every question is answered.*

---

## Where we landed today (context — don't skip)

**Layer 0 of the moat is live in production for both IB Business and IB Economics.** Exam-prep students now get paper/marks/command-term framing on session opening and pivot to exam-style questions instead of foundational teach-from-zero. Commits `61825c9` (IB Business) and `cb93b9b` (IB Economics).

Tonight's strategy chat covered Layer 1 (past-paper question system) and locked four major decisions before stopping for fatigue. Tomorrow we scope the remaining open questions, then hand to Claude Code.

---

## Strategic positioning (LOCKED — don't re-litigate)

### What Layer 1 is for

The biggest differentiator in PRIORITY 3.5 EXAM-PREP MODE. Without it, Mia "sounds like she knows it's exam time" but can't actually drill students like an examiner. With it, Gradd becomes a genuine alternative to Lanterna at 5% of the price.

### Sourcing — IBO past papers are OFF the table

**Hard no on using IBO past papers verbatim**, even "spun" or paraphrased. Three reasons (in priority order):

1. **Strategic.** IB parents are diligent buyers. The IB community is small and tightly networked. One whiff of IP grey-area in r/IBO or an IB Facebook group and conversion craters. Schools never license (Phase 3 dies). The positioning we want — *"the legitimate official-grade alternative to expensive human tutors"* — depends on being clean.

2. **Practical.** IBO actively monitors AI tutoring platforms. Lanterna, Kognity, OSC all licence content properly. Lanterna in particular has every incentive to take you down once you start cutting into their market. Automated similarity tools catch "spun" content. The cascade (cease-and-desist → DMCA → hosting/domain drop → app store removal → personal director liability) is brutal.

3. **Legal.** EU copyright covers question selection, sequencing, mark scheme logic, AND text. Spinning doesn't qualify for any fair-dealing exception when use is commercial and full-curriculum. Mark schemes are independently copyrighted.

**What IS clean and we use:**
- **IBO specimen papers** — IBO publishes ~3 per syllabus refresh, on their public site, for educational reference. Legal to quote with attribution ("specimen paper, IBO official"). Use as format anchors in marketing and the seed table.
- **Command terms** (define, explain, examine, discuss, evaluate, "to what extent") — discipline standard, not copyrightable.
- **Assessment objectives** (AO1/AO2/AO3/AO4) — public syllabus material, not copyrightable.
- **Mark band descriptors** — public in the IB Subject Guides we have in the project files. Reference, don't copy verbatim.

### The architectural choice — Path C (hybrid)

Three options were considered:

- **Path A** — full database of pre-authored questions (~300 per subject). Rejected: 25+ hours of content per subject, doesn't scale to ACCA/A-Level/IGCSE, content-treadmill business model.
- **Path B** — pure runtime generation, no seed table. Rejected: no quality floor, no regression detection, no defensible IP, no eval surface for future model upgrades.
- **Path C — small seed of curated anchors + Mia generates on demand from them.** Adopted.

**Why Path C wins long-term:**
- ~30-50 seed questions per subject is solo-founder-bandwidth viable
- Seed acts as few-shot anchor in Mia's generation prompts — quality floor enforced
- Scales to ACCA / A-Level / IGCSE: small seed per product, same architecture
- Becomes the eval set for model upgrades (Haiku → Sonnet, future Anthropic versions)
- Compounds into fine-tuning corpus by 2028 (defensible competitive position)
- Marketing artefact (mock exam packs, school-licensing pitches)

### The honest workflow

The phrase "hand-authored" caused confusion. Clarified:

- Mia/Claude drafts ~50 candidate questions per subject in batch
- Grant reviews each via a dedicated approval UI: question on screen, three buttons (approve / edit / reject), keyboard shortcuts
- ~30-60 seconds per question — **~100 minutes total** across both IB subjects, one time
- This is non-negotiable. Grant is the only person who can say *"yes, this is what an IB examiner would actually ask"*. There is no other quality gate.

### The three commitments (LOCKED)

1. **Seed quality bar.** Every seed question must be one Grant has personally approved. We don't pad for volume.
2. **Schema designed for compounding.** Field names and shapes built for Phase 2 (candidate promotion from live sessions) and Phase 4 (eval / fine-tuning) without rebuild.
3. **Seed is repo-tracked.** Database AND `seed/` folder as SQL or JSON. Today's drift lessons applied — strategic content in only one store is a drift bomb.

---

## What's already decided (don't ask these tomorrow)

- ✓ Path C — seed + runtime generation
- ✓ Seed size — ~30-50 questions per subject for the pre-launch minimum (target 50, accept 30 if quality bar requires)
- ✓ Coverage target per subject — every major topic_code, every command term, both SL and HL, all three papers
- ✓ Review UI required — keyboard shortcuts, approve / edit / reject
- ✓ Seed is repo-tracked alongside the live table
- ✓ Two IB subjects in scope for pre-launch. ACCA inherits architecture later.

---

## Open questions to answer tomorrow (in this order)

These six questions shape the schema and the build. Answer each one fully before moving to the next — don't try to answer all at once.

### Q1 — Schema shape and table name

Working draft of fields (we'll refine):

| Field | Type | Why |
|---|---|---|
| `id` | uuid | Primary key |
| `subject` | text | `IB_ECONOMICS` / `IB_BUSINESS` |
| `level` | text | `SL` / `HL` / `BOTH` |
| `paper` | text | `P1` / `P2` / `P3` |
| `topic_code` | text | Foreign key to `lessons.lesson_code` |
| `command_term` | text | `define` / `explain` / `examine` / `discuss` / `evaluate` / `to_what_extent` / `calculate` / etc |
| `marks` | int | Mark value (typically 2, 4, 6, 8, 10, 15) |
| `ao_level` | text | `AO1` / `AO2` / `AO3` / `AO4` |
| `question_text` | text | The actual question prompt |
| `context_text` | text NULL | Optional case/data context for Paper 2/3 questions |
| `status` | text | `seed` (approved, in seed table) / `candidate` (Phase 2 promotion candidate) / `rejected` |
| `created_by` | text | `claude_draft` / `grant_edit` / `student_generated` (Phase 2) |
| `approved_by` | uuid NULL | Grant's user_id, set on approval |
| `approved_at` | timestamp NULL | When approved |
| `model_answer_outline` | text NULL | Layer 2 hook — what an examiner expects |
| `examiner_traps` | text[] NULL | Layer 4 hook — common pitfalls |
| `created_at` | timestamp | |
| `updated_at` | timestamp | |

**Decide tomorrow:**
- Table name — `seed_questions` (clear it's the curated set) or `questions` (live table, status field distinguishes seed vs candidate vs rejected)?
- Any fields missing? Any to drop?

### Q2 — How does Mia USE the seed in her prompt?

When an exam-prep student is on a lesson, Mia needs to either pull a question or generate one. Decide:

- **Pull-first**: Mia queries the seed for `(topic_code, command_term, marks)` matching the lesson. If a question exists, she uses it directly. If not, she generates one anchored by the closest match.
- **Generate-with-anchor**: Mia ALWAYS generates fresh, with 3 seed questions injected as few-shot examples in her prompt to anchor format/style.
- **Hybrid**: Pull-first for the FIRST question of a session (deterministic opener), generate-with-anchor for follow-ups (adaptive drilling).

Recommend hybrid. Decide.

### Q3 — How do we generate the initial seed of 50 questions per subject?

Two viable approaches:

- **Batch via Claude API script**: write a Node script that takes the IB Economics syllabus topics + command-term framework + marks distribution, calls Claude Sonnet with structured-output JSON mode, generates 50 candidate questions in one run. ~30 min to write, ~5 min to execute, output ready for Grant review.
- **Live in Claude.ai with the project files**: chat-based, Grant prompts Claude to generate 50 questions matching a spec, copies output. Slower (~1 hour), but no script to maintain.

The script approach is the right one long-term — it becomes the tool you re-run when you add ACCA, A-Level, IGCSE.

Decide tomorrow.

### Q4 — What does the review UI look like?

Minimum viable: Next.js page at `/admin/seed-review`, gated to Grant's user_id only. Loads the next unreviewed candidate from the `questions` table where `status = 'candidate'`. Shows:

- Question text (large, readable)
- Tag block: subject / level / paper / topic / command_term / marks / AO
- Three buttons: **Approve** (sets status=`seed`, sets approved_by/at), **Edit** (inline textarea, save → approve), **Reject** (sets status=`rejected`)
- Keyboard shortcuts: `A` approve, `E` edit, `R` reject, `→` next without action
- Progress counter: "23 of 50 reviewed"

Decide tomorrow:
- Build it as part of Layer 1, or use a simpler approach (SQL UPDATE statements during initial review, build UI later for Phase 2 candidate promotion)?

For 100 questions total, a UI is probably worth it. After the initial seed, Phase 2 candidate promotion will need it anyway.

### Q5 — Where does the seed live in the repo?

- `seed/ib_economics_seed_questions.sql` — INSERT statements for all approved IB Economics seed questions
- `seed/ib_business_seed_questions.sql` — same for IB Business
- Regenerated from the live `questions` table after each review batch (script: `npm run dump-seed`)
- Both files committed to repo — diffable, restorable, auditable

Confirm tomorrow.

### Q6 — Order of build tomorrow

Recommended sequence:

1. **Schema migration** — create the `questions` table in Supabase, idempotent, transactional, verified. ~30 min.
2. **Generation script** — Node script that calls Claude Sonnet to draft 50 candidate questions per subject from the syllabus + command-term framework. ~60 min to write + test.
3. **Run the script** — generates 100 candidates total, inserts as `status='candidate'`. ~10 min.
4. **Review UI** — `/admin/seed-review` page. ~90 min to build cleanly.
5. **Grant's review session** — 100 questions × ~60 sec = ~100 min. Coffee + a Saturday afternoon.
6. **Dump script** — `npm run dump-seed` generates the `seed/*.sql` files. ~30 min.
7. **Wire Mia to use the seed** — update IB Economics and IB Business prompts + `app/api/session/message/route.ts` to inject seed questions as few-shot anchors. ~90 min.

Total: ~6.5 hours of build + ~1.5 hours of Grant review = one focused day.

Confirm or revise the order tomorrow.

---

## Pre-session checklist (do these BEFORE starting tomorrow)

1. ☐ Close laptop tonight. Sleep. This matters more than it sounds — schema decisions made tired are decisions you regret for years.
2. ☐ Before opening the laptop tomorrow, re-read Layer 1 in `PRIORITY 3.5` of the master backlog (`docs/Gradd_Master_Backlog_v3_3.md`)
3. ☐ Re-read this doc
4. ☐ Open the strategy chat (this one) and respond to it. We resume by working through Q1 → Q6 in order.

---

## What we are NOT doing tomorrow

- Layer 2 (mark scheme integration). Comes after Layer 1 ships and verifies.
- Layer 3 (command-term fluency promoted from PRIORITY 3 item 13). Independent, can ship in parallel but separate session.
- Layer 4 (examiner traps). After Layer 1.
- ACCA expansion. Inherits the architecture; not in scope until IB launches.
- Fixing the 11 remaining diagram collisions. Backlog item, not load-bearing.
- The per-subject level fields BUNDLE BLOCKER. Important but not Layer 1.

If you find yourself reaching for any of these tomorrow, that's the signal to step back. One layer per session.

---

## Quick stocktake — what shipped today

For context, in case tomorrow-you feels like nothing's moving:

- `.ib-session` CSS extracted to global stylesheet (commit `0a44e4c`)
- `/admin/diagrams` rebuilt in real session scope — permanent QA asset (commit `9479305`)
- 37 diagram label collisions fixed across all 6 diagram files (commits `e3cd1fd`, `a8d87ff`)
- Landing/demo copy fixes merged (commit `0508deb`)
- `course_position` SESSION OPENING fix for IB Business (commit `61825c9`) and IB Economics (commit `cb93b9b`) — **Layer 0 of the moat verified live in production**
- Master Backlog v3.3 restored to repo + diagram polish entry + PRIORITY 3.5 EXAM-PREP MODE moat section + Layer 0 marked DONE
- `GRADD_BUILD_HARDENING.md` updated with 21 new issues + 5 new prevention rules from today's session
- Repo strategic docs consolidated into `docs/` folder, old backlog versions deleted, near-miss avoided where the deprecated v1.0 routing spec almost overwrote the live v1.1

That's a real day's work. Tomorrow keeps the momentum.

---

*End of start-here doc. Sleep well.*
