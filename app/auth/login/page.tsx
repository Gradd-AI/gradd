import { headers } from 'next/headers';
import { resolveIsIB } from '@/lib/site';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const host = (await headers()).get('host') ?? '';
  const isIBDomain = await resolveIsIB(host);

  return <LoginForm isIBDomain={isIBDomain} />;
}
