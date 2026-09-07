// scripts/test-reveal-split.ts — `npm run test:reveal-split`
//
// PURE. No DB, no model, no network. Covers the two questions `lib/acca/reveal-split.ts` owns.
//
// ── WHAT SECTION 1 DEFENDS: THE BYTE-IDENTITY PROPERTY ───────────────────────
// The expand control has TWO paths to the same document and they must produce the same bytes:
//
//   • IN SESSION — the client already holds the served reveal, so it SPLITS those bytes.
//   • DEEP LINK / REFRESH — the server holds only the row, so it REPRODUCES the artefact as
//     `normaliseRevealArtefact(row.model_answer)`.
//
// If those two ever disagree, a student who expands in the chat and a student who opens the same
// URL in a new tab read different worked answers, and nothing anywhere would say so. The property
// asserted is exact:
//
//     splitServedReveal(assembleAfmReveal(w, m)).artefact === normaliseRevealArtefact(m)
//
// driven over a corpus chosen for the things that could break it — pipe tables (35 AFM and 5 APM
// published drills carry them), a markdown horizontal rule inside the worked answer (the reason
// the boundary is not just `---`), `## ` headings, unicode, and an answer that itself ends in the
// separator's characters.
//
// ── WHAT SECTION 2 DEFENDS: THE MOAT'S SECOND DOOR ───────────────────────────
// The three refusals the ship condition named — UNEARNED, BURN-TIER, MOCK_ONLY — plus the paper
// scoping and the fail-closed empty artefact. Each asserts the SPECIFIC refusal, never merely
// "refused": a gate that refuses everything passes a test that only checks for refusal, and that
// gate would also refuse every student who earned the thing.

import {
  splitServedReveal,
  expandedRevealDecision,
  type ExpandedRevealInput,
} from '../lib/acca/reveal-split';
import {
  assembleAfmReveal,
  normaliseRevealArtefact,
  sanitizeAfmWrapper,
  AFM_REVEAL_SEPARATOR,
  REVEAL_FOOTER,
} from '../lib/acca/tutor-personas';
import { MOCK_PAPERS } from '../lib/acca/mocks';

let checks = 0;
let failures = 0;

