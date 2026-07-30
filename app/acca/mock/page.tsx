import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import SitRunner from '@/app/acca/afm/mock/SitRunner';

// ── APM timed mock — now the SAME lean sit surface as AFM (2026-07-30) ────────
// This page used to render MockRunner, which drove the paper through CaseSession — the
// PRACTICE teach surface — under a countdown. That is why the APM "mock" coached the
// candidate through every requirement until each was judged correct, which no exam does.
// MockRunner is DELETED; both papers now render SitRunner, differing only in the `paper`
// prop. One sit behaviour, one write path, one serving gate.
//
// SitRunner still lives under app/acca/afm/mock/ because that is where it was authored
// and moving it is a rename with no behavioural content; the import crossing route
// folders is deliberate and harmless (it is a client component, not a route).
//
// noindex/nofollow now matches the AFM sit page: a sat exam paper should never be
// indexed, regardless of publication status.
export const metadata: Metadata = {
  title: 'APM Timed Mock — Gradd AI',
  description:
    'Sit a full timed APM mock — one Section A case and two Section B cases under a single clock.',
  robots: { index: false, follow: false },
};

export default async function ACCAMockPage() {
  // Auth guard only. The APM_CASES flag and the subscription entitlement are enforced by
  // /api/acca/sit, and SitRunner renders its own error state when the API refuses — a
  // second copy of the entitlement check here would just be one that could drift.
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/acca/auth?next=/acca/mock');
  }

  return <SitRunner paper="APM" />;
}
