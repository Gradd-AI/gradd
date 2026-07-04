import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// APM access gate. FAIL-CLOSED: any auth/DB/network error returns access:false.
// Access is granted ONLY on positive confirmation that the user has an active
// subscription OR an unexpired 90-day pass. Pass expiry is evaluated SERVER-SIDE
// on every call — there is no Stripe 'ended' event for a one-time pass, it simply
// lapses when apm_pass_expires_at passes.
export async function GET() {
  try {
    const authClient = await createServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ access: false });

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('apm_subscription_status, apm_pass_expires_at')
      .eq('id', user.id)
      .single();

    if (error || !profile) return NextResponse.json({ access: false });

    const access =
      profile.apm_subscription_status === 'active' ||
      (!!profile.apm_pass_expires_at &&
        new Date(profile.apm_pass_expires_at as string) > new Date());

    return NextResponse.json({ access });
  } catch {
    // Fail closed — never default to granting access on error.
    return NextResponse.json({ access: false });
  }
}
