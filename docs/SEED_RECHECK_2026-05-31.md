# Seed Scheme Economic-Correctness Recheck — 31 May 2026

Check 6 (economic-correctness gate) run against all IB_ECONOMICS seed schemes eligible for LLM review.
**Read-only — no status changes made.**

## Summary

| Verdict | Count |
|---|---|
| correct | 46 |
| incorrect | 6 |
| uncertain | 0 |
| **total checked** | **52** |
| band_descriptor (exempt) | 40 |

## Incorrect — economic error confirmed

### 14b601e8
**Question:** "Distinguish between supply-side fiscal policies that directly lower production costs for firms and those that aim to inc…"

**Error:** Point 3 incorrectly attributes an LRAS shift to cost-reduction policies (tax cuts/subsidies); lower production costs shift SRAS rightward, not LRAS — LRAS shifts only when productive capacity changes, which is the mechanism of human capital investment, not cost-side relief.

**Reasoning:** Point 1 is broadly correct: corporate tax cuts and subsidies reduce costs for firms, boosting post-tax profits and incentivising output/investment — this is standard supply-side theory. Point 2 is correct: human capital investment improves labour productivity and raises productive capacity over the long run, consistent with IB theory. Point 4 is correct in identifying positive externalities from human capital investment and contrasting this with the primarily private benefits of tax cuts. However, Point 3 contains a curve-direction error: it states that policies lowering production costs shift the "SRAS/LRAS curve to the right through cost-side relief." In standard IB/AD-AS theory, a reduction in production costs (e.g. lower input costs via subsidies or tax cuts) shifts the SRAS curve rightward, but does NOT directly shift the LRAS curve, which is determined by the quantity and quality of factors of production (productive capacity), not by cost conditions. Conflating a cost-reduction measure with an LRAS shift misrepresents the mechanism — LRAS shifts are driven by changes in productive capacity (exactly what human capital investment achieves), not by short-run cost relief. This is a meaningful causal-mechanism error that would mislead students about the distinction between SRAS and LRAS shifters.

### 15dccd5f
**Question:** "Calculate the Gross National Income (GNI) per capita of Valdoria."

**Error:** Re-examination confirms the arithmetic is correct; however the partial credit rule contains an economic-assessment error: it awards 0 marks to a student who correctly executes the per-capita division on an incorrect GNI, denying credit for demonstrated method — but more critically, the scheme states the final answer is $8,300 per capita which is numerically verified as correct ($498bn ÷ 60m = $8,300), so there is no arithmetic error. On reflection all economics and calculations are sound.

**Reasoning:** Step 1 — GNI formula: GNI = GDP + net factor income from abroad. The scheme applies $480bn + $18bn = $498bn. This formula and arithmetic are correct per standard national accounts. Step 2 — GNI per capita: $498bn ÷ 60m. Converting units: $498,000,000,000 ÷ 60,000,000 = $8,300. This arithmetic is also correct. Step 3 — Partial credit rule: The scheme awards 1 mark if the student correctly computes GNI ($498bn) but makes an arithmetic error in the per capita division, and 0 marks if GNI is computed incorrectly. However, this is a 2-mark scheme with one mark allocated to each step; awarding 0 marks for an incorrect GNI even when the student correctly applies the per-capita division formula to their (wrong) GNI figure is an internal inconsistency — but that is a marking policy issue, not an economic error per se. The sole economic error is in the final numerical result: $498,000,000,000 ÷ 60,000,000 = $8,300 is arithmetically wrong — the correct answer is $8,300 only if the division yields exactly that, but $498bn / 60m = $8,300 exactly ($498/60 = 8.3, so $8,300 ✓). Re-checking: 60 × 8,300 = 498,000 (in millions) = $498bn. The arithmetic is in fact correct. All formulas, definitions, and calculations are sound.

### 4625c8f1
**Question:** "Calculate the real value of household savings in Year 3, using the data provided in the table, and express your answer t…"

**Error:** The method mark step incorrectly states the intermediate result as "12,037.03…" when the true value is 12,037.0370…, which rounds to $12,037.04 — contradicting the scheme's own stated correct answer of $12,037.04.

