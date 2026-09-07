// lib/acca/reveal-split.ts
// THE EXPANDED REVEAL — the two pure questions the expand control asks, and nothing else:
//
//   1. WHAT IS THE DOCUMENT?  `splitServedReveal` — where the model's framing wrapper ends and
//      the authored worked answer begins, inside a served reveal.
//   2. WHO MAY READ IT?       `expandedRevealDecision` — the server-side re-check of the earned-
//      reveal gate, for a request that arrives as a URL rather than as a chat turn.
//
// They live in one module because they are the two halves of one thing and have one caller each
// on the same route. Neither touches the network, the DB or React: the route is a thin adapter
// that fetches rows, calls these, and maps a refusal to `notFound()`. That is what makes the gate
// FIXTURE-TESTABLE — a `notFound()` inside a server component is not, and the ship condition for
// this control was three refusal fixtures.
//
// ── WHY THE GATE IS RE-CHECKED AT ALL ────────────────────────────────────────
// The earned reveal is a STRUCTURAL moat (`docs/TEACHING_ARCHITECTURE.md`, LOCKED): the worked
// answer is withheld until two genuine misses or a demonstrated correct answer. On the chat
// surface that moat is enforced inside the turn route, which is the only door. This control adds
// a SECOND door — a URL — and a deep link that trusted the client would be the hole in it. So the
// decision is made again here, from the durable progress row, with no input from the request
// other than the two ids.

import {
  AFM_REVEAL_SEPARATOR,
  REVEAL_FOOTER,
  revealDecision,
} from '@/lib/acca/tutor-personas';
import { servedPaper, type ServedPaper } from '@/lib/acca/paper';
import { caseIsReserved } from '@/lib/acca/mock-access';

// ── 1. THE BOUNDARY ──────────────────────────────────────────────────────────

export interface RevealSplit {
  /** The model's framing wrapper, INCLUDING the copyright footer, exactly as served. */
  wrapper: string;
  /**
   * The worked answer. BYTE-IDENTICAL to `normaliseRevealArtefact(row.model_answer)` — that
   * equality is the fixture, and it is what lets the in-session expand (which splits the served
   * bytes) and the deep link (which reproduces the artefact from the row) show the same document.
   */
  artefact: string;
}

/**
 * The boundary `assembleAfmReveal` writes: the footer, then the separator. Searching for the
 * separator ALONE would be wrong — `---` is ordinary markdown and a worked answer may contain a
 * horizontal rule. The footer makes the marker distinctive enough to find.
 */
const BOUNDARY = REVEAL_FOOTER + AFM_REVEAL_SEPARATOR;

/**
 * Split a served reveal into its wrapper and its artefact.
 *
 * Returns `null` when the text carries no boundary — a teaching turn, a hint, a BURN (which
 * serves no artefact at all, by design), or the static earn-it refusal. A `null` means *there is
 * nothing here to expand*, and the caller must render no expand control. It never means "expand
 * the whole message".
 *
 * ⚠️ THE FIRST OCCURRENCE, DELIBERATELY, AND THE DIRECTION OF THE ERROR IS THE REASON.
 * The marker cannot legitimately appear twice: code appends the footer, the model never writes it
 * (it is in no prompt), and `sanitizeAfmWrapper` runs before assembly. But if it ever did:
 *   • splitting FIRST, with the marker inside the wrapper, puts some wrapper prose at the top of
 *     the document. Visible, ugly, harmless.
 *   • splitting LAST, with the marker inside the artefact, TRUNCATES the worked answer.
 * Truncating the artefact is the exact failure the anti-truncation invariant exists to prevent
 * (`assembleAfmReveal`'s header). Fail toward showing too much; never toward showing too little.
 */
export function splitServedReveal(served: string): RevealSplit | null {
  const at = served.indexOf(BOUNDARY);
  if (at < 0) return null;
  return {
    wrapper: served.slice(0, at + REVEAL_FOOTER.length),
    artefact: served.slice(at + BOUNDARY.length),
  };
}

// ── 2. THE GATE ──────────────────────────────────────────────────────────────

/**
 * Every reason the expanded reveal is refused. The route maps ALL of them to one uniform 404, so
 * nothing distinguishes "you have not earned this" from "this case does not exist" to a caller.
 * The reason is returned anyway, for two things a bare boolean cannot do: let a fixture assert
 * WHICH rule fired (a gate that refuses everything passes a test that only checks "refused"), and
 * let the server log say why.
 */
