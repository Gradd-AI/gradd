// components/landing/ACCAPillarPage.tsx
// The ACCA PILLAR — what gradd.ai root serves, unconditionally (moved here from /acca
// 2026-08-04; the hub that used to sit above this page is deleted). /acca itself now
// only ever serves the signed-in dashboard, redirecting an anonymous visitor here.
//
// This is where ACCA-level search intent lands ("ACCA tutor", "ACCA Strategic Professional
// practice") and where cross-sell happens: a student who came for APM discovers AFM exists,
// and vice versa. The two SPOKES (/acca/apm, /acca/afm) sell a paper each; this page sells
// the qualification and routes.
//
// ── RECOMPOSED 2026-08-05 (feat/pillar-recompose-section-vocabulary) ──────────────────────
// Before this pass the root was ONE COLUMN, cream throughout, with no artefact and no band
// change: an argument and two paper cards. APM had already been recomposed onto the section
// vocabulary (hero artefact, two full-width feature artefacts, sage and dark bands, big
// numbers, a compare table) — leaving the page a stranger ACTUALLY LANDS ON as the thinnest
// of the three. This pass gives root the same rhythm.
//
// THE ARGUMENT CHANGED, and that is the substantive half. The old lead was "Taught, not just
// marked" — which is the SPOKES' line, and a root that repeats it teaches a visitor nothing
// they will not read again one click later. The root's own argument is the market fact
// underneath all of it: at Strategic Professional level nobody marks what you write.
// Sourced, not asserted — `docs/APM_MARKETING_POSITIONING.md` "SURFACED FROM BUILD",
// LEAD LINE (31/07/2026): ACCA's own Practice Platform supplies a model answer and the
// candidate self-grades; a tuition provider's mocks are €29.99 each, two per paper, PDF,
// tutor-marked, three-day turnaround; everything else is a question bank.
//
// ── STILL DELIBERATELY NOT ProductLandingPage ─────────────────────────────────────────────
// That template renders ONE PRODUCT's hero + pricing + CTA; its hero copy alone hardcodes
// `{examName} ({paper})` and its config requires `paper`/`coverage`/`freeCta` — a pillar has
// no single paper to put in any of them, and its central section (two papers compared and
// routed) has no primitive there at all. Generalising it stays ruled out. What this page
// adopts is the VOCABULARY — hero artefact, stat strip, compare table, band changes, big
// numbers, feature artefact — not the component.
//
// ── CSS IS SELF-CONTAINED, ON PURPOSE ─────────────────────────────────────────────────────
// Every rule below is `.pil-`-namespaced and lives in this file's own <style>, the way
// IBLandingPage.tsx carries its own. `app/globals.css` already holds the SHARED half — the
// `.plp/.hub/.pil` token block, the type scale (`.pil-h1`/`.pil-h2`/`.pil-sub`/
// `.pil-eyebrow`), the buttons, the sticky header and `.pil-card`'s radius/border/background
// — and this file uses those tokens (`--rule`/`--ink-2`/`--forest`/`--sage`/`--rust`)
// DIRECTLY rather than the legacy `--border`/`--text-muted` aliases the older rules here
// reached for. The band treatments are therefore stated twice in the repo, once under
// `.plp-band-*` and once here; the alternative was ~15 comma-list edits threading `.pil-`
// through globals' `.plp-band-dark .plp-point`-shaped descendant selectors, which would put
// this page's layout inside the template's stylesheet. Every NEW class name below is new
// (`.pil-jcol`, `.pil-artefact`, `.pil-bignum`…), so nothing here can collide with a rule
// globals already owns.
//
// PRICING IS PER PAPER (ruled 2026-08-03) and this page says so explicitly — in the hero,
// in the paper-cards lead, and in the pricing block. Under the old bundle a pillar could
// have implied one purchase covered everything; that is now false and stating it here,
// before the student reaches a spoke, is what stops them assuming it.
//
// ── EVERY NUMBER ON THIS PAGE, AND WHERE IT CAME FROM ─────────────────────────────────────
// · 91 APM drills / 63 AFM drills / 154 total — queried LIVE against production 2026-08-05:
//   `acca_drills` where exam_board='ACCA', status='approved', published=true.
// · 5 practice cases per paper / 10 total, 2 mock papers — same query against `acca_cases`
//   (8 published rows per paper, 3 of them `mock_only`; 3 mock_only cases = one mock paper).
// · "About a minute" to mark a paper — 58s and 60s across two end-to-end runs, three cases,
//   both marking passes (`APM_MARKETING_POSITIONING.md`, claim 2).
// · €29.99 / €59.98 / three days — same doc, COMPETITOR CLAIMS + LEAD LINE. The provider is
//   NOT named here (it is named on the AFM spoke); the pillar states the shape of the offer.
// · 1.95 minutes per mark, 195 minutes, 100 marks — `lib/acca/pacing.ts` MINUTES_PER_MARK,
//   which is ACCA's own arithmetic, not a house benchmark.
// · The pacing quote is VERBATIM from the 31/07/2026 end-to-end walk, reproduced exactly as
//   `APM_MARKETING_POSITIONING.md` records it (the doc carries an explicit ⚠ against
//   paraphrasing the minutes: an earlier draft said 7, the measured figure is 12).
// · EVERY figure in the proof band is checked against
//   `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md` — see the block above that section.
//
// ── THE RESIT CTA IS SCOPED TO APM, AND THAT IS A CORRECTION ──────────────────────────────
// The old closing section read "Failed a paper?" unqualified. `lib/acca/resit-engine.ts` is
// written in APM's own terms (its habit prompts say "APM gives marks for professional
// skills…") and `app/acca/resit/page.tsx` renders "Free ACCA APM resit diagnostic" — there
// is no AFM equivalent. An AFM resitter following an unqualified promise lands on a page
// about a paper they are not sitting, so the band names APM.
import Link from 'next/link';
import AttributionCapture from '@/components/AttributionCapture';

