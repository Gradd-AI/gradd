import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { recordAuthFailure } from '@/lib/acca/error-recorder';
import { NextResponse } from 'next/server';
import { hasPaperAccess } from '@/lib/acca/access';
import { strictPaper } from '@/lib/acca/paper';

// ACCA access gate — PER PAPER as of 2026-08-03. FAIL-CLOSED: any auth/DB/network error
// returns access:false.
//
// ── WHY THIS FILE WAS FIXED FIRST ────────────────────────────────────────────
// It used to RE-IMPLEMENT the predicate inline:
//
//     const access = profile.apm_subscription_status === 'active' ||
//       (!!profile.apm_pass_expires_at && new Date(profile.apm_pass_expires_at) > new Date());
//
// Identical in behaviour to lib/acca/access.ts, and therefore invisible as a duplicate —
// until the shared predicate changed. A per-paper migration that edited only the lib would
// have left THIS route answering the bundle question, and this route is what
// app/acca/subscribe/page.tsx reads to decide whether to show the paywall. The most
// commercially visible surface would have been the last thing still selling the old model.
// It now imports the one predicate, like every other caller.
//
// ── THE PAPER IS REQUIRED, NOT DEFAULTED ─────────────────────────────────────
// `?paper=APM|AFM`, parsed with `strictPaper` (no default). Absent or unrecognised → 400,
// never a guess. `resolvePaper()` would have answered 'APM' for a bare call, which is the
// exact shape this change exists to prevent: a bare GET would report access:true for an
// APM-only holder and the caller would read it as "has ACCA access".
export async function GET(request: Request): Promise<Response> {
  try {
    const paper = strictPaper(new URL(request.url).searchParams.get('paper'));
    if (!paper) {
      return NextResponse.json(
        { access: false, error: 'paper query parameter is required (APM or AFM)' },
        { status: 400 },
      );
    }

    const authClient = await createServerClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    // An OUTAGE records; a logged-out request does not. `recordAuthFailure` owns that
    // distinction (`isAuthOutage`) — an unfiltered version would write a row on every
    // anonymous hit, because no session is itself an AuthSessionMissingError.
    if (authError) await recordAuthFailure('api/acca/access', authError);
    if (!user) return NextResponse.json({ access: false, paper });

    const supabase = createServiceClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('apm_subscription_status, apm_pass_expires_at')
      .eq('id', user.id)
      .single();

    if (error || !profile) return NextResponse.json({ access: false, paper });

    // Dual-read: acca_entitlements first, legacy bundle columns as the fallback arm.
    const access = await hasPaperAccess(supabase, user.id, paper, profile);
    return NextResponse.json({ access, paper });
  } catch {
    // Fail closed — never default to granting access on error.
    return NextResponse.json({ access: false });
  }
}
