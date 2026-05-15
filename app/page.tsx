// app/page.tsx
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/LandingPage';
import IBLandingPage from '@/components/landing/IBLandingPage';
import type { Metadata } from 'next';

const LC_METADATA: Metadata = {
  title: 'Gradd — AI Leaving Cert Business Tutor for Irish Students',
  description:
    'Full Leaving Certificate Business curriculum delivered online by AI tutor Aoife. Structured lessons, SEC exam technique, progress tracking. Less than one grind session per month. Built for Irish homeschool students and external LC candidates.',
  keywords: [
    'LC Business tutor',
    'Leaving Cert Business',
    'Leaving Certificate Business tutor',
    'LC Business grinds online',
    'AI tutor Ireland',
    'homeschool Leaving Cert',
    'SEC Business syllabus',
    'LC Business online Ireland',
  ],
  alternates: { canonical: 'https://gradd.ie' },
  openGraph: {
    title: 'Gradd — AI Leaving Cert Business Tutor',
    description:
      'Replace your grind teacher. Full LC Business curriculum from €24.99/month. Structured lessons, SEC exam technique, progress tracking — built for Irish students.',
    url: 'https://gradd.ie',
    siteName: 'Gradd',
    locale: 'en_IE',
    type: 'website',
    images: [{ url: 'https://gradd.ie/og-image.svg', width: 1200, height: 630, alt: 'Gradd — AI Leaving Cert Business Tutor for Irish Students' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gradd — AI Leaving Cert Business Tutor',
    description: 'Full LC Business curriculum from €24.99/month. Built for Irish students.',
    images: ['https://gradd.ie/og-image.svg'],
  },
  robots: { index: true, follow: true },
};

const IB_METADATA: Metadata = {
  title: 'AI Tutor for IB Economics & IB Business Management — From €44.99/mo | Gradd',
  description:
    'Full IB curriculum from scratch to exam-ready. 346 lessons, IBO-standard diagrams, photo upload diagram marking. 7-day free trial. From €44.99/month.',
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
  alternates: { canonical: 'https://gradd.ai' },
  openGraph: {
    title: 'AI Tutor for IB Economics & IB Business Management — From €44.99/mo | Gradd',
    description:
      'Full IB curriculum from scratch to exam-ready. 346 lessons, IBO-standard diagrams, photo upload diagram marking. 7-day free trial. From €44.99/month.',
    url: 'https://gradd.ai',
    siteName: 'Gradd',
    type: 'website',
    images: [{ url: 'https://gradd.ai/og-image.svg', width: 1200, height: 630, alt: 'AI Tutor for IB Economics & IB Business Management — Gradd' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Tutor for IB Economics & IB Business Management — From €44.99/mo | Gradd',
    description:
      'Full IB curriculum from scratch to exam-ready. 346 lessons, IBO-standard diagrams, photo upload diagram marking. 7-day free trial. From €44.99/month.',
    images: ['https://gradd.ai/og-image.svg'],
  },
  robots: { index: true, follow: true },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  return host.includes('gradd.ai') ? IB_METADATA : LC_METADATA;
}

export default async function HomePage() {
  const host = (await headers()).get('host') ?? '';
  const isIB = host.includes('gradd.ai');

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

  return isIB ? <IBLandingPage /> : <LandingPage />;
}
