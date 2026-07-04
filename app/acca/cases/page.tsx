import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import CaseList from './CaseList';

export const metadata: Metadata = {
  title: 'APM Exam Cases — Gradd AI',
  description:
    'Full APM exam cases — shared scenario, linked requirements, and professional-skills marking. Coached end-to-end by Ezra.',
};

export default async function ACCACasesPage() {
  // ── Auth guard (per-page, matches the drill hub) ───────────────────────────
  // The APM_CASES flag is NOT checked here: the list endpoint owns the flag, and
  // CaseList redirects to /acca on a 404 (flag off) — so a direct visit while the
  // feature is dark lands the student back on the drill hub, never a broken page.
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/acca/auth?next=/acca/cases');
  }

  return <CaseList />;
}
