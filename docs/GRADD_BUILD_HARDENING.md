# Gradd — BUILD_HARDENING.md

**The master build-hardening reference for every Gradd product.** One codebase, one Supabase instance and one Stripe account serve all products — LC Business on gradd.ie, IB Economics and IB Business Management on gradd.ai, ACCA and others to follow. This document consolidates every problem hit, diagnosed and fixed across all LC and IB build and debugging sessions, from the initial builds through to launch prep (02–16 May 2026).

**How to use this document.** Read the TOP PREVENTION RULES below before starting any build session — they are the distilled standing rules and take five minutes. The ISSUE CATALOGUE underneath is a searchable archive: when something breaks, find the category and scan the entries. Because this is one shared codebase, an issue first hit on one product almost always applies to the others — treat every entry as relevant to the build in front of you unless it names a product-specific cause.

**Tags.** Each catalogue entry is tagged `[LC]` or `[IB]` for the product on which it was diagnosed. **Severity:** Critical (silent data corruption / blocks launch) · High (breaks a feature) · Medium (degrades quality) · Low (cosmetic). Entries are ordered by category, then severity.

**Reference this document at the start of every new product build.**

---

## TOP PREVENTION RULES

The highest-value lessons from two complete product builds, distilled. Read these before any build session; treat them as standing rules for every new product from day one.

1. **Schema first, write second.** Before any INSERT, signal handler or prompt token, pull the live schema — `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'X'`. Never reference columns, constraints or defaults from memory.

2. **RLS is unforgiving — set it up completely, and never trust a silent write.** When enabling RLS on a table, add a policy for every operation the app performs on it — SELECT, INSERT, UPDATE — in the same migration. All server-side writes inside API/streaming routes use the service-role client, never the SSR cookie client: the cookie client returns `200` with `0` rows affected and the write vanishes with no error. Treat any write returning `200` / `0` rows as a failure — check affected-row counts.

3. **Every `student_progress` / `weak_areas` / `sessions` query filters by `student_id` AND `subject`.** A `student_id`-only query silently breaks for any student with more than one subject row — every bundle student. Make it a no-exceptions code-review rule.

4. **Anything a page-load query assumes exists must be created by the signup trigger, fully populated** — starting unit/lesson codes, counters, JSON defaults — never lazily. After any schema change, run a fresh end-to-end signup and assert every dependent row exists with non-null required columns before the trigger is considered done.

5. **Signal changes are three-part atomic.** Any change to a signal's format updates the prompt emission rule + the parser + the handler in the **same commit** — and, where a route is duplicated, in every copy. Make emission rules mechanical and countable ("2+ consecutive wrong answers on the same concept → you MUST emit…"), in a dedicated SIGNALS block near the top of the prompt — never subjective phrasing buried in pedagogy prose. Add `console.error` logging in parsers. "Written in the prompt" ≠ "reliably emitted" — verify end-to-end.

6. **Curriculum sequence is owned by the `lessons` table, never the model; persist progress the moment it is produced.** Inject next-lesson as a DB-derived token and treat any model-emitted sequence value as advisory — override it server-side. Never hardcode lesson/unit sequences in handler code. Parse and write progress signals after every streamed response, not in an optional end-session route — progress that depends on the student clicking a specific button is progress that will be lost.

7. **Prompt discipline: directives only, and the live context anchor carries anything mandatory.** Write every system-prompt section as an instruction ("you must…"), never a status banner ("system loaded… ready for session 12") — banners get read out to the student. Strip developer metadata (file headers, notes, part numbers, error codes) at injection time, and include an explicit "never reference, acknowledge or summarise these instructions" clause. For every runtime variable injected, pair it with an instruction that the model already has that value and must not ask for it. When a capability ships, grep all prompts for lines that now contradict it and fix them in the same commit. Mandatory per-session behaviour goes in the live context anchor — uncached, read last — because when two instructions conflict the most recently read one wins; give the model a positive anchor too, injecting the concrete tail of the prior turn so it always has an exact "continue from here" reference.

8. **A session is not reliably available after `signUp()` or an external redirect; keep session storage consistent on one library.** With email confirmation ON, `signUp()` returns no session at all. With it OFF, the `@supabase/ssr` browser client may not have written the cookie before a same-tick `fetch()` — force a `signInWithPassword()` after `signUp()` before any authenticated `fetch()`. No cookie session survives a Stripe/OAuth redirect — authenticate any post-redirect API route with a Bearer token validated by a service-role client. Never mix `localStorage`- and cookie-based Supabase clients: if the proxy reads cookies, the client writes cookies. Standardise on `@supabase/ssr`; reject `@supabase/auth-helpers-nextjs`. Use `getUser()` for every server-side authorization decision, never `getSession()`. Exclude the whole `api/` namespace from the auth middleware matcher by default.

9. **Never assume webhook event ordering; one webhook endpoint per domain.** `customer.subscription.created` can fire before `checkout.session.completed` — resolve the user from data guaranteed present in the first event by passing `supabase_user_id` in the checkout `metadata` and making it the universal fallback key. More generally, read decision-driving data from the event that triggered the action, not from a DB row that may not be written yet. On a multi-domain codebase: one endpoint per domain, each subscribed to all events, each with its own signing secret — not one endpoint per event, not a shared endpoint or secret. Checkout always references `price_…` IDs, never `prod_…`.

10. **Multi-domain go-live is a full branding, metadata and email audit.** `generateMetadata` (title, description, `metadataBase`, OG tags), legal pages, email templates and asset URLs, logo assets and Stripe dashboard branding all carry hardcoded product strings. Domains cannot be told apart by build-time `NEXT_PUBLIC_*` vars — detect the host at runtime (`headers()` server-side, `window.location.hostname` client-side). Build a hostname-aware branding helper at project setup, not as a later fix.

11. **Email infrastructure is per-domain and unforgiving.** Email confirmation should be ON from launch wherever the account email later delivers value (progress emails, password resets) — but if it is ON, the signup flow cannot assume an immediate session (see rule 8); design for that explicitly. A domain has exactly one SPF record — merge, never duplicate. Remove stale MX records before pointing mail at a new provider. Verify SPF/DKIM/MX with a checker after any DNS change.

12. **Every migration is idempotent, transactional and verified.** Wrap in `BEGIN`/`COMMIT`. Know which statements are not idempotent (`ALTER TABLE RENAME`) and never mix them with idempotent ones — a partial failure then leaves an un-re-runnable state. Finish with verification `SELECT`s and confirm row counts changed. Seed scripts populate every relational link column and self-verify (`COUNT(*) WHERE link IS NULL` must return 0). Establish ID/code conventions before seeding — subject-prefixed codes (`IB_ECON_UNIT_1`) are mandatory; bare codes (`UNIT_1`) collide across bundled products.

13. **Build hygiene: a green build is not a deployed build.** After every push, confirm the top Vercel deployment is green AND its commit hash matches `main`; force a cache-free rebuild when a fix doesn't appear; force a fresh deployment after any env-var change. Run `next build` / `tsc --noEmit` locally before pushing, and write to TypeScript strict mode — no implicit `any`, consistent null-handling on every read of a nullable value. Pin SDK and framework versions exactly; match the Stripe `apiVersion` to the installed SDK; install a dependency in the same commit as the code that imports it. On a major framework upgrade, read the upgrade guide for renamed conventions first (Next.js 16: `middleware.ts` → `proxy.ts`, async `cookies()`); keep exactly one config file.

14. **Diagnose before fixing — and rule out the false alarms first.** Query the live source of truth before estimating a rebuild or asserting a feature's state. Reproduce a suspected bug on the deployed environment before changing code — Windows/Turbopack local panics, broken CLI tooling, browser favicon cache and dirty test data are not product bugs. On Windows, don't pipe `vercel logs` through `grep`; add a tagged `console.error` and read the deploy log directly. Several "bugs" across both builds were never code — a 30-second query beats an hour of misdirected work.

15. **Secrets never touch tracked files or chat.** Add `.claude/` and tool-local config dirs to `.gitignore` at project creation. Never paste live keys into chat or screenshots; rotate any secret ever exposed immediately. Keep all keys in `.env.local` / Vercel env vars. Move values likely to change during tuning — model name, token caps, rate limits — into env vars, not code literals duplicated across files.

16. **Match model capability to prompt size and conversation length.** A large system prompt across many turns needs Sonnet-class capability minimum — validate over a full-length session, not a 3-message smoke test. Enable Anthropic prompt caching from day one: split the system prompt into static (cacheable) and dynamic (live) blocks for roughly a 90% cost reduction on system-prompt tokens.

17. **QA / preview surfaces must render in production scope.** Any internal QA, preview or audit page that displays a production component must mirror production's wrapper, CSS scope, fonts and render path exactly. A QA page using different scope produces false positives (sees bugs that don't exist) and false negatives (misses real bugs). Validate by side-by-side with a live session before trusting any new QA surface.

18. **Prompt-cached architectures: changes only affect new sessions.** When the system prompt is substituted with student-specific values at session start and stored (`sessions.raw_final_response`), pre-existing open sessions retain the OLD prompt forever. Test protocol after any prompt change: close all open sessions in DB → hard refresh browser → start new session → verify `session_number` incremented BEFORE judging behaviour.

19. **Template variables in prompts must be labels, not verb objects.** Write `{{VAR}} = the value` and then act on the label, not `depends on {{VAR}}:` which substitutes mid-sentence and breaks grammar — turning a directive into a statement and orphaning any branches below it. Mentally substitute each possible value and read the resulting sentence before shipping.

20. **Visual and coordinate fixes are not batchable.** Work one element at a time with screenshot verification between edits. Never apply batch coordinate offsets to shared helpers — side-effects propagate to every consumer. If a "systematic" fix feels tempting, that's the signal to slow down, not speed up.

21. **Tooling-cap discipline: set `CLAUDE_CODE_MAX_OUTPUT_TOKENS=200000` every session.** Default 32k cap will kill multi-file edits mid-task — no commit, no push, work appears lost (actually safe, but the symptom is alarming). Combine with explicit response-constraint directives in batched instructions: "terse responses", "no full file pastes", "commit message under 200 chars".

22. **Evidence-before-encoding for subject guides.** Before encoding any syllabus rule (AO level, command-term map, HL-only topic/subtopic, mark allocation, paper structure) into a verifier or generator, locate and quote the specific page in the source Subject Guide PDF. Never encode from memory or training-data recall — training data drifts, PDFs don't. If the page contradicts what you believed, trust the page.

23. **Verifier contradiction guards must emit audit logs on silent recompute.** Every deterministic verifier must carry two guards: (a) a hard `throw` when reasoning implies pass but a major-fail criterion is present (logical contradiction); (b) a `console.warn` when Claude's submitted `overall` verdict differs from the deterministically-recomputed verdict — the warn must name the function, the submitted verdict, and the recomputed verdict. A silent recompute that accepts the drift is indistinguishable from a bug. *Implemented as Guard 1 (throw) and Guard 2 (warn) in `applyBMVerdict`.*

24. **Generator prompt must have a branch for every `question_type` in the config.** Every `question_type` value defined in a subject's config (e.g. `P3_q1`, `P3_q2`) must have a corresponding branch in `buildUserPrompt`. A missing branch causes the generator to fall through to a generic else-clause that omits question-type-specific framing — producing candidates that systematically fail the validation rules that type imposes. Audit this on every new subject config, and add the branch in the same commit as the config entry. *Root cause of 8/12 P3_q1 rejections in the IB BM Layer 1 build.*

25. **Atomic `str_replace` edits only — never full-file overwrites.** Every code edit is expressed as the smallest possible `str_replace` (old → new). Full-file overwrites: (a) discard all unreviewed intermediate edits, (b) introduce whitespace/encoding drift, (c) cannot be diffed at a glance before approval. If an edit feels too large to express as a targeted replacement, break it into sequential atomic edits. This applies even when the user shows a complete block — extract only the changed lines.

26. **Before contradicting a verifier verdict that cites a specific syllabus rule, read the source PDF page and quote it.** If a verifier flags a question for a structural rule (e.g. "AO3 absent from P1 Section A", "Q3 total marks = 17"), do not dispute the verdict from training-data recall alone. Open the Subject Guide PDF, navigate to the cited page, and quote the exact sentence. If the source contradicts the encoded rule, fix the rule and re-run. If the source confirms it, accept the verdict. *This session: an unverified challenge to IB_BM_016's verdict cost one re-run cycle.*

27. **Each IB subject's content is derived from its own guide only — never by analogy from another subject.** Cross-subject contamination (Econ AO-level classifications, command-term rules, exam structure leaking into BM) is a systematic authoring error that produces multiple simultaneous wrong claims, not isolated bugs. The diagnostic signal is: several concurrent errors of the same type in one prompt. When authoring or reviewing a subject prompt, audit only against that subject's guide. Do not assume any classification, rule, or structure carries across subjects — verify even the ones that seem obvious.

28. **Enforcement instructions go in the step where the model acts, not in a reference section.** A correct rule placed in a descriptive/reference block (e.g. a markband table) can be read past by the model — especially the cheaper default model (haiku). If an instruction must change behaviour at a specific moment (marking, signal emission, scope check), put it inside the numbered step the model executes at that moment. Verified 04/06/2026: the Paper 2(g) "use the stimulus, not outside examples" rule was content-correct but sat in the Econ markband block; haiku ignored it and praised external examples when marking. Moving the identical rule into the marking step (HANDLING EXAM-STYLE PRACTICE QUESTIONS, step 4) made haiku enforce it correctly on a live production mock. Prompt-correct ≠ behaviour-correct; verify the behaviour, and place enforcement at the point of action.

29. **A built layer is not a live layer until a serve-time read proves it.** Verify that production code actually fetches and uses a data layer during a real user action before treating it as part of the product. The IB `mark_schemes` table (188 rows, hybrid generator, admin review UI) was fully built but never read in any session route — `fetch_exam_questions_tiered` returns question text only, no scheme. Mia marked from prompt-baked markbands the whole time, not the structured schemes. A whole "Layer 2" was disconnected and nobody knew. Before building on or fixing any data layer, grep the live serve path for a read of it; if there is none, the layer's quality is irrelevant until it is wired. Corollary: test a layer's marginal value before building or fixing it — content_checklist schemes proved to add real marking precision; band_descriptor schemes were redundant with the prompt's own markbands.

30. **One entity, one key — verify the same identifier value is used across every table and code path before joining on it.** A join or RPC filter that keys two tables on the same parameter silently returns nothing if those tables use different values for the same entity. IB Business Management is stored as `IB_BUSINESS` in `lessons` and `student_progress`, but `IB_BUSINESS_MANAGEMENT` in `questions` and `mark_schemes`; the routes use `IB_BUSINESS` internally and translate to `IB_BUSINESS_MANAGEMENT` when calling the serving RPC. The RPC then filtered BOTH `questions` (matched) and `lessons` (no match) on `IB_BUSINESS_MANAGEMENT`, so lesson-tier ranking never fired and BM questions served only via the random tier-4 fallback. Before keying a query on a subject/entity identifier, confirm every table and code path uses the same value for it; if values differ, that is a normalisation bug to fix, not to translate around.

---

## ISSUE CATALOGUE


### DATABASE / MIGRATION

---

**ISSUE:** [IB] Lesson seed inserted rows but left `next_lesson_code` NULL across all 210 rows
**SYMPTOM:** `LESSON_COMPLETE` fired but the student never advanced — three sessions completed on `IB_ECON_001` with no progression.
**ROOT CAUSE:** The seed SQL inserted all rows but never populated the `next_lesson_code` forward-link column. The curriculum had no chain.
**FIX:** `UPDATE` with a self-join on `lesson_order + 1` within the subject; `COALESCE` to `'NONE'` for the final lesson of the curriculum.
**PREVENTION:** Seed SQL must populate every relational link column in the same script that inserts the rows. End every seed with a verification query — `SELECT COUNT(*) WHERE next_lesson_code IS NULL` must return 0 before the seed is considered done.
**CATEGORY:** Database/Migration
**SEVERITY:** Critical

---

**ISSUE:** [IB] `unit_code` reconciliation migration was not idempotent and left the DB un-re-runnable on partial failure
**SYMPTOM:** Re-running the migration errored on the `ALTER TABLE ... RENAME COLUMN` line.
**ROOT CAUSE:** The migration mixed idempotent statements with a non-idempotent `ALTER TABLE RENAME COLUMN`. A partial failure left the schema in a state where the migration could neither complete nor re-run cleanly.
**FIX:** Ran the remaining `UPDATE` statements manually in a fresh transaction (related work in commit 6d86e8c).
**PREVENTION:** Wrap every migration in `BEGIN`/`COMMIT` so a partial failure rolls back cleanly. Know that `ALTER TABLE RENAME COLUMN` is not idempotent — never mix idempotent and non-idempotent statements in one migration. Finish with verification `SELECT`s; never assume a migration "ran" without checking row counts.
**CATEGORY:** Database/Migration
**SEVERITY:** Critical

---

