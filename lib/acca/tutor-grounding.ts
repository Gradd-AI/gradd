// lib/acca/tutor-grounding.ts
import {
  extractDiscriminants, detectContradictions, renderDiscriminants,
  type DiscriminantFact, type ContradictionFact,
} from './tutor-discriminants';

// PERSONA-HARDENING (2026-07-21) — the "Rule 24 triangulation" grounding mechanism referenced (but
// never built) in AFM_SURFACED.md's persona-hardening slot: "inject a rubric/key-facts-in-context
// payload into ALL conversational legs... so the persona is grounded against the drill's OWN
// criteria, scenario facts, and failure-mode list rather than reasoning about the student's answer
// from scratch each turn." This module builds that payload — a GroundingPack — from data the drill
// ALREADY carries (answer_schema + model_answer's own structure). No schema change, no backfill:
// works today on all 46 published rows.
//
// TRUST-TIER DISCIPLINE (do not relax — this is what keeps the moat intact):
//   • fullTrust (checklist + facts) sits at the SAME trust tier model_answer already occupies today —
//     safe ONLY for the legs architecturally permitted to see answer-adjacent content (diagnose,
//     completeness) because their OUTPUT is structurally content-neutral (a gap label / a
//     present-absent list), never the content itself. Docs: TEACHING_ARCHITECTURE.md's structural-
//     withholding doctrine — the same discipline that keeps model_answer out of call3_* keeps a
//     narrative criterion's required_point out of call3_* too (it is a mini-answer-fragment).
//   • conventions / misconceptionLead are METHOD-ONLY (the RULE, never this drill's specific figure
//     or point) — safe to broadcast to every conversational leg, same category as the existing
//     METHOD_FITS_THE_GIVEN_INPUTS clause in tutor-personas.ts.
//   • resolvableTopics never carries scenario specifics — just real, published area labels.
//
// NUMERIC "signature insight" WITHOUT a new field: numeric model_answer bodies are code-generated
// with a "**Step N — Label**" bold-header structure (confirmed across all build*ModelAnswer
// functions) — extracting these gives a genuine checklist item for narrative/advisory steps the
// answer_schema's Component[] never decomposes (e.g. "Step 6 — Advice to the board"), which is
// exactly the Nakheel-shaped FALSE-COMPLETE gap. Falls back to schema components when no headers
// are found (older/simpler drills).

export interface ChecklistItem { id: string; label: string }
export interface GroundingFact { id: string; text: string; key?: string }

export interface GroundingPack {
  mode: 'narrative' | 'numeric' | 'none';
  checklist: ChecklistItem[];       // fullTrust — diagnose / completeness ONLY, never broadcast wider
  facts: GroundingFact[];           // fullTrust — narrative scenario_facts; empty for numeric
  conventions: string[];            // Tier B — method-only, safe for hint/teach/confirm/warm
  misconceptionLead: string | null; // Tier B — the drill's OWN named failure mode, one clause
  // ── THE AUTHORED HINT (2026-08-23) ──
  // Tier B, method-only, and the reason it is here: `acca_drills.hint` is NOT NULL, populated on
  // 154/154 published rows (~300 chars, none empty), linted by the prose gates as an
  // EVALUATIVE_FIELD, quoted in every review pack — and NO serving query fetched it for the whole
  // life of the product (P-T3(k), fourth instance). `misconceptionLead` reaches 14 of 91 APM
  // drills; this reaches all 154, INCLUDING the 73 discursive APM drills that have no other
  // source of drill-specific correction at all.
  // ⚠️ SERVED AS GROUNDING, NEVER VERBATIM. The authored hints presuppose an attempt state —
  // fb29bf4a's opens "You've calculated ROI and RI for each division, but…" — so serving one as
  // the reply would ship the fabricated-premise failure by design, on every drill. It is method
  // content ABOUT the drill; the live leg decides what to do with it against the actual attempt.
  authoredHint: string | null;      // Tier B — reviewed, drill-specific, HINT LEG ONLY
  resolvableTopics: string[];       // Tier C — real published area labels, outro/close only
  // ── DIRECTION FENCE (2026-08-01) ──
  // fullTrust, and the reason this module was reopened. buildGroundingPack read only
  // `components[].working_steps` and labels — it NEVER touched `answer_schema.params`, where the
  // calculator's own `side` / `direction` / `quote_direction` discriminants live. So the drill
  // tutor inferred the side of a trade from prose, exactly as the case tutor did, and affirmed
  // the inverse rule in 4 of 20 measured turns.
  discriminants: DiscriminantFact[];     // code-owned settled choices, stated as fact
  contradictions: ContradictionFact[];   // computed in code, never inferred by the model
}

