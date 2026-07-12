// ── ACCA access predicate (single source of truth) ─────────────────────────────
// Access is by ENTITLEMENT under the BUNDLE model (ruled 2026-07-12): ONE ACCA
// entitlement covers ALL papers (APM + AFM). The apm_subscription_status /
// apm_pass_expires_at columns are the de-facto ACCA access flag — they are NOT
// re-scoped to APM, and there is NO per-paper entitlement column (no migration).
// Access is granted on positive confirmation of an active subscription OR an
// unexpired 90-day pass. Pass expiry is evaluated at call time — there is no Stripe
// 'ended' event for a one-time pass, it simply lapses when apm_pass_expires_at passes.
export function hasActiveACCAAccess(profile: {
  apm_subscription_status?: string | null;
  apm_pass_expires_at?: string | null;
}): boolean {
  return (
    profile?.apm_subscription_status === 'active' ||
    (!!profile?.apm_pass_expires_at && new Date(profile.apm_pass_expires_at) > new Date())
  );
}

/**
 * @deprecated Use hasActiveACCAAccess. Access is bundle-wide (all ACCA papers), not
 * APM-specific — an active subscriber/pass unlocks AFM too. Retained as an alias so
 * existing imports keep working; new call sites should use hasActiveACCAAccess.
 */
export const hasActiveAPMAccess = hasActiveACCAAccess;
