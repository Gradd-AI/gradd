# AFM calculator #3 (risk & uncertainty) — VERIFIED convention evidence

**Verified 18/07/2026 by reading each cited page of the official ACCA PDF (via `pdftotext`), not the model-generated map.** The PDFs themselves are **git-ignored** (`official_acca_pdfs/`) — the project must never redistribute ACCA papers in-repo (copyright / brand). Re-fetch them any time with `docs/evidence/fetch_acca_sources.ps1` (all `accaglobal.com` URLs, `%PDF`-magic-checked). Short quotes below are fair-use citations for the convention only.

**Every claim S1–S7 was VERIFIED on the stated page — zero NOT FOUND, zero memory substitution.** These are the Rule-22-style citations the calculator #3 engine must carry (each convention's code comment cites the S-id + page + URL below).

| ID | Source · PDF page | Convention | Verbatim quote (as seen on the page) |
|----|----|----|----|
| **S1** | P4 AFM SD2016 Official Answers · PDF p5 | Project duration = PV-weighted average time; selling-price sensitivity = NPV ÷ PV of affected flows | "Duration = (1 x 0·165) + (2 x 0·227) + (3 x 0·275) + (4 x 0·333) = 2·78 years" · "Reduction in selling price = 7,801/43,441 = 18·0%" (denominator = discounted revenue cash flows) |
| **S2** | AFM SD2019 Official Answers · PDF p4 | Project duration = Σ(PV×t) ÷ ΣPV | "Project Alpha duration = 173,254,000/57,005,000 = 3·04 years" (Appendix 2c: "Total PVs x time = 173,254,000 … Total PVs = 57,005,000") |
| **S3** | F9 June 2016 Examiner's Report · PDF p2 | Variable sensitivity % | "Sensitivity = 100 x NPV/ PV of project variable = 100 x 200,000/ 1,600,000 = 12·5%" |
| **S4** | FM SD2023 Examiner's Report · PDF pp13–14 | Variable sensitivity %; discount-rate sensitivity %; the bare-difference error | "Sensitivity % = NPV / Present value of post-tax contribution" · discount rate: "= (7.4 / 11) x 100%" (IRR 18·4%, rate 11%) · warning: "The difference between the calculated IRR figure and the company's discount rate was sometimes shown incorrectly as the discount rate sensitivity itself." |
| **S5** | AFM MJ2019 Official Answers · PDF pp2–3 | Project-specific RADR from a proxy asset beta, applied to the project cash flows | "Since the Uwa Project is in a different industry to Talam Co's current activities, the project-specific, risk-adjusted cost of capital of 11% based on Honua Co's asset beta is used." |
| **S6** | FM MJ2018 Official Answers · PDF pp3–4 | ENPV = Σ(joint-prob × NPV); RADR derived via CAPM ungear/regear of a proxy beta | ENPV table: "Sum of PV 4,365 … Investment (3,500) … ENPV = 865"; "Negative NPV probability 24% — Sum of joint probabilities with negative NPVs" · RADR: "A proxy company equity beta can be ungeared and the resulting asset [beta] can be regeared to reflect the financial risk of the investing company, giving a project-specific equity beta which can be used to find a project-specific cost of equity or a project-specific discount rate." |
| **S7** | F9 June 2015 Official Answers · PDF p6 | ENPV meaning + the repeated-game caveat (L3 scepticism) | "The investment project has a positive ENPV of $3,809,000. This is a mean or average NPV which will result from the project being repeated many times. However, as the project is not being repeated, the NPVs associated with each future economic state must be calculated as it is one of these NPVs which is expected to occur." |

## Standing conventions (baked from the verified evidence)

1. **Variable sensitivity %** = `100 × NPV ÷ PV of the affected post-tax cash-flow stream` (the variable's own PV base). — **S3, S4**.
2. **Discount-rate sensitivity %** = `(IRR − r) ÷ r × 100`, where r = the original discount rate. The bare `IRR − r` is **headroom** (percentage points), NEVER labelled sensitivity — ACCA marks that error down. — **S4**.
3. **Project duration** = `Σ(t × PVₜ) ÷ ΣPVₜ` (PV-weighted average time; equivalently `Σ(t × PVₜ/ΣPV)`). — **S1, S2**.
4. **RADR** = a project-specific rate from a **proxy asset beta, ungeared then regeared** to the investing company's financial risk (CAPM), applied as the discount rate to the project's relevant cash flows. Composes `capm.ts` one-way. — **S5, S6**.
5. **ENPV** = `Σ(pᵢ × NPVᵢ)` (probability-weighted; joint probabilities when independent variables combine). It is a repeated-game mean — for a one-shot project the per-state NPVs and the probability of a negative NPV carry the decision. — **S6, S7**, and the technical article "The risks of uncertainty" (VaR one-tail 1.65/2.33, σ×√T).
