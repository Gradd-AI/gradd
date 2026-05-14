import { headers } from 'next/headers';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const host = (await headers()).get('host') ?? '';
  const isIBDomain = host.includes('gradd.ai');
  const logoSrc = isIBDomain ? '/gradd-ai-logo.png' : '/gradd-logo.svg';

  return <LoginForm logoSrc={logoSrc} isIBDomain={isIBDomain} />;
}