**ISSUE:** [IB] Inline Toolkit lessons mis-assigned to a standalone Toolkit unit
**SYMPTOM:** `UNIT_COMPLETE` fired prematurely — completing `IB_BM_014` marked all of Unit 1 complete while the student was still mid-Unit-1.
**ROOT CAUSE:** The reconcile migration assigned every `topic_code='TK'` lesson to `IB_BM_UNIT_TOOLKIT`. IB BM Toolkit lessons follow two distinct patterns — *inline* (within a numbered unit, between core teaching and consolidation) and *end-cluster* (a standalone block after the final unit). 7 inline lessons were wrongly bucketed with the 13 genuine end-cluster lessons.
**FIX:** Migration `20260515120000_fix_inline_toolkit_unit_codes.sql` reassigned the 7 inline lessons (`IB_BM_014, 045, 073, 093, 096, 121, 122`) to their parent numbered units (commit f71f1d1).
**PREVENTION:** Before seeding any curriculum with cross-cutting toolkit/skills content, classify each such lesson explicitly: inline lessons inherit the parent numbered unit's `unit_code`; only genuine post-final-consolidation cluster lessons get a dedicated `UNIT_TOOLKIT`. Documented in `CURRICULUM_ARCHITECTURE.md` section 5.
**CATEGORY:** Database/Migration
**SEVERITY:** Critical

---

**ISSUE:** [LC] Auth trigger did not reliably create a complete `student_progress` row on signup
**SYMPTOM:** New accounts loaded the dashboard with all-null values; the dashboard hook queried `student_progress`, found no usable row, and rendered blank. A manual seed INSERT then failed with `23505 duplicate key value violates unique constraint "student_progress_student_id_key"` — proving a row existed but was empty/incomplete.
**ROOT CAUSE:** The `handle_new_user()` trigger created the `profiles` row but did not consistently insert a fully-populated `student_progress` row (starting unit/lesson codes, counters, JSON defaults). Every real signup hit a blank dashboard.
**FIX:** `fix_auth_trigger.sql` run in the Supabase SQL Editor — rebuilt the trigger (`CREATE OR REPLACE TRIGGER on_auth_user_created`) to insert both `profiles` and a complete `student_progress` row (default unit `UNIT_1`, lesson `1.1.1`, counters at 0, `units_completed`/`lessons_completed_this_unit` as `'[]'`). Backfilled existing users. Verified with a 0-row sanity query.
**PREVENTION:** Any table whose presence is assumed by a page-load query must be created by the signup trigger, not lazily. After changing the schema, run a fresh end-to-end signup and assert every dependent row exists with non-null required columns before considering the trigger done.
**CATEGORY:** Database/Migration
**SEVERITY:** Critical

---

**ISSUE:** [LC] RLS silently blocked the `UPDATE` on the `sessions` table from inside the streaming message route
**SYMPTOM:** Vercel logs showed only 200s with no errors; the Supabase PATCH on `sessions` "succeeded" but `message_history` stayed `[]` and `raw_final_response` stayed `NULL` on every row. Aoife effectively started cold on every message within a session because there was no history to anchor to.
**ROOT CAUSE:** The post-stream write used the SSR cookie-based `createServerClient()`. The `sessions` table had `SELECT`/`INSERT` policies for the student but no `UPDATE` policy, so Supabase returned 200 with 0 rows affected and threw no error — a silent write failure.
**FIX:** Two-part: (1) added an `UPDATE` RLS policy on `sessions` (`USING auth.uid() = student_id`); (2) switched all server-side writes inside the route to a service-role client (`getServiceClient()` factory) which bypasses RLS. Auth reads still use the cookie-based SSR client.
**PREVENTION:** All server-side writes inside streaming/API routes use the service-role client — never the SSR cookie client. Treat a Supabase write that returns 200 with 0 rows as a failure: check the affected-row count, don't trust the absence of an error.
**CATEGORY:** Database/Migration
**SEVERITY:** Critical

---

**ISSUE:** [IB] Test `student_progress` / `profiles` rows auto-created with the wrong subject (`LC_BUSINESS`)
**SYMPTOM:** `SESSION START: progress not found` — "Cannot coerce the result to a single JSON object". Session refused to load and showed Aoife instead of Mia.
**ROOT CAUSE:** Creating an auth user fires a DB trigger that pre-populates `profiles` and `student_progress` rows defaulting to `subject = 'LC_BUSINESS'`. The IB onboarding flow that corrects `subject` runs client-side and never fires for manually-created test accounts. Session start filtered on `subject = 'IB_ECONOMICS'` and found nothing.
**FIX:** `UPDATE` the auto-created rows to the correct values rather than `INSERT`ing new ones.
**PREVENTION:** Auth-user creation fires DB triggers — test-account setup must always be UPDATE-not-INSERT, and must explicitly set `subject` on both `profiles` and `student_progress`. Keep these statements in a test-account runbook. Longer term, have the trigger initialise `student_progress` from `profiles.subject`.
**CATEGORY:** Database/Migration
**SEVERITY:** High

---

**ISSUE:** [LC] Missing RLS INSERT policy on the `sessions` table
**SYMPTOM:** During the initial build, creating a session failed — the row never appeared in `sessions`.
**ROOT CAUSE:** RLS was enabled on `sessions` but no `INSERT` policy existed for the student, so the create was blocked. Same RLS-policy-gap class as the later UPDATE issue, found earlier.
**FIX:** Added an `INSERT` RLS policy on `sessions` via the Supabase SQL editor.
**PREVENTION:** When enabling RLS on a table, add policies for every operation the app performs on it — `SELECT`, `INSERT`, `UPDATE` — in the same migration. An RLS-enabled table with missing policies fails silently or blocks outright.
**CATEGORY:** Database/Migration
**SEVERITY:** High

---

**ISSUE:** [IB] `profiles` INSERT failed on a NOT NULL constraint (`full_name`)
**SYMPTOM:** `ERROR: 23502: null value in column "full_name" violates not-null constraint`. Repeated immediately afterwards for `student_name` (also NOT NULL).
**ROOT CAUSE:** The INSERT statement was written from memory and omitted NOT NULL columns the live schema requires.
**FIX:** Pulled the real schema via `information_schema.columns`, added the missing columns to the INSERT.
**PREVENTION:** Before writing any INSERT, pull the live schema: `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = '...'`. Never write INSERTs from memory.
**CATEGORY:** Database/Migration
**SEVERITY:** Medium

---

**ISSUE:** [IB] `student_progress` INSERT referenced a non-existent column (`lessons_completed`)
**SYMPTOM:** `ERROR: 42703: column "lessons_completed" does not exist`.
**ROOT CAUSE:** The actual column is `lessons_completed_this_unit` (jsonb). The column name was assumed from memory.
**FIX:** Pulled the live schema and corrected the column name.
**PREVENTION:** Schema query before INSERT (as above). Note this table uses jsonb (`units_completed`, `lessons_completed_this_unit`), not integers — an easy thing to assume wrong.
**CATEGORY:** Database/Migration
**SEVERITY:** Medium

---

**ISSUE:** [IB] Obsolete no-op seed migration left dead in the migrations folder
**SYMPTOM:** A 156-lesson IB seed migration existed but had inserted zero rows.
**ROOT CAUSE:** The `lessons` table was already populated by an earlier seed. `ON CONFLICT DO NOTHING` skipped every row, so the migration was a silent no-op — but it stayed in the folder, misleading future readers about the true lesson count and curriculum source.
**FIX:** Deleted via `git rm` in the same commit as the reconcile migration (7078dc5).
**PREVENTION:** After running a seed migration, verify row counts actually changed. Delete dead/no-op migrations — an orphan migration is a future debugging trap.
**CATEGORY:** Database/Migration
**SEVERITY:** Medium

---

**ISSUE:** [IB] INSERT had more target columns than values
**SYMPTOM:** `ERROR: 42601: INSERT has more target columns than expressions`.
**ROOT CAUSE:** `created_at` was listed in the column list but had no corresponding value (it has a default).
**FIX:** Removed `created_at` from the column list — let the default apply.
**PREVENTION:** Don't list columns that have defaults in test-data INSERTs. Keep INSERT column lists minimal.
**CATEGORY:** Database/Migration
**SEVERITY:** Low

---

**ISSUE:** [IB] INSERT value/column order mismatch — a boolean column was assigned a timestamp
**SYMPTOM:** `ERROR: 42804: column "ia_scope_acknowledged" is of type boolean but expression is of type timestamp with time zone`.
**ROOT CAUSE:** `true` and `now()` were in the wrong order relative to the `ia_scope_acknowledged` / `ia_scope_acknowledged_at` columns.
**FIX:** Pulled the schema, rewrote the INSERT with correct column/value alignment.
**PREVENTION:** When an INSERT has adjacent columns of different types, a type error is the DB telling you the order is wrong. Verify column order against the schema rather than re-pasting.
**CATEGORY:** Database/Migration
**SEVERITY:** Low

---

**ISSUE:** [IB] Suspected orphan rows after a profile deletion
**SYMPTOM:** A stale `current_unit_name` ("Introduction to Business Management") appeared on a `student_progress` row; the first hypothesis was orphaned child rows from a deleted profile.
**ROOT CAUSE:** False alarm — diagnostic queries showed zero orphan rows; the deleted account had cascaded cleanly. The stale value was simply an un-refreshed denormalised `current_unit_name` from before the unit-name migration (this field only refreshes on the next signal write).
**FIX:** A single targeted `UPDATE` on the one stale row.
**PREVENTION:** `student_progress.current_unit_name` is a denormalised copy that only refreshes on the next `LESSON_COMPLETE`/`UNIT_COMPLETE` — either update both in the migration or accept it self-heals on next session. Don't assume "stale value" means "orphan row" — verify with a `LEFT JOIN` before concluding.
**CATEGORY:** Database/Migration
**SEVERITY:** Low


---

**ISSUE:** [IB] `course_position` bug misdiagnosed from code-path reasoning instead of data
**SYMPTOM:** Claude Code initially claimed root cause was "course_position null at runtime, derive fallback fires" — ~10 minutes spent verifying the wrong hypothesis. The value was correctly stored as `'exam-prep'`; the real bug was elsewhere.
**ROOT CAUSE:** Diagnosis reasoned plausibly from the code path without verifying actual data state in Supabase.
**FIX:** Direct SQL query confirmed value; Claude Code re-diagnosed and found the real bug (SESSION OPENING had no `course_position` branch).
**PREVENTION:** Before accepting "the value at runtime is X" from code-path reasoning, verify with a direct SQL query against the actual stored value. Code-path inference is a hypothesis, not authority.
**CATEGORY:** Database/Migration
**SEVERITY:** Medium

---

**ISSUE:** [IB] Tutoring sessions left open indefinitely (`ended_at IS NULL`)
**SYMPTOM:** Multiple sessions accumulating per user with no end time; three sessions for one student closed simultaneously by manual UPDATE, with three different `session_number` values.
**ROOT CAUSE:** Backend session lifecycle does not auto-close on natural exit paths (tab close, navigation away). Sessions only close via explicit UI actions.
**FIX:** Manual SQL UPDATE used for test setup; underlying behaviour logged for backlog cleanup.
**PREVENTION:** Backend session lifecycle should auto-close on inactivity timeout OR when a new session is created for the same `(student_id, subject)` pair. Never permit indefinitely-open sessions for a single user.
**CATEGORY:** Database/Migration
**SEVERITY:** Medium

---

**ISSUE:** [IB] `auth.sessions` and `public.sessions` confused diagnostic queries
**SYMPTOM:** `information_schema.columns` returned a mixed list of app columns (`lesson_code`, `started_at`) and Supabase auth internals (`aal`, `not_after`, `refresh_token_hmac_key`).
**ROOT CAUSE:** Both schemas have a `sessions` table; the metadata query didn't filter by schema.
**FIX:** Qualified all subsequent references as `public.sessions`.
**PREVENTION:** When querying schema metadata, always `WHERE table_schema = 'public'`. When writing UPDATE/INSERT/SELECT against `sessions`, always use the `public.` prefix.
**CATEGORY:** Database/Migration
**SEVERITY:** Low

---

**ISSUE:** [IB] Wrong column name assumed in UPDATE (`completed_at`)
**SYMPTOM:** `ERROR: 42703: column "completed_at" does not exist`.
**ROOT CAUSE:** Assumed column name without verifying schema. Actual column is `ended_at`.
**FIX:** Listed columns via `information_schema.columns`, found `ended_at`, retried.
**PREVENTION:** Before writing UPDATE/DELETE/INSERT against an unfamiliar table, run `SELECT column_name FROM information_schema.columns WHERE table_name = 'X' AND table_schema = 'public'`. Don't guess.
**CATEGORY:** Database/Migration
**SEVERITY:** Low

---

**ISSUE:** [IB] Ambiguous `subject` column in JOIN
**SYMPTOM:** `ERROR: 42702: column reference "subject" is ambiguous`.
**ROOT CAUSE:** Column exists on both `profiles` (= product purchased, e.g. `IB_BUNDLE`) and `student_progress` (= specific subject being studied, e.g. `IB_ECONOMICS`). Bundle students legitimately have different values in the two columns.
**FIX:** Qualified every column reference with a table alias (`p.subject`, `sp.subject`).
**PREVENTION:** In any JOIN, qualify every column reference with a table alias, not just the ambiguous ones. Build the habit so unqualified column names never appear in multi-table queries.
**CATEGORY:** Database/Migration
**SEVERITY:** Low

---

**ISSUE:** [IB] Column queried on wrong table (`exam_level` on `student_progress`)
**SYMPTOM:** `ERROR: 42703: column sp.exam_level does not exist`.
**ROOT CAUSE:** Cross-table column confusion. `exam_level` is a profile property (set once at onboarding), not progress-table data.
**FIX:** Joined to `profiles` for `exam_level`.
**PREVENTION:** Document schema data ownership explicitly. Static student attributes (subject purchased, level, plan) → `profiles`. Dynamic per-subject progress (lesson, position, weak areas, session_number) → `student_progress`. Per-session state → `sessions`.
**CATEGORY:** Database/Migration
**SEVERITY:** Low

---

**ISSUE:** [IB] Postgres regex repetition count too high
**SYMPTOM:** `ERROR: 2201B: invalid regular expression: invalid repetition count(s)` on `substring(... from 'pattern.{0,2500}')`.
**ROOT CAUSE:** Postgres POSIX regex enforces lower repetition limits than other flavours; `{0,2500}` exceeded that limit.
**FIX:** Switched to position-based extraction: `substring(text, position('marker' in text), 2500)`.
**PREVENTION:** For "extract N characters from this position" use `substring(text, position, length)`, not regex. Regex is for pattern matching, not for character slicing.
**CATEGORY:** Database/Migration
**SEVERITY:** Low



### SIGNALS

---

**ISSUE:** [IB] Session history bug — the tutor asked the student where they left off
**SYMPTOM:** Mia (and Aoife on LC) opened every session after the first by asking "did we cover X, or are you starting fresh?" instead of knowing.
**ROOT CAUSE:** The prompt declared `{{LAST_SESSION_SUMMARY}}` and `{{COURSE_POSITION}}` but the server-side prompt builder never fetched or injected them. The `SESSION_SUMMARY` signal was emitted at session end but nothing read it back at session start. The prompt also instructed the tutor to ask "continue from where we left off".
**FIX:** Four-file fix — `sessions` migration, prompt builder injection, prompt methodology rewrite, removal of the "ask the student" line. Applied to both Aoife (LC) and Mia (IB).
**PREVENTION:** Never let a prompt ask the tutor for state the system already holds. Any context variable declared in a prompt must have a traced path from the DB into the prompt builder, with a test confirming it changes behaviour.
**CATEGORY:** Signals
**SEVERITY:** Critical

---

**ISSUE:** [IB] `WEAK_AREA_FLAG` parser regex didn't match the format the prompt emitted
**SYMPTOM:** Weak areas never written to the DB despite repeated wrong-answer testing — `weak_areas` stayed empty across 21+ sessions with no errors thrown anywhere.
**ROOT CAUSE:** The v1.2 prompt changed the `WEAK_AREA_FLAG` token from pipe-delimited to JSON. The parser regex in `lib/signal-parser.ts` still expected the pipe format. The regex never matched, the parser silently returned `[]`, the handler loop never ran.
**FIX:** Rewrote the parser regex to match the JSON block; added `JSON.parse` with `console.error` on malformed JSON and missing fields (commit 6d86e8c).
**PREVENTION:** Any signal format change must update prompt + parser + handler in the **same commit**. A one-sided format change with no error handling = silent total feature failure. Add `console.error` logging in parsers so malformed signals show in logs rather than being dropped silently.
**CATEGORY:** Signals
**SEVERITY:** Critical

---

**ISSUE:** [IB] Mia never emitted the `WEAK_AREA_FLAG` signal at all
**SYMPTOM:** After the parser was fixed, `weak_areas` was still empty. Vercel logs showed no parser errors **and** no raw signal token — the model never emitted it.
**ROOT CAUSE:** The v1.2 prompt contained the `WEAK_AREA_FLAG` rule but it was buried in pedagogy notes and phrased subjectively ("when you detect a pattern"). The model interpreted around it.
**FIX:** Rewrote the rule as a mechanical, unmissable trigger ("if a wrong/partial answer on the same concept in 2+ consecutive turns, you MUST emit…"), moved it to the SIGNALS section near the top, instructed emission at the start of the response (prompt v1.3).
**PREVENTION:** Signal-emission rules must be mechanical and countable, never subjective. Place them in a dedicated high-priority SIGNALS section near the top of the prompt. "Rule is in the prompt" and "model reliably emits the signal" are two separate things — verify emission end-to-end.
**CATEGORY:** Signals
**SEVERITY:** Critical

