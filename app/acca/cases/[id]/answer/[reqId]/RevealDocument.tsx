// app/acca/cases/[id]/answer/[reqId]/RevealDocument.tsx
//
// THE EXPANDED WORKED ANSWER — one server component, rendered by BOTH doors:
//
//   • `answer/[reqId]/page.tsx`                    — the standalone page (deep link, refresh, new tab)
//   • `@answer/(.)answer/[reqId]/page.tsx`         — the intercepted overlay (soft navigation from
//                                                    inside the case, the chat still behind it)
//
// ⚠️ ONE COMPONENT ON PURPOSE. The two doors differ in CHROME and in nothing else; if they held
// two copies of the fetch-and-gate sequence the question would stop being *do these agree* and
// become *which one is right* — the same reason `lib/acca/sit-report.ts` exists. The gate runs
// here, once, so neither door can be the one that forgot it.
//
// ── WHAT THIS RENDERS, AND WHAT IT DELIBERATELY DOES NOT ─────────────────────
// It renders `normaliseRevealArtefact(row.model_answer)` — the authored worked answer, REPRODUCED
// from the row rather than passed in from the client. `scripts/test-reveal-split.ts` pins that
// this is byte-identical to what `splitServedReveal` carves out of the reveal the student is
// already reading in the chat, so expanding in place and opening the URL show the same document.
//
// It does NOT render the model's framing wrapper. The wrapper is a per-turn, per-student piece of
// coaching about the attempt that earned the reveal — it is in the transcript above, it is not
// part of the artefact, and it is not reproducible from the row (nothing persists it; see
// `docs/AFM_SURFACED.md` (p)). A document that silently regenerated it would be a different
// document each time it was opened.
//
// It CANNOT mark, generate or write: this module imports no model client, no marking core and no
// mutation. A read has nothing to protect.

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasPaperAccess } from '@/lib/acca/access';
import { expandedRevealDecision } from '@/lib/acca/reveal-split';
import { normaliseRevealArtefact, REVEAL_FOOTER } from '@/lib/acca/tutor-personas';
import { strippedLabel } from '@/lib/acca/requirement-label';
import MessageRenderer from '@/components/chat/MessageRenderer';

const CASES_ENABLED = process.env.APM_CASES === '1';

export interface LoadedReveal {
  artefact: string;
  /** The requirement's display label, with any syllabus code stripped at the serve boundary. */
  label: string;
  question: string | null;
  caseTitle: string | null;
  caseId: string;
}

/**
 * Fetch, gate, and reproduce the artefact. Every refusal — unearned, burn-tier, reserved,
 * unknown paper, missing row, empty `model_answer` — becomes ONE uniform `notFound()`, so nothing
 * distinguishes "you have not earned this" from "this does not exist". The reason is logged
 * server-side; it never reaches the response.
 *
 * ⚠️ THE SERVICE CLIENT READS THE ROWS AND THE SESSION CLIENT ESTABLISHES WHO IS ASKING. The
 * `user.id` used to scope `acca_case_progress` comes from `auth.getUser()`, never from a param —
 * the two ids in the URL address CONTENT, and neither of them says who the student is.
 */
