import { headers } from 'next/headers';
import { resolveIsIB } from '@/lib/site';
import LCSignupForm from './lc-form';
import IBSignupPage from './ib/page';

export default async function SignupPage() {
  const host = (await headers()).get('host') ?? '';
  const isIB = await resolveIsIB(host);

  return isIB ? <IBSignupPage /> : <LCSignupForm />;
}
