# Appendix — asset-level reuse register

Companion to **`FAE_ADVISORY_CROSSWALK.md`**. That document works competency-down (24 CAI
competencies → what serves them). This one works asset-up: **every calculation engine and every
answer structure in the corpus, one row each**, with its ACCA origin, the FAE Advisory competency
it serves, and a reuse verdict. Read-only against the corpus; nothing was written to any row.

**Base edition:** FAE Competency Statement **2025/2026**, Advisory elective pp.47–51. The
2026/27 statement is not public and has not been applied — see crosswalk §0. Corpus snapshot as
at 2026-08-29: **154 published + approved drills** (AFM 63, APM 91), **38 case requirements**
(AFM 20, APM 18), plus **5 SBL drills** `approved` / `published=false` by decision (P-DB9) —
reviewed content, not servable content, and the corpus the crosswalk's largest correction rests on.

> ### ✏️ RE-POINTED 2026-08-29 — this appendix now reads the five-label crosswalk, not the first pass
>
> It was written against `FAE_ADVISORY_CROSSWALK.md` §2 while that document still ruled
> **REUSE / ADAPT / NEW**. Those three labels no longer exist: the re-run (`61c02f6`) splits REUSE
> into **T** and **C**, splits NEW into **M** and **N**, and renames ADAPT **R** — landing on
> **T 6 · C 4 · M 4 · R 8 · N 2**.
>
> **Both headline ratios survive it unchanged — 8 of 12 engines and 24 of 29 structures.** What
> moves is *composition*, in one place and for one reason: **2.6 was ruled ADAPT and is now `C`**,
> because the re-run's rule 2 records a gap inside a served competency in its own column rather
> than letting it drive the label (*"2.6 is `C` with asset-based valuation absent flagged; it is
> not demoted for it"*). That carries `valuation.ts` and its five builders from *adapted* to
> *direct reuse*. Nothing else in tables A or B changes verdict.

**Verdicts** (this register is asset-level; the crosswalk's labels are competency-level, and these
are the mapping between them):

- **Direct reuse** — the asset serves a competency the crosswalk labels **T** (the content is
  taught) or **C** (the engine, its builders and its gates transfer), unchanged.
- **Adapted** — it serves only a competency labelled **R** (an asset exists but its technical
  content must change) or **M** (the structure that marks the act transfers; **the content is new**).
- **No reuse** — no FAE Advisory competency requires it.

*Transfers* = direct reuse + adapted.

⚠️ **`M` IS NOT COVERAGE, and it is the label most likely to be misread off this table.** An `M`
row means a proven rubric marks the same *act* and that the content behind it does not exist. It
is the crosswalk's own weakest label, carried here verbatim rather than quietly upgraded by the
word *"transfers"*. **Nothing in this register serves either `N` — 1.4 or 3.3** — because `N` is
defined as *"no asset, no engine, no transferable rubric"*.

---

## A. Calculation engines — 12

Module verdict is the verdict of its strongest transferring structure; where kinds within a module
differ, table B is the authority.

| # | Engine | ACCA origin | Published drills | FAE Advisory competency | Label | Verdict |
|---|---|---|---|---|---|---|
| 1 | `npv.ts` | AFM · B1a | 4 | **2.3** international investment appraisal — DCF (I) | `C` | **Direct reuse** |
| 2 | `irr.ts` | AFM · B1c | 4 | **2.3** — IRR/MIRR within DCF appraisal (I) | `C` | **Direct reuse** |
| 3 | `risk.ts` | AFM · B1a (iv–vi), B1b (ii) | 4 | **2.3** sensitivity (I) · **2.5** project risk (I) | `C` + `R` | **Direct reuse** |
| 4 | `apv.ts` | AFM · B3j, B3k | 4 | — | — | **No reuse** |
| 5 | `capm.ts` | AFM · B3d, B3e | 4 | **2.3** — supplies the project discount rate (I) | `C` | **Direct reuse** |
| 6 | `duration.ts` | AFM · B3f (+B3g rider) | 4 | — | — | **No reuse** |
| 7 | `credit.ts` | AFM · B3h, B4a | 4 | — (3.3 is `N`) | — | **No reuse** |
| 8 | `bsop.ts` | AFM · B2a, B2c (+B2b prose) | 4 | — | — | **No reuse** |
| 9 | `valuation.ts` | AFM · B4a, B4b, B4c | 5 | **2.6** M&A recommendation using valuation (I) — *asset-based valuation absent from the B4 corpus, flagged not demoted* | `C` | ✏️ **Direct reuse** |
| 10 | `international.ts` | AFM · B5a, B5b, A6a | 4 | **2.2** parity theory (U) · **2.3** (I) | `C` | **Direct reuse** |
| 11 | `fxhedge.ts` | AFM · E2b | 4 | **3.2** managing FX risk (A) | `C` | **Direct reuse** |
| 12 | `irhedge.ts` | AFM · E3a | 4 | **3.2** managing interest-rate risk (A) | `C` | **Direct reuse** |

**8 direct reuse · 0 adapted · 4 no reuse → 8 of 12 transfer (66.7%).**

✏️ **`valuation.ts` moves from *adapted* to *direct reuse*, and the ratio does not move with it.**
2.6 was ruled ADAPT on the first pass *because* asset-based valuation is missing from the B4 corpus.
The re-run labels it `C` and books that gap in its own column instead, so the engine — five schema
builders, five `build*ModelAnswer`s, AFM B4a–B4d's 7 drills, all code-owned and gated — is credited
for what it is. **The missing method is unchanged and still has to be authored**; it is now recorded
beside the row rather than inside its verdict.

⚠️ **`international.ts` no longer claims 4.1.** The first pass credited it via the A6a
dividend/transfer-pricing kind. The re-run opened the row: A6a is **one drill** (`2b0513a0`) and its
question is *"Determine the group dividend capacity of Verdant Agri Holdings Ltd…"* — **dividend
capacity, with no transfer-pricing content in it.** The words *"transfer pricing"* live in the LO
title, not the drill. 4.1 is `R` **+ IRISH-SOURCE**, and the re-run's own finding is that it got
**weaker**, not stronger: there is no transfer-pricing asset. The engine's claim to 2.2 and 2.3 is
untouched and its verdict is unchanged.
⚠️ **The crosswalk is internally inconsistent on exactly this point** — §3.3's calculator table still
reads *"`international.ts` … 4.1 (dividend/transfer-pricing kind)"* while §2.4's 4.1 row concludes
*"There is no transfer-pricing asset."* This register follows §2.4, which is the row that was
re-read. Flagged rather than silently resolved; §3.3 is the line to correct.

Why the four are out (crosswalk §3.3): **APV** is an ACCA B3 financing technique — 2.3 names DCF
and sensitivity, and no competency requires adjusted present value. **BSOP** is option pricing;
no competency covers it. **Duration** is an analytic exposure measure, where 3.2 asks for
*practical strategies*, i.e. instruments — that is `irhedge.ts`. **Credit** models credit risk and
debt valuation; 3.3 is documentary credit, trade banking and credit **insurance**, a different
subject, and 3.1 is sources of finance, not credit scoring.

The 49 published numeric drills reconcile exactly to these 12 engines (4 each, except
`valuation.ts` at 5), verified by component-id signature — B1a's 8 drills split 4 NPV / 1 eNPV /
1 sensitivity / 1 RADR / 1 risk-measures, and B4a's 3 split 2 valuation / 1 credit.

---

## B. Answer structures — 29

28 code-owned numeric schema builders (each with a matching `build*ModelAnswer`, 28 of those too)
plus **one narrative rubric structure**, `NarrativeRubric` (`narrative-marker.ts`) — model-authored
per drill, code-gated by N1–N6, and live on **14 published AFM drills and 9 AFM case requirements**,
plus **all 5 SBL drills** (`approved`, unpublished). Verified by schema shape against the live
corpus: every SBL row carries `criteria`/`scenario_facts`/`requirement_parts` and **zero
`components`**, i.e. all five are this structure and none is numeric.

**Competency → crosswalk label, for reading the Verdict column:** `T` 1.2, 1.7, 5.1 · `C` 2.2, 2.3,
2.6, 3.2 · `M` 1.1, 1.5, 1.6, 2.8 · `R` 1.3, 2.1, 2.4, 2.5, 2.7, 3.1, 4.1, 5.2 · `N` 1.4, 3.3.

| Structure | Engine | ACCA origin | FAE Advisory competency | Verdict |
|---|---|---|---|---|
| `buildNpvSchema` | `npv.ts` | B1a | 2.3 | **Direct reuse** |
| `buildIrrSchema` | `irr.ts` | B1c | 2.3 | **Direct reuse** |
| `buildCapmSchema` | `capm.ts` | B3d, B3e | 2.3 | **Direct reuse** |
| `buildSensitivitySchema` | `risk.ts` | B1a | 2.3 — sensitivity is named in the competency | **Direct reuse** |
| `buildIntlNpvSchema` | `international.ts` | B5b | 2.3 | **Direct reuse** |
| `buildIntlSensitivitySchema` | `international.ts` | B5a | 2.3 | **Direct reuse** |
| `buildIntlRemittanceSchema` | `international.ts` | B5b | 2.3 — blocked funds in a cross-border appraisal | **Direct reuse** |
| `buildForwardMmhCompareSchema` | `fxhedge.ts` | E2b | 3.2 | **Direct reuse** |
| `buildFuturesSchema` | `fxhedge.ts` | E2b | 3.2 | **Direct reuse** |
| `buildOptionsSchema` | `fxhedge.ts` | E2b | 3.2 | **Direct reuse** |
| `buildSwapSchema` | `fxhedge.ts` | E2b | 3.2 | **Direct reuse** |
| `buildIrFuturesSchema` | `irhedge.ts` | E3a | 3.2 | **Direct reuse** |
| `buildIrOptionsSchema` | `irhedge.ts` | E3a | 3.2 | **Direct reuse** |
| `buildIrCollarSchema` | `irhedge.ts` | E3a | 3.2 | **Direct reuse** |
| `buildIrSwapSchema` | `irhedge.ts` | E3a | 3.2 | **Direct reuse** |
| `buildFcffSchema` | `valuation.ts` | B4b | 2.6 `C` — *asset-based valuation absent from the B4 corpus, flagged not demoted* | ✏️ **Direct reuse** |
| `buildFcffComposedSchema` | `valuation.ts` | B4a | 2.6 `C` — same gap | ✏️ **Direct reuse** |
| `buildFcfeSchema` | `valuation.ts` | B4c | 2.6 `C` — same gap | ✏️ **Direct reuse** |
| `buildDividendSchema` | `valuation.ts` | B4c | 2.6 `C` — same gap | ✏️ **Direct reuse** |
| `buildCompareSchema` | `valuation.ts` | B4a | 2.6 `C` — two-method compare; third method missing | ✏️ **Direct reuse** |
| `buildEnpvSchema` | `risk.ts` | B1a | 2.5 `R` — risk half only; no fused financial/non-financial recommendation exists | **Adapted** |
| `buildRadrSchema` | `risk.ts` | B1a | 2.5 `R` — same | **Adapted** |
| `buildIntlDividendSchema` | `international.ts` | A6a | 4.1 `R` **+ IRISH-SOURCE** — ⚠️ it computes **group dividend capacity**, NOT transfer pricing; A6a (`2b0513a0`) is the single direct-link-only row and carries no transfer-pricing content | **Adapted** |
| `NarrativeRubric` | `narrative-marker.ts` | AFM · B1b, B3a, B3i, B4d, B5c, A3c, E1a, E2a, E2c, E3a · **SBL · A1a, A2b, A2d, A3a, A3d** | 2.1, 2.4, 2.5, 2.7, 2.8 and every competency in areas 1 and 5 **except 1.4** — it is the structure the `M` label names | **Adapted** |
| `buildRiskMeasuresSchema` | `risk.ts` | B1a | — comparative duration and VaR are not named in FAE Advisory | **No reuse** |
| `buildApvSchema` | `apv.ts` | B3j, B3k | — | **No reuse** |
| `buildBsopSchema` | `bsop.ts` | B2a, B2c | — | **No reuse** |
| `buildDurationSchema` | `duration.ts` | B3f | — | **No reuse** |
| `buildCreditSchema` | `credit.ts` | B3h, B4a | — | **No reuse** |

**20 direct reuse · 4 adapted · 5 no reuse → 24 of 29 transfer (82.8%).**

✏️ **The five `valuation.ts` builders move with their engine** (2.6 ADAPT → `C`), so *direct reuse*
goes 15 → 20 and *adapted* 9 → 4. **The transfer ratio is identical.** The four that remain adapted
are the two `risk.ts` builders serving 2.5 `R`, `buildIntlDividendSchema` serving 4.1 `R`, and
`NarrativeRubric`.

`NarrativeRubric` is **adapted, not direct reuse**, and it is the most consequential row here — the
re-run gave it a label of its own. **`M` — *answer/marking-structure reuse* — describes exactly this
structure and nothing else in the corpus**, and it is the label under which four competencies
(1.1, 1.5, 1.6, 2.8) now sit. The container transfers unchanged: criteria, marks, disqualifiers,
scenario facts, the golden BAD/GOOD pair. What does not transfer is the calibration — the F1–F12
failure catalogue is derived from ACCA examiner reports, and the marks model converts a band to an
integer allocation.

> ✏️ **CORRECTED — do not repeat the "zero times in 64 pages" line.** This appendix inherited from
> the first pass the claim that *"CAI publishes no grading vocabulary at all"*, evidenced by
> *"Reaching Competence"* and *"Not Competent"* appearing zero times in the 64-page competency
> statement. The re-run overturns it, and calls it the first pass's pivot: **that count is true
> about the phrase and misleading about the whole**, because the competency statement is not where
> CAI publishes marking information. CAI publishes sample marking, marker convergence, moderation,
> independent double-marking of every script, sample papers **with suggested solutions**, FAEC
> reports, and July 2026 guidance that all indicator answers carry the same marks.
>
> **The gap restated (crosswalk §5): CURRENT INDICATOR-LEVEL CALIBRATION.** Not *how CAI marks* —
> that is published. What is not obtainable is the live application of the standard to a script at
> indicator granularity: how far a point must be developed to score, how defensible alternatives
> are treated, how compound indicators decompose. So there **is** a calibration target to adapt
> toward; it is an **access** problem, not an information vacuum. The row's verdict is unchanged —
> what changes is why it is adapted rather than direct.

⚠️ **`M` is where this register is least like a coverage claim.** An `M` competency has a proven
rubric and no content: the structure that would mark it exists and has been gated, and the thing it
would mark has not been written. `NarrativeRubric` appearing against 1.1, 1.5, 1.6 and 2.8 means the
container is ready, not that those competencies are served.

---

## C. Reconciliation against the briefing

| Claim in the briefing | This table (five-label) | First pass, for comparison | Status |
|---|---|---|---|
| **8 of 12** calculation engines transfer | 8 direct + 0 adapted = **8 of 12** | 7 direct + 1 adapted = 8 of 12 | ✅ **Reconciles exactly** |
| **24 of 29** answer structures transfer | 20 direct + 4 adapted = **24 of 29** | 15 direct + 9 adapted = 24 of 29 | ✅ **Reconciles exactly** |

Both counts reconcile row for row. The briefing names its population — **answer structures**, not
schema builders — and the appendix uses the same one.

✏️ **The re-run did not move either total, and that is worth saying out loud rather than leaving to
be discovered.** Re-pointing this register at five labels shifted **six rows** across the
direct/adapted line — `valuation.ts` and its five builders, all on 2.6 ADAPT → `C` — and shifted
**none** across the transfers line. **The briefing's two headline numbers stand as published.** What
a reader should take from the composition change is that more of the transferring surface is
*direct* than the first pass credited, and that the reason is a rule about where a gap gets
recorded, not a new asset.

**Why the answer-structure figure moved from 23 of 28.** The earlier count was over the 28
code-owned numeric schema builders alone, and over that population it was exactly right: **20
direct + 3 adapted** on today's labels (15 + 8 as the first pass split them — same 23), with
`buildRiskMeasuresSchema`, `buildApvSchema`, `buildBsopSchema`, `buildDurationSchema` and
`buildCreditSchema` out. What it omitted was the **29th answer structure** — the narrative rubric —
which is not marginal: it carries **14 of the 63 published AFM drills, 9 of the 20 AFM case
requirements, and all 5 SBL drills**, and it is the structure that would carry the majority of a
4.5-hour open-book judgement paper. Counting it moves the ratio barely (82.1% → 82.8%) and pre-empts
the obvious question — *what marks the discursive requirements?* — rather than leaving it to be
asked.

If anyone in the room recalls the earlier figure: **23 of 28 was the schema-builder count; 24 of
29 is the answer-structure count.** Same corpus, one row wider, and the added row is adapted rather
than direct.

---

## D. Two limits that apply to both counts

*Both are carried in the briefing. They are restated here with the underlying evidence.*

**1. Both ratios are ASSET-WEIGHTED, not exam-weighted.** They count what the corpus holds, not
what the paper examines. FAE Advisory examines **at least 4 of the 5 areas, any one to circa 40%**,
and **Areas 1 and 5 — 9 of the 24 competencies — are served by zero engines and zero numeric
structures.** That half is flat, not hedged, and the re-run confirms it: the crosswalk's §3.2
distribution puts **`C` = 0 in both areas**. A sitting can weight heavily toward exactly there.
**Neither 8/12 nor 24/29 should be quoted without this beside it.**

> ✏️ **CORRECTED — the *content* half of this limit was inherited from the first pass and is now
> wrong for three of the nine.** It used to read *"no asset supplies their content."* The re-run
> found that **1.2** and **1.7** are `T` — APM **A1e** `70d1c7b5` teaches SWOT, PEST and Porter's
> generic strategies by name, with their limitations, and APM **A1d** `203369cf` teaches Mendelow's
> matrix — and that **5.1** is `T`, served by SBL **A2b** / **A2d** / **A1a**, a corpus that did not
> exist when this limit was first written.
>
> **Content is absent for four of the nine, not nine: 1.1, 1.4, 1.5, 1.6.** (5.2 is `R` —
> communication is genuinely served by APM C1's 13 drills; the other four sub-elements are not.)
>
> ⚠️ **Two things stop that being good news, and both must travel with it.** First, a `T` here is
> **one drill** — SWOT/PEST/Porter and Mendelow rest on exactly two rows between them, and the
> crosswalk's own reading of `T` is *"the content exists and has been authored once"*, never *"this
> competency is served"*. Second, **5.1's three assets are `published=false`** by decision (P-DB9):
> reviewed, gated, and unreachable by any student. The single largest correction in the re-run
> rests on rows nothing serves.

**2. APM contributes zero engines and zero structures.** Verified against the live corpus: all
**91 published APM drills and all 18 APM case requirements carry a null `answer_schema`**, and
there is **no APM calculation module** — every engine in table A is AFM. **"The APM/AFM corpus"
over-attributes on the machinery axis.** APM's contribution to FAE Advisory is real but is *content
coverage*, not engines — competencies 4.2 (22 drills) and 4.3 (37 drills) per crosswalk §2.4, and
now 1.2, 1.7 and 2.9 via A1e/A1d.

> ✏️ **SBL breaks the "every structure is AFM" half.** All **5 SBL drills carry a non-null
> `answer_schema`**, and all five are `NarrativeRubric` — `criteria`/`scenario_facts`/
> `requirement_parts`, zero `components`. So the corpus that supplies 5.1's content also supplies
> the structure that would mark it. The claim to make now is narrower and still true: **every
> engine and every *numeric* structure is AFM; APM supplies neither; SBL supplies five narrative
> structures and no engine.**

> Every asset in table A and every direct-reuse row in table B sits under the numeric moat: code
> owns each figure and each figure-vs-figure verdict. The single adapted row that would carry most
> of a FAE Advisory paper — `NarrativeRubric` — does **not**. That pipeline has no numeric
> verifier, and it has already shipped a drill through all six gates asserting the opposite of its
> own figures (crosswalk §4.2). The reuse ratio is high; the verification strength is not evenly
> distributed across it.

---

**Provenance.** Engines and builders enumerated from `lib/acca/*.ts`; family→LO mapping from the
declared `*_LOS` sets in `scripts/generate-acca-drills.ts` and each module's own header. Drill,
case-requirement and schema-shape counts queried read-only against the live `acca_drills` and
`acca_case_requirements` tables, 2026-08-29 — including the schema-shape check behind table B's
SBL claim (`criteria` present, `components` absent, 5 of 5) and the null-`answer_schema` check
behind limit 2 (91 of 91 APM drills, 18 of 18 APM requirements).

**Competency numbering and every competency-level label — `T` / `C` / `M` / `R` / `N` — inherited
from `FAE_ADVISORY_CROSSWALK.md` §2 and §3.1 as corrected by the re-run (`61c02f6`, merged
2026-08-29), pinned to the CAI 2025/2026 statement.** The first pass's REUSE / ADAPT / NEW verdicts,
which this appendix originally inherited, are superseded and are recorded in the crosswalk's §3.0
rather than deleted. **This register's own verdicts — direct reuse / adapted / no reuse — are
asset-level and are defined against the five labels at the head of this document.**

⚠️ **One inherited claim is deliberately NOT re-pointed, because it is a re-adjudication and not a
re-labelling:** whether `buildIntlDividendSchema` should still be credited to **4.1** at all, given
the re-run's finding that A6a carries no transfer-pricing content. It is left as `R` / *adapted*
here, matching crosswalk §2.4, with the discrepancy against §3.3 flagged in table A. **That is a
decision for whoever owns the crosswalk, not one this appendix should take on its own.**
