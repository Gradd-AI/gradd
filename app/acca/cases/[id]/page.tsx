import type { Metadata } from 'next';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { paperForCaseRow, caseDetailMetadata } from '@/lib/acca/case-surface';
import CaseSession from './CaseSession';

/**
 * Which paper this case belongs to — read off the case's OWN row.
 *
 * ⚠️ NOT FROM A `?paper=` PARAM, and that is the point. `/acca/cases/<id>` is ID-ADDRESSED:
 * the id is a globally-unique primary key, so the link stays bare (lib/acca/paper-url.ts
 * lists the three categories that do). Adding a param here would create a second source of
 * truth for a fact `acca_cases.paper_code` already owns — and a BARE link, which is what a
 * bookmark or a shared URL is, would resolve to the default paper and 404 an AFM case
 * against the load route's `.eq('paper_code', …)`. The list page's `?paper=` decides which
 * cases to LIST; the id decides which paper a case IS.
 *
 * `cache` so `generateMetadata` and the page itself share one query per request — the
 * documented dedup for a non-`fetch` data source (Next generate-metadata.md).
 *
 * This is NOT an entitlement decision and does not weaken one: the load/turn/mark routes
 * re-derive the gate paper with `strictPaper` from what the client sends and refuse on a
 * miss. A wrong answer here renders the wrong header and then 404s, it does not unlock
 * anything. Serving gate matched to those routes (approved + published) so an unpublished
 * or malformed id falls through to the default and the route's normal 404.
 */
const casePaper = cache(async (id: string) => {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('acca_cases')
    .select('paper_code')
    .eq('id', id)
    .eq('status', 'approved')
    .eq('published', true)
    .maybeSingle();
  return paperForCaseRow(data?.paper_code);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return caseDetailMetadata(await casePaper(id));
}

export default async function ACCACasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ── Auth guard (per-page, matches the tutor). The APM_CASES flag is enforced by
  // the case load endpoint; CaseSession redirects to /acca on its 404. ──────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  const { id } = await params;
  if (!user) {
    redirect(`/acca/auth?next=/acca/cases/${id}`);
  }

  return <CaseSession caseId={id} paper={await casePaper(id)} />;
}
