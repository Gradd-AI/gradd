import { headers } from 'next/headers';
import type { Metadata } from 'next';
import ACCALandingPage from '@/components/landing/ACCALandingPage';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  return {
    title: 'Failed APM? Pass next sitting | Gradd AI',
    description:
      "APM has one of the lowest pass rates in ACCA. Gradd teaches you the paper from where you're stuck to exam-ready — and marks every answer like the examiner, free.",
    metadataBase: new URL(host.includes('gradd.ai') ? 'https://gradd.ai' : 'https://gradd.ai'),
  };
}

export default function ACCAPage() {
  return <ACCALandingPage />;
}
