// scripts/audit-unmarked-sits.ts
//   npx tsx --env-file=.env.local scripts/audit-unmarked-sits.ts
//   npx tsx --env-file=.env.local scripts/audit-unmarked-sits.ts --json
//
// ── WHICH SAT PAPERS WERE NEVER MARKED? ──────────────────────────────────────
// A sit is marked by exactly ONE trigger: the client POSTing /api/acca/sit/results from the
// runner's `done` phase. There is no queue, no retry beyond the student pressing a button,
// and NO SERVER-SIDE SWEEP — the two crons in vercel.json (weekly-email, trial-reminders) do
// not touch any ACCA table. So a paper whose results POST never happened — closed tab, dropped
// network, a model error the student did not come back from — stays unmarked indefinitely and
// NOTHING NOTICES. There is no event for "a sit finished", and the surface telemetry
// (case_list_viewed / case_opened / mock_intro_viewed) does not cover it either.
//
// This script is that missing observation, as a query you can run rather than rediscover.
// It was written by hand during the 2026-08-12 diagnosis and is committed so the next person
// asking "has anyone's paper gone unmarked?" runs it instead of re-deriving the join.
//
// ── IT IS NOT A SWEEP, AND DELIBERATELY DOES NOT FIX ANYTHING ────────────────
// Read-only, by decision (Grant, 2026-08-12): a cron that re-marks silently would treat the
// symptom while the cause — the runner's load-effect fall-through — was still shipping. That
// cause is fixed on `fix/sit-completed-attempt-intro-fallthrough`; whether a sweep or an
// automatic retry is worth building on top is a separate call, logged in docs/AFM_SURFACED.md
// and not taken here. This script never writes.
//
// ── NOT IN THE CONTRACT GATE, AND CANNOT BE ─────────────────────────────────
// It needs a database. `scripts/run-contracts.ts` discovers `scripts/test-*.ts` and runs pure
// fixtures only, because a Vercel build has neither DB nor network — the `audit-` prefix keeps
// this out of that discovery by construction rather than by an EXCLUDED entry.
//
// ── READING THE OUTPUT ───────────────────────────────────────────────────────
// UNMARKED is not automatically a defect. Two benign causes:
//   • the sitter is not entitled (marking is correctly refused with 402 — this is what the
//     2026-08-12 `apm-sit-walk@gradd.ai` row is), and
//   • the paper is still being sat (open attempt, clock running).
// Both are reported and labelled rather than filtered out, because a filter that hides them
// also hides the case where one of them is the wrong answer.

import { createClient } from '@supabase/supabase-js';
import { MOCK_PAPERS, getMockPaper } from '../lib/acca/mocks';
import { attemptIsClosed } from '../lib/acca/sit-preview';
import { hasPaperAccess } from '../lib/acca/access';

const AS_JSON = process.argv.includes('--json');

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

interface Row {
  attempt_id: string;
  user_id: string;
  email: string | null;
  mock_id: string;
  paper: string;
  started_at: string;
  ends_at: string;
  completed: boolean;
  completed_at: string | null;
  closed: boolean;
  answered: number;
  cases_with_answers: number;
  cases_in_paper: number;
  cases_marked: number;
  entitled: boolean;
  verdict: string;
}

