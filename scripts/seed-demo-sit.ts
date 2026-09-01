// scripts/seed-demo-sit.ts
// Seeds a COMPLETED, realistically-paced AFM Mock Paper 1 attempt for demo moment (b).
//
// Run (dry run first — see the flags below):
//   npx tsx --env-file=.env.local scripts/seed-demo-sit.ts --dry-run
//   npx tsx --env-file=.env.local scripts/seed-demo-sit.ts --go
//
// ── WHY THIS SCRIPT EXISTS ───────────────────────────────────────────────────
// `submitted_at` is SERVER-set (app/api/acca/case/turn/route.ts) and `started_at` is
// SERVER-set (app/api/acca/sit/route.ts). Neither reads a client value, so a pacing
// profile cannot be authored — it can only be PERFORMED. The intervals the pacing view
// reports are the real wall-clock gaps between HTTP requests, so this script produces them
// by actually waiting. That is why it takes 2h47m.
//
// ⚠️ IT WRITES NO TIMESTAMP. Not `submitted_at`, not `started_at`, not `ends_at`, not
// `completed_at`. Every one of those is written by a route, from the server's own clock.
// The only DB writes this script makes directly are the two SETUP writes named below, and
// neither is on the sit path. If you find yourself adding a service-client write to make a
// sit field come out right, stop — that is fabricated exam telemetry, and it is the thing
// this script was built to avoid.
//
// ── THE TWO DIRECT WRITES, DECLARED ──────────────────────────────────────────
//   1. auth.admin.createUser  — there is no programmatic signup route; ACCA auth is
//      magic-link only (app/acca/auth/page.tsx signInWithOtp).
//   2. acca_entitlements insert — there is no grant route; entitlements are written by the
//      Stripe webhook. `expires_at` here is the ENTITLEMENT's own validity field, not a sit
//      timing record.
// Both are account setup, both were named in the build instruction. Nothing else.
//
// ⚠️ ONE SUPABASE FOR EVERY ENVIRONMENT. `--target local` and `--target prod` write the
// SAME production database (CLAUDE.md: one codebase, one Supabase). The target chooses which
// SERVER runs the route, not which data is touched. `local` is the safer default only
// because you can watch the logs.
//
// ── RESUMABILITY ─────────────────────────────────────────────────────────────
// State is derived from the DATABASE, not a state file, so there is nothing to desync. On
// restart the script reads which requirements already carry a `final_answer` for the open
// attempt and skips them, without re-waiting. `action:'start'` resumes an incomplete
// attempt rather than restarting it, so the clock is never reset. Safe to re-run.

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import fs from 'node:fs';
import path from 'node:path';

// ── args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const has = (f: string) => argv.includes(f);
const val = (f: string, d?: string) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const DRY_RUN = has('--dry-run') || !has('--go');
const TARGET = (val('--target', 'local') as 'local' | 'prod');
const BASE = val('--base', TARGET === 'prod' ? 'https://www.gradd.ai' : 'http://localhost:3000')!;
const EMAIL = val('--email', 'afm-demo-sit@gradd.ai')!;
const MARK_AFTER = has('--mark');
const LOG_PATH = val('--log');
// ⚠️ ANYTHING BUT 1 PRODUCES UNUSABLE PACING. It exists ONLY to smoke-test the mechanics
// end to end in ~2 minutes before committing to the real 2h47m run. A scaled run must be
// thrown away (different account) — never demoed.
const SCALE = Number(val('--scale', '1'));

const MOCK_ID = 'afm-paper-1';
const PAPER = 'AFM';