const EMPTY_PACK: GroundingPack = { mode: 'none', checklist: [], facts: [], conventions: [], misconceptionLead: null, authoredHint: null, resolvableTopics: [], discriminants: [], contradictions: [] };

// Small, stable AFM area-label map (B1-B5; A6 is direct-link-only, never an outro target). Kept local
// and minimal rather than depending on the APM-only AreaPicker.tsx map (scope-debt, see AFM_SURFACED).
const AFM_AREA_LABELS: Record<string, string> = {
  B1: 'investment appraisal and risk',
  B2: 'option pricing (BSOP) and real options',
  B3: 'cost of capital and financing',
  B4: 'business and asset valuation',
  B5: 'international investment and financing',
};

// The drill's OWN named failure mode, ONE clause, parsed from full_reveal at request time (no schema
// change). full_reveal is authored consistently: "The classic/dominant/typical misconception here is
// X: ..." — capture up to and including the first colon after "misconception". Falls back to the
// first sentence if the pattern is absent (older/APM drills with a differently-shaped full_reveal).
export function extractMisconceptionLead(fullReveal: string): string | null {
  if (!fullReveal) return null;
  const m = fullReveal.match(/^.*?misconception[^:]*:/i);
  if (m) return m[0].trim();
  const firstSentence = fullReveal.match(/^[^.!?]*[.!?]/);
  return firstSentence ? firstSentence[0].trim() : null;
}

// Numeric model_answer bodies are code-generated with a "**Step N — Label**" bold-header structure
// (build*ModelAnswer functions across every calculator family). Extract these as the checklist —
// this is how a narrative/advisory step like "Advice to the board" becomes a checkable item even
// though no Component decomposes it. Ordered as they appear; deduped by label.
export function extractStepHeaders(modelAnswer: string): ChecklistItem[] {
  if (!modelAnswer) return [];
  const items: ChecklistItem[] = [];
  const re = /\*\*Step\s*(\d+)\s*[—\-–]\s*([^*]{2,80})\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(modelAnswer)) !== null) items.push({ id: `step_${m[1]}`, label: m[2].trim() });
  return items;
}

// Narrative "conventions" (Tier B) are DERIVED from the rubric's own disqualifier set, never from
// required_point text (that would leak the answer content). Presence of F4 (fence-sitting) as a
// disqualifier on any criterion means the requirement demands a committed verdict — state that as a
// RULE, not the specific recommendation itself. Purely structural: reads disqualifier CODES, not points.
function narrativeConventions(criteria: { disqualifiers: string[] }[]): string[] {
  const out: string[] = [];
  if (criteria.some((c) => c.disqualifiers.includes('F4'))) {
    out.push('This requirement demands a COMMITTED recommendation or verdict — fence-sitting ("there are arguments on both sides") is not an equally valid style; a stated, justified choice is required.');
  }
  if (criteria.some((c) => c.disqualifiers.includes('F6'))) {
    out.push('A given figure must be INTERPRETED, not merely restated — stating a number without explaining what it means for the decision is superficial commentary, not analysis.');
  }
  return out;
}

// Numeric "conventions" (Tier B): every component's working_steps VERBATIM. These are short, authored
// METHOD statements (e.g. "= (IRR − r) ÷ r × 100 — NOT the bare IRR − r headroom") — the exact content
// constraint (b)/(d) need ("quote the drill's stated base"; "never soften a code-owned convention into
// a style choice"). Deduped; capped so a large schema doesn't balloon every leg's prompt.
function numericConventions(components: { working_steps?: string[] }[]): string[] {
  const all = components.flatMap((c) => c.working_steps ?? []);
  return [...new Set(all)].slice(0, 8);
}

