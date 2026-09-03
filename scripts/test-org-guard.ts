// scripts/test-org-guard.ts
// Unit tests for the /org authorisation decisions (lib/org/guard.ts).
// PURE — no env, no DB, no auth, no clock. Exit 1 on any fail.
//
// Run: npm run test:org-guard
//
// ── WHY BOTH HALVES, EVERY TIME (P-G3(a)) ────────────────────────────────────
// A suite made only of refusals passes against a guard that refuses EVERYTHING — which is
// not a fixed guard, it is a broken product, and it would ship looking green. So every
// refusal below is paired with the positive case it must not have broken: coordinator of
// org A is refused on org B AND still allowed on org A; a user id outside the cohort is
// refused AND a member still renders.
//
// These two functions are the whole authorisation decision. `requireCoordinator` around
// them is I/O only — session read, org lookup, grants query — and the SQL it runs is the
// input to `coordinatorDecision`, not a second opinion about it.

import { coordinatorDecision, cohortMemberDecision } from '../lib/org/guard';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) failures++;
}

const ORG_A = 'org-aaaaaaaa';
const ORG_B = 'org-bbbbbbbb';
const COORD_A = { email: 'coord.a@example.com', grants: [{ org_id: ORG_A }] };
const COORD_BOTH = { email: 'coord.both@example.com', grants: [{ org_id: ORG_A }, { org_id: ORG_B }] };

// ── T1: THE ORG SCOPING — the hole this closes ────────────────────────────────
{
  const onB = coordinatorDecision({ email: COORD_A.email, targetOrgId: ORG_B, grants: COORD_A.grants });
  check('T1a: coordinator of org A is REFUSED on org B', onB.allow === false, JSON.stringify(onB));
  check('T1b: and the refusal names the reason',
    onB.allow === false && onB.reason === 'not_coordinator_of_this_org', JSON.stringify(onB));

  // The other half. Without this, a guard that refuses everything passes T1a.
  const onA = coordinatorDecision({ email: COORD_A.email, targetOrgId: ORG_A, grants: COORD_A.grants });
  check('T1c: the SAME coordinator is still ALLOWED on org A', onA.allow === true, JSON.stringify(onA));
  check('T1d: and is allowed by MEMBERSHIP — the only route there is',
    onA.allow === true && onA.via === 'membership', JSON.stringify(onA));

  // Multi-org coordinators keep both.
  check('T1e: a coordinator of both orgs is allowed on A',
    coordinatorDecision({ email: COORD_BOTH.email, targetOrgId: ORG_A, grants: COORD_BOTH.grants }).allow === true);
  check('T1f: a coordinator of both orgs is allowed on B',
    coordinatorDecision({ email: COORD_BOTH.email, targetOrgId: ORG_B, grants: COORD_BOTH.grants }).allow === true);
}

// ── T2: MUST-FAIL — the shipped behaviour ─────────────────────────────────────
// The guard used to ask "does this user hold ANY active coordinator row?" and never
// compared it to the org being viewed. Transcribed here so a regression to it goes red.
{
  const LEGACY_decision = (grants: readonly { org_id: string }[]) => grants.length > 0;
  check('T2a: shipped guard ADMITTED coordinator A to org B', LEGACY_decision(COORD_A.grants) === true);
  check('T2b: the scoped guard refuses what the shipped one admitted',
    LEGACY_decision(COORD_A.grants) !==
      coordinatorDecision({ email: COORD_A.email, targetOrgId: ORG_B, grants: COORD_A.grants }).allow);
}

// ── T3: no grants at all ──────────────────────────────────────────────────────
{
  const none = coordinatorDecision({ email: 'student@example.com', targetOrgId: ORG_A, grants: [] });
  check('T3a: a user with no coordinator grants is refused', none.allow === false);
  check('T3b: reason is not_coordinator_of_this_org',
    none.allow === false && none.reason === 'not_coordinator_of_this_org');
}

// ── T4: an unresolved slug refuses BEFORE the grants are consulted ────────────
// Refusing here is what stops the page answering "does org X exist?" for a stranger.
{
  const ghost = coordinatorDecision({ email: COORD_A.email, targetOrgId: null, grants: COORD_A.grants });
  check('T4a: an unknown slug is refused even for a real coordinator', ghost.allow === false);
  check('T4b: reason is org_not_found', ghost.allow === false && ghost.reason === 'org_not_found');
}

