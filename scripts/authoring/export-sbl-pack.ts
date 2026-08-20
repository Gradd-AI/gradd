#!/usr/bin/env tsx
/**
 * export-sbl-pack.ts — regenerate docs/reviews/SBL_BATCH_A_REVIEW_PACK.md from the captured drafts.
 *
 * PURE AND OFFLINE: reads only `docs/rollbacks/SBL_narrative_draft_SBL-A*.json` and writes one
 * markdown file. No DB, no model, no env. The drafts are the source of truth for the pack — the
 * same bytes `--narrative-insert-from` writes to the row — so a pack regenerated from them cannot
 * quietly disagree with what was, or will be, inserted.
 *
 * Closes a standing gap: the code map records "no dedicated exporter yet" for review packs, and
 * hand-rewriting per-drill sections below a hand-maintained preamble is how a pack drifts from
 * the rows it claims to quote.
 *
 * The PREAMBLE is still hand-maintained (doctrine, DB state, rulings) and lives in this file;
 * the per-drill sections are generated. Usage: npx tsx scripts/authoring/export-sbl-pack.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IDS = ['SBL-A1', 'SBL-A2', 'SBL-A3', 'SBL-A4', 'SBL-A5'];
/** Modes the BAD commits and the rubric marks, which N4 could not verify. See NarrativePlan.designed_bad.
 *  FALLBACK ONLY — `_authoring.designed_mode_evidenced` is now persisted on the row and is preferred. */
const EVIDENCED: Record<string, string> = { 'SBL-A1': 'F7', 'SBL-A3': 'F2', 'SBL-A4': 'F10' };

const DRAFT_DIR = join(__dirname, '..', '..', 'docs', 'rollbacks');

/**
 * THE ONE FIELD THE DRAFT CANNOT SUPPLY. A draft is a PRE-INSERT capture — the row it describes has
 * no `id` until the DB assigns one — so the id is declared here and everything else is derived.
 * Found by checking the regenerated pack against the live rows: deriving the whole state table from
 * the drafts silently rendered `id` as `undefined` in all five rows, and the pack looked fine.
 * `stateTable` THROWS on a missing entry rather than rendering `undefined` again (P-G1).
 */
const ROW_IDS: Record<string, string> = {
  'SBL-A1': '9d414a87-b12d-4526-85cc-5e537a25104b',
  'SBL-A2': '5bd47a79-7640-4902-8360-b8b0952d0b19',
  'SBL-A3': '46e10662-914f-412b-8e56-faf426d0461f',
  'SBL-A4': '80b4918b-1602-46dc-a213-a4ba70cb12c4',
  'SBL-A5': '2fbb2902-c254-4c9b-ac1a-240bf1adb9e7',
};

/**
 * ⚠️ THE NEWEST DRAFT IS NOT ALWAYS `<id>.json`, AND READING THE WRONG ONE REPUBLISHES OLD CONTENT.
 *
 * A dry run no longer overwrites a captured draft (`nextFreeDraftPath` in the generator) — it lands
 * on `<id>.2.json`, `<id>.3.json` … and leaves the original alone. That guard is right, and it
 * introduced this trap: SBL-A4 was REBUILT on 2026-08-20 and its live content is in
 * `SBL_narrative_draft_SBL-A4.2.json`, while `SBL_narrative_draft_SBL-A4.json` still holds the
 * superseded pre-rebuild version. An exporter that globs the bare name regenerates a pack quoting a
 * drill that no longer exists, and it looks completely clean while doing it.
 *
 * So resolve the HIGHEST-numbered sibling, and PRINT which file each section came from. Reviewers
 * check what a pack quotes; they cannot check which file it read unless it says.
 */
function newestDraftPath(id: string): string {
  const base = join(DRAFT_DIR, `SBL_narrative_draft_${id}.json`);
  let chosen = base;
  for (let n = 2; n < 1000; n++) {
    const candidate = join(DRAFT_DIR, `SBL_narrative_draft_${id}.${n}.json`);
    if (!existsSync(candidate)) break;
    chosen = candidate;
  }
  if (!existsSync(chosen)) throw new Error(`no draft found for ${id}`);
  return chosen;
}