interface PaperCard {
  code: string;
  name: string;
  href: string;
  status: string;
  blurb: string;
  live: string;
}

// Coverage strings state EXACTLY what is live, per the standing honesty rule on the AFM
// landing — no breadth implication, no counts that drift silently. If these numbers move,
// they move here and on the spoke together. Counts verified live 2026-08-05 (see header).
const PAPERS: PaperCard[] = [
  {
    code: 'APM',
    name: 'Advanced Performance Management',
    href: '/acca/apm',
    status: 'Live',
    blurb:
      'Ezra diagnoses why an answer lost marks — describing a model instead of applying it, stopping short of the judgement the verb demanded — then coaches the fix until the answer would score.',
    live: '91 drills, free to attempt · 5 practice exam cases · professional-skills marking · a timed mock, marked as one paper.',
  },
  {
    code: 'AFM',
    name: 'Advanced Financial Management',
    href: '/acca/afm',
    status: 'Live',
    blurb:
      'The senior-adviser register: your arithmetic is usually fine, but the ADVICE would not survive a boardroom. Ezra pushes from a correct number to a committed recommendation.',
    live: '63 drills, free to attempt · 5 practice exam cases · professional-skills marking · a timed mock, marked as one paper.',
  },
];

const STATS: { value: string; label: string }[] = [
  { value: '154', label: 'drills live across two papers' },
  { value: '10', label: 'practice exam cases' },
  { value: '2', label: 'timed mock papers' },
  { value: '~1 min', label: 'to mark a whole paper' },
];

// ── THE COMPARE TABLE ────────────────────────────────────────────────────────────────────
// This IS the lead argument, in its most checkable form. No competitor is named and no
// competitor price is invented beyond the one the positioning doc records; "varies by
// provider" is the honest cell for question banks, exactly as APM's own table keeps it.
const CMP_ROWS = [
  'Who marks your written answer',
  'Turnaround',
  'Names where your figure diverged',
  'Times each requirement against its budget',
  'Attempts',
  'Cost for one sitting',
];
const CMP_COLS: { label: string; values: (string | boolean)[]; featured?: boolean }[] = [
  {
    label: 'ACCA Practice Platform',
    values: ['You do — against a model answer', 'Instant, self-graded', false, false, 'Unlimited', 'Free'],
  },
  {
    label: 'Tuition-provider mocks',
    values: ['A tutor, on a PDF', 'Three days', 'Tutor’s discretion', false, 'Two per paper', '€59.98 for the two'],
  },
  {
    label: 'Question banks',
    values: ['Nobody', '—', false, false, 'Unlimited', 'Varies by provider'],
  },
  {
    label: 'Gradd',
    values: [
      'Ezra, against the requirement',
      'About a minute',
      true,
      true,
      'Unlimited',
      '€99 per paper',
    ],
    featured: true,
  },
];

// ── THE PROOF BAND — every figure below is checked against
// `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md` (the banked blind-candidate fixture,
// sat with no access to any answer-side field). Verified 2026-08-05, line by line:
//   · 96 contracts, SOLD ............... script §Q3(i)/2 "N=96 contracts", "should sell 96"
//   · both scenarios reconcile 4.95% ... script §Q3(i) Summary table, both rows 4.95%
//   · 0.15 unexpired basis omitted ..... fixture header: candidate takes 100 − prevailing
//                                        rate (95.00 / 96.80), omitting the 0.15 basis
//   · closing price 94.85 vs 95.00 ..... fixture header component table
//   · effective rate 4.80% vs 4.95% .... fixture header component table (abs ±0.05 band)
//   · 2 of 7 pass, 5 fail, one cause ... fixture header: "2 pass, 5 fail, and every one of
//                                        the 5 failures is that same omission"
//   · the cross-check cannot catch it .. fixture header §"The candidate's own self-check
//                                        does NOT discriminate" — the omitted 0.15 applies
//                                        identically to both legs, so the reconciliation
//                                        lands just as cleanly on the wrong rate
const PROOF_NUMBERS: { value: string; body: string }[] = [
  {
    value: '96',
    body: 'contracts, sold — the count and the direction are both right. This is the near-correct script, not the zero script.',
  },
  {
    value: '0.15pp',
    body: 'is the whole error. The unexpired basis was never taken off the closing futures price, so the hedge locks 4.95% where the answer is 4.80%.',
  },
  {
    value: '2 of 7',
    body: 'components pass on tolerance. All five failures trace to that one missed step — not five separate errors.',
  },
];

