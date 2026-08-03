// ── ACCA access predicate ─────────────────────────────────────────────────────
// PER-PAPER as of 2026-08-03 (Grant's pricing ruling). APM and AFM are sold separately —
// €99 sitting-dated pass and €49/month, each paper its own SKU. Bundle-wide access ENDS.
//
// ── WHAT REPLACED WHAT, AND WHY THE OLD ALIAS IS GONE ────────────────────────
// This module used to export exactly one predicate under two names:
//
//     export const hasActiveAPMAccess = hasActiveACCAAccess;   // the SAME function object
//
// Eleven call sites imported the "APM" name and nine the "ACCA" name, and they behaved
// identically because they WERE identical. That alias is DELETED rather than re-pointed:
// a per-paper split whose two names still resolve to one function is a split in the
// documentation only, and the next reader would reasonably assume the "APM" name checks
// APM. Deleting it makes every call site a compile error until it has been given a paper,
// which is the point — there is no way to half-migrate this.
//
// `hasActiveACCAAccess` SURVIVES, with its meaning narrowed and stated: it is now the
// LEGACY BUNDLE predicate over the pre-split `profiles` columns, and it is the fallback
// arm of the dual-read below. It is not an authorisation decision on its own any more.
//
// ── GRANDFATHERING IS DATA, NOT A BRANCH ─────────────────────────────────────
// The three existing holders are manual comps (no customer has ever paid for ACCA). They
// are backfilled by migration into `acca_entitlements` with a row PER PAPER, so they keep
// both papers for the life of their entitlement without a single `if` here. There is no
// legacy-bundle tier and no bundle flag. When those rows expire, the concept is gone.

import type { AccaPaper } from '@/lib/acca/paper';

/** The pre-split columns. Retained because the dual-read falls back to them. */
export interface LegacyEntitlementProfile {
  apm_subscription_status?: string | null;
  apm_pass_expires_at?: string | null;
}

/**
 * The LEGACY BUNDLE predicate — true when the pre-split `profiles` columns grant access.
 *
 * Paper-blind BY DEFINITION: these columns predate per-paper pricing and were sold as a
 * bundle, so when they are the only evidence available they grant EVERY paper. That is not
 * a bug to be fixed later; it is the correct reading of what those rows mean, and it is
 * exactly what makes the fallback arm safe during the transition.
 *
 * Pass expiry is evaluated at call time — there is no Stripe 'ended' event for a one-time
 * pass, it simply lapses when the date passes.
 */
export function hasActiveACCAAccess(profile: LegacyEntitlementProfile | null | undefined): boolean {
  return (
    profile?.apm_subscription_status === 'active' ||
    (!!profile?.apm_pass_expires_at && new Date(profile.apm_pass_expires_at) > new Date())
  );
}

/** Minimal structural client surface, so this module never imports a server-only factory. */
type Queryable = { from: (table: string) => any };   // eslint-disable-line @typescript-eslint/no-explicit-any

/** One `acca_entitlements` row, as the predicate reads it. */
interface EntitlementRow {
  kind: string | null;
  expires_at: string | null;
  subscription_status: string | null;
}

/** True when a single entitlement row is live right now. */
export function entitlementIsActive(row: EntitlementRow, nowMs: number): boolean {
  if (row.subscription_status === 'active') return true;
  return !!row.expires_at && new Date(row.expires_at).getTime() > nowMs;
}

/**
 * Does this user hold THIS paper, right now?
 *
 * ── THE PAPER IS EXPLICIT AND THERE IS NO DEFAULT ───────────────────────────
 * `paper: AccaPaper` is a required argument with no fallback, so a caller that does not
 * know the paper cannot compile. Use `strictPaper()` (lib/acca/paper.ts) at the boundary
 * and REFUSE on null — never `resolvePaper()`, whose 'APM' default would answer "does this
 * user hold APM?" for a request that named no paper, granting an APM holder anything they
 * reached. `lib/acca/sit-attempt.ts` banked this same lesson when a defaulted paper turned
 * into a cross-paper content leak.
 *
 * ── DUAL-READ, TABLE FIRST, LEGACY FALLBACK ─────────────────────────────────
 * 1. Read `acca_entitlements` for (user, paper). ANY active row → granted.
 * 2. A row exists but none is active → DENIED. The table is authoritative once it has
 *    spoken about this paper; falling back here would let an expired per-paper row be
 *    rescued by a legacy bundle column, which is precisely the grandfathering-as-a-branch
 *    that the ruling forbids.
 * 3. NO rows at all for this user+paper (or the table is not there yet) → fall back to the
 *    legacy bundle columns.
 *
 * Step 3 is what makes this shippable BEFORE the migration runs. Until the table exists the
 * query errors, `rows` is null, and every caller resolves exactly as it does today. After
 * the backfill the three comp holders have rows for both papers and resolve identically —
 * which is the property to verify before anything stops reading the legacy columns.
 *
 * `legacyProfile` is passed in rather than re-fetched: every caller has already selected the
 * profile row for its own reasons, and a second read per request would be pure waste.
 */
export async function hasPaperAccess(
  supabase: Queryable,
  userId: string,
  paper: AccaPaper,
  legacyProfile?: LegacyEntitlementProfile | null,
): Promise<boolean> {
  if (!userId) return false;

  let rows: EntitlementRow[] | null = null;
  try {
    const { data, error } = await supabase
      .from('acca_entitlements')
      .select('kind, expires_at, subscription_status')
      .eq('user_id', userId)
      .eq('paper_code', paper);
    // A missing table (pre-migration) or any query failure leaves `rows` null → fall through
    // to the legacy arm. FAIL-OPEN TO LEGACY, not fail-open to granted: the fallback is
    // itself a real check, so a broken table read cannot grant access to someone who never
    // had it.
    if (!error && Array.isArray(data)) rows = data as EntitlementRow[];
  } catch {
    rows = null;
  }

  if (rows && rows.length > 0) {
    const now = Date.now();
    return rows.some((r) => entitlementIsActive(r, now));
  }

  return hasActiveACCAAccess(legacyProfile ?? null);
}

// `hasActiveAPMAccess` is DELETED. See the header: it was the same function object as
// `hasActiveACCAAccess`, and keeping it — even re-pointed — would leave a name that reads
// as paper-specific while behaving otherwise. Every former call site now calls
// `hasPaperAccess` with an explicit paper.
