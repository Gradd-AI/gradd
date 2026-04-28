// app/page.tsx
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/LandingPage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
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
  alternates: {
    canonical: 'https://gradd.ie',
  },
  openGraph: {
    title: 'Gradd — AI Leaving Cert Business Tutor',
    description:
      'Replace your grind teacher. Full LC Business curriculum from €24.99/month. Structured lessons, SEC exam technique, progress tracking — built for Irish students.',
    url: 'https://gradd.ie',
    siteName: 'Gradd',
    locale: 'en_IE',
    type: 'website',
    images: [
      {
        url: 'https://gradd.ie/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Gradd — AI Leaving Cert Business Tutor for Irish Students',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gradd — AI Leaving Cert Business Tutor',
    description: 'Full LC Business curriculum from €24.99/month. Built for Irish students.',
    images: ['https://gradd.ie/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function HomePage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return <LandingPage />;
}
