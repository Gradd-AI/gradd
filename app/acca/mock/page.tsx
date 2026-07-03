import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import MockRunner from './MockRunner';

export const metadata: Metadata = {
  title: 'APM Timed Mock — Gradd AI',
  description:
    'Sit a full timed APM mock — one Section A case and two Section B cases under a single 3h15m clock, marked as one paper.',
};

export default async function ACCAMockPage() {
  // ── Auth guard (per-page, matches the case hub). The APM_CASES flag and the
  // subscription entitlement are enforced by /api/acca/mock; MockRunner redirects
  // to /acca on a 404 (flag off) and renders an upsell on a 402. ────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/acca/auth?next=/acca/mock');
  }

  return <MockRunner />;
}
