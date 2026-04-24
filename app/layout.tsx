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
        <footer
          style={{
            borderTop: '1px solid #E0E0D8',
            background: '#FAFAF7',
            padding: '24px 32px',
            textAlign: 'center',
            fontFamily: 'var(--font-body), sans-serif',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: '#888880',
              margin: '0 0 8px 0',
            }}
          >
            © {new Date().getFullYear()} Gradd. All rights reserved.
          </p>
          <p style={{ fontSize: '13px', color: '#888880', margin: 0 }}>
            <a href="/terms" style={{ color: '#1B3D2F', textDecoration: 'underline', marginRight: '16px' }}>
              Terms of Service
            </a>
            <a href="/privacy" style={{ color: '#1B3D2F', textDecoration: 'underline', marginRight: '16px' }}>
              Privacy Policy
            </a>
            <a href="/cookies" style={{ color: '#1B3D2F', textDecoration: 'underline' }}>
              Cookie Policy
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
