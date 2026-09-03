// lib/org/guard.ts
// Coordinator auth guard for the /org dashboard.
//
// ── SCOPED TO THE ORG BEING VIEWED (2026-09-03) ──────────────────────────────
// This guard used to ask "is this user an active coordinator of SOME org?" and then let
// them into ANY org's pages. The pages checked that the org and cohort belonged together,
// which is a consistency check, not an authorisation one: a coordinator of org A could
// read org B's cohorts, its trainees' readiness, its heatmap and its trainee drill-downs
// by changing the slug in the URL. It was logged in this file's own header as
// *"the role gate stays coarse (coordinator of *some* org, not scoped per-org)"* and
// *"Per-org scoping is a pilot-ready item"* — this is that item.
//
// It is closed BEFORE the cross-user sit-results reader exists, deliberately. That reader
// exposes another person's exam answers, per-requirement marks, bands and the marker's
// verbatim feedback. Widening what a coordinator can see while the gate still admits any
// coordinator of any org would turn a cross-org read into a cross-org data breach.
//
// ── THE HARDCODED FALLBACK IS GONE (2026-09-03) ──────────────────────────────
// A constant `ORG_COORDINATOR_EMAIL = 'grant@live.ie'` used to be checked FIRST, before the
// org was resolved, and it bypassed (a) whether the org exists, (b) whether that person
// coordinates THIS org, (c) the role check and (d) the status check — a total bypass of
// every rule below it, for one address, decided with no DB read at all.
//
// It is DELETED, not merely descoped, and deleting it cost nothing: that address already
// holds an active coordinator row on demo-advisory, so it is admitted at step (2) through
// the same checked path as everyone else. Verified against live rows before removal and
// again after it.
//
// THERE IS NOW NO IDENTITY THAT SHORT-CIRCUITS THIS GUARD. Every viewer, without exception,
// reaches an org through an active coordinator membership ON THAT ORG. That property is
// what the cross-user sit-results reader will be built on top of, so it is asserted rather
// than assumed: scripts/test-org-guard.ts T5 pins the ABSENCE — the old literal, a
// lookalike address and a null email all get identical, unexceptional treatment.
//
// `email` is still taken as an input because the GRANTS are matched by it upstream
// (email-first memberships carry a null user_id until claim), but no branch here reads it.
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export type CoordinatorRefusal =
  | 'not_signed_in'
  | 'org_not_found'
  | 'not_coordinator_of_this_org';

export type CoordinatorDecision =
  | { allow: true; via: 'membership' }
  | { allow: false; reason: CoordinatorRefusal };

/**
 * PURE. Given who is asking, which org they are asking for, and the coordinator grants
 * that identity holds, may they in?
 *
 * `grants` must ALREADY be filtered to active coordinator rows matched to this identity —
 * the caller does that in SQL. This function owns the ORG SCOPING and the precedence, and
 * nothing else, so both are testable without a database.
 */
export function coordinatorDecision(input: {
  email: string | null;
  /** null when the slug did not resolve to an org. */
  targetOrgId: string | null;
  grants: readonly { org_id: string }[];
}): CoordinatorDecision {
  const { targetOrgId, grants } = input;

  // (1) An unresolved slug is a REFUSAL, not a 404. Refusing before the org is known keeps
  // the page from becoming an existence oracle: "does org X exist?" now answers the same
  // way for a stranger whether or not it does.
  if (!targetOrgId) return { allow: false, reason: 'org_not_found' };

  // (2) The scoping, and now the ONLY way in: a grant on THIS org, not on any org.
  return grants.some((g) => g.org_id === targetOrgId)
    ? { allow: true, via: 'membership' }
    : { allow: false, reason: 'not_coordinator_of_this_org' };
}

/**
 * PURE. Is this trainee in this cohort?
 *
 * The trainee drill-down verified that the COHORT belonged to the ORG and then rendered
 * whatever `userId` the URL carried — the user was never checked against the cohort at
 * all, so any user id rendered under any cohort of a viewable org.
 */
export function cohortMemberDecision(
  memberUserIds: readonly string[],
  userId: string,
): boolean {
  return memberUserIds.includes(userId);
}

/** Redirects unless the signed-in user may view THIS org. `slug` is required: a guard that
 *  does not know what it is guarding cannot scope. */
export async function requireCoordinator(next: string, slug: string): Promise<void> {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);

  const svc = createServiceClient();
  const { data: orgRow } = await svc.from('orgs').select('id').eq('slug', slug).maybeSingle();
  const targetOrgId = (orgRow?.id as string | undefined) ?? null;

  // Email-first memberships (user_id still null until claim) match by email; claimed rows
  // match by user_id. `org_id` is now SELECTED — it was not before, which is precisely why
  // the scoping could not happen.
  const conds = [`user_id.eq.${user.id}`];
  if (user.email) conds.push(`email.eq.${user.email}`);

  const { data } = await svc
    .from('org_memberships')
    .select('org_id')
    .eq('role', 'coordinator')
    .eq('status', 'active')
    .or(conds.join(','));

  const decision = coordinatorDecision({
    email: user.email ?? null,
    targetOrgId,
    grants: (data as { org_id: string }[] | null) ?? [],
  });

  // Every refusal lands on the same redirect, deliberately: distinguishing "no such org"
  // from "not your org" in the response would rebuild the existence oracle that refusing
  // an unresolved slug closes.
  if (!decision.allow) redirect('/');
}