async function main() {
  const now = Date.now();

  // Every attempt that CARRIED ANSWERS. An attempt with no progress rows is a student who
  // pressed Start and wrote nothing — a bounce, not an unmarked paper, and it has no marks to
  // be missing. `attempt_id` is the join key that migration 20260801120000 exists to provide.
  const { data: attempts, error: aErr } = await svc
    .from('acca_mock_attempts')
    .select('id, user_id, mock_id, started_at, ends_at, completed, completed_at')
    .order('started_at', { ascending: true });
  if (aErr) throw new Error(`attempts: ${aErr.message}`);

  const { data: progress, error: pErr } = await svc
    .from('acca_case_progress')
    .select('attempt_id, case_id, user_id')
    .not('attempt_id', 'is', null);
  if (pErr) throw new Error(`progress: ${pErr.message}`);

  // A marking row counts as A RESULT only when `technical_marks_available` is non-null. A row
  // with it NULL is a CLAIM written by the results endpoint's double-mark guard before it calls
  // the model (see claimCase) — treating a claim as a result is exactly the mistake that would
  // report a crashed marking run as a marked paper.
  const { data: marking, error: mErr } = await svc
    .from('acca_case_marking')
    .select('user_id, case_id, technical_marks_available');
  if (mErr) throw new Error(`marking: ${mErr.message}`);

  const { data: profiles } = await svc.from('profiles').select('id, apm_subscription_status, apm_pass_expires_at');
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  const { data: users } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? null]));

  const resultKey = new Set(
    (marking ?? [])
      .filter((m) => m.technical_marks_available != null)
      .map((m) => `${m.user_id}::${m.case_id}`),
  );

  const rows: Row[] = [];
  for (const a of attempts ?? []) {
    const mine = (progress ?? []).filter((p) => p.attempt_id === a.id);
    if (mine.length === 0) continue;                       // no answers → nothing to mark

    const cfg = getMockPaper(a.mock_id as string);
    const paper = cfg?.paper ?? 'UNKNOWN';
    const caseIds = new Set(mine.map((p) => p.case_id as string));
    const marked = [...caseIds].filter((c) => resultKey.has(`${a.user_id}::${c}`)).length;
    const closed = attemptIsClosed(
      { completed: a.completed as boolean, ends_at: a.ends_at as string },
      now,
    );

    // The entitlement read is the SAME predicate the results route gates on, with the same
    // service client, so "unmarked because unentitled" is a verified reading rather than a guess.
    const entitled = cfg
      ? await hasPaperAccess(svc, a.user_id as string, cfg.paper, profileById.get(a.user_id as string) ?? null)
      : false;

    const complete = cfg ? marked === cfg.case_ids.length : false;
    const verdict = complete
      ? 'MARKED'
      : !closed
        ? 'IN PROGRESS — clock still running'
        : !entitled
          ? 'UNMARKED — sitter not entitled (402 is correct; marking is a paid call)'
          : marked > 0
            ? `⚠️ PARTIAL — ${marked} of ${cfg?.case_ids.length ?? '?'} cases marked`
            : '⚠️ UNMARKED — closed, entitled, and never marked';

    rows.push({
      attempt_id: a.id as string,
      user_id: a.user_id as string,
      email: emailById.get(a.user_id as string) ?? null,
      mock_id: a.mock_id as string,
      paper,
      started_at: a.started_at as string,
      ends_at: a.ends_at as string,
      completed: a.completed as boolean,
      completed_at: (a.completed_at as string | null) ?? null,
      closed,
      answered: mine.length,
      cases_with_answers: caseIds.size,
      cases_in_paper: cfg?.case_ids.length ?? 0,
      cases_marked: marked,
      entitled,
      verdict,
    });
  }

  if (AS_JSON) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    console.log(`\nUNMARKED-SIT AUDIT  —  ${new Date(now).toISOString()}`);
    console.log(`papers in registry: ${MOCK_PAPERS.map((p) => `${p.id}(${p.paper})`).join(', ')}`);
    console.log(`attempts carrying answers: ${rows.length}\n`);
    for (const r of rows) {
      console.log(`${r.verdict}`);
      console.log(`   ${r.paper} ${r.mock_id}  attempt ${r.attempt_id}`);
      console.log(`   ${r.email ?? r.user_id}   entitled=${r.entitled}  closed=${r.closed}  completed=${r.completed}`);
      console.log(`   answered ${r.answered} requirement(s) across ${r.cases_with_answers} case(s); marked ${r.cases_marked}/${r.cases_in_paper}`);
      console.log(`   started ${r.started_at}  ends ${r.ends_at}  completed_at ${r.completed_at ?? '—'}\n`);
    }
  }

  // A NEEDS-ATTENTION row is one that is closed, entitled and not fully marked: a real student
  // whose paper is over and whose marks do not exist. Exit 1 so this can be wired to something
  // that cares without re-parsing the text.
  const attention = rows.filter((r) => r.verdict.startsWith('⚠️'));
  console.log(`${attention.length === 0 ? 'OK' : 'ATTENTION'}: ${attention.length} sat paper(s) closed, entitled and unmarked`);
  process.exitCode = attention.length === 0 ? 0 : 1;   // P-G4: exitCode, never process.exit()
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
