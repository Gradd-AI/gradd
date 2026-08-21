/**
 * build-sbl-cold-read.ts — assemble the adversarial cold-read request for SBL batch A.
 *
 * Usage:  npx tsx scripts/authoring/build-sbl-cold-read.ts [SBL-A1 …]   (default: A1–A4)
 * Writes: ClaudeSend.txt (gitignored — it is the OUTGOING file and is overwritten each send).
 *
 * ── WHY THIS IS COMMITTED AND NOT A `scripts/_*` THROWAWAY ───────────────────────────
 * P-N3 ends by ruling that an adversarial cold read of the exhibit against the rubric belongs
 * IN the batch lifecycle, not beside it — no gate catches the defect and none realistically
 * can. A lifecycle step assembled by hand each time is a step that drifts: read 2's request
 * was hand-built, and the one thing a hand-built request cannot guarantee is that it quotes
 * the drill as it CURRENTLY STANDS. This reads the drafts through the shared resolver, so the
 * request and the review pack can never disagree about what the drill says.
 *
 * ⚠️ THE REPLY GOES TO `docs/reviews/SBL_BATCH_A_GPT_READ_<n>.md`, NOT BACK INTO ClaudeSend.txt.
 * Read 1's reply was LOST because it was pasted into the outgoing file, which the next send
 * overwrote. The findings are the durable artefact; the request is not.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadDraft, type SblCriterion } from './sbl-drafts';

const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const IDS = argv.length > 0 ? argv : ['SBL-A1', 'SBL-A2', 'SBL-A3', 'SBL-A4'];

const TITLE: Record<string, string> = {
  'SBL-A1': 'A1 — Leadership style (MPE, Vietnam)',
  'SBL-A2': 'A2 — Culture (Polaris Cargo Group, Poland)',
  'SBL-A3': 'A3 — Formulation v implementation (Kilimo, Kenya)',
  'SBL-A4': 'A4 — Ethical threats (Constructora Andina, Colombia)',
  'SBL-A5': 'A5 — (Tirta Nusantara, Indonesia)',
};

const PREAMBLE = `SBL BATCH A — COLD READ 3, ON A1, A2, A3 AND A4 IN THEIR CURRENT STATE

⚠️ READ THIS FIRST: EVERY FINDING FROM YOUR SECOND READ HAS BEEN APPLIED.
Your ratings from that read (A1 7.5, A2 5.5, A3 4, A4 3.5) are STALE BY
CONSTRUCTION and should not anchor this one. Two criteria were REBUILT rather
than patched — A3 c4 and A4 c3 — and A2's EXHIBIT was edited. Nothing has read
the batch as it now stands. Please read it cold.

A5 is excluded again: its own read is applied and it has not moved since.

WHAT THESE ARE. Four ACCA Strategic Business Leader practice drills, section A
(Leadership and governance). Each has: a scenario the candidate reads
(context_text), a requirement (question), a marking rubric of 2-mark criteria,
and a "golden GOOD" — the full-marks model answer, which is also shown to the
candidate after they attempt it. Every criterion is worth exactly 2 marks under
ACCA's own published development test: a point identified earns 1, and earns the
second only when its significance is weighed, it is tied to this organisation by
the information given, it is followed to a consequence, and it is illustrated
from the case.

THE TEST WE MOST WANT APPLIED — doctrine P-N3:

    NEVER LET THE RUBRIC OR THE GOLDEN GOOD KNOW MORE THAN THE EXHIBIT KNOWS.

The rubric is written by someone who can see the whole design. The candidate can
see only the exhibit. For every criterion and every sentence of the model answer:

  (a) Could a careful candidate holding ONLY the exhibit reach this?
  (b) Is the opposite reading open on the exhibit — and does the criterion
      foreclose it?

If (a) is no, the criterion marks the author's knowledge. If (b) is yes, it marks
agreement rather than reasoning. Both are defects.

YOUR OWN OPERATIONAL TEST IS NOW DOCTRINE and was used to drive these edits:

    Every verb stronger than "suggests / risks / is consistent with" needs an
    exhibit fact that closes the weaker alternative.

It has been half-mechanised: a lint reports your 17 red-flag terms across
required_point, model_answer and full_reveal, classifying each by whether its own
sentence hedges it. It is ADVISORY — it finds the verbs and cannot look for the
fact. Batch unhedged count went 56 → 36 across these edits. It found two things
your read did not (A2's GOOD said meeting dynamics and incident reviews
"prevent"; A4's REVEAL still taught an invented fact after the criterion and the
GOOD had both been corrected). It is NOT a substitute for this read.

DISGUISES ALREADY FOUND AND FIXED ACROSS THIS BATCH — listed so they are not
re-reported, and so the same shapes can be hunted in what remains:
  · asserted DIRECTION        — a causal link where the exhibit records sequence
  · manufactured ALTERNATIVES — and its over-correction, a list of routes the
                                exhibit never mentions
  · absolute from a hedge     — "no learning loop" where the case says "rarely"
  · population from a sample  — three promotions standing for a whole cohort
  · proof from correlation    — an outcome "confirming" a cause nothing isolates
  · imported knowledge        — plausible industry fact the exhibit never states
  · imported legal status     — a hotline user called a protected discloser
  · hidden ranking            — "the strongest competing option", "the primary
                                conduit", "will dwarf", "the most urgent"
  · prescribed answers        — a criterion offering exactly two approved verdicts

WHAT WE MOST WANT THIS TIME, beyond a fresh P-N3 pass:

  1. THE TWO REBUILT CRITERIA. A3 c4 and A4 c3 are new prose, not edits. They
     were rebuilt because each CONTRADICTED another criterion in its own drill
     (A3 c4 claimed the result was "directly traceable" while c6 says nothing
     isolates causation; A4 c3 asserted a chain of four things the exhibit does
     not contain). Do they now sit inside the exhibit, and do they agree with
     their siblings?

  2. INTERNAL CONTRADICTION GENERALLY. Two of the three publication-blockers
     found so far were one criterion contradicting another, or a teaching field
     contradicting the rubric it accompanies. Please look for that class
     explicitly: criterion v criterion, criterion v GOOD, GOOD v reveal, and any
     stated marking rule against the two-mark rule.

  3. ARITHMETIC AND DATES. A3 shipped two hard reconciliation errors — 94,000 of
     280,000 stated as 33%, and a March 2023 pilot called "eighteen months
     before" a survey taken around March 2025. There is no numeric verifier on
     this pipeline. Please recompute anything recomputable.

  4. WHETHER ANY EDIT OVER-CORRECTED. The over-correction is the same defect: an
     earlier fix replaced "the only available lever" with a list of routes the
     case leaves open, inventing alternatives exactly as the overclaim had. If a
     repair here has retreated into vagueness, or invented its own facts to
     refute the old ones, that is a finding.

Please give a publish/do-not-publish call per drill with the blocking reasons
first, and say plainly if a drill is now clean.

`;

function renderCriterion(c: SblCriterion): string {
  const anchors = (c.anchor_facts ?? []).join(', ');
  const disq = (c.disqualifiers ?? []).join(', ');
  return `\n[${c.id}] ${c.marks} marks · anchors=[${anchors}] · disqualifiers=[${disq}]\n${c.required_point}\n`;
}

const out: string[] = [PREAMBLE];

for (const id of IDS) {
  const { path, draft } = loadDraft(id);
  const r = draft.row;
  const a = r.answer_schema;
  const auth = (a._authoring ?? {}) as Record<string, unknown>;

  out.push('\n' + '='.repeat(78));
  out.push(`${TITLE[id] ?? id}   ·   LO ${draft.lo_code}   ·   skill: ${draft.skill}   ·   ${a.total_marks} marks`);
  out.push('='.repeat(78));

  out.push('\n----- SCENARIO (context_text — ALL the candidate sees) -----\n');
  out.push(r.context_text);

  out.push('\n----- REQUIREMENT (question) -----\n');
  out.push(r.question);

  out.push('\n----- SCENARIO FACTS the rubric anchors on -----');
  for (const f of a.scenario_facts ?? []) out.push(`  [${f.key}] ${f.text}`);

  out.push('\n----- MARKING RUBRIC -----');
  for (const c of a.criteria) out.push(renderCriterion(c));

  out.push('\n----- GOLDEN GOOD (model_answer — served to the candidate) -----\n');
  out.push(r.model_answer);

  out.push('\n----- GOLDEN BAD (authoring artefact, never served) -----\n');
  out.push(String(auth.golden_bad ?? '(not recorded)'));
  out.push(`\ndesigned_bad_flags: ${JSON.stringify(auth.designed_bad_flags ?? null)}`
    + `   evidenced: ${JSON.stringify(auth.designed_mode_evidenced ?? null)}`);

  out.push('\n----- HINT (shown after a wrong first attempt) -----\n');
  out.push(r.hint);

  out.push('\n----- TEACHING REVEAL (full_reveal — served after the attempt) -----\n');
  out.push(r.full_reveal);

  out.push(`\n*(assembled from ${path.split(/[\\/]/).pop()})*\n`);
}

const dest = join(__dirname, '..', '..', 'ClaudeSend.txt');
writeFileSync(dest, out.join('\n'), 'utf8');
console.log(`wrote ${dest}`);
console.log(`  ${IDS.length} drills · ${out.join('\n').length.toLocaleString()} chars`);
console.log('  ⚠️ the reply goes to docs/reviews/SBL_BATCH_A_GPT_READ_3.md — NOT back into this file.');
