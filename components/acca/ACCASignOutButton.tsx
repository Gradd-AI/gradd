// components/acca/ACCASignOutButton.tsx
// The one thing genuinely shared across ACCA's six independently-styled page headers —
// logo and breadcrumb stay page-owned (different destinations, different content; unifying
// them would be a redesign of five pages, not a sign-out fix). See docs/GRADD_BUILD_
// HARDENING.md's open sign-out item for why this existed nowhere until now.
//
// A plain form POST to the existing server route, not a client onClick calling
// supabase.auth.signOut() (the pattern DashboardClient.tsx/IBDashboardClient.tsx use) —
// deliberately, so this works unchanged from BOTH a server parent (app/acca/progress/
// page.tsx has no 'use client') and the five client parents, with no hook, no boundary.
//
// Never render this inside SitRunner's mid-sit `.sit-bar` — that countdown header has no
// navigation of any kind by design (leaving a live timed paper is already a non-action),
// the same reason CaseSession.tsx suppresses its whole header when `embedded`. It belongs
// only on SitRunner's post-submission `.db-nav`, where the paper is already in.
export default function ACCASignOutButton({ className }: { className?: string }) {
  return (
    <form action="/api/auth/signout" method="POST" className={className}>
      <button type="submit" className="acca-signout-btn">Sign out</button>
    </form>
  );
}