---

**ISSUE:** [IB] `UNIT_COMPLETE` signal not emitted when crossing a unit boundary
**SYMPTOM:** `LESSON_COMPLETE` advanced the lesson across a unit boundary but `UNIT_COMPLETE` never fired; `units_completed` was never populated. No signal token in the logs.
**ROOT CAUSE:** Same class as `WEAK_AREA_FLAG` — the prompt rule existed but wasn't mechanical or prominent enough; the model didn't emit.
**FIX:** Rewrote the `UNIT_COMPLETE` rule as a mechanical trigger, moved it to the SIGNALS section (prompt v1.4).
**PREVENTION:** All four signals (`LESSON_COMPLETE`, `UNIT_COMPLETE`, `SESSION_SUMMARY`, `WEAK_AREA_FLAG`) need mechanical, unmissable, top-of-prompt rules. Each signal needs three things in the same commit: a prompt-side emission rule, a parser, and a handler.
**CATEGORY:** Signals
**SEVERITY:** Critical

---

**ISSUE:** [IB] `UNIT_COMPLETE` handler used a hardcoded unit-sequence map with stale keys
**SYMPTOM:** After the prompt fix, `UNIT_COMPLETE` fired and appended to `units_completed`, but `current_unit_code`, `current_unit_name` and `lessons_completed_this_unit` never updated. The dashboard showed a stale unit while Mia taught the correct one.
**ROOT CAUSE:** The handler in `route.ts` used a hardcoded `UNIT_SEQUENCE` map keyed by bare codes (`UNIT_1`, `UNIT_2`). After the `unit_code` reconciliation migration moved to subject-prefixed codes (`IB_BM_UNIT_1`), the lookup always returned `undefined` and the entire `if(nextUnit)` block silently no-op'd.
**FIX:** Replaced the hardcoded map with a live DB lookup on the `lessons` table using `current_lesson_code`, scoped to `student_id` AND `subject` (commit 6fa0177).
**PREVENTION:** Never hardcode unit/lesson sequences in handler code — derive from the `lessons` table at runtime. When a migration changes a key format, grep the whole codebase for the old format. Hardcoded maps silently break when the data convention shifts.
**CATEGORY:** Signals
**SEVERITY:** High

---

**ISSUE:** [LC] Progress signals were parsed only in `/api/session/complete`, so closing the browser lost all session progress
**SYMPTOM:** A student who closed the tab or navigated away mid-session had no lesson completion, weak-area flags or session summary written — progress silently vanished.
**ROOT CAUSE:** Signal parsing (`[LESSON_COMPLETE]`, `[WEAK_AREA_FLAG]`, `[SESSION_SUMMARY]`, `[UNIT_COMPLETE]`) lived in the End-session route, which only fired if the student explicitly clicked "End session."
**FIX:** Moved signal parsing into `app/api/session/message/route.ts` so signals are parsed and written to Supabase after every streamed response. `/api/session/complete` was simplified to clean session closure only.
**PREVENTION:** Persist state-changing data at the point it is produced, not at an optional teardown step. Any progress that depends on a user clicking a specific button is progress that will be lost.
**CATEGORY:** Signals
**SEVERITY:** High

---

**ISSUE:** [LC] Aoife improvised the curriculum sequence instead of following the lesson order
**SYMPTOM:** In her closing forward bridge Aoife announced the wrong next lesson (e.g. "Unfair Dismissals next session" when the DB next lesson was Consumer Rights `1.2.1` — a 1.4.3 vs 1.2.1 mismatch). She also taught Employment Equality Acts as "lesson 2" when its real code is `1.4.6` — a hallucinated curriculum jump.
**ROOT CAUSE:** Aoife generated the next-lesson name from her own knowledge of "what comes next" rather than from the signal. Curriculum order was being left to model discretion.
**FIX:** Three layers. (1) Backend now fetches `next_lesson_code` and `next_lesson_name` from the `lessons` table and injects `{{NEXT_LESSON_CODE}}`/`{{NEXT_LESSON_NAME}}` tokens into the Runtime Context Block and Part 7. (2) System prompt instructs Aoife to announce the next lesson using those tokens, never improvise. (3) Signal processing makes lesson advance DB-authoritative — it looks up `next_lesson_code` from the `lessons` table by completed-lesson code and overrides whatever Aoife emitted.
**PREVENTION:** Curriculum order is owned by the `lessons` table, never by the model. Anything the student sees about lesson order must be a DB lookup injected as a token; treat model-emitted sequence values as advisory only and override them server-side.
**CATEGORY:** Signals
**SEVERITY:** High

---

**ISSUE:** [LC] Spaced-repetition recall block was skipped at the start of a session even when due
**SYMPTOM:** With `spaced_rep_due = TRUE`, Aoife opened a new session straight into new lesson content instead of running the 5-question rapid recall block.
**ROOT CAUSE:** The flag-flip logic was correct. The failure was the live context anchor: on the opening exchange it said "Begin teaching now," which Aoife interpreted as "start the lesson," overriding the weaker `SPACED_REP_DUE: TRUE` instruction buried in the static (cached) system prompt.
**FIX:** Patched the `liveContextAnchor` block in both `route.ts` and `proxy.ts`: it now detects `SPACED_REP_DUE: TRUE` in the substituted system prompt and, on the opening exchange, replaces "Begin teaching now" with an explicit mandatory instruction to run the recall block first. Commit: "B1 — force spaced rep recall block via live context anchor."
**PREVENTION:** Mandatory per-session behaviour belongs in the live context anchor (never cached, read last), not only in the static system prompt. When two instructions can conflict, the one in the most recently-read, uncached block wins — put the mandate there.
**CATEGORY:** Signals
**SEVERITY:** High

---

**ISSUE:** [IB] `weak_areas` column names didn't match what the parser and prompt assumed
**SYMPTOM:** A verification query `SELECT id, topic, lesson_code… FROM weak_areas` errored: `column "topic" does not exist`.
**ROOT CAUSE:** The prompt instruction and an early query assumed columns named `topic`/`concept`/`severity`. The actual schema used `concept_slug`, `error_description`, `recommended_action`, `occurrence_count`.
**FIX:** Updated the parser to map JSON fields to the real column names; corrected the queries.
**PREVENTION:** Before writing any signal handler or prompt that references DB columns, dump the actual table schema. Never assume column names — verify against the live schema.
**CATEGORY:** Signals
**SEVERITY:** Medium

---

**ISSUE:** [IB] Diagram pipeline appeared broken during a live session
**SYMPTOM:** A student request didn't produce a diagram; the pipeline looked broken.
**ROOT CAUSE:** False alarm — not a bug. The curriculum guard correctly held the student in their current lesson and (correctly) prioritised lesson sequencing over an off-syllabus request. The diagram pipeline itself was fine.
**FIX:** None needed — verified the pipeline separately with a direct `fetch` to `/api/diagram/generate`, which returned valid SVG.
**PREVENTION:** Test infrastructure (does the diagram render?) separately from tutor behaviour (will the tutor choose to render it?). Use direct API calls to test pipelines, not live sessions where behavioural guards interfere.
**CATEGORY:** Signals
**SEVERITY:** Low


---

**ISSUE:** [IB] Layer 2 mark schemes built but never served — disconnected from the live marking path
**SYMPTOM:** `mark_schemes` fully populated (188 rows both subjects: band_descriptor, content_checklist, criteria_marked, hybrid), admin review UI built, hybrid generator built — but no student-session code reads the table.
**ROOT CAUSE:** The serving RPC `fetch_exam_questions_tiered` returns only question fields (question_text, context_text, paper, command_term, marks, ao_level, level) — no scheme, no join to mark_schemes. Session routes (start/message/complete) contain zero references to mark_schemes. Mia marks against the markband descriptors baked into her system prompt, not the structured schemes. Question text itself carries no inline scheme.
**FIX:** None yet — decision taken to wire Layer 2 in (content_checklist only; see next entry). Scope pending.
**PREVENTION:** Rule 29. Grep the live serve path for a read of any data layer before treating it as live.
**CATEGORY:** Signals
**SEVERITY:** High

---

**ISSUE:** [IB] Layer 2 content_checklist proven to add marking value; band_descriptor proven redundant
**SYMPTOM:** Open question whether per-question schemes improve marking over the prompt's own markbands.
**ROOT CAUSE:** N/A — verification finding. band_descriptor `scheme_data` is the GENERIC IB markband ladder, identical across questions and already in Mia's prompt — redundant. content_checklist `scheme_data` holds question-specific accepted-points with per-point marks and keywords — knowledge the prompt cannot supply.
**FIX:** Live A/B on a 4-mark Econ "explain" (IB_ECON_131 interest-rate question), 04/06/2026. Round 1 (prompt-only): Mia marked depth of included points, did NOT flag the two omitted scoreable channels. Round 2 (content_checklist injected): Mia mapped the answer to the checklist, scored it 2/4, named the two missed routes (saving-incentive, exchange-rate). Decision: wire in content_checklist (and hybrid once fixed); skip band_descriptor. Caveat: even with the scheme present, haiku mis-counted mark boundaries — the wire-in must present the checklist in a clear instruction-led format and likely run the mark-award step on Sonnet (see Rule 28 — enforcement at point of action).
**PREVENTION:** Test a layer's marginal value before building or fixing it; cut redundant scheme types rather than wiring everything. The hybrid generator's quality only matters once Layer 2 is wired — it is not a live student-facing problem while schemes are unserved.
**CATEGORY:** Signals
**SEVERITY:** Medium

---

**ISSUE:** [IB] Two competing lesson pointers — a fresh session opened on the wrong lesson
**SYMPTOM:** Repointed `student_progress.current_lesson_code` to IB_ECON_131 (verified persisted in the DB); a fresh Mia session still opened on a different lesson (IB_ECON_001), ignoring the repoint.
**ROOT CAUSE:** Both `student_progress` and `sessions` carry a `lesson_code`. It is unconfirmed which is authoritative for the session's opening lesson; the new session did not reflect the updated `student_progress` value. Contradicts the single-source-of-sequence principle (Rule 6).
**FIX:** None — flagged for investigation. Not blocking: Mia accepts self-proposed practice questions regardless of the lesson pointer once told the student is exam-prep level.
**PREVENTION:** Sequence state must live in ONE authoritative place. Audit which pointer the session-start path actually reads (`student_progress.current_lesson_code` vs `sessions.lesson_code`) and collapse to one. Until then, repointing progress does not reliably change what a fresh session serves.
**CATEGORY:** Signals
**SEVERITY:** Medium

---

**ISSUE:** [IB] BM question serving falls to random fallback — subject-key mismatch between `lessons` and `questions`
**SYMPTOM:** No BM question's `topic_code` matches any BM `lessons.lesson_code` under the RPC's subject filter (0 matches). A BM student on a given lesson is served a random BM question from anywhere in the syllabus, not one for their lesson.
**ROOT CAUSE:** Subject-key inconsistency. `lessons` and `student_progress` store BM as `IB_BUSINESS`; `questions` and `mark_schemes` store it as `IB_BUSINESS_MANAGEMENT`; serving routes (session/start:144, session/message:181) use `IB_BUSINESS` internally and pass `IB_BUSINESS_MANAGEMENT` as p_subject. `fetch_exam_questions_tiered` filters BOTH `questions` and `lessons` on p_subject = `IB_BUSINESS_MANAGEMENT`. Questions match; lessons do not (they are `IB_BUSINESS`), so the `topic_code = p_lesson_code` lesson-tier ranking (tiers 1–3) never matches and every BM question falls through to the tier-4 random clause. Econ is unaffected (consistent `IB_ECONOMICS` everywhere).
**FIX:** None yet — own focused session required. Decision pending: normalise all tables/code to one subject string (migration touching `lessons` + `student_progress` + 2 route files, sequenced carefully) vs make the RPC translate subject per-table (smaller, but encodes the inconsistency). Also noted: 279 `lessons` rows with `subject = NULL` — investigate separately.
**PREVENTION:** Rule 30. One entity, one key across all tables and code.
**CATEGORY:** Signals
**SEVERITY:** High

---

**ISSUE:** [IB] BM Layer 2 scheme-aware marking shipped but unvalidated — blocked on the subject-key bug
**SYMPTOM:** BM prompt now has scheme-aware marking instructions (Section A structured-question block + Section B note, verbatim clause, merged to main green). Cannot be end-to-end tested because BM serving is random (above) — cannot reliably make Mia serve a specific scheme-bearing BM question.
**ROOT CAUSE:** N/A — status entry. The prompt change is inert-safe (fires only when a scheme is present in the served block) but its validation depends on deterministic BM serving, which is broken until the subject-key fix lands.
**FIX:** Validate BM Layer 2 after the subject-key fix, using the same served-question method proven on Econ (let Mia serve the question; do not type it — typed questions carry no scheme).
**PREVENTION:** A wired layer is not validated until tested on a served question (extends Rule 29). Test method: served question only, never student-typed.
**CATEGORY:** Signals
**SEVERITY:** Medium

### PROMPTS

---

**ISSUE:** [IB] System prompt loader referenced a prompt file version that no longer existed
**SYMPTOM:** Session start 500'd in production. Vercel logs: "IB Economics prompt not found at `/var/task/prompts/ib_economics_tutor_system_prompt_v1_0.md`".
**ROOT CAUSE:** An earlier pedagogy edit bumped both IB prompt files to `v1_1` (filename change), but `lib/system-prompt.ts` still hardcoded the `v1_0` filenames.
**FIX:** Updated both IB filename references in `lib/system-prompt.ts` to `v1_1` (commit f9a934e).
**PREVENTION:** When a versioned file is renamed, grep the codebase for all references to the old version in the same commit. Better: load prompt files by a stable name or resolve "latest version" programmatically rather than hardcoding version numbers in the loader.
**CATEGORY:** Prompts
**SEVERITY:** Critical

---

