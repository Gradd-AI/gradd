// lib/acca/teach-access.ts — WHAT THE FREE TIER BUYS, as one pure decision.
//
// ⚠️ THIS MODULE EXISTS BECAUSE ONE NUMBER CARRIED TWO MEANINGS AND THE PRODUCT SHIPPED THE
// WRONG ONE. `profiles.apm_teach_throughs_used` counts TEACH-THROUGHS DELIVERED — it is
// incremented only when a coaching leg actually ran (tutor route §8, guarded on
// `teachThroughDelivered`). That counter was correct. The GATE then used it to refuse the
// ATTEMPT: `allowed = hasActiveAccess || usedCount < 3 || isFreeFollowUp`, else 403 `cap_hit`,
// before the student could submit anything at all. So a free student past three teach-throughs
// could not attempt a fourth drill — the drill rendered, and the textarea was replaced by a
// paywall.
//
// The offer has always said something different, on the pillar, both spokes and every pricing
// card: "Every drill on both papers, unlimited, PLUS three full teach-throughs with Ezra."
// Unlimited ACCESS, of which three are COACHED. Two things, and the code had only one.
//
// ── THE RULING (Grant, 2026-08-22) ──────────────────────────────────────────────
// Past three teach-throughs, a free user may attempt ANY drill and receives the DIAGNOSIS —
// the gap named — then the upgrade prompt. No coaching turns, no struggle-reveal.
// "Three full teach-throughs" means the full COACHED LOOP, not the attempt.
//
// ── WHY TWO FIELDS AND NOT A BOOLEAN ───────────────────────────────────────────
// `attemptAllowed` is a constant `true` and that is deliberate, not dead code. The defect was
// precisely that "may they attempt?" was never a separate question — it was answered by
// accident, by a counter that meant something else. A named field that is always true is a
// PROPERTY the fixtures can assert (and they do, across the whole input space). A comment
// saying "we never refuse attempts" is not checkable; this is.
//
// Pure: no DB, no env, no model. Fixtures: scripts/test-teach-access.ts.

/** Free coached teach-throughs, PER PAPER (the counters are per-paper: apm_/afm_). */
export const FREE_TEACH_THROUGHS = 3;

export interface TeachAccessInput {
  /** Active subscription or unexpired pass FOR THE DRILL'S OWN PAPER (hasPaperAccess). */
  hasActiveAccess: boolean;
  /** This paper's counter off `profiles`. Negative/NaN is treated as 0 — see below. */
  teachThroughsUsed: number;
  /**
   * This drill already consumed a slot, so further turns on IT are free. Sealed inside the
   * AES-256-GCM payload (and OR'd with `acca_tutor_progress.counted`), never client-supplied.
   */
  isFreeFollowUp: boolean;
}

export interface TeachAccess {
  /**
   * May the student submit an attempt and be diagnosed? ALWAYS TRUE. Attempting is not
   * metered — that is the whole ruling. Nothing may 403 a free student off a drill.
   */
  attemptAllowed: true;
  /** May a COACHING leg run (call3_teach — the full worked walk-through)? */
  coachingAllowed: boolean;
  /** Convenience inverse of coachingAllowed: the upgrade prompt rides on this. */
  capped: boolean;
}

/**
 * ONE decision, both meanings separated.
 *
 * A paid user, a user below the free limit, and a user continuing a drill that already
 * consumed a slot all get coaching. Everyone else attempts and is diagnosed, and is told
 * what coaching would add.
 */
export function teachAccessFor(input: TeachAccessInput): TeachAccess {
  // A non-finite or negative counter must never READ as "under the limit" by arithmetic
  // accident, and must never read as capped either. Clamp to a real count first.
  const used = Number.isFinite(input.teachThroughsUsed) ? Math.max(0, Math.trunc(input.teachThroughsUsed)) : 0;

  const coachingAllowed =
    input.hasActiveAccess ||
    used < FREE_TEACH_THROUGHS ||
    input.isFreeFollowUp;

  return { attemptAllowed: true, coachingAllowed, capped: !coachingAllowed };
}

/**
 * The upgrade prompt, appended by CODE after the diagnosis — never instructed inside a prompt.
 *
 * Same reasoning as `revealOfferLine` (lib/acca/phrase-match.ts), and it is not a style
 * preference: an instructed closing line competes with WRAP_UP under a token cap, and
 * `finishClean` trims from the END, so the instructed version is structurally the first thing
 * sacrificed. A student who is never told what coaching adds has not been sold to badly — they
 * have not been sold to at all.
 *
 * Register is the diagnosis's own: it names what they just received and what the paid loop adds
 * on top. It does NOT withhold-and-tease — the gap has already been named for free, above.
 */
export function upgradeAfterDiagnosisLine(subscribeHref: string): string {
  return (
    `\n\n---\n\nThat's the gap named. You've used your ${FREE_TEACH_THROUGHS} free teach-throughs, ` +
    `so I've stopped short of walking you through the fix on this one — ` +
    `[unlock full coaching](${subscribeHref}) and I'll build the answer with you, step by step.`
  );
}
