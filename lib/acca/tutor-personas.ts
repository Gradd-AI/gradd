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
// Shared code-owns-numbers guardrail for the CONVERSATIONAL legs (warm/hint/teach/confirm) of
// EVERY paper. Strengthened 2026-07-15: the old clause banned a "specific figure" but a persona
// still invented illustrative RANGES and rules-of-thumb ("a 3-year blue-chip option might be worth
// 8–12% of the underlying" — unverifiable and materially wrong). This bans ranges, market levels,
// and rule-of-thumb percentages too, and forbids prescribing a computation ROUTE the drill's own
// inputs contradict.
const NO_INVENTED_NUMBERS =
  'CODE OWNS EVERY NUMBER — and this covers RANGES and RULES OF THUMB, not just single figures: ' +
  'never state a specific value, an illustrative numeric range, a market level, or a rule-of-thumb ' +
  'percentage ("typically 8–12% of the underlying", "options usually cost around 5%", "blue-chips ' +
  'trade at…") that the drill did not supply and code did not compute — such numbers are unverifiable ' +
  'and are usually wrong. Teach DIRECTION and MECHANISM in words instead ("more volatility → more ' +
  'option value"; "a longer time to expiry lifts the time premium"); if magnitude matters, point the ' +
  'student at the drill\'s OWN inputs and their own workings, never a figure you supply. Verified ' +
  'figures live only in the earned worked answer, never mid-conversation. ';

// FIX A (red-team adjudication 2026-07-16): the moat against ANSWER-EXTRACTION. NO_INVENTED_NUMBERS
// bans figures you make UP; this bans stating or confirming figures the CODE WORKS OUT. The prod
// red-team run leaked computed outputs three ways — a "yes, it's CHF 51m" confirmation of a bare
// guess (probe X5), a volunteered intrinsic-value computation (probe D1), and figure-laden hints.
// The dividing line the judge kept missing: GIVEN (a number the scenario handed over — repeat it
// freely) vs COMPUTED (a number the code derives — withhold until the earned reveal).
const NO_COMPUTED_OUTPUTS =
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

// FIX B (red-team adjudication 2026-07-16): dignity rule #9. Probes E1/E2 (panic / "I give up")
// received a teaching reply that still ended on a "say show me the full answer" reveal-nudge — a
// monetisation prompt to a distressed student. Kindness is a product requirement, not a nicety. The
// prompt clause here + code-level suppression of the offer/CTA/wall in the route (containsDistressSignal).
const DIGNITY_ON_DISTRESS =
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
const METHOD_FITS_THE_GIVEN_INPUTS =
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

// Working-shown markers: if the message actually SHOWS a calculation, it is a genuine attempt for the
// pipeline to diagnose — NOT a bare guess — so the gate must stand down.
const WORKING_MARKERS_RE = /d[₁₂12]\b|ln\s*\(|√|sqrt|N\s*\(\s*d|\bstep\s*\d|\bbecause\b|\btherefore\b|=[^=]*=/i;
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
  if (WORKING_MARKERS_RE.test(text)) return false;
  return /\d/.test(text) && CONFIRM_NUM_RE.test(text);
}

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
  NO_INVENTED_NUMBERS +
  NO_COMPUTED_OUTPUTS +
  DIGNITY_ON_DISTRESS +
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
  DIGNITY_ON_DISTRESS +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer. " +
  METHOD_FITS_THE_GIVEN_INPUTS;

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

// Pure builder for the AFM wrapper USER prompt (route appends WRAP_UP + the system prompt is
// selected in parallel: REVEAL_AFM_WRAPPER_SYSTEM_SOLVED vs ..._SYSTEM). Solved path omits the
// stale diagnosis + reframe entirely and asserts no error; struggle path is the prior behaviour.
export function buildAfmWrapperUserPrompt(opts: {
  contextLine: string; question: string; attempt: string; diagnosis: string;
  reframeLine: string; reachedFrom: RevealReachedFrom;
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
  return head +
    `The gap they kept missing: ${opts.diagnosis}\n\n` +
    opts.reframeLine +
    'Write ONLY the short framing wrapper now — credit what they had, name and correct the ' +
    'misconception, and point them to a fresh application. Do NOT include any figures or the ' +
    'worked answer; the verified worked answer is appended verbatim below your message.';
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
  // Footer sits in the wrapper (above the separator), so the model_answer stays the exact
  // verbatim tail — the byte-equality anti-truncation invariant is unaffected.
  return `${sanitizeAfmWrapper(wrapper)}${REVEAL_FOOTER}${AFM_REVEAL_SEPARATOR}${modelAnswer}`;
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
