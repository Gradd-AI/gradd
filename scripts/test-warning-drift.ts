// scripts/test-warning-drift.ts — fixtures for the P-N3 warning-drift check.
// Pure: no DB, no model, no network. Run: npm run test:warning-drift
//
// ── P-G3, AND THE ACCEPTANCE TEST IS GRANT'S, NOT MINE ───────────────────────────────
// "If it does not flag A2 c6's new division, A3 c5's absent owners and A4 c3's hotline, it
// is not the check." So all three are TRANSCRIBED HERE VERBATIM from the drafts as they
// stood on 2026-08-21 before the cold-read-3 fixes, and asserted to flag.
//
// ⚠️ THEY ARE TRANSCRIBED RATHER THAN READ FROM THE DRAFTS ON PURPOSE. The drills are about
// to be fixed. A fixture that loaded the live drafts would go quietly green the moment the
// drift was repaired — proving nothing about the detector ever again, and reading exactly
// like a detector that still works. The same reason the hedging suites pin superseded
// formulae as MUST-FAIL cases.
//
// ── WHAT THIS FIXTURE DOES NOT CLAIM ─────────────────────────────────────────────────
// That a flagged pair IS drift. The check reports sentences that talk about the distinctive
// things a warning forbids; whether the sentence asserts the forbidden proposition is a
// reader's judgement against the exhibit. Precision is deliberately not asserted anywhere.

import {
  stem,
  sentences,
  findWarnings,
  forbiddenTerms,
  checkWarningDrift,
  WARNING_LEADS,
} from '../lib/acca/warning-drift';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

// ── THE THREE KNOWN FAILURES, VERBATIM AS AT 2026-08-21 PRE-FIX ──────────────────────

const A2_C6 =
  'The candidate must LAND on a judgement about whether the 40% warehousing revenue target is achievable within four years without deliberate cultural change, and this criterion marks the structure of that judgement, not which way it goes. '
  + 'EITHER verdict earns the full two marks where it is reached that way. '
  + "Four years is a material horizon, and the exhibit describes PCG's PRESENT culture rather than its ability to alter that culture over that period — the case gives no financials, no competitor position and no client pipeline. "
  + "A candidate who invents a route the case does not mention — an outside leadership hire, an arm's-length division, an acquisition — has made the same error as one who declares the target impossible: both know more than the exhibit.";
const A2_GOOD =
  'What it does tell us is that nobody has recently been promoted for having it — so the people who would need to sponsor, protect and resource a new division are unlikely to be the people who have just been given the authority to do so. '
  + 'What persuades me otherwise is that all five artefacts sit in the shared machinery — pay, promotion, meetings, reviews, induction — that any new division would still have to operate inside; buying capability does not change what PCG rewards. '
  + 'The cost of that drift — damaged client relationships, unlearned service failures, and a leadership vacuum in the new division — is in my view greater than the disruption of deliberate cultural change.';

const A3_C5 =
  'Placing formulation and implementation side by side is the analytical act this requirement is testing, and this criterion marks whether the candidate performs it and supports the conclusion from the case — not which conclusion they reach. '
  + "So does a candidate who locates it in FORMULATION, arguing that leadership proceeded from pilot to rollout without ensuring the pilot's implementation requirement had been converted into an owned action. "
  + '(What the case records is that no roles were ever assigned; it does not tell the candidate what else the report did or did not contain, and a criterion cannot require them to know.) '
  + 'Both readings are open on the case, and a criterion that named one would mark agreement with its author rather than the candidate’s judgement.';
const A3_GOOD =
  'The counter-reading deserves a hearing: a study that produced a delivery-critical recommendation without also designing the role, naming an owner or setting a launch gate was arguably incomplete, and on that view the weakness begins in formulation.';
const A3_REVEAL =
  'Where you locate it matters less than whether you located it from the case: execution is the reading the pilot report most obviously supports, but a candidate who argues the formulation was incomplete because it produced a delivery-critical recommendation with no owner is answering the question that was set.';

