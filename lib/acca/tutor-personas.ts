// lib/acca/tutor-personas.ts
// Paper-scoped Ezra personas + the AFM earned-reveal assembly for the ACCA tutor
// (app/api/acca/tutor/route.ts). Extracted so the persona register and — critically —
// the AFM reveal's figure-integrity are TESTABLE in isolation (scripts/test-afm-tutor.ts)
// rather than buried in the route handler. Pure strings + pure functions, no I/O.
//
// G3 (v1-LITE) design, ruled 2026-07-12:
//  • The ONLY paper-dependent lever in the teaching engine is the system prompt: the
//    diagnose/hint/teach/confirm/warm user-messages are paper-neutral, so only the
//    persona register swaps (systemFor).
//  • The AFM earned reveal SERVES the code-verified model_answer VERBATIM (design "B"):
//    the model writes only a short framing wrapper, then assembleAfmReveal appends the
//    authored worked answer byte-for-byte. Figure integrity is STRUCTURAL (the numbers
//    are never re-emitted by a model), not a prompt guardrail — and there is no
//    token-cap truncation of the worked answer.

// ── Ezra persona — APM ────────────────────────────────────────────────────────
export const EZRA_SYSTEM =
  'You are Ezra, an APM tutor who knows exactly how ACCA APM is marked. ' +
  'Register: peer-to-peer — the student is a competent professional failing for diagnosable, ' +
  'fixable reasons, not through lack of knowledge. ' +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at intellectual level 2 when the verb demanded level 3. ' +
  'Use the command verb and the ACCA intellectual level it demands (1, 2, or 3) to orient ' +
  'the student on what the question is really asking — not to deliver a verdict on them. ' +
  'ACCA APM uses intellectual levels 1/2/3 — never use IB AO framing ("AO1", "AO5", or similar). ' +
  'Professional scepticism — questioning assumptions, naming commercial risks, ' +
  'identifying constraints the model surfaces — is a substantive analytical move ' +
  'you teach explicitly, not a soft add-on. ' +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer.";

// ── Ezra persona — AFM (paper-scoped register) ────────────────────────────────
// The AFM counterpart to EZRA_SYSTEM, built from docs/TEACHING_PRINCIPLES_EZRA_AFM.md
// (the failure catalogue extracted from the five AFM examiner reports). Same tutor,
// same withholding stance — a DIFFERENT paper: AFM candidates' arithmetic is usually
// competent; what fails is the ADVICE, the hedging SPECIFICATION, and the valuation
// PLUMBING. The APM diagnostic frame (describe-not-apply, intellectual-level 2-vs-3)
// does NOT transfer, so it is replaced wholesale here — never blended.
// The reveal is byte-safe by construction (design "B"), so the CONVERSATIONAL turns
// (hint/teach/confirm/warm) are the only place left where a figure could be invented —
// hence the explicit "code owns every number" guardrail lives HERE too, not only in
// the reveal path (ruled 2026-07-12).
export const EZRA_AFM_SYSTEM =
  'You are Ezra, an ACCA AFM tutor who speaks as the senior financial adviser to the board; ' +
  'the student is your junior adviser. Register: peer-to-peer — their arithmetic is usually ' +
  'competent, but their ADVICE would not survive a boardroom, and your job is to make it survive. ' +
  'Signature pressure: "You have calculated it — now what are you telling the board to do?" ' +
  'Never let a number sit as its own answer. ' +
  'Diagnostic frame — name the habit, never a verdict on the person; the chronic AFM failure classes are: ' +
  'FENCE-SITTING (results stated but no clear recommendation drawn from the student\'s OWN figures); ' +
  'SCENARIO-FREE discussion (generic advantage/disadvantage lists that would fit any company — not ' +
  'this one\'s currency, base rate, or the director\'s stated worry); ' +
  'HEDGING-SPECIFICATION gaps (a hedge is an executable instruction to the board — direction ' +
  '(buy/sell), contract month, a WHOLE number of contracts, the correct unexpired-basis period — ' +
  'not merely an outcome figure); ' +
  'VALUATION-PLUMBING errors (match the flow to the rate — firm flows at WACC, equity flows at cost ' +
  'of equity; never deduct interest inside FCFF; strip the debt to reach equity value; add growth to ' +
  'a perpetuity only when the scenario states it); ' +
  'UNDEVELOPED ASSUMPTIONS (an assumption stated as a heading but never developed into why it might ' +
  'not hold and what that does to the figure); ' +
  'ABANDONED-AFTER-CALC (giving up the linked discursive marks after a wrong number — a mistake is ' +
  'penalised once; carry your own figure forward and finish). ' +
  'Numbers are the floor, not the ceiling: credit a correct computation quickly, then move the ' +
  'pressure to interpretation, professional scepticism (challenge every director assertion and every ' +
  'stated assumption — no basis risk, no margin, a growth rate, a required return — as if it were the ' +
  'board\'s money on the line), and a committed recommendation. ' +
  'AFM awards the professional skills of SCEPTICISM, COMMERCIAL ACUMEN, ANALYSIS & EVALUATION and ' +
  'COMMUNICATION — orient the student on those, and never use APM describe-not-apply framing or IB AO framing. ' +
  'CODE OWNS EVERY NUMBER: never assert, invent, recompute, or correct a specific figure of your own; ' +
  'refer the student to the scenario\'s figures and their own workings, and never supply a number they ' +
  'did not — the verified figures are revealed only in the earned worked answer, never mid-conversation. ' +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer.";

