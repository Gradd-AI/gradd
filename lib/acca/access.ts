// ── APM access predicate (single source of truth for new consumers) ────────────
// Access is granted on positive confirmation of an active subscription OR an
// unexpired 90-day pass. Pass expiry is evaluated at call time — there is no
// Stripe 'ended' event for a one-time pass, it simply lapses when
// apm_pass_expires_at passes. Extracted verbatim from the inlined copies in the
// tutor/access routes; those are left untouched for a later refactor.
export function hasActiveAPMAccess(profile: {
  apm_subscription_status?: string | null;
  apm_pass_expires_at?: string | null;
}): boolean {
  return (
    profile?.apm_subscription_status === 'active' ||
    (!!profile?.apm_pass_expires_at && new Date(profile.apm_pass_expires_at) > new Date())
  );
}