**ISSUE:** [IB] Calibrated-praise rule was written into the prompt but not followed by the model
**SYMPTOM:** Mia opened with "Exactly right" / "correct" on answers that explicitly covered only 3 of 4 required elements.
**ROOT CAUSE:** The v1.5 rule existed but sat in a low-priority pedagogy section and was phrased as a subjective judgement ("COMPLETELY correct"), leaving room to rationalise. A competing supportive-tone instruction likely outweighed it.
**FIX:** Rewrote the rule as a mechanical 4-point checklist the model must run before any affirmation, moved it high in the prompt, reframed the competing supportive-tone instruction as subordinate (prompt v1.6).
**PREVENTION:** Behavioural rules that must override the model's defaults need to be mechanical, checkable, and high in the prompt. Audit for competing instructions — a supportive-tone directive elsewhere can silently outweigh a calibrated-feedback rule.
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [LC] System prompt developer metadata leaked to the student as chat messages
**SYMPTOM:** Aoife output internal headers and intermediate layer footers (developer-facing metadata) directly into the chat as if they were teaching content.
**ROOT CAUSE:** The prompt file `lc_business_tutor_system_prompt_v1_4.md` contained developer metadata — file header, developer-notes blockquotes, intermediate layer headers, italic developer footers — written in prose; the model generated it as a visible response.
**FIX:** Added a 5-stage strip pipeline in `lib/system-prompt.ts` (strips file header, developer-notes blockquotes, intermediate layer headers, italic developer footers, orphaned dividers) before injection. Also preserved `raw_final_response` across messages so the prompt-rebuild path was not re-triggered mid-session. Commit: "Fix system prompt leak."
**PREVENTION:** Developer-facing scaffolding must never reach the model. Strip metadata at injection time, and keep prompt-authoring metadata visually distinct so the stripper can target it reliably.
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [LC] Injected runtime context block leaked verbatim to the student
**SYMPTOM:** Aoife output the runtime context block as a message — text such as "— SYSTEM PROMPT FULLY LOADED —", "active across 32 parts", "— READY FOR SESSION 12 —", and the raw `Current Context:` block.
**ROOT CAUSE:** Same family as the metadata leak — a different section (the runtime context block) was written as status-report-style prose, which the model reproduced. The header strip fixed the title leak but not this section.
**FIX:** Extended the strip pipeline to cover the runtime context block, and rewrote the block so it reads as instructions to the model rather than as a status report. Linked to the metadata-leak fix above (shared root cause).
**PREVENTION:** Never phrase any part of a system prompt as a status announcement or banner — the model will echo it. Write every prompt section as a directive ("you must…"), not a report ("the system is now…").
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [LC] Aoife restarted the session or re-introduced herself mid-conversation
**SYMPTOM:** Multiple triggers seen: a short reply like "Unit 1", "ok", "yes" or "grand" caused Aoife to restart from Lesson 1.1.1 or re-introduce herself; a confused answer caused her to offer "are you starting fresh?"; she presented a 3-option "Are you 1. answering a check question 2. continuing 3. starting fresh" menu that itself created the restart.
**ROOT CAUSE:** Aoife pattern-matched short inputs as session-type signals rather than conversational replies, and used session restart as a fallback whenever an input was unexpected. The prompt had no rule closing the restart escape route. The "grand"-after-lesson-close variant was caused by the signal emitting in a separate message from the close.
**FIX:** Added a `CRITICAL OPERATING RULE` block to the system prompt: never restart/re-introduce mid-session; treat any short/ambiguous reply as an attempt to answer the current question; a confused answer is a teaching moment, not a reset. Patched Part 9 and Part 14 to require signals to emit in the same message as the lesson close. Reinforced by the live context anchor's ABSOLUTE RULES on every message.
**PREVENTION:** Explicitly forbid the model's tempting fallback ("when unsure, restart") and tell it what to do instead. Test prompts with deliberately short, off, and one-word inputs. Keep machine signals in the same message as the content they belong to.
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [LC] Aoife lost her place in the lesson when a student went off-topic
**SYMPTOM:** After a student tangent Aoife would drift, repeat questions already asked, or guess wrong about where the lesson was — even though she was correctly told not to restart.
**ROOT CAUSE:** The live context anchor told Aoife *not* to restart but never told her *where she actually was*. With no concrete anchor she guessed her position after any disruption.
**FIX:** Patched the message route (both `route.ts` and `proxy.ts`) to inject the last 400 characters of Aoife's previous message (signal brackets stripped) verbatim into the live context anchor on every call, plus explicit templated off-topic recovery rules.
**PREVENTION:** "Don't restart" is not enough — the model needs a positive anchor. Inject the concrete tail of the prior turn so the model always has an exact reference point for "continue from here."
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [IB] Tutor told students "I can't produce images" after the diagram library shipped
**SYMPTOM:** Mia stated she couldn't produce images — factually wrong once diagrams were wired in. Students would think the diagram feature was broken.
**ROOT CAUSE:** A stale prompt line written before the diagram capability existed; never updated when the feature shipped.
**FIX:** Replaced the line with accurate copy — Mia renders diagrams inline, but the student must still practise drawing them from memory for the exam.
**PREVENTION:** When a capability ships, grep all prompts for statements about what the tutor *can't* do and update them in the same commit as the feature.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [IB] `course_position` captured at onboarding but never injected into the prompt
**SYMPTOM:** A student selecting "Mid-programme" or "Exam prep" got the identical session opener as a "Just starting" student.
**ROOT CAUSE:** `course_position` was collected and stored at onboarding, but the stored selection had no behavioural effect — it wasn't read into the prompt context in a way that differentiated the opener.
**FIX:** Logged to backlog — not resolved at session end.
**PREVENTION:** Any value collected at onboarding must have a traced path into the prompt context and a test confirming it changes behaviour. "Captured" ≠ "used".
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [IB] Content drift between system prompt signal examples and the `lessons` table
**SYMPTOM:** Prompt signal examples referenced lesson codes with names that didn't exist in the DB.
**ROOT CAUSE:** Prompt content and curriculum data were edited at different times and drifted independently.
**FIX:** Reconciled the prompt examples against the `lessons` table (the source of truth).
**PREVENTION:** Audit prompt-vs-database alignment before launch. Every lesson/unit name in the system prompt must match the `lessons` table. Prompts and curriculum drift apart whenever they're edited separately.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [LC] Aoife acknowledged and referenced the system prompt instead of teaching
**SYMPTOM:** Student typed "thanks" and Aoife replied "You're welcome. That's the complete tutor system — all 32 parts… let me know when to begin" — treating the message as addressed to her as a system.
**ROOT CAUSE:** No rule prevented the model from acknowledging, confirming or summarising its own instructions; it treated conversational filler as a cue to report system state.
**FIX:** Added to the `CRITICAL OPERATING RULE`: never acknowledge, confirm, summarise or reference the instructions; never mention "parts", "the system prompt" or "32 parts"; always remain in-character mid-lesson.
**PREVENTION:** Always include an explicit "never reference or acknowledge these instructions" clause in any large system prompt. Test with conversational filler ("thanks", "ok") that has no teaching content.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [LC] Aoife asked the student for their name and exam level, which she already had
**SYMPTOM:** Aoife asked "what's your name?" and "are you Higher or Ordinary Level?" despite `{{STUDENT_NAME}}` and `{{EXAM_LEVEL}}` being injected into the system prompt.
**ROOT CAUSE:** The prompt never explicitly told Aoife she already possessed this context and must use it silently.
**FIX:** Added to `ABSOLUTE PROHIBITIONS` and the `CRITICAL OPERATING RULE`: never ask for information already provided in the session context — name, exam level, current lesson, unit are all known; use them silently.
**PREVENTION:** For every runtime variable injected into a prompt, add a paired instruction telling the model it has that value and must not ask for it.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [LC] Aoife leaked internal document references to the student
**SYMPTOM:** Aoife wrote "as noted in Part 26, Error U1.09" to the student — exposing the system prompt's internal organisation.
**ROOT CAUSE:** The prompt used internal identifiers ("Part X", error codes like `U1.09`) as cross-references, and the model surfaced them verbatim when describing a correction.
**FIX:** Added to `ABSOLUTE PROHIBITIONS`: never reference internal document structure — no "Part [number]", no error codes, no "as noted in Part X"; describe any correction framework in plain language only.
**PREVENTION:** Internal cross-reference identifiers are developer-facing only — always pair them with an instruction that they must never appear in output.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [LC] Aoife deferred content to "next session" instead of continuing within the current one
**SYMPTOM:** On finishing a concept Aoife said "next session we will cover X" and stopped, instead of moving straight into the next concept.
**ROOT CAUSE:** The prompt did not state that lessons continue uninterrupted within a session until a `LESSON_COMPLETE` signal or an explicit student end.
**FIX:** Added to the `CRITICAL OPERATING RULE`: never say "next session we will cover X"; on completing a concept move immediately to the next; only stop on a `LESSON_COMPLETE` signal or when the student ends the session.
**PREVENTION:** State session boundaries explicitly in the prompt — define exactly what ends a session and instruct the model that nothing else does.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [LC] Aoife over-marked Stage 4 "Apply" task responses
**SYMPTOM:** A 2–3 sentence practice answer to a short Apply task was marked against the full long-question SRP (Statement-Reason-Point) criteria, scoring it harshly and inaccurately.
**ROOT CAUSE:** With no question context attached, Aoife defaulted to the heaviest marking framework instead of marking against the task as set.
**FIX:** Added Stage 4 marking guidance to the system prompt: mark an Apply task response against the task specification only; use full long-question SRP criteria only when the task explicitly asks for a long-question answer.
**PREVENTION:** When a prompt contains multiple marking rubrics, specify exactly which inputs select which rubric — never let the model pick the default when context is missing.
**CATEGORY:** Prompts
**SEVERITY:** Medium

---

**ISSUE:** [IB] Tutor used hedging/move-narration filler phrases
**SYMPTOM:** Mia narrated her next move — "let me push you slightly deeper", "let me challenge you on that" — which read as AI narration rather than natural teaching.
**ROOT CAUSE:** No prompt instruction against move-narration.
**FIX:** Added a tone rule to both IB prompts: never narrate the next move, ask the harder question directly.
**PREVENTION:** Include an explicit anti-narration / anti-hedging tone-and-phrasing prohibition block in every tutor prompt from v1.
**CATEGORY:** Prompts
**SEVERITY:** Low

---

**ISSUE:** [IB] IB BM prompt file header specified the wrong model
**SYMPTOM:** The prompt file header read `Model: claude-sonnet-4-6` when tutoring is meant to run on Haiku.
**ROOT CAUSE:** Header metadata was written before the model strategy (Haiku default, Sonnet for vision only) was locked.
**FIX:** Flagged — the actual API call was confirmed to use the Haiku env-default, so cost impact was nil. The header is cosmetic but should be corrected.
**PREVENTION:** Treat prompt-file header metadata as documentation that must match the real API call. Audit headers against the model strings in `route.ts`.
**CATEGORY:** Prompts
**SEVERITY:** Low


---

**ISSUE:** [IB] `SESSION OPENING` section had no `course_position` branching — exam-prep students opened in beginning mode
**SYMPTOM:** Exam-prep students received foundational teach-from-zero opening (Mia defined "what is a business" from scratch) instead of paper/marks/command-term framing + pivot to an exam-style question. The `course_position` value was correctly stored and substituted; behaviour didn't change.
**ROOT CAUSE:** Two competing instruction sets governed the opening turn. The `LESSON STRUCTURE` section had a `course_position` modifier, but `SESSION OPENING` (later in the prompt, more specific to the first response) said "Begin teaching directly" universally. The `liveContextAnchor` in `app/api/session/message/route.ts` also reinforced "Begin teaching now" with no exam-prep qualifier. Three instructions, one branched on `course_position`; the unbranched two won.
**FIX:** Added explicit three-way `course_position` branch to `SESSION OPENING` step 4 AND mirrored the branch in `liveContextAnchor`. Commits `8af3b5d` (IB Business) and `8f5271b` (IB Economics); merged as `61825c9` and `cb93b9b`.
**PREVENTION:** When a runtime variable should drive behaviour, ALL instruction surfaces (system prompt sections + live context anchor + per-turn injections) must explicitly branch on the same variable. Silent disagreement between surfaces means the unbranched surface wins. Treat prompt + parser + handler + anchor as one atomic change.
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [IB] Template variable substituted mid-sentence produced broken grammar; the branches under it became orphans
**SYMPTOM:** IB Economics exam-prep test: Mia opened with "Did you finish the definition or did we move into scarcity?" — asked the student to confirm coverage despite an explicit "never ask" instruction. The three exam-prep / mid-programme / beginning branches were defined but ignored.
**ROOT CAUSE:** Prompt wrote "Behaviour for step 4 depends on `{{COURSE_POSITION}}`:" — after substitution this read "Behaviour for step 4 depends on exam-prep:", which the model parsed as a statement of fact, not a directive. The three branches below became orphaned with no instruction telling Mia to pick one.
**FIX:** Rewrote to "Behaviour for step 4 depends on the student's course position. `{{COURSE_POSITION}}` = the student's position. Pick the matching block below:" — variable becomes a label, not a verb object. Commit `8f5271b`.
**PREVENTION:** When designing prompts with template variables, mentally substitute each possible value and read the resulting sentence. Variables should appear as labels (`{{VAR}} = the value`), not as objects of action verbs. Test with at least one substitution before shipping.
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [IB] Stored prompt cached at session start (`sessions.raw_final_response`) — prompt changes invisible until a fresh session is created
**SYMPTOM:** First post-fix test of `course_position` change failed: Mia behaviour didn't change despite confirmed deploy. Appeared the fix was wrong; ~15 minutes of further misdiagnosis before the cache architecture was identified.
**ROOT CAUSE:** The system prompt is substituted with student-specific values at session START and stored in `sessions.raw_final_response`. Pre-existing open sessions retain the OLD prompt — only freshly-created sessions execute the new code path. The first test resumed an in-progress session and pulled the cached pre-fix prompt.
**FIX:** Closed all open sessions via SQL (`UPDATE public.sessions SET ended_at = now() WHERE student_id = X AND ended_at IS NULL`), then started a genuinely new session. New `session_number` = old + 1; new prompt loaded; behaviour changed.
**PREVENTION:** Document this architecture explicitly. Prompt and session-start logic changes only affect NEW sessions. Test protocol after any prompt change: (1) close all open sessions for the test user in Supabase, (2) hard-refresh browser, (3) start new session from dashboard, (4) verify `session_number` incremented BEFORE judging behaviour. Replicate this protocol on any new product that caches prompts at session start.
**CATEGORY:** Prompts
**SEVERITY:** High

---

**ISSUE:** [IB] Prompt prohibition not strong enough — model rationalised around it
**SYMPTOM:** Despite "Never ask the student where they left off", Mia opened with "what's the last thing you remember covering?" — treating coverage-confirmation as different from where-you-left-off.
**ROOT CAUSE:** Single-phrase prohibition didn't enumerate the variants the model could rationalise (asking what was covered, what they remember, to confirm previous session content). The model found a semantic neighbour the prohibition didn't cover.
**FIX:** Expanded to enumerate variants: "do NOT ask the student where they left off, what they covered, what they remember, or to confirm any part of the previous session. The summary is the truth."
**PREVENTION:** For any "never do X" instruction in a prompt, enumerate the rationalised neighbours: never-ask-X, never-confirm-X, never-rephrased-X. If a semantic neighbour exists, the prohibition will leak. Test with hostile edge cases before shipping.
**CATEGORY:** Prompts
**SEVERITY:** Medium



### AUTH

---

**ISSUE:** [IB] Email confirmation enabled in Supabase → `signUp()` returns a null session → every authenticated API route returns 401
**SYMPTOM:** New IB signups failed at checkout and again at the final onboarding screen. Presented inconsistently — "Failed to save progress" on the onboarding screen, a generic failure at checkout — but the logs showed `POST /api/checkout/ib` and `POST /api/onboarding/ib` both returning `401 Unauthorised`.
**ROOT CAUSE:** With "Confirm email" switched ON in Supabase Auth settings, `supabase.auth.signUp()` creates the account but returns `session: null` and sets no auth cookie. Every server route that calls `createServerClient().auth.getUser()` then sees a null user and 401s. The LC flow never exposed this because LC signup does not immediately call an authenticated API route.
**FIX:** Disabled "Enable email confirmations" in Supabase → Authentication → Settings. `signUp()` then returns a real session immediately and the whole signup → checkout → onboarding chain authenticates. A stale test account created before the toggle change still had no session — fresh accounts were needed to verify.
**PREVENTION:** Decide the email-confirmation policy before building any auth flow. If confirmation must stay ON, no server route can rely on a session immediately after signup — that path must be designed for explicitly (service-role + token). After changing the toggle, always test with a brand-new account; existing accounts keep their old session state.
**SEE ALSO:** On LC this setting was found switched *off*, silently accepting typo'd addresses (see *"Confirm email" was OFF*, Email). The setting belongs ON — but turning it on is what exposes this 401, so design the signup flow for it.
**CATEGORY:** Auth
**SEVERITY:** Critical

---

**ISSUE:** [IB] `signUp()` on the `@supabase/ssr` browser client does not write the auth cookie before a same-execution `fetch()`
**SYMPTOM:** Even after email confirmation was disabled, the first `fetch('/api/checkout/ib')` fired straight after signup still 401'd — the server saw no session cookie.
**ROOT CAUSE:** The cookie write is an asynchronous side-effect of the `@supabase/ssr` client's internal storage handler; `signUp()` can return before the cookie lands. The IB flow calls `fetch()` in the same microtask, before the cookie exists from the server's perspective. LC signup never hit this because it ends with `router.push('/subscribe')` — a full browser navigation gives the cookie time to settle.
**FIX:** Added `supabase.auth.signInWithPassword()` immediately after `signUp()` in the signup handler. `signInWithPassword()` performs a full auth round-trip and writes the session cookie synchronously as part of its response handling, so the subsequent `fetch()` carries it.
**PREVENTION:** Never fire an authenticated `fetch()` in the same execution as `signUp()`. Either follow signup with a full-page navigation, or force a `signInWithPassword()` first to guarantee the cookie is written. Linked to the email-confirmation issue above — same 401 symptom, separate root cause; both had to be fixed.
**CATEGORY:** Auth
**SEVERITY:** Critical

---

**ISSUE:** [IB] User session does not survive the Stripe redirect back to `/onboarding` → onboarding completion API returns 401
**SYMPTOM:** The final onboarding screen ("Got it, let's start") returned "Failed to save progress"; logs showed `POST /api/onboarding/ib → 401`. A Bearer-token fallback that fixed the checkout route did not hold here.
**ROOT CAUSE:** The cookie session did not reliably carry across the external Stripe redirect from checkout back to `/onboarding`. Repeated cookie/token patches on the route missed because the session simply wasn't present by the time the route ran.
**FIX:** Switched `app/api/onboarding/ib/route.ts` to a Supabase service-role client (`SUPABASE_SERVICE_ROLE_KEY`), read `user_id` from the `Authorization: Bearer` token instead of from `getUser()`, and used the admin client for all writes — bypassing RLS and the cookie session entirely. The onboarding page passes the token explicitly via `supabase.auth.getSession()`.
**PREVENTION:** Any API route reached *after* an external redirect (Stripe, OAuth) cannot assume a cookie session. Authenticate it with a Bearer token validated by a service-role client, and have the calling page pass the token explicitly. Stop iterating on cookie patches once logs confirm the session isn't arriving — switch authentication strategy.
**CATEGORY:** Auth
**SEVERITY:** High

---

**ISSUE:** [IB] Signed-up-but-not-subscribed users could not reach the landing page
**SYMPTOM:** After signing up without completing checkout, hitting the root URL on either domain redirected straight to `/dashboard` — with no way back to pricing.
**ROOT CAUSE:** `app/page.tsx` redirected *all* authenticated users to `/dashboard` regardless of subscription status, and the Supabase session cookie persisted after signup.
**FIX:** Added a subscription-status check — redirect to `/dashboard` only if `subscription_status` is `active` or `trialing`; otherwise render the landing page.
**PREVENTION:** "Authenticated" and "subscribed" are different states. Any auth-gated redirect must check subscription status, not just session presence.
**CATEGORY:** Auth
**SEVERITY:** High

