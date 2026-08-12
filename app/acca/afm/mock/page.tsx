import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import SitRunner from '@/components/acca/SitRunner';

// ── AFM Mock Paper 1 — lean sit surface (real product surface) ─────────────────
// The email allowlist that used to guard this page is GONE (2026-07-29), along with
// the inverted serving gate it existed to protect. Access is now decided in ONE place,
// app/api/acca/sit/route.ts, which applies the same APM_CASES flag + entitlement gate
// as every other case route; the page only needs the sign-in redirect. Putting the
// entitlement check here as well would just be a second copy that could drift.
//
// ⚠️ CORRECTED 2026-08-12. This comment used to end "— the runner renders its own error state
// when the API refuses", and treated that as sufficient. It was not. The single-source-of-truth
// reasoning above is right and unchanged; what nobody checked is whether the runner's error
// state could say WHY. It could not: every non-200 collapsed into one phase with one string,
// so a 402 `subscription_required` — the one refusal a student can act on, arriving at the
// highest-intent moment on the surface — rendered "Couldn't load the paper. Reload to try
// again." The runner now maps the status (lib/acca/sit-preview.ts `sitRefusalFor`) and has a
// `locked` phase that sells, in the same copy register CaseSession already uses.
//
// THE GENERALISABLE PART: "the API owns the decision" and "the client can explain the
// decision" are two requirements, and satisfying the first says nothing about the second.
// Delegating a refusal upward obliges the caller to carry the reason back down.
//
// noindex/nofollow is KEPT. A sat exam paper should never be indexed regardless of
// publication status: search results quoting requirement text would leak the paper to
// candidates who have not sat it.
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

  return <SitRunner paper="AFM" />;
}
