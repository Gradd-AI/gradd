import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { buildSitReport } from '@/lib/acca/sit-report';
import { hasPaperAccess } from '@/lib/acca/access';
import { paperHref } from '@/lib/acca/paper-url';
import { ORG_CSS, fmtDate } from '@/components/org/orgTheme';
import ACCASignOutButton from '@/components/acca/ACCASignOutButton';
import MockResultsViewed from '@/components/acca/MockResultsViewed';

// ── THE STUDENT'S PERMANENT RESULTS PAGE ──────────────────────────────────────
// One sat paper: totals, the debrief's own headline, pacing, and per requirement the band,
// the marker's reasoning verbatim, what was asked, what the student wrote, and the teaching
// reveal. It is the same document a coordinator reads on the trainee page, scoped to the
// session instead of to a target user — `lib/acca/sit-report.ts` assembles both.
//
// It exists because the debrief was a ONE-SHOT screen. It lived in `SitRunner`'s `done`
// phase, reachable only by loading the mock surface, which resolves the LATEST attempt and
// nothing else — so a student's earlier sittings were unreachable and every debrief was
// effectively read once and lost. Asking for it by email was the workaround; this is the
// thing itself.
//
// ── ID-ADDRESSED. NO `?paper=`, EVER ─────────────────────────────────────────
// The attempt row owns the paper (`mock_id` → the registry), the same rule
// lib/acca/case-surface.ts states for /acca/cases/<id>. A `?paper=` on this URL would be a
// second source for one fact, and a bookmark carrying a stale one would resolve to the
// wrong paper's registry entry.
//
// ── IT CANNOT RE-TRIGGER MARKING ─────────────────────────────────────────────
// Structurally, not by a flag. This is a server component; it imports `buildSitReport` and
// nothing that writes. There is no POST here, no `runCaseMarking`, no `claimCase`. Marking
// is a paid model call whose output moves run to run and it keeps its single trigger — the
// client POSTing sit/results from `SitRunner`'s `done` phase. A revisit is a read, so an
// unmarked paper renders honestly (null bands, null marks) rather than being marked on
// sight by someone opening a link.
//
// ── ⚠️ `model_answer` IS NOT ON THIS PAGE, AND MUST NOT BE ───────────────────
// app/api/acca/case, app/api/acca/sit and app/api/acca/sit/results each state that they
// withhold it. Those three stand unchanged; this is the fourth statement of the same rule,
// and the case is strongest here because this is the surface a student KEEPS.
//
// A mock case is `mock_only` reserved content, there is exactly one mock per paper, and
// disclosure is per-student irreversible — a paper whose model answers have been read is a
// paper that is spent, and a re-sit cannot be marked anyway (acca_case_marking has no
// attempt dimension, AFM_SURFACED.md 2026-08-01). The withhold is also ARCHITECTURAL rather
// than instructed (docs/TEACHING_ARCHITECTURE.md, LOCKED): the tutor cannot reveal an answer
// because the answer is never in reach, and a page holding it builds the surface that design
// deliberately never built. `lib/acca/sit-report.ts` does not select the column, so there is
// nothing here to leak even by accident.
//
// What IS shown is `full_reveal` (ruled by Grant, 2026-09-04) — the teaching field, authored
// to teach the method and name the misconception without handing over the answer, and the
// same field the drill loop's earned reveal serves. Plus `question`, which is not a
// disclosure at all: the student read it during the paper, and an answer printed without its
// question is not revisable.
//
// ── ⚠️ HELD DECISION, NOT A PERMANENT ONE: A LAPSED SUBSCRIPTION HIDES THIS ──
// The entitlement gate matches app/api/acca/sit/results exactly (`hasPaperAccess`, per
// paper), so a student whose subscription has lapsed sees the locked panel instead of a
// paper they sat while paying. Grant ruled it this way on 2026-09-04 to keep one rule on one
// surface family rather than to settle the policy: whether a permanent record of
// already-purchased work should survive a lapse is open, and this is the reversible
// direction. A page has no status code to give, so it renders SitRunner's locked copy rather
// than the API's 402 — same gate, same voice, one layer out.

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your paper — ACCA | Gradd',
  // Never indexed. A sat exam paper quoted in search results leaks reserved content to
  // candidates who have not sat it — the same rule the mock surface itself carries.
  robots: { index: false, follow: false },
};

