import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { canPreviewSit } from '@/lib/acca/sit-preview';
import SitRunner from './SitRunner';

// ── AFM Mock Paper 1 — lean sit surface (preview-gated) ────────────────────────
// The paper is candidate / published=false / mock_only=true, so no live route can
// serve it (see lib/acca/sit-preview.ts for the inverted-gate rationale). This page
// is reachable ONLY by the allowlisted test account; everyone else gets a plain 404,
// so the path is invisible rather than merely forbidden.
//
// noindex/nofollow as well as the 404: unpublished exam content must never be indexed
// even if the path is guessed or leaks into a referrer.
export const metadata: Metadata = {
  title: 'AFM Mock Paper 1',
  robots: { index: false, follow: false },
};

export default async function AFMMockSitPage() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();

  // Not signed in → the normal ACCA auth flow, returning here afterwards.
  if (!user) {
    redirect('/acca/auth?next=/acca/afm/mock');
  }
  // Signed in but not allowlisted → 404, identical to a path that does not exist.
  if (!canPreviewSit(user.email)) {
    notFound();
  }

  return <SitRunner />;
}
