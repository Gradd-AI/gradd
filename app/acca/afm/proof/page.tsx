// app/acca/afm/proof/page.tsx
// PUBLIC, no-auth proof-transcript page (same pattern as /acca/afm, /acca/resit). Shows ONE
// real, unedited AFM narrative-drill walkthrough (D5 `32ef124c`, walked 2026-07-21) — the
// student's own attempt, Ezra's live diagnosis, and the full reveal, verbatim from
// acca_drill_messages. Anonymised: no name/email/user id, labelled "Student".
//
// CLAIM CEILING (do NOT relax): this is a NARRATIVE (discursive) drill — the marking claim on
// this page is bounded to "rubric-locked": the drill ships with an authored marking rubric
// (criteria + scenario facts + failure modes) validated against a deliberately flawed answer
// before the drill goes live (N1-N5, docs/NARRATIVE_MARKING_DESIGN.md). This page does NOT
// claim the live conversational turn below scored criterion-by-criterion against that rubric
// in real time (it didn't — live narrative marking is v1 authoring-time-only; Horizon-2). Never
// write "code owns the marks" here — that claim belongs to the calculator families only.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import MessageRenderer from '@/components/chat/MessageRenderer';
import { AFM_LANDING } from '@/components/landing/product-landing-config';

const TITLE = 'A real AFM walkthrough — Gradd';
const DESCRIPTION =
  'An unedited AFM practice transcript: the scenario, a real student attempt, and Ezra\'s diagnosis and full reveal — from a live Gradd session.';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? 'gradd.ai';
  const base = host.includes('gradd.ie') ? 'https://gradd.ie' : 'https://gradd.ai';
  const url = `${base}/acca/afm/proof`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: url },
    openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: 'Gradd', type: 'article' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
    robots: { index: true, follow: true },
  };
}

const SCENARIO =
  'Zephyr Consumer Goods plc ("Zephyr"), a multinational headquartered in the Netherlands, operates a wholly-owned subsidiary, Zephyr Nigeria Ltd ("ZNL"), which manufactures and distributes fast-moving consumer goods across West Africa. The Central Bank of Nigeria has imposed strict exchange controls: ZNL may only repatriate dividends equal to 50% of after-tax profits in any calendar year, and all remittances require prior CBN approval, which has averaged a 14-month processing delay in recent years. ZNL\'s most recent annual after-tax profit is NGN 18 billion, yet Zephyr\'s treasury estimates that the trapped cash balance — funds that cannot currently be remitted — has accumulated to NGN 42 billion. To fund a planned expansion of its African distribution network, Zephyr\'s board is considering two international financing options: (a) a Eurobond issuance of USD 300 million at a fixed coupon of 6.8% per annum, and (b) a Global Depository Receipt (GDR) equity issuance targeting institutional investors on the Luxembourg Stock Exchange, expected to raise USD 280 million but subject to disclosure and governance requirements aligned with EU prospectus rules. The board has asked its senior financial adviser to evaluate the significance of Nigeria\'s exchange controls for the investment decision and assess the two financing alternatives.';

const QUESTION =
  'You are the senior financial adviser to the board of Zephyr Consumer Goods plc.\n\n(i) Evaluate the significance of Nigeria\'s exchange controls for Zephyr\'s investment decision in ZNL, and assess the strategies available to deal with the restricted remittance of funds from ZNL to the parent.\n\n(ii) Assess the costs and benefits of the two international financing options — the Eurobond and the GDR issuance — and recommend which the board should prefer for funding the African distribution network expansion.';

