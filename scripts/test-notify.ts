// scripts/test-notify.ts
// Fixture for the notifyGrant skip-log contract (lib/notify.ts). Pure — exercises the
// config-gate branches only (no network), which are the ones that silently ate the
// 2026-07-13 signup alert. A skip must return the EXACT reason string (also console.error'd)
// and never throw. The send-success / send-error branches need a live Resend key and are
// verified in production via the callback's instrumented logs.

import { notifyGrant } from '../lib/notify';

let failures = 0;
function ok(name: string, cond: boolean, got?: unknown) {
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${cond ? '' : ` (got ${JSON.stringify(got)})`}`);
  if (!cond) failures++;
}

async function main() {
  const origTo = process.env.NOTIFY_EMAIL;
  const origKey = process.env.RESEND_API_KEY;

  // (1) NOTIFY_EMAIL unset → skip reason, no throw.
  delete process.env.NOTIFY_EMAIL;
  delete process.env.RESEND_API_KEY;
  let threw = false;
  let r1: string | null = 'unset';
  try { r1 = await notifyGrant('t', 't'); } catch { threw = true; }
  ok('NOTIFY_EMAIL unset → returns exact reason', r1 === 'NOTIFY_EMAIL unset', r1);
  ok('NOTIFY_EMAIL unset → never throws', threw === false, threw);

  // (2) NOTIFY_EMAIL set but RESEND_API_KEY unset → the OTHER config skip.
  process.env.NOTIFY_EMAIL = 'ops@example.com';
  const r2 = await notifyGrant('t', 't');
  ok('RESEND_API_KEY unset → returns exact reason', r2 === 'RESEND_API_KEY unset', r2);

  // restore
  if (origTo === undefined) delete process.env.NOTIFY_EMAIL; else process.env.NOTIFY_EMAIL = origTo;
  if (origKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = origKey;

  console.log(`\n${'─'.repeat(48)}`);
  console.log(failures === 0 ? 'ALL NOTIFY FIXTURES PASS' : `${failures} NOTIFY FIXTURE(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
main();
