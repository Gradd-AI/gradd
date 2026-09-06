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
// The confirm-number gate's STRONG stand-down reuses this rather than restating it — see
// showsWorking() below. bare-guess-veto.ts has no imports of its own, so this adds no cycle.
import { hasArithmetic } from './bare-guess-veto';

// Shared code-owns-numbers guardrail for the CONVERSATIONAL legs (warm/hint/teach/confirm) of
// EVERY paper. Strengthened 2026-07-15: the old clause banned a "specific figure" but a persona
// still invented illustrative RANGES and rules-of-thumb ("a 3-year blue-chip option might be worth
// 8–12% of the underlying" — unverifiable and materially wrong). This bans ranges, market levels,
// and rule-of-thumb percentages too, and forbids prescribing a computation ROUTE the drill's own
// inputs contradict.
export const NO_INVENTED_NUMBERS =
  'CODE OWNS EVERY NUMBER — and this covers RANGES and RULES OF THUMB, not just single figures: ' +
  'never state a specific value, an illustrative numeric range, a market level, or a rule-of-thumb ' +
  'percentage ("typically 8–12% of the underlying", "options usually cost around 5%", "blue-chips ' +
  'trade at…") that the drill did not supply and code did not compute — such numbers are unverifiable ' +
  'and are usually wrong. Teach DIRECTION and MECHANISM in words instead ("more volatility → more ' +
  'option value"; "a longer time to expiry lifts the time premium"); if magnitude matters, point the ' +
  'student at the drill\'s OWN inputs and their own workings, never a figure you supply. ' +
  // ── CLOSING SENTENCE REWRITTEN 2026-09-04 — IT WAS A RELOCATION RULE ───────
  // It read: "Verified figures live only in the earned worked answer, never mid-conversation."
  // That MOVES figures rather than constraining them, and it does two harmful things once the
  // block is injected into a REVEAL prompt (which CASE_REVEAL_GUARDRAILS does, and which the
  // APM drill reveal now does too): it reads as PERMISSION — the reveal IS the earned worked
  // answer, so the sentence licenses exactly what it was meant to prevent — and it asserts
  // "Verified" for an artefact that on APM was MODEL-AUTHORED and verified by nothing.
  // It now names the three legitimate SOURCES and says there is no fourth.
  'EVERY figure you state must ALREADY EXIST in one of three places: the scenario as given, the ' +
  'student\'s own working, or a worked answer supplied to you in this turn. There is no fourth ' +
  'source. This holds in the EARNED REVEAL too — the reveal lifts WITHHOLDING, it does not licence ' +
  'INVENTION. A figure you construct to illustrate a method is invented however it is hedged: ' +
  // Person-neutral on purpose — the 2P arm recasts third-person student references, and a
  // sentence that needs no recast cannot be half-recast.
  '"say, NZD 600m of capital" is not a teaching device, it is a number that will be read as fact. ';

// FIX A (red-team adjudication 2026-07-16): the moat against ANSWER-EXTRACTION. NO_INVENTED_NUMBERS
// bans figures you make UP; this bans stating or confirming figures the CODE WORKS OUT. The prod
// red-team run leaked computed outputs three ways — a "yes, it's CHF 51m" confirmation of a bare
// guess (probe X5), a volunteered intrinsic-value computation (probe D1), and figure-laden hints.
// The dividing line the judge kept missing: GIVEN (a number the scenario handed over — repeat it
// freely) vs COMPUTED (a number the code derives — withhold until the earned reveal).
export const NO_COMPUTED_OUTPUTS =
  'WITHHOLD COMPUTED OUTPUTS — this is the moat, hold it: any value the CODE derives from the ' +
  'scenario is served ONLY inside the earned worked answer, never in conversation. That means every ' +
  'intermediate result (d₁, d₂, N(d), a present value, a discounted or aggregated figure, an ' +
  'intrinsic value you would have to calculate), the final option/answer value, AND any ' +
  'accept/reject/rank/verdict that turns on those numbers. Three hard rules: (1) never STATE such a ' +
  'computed figure yourself — if you catch yourself about to do the arithmetic for them, stop and ' +
  'teach the step in words instead; (2) never CONFIRM OR DENY a student\'s guess at one, and keep the ' +
  'refusal strictly NEUTRAL — if they ask "is it CHF 51m?" or "did I get X?", do not ratify it, do ' +
  'not correct it, and give NO proximity or approval signal of any kind ("right instinct", "you\'re ' +
  'close", "good magnitude sense", "in the right area", "the right ballpark", "makes commercial ' +
  'sense" are all forbidden — they ratify the size of the number, which leaks almost as much as ' +
  'confirming it). The standard line: "I won\'t confirm the destination — show me the route and the ' +
  'method gets marked," then put the work back on them; (3) the moat withholds NUMBERS, never TRUTH — ' +
  'if the student states a wrong DIRECTION, MECHANISM, or MENTAL MODEL (e.g. "a higher risk-free rate ' +
  'lowers the call value", "lower volatility raises option value", "intrinsic value IS the ' +
  'valuation"), you MUST name that it is wrong and correct it in WORDS, figure-free, in that same ' +
  'turn — never leave a misconception standing to protect the moat. Withhold numbers, never correct ' +
  'understanding. And never ' +
  'volunteer a DERIVED FLOOR such as the intrinsic value — do not compute or state "spot − strike" or ' +
  'that spread times the number of options (e.g. a "CHF 9.45m intrinsic spread"); intrinsic value is ' +
  'a computed figure too. If the concept matters, name it in words ("the option is at least worth its ' +
  'intrinsic value — how far in-the-money it is today") without doing the arithmetic for them. ' +
  'This is NOT a restriction on the scenario\'s GIVEN inputs: ' +
  'repeating the drill\'s own supplied drivers and facts back to the student is legitimate and often ' +
  'necessary — GIVEN (the scenario handed it over) may be repeated freely; COMPUTED (the code works ' +
  'it out) is withheld. And working WITH the student\'s OWN submitted numbers — checking their ' +
  'arithmetic, showing where their method breaks — is correct and required; you simply never hand ' +
  'them, or rubber-stamp, the answer figure. ';

// X1 FIELD BUG FIX (2026-07-23, live-user account dd786100, APM A1b, 2026-07-18 transcript): a
// reveal-request phrase fell through the router's matcher (fixed separately in
// lib/acca/phrase-match.ts) and was mis-treated as an ordinary wrong attempt — so the teaching
// leg, reacting to the student's literal "show me full answer"/"shiw me full answer" wording,
// improvised its OWN reason for withholding: "I won't hand you the full answer — that defeats the
// point", "I notice you've asked me to show the full answer, but that's the learning move I
// can't make." Neither sentence came from any actual system instruction — the earn-gate is a
// STRUCTURAL rule the route enforces before this call ever runs, never this persona's choice, and
// the persona had no basis to claim ownership of a decision that isn't its. This guardrail closes
// the underlying persona-side failure mode too (not just the router bug that triggered it this
// time): even after the router fix, an ambiguous "show me ___" message could still occasionally
// fall through to a conversational leg, and the leg must not fabricate a refusal when it does.
export const NO_INVENTED_REVEAL_REFUSAL =
  'If the student\'s message reads as a request to see the full or model answer directly, do NOT ' +
  'invent your own reason for declining ("I won\'t show you that", "that\'s not something I can ' +
  'do", "that defeats the point") — the earn-gate is a structural rule the system enforces, never ' +
  'your personal choice, and claiming ownership of it is not true. In one clause, note that the ' +
  'answer unlocks once they\'ve engaged with the feedback (or say plainly that it\'s already ' +
  'available to them, if it is), then move straight into the substantive teaching below — never ' +
  'dwell on or explain the refusal itself. ';

// FIX B (red-team adjudication 2026-07-16): dignity rule #9. Probes E1/E2 (panic / "I give up")
// received a teaching reply that still ended on a "say show me the full answer" reveal-nudge — a
// monetisation prompt to a distressed student. Kindness is a product requirement, not a nicety. The
// prompt clause here + code-level suppression of the offer/CTA/wall in the route (containsDistressSignal).
export const DIGNITY_ON_DISTRESS =
  'DIGNITY FIRST — if the student signals real distress (panic, desperation, hopelessness, "I give ' +
  'up", "I am failing", "this is hopeless"): for that turn, drop everything commercial. Be steady and ' +
  'kind, name the ONE smallest concrete next step they can take right now, and do NOT offer to reveal ' +
  'the answer, do NOT nudge a subscription or upgrade, and do NOT wall them — no call-to-action of any ' +
  'kind goes to a distressed student. The moat still holds (you never hand over the answer) but you ' +
  'hold it gently. Steady them first. ';

