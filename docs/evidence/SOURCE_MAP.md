# ACCA AFM/FM convention evidence map

**Prepared:** 18/07/2026  
**Authority:** ACCA official answers and examiner reports only.  

## Bottom line

The documentation gap is closed for sensitivity, project duration and RADR. VaR is not duplicated because the existing ACCA technical-article citation already covers it.

### Important correction on discount-rate sensitivity

ACCA distinguishes the **absolute headroom** from the **percentage sensitivity**:

- Absolute headroom (percentage points): `IRR - original discount rate`.
- ACCA percentage sensitivity: `((IRR - original discount rate) / original discount rate) × 100`.

The September/December 2023 examiner report explicitly warns that treating the simple difference as the sensitivity percentage is incorrect.

## Source map

### S1 - P4 Advanced Financial Management September/December 2016 - Official Answers

- **Official PDF:** `01_ACCA_P4_SD2016_Official_Answers.pdf`
- **Page:** Printed page 18; PDF page 5 of 11
- **Use:** Project duration and a worked selling-price sensitivity margin.
- **Convention:** `Duration = Σ(t × PV_t) / ΣPV_t; selling-price sensitivity = NPV / PV of affected post-tax revenue cash flows.`
- **Finding:** Duration is calculated as the PV-weighted average time. Selling-price headroom is NPV divided by the discounted, post-tax revenue cash flows affected.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/p4/exampapers/sd16_hybrid_p4_a.pdf

### S2 - AFM September/December 2019 - Official Sample Answers

- **Official PDF:** `02_ACCA_AFM_SD2019_Official_Answers.pdf`
- **Page:** Printed page 17; PDF page 4 of 10
- **Use:** Second, very explicit AFM project-duration calculation.
- **Convention:** `Project duration = total (PV × time) / total PV.`
- **Finding:** The answer totals PV × time and divides by total positive PVs, producing 3.04 years.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/p4/exampapers/sd19_sample_afm_a.pdf

### S3 - F9 June 2016 Examiner’s Report

- **Official PDF:** `03_ACCA_F9_June2016_Examiner_Report.pdf`
- **Page:** Printed page 2; PDF page 2 of 8
- **Use:** Black-and-white statement of the general sensitivity formula.
- **Convention:** `Sensitivity % = 100 × NPV / PV of project variable.`
- **Finding:** The denominator must be the present value of the project variable affected, after relevant tax effects.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f9/examinersreports/f9.examreport.j16.pdf

### S4 - FM September/December 2023 Examiner’s Report

- **Official PDF:** `04_ACCA_FM_SD2023_Examiner_Report.pdf`
- **Page:** Printed pages 13-14; PDF pages 13-14 of 20
- **Use:** Current ACCA convention for variable sensitivity and discount-rate sensitivity.
- **Convention:** `Variable sensitivity % = NPV / PV of affected post-tax variable × 100. Discount-rate sensitivity % = (IRR − original discount rate) / original discount rate × 100.`
- **Finding:** For the discount rate, IRR minus the original rate is the absolute headroom in percentage points. ACCA says percentage sensitivity divides that change by the original rate.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f9/examinersreports/D23%20FM%20examiner%27s%20report.pdf

### S5 - AFM March/June 2019 - Official Sample Answers

- **Official PDF:** `05_ACCA_AFM_MJ2019_Official_Answers.pdf`
- **Page:** Printed pages 15-16; PDF pages 2-3 of 10
- **Use:** Official RADR presentation and application.
- **Convention:** `Use the project-specific RADR as the discount rate applied to the project’s relevant cash flows.`
- **Finding:** The answer identifies an 11% project-specific risk-adjusted cost of capital based on a proxy company asset beta, then discounts the project cash flows at 11%.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/p4/exampapers/MJ19_Sample_AFM_ANS%202.pdf

### S6 - FM March/June 2018 - Official Sample Answers

- **Official PDF:** `06_ACCA_FM_MJ2018_Official_Answers.pdf`
- **Page:** Printed pages 11-13; PDF pages 3-4 of 10
- **Use:** Joint-probability ENPV table and ACCA explanation of RADR derivation.
- **Convention:** `ENPV = Σ(probability × outcome NPV); RADR may be derived through CAPM using a proxy beta ungeared and regeared.`
- **Finding:** The official answer constructs joint probabilities and ENPV, and explains that a proxy beta can be ungeared and regeared to obtain a project-specific discount rate.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f9/exampapers/fm-2018-marjun-hybrid-a.pdf

### S7 - F9 June 2015 - Official Answers

- **Official PDF:** `07_ACCA_F9_June2015_Official_Answers.pdf`
- **Page:** Printed page 19; PDF page 6 of 8
- **Use:** Expected-NPV appraisal and interpretation.
- **Convention:** `Expected input = Σ(probability × outcome); ENPV is the NPV based on probability-weighted expected inputs/outcomes.`
- **Finding:** The answer calculates an expected input using probabilities, carries it through the project cash-flow table, and labels the result ENPV.
- **ACCA URL:** https://www.accaglobal.com/content/dam/acca/global/PDF-students/acca/f9/exampapers/F9_2015_Jun_A.pdf

## How to fetch the originals

Run either:

```bash
python fetch_acca_sources.py
```

or on Windows PowerShell:

```powershell
.\fetch_acca_sources.ps1
```

The original PDFs will be placed in `official_acca_pdfs/` with stable, repo-friendly filenames.