const PREAMBLE = `# SBL Batch A — review pack

**Regenerated from \`docs/rollbacks/SBL_narrative_draft_SBL-A*.json\` by
\`scripts/authoring/export-sbl-pack.ts\`.** Spec: \`docs/SBL_BATCH_A_PLAN.md\`.
Evidence: \`docs/evidence/SBL_FAILURE_CATALOGUE.md\`.

## DB STATE — ALL FIVE INSERTED, \`candidate\` / \`published=false\`

{{STATE_TABLE}}

**acca_drills 155 → 160.** AFM 64 · APM 91 · SBL 5. Post-insert: 5/5 \`candidate\`+unpublished,
0 published, 0 approved, 5 distinct \`lo_code\` with no duplicate, and 0 AFM/APM rows created in the
window — so nothing outside the batch moved. **Section A is now 5 of 12 outcomes** (A1a, A2b, A2d,
A3a, A3d), counted as OUTCOMES, not marks.

⚠️ **NO PUBLISH FLIP HAS OCCURRED, AND IT IS TWO STEPS, NOT ONE** — these rows are \`candidate\`, so
going live means \`approved\` and then \`published\`, under GATE-P: reconcile the DB approved-set
against the journal FIRST, flip by EXPLICIT id, demote any un-reviewed \`approved\` row in the same
transaction, prove it with pre/post counts.

⚠️ **THE BATCH NEEDED TWO SCHEMA MIGRATIONS THAT NOBODY PREDICTED**, both found by attempting the
insert rather than by reading code — \`20260819120000\` (paper_code) and \`20260819130000\`
(skill vocabulary, paper-aware). See \`AFM_SURFACED.md\`.

**SBL-A2 was re-tagged \`evaluation\` → \`analysis\`** (Grant-ruled 2026-08-19): all six of its facts
point one way, so committing concedes nothing and evaluation is the wrong act for what the scenario
supplies. Re-gated green — the only thing that moved was the N6b arm's identity.

---

## ⚠️ FIVE THINGS TO HOLD WHILE READING

**1. N4 verified the DETERMINISTIC modes only.** \`designed_bad_flags\` lists only F1/F4/F5 — what
\`checkRule23\` raises unaided. Where a drill declares an \`evidenced\` mode (F7, F2, F10) the BAD
commits it and the rubric marks it, but **N4 did not prove the marker identified it**.

**2. N6 gates ONE of the five** — SBL-A4 (\`scepticism\`) alone runs N6b and N6c. Read
\`N6 coverage:\`, never \`ok\` alone: \`ok\` is true when nothing failed, and nothing can fail a check
that did not run.

**3. N6a measures LABELLING, not demand.** F10's own text names scepticism and commercial acumen —
neither \`analysis\` nor \`evaluation\`.

**4. There is no numeric verifier on this pipeline.** Every figure is a stated given with no
derivable chain. That is the structural answer, not a claim the gates checked them.

**5. The four-part development test is ACCA's own scheme** — published on one page of all seven
examiner reports, arithmetic at MJ25 p.4, SD25 p.4, MJ26 p.5. Every criterion is 2 marks and states
its 1-mark undeveloped tier.

## Confirmed BY HAND — the check N6b reports as NOT EVALUATED

- **SBL-A1** ✅ three behavioural episodes + the survey + the CFO's counter-claim; \`c4\` requires one
  source to bear on another. Real trade: consultation against *weeks, not months*.
- **SBL-A3** ✅✅ strongest — the 2022 study, the March 2023 pilot, the launch-day briefing failure and
  the 18-month survey. Four dated sources that dispute each other.
- **SBL-A5** ✅✅ strongest evaluation — 55% of mains unusable within eight years, a 1.8× covenant and a
  declined subsidy, against 280,000 residents at +IDR 49,500 a month. Neither side is a straw man.
- **SBL-A2** ⚠️ **fails it** — one-directional. That finding is why it is now tagged \`analysis\`.

## ⚠️ ALL FIVE ROWS WERE REWRITTEN AFTER GPT'S COLD READ (2026-08-20)

**SBL-A4 was REBUILT, not patched** — new scenario, new organisation, 5 criteria/10 marks → 6/12.
Its first version misclassified two of its three ethical threats: an ABSENT independent review was
called a *self-review threat* (self-review needs someone to re-evaluate their own prior judgement
and rely on it), and a threat to the EXTERNAL AUDITORS' independence was assessed in a note the
auditors were writing, on evidence that does not reach *"actual or perceived pressures"*. Cause:
the brief named the skill and the scenario shape and never named the THREATS, so the classification
was emergent. The rebuilt brief names all three and the fact that must create each.
**\`SBL-ETH1\` was registered the same day** — the ACCA Code of Ethics and Conduct (Section A: the
IESBA Code, 2025 edition as adopted 1 Jan 2026), fetched-not-stored, with §120.6 A3, §210.4 A1 and
the *close family* / *immediate family* glossary entries page-verified. Before it, 34 sources were
registered and not one was an ethics code.

**THE SYSTEMIC DEFECT: EVERY RUBRIC PRESCRIBED ITS OWN ANSWER.** A read-only sweep of all 28
criteria found three shapes — a prescribed **VERDICT** (A1 c5, A2 c6, A3 c5, A5 c5), a required
**RANKING** (A3 c3, A5 c4), and an asserted **DIRECTION** (A1 c4, A2 c2, A2 c4, A3 c6, A5 c2). The
cause was in the PROMPT, not the plans: this bullet's predecessor in \`PAPER_NARRATIVE_RULES.SBL\`
presupposed a verdict-carrying criterion, and \`required_point\` is defined as *"the point a
full-marks answer makes"* — so a criterion requiring a verdict is written BY STATING IT. **Nothing
could catch it**: N5 tests the REVEAL for a conclusion and never the criterion, N6 declines to read
\`required_point\` semantics, N1/N4 grade coverage and separation. A rubric that prescribes the
answer passes all six. The rule now marks the STRUCTURE of a judgement, never its direction, and a
companion rule bars a criterion from asserting causation the case supports only as plausibility.
**Every criterion below that carries a judgement now names both readings as full-marks.**

**Also fixed:** A3's date error (rollout Sept 2023 + eighteen months = **2025**, not the 2024 the
rubric and model answer both asserted) · two student-facing grammar defects nothing gates
(\`"has been taken place"\`, \`"decision to declined to provide"\`) · a **key-injection** hazard —
\`scenario_fact.key\` is spliced verbatim into prose a student reads, so a sentence-initial or
finite-verb-phrase key renders ungrammatically mid-sentence.

⚠️ **THE MODEL ANSWERS MIRRORED THE DEFECTS IN EVERY CASE, so they moved with the criteria.** A
golden GOOD that still asserts what its criterion no longer requires fails N1 — and on A2 it did,
mid-pass: softening c5 and its GOOD paragraph together dropped the GOOD below full marks and the
grader caught it. **When a criterion and the answer that must satisfy it are softened together, the
answer can fall through the floor the criterion still sets.**

🟠 **TWO MARGINAL WORDINGS RULED NOT WORTH REOPENING** and left in place, recorded for this
decision: **A1 c3** infers from a survey of *redeployed employees* that the eight middle managers
are themselves under stress (hedged, but a step the case does not take), and **A5 c3** forecloses
any benchmark value in the 42%-below-commercial comparison (sound reasoning, absolute closure).
`;

