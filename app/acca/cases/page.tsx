import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { paperFromRouteParam, caseListMetadata } from '@/lib/acca/case-surface';
import { paperHref } from '@/lib/acca/paper-url';
import CaseList from './CaseList';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// Per-paper, so the tab and the search result name the paper the student is on. Was a
// static `metadata` export saying "APM Exam Cases" — correct while this surface was
// APM-only and wrong the moment it listed AFM's five cases. The APM strings are
// byte-identical to the ones it replaces (pinned in scripts/test-case-surface.ts).
export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const { paper: paperParam } = await searchParams;
  return caseListMetadata(paperFromRouteParam(paperParam));
}

export default async function ACCACasesPage({ searchParams }: { searchParams: SearchParams }) {
  // ── Auth guard (per-page, matches the drill hub) ───────────────────────────
  // The APM_CASES flag is NOT checked here: the list endpoint owns the flag, and
  // CaseList redirects to /acca on a 404 (flag off) — so a direct visit while the
  // feature is dark lands the student back on the drill hub, never a broken page.
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  const { paper: paperParam } = await searchParams;
  if (!user) {
    // The paper rides INSIDE the encoded next=, never as a second param beside it —
    // one source of truth for the destination (lib/acca/paper-url.ts, AUTH category).
    redirect(`/acca/auth?next=${encodeURIComponent(paperHref('/acca/cases', paperFromRouteParam(paperParam)))}`);
  }

  // The paper is resolved HERE, from the route, and handed down as a prop. The client
  // component must never decide it: a literal in there is what hid AFM's five cases.
  return <CaseList paper={paperFromRouteParam(paperParam)} />;
}
