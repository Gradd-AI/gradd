import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import CaseSession from './CaseSession';

export const metadata: Metadata = {
  title: 'APM Exam Case — Ezra | Gradd',
  description:
    'Work a full APM exam case with Ezra — shared scenario, linked requirements, and professional-skills marking on your whole answer.',
};

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

  return <CaseSession caseId={id} />;
}
