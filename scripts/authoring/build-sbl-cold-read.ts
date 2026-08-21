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

const PREAMBLE = `SBL BATCH A — COLD READ 4, ON A1, A2, A3 AND A4 IN THEIR CURRENT STATE

⚠️ READ THIS FIRST: EVERY FINDING FROM YOUR THIRD READ HAS BEEN APPLIED.
Your ratings from that read (A1 8.5, A2 6.5, A3 6, A4 5.5) are STALE BY
CONSTRUCTION and must not anchor this one. Nothing has read the batch as it now
stands. Please read it cold.

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

BOTH OF YOUR OPERATIONAL TESTS ARE NOW DOCTRINE, and both drove this round:

  1. Every verb stronger than "suggests / risks / is consistent with" needs an
     exhibit fact that closes the weaker alternative.
  2. Wherever a criterion contains an explicit evidential warning, search the
     GOOD and the reveal for the very proposition that warning forbids.

Both are half-mechanised now (a certainty lint and a warning-drift check, both
ADVISORY — they find candidates, they cannot judge). Neither substitutes for
this read, and both are blind to anything phrased outside their term lists.

WHAT CHANGED SINCE YOUR THIRD READ — so you can attack the repairs directly:

  · A1 — c4 no longer makes its methodology mandatory; it marks the ACT (assess
    the reliability and significance of the 68% evidence and say how much weight
    it should carry) and credits a candidate who treats the survey as
    inconclusive. GOOD: "builds a compliance culture" → "risks building"; "would
    meet the timetable outright" → "would better protect"; and the
    68%-as-buy-in blend is now stated as role uncertainty, not buy-in.
  · A2 — THE BLOCKER IS GONE: no new division, no buying capability anywhere in
    the GOOD or the reveal. Also c1's "most depends on" ranking, the GOOD's "no
    bearing", the invented sponsorship structure, "more interdependent than
    haulage", "the first thing an employer tells a new arrival", and the reveal's
    deprioritise-customers framing.
  · A3 — THE BLOCKER IS GONE: no "naming an owner", no "launch gate", no "with no
    owner". The GOOD now states what the case records and says outright that it
    does not know what else the pilot report contained. Also c4's "without
    prepared support" → "weakened regional-MANAGEMENT preparedness", c1's
    "validated opportunity" and the imported member-trust theory, the 38%
    overstatement, and the GOOD's "settles" / "did exactly what it should have
    done".
  · A4 — THE BLOCKER IS GONE: the GOOD no longer says the hotline is a rule
    Camacho invokes or the mechanism that would test his claim. Also c1/c2/GOOD's
    "no independent review" absolutes, c3's "best placed" and "cannot rely", c4
    is no longer written around continuation, c5's "is what deters", c6's
    "irreversible", the invented 60-day deadline, and the reveal now says an
    unanswered question is not a developed conclusion.

WHAT WE MOST WANT THIS TIME:

  1. DID ANY REPAIR OVER-CORRECT? This is the specific risk of this round. Four
     GOLDEN GOODs were rewritten to REMOVE claims, and a model answer that has
     been hedged into vagueness is a different defect, not a fix. Ask of each
     GOOD: does it still read as a FULL-MARKS answer — committed, developed,
     illustrated — or has it retreated into safety? An answer that no longer
     earns the marks it models is worse than one that overclaims, because it
     teaches students to write nothing.
  2. IS THERE DRIFT LEFT? Same hunt as last time, now that the criteria have
     moved again: criterion v criterion, criterion v GOOD, GOOD v reveal, and any
     stated marking rule against the two-mark rule.
  3. DID A FIX INVENT ITS OWN FACTS TO REFUTE THE OLD ONE? The over-correction is
     the same defect: an earlier round replaced "the only available lever" with a
     list of routes the case leaves open, inventing alternatives exactly as the
     overclaim had.
  4. ARITHMETIC AND DATES. There is no numeric verifier on this pipeline and it
     has cost a drill twice. Please recompute anything recomputable.
  5. THE TEACHING FIELDS. hint and full_reveal are what a student actually reads.
     Do they teach the failure the criteria PENALISE, at the right strength?

Please give a publish/do-not-publish call per drill with the blocking reasons
first, and SAY PLAINLY IF A DRILL IS NOW CLEAN — we need to know when to stop as
much as what to fix next.

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
console.log('  ⚠️ the reply goes to docs/reviews/SBL_BATCH_A_GPT_READ_4.md — NOT back into this file.');