---

**ISSUE:** [LC] `createServerClient()` called without `await`, breaking the Vercel build
**SYMPTOM:** Vercel builds failed at the type-check step: `Type error: Property 'auth' does not exist on type 'Promise<SupabaseClient>'`. It recurred across `app/api/stripe/checkout/route.ts`, `app/api/session/complete/route.ts` and `app/api/auth/signout/route.ts`.
**ROOT CAUSE:** Next.js 16 made `cookies()` from `next/headers` async, so `createServerClient()` became async (it `await`s `cookies()`), but callers used `const supabase = createServerClient();` without `await` — leaving `supabase` a Promise.
**FIX:** Made `createServerClient()` `async function`, and changed every caller to `const supabase = await createServerClient();`. Pushed per file as each failed build surfaced the next.
**PREVENTION:** When a shared helper becomes async, grep the whole repo for every call site in the same commit and add `await` everywhere — don't fix call sites reactively one failed build at a time.
**CATEGORY:** Auth
**SEVERITY:** High

---

**ISSUE:** [LC] Redirect loop between dashboard and login from a localStorage-vs-cookie auth mismatch
**SYMPTOM:** During Sprint 1, signing in bounced the user in a redirect loop and the dashboard never rendered.
**ROOT CAUSE:** Dashboard data-fetching components used a client that stored the session in `localStorage`, but `proxy.ts` reads auth state server-side from cookies. The server saw no session, redirected to login; the client thought it was signed in, redirected back — loop.
**FIX:** Switched to `@supabase/ssr`'s `createBrowserClient` so the session is stored in cookies the proxy can read. Rebuilt the dashboard as a Server Component that fetches data server-side and passes it to a `DashboardClient` Client Component for interactivity.
**PREVENTION:** Session storage must be consistent across the stack — if middleware/proxy reads cookies, the client must write cookies. Never mix `localStorage`-based and cookie-based Supabase clients in one app.
**CATEGORY:** Auth
**SEVERITY:** High

---

**ISSUE:** [LC] Supabase SSR cookie handler used the wrong API for the installed version
**SYMPTOM:** Auth failed during the initial build — the cookie handlers did not work.
**ROOT CAUSE:** `@supabase/ssr` changed its cookie handler API between 0.4.x and 0.10.x: the newer version requires `getAll()`/`setAll()`, but the code used the old `get()`/`set()`/`remove()`.
**FIX:** Rewrote the cookie handler in `lib/supabase/server.ts` to use `getAll()`/`setAll()` matching the installed `@supabase/ssr` version.
**PREVENTION:** Pin SSR/auth library versions and write cookie handlers against the installed version's documented API — don't copy handler code from an older tutorial without checking the version.
**CATEGORY:** Auth
**SEVERITY:** Medium

---

**ISSUE:** [LC] Incorrect Supabase package imports
**SYMPTOM:** Build/import errors — `@supabase/auth-helpers-nextjs` was imported but had never been installed; separately, `SupabaseClient` was imported from `@supabase/ssr` instead of `@supabase/supabase-js`. Recurred across the initial build, Sprint 1 and Sprint 2.
**ROOT CAUSE:** The project standardised on `@supabase/ssr` (`createServerClient` from `@/lib/supabase/server`), but tutorial-pattern code kept reintroducing the deprecated `auth-helpers` package and wrong-package type imports.
**FIX:** Replaced all `@supabase/auth-helpers-nextjs` usage with the project's `@supabase/ssr` pattern; corrected `SupabaseClient` to import from `@supabase/supabase-js`.
**PREVENTION:** Fix the project's canonical Supabase import pattern once, document it in GRADD notes, and reject any code introducing `auth-helpers` — it is not installed and not the project standard.
**CATEGORY:** Auth
**SEVERITY:** Medium

---

**ISSUE:** [LC] Middleware matcher did not exclude all API routes
**SYMPTOM:** API routes were being processed by the auth middleware when they should not have been.
**ROOT CAUSE:** The matcher excluded only `api/webhooks` rather than the whole `api/` path, so other API routes were incorrectly gated.
**FIX:** Updated the middleware matcher to exclude all `api/` routes, not just `api/webhooks`.
**PREVENTION:** Auth middleware matchers should exclude the entire API namespace by default; opt specific API routes back in if they genuinely need session gating.
**CATEGORY:** Auth
**SEVERITY:** Medium

---

**ISSUE:** [LC] `getSession()` used server-side instead of `getUser()`
**SYMPTOM:** Server-side auth checks relied on `getSession()`, which does not revalidate the token against Supabase.
**ROOT CAUSE:** `getSession()` reads the session from the cookie without verifying it; `getUser()` revalidates with the auth server and is the correct call for server-side trust decisions.
**FIX:** Replaced `getSession()` with `getUser()` throughout server-side code.
**PREVENTION:** Use `getUser()` for any server-side authorization decision; reserve `getSession()` for non-security UI hints only.
**CATEGORY:** Auth
**SEVERITY:** Low


### STRIPE / BILLING

---

**ISSUE:** [IB] Welcome email never fired after an IB checkout
**SYMPTOM:** A completed test checkout produced no email in the Resend logs and surfaced no error.
**ROOT CAUSE:** Two stacked causes. (1) **Wrong webhook endpoint** — the Stripe webhook pointed only at `gradd.ie`; IB checkouts on `gradd.ai` had no endpoint receiving the event. (2) **Race condition** — the handler queried `profiles.subject` for the email branch, but the client-side onboarding that sets `subject = 'IB_BUSINESS'` runs *after* the Stripe redirect, so the profile still read `LC_BUSINESS` when the webhook fired.
**FIX:** Added a second Stripe webhook endpoint for `gradd.ai` with its own signing secret (`STRIPE_WEBHOOK_SECRET_AI`). Rewrote the handler to read `ib_subject` and `exam_level` directly from `session.metadata` instead of querying the profile.
**PREVENTION:** When one codebase serves multiple domains, every domain needs its own webhook endpoint. Always read decision-driving data from the Stripe event `metadata`, never from a DB row that may not have been written yet.
**SEE ALSO:** Same root-cause family as the LC *Stripe webhook race condition* entry (Stripe/Billing).
**CATEGORY:** Stripe/Billing
**SEVERITY:** Critical

---

**ISSUE:** [LC] Stripe webhook race condition left new subscribers inactive after paying
**SYMPTOM:** A first-time subscriber completed payment in Stripe but `subscription_status` stayed `inactive`; post-checkout polling timed out and bounced them to `/subscribe`. The `profiles` row had `stripe_customer_id = NULL`.
**ROOT CAUSE:** `customer.subscription.created` fires *before* `checkout.session.completed`. The subscription handler matched the profile on `stripe_customer_id`, which had not been written yet, found nothing, and silently did nothing. By the time `checkout.session.completed` wrote the profile, the front-end polling had given up.
**FIX:** `handleSubscriptionChange` now matches on `stripe_customer_id` first and, on no match, falls back to the `supabase_user_id` passed in the checkout session `metadata`. Commit: "Fix webhook: metadata fallback for first-time subscribers."
**PREVENTION:** Never assume webhook event ordering. Every handler must resolve the user from data guaranteed present from the first event — pass `supabase_user_id` in checkout `metadata` and make it the universal fallback key.
**SEE ALSO:** Same root-cause family as the IB *Welcome email never fired* entry (Stripe/Billing) — reading data before the event that writes it has landed.
**CATEGORY:** Stripe/Billing
**SEVERITY:** Critical

---

**ISSUE:** [IB] `subscription_tier` hardcoded to `business_monthly` for all subscribers
**SYMPTOM:** IB subscribers had `subscription_tier` written as the LC value.
**ROOT CAUSE:** The webhook handler hardcoded the tier string regardless of which product was purchased.
**FIX:** Derived the tier from `session.metadata.ib_subject` — `ib_economics_monthly` / `ib_business_monthly` / `ib_bundle_monthly`, falling back to `business_monthly`.
**PREVENTION:** No product-identifying field should be hardcoded in a shared webhook handler. Derive everything product-specific from event metadata.
**CATEGORY:** Stripe/Billing
**SEVERITY:** High

---

**ISSUE:** [IB] Webhook signature verification used a single shared signing secret across endpoints
**SYMPTOM:** A single `STRIPE_WEBHOOK_SECRET` was read unconditionally — fine for one domain, but signature verification would fail for events delivered to a second endpoint.
**ROOT CAUSE:** Stripe issues a unique signing secret per webhook endpoint; one env var cannot serve two endpoints.
**FIX:** Selected the secret by request host header — `gradd.ai` → `STRIPE_WEBHOOK_SECRET_AI`, else `STRIPE_WEBHOOK_SECRET`.
**PREVENTION:** Multi-domain Stripe setup checklist — one webhook endpoint per domain, one signing secret per endpoint, one env var per secret, hostname-aware secret selection inside the route handler.
**SEE ALSO:** Complements the single-domain LC rule (see *Multiple Stripe webhook endpoints*, Stripe/Billing): one endpoint per domain, all events on it, a distinct secret each.
**CATEGORY:** Stripe/Billing
**SEVERITY:** High

---

**ISSUE:** [IB] Stripe checkout page showed LC Business branding
**SYMPTOM:** The IB checkout displayed generic/LC branding and product descriptions.
**ROOT CAUSE:** Stripe account branding and per-product descriptions were never set for the IB products.
**FIX:** Set account-level branding (name "Gradd", colours `#1b3d2f` / `#d97706`, icon) and per-product descriptions on each IB Product object.
**PREVENTION:** Stripe branding and per-product copy is a launch-checklist item *per product line* — it lives in the Stripe dashboard, not the codebase, so it's easy to forget.
**CATEGORY:** Stripe/Billing
**SEVERITY:** Medium

---

**ISSUE:** [LC] Stripe API version string mismatched the installed SDK
**SYMPTOM:** Build/type errors from the Stripe client. Wrong version strings used: `2024-06-20`, then `2025-03-31.basil`.
**ROOT CAUSE:** The hardcoded `apiVersion` did not match the version expected by the installed `stripe` package.
**FIX:** Corrected `apiVersion` to `2026-03-25.dahlia` to match the installed package.
**PREVENTION:** When initialising the Stripe client, set `apiVersion` to the exact version the installed SDK expects; re-check it whenever the `stripe` package is upgraded.
**CATEGORY:** Stripe/Billing
**SEVERITY:** Medium

---

**ISSUE:** [LC] Stripe product IDs used in code where price IDs were required
**SYMPTOM:** Checkout configuration referenced `prod_…` identifiers instead of `price_…` identifiers.
**ROOT CAUSE:** Confusion between a Stripe Product (the thing sold) and a Price (a specific way to pay for it); checkout sessions require the price ID.
**FIX:** Replaced all `prod_…` references with the correct `price_…` IDs (six price objects: monthly and annual for each of three tiers).
**PREVENTION:** Checkout always references `price_…` IDs. Label which IDs are products vs prices in `.env` and the GRADD setup notes so the distinction can't be lost.
**CATEGORY:** Stripe/Billing
**SEVERITY:** Medium

---

**ISSUE:** [LC] Multiple Stripe webhook endpoints created instead of one
**SYMPTOM:** Several webhook endpoints were registered in the Stripe dashboard, each listening to a subset of events.
**ROOT CAUSE:** Endpoints were added per-event during setup instead of one endpoint subscribed to all required events.
**FIX:** Consolidated to a single endpoint at `/api/webhooks/stripe` listening to all five events (`customer.subscription.created/updated/deleted`, `invoice.payment_succeeded/failed`).
**PREVENTION:** One webhook endpoint, all events. Multiple endpoints fragment delivery, complicate signature verification and make debugging harder.
**SEE ALSO:** Single-domain guidance. For the multi-domain (gradd.ai) setup the rule extends: one endpoint *per domain*, each with its own signing secret (see *single shared signing secret*, Stripe/Billing).
**CATEGORY:** Stripe/Billing
**SEVERITY:** Medium

---

**ISSUE:** [IB] "No email" appeared to be a billing bug — was actually an unfinished checkout
**SYMPTOM:** A checkout event showed `status: "open"`, `payment_status: "unpaid"`, and no `checkout.session.completed`.
**ROOT CAUSE:** False alarm — the test checkout was created but the payment flow was never completed, so the completion event never fired.
**FIX:** None — completed the checkout properly with a Stripe test card.
**PREVENTION:** Before debugging a missing webhook, check the session `status` and `payment_status` in the event payload. `open`/`unpaid` means the user never finished — not a code bug.
**CATEGORY:** Stripe/Billing
**SEVERITY:** Low


### EMAIL

---

**ISSUE:** [IB] IB welcome email used the LC Business header image
**SYMPTOM:** IB students received a welcome email with a "Gradd · Leaving Cert Business · gradd.ie" header graphic.
**ROOT CAUSE:** The IB template's header `<img>` src pointed at `https://gradd.ie/gradd-email-header.svg` — the LC asset.
**FIX:** Replaced the image header with a text-based "Gradd" wordmark in HTML — no image-hosting dependency, consistent rendering across email clients.
**PREVENTION:** When forking a template for a new product, audit every absolute asset URL. Prefer text/CSS headers over hosted images in email — fewer cross-domain and dark-mode failures.
**CATEGORY:** Email
**SEVERITY:** High

---

**ISSUE:** [LC] Supabase "Confirm email" was OFF — no confirmation email was ever sent
**SYMPTOM:** A user reported no email arrived after signup. Investigation found Supabase Authentication → Email → "Confirm email" was disabled, so users were signed in immediately without verifying their address.
**ROOT CAUSE:** Email confirmation had never been switched on. Beyond the missing email, this meant typo'd email addresses were accepted silently — and the weekly progress email and password-reset email both go to that address.
**FIX:** Turned "Confirm email" ON, installed a branded `supabase-confirm-email.html` template via Auth → Email Templates, and configured Resend as the SMTP provider (`smtp.resend.com` port 465). Post-confirmation redirect set to `/subscribe`.
**PREVENTION:** For any product where the account email later delivers value, email confirmation must be ON from launch. Verify the full signup → confirm → redirect chain on a fresh account before going live.
**SEE ALSO:** The IB build hit the opposite failure — confirmation switched *on* broke the signup session flow (see *Email confirmation enabled in Supabase*, Auth). Confirmation belongs ON; the signup flow must be built to expect it.
**CATEGORY:** Email
**SEVERITY:** High

---

**ISSUE:** [IB] No inbox existed for `hello@gradd.ie` / `hello@gradd.ai`
**SYMPTOM:** A Trustpilot confirmation email never arrived.
**ROOT CAUSE:** Resend is send-only. `hello@gradd.ie` is an outbound address with no mailbox; inbound mail had nowhere to land.
**FIX:** Used a personal inbox for the Trustpilot signup.
**PREVENTION:** Resend does not receive mail. If a real inbox is needed (verification, support replies), set up forwarding at the registrar or a separate mail provider.
**CATEGORY:** Email
**SEVERITY:** Medium

---

**ISSUE:** [LC] DNS misconfiguration blocked inbound mail and risked outbound deliverability
**SYMPTOM:** Email setup for `gradd.ie` did not work cleanly until DNS was corrected in Smarthost.
**ROOT CAUSE:** A stale MX record was still present, and there were duplicate SPF (TXT) records — multiple SPF records on one domain is invalid and breaks SPF evaluation.
**FIX:** Deleted the old MX record, merged the duplicate SPF records into a single valid SPF record, and set the correct records for Resend (sending) and ImprovMX (`hello@gradd.ie` forwarding).
**PREVENTION:** A domain may have exactly one SPF record — merge, never duplicate. Remove stale MX records before pointing mail at a new provider. Verify SPF/DKIM/MX with a checker after any DNS change.
**CATEGORY:** Email
**SEVERITY:** Medium

---

**ISSUE:** [IB] `gradd.ai` not verified as a Resend sending domain
**SYMPTOM:** Could not send IB emails from `hello@gradd.ai`.
**ROOT CAUSE:** Only `gradd.ie` was verified in Resend; the free plan allows one domain.
**FIX:** Sent IB emails from the verified `hello@gradd.ie` for now — a one-line swap to `hello@gradd.ai` once the plan is upgraded.
**PREVENTION:** Sending-domain verification per product domain is a launch dependency. The sending address is cosmetic short-term — don't let it block.
**CATEGORY:** Email
**SEVERITY:** Low


### DEPLOYMENT

---

**ISSUE:** [IB] Vercel build failed — `Cannot find name 'logoSrc'`
**SYMPTOM:** TypeScript type-check failure: `logoSrc` used at line 162 of `DashboardClient.tsx` but defined at line 484.
**ROOT CAUSE:** The variable was defined in a different scope from where it was used — out of scope at the use site (the `Nav` sub-component).
**FIX:** Moved the `logoSrc` definition into the `Nav` sub-component where the `<img>` lives.
**PREVENTION:** Define derived variables inside the component that consumes them. When a file has sub-components, scope is per-function, not per-file.
**CATEGORY:** Deployment
**SEVERITY:** High

