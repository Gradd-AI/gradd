import { headers } from 'next/headers';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const host = (await headers()).get('host') ?? '';
  const isIBDomain = host.includes('gradd.ai');

  return <LoginForm isIBDomain={isIBDomain} />;
}
