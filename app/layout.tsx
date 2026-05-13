import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

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
    { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
  ],
  apple: [{ url: '/apple-touch-icon.png' }],
  shortcut: '/favicon.ico',
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  const isIB = host.includes('gradd.ai');
  return {
    title: isIB ? 'Gradd — Your IB Tutor' : 'Gradd — Your LC Business Tutor',
    description: isIB
      ? 'Full IB Economics and Business Management curriculum delivered by AI. Structured lessons, exam technique, progress tracking. 24/7.'
      : 'Full Leaving Certificate Business curriculum delivered by AI. Study at your own pace, from scratch to exam-ready.',
    metadataBase: new URL(isIB ? 'https://gradd.ai' : 'https://gradd.ie'),
    icons: ICONS,
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
      </body>
    </html>
  );
}