export default function ACCAPillarPage() {
  return (
    <>
      <AttributionCapture />
      <style>{CSS}</style>
      <div className="pil">
        <div className="bg-grain" aria-hidden="true" />
        <header className="pil-header">
          <div className="pil-wrap pil-header-inner">
            <Link href="/" className="pil-logo" aria-label="Gradd home">
              <img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block' }} />
            </Link>
            <nav className="pil-nav" aria-label="Primary">
              {/* The two ANCHOR links drop out on a narrow viewport — see the media query.
                  The paper links stay: they are the pillar's whole job. */}
              <Link href="#papers" className="pil-navlink pil-navlink--wide">Papers</Link>
              <Link href="/acca/apm" className="pil-navlink">APM</Link>
              <Link href="/acca/afm" className="pil-navlink">AFM</Link>
              <Link href="#pricing" className="pil-navlink pil-navlink--wide">Pricing</Link>
              <Link href="/acca/auth?next=/acca" className="btn btn-rust btn-sm">Start free</Link>
            </nav>
          </div>
        </header>

        <main>
          {/* ── 1. HERO (cream) — copy left, a marked answer right. The highest-value slot
              on the page had nothing to look at before this pass. ── */}
          <section className="pil-hero">
            <div className="pil-wrap pil-hero-grid">
              <div className="pil-hero-copy">
                <p className="pil-eyebrow">ACCA Strategic Professional · APM + AFM</p>
                <h1 className="pil-h1">Nobody marks what you write.</h1>
                <p className="pil-sub">
                  At Strategic Professional that is simply the state of practice. ACCA’s own
                  Practice Platform hands you a model answer and asks you to grade yourself.
                  Two tutor-marked mocks from a tuition provider cost €59.98 and come back
                  three days later, on a PDF. Everything else is a question bank.
                </p>
                <p className="pil-sub pil-sub-tight">
                  Gradd marks the answer you actually wrote — in about a minute, as many
                  times as you want, and it names the step where your figure diverged.
                </p>
                <div className="pil-cta-row">
                  <Link href="/acca/auth?next=/acca" className="btn btn-rust btn-lg">
                    Start free <span className="arrow" aria-hidden="true">→</span>
                  </Link>
                  <Link href="/acca/afm/proof" className="btn btn-ghost btn-lg">
                    See a real walkthrough
                  </Link>
                </div>
                <div className="pil-meta">
                  <span>Every drill free</span>
                  <span className="pil-meta-dot" aria-hidden="true" />
                  <span>No card to start</span>
                  <span className="pil-meta-dot" aria-hidden="true" />
                  <span>Bought per paper</span>
                </div>
              </div>

              <div className="pil-hero-visual">
                <figure
                  className="pil-artefact"
                  role="img"
                  aria-label="A marking panel naming the exact step where a candidate’s figure diverged"
                >
                  <div className="pil-artefact-head">
                    <span className="pil-artefact-title">Marked</span>
                    <span className="pil-artefact-sub">ACCA AFM · Mock Paper 1 · Q3 (i)</span>
                  </div>
                  <div className="pil-arow">
                    <div className="pil-arow-head">
                      <span className="pil-arow-label">Technical</span>
                      <span className="pil-arow-verdict">competent</span>
                    </div>
                    <p className="pil-arow-body">
                      “Contract count, sell direction and both rate scenarios are right. The
                      closing futures price omits the 0.15 unexpired basis, so the hedge locks
                      4.95% where the answer is 4.80%.”
                    </p>
                  </div>
                  <div className="pil-arow">
                    <div className="pil-arow-head">
                      <span className="pil-arow-label">Scepticism</span>
                      <span className="pil-arow-verdict">strong</span>
                    </div>
                    <p className="pil-arow-body">
                      “States the basis-risk limitation outright rather than presenting the
                      two-scenario reconciliation as proof the rate is guaranteed.”
                    </p>
                  </div>
                  <figcaption className="pil-artefact-foot">
                    Marked in about a minute · unlimited attempts
                  </figcaption>
                </figure>
                <p className="pil-artefact-caption">
                  The answer you wrote, marked — not a model answer you grade yourself.
                </p>
              </div>
            </div>
          </section>

          {/* ── 2. STAT STRIP — a thin bordered band, not a card. Counts verified live. ── */}
          <section className="pil-statbar" aria-label="What is live today">
            <div className="pil-wrap pil-statbar-inner">
              <span className="pil-statbar-label">Live today</span>
              <div className="pil-statbar-stats">
                {STATS.map((s) => (
                  <div key={s.label} className="pil-statbar-stat">
                    <span className="pil-statbar-num">{s.value}</span>
                    <span className="pil-statbar-lbl">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── 3. THE COMPARE TABLE (cream) — the lead argument, in its checkable form. ── */}
          <section className="pil-cmp" aria-label="Who marks your written answer">
            <div className="pil-wrap">
              <p className="pil-eyebrow">The state of practice</p>
              <h2 className="pil-h2">Everyone tests you. Almost nobody marks you.</h2>
              <p className="pil-sub">
                A question bank tells you whether a number matched. It cannot tell you that
                your answer stopped short of the judgement the verb asked for, or which step
                sent the figure wrong.
              </p>
              <div className="pil-cmp-scroll">
                <table className="pil-cmp-table">
                  <thead>
                    <tr>
                      <th scope="col" />
                      {CMP_COLS.map((col) => (
                        <th key={col.label} scope="col" className={col.featured ? 'is-gradd' : undefined}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {CMP_ROWS.map((row, ri) => (
                      <tr key={row}>
                        <th scope="row">{row}</th>
                        {CMP_COLS.map((col) => {
                          const v = col.values[ri];
                          return (
                            <td key={col.label} className={col.featured ? 'is-gradd' : undefined}>
                              {typeof v === 'boolean'
                                ? (v ? <span className="pil-cmp-y">✓</span> : <span className="pil-cmp-n">—</span>)
                                : v}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="pil-cmp-hint">Scroll to see more →</p>
            </div>
          </section>

          {/* ── 4. THE PROOF (dark forest band) — the blind-candidate story. Figures
              verified against the banked fixture; see PROOF_NUMBERS above. ── */}
          <section className="pil-proof pil-band-dark" aria-label="The proof">
            <div className="pil-wrap">
              <p className="pil-eyebrow">The proof · AFM Mock Paper 1</p>
              <h2 className="pil-h2">The answer that checked itself, and was still wrong.</h2>
              <p className="pil-sub">
                A candidate sat AFM Mock Paper 1 blind, with no access to any answer-side
                field. On the interest-rate futures hedge the contract count was right, the
                sell direction was right, and both the rate-rise and rate-fall scenarios
                reconciled to the same 4.95% — which is precisely the self-check the
                requirement asks for. It confirmed the wrong answer.
              </p>

              <div className="pil-bignums">
                {PROOF_NUMBERS.map((n) => (
                  <div key={n.value} className="pil-bignum">
                    <span className="pil-bignum-value">{n.value}</span>
                    <p className="pil-bignum-body">{n.body}</p>
                  </div>
                ))}
              </div>

              <div className="pil-jgrid">
                <div className="pil-jcol">
                  <span className="pil-jtag">What the candidate wrote</span>
                  <p>
                    96 contracts, sold. Loan interest, futures gain and net cost all priced
                    consistently off the candidate’s own closing price. Both scenarios land on
                    4.95%, and the script reads as confirmed.
                  </p>
                </div>
                <div className="pil-jarrow" aria-hidden="true">↓</div>
                <div className="pil-jcol">
                  <span className="pil-jtag">Why the cross-check cannot catch it</span>
                  <p>
                    The omitted 0.15 applies identically to the rate-rise and the rate-fall
                    leg. The reconciliation is invariant to the omission — it lands just as
                    cleanly on the wrong rate as on the right one.
                  </p>
                </div>
                <div className="pil-jarrow" aria-hidden="true">↓</div>
                <div className="pil-jcol pil-jcol--out">
                  <span className="pil-jtag">What marking has to say</span>
                  <p>
                    The unexpired basis was never subtracted. Closing price 94.85, not 95.00;
                    effective rate 4.80%, not 4.95%. One conceptual step, named — rather than
                    five red components handed back as five errors.
                  </p>
                </div>
              </div>

              <p className="pil-caption">
                Self-grading against a model answer shows a 0.15 gap. It does not tell you the
                gap <em>is</em> the basis, or that one step closes all five.
              </p>
            </div>
          </section>

          {/* ── 5. PACING (cream) — full-width feature artefact, copy left, artefact right.
              The quote is verbatim from the 31/07/2026 end-to-end walk; see file header. ── */}
          <section className="pil-feature" aria-label="Pacing">
            <div className="pil-wrap pil-feature-grid">
              <div className="pil-feature-copy">
                <p className="pil-eyebrow">Pacing · What a PDF cannot do</p>
                <h2 className="pil-h2">
                  A tutor marking a PDF three days later cannot know when you wrote each
                  answer.
                </h2>
                <p className="pil-sub">
                  Gradd can, because every requirement is submitted separately and timestamped.
                  The debrief measures each submission-to-submission interval against the
                  paper’s own arithmetic — 195 minutes, 100 marks, 1.95 minutes per mark — and
                  reports what happened.
                </p>
                <ul className="pil-bullets">
                  <li>
                    Intervals are submission-to-submission, never “time spent writing” —
                    reading and thinking sit inside the interval, and the report says so.
                  </li>
                  <li>
                    The first requirement carries no ratio: its interval contains reading the
                    whole Section A scenario and its exhibits.
                  </li>
                  <li>
                    A requirement never reached is reported as <em>not reached</em>, not as
                    blank. Different findings, different next actions.
                  </li>
                </ul>
              </div>

              <div className="pil-feature-visual">
                <figure
                  className="pil-artefact"
                  role="img"
                  aria-label="A pacing report showing an end-of-paper collapse finding"
                >
                  <div className="pil-artefact-head">
                    <span className="pil-artefact-title">Pacing</span>
                    <span className="pil-artefact-sub">AFM Mock Paper 1 · 8 requirements</span>
                  </div>
                  <div className="pil-arow">
                    <div className="pil-arow-head">
                      <span className="pil-arow-label">End-of-paper collapse</span>
                      <span className="pil-arow-verdict">high</span>
                    </div>
                    <p className="pil-arow-body">
                      “Between submitting Q2 (ii) and finishing, 12 minutes elapsed across
                      Q3 (i)–Q3 (ii), against a combined budget of 39 minutes. The final 2
                      requirements recorded no answer that could earn marks.”
                    </p>
                  </div>
                  <div className="pil-arow">
                    <div className="pil-arow-head">
                      <span className="pil-arow-label">Q1 (i) — reading + first requirement</span>
                      <span className="pil-arow-verdict">no ratio</span>
                    </div>
                    <p className="pil-arow-body">
                      Reported without a ratio on purpose: this interval contains the Section A
                      scenario and its exhibits, so a marks-derived budget would mean nothing.
                    </p>
                  </div>
                  <figcaption className="pil-artefact-foot">
                    Measured from submission timestamps · 1.95 minutes per mark
                  </figcaption>
                </figure>
                <p className="pil-artefact-caption">
                  Verbatim from a real end-to-end run, 31 July 2026.
                </p>
              </div>
            </div>
          </section>

          {/* ── 6. THE PAPERS (sage band) — the pillar's own job: compare and route. ── */}
          <section className="pil-papers pil-band-sage" id="papers" aria-label="Papers">
            <div className="pil-wrap">
              <p className="pil-eyebrow">Two papers live</p>
              <h2 className="pil-h2">Pick the paper you are sitting.</h2>
              <p className="pil-sub">
                Each paper is bought on its own. The drills, the cases and the mock belong to
                that paper — there is no shared bank and no bundle.
              </p>
              <div className="pil-grid">
                {PAPERS.map((p) => (
                  <article key={p.code} className="pil-card">
                    <div className="pil-card-head">
                      <h3 className="pil-card-code">{p.code}</h3>
                      <span className="pil-chip">{p.status}</span>
                    </div>
                    <p className="pil-card-name">{p.name}</p>
                    <p className="pil-card-blurb">{p.blurb}</p>
                    <p className="pil-card-live"><strong>What’s live:</strong> {p.live}</p>
                    <Link href={p.href} className="btn btn-rust pil-card-btn">
                      {p.code} in detail <span className="arrow" aria-hidden="true">→</span>
                    </Link>
                  </article>
                ))}
              </div>
            </div>
          </section>

          {/* ── 7. PRICING (cream) — three lines, three columns. Deliberately lighter than
              the spokes' tier grid: the pillar states the shape, the spoke sells. ── */}
          <section className="pil-pricing" id="pricing" aria-label="Pricing">
            <div className="pil-wrap">
              <p className="pil-eyebrow">Pricing</p>
              <h2 className="pil-h2">Free to start. Then priced per paper.</h2>
              <div className="pil-price-grid">
                <div className="pil-price">
                  <span className="pil-price-name">Free</span>
                  <span className="pil-price-amount">€0</span>
                  <p className="pil-price-body">
                    Every drill in the paper, unlimited, plus three full teach-throughs with
                    Ezra. No card.
                  </p>
                </div>
                <div className="pil-price is-featured">
                  <span className="pil-price-name">Exam pass</span>
                  <span className="pil-price-amount">
                    €99<span className="pil-price-period">one-time · 90 days</span>
                  </span>
                  <p className="pil-price-body">
                    Unlimited coaching, exam cases, professional-skills marking and the timed
                    mock, through your sitting.
                  </p>
                </div>
                <div className="pil-price">
                  <span className="pil-price-name">Monthly</span>
                  <span className="pil-price-amount">
                    €49<span className="pil-price-period">/ month</span>
                  </span>
                  <p className="pil-price-body">
                    The same access, month to month. Cancel any time.
                  </p>
                </div>
              </div>
              <p className="pil-note">
                Prices are <strong>per paper</strong>. Buying APM does not include AFM.
              </p>
            </div>
          </section>

          {/* ── 8. CLOSING CTA (dark forest band) — the free resit diagnostic. Scoped to APM
              because the engine is: see the header note. ── */}
          <section className="pil-final" aria-label="Free APM resit diagnostic">
            <div className="pil-wrap">
              <span className="pil-pill">Free · 3 minutes · no sign-up</span>
              <h2 className="pil-h2">Failed APM? Find out exactly why.</h2>
              <p className="pil-sub">
                Your result slip gives you a score. It does not name the habit that cost the
                marks. Three quick steps — your score, how each syllabus area went, and six
                honest questions about how you write — and you get the areas to drill and the
                habits to fix first.
              </p>
              <div className="pil-cta-row pil-cta-row--center">
                <Link href="/acca/resit" className="btn btn-rust btn-lg">
                  Get my free resit diagnosis <span className="arrow" aria-hidden="true">→</span>
                </Link>
                <Link href="/acca/auth?next=/acca" className="btn btn-ghost btn-lg">
                  Start free instead
                </Link>
              </div>
              <p className="pil-fineprint">
                Every drill free · €99 per paper for 90 days, or €49/month · No card to start
              </p>
            </div>
          </section>
        </main>

        <footer className="pil-footer">
          <div className="pil-wrap pil-footer-inner">
            <span>
              © 2026 Gradd.ai · Gradd is not affiliated with or endorsed by ACCA. Scenarios are
              original works built to the public syllabus structure.
            </span>
            <div className="pil-footer-links">
              {/* This page IS gradd.ai home now, so a "Gradd home" link here would be
                  circular. IB has no nav link into it anywhere else on gradd.ai since the
                  hub (whose nav carried it) was deleted — this is the replacement, so /ib
                  stays reachable and crawlable from every page on the site. */}
              <Link href="/ib">IB Diploma</Link>
              <Link href="/blog">Blog</Link>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────────────────
// Uses the `.plp/.hub/.pil` token block declared in app/globals.css (--paper/--ink/--rule/
// --forest/--sage/--rust/--serif/--mono/--radius) directly. The type scale, buttons, sticky
// header and `.pil-card`'s radius/border/background stay in globals; everything below is
// layout this page owns. Every NEW selector uses a name globals does not already carry, so
// no rule here can win or lose a cascade race with the shared sheet.
const CSS = `
.pil-wrap { max-width: 1040px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); width: 100%; }
/* MIN-height, not height. The nav is flex-wrap, so on a narrow viewport it takes a second
   line — and against a fixed 56px that second line rendered OUTSIDE the header box, over the
   hero. Measured at 390px in a 390px iframe, not eyeballed at desktop. The two anchor links
   also drop below 560px so the wrap does not happen in the first place; the paper links and
   the CTA stay, which at 390px measures ~302px against ~358px of available width. */
.pil-header-inner { min-height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.pil-logo { display: flex; align-items: center; text-decoration: none; }
.pil-nav { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
@media (max-width: 560px) { .pil-navlink--wide { display: none; } }
/* globals.css owns the type SCALE for these (font/size/colour); the margins are layout and
   live here, exactly as the pre-recompose file had them. A <p class="pil-eyebrow"> with no
   explicit margin picks up the browser's 1em default. */
.pil-eyebrow { margin: 0 0 14px; }
.pil-h2 { margin: 0 0 14px; }
.pil-sub { margin: 0 0 18px; max-width: 640px; }
.pil-sub-tight { margin-bottom: 22px; }
.pil-cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
.pil-cta-row--center { justify-content: center; }
.pil-note { font-size: 14px; line-height: 1.55; color: var(--ink-2);
  background: color-mix(in oklab, var(--rust) 8%, transparent);
  border: 1px solid color-mix(in oklab, var(--rust) 28%, transparent); border-radius: var(--radius-sm);
  padding: 11px 15px; margin: 26px auto 0; max-width: 620px; text-align: center; }
.pil-note strong { color: var(--ink); }
.pil-caption { margin-top: 26px; text-align: center; font-family: var(--serif); font-style: italic;
  font-size: 17px; line-height: 1.45; }

/* ── 1. Hero — copy + artefact. Mirrors .plp-hero-inner--split's proportions. ── */
.pil-hero { padding: clamp(40px, 7vw, 80px) 0 clamp(28px, 4vw, 48px); }
.pil-hero-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: clamp(32px, 5vw, 60px); align-items: center; }
@media (max-width: 940px) { .pil-hero-grid { grid-template-columns: 1fr; } }
.pil-hero-copy { min-width: 0; }
.pil-hero-visual { min-width: 0; }
.pil-meta { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin: 20px 0 0;
  font-size: 13px; color: var(--ink-3); }
.pil-meta-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--ink-3); display: inline-block; }

/* ── Artefacts (the marked panel, the pacing panel). One shape, two uses. ── */
.pil-artefact { margin: 0; border: 1px solid var(--rule); border-radius: var(--radius);
  background: var(--paper); padding: 18px; display: flex; flex-direction: column; gap: 12px;
  box-shadow: 0 20px 40px -28px rgba(20,24,22,0.18); }
.pil-artefact-head { display: flex; flex-direction: column; gap: 2px;
  padding-bottom: 10px; border-bottom: 1px solid var(--rule); }
.pil-artefact-title { font-size: 13.5px; font-weight: 700; color: var(--ink); }
.pil-artefact-sub { font-size: 12px; color: var(--ink-3); }
.pil-arow { border-top: 1px solid var(--rule); padding-top: 12px; }
.pil-arow:first-of-type { border-top: 0; padding-top: 0; }
.pil-arow-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 5px; }
.pil-arow-label { font-size: 13px; font-weight: 700; color: var(--ink); }
.pil-arow-verdict { font-family: var(--mono); font-size: 10.5px; font-weight: 500;
  text-transform: uppercase; letter-spacing: .05em; color: var(--rust);
  border: 1px solid color-mix(in oklab, var(--rust) 35%, transparent);
  border-radius: 999px; padding: 2px 9px; white-space: nowrap; }
.pil-arow-body { font-size: 13.5px; line-height: 1.55; color: var(--ink-2); margin: 0; }
.pil-artefact-foot { font-size: 11.5px; color: var(--ink-3); padding-top: 10px; border-top: 1px solid var(--rule); }
.pil-artefact-caption { margin: 12px 0 0; text-align: center; font-family: var(--serif);
  font-style: italic; font-size: 14.5px; line-height: 1.4; color: var(--forest); }

/* ── 2. Stat strip ── */
.pil-statbar { border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule);
  padding: 22px 0; background: color-mix(in oklab, var(--paper) 90%, var(--paper-2)); }
.pil-statbar-inner { display: flex; align-items: center; justify-content: space-between;
  gap: 32px; flex-wrap: wrap; }
.pil-statbar-label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--ink-3); }
.pil-statbar-stats { display: flex; align-items: baseline; gap: clamp(18px, 3.5vw, 48px);
  flex-wrap: wrap; justify-content: center; }
.pil-statbar-stat { display: flex; align-items: baseline; gap: 8px; }
.pil-statbar-num { font-family: var(--serif); font-size: 28px; letter-spacing: -0.02em;
  font-style: italic; color: var(--ink); }
.pil-statbar-lbl { font-size: 12px; color: var(--ink-3); }

/* ── 3. Compare table ── */
.pil-cmp { padding: clamp(32px, 5vw, 56px) 0; }
.pil-cmp-scroll { overflow-x: auto; border: 1px solid var(--rule); border-radius: var(--radius); margin-top: 26px; }
.pil-cmp-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.pil-cmp-table th, .pil-cmp-table td { padding: 15px 18px; text-align: left;
  border-bottom: 1px solid var(--rule); vertical-align: top; white-space: nowrap; }
.pil-cmp-table tbody tr:last-child th, .pil-cmp-table tbody tr:last-child td { border-bottom: 0; }
.pil-cmp-table thead th { font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--ink-3); font-weight: 500;
  background: var(--paper-2); border-bottom: 1px solid var(--rule-strong); }
.pil-cmp-table thead th.is-gradd { color: var(--rust-ink); background: var(--forest); }
.pil-cmp-table td.is-gradd { background: color-mix(in oklab, var(--forest) 12%, var(--paper));
  border-left: 2px solid color-mix(in oklab, var(--forest) 60%, var(--rule));
  border-right: 1px solid color-mix(in oklab, var(--forest) 20%, var(--rule)); font-weight: 600; }
.pil-cmp-table tbody th { font-family: var(--mono); font-size: 12px; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--ink-3); font-weight: 500; white-space: normal; }
.pil-cmp-y { color: oklch(45% 0.13 145); font-weight: 600; }
.pil-cmp-n { color: var(--ink-3); }
.pil-cmp-hint { display: none; margin: 10px 0 0; font-size: 12px; color: var(--ink-3); text-align: center; }
@media (max-width: 720px) { .pil-cmp-hint { display: block; } }

/* ── Band treatments. Same two the template carries (.plp-band-dark / .plp-band-sage),
   restated for this page's own class names — see the CSS note above the const. ── */
.pil-band-dark { background: var(--forest); color: var(--forest-ink); }
.pil-band-dark .pil-h2, .pil-band-dark .pil-eyebrow { color: var(--forest-ink); }
.pil-band-dark .pil-sub, .pil-band-dark .pil-caption {
  color: color-mix(in oklab, var(--forest-ink) 82%, transparent); }
.pil-band-sage { background: var(--sage); }

/* ── 4. Proof band — big numbers + the three-card chain ── */
.pil-proof { padding: clamp(44px, 7vw, 84px) 0; }
.pil-bignums { display: flex; flex-wrap: wrap; margin: 34px 0 38px; }
.pil-bignum { flex: 1 1 200px; padding: 0 clamp(14px, 2.6vw, 30px);
  border-left: 1px solid color-mix(in oklab, var(--forest-ink) 25%, transparent); text-align: center; }
.pil-bignum:first-child { border-left: 0; }
.pil-bignum-value { display: block; font-family: var(--serif); font-style: italic; font-weight: 400;
  font-size: clamp(52px, 7.5vw, 88px); line-height: 1; letter-spacing: -0.02em; color: var(--forest-ink); }
.pil-bignum-body { margin: 12px 0 0; font-size: 14px; line-height: 1.5;
  color: color-mix(in oklab, var(--forest-ink) 68%, transparent); }
@media (max-width: 760px) {
  /* "flex: 0 0 auto" is load-bearing, not tidying. The row rule is "flex: 1 1 200px", and
     flex-BASIS resolves against the MAIN axis — which becomes the block axis the moment the
     container turns column. Each figure then claims a 200px minimum HEIGHT and the band
     renders with ~100px of dead space under every body paragraph. Measured at 390px.
     (NB: no backticks in this string — it is a template literal, and one here terminates it.) */
  .pil-bignums { flex-direction: column; gap: 22px; }
  .pil-bignum { flex: 0 0 auto;
    border-left: 0; border-top: 1px solid color-mix(in oklab, var(--forest-ink) 25%, transparent);
    padding: 20px 0 0; }
  .pil-bignum:first-child { border-top: 0; padding-top: 0; }
}
.pil-jgrid { display: flex; flex-wrap: wrap; align-items: stretch; gap: 12px; }
.pil-jcol { flex: 1 1 240px; border-radius: var(--radius); padding: 20px;
  display: flex; flex-direction: column; gap: 9px;
  background: color-mix(in oklab, var(--forest) 85%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--forest-ink) 25%, transparent); }
.pil-jtag { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em;
  color: color-mix(in oklab, var(--forest-ink) 65%, transparent); }
.pil-jcol--out .pil-jtag { color: var(--rust); }
.pil-jcol p { font-size: 14px; line-height: 1.55; margin: 0;
  color: color-mix(in oklab, var(--forest-ink) 82%, transparent); }
.pil-jarrow { flex: 0 0 auto; align-self: center; color: var(--rust); font-size: 16px; }
/* Once the chain stacks, the arrows must take a WHOLE line of their own. Left to wrap
   naturally they ride on the end of the card above, so the first two cards lose the arrow's
   width and render 332px against the last card's 352px — three stacked cards at two
   different widths. Measured at 390px, not eyeballed. */
@media (max-width: 760px) {
  .pil-jarrow { flex: 1 0 100%; text-align: center; align-self: auto; }
}

/* ── 5. Feature artefact (pacing) ── */
.pil-feature { padding: clamp(36px, 5.5vw, 64px) 0; }
.pil-feature-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: clamp(32px, 5vw, 60px); align-items: center; }
@media (max-width: 860px) { .pil-feature-grid { grid-template-columns: 1fr; } }
.pil-feature-copy { min-width: 0; }
.pil-feature-visual { min-width: 0; }
/* The marker is ABSOLUTELY POSITIONED, not a grid track. The template's equivalent
   (.plp-feature-artefact-bullets) makes the <li> a two-column grid, which works only while
   every bullet is a bare string: any ELEMENT child — an <em>, a <strong>, a link — becomes a
   grid ITEM of its own and is torn out of the sentence onto its own line. Caught here on the
   "reported as <em>not reached</em>" bullet. padding-left + ::before keeps the <li> a normal
   inline flow, so markup inside a bullet stays inside the sentence. */
.pil-bullets { list-style: none; margin: 20px 0 0; padding: 0;
  display: flex; flex-direction: column; gap: 12px; }
.pil-bullets li { position: relative; padding-left: 30px;
  font-size: 14.5px; line-height: 1.5; color: var(--ink-2); }
.pil-bullets li::before { content: ""; position: absolute; left: 4px; top: 6px;
  width: 12px; height: 12px; border-radius: 50%; background: var(--forest); }

/* ── 6. Papers ── */
.pil-papers { padding: clamp(36px, 5.5vw, 64px) 0; }
.pil-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px; margin-top: 26px; }
@media (max-width: 760px) { .pil-grid { grid-template-columns: 1fr; } }
.pil-card { border: 1px solid var(--rule); padding: 24px; display: flex; flex-direction: column; gap: 10px; }
.pil-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.pil-card-code { font-size: 26px; margin: 0; letter-spacing: -.4px; color: var(--ink); }
.pil-chip { font-family: var(--mono); font-size: 10.5px; font-weight: 500; letter-spacing: .05em;
  text-transform: uppercase; color: var(--rust);
  border: 1px solid color-mix(in oklab, var(--rust) 35%, transparent);
  border-radius: 999px; padding: 3px 10px; }
.pil-card-name { font-size: 13.5px; font-weight: 600; color: var(--ink-3); margin: 0; }
.pil-card-blurb { font-size: 14.5px; line-height: 1.55; color: var(--ink-2); margin: 0; }
.pil-card-live { font-size: 13px; line-height: 1.5; color: var(--ink-2); margin: 0 0 6px; }
.pil-card-live strong { color: var(--rust); }
.pil-card-btn { align-self: flex-start; margin-top: auto; }

/* ── 7. Pricing ── */
.pil-pricing { padding: clamp(36px, 5.5vw, 64px) 0; }
.pil-price-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px; margin-top: 26px; align-items: stretch; }
@media (max-width: 720px) { .pil-price-grid { grid-template-columns: 1fr; } }
.pil-price { border: 1px solid var(--rule); border-radius: var(--radius); background: var(--paper);
  padding: 24px; display: flex; flex-direction: column; gap: 8px; }
.pil-price.is-featured { border-color: var(--rust); box-shadow: 0 20px 40px -30px rgba(20,24,22,0.28); }
.pil-price-name { font-family: var(--mono); font-size: 11px; font-weight: 500; text-transform: uppercase;
  letter-spacing: .09em; color: var(--ink-3); }
.pil-price-amount { font-family: var(--serif); font-size: 36px; letter-spacing: -.8px; color: var(--ink); line-height: 1.05; }
.pil-price-period { display: block; font-family: var(--sans); font-size: 12.5px; font-weight: 500;
  letter-spacing: 0; color: var(--ink-3); margin-top: 4px; }
.pil-price-body { font-size: 13.5px; line-height: 1.55; color: var(--ink-2); margin: 4px 0 0; }

/* ── 8. Closing CTA — the forest band, same treatment as .plp-final. ── */
.pil-final { background: var(--forest); color: var(--forest-ink); position: relative;
  overflow: hidden; padding: clamp(56px, 8vw, 104px) 0; text-align: center; }
.pil-final::before { content: ""; position: absolute; inset: 0;
  background: radial-gradient(circle at 80% 20%, color-mix(in oklab, var(--rust) 30%, transparent), transparent 50%),
              radial-gradient(circle at 10% 90%, color-mix(in oklab, var(--forest-2) 80%, transparent), transparent 60%);
  pointer-events: none; }
.pil-final .pil-wrap { position: relative; }
.pil-final .pil-h2 { color: var(--forest-ink); }
.pil-final .pil-sub { color: color-mix(in oklab, var(--forest-ink) 80%, transparent);
  margin-left: auto; margin-right: auto; }
.pil-final .btn-ghost { border-color: color-mix(in oklab, var(--forest-ink) 40%, transparent); color: var(--forest-ink); }
.pil-final .btn-ghost:hover { background: var(--forest-ink); color: var(--forest); border-color: var(--forest-ink); }
.pil-pill { display: inline-block; font-size: 12px; font-weight: 700; color: var(--rust);
  border: 1px solid color-mix(in oklab, var(--forest-ink) 40%, transparent);
  border-radius: 999px; padding: 4px 13px; margin-bottom: 14px; }
.pil-fineprint { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
  margin-top: 24px; color: color-mix(in oklab, var(--forest-ink) 55%, transparent); }

/* ── Footer ── */
.pil-footer { margin-top: auto; border-top: 1px solid var(--rule); padding: 18px 0; }
.pil-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;
  gap: 10px; font-size: 11.5px; color: var(--ink-3); }
.pil-footer-links { display: flex; gap: 16px; }
.pil-footer-links a { font-size: 11.5px; color: var(--ink-3); text-decoration: none; }
.pil-footer-links a:hover { color: var(--ink); }
`;
