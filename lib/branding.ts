import { headers } from 'next/headers';
import { resolveIsIB } from './site';

export async function getBrand() {
  const host = (await headers()).get('host') ?? '';
  const isIB = await resolveIsIB(host);
  return {
    isIB,
    logoSrc: isIB ? '/gradd-ai-logo.png' : '/gradd-logo.svg',
    logoHeight: 34,
    altText: 'Gradd',
  };
}