/**
 * The state table is DERIVED, not hand-typed. It was hand-typed until 2026-08-20 and one row was
 * already wrong — SBL-A4 was listed at 10 marks after the rebuild took it to 12 — which is the
 * `assertNarrativeNumbers` lesson again: a number a human retypes beside generated content drifts
 * from it silently, and the preamble is exactly where a reviewer trusts it most.
 */
function stateTable(): string {
  const head = '| plan | id | LO | skill | marks | criteria | draft |\n|---|---|---|---|---|---|---|';
  const rows = IDS.map((id) => {
    const path = newestDraftPath(id);
    const d = JSON.parse(readFileSync(path, 'utf8')) as { row: Record<string, unknown> & { answer_schema: { total_marks: number; criteria: unknown[] } } };
    const r = d.row;
    const sc = r.answer_schema;
    const rowId = ROW_IDS[id];
    if (!rowId) throw new Error(`${id}: no row id declared in ROW_IDS — a draft carries no id, so the pack cannot derive one. Add it rather than shipping "undefined".`);
    return `| ${id} | \`${rowId}\` | ${r.lo_code} | ${r.professional_skill_tag} | ${sc.total_marks} | ${sc.criteria.length} | \`${path.split(/[\\/]/).pop()}\` |`;
  });
  return [head, ...rows].join('\n');
}