// ── the paper, in paper order. Waits are BEFORE each submission, so the wait for Rn is the
// interval the pacing view will report between R(n-1) and Rn (and for R1, between the start
// of the attempt and R1 — which pacing reports as "reading + first requirement", ratio null).
//
// 167 minutes against a 195-minute clock: bled time on case 1, recovered on case 2, rushed
// case 3. Budgets are marks x 1.95 (lib/acca/pacing.ts MINUTES_PER_MARK).
//
// ── WHY R7=12 AND R8=6, NOT 16 AND 8 (revised 2026-09-01) ────────────────────
// The first schedule totalled 173 and produced two `under` flags but NO collapse headline,
// which is a threshold fact worth writing down rather than rediscovering:
// `detectCollapse` takes the SHORTEST SUFFIX (excluding R1) whose combined budget is at
// least 20% of the paper's requirement budget — here R7+R8, budget 39.0 min = 25% of 156 —
// and fires only when the ACTUAL is under 50% of that, i.e. below 19.5 min. 16+8 = 24 misses
// it; 12+6 = 18 clears it. So the debrief now STATES the end-of-paper collapse instead of
// leaving a reader to infer it from two ratios.
//
// Expected flags: R1 no_ratio (reading + first requirement) · R2 1.35 over · R3 1.35 over ·
// R4 1.11, R5 1.03, R6 0.96 on budget · R7 0.51 under · R8 0.38 under · collapse FIRES.
const PLAN = [
  { key: 'R1', case_id: 'aa000000-0000-4000-8000-00000000a001', order: 1, wait: 34, marks: 10, label: 'Solenne (i) B3e' },
  { key: 'R2', case_id: 'aa000000-0000-4000-8000-00000000a001', order: 2, wait: 42, marks: 16, label: 'Solenne (ii) B5b' },
  { key: 'R3', case_id: 'aa000000-0000-4000-8000-00000000a001', order: 3, wait: 21, marks: 8,  label: 'Solenne (iii) E2b' },
  { key: 'R4', case_id: 'aa000000-0000-4000-8000-00000000a001', order: 4, wait: 13, marks: 6,  label: 'Solenne (iv) E1a' },
  { key: 'R5', case_id: 'aa000000-0000-4000-8000-00000000b101', order: 1, wait: 24, marks: 12, label: 'Brecon (i) B1a' },
  { key: 'R6', case_id: 'aa000000-0000-4000-8000-00000000b101', order: 2, wait: 15, marks: 8,  label: 'Brecon (ii) B1b' },
  { key: 'R7', case_id: 'aa000000-0000-4000-8000-00000000b201', order: 1, wait: 12, marks: 12, label: 'Aldebrino (i) E3a' },
  { key: 'R8', case_id: 'aa000000-0000-4000-8000-00000000b201', order: 2, wait: 6,  marks: 8,  label: 'Aldebrino (ii) E2a' },
] as const;

const CASE_IDS = Array.from(new Set(PLAN.map((p) => p.case_id)));
const ANSWERS_FILE = path.join(__dirname, '..', 'docs', 'demo', 'afm_seed_answers.md');

// ── env ──────────────────────────────────────────────────────────────────────
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// LAZY, and deliberately not a module-level throw. Validating env at import time would
// re-break the import guard above — the module could not be loaded to check the answer
// parser without secrets present. Env is required to RUN, not to LOAD.
let _svc: ReturnType<typeof createClient> | null = null;
function db() {
  if (!_svc) {
    if (!URL_ || !ANON || !SVC) throw new Error('Missing Supabase env — run with --env-file=.env.local');
    _svc = createClient(URL_, SVC, { auth: { persistSession: false } });
  }
  return _svc;
}

// ── logging ──────────────────────────────────────────────────────────────────
function log(msg: string) {
  const line = `${new Date().toISOString()}  ${msg}`;
  console.log(line);
  if (LOG_PATH) { try { fs.appendFileSync(LOG_PATH, line + '\n'); } catch { /* logging must never kill the run */ } }
}

