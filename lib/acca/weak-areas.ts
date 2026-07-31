// lib/acca/weak-areas.ts
// PURE weakness-ledger rules + the drill-selection boost they feed. No DB, no model, no
// I/O — the writers (app/api/acca/case/mark, via lib/acca/case-mark-run.ts) and the reader
// (app/api/acca/next-drill) both import these so "what counts as a weakness" and "how much
// does a weakness move the pick" are decided in ONE place and fixtured without a database.
//
// ── WHICH BANDS RECORD A WEAKNESS: weak | competent, and NOT 'nothing' ───────
// Ruled 2026-07-31. The five technical bands are exemplary / strong / competent / weak /
// nothing, and it is tempting to read "nothing is worse than weak, so it must record".
// It must not, and the reason is what the band MEANS:
//
//   • 'nothing' is what a BLANK or near-blank answer scores, short-circuited with no model
//     call at all (case-marking.ts's isBlankAnswer). A requirement the candidate never
//     reached, or moved past on purpose because the clock ran out, is a PACING finding —
//     lib/acca/pacing.ts states it as one — and it is NOT evidence about the syllabus area.
//     Recording it as an LO weakness would steer a student's practice on the strength of
//     something they never attempted.
//   • 'weak' and 'competent' are model judgements of WRITTEN WORK against the code-correct
//     model answer. Those are evidence.
//
// The consequence is deliberate and worth stating plainly: a candidate who leaves a
// requirement blank generates no ledger row for that area. The debrief still reports it
// (verdict 'not_reached', with its own next action), so nothing is hidden — it is simply
// not laundered into a claim about what they know.
//
// ── WHAT A LEDGER ROW SCORES ─────────────────────────────────────────────────
// A weakness pulls the next drill TOWARDS the area, it does not pin it there. The score is
// bounded (0…2) so no single ledger row can dominate a scorer whose other terms are 1–3.
//
// ── ZERO-SIGNAL IS AN EXACT ROLLBACK ─────────────────────────────────────────
// With an empty ledger every candidate scores 0, so `pickWeighted` returns a uniform random
// choice over the whole pool — byte-for-byte the behaviour the live area=/lo= paths had
// before steering existed. That property is fixtured, because it is what makes turning this
// on safe for every student who has never sat a mock.

import type { TechnicalBand } from '@/lib/acca/case-marking';

// ── Which bands write a row ──────────────────────────────────────────────────
export const WEAKNESS_BANDS = ['weak', 'competent'] as const;
export type WeaknessBand = (typeof WEAKNESS_BANDS)[number];

export function shouldRecordWeakness(band: string | null | undefined): band is WeaknessBand {
  return typeof band === 'string' && (WEAKNESS_BANDS as readonly string[]).includes(band);
}

/** The ledger row as the selector reads it. `source` is carried so a future rule can weigh
 *  a sit differently from a drill miss; today both score the same and the field is only
 *  read for provenance. */
export interface WeakAreaRow {
  lo_code: string;
  band: string;
  occurrence_count: number;
  source?: string;
}

// A weak band is twice the pull of a competent one: 'competent' means the approach was
// right and a material point was missed, 'weak' means the method itself needs re-working.
const BAND_PULL: Record<string, number> = { weak: 1, competent: 0.5 };

// Repeat findings escalate, but not without bound — three sightings of the same area is
// already a strong signal and a tenth should not let one LO monopolise every serve.
const OCCURRENCE_STEP = 0.5;
const OCCURRENCE_CAP = 2;

// An exact LO match is the real signal; a sibling LO in the same sub-area (the 2-character
// prefix, e.g. E3a → E3) is related practice and gets half. Anything further away is 0 —
// "you were weak in E3" says nothing about B1.
const SUB_AREA_PULL = 0.5;

export const MAX_WEAKNESS_SCORE = BAND_PULL.weak * OCCURRENCE_CAP;   // 2

const subArea = (lo: string): string => (lo ?? '').slice(0, 2).toUpperCase();

/**
 * How strongly does the open ledger pull towards this LO? 0 when nothing matches.
 *
 * Takes the MAXIMUM over matching rows rather than the sum: two open rows in the same
 * sub-area describe one weakness seen twice, and summing would let a broad-but-shallow
 * area outrank a deep single one.
 */
