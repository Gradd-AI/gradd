// scripts/test-teach-access.ts — the free tier's two meanings must stay separated.
// Pure: no DB, no model, no network. Run: npm run test:teach-access
//
// ── WHAT THIS DEFENDS ────────────────────────────────────────────────────────
// `profiles.<paper>_teach_throughs_used` counts COACHING DELIVERED. For the product's whole
// life the gate used it to refuse the ATTEMPT — 403 `cap_hit` before the student could submit
// anything — so a free student past three teach-throughs could not attempt a fourth drill,
// while every pricing card promised "every drill, unlimited, PLUS three full teach-throughs".
//
// P-G3: every assertion names the defect it would catch, and the SHIPPED COLLAPSE is pinned as
// a MUST-FAIL so the fix cannot be quietly reverted by someone "simplifying" the two fields
// back into one boolean.

import {
  teachAccessFor,
  upgradeAfterDiagnosisLine,
  FREE_TEACH_THROUGHS,
} from '../lib/acca/teach-access';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

console.log('\nteach access — attempting is not metered; coaching is\n');

// ── 1. THE PROPERTY THE DEFECT VIOLATED ──────────────────────────────────────
// Break mode: any future edit that makes `attemptAllowed` conditional. This is the whole
// ruling, so it is asserted across the ENTIRE input space rather than at a sample point.
{
  let everRefused = false;
  for (const hasActiveAccess of [true, false]) {
    for (const isFreeFollowUp of [true, false]) {
      for (const used of [0, 1, 2, 3, 4, 99, 1000, -5]) {
        const a = teachAccessFor({ hasActiveAccess, teachThroughsUsed: used, isFreeFollowUp });
        if (a.attemptAllowed !== true) everRefused = true;
      }
    }
  }
  ok('attemptAllowed is TRUE across the whole input space (nothing may 403 an attempt)', !everRefused);
}

// ── 2. Coaching: the three ways to have it ───────────────────────────────────
ok('paid user, well past the limit → coaching',
  teachAccessFor({ hasActiveAccess: true, teachThroughsUsed: 99, isFreeFollowUp: false }).coachingAllowed);
ok('free user under the limit → coaching',
  teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: 2, isFreeFollowUp: false }).coachingAllowed);
ok('free user AT the limit, continuing a drill that already spent a slot → coaching',
  teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: 3, isFreeFollowUp: true }).coachingAllowed);

// ── 3. The one way to lose it ────────────────────────────────────────────────
{
  const a = teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: 3, isFreeFollowUp: false });
  ok('free user at the limit on a NEW drill → no coaching', !a.coachingAllowed);
  ok('...but still allowed to attempt (THE defect, stated directly)', a.attemptAllowed === true);
  ok('...and `capped` is the inverse of coachingAllowed', a.capped === true);
}

// ── 4. The boundary is exactly FREE_TEACH_THROUGHS, off-by-one both sides ────
// Break mode: a `<=` slip silently gives away a fourth teach-through, or takes the third.
ok(`used = ${FREE_TEACH_THROUGHS - 1} still coaches (the third teach-through is not stolen)`,
  teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: FREE_TEACH_THROUGHS - 1, isFreeFollowUp: false }).coachingAllowed);
ok(`used = ${FREE_TEACH_THROUGHS} does not (a fourth is not given away)`,
  !teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: FREE_TEACH_THROUGHS, isFreeFollowUp: false }).coachingAllowed);

// ── 5. A junk counter must not read as either state by arithmetic accident ───
// Break mode: a null column arriving as NaN. `NaN < 3` is false, so an unclamped comparison
// would CAP a brand-new user who has never been coached at all — the worst direction.
for (const junk of [NaN, Infinity, -Infinity, -1, -999, 2.7]) {
  const a = teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: junk as number, isFreeFollowUp: false });
  ok(`counter ${String(junk)} → coaching (a junk counter never caps a user)`, a.coachingAllowed);
}
ok('3.9 truncates to 3 and DOES cap (truncation, not rounding)',
  !teachAccessFor({ hasActiveAccess: false, teachThroughsUsed: 3.9, isFreeFollowUp: false }).coachingAllowed);

// ── 6. MUST-FAIL — the shipped collapse, transcribed (P-G3) ──────────────────
// This is the gate exactly as it stood at app/api/acca/tutor/route.ts:1224 before the fix.
// It returns ONE boolean, and the route used it to answer BOTH questions. Pinned so that
// re-deriving `attemptAllowed` from it can never pass.
const LEGACY_allowed = (hasActiveAccess: boolean, usedCount: number, isFreeFollowUp: boolean) =>
  hasActiveAccess || usedCount < 3 || isFreeFollowUp;
{
  const capped = { hasActiveAccess: false, teachThroughsUsed: 3, isFreeFollowUp: false };
  const legacy = LEGACY_allowed(capped.hasActiveAccess, capped.teachThroughsUsed, capped.isFreeFollowUp);
  const now = teachAccessFor(capped);
  ok('MUST-FAIL: the legacy single boolean refuses this user (that WAS the 403)', legacy === false);
  ok('MUST-FAIL: using it as attemptAllowed disagrees with the ruling', legacy !== now.attemptAllowed);
  ok('the legacy boolean is still correct for COACHING (the counter was never wrong)',
    legacy === now.coachingAllowed);
}
// ...and it must agree about coaching on every input, because the counter was always right
// about coaching. Only its SECOND use was wrong.
{
  let disagreed = 0;
  for (const hasActiveAccess of [true, false]) {
    for (const isFreeFollowUp of [true, false]) {
      for (const used of [0, 1, 2, 3, 4, 50]) {
        const legacy = LEGACY_allowed(hasActiveAccess, used, isFreeFollowUp);
        const now = teachAccessFor({ hasActiveAccess, teachThroughsUsed: used, isFreeFollowUp });
        if (legacy !== now.coachingAllowed) disagreed++;
      }
    }
  }
  ok('coaching decision is UNCHANGED from the legacy gate on every input (0 disagreements)',
    disagreed === 0, `disagreed on ${disagreed}`);
}

// ── 7. The upgrade line ──────────────────────────────────────────────────────
// Break mode: someone makes it an instruction inside a prompt again, or drops the href.
{
  const line = upgradeAfterDiagnosisLine('/acca/subscribe?paper=AFM');
  ok('upgrade line carries the paper-scoped href', line.includes('/acca/subscribe?paper=AFM'));
  ok('upgrade line names the limit from the shared constant',
    line.includes(String(FREE_TEACH_THROUGHS)));
  ok('upgrade line leads with the gap being NAMED, not withheld', /gap named/i.test(line));
  ok('upgrade line does not promise the model answer',
    !/model answer|full answer|worked answer/i.test(line));
  ok('upgrade line is appended (starts with a break, not mid-sentence)', line.startsWith('\n\n'));
  const apm = upgradeAfterDiagnosisLine('/acca/subscribe');
  ok('APM href stays bare (paperHref default-paper rule)', apm.includes('(/acca/subscribe)'));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} teach access: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
