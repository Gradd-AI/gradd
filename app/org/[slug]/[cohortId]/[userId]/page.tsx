import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCoordinator, cohortMemberDecision } from '@/lib/org/guard';
import { getOrgBySlug, getCohortById, getTraineeDetail, cohortUserIds, type RecentAttempt } from '@/lib/org/queries';
import { getTraineeSitResults } from '@/lib/org/trainee-sit';
import { ORG_CSS, bandTone, fmtDays, fmtDate, SUB_AREA_NAME } from '@/components/org/orgTheme';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Trainee readiness — Coordinator | Gradd' };

const pct = (x: number) => `${Math.round(x * 100)}%`;

const DAY_MS = 86_400_000;

/** Tiny house-palette activity sparkline — daily attempt volume over the last 25 days,
 *  solved (sage) stacked under missed (rust). No chart library; pure SVG. Drawn from the
 *  most-recent attempts the detail query already returns (presentation only). */
function Sparkline({ attempts, now }: { attempts: RecentAttempt[]; now: number }) {
  const DAYS = 25, BAR = 5, GAP = 2, H = 34, TOP = 2;
  const step = BAR + GAP;
  const W = DAYS * step - GAP;
  const buckets = Array.from({ length: DAYS }, () => ({ ok: 0, miss: 0 }));
  for (const a of attempts) {
    const di = Math.floor((now - Date.parse(a.created_at)) / DAY_MS);
    if (di < 0 || di >= DAYS) continue;
    if (a.outcome === 'miss') buckets[di].miss++; else buckets[di].ok++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.ok + b.miss));
  const unit = (H - TOP) / max;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Attempt activity over the last 25 days">
      <line x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#ddd5c5" strokeWidth={1} />
      {buckets.map((b, i) => {
        const total = b.ok + b.miss;
        if (!total) return null;
        const x = (DAYS - 1 - i) * step; // oldest at left, today at right
        const okH = b.ok * unit, missH = b.miss * unit;
        return (
          <g key={i}>
            {b.ok > 0 && <rect x={x} y={H - okH} width={BAR} height={okH} rx={1} fill="#3d7a52" />}
            {b.miss > 0 && <rect x={x} y={H - okH - missH} width={BAR} height={missH} rx={1} fill="#c07a4e" />}
          </g>
        );
      })}
    </svg>
  );
}

