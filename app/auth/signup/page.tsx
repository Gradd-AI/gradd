import { headers } from 'next/headers';
import LCSignupForm from './lc-form';
import IBSignupPage from './ib/page';

export default async function SignupPage() {
  const host = (await headers()).get('host') ?? '';
  const isIB = host.includes('gradd.ai');

  return isIB ? <IBSignupPage /> : <LCSignupForm />;
}