export function weaknessScore(loCode: string, open: readonly WeakAreaRow[]): number {
  const lo = (loCode ?? '').toUpperCase();
  if (!lo) return 0;
  let best = 0;
  for (const row of open) {
    const rowLo = (row.lo_code ?? '').toUpperCase();
    const pull = BAND_PULL[row.band] ?? 0;
    if (pull === 0) continue;
    const match = rowLo === lo ? 1 : (subArea(rowLo) && subArea(rowLo) === subArea(lo) ? SUB_AREA_PULL : 0);
    if (match === 0) continue;
    const occurrences = Math.min(
      OCCURRENCE_CAP,
      1 + Math.max(0, (row.occurrence_count ?? 1) - 1) * OCCURRENCE_STEP,
    );
    best = Math.max(best, pull * match * occurrences);
  }
  return Math.round(best * 100) / 100;
}

// ── Professional skills ──────────────────────────────────────────────────────
// The OTHER half of what a sit measures. The PS pass grades the whole answer against the
// paper's own section-E descriptors and yields a band per skill; `acca_drills` has carried
// a `professional_skill_tag` column since the generator wrote it, and NOTHING read it at
// serve time until now. A student marked 'weak' on scepticism should meet drills that
// demand scepticism.
//
// PS bands are the 4-value quality lexicon (no 'nothing'), so the same weak|competent rule
// applies for the same reason — a competent PS band names a real, stated shortfall.
//
// PS weakness is NOT written to acca_weak_areas. That table is keyed by lo_code and its own
// migration says so ("a sit's finding is an LO code and a band"); a professional skill is
// not an LO and encoding one in that column would make the ledger mean two things. The
// signal is read from acca_case_marking.per_skill, which already persists band per skill
// in full — no new storage, and no second copy to fall out of date.
export function isWeakSkillBand(band: string | null | undefined): boolean {
  return typeof band === 'string' && (WEAKNESS_BANDS as readonly string[]).includes(band);
}

/** 1 when this drill exercises a skill the student was marked weak/competent on, else 0. */
export function psScore(
  tag: string | null | undefined,
  weakSkills: ReadonlySet<string>,
): number {
  if (typeof tag !== 'string' || !tag.trim()) return 0;
  return weakSkills.has(tag.trim()) ? 1 : 0;
}

// ── The combined boost ───────────────────────────────────────────────────────
// Weights. W_WEAK dominates W_PS deliberately: the LO is what the student got wrong, the
// professional skill is how they wrote it. Both are real, one is more actionable.
export const W_WEAK = 2;
export const W_PS = 1;

export interface SelectionSignals {
  /** Open acca_weak_areas rows for this user AND this paper. LO codes collide across
   *  papers, so an unscoped read would steer an APM student off an AFM sit. */
  openWeaknesses: readonly WeakAreaRow[];
  /** Skills marked weak/competent for this user on this paper's cases. */
  weakSkills: ReadonlySet<string>;
}

export const NO_SIGNALS: SelectionSignals = { openWeaknesses: [], weakSkills: new Set() };

export interface SelectionCandidate {
  lo_code: string;
  professional_skill_tag?: string | null;
}

/** The steering term, shared by the live area=/lo= paths and the gated interleave scorer.
 *  0 for every candidate when there is no signal — see the rollback note in the header. */
export function selectionBoost(c: SelectionCandidate, s: SelectionSignals): number {
  return W_WEAK * weaknessScore(c.lo_code, s.openWeaknesses)
       + W_PS   * psScore(c.professional_skill_tag, s.weakSkills);
}

/**
 * Pick the highest-scoring candidate, breaking ties at random.
 *
 * The tiebreak is what preserves "try another": a student with no ledger sees the same
 * uniform random pick as before, and a student WITH one still sees variety inside the
 * steered band rather than the same drill every time.
 *
 * `rnd` is injected so the fixtures can pin the choice; production passes Math.random.
 */
export function pickWeighted<T>(
  candidates: readonly T[],
  score: (c: T) => number,
  rnd: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  let best = -Infinity;
  let top: T[] = [];
  for (const c of candidates) {
    const s = score(c);
    if (s > best) { best = s; top = [c]; }
    else if (s === best) top.push(c);
  }
  return top[Math.floor(rnd() * top.length)] ?? top[0];
}