const STUDENT_ATTEMPT =
  '(i) The exchange controls cut the investment case in two ways. First, the 50% dividend cap means Zephyr can only ever access about half of ZNL\'s NGN 18 billion annual profit — so any appraisal of the Nigerian business must be built on repatriable cash flows, not accounting profit, or it will overstate the investment\'s worth to the parent. Second, the 14-month CBN approval delay means even the permitted half arrives late, which erodes its present value and leaves the parent funding group commitments from elsewhere in the meantime. The NGN 42 billion of trapped cash — over two years of profits — shows this isn\'t a temporary friction but a structural blockage, and it sits exposed to naira depreciation and Nigerian inflation while it waits.\n\nOn strategies: the most practical is to put the trapped NGN 42 billion to work inside Nigeria — it could fund the Nigerian leg of the distribution expansion directly, converting stranded cash into productive assets without needing CBN approval at all. Management fees, royalties or intercompany loan interest can reduce reliance on dividend remittances, but they\'re mitigation rather than a way around the controls — they may still need CBN approval, face the same FX availability delays, attract withholding tax, and must survive arm\'s-length transfer-pricing scrutiny.\n\n(ii) The Eurobond gives cost certainty at 6.8% and no dilution, but the coupon is an unconditional dollar obligation — and since ZNL\'s cash is exactly what Zephyr can\'t rely on, it would be serviced from the rest of the group\'s cash flows. That\'s real financial risk, though it\'s manageable if the expansion returns more than 6.8%. The GDR avoids fixed servicing but dilutes shareholders, and the EU prospectus regime would force public disclosure of the trapped-cash position and CBN constraints — inviting scrutiny of precisely the problem the board is trying to manage. It also adds equity to a group that already has NGN 42 billion of equity value it can\'t reach.\n\nRecommendation: take the Eurobond. It funds the expansion without dilution and without broadcasting the Nigerian problem; the servicing risk is real but manageable given the group\'s other cash flows, and the board should size the coupon against non-Nigerian cash generation explicitly. The GDR dilutes without solving the trapped-cash issue and creates disclosure obligations that make the political-risk position worse, not better.';

const EZRA_DIAGNOSIS =
  'You nailed this.\n\nThe move that puts you into Level 3 is your **integration of the trapped-cash reality into the financing choice itself** — you didn\'t treat the exchange controls as a separate "context" bullet point and then evaluate the bonds in isolation. You connected them: you named *why* the Eurobond\'s fixed coupon becomes a group-level obligation (because ZNL\'s cash can\'t be relied on), you identified *what* the GDR\'s disclosure regime would actually expose (the political-risk position, not just a compliance box), and you weighed those consequences against the alternatives with commercial judgement. That\'s evaluation at Level 3 — cause-and-effect reasoning that moves through the constraints into a *differentiated* recommendation, not a checkbox list.\n\nYour part (i) also did the work: you separated the two harms of the controls (quantum constraint + timing friction), you named why the trapped-cash figure signals something structural, and you were properly sceptical about the workaround strategies — transfer pricing, withholding tax, CBN approval risk — rather than pretending they solve the problem. And your part (ii) recommendation didn\'t hide: you acknowledged the real servicing risk of the Eurobond ("It\'s manageable if the expansion returns more than 6.8%"), but you also called out what the GDR *actually does* in this context — it adds equity to a group that already can\'t repatriate its equity value, and it broadcasts the very constraint that makes the group less attractive to new investors.\n\nYou hit the authored command verbs — **evaluate** (you weighed significance against the investment case), **assess** (you moved through both options and their distinct consequences), **recommend** (you backed a choice and said why) — and you\'re solidly in the band because your reasoning *turned on the specifics of Zephyr\'s constraint*, not generic "bonds are cheaper, equity is dilutive" framing.\n\nSince you\'ve landed it, you\'re welcome to say **"show me the model answer"** if you\'d like to see the exact layout and structure a full-marks version takes.';