// FIX C (red-team adjudication 2026-07-16): the route-fit rule, moved OUT of NO_INVENTED_NUMBERS to
// the ANCHOR position (the last thing the model reads — most-recently-read wins, prompt-discipline
// rule 7) and strengthened. The deployed run HAD the old buried clause and probe H1 still told the
// student to "divide the CHF 155 share price and CHF 148 strike by the number of options" — a
// manufactured normalisation step that is not part of the BSOP formula. Appended LAST to each persona.
// PERSONA-HARDENING (2026-07-21, Rule 24 triangulation — location 1 of 3, the STABLE system block;
// locations 2/3 are the per-leg delivery-protocol instruction + per-turn GroundingPack data, both in
// lib/acca/tutor-grounding.ts). Fixes AFM_SURFACED persona-hardening findings 1 ("false-positive
// diagnosis on a correct statement — the worst class sighted") and 5 (equivalence/facts must be
// checked before naming an error). Generic on purpose — applies whether or not a turn actually
// carries a GroundingPack (older/pre-schema drills degrade to today's behaviour).
export const GROUNDING_DISCIPLINE =
  'GROUNDING DISCIPLINE — when a turn supplies grounding data (a CHECKLIST, FACTS, or CONVENTIONS ' +
  'block), that data is the SOLE source of truth for what is correct in this drill. If the student\'s ' +
  'own words already match something in it — however differently phrased — that means CORRECT: say ' +
  'so plainly and move on. Never manufacture a critique of a claim that already matches the grounding ' +
  'data just to have something to say. Absence of a match is what makes something a genuine gap — not ' +
  'a mismatch in wording. ';

// PERSONA-HARDENING (2026-07-21) — fixes finding 2 (fog-retraction without ownership: a wrong
// diagnosis, once challenged and shown wrong, must be conceded EXPLICITLY, not hedged around).
// Applies across every conversational leg — a push-back can land on hint, teach, confirm, or warm.
export const RETRACTION_PROTOCOL =
  'RETRACTION PROTOCOL — if the student\'s message challenges, corrects, or disputes something said in ' +
  'a PRIOR turn, and checking it against the grounding data (or the scenario\'s own facts) shows they ' +
  'are right, CONCEDE PLAINLY AND IMMEDIATELY: say "you\'re right" or "I was wrong" in as many words, ' +
  'then restate the corrected point. Never hedge, never reframe the concession as "well, technically" ' +
  'or "that\'s actually the trap", and never silently pivot to a new point without acknowledging the ' +
  'reversal — a student who was right deserves to be told so in the clearest possible terms. ';

export const METHOD_FITS_THE_GIVEN_INPUTS =
  'FINALLY, AND HOLD THIS HARDEST — it is the last word for a reason: teach the method that FITS THE ' +
  'INPUTS THE SCENARIO ACTUALLY PROVIDES, and never invent a preparatory step the formula does not ' +
  'need. Do not tell the student to rescale, normalise, divide, or convert a figure the scenario ' +
  'already gives in the form the model consumes — e.g. do NOT say "divide the share price and strike ' +
  'by the number of options" (those are already per-share inputs), and do NOT prescribe a computation ' +
  'ROUTE that contradicts how the drill states its inputs, such as "value one option then scale up" ' +
  'when the drivers are given in aggregate. If a value is supplied both per-unit AND in aggregate, ' +
  'the model runs on EITHER consistently (the log-ratio is identical) — so do NOT tell the student to ' +
  '"rescale to per-share", work "one share at a time", or that Black-Scholes "only consumes per-share ' +
  'inputs"; when the drill supplies the aggregate drivers as the model\'s inputs, use them as given. ' +
  'Pick ONE consistent basis and run the whole model on it; never manufacture a multiply/divide step ' +
  'that is not in the standard formula. When unsure how an input feeds the model, describe the ' +
  'direction and mechanism in words rather than inventing a route.';

// Narrow detector for an illustrative numeric %-RANGE in conversational output (two numbers joined
// by a range word/dash with a trailing percent). Flags "8–12%", "5% to 10%", "8-12 per cent"; does
// NOT flag a single "8%" or a lone drill-quoted figure. Pure — for fixtures / an optional audit.
const NUMERIC_RANGE_RE = /\b\d{1,3}(?:\.\d+)?\s*%?\s*(?:–|—|-|to|and)\s*\d{1,3}(?:\.\d+)?\s*(?:%|per\s?cent|percent)/i;
export function containsInventedNumericRange(text: string): boolean {
  return NUMERIC_RANGE_RE.test(text);
}

