// app/page.tsx
// Host-routed flagship root:
//   gradd.ai → APM marketing landing (public, no auth) — the flagship.
//   gradd.ie → LC Business landing (unchanged), with its logged-in→/dashboard redirect.
// The IB landing moved to /ib (see app/ib/page.tsx). resolveIsIB stays host-based,
// so LC keeps its own domain root — only the gradd.ai branch changed IB → APM.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/LandingPage';
import ACCALandingPage from '@/components/landing/ACCALandingPage';
import { resolveIsIB } from '@/lib/site';
import type { Metadata } from 'next';

const LC_METADATA: Metadata = {
  title: 'AI Tutor for Leaving Cert Business — From €24.99/mo | Gradd',
  description:
    'Full LC Business syllabus from scratch to exam-ready. SEC-aligned curriculum, exam technique built in, progress tracked. 7-day free trial. From €24.99/month.',
  keywords: [
    'LC Business tutor',
    'Leaving Cert Business',
    'Leaving Certificate Business tutor',
    'LC Business grinds online',
    'AI tutor Ireland',
    'homeschool Leaving Cert',
    'SEC Business syllabus',
    'LC Business online Ireland',
    'Leaving Cert Business Higher Level',
    'Leaving Cert Business Ordinary Level',
    'external LC candidate',
  ],
  alternates: { canonical: 'https://gradd.ie/' },
  openGraph: {
    title: 'AI Tutor for Leaving Cert Business — From €24.99/mo | Gradd',
    description:
      'Full LC Business syllabus from scratch to exam-ready. SEC-aligned curriculum, exam technique built in, progress tracked. 7-day free trial. From €24.99/month.',
    url: 'https://gradd.ie/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Tutor for Leaving Cert Business — From €24.99/mo | Gradd',
    description:
      'Full LC Business syllabus from scratch to exam-ready. SEC-aligned curriculum, exam technique built in, progress tracked. 7-day free trial. From €24.99/month.',
  },
  robots: { index: true, follow: true },
};

const APM_METADATA: Metadata = {
  title: 'ACCA APM Tutor — Taught, Not Just Marked | Gradd',
  description:
    'AI tutor for ACCA APM. Diagnoses why your answer lost marks, coaches examiner thinking, marks professional skills against ACCA’s descriptors. 91 drills free. Full cases and a timed mock.',
  keywords: [
    'ACCA APM tutor',
    'ACCA APM',
    'Advanced Performance Management',
    'APM P5 tutor',
    'ACCA APM pass',
    'APM resit',
    'ACCA APM marking',
    'ACCA APM professional skills',
    'APM exam practice',
    'ACCA Strategic Professional',
  ],
  alternates: { canonical: 'https://gradd.ai/' },
  openGraph: {
    title: 'ACCA APM Tutor — Taught, Not Just Marked | Gradd',
    description:
      'AI tutor for ACCA APM. Diagnoses why your answer lost marks, coaches examiner thinking, marks professional skills against ACCA’s descriptors. 91 drills free. Full cases and a timed mock.',
    url: 'https://gradd.ai/',
    siteName: 'Gradd',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ACCA APM Tutor — Taught, Not Just Marked | Gradd',
    description:
      'AI tutor for ACCA APM. Diagnoses why your answer lost marks, coaches examiner thinking, marks professional skills against ACCA’s descriptors. 91 drills free. Full cases and a timed mock.',
  },
  robots: { index: true, follow: true },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  return (await resolveIsIB(host)) ? APM_METADATA : LC_METADATA;
}

export default async function HomePage() {
  const host = (await headers()).get('host') ?? '';
  const isIB = await resolveIsIB(host);

  // gradd.ai — flagship root is the APM marketing landing. Public, no auth guard,
  // no redirect (a logged-in visitor still sees the marketing page; the app lives
  // under /acca, the IB tutor under /ib and /dashboard).
  if (isIB) {
    return <ACCALandingPage />;
  }

  // gradd.ie — LC Business. Preserve the existing logged-in→/dashboard behaviour.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const status = profile?.subscription_status;
    if (status === 'active' || status === 'trialing') {
      redirect('/dashboard');
    }
  }

  return <LandingPage />;
}