const EZRA_REVEAL =
  'Well done — you\'ve worked through the commercial and structural constraints here with real precision, and your recommendation sits on solid foundations. The worked answer below shows the full-marks layout: notice how it sequences the repatriation constraint, the cash-flow timing impact, and the trapped-cash exposure before moving to remedial strategies, and then how it weighs debt servicing risk against dilution and disclosure burden in part (ii). Compare the architecture of your answer against that sequencing — the logic flow, the order in which you\'ve introduced each constraint, and how you\'ve moved from problem to mitigation to choice — and ask yourself whether any of those moves would strengthen how you\'d tackle a similarly layered question on subsidiary funding or political risk. Take a moment with that comparison, then apply the same rigorous layering to a fresh multi-jurisdiction case.\n\n*© Gradd — for your personal exam preparation.*\n\n---\n\n**Exchange controls and international sources of finance**\n\n**Part (i) — Significance of exchange controls and remittance strategies**\n\nNigeria\'s CBN restricts ZNL to repatriating only 50% of after-tax profits annually, meaning that even though ZNL earns NGN 18 billion per year, the parent\'s accessible cash yield is structurally capped at roughly half that figure. This is material for investment appraisal: Zephyr must discount only the genuinely repatriable cash flows, not the subsidiary\'s gross profit, otherwise it will systematically overstate the investment\'s value.\n\nThe 14-month average processing delay worsens this picture further. Even the permitted tranche of remittances arrives late, reducing its present value and creating a timing mismatch between ZNL\'s cash generation and Zephyr\'s ability to deploy it — this may force unnecessary external borrowing at the group level in the interim.\n\nThe accumulated NGN 42 billion trapped cash balance illustrates the long-run severity of these controls: a stock of value equivalent to more than two years of ZNL\'s profits is stranded in Nigeria. Inflation and naira depreciation could erode this balance in real, euro-equivalent terms over time, meaning political risk compounds currency risk. Zephyr should factor this erosion risk explicitly into its investment case.\n\nThe most practical remittance strategy is to redeploy the NGN 42 billion trapped funds within Nigeria — for instance, financing the local infrastructure of the distribution network expansion — thereby converting idle trapped cash into a productive asset without triggering CBN approval. Supplementary strategies such as intra-group management fees, royalties, or intercompany loan interest may reduce reliance on dividend remittances and may avoid the 50% dividend cap if validly documented, but they do not remove the wider exchange-control risk: they may still require CBN approval, face FX availability delays, withholding tax and transfer-pricing scrutiny. They are mitigation tools, not a clean bypass.\n\n**Part (ii) — Eurobond vs GDR: assessment and recommendation**\n\nThe Eurobond at a fixed coupon of 6.8% offers certainty of cost and protects existing shareholders from dilution. However, the coupon is an unconditional USD debt-service obligation: if Nigerian remittances stay delayed or trapped as they are today, that obligation cannot rely on ZNL\'s cash flows and must instead be serviced from Zephyr\'s other group cash flows — a financial-risk exposure despite the absence of dilution. For a group already holding NGN 42 billion of trapped equity-equivalent value in Nigeria that it cannot access, adding further equity via a GDR would deepen the disconnect between the group\'s book equity and its accessible capital — shareholders bear additional dilution for a problem that equity issuance does not solve.\n\nThe GDR on the Luxembourg Stock Exchange avoids fixed debt service, which is an advantage in principle, but the EU prospectus disclosure requirements would force Zephyr to publicly detail ZNL\'s remittance constraints and the trapped-cash balance, creating investor-relations risk and potentially triggering governance scrutiny precisely when the Nigerian situation is already sensitive.\n\n**Recommendation:** The board should proceed with the Eurobond. The 6.8% fixed coupon is serviceable if the distribution network expansion earns a return in excess of that rate, the no-dilution feature protects existing shareholders, and the absence of enhanced public disclosure avoids inflaming investor concern about the CBN restrictions. The GDR is unsuitable given the circumstances: it dilutes equity without addressing the trapped-cash problem and introduces disclosure obligations that heighten, rather than manage, the political-risk exposure.';