export default async function TraineePage({ params }: { params: Promise<{ slug: string; cohortId: string; userId: string }> }) {
  const { slug, cohortId, userId } = await params;
  await requireCoordinator(`/org/${slug}/${cohortId}/${userId}`, slug);

  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const cohort = await getCohortById(cohortId);
  if (!cohort || cohort.org_id !== org.id) notFound();

  // IS THIS TRAINEE IN THIS COHORT? The check above proves the COHORT belongs to the ORG —
  // a consistency check about two rows that says nothing about the user id in the URL.
  // Without this, ANY user id rendered under any cohort of any viewable org, and the page
  // reported that stranger's readiness, coverage, attempt history and assessment records.
  // notFound(), not a redirect: to a viewer entitled to this cohort, a trainee who is not in
  // it does not exist here, and a 404 says that without confirming the id is real.
  if (!cohortMemberDecision(await cohortUserIds(cohortId), userId)) notFound();

  const now = Date.now();
  const [d, sit] = await Promise.all([
    getTraineeDetail(org.id, userId, now),
    // The cross-user sit read. Null is an EMPTY STATE, never an error — a trainee who has
    // not sat a mock is the ordinary case, and it re-checks the org/cohort link itself.
    getTraineeSitResults(org.id, cohortId, userId),
  ]);
  if (!d) notFound();

  // Requirement id → "Q1 (i)", so the pacing table names requirements the same way the
  // debrief does. `display_name` is the only safe reference; the stored label carries the
  // internal LO code the sit route strips at its own serve boundary.
  const nameByReq = new Map(
    (sit?.debrief.cases ?? []).flatMap((g) => g.requirements.map((l) => [l.requirement_id, l.display_name] as const)),
  );

  const { readiness: r } = d;
  const k = r.components;
  const tone = bandTone(r.band);
  const w = r.weightsUsed;

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <header className="org-header">
        <Link className="wordmark" href={`/org/${slug}`}><img src="/gradd-ai-logo.png" alt="Gradd" /></Link>
        <span className="org-crumb">
          <Link href={`/org/${slug}`}>{org.name}</Link><span>›</span>
          <Link href={`/org/${slug}/${cohortId}`}>{cohort.label}</Link><span>›</span> {d.name}
        </span>
      </header>

      <Link className="org-back" href={`/org/${slug}/${cohortId}`}>‹ Back to heatmap</Link>

      <h1>{d.name}</h1>
      <p className="sub">
        {d.email ?? 'no email on membership'} · last active {fmtDays(d.daysSinceActive)}
      </p>

      {/* Readiness verdict — every number below traces to a row; no black box. */}
      <div className="org-panel">
        <div className="org-verdict">
          <div className="org-verdict-score">
            <span className="org-chip" style={{ background: tone.bg, color: tone.fg, fontSize: 12, padding: '5px 12px' }}>{tone.label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{r.score.toFixed(2)}</span>
            {r.override && <span className="org-note" style={{ marginTop: 0 }}>override: <b>{r.override}</b> (forces Red regardless of score)</span>}
          </div>
          <div className="org-spark">
            <div className="org-spark-label">Activity · last 25 days</div>
            {d.recentAttempts.length
              ? <Sparkline attempts={d.recentAttempts} now={now} />
              : <span className="org-note" style={{ marginTop: 0 }}>No attempts in the window.</span>}
            {d.recentAttempts.length > 0 && (
              <div className="org-spark-legend">
                <span><i style={{ background: '#3d7a52' }} />solved</span>
                <span><i style={{ background: '#c07a4e' }} />missed</span>
              </div>
            )}
          </div>
        </div>

        <div className="org-comp">
          <div className="c">
            <div className="c-top"><span className="c-name">Recency</span><span className="c-w">weight {pct(w.recency)}</span></div>
            <div className="v">{k.recency.score.toFixed(2)}</div>
            <div className="d">{fmtDays(k.recency.daysSinceActive)}</div>
          </div>
          <div className="c">
            <div className="c-top"><span className="c-name">Coverage</span><span className="c-w">weight {pct(w.coverage)}</span></div>
            <div className="v">{k.coverage.score.toFixed(2)}</div>
            <div className="d">{k.coverage.covered}/{k.coverage.total} sub-areas</div>
          </div>
          <div className="c">
            <div className="c-top"><span className="c-name">Miss-rate</span><span className="c-w">weight {pct(w.missRate)}</span></div>
            <div className="v">{k.missRate.score.toFixed(2)}</div>
            <div className="d">{k.missRate.usedSlope ? `slope: prior ${k.missRate.priorMissRate.toFixed(2)} → recent ${k.missRate.recentMissRate.toFixed(2)}` : 'proxy: resolved/(resolved+stuck)'}</div>
          </div>
          <div className="c">
            <div className="c-top"><span className="c-name">Assessment</span><span className="c-w">weight {pct(w.assessment)}</span></div>
            <div className="v">{k.assessment.score == null ? '—' : k.assessment.score.toFixed(2)}</div>
            <div className="d">
              {k.assessment.score == null ? 'none yet' :
                [k.assessment.caseAvg != null ? `cases ${k.assessment.caseAvg.toFixed(2)}` : null,
                 k.assessment.mockAvg != null ? `mock ${k.assessment.mockAvg.toFixed(2)}` : null,
                 k.assessment.mocksCompleted ? `${k.assessment.mocksCompleted} mock sat` : null,
                ].filter(Boolean).join(' · ') || 'floor'}
            </div>
          </div>
        </div>
        <p className="org-note">
          Score = weighted mean of the four components{k.assessment.score == null ? ' (assessment absent → its weight redistributed across the other three)' : ''}.
          {' '}<b>{d.stuckDrills}</b> {d.stuckDrills === 1 ? 'drill' : 'drills'} attempted twice or more without success.
        </p>
      </div>

      {/* Covered sub-areas */}
      <div className="org-panel">
        <h2 style={{ margin: '0 0 10px' }}>Coverage — {d.coveredSubAreas.length}/{d.totalSubAreas} sub-areas with a correct attempt</h2>
        {d.coveredSubAreas.length ? (
          <div className="org-kv">{d.coveredSubAreas.map((s) => <span key={s} className="pill">{s}</span>)}</div>
        ) : <p className="org-note" style={{ marginTop: 0 }}>No sub-areas covered yet.</p>}
      </div>

      {/* Recent attempts */}
      <div className="org-panel">
        <h2 style={{ margin: '0 0 10px' }}>Recent attempts ({d.recentAttempts.length} most recent)</h2>
        {d.recentAttempts.length ? (
          <table className="org-list">
            <thead><tr><th>Date</th><th>LO</th><th>Sub-area</th><th>Outcome</th></tr></thead>
            <tbody>
              {d.recentAttempts.map((a, i) => (
                <tr key={i}>
                  <td className="date">{fmtDate(a.created_at)}</td>
                  <td>{a.lo_code}</td>
                  <td>{SUB_AREA_NAME[a.lo_code.slice(0, 2)] ?? a.lo_code.slice(0, 2)}</td>
                  <td><span className={`org-out ${a.outcome === 'miss' ? 'miss' : 'ok'}`}>{a.outcome}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="org-note" style={{ marginTop: 0 }}>No attempts recorded.</p>}
      </div>

      {/* ── The sat mock, in full ────────────────────────────────────────────
          Everything below is the SAME debrief the student read: getTraineeSitResults runs
          computePacing and buildDebrief over that attempt's rows. It is the ONLY rendering of
          the sit on this page — the old "Assessment records" index it superseded (mock id, sat
          date, completion, per-case PS marks against truncated case UUIDs) is deleted. */}
      <div className="org-panel">
        {!sit ? (
          <>
            <h2 style={{ margin: '0 0 8px' }}>Mock paper</h2>
            {/* An ordinary fact about a cohort, not an error. Distinguishes "never sat" from
                "sat and unmarked" only as far as the data honestly can. */}
            <p className="sitx-empty">
              No completed mock on this cohort&rsquo;s paper. Nothing to show yet — a debrief
              appears here once {d.name.split(' ')[0]} finishes a timed paper and it is marked.
            </p>
          </>
        ) : (
          <>
            <div className="sitx-head">
              <h2 style={{ margin: 0 }}>{sit.paper.title}</h2>
              <span className="org-note" style={{ marginTop: 0 }}>
                sat {fmtDate(sit.attempt.started_at)}
                {sit.pacing.total_elapsed_minutes != null
                  ? ` · ${Math.floor(Math.max(0, sit.pacing.total_elapsed_minutes))} min of ${sit.paper.duration_minutes}`
                  : ''}
              </span>
            </div>

            {/* TOTALS — facts, not a grade. The debrief predicts no pass mark and neither
                does this: technical and professional are shown as they were marked. */}
            <div className="sitx-totals">
              <div className="sitx-total">
                <span className="sitx-total-k">Technical</span>
                <span className="sitx-total-v">
                  {sit.debrief.totals.technical_awarded ?? '—'}
                  <small>/{sit.debrief.totals.technical_available}</small>
                </span>
              </div>
              <div className="sitx-total">
                <span className="sitx-total-k">Professional skills</span>
                <span className="sitx-total-v">
                  {sit.debrief.totals.professional_awarded ?? '—'}
                  <small>/{sit.debrief.totals.professional_available ?? '—'}</small>
                </span>
              </div>
              <div className="sitx-total">
                <span className="sitx-total-k">Paper</span>
                <span className="sitx-total-v">
                  {sit.debrief.totals.technical_awarded != null && sit.debrief.totals.professional_awarded != null
                    ? sit.debrief.totals.technical_awarded + sit.debrief.totals.professional_awarded
                    : '—'}
                  <small>/{sit.debrief.totals.technical_available + (sit.debrief.totals.professional_available ?? 0)}</small>
                </span>
              </div>
            </div>

            {/* ⚠️ THE HEADLINE IS QUOTED, NOT ADOPTED.
                `largest_single_loss` ranks ABSOLUTE marks lost, so it tends to name the
                biggest requirement on the paper rather than the worst answer — on this very
                attempt it named a requirement sitting at the paper's MEDIAN loss rate while
                three others lost a higher proportion (open finding, docs/AFM_SURFACED.md
                2026-09-02). Presenting it as the coordinator's verdict would launder a known
                selector weakness into a judgement about a trainee. It is shown because the
                student saw it and the coordinator should know what they were told — labelled
                as theirs, in their words, and nothing more. */}
            {sit.debrief.headline.code !== 'none' && (
              <div className="sitx-quote">
                <span className="sitx-quote-k">What the student&rsquo;s debrief led with</span>
                <p className="sitx-quote-v">{sit.debrief.headline.statement}</p>
              </div>
            )}
            {sit.debrief.secondary.map((s, i) => (
              <div className="sitx-quote" key={i}>
                <span className="sitx-quote-k">Also reported to the student</span>
                <p className="sitx-quote-v">{s.statement}</p>
              </div>
            ))}

            {sit.other_completed_attempts > 0 && (
              <p className="org-note">
                ⚠️ This trainee has {sit.other_completed_attempts + 1} completed sits on this paper.
                Per-requirement marks below are this attempt&rsquo;s; the case totals and
                professional-skills feedback come from the most recent marking of those cases.
              </p>
            )}
            {sit.pacing.not_evaluated && <p className="org-note">{sit.pacing.not_evaluated}</p>}
            {sit.debrief.limitations.map((l, i) => <p className="org-note" key={i}>{l}</p>)}

            {/* PACING — budgets and flags, marks alongside and never merged into them.
                Requirement 1 carries no ratio: its interval contains reading the whole
                Section A scenario, which is why pacing.ts flags it `no_ratio`. */}
            <h3 style={{ margin: '20px 0 8px', fontSize: 14 }}>Pacing</h3>
            <table className="org-list">
              <thead>
                <tr>
                  <th>Requirement</th><th className="num">Marks</th><th className="num">Elapsed</th>
                  <th className="num">Budget</th><th className="num">Ratio</th><th>Flag</th><th className="num">Awarded</th>
                </tr>
              </thead>
              <tbody>
                {sit.pacing.rows.map((p) => (
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

            {/* PER REQUIREMENT — band, marks, the marker's own words VERBATIM, and the
                student's script behind an explicit expand. */}
            {sit.debrief.cases.map((g) => (
              <div key={g.case_id} style={{ marginTop: 22 }}>
                <h3 style={{ margin: '0 0 2px', fontSize: 14 }}>
                  {g.display_name} — {g.title ?? 'Untitled case'}{' '}
                  <span className="sitx-req-marks">
                    {g.technical_awarded ?? '—'}/{g.technical_available}
                  </span>
                </h3>
                {g.requirements.map((l) => {
                  const answer = sit.answers[l.requirement_id];
                  return (
                    <div className="sitx-req" key={l.requirement_id}>
                      <div className="sitx-req-top">
                        <span className="sitx-req-name">{l.display_name}</span>
                        {l.band && <span className={`sitx-band ${l.band}`}>{l.band}</span>}
                        <span className="sitx-req-marks">
                          {l.marks_awarded ?? '—'}/{l.marks_available}
                        </span>
                        {l.pacing_note && <span className="sitx-sub" style={{ margin: 0 }}>{l.pacing_note}</span>}
                      </div>
                      {/* The technical marker's reasoning, exactly as written. debrief.ts is
                          built around never paraphrasing this, so neither does the render. */}
                      {l.why
                        ? <p className="sitx-why">{l.why}</p>
                        : <p className="sitx-sub">No marker reasoning recorded for this requirement.</p>}
                      {/* READING SOMEONE'S SCRIPT IS AN ACTION, NOT A SIDE EFFECT OF OPENING
                          A PAGE. Collapsed by default, always — there is no state in which
                          this renders expanded without a click. */}
                      {answer != null && (
                        <details className="sitx-answer">
                          <summary>
                            Show {d.name.split(' ')[0]}&rsquo;s answer
                            {answer.length > 0 ? ` (${answer.length.toLocaleString()} characters)` : ' (submitted blank)'}
                          </summary>
                          {answer.length > 0
                            ? <pre>{answer}</pre>
                            : <p className="sitx-sub">Submitted blank.</p>}
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* PROFESSIONAL SKILLS — band + the marker's feedback per skill. The apportioned
                per-skill MARK is deliberately not shown: it is a largest-remainder artefact,
                not a score for that skill (same reason app/api/acca/case/mark withholds it). */}
            <h3 style={{ margin: '24px 0 8px', fontSize: 14 }}>Professional skills</h3>
            {sit.debrief.professional.map((c) => (
              <div key={c.case_id} style={{ marginBottom: 14 }}>
                <div className="sitx-req-top">
                  <span className="sitx-req-name">{c.title ?? 'Untitled case'}</span>
                  <span className="sitx-req-marks">{c.awarded ?? '—'}/{c.available ?? '—'}</span>
                </div>
                {c.skills.length === 0
                  ? <p className="sitx-sub">No per-skill detail recorded.</p>
                  : c.skills.map((s, i) => (
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
          </>
        )}
      </div>

    </div>
  );
}
