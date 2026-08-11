import { redirect } from 'next/navigation';
import { resolvePaper } from '@/lib/acca/paper';
import { paperHref } from '@/lib/acca/paper-url';

// Legacy entry point: `/acca/drill?lo=` redirects into the tutor.
//
// ⚠️ IT USED TO DROP `?paper=` ON THE FLOOR, and that was not cosmetic. AFM and APM LO codes
// collide EXACTLY (lib/acca/paper.ts), so the tutor's `resolvePaper` default meant
// `/acca/drill?lo=B1c&paper=AFM` served APM's B1c — silently, with the URL still saying AFM.
// There was no way to reach an AFM drill through this route at all. The paper is forwarded
// through `paperHref` so this shim carries exactly what every other link carries.
export default async function ACCADrillPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const lo = typeof params.lo === 'string' ? params.lo : 'B1c';
  const paper = resolvePaper(typeof params.paper === 'string' ? params.paper : undefined);
  redirect(paperHref(`/acca/tutor?lo=${encodeURIComponent(lo)}`, paper));
}
