import { getBrand } from '@/lib/branding';
import Link from 'next/link';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const brand = await getBrand();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '28px 24px 0', display: 'flex', justifyContent: 'center' }}>
        <Link href="/">
          <img
            src={brand.logoSrc}
            alt={brand.altText}
            style={{ display: 'block', height: `${brand.logoHeight}px`, width: 'auto' }}
          />
        </Link>
      </header>
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 24px 40px' }}>
        {children}
      </main>
    </div>
  );
}
