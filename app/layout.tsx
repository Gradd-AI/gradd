import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'Gradd — Your LC Business Tutor',
  description:
    'Full Leaving Certificate Business curriculum delivered by AI. Study at your own pace, from scratch to exam-ready.',
  metadataBase: new URL('https://gradd.ie'),
  icons: {
    icon: [
      { url: '/gradd-icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/gradd-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/gradd-icon.svg',
  },
};

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