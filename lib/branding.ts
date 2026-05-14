import { headers } from 'next/headers';

export async function getBrand() {
  const host = (await headers()).get('host') ?? '';
  const isIB = host.includes('gradd.ai');
  return {
    isIB,
    logoSrc: isIB ? '/gradd-ai-logo.png' : '/gradd-logo.svg',
    logoHeight: 34,
    altText: 'Gradd',
  };
}