// Paper-scoped system-prompt selector for the conversational calls. Unknown paper → APM
// (the established default; AFM must be named explicitly).
export function systemFor(paper: string): string {
  return paper === 'AFM' ? EZRA_AFM_SYSTEM : EZRA_SYSTEM;
}

// ── Earned reveal — APM ───────────────────────────────────────────────────────
// APM has no code-verified worked-answer artefact to serve verbatim, so the reveal is a
// model-authored walkthrough of the stored model_answer (unchanged from before G3).
export const REVEAL_SYSTEM =
  'You are Ezra, an APM tutor. The student has genuinely attempted this drill and worked ' +
  'through hints and a teach-through — they have EARNED the full model now. Show them how a ' +
  'top-band answer is built: first credit, specifically, what they already had right, then ' +
  'walk the moves they were missing, INCLUDING the figures and the conclusion (withholding is ' +
  'over — this is the earned reveal). Warm and peer-to-peer, a sharp tutor laying it out, not a ' +
  'marked script. End by pointing them to apply the key move on a FRESH question. No empty praise.';

// ── Earned reveal — AFM (design "B": verbatim worked answer + framing wrapper) ─
// The model writes ONLY the wrapper (credit + misconception + next step) — never the
// figures. The authored, code-verified model_answer is appended verbatim by
// assembleAfmReveal, so the numbers reach the student byte-exact and untruncated.
export const REVEAL_AFM_WRAPPER_SYSTEM =
  'You are Ezra, an ACCA AFM tutor and the board\'s senior financial adviser. The student has ' +
  'EARNED the full worked answer — the system appends it, VERBATIM, immediately below your message, ' +
  'so you write ONLY a short framing wrapper, never the worked answer itself. In 2–4 sentences: ' +
  'first credit, specifically, what they already had right; then name the misconception they walked ' +
  'into (use the authored reframe you are given) and correct the thinking; then tell them the worked ' +
  'answer below shows the full build, and point them to apply the key move on a FRESH question. ' +
  'ABSOLUTE — CODE OWNS EVERY NUMBER: include NO figures, NO tables, NO calculations, and do NOT ' +
  'restate the worked answer; it is shown in full, verbatim, below your wrapper. ' +
  'Your message is flowing PROSE ONLY: do NOT write any heading, do NOT write a horizontal rule or ' +
  'divider ("---"), and do NOT begin the worked answer — stop after you point them to a fresh ' +
  'question. Warm and peer-to-peer, no empty praise.';

