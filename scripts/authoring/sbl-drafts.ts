/**
 * sbl-drafts.ts — locating and loading the SBL batch-A drafts. Pure: fs only, no DB, no env.
 *
 * ⚠️ IMPORT-SAFE BY CONSTRUCTION, AND THAT IS THE POINT. `export-sbl-pack.ts` WRITES THE PACK
 * AT MODULE SCOPE, so importing it to reuse one helper would silently regenerate the review
 * pack as a side effect of running something else. The draft-resolution rule below is
 * load-bearing (see `newestDraftPath`), so it must have exactly one definition — this file —
 * rather than a copy in every tool that reads a draft.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DRAFT_DIR = join(__dirname, '..', '..', 'docs', 'rollbacks');

/** The batch, in plan order. */
export const SBL_PLAN_IDS = ['SBL-A1', 'SBL-A2', 'SBL-A3', 'SBL-A4', 'SBL-A5'] as const;
export type SblPlanId = (typeof SBL_PLAN_IDS)[number];

/**
 * ⚠️ THE NEWEST DRAFT IS NOT ALWAYS `<id>.json`, AND READING THE WRONG ONE READS OLD CONTENT.
 *
 * A dry run does not overwrite a captured draft (`nextFreeDraftPath` in the generator) — it
 * lands on `<id>.2.json`, `<id>.3.json` … and leaves the original alone. That guard is right,
 * and it introduced this trap: SBL-A4 was REBUILT on 2026-08-20 and its live content is in
 * `SBL_narrative_draft_SBL-A4.2.json`, while `SBL_narrative_draft_SBL-A4.json` still holds the
 * superseded pre-rebuild version. A tool that globs the bare name reports on a drill that no
 * longer exists, and it looks completely clean while doing it.
 *
 * So resolve the HIGHEST-numbered sibling, and PRINT which file each section came from. A
 * reader can check what a report quotes; they cannot check which file it read unless it says.
 */
export function newestDraftPath(id: string): string {
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

export type SblCriterion = {
  id: string;
  requirement_part?: string;
  lo?: string;
  required_point: string;
  marks: number;
  anchor_facts?: string[];
  disqualifiers?: string[];
  development_required?: boolean;
};

export type SblDraft = {
  plan_id: string;
  lo_code: string;
  skill: string;
  gate_lines?: string[];
  row: {
    question: string;
    context_text: string;
    model_answer: string;
    hint: string;
    full_reveal: string;
    answer_schema: {
      scenario_facts?: { key: string; text: string }[];
      criteria: SblCriterion[];
      total_marks: number;
      _authoring?: Record<string, unknown>;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
};

export function loadDraft(id: string): { path: string; draft: SblDraft } {
  const path = newestDraftPath(id);
  return { path, draft: JSON.parse(readFileSync(path, 'utf8')) as SblDraft };
}
