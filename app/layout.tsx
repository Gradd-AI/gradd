import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import { resolveIsIB } from '@/lib/site';
import MetaPixel from '@/components/MetaPixel';
import './landing-fonts.css';
import './globals.css';
import '../styles/ib-session.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const ICONS: Metadata['icons'] = {
  icon: [
    { url: '/favicon.ico' },
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  shortcut: '/favicon.ico',
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  const isIB = await resolveIsIB(host);
  return {
    // isIB actually means "on gradd.ai" (see lib/site.ts) — this is the LAST-RESORT
    // fallback for any gradd.ai page without its own metadata (root, /acca, /ib etc.
    // all export their own and override this). Kept host-generic, not product-named,
    // because it covers ACCA and IB pages alike.
    title: isIB ? 'Gradd — Taught, Not Just Marked' : 'Gradd — Your LC Business Tutor',
    description: isIB
      ? 'Anything can mark an answer. Gradd tells you why it lost the mark and coaches the fix — ACCA and IB.'
      : 'Full Leaving Certificate Business curriculum delivered by AI. Study at your own pace, from scratch to exam-ready.',
    metadataBase: new URL(isIB ? 'https://gradd.ai' : 'https://gradd.ie'),
    icons: ICONS,
    manifest: '/site.webmanifest',
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body>
        {children}
        {/* Meta Pixel — self-gates to gradd.ai + marketing consent; inert elsewhere. */}
        <MetaPixel />
      </body>
    </html>
  );
}