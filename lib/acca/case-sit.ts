// lib/acca/case-sit.ts
// Pure decision logic for the timed-SIT flow vs the practice TEACH flow. No DB, no
// model, no I/O — case/turn, case/mark and case (GET) import these so the mode
// decision is tested in isolation and identical across all three routes.
//
// The two modes differ in ONE place each:
//   • case/turn: PRACTICE runs the teach loop (runTeachTurn — hint/diagnose/retry
//     until a requirement is judged correct); a SIT records the single submitted
//     final_answer and does NOT run the engine or set `passed`.
//   • case/mark: PRACTICE gates on every requirement judged correct (passed===true);
//     a SIT gates on every requirement having a RECORDED final_answer (blank '' is a
//     valid, final, zero-credit answer), then marks whatever was written.
//
// `passed` is NEVER overloaded: it keeps meaning "judged correct" and stays UNSET in
// a sit (a sit is graded by the technical band pass, not by turn-time correctness).

// PRACTICE (sitting=false) runs the teach loop; a SIT (sitting=true) does not.
export function shouldRunTeachLoop(sitting: boolean): boolean {
  return !sitting;
}

export interface ReqGateState {
  final_answer: string | null;   // null = no progress row / never submitted
  passed: boolean;               // "judged correct" — only ever set in practice mode
}

export interface CaseGateResult {
  ready: boolean;
  reason?: string;
}

// Can this case be marked yet?
//   • SIT: ready when EVERY requirement has a recorded final_answer (blank '' counts;
//     only a genuinely absent row — never submitted, never skipped — blocks).
//   • PRACTICE: ready when EVERY requirement is judged correct (unchanged from the
//     original inline `allPassed` gate).
export function caseMarkReady(sitting: boolean, reqs: ReqGateState[]): CaseGateResult {
  if (reqs.length === 0) return { ready: false, reason: 'case not complete' };
  if (sitting) {
    const missing = reqs.filter((r) => r.final_answer == null).length;
    return missing === 0
      ? { ready: true }
      : { ready: false, reason: `${missing} requirement(s) have no recorded answer` };
  }
  const unpassed = reqs.filter((r) => r.passed !== true).length;
  return unpassed === 0 ? { ready: true } : { ready: false, reason: 'case not complete' };
}
