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
  /** Selected so the paper match happens in code — see hasPaperAccess's header. */
  paper_code: string | null;
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
 * ── DUAL-READ: THE FALLBACK IS KEYED ON THE USER, NEVER ON (USER, PAPER) ────
 * 1. Read EVERY `acca_entitlements` row for this USER — deliberately NOT filtered by paper.
 * 2. The user has at least one row → the table is AUTHORITATIVE for this user. Grant only
 *    if one of THIS paper's rows is active. No legacy fallback, in either direction.
 * 3. The user has NO rows at all (or the table is not there yet) → fall back to the legacy
 *    bundle columns.
 *
 * ⚠️ WHY THE QUERY IS NOT FILTERED BY PAPER — THIS WAS A LIVE LEAK ───────────
 * It used to be `.eq('user_id', …).eq('paper_code', paper)`, with step 3 reached whenever
 * THAT query came back empty. The header called this "NO rows at all for this user+paper"
 * and reasoned it was pre-migration safety. It was not: a single-paper holder has zero rows
 * for the OTHER paper BY CONSTRUCTION, so the other paper always fell through to
 * `hasActiveACCAAccess` — which is paper-blind, and which the webhook sets on EVERY ACCA
 * purchase (it writes `profiles.apm_pass_expires_at` unconditionally, with no paper
 * attached). Net: buy APM, get AFM free, and vice versa.
 *
 * PROVEN END-TO-END 2026-08-09 against an APM-only account (`perpaper-test@gradd.ai`), one
 * field the only variable. With the legacy column null, AFM refused everywhere: access
 * false, `case/list` locked, `sit?paper=AFM` 402. Setting `apm_pass_expires_at` to the
 * webhook's own `now + 90d` flipped every one of them — `sit?paper=AFM` served AFM Mock
 * Paper 1 to an account with no AFM entitlement. See `scripts/probe-paper-access.ts`; the
 * regression lock is `scripts/test-paper-access.ts`, which is in the contract gate.
 *
 * Keying on the USER preserves the pre-migration safety that was actually intended — a user
 * the table has never heard of still resolves on the legacy columns — while making the table
 * authoritative the moment it says anything about them.
 *
 * ⚠️ `revoked_at` IS STILL NOT READ by `entitlementIsActive` (pre-existing, unchanged here).
 * A revoked row now also suppresses the legacy fallback, which is the correct direction, but
 * a revoked-yet-unexpired row would still grant. Out of scope for this fix; flagged, not fixed.
 *
 * ⚠️ CALLERS MUST PASS A CLIENT THAT CAN ACTUALLY SEE THE TABLE. `acca_entitlements` has RLS
 * enabled with NO policies (service-role only, by the migration's design), so a SESSION
 * client reads zero rows with NO error — indistinguishable here from "this user has no
 * entitlements", which sends every real holder down the legacy arm. Pass a service client.
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
    // EVERY row for this user, across ALL papers. The paper filter moved into the code
    // below so that "this user has entitlements" and "this user has THIS paper" stay two
    // distinct facts — collapsing them is what leaked. See the header.
    const { data, error } = await supabase
      .from('acca_entitlements')
      .select('paper_code, kind, expires_at, subscription_status')
      .eq('user_id', userId);
    // A missing table (pre-migration) or any query failure leaves `rows` null → fall through
    // to the legacy arm. FAIL-OPEN TO LEGACY, not fail-open to granted: the fallback is
    // itself a real check, so a broken table read cannot grant access to someone who never
    // had it.
    if (!error && Array.isArray(data)) rows = data as EntitlementRow[];
  } catch {
    rows = null;
  }

  // The table has spoken about this USER → it is authoritative, and only THIS paper's rows
  // can grant. A user with rows for other papers and none for this one is DENIED here; that
  // is the whole point, and the legacy arm is deliberately unreachable from this branch.
  if (rows && rows.length > 0) {
    const now = Date.now();
    return rows.some((r) => r.paper_code === paper && entitlementIsActive(r, now));
  }

  return hasActiveACCAAccess(legacyProfile ?? null);
}

// `hasActiveAPMAccess` is DELETED. See the header: it was the same function object as
// `hasActiveACCAAccess`, and keeping it — even re-pointed — would leave a name that reads
// as paper-specific while behaving otherwise. Every former call site now calls
// `hasPaperAccess` with an explicit paper.