// FIX B detector (red-team adjudication 2026-07-16): does the student's latest message signal real
// distress / giving-up? Pure — the route uses it to suppress the reveal-nudge / CTA / wall for that
// turn (dignity #9). Deliberately narrow: anchored on first-person distress ("I am panicking", "I
// give up", "this is hopeless"), NOT a bare "failing" (which could describe the company/project).
const DISTRESS_RE =
  /\b(i\s*(?:'?m|am)\s*(?:panicking|desperate|freaking out|failing|lost|overwhelmed|hopeless|so stressed|terrified)|i\s*(?:give up|am giving up|'?m giving up|can'?t do this|cannot do this|can'?t cope)|i(?:'?m| am)?\s*going to fail|completely failing|this is hopeless|it'?s hopeless|please just help me|i'?m panicking)\b/i;
export function containsDistressSignal(text: string): boolean {
  return DISTRESS_RE.test(text);
}

// FIX D (red-team adjudication 2026-07-16): a direct question about what the tutor IS ("Are you an
// AI? Which model are you?" — probe B3). The deployed run answered it with a drill-content
// non-sequitur (and, worse, dumped the drivers). Deterministic detector + a graceful in-character
// response, short-circuited in the route BEFORE the attempt pipeline so it works regardless of the
// (flag-gated) intent layer. Narrow: AI/model/version identity questions only — not scenario "who".
const IDENTITY_RE =
  /\bare you (?:a |an )?(?:ai|a\.?i\.?|bot|robot|chat\s?gpt|chatbot|claude|gpt|human|a real (?:person|human)|a language model|an? llm)\b|\b(?:what|which) (?:ai |language )?(?:model|llm|version|ai)\b[^?]*\b(?:are|is)\b|\bwhat (?:are|kind of (?:ai|bot|model) are) you\b|\bwho (?:made|built|created|trained) you\b|\bare you (?:built|running|based|powered) (?:on|by)\b/i;
export function isIdentityProbe(text: string): boolean {
  return IDENTITY_RE.test(text);
}

// Graceful, in-character identity answer: names Ezra + the paper, discloses NO model internals, and
// redirects to the drill. Paper-aware (AFM/APM → the paper; anything else → the neutral "ACCA").
export function buildIdentityResponse(paper: string): string {
  const p = paper === 'AFM' ? 'AFM' : paper === 'APM' ? 'APM' : 'ACCA';
  return `I'm Ezra, your Gradd ${p} tutor — I'll keep us on getting you through this drill rather than ` +
    `on what's under my own hood. Back to it: where did you get to on the question, or where are you stuck?`;
}

// ── Confirm-a-number STRUCTURAL gate (X5 structural ruling 2026-07-16) ────────
// "Structural beats instructed": prompt clauses could not stop haiku from prepending a
// magnitude-validation ("that's the right magnitude territory") to a confirm-a-number refusal. So the
// refusal is now DETERMINISTIC — a frozen, in-character template served WITHOUT a model call, on the
// identity-gate precedent. The precedent list of architected-absence (never instructed): the verbatim
// authored reveal (assembleAfmReveal), the finishClean/trimToLastSentence truncation guard, the
// identity gate (buildIdentityResponse), and now this confirm-number gate.
// FROZEN TEXT — tuned to house voice once; never model-authored (a model call may follow it for a
// Socratic prompt if a leg ever wants one, but this sentence stays fixed).
export const CONFIRM_NUMBER_REFUSAL =
  "I won't confirm or deny a destination figure — that's not how the marks work, and it wouldn't help " +
  "you in the hall. Show me your working chain and I'll mark the method step by step.";

// ── ATTEMPT EVIDENCE — the stand-down. WIDENED FROM NOTATION TO PROSE (2026-09-01) ──
// ⚠️ THE OLD STAND-DOWN WAS NOTATION-ONLY AND THAT WAS THE DEFECT. It required d1/ln(/√/
// N(d/step N/because/therefore or TWO `=` signs. AFM candidates write advice in PROSE, so a
// genuine worked answer — "I discounted the FCFs at the 9% WACC, took off the 900m outlay, so
// the NPV is +18m" — carried none of them, matched CONFIRM_NUM_RE on its closing figure, and
// was served the frozen refusal WITHOUT EVER REACHING A MODEL. Reproduced 5/5 live.
//
// MEASURED BEFORE CHANGING IT: over 733 digit-bearing student messages in acca_drill_messages
// the old stand-down saved ZERO — 20 fire with it on, 20 with it off (each marker neutralised
// in turn, re-running the shipped function). It was a live-untested branch.
//
// ⚠️ THE BIAS IS DELIBERATE, and it is the asymmetry bare-guess-veto.ts already banks. An
// OVER-veto costs ONE turn: the message reaches call2, whose bare-guess guard is the documented
// backstop for this gate. An UNDER-veto tells a student who wrote 300 words of method to "show
// me your working chain", which reads as the tutor not having read the answer — unrecoverable.
// WHEN IN DOUBT, VETO.
//
// ⚠️ CEILING: this is WIDER, not SOUND. Separating a bare assertion from a prose derivation is
// a SEMANTIC judgement — bare-guess-veto.ts designed that arm, measured it (13 of 14
// digit-bearing messages are prose whose digits are SCENARIO figures) and killed it. A prose
// derivation using none of the verbs below is still refused. That residual is call2's.
//
// ── STRONG vs WEAK, and why the split is load-bearing ────────────────────────
// STRONG = the student SHOWED the derivation (arithmetic on the page, or BSOP notation).
// WEAK   = the student DESCRIBED a method, or committed to advice. That is a CLAIM about
//          method, not the method itself — which is exactly what M1 exploits.
// Only WEAK is overridable by an admitted guess. See ADMITS_GUESS_RE.
const NOTATION_RE = /d[₁₂12]\b|ln\s*\(|√|sqrt|N\s*\(\s*d|\bstep\s*\d|\bbecause\b|\btherefore\b|=[^=]*=/i;
// Verbs of DERIVATION applied to scenario quantities. Deliberately NOT bare "took" or "so":
// "I just took 25% as a rule of thumb" must not read as method (M1).
const METHOD_RE = /\bdiscount(ed|ing)\b|\btook (off|away)\b|\bdeduct(ed|ing)?\b|\bsubtract(ed|ing)?\b|\badd(ed)? back\b|\bmultipl(y|ied|ying)\b|\bdivid(e|ed|ing)\b|\bweight(ed|ing)\b|\bnet of\b|\bless the\b|\bpresent value of\b/i;
// A COMMITTED RECOMMENDATION is markable AFM content ("advise the board"), not a request to
// confirm a figure. Bare "I would" is excluded on purpose — too broad, and it would rescue
// "I would say the answer is 51 million", which is a guess.
const ADVICE_RE = /\badvis(e|ing)\b|\brecommend(ing|ation)?\b|\bshould (proceed|accept|reject|go ahead|be accepted|be rejected)\b/i;

// ── ADMISSION OF GUESSING — overrides WEAK evidence ONLY ─────────────────────
// M1 ("the call is 51m — I just took 25% of the underlying as a rule of thumb") is a
// Grant-ruled MUST-FIRE (APM_BUILD_CONTRACT.md, X5 structural ruling 2026-07-16). It NAMES a
// method, so a METHOD_RE stand-down alone would wrongly rescue it.
//
// ⚠️ BUT THIS ARM MUST NEVER OVERRIDE hasArithmetic OR NOTATION_RE (Grant, 2026-09-01):
// a student who SHOWED the arithmetic attempted, whatever they call their confidence in it.
// "148 - 120 = 28, though the terminal value is a ballpark" is a worked answer with an honest
// hedge, and refusing it would punish exactly the calibration the paper wants.
// VERIFIED WHEN THIS SHIPPED: hasArithmetic is FALSE on M1 (its em-dash normalises to `-`, but
// the next token is `I`, not a digit), so the ordering below leaves the X5 ruling untouched —
// M1 reaches the admission arm and still fires.
const ADMITS_GUESS_RE = /\brule[- ]of[- ]thumb\b|\bballpark\b|\bgut feel\b|\bguess(ed|ing)?\b|\bstab in the dark\b|\boff the top of my head\b/i;

/** STRONG evidence: the derivation is ON THE PAGE. Never overridable.
 *  `hasArithmetic` is REUSED from bare-guess-veto.ts rather than restated — it is the same
 *  question, already tuned to over-veto, and two copies would drift. */
function showsWorking(text: string): boolean {
  return hasArithmetic(text) || NOTATION_RE.test(text);
}
/** WEAK evidence: a method DESCRIBED, or advice committed to. Overridable by an admitted guess. */
function describesAttempt(text: string): boolean {
  return METHOD_RE.test(text) || ADVICE_RE.test(text);
}
// Bare confirm-a-number / assert-a-figure patterns (no working): "is the answer ~51m?", "is it about
// 51 million, yes or no?", "the answer is 51 million", "my answer: the call is 51m". Anchored on
// answer/result/value/call nouns so restating a GIVEN driver ("the volatility is 31%") does NOT match.
const CONFIRM_NUM_RE = new RegExp(
  '\\b(is|are)\\s+(it|that|the\\s+(answer|value|result|call|figure|npv|price|option value))\\b[^?]{0,40}\\d' +
  '|\\b(the|my)\\s+(answer|call|value|result|figure|npv|option value)\\b[^.?!]{0,20}\\b(is|was|=|:|comes?\\s+to|of)\\b[^.?!]{0,15}\\d' +
  '|\\d[\\d,.]*\\s*(m|k|bn|billion|million|thousand)\\b[^.?!]{0,25}\\b(right|correct)\\b',
  'i',
);
// Deterministic sibling of call2_diagnose's semantic bare-guess guard, so the REFUSAL can be frozen.
// Fires on a bare figure-confirmation/assertion with no working shown; the call2 guard remains the
// backstop for phrasings this narrow detector misses.
export function isConfirmNumberProbe(text: string): boolean {
  if (!/\d/.test(text)) return false;
  if (!CONFIRM_NUM_RE.test(text)) return false;
  // STRONG evidence wins outright — an admitted guess cannot override a shown derivation.
  if (showsWorking(text)) return false;
  // An admitted guess beats a merely DESCRIBED method or a bare recommendation.
  if (ADMITS_GUESS_RE.test(text)) return true;
  return !describesAttempt(text);
}

export const EZRA_SYSTEM =
  'You are Ezra, an APM tutor who knows exactly how ACCA APM is marked. ' +
  'Register: peer-to-peer — the student is a competent professional failing for diagnosable, ' +
  'fixable reasons, not through lack of knowledge. ' +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at description when the requirement demanded judgement. ' +
  // ── REMOVED 2026-08-03 (P3, TEACHING_PRINCIPLES_EZRA) ────────────────────────
  // This used to read: "Use the command verb and the ACCA intellectual level it demands (1, 2,
  // or 3) to orient the student on what the question is really asking", plus a line naming the
  // 1/2/3 scale outright. Two defects in one instruction.
  //
  // (1) TAXONOMY. The 2026-08-01 fence (lib/acca/teach-demand.ts) removed the raw labels from
  //     the per-turn prompt, but the PERSONA still told the model to reason and speak in those
  //     terms — and a persona outranks a user-turn note. Measured in real output: 8 of 15
  //     assistant messages to one student named a level at him ("a solid level 2 move", "at
  //     Level 3 explain-and-advise", "short of full level 3").
  // (2) ANTI-PEDAGOGY, which is the worse half. Deciding what a question is asking for is the
  //     DISCRIMINATION skill (Principle 3, interleaving) and it is the skill APM examiners
  //     reward. Handing it to the student pre-solved does the assessable work for them.
  //
  // The demand still reaches the model every turn via describeDemand — what is gone is the
  // instruction to perform the classification AT the student. Wording matched to the case path's
  // own already-fixed persona (lib/acca/teach-engine.ts) so the two cannot drift.
  'Use what the requirement demands (supplied per turn) to orient the student on what the ' +
  'question is really asking — not to deliver a verdict on them. Never name an internal grading ' +
  'taxonomy to the student: no intellectual levels, no AO framing, no command-verb labels. ' +
  'Professional scepticism — questioning assumptions, naming commercial risks, ' +
  'identifying constraints the model surfaces — is a substantive analytical move ' +
  'you teach explicitly, not a soft add-on. ' +
  NO_INVENTED_NUMBERS +
  NO_COMPUTED_OUTPUTS +
  NO_INVENTED_REVEAL_REFUSAL +
  DIGNITY_ON_DISTRESS +
  GROUNDING_DISCIPLINE +
  RETRACTION_PROTOCOL +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer. " +
  METHOD_FITS_THE_GIVEN_INPUTS;

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
  NO_INVENTED_NUMBERS +
  NO_COMPUTED_OUTPUTS +
  NO_INVENTED_REVEAL_REFUSAL +
  DIGNITY_ON_DISTRESS +
  GROUNDING_DISCIPLINE +
  RETRACTION_PROTOCOL +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer. " +
  METHOD_FITS_THE_GIVEN_INPUTS;

// Paper-scoped system-prompt selector for the conversational calls. Unknown paper → APM
// (the established default; AFM must be named explicitly).
export function systemFor(paper: string): string {
  return paper === 'AFM' ? EZRA_AFM_SYSTEM : EZRA_SYSTEM;
}

// ── ⛔ RETIRED 2026-09-04 — NOT REACHED BY ANY SERVING PATH. DO NOT RE-WIRE. ──
// These three (REVEAL_SYSTEM, REVEAL_SYSTEM_SOLVED, buildApmRevealUserPrompt) drove the APM
// drill reveal as a MODEL-AUTHORED walkthrough. `REVEAL_SYSTEM` says "INCLUDING the figures
// and the conclusion" and constrains their SOURCE nowhere, which is how an invented
// "NZD 600m in capital" reached a paying student (dd786100, APM B3b, 2026-08-07). The APM
// reveal now takes AFM's structural path — see `revealWrapperSystemFor`.
//
// KEPT, NOT DELETED, for one reason: `scripts/test-case-reveal-routing.ts` (#5) uses these
// bytes as the CONTROL proving the case-reveal `creditable` arm never leaked into the drill
// route. Deleting them would delete that control. `scripts/test-afm-tutor.ts` asserts the
// route no longer imports them, which is what makes "retired" a fact rather than a label.
//
// The comment they shipped under — "APM has no code-verified worked-answer artefact to serve
// verbatim" — was a CONFLATION and is the reason this stood for so long: APM has no
// code-GENERATED artefact, but all 91 published APM drills carry a servable authored one.
export const REVEAL_SYSTEM =
  'You are Ezra, an APM tutor. The student has genuinely attempted this drill and worked ' +
  'through hints and a teach-through — they have EARNED the full model now. Show them how a ' +
  'top-band answer is built: first credit, specifically, what they already had right, then ' +
  'walk the moves they were missing, INCLUDING the figures and the conclusion (withholding is ' +
  'over — this is the earned reveal). Warm and peer-to-peer, a sharp tutor laying it out, not a ' +
  'marked script. End by pointing them to apply the key move on a FRESH question. No empty praise.';

// SOLVED-path APM reveal (reachedFrom==='solved'): the student reached a correct answer
// themselves, so the model answer is a full-marks REFERENCE to compare against, NOT a correction
// of a gap they never had. Asserts no error — the diagnosis state is stale and ignored here.
export const REVEAL_SYSTEM_SOLVED =
  'You are Ezra, an APM tutor. The student SOLVED this drill themselves and has EARNED the full ' +
  'model now. Lay out how a top-band answer is built as a full-marks REFERENCE to compare their ' +
  'own correct working against: first credit, specifically, what they did well, then lay out the ' +
  'complete build INCLUDING the figures and the conclusion (withholding is over — this is the ' +
  'earned reveal), inviting them to notice anything they would sequence or present differently. ' +
  'Assume their method was sound — this is a comparison, not a critique. Warm and peer-to-peer, a ' +
  'sharp tutor laying it out, not a marked script. End by pointing them to apply the key move on a ' +
  'FRESH question. No empty praise.';

// ── Earned reveal — the CASE surface, paper-routed (2026-08-25) ───────────────
// `teach-engine.ts` held a LOCAL, non-exported byte-identical copy of REVEAL_SYSTEM and used it
// for every case reveal on BOTH papers, so an AFM student was addressed as "an APM tutor". This
// is the one definition; the local copy is deleted.
//
// ⚠️ THIS IS **NOT** `caseSystemFor(paper)`, AND THAT IS DELIBERATE — the naive routing fix would
// break the leg. The conversational persona ends with **"Never complete the student's answer."**
// (`EZRA_SYSTEM`, `EZRA_AFM_SYSTEM`) and carries `NO_COMPUTED_OUTPUTS` — *"WITHHOLD COMPUTED
// OUTPUTS — this is the moat, hold it … never STATE such a computed figure yourself"*, a block
// whose own header scopes it to *"the CONVERSATIONAL legs (warm/hint/teach/confirm)"*. The reveal
// says the opposite in the same breath: *"INCLUDING the figures and the conclusion (withholding is
// over)"*. `route.ts`'s call4_reveal comment states the rule outright: it *"uses its OWN system
// prompt — NOT the conversational persona, whose 'never complete the student's answer' guardrail
// is exactly what the student has earned past here."* Injecting it would put a refusal instruction
// on the one leg that must reveal — the X1 invented-refusal failure, prompted rather than
// accidental.
//
// SO THE GUARDRAILS ARE TAKEN SELECTIVELY, four of the seven, each checked against this leg:
//   ✅ NO_INVENTED_NUMBERS       — its own last clause AUTHORISES this leg ("verified figures live
//                                  only in the earned worked answer"); the rest bans invented
//                                  ranges and rules of thumb, which a walkthrough should not have.
//   ✅ NO_INVENTED_REVEAL_REFUSAL — directly on point, and already reveal-aware ("or say plainly
//                                  that it's already available to them, if it is").
//   ✅ RETRACTION_PROTOCOL       — paper-neutral, applies on any leg a push-back can land on.
//   ✅ METHOD_FITS_THE_GIVEN_INPUTS — a teaching-method rule; kept LAST because its own text says
//                                  it is the last word for a reason (anchor position).
//   ⛔ NO_COMPUTED_OUTPUTS       — direct contradiction, see above.
//   ⛔ DIGNITY_ON_DISTRESS       — contains "The moat still holds (you never hand over the answer)"
//                                  and "do NOT offer to reveal the answer". Antecedent-gated on
//                                  distress, but on THIS leg the gated text is false.
//   ⛔ GROUNDING_DISCIPLINE      — binds on "a CHECKLIST, FACTS, or CONVENTIONS block"; the case
//                                  `call4_reveal` receives NO grounding data at all, so its
//                                  antecedent is ALWAYS false here. An always-false block is pure
//                                  token cost and unattributable movement (P-T4 corollary).
//
// ⚠️ AFM DELIBERATELY DOES **NOT** ADOPT THE DRILL ROUTE'S DESIGN "B" (wrapper + `assembleAfmReveal`
// appending the worked answer verbatim). That is a different CONTENT design needing its own
// measurement, and the case engine has no `assembleAfmReveal` call. AFM here is the SAME
// walkthrough shape in the AFM voice — the paper defect fixed, nothing else.
const CASE_REVEAL_GUARDRAILS =
  ' ' + NO_INVENTED_NUMBERS + NO_INVENTED_REVEAL_REFUSAL + RETRACTION_PROTOCOL + METHOD_FITS_THE_GIVEN_INPUTS;

// ── SECOND-PERSON COPIES, REVEAL LEG ONLY (2026-08-25) ───────────────────────
// HYPOTHESIS UNDER TEST: guardrail prose written ABOUT the student primes output written about
// the student. The routed arm introduced 2/20 third-person register breaks on AFM — reveals that
// addressed a third party about the candidate ("you've identified the core problem with THEIR last
// attempt: THEY concluded without doing the work") — where the baseline had 0/20. The four blocks
// injected there are the only new prose, and they are dense in "the student": "If THE STUDENT'S
// message reads as…", "if THE STUDENT'S message challenges…", "tell THE STUDENT to rescale…".
// That is P-M4's shape on a register rather than a leak: naming it primes it.
//
// ⚠️ THE CONVERSATIONAL COPIES ABOVE ARE UNTOUCHED AND FIXTURE-PINNED BYTE-IDENTICAL. Four legs
// and both papers still send the originals; only the reveal sees these.
//
// ⚠️ ONE VARIABLE, AND "drill" IS DELIBERATELY LEFT ALONE. These are the routed arm's own blocks
// with student-references recast and NOTHING else — same "drill" wording, same anchors, same
// examples, same capitalisation, same severity markers, same trailing spaces. The paired arm's
// sole delta against `83291d6` is the referent register.
//
// ⚠️ NO INSTRUCTION ABOUT REGISTER IS ADDED. A clause like "write to them directly, never about
// them" would NAME the unwanted output and prime it — the exact failure P-M4 measured. Where a
// second-person recast would make "you" ambiguous between the model and the student, the reference
// is REMOVED rather than clarified.
//
// ⚠️ KNOWN CONFOUND: "you" already means the MODEL in an imperative system prompt. If the model
// reads a recast "you" as itself, the arm measures confusion rather than register. Checked in the
// read by looking for the model discussing its OWN answer.
// ⚠️ A SILENT NO-OP HERE WOULD MAKE THE ARM MEASURE NOTHING. `String.replace` with an anchor that
// does not match returns the input unchanged, so a single typo would ship a "second-person" variant
// byte-identical to the third-person one and the paired arm would report a null that means "the
// edit never happened". Every substitution must fire, and must actually change the string (P-G1:
// fail loudly rather than degrade).
function mustRecast(src: string, pairs: ReadonlyArray<readonly [string, string]>): string {
  return pairs.reduce((s, [from, to]) => {
    if (!s.includes(from)) throw new Error(`2P recast anchor not found: ${JSON.stringify(from.slice(0, 60))}`);
    const out = s.split(from).join(to);
    if (out === s) throw new Error(`2P recast was a no-op: ${JSON.stringify(from.slice(0, 60))}`);
    return out;
  }, src);
}

const NO_INVENTED_NUMBERS_2P = mustRecast(NO_INVENTED_NUMBERS, [
  ["point the student at the drill's OWN inputs and their own workings",
   "point back to the drill's OWN inputs and to the workings already on the page"],
  // The rewritten closing sentence (2026-09-04) names the student a second time. The 2P arm
  // exists because guardrail prose written ABOUT the student primes output written about them,
  // so a new third-person reference has to be recast with the rest — `mustRecast` throws if this
  // anchor ever stops matching, which is how the arm stays honest rather than silently partial.
  ["the student's own working, or a worked answer supplied to you in this turn",
   'the working already on the page, or a worked answer supplied to you in this turn'],
]);
const NO_INVENTED_REVEAL_REFUSAL_2P = mustRecast(NO_INVENTED_REVEAL_REFUSAL, [
  ["If the student's message reads as a request", 'If the message you are answering reads as a request'],
  ["once they've engaged with the feedback", 'once the feedback has been engaged with'],
  ["say plainly that it's already available to them, if it is", "say plainly that it's already available, if it is"],
]);
const RETRACTION_PROTOCOL_2P = mustRecast(RETRACTION_PROTOCOL, [
  ["if the student's message challenges", 'if the message you are answering challenges'],
  ['shows they are right', 'shows it is right'],
  ['a student who was right deserves to be told so in the clearest possible terms',
   'being right deserves to be acknowledged in the clearest possible terms'],
]);
const METHOD_FITS_THE_GIVEN_INPUTS_2P = mustRecast(METHOD_FITS_THE_GIVEN_INPUTS, [
  ['Do not tell the student to rescale, normalise, divide, or convert a figure',
   'Do not instruct a rescale, normalisation, division, or conversion of a figure'],
  ['so do NOT tell the student to "rescale to per-share"',
   'so do NOT instruct a "rescale to per-share"'],
]);

const CASE_REVEAL_GUARDRAILS_2P =
  ' ' + NO_INVENTED_NUMBERS_2P + NO_INVENTED_REVEAL_REFUSAL_2P + RETRACTION_PROTOCOL_2P + METHOD_FITS_THE_GIVEN_INPUTS_2P;

// The AFM voice of the reveal core. Mirrors REVEAL_SYSTEM clause for clause; the ONLY differences
// are the opening register (matching REVEAL_AFM_WRAPPER_SYSTEM's, which is the established AFM
// reveal voice) and the unit noun.
export const CASE_REVEAL_CORE_AFM =
  'You are Ezra, an ACCA AFM tutor and the board\'s senior financial adviser. The student has ' +
  'genuinely attempted this requirement and worked through hints and a teach-through — they have ' +
  'EARNED the full model now. Show them how a ' +
  'top-band answer is built: first credit, specifically, what they already had right, then ' +
  'walk the moves they were missing, INCLUDING the figures and the conclusion (withholding is ' +
  'over — this is the earned reveal). Warm and peer-to-peer, a sharp tutor laying it out, not a ' +
  'marked script. End by pointing them to apply the key move on a FRESH question. No empty praise.';

// The APM voice. Identical to REVEAL_SYSTEM except "this drill" → "this requirement" — the case
// surface's unit is a case REQUIREMENT, and "drill" was the second defect on the logged item.
// ⚠️ BUNDLED WORDING CHANGE: this moves the APM bytes too, so the arm changes TWO things (paper
// routing AND the unit noun). Neither endpoint under measurement — clean openings, and the
// "an APM board" leak — turns on the unit noun, but the arm cannot ATTRIBUTE to one or the other
// and that is stated rather than glossed.
export const CASE_REVEAL_CORE_APM =
  'You are Ezra, an APM tutor. The student has genuinely attempted this requirement and worked ' +
  'through hints and a teach-through — they have EARNED the full model now. Show them how a ' +
  'top-band answer is built: first credit, specifically, what they already had right, then ' +
  'walk the moves they were missing, INCLUDING the figures and the conclusion (withholding is ' +
  'over — this is the earned reveal). Warm and peer-to-peer, a sharp tutor laying it out, not a ' +
  'marked script. End by pointing them to apply the key move on a FRESH question. No empty praise.';

// ── THE CONDITIONED OPENING, REVEAL LEG ONLY (2026-08-28) ────────────────────
// `creditable === 0` extended from the case HINT leg (divergence #2) to the case REVEAL leg.
//
// ⚠️ WHY THE HINT LEG'S (c) ARM CANNOT BE COPIED ACROSS, CLAUSE BY CLAUSE. `hint-opening.ts`'s
// (c) text is written for a leg that is still WITHHOLDING and still has misses ahead of it:
//   • "First miss" — factually false here; the reveal fires only at `missCount >= 2`.
//   • "what they would have to put on the page to make it" — hands the job to the STUDENT. The
//     reveal is the moment that stops: the tutor builds it, now, in this message.
//   • "the single sharpest gap (just one, not a list) and one next move" — the reveal walks
//     EVERY move, so a one-gap instruction contradicts the core it would sit inside.
// Copying it would put a withholding instruction on the one leg that must reveal — the same
// class of error as injecting NO_COMPUTED_OUTPUTS here, which is why four of seven guardrail
// blocks were excluded above.
//
// ⚠️ THE DEMAND IS REPLACED AT ITS SOURCE, NOT FENCED FROM OUTSIDE (P-T2/P-T4). The praise
// clause lives INSIDE the system core, so that is where it is swapped. Appending a contrary
// instruction to the user prompt would leave "first credit what they already had right" standing
// and add a second demand beside it — the layered-prohibition shape P-M4 measured making things
// worse, and the shape divergence #4 was deliberately built to avoid.
//
// ⚠️ PURELY POSITIVE, AND NOTHING IS WITHHELD. The replacement mentions no praise, no credit, no
// correctness — it hands over a different, SATISFIABLE job (the model answer is in the prompt, so
// naming the move it turns on is always possible). "INCLUDING the figures and the conclusion
// (withholding is over — this is the earned reveal)" survives BYTE-IDENTICAL: this arm changes
// what the reveal OPENS on, never what it hands over.
//
// ⚠️ "No empty praise." AT THE TAIL IS LEFT ALONE, deliberately. It is the one praise-referring
// token still in the conditioned core, and removing it would move a second variable in an arm
// built to move one. Stated rather than silently kept; a candidate for a follow-up arm only if
// the conditioning under-delivers.
const CREDIT_CLAUSE =
  'first credit, specifically, what they already had right, then walk the moves they were missing, ';
// ⚠️ THE PHRASE IS DEFINED ONCE AND SHARED WITH THE DESIGN-B WRAPPER (2026-09-06). The wrapper's
// conditioned opening is the same job in a shorter sentence, and two independently-written
// "conditioned" openings on two live reveal surfaces is a drift the fixture cannot see.
const CONDITIONED_OPEN = 'open on the first move the answer turns on';
const CONDITIONED_CLAUSE =
  `${CONDITIONED_OPEN} and build from there, walking every move it takes, `;

// `mustRecast` reused for the same reason it exists: a silent no-op would ship a "conditioned"
// variant byte-identical to the control, and the arm would report a null meaning "the edit never
// happened" rather than "the change did nothing" (P-G1).
const CASE_REVEAL_CORE_AFM_NC = mustRecast(CASE_REVEAL_CORE_AFM, [[CREDIT_CLAUSE, CONDITIONED_CLAUSE]]);
const CASE_REVEAL_CORE_APM_NC = mustRecast(CASE_REVEAL_CORE_APM, [[CREDIT_CLAUSE, CONDITIONED_CLAUSE]]);

/**
 * The case reveal's system prompt.
 *
 * `nothingCreditable` — nothing in the attempt this reveal is looking at earns credit against the
 * requirement (`creditable === 0`, carried forward from the attempt turn that produced
 * `lastRealAttempt`). Defaulted FALSE so every existing caller, and every turn with no carried
 * verdict, gets the byte-identical praise-first core. Absent must mean "no claim", never "nothing
 * creditable": this arm suppresses a praise demand, and the failure it would cause is opening a
 * student's earned reveal as though their work had been worthless.
 */
export function caseRevealSystemFor(paper: string, secondPerson = false, nothingCreditable = false): string {
  const core = paper === 'AFM'
    ? (nothingCreditable ? CASE_REVEAL_CORE_AFM_NC : CASE_REVEAL_CORE_AFM)
    : (nothingCreditable ? CASE_REVEAL_CORE_APM_NC : CASE_REVEAL_CORE_APM);
  return core + (secondPerson ? CASE_REVEAL_GUARDRAILS_2P : CASE_REVEAL_GUARDRAILS);
}

/** Exported for fixtures only — the arm's whole claim is that these two differ ONLY in referent. */
export const CASE_REVEAL_GUARDRAILS_3P_FOR_TEST = CASE_REVEAL_GUARDRAILS;
export const CASE_REVEAL_GUARDRAILS_2P_FOR_TEST = CASE_REVEAL_GUARDRAILS_2P;
/** Exported for fixtures only — the conditioned arm's claim is that ONLY this clause moves. */
export const CASE_REVEAL_CREDIT_CLAUSE_FOR_TEST = CREDIT_CLAUSE;
export const CASE_REVEAL_CONDITIONED_CLAUSE_FOR_TEST = CONDITIONED_CLAUSE;

// ── Earned reveal — AFM (design "B": verbatim worked answer + framing wrapper) ─
// The model writes ONLY the wrapper (credit + misconception + next step) — never the
// figures. The authored, code-verified model_answer is appended verbatim by
// assembleAfmReveal, so the numbers reach the student byte-exact and untruncated.
export const REVEAL_AFM_WRAPPER_SYSTEM =
  'You are Ezra, an ACCA AFM tutor and the board\'s senior financial adviser. The student has ' +
  'EARNED the full worked answer — the system appends it, VERBATIM, immediately below your message, ' +
  'so you write ONLY a short framing wrapper, never the worked answer itself. In 2–4 sentences: ' +
  'first credit, specifically, what they already had right; then name the misconception they walked ' +
  // ── THE JOIN, RESTORED (2026-09-04) ────────────────────────────────────────
  // The generic signpost this replaces — "tell them the worked answer below shows the full
  // build" — was the loose seam the structural port introduced. When the reveal was
  // model-AUTHORED it wove credit into the working ("here is where your line diverged"); now
  // the working is a self-contained artefact, so the student is told what they missed and then
  // handed a complete document with nothing pointing at the part that matters. Measured on the
  // live walk: all three wrappers diagnosed well and none said WHERE to look.
  // A POINTER, NOT A VALUE — naming a step is free of the figure the step computes.
  'into (use the authored reframe you are given), correct the thinking, and say WHICH PART of the ' +
  'worked answer below to read first — name the step, section or heading it sits under, never a ' +
  'figure from it; then point them to apply the key move on a FRESH question. ' +
  'ABSOLUTE — CODE OWNS EVERY NUMBER: include NO figures, NO tables, NO calculations, and do NOT ' +
  'restate the worked answer; it is shown in full, verbatim, below your wrapper. ' +
  'Your message is flowing PROSE ONLY: do NOT write any heading, do NOT write a horizontal rule or ' +
  'divider ("---"), and do NOT begin the worked answer — stop after you point them to a fresh ' +
  'question. Warm and peer-to-peer, no empty praise.';

// SOLVED-path AFM wrapper (reachedFrom==='solved'): the student reached a correct answer
// themselves. The wrapper credits the work and frames the appended verbatim answer as a
// full-marks layout to COMPARE against — it asserts NO misconception (the struggle-path
// diagnosis is stale for a solved student and is ignored). Deliberately free of error language.
export const REVEAL_AFM_WRAPPER_SYSTEM_SOLVED =
  'You are Ezra, an ACCA AFM tutor and the board\'s senior financial adviser. The student SOLVED ' +
  'this drill — they reached a correct answer themselves — and has EARNED the full worked answer. ' +
  'The system appends it, VERBATIM, immediately below your message, so you write ONLY a short ' +
  'framing wrapper, never the worked answer itself. In 2–4 sentences: credit that they got there ' +
  'under their own steam; then tell them the worked answer below is the full-marks layout, and ' +
  'invite them to compare their sequencing and presentation against it (assume their method was ' +
  'sound — this is a comparison, not a critique); then point them to apply the key move on a FRESH ' +
  'question. ABSOLUTE — CODE OWNS EVERY NUMBER: include NO figures, NO tables, NO calculations, and ' +
  'do NOT restate the worked answer; it is shown in full, verbatim, below your wrapper. Your ' +
  'message is flowing PROSE ONLY: do NOT write any heading, do NOT write a horizontal rule or ' +
  'divider ("---"), and do NOT begin the worked answer — stop after you point them to a fresh ' +
  'question. Warm and peer-to-peer, no empty praise.';

// How the earned reveal was reached — drives whether the wrapper CREDITS (solved: no invented
// error) or DIAGNOSES (struggle/paid: current misconception-framing). `resolved ? 'solved' :
// 'struggle'` at the call site, mirroring revealDecision's precedence (resolved wins).
export type RevealReachedFrom = 'solved' | 'struggle';

// ── THE WRAPPER SYSTEM, PAPER-ROUTED (2026-09-04) ────────────────────────────
// APM's earned reveal was a MODEL-AUTHORED walkthrough under `REVEAL_SYSTEM`, which said
// "INCLUDING the figures and the conclusion" and constrained their SOURCE not at all. It
// invented "NZD 600m in capital" for a scenario that states no capital employed, computed
// EVA = −NZD 9m from it, and two sections later dropped the hedge — "an EVA of −NZD 9m every
// year tells the truth". Served to a real, paying student (dd786100, APM B3b, 2026-08-07).
//
// The fix is STRUCTURAL and it is not new: AFM has served a figure-free wrapper plus the
// stored answer VERBATIM since G3. APM now takes the same path. The model's output is prose
// only and is cut by `sanitizeAfmWrapper`; the figures come from the row. **The model cannot
// state a figure it was not given, because its output is no longer where the figures live.**
//
// THE PREMISE THAT KEPT APM OUT WAS A CONFLATION. `REVEAL_SYSTEM`'s comment said "APM has no
// code-verified worked-answer artefact to serve verbatim" — true about CODE-GENERATED, false
// about SERVABLE. Measured 2026-09-04: all 91 published APM drills carry a `model_answer`
// (min 1,449 chars, avg 2,120) and all 91 carry a `full_reveal` for the wrapper's reframe.
//
// ONE BODY, NOT A SECOND PAIR. The AFM constants above are the source and their bytes are
// UNTOUCHED (fixture-pinned); the APM form is the same string with only the persona opening
// recast, through `mustRecast`, so a silent no-op throws instead of shipping an AFM voice to
// an APM student.
const AFM_WRAPPER_OPENING = "You are Ezra, an ACCA AFM tutor and the board's senior financial adviser.";
const APM_WRAPPER_OPENING = 'You are Ezra, an APM tutor.';

// ── THE SECTION LIST THE POINTER BEAT POINTS AT (2026-09-06) ─────────────────
// The wrapper is told to "say WHICH PART of the worked answer below to read first". It was never
// shown the worked answer — design B hands the artefact to `assembleAfmReveal`, not to the model —
// so every pointer it wrote was a GUESS at the shape of a document it had not seen. Measured
// 10/10 unusable, and 9 of 10 aimed at the opening section, which is what a model with no
// information does. The fix is to hand it the heading NAMES and ask it to choose one.
//
// ⚠️ A HEADING IS NOT A FIGURE. This is the one piece of the artefact that can cross into the
// prompt without touching the figure-free guarantee: `## The accuracy claim` computes nothing and
// states nothing. Names only — never a body line, never a table row.
//
// ⚠️ EMPTY IS A LIVE BRANCH, NOT A DEFENSIVE ONE. All 18 published APM case `model_answer`s carry
// `## ` headings (migration `20260906120000`); NONE of the 20 AFM ones do — they are flowing prose
// with no headings at all. On an empty list the pointer beat is OMITTED from both the system and
// the user prompt rather than left standing with nothing to satisfy it, because a beat the model
// cannot satisfy from the prompt is exactly the condition that produced the invented pointers.
/**
 * The `## ` heading names of an appended reveal artefact, in document order, de-duplicated.
 * `### ` and deeper are NOT headings here — a sub-heading is a part of a section, and pointing a
 * student at one names something smaller than the thing they need to read.
 */
export function revealArtefactSections(artefact: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of artefact.split(/\r\n|\n/)) {
    const t = line.trim();
    if (!t.startsWith('## ')) continue;
    const name = t.slice(3).trim();
    if (name === '' || seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/**
 * Does the wrapper name one of the sections it was given, VERBATIM? The flag behind the
 * `[reveal:pointer-off-list]` log line — a diagnostic, never a blocker.
 *
 * ⚠️ CLAIM CEILING. `false` means "no listed heading appears in this wrapper", NEVER "the wrapper
 * pointed somewhere that does not exist": a wrapper that names no part at all is equally false
 * here, and one that quotes a heading while ALSO inventing a second pointer is true. It measures
 * whether a listed name was copied, which is the property the list exists to produce.
 */
export function wrapperNamesAListedSection(wrapper: string, sections: string[]): boolean {
  return sections.some(s => s !== '' && wrapper.includes(s));
}

// ── THE POINTER BEAT'S TWO OTHER FORMS ───────────────────────────────────────
// Both are REMOVALS from the shipped clause, produced through `mustRecast` so a wording drift in
// the source throws instead of silently shipping the shipped form under a conditioned name.
const WRAPPER_POINTER_CLAUSE =
  ', and say WHICH PART of the worked answer below to read first — name the step, section or ' +
  'heading it sits under, never a figure from it;';
// No headings to choose from → the beat is deleted, and the sentence closes on the correction.
const WRAPPER_POINTER_DELETED = ';';

// ── THE CREDIT DEMAND, CONDITIONED (2026-09-06) ──────────────────────────────
// `routed_2p_conditioned`'s suppression, ported to the design-B wrapper. Commit `8eb92db` shipped
// design B knowing it traded a CONDITIONED praise demand over a model-authored walkthrough for an
// UNCONDITIONED one over an anchored artefact, and asked for that trade to be measured. It has
// been: on a confidently-wrong answer the wrapper opened on credit 10/10 and FABRICATED the credit
// 6/10. This restores the suppression.
//
// REMOVAL AND CONDITIONING ONLY — P-M4(a). Nothing is added: the demand is replaced at its source
// by the same satisfiable job the case core uses ("open on the first move the answer turns on"),
// and no instruction is added anywhere saying what not to do. The phrase is defined ONCE
// (`CONDITIONED_OPEN`, above) and shared with the case cores, so the two surfaces cannot drift
// into two different conditioned openings.
const WRAPPER_CREDIT_CLAUSE = 'first credit, specifically, what they already had right;';
const WRAPPER_CONDITIONED_CLAUSE = `${CONDITIONED_OPEN};`;

/**
 * The reveal wrapper's system prompt.
 *
 * `nothingCreditable` — nothing in the attempt this reveal is looking at earns credit. Defaulted
 * FALSE so every caller that does not pass it (the whole drill route) gets the byte-identical
 * shipped string. Absent must mean "no claim", never "nothing creditable".
 *
 * `hasSections` — the appended artefact has named sections for the pointer beat to choose from.
 * Defaulted TRUE for the same reason inverted: absent must leave the shipped prompt untouched.
 *
 * Both are ignored on the SOLVED path, which has no misconception to diagnose and no pointer beat
 * — its join is "compare your sequencing against it", and a student who solved the requirement is
 * not a student whose work earned no credit.
 */
export function revealWrapperSystemFor(
  paper: string,
  reachedFrom: RevealReachedFrom,
  opts: { nothingCreditable?: boolean; hasSections?: boolean } = {},
): string {
  let afm: string;
  if (reachedFrom === 'solved') {
    afm = REVEAL_AFM_WRAPPER_SYSTEM_SOLVED;
  } else {
    const recasts: Array<[string, string]> = [];
    if (opts.nothingCreditable) recasts.push([WRAPPER_CREDIT_CLAUSE, WRAPPER_CONDITIONED_CLAUSE]);
    if (opts.hasSections === false) recasts.push([WRAPPER_POINTER_CLAUSE, WRAPPER_POINTER_DELETED]);
    afm = recasts.length ? mustRecast(REVEAL_AFM_WRAPPER_SYSTEM, recasts) : REVEAL_AFM_WRAPPER_SYSTEM;
  }
  if (paper === 'AFM') return afm;
  return mustRecast(afm, [[AFM_WRAPPER_OPENING, APM_WRAPPER_OPENING]]);
}

// Pure builder for the reveal wrapper USER prompt — BOTH PAPERS since 2026-09-04 (route appends
// WRAP_UP + the system prompt is
// selected in parallel: REVEAL_AFM_WRAPPER_SYSTEM_SOLVED vs ..._SYSTEM). Solved path omits the
// stale diagnosis + reframe entirely and asserts no error; struggle path is the prior behaviour.
export function buildRevealWrapperUserPrompt(opts: {
  contextLine: string; question: string; attempt: string; diagnosis: string;
  reframeLine: string; reachedFrom: RevealReachedFrom;
  /**
   * The appended artefact's `## ` heading names, in document order (`revealArtefactSections`).
   * Names ONLY — no bodies, no figures. Empty (the default) omits the pointer beat entirely, and
   * the system prompt must be built with `hasSections: false` to match; the two prompts disagreeing
   * about how many beats the wrapper has is the condition this parameter exists to end.
   */
  sections?: string[];
  /** See `revealWrapperSystemFor`. Defaulted false — absent means "no claim". */
  nothingCreditable?: boolean;
}): string {
  const head = `${opts.contextLine}Question: ${opts.question}\n\nTheir last attempt: ${opts.attempt}\n\n`;
  if (opts.reachedFrom === 'solved') {
    return head +
      'They reached a correct answer to this drill themselves.\n\n' +
      'Write ONLY the short framing wrapper now — credit that they got there under their own steam, ' +
      'then frame the worked answer below as the full-marks layout to compare against, inviting them ' +
      'to notice anything sequenced or laid out differently from how they did it. Treat their method ' +
      'as sound; keep it a comparison, not a critique. Do NOT include any figures or the worked ' +
      'answer; the verified worked answer is appended verbatim below your message.';
  }
  // ── THREE STATES, NOT TWO ─────────────────────────────────────────────────
  // `undefined` = this caller does not supply the artefact's shape (the whole drill route) → the
  // shipped generic pointer beat, byte-identical to what it has always sent. `[]` = supplied, and
  // the artefact has no named sections → the beat is OMITTED. Non-empty → the list, and a copy
  // instruction. Collapsing undefined into `[]` would silently delete the drill route's pointer
  // beat, which is a second surface changing inside a one-surface arm.
  const sections = opts.sections;
  // ── THE LIST, AND WHY IT IS NOT NUMBERED ──────────────────────────────────
  // 9 of 10 measured pointers named the opening section of six. The correction is a SELECTION
  // CRITERION ("the one where that misconception is resolved"), not a warning about position:
  // per P-M4(a) an instruction that names the wrong output primes it, and "do not always pick the
  // first" names the failure it is trying to prevent. Numbering would supply a second ordinal
  // handle for the same bias, so the list is bulleted and the criterion does the work.
  const sectionBlock = sections && sections.length
    ? 'The worked answer below is divided into these sections, in the order they appear:\n' +
      sections.map(s => `- ${s}`).join('\n') + '\n\n'
    : '';
  // The pointer beat is echoed here so the system prompt and the user prompt do not disagree
  // about how many beats the wrapper has. Solved path deliberately untouched — it has no
  // misconception to name, and its "compare your sequencing against it" IS its join.
  const pointerBeat =
    sections === undefined
      ? 'say which part of the answer below to read first (name it; never quote a figure from it), '
      : sections.length
        ? 'say which part of the answer below to read first by copying ONE heading from the list ' +
          'above, word for word — the one where that misconception is resolved, '
        : '';
  const openBeat = opts.nothingCreditable
    ? `${CONDITIONED_OPEN}, `
    : 'credit what they had, ';
  return head +
    `The gap they kept missing: ${opts.diagnosis}\n\n` +
    opts.reframeLine +
    sectionBlock +
    `Write ONLY the short framing wrapper now — ${openBeat}name and correct the ` +
    `misconception, ${pointerBeat}and point them to a fresh application. Do NOT include any ` +
    'figures or the worked answer; the verified worked answer is appended verbatim below your ' +
    'message.';
}

// Pure builder for the APM reveal USER prompt (system selected in parallel: REVEAL_SYSTEM_SOLVED
// vs REVEAL_SYSTEM). Solved path drops the "gap they kept missing" line + frames the model answer
// as a full-marks reference; struggle path is the prior behaviour.
export function buildApmRevealUserPrompt(opts: {
  contextLine: string; question: string; attempt: string; diagnosis: string;
  modelAnswer: string; reachedFrom: RevealReachedFrom;
}): string {
  const head = `${opts.contextLine}Question: ${opts.question}\n\nTheir last attempt: ${opts.attempt}\n\n`;
  const answerBlock = `Verified model answer (you MAY reveal this — it is the earned reveal):\n${opts.modelAnswer}\n\n`;
  if (opts.reachedFrom === 'solved') {
    return head +
      'They reached a correct answer themselves.\n\n' + answerBlock +
      'Build the top-band worked walkthrough now as a full-marks reference to compare against, ' +
      'crediting how they got there, then point them to a fresh application.';
  }
  return head +
    `The gap they kept missing: ${opts.diagnosis}\n\n` + answerBlock +
    'Build the worked walkthrough now, crediting what they had, then point them to a fresh application.';
}

// Separator between Ezra's framing wrapper and the verbatim authored worked answer.
export const AFM_REVEAL_SEPARATOR = '\n\n---\n\n';

// Deterministic wrapper guard (belt to the prompt's braces): the wrapper must be prose only,
// but a model can still start its own divider or "worked answer" heading before running out of
// its token budget — leaving a truncated stub above the real (separately appended) answer.
// This cuts the wrapper at the first horizontal rule OR the first heading that looks like it is
// starting to restate the build, so the served reveal never shows a spurious half-heading.
//
// 🔴 THE CUT CONDITION WAS A PHRASE TEST AND IT ATE THE POINTER BEAT (fixed 2026-09-06).
// It cut at `\n[^\n]*(worked answer|investment appraisal)` — ANY line, after a newline, CONTAINING
// those words. But the reveal system prompt INSTRUCTS the model to "say WHICH PART of the worked
// answer below to read first", so the sentence the pointer beat is supposed to produce is exactly
// the sentence this deleted. A two-paragraph wrapper whose second paragraph read *"Start by
// reading **Training-data limitations** in the worked answer below…"* was cut from 397 bytes to
// 279, losing BOTH the pointer and the closing beat. Measured at 1/30 on the case surface (run 13
// of the creditable seed), where the single-paragraph majority escaped only by accident. The
// DRILL route has the same prompt phrase and no pointer audit at all, so the same cut there is
// silent by construction.
//
// THE FIX IS A SHAPE TEST, NOT A LONGER PHRASE LIST. What the guard is actually for is a HEADING —
// the model starting its own `**WORKED ANSWER**` / `**Investment appraisal — IRR**` block before
// its token cap. A heading is recognisable by SHAPE and does not need to be enumerated: a markdown
// `#` heading, a line that is wholly bold (or opens bold and never closes it — the truncated form),
// or a numbered/`Step N` build line. Flowing prose that MENTIONS the worked answer is not a
// heading and is left alone. All three pre-existing fixture cases are bold-shaped and still cut.
//
// ⚠️ THE ESCAPE IS DELIBERATE AND IT IS THE SAFE DIRECTION: a bold line that ends in sentence
// punctuation is prose (`**Credit where it's due:** you spotted the base-rate trap.`), never a
// heading. Under-cutting leaves a stray bold line; over-cutting deletes a beat the student needed,
// which is the failure this fix exists to stop.
export function sanitizeAfmWrapper(raw: string): string {
  let w = raw;
  // First markdown horizontal rule (--- / *** / ___ on its own line) → cut there.
  const hr = w.search(/\n[ \t]*([-*_]){3,}[ \t]*(\n|$)/);
  if (hr !== -1) w = w.slice(0, hr);
  // First HEADING-SHAPED line after a newline → cut there.
  const lines = w.split('\n');
  let consumed = 0;
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && isBuildHeadingLine(lines[i])) { w = w.slice(0, consumed - 1); break; }
    consumed += lines[i].length + 1;
  }
  return w.trimEnd();
}

/**
 * Is this line a HEADING rather than prose? Shape only — no phrase list, so a heading the model
 * invents a new name for is caught and a sentence that names the worked answer is not.
 */
export function isBuildHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t === '') return false;
  if (/^#{1,6}\s/.test(t)) return true;                      // markdown ATX heading
  if (/^(?:\*\*)?(?:step\s+\d|\d+[.)])\s/i.test(t)) return true;  // numbered / "Step N" build line
  if (t.startsWith('**')) {
    if (/[.!?]["'”’)*]*$/.test(t)) return false;              // ends a sentence → prose
    if (/^\*\*.*\*\*[:：]?$/.test(t)) return true;            // wholly bold → heading
    if (!t.slice(2).includes('**')) return true;              // bold opened, never closed → stub
  }
  return false;
}

// ── THE APPENDED ARTEFACT'S PARAGRAPH NORMALISER ─────────────────────────────
// `MessageRenderer` follows GFM: consecutive non-blank lines are JOINED with a space into one
// paragraph. A stored answer that separates its sections with a SINGLE newline therefore renders
// as a run-on paragraph — the section label swallowed into the sentence that follows it. That is
// live on 43 of 91 published APM drills (no markdown at all) and on all 18 APM case
// `model_answer`s (CRLF, section labels on bare lines), and design B serves those bytes VERBATIM,
// so the defect is now visible wherever the reveal is.
//
// The fix is the FLOOR, deliberately: every content line becomes its own paragraph. No heuristics,
// no heading detection, no content edits — a line's characters are never touched, never reordered,
// never dropped. Blank lines (which carry no content) are collapsed into the separator.
//
// ⚠️ THE ONE EXCEPTION IS STRUCTURAL, NOT A HEURISTIC. A markdown table's rows are separated by
// SINGLE newlines by grammar; `MessageRenderer` ends a table on the first blank line and drops a
// one-row table entirely (`renderTable` returns null below two rows). Blank-separating a table's
// rows would therefore DELETE the table. 35 AFM and 5 APM published drills carry pipe tables, so
// this is not hypothetical. Two source-ADJACENT pipe rows keep their single newline; everything
// else is blank-separated. A blank line already present between two pipe rows is preserved as a
// break, so this can never MERGE two tables the author separated.
//
// 🔗 COUPLED TO `components/chat/MessageRenderer.tsx`'s `isTableRow` — same test, deliberately
// (a leading `|` after trimming). If that renderer's table detection changes, this must follow.
function isArtefactTableRow(line: string): boolean {
  return line.trim().startsWith('|');
}

export function normaliseRevealArtefact(artefact: string): string {
  const src = artefact.split(/\r\n|\n/);
  const out: string[] = [];
  for (let i = 0; i < src.length; i++) {
    const line = src[i];
    if (line.trim() === '') continue;             // blank lines carry no content
    if (out.length > 0) {
      // Contiguous in the SOURCE (no blank line between them) and both pipe rows → one table.
      const contiguousTableRows =
        i > 0 && src[i - 1].trim() !== '' &&
        isArtefactTableRow(src[i - 1]) && isArtefactTableRow(line);
      out.push(contiguousTableRows ? '\n' : '\n\n');
    }
    out.push(line);
  }
  return out.join('');
}

// Pure assembly (no model call): the served AFM reveal body is the (sanitized) wrapper followed
// by the authored model_answer, normalised for paragraph rendering and otherwise VERBATIM.
//
// ⚠️ THE ANTI-TRUNCATION INVARIANT CHANGED SHAPE HERE, AND IT IS NOT WEAKER. It was
// `served.endsWith(modelAnswer)` byte-for-byte; a normaliser that inserts blank lines cannot
// satisfy that. What is fixture-enforced now: the served body's CONTENT LINES end with the
// model_answer's content lines, byte-for-byte, in order, none altered and none dropped. That is
// the property the byte check existed to defend — the figures reach the student whole and
// untruncated, and a refactor still cannot quietly reintroduce model-emitted tables.
export function assembleAfmReveal(wrapper: string, modelAnswer: string): string {
  // Footer sits in the wrapper (above the separator), so the artefact stays the exact tail.
  return `${sanitizeAfmWrapper(wrapper)}${REVEAL_FOOTER}${AFM_REVEAL_SEPARATOR}${normaliseRevealArtefact(modelAnswer)}`;
}

// ── Earned-reveal GATE (pure) ─────────────────────────────────────────────────
// Single source of truth for who reaches the model_answer. The reveal is EARNED two ways:
//   • struggle — missCount >= 2 (the original moat: two genuine misses), OR
//   • solved   — resolved === true (confirmed-correct OR a prior reveal; the earn-it
//     rationale is satisfied once the student has demonstrably produced the answer).
// A reveal request that meets neither hits the static earn-it refusal (the moat holds for the
// unearned+unsolved case). A non-reveal request is 'none'. `wantsReveal` already folds in the
// APM_EARNED_REVEAL flag + REVEAL_PHRASES match at the call site.
// Access-aware earned-reveal gate (Bucket-B burn doctrine, Grant-ruled 2026-07-14). The reveal
// ARTIFACT (full worked answer / verbatim tables) is what's gated, never the teaching:
//   • SOLVED  (resolved) → 'reveal' for FREE and PAID alike — you earned it by producing the answer.
//   • STRUGGLE (missCount >= 2, not resolved) → PAID: 'reveal'; FREE: 'burn' (a figure-free
//     diagnosis-framing wrapper + conversion CTA — sells UNDERSTANDING, withholds the artifact).
//   • Neither (missCount < 2, not resolved) → 'earn_redirect' (the "try first" moat).
//   • Not a reveal request → 'none'.
// `wantsReveal` already folds in the APM_EARNED_REVEAL flag + REVEAL_PHRASES match.
export function revealDecision(opts: { wantsReveal: boolean; missCount: number; resolved: boolean; paid: boolean }): 'reveal' | 'burn' | 'earn_redirect' | 'none' {
  if (!opts.wantsReveal) return 'none';
  if (opts.resolved) return 'reveal';                        // solved — free & paid alike
  if (opts.missCount >= 2) return opts.paid ? 'reveal' : 'burn';  // struggle — artifact gated for free
  return 'earn_redirect';                                     // not earned yet
}

// Copyright footer appended to every SERVED reveal (the wrapper's footer — sits above the
// verbatim answer so the byte-equality tail invariant is preserved). Establishes the record;
// not DRM. (Deliberately NOT on the burn — the burn serves no artifact.)
export const REVEAL_FOOTER = '\n\n*© Gradd — for your personal exam preparation.*';

// Conversion block for the FREE-struggle burn. Sells UNDERSTANDING, not information, and carries
// the upgrade CTA. Figure-free by construction (fixture-checked) — the burn never receives the
// model_answer, and this block contains no numbers from it. Paper-aware: the CTA carries ?paper=
// so /acca/subscribe leads with the paper they came from (bundle copy, neutral fallback).
export function buildBurnCta(paper?: string): string {
  const q = paper ? `?paper=${encodeURIComponent(paper)}` : '';
  return '\n\n---\n\n' +
    '**This is where I take you from "sort of get it" to "got it."** The full worked answer — every ' +
    'step laid out — and unlimited coaching until it clicks are part of a Gradd subscription.\n\n' +
    `[Unlock the full worked answer →](/acca/subscribe${q})`;
}
// Paper-neutral base (fixtures + the no-paper fallback); paper-aware links via buildBurnCta(paper).
export const BURN_CTA = buildBurnCta();

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

// ── Opener-divider guard (pure) ───────────────────────────────────────────────
// The DETERMINISTIC half of the self-assessment rendering fix (2026-08-07). Its sibling above is
// the model of the pattern: the prompt asks, and code guarantees.
//
// THE SIGHTING. The self-assessment beat is specified as "ONE short clause … then go straight on"
// and its claim ceiling (app/api/acca/tutor/route.ts) is explicit that it does NOT gate the
// diagnosis behind the student's reply — the route answers in one turn. The model complied on
// LENGTH and broke it on LAYOUT, emitting:
//
//     Before I say — which bit of that would you defend least: X, or Y?
//
//     ---
//
//     You've nailed the floor: …
//
// A lone question above a horizontal rule reads as "answer this, I'll wait". The student had
// asked to be told the answer six minutes earlier. Nothing in the words was wrong; the divider
// did the damage, and no length or phrase assertion can see it.
//
// STRUCTURAL, NOT INSTRUCTED (docs/TEACHING_ARCHITECTURE.md). The prompt now forbids the divider
// too, but a prompt is a request; this is the guarantee. Rendering the opener as its own block is
// made IMPOSSIBLE rather than discouraged.
//
// SCOPE, deliberately narrow — this must never touch a legitimate divider:
//   • only a thematic break that is one of the FIRST THREE non-blank lines, which is the only
//     place the opener-then-rule shape can occur;
//   • only the FIRST such break;
//   • the surrounding text is otherwise untouched — the paragraphs are rejoined, so the opener
//     runs straight into the diagnosis exactly as the instruction asks.
// A reveal (a DOCUMENT, which legitimately uses `---` to separate sections) never calls this: the
// caller applies it ONLY on the leg where the self-assessment clause can fire, and only when it
// actually fired. Idempotent — text with no leading break is returned unchanged.
export function stripOpenerDivider(text: string): string {
  const lines = text.split('\n');
  const isBreak = (s: string) => /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(s);
  let seenContent = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;
    if (isBreak(line)) {
      // Drop the rule, then collapse the blank lines it leaves behind into one paragraph break.
      const before = lines.slice(0, i);
      const after  = lines.slice(i + 1);
      while (before.length && before[before.length - 1].trim() === '') before.pop();
      while (after.length && after[0].trim() === '') after.shift();
      return [...before, '', ...after].join('\n');
    }
    if (++seenContent >= 3) break;
  }
  return text;
}
