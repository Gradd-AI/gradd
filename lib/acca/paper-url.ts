// lib/acca/paper-url.ts — THE PAPER AT A URL BOUNDARY, IN ONE PLACE.
//
// PURE. No I/O, no next/navigation, no `document` — callers hand in raw strings and get a
// string back, so the whole rule is fixturable (`npm run test:paper-url`) against the SAME
// input shape production builds.
//
// ── THE DEFECT THIS EXISTS TO CLOSE ─────────────────────────────────────────────────────
// The paper was carried by CONVENTION, not construction: ~17 link sites across ACCA's six
// independently-styled page headers each hand-built the same rule, in four different shapes
// (`paper === 'APM' ? bare : '?paper='` ternaries, always-explicit `?paper=${paper}`,
// hardcoded `?paper=AFM` literals, and one path-based per-paper surface). Every one of them
// typechecks whether or not it carries the paper, so the failure is silent and the fix does
// not generalise — patching one leaves its siblings. It had already cost a cross-paper
// content leak on the timed-mock link (fixed 2026-08-01) while the Exam-cases card three
// lines above it kept the identical bug.
//
// ── WHY BOTH DIRECTIONS LIVE IN ONE MODULE ──────────────────────────────────────────────
// `paperHref` WRITES the paper into a URL; `resolveSubscribePaper` READS one back out. They
// are the same rule seen from two ends, and the round-trip property (write AFM → read AFM)
// is the thing that actually has to hold. Splitting them across two files is how the two
// ends drift.

import { DEFAULT_PAPER, strictPaper, type AccaPaper } from './paper';

/**
 * Build a root-relative ACCA link that carries the paper.
 *
 * THE DEFAULT PAPER GETS NO PARAM — `paperHref('/acca', 'APM') === '/acca'`, byte-identical
 * to the bare string the 17 sites already produce. That is deliberate and load-bearing: it
 * makes this a drop-in for the existing ternaries rather than a change to every APM URL in
 * the product (which would invalidate links students have bookmarked, and every URL asserted
 * in every other fixture). It is also why `DEFAULT_PAPER` is a shared constant — this
 * function and `resolvePaper` are the two halves of one round trip.
 *
 * Existing query pairs are preserved BYTE-FOR-BYTE (no URLSearchParams round-trip, which
 * would re-encode `%20` as `+`), and any `paper=` already present is replaced rather than
 * appended to, so the function is idempotent: `paperHref(paperHref(p, x), y) === paperHref(p, y)`.
 *
 * ⚠️ NOT FOR EVERY LINK. Three categories legitimately stay bare, and passing them through
 * here would be WRONG, not merely redundant:
 *   1. CROSS-PRODUCT links — the Gradd wordmark → `/`. Paper is meaningless outside ACCA.
 *   2. ID-ADDRESSED links — `?drill_id=` / `/acca/cases/<id>`. A primary key is globally
 *      unique, so no paper filter applies (see paper.ts's header); adding one implies a
 *      scoping that does not exist and would be actively misleading.
 *   3. AUTH links — `/acca/auth?next=…`. The paper rides INSIDE the encoded `next=`, and
 *      adding a second copy outside it creates two sources of truth for one fact.
 * A per-paper SURFACE (`/acca/mock` vs `/acca/afm/mock`) is also out of scope — that is a
 * different path, not a parameterised one, and `ACCADashboard`'s `mockHref` stays a ternary.
 */
export function paperHref(path: string, paper: AccaPaper): string {
  const [base, rawQuery = ''] = path.split('?');
  const kept = rawQuery
    .split('&')
    .filter((pair) => pair !== '' && !/^paper=/i.test(pair));
  if (paper !== DEFAULT_PAPER) kept.push(`paper=${paper}`);
  return kept.length > 0 ? `${base}?${kept.join('&')}` : base;
}

/**
 * Which paper is a visitor on `/acca/subscribe` buying?
 *
 * ── THE DEFECT THIS EXISTS TO CLOSE ─────────────────────────────────────────────────────
 * The page's own `resolvePaperContext` compared the param against two literals and, on any
 * miss, fell through to a `document.referrer` regex. That conflated two different facts:
 *
 *   ABSENT      — no paper was named. A referrer heuristic is defensible: it is the only
 *                 signal there is, and guessing beats a blank page.
 *   UNPARSEABLE — a paper WAS named and it was malformed. The heuristic must never run,
 *                 because the referrer can contradict the stated intent.
 *
 * Live consequence: `?paper=APM%20subscribe` — which plainly names APM — missed both
 * literals, fell to the heuristic, and sold AFM to anyone arriving from an AFM page. A
 * malformed request that names a paper is a REFUSAL (null → the page's visible, switchable
 * default), never a guess from a different signal.
 *
 * An EMPTY value (`?paper=`) counts as ABSENT, not unparseable: nothing was named, so there
 * is no stated intent for the heuristic to contradict.
 *
 * @param param    Raw `searchParams.get('paper')` — `string | null`, exactly as the browser
 *                 hands it over. `null` means the key was not present at all.
 * @param referrer Raw `document.referrer` (a full URL, or '' when the browser withholds it —
 *                 which is common under privacy settings and is why this is a fallback and
 *                 never the primary signal).
 * @returns The paper, or null when nothing trustworthy said. Callers must render a VISIBLE,
 *          changeable default on null — never apply one silently.
 */
export function resolveSubscribePaper(
  param: string | null,
  referrer: string | null,
): AccaPaper | null {
  const named = strictPaper(param);
  if (named) return named;

  // Present and non-empty, but not a paper → something was stated and it was wrong. Refuse.
  // This is the whole fix: `strictPaper` alone returns null for absent AND unparseable, so
  // swapping the parser without this branch would leave the heuristic reachable.
  if (param !== null && param.trim() !== '') return null;

  // Nothing was named. The referrer is the only signal left.
  if (typeof referrer === 'string' && /(?:paper=afm|\/acca\/afm|\/afm)/i.test(referrer)) {
    return 'AFM';
  }
  return null;
}