// ── Main builder ──────────────────────────────────────────────────────────────
// drill: the subset of acca_drills columns the tutor route already fetches, PLUS answer_schema
// (newly added to the SELECT — see route.ts). resolvableAreas: distinct published area codes for
// this paper (a cheap, cacheable query the route runs once per request; passed in rather than
// queried here so this module stays pure / DB-free, matching the file's no-I/O convention).
export function buildGroundingPack(
  drill: { model_answer: string | null; full_reveal: string | null; answer_schema: unknown; hint?: string | null },
  resolvableAreas: string[],
  /** The student's current message. Optional so every pre-existing caller keeps working unchanged
   *  — omit it and `contradictions` is simply empty, which is the behaviour before this change.
   *  Supplied, the contradiction against a code-owned discriminant is computed HERE, in code. */
  studentText = '',
): GroundingPack {
  const misconceptionLead = extractMisconceptionLead(drill.full_reveal ?? '');
  // The authored hint, taken whole. No parsing: unlike full_reveal (from which ONE clause is
  // extracted), the hint IS already a single reviewed clause written for exactly this purpose.
  const authoredHint = (drill.hint ?? '').trim() || null;
  const resolvableTopics = resolvableAreas.map((a) => AFM_AREA_LABELS[a] ? `another ${AFM_AREA_LABELS[a]} drill` : `another drill in area ${a}`);

  // Read from `params`, which is where the calculator puts its settled choices. Independent of
  // the narrative/numeric branch below, because a discriminant is a property of the requirement,
  // not of how it happens to be marked.
  const discriminants  = extractDiscriminants(drill.answer_schema);
  const contradictions = detectContradictions(studentText, discriminants);

  const schema = drill.answer_schema as { mode?: string; criteria?: unknown[]; scenario_facts?: unknown[]; components?: unknown[] } | null;
  if (!schema || typeof schema !== 'object') {
    return { ...EMPTY_PACK, misconceptionLead, authoredHint, resolvableTopics, discriminants, contradictions };
  }

  if (schema.mode === 'narrative') {
    const criteria = (schema.criteria ?? []) as { id: string; required_point: string; requirement_part: string; anchor_facts: string[]; disqualifiers: string[] }[];
    const facts = (schema.scenario_facts ?? []) as { id: string; text: string; key?: string }[];
    return {
      mode: 'narrative',
      checklist: criteria.map((c) => ({ id: c.id, label: c.required_point })),
      facts: facts.map((f) => ({ id: f.id, text: f.text, key: f.key })),
      conventions: narrativeConventions(criteria),
      misconceptionLead,
      authoredHint,
      resolvableTopics,
      discriminants,
      contradictions,
    };
  }

  // Numeric (or any schema shape without mode:'narrative' — e.g. the plain {components:[...]} shape).
  const components = (schema.components ?? []) as { component_id: string; label?: string; working_steps?: string[] }[];
  const stepHeaders = extractStepHeaders(drill.model_answer ?? '');
  return {
    mode: 'numeric',
    checklist: stepHeaders.length ? stepHeaders : components.map((c) => ({ id: c.component_id, label: c.label ?? c.component_id })),
    facts: [],
    conventions: numericConventions(components),
    misconceptionLead,
    authoredHint,
    resolvableTopics,
    discriminants,
    contradictions,
  };
}

// ── Delivery-protocol text blocks (Rule 24 location 2 — per-leg instruction, not per-drill data) ──
// Each is a short, STABLE instruction explaining HOW a specific leg should use the grounding pack
// that follows it in the user message (location 3, the per-turn anchor — built by the caller from
// the pack's own fields, since the DATA is drill-specific and the INSTRUCTION is not).

export const GROUNDING_INSTRUCTION_DIAGNOSE =
  'GROUNDING (use this to judge the claim, do NOT quote it back or state it as your output): the ' +
  'CHECKLIST below lists every point/component this answer needs; the FACTS list scenario facts a ' +
  'correct answer may reference. If the student\'s statement already matches an item on either list — ' +
  'however differently worded — that means CORRECT on that point; do not invent a contradiction. ' +
  'Only flag something as missing if it is genuinely absent from the attempt, not merely phrased ' +
  'differently from how the checklist states it.';

export const GROUNDING_INSTRUCTION_COMPLETENESS =
  'GROUNDING: the CHECKLIST below is the authoritative list of required points/components — mark ' +
  'each one PRESENT or ABSENT based on the attempt. Do NOT invent additional required components ' +
  'beyond this list, and do NOT mark something ABSENT merely because it is phrased differently from ' +
  'the checklist label — judge whether the SUBSTANCE is there.';

export const GROUNDING_INSTRUCTION_HINT =
  'GROUNDING: lead with the MISCONCEPTION below (in your own words) before anything else — name the ' +
  'failure pattern this drill is designed to catch. Where a CONVENTION below is relevant to the gap, ' +
  'quote it precisely — it is the REQUIRED method for this drill, never one of several equally valid ' +
  'approaches, and never soften it into a style choice.';