// ── the eight answers, parsed from the reviewed markdown ─────────────────────
// Read from docs/demo/afm_seed_answers.md rather than inlined, so the text Grant REVIEWS is
// byte-for-byte the text that is submitted. An inlined copy is a second source that drifts.
// ⚠️ SPLIT, NOT ONE BIG REGEX. The first version used
// `/^## (R[1-8]) —[^\n]*\n([\s\S]*?)(?=^## |\Z)/gm` and silently returned an EMPTY R8:
// `\Z` is Perl/Ruby, not JavaScript — in JS it is a literal `Z`, so the lookahead could
// never terminate the FINAL section. Every other section had a following `## ` to stop on,
// so 7 of 8 parsed and the bug hid in the last one. Splitting on the heading has no
// end-of-input special case to get wrong.
function loadAnswers(): Record<string, string> {
  const md = fs.readFileSync(ANSWERS_FILE, 'utf8');
  const out: Record<string, string> = {};
  for (const chunk of md.split(/^## /m).slice(1)) {
    const nl = chunk.indexOf('\n');
    if (nl < 0) continue;
    const heading = chunk.slice(0, nl);
    const key = /^(R[1-8])\b/.exec(heading)?.[1];
    if (!key) continue;
    out[key] = chunk.slice(nl + 1)
      // review metadata directly under the heading — not candidate writing
      .replace(/^\*\(deliberate defects?:[^\n]*\)\*\s*$/mi, '')
      .replace(/^---\s*$/gm, '')
      .trim();
  }
  return out;
}

// ── auth: mint a real session cookie for the seeded account ──────────────────
async function mintCookie(email: string): Promise<string> {
  const { data: link, error } = await db().auth.admin.generateLink({ type: 'magiclink', email });
  if (error) throw new Error('generateLink: ' + error.message);
  const th = (link as { properties: { hashed_token: string } }).properties.hashed_token;
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: v, error: e2 } = await anon.auth.verifyOtp({ type: 'magiclink', token_hash: th });
  if (e2) throw new Error('verifyOtp: ' + e2.message);
  const jar: Record<string, string> = {};
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
      setAll: (arr: Array<{ name: string; value: string }>) => arr.forEach(({ name, value }) => { jar[name] = value; }),
    },
  });
  await ssr.auth.setSession({ access_token: v.session!.access_token, refresh_token: v.session!.refresh_token });
  return Object.entries(jar).map(([n, val_]) => `${n}=${val_}`).join('; ');
}

async function findUser(email: string): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data } = await db().auth.admin.listUsers({ page, perPage: 200 });
    const u = data?.users.find((x) => x.email === email);
    if (u) return u.id;
    if (!data || data.users.length < 200) break;
  }
  return null;
}