const A4_C3 =
  "The candidate identifies an intimidation threat arising from Diego Salazar's response to Juliana Ríos's ethics-hotline submission, then CHALLENGES Camacho's assertion by explaining what that response does to the weight anyone can place on it. "
  + "THE CASE DOES NOT RECORD WHAT HAPPENED TO RÍOS'S REPORT ITSELF, and it does not establish that CA has no other internal route — it names a compliance function, and internal audit or an audit committee may exist. "
  + 'A candidate who confines the claim to the deterrent effect, rather than asserting that the arrangement cannot be tested from inside CA at all, is reading the exhibit correctly and earns full marks.';
const A4_GOOD =
  'The ethics hotline is one of the rules Camacho invokes, and it is also the mechanism by which his claim would have been tested. '
  + 'When Juliana Ríos used it — the proper internal reporting channel — Diego Salazar removed her from all DataSphere-related projects within one week.';

// ── 1. THE ACCEPTANCE TEST ───────────────────────────────────────────────────────────
console.log('\n  THE ACCEPTANCE TEST — all three known failures must flag');

{
  const r = checkWarningDrift({
    label: 'A2', criteria: [{ id: 'c6', required_point: A2_C6 }], model_answer: A2_GOOD,
  });
  const hits = r.pairs.filter((p) => p.criterionId === 'c6');
  ok('A2 c6 — the warning is found', r.warnings.some((w) => w.criterionId === 'c6'));
  ok("A2 c6 — the GOOD's invented division is flagged",
    hits.some((p) => /new division/i.test(p.sentence)),
    `pairs: ${hits.length}`);
  ok('A2 c6 — the enumeration supplied the term',
    hits.some((p) => p.matched.some((m) => m.startsWith('division'))),
    JSON.stringify(hits[0]?.matched));
  // Count DISTINCT sentences: one GOOD sentence can pair with several warnings in the same
  // criterion, so counting pairs would count it twice.
  ok('A2 c6 — all three division sentences surface',
    new Set(hits.filter((p) => /division/i.test(p.sentence)).map((p) => p.sentence)).size === 3,
    String(new Set(hits.filter((p) => /division/i.test(p.sentence)).map((p) => p.sentence)).size));
}

{
  const r = checkWarningDrift({
    label: 'A3', criteria: [{ id: 'c5', required_point: A3_C5 }],
    model_answer: A3_GOOD, full_reveal: A3_REVEAL,
  });
  const hits = r.pairs.filter((p) => p.criterionId === 'c5');
  ok('A3 c5 — the warning is found', r.warnings.some((w) => w.criterionId === 'c5'));
  ok("A3 c5 — the GOOD's absent owners / role design / launch gate is flagged",
    hits.some((p) => p.field === 'model_answer' && /naming an owner/i.test(p.sentence)),
    `pairs: ${hits.length}`);
  ok('A3 c5 — the REVEAL breach is flagged too, not just the GOOD',
    hits.some((p) => p.field === 'full_reveal' && /with no owner/i.test(p.sentence)));
  ok('A3 c5 — the stemmer bound owner/owned, which is what makes it detectable',
    stem('owner') === stem('owned') || stem('owners') === stem('owned'),
    `${stem('owner')} / ${stem('owned')} / ${stem('owners')}`);
}

{
  const r = checkWarningDrift({
    label: 'A4', criteria: [{ id: 'c3', required_point: A4_C3 }], model_answer: A4_GOOD,
  });
  const hits = r.pairs.filter((p) => p.criterionId === 'c3');
  ok('A4 c3 — the warning is found', r.warnings.some((w) => w.criterionId === 'c3'));
  ok("A4 c3 — the GOOD's hotline-as-testing-mechanism is flagged",
    hits.some((p) => /mechanism by which his claim would have been tested/i.test(p.sentence)),
    `pairs: ${hits.length}, matched: ${JSON.stringify(hits.map((h) => h.matched))}`);
}

