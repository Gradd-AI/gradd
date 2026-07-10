// lib/org/guard.ts
// Coordinator auth guard for the /org dashboard. DEMO CUT: access is granted to any
// ACTIVE coordinator-role org_membership (matched by user_id or email) — plus a
// hardcoded demo fallback that is always allowed. The role gate stays coarse
// (coordinator of *some* org, not scoped per-org); the pages themselves enforce that
// the org/cohort belongs together. Per-org scoping is a pilot-ready item.
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export const ORG_COORDINATOR_EMAIL = 'grant@live.ie'; // demo fallback — always allowed

/** Redirects unless the signed-in user is an active coordinator (by user_id or email)
 *  on some org, or is the demo fallback coordinator. */
export async function requireCoordinator(next: string): Promise<void> {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);

  // Fast path: the demo fallback coordinator is always allowed.
  if (user.email?.toLowerCase() === ORG_COORDINATOR_EMAIL) return;

  // Otherwise: is this user an active coordinator on any org? Email-first memberships
  // (user_id still null until claim) match by email; claimed rows match by user_id.
  const conds = [`user_id.eq.${user.id}`];
  if (user.email) conds.push(`email.eq.${user.email}`);

  const svc = createServiceClient();
  const { data } = await svc
    .from('org_memberships')
    .select('id')
    .eq('role', 'coordinator')
    .eq('status', 'active')
    .or(conds.join(','))
    .limit(1);

  if (!data || data.length === 0) redirect('/');
}