function render(): string {
  const out: string[] = [PREAMBLE.replace('{{STATE_TABLE}}', stateTable())];
  for (const id of IDS) {
    const path = newestDraftPath(id);
    const d = JSON.parse(readFileSync(path, 'utf8')) as {
      gate_lines?: string[];
      row: Record<string, unknown> & { answer_schema: Record<string, unknown> };
    };
    const r = d.row;
    const sc = r.answer_schema as {
      total_marks: number;
      requirement_parts: string[];
      scenario_facts: { id: string; kind: string; key?: string; text: string }[];
      criteria: { id: string; marks: number; lo: string; requirement_part: string; anchor_facts?: string[]; disqualifiers?: string[]; development_required?: boolean; required_point: string }[];
      _authoring?: { golden_bad?: string; designed_bad_flags?: string[]; designed_mode_evidenced?: string };
    };
    const a = sc._authoring ?? {};
    // Prefer the value PERSISTED on the row over this file's hardcoded table: the table is a copy
    // of the plan and can drift from it, the row cannot.
    const ev = a.designed_mode_evidenced ?? EVIDENCED[id];

    out.push(`\n---\n\n## ${id} · \`${r.lo_code}\` · ${r.professional_skill_tag} · L${r.intellectual_level} · ${r.marks_guide} marks`);
    out.push(`\n**verb:** ${r.command_verb} · **paper_code:** ${r.paper_code} · **status:** ${r.status}, published=${r.published}`);
    out.push(`\n*Generated from \`docs/rollbacks/${path.split(/[\\/]/).pop()}\`.*`);
    out.push(`\n**Designed BAD — N4 contract:** \`[${(a.designed_bad_flags ?? []).join(', ')}]\`` +
      (ev ? `  ·  **evidenced (NOT N4-verified):** \`${ev}\`` : '  ·  *its evidenced mode is itself deterministic*'));
    out.push(`\n### context_text\n\n${r.context_text}`);
    out.push(`\n### question\n\n${r.question}`);
    out.push(`\n### scenario facts\n\n| id | kind | key | text |\n|---|---|---|---|`);
    for (const f of sc.scenario_facts) out.push(`| \`${f.id}\` | ${f.kind} | \`${f.key ?? ''}\` | ${f.text} |`);
    out.push(`\n### requirement parts\n`);
    sc.requirement_parts.forEach((p, i) => out.push(`${i + 1}. ${p}`));
    out.push(`\n### criteria — ${sc.total_marks} marks, ${sc.criteria.length} criteria, 2 marks each\n`);
    for (const c of sc.criteria) {
      out.push(`**\`${c.id}\` — ${c.marks} marks** · lo \`${c.lo}\` · part: *${c.requirement_part}*`);
      out.push(`\n- **anchors:** ${(c.anchor_facts ?? []).map((x) => '`' + x + '`').join(', ') || '—'}`);
      out.push(`- **disqualifiers:** ${(c.disqualifiers ?? []).map((x) => '`' + x + '`').join(', ') || '—'}`);
      out.push(`- **development_required:** ${c.development_required}`);
      out.push(`\n> ${c.required_point}\n`);
    }
    out.push(`\n### golden GOOD (served as \`model_answer\`)\n\n${r.model_answer}`);
    out.push(`\n### golden BAD (authoring artefact — never served)\n\n${a.golden_bad ?? '(not recorded)'}`);
    out.push(`\n### hint\n\n${r.hint}`);
    out.push(`\n### full_reveal\n\n${r.full_reveal}`);
    out.push(`\n### gate matrix\n`);
    for (const l of d.gate_lines ?? []) out.push(`- ${l}`);
  }
  return out.join('\n') + '\n';
}

const dest = join(__dirname, '..', '..', 'docs', 'reviews', 'SBL_BATCH_A_REVIEW_PACK.md');
writeFileSync(dest, render(), 'utf8');
console.log(`wrote ${dest}`);
