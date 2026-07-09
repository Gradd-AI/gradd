// lib/org/guard.ts
// Coordinator auth guard for the /org dashboard. DEMO CUT: the coordinator is a
// hardcoded email (role gate deferred to pilot-ready — see project-org-layer-build).
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';

export const ORG_COORDINATOR_EMAIL = 'grant@live.ie';

/** Redirects unless the signed-in user is the hardcoded demo coordinator. */
export async function requireCoordinator(next: string): Promise<void> {
  const sb = await createServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect(`/auth/login?next=${encodeURIComponent(next)}`);
  if (user.email !== ORG_COORDINATOR_EMAIL) redirect('/');
}
