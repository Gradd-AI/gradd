import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { listSitAttempts } from '@/lib/acca/sit-report';
import { resolvePaper } from '@/lib/acca/paper';
import { paperHref } from '@/lib/acca/paper-url';
import { ORG_CSS, fmtDate } from '@/components/org/orgTheme';
import ACCASignOutButton from '@/components/acca/ACCASignOutButton';

// ── YOUR PAPERS — the index of the student's own sat mocks ────────────────────
// Paper-parameterised (`?paper=AFM`), unlike the detail page one level down: a LIST is a
// question about a paper, a sitting is a row that already knows its own. That is the same
// split lib/acca/case-surface.ts draws between /acca/cases and /acca/cases/<id>.
//
// ── NO ENTITLEMENT GATE HERE, DELIBERATELY ───────────────────────────────────
// The index names papers the student sat and dates them, and nothing more — no marks, no
// bands, no feedback. Every one of those lives on the detail page, which applies the same
// `hasPaperAccess` gate app/api/acca/sit/results does. Gating the index as well would tell a
// lapsed student nothing except that something exists, which is worse than letting them see
// the shape of what they are being sold back.
//
// ── WHAT IS AND IS NOT LISTED ────────────────────────────────────────────────
// `listSitAttempts` refuses to list an attempt with no progress rows of its own, and that is
// not tidiness: measured 2026-09-04, 13 of 15 completed attempts in production hold nothing
// at all (pre-`attempt_id` APM sittings whose work went through the practice path, so their
// rows carry a NULL attempt_id and by doctrine can never reach a sit debrief). One real
// account has five completed attempts, one of which has content. Listing on `completed`
// alone would show that student four blank papers.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your papers — ACCA | Gradd',
  robots: { index: false, follow: false },
};

export default async function ResultsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect('/acca/auth?next=/acca/results');

  const { paper: paperParam } = await searchParams;
  const paper = resolvePaper(typeof paperParam === 'string' ? paperParam : undefined);

  const accaHomeHref = paperHref('/acca', paper);
  const mockHref = paper === 'AFM' ? '/acca/afm/mock' : '/acca/mock';

  const attempts = await listSitAttempts(createServiceClient(), user.id, paper);

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <style>{INDEX_CSS}</style>

      <header className="org-header">
        <Link className="wordmark" href={accaHomeHref} aria-label="Gradd ACCA home">
          <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
        </Link>
        <span className="org-crumb">
          <Link href={accaHomeHref}>ACCA {paper}</Link><span>›</span> Your papers
        </span>
        <ACCASignOutButton />
      </header>

      <h1>Your papers</h1>
      <p className="sub">
        Every timed {paper} paper you have sat, with its marks and feedback. These stay here —
        come back to them whenever you like.
      </p>

      <div className="org-panel">
        {attempts.length === 0 ? (
          <>
            {/* An ordinary fact, not an error: most students arrive here before they have sat
                anything. It says what to do rather than what is missing. */}
            <p className="sitx-empty">
              You haven&rsquo;t finished a timed {paper} paper yet. When you do, it lands here
              with your marks, the marker&rsquo;s feedback on every requirement, and what you wrote.
            </p>
            <Link className="res-cta" href={mockHref}>Sit the {paper} mock →</Link>
          </>
        ) : (
          <table className="org-list">
            <thead>
              <tr><th>Paper</th><th>Sat</th><th className="num">Answered</th><th>Marked</th><th /></tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.attempt_id}>
                  <td>{a.title}</td>
                  <td className="date">{fmtDate(a.started_at)}</td>
                  {/* "7 of 8" is a real finding — a paper that ended on the clock leaves the
                      tail unreached, which the debrief reports differently from a blank. */}
                  <td className="num">{a.answered} of {a.total}</td>
                  <td>
                    {a.banded > 0
                      ? <span className="org-out ok">marked</span>
                      : <span className="org-out miss">not marked</span>}
                  </td>
                  <td>
                    <Link className="res-open" href={`/acca/results/${a.attempt_id}`}>
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* A paper that was never marked is not a dead end — the mock surface still owns the
          retry, and it is the only place that can spend a marking call. Said only when there
          is such a paper, so it is never a nag. */}
      {attempts.some((a) => a.banded === 0) && (
        <p className="org-note">
          A paper showing <b>not marked</b> was submitted but never marked — open the{' '}
          <Link href={mockHref}>timed mock</Link> to finish marking it.
        </p>
      )}
    </div>
  );
}

const INDEX_CSS = `
.org .res-cta { display:inline-block; background:var(--brand); color:#fff; font-size:13px; font-weight:700; padding:10px 18px; border-radius:8px; text-decoration:none; margin-top:14px; }
.org .res-cta:hover { filter:brightness(1.06); }
.org .res-open { font-size:12.5px; font-weight:700; color:var(--brand); text-decoration:none; white-space:nowrap; }
.org .res-open:hover { text-decoration:underline; }
`;
