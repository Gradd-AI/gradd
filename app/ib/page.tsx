// app/ib/page.tsx
// The IB Economics & Business Management landing, relocated here from the root when
// APM became the gradd.ai flagship. Content unchanged (components/landing/IBLandingPage).
// Keeps the logged-in→/dashboard behaviour the old root had for IB subscribers.
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import IBLandingPage from '@/components/landing/IBLandingPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Tutor for IB Economics & IB Business Management — From €44.99/mo | Gradd',
  description:
    'Start free — no card needed. Mia diagnoses the faulty thinking behind wrong answers, rebuilds them, and retests until they stick. IB Economics and Business Management, full curriculum, HL & SL.',
  keywords: [
    'IB Economics tutor',
    'IB Business Management tutor',
    'IB Diploma tutor',
    'IB Economics AI tutor',
    'IB Business Management online',
    'IB tutor online',
    'AI IB tutor',
    'IB Economics curriculum',
    'IB Business Management curriculum',
    'online IB tutor',
    'IB SL HL tutor',
  ],
  alternates: { canonical: 'https://gradd.ai/ib' },
  openGraph: {
    title: 'AI Tutor for IB Economics & IB Business Management — From €44.99/mo | Gradd',
    description:
      'Start free — no card needed. Mia diagnoses the faulty thinking behind wrong answers, rebuilds them, and retests until they stick. IB Economics and Business Management, full curriculum, HL & SL.',
    url: 'https://gradd.ai/ib',
    siteName: 'Gradd',
    type: 'website',
    images: [{ url: 'https://gradd.ai/og-image.svg', width: 1200, height: 630, alt: 'AI Tutor for IB Economics & IB Business Management — Gradd' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Tutor for IB Economics & IB Business Management — From €44.99/mo | Gradd',
    description:
      'Start free — no card needed. Mia diagnoses the faulty thinking behind wrong answers, rebuilds them, and retests until they stick. IB Economics and Business Management, full curriculum, HL & SL.',
    images: ['https://gradd.ai/og-image.svg'],
  },
  robots: { index: true, follow: true },
};

export default async function IBPage() {
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

  return <IBLandingPage />;
}