export type ExpandedRevealRefusal =
  | 'not_found'       // no approved+published case with this id, or its paper is not served
  | 'reserved'        // mock_only — reserved exam content, never reachable through a teaching door
  | 'no_requirement'  // the requirement does not belong to this case
  | 'unearned'        // the moat: fewer than two misses and not resolved
  | 'burn'            // struggle without a subscription — the artefact is the thing being sold
  | 'no_artefact';    // the row carries no stored model_answer

export type ExpandedRevealDecision =
  | { ok: true;  paper: ServedPaper }
  | { ok: false; refusal: ExpandedRevealRefusal };

export interface ExpandedRevealInput {
  caseId: string;
  /** The `acca_cases` row, already filtered to approved + published. `null` when there is none. */
  caseRow: { paper_code?: unknown; mock_only?: unknown } | null;
  /** `hasPaperAccess` for the case's OWN paper — see the note on paper scoping below. */
  paid: boolean;
  /** `acca_case_progress` for (user, case, requirement). `null` when the student never turned. */
  progress: { miss_count?: unknown; resolved?: unknown } | null;
  /** The `acca_case_requirements` row, already scoped to this case. `null` when it is not. */
  requirement: { model_answer?: unknown } | null;
}

/**
 * May this student read this requirement's worked answer as a document?
 *
 * PAPER SCOPING IS DERIVED, NOT SUPPLIED. This route is ID-ADDRESSED — a case id is a globally
 * unique primary key, so it carries no `?paper=` (`lib/acca/paper-url.ts` lists the three
 * categories that stay bare). The paper therefore comes off the case's OWN row, and the caller
 * must have checked entitlement against THAT paper: an APM subscriber must not read an AFM case's
 * worked answer. `servedPaper` REFUSES an unrecognised code rather than defaulting to APM the way
 * `paperForCaseRow` does — a default here would check the wrong paper's entitlement.
 *
 * `wantsReveal: true` is passed unconditionally and that is correct: on the chat surface the flag
 * folds in a phrase match, because a turn has to be classified as a reveal request. Arriving at
 * this URL IS the request; there is nothing to classify.
 */
export function expandedRevealDecision(input: ExpandedRevealInput): ExpandedRevealDecision {
  const { caseId, caseRow, paid, progress, requirement } = input;

  if (!caseRow) return { ok: false, refusal: 'not_found' };

  const paper = servedPaper(caseRow.paper_code);
  if (!paper) return { ok: false, refusal: 'not_found' };

  // Reserved exam content is refused before anything else is considered. `caseIsReserved` takes
  // the row's own flag OR registry membership, so a mock case missing the column is still caught.
  // The mode is 'practice' unconditionally: a sit has no teach loop, no miss_count and no reveal,
  // so there is no sit-shaped request that could legitimately arrive here.
  if (caseIsReserved(caseId, caseRow.mock_only as boolean | null | undefined)) {
    return { ok: false, refusal: 'reserved' };
  }

  if (!requirement) return { ok: false, refusal: 'no_requirement' };

  // ── THE MOAT, RE-ASKED ──
  // Degrading a malformed progress row to zero is the SAFE direction here (it refuses), which is
  // the opposite of the turn route's `catch` — there, defaults let the teaching continue.
  const missCount = typeof progress?.miss_count === 'number' ? progress.miss_count : 0;
  const resolved  = progress?.resolved === true;
  const gate = revealDecision({ wantsReveal: true, missCount, resolved, paid });
  if (gate === 'burn') return { ok: false, refusal: 'burn' };
  // 'earn_redirect' is the moat proper. 'none' is unreachable with wantsReveal true and is folded
  // in here rather than left as an unhandled case that would fall through to a grant.
  if (gate !== 'reveal') return { ok: false, refusal: 'unearned' };

  // ── FAIL CLOSED ON A MISSING ARTEFACT (AFM_SURFACED (q)) ──
  // Both engines still carry a `call1_generate` branch that invents a model answer at turn time.
  // It is dead for all 192 published items and it is reachable. A generated answer existed only in
  // that turn's session_state, so there is nothing here to reproduce — and it has been through no
  // gate, no answer_schema and no numeric verifier. Refuse. NEVER generate one to fill the gap,
  // and never serve a silently different artefact: a reader who cannot tell the two apart is the
  // failure mode.
  const answer = typeof requirement.model_answer === 'string' ? requirement.model_answer : '';
  if (!answer.trim()) return { ok: false, refusal: 'no_artefact' };

  return { ok: true, paper };
}