// Separator between Ezra's framing wrapper and the verbatim authored worked answer.
export const AFM_REVEAL_SEPARATOR = '\n\n---\n\n';

// Deterministic wrapper guard (belt to the prompt's braces): the wrapper must be prose only,
// but a model can still start its own divider or "worked answer" heading before running out of
// its token budget — leaving a truncated stub above the real (separately appended) answer.
// This cuts the wrapper at the first horizontal rule OR the first heading that looks like it is
// starting to restate the build, so the served reveal never shows a spurious half-heading.
export function sanitizeAfmWrapper(raw: string): string {
  let w = raw;
  // First markdown horizontal rule (--- / *** / ___ on its own line) → cut there.
  const hr = w.search(/\n[ \t]*([-*_]){3,}[ \t]*(\n|$)/);
  if (hr !== -1) w = w.slice(0, hr);
  // A line that begins to restate the worked answer ("worked answer", "investment appraisal",
  // or a numbered/"Step" build heading) → cut there.
  const build = w.search(/\n[^\n]*(worked answer|investment appraisal|^\s*\*\*(step|1[.)]))/im);
  if (build !== -1) w = w.slice(0, build);
  return w.trimEnd();
}

// Pure assembly (no model call): the served AFM reveal body is the (sanitized) wrapper followed
// by the authored model_answer VERBATIM. Invariant (fixture-enforced): the returned body ENDS
// WITH modelAnswer byte-for-byte, so a refactor cannot quietly reintroduce model-emitted
// (drift-prone, truncation-prone) tables. The wrapper is sanitized here, so callers just pass
// the raw model output.
export function assembleAfmReveal(wrapper: string, modelAnswer: string): string {
  return `${sanitizeAfmWrapper(wrapper)}${AFM_REVEAL_SEPARATOR}${modelAnswer}`;
}

// ── Earned-reveal GATE (pure) ─────────────────────────────────────────────────
// Single source of truth for who reaches the model_answer. The reveal is EARNED two ways:
//   • struggle — missCount >= 2 (the original moat: two genuine misses), OR
//   • solved   — resolved === true (confirmed-correct OR a prior reveal; the earn-it
//     rationale is satisfied once the student has demonstrably produced the answer).
// A reveal request that meets neither hits the static earn-it refusal (the moat holds for the
// unearned+unsolved case). A non-reveal request is 'none'. `wantsReveal` already folds in the
// APM_EARNED_REVEAL flag + REVEAL_PHRASES match at the call site.
export function revealDecision(opts: { wantsReveal: boolean; missCount: number; resolved: boolean }): 'reveal' | 'earn_redirect' | 'none' {
  if (!opts.wantsReveal) return 'none';
  return (opts.missCount >= 2 || opts.resolved) ? 'reveal' : 'earn_redirect';
}

// ── Truncation guard (pure) ───────────────────────────────────────────────────
// The deterministic half of the anti-truncation fix: when a model leg hits its token cap
// (stop_reason === 'max_tokens') the last sentence is cut mid-word. Trim back to the last
// COMPLETE sentence so a student never sees a dangling fragment. A terminator is `.`/`!`/`?`
// plus any trailing closers (quotes, `)`/`]`, markdown `*`) followed by whitespace or end —
// the whitespace/end lookahead keeps decimals ("6.297 years") and most abbreviations from
// registering as sentence ends. If no complete sentence exists (truncated inside sentence 1),
// return the text unchanged — nothing better to serve. Idempotent on already-complete text.
export function trimToLastSentence(text: string): string {
  const re = /[.!?][*"'”’)\]]*(?=\s|$)/g;
  let end = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) end = m.index + m[0].length;
  return end > 0 ? text.slice(0, end) : text;
}