export const GROUNDING_INSTRUCTION_CONVENTION =
  'GROUNDING — CONVENTIONS below are this drill\'s REQUIRED methods, authored and fixed in advance. ' +
  'Quote the relevant one precisely when it applies. Never call an alternative, unscaled, or ' +
  'incomplete form "equally valid," "another legitimate way," or similar — there is one required ' +
  'method per convention, and an answer using a different one is WRONG, not a stylistic variant.';

export const GROUNDING_INSTRUCTION_OUTRO =
  'GROUNDING — RESOLVABLE TOPICS below are the ONLY next-step areas you may reference by name. Never ' +
  'invent a specific scenario, company type, or mechanism description for a "next drill" that is not ' +
  'in this list — if you want to point the student onward, use one of these generic area phrases, or ' +
  'stay fully generic ("a fresh question in this area"). Inventing a plausible-sounding but ' +
  'nonexistent drill description is a hard failure.';

// ── Per-turn anchor rendering (Rule 24 location 3) ────────────────────────────
// Renders the relevant slice of the pack into the actual text appended to a leg's user message.
// Callers pick which tier(s) to render — fullTrust text is built ONLY by callers permitted to see it
// (diagnose / completeness); every other renderer here is Tier B/C and safe broadcast-wide.

export function renderChecklistAndFacts(pack: GroundingPack): string {
  // THE DIRECTION BLOCK COMES FIRST, and comes even when there is no checklist. Ordering is the
  // mechanism for the half of the measured defect where the tutor never adjudicated direction at
  // all (~10/20) and went straight to the arithmetic: a contract count is worthless on the wrong
  // side of the trade. Nothing instructs the model to lead with it — it simply arrives first.
  const directionLines = renderDiscriminants(pack.discriminants, pack.contradictions);
  if (pack.checklist.length === 0 && pack.facts.length === 0) return directionLines;
  const checklistLines = pack.checklist.length
    ? `CHECKLIST (every point/component a full answer covers):\n${pack.checklist.map((c) => `- ${c.label}`).join('\n')}\n\n`
    : '';
  const factsLines = pack.facts.length
    ? `FACTS (scenario facts a correct answer may reference):\n${pack.facts.map((f) => `- ${f.text}`).join('\n')}\n\n`
    : '';
  return directionLines + checklistLines + factsLines;
}

export function renderConventionsAndMisconception(pack: GroundingPack): string {
  const conv = pack.conventions.length ? `CONVENTIONS (required methods for this drill):\n${pack.conventions.map((c) => `- ${c}`).join('\n')}\n\n` : '';
  const lead = pack.misconceptionLead ? `MISCONCEPTION (this drill's designed failure pattern): ${pack.misconceptionLead}\n\n` : '';
  return conv + lead;
}

/**
 * The authored hint, for the HINT LEG ONLY (2026-08-23).
 *
 * ⚠️ ITS OWN RENDERER, DELIBERATELY, AND THAT IS THE STRUCTURAL FENCE. `call2_diagnose` renders
 * `renderChecklistAndFacts`; the hint leg renders `renderConventionsAndMisconception`. Keeping the
 * authored hint in a THIRD function that only the hint leg calls means "never to call2" is a fact
 * about the call graph, not an instruction anyone has to remember — appending it to either
 * existing renderer would have made it reachable by whichever legs already call that one.
 *
 * ⚠️ THE FRAMING IS LOAD-BEARING. The stored hints are written TO a student who has already
 * attempted, and several presuppose a specific attempt state ("You've calculated ROI and RI for
 * each division, but…"). Handed over raw, that premise would be restated at a student who did
 * nothing of the kind — the fabricated-premise failure measured repeatedly this session. So it is
 * labelled as what it is: guidance about the DRILL, authored in advance, describing the move this
 * requirement turns on — explicitly NOT a description of what this student did.
 */
export function renderAuthoredHint(pack: GroundingPack): string {
  if (!pack.authoredHint) return '';
  return (
    "AUTHORED HINT (reviewed guidance about THIS DRILL, written in advance — it describes the move " +
    "the requirement turns on. It was NOT written about this student's attempt and makes no claim " +
    'about what they did: use it to decide what to steer toward, never to assert what they have ' +
    `already done):\n${pack.authoredHint}\n\n`
  );
}

export function renderResolvableTopics(pack: GroundingPack): string {
  if (pack.resolvableTopics.length === 0) return '';
  return `RESOLVABLE TOPICS (the only next-step areas you may name):\n${pack.resolvableTopics.map((t) => `- ${t}`).join('\n')}\n\n`;
}