// ── preflight ────────────────────────────────────────────────────────────────
// Every check that can refuse the run happens BEFORE the clock starts. A 2h47m run that
// dies at minute 170 on something knowable at minute 0 is the failure this exists to stop.
async function preflight(): Promise<{ userId: string; cookie: string; reqIds: Map<string, string> }> {
  // 1. answers file present and complete
  if (!fs.existsSync(ANSWERS_FILE)) throw new Error(`answers file missing: ${ANSWERS_FILE}`);
  const answers = loadAnswers();
  const missing = PLAN.filter((p) => !answers[p.key] || answers[p.key].length < 200).map((p) => p.key);
  if (missing.length) throw new Error(`answers file has no usable section for: ${missing.join(', ')}`);
  log(`✓ answers: 8/8 sections parsed (${PLAN.map((p) => `${p.key}:${answers[p.key].length}ch`).join(' ')})`);

  // 2. server reachable AND the APM_CASES flag is ON.
  //    401 = flag on (both routes check the flag before auth); 404 = flag off.
  const probe = await fetch(`${BASE}/api/acca/case/list?paper=AFM`).catch(() => null);
  if (!probe) throw new Error(`server unreachable at ${BASE} — start it, or pass --base`);
  if (probe.status === 404) throw new Error(`APM_CASES is OFF at ${BASE} (probe 404). Set APM_CASES=1 and restart.`);
  if (probe.status !== 401) log(`⚠ probe returned ${probe.status} (expected 401); continuing`);
  else log(`✓ ${BASE} reachable, APM_CASES on (probe 401)`);

  // 3. the three cases are servable as sit content
  const { data: cases } = await db().from('acca_cases')
    .select('id, title, paper_code, status, published, mock_only').in('id', CASE_IDS);
  if (!cases || cases.length !== 3) throw new Error(`expected 3 mock cases, found ${cases?.length ?? 0}`);
  for (const c of cases as Array<Record<string, unknown>>) {
    if (c.status !== 'approved' || c.published !== true || c.mock_only !== true || c.paper_code !== 'AFM') {
      throw new Error(`case ${c.id} is not servable AFM sit content (status/published/mock_only/paper)`);
    }
  }
  log('✓ all 3 cases approved + published + mock_only + AFM');

  // 4. resolve requirement ids by (case_id, requirement_order)
  const { data: reqs } = await db().from('acca_case_requirements')
    .select('id, case_id, requirement_order, marks_guide').in('case_id', CASE_IDS);
  const reqIds = new Map<string, string>();
  for (const p of PLAN) {
    const row = (reqs ?? []).find((r) => (r as Record<string, unknown>).case_id === p.case_id
      && (r as Record<string, unknown>).requirement_order === p.order);
    if (!row) throw new Error(`no requirement for ${p.key} (${p.case_id} #${p.order})`);
    const marks = (row as Record<string, unknown>).marks_guide;
    if (marks !== p.marks) throw new Error(`${p.key} marks_guide is ${marks}, plan says ${p.marks} — budgets would be wrong`);
    reqIds.set(p.key, (row as Record<string, unknown>).id as string);
  }
  log('✓ 8/8 requirements resolved, marks_guide agrees with the plan');

  // 5. account — reuse if present, else create
  let userId = await findUser(EMAIL);
  if (userId) {
    log(`✓ account exists: ${EMAIL} (${userId})`);
  } else if (DRY_RUN) {
    log(`· account ${EMAIL} does not exist yet — would be created on --go`);
  } else {
    const { data, error } = await db().auth.admin.createUser({ email: EMAIL, email_confirm: true });
    if (error || !data.user) throw new Error('createUser: ' + (error?.message ?? 'no user'));
    userId = data.user.id;
    log(`✓ account CREATED: ${EMAIL} (${userId})`);
  }

  // 6. ⛔ HARD STOP — the account must not have marked these cases.
  //    acca_case_marking is keyed (user_id, case_id) with NO attempt_id, so an account that
  //    has already marked them can never be marked afresh: casesNeedingMarking sees rows and
  //    the results POST does zero model work. That is what makes ee07f08c unusable and it is
  //    the single most important guard here.
  if (userId) {
    const { data: marks } = await db().from('acca_case_marking')
      .select('case_id').eq('user_id', userId).in('case_id', CASE_IDS);
    if (marks && marks.length > 0) {
      throw new Error(
        `REFUSING: ${EMAIL} already has ${marks.length} acca_case_marking row(s) for these cases. ` +
        `acca_case_marking is keyed (user_id, case_id) with no attempt_id, so this paper can never ` +
        `be marked fresh on this account. Use a different --email.`,
      );
    }
    log('✓ account has no prior marking rows for these 3 cases');
  }

  // 7. entitlement
  if (userId) {
    const { data: ents } = await db().from('acca_entitlements')
      .select('paper_code, expires_at, revoked_at').eq('user_id', userId);
    const live = (ents ?? []).some((e) => {
      const r = e as Record<string, unknown>;
      return r.paper_code === 'AFM' && !r.revoked_at && typeof r.expires_at === 'string'
        && new Date(r.expires_at).getTime() > Date.now();
    });
    if (live) {
      log('✓ AFM entitlement already live');
    } else if (DRY_RUN) {
      log('· no live AFM entitlement — one would be granted on --go');
    } else {
      // `expires_at` is the ENTITLEMENT's validity, not a sit timing record. 90 days.
      const { error } = await db().from('acca_entitlements').insert({
        user_id: userId, paper_code: 'AFM', source: 'comp', kind: 'pass',
        expires_at: new Date(Date.now() + 90 * 86400_000).toISOString(),
        note: 'demo sit seed — scripts/seed-demo-sit.ts',
      });
      if (error) throw new Error('entitlement insert: ' + error.message);
      log('✓ AFM entitlement GRANTED (comp pass, 90d)');
    }
  }

  const cookie = DRY_RUN && !userId ? '' : await mintCookie(EMAIL);
  if (cookie) log('✓ session cookie minted');
  return { userId: userId!, cookie, reqIds };
}