---

**ISSUE:** [IB] A webhook secret env var change wasn't picked up by deploys
**SYMPTOM:** The welcome email still didn't fire after the `STRIPE_WEBHOOK_SECRET_AI` change; it started working only after an unrelated logging commit.
**ROOT CAUSE:** Earlier deploys hadn't picked up the env var change cleanly; the later commit forced a fresh build that applied it.
**FIX:** An unrelated logging commit triggered a fresh build that picked up the change.
**PREVENTION:** After adding or changing a Vercel env var, trigger a fresh deployment explicitly. Don't assume a redeploy of the same commit picked it up.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [IB] An in-flight chat session crashed after the DB state changed underneath it
**SYMPTOM:** "Failed to start session" / 500 after a `unit_code` migration plus a test-account reset; an open Mia tab couldn't resume.
**ROOT CAUSE:** Partly stale session state, but the real crash was the unrelated prompt-file-not-found bug. The open tab masked the actual cause initially.
**FIX:** Fixed the underlying prompt path bug; fresh sessions then worked.
**PREVENTION:** After running migrations or resetting test data, close and reopen sessions rather than resuming. When a "session crash" appears, get the actual server error from Vercel logs before assuming it's session-state related.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [IB] Vercel edge stripped the Authorization header on cron requests
**SYMPTOM:** The trial-reminder cron returned auth failures despite the secret being correct.
**ROOT CAUSE:** Vercel edge strips custom `Authorization` headers; the cron's bearer-token auth never received the token.
**FIX:** Switched cron authentication to a query-parameter secret (`?secret=…`).
**PREVENTION:** For Vercel cron routes, don't rely on the `Authorization` header — use a query-parameter secret or a Vercel-provided cron mechanism. Test cron auth in the actual Vercel environment, not just locally.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [LC] An erroneous route file broke the Vercel build
**SYMPTOM:** A Vercel build failed; the cause was `app/api/auth/confirm-signup/route.ts` containing old weekly-email code that no longer belonged there.
**ROOT CAUSE:** A leftover/misplaced file from an earlier email iteration was still in the repo and failed to compile against the current code.
**FIX:** Identified and deleted `app/api/auth/confirm-signup/route.ts`; the build went green.
**PREVENTION:** When superseding an implementation, delete the old file in the same commit. Periodically scan `app/api` for routes that are no longer referenced.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [LC] Vercel served a stale build from cache while new code never deployed
**SYMPTOM:** The "Ready" production deployment was the original scaffold commit; later commits showed as failed builds, so none of the actual app pages had ever reached production. Rebuilds restored the build cache from a previous deployment.
**ROOT CAUSE:** Vercel restored the build cache from a prior deployment; combined with earlier failing builds, the live "Ready" deployment lagged well behind `main`.
**FIX:** Forced a clean deploy with an empty commit (`git commit --allow-empty -m "force clean build"`) and confirmed the new deployment's commit hash matched the latest push.
**PREVENTION:** After any push, verify the top Vercel deployment is green AND its commit hash matches `main` — "Ready" alone is not confirmation. When a fix doesn't appear, force a cache-free rebuild before debugging the code.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [LC] Two Next.js config files caused unpredictable config loading
**SYMPTOM:** `next.config.js` and `next.config.ts` both existed; Next.js picked one and ignored the other unpredictably.
**ROOT CAUSE:** A second config file was created without removing the first. Next.js does not merge them.
**FIX:** Kept only `next.config.js` (with `serverExternalPackages: ['@anthropic-ai/sdk']`), reverted `next.config.ts` to empty and deleted it.
**PREVENTION:** Exactly one Next.js config file in the repo. When adding config, edit the existing file — never create a parallel one in another extension.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [LC] `middleware.ts` had to be renamed to `proxy.ts` for Next.js 16
**SYMPTOM:** Vercel build logs warned `The "middleware" file convention is deprecated. Please use "proxy" instead`; the middleware did not behave as expected under Next.js 16.
**ROOT CAUSE:** Next.js 16 renamed the middleware file convention to `proxy`.
**FIX:** Renamed `middleware.ts` to `proxy.ts`; auth gating now runs via `proxy.ts`.
**PREVENTION:** On a major framework upgrade, read the upgrade guide for renamed file conventions and apply them before debugging behaviour. Auth gating is via `proxy.ts`, not `middleware.ts`.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [LC] TypeScript strict-mode type errors blocked the initial build
**SYMPTOM:** Multiple build failures at the type-check step — implicit `any` types in dashboard `.map()` callbacks, and incorrect typing on the message-history array passed to the Anthropic API.
**ROOT CAUSE:** Code written without explicit types tripped TypeScript strict mode, which Vercel enforces at build time.
**FIX:** Added explicit types to the dashboard map callbacks and typed the message-history array correctly for the Anthropic SDK.
**PREVENTION:** Write to strict mode from the start — no implicit `any`. Run `next build` (or `tsc --noEmit`) locally before pushing so type errors surface before Vercel.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [LC] TypeScript null-safety error broke the Vercel build
**SYMPTOM:** Build failed: `./app/session/page.tsx:36:19 Type error: 'progress' is possibly 'null'.` — `progress.current_lesson_code` was accessed directly while sibling lines used `progress?.`.
**ROOT CAUSE:** A nullable value was accessed without the optional-chaining/fallback applied to its sibling reads.
**FIX:** Applied `?.` with a fallback to the offending access, matching the surrounding lines.
**PREVENTION:** When a value is nullable, treat every read of it consistently — optional-chain or guard all of them.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [IB] Vercel deploy failed cloning the repo — HTTP 500
**SYMPTOM:** "There was a permanent problem cloning the repo. The git provider returned an HTTP 500 error."
**ROOT CAUSE:** False alarm — a transient GitHub-side outage; nothing wrong with the code or the push.
**FIX:** Redeployed; it cleared.
**PREVENTION:** A 500 on git clone is a hosting hiccup. Redeploy before investigating code.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [IB] Claude Code CLI broke after an auto-update
**SYMPTOM:** `claude.exe is not recognized…` / `Auto-update failed`.
**ROOT CAUSE:** A failed auto-update left the global install broken.
**FIX:** `npm i -g @anthropic-ai/claude-code`.
**PREVENTION:** Tooling issue, not product. If the CLI fails to launch, reinstall it globally before anything else.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [IB] A local debug route was tested against localhost instead of production
**SYMPTOM:** A debug page URL was given as `http://localhost:3000/...` when the goal was to verify the deployed Vercel build.
**ROOT CAUSE:** Confusion between the local dev server and the deployed environment.
**FIX:** Used the production URL instead.
**PREVENTION:** When verifying a deployed fix, always test the deployed URL, not localhost. Localhost only proves local code, not what shipped.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [IB] `vercel logs` piped through `grep` repeatedly failed under Windows PowerShell, burning debugging time
**SYMPTOM:** Log-tail commands died with broken-pipe / `ECONNRESET`; background monitor scripts exited 1. Several debugging turns were lost fighting the log pipe instead of diagnosing the actual 401.
**ROOT CAUSE:** The `vercel logs --follow | grep ...` pattern doesn't survive PowerShell's pipe handling, and the follow stream drops on its own.
**FIX:** Stopped tailing logs through a pipe. Added a tagged `console.error` (e.g. `IB CHECKOUT AUTH DEBUG: {...}`) directly in the route, deployed, triggered the flow once, and read the deploy log directly.
**PREVENTION:** On Windows, don't pipe `vercel logs` through `grep`. Add a tagged `console.error` at the code path under investigation and read the deploy log straight — faster diagnosis, no shell-compatibility fight.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [LC] Resend package not installed before the build that imported it
**SYMPTOM:** The Sprint 2 build failed because the email code imported `resend` but the package was not in `node_modules`.
**ROOT CAUSE:** New email code was committed before `npm install resend` was run.
**FIX:** Ran `npm install resend`; the build passed.
**PREVENTION:** Install a dependency in the same step as committing the code that imports it; never commit an import for an uninstalled package.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [LC] Leftover `--turbo=false` in the `package.json` dev script crashed `npm run dev`
**SYMPTOM:** `npm run dev` failed immediately: `error: unknown option '--turbo=false'`.
**ROOT CAUSE:** A `--turbo=false` flag added during earlier Turbopack troubleshooting was left in; Next.js 16 does not accept that option.
**FIX:** Reverted the `dev` script to `"dev": "next dev"`.
**PREVENTION:** Revert experimental CLI flags as soon as they're proven ineffective; don't leave troubleshooting changes in `package.json`.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [LC] Turbopack FATAL panics on the Windows local dev server
**SYMPTOM:** `npm run dev` printed `FATAL: An unexpected Turbopack error occurred…` repeatedly, while `GET /dashboard` still returned 200.
**ROOT CAUSE:** False alarm — a Next.js 16 + Windows Turbopack bug. It is local-dev noise only; the dashboard kept serving 200s and Vercel production does not use Turbopack, so it never affects the live site.
**FIX:** None required. Confirmed the app worked on the Vercel preview; accepted the local panics as cosmetic noise and adopted the Vercel preview as the real test environment.
**PREVENTION:** Before chasing a local-only error, check whether it reproduces on Vercel. If production is unaffected, document it as known noise and don't spend build time on it.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [LC] `git gc` failed to delete `.git/objects` directories on Windows
**SYMPTOM:** `git gc` / `git push` prompted `Deletion of directory '.git/objects/6f' failed. Should I try again? (y/n)` repeatedly, and neither `y` nor `n` cleared it.
**ROOT CAUSE:** A Windows file lock — VS Code held a handle on the `.git` folder. The pack had already been written successfully; only the cleanup deletion failed.
**FIX:** Closed the editor/terminal, opened a fresh terminal, ran `git push origin main` — the push succeeded; the deletion warning was non-critical.
**PREVENTION:** On Windows, close editors holding the repo before running `git gc` or large git operations. A failed `.git/objects` cleanup deletion does not block the push.
**CATEGORY:** Deployment
**SEVERITY:** Low


---

**ISSUE:** [IB] Working-context summary from prior session was stale; operated on wrong mental model of branch state
**SYMPTOM:** Operated for ~1 hour assuming `fix/diagram-fixes` branch was unmerged when it had been merged in a previous session. Misdiagnosed branch state throughout the diagnostic phase.
**ROOT CAUSE:** False alarm — working-context blocks don't refresh between sessions. State changes made in one session that don't update the context are invisible to the next.
**FIX:** Verified actual state with `git log --all --oneline -10`; discovered branches had been merged.
**PREVENTION:** At every session start, run `git status` + `git log --all --oneline -10` + `git branch -a` BEFORE acting on any branch references in the working context. Treat the context as a hint to confirm, not as authoritative state.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [IB] Master Backlog file existed only in Claude project files, never in git
**SYMPTOM:** User noticed the backlog was missing from local repo after operations on main.
**ROOT CAUSE:** File was added to Claude project files but never committed to git. Project files and the repo are separate stores.
**FIX:** Restored from Claude project files copy, committed and pushed to main. Commit `4954d86`.
**PREVENTION:** Any document that is the "single source of truth" must live in version control, not in Claude project files. Project files are a working copy at best — never the only copy. Audit project files vs repo monthly to catch drift early.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [IB] Two pieces of related work built on separate branches couldn't be verified together
**SYMPTOM:** Preview URL for `fix/diagram-fixes` returned 404 on `/admin/diagrams` because that page lived on `fix/diagram-audit`.
**ROOT CAUSE:** Two feature branches created for interdependent work — diagram fixes on one, audit page (needed to verify fixes) on the other. Neither preview alone was sufficient to verify the work.
**FIX:** Merged `fix/diagram-fixes` into `fix/diagram-audit`, used the combined branch for testing.
**PREVENTION:** When two pieces of work depend on each other for verification, build them on the same branch from the start, or plan an explicit integration branch with a documented purpose. Don't create the integration as an afterthought.
**CATEGORY:** Deployment
**SEVERITY:** Medium

---

**ISSUE:** [IB] VS Code edited file on wrong branch (docs change made on a code branch)
**SYMPTOM:** `git status` showed `Gradd_Master_Backlog_v3_3.md` modified on `fix/course-position-opening` (a code branch) when it should have been on `main`.
**ROOT CAUSE:** User opened the file from VS Code's file tree without thinking about branch state. VS Code's editor doesn't surface the current branch alongside the file tree.
**FIX:** `git stash push <file>`, `git checkout main`, `git stash pop`, commit on the correct branch.
**PREVENTION:** Before editing any file, verify branch with `git status`. For mixed code + docs work, use separate branches with deliberate switching. Treat VS Code's git integration as a viewer; commit from PowerShell to keep operations explicit.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [IB] Backlog entry contained literal placeholder text in committed draft
**SYMPTOM:** Drafted backlog entry contained `<round-2-pt-1-hash>` literal text instead of the actual commit hash.
**ROOT CAUSE:** Placeholder wasn't replaced when the real hash became available.
**FIX:** Replaced with actual commit `a8d87ff` before committing.
**PREVENTION:** Before committing any document with potential placeholders, grep for `<`, `TODO`, `PLACEHOLDER`, `XXX`. Better — use unmistakable placeholder syntax like `__HASH_GOES_HERE__` so grep catches them reliably.
**CATEGORY:** Deployment
**SEVERITY:** Low

---

**ISSUE:** [IB] Stale branches lingering in repo after merge
**SYMPTOM:** `git branch -a` showed clutter from `feat/ib-demo`, `fix/mobile-responsive`, `redesign/ib-session`, `sprint-5`, plus remote `sprint-9-landing-rewrite`.
**ROOT CAUSE:** Branches weren't deleted after merge; some abandoned mid-work.
**FIX:** Logged for a cleanup task; not addressed in-session.
**PREVENTION:** Immediately after merging a feature branch: `git branch -d <name>` locally AND `git push origin --delete <name>` remotely. Audit branches monthly with `git branch -a` to catch lingering ones.
**CATEGORY:** Deployment
**SEVERITY:** Low



### UI / RENDERING

---