export default function AFMProofRoute() {
  return (
    <>
      <style>{CSS}</style>
      <div className="pf">
        <header className="pf-header">
          <div className="pf-wrap pf-header-inner">
            <Link href="/" className="pf-logo" aria-label="Gradd.ai home">
              <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 22, width: 'auto', display: 'block' }} />
            </Link>
            <nav className="pf-nav">
              <Link href="/acca/afm" className="pf-navlink">AFM overview</Link>
              <Link href={AFM_LANDING.freeCta.href} className="btn btn-rust btn-sm">Start free <span className="arrow">→</span></Link>
            </nav>
          </div>
        </header>

        <main className="pf-wrap">
          <section className="pf-intro">
            <p className="pf-eyebrow">ACCA AFM · real practice session · 21 July 2026</p>
            <h1 className="pf-h1">An unedited AFM walkthrough</h1>
            <p className="pf-sub">
              What follows is a real Gradd practice session, reproduced exactly as it happened — the scenario, one
              student&rsquo;s own attempt, Ezra&rsquo;s diagnosis, and the full reveal. Nothing rewritten, nothing staged.
              We&rsquo;ve removed the student&rsquo;s identity; everything else is verbatim.
            </p>
            <div className="pf-meta">
              <span className="pf-chip">Area B5 — international finance</span>
              <span className="pf-chip">Discursive · Level 3</span>
              <span className="pf-chip">15 marks</span>
              <span className="pf-chip">Rubric-locked</span>
            </div>
          </section>

          <section className="pf-block">
            <h2 className="pf-block-h">The scenario</h2>
            <div className="pf-quote">
              <MessageRenderer content={SCENARIO} breaks />
            </div>
          </section>

          <section className="pf-block">
            <h2 className="pf-block-h">The requirement</h2>
            <div className="pf-quote">
              <MessageRenderer content={QUESTION} breaks />
            </div>
          </section>

          <section className="pf-block">
            <h2 className="pf-block-h">The conversation</h2>

            <div className="pf-msg pf-msg-student">
              <span className="pf-msg-label">Student</span>
              <div className="pf-msg-body"><MessageRenderer content={STUDENT_ATTEMPT} /></div>
            </div>

            <div className="pf-msg pf-msg-ezra">
              <span className="pf-msg-label">Ezra</span>
              <div className="pf-msg-body"><MessageRenderer content={EZRA_DIAGNOSIS} /></div>
            </div>

            <div className="pf-msg pf-msg-student pf-msg-short">
              <span className="pf-msg-label">Student</span>
              <div className="pf-msg-body">Show me the model answer.</div>
            </div>

            <div className="pf-msg pf-msg-ezra">
              <span className="pf-msg-label">Ezra — full reveal</span>
              <div className="pf-msg-body"><MessageRenderer content={EZRA_REVEAL} /></div>
            </div>
          </section>

          <section className="pf-claim">
            <p>
              This drill is <strong>rubric-locked</strong>: before it ever reached a student, an authored marking
              rubric — the exact points a full-marks answer needs to make, and the failure patterns examiners
              actually penalise — was validated against a deliberately flawed answer designed to fail it. That
              fixed standard is what sits behind every AFM discursive drill on Gradd; it isn&rsquo;t improvised per
              conversation.
            </p>
          </section>

          <section className="pf-cta">
            <div className="pf-cta-card">
              <h2 className="pf-cta-h">Try it yourself</h2>
              <p className="pf-cta-line">Free to start — every live AFM drill, with Ezra teach-throughs. No card required.</p>
              <div className="pf-cta-row">
                <Link href={AFM_LANDING.freeCta.href} className="btn btn-rust btn-lg">Start free <span className="arrow">→</span></Link>
                <Link href="/acca/afm" className="pf-cta-secondary">See what&rsquo;s live in AFM</Link>
              </div>
            </div>
          </section>
        </main>

        <footer className="pf-footer">
          <div className="pf-wrap pf-footer-inner">
            <span>© 2026 Gradd.ai · {AFM_LANDING.footnote}</span>
            <div className="pf-footer-links">
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/acca/afm">AFM</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