// ── Closing a row ────────────────────────────────────────────────────────────
// THE SAME INSTRUMENT THAT OPENS A ROW CLOSES IT (Grant-ruled 2026-07-31). A later STRONG or
// EXEMPLARY band on the same (user, paper, lo_code, source) resolves the open row. No new
// machinery, no separate "mastery" signal to keep in step with this one, and no judgement
// this ledger is not already making — the marker already grades that area on that scale.
//
// WHY 'competent' DOES NOT CLOSE, even though it is the better half of the open set: it is
// the band whose own published next action reads "the approach was right and a material point
// was missed". A material point still missing is not a resolved weakness. The open/close
// boundary sits between competent and strong precisely because that is where the marker stops
// naming something to fix.
//
// A closed row is NOT deleted: it stays as history, and the partial unique index
// (`WHERE resolved_at IS NULL`) is what lets a later weak finding open a FRESH row for the
// same area rather than incrementing a resolved one. Students regress; the ledger has to be
// able to say so without pretending the earlier recovery never happened.
export const RESOLVING_BANDS = ['strong', 'exemplary'] as const;

export function shouldResolveWeakness(band: string | null | undefined): boolean {
  return typeof band === 'string' && (RESOLVING_BANDS as readonly string[]).includes(band);
}

// ── What the writer emits ────────────────────────────────────────────────────
/** One ledger row a marked sit wants OPENED (or incremented). Emitted PURELY from marking
 *  output so the "which requirements produce a row" decision is fixtured, not buried in a
 *  route. */
export interface WeaknessWrite {
  lo_code: string;
  band: WeaknessBand;
  case_id: string;
  requirement_id: string;
}

/** One area a marked sit wants CLOSED. Carries no band — closing is not a grade, it is the
 *  removal of an open finding. */
export interface WeaknessClose {
  lo_code: string;
}

export interface MarkedRequirement {
  requirement_id: string;
  lo_code: string | null;
  band: TechnicalBand | string | null;
}

export interface LedgerActions {
  opens: WeaknessWrite[];
  closes: WeaknessClose[];
}

/**
 * What a marked case does to the ledger.
 *
 * DE-DUPLICATED BY LO within the call: the open-row unique key is
 * (user, paper, lo_code, source), so two requirements on the same LO are ONE finding, not two
 * increments of the same row. When they disagree, the WORSE band wins — a student who was
 * weak on one E3a requirement and competent on another is carrying the weak one.
 *
 * OPEN BEATS CLOSE, and that is the load-bearing precedence rule. A paper that examines one
 * LO twice can come back weak on one and strong on the other; resolving the area on the
 * strength of the good half would erase the very finding the same paper just produced. So an
 * LO that opens is never also closed, in either arrival order.
 *
 * A requirement with no lo_code contributes nothing to either list: the ledger is keyed by LO
 * and a row without one could never be matched by the selector, or found to be closed.
 */
export function ledgerActionsFor(reqs: readonly MarkedRequirement[]): LedgerActions {
  const opens = new Map<string, WeaknessWrite>();
  const closes = new Set<string>();

  for (const r of reqs) {
    const lo = (r.lo_code ?? '').trim();
    if (!lo) continue;

    if (shouldRecordWeakness(r.band)) {
      const existing = opens.get(lo);
      // 'weak' outranks 'competent'; anything else never reaches here.
      if (existing && !(existing.band === 'competent' && r.band === 'weak')) continue;
      opens.set(lo, {
        lo_code: lo,
        band: r.band,
        case_id: '',            // filled by the caller — provenance, not identity
        requirement_id: r.requirement_id,
      });
    } else if (shouldResolveWeakness(r.band)) {
      closes.add(lo);
    }
    // 'nothing' does neither: it opens no row (see the header) and it certainly resolves none.
  }

  // Precedence, applied after the whole case is read so arrival order cannot change it.
  for (const lo of opens.keys()) closes.delete(lo);

  return {
    opens: [...opens.values()],
    closes: [...closes].map((lo_code) => ({ lo_code })),
  };
}