async function loadReveal(caseId: string, reqId: string): Promise<LoadedReveal> {
  if (!CASES_ENABLED) notFound();

  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect(`/acca/auth?next=/acca/cases/${caseId}/answer/${reqId}`);

  const sb = createServiceClient();

  // The case, on the SAME serving gate every other case reader uses. Not paper-filtered: this
  // route is id-addressed and the row is where the paper comes from.
  const { data: caseRow } = await sb
    .from('acca_cases')
    .select('id, title, paper_code, mock_only')
    .eq('id', caseId)
    .eq('status', 'approved')
    .eq('published', true)
    .maybeSingle();

  // The requirement, scoped to this case so a requirement id from another case cannot be paired
  // with this one. `model_answer` is selected HERE and nowhere else on this surface.
  const { data: reqRow } = await sb
    .from('acca_case_requirements')
    .select('id, label, question, lo_code, marks_guide, model_answer')
    .eq('id', reqId)
    .eq('case_id', caseId)
    .maybeSingle();

  const { data: progress } = await sb
    .from('acca_case_progress')
    .select('miss_count, resolved')
    .eq('user_id', user.id)
    .eq('case_id', caseId)
    .eq('requirement_id', reqId)
    .maybeSingle();

  // Entitlement is checked against the case's OWN paper, resolved by the decision below. It is
  // read first because `expandedRevealDecision` is pure and takes the answer, not the query — but
  // an unresolvable paper cannot be checked at all, so it fails closed here before the gate runs.
  const { data: profile } = await sb
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .maybeSingle();

  const rowPaper = caseRow?.paper_code;
  const paid =
    rowPaper === 'APM' || rowPaper === 'AFM'
      ? await hasPaperAccess(sb, user.id, rowPaper, profile)
      : false;

  const verdict = expandedRevealDecision({
    caseId,
    caseRow: caseRow ? { paper_code: caseRow.paper_code, mock_only: caseRow.mock_only } : null,
    paid,
    progress: progress ?? null,
    requirement: reqRow ? { model_answer: reqRow.model_answer } : null,
  });

  if (!verdict.ok) {
    // Observable, and never distinguishable to the caller. A refusal on this route is either a
    // moat working or a student hitting a stale link, and telling those apart afterwards needs
    // the reason.
    console.warn('[reveal:expand-refused]', JSON.stringify({
      refusal: verdict.refusal, case_id: caseId, requirement_id: reqId,
    }));
    notFound();
  }

  // `sweepCodeShape: true` — this is a SERVE boundary, and the candidate-facing rule applies:
  // a leaked syllabus code on a student's screen is the worse failure; over-deleting costs a UI
  // chip. Same choice the sit's serve boundary makes.
  //
  // ⚠️ CaseSession renders `req.label` RAW in the requirement heading two inches away, so on a
  // label that carries a code the document's title and the chat's heading will differ. That is a
  // pre-existing gap in the practice surface, not one this control introduces, and it is left
  // alone rather than quietly widened: the fix is to route CaseSession's heading through this
  // same function, which is a change to the chat surface and belongs in its own commit.
  const stripped = strippedLabel(
    reqRow!.label as string | null,
    reqRow!.lo_code as string | null,
    { sweepCodeShape: true },
  );

  // MARKS COME BACK FROM THE COLUMN, not from the prose the strip just removed — the composition
  // `sitDisplayLabel`'s caller already makes. On AFM the stored label IS "(i) — 13 marks", so
  // stripping alone would leave a document titled "(i)"; on APM it is "(i) The churn model
  // output" and the marks were never in it. Composing from `marks_guide` makes both papers show
  // marks for the same reason instead of one paper's labels happening to spell them.
  const marks = typeof reqRow!.marks_guide === 'number' ? reqRow!.marks_guide : null;
  const title = [stripped, marks !== null ? `${marks} marks` : null]
    .filter(Boolean)
    .join(' — ');

  return {
    artefact: normaliseRevealArtefact(reqRow!.model_answer as string),
    // Empty means the label was ONLY a code and the row carries no allocation — nothing
    // candidate-facing survived, so a neutral title rather than the raw string it came from.
    label: title || 'Worked answer',
    question: (reqRow!.question as string | null) ?? null,
    caseTitle: (caseRow!.title as string | null) ?? null,
    caseId,
  };
}

/**
 * The document body. `chrome` says which door rendered it — the two differ in the header they
 * carry and in nothing below it.
 */
export default async function RevealDocument({
  caseId,
  reqId,
  chrome,
}: {
  caseId: string;
  reqId: string;
  chrome: 'page' | 'overlay';
}) {
  const r = await loadReveal(caseId, reqId);

  return (
    <article className="rd">
      <header className="rd-head">
        <div className="rd-eyebrow">
          <span className="rd-badge">Model answer</span>
          {r.caseTitle && <span className="rd-case">{r.caseTitle}</span>}
        </div>
        <h1 className="rd-title">{r.label}</h1>
        {r.question && <p className="rd-question">{r.question}</p>}
      </header>

      <div className="rd-body">
        <MessageRenderer content={r.artefact} />
      </div>

      <footer className="rd-foot">
        {/* The same copyright line the served reveal carries, from the same constant — not a
            second transcription of it. Rendered from the wrapper's footer because the artefact
            deliberately excludes it (that is what keeps the byte-identity property exact). */}
        <p className="rd-copy">{REVEAL_FOOTER.trim().replace(/^\*|\*$/g, '')}</p>
        {chrome === 'page' && (
          <Link href={`/acca/cases/${r.caseId}`} className="rd-back">← Back to the case</Link>
        )}
      </footer>
    </article>
  );
}
