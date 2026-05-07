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
  title: 'Gradd — AI IB Tutor for Economics and Business Management',
  description:
    'The first AI platform delivering the full IB Economics and IB Business Management curriculum from scratch. Structured lessons, command term technique, SL & HL coverage. €44.99/month per subject. Available 24/7 worldwide.',
  keywords: [
    'IB Economics tutor',
    'IB Business Management tutor',
    'IB Diploma tutor',
    'IB Economics AI tutor',
    'IB Business Management online',
    'IB tutor online',
    'AI IB tutor',
    'IB Economics curriculum',
  ],
  alternates: { canonical: 'https://gradd.ai' },
  openGraph: {
    title: 'Gradd — AI IB Tutor for Economics and Business Management',
    description:
      'Full IB Economics and IB Business Management curriculum from €44.99/month. Structured AI tutor, command term technique, SL & HL — available anywhere in the world.',
    url: 'https://gradd.ai',
    siteName: 'Gradd',
    locale: 'en_GB',
    type: 'website',
    images: [{ url: 'https://gradd.ai/og-image.svg', width: 1200, height: 630, alt: 'Gradd — AI IB Tutor for Economics and Business Management' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gradd — AI IB Tutor for Economics and Business Management',
    description: 'Full IB curriculum from €44.99/month. SL & HL. Available 24/7 worldwide.',
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
    redirect('/dashboard');
  }

  return isIB ? <IBLandingPage /> : <LandingPage />;
}