export default async function SitResultPage(
  { params }: { params: Promise<{ attemptId: string }> },
) {
  const { attemptId } = await params;

  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect(`/acca/auth?next=/acca/results/${encodeURIComponent(attemptId)}`);

  // ⚠️ SERVICE CLIENT, and it must be (the 2026-08-09 progress-page lesson).
  // `acca_entitlements` has RLS enabled and NO policies at all — service-role only, by its
  // migration's design — so a session client reads ZERO rows with NO error, which
  // `hasPaperAccess` cannot tell from "this user has no entitlements". Every read below is
  // scoped to this user's own id, so escalating grants no breadth.
  const sb = createServiceClient();

  // `buildSitReport` applies `.eq('user_id', …)` to the attempt lookup AND re-checks the
  // returned row against it, so an attempt id belonging to somebody else resolves to null
  // here rather than to their paper.
  const report = await buildSitReport(sb, user.id, attemptId);
  // notFound(), not a redirect: to this student, another person's sitting — or one that was
  // never sat — does not exist, and a 404 says so without confirming the id is real.
  if (!report) notFound();

  const paper = report.paper.paper;
  const { data: profile } = await authClient
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();
  const paid = await hasPaperAccess(sb, user.id, paper, profile ?? null);

  const accaHomeHref = paperHref('/acca', paper);
  const resultsHref = paperHref('/acca/results', paper);
  const progressHref = paperHref('/acca/progress', paper);
  const subscribeHref = paperHref('/acca/subscribe', paper);

  const shell = (body: ReactNode) => (
    <div className="org">
      <style>{ORG_CSS}</style>
      <style>{RESULTS_CSS}</style>
      <header className="org-header">
        <Link className="wordmark" href={accaHomeHref} aria-label="Gradd ACCA home">
          <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
        </Link>
        <span className="org-crumb">
          <Link href={accaHomeHref}>ACCA {paper}</Link><span>›</span>
          <Link href={resultsHref}>Your papers</Link><span>›</span> {report.paper.title}
        </span>
        <ACCASignOutButton />
      </header>
      {body}
    </div>
  );

  if (!paid) {
    // Same copy register as SitRunner's locked phase and CaseSession's — one status, one
    // voice. It leads with the work being safe because that is both true and the first thing
    // a student needs to hear about a paper they have already sat.
    return shell(
      <>
        <h1>{report.paper.title}</h1>
        <div className="org-panel">
          <p className="res-locked-lead"><strong>Your paper is saved.</strong> Every answer you
            submitted is stored exactly as you submitted it — nothing here is lost.</p>
          <p className="org-note">
            Your marks, feedback and debrief are part of the {paper} subscription, and it has
            lapsed. Subscribe and this paper opens again in full.
          </p>
          <Link className="res-cta" href={subscribeHref}>Subscribe to unlock →</Link>
        </div>
      </>,
    );
  }

  // Requirement id → "Q1 (i)". `display_name` is the only safe reference: the stored label
  // carries the internal LO code the sit route strips at its own serve boundary, so printing
  // it here would re-leak exactly what that boundary removes.
  const nameByReq = new Map(
    report.debrief.cases.flatMap((g) => g.requirements.map((l) => [l.requirement_id, l.display_name] as const)),
  );
  const t = report.debrief.totals;
  const paperTotal = t.technical_awarded != null && t.professional_awarded != null
    ? t.technical_awarded + t.professional_awarded
    : null;

  return shell(
    <>
      {/* Renders nothing. See the component for why the emit is client-side. */}
      <MockResultsViewed attemptId={report.attempt.id} mockId={report.attempt.mock_id} paper={paper} />

      <h1>{report.paper.title}</h1>
      <p className="sub">
        Sat {fmtDate(report.attempt.started_at)}
        {report.pacing.total_elapsed_minutes != null
          ? ` · ${Math.floor(Math.max(0, report.pacing.total_elapsed_minutes))} min of ${report.paper.duration_minutes}`
          : ''}
        {' · '}<Link href={resultsHref}>all your papers</Link>
      </p>

      <div className="org-panel">
        {/* TOTALS ARE FACTS, NOT A GRADE. The debrief predicts no pass mark and neither does
            this page — same rule the sit's own debrief screen and the coordinator's view keep. */}
        <div className="sitx-totals">
          <div className="sitx-total">
            <span className="sitx-total-k">Technical</span>
            <span className="sitx-total-v">
              {t.technical_awarded ?? '—'}<small>/{t.technical_available}</small>
            </span>
          </div>
          <div className="sitx-total">
            <span className="sitx-total-k">Professional skills</span>
            <span className="sitx-total-v">
              {t.professional_awarded ?? '—'}<small>/{t.professional_available ?? '—'}</small>
            </span>
          </div>
          <div className="sitx-total">
            <span className="sitx-total-k">Paper</span>
            <span className="sitx-total-v">
              {paperTotal ?? '—'}
              <small>/{t.technical_available + (t.professional_available ?? 0)}</small>
            </span>
          </div>
        </div>

        {report.debrief.headline.code !== 'none' && (
          <p className="res-headline">{report.debrief.headline.statement}</p>
        )}
        {report.debrief.secondary.map((s, i) => (
          <p className="res-secondary" key={i}>{s.statement}</p>
        ))}

        {/* ⚠️ THE MULTI-SITTING CAVEAT. acca_case_progress is attempt-scoped;
            acca_case_marking is keyed (user_id, case_id) with no attempt dimension, so the
            case-level totals are the LATEST marking of those cases. Said plainly rather than
            assumed away — two halves of one screen must not disagree in silence. */}
        {report.other_completed_attempts > 0 && (
          <p className="org-note">
            You have sat this paper {report.other_completed_attempts + 1} times. The marks and
            feedback on each requirement below are from this sitting; the totals and the
            professional-skills feedback come from the most recent time these cases were marked.
          </p>
        )}
        {report.pacing.not_evaluated && <p className="org-note">{report.pacing.not_evaluated}</p>}
        {report.debrief.limitations.map((l, i) => <p className="org-note" key={i}>{l}</p>)}
      </div>

      {/* PACING — budgets and flags, marks alongside and never merged into them. Requirement
          1 carries no ratio: its interval contains reading the whole Section A scenario,
          which is why pacing.ts flags it `no_ratio`. */}
      <div className="org-panel">
        <h2 style={{ margin: '0 0 10px' }}>Pacing</h2>
        <table className="org-list">
          <thead>
            <tr>
              <th>Requirement</th><th className="num">Marks</th><th className="num">Elapsed</th>
              <th className="num">Budget</th><th className="num">Ratio</th><th>Flag</th><th className="num">Awarded</th>
            </tr>
          </thead>
          <tbody>
            {report.pacing.rows.map((p) => (
              <tr key={p.requirement_id}>
                <td>{nameByReq.get(p.requirement_id) ?? `#${p.paper_order}`}</td>
                <td className="num">{p.marks_available}</td>
                <td className="num">{p.interval_minutes == null ? '—' : `${Math.floor(p.interval_minutes)}m`}</td>
                <td className="num">{Math.floor(p.budget_minutes)}m</td>
                <td className="num">{p.ratio == null ? '—' : p.ratio.toFixed(2)}</td>
                <td>
                  <span className={`sitx-flag ${p.flag}`}>
                    {p.flag === 'no_ratio' ? 'reading + Q1' : p.flag.replace('_', ' ')}
                  </span>
                </td>
                <td className="num">{p.marks_awarded ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PER REQUIREMENT — band, marks, the marker's own words verbatim, then the three
          revision fields behind their own expands. */}
      {report.debrief.cases.map((g) => (
        <div className="org-panel" key={g.case_id}>
          <h2 style={{ margin: '0 0 2px' }}>
            {g.display_name} — {g.title ?? 'Untitled case'}{' '}
            <span className="sitx-req-marks">{g.technical_awarded ?? '—'}/{g.technical_available}</span>
          </h2>
          {g.requirements.map((l) => {
            const answer = report.answers[l.requirement_id];
            const study = report.study[l.requirement_id];
            return (
              <div className="sitx-req" key={l.requirement_id}>
                <div className="sitx-req-top">
                  <span className="sitx-req-name">{l.display_name}</span>
                  {l.band && <span className={`sitx-band ${l.band}`}>{l.band}</span>}
                  <span className="sitx-req-marks">{l.marks_awarded ?? '—'}/{l.marks_available}</span>
                </div>

                <p className="res-line"><span className="res-key">Marks:</span> {l.what_was_lost}</p>
                {l.pacing_note && (
                  <p className="res-line"><span className="res-key">Pacing:</span> {l.pacing_note}</p>
                )}

                {/* The technical marker's reasoning, exactly as written. debrief.ts is built
                    around never paraphrasing this, so neither does the render. */}
                {l.why
                  ? <p className="sitx-why">{l.why}</p>
                  : <p className="sitx-sub">No marker reasoning was recorded for this requirement.</p>}

                <p className="res-line"><span className="res-key">Next:</span> {l.next_action}</p>

                {/* Collapsed by default, all three. Eight requirements of exam prose printed
                    open is a wall nobody reads; the point of a permanent page is that a
                    student can come back and open ONE thing. */}
                {study?.question && (
                  <details className="sitx-answer">
                    <summary>What you were asked</summary>
                    <pre>{study.question}</pre>
                  </details>
                )}
                {answer != null && (
                  <details className="sitx-answer">
                    <summary>
                      What you wrote
                      {answer.length > 0 ? ` (${answer.length.toLocaleString()} characters)` : ' (submitted blank)'}
                    </summary>
                    {answer.length > 0
                      ? <pre>{answer}</pre>
                      : <p className="sitx-sub">You submitted this one blank.</p>}
                  </details>
                )}
                {/* THE TEACHING REVEAL — not the model answer. See the header. */}
                {study?.full_reveal && (
                  <details className="sitx-answer">
                    <summary>How this one is done</summary>
                    <pre>{study.full_reveal}</pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      ))}

      {/* PROFESSIONAL SKILLS — band + the marker's feedback per skill. The apportioned
          per-skill MARK is deliberately not shown: it is a largest-remainder artefact, not a
          score for that skill (same reason app/api/acca/case/mark withholds it). */}
      {report.debrief.professional.some((c) => c.skills.length > 0) && (
        <div className="org-panel">
          <h2 style={{ margin: '0 0 10px' }}>Professional skills</h2>
          {report.debrief.professional.filter((c) => c.skills.length > 0).map((c) => (
            <div key={c.case_id} style={{ marginBottom: 14 }}>
              <div className="sitx-req-top">
                <span className="sitx-req-name">{c.title ?? 'Untitled case'}</span>
                <span className="sitx-req-marks">{c.awarded ?? '—'}/{c.available ?? '—'}</span>
              </div>
              {c.skills.map((s, i) => (
                <div className="sitx-req" key={i}>
                  <div className="sitx-req-top">
                    <span className="sitx-req-name">{s.skill.replace(/_/g, ' ')}</span>
                    <span className={`sitx-band ${s.band}`}>{s.band}</span>
                  </div>
                  {s.why && <p className="sitx-why">{s.why}</p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* THE WAY OUT — the same one the sit's own debrief offers, for the same reason: this
          paper wrote a weakness row for every weak/competent LO, and /acca/progress is the
          surface that reads them. */}
      <div className="res-exit">
        <Link className="res-cta" href={progressHref}>Practise my weak areas →</Link>
        <Link className="res-exit-secondary" href={resultsHref}>All your papers</Link>
      </div>
    </>,
  );
}

// House tokens from ORG_CSS; only what this page adds beyond them.
const RESULTS_CSS = `
.org .res-headline { font-size:15px; line-height:1.55; color:var(--text); margin:16px 0 0; }
.org .res-secondary { font-size:13.5px; line-height:1.55; color:var(--text-muted); margin:8px 0 0; }
.org .res-line { font-size:13px; line-height:1.55; color:var(--text); margin:8px 0 0; }
.org .res-key { font-weight:700; color:var(--text-light); font-size:11px; text-transform:uppercase; letter-spacing:.05em; margin-right:6px; }
.org .res-locked-lead { font-size:14px; line-height:1.55; color:var(--text); margin:0 0 8px; }
.org .res-cta { display:inline-block; background:var(--brand); color:#fff; font-size:13px; font-weight:700; padding:10px 18px; border-radius:8px; text-decoration:none; margin-top:14px; }
.org .res-cta:hover { filter:brightness(1.06); }
.org .res-exit { display:flex; flex-wrap:wrap; align-items:center; gap:18px; margin:28px 0 40px; }
.org .res-exit-secondary { font-size:13px; color:var(--text-muted); text-decoration:none; margin-top:14px; }
.org .res-exit-secondary:hover { color:var(--text); }
`;