**ISSUE:** [IB] Browser tab title hardcoded to LC Business on `gradd.ai`
**SYMPTOM:** The `gradd.ai` browser tab read "Your LC Business Tutor".
**ROOT CAUSE:** `generateMetadata()` in `app/layout.tsx` had a hardcoded title with no hostname detection.
**FIX:** Made title and description host-aware via `headers().get('host')`.
**PREVENTION:** `app/layout.tsx` metadata is shared across all domains in a single-codebase multi-domain setup. Every string in `generateMetadata()` must be hostname-aware from day one.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Legal pages (terms/privacy/cookies) referenced LC Business / gradd.ie / Aoife
**SYMPTOM:** IB legal pages named "Leaving Certificate examinations", "State Examinations Commission", "Aoife", `hello@gradd.ie`, and a gradd.ie footer.
**ROOT CAUSE:** The pages were written for the LC product and never branched for the IB domain.
**FIX:** Host-aware substitutions for product-specific references (exam body, tutor name, contact email, footer). Legally-required Irish-entity references (governing law, DPC, Revenue) deliberately kept.
**PREVENTION:** When going multi-domain, audit legal pages and split product-specific copy from legally-fixed copy. Only the product references switch.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Markdown tables rendered as raw pipe characters in chat
**SYMPTOM:** Comparison tables from Mia displayed as literal `| Feature | … |` text instead of formatted tables.
**ROOT CAUSE:** The chat markdown renderer lacked GFM table support — the `remark-gfm` plugin (or equivalent) wasn't enabled.
**FIX:** Enabled GFM table support in the renderer and styled tables to the brand palette.
**PREVENTION:** Enable GFM in any markdown renderer from the start if the AI will ever output tables. Verify tables — not just bold/italic — when testing a renderer.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Markdown tables crushed columns to one-character-per-line on mobile
**SYMPTOM:** On a 375px viewport, table columns squeezed so narrow that single words broke per-character ("Liabili" / "ty").
**ROOT CAUSE:** No minimum cell width — columns fought between content width and viewport constraint and wrapped on character boundaries.
**FIX:** Added `min-width` on `th`/`td` plus whole-word wrapping; preserved horizontal scroll for overflow.
**PREVENTION:** Any table rendered in a chat/mobile context needs a min cell width and an overflow-scroll wrapper from the start.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Mobile signup two-button row overflowed the viewport
**SYMPTOM:** "← Back" and "Create account" sat side-by-side; "Create account" clipped off the right edge at ~390px.
**ROOT CAUSE:** A horizontal two-button layout with no mobile stacking rule.
**FIX:** Stack the buttons vertically, full-width, below 480px.
**PREVENTION:** Multi-button rows must stack vertically on mobile. Test every interactive row at 390px width.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Dashboard stats grid overflowed horizontally on mobile
**SYMPTOM:** The 4-card stats row (PROGRESS / SESSIONS / STREAK / TO EXAM) ran off the screen — "TO EXAM" clipped.
**ROOT CAUSE:** A four-column grid with no mobile breakpoint.
**FIX:** `stats-grid` class + `@media (max-width: 480px)` forcing `repeat(2, 1fr)`.
**PREVENTION:** Any grid of 3+ items needs a mobile breakpoint collapsing to 2 columns. Use a class + media query, not JS width checks.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Session header cramped/clipped on mobile
**SYMPTOM:** Lesson title truncated, "End session" cut off, the stacked subtitle eating vertical space.
**ROOT CAUSE:** A desktop single-row header with too many elements for a 390px width.
**FIX:** A two-row mobile header — row 1: logo / Mia centred / End session; row 2: lesson title centred. Subject/level subtitle hidden on mobile.
**PREVENTION:** Headers with 3+ elements need a dedicated mobile layout. Hide non-essential metadata on mobile rather than shrinking everything.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Navbar CTA wrapped onto two lines at narrow widths
**SYMPTOM:** "Start 7-day free trial" (and "Start learning" / "Log in" on LC) wrapped at ~520–750px; the mobile layout broke between the breakpoints.
**ROOT CAUSE:** Nav items run inline past the available width before the mobile breakpoint engages; the CTA had no `white-space: nowrap` and the mobile-collapse threshold was set too low (520px).
**FIX:** Added `white-space: nowrap` on CTAs and raised the mobile breakpoint to 768px across both landing pages.
**PREVENTION:** Apply `white-space: nowrap` to button/CTA text by default. Standardise one mobile breakpoint (768px) across all pages, set on the *total* inline width of all nav items, not an assumed value.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Raster logos rendered at the wrong size
**SYMPTOM:** Logo `<img>` elements sized inconsistently across pages.
**ROOT CAUSE:** No explicit dimensions — the container was relied on to size the image.
**FIX:** Set explicit `height` plus `width: 'auto'` and a `maxWidth` on every logo `<img>`.
**PREVENTION:** Every raster logo needs explicit `height`, `width: 'auto'`, and `maxWidth`. Don't rely on the container to size an image.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Favicon assets missing from the repo / incomplete icon set
**SYMPTOM:** No favicon on any device; a missing `android-chrome-192x192.png`.
**ROOT CAUSE:** Favicon files were uploaded to the chat but never committed to `public/` — files uploaded to a chat do not reach the repo. One icon size was never generated.
**FIX:** Manually copied the favicon set into `public/`, generated the missing 192px icon, and committed.
**PREVENTION:** Assets shared in chat are not in the repo until physically saved to `public/` and committed — confirm with `ls public/` before wiring references. Generate the full icon set at project setup.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Favicon still not showing after the files were in place
**SYMPTOM:** Files present in `public/`, still no favicon. Separately, a conflicting `app/favicon.ico` clashed with the metadata-declared icons.
**ROOT CAUSE:** `site.webmanifest` had been removed in an earlier session and the `android-chrome` icons weren't referenced; a conflicting `app/favicon.ico` existed; browsers also cache favicons aggressively.
**FIX:** Recreated `site.webmanifest`, added `favicon.ico` to the `icon` array and `manifest` to the metadata, deleted the conflicting `app/favicon.ico`, hard-refreshed in incognito.
**PREVENTION:** A complete favicon setup = `.ico` + sized PNGs + `apple-touch-icon` + `site.webmanifest` referenced via `manifest` in metadata, from one source of truth. Always test in incognito with a hard refresh.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Tutor name appeared as "Aoife" in the IB session UI
**SYMPTOM:** IB students saw "● Aoife" in the tutor badge and a "Reply to Aoife…" placeholder, despite the IB prompt loading correctly.
**ROOT CAUSE:** Initially suspected a hardcode; the audit found the name was already derived dynamically from `subject`. The actual cause was a dirty test profile (`subject = LC_BUSINESS`). A later prop-refactor was applied as a cleanliness improvement.
**FIX:** Fixed the test profile's `subject`; refactored tutor-name derivation to a `getTutorName()` prop.
**PREVENTION:** Before assuming a UI hardcode, check the data — a wrong display value is often a dirty DB row, not a code bug. Verify the line before approving a "fix" for it.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] "Manage subscription" navigation hidden on mobile with no alternative path
**SYMPTOM:** A nav element was hidden for mobile, leaving no way to reach the subscription-management functionality on a phone.
**ROOT CAUSE:** A mobile layout cleanup hid the element without providing a replacement route to the same function.
**FIX:** Added a subtle "Manage subscription" text link at the bottom of the dashboard content, below Recent sessions.
**PREVENTION:** Before hiding any navigation element for mobile, confirm there is an alternative path to the same functionality.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [LC] Aoife's streamed output overflowed its container
**SYMPTOM:** Aoife's messages rendered outside the chat bubble / overflowed the layout; markdown was not rendering cleanly.
**ROOT CAUSE:** A partial `FormattedMessage` component did not handle the full range of Aoife's markdown output (headers, bold, rules, lists) or constrain width.
**FIX:** Replaced it with a custom `MessageRenderer.tsx` that renders headers (`#`/`##`/`###`), bold, horizontal rules, bullet/numbered lists and Aoife's `===` section headers, with correct width constraints — no new npm dependency.
**PREVENTION:** A message renderer must handle every markdown construct the model actually emits and constrain its own width. Test the renderer against real Aoife output, not a sample paragraph.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Chat bubble too narrow on mobile
**SYMPTOM:** Assistant message text wrapped awkwardly and wasted right-side space.
**ROOT CAUSE:** `maxWidth: 80%` on the assistant bubble — fine on desktop, wasteful on mobile.
**FIX:** Raised `maxWidth` to 92%.
**PREVENTION:** Percentage max-widths tuned for desktop waste space on mobile. Set bubble widths ~92%+ for mobile readability.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] Tutor avatar stole horizontal width from the chat bubble on mobile
**SYMPTOM:** The "M" avatar outside the bubble narrowed an already-tight mobile message column.
**ROOT CAUSE:** The avatar rendered outside the bubble with a reserved-width gap.
**FIX:** Removed the reserved left gap so the avatar sits flush; text gets full width.
**PREVENTION:** Decorative chat elements (avatars) must not consume layout width on mobile — overlap or flush-align them.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] Visible scrollbar on the mobile chat area
**SYMPTOM:** A thin scrollbar line on the right edge of the chat on mobile.
**ROOT CAUSE:** No scrollbar-hiding rule for the chat container.
**FIX:** `scrollbar-width: none` + `::-webkit-scrollbar { display: none }` under the mobile media query.
**PREVENTION:** Hide scrollbars on scrollable mobile containers as a default.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] Stripe logo wordmark unreadable on the dark checkout header
**SYMPTOM:** The amber `.ai` of the wordmark had too little contrast on the dark green Stripe header; "gradd" was lost.
**ROOT CAUSE:** A coloured wordmark on a dark background — a contrast failure.
**FIX:** Use the icon-only mark on the dark header, or a white version of the wordmark.
**PREVENTION:** Brand assets need a light-on-dark variant. Never assume one logo file works on every background.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] "Gradd.ai" wordmark rendered monochrome on signup/onboarding
**SYMPTOM:** Signup and onboarding showed "Gradd.ai" all in green; the navbar shows ".ai" in amber.
**ROOT CAUSE:** A single `<span>` in one colour rather than two spans.
**FIX:** Split into two spans — "Gradd" in `--brand`, ".ai" in `--brand-accent`.
**PREVENTION:** Define the wordmark once as a shared component so brand styling can't drift page to page.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] Auth/onboarding branding inconsistent across hostnames
**SYMPTOM:** The logo was not hostname-aware; inline logos were duplicated across multiple components.
**ROOT CAUSE:** No shared brand helper — each component declared its own logo.
**FIX:** Created `lib/branding.ts` with a hostname-aware `getBrand()`; shared logo headers via layout files; stripped inline logos (commit 738a8f5).
**PREVENTION:** For any multi-domain product, build a hostname-aware branding helper at project setup and use shared layouts — never inline brand assets per component.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] Logo and student name ran together in the session/dashboard header
**SYMPTOM:** "gradd.ai TestBundle" — the student name appeared immediately after the logo text with no separator, looking like one run-on word.
**ROOT CAUSE:** No gap or separator between the logo and the student-name span in the nav component.
**FIX:** Hid the student name on mobile via `@media (max-width: 480px) { .student-name { display: none; } }`.
**PREVENTION:** Check how student names of varying lengths interact with the nav logo at mobile widths — a 16-character name will always collide without proper separation.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] Landing page subject cards inconsistent ("Papers 1 & 2" vs "Papers 1, 2 & 3")
**SYMPTOM:** The IB Business card showed "Papers 1 & 2"; IB Economics showed "Papers 1, 2 & 3 (HL)" — inconsistent, and the BM one was factually incomplete.
**ROOT CAUSE:** Copy written at different times and never cross-checked. Both subjects have a Paper 3 at HL.
**FIX:** Standardised both cards to "Papers 1, 2 & 3 (HL)".
**PREVENTION:** Cross-check parallel UI elements (subject cards, pricing tiers) for consistency before launch — parallel components drift when edited independently.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] `gradd.ai` homepage / login page showed LC Business content
**SYMPTOM:** The IB domain served the LC homepage and login copy.
**ROOT CAUSE:** Not a regression — the IB homepage and domain-aware login simply hadn't been built yet at that point.
**FIX:** Built `IBLandingPage` and host-aware login copy in later steps.
**PREVENTION:** Distinguish "not built yet" from "broken" early — it saves debugging time on expected gaps.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [LC] The wordmark logo dot rendered inside the "d" letterform
**SYMPTOM:** In the Gradd wordmark SVG the accent dot kept landing inside the "d" instead of beside it; took five iterations to place correctly.
**ROOT CAUSE:** The dot was positioned using estimated font metrics rather than measured glyph coordinates, so it landed wrong each time the estimate was off.
**FIX:** Iterated the SVG coordinates until the dot sat correctly relative to the rendered "d".
**PREVENTION:** Position SVG elements against measured glyph geometry, not estimated font metrics; for logo work, render and eyeball each iteration rather than trusting calculated coordinates.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [LC] Duplicate consecutive user messages from a UI double-submit
**SYMPTOM:** The message history sometimes contained two identical consecutive user messages, risking Aoife treating it as a broken conversation.
**ROOT CAUSE:** A UI glitch allowed a single student submission to be sent twice.
**FIX:** Added a rule to the live context anchor: if the history contains two consecutive identical user messages, treat them as one (a UI glitch), acknowledge naturally and continue teaching.
**PREVENTION:** Defend against double-submit on both sides — debounce/disable the send control on submit, and make the prompt resilient to duplicates.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [LC] Dashboard parent/student view toggle appeared to reset
**SYMPTOM:** Clicking "My view" seemed not to hold the selected mode during local development.
**ROOT CAUSE:** False alarm — caused by the Windows Turbopack panics refreshing the local dev page, not by application code. The toggle worked correctly on Vercel. The `useSearchParams`/`Suspense` changes attempted to "fix" it were unnecessary.
**FIX:** Reverted the speculative `useSearchParams` and `<Suspense>` changes; confirmed the toggle worked on Vercel. No code change needed.
**PREVENTION:** Reproduce a suspected bug on Vercel before changing code. Don't add complexity (Suspense, URL state) to fix a local-environment artefact.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [LC] A new session is created each time "Start session" is clicked
**SYMPTOM:** The previous conversation was not carried into the next session's message history.
**ROOT CAUSE:** False alarm — expected product behaviour. Each "Start session" click intentionally creates a fresh session; cross-session continuity is carried by the `LAST_SESSION_SUMMARY` variable, not by replaying message history.
**FIX:** None — confirmed as designed.
**PREVENTION:** Document intended session boundaries so expected behaviour isn't re-investigated as a bug. "New session" is not "lost context."
**CATEGORY:** UI/Rendering
**SEVERITY:** Low


---

**ISSUE:** [IB] Internal QA page (`/admin/diagrams`) rendered diagrams in different CSS scope than production
**SYMPTOM:** `/admin/diagrams` showed labels washed-out/faded; the same diagrams in live sessions rendered with correct dark ink. ~30 minutes wasted prescribing coordinate fixes against a misdiagnosed bug.
**ROOT CAUSE:** Audit page wrapped diagrams in a plain `<div>` with no `.ib-session` CSS scope. CSS variables `--chat-text` and `--chat-muted` resolved to wrong values because the page had different ambient definitions. Live sessions resolved them correctly via the `.ib-session` block in `ChatInterface.tsx`. Also: audit page rendered raw `<Component />` rather than the production `<DiagramRenderer />` wrapper.
**FIX:** Rebuilt audit page to wrap diagrams in `<div className="ib-session">` AND render through real `<DiagramRenderer />` component. Commit `9479305`.
**PREVENTION:** Any internal QA / preview / audit page that displays a production component must mirror production's wrapper, scope and import path exactly. If a QA page uses different CSS scope, fonts or render wrapper than production, it produces false positives (sees bugs that don't exist) and false negatives (misses real bugs). Validate by side-by-side comparison with a live session before trusting any new QA surface.
**CATEGORY:** UI/Rendering
**SEVERITY:** High

---

**ISSUE:** [IB] `.ib-session` CSS duplicated as inline `<style>` blocks in two files
**SYMPTOM:** Identical CSS block existed as inline `<style>` strings in both `ChatInterface.tsx` (lines 357–680) and `app/demo/session/page.tsx` (lines 135–257). No way to apply `.ib-session` scope on a third surface (the audit page) without a third copy.
**ROOT CAUSE:** Initial build copied the CSS block between files rather than extracting to a shared stylesheet. Two sources of truth → silent drift hazard.
**FIX:** Extracted to `styles/ib-session.css`, imported globally in `app/layout.tsx`, kept `className="ib-session"` wrapper on rendering divs. Commit `0a44e4c`.
**PREVENTION:** Any CSS block needed on more than one surface must live in a shared stylesheet from the start. Inline `<style>` blocks are only acceptable when rules are genuinely surface-specific (e.g. demo-page typing animation). Any CSS block over ~50 lines OR appearing in two files is a red flag — extract immediately.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] Batch coordinate fixes via shared SVG helper created new collisions in untouched diagrams
**SYMPTOM:** Round 1 fixed 30 diagram label collisions via a systematic axis-offset bump (`+26 → +36`) on the shared `Axes` helper component. Round 2 audit revealed 11 NEW or surviving collisions, several created by Round 1 pushing text into other elements.
**ROOT CAUSE:** Helper-level coordinate changes have systemic side-effects. Moving one element by N pixels affects every diagram using the helper. No visual verification between edits.
**FIX:** Round 2 used per-diagram individual coordinate adjustments with explicit instruction not to touch shared helpers. Final 11 collisions deferred to backlog with explicit "screenshot → fix → screenshot loop, one at a time, do NOT batch" approach noted.
**PREVENTION:** Visual / coordinate fixes are not batchable. Work one element at a time with visual verification between edits. Never apply batch coordinate offsets to shared helpers — side-effects propagate to every consumer. If a "systematic" fix is tempting, that's the signal to slow down, not speed up.
**CATEGORY:** UI/Rendering
**SEVERITY:** Medium

---

**ISSUE:** [IB] CSS variable fallback fix prescribed against misdiagnosed bug
**SYMPTOM:** Replaced `var(--chat-text, #2c2825)` with hardcoded `#2c2825` to "fix" pale labels. Pale labels on audit page didn't change after the fix.
**ROOT CAUSE:** Fix was prescribed against a misdiagnosed bug. The audit page's CSS scope (not the fallback) was producing the pale rendering. The change was harmless but addressed nothing.
**FIX:** Left the hardcoded change in place as defensive; rebuilt the audit page properly to fix the actual bug.
**PREVENTION:** Use browser dev tools to inspect actual computed CSS values BEFORE prescribing a fix. Identify the cascade rule painting the colour, not the rule you THINK is painting it. Don't theorise; verify.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low

---

**ISSUE:** [IB] CSS variable fallbacks invisible on most surfaces — perceived as "fix didn't ship"
**SYMPTOM:** 201-line colour fallback commit appeared to make no visible difference on the audit page or in live sessions.
**ROOT CAUSE:** False alarm — fallbacks (`var(--chat-text, #2c2825)`) only render the fallback value when the variable is undefined. On every surface where the variable IS defined, the fallback is intentionally invisible. Nothing visibly changed because nothing was supposed to.
**FIX:** Verified the fix shipped via `git diff`; confirmed it's defensive against an edge case (LC sessions / future surfaces without scope); moved on.
**PREVENTION:** When shipping CSS variable fallback fixes, document explicitly in the commit message: "fallback fires only when [variable] is unresolved — no visual diff expected on surfaces that define the variable." Otherwise the next reviewer will assume the fix didn't work.
**CATEGORY:** UI/Rendering
**SEVERITY:** Low



### CONFIG

---

**ISSUE:** [IB] A sensitive cron secret was committed in Claude Code's local config file
**SYMPTOM:** `.claude/settings.local.json` appeared in git changes, containing a `CRON_SECRET` inside a stored command URL.
**ROOT CAUSE:** `.claude/` was not in `.gitignore`, so Claude Code's local config (which logs run commands, including secret-bearing URLs) was tracked by git.
**FIX:** Added `.claude/` to `.gitignore`, untracked the file via `git rm --cached`. The cron secret had already been rotated.
**PREVENTION:** Add `.claude/` (and any tool-local config dirs) to `.gitignore` at project creation. Never put secrets in URLs that tooling might log. Rotate any secret that has ever touched a tracked file.
**CATEGORY:** Config
**SEVERITY:** High

