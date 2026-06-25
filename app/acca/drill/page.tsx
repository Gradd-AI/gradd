import { redirect } from 'next/navigation';

export default async function APMDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const lo = typeof params.lo === 'string' ? params.lo : 'B1c';
  redirect(`/acca/tutor?lo=${encodeURIComponent(lo)}`);
}
