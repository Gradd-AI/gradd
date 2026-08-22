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

const PREAMBLE = `SBL BATCH A — COLD READ 5, ON A1, A2, A3 AND A4 IN THEIR CURRENT STATE

THE TWO QUESTIONS WE MOST WANT ANSWERED, BEFORE ANYTHING ELSE:

  Q1. Are the remaining findings INSTANCES of the shapes already named below,
      or is there a SIXTH SHAPE not yet described?
  Q2. Is any of what remains a PUBLICATION BLOCKER — or is what is left
      grinding? We need to know when to stop as much as what to fix.

Please answer both explicitly and up front. Four consecutive rounds of "do not
publish" with a shrinking list is a shape that can run forever if nobody is
asked to call it, and we would rather ship a drill with three arguable wordings
than polish indefinitely. If a drill is clean, please say so plainly.

⚠️ EVERY FINDING FROM YOUR FOURTH READ HAS BEEN APPLIED. Your ratings from that
read are STALE BY CONSTRUCTION and must not anchor this one. Nothing has read
the batch as it now stands.

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

THE GOVERNING DOCTRINE — P-N3:

    NEVER LET THE RUBRIC OR THE GOLDEN GOOD KNOW MORE THAN THE EXHIBIT KNOWS.

  (a) Could a careful candidate holding ONLY the exhibit reach this?
  (b) Is the opposite reading open on the exhibit — and does the criterion
      foreclose it?

THE SHAPES ALREADY NAMED — please do NOT re-report these as new classes; report
instances by name, so we can tell instances from genuinely new families:

  1. CERTAINTY OVERCLAIM — converting risk/suggests into does/will. Your own
     operational test is now doctrine: every verb stronger than "suggests /
     risks / is consistent with" needs an exhibit fact that closes the weaker
     alternative.
  2. RUBRIC → GOOD → REVEAL DRIFT — a criterion repairs an inference and the
     model answer or teaching field quietly reintroduces it. Also doctrine, with
     the rule it implies: a criterion is never fixed alone.
  3. INVENTED SPECIFICS / IMPORTED KNOWLEDGE — roles, processes, industry
     mechanics or consequences the exhibit never supplies.
  4. HIDDEN RANKING — "the strongest", "the primary", "best placed", "the most
     urgent", "will dwarf". A ranking the candidate has to guess at.
  5. SAMPLE → POPULATION — three promotions standing for a whole cohort.
  6. EPISTEMIC-STATUS COLLAPSE / CLAIM → FACT LAUNDERING — YOUR FIND LAST ROUND,
     now doctrine P-N4: a claim reported by the exhibit remains a claim, an
     opinion an opinion, an absence of recorded evidence an absence of recorded
     evidence. We confirmed your point that no word list reaches it — all three
     of your laundered paraphrases score NO HIT on both existing lints.

Also already ruled and not worth re-reporting: the OVER-CORRECTION is the same
defect (inventing alternatives to refute an overclaim), and a rubric criterion
cannot forfeit a whole paper.

WHAT WAS FIXED SINCE YOUR FOURTH READ — all four of your residuals:

  · A4 — THE LAUNDERING. c1 no longer says sitting below an authority threshold
    "demonstrates formal approval authority"; it now runs on your form, "EVEN IF
    Camacho is correct that the amount falls within his authority limit, that
    does not resolve the conflict", states that the exhibit records the point as
    Camacho's own assertion, and credits either route — saying so, or conceding
    it arguendo and challenging anyway. The GOOD no longer says the assertion
    "confirms that the mechanical rule was not broken" and carries the same
    concession-plus-attribution.
  · A4 c3 — the GOOD no longer says procurement staff are "the people best
    placed"; it matches the criterion's "among those likely to hold relevant
    information".
  · A3 — the GOOD no longer says the briefing failure "left four of the six
    regions without prepared support"; it says "weakened regional-management
    preparedness" and names the limit itself. THE REVEAL CARRIED THE SAME PHRASE
    and has been fixed too.
  · A2 — the GOOD no longer says "decisions the operations function has
    historically made alone"; the exhibit shows the operations director speaks
    first and longest, so it now reads "a forum the operations director has
    historically dominated".

WHAT ELSE TO LOOK FOR, beyond Q1 and Q2:

  · DID ANY REPAIR OVER-CORRECT? Five rounds of subtraction is the risk. Does
    each GOOD still read as a FULL-MARKS answer — committed, developed,
    illustrated — or has it been hedged into vagueness? An answer that no longer
    earns the marks it models is worse than one that overclaims, because it
    teaches students to write nothing. A4's c1 and GOOD in particular were
    rewritten around a concession; please check the challenge is still sharp.
  · ARITHMETIC AND DATES. There is no numeric verifier on this pipeline and it
    has cost a drill twice. Please recompute anything recomputable.
  · THE TEACHING FIELDS. hint and full_reveal are what a student actually reads.
    Do they teach the failure the criteria PENALISE, at the right strength?

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
console.log('  ⚠️ the reply goes to docs/reviews/SBL_BATCH_A_GPT_READ_5.md — NOT back into this file.');