---

**ISSUE:** [LC] A full sprint of fixes was applied to the wrong message-route file
**SYMPTOM:** During Sprint 7, none of the fixes appeared to take effect — behaviour was unchanged after every deploy.
**ROOT CAUSE:** Two message-route files exist — `app/api/session/message/route.ts` and `app/api/session/message/proxy.ts` — and the running app was hitting `proxy.ts`, but every Sprint 7 fix had been applied only to `route.ts`.
**FIX:** Applied all changes to both files; established the standing rule that any change to one message-route file must be made to both.
**PREVENTION:** Two message-route files exist and must be kept byte-for-byte in sync — every change goes to both `route.ts` and `proxy.ts` in the same commit. If a fix has no effect, first confirm which file the app actually executes.
**CATEGORY:** Config
**SEVERITY:** High

---

**ISSUE:** [LC] Haiku could not hold the 167KB system prompt across a long session
**SYMPTOM:** Aoife drifted, restarted sessions, conflated student answers with system signals, and misread short replies — e.g. a student saying "cancel flights" was answered as though they had asked "are you an AI?". Behaviour degraded after roughly 8–10 exchanges.
**ROOT CAUSE:** `claude-haiku-4-5` is optimised for speed and cost, not for reliably following a very large system prompt across a long multi-turn conversation. The repeated restart/drift bugs were the model failing to hold context, not flaws in the prompt architecture.
**FIX:** Switched the session model to `claude-sonnet-4-5` in the message route. Commit: "Switch session model to Sonnet for reliability." Prompt fixes, live context anchor and continuity summary were all kept.
**PREVENTION:** Match model capability to prompt size and conversation length. A large system prompt over many turns needs Sonnet-class capability minimum — validate against a full-length session, not a 3-message smoke test.
**CATEGORY:** Config
**SEVERITY:** High

---

**ISSUE:** [LC] Live API keys exposed in chat screenshots
**SYMPTOM:** A working Resend API key (`re_…`) and other credentials were visible in screenshots pasted into the build chat.
**ROOT CAUSE:** Credentials were shared inline while debugging instead of being kept out of shared context.
**FIX:** Deleted the exposed Resend key and generated a new one; advised rotating any other credentials shared the same way.
**PREVENTION:** Never paste live secrets into chat or screenshots. If a secret is exposed, rotate it immediately. Keep all keys in `.env.local` / Vercel env vars and redact them before sharing any screen.
**CATEGORY:** Config
**SEVERITY:** High

---

**ISSUE:** [IB] `metadataBase` pointed at `gradd.ie` for both domains
**SYMPTOM:** OG images and canonical URLs resolved against `gradd.ie` even on `gradd.ai`.
**ROOT CAUSE:** `metadataBase` in `app/layout.tsx` was hardcoded to the LC domain.
**FIX:** Made `metadataBase` host-aware in `generateMetadata` — `new URL(isIB ? 'https://gradd.ai' : 'https://gradd.ie')`.
**PREVENTION:** In a multi-domain single codebase, `metadataBase` must switch with the host, the same as title and description. Part of the multi-domain audit.
**CATEGORY:** Config
**SEVERITY:** Medium

---

**ISSUE:** [LC] Prompt caching was not enabled, so the full system prompt was billed at full price every message
**SYMPTOM:** API cost per message was higher than necessary — the ~40,000-token system prompt was re-sent and charged at the standard input rate on every call.
**ROOT CAUSE:** Anthropic prompt caching had not been implemented; the largest token cost was paying full input price repeatedly.
**FIX:** Split the system prompt into static and dynamic blocks — marked the static injected prompt as ephemeral/cacheable (billed ~$0.30/MTok vs $3.00/MTok after the first call), kept the dynamic live context anchor uncached. ~90% cost reduction on system-prompt tokens.
**PREVENTION:** Enable prompt caching from day one whenever a large static system prompt is re-sent each turn. Split system prompts into static (cacheable) and dynamic (live) blocks.
**CATEGORY:** Config
**SEVERITY:** Medium

---

**ISSUE:** [IB] Migration file committed to the wrong directory
**SYMPTOM:** An IB extension schema migration sat at the repo root instead of `supabase/migrations/`.
**ROOT CAUSE:** The file was created in the wrong location during an earlier build session.
**FIX:** Moved it to `supabase/migrations/` and committed the move.
**PREVENTION:** All migrations live in `supabase/migrations/` with the `YYYYMMDDHHMMSS_` naming convention. Check file placement when creating migrations.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] `vercel.json` rate-limiting config required the Vercel Pro plan
**SYMPTOM:** A rate-limiting configuration placed in `vercel.json` did not work on the current Vercel plan.
**ROOT CAUSE:** The `vercel.json` rate-limiting feature is a Pro-plan capability and was not available.
**FIX:** Removed the rate-limiting block from `vercel.json` and implemented rate limiting in code instead — a Supabase `rate_limits` table plus an `increment_rate_limit` Postgres function, enforced in the message route (50 messages/hour/user).
**PREVENTION:** Check the plan tier before relying on a platform config feature. For portability, prefer an application-level implementation over a platform-specific config.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] Anthropic SDK version not pinned
**SYMPTOM:** SDK behaviour needed to be locked down for stability during the build.
**ROOT CAUSE:** The `@anthropic-ai/sdk` dependency was unpinned, risking a breaking change pulling in on install.
**FIX:** Pinned the Anthropic SDK to `0.90.0`.
**PREVENTION:** Pin SDK and framework dependency versions exactly; upgrade deliberately and test, rather than letting `^`/`~` ranges drift.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] The AI model name was hardcoded in the route files
**SYMPTOM:** Switching models (Haiku ↔ Sonnet) required a code edit, commit and deploy each time, and risked the two route files drifting apart.
**ROOT CAUSE:** `model:` was a literal string in `route.ts` (and `proxy.ts`).
**FIX:** Moved the model to an environment variable: `const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';` — set `ANTHROPIC_MODEL` in Vercel, toggle without a deploy.
**PREVENTION:** Any value likely to change during tuning (model, token caps, rate limits) belongs in an env var, not a code literal duplicated across files.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] Legal pages displayed an incorrect "last updated" date
**SYMPTOM:** Terms, Privacy and Cookie pages showed "24 April 2025" instead of the correct date.
**ROOT CAUSE:** A placeholder date written during page creation was never updated before launch.
**FIX:** Changed the date to "01 May 2026" in `app/terms/page.tsx`, `app/privacy/page.tsx` and `app/cookies/page.tsx`.
**PREVENTION:** Drive page-wide dates from a single constant rather than hardcoding per page; include legal-page dates in the pre-launch checklist.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] Supabase minimum password length did not match the signup UI
**SYMPTOM:** The signup page enforced a 12-character password (uppercase, lowercase, number, symbol) but Supabase's own minimum password length was set lower — an inconsistent rule between client and auth backend.
**ROOT CAUSE:** The Supabase Auth password policy was never aligned with the signup form's strength requirements.
**FIX:** Set the Supabase minimum password length to 12 to match the signup UI.
**PREVENTION:** Keep client-side validation and the auth provider's server-side policy in sync — define the rule once and apply it both places.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] VS Code's `Ctrl+S` only saved the active file, so edits were missed from commits
**SYMPTOM:** Several intended changes did not make it into git commits during the multi-file initial build.
**ROOT CAUSE:** `Ctrl+S` saves only the focused file; multi-file edits left unsaved tabs behind, which were then never committed.
**FIX:** Identified the cause; used Save All before committing.
**PREVENTION:** Use Save All (`Ctrl+K S`) before every commit, and review the GitHub Desktop changed-files list against the edits you intended to make.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [LC] Windows environment blockers stopped initial project scaffolding
**SYMPTOM:** `npx` was blocked by PowerShell, and `npm install` could not reach the npm registry.
**ROOT CAUSE:** Two separate Windows constraints — the PowerShell execution policy blocked `npx`, and the SimpleWall firewall blocked `node.exe` from reaching the npm registry.
**FIX:** Ran `Set-ExecutionPolicy` to allow `npx`, and added a SimpleWall rule allowing `node.exe`.
**PREVENTION:** On a fresh Windows dev machine, clear the execution policy and firewall allowances for Node before starting setup — treat these as known first-run blockers.
**CATEGORY:** Config
**SEVERITY:** Low


---

**ISSUE:** [IB] Claude Code default output token cap exceeded mid-task, killed a 36-minute session
**SYMPTOM:** Claude Code session died after 36 minutes with "API Error: Claude's response exceeded the 32000 output token maximum". Appeared to lose work; actually nothing had been committed.
**ROOT CAUSE:** Default `CLAUDE_CODE_MAX_OUTPUT_TOKENS` is 32000. Large multi-file edits with verbose Claude Code commentary and long commit messages can exceed it before reaching the push step.
**FIX:** Set `CLAUDE_CODE_MAX_OUTPUT_TOKENS=200000`. Also instructed Claude Code explicitly: "keep responses terse", "do not paste full file contents", "commit message under 200 characters".
**PREVENTION:** Set `CLAUDE_CODE_MAX_OUTPUT_TOKENS=200000` at the start of every session before launching Claude Code. For multi-file edits, split into staged commits (no more than 4–5 files per commit). Always include response-constraint directives in batched-edit instructions.
**CATEGORY:** Config
**SEVERITY:** High

---

**ISSUE:** [IB] PowerShell User-scope env var didn't propagate to new session
**SYMPTOM:** `[Environment]::SetEnvironmentVariable("X", "Y", "User")` set the variable but `$env:X` in a fresh terminal returned nothing.
**ROOT CAUSE:** PowerShell's User-scope env vars don't always propagate to new sessions immediately, depending on shell host and how the new terminal was launched.
**FIX:** Used session-scope `$env:X = "Y"` instead — reliable within one terminal, but doesn't persist after that terminal closes.
**PREVENTION:** For transient development needs, use session-scope (`$env:X = "Y"`). For permanent settings, use User-scope BUT always verify with `echo $env:X` in a fresh terminal before trusting. Don't assume User-scope propagation.
**CATEGORY:** Config
**SEVERITY:** Low

---

**ISSUE:** [IB] Git CRLF / LF line ending warning on markdown edits
**SYMPTOM:** "warning: in the working copy of '<file>', LF will be replaced by CRLF the next time Git touches it."
**ROOT CAUSE:** Cross-platform line ending normalisation (file created with LF, edited on Windows). Git's `core.autocrlf` handles it automatically but warns.
**FIX:** Harmless — git handles via `core.autocrlf`. Warning ignored.
**PREVENTION:** For mixed-platform repos, add `.gitattributes` with `* text=auto eol=lf` to standardise. Or accept the warning as cosmetic.
**CATEGORY:** Config
**SEVERITY:** Low



### CURRICULUM

---

**ISSUE:** [IB] Believed the IB Economics curriculum was incomplete (156 vs 210 lessons)
**SYMPTOM:** A memory note and an earlier assumption said IB Economics had only 156 lessons against a 210-lesson plan, implying a major content gap and a multi-hour rebuild.
**ROOT CAUSE:** False alarm — a diagnostic query showed the `lessons` table actually held all 210 IB Economics lessons across 4 cleanly-bounded units, linked list intact. The "156" figure and the "gap 148–151" were both stale/wrong; lessons 148–151 were correctly present.
**FIX:** None needed — verified the curriculum was complete and correctly structured.
**PREVENTION:** Verify current DB state with a diagnostic query before scoping any rebuild. Don't trust stale memory notes or assumptions about counts — a 30-second `SELECT` here prevented a wrongly-scoped 4-hour rebuild.
**CATEGORY:** Curriculum
**SEVERITY:** Medium

---

**ISSUE:** [IB] Diagram handling repeatedly assumed unbuilt when it was fully shipped
**SYMPTOM:** It was stated three times that diagram handling (inline SVG rendering + student photo upload + vision evaluation) was Phase 2 / not built. Codebase inspection found a 61-component SVG library, `DiagramRenderer`/`getDiagram` integration, a camera upload in `ChatInterface`, and vision wiring in `route.ts`.
**ROOT CAUSE:** False alarm — trusting a 5-day-old memory note instead of inspecting the codebase. An initial grep for "vision/image_url" missed the feature because pre-built SVG components don't contain those strings.
**FIX:** Inspected `components/diagrams/` and `route.ts` directly; confirmed the feature shipped; corrected the memory note.
**PREVENTION:** Never assert a feature is or isn't built from memory — inspect the codebase. When grepping to confirm a feature, pick search terms that would actually appear in that feature's code, and check the directory tree, not just keyword greps. Treat memory notes as hints, not facts.
**CATEGORY:** Curriculum
**SEVERITY:** Medium

---

**ISSUE:** [IB] Guide-verified content-accuracy audit found systematic cross-subject contamination (Econ → BM) across six categories
**SYMPTOM:** Six simultaneous errors in the BM prompt from a single root cause: Discuss required no firm conclusion (wrong per BM guide); Describe placed at mid-order AO level (wrong — AO1); Examine described as "similar to analyse" (wrong — AO3); exam structure reflected pre-2024 syllabus with wrong marks, timings and weightings; no formula definitions despite "show the formula first" instruction; no markbands. Econ prompt had three separate gaps: incomplete AO4 command terms, missing Part (a) 10-mark band, wrong P2(g) marking criterion.
**ROOT CAUSE:** BM prompt content derived by analogy from the Econ prompt rather than independently from the BM subject guide. Econ AO classifications and structural conventions imported into BM without verification; the BM guide contradicts them on multiple points. Root cause of all six BM errors was one authoring decision, not six independent mistakes.
**FIX:** Full guide-verified audit run against both prompts 2026-06-04, all fixes merged to main. Tier 1 (wrong content reaching student): added BM ## QUANTITATIVE SKILLS PROTOCOL verbatim from guide pp.64–65. Tier 2 (wrong delivery): rewrote BM command-term section to AO-level structure per glossary pp.67–68, AO tables pp.19–20; added missing Econ AO4 terms (Determine, Measure, Show that) per glossary pp.74–75. Tier 3 (marking/structure): rewrote BM exam structure to 2024 guide pp.44–47; added BM Section B 10-mark markbands per guide p.44; added Econ Part (a) 10-mark band and corrected P2(g) data-response marking rule per guide pp.63–64.
**OUTSTANDING:** Econ P3(b) 10-mark markband descriptor (HL, low priority); seed-question mark allocations vs guide question structures; ACCA APM content vs official syllabus.
**PREVENTION:** Never derive one subject's content by analogy from another — see TOP PREVENTION RULES #27. Audit each subject prompt independently against its own guide before shipping. The symptom of cross-subject contamination is several concurrent errors of the same structural type; treat that pattern as a root-cause signal, not a list of independent bugs.
**CATEGORY:** Curriculum
**SEVERITY:** High


---

*Master document, collated 16/05/2026; updated 21/05/2026 with the IB diagram-audit / CSS refactor / course_position session-opening harvest; updated 26/05/2026 with IB BM Layer 1 seed-generation build (Rules 22–26: evidence-before-encoding, verifier contradiction guards, generator prompt branch discipline, atomic str_replace, PDF-before-contradicting-verdict); updated 04/06/2026 with Econ + BM content-accuracy audit (Rule 27: no cross-subject content derivation by analogy; Curriculum: guide-verified audit findings, Tier 1–3 fixes, outstanding items); P2(g) placement fix verified live on Mia (Veralonia mock) — enforcement-at-point-of-action lesson logged as Rule 28; updated 04/06/2026 (same session) with the end-to-end loop audit — Layer 2 found disconnected from live marking (Rule 29), content_checklist proven valuable vs redundant band_descriptor, and a two-pointer lesson-sequencing ambiguity flagged (Signals); updated 04/06/2026 (same session) — Econ Layer 2 content_checklist wire-in COMPLETED and proven live (RPC returns scheme via LEFT JOIN LATERAL, system-prompt.ts injects it as a MARK SCHEME block, marking step quotes missed points verbatim; validated on served IB_ECON_093, Mia marked 2/4 and quoted the scheme's missed points verbatim on haiku with no manual paste). BM Layer 2 prompt shipped but blocked on the BM subject-key mismatch (Rule 30). Pointer/denormalised-name bug parked with workaround (set current_lesson_code + current_lesson_name together on any manual repoint). Sources: every LC build/debug session (initial build through Sprint 8), the IB build/launch-prep sessions (02–16 May 2026), the IB build-hardening session of 21 May 2026 (`/admin/diagrams` rebuild, `.ib-session` extraction, `course_position` Layer 0 fix), and the IB BM Layer 1 build session of 26 May 2026 (87-candidate seed generation, 5-rule verifier patch, regen-rejected pipeline). Supersedes the standalone `BUILD_HARDENING.md` (IB) and `LC_BUILD_HARDENING.md`. Keep one copy in each Claude project. Add new entries in the standard format, tagged by product, ordered by category then severity; promote a lesson to TOP PREVENTION RULES only when it has cost real time more than once.*
