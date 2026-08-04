// app/go/page.tsx
// Post-auth resolver route. The one place that turns "an authenticated account" into
// "the surface it belongs on", using lib/entitlements. Vectors that can't resolve
// products themselves (proxy middleware — no DB reads there by design) redirect here
// instead of hardcoding a product surface like /dashboard, which fabricated LC data for
// non-LC accounts. This route only ever redirects — it renders nothing.

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { resolveIsIB } from '@/lib/site';
import { resolveProducts } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export default async function GoPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const host = (await headers()).get('host') ?? '';
  const isGraddAi = await resolveIsIB(host);

  // Not signed in → the host's public entry (gradd.ai = ACCA pillar at root, gradd.ie = LC
  // landing). Both are '/' now — gradd.ai's /acca would just redirect here a second time,
  // since it no longer serves anything to an anonymous visitor.
  if (!user) redirect('/');

  const { data: profile } = await supabase
    .from('profiles')
    .select('subject, subscription_status, student_name, ib_economics_level, ib_business_level, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const ent = resolveProducts(profile ?? {}, { isGraddAi });
  redirect(ent.home);
}
