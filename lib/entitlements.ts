// lib/entitlements.ts
// Single source of truth for "what product(s) does this account actually hold, and
// where does it belong". Replaces the scattered `profile.subject ?? 'LC_BUSINESS'` and
// subscription-based redirects that fabricated an LC identity for any account.
//
// The defect this closes is one-directional: /dashboard inferred product from
// profiles.subject, whose DB DEFAULT is 'LC_BUSINESS' — so "no LC enrolment" was
// indistinguishable from "LC Business student". This resolver reads REAL signals only
// and never treats the bare defaulted subject as proof of LC enrolment.
//
// Phase-1 note (banked debt): subject keeps its 'LC_BUSINESS' default (no migration this
// pass). The discrimination therefore lives HERE, not in the schema.

import { hasActiveAPMAccess } from '@/lib/acca/access';

export type Product = 'LC' | 'IB' | 'APM';

export interface ProfileSignals {
  subject?: string | null;
  subscription_status?: string | null;
  student_name?: string | null;
  ib_economics_level?: string | null;
  ib_business_level?: string | null;
  apm_subscription_status?: string | null;
  apm_pass_expires_at?: string | null;
}

export interface ResolveContext {
  /** Is this the gradd.ai host? (from resolveIsIB) — decides the no-product home only. */
  isGraddAi: boolean;
  /** Optional genuine LC/IB learning footprint (real sessions/progress) the caller
   *  already has. Protects a name-less-but-active LC student from being read as non-LC.
   *  Absent → profile signals alone decide. */
  lcIbFootprint?: boolean;
}

export interface Entitlements {
  products: Set<Product>;
  /** Where this account belongs if it lands somewhere it doesn't. */
  home: string;
}

const IB_SUBJECTS = new Set(['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE']);

// subscription_status values that evidence a REAL LC/IB billing relationship (past or
// present). 'inactive'/null/'incomplete*' are the never-really-subscribed defaults and
// must NOT, on their own, count as LC/IB enrolment.
const REAL_SUBSCRIPTION = new Set(['active', 'trialing', 'past_due', 'canceled', 'unpaid']);

export function resolveProducts(profile: ProfileSignals, ctx: ResolveContext): Entitlements {
  const products = new Set<Product>();

  const subject = profile.subject ?? null;
  const isIBSubject = subject != null && IB_SUBJECTS.has(subject);
  const hasIBLevels = !!(profile.ib_economics_level || profile.ib_business_level);
  const subscriptionReal = !!profile.subscription_status && REAL_SUBSCRIPTION.has(profile.subscription_status);
  const nameSet = !!(profile.student_name && profile.student_name.trim());
  const footprint = ctx.lcIbFootprint === true;

  // IB — an explicit IB subject or IB level is genuine on its own (never the default).
  if (isIBSubject || hasIBLevels) products.add('IB');

  // LC/IB via a REAL relationship or footprint — NOT the bare defaulted subject. A real
  // subscription, a captured student name, or an actual learning footprint each count.
  // This is what separates a genuine (even free) LC/IB student from an APM account whose
  // subject is only the DB default 'LC_BUSINESS'.
  if (subscriptionReal || nameSet || footprint) {
    if (isIBSubject || hasIBLevels) products.add('IB');
    else products.add('LC');
  }

  // APM — active sub or unexpired pass (same predicate cases/mock/progress use).
  if (hasActiveAPMAccess(profile)) products.add('APM');

  // Home: LC/IB holders → the LC/IB dashboard; APM-only → the APM home; no products →
  // the host's free-funnel entry (gradd.ai = /acca, gradd.ie = /). Never /dashboard for a
  // non-LC/IB account, so the /dashboard guard can redirect here without looping.
  let home: string;
  if (products.has('LC') || products.has('IB')) home = '/dashboard';
  else if (products.has('APM')) home = '/acca';
  else home = ctx.isGraddAi ? '/acca' : '/';

  return { products, home };
}

/** True when the account holds at least one of the given products. */
export function holdsAny(ent: Entitlements, ...products: Product[]): boolean {
  return products.some((p) => ent.products.has(p));
}