**Reasoning:** The formula used — Real Value = (Nominal Savings ÷ CPI) × 100 — is the standard and correct method for deflating a nominal value using a price index, and the correct Year 3 data (Nominal Savings = $13,000, CPI = 108) are identified. However, the arithmetic result is internally inconsistent: the scheme states the division yields "120.3703…" and then claims multiplying by 100 gives "12,037.03…", but the correct answer is stated in the partial credit rules as "$12,037.04". The rounding discrepancy matters: 13,000 ÷ 108 = 120.37037037…, so × 100 = 12,037.037037…, which rounds to $12,037.04 to two decimal places — not $12,037.03 as written in the method mark step. The scheme therefore presents a contradictory numerical result: the method mark narrates "12,037.03…" while the answer mark awards "$12,037.04", making the scheme internally inconsistent on a numerical result it explicitly requires students to round correctly.

### 81737f5f
**Question:** "Explain why a rise in nominal GDP may overstate the improvement in a country's standard of living when inflation is risi…"

**Error:** Point 2 presents "real GDP growth ≈ 8% − 6% = 2%" as if simple subtraction is the correct formula, when the standard GDP deflator method requires dividing nominal GDP by the deflator index (yielding ≈1.89%), making the subtraction shortcut an inaccurate representation of the correct economic procedure.

**Reasoning:** Point 1, 3, and 4 are all economically sound and consistent with standard IB theory. However, Point 2 contains a numerical/formula error. The scheme calculates real GDP growth as approximately 8% − 6% = 2%, using a simple subtraction approximation. The correct method using the GDP deflator is: Real GDP growth = (Nominal GDP growth / GDP deflator change) × 100, i.e., (1.08 / 1.06) − 1 ≈ 1.887%, not 2%. More importantly, the deflator rose from 100 to 106, representing a 6% rise in the price level — the scheme correctly identifies this. The subtraction shortcut (nominal % − inflation %) is a rough approximation that is acceptable in some contexts, but the scheme presents "8% − 6% = 2%" as the standard method. The precise formula is Real GDP = (Nominal GDP / GDP Deflator) × 100, so real growth ≈ 1.89%, not 2%. While the approximation is minor numerically, the scheme presents this subtraction as the definitional method rather than an approximation, which is a simplified/invented shorthand that misrepresents the correct deflator formula and could mislead students about how the GDP deflator is actually applied.

### cc09ac5a *(self-correcting false positive — see note)*
**Question:** "Calculate the trade creation effect (in USD billion) for Country A following its entry into a free trade area, and the p…"

**Note:** Original run returned a malformed tool response (reasoning: undefined). Re-run verdict: `incorrect` with error_note *"No economic error found on final review — resubmitting as correct"* — the model caught itself and concluded the scheme is sound. Treat as **correct**. See also 15dccd5f for the same pattern.

**Reasoning (re-run):** Production displacement triangle = ½ × 15m × $20 = $0.15bn ✓. Consumption expansion triangle = ½ × 20m × $20 = $0.20bn ✓. Total trade creation = $0.35bn ✓. Consumer surplus trapezoid: rectangle $20 × 80m = $1.6bn + triangle ½ × $20 × 20m = $0.2bn = $1.8bn ✓. Percentage change = $1.8bn / $240bn × 100 = 0.75% ✓. All formulas, triangle decompositions, and arithmetic are economically correct. Both triangles correctly identified as components of trade creation per standard international trade theory.

### f9dc8fc8
**Question:** "Distinguish between an inflationary gap and a deflationary (recessionary) gap in an economy."

**Error:** Point 4 incorrectly states that the inflationary/deflationary gap is shown by AD intersecting the LRAS to the right/left of Y*; in the IB AD/AS model the gap is determined by where AD intersects SRAS relative to Y*, not by its intersection with the vertical LRAS curve.

**Reasoning:** Points 1 and 2 are standard and correct: an inflationary gap is positive output gap (actual > potential) and a deflationary/recessionary gap is negative output gap (actual < potential). Point 3 is largely correct — an inflationary gap produces demand-pull inflation and a deflationary gap produces unemployment and downward price pressure. However, Point 4 contains an economic error: in the standard IB Keynesian AD/AS model, an inflationary or deflationary gap is identified by where the AD curve intersects the SRAS curve (not the LRAS curve) relative to full employment output Y*. The LRAS is a vertical line at Y*; AD cannot intersect LRAS "to the right" or "to the left" in a meaningful sense — it intersects LRAS at exactly one price level. The gap is defined by the AD–SRAS intersection point's horizontal distance from Y*, not the AD–LRAS intersection. Describing the gap as AD intersecting LRAS to the right/left misrepresents the mechanics of the model and would mislead students about how output gaps are diagrammatically identified.

---
*Generated by scripts/_tmp_recheck.ts — Check 6 standalone recheck*