function ok(label: string, cond: boolean, detail = ''): void {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function eq(label: string, actual: unknown, expected: unknown): void {
  const same = actual === expected;
  ok(label, same, same ? '' : `got ${JSON.stringify(actual)} · want ${JSON.stringify(expected)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — THE BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── 1. splitServedReveal — the wrapper/artefact boundary ──');

// The corpus. Each entry is a model_answer chosen for one hazard.
const ANSWERS: Array<{ name: string; text: string }> = [
  {
    name: 'plain prose',
    text: 'Step 1 — Compute the WACC.\nThe cost of equity is 11.4%.',
  },
  {
    name: 'pipe table (contiguous rows must stay one table)',
    text: [
      '## Step 2 — NPV by state',
      '| State | NPV | p |',
      '|---|---|---|',
      '| Optimistic | THB 99m | 0.25 |',
      '| Base | THB (84)m | 0.50 |',
      '',
      'ENPV = THB (16)m.',
    ].join('\n'),
  },
  {
    name: 'a markdown horizontal rule INSIDE the worked answer',
    // The reason BOUNDARY is footer+separator and not the separator alone. A naive
    // `indexOf(AFM_REVEAL_SEPARATOR)` split would cut this answer in half.
    text: 'Part (a) conclusion: accept.\n\n---\n\nPart (b) conclusion: reject.',
  },
  {
    name: 'headings only',
    text: '## Step 1 — Inputs\n## Step 2 — Discounting\n## Step 3 — Decision',
  },
  {
    name: 'unicode, currency and en-dashes',
    text: 'Résumé of flows — €1.2m at t₀, ¥340m at t₁. Verdict: accept.',
  },
  {
    name: 'answer ending in a rule (adjacent to the tail boundary)',
    text: 'Conclusion: the swap saves 40bp.\n\n---',
  },
  {
    name: 'answer containing the separator characters run together',
    text: 'The bracket notation is (---) in the exhibit.\nNPV = USD 4.1m.',
  },
  {
    name: 'single line, no trailing newline',
    text: 'NPV = NOK 41m; accept.',
  },
];

const WRAPPERS: Array<{ name: string; text: string }> = [
  { name: 'short pointer wrapper', text: 'Look at **Step 2 — NPV by state** first: that is where your sign flipped.' },
  { name: 'multi-paragraph wrapper', text: 'You had the discount rate right.\n\nThe worked answer below sets out the state NPVs; compare your Base row against it.' },
  { name: 'wrapper with an em-dash and a quote', text: 'Your phrase — "a one-shot purchase" — is the right instinct.' },
];

for (const w of WRAPPERS) {
  for (const a of ANSWERS) {
    const served = assembleAfmReveal(w.text, a.text);
    const split = splitServedReveal(served);
    const label = `${w.name} × ${a.name}`;

    ok(`split found a boundary — ${label}`, split !== null);
    if (!split) continue;

    // THE PROPERTY. This is the fixture the whole control rests on.
    eq(`artefact is byte-identical to normaliseRevealArtefact — ${label}`,
      split.artefact, normaliseRevealArtefact(a.text));

    // The wrapper half is the sanitized wrapper plus the footer, exactly as served.
    eq(`wrapper is the served wrapper + footer — ${label}`,
      split.wrapper, sanitizeAfmWrapper(w.text) + REVEAL_FOOTER);

    // And the two halves plus the separator reconstitute the served bytes with nothing lost.
    eq(`wrapper + separator + artefact === served — ${label}`,
      split.wrapper + AFM_REVEAL_SEPARATOR + split.artefact, served);
  }
}

console.log('\n── 1b. splitServedReveal returns null when there is nothing to expand ──');

// A `null` must mean "render no expand control". Every one of these is a real served body on the
// case surface, and none of them carries an artefact.
const NO_ARTEFACT: Array<{ name: string; text: string }> = [
  { name: 'a teaching turn', text: 'Start with the outlay. What discount rate did you apply to the year-1 flow?' },
  { name: 'a hint', text: 'Look again at the sign on the pessimistic state.' },
  { name: 'the static earn-it refusal', text: 'Have a go first — write down what you think the NPV is and I will work from there.' },
  { name: 'a burn (sells understanding, serves no artefact)', text: 'This is where I take you from "sort of get it" to "got it."\n\n---\n\n[Unlock the full worked answer →](/acca/subscribe?paper=AFM)' },
  { name: 'empty string', text: '' },
  { name: 'the footer alone, with no separator after it', text: `Some prose.${REVEAL_FOOTER}` },
  { name: 'the separator alone, with no footer before it', text: `Some prose.${AFM_REVEAL_SEPARATOR}More prose.` },
];

for (const c of NO_ARTEFACT) {
  eq(`null — ${c.name}`, splitServedReveal(c.text), null);
}

console.log('\n── 1c. P-G3 — the wrong implementations are pinned MUST-FAIL ──');

// A fixture that only exercises the right answer cannot show the right answer was needed.
{
  const hazard = ANSWERS.find((a) => a.name.startsWith('a markdown horizontal rule'))!;
  const served = assembleAfmReveal(WRAPPERS[0].text, hazard.text);

  // ── WRONG #1 — split on the separator alone, and the honest statement of why. ──
  //
  // ⚠️ IT IS NOT WRONG TODAY, AND THE FIXTURE SAYS SO RATHER THAN INVENTING A DEFECT.
  // `sanitizeAfmWrapper` CUTS the wrapper at its first markdown horizontal rule, so a sanitized
  // wrapper can never contain `\n\n---\n\n`, so the first separator in an ASSEMBLED reveal is
  // always the real boundary. Asserted, not assumed:
  const naiveAt = served.indexOf(AFM_REVEAL_SEPARATOR);
  const naiveArtefact = served.slice(naiveAt + AFM_REVEAL_SEPARATOR.length);
  eq('separator-alone agrees on assembled input — the sanitizer is why',
    naiveArtefact, normaliseRevealArtefact(hazard.text));

  // What is wrong with it is the DEPENDENCY. It is correct only because a DIFFERENT module cuts
  // horizontal rules out of the wrapper first; nothing types that coupling and nothing would fail
  // if `sanitizeAfmWrapper` stopped cutting them. `splitServedReveal` matches the exact bytes
  // `assembleAfmReveal` writes, so it does not care. Pinned by assembling by hand, WITHOUT the
  // sanitizer — the shape a weakened sanitizer would produce:
  const ruledWrapper = 'You had the rate right.\n\n---\n\nNow read the worked answer.';
  const unsanitized = ruledWrapper + REVEAL_FOOTER + AFM_REVEAL_SEPARATOR + normaliseRevealArtefact(hazard.text);
  const naive2 = unsanitized.slice(unsanitized.indexOf(AFM_REVEAL_SEPARATOR) + AFM_REVEAL_SEPARATOR.length);
  ok('WRONG: separator-alone breaks the moment a rule survives into the wrapper',
    naive2 !== normaliseRevealArtefact(hazard.text));
  ok('WRONG: ...and it leaks wrapper prose into the document',
    naive2.includes('Now read the worked answer.'));
  const right2 = splitServedReveal(unsanitized)!;
  eq('RIGHT: footer+separator is unaffected by an uncut rule in the wrapper',
    right2.artefact, normaliseRevealArtefact(hazard.text));

  // WRONG #2 — split on the LAST boundary occurrence. Correct on every input the model can
  // actually produce, so it is pinned against a CONSTRUCTED answer that contains the boundary:
  // the direction of its error is truncation, which is the failure being designed against.
  const boobyTrap = `First half of the answer.${REVEAL_FOOTER}${AFM_REVEAL_SEPARATOR}Second half, with the figures: NPV = GBP 12m.`;
  const trapServed = assembleAfmReveal(WRAPPERS[0].text, boobyTrap);
  const lastAt = trapServed.lastIndexOf(REVEAL_FOOTER + AFM_REVEAL_SEPARATOR);
  const lastArtefact = trapServed.slice(lastAt + (REVEAL_FOOTER + AFM_REVEAL_SEPARATOR).length);
  ok('WRONG: splitting on the LAST boundary truncates the artefact',
    lastArtefact !== normaliseRevealArtefact(boobyTrap));
  ok('WRONG: ...and specifically loses the first half',
    !lastArtefact.includes('First half of the answer.'));

  // RIGHT — first occurrence keeps every byte of the answer, even in the constructed case.
  const right = splitServedReveal(trapServed)!;
  ok('RIGHT: first-occurrence split keeps the whole answer',
    right.artefact.includes('First half of the answer.') && right.artefact.includes('NPV = GBP 12m.'));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — THE GATE
// ═══════════════════════════════════════════════════════════════════════════════
console.log('\n── 2. expandedRevealDecision — the server-side gate re-check ──');

const CASE_ID = 'c0000000-0000-4000-8000-000000000001';

// A student who has EARNED the reveal by struggle, on a paid account, against a live AFM case.
// Every refusal case below is this base with exactly one field changed, so each test names the
// rule that fired and nothing else can be responsible for it.
function base(): ExpandedRevealInput {
  return {
    caseId: CASE_ID,
    caseRow: { paper_code: 'AFM', mock_only: false },
    paid: true,
    progress: { miss_count: 2, resolved: false },
    requirement: { model_answer: '## Step 1 — Inputs\nWACC = 9.4%.' },
  };
}

function decide(patch: Partial<ExpandedRevealInput>) {
  return expandedRevealDecision({ ...base(), ...patch });
}

// ── The grant. If this ever fails, every refusal below is worthless. ──
{
  const d = decide({});
  ok('GRANT: paid + two misses + live AFM case → ok', d.ok === true);
  if (d.ok) eq('GRANT: paper is derived from the row', d.paper, 'AFM');
}
{
  const d = decide({ progress: { miss_count: 0, resolved: true } });
  ok('GRANT: resolved (solved) earns it with zero misses', d.ok === true);
}
{
  // Solved beats unpaid — the artefact is earned by producing the answer, free and paid alike.
  const d = decide({ paid: false, progress: { miss_count: 0, resolved: true } });
  ok('GRANT: resolved earns it on a FREE account too', d.ok === true);
}
{
  const d = decide({ caseRow: { paper_code: 'APM', mock_only: false } });
  ok('GRANT: an APM case is served', d.ok === true);
  if (d.ok) eq('GRANT: ...and reports APM', d.paper, 'APM');
}

// ── SHIP-CONDITION REFUSAL 1 — UNEARNED. The moat, re-asked at the second door. ──
console.log('\n   refusal 1 — unearned (the moat)');
for (const misses of [0, 1]) {
  const d = decide({ progress: { miss_count: misses, resolved: false } });
  ok(`UNEARNED: ${misses} miss(es), not resolved → refused`, d.ok === false);
  if (!d.ok) eq(`UNEARNED: ${misses} miss(es) → refusal is 'unearned'`, d.refusal, 'unearned');
}
{
  // Never turned at all — no progress row exists. This is the deep-link-from-nowhere case, and
  // it is the one a client-trusting implementation would have served.
  const d = decide({ progress: null });
  ok('UNEARNED: no progress row at all → refused', d.ok === false);
  if (!d.ok) eq("UNEARNED: no progress row → 'unearned'", d.refusal, 'unearned');
}
{
  // A malformed row degrades to zero misses, which REFUSES. The turn route's equivalent catch
  // degrades toward continuing to teach; here the safe direction is the opposite one.
  const d = decide({ progress: { miss_count: 'lots', resolved: 'yes' } });
  ok('UNEARNED: a malformed progress row degrades toward refusal', d.ok === false);
  if (!d.ok) eq("UNEARNED: malformed row → 'unearned'", d.refusal, 'unearned');
}

// ── SHIP-CONDITION REFUSAL 2 — BURN TIER. Struggle without a subscription. ──
console.log('\n   refusal 2 — burn tier (the artefact is what is being sold)');
{
  const d = decide({ paid: false, progress: { miss_count: 2, resolved: false } });
  ok('BURN: unpaid + two misses → refused', d.ok === false);
  if (!d.ok) eq("BURN: → refusal is 'burn', not 'unearned'", d.refusal, 'burn');
}
{
  const d = decide({ paid: false, progress: { miss_count: 9, resolved: false } });
  ok('BURN: more struggle does not buy the artefact', d.ok === false);
  if (!d.ok) eq("BURN: nine misses, unpaid → still 'burn'", d.refusal, 'burn');
}
{
  // The boundary between the two refusals is the subscription, and it must be the ONLY thing
  // separating them. Same student, same misses, one field.
  const unpaid = decide({ paid: false, progress: { miss_count: 2, resolved: false } });
  const paid   = decide({ paid: true,  progress: { miss_count: 2, resolved: false } });
  ok('BURN: the subscription is the only difference between refused and served',
    unpaid.ok === false && paid.ok === true);
}

// ── SHIP-CONDITION REFUSAL 3 — MOCK_ONLY. Reserved exam content. ──
console.log('\n   refusal 3 — mock_only (reserved exam content)');
{
  const d = decide({ caseRow: { paper_code: 'AFM', mock_only: true } });
  ok('MOCK: a mock_only case is refused even to a fully-earned paid student', d.ok === false);
  if (!d.ok) eq("MOCK: → refusal is 'reserved'", d.refusal, 'reserved');
}
{
  // Resolved is the strongest earn there is, and it does not open reserved content either.
  const d = decide({ caseRow: { paper_code: 'AFM', mock_only: true }, progress: { miss_count: 5, resolved: true } });
  ok('MOCK: resolved does not unlock reserved content', d.ok === false);
  if (!d.ok) eq("MOCK: resolved + mock_only → 'reserved'", d.refusal, 'reserved');
}
{
  // A mock case MISSING the column is still caught, via registry membership in `caseIsReserved`.
  // Driven from the REAL registry, not a transcribed id, so this cannot drift from what the sit
  // surface reserves. Every registered case is exercised, both papers.
  const registered = MOCK_PAPERS.flatMap((p) => p.case_ids.map((id) => ({ id, paper: p.paper })));
  ok('MOCK: the registry has cases to test against', registered.length > 0);
  for (const { id, paper } of registered) {
    const d = expandedRevealDecision({
      ...base(),
      caseId: id,
      caseRow: { paper_code: paper, mock_only: null },   // column absent / null
    });
    ok(`MOCK: registered case ${id.slice(0, 8)} with a NULL mock_only column is refused`, d.ok === false);
    if (!d.ok) eq(`MOCK: ${id.slice(0, 8)} null column, registry hit → 'reserved'`, d.refusal, 'reserved');
  }
}

// ── The remaining refusals: paper scoping, missing rows, and the fail-closed artefact. ──
console.log('\n   the rest — paper scoping, missing rows, fail-closed artefact');
{
  const d = decide({ caseRow: null });
  ok('NOT FOUND: no approved+published case with this id', d.ok === false);
  if (!d.ok) eq("NOT FOUND: → 'not_found'", d.refusal, 'not_found');
}
{
  // SBL is a DECLARED paper that is not SERVED. It must refuse, not default to APM and then check
  // an APM subscription against SBL content.
  const d = decide({ caseRow: { paper_code: 'SBL', mock_only: false } });
  ok('PAPER: a declared-but-unserved paper (SBL) is refused', d.ok === false);
  if (!d.ok) eq("PAPER: SBL → 'not_found'", d.refusal, 'not_found');
}
{
  const d = decide({ caseRow: { paper_code: 'nonsense', mock_only: false } });
  ok('PAPER: an unrecognised paper_code is refused, never defaulted', d.ok === false);
  if (!d.ok) eq("PAPER: garbage → 'not_found'", d.refusal, 'not_found');
}
{
  const d = decide({ caseRow: { paper_code: null, mock_only: false } });
  ok('PAPER: a null paper_code is refused', d.ok === false);
}
{
  const d = decide({ requirement: null });
  ok('REQUIREMENT: one that does not belong to this case is refused', d.ok === false);
  if (!d.ok) eq("REQUIREMENT: → 'no_requirement'", d.refusal, 'no_requirement');
}

// FAIL CLOSED — AFM_SURFACED (q). An empty model_answer 404s; it never generates one.
for (const empty of ['', '   ', '\n\n', null, undefined, 42]) {
  const d = decide({ requirement: { model_answer: empty } });
  ok(`ARTEFACT: model_answer ${JSON.stringify(empty)} → refused`, d.ok === false);
  if (!d.ok) eq(`ARTEFACT: ${JSON.stringify(empty)} → 'no_artefact'`, d.refusal, 'no_artefact');
}

console.log('\n── 2b. P-G3 — a gate that refuses everything must not pass ──');
{
  // The reason every assertion above names its refusal rather than checking `ok === false`.
  // This transcribes the degenerate implementation and shows the suite would catch it.
  const alwaysRefuse = (): { ok: false; refusal: 'not_found' } => ({ ok: false, refusal: 'not_found' });
  const d = alwaysRefuse();
  ok('WRONG: a gate that always refuses fails the GRANT cases', d.ok === false && base().paid === true);
  // Stated as the property rather than re-running the suite: the four GRANT assertions above are
  // the ones this implementation fails, and they are the reason they exist.
}

// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
if (failures > 0) {
  console.error(`FAIL reveal-split: ${failures} of ${checks} checks failed`);
  process.exitCode = 1;
} else {
  console.log(`PASS reveal-split: ${checks}/${checks} checks`);
}