// ── T5: NO EMAIL SHORT-CIRCUITS THE GUARD ─────────────────────────────────────
// These were the fallback's bypass fixtures. The fallback is DELETED, so they are repointed
// at its absence: the same four bypasses it used to perform (org existence, org scoping,
// role, status) must now be impossible for ANY address, including the one that used to hold
// them. `grants: []` throughout — that is what "no membership on this org" looks like, and
// the whole point is that no identity is exempt from needing one.
//
// The old literal is written out here deliberately rather than imported. Importing the
// constant would have made this suite go green by deleting a symbol; spelling the address
// out means the fixture still asks the real question after the constant is gone.
{
  const DELETED_FALLBACK = 'grant@live.ie';
  const noGrants = (email: string | null, targetOrgId: string | null) =>
    coordinatorDecision({ email, targetOrgId, grants: [] });

  check('T5a: the former fallback address is REFUSED on org A with no grants',
    noGrants(DELETED_FALLBACK, ORG_A).allow === false);
  check('T5b: and on org B', noGrants(DELETED_FALLBACK, ORG_B).allow === false);
  check('T5c: and it no longer bypasses org resolution (null org refuses)',
    noGrants(DELETED_FALLBACK, null).allow === false, 'this was the widest thing the fallback did');
  check('T5d: case variants get no special treatment either',
    noGrants('Grant@Live.IE', ORG_A).allow === false && noGrants('GRANT@LIVE.IE', ORG_B).allow === false);
  check('T5e: a lookalike address is refused, as it always was',
    noGrants('grant@live.ie.attacker.example', ORG_B).allow === false);
  check('T5f: a null email is refused', noGrants(null, ORG_A).allow === false);

  // THE OTHER HALF — the refusals above must not be "refuse everything". That address is a
  // real coordinator of demo-advisory, so WITH its grant it must still get in, by membership.
  const withGrant = coordinatorDecision({
    email: DELETED_FALLBACK, targetOrgId: ORG_A, grants: [{ org_id: ORG_A }],
  });
  check('T5g: the SAME address IS allowed once it holds a grant on that org',
    withGrant.allow === true, JSON.stringify(withGrant));
  check('T5h: and it gets in by MEMBERSHIP — the only remaining route',
    withGrant.allow === true && withGrant.via === 'membership', JSON.stringify(withGrant));

  // MUST-FAIL: the deleted fallback, transcribed. If anyone re-adds an email short-circuit
  // anywhere above the scoping, this goes red.
  const LEGACY_fallback = (email: string | null) => email?.toLowerCase() === DELETED_FALLBACK;
  check('T5i: the deleted fallback WOULD have admitted it with no grants',
    LEGACY_fallback(DELETED_FALLBACK) === true);
  check('T5j: the live guard disagrees with the deleted fallback',
    LEGACY_fallback(DELETED_FALLBACK) !== noGrants(DELETED_FALLBACK, ORG_A).allow);
}

// ── T6: THE COHORT MEMBERSHIP CHECK — both halves ─────────────────────────────
{
  const MEMBERS = ['user-alice', 'user-bob'];
  check('T6a: a user id NOT in the cohort is refused', cohortMemberDecision(MEMBERS, 'user-mallory') === false);
  check('T6b: a member IS still allowed', cohortMemberDecision(MEMBERS, 'user-alice') === true);
  check('T6c: the last member is allowed too (no off-by-one)', cohortMemberDecision(MEMBERS, 'user-bob') === true);
  check('T6d: an empty cohort admits nobody', cohortMemberDecision([], 'user-alice') === false);
  check('T6e: matching is exact, not prefix', cohortMemberDecision(MEMBERS, 'user-ali') === false);

  // MUST-FAIL: the shipped page performed no user check at all.
  const LEGACY_memberCheck = () => true;
  check('T6f: shipped page is pinned WRONG — it rendered a non-member',
    LEGACY_memberCheck() === true && cohortMemberDecision(MEMBERS, 'user-mallory') === false);
}

// ── T7: the two gates are INDEPENDENT ─────────────────────────────────────────
// Passing the org gate must not imply passing the cohort gate. This is the exact shape of
// the hole: the org/cohort consistency check passed and the user was never checked.
{
  const orgOk = coordinatorDecision({ email: COORD_A.email, targetOrgId: ORG_A, grants: COORD_A.grants });
  check('T7: org allowed AND cohort refused is reachable',
    orgOk.allow === true && cohortMemberDecision(['user-alice'], 'user-mallory') === false);
}

console.log(`\n${failures === 0 ? 'ALL ORG-GUARD FIXTURES PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