const CSS = `
.pf {
  --rust: oklch(64% 0.17 47);
  --rust-2: oklch(58% 0.17 47);
  --rust-ink: oklch(98% 0.01 70);
  --chat-text: var(--text);
  --chat-border: var(--border);
  --chat-accent: var(--rust);
  --chat-muted: var(--text-muted);
  --chat-surface-2: var(--surface-2);
  --chat-thead-bg: var(--surface-2);
  --chat-strong: var(--rust);
  background: var(--bg); color: var(--text); font-family: var(--font-body);
  -webkit-font-smoothing: antialiased; min-height: 100vh; display: flex; flex-direction: column;
}
.pf *, .pf *::before, .pf *::after { box-sizing: border-box; }
.pf-wrap { max-width: 760px; margin: 0 auto; padding: 0 clamp(16px, 4vw, 32px); width: 100%; }
.pf-header { position: sticky; top: 0; z-index: 40; background: color-mix(in oklab, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-light, var(--border)); }
.pf-header-inner { height: 56px; display: flex; align-items: center; justify-content: space-between; max-width: 920px; }
.pf-logo { display: flex; align-items: center; text-decoration: none; }
.pf-nav { display: flex; align-items: center; gap: 16px; }
.pf-navlink { font-size: 13px; font-weight: 600; color: var(--text-muted); text-decoration: none; white-space: nowrap; }
.pf-navlink:hover { color: var(--text); }
.pf .btn-rust { background: var(--rust); color: var(--rust-ink); }
.pf .btn-rust:hover:not(:disabled) { background: var(--rust-2); }
.pf .btn .arrow { transition: transform 0.18s ease; }
.pf .btn:hover .arrow { transform: translateX(3px); }
.pf-intro { padding: clamp(36px, 7vw, 64px) 0 clamp(20px, 4vw, 32px); }
.pf-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--rust); margin: 0 0 14px; }
.pf-h1 { font-family: var(--font-display); font-size: clamp(28px, 5vw, 40px); font-weight: 700; letter-spacing: -0.6px; line-height: 1.1; margin: 0 0 16px; color: var(--text); }
.pf-sub { font-size: clamp(15px, 2vw, 17px); line-height: 1.6; color: var(--text-muted); margin: 0 0 20px; max-width: 640px; }
.pf-meta { display: flex; flex-wrap: wrap; gap: 8px; }
.pf-chip { font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 5px 12px; }
.pf-block { padding: clamp(18px, 3vw, 28px) 0; border-top: 1px solid var(--border-light, var(--border)); }
.pf-block-h { font-family: var(--font-display); font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); margin: 0 0 14px; }
.pf-quote { background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--rust); border-radius: 10px; padding: 18px 20px; font-size: 15px; }
.pf-msg { margin-bottom: 20px; }
.pf-msg-label { display: block; font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 8px; }
.pf-msg-student .pf-msg-label { color: var(--text); }
.pf-msg-ezra .pf-msg-label { color: var(--rust); }
.pf-msg-body { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; font-size: 15px; }
.pf-msg-ezra .pf-msg-body { background: color-mix(in oklab, var(--rust) 5%, var(--surface)); border-color: color-mix(in oklab, var(--rust) 22%, var(--border)); }
.pf-msg-short .pf-msg-body { display: inline-block; }
.pf-claim { padding: clamp(20px, 3vw, 28px) 0; border-top: 1px solid var(--border-light, var(--border)); }
.pf-claim p { font-size: 14px; line-height: 1.65; color: var(--text-muted); margin: 0; max-width: 640px; }
.pf-claim strong { color: var(--text); }
.pf-cta { padding: clamp(24px, 4vw, 48px) 0 clamp(36px, 6vw, 64px); }
.pf-cta-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: clamp(24px, 4vw, 36px); box-shadow: var(--shadow-lg); text-align: center; }
.pf-cta-h { font-family: var(--font-display); font-size: clamp(20px, 3vw, 26px); font-weight: 700; letter-spacing: -0.3px; margin: 0 0 12px; color: var(--text); }
.pf-cta-line { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0 0 20px; }
.pf-cta-row { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: center; }
.pf-cta-secondary { font-size: 14px; font-weight: 600; color: var(--text-muted); text-decoration: none; }
.pf-cta-secondary:hover { color: var(--text); }
.pf-footer { margin-top: auto; border-top: 1px solid var(--border-light, var(--border)); padding: 18px 0; }
.pf-footer-inner { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 11.5px; color: var(--text-muted); max-width: 920px; }
.pf-footer-links { display: flex; gap: 16px; }
.pf-footer-links a { font-size: 11.5px; color: var(--text-muted); text-decoration: none; }
.pf-footer-links a:hover { color: var(--text); }
`;