// ── route calls ──────────────────────────────────────────────────────────────
async function sitAction(cookie: string, action: 'start' | 'finish') {
  const r = await fetch(`${BASE}/api/acca/sit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ action, mock_id: MOCK_ID, paper: PAPER }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`sit ${action} → ${r.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function submit(cookie: string, caseId: string, requirementId: string, answer: string) {
  const r = await fetch(`${BASE}/api/acca/case/turn`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({
      case_id: caseId, requirement_id: requirementId,
      student_message: answer, sitting: true, paper: PAPER,
    }),
  });
  const text = await r.text();
  let code: string | null = null;
  try { code = (JSON.parse(text) as { error?: string }).error ?? null; } catch { /* non-JSON body */ }
  // 409 already_submitted means the answer IS recorded — a resume after a crash mid-POST
  // lands here and must read as success. Any other 409 is a refusal.
  if (r.ok) return 'submitted';
  if (r.status === 409 && code === 'already_submitted') return 'already';
  throw new Error(`turn → ${r.status} ${code ?? text.slice(0, 200)}`);
}

/** Which plan keys already carry a recorded answer for this attempt. Read-only. */
async function submittedKeys(userId: string, attemptId: string, reqIds: Map<string, string>): Promise<Set<string>> {
  const { data } = await db().from('acca_case_progress')
    .select('requirement_id, final_answer').eq('user_id', userId).eq('attempt_id', attemptId);
  const done = new Set<string>();
  for (const [key, rid] of reqIds) {
    const row = (data ?? []).find((p) => (p as Record<string, unknown>).requirement_id === rid);
    if (row && (row as Record<string, unknown>).final_answer != null) done.add(key);
  }
  return done;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const totalWait = PLAN.reduce((a, p) => a + p.wait, 0);
  log(`seed-demo-sit — target=${TARGET} base=${BASE} email=${EMAIL} scale=${SCALE}`);
  log(`plan: ${totalWait} min of waits against a 195-min clock; mark-after=${MARK_AFTER}`);
  if (SCALE !== 1) log(`⚠️  SCALE=${SCALE} — pacing from this run is MEANINGLESS. Smoke test only; throw the account away.`);

  const { userId, cookie, reqIds } = await preflight();
  const answers = loadAnswers();

  if (DRY_RUN) {
    log('');
    log('DRY RUN — nothing was started, nothing was submitted. Plan:');
    let cum = 0;
    for (const p of PLAN) {
      cum += p.wait;
      const budget = (p.marks * 1.95).toFixed(1);
      log(`   ${p.key}  wait ${String(p.wait).padStart(2)}min  (cum ${String(cum).padStart(3)})  budget ${budget}min  ${p.label}  [${answers[p.key]?.length ?? 0} chars]`);
    }
    log(`   finish → completed_at written by the route`);
    log('');
    log('Re-run with --go to perform it.');
    return;
  }

  // ── start (or resume) ──
  const started = await sitAction(cookie, 'start');
  const attempt = started.attempt as { started_at: string; ends_at: string; completed: boolean };
  log(`✓ attempt ${started.resumed ? 'RESUMED' : 'STARTED'} — started_at=${attempt.started_at} ends_at=${attempt.ends_at}`);

  const { data: att } = await db().from('acca_mock_attempts')
    .select('id, started_at, ends_at').eq('user_id', userId).eq('mock_id', MOCK_ID)
    .eq('started_at', attempt.started_at).maybeSingle();
  const attemptId = (att as Record<string, unknown> | null)?.id as string;
  if (!attemptId) throw new Error('could not resolve attempt id after start');

  const done = await submittedKeys(userId, attemptId, reqIds);
  if (done.size) log(`↻ resuming — already submitted: ${[...done].join(', ')}`);

  for (const p of PLAN) {
    if (done.has(p.key)) { log(`↷ ${p.key} already recorded — skipping (no wait)`); continue; }

    const waitMs = p.wait * 60_000 * SCALE;
    const dueAt = new Date(Date.now() + waitMs).toISOString();
    log(`⏱  ${p.key} — waiting ${p.wait}min (scaled ${Math.round(waitMs / 1000)}s), will submit at ~${dueAt}`);
    await sleep(waitMs);

    // The clock is server-authoritative; if it has run out, stop rather than push answers
    // the sit route will refuse.
    if (Date.now() > new Date(attempt.ends_at).getTime()) {
      log(`✖ clock expired (ends_at=${attempt.ends_at}) before ${p.key}. Stopping; run again to finish what remains.`);
      break;
    }

    const res = await submit(cookie, p.case_id, reqIds.get(p.key)!, answers[p.key]);
    log(`✓ ${p.key} ${res} — ${p.label} (${answers[p.key].length} chars, budget ${(p.marks * 1.95).toFixed(1)}min)`);
  }

  const stillOpen = await submittedKeys(userId, attemptId, reqIds);
  if (stillOpen.size < PLAN.length) {
    log(`⚠ only ${stillOpen.size}/8 recorded — NOT finishing the attempt. Re-run to complete it.`);
    return;
  }

  await sitAction(cookie, 'finish');
  log('✓ attempt FINISHED (completed_at written by the route)');

  if (MARK_AFTER) {
    log('▶ marking (real POST /api/acca/sit/results) — 3 cases sequentially, expect 2–4 min…');
    const t0 = Date.now();
    const r = await fetch(`${BASE}/api/acca/sit/results`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ mock_id: MOCK_ID, paper: PAPER }),
    });
    const text = await r.text();
    if (!r.ok) { log(`✖ marking → ${r.status} ${text.slice(0, 300)}`); log('  Re-run with --mark to retry only what is unmarked.'); return; }
    const j = JSON.parse(text) as { marked_now?: number; marked?: boolean };
    log(`✓ marked ${j.marked_now ?? 0} case(s) in ${Math.round((Date.now() - t0) / 1000)}s (all marked: ${j.marked})`);
  } else {
    log('· NOT marked. The first person to open the results will trigger it — 2–4 min of spinner.');
    log('  Re-run with --mark (and --go) to mark it now instead.');
  }

  log('');
  log(`DONE. Account: ${EMAIL}  attempt: ${attemptId}`);
  log(`Open ${BASE}/acca/afm/mock signed in as that account to see the debrief.`);
}

// ── IMPORT GUARD ─────────────────────────────────────────────────────────────
// main() must NOT run on import. Without this, importing the module to check the answer
// parser fires preflight — network probe, DB reads, and on --go a real account. The same
// defect is on file for generate-seed-questions.ts; not repeating it here.
const isDirectRun = !!process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  main().catch((e) => {
    log(`✖ FAILED: ${(e as Error).message}`);
    log('  State is in the DB — re-run the same command to resume from where it stopped.');
    process.exitCode = 1;   // P-G4: never process.exit()
  });
}

export { loadAnswers, PLAN, ANSWERS_FILE };
