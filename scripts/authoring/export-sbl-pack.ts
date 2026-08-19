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

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const IDS = ['SBL-A1', 'SBL-A2', 'SBL-A3', 'SBL-A4', 'SBL-A5'];
/** Modes the BAD commits and the rubric marks, which N4 could not verify. See NarrativePlan.designed_bad. */
const EVIDENCED: Record<string, string> = { 'SBL-A1': 'F7', 'SBL-A3': 'F2', 'SBL-A4': 'F10' };

const PREAMBLE = `# SBL Batch A — review pack

**Regenerated from \`docs/rollbacks/SBL_narrative_draft_SBL-A*.json\` by
\`scripts/authoring/export-sbl-pack.ts\`.** Spec: \`docs/SBL_BATCH_A_PLAN.md\`.
Evidence: \`docs/evidence/SBL_FAILURE_CATALOGUE.md\`.

## ⚠️ DB STATE — 1 OF 5 INSERTED

\`SBL-A4\` = \`80b4918b-1602-46dc-a213-a4ba70cb12c4\`, \`status='candidate'\`, \`published=false\`.

The other four are refused by \`acca_drills_skill_chk\`, which pins the skill tag to APM/AFM's four.
It admitted SBL-A4 because \`scepticism\` is a name SBL SHARES with AFM, and refused the four tagged
\`analysis\` / \`evaluation\` because those are SBL-only. Migration
\`20260819130000_acca_drills_sbl_skill_vocabulary.sql\` is written and awaits manual apply.
**No publish flip has occurred — that is a separate GATE-P act.**

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
`;

function render(): string {
  const out: string[] = [PREAMBLE];
  for (const id of IDS) {
    const path = join(__dirname, '..', '..', 'docs', 'rollbacks', `SBL_narrative_draft_${id}.json`);
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
      _authoring?: { golden_bad?: string; designed_bad_flags?: string[] };
    };
    const a = sc._authoring ?? {};
    const ev = EVIDENCED[id];

    out.push(`\n---\n\n## ${id} · \`${r.lo_code}\` · ${r.professional_skill_tag} · L${r.intellectual_level} · ${r.marks_guide} marks`);
    out.push(`\n**verb:** ${r.command_verb} · **paper_code:** ${r.paper_code} · **status:** ${r.status}, published=${r.published}`);
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
