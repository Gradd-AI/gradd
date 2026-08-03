// components/landing/product-landing-config.ts
// First instance of the PARAMETERISED landing pattern. ProductLandingPage renders from one
// of these configs. Deliberately MINIMAL — only the fields the AFM page needs today; no
// speculative surface. (The APM root landing is NOT refactored onto this yet — that is the
// template-migration job at B-section-live; see docs/AFM_SURFACED.)

export interface ProductLandingConfig {
  paper: string;          // e.g. 'AFM'
  examName: string;       // e.g. 'Advanced Financial Management'
  eyebrow: string;
  headline: string;
  subhead: string;
  coverage: string;       // the EXACT, honest coverage claim — no breadth implication
  points: { title: string; body: string }[];
  pricing: { free: string; paid: string };
  freeCta: { label: string; href: string };
  footnote: string;
  proof?: { label: string; href: string };  // optional link to a real walkthrough proof page
}

// AFM — early-access honest. Coverage states EXACTLY what is live (16 drills, four
// calculators). CTA threads ?paper=AFM through the existing auth flow so the post-signup
// dashboard lands on AFM (the first-run banner then handles the first drill).
export const AFM_LANDING: ProductLandingConfig = {
  paper: 'AFM',
  examName: 'Advanced Financial Management',
  eyebrow: 'ACCA AFM · early access',
  headline: 'AFM practice that shows you why answers lose marks',
  subhead:
    'Ezra marks your working like the examiner, diagnoses the exact gap — a mismatched discount rate, an un-stripped debt, a calculation that never became advice — then coaches the fix, drill by drill.',
  coverage:
    '16 exam-style drills live across advanced investment appraisal and financing — NPV, IRR/MIRR, APV and cost of capital. New drills weekly.',
  points: [
    {
      title: 'Diagnosis, not hints',
      body: 'Ezra names the mark you lost and why, then coaches the correct move — the jump from a computed figure to advice a board could act on, which is where AFM answers actually fail.',
    },
    {
      title: 'Numbers checked by code',
      body: 'Every figure and every accept/reject verdict is computed and verified deterministically, so the marking is exact. You practise against the right answer, not an approximation.',
    },
    {
      title: 'Early access, stated honestly',
      body: 'AFM is new here: 16 drills live now across the appraisal and financing core, more every week. You see exactly what is covered — no padding, no “complete syllabus” claim.',
    },
  ],
  // ── CORRECTED 2026-08-03: the paid line asserted the retired BUNDLE ─────────
  // It read: "One ACCA pass covers every paper you sit: APM and AFM together, one
  // subscription." Per-paper pricing was ruled 2026-08-03 — APM and AFM are separate SKUs —
  // so that sentence was selling something the product no longer offers, on a live page.
  // It was the MORE explicit of the two bundle claims on this card (the other was the
  // heading, now paper-neutral in the template), and fixing only the heading would have
  // left the page stating the bundle outright one line below a corrected title.
  pricing: {
    free: 'Free to start — every live AFM drill, with Ezra teach-throughs. No card required.',
    paid: 'Then €99 for a sitting-dated AFM pass, or €49/month. Each ACCA paper is priced separately.',
  },
  freeCta: {
    label: 'Start free — every live drill',
    href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}`,
  },
  footnote: 'Gradd is not affiliated with or endorsed by ACCA. Scenarios are original works built to the public syllabus structure.',
  proof: { label: 'See a real walkthrough', href: '/acca/afm/proof' },
};