// ── 2. WHY THE OBVIOUS DESIGN FAILS — A4 IS THE PROOF, SO PIN IT ─────────────────────
// Plain overlap against the warning SENTENCE misses A4 entirely. The negative-exemplar
// clause is load-bearing, not a refinement. If someone deletes sub-form (a), this goes red.
console.log('\n  the negative-exemplar clause is load-bearing (WRONG-1 pinned)');
{
  const firstClauseOnly =
    "THE CASE DOES NOT RECORD WHAT HAPPENED TO RÍOS'S REPORT ITSELF, and it does not establish that CA has no other internal route.";
  const naive = forbiddenTerms(firstClauseOnly).terms;
  // The point is NOT that the first clause overlaps nothing — it shares Rios/internal/report
  // with the NEIGHBOURING sentence. It is that it does not carry the one term that reaches the
  // OFFENDING sentence, so a checker built on it would pair the wrong sentence and miss this.
  ok('WRONG-1: the first clause alone does not carry the term that reaches the breach',
    !naive.includes(stem('tested')), JSON.stringify(naive));
  const real = forbiddenTerms(A4_C3);
  ok('the real extractor isolates a "rather than asserting that…" clause',
    real.clauses.some((c) => /rather than/i.test(c)), JSON.stringify(real.clauses));
  ok('and that clause is what supplies the matching term',
    real.terms.includes(stem('tested')), JSON.stringify(real.terms));
}

// ── 3. WARNING DETECTION — BOTH DIRECTIONS ───────────────────────────────────────────
console.log('\n  stage 1 finds warnings and does not invent them');
for (const s of [
  'The case does not record when the stake was acquired.',
  'The exhibit provides no financials, no competitor position and no client pipeline.',
  'EITHER verdict earns the full two marks where it is reached that way.',
  'Nothing in the case establishes that.',
  'A candidate who confines the claim is reading the exhibit correctly.',
  'It does not establish that CA has no other internal route.',
  'The case is silent on whether alternatives were tested.',
  'Both readings are open on the case.',
  'A candidate who invents a route has made the same error.',
]) ok(`warning found: "${s.slice(0, 44)}…"`, findWarnings(s).length === 1);

for (const s of [
  'The candidate identifies a self-interest threat arising from the 34% stake.',
  'Full 2 marks require the significance weighed and the consequence followed through.',
  '1 mark if identified but left undeveloped.',
  'Episode A shows a directive style.',
]) ok(`not a warning: "${s.slice(0, 44)}…"`, findWarnings(s).length === 0);

// ── 4. THE DISTINCTIVENESS FILTER IS DOING WORK ──────────────────────────────────────
// Without it the top pair for every warning is whichever sentence says "the candidate" most.
console.log('\n  register words are filtered, distinctive ones survive');
{
  const terms = forbiddenTerms(A2_C6).terms;
  ok('rubric register is dropped', !terms.includes('candidate') && !terms.includes('mark'));
  ok('the invented routes survive', terms.some((t) => t.startsWith('division'))
    && terms.some((t) => t.startsWith('acquisition')));
}
{
  // A term saturating the drill is register FOR THAT DRILL, however distinctive it looks.
  // >= 15 sentences, because a document-frequency filter needs a document (see the guard).
  const saturated = Array.from({ length: 20 }, () => 'Warehousing is the strategy.').join(' ');
  const r = checkWarningDrift({
    label: 'x',
    criteria: [{ id: 'c1', required_point: 'The case does not establish that warehousing is viable.' }],
    model_answer: 'Warehousing will succeed.',
    context_text: saturated,
    maxDocFreq: 0.25,
  });
  ok('a term in most of the drill is treated as register, not signal', r.pairs.length === 0);
}

// ── 5. IT REPORTS, IT DOES NOT REFUSE ────────────────────────────────────────────────
console.log('\n  the advisory contract holds');
{
  let threw = false; let r;
  try {
    r = checkWarningDrift({ label: 'empty', criteria: [], model_answer: null, full_reveal: null });
  } catch { threw = true; }
  ok('an empty drill does not throw', !threw);
  ok('and carries no pass/fail verdict',
    r !== undefined && !('ok' in r) && !('passed' in r) && !('blocking' in r));
  ok('a criterion with no warning yields no pairs',
    checkWarningDrift({
      label: 'y', criteria: [{ id: 'c1', required_point: 'Episode A shows a directive style.' }],
      model_answer: 'Episode A shows a directive style.',
    }).pairs.length === 0);
}
ok('every warning lead is case-insensitive', WARNING_LEADS.every((r) => r.flags.includes('i')));
ok('sentence splitting keeps a decimal intact',
  sentences('The retainer is COP 4.2 billion. It is large.').length === 2);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} warning-drift: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
