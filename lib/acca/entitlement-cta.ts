// lib/acca/entitlement-cta.ts — entitlement-aware CTA resolution for the PUBLIC paper
// landing pages (/acca/apm, /acca/afm).
//
// ── THE CACHING OBJECTION DOES NOT HOLD, AND THAT IS WHY THIS IS SAFE TO ADD ────────────
// app/layout.tsx's `headers()` call for host detection already forces every route in this
// app dynamic — confirmed live: /acca/apm serves `Cache-Control: private, no-cache,
// no-store, max-age=0, must-revalidate` today, with zero AFM/APM-specific code involved.
// There is no shared/CDN cache on these pages to lose. What this DOES add is a real
// per-request DB round-trip for signed-in visitors (never for anonymous — see below).
//
// ── DEFENSIVE BY CONTRACT, NOT BY CONVENTION ─────────────────────────────────────────
// This function must NEVER throw and NEVER redirect. It resolves a call-to-action on a
// public marketing page; the worst acceptable failure is "a signed-in visitor sees the
// generic anonymous CTA," never a broken page. Every exit path that isn't a clean,
// positive "yes, entitled" answer returns the SAME shape a real anonymous visitor gets.
import type { AccaPaper } from './paper';
import { hasPaperAccess, type LegacyEntitlementProfile } from './access';

export type EntitlementCtaState = 'anonymous' | 'entitled_other' | 'entitled_this' | 'signed_in_no_entitlement';

export interface EntitlementCta {
  state: EntitlementCtaState;
  label: string;
  href: string;
}

interface AuthClient {
  auth: { getUser(): Promise<{ data: { user: { id: string } | null } }> };
}
// Structural, not the real Supabase type — matches hasPaperAccess's own `Queryable` shape
// so this module never has to import a server-only client factory.
type Queryable = { from: (table: string) => any };   // eslint-disable-line @typescript-eslint/no-explicit-any

export async function resolveEntitlementCta(params: {
  authClient: AuthClient;
  dbClient: Queryable;
  thisPaper: AccaPaper;
  otherPaper: AccaPaper;
  /** The page's own existing CTA — what an anonymous visitor already sees today. */
  anonymous: { label: string; href: string };
  /** e.g. "Add AFM for your sitting" — shown only when entitled to the OTHER paper. */
  entitledOtherLabel: string;
  /** Where "Go to your dashboard" / the entitled-other CTA should land — an already-authed
   *  destination, never routed back through /acca/auth. */
  dashboardHref: string;
}): Promise<EntitlementCta> {
  try {
    const { data: { user } } = await params.authClient.auth.getUser();
    if (!user) {
      return { state: 'anonymous', ...params.anonymous };
    }

    const { data: profileRow } = await params.dbClient
      .from('profiles')
      .select('apm_subscription_status, apm_pass_expires_at')
      .eq('id', user.id)
      .single();
    const legacyProfile: LegacyEntitlementProfile | null = profileRow ?? null;

    const [hasThis, hasOther] = await Promise.all([
      hasPaperAccess(params.dbClient, user.id, params.thisPaper, legacyProfile),
      hasPaperAccess(params.dbClient, user.id, params.otherPaper, legacyProfile),
    ]);

    if (hasThis) {
      return { state: 'entitled_this', label: 'Go to your dashboard', href: params.dashboardHref };
    }
    if (hasOther) {
      return { state: 'entitled_other', label: params.entitledOtherLabel, href: params.dashboardHref };
    }
    // Signed in, but no entitlement to either paper: the anonymous COPY is still true
    // (this paper's paid tier genuinely hasn't started), but auth is already done, so the
    // link skips /acca/auth and goes straight to the free experience.
    return { state: 'signed_in_no_entitlement', label: params.anonymous.label, href: params.dashboardHref };
  } catch {
    return { state: 'anonymous', ...params.anonymous };
  }
}
