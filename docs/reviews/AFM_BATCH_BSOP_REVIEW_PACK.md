# AFM BSOP / real-options batch — blind adversarial review pack

**Calculator #8: Black-Scholes / real options (`lib/acca/bsop.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. CURRENT STATE — regenerated in full after every fix round.**

Doctrine: code owns EVERY figure (d1, d2, N(d1), N(d2), the call/put value, the expanded value, the decision); the model authored PROSE only — the five-driver interpretation + the archetype classification + the BSOP limitations — never a d-value, a probability, an option value, or an inequality.

**The four kinds** (1× B2a + 3× B2c; B2b archetype classification woven as prose, single-tag `lo_code`, journalled):
- **financial_product_valuation** (B2a) — BSOP on a TRADED underlying (a listed-equity warrant tranche / ESO grant valued in aggregate). FIRST-OF-FAMILY: isolates the mechanics before the real-option mapping.
- **option_to_delay** (B2c) — a **call**: Pₐ = PV of project cash flows, Pₑ = investment cost, t = deferral window.
- **option_to_expand** (B2c) — a follow-on **call**; expanded value = base NPV + expansion call.
- **option_to_withdraw** (B2c) — a **put via put-call parity** (p = c − Pₐ + Pₑ·e^(−rt), cross-checked directly); project value = base NPV + abandonment put.

**Marking model (SPREADSHEET-INPUTS, EXTENDED — "Design B", Grant-ruled 2026-07-15):** the exam supplies the BSOP calculator, so the marked skill is the FIVE-DRIVER identification + (real options) the Pₐ/Pₑ MAPPING + interpretation. We still GRADE the chain, but **tolerances are set to the student's legitimate exam apparatus — the normal TABLES — never to code precision**: N(d1)/N(d2) abs ±0.01 (a 2-dp table read), d1/d2 abs ±0.05; the option value CARRIES from the student's own N(d) under OFR (rel ±0.5%). N(d) displays at 4 dp (0.7357). The five drivers + interpretation carry the weight; d1/d2/N(d) are light workings.

**Gates — TEN** (self-consistency + tolerance + OFR-wiring; figure integrity at 1–4 dp [N(d) 4-dp]; distinct-factor seeded-OFR carry; P4 jurisdiction + frozen-facts; P5 completeness; P6 loss-relief [no-op]; P8 rating-symbol [no-op]; GATE 9 spread-monotonicity [no-op]; **GATE 10 option no-arbitrage bounds + put-call parity**).

## ⛔ CLOSED RULINGS — do NOT re-raise
- **Spreadsheet-inputs EXTENDED to grade the chain (Design B)** — grading d1/d2/N(d) is deliberate: a relative tolerance on the VALUE cannot absorb table-lookup N(d) rounding (a ±0.01 N(d) swings a small option value ~10–15%), so the table-lookup slack lives in the N(d) components (±0.01) and the value carries from the student's own N(d). This is the fair marking, not a departure to flag.
- **redeploy = texture, not a calculated kind** — B2c's archetypes are delay/expand/withdraw as calculated drills; **redeploy sits within the withdraw/put family as the switch-texture** (journalled coverage, no separate drill). Not a gap.
- **B2b woven as prose** — the archetype classification is delivered in the real-option kinds' prose; single-tag `lo_code`, coverage journalled (no migration).
- **European-only + volatility-estimation** — BSOP prices a European option (real options are often American → an approximation/bound); the volatility of a non-traded real-asset underlying is a proxy/subjective and the no-arbitrage replication breaks for a non-traded underlying → the value is INDICATIVE. These are the ruled limitations the prose must raise (volatility-estimation the loudest), not omissions.
- **Near-the-money calibration** — the drivers are set so d1/d2 are moderate (option roughly at-the-money); deep in/out-of-the-money cases are deliberately avoided (less instructive; N(d) insensitive).

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on **Drill 1 (financial_product_valuation, first-of-family)** — the pure BSOP mechanics; spot-check the real-option siblings WITH full recomputation. Hunt for: a mis-mapped Pₐ/Pₑ, a d1/d2 sign/formula slip, an N(d) mis-read, a put-call-parity error, an archetype misclassified, the decision inverted, volatility-estimation under-stated.

---

## Drill 1 — financial_product_valuation (B2a) — FIRST-OF-FAMILY  ·  `b66fbf05-7727-4e4d-84f2-ebb630acd4d6`
- LO B2a · mode quantitative · command_verb "apply and advise" · L3 · marks_guide 15

### question

Apply the Black-Scholes Option Pricing (BSOP) model to value the aggregate executive share option grant described below, identifying and discussing each of the five principal drivers of option value, and advise the Compensation Committee of Helveta Medtech AG on what the valuation implies for the grant's cost and structure.

### context_text


SCENARIO — HELVETA MEDTECH AG, ZÜRICH | EXECUTIVE SHARE OPTION GRANT VALUATION
Snapshot date: 1 January 2026

Background
Helveta Medtech AG is a Swiss medical-device manufacturer listed on the SIX Swiss Exchange (SIX). The company specialises in minimally invasive surgical robotics and reported revenue of CHF 1.2 billion for the year ended 31 December 2025. In line with its long-term incentive policy, the Compensation Committee intends to grant a new tranche of executive share options to twelve members of the senior leadership team on 1 January 2026.

The grant
Each option entitles the holder to purchase one registered share of Helveta Medtech AG at a fixed exercise price of CHF 148.00, exercisable only at the end of a three-year vesting cliff (31 December 2028). The grant covers 1,350,000 options in aggregate. Under IFRS 2, the Committee must recognise the fair value of the grant at the date of award; it has engaged you as its independent financial adviser to provide that fair-value estimate using the BSOP model.

Market and company data (snapshot: 1 January 2026)
- Helveta Medtech AG share price: CHF 155.00 per share
- Number of options granted: 1,350,000
- Exercise price per share: CHF 148.00
- Vesting / expiry: 3 years (cliff vest, European-style exercise assumed)
- Historical annualised share-price volatility (36-month rolling, sourced from SIX data): 31%
- Swiss Confederation 3-year government bond yield (risk-free proxy): 1.20%

Aggregate BSOP inputs (five drivers — as supplied to the model)

Driver 1 — Value of the underlying (Pₐ):
1,350,000 shares × CHF 155.00 = CHF 209.25 million
→ Pₐ = CHF 209.25 million

Driver 2 — Exercise price (Pₑ):
1,350,000 options × CHF 148.00 strike = CHF 199.80 million
→ Pₑ = CHF 199.80 million

Driver 3 — Volatility (s):
31% per annum (36-month rolling historical volatility from SIX published data)
→ s = 31%

Driver 4 — Risk-free rate (r):
1.20% per annum (Swiss Confederation 3-year government bond yield)
→ r = 1.20%

Driver 5 — Time to expiry (t):
3 years (cliff-vest date, 31 December 2028)
→ t = 3 years

The BSOP model is to be applied in European-call form. The computed fair value represents the aggregate IFRS 2 grant-date charge to be spread over the three-year vesting period.


### model_answer

**Option valuation — Black-Scholes (BSOP)**

**Assumptions:** the option is valued with the Black-Scholes model on the five drivers below. BSOP prices a EUROPEAN option; N(d1) and N(d2) are read from the normal-distribution tables. The underlying is traded, so the model applies directly.

**Step 1 — The five drivers (identification)**

| Driver | Maps to | Value |
|------|------|------|
| Underlying, Pₐ | the value of the underlying asset | CHF 209.3m |
| Exercise, Pₑ | the exercise price | CHF 199.8m |
| Volatility, s | annual volatility | 31.00% |
| Risk-free, r | risk-free rate | 1.20% |
| Time, t | time to expiry | 3.0 years |

**Step 2 — d1, d2 and the cumulative normals**

d1 = [ln(Pₐ/Pₑ) + (r + s²/2)·t] / (s·√t) = **0.4216**; d2 = d1 − s·√t = **-0.1154**.

From the normal tables: **N(d1) = 0.6633**, **N(d2) = 0.4541** (read at the 2-dp rounding of d1/d2).

**Step 3 — Option value**

c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2) = CHF 209.3m×0.6633 − CHF 192.7m×0.4541 = **CHF 51.3m**.

**Step 4 — Interpretation, assumptions and limitations**


The five drivers collectively paint a picture of an option that is modestly in-the-money at the grant date, with a meaningful time premium arising from the three-year vesting cliff — the combination of moderate volatility and a multi-year horizon produces a non-trivial optionality value that the Compensation Committee must recognise in full as an IFRS 2 charge spread over the vesting period. The exercise price is set only slightly below the snapshot share price, which keeps the grant broadly aligned with shareholders' interests by requiring genuine appreciation before executives profit, yet still awards meaningful value on day one.

The risk-free rate, anchored to the Swiss Confederation 3-year bond yield, is low by historical standards, which modestly inflates the present value of the deferred exercise price and thus tends to support call-option value; the Committee should confirm whether Swiss rates shift materially before the grant is formally executed, as even a small upward movement would alter the fair-value figure.

The loudest limitation is volatility estimation: the model relies on a single 36-month rolling historical figure sourced from SIX data, yet Helveta Medtech's share price may behave differently over the coming three years as the surgical-robotics market matures — regulatory outcomes, competitor product launches, or a shift in the company's revenue mix could cause realised volatility to diverge substantially from the historical estimate, and any such divergence feeds directly and non-linearly into the option value.

A secondary limitation is the European-exercise assumption: IFRS 2 permits this simplification, but if the Compensation Committee later amends plan rules to allow early exercise (converting the option into an American-style instrument), the BSOP model would understate fair value, and a lattice or Monte Carlo approach should be substituted.

On balance, the Compensation Committee should proceed with the grant at these parameters, recognising the computed aggregate fair value as the IFRS 2 charge; however, it is advised to commission an implied-volatility cross-check using traded SIX-listed options on Helveta Medtech shares, if available, to validate the 31% input before the award is formally approved.


*Reconciliation: d1 0.4216 / d2 -0.1154 → N 0.6633/0.4541 → value CHF 51.3m. ✓*

### hint

You've produced a BSOP value — now check whether you've told the Compensation Committee what that number means for the IFRS 2 charge, challenged the volatility input, and recommended whether to proceed with, or adjust, the grant structure.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates work carefully through d1, d2 and the cumulative normals, arrive at a fair-value figure, and then stop — as if the number were the deliverable. It is not; the number is the floor. The Compensation Committee cannot act on a CHF figure in isolation — it needs to know what the figure implies for the IFRS 2 charge profile, whether the volatility assumption is defensible, and whether the European-exercise constraint remains appropriate given the plan rules. The second failure, often layered on top, is UNDEVELOPED-ASSUMPTION: candidates list the five BSOP drivers as headings without discussing what each one is doing in this specific scenario — for example, stating that volatility is 31% without explaining why a single historical rolling figure may diverge from realised volatility over a surgical-robotics company's forward three-year horizon, and what that divergence would do to the model's output. The correct mental model is that BSOP at Level 3 is a structured argument: the calculation establishes the fair value, each driver discussion tests whether the inputs are credible for this entity at this valuation date, the limitations section identifies where the model's assumptions may fail, and the recommendation closes the loop by telling the board what to do with all of that — proceed, adjust, or seek further evidence before the award is approved. If your computed value is wrong, carry it forward consistently into the interpretation and recommendation; where your downstream reasoning holds, those marks still score, and the error is charged once at its source.

### answer_schema

```json
{
  "params": {
    "Pa": 209.25,
    "Pe": 199.8,
    "time": 3,
    "base_npv": 0,
    "risk_free": 1.2,
    "volatility": 31,
    "pv_exercise": 192.735130637928
  },
  "components": [
    {
      "unit": "CHFm",
      "label": "Underlying asset value (Pₐ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pa",
      "working_steps": [
        "identify the value of the underlying"
      ],
      "expected_value": 209.25
    },
    {
      "unit": "CHFm",
      "label": "Exercise price (Pₑ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pe",
      "working_steps": [
        "identify the exercise price"
      ],
      "expected_value": 199.8
    },
    {
      "unit": "%",
      "label": "Volatility (s)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "volatility",
      "working_steps": [
        "identify the volatility of the underlying"
      ],
      "expected_value": 31
    },
    {
      "unit": "%",
      "label": "Risk-free rate (r)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "risk_free",
      "working_steps": [
        "identify the risk-free rate"
      ],
      "expected_value": 1.2
    },
    {
      "unit": "years",
      "label": "Time to expiry (t, years)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "time",
      "working_steps": [
        "identify the time to expiry"
      ],
      "expected_value": 3
    },
    {
      "unit": "",
      "label": "d1",
      "weight": 1,
      "recompute": "bsop_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "Pa",
        "Pe",
        "volatility",
        "risk_free",
        "time"
      ],
      "component_id": "d1",
      "working_steps": [
        "d1 = [ln(Pₐ/Pₑ) + (r + s²/2)t] / (s√t)"
      ],
      "expected_value": 0.4215827368714329
    },
    {
      "unit": "",
      "label": "d2",
      "weight": 1,
      "recompute": "bsop_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "d1",
        "volatility",
        "time"
      ],
      "component_id": "d2",
      "working_steps": [
        "d2 = d1 − s√t"
      ],
      "expected_value": -0.115353013474919
    },
    {
      "unit": "",
      "label": "N(d1)",
      "weight": 1,
      "recompute": "norm_cdf_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d1"
      ],
      "component_id": "Nd1",
      "working_steps": [
        "N(d1) from the normal tables"
      ],
      "expected_value": 0.6633351558588823
    },
    {
      "unit": "",
      "label": "N(d2)",
      "weight": 1,
      "recompute": "norm_cdf_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d2"
      ],
      "component_id": "Nd2",
      "working_steps": [
        "N(d2) from the normal tables"
      ],
      "expected_value": 0.4540826136030307
    },
    {
      "unit": "CHFm",
      "label": "Call value (c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2))",
      "weight": 3,
      "recompute": "bsop_call",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "Pa",
        "Pe",
        "risk_free",
        "time",
        "Nd1",
        "Nd2"
      ],
      "component_id": "call",
      "working_steps": [
        "c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2)"
      ],
      "expected_value": 51.2852095102792
    }
  ]
}
```

---

## Drill 2 — option_to_delay (B2c, call)  ·  `1a9ac5fc-da9f-4930-aff9-f758f6bf6109`
- LO B2c · mode quantitative · command_verb "assess, value and advise" · L3 · marks_guide 15

### question

Assess the value of the option to delay Nordvik's Barents Sea licence development using the Black-Scholes option pricing (BSOP) model, identifying the real-option archetype and advising the board whether to exercise the option now or defer the investment decision.

### context_text

NORDVIK ENERGY AS — BARENTS SEA LICENCE BLOCK 7219 | BOARD ADVISORY MEMORANDUM | As at 30 June 2026

BACKGROUND

Nordvik Energy AS ("Nordvik") is a mid-cap Oslo-listed independent oil and gas company holding a Norwegian Petroleum Directorate (NPD) exploration and production licence over Block 7219 in the Barents Sea. A pre-FEED (Front-End Engineering and Design) study completed in March 2026 confirmed a commercially sized sub-sea tieback opportunity; however, Brent crude prices as at the valuation date reflect a period of elevated uncertainty and the board has resolved not to commit to full development expenditure at this time.

The NPD licence framework grants Nordvik a four-year deferral window — expiring 30 June 2030 — within which it may elect to sanction the development and commit the required capital. If the company has not sanctioned the project by that date, the licence reverts to the Norwegian state and Nordvik loses all rights to the block. The investment, once sanctioned, is treated as irreversible: decommissioning obligations and sunk costs mean that exit is not economically viable post-FID (Final Investment Decision).

A reservoir engineering firm retained by the board has estimated the present value of the project's future production cash flows — discounted at Nordvik's risk-adjusted exploration WACC — on the basis of a risked P50 reserve estimate and a flat real oil-price deck consistent with the forward curve as at the valuation date. The board has also obtained an independent estimate of the annualised volatility of comparable listed Barents Sea development projects, derived from the share-price volatility of peer companies adjusted for leverage, as a proxy for the volatility of the underlying asset value. The Norwegian 4-year government bond yield as at 30 June 2026 serves as the risk-free rate.

FIVE DRIVERS — BSOP INPUTS (as at 30 June 2026)

  Pₐ  — Underlying asset value:     NOK 2,840 million
           [PV of the licence block's risked production cash flows]

  Pₑ  — Exercise price:              NOK 3,100 million
           [NPD-sanctioned development capital expenditure (capex) required at FID]

  s   — Volatility (annualised):     34%

  r   — Risk-free rate:              3.8%

  t   — Time to expiry:              4 years
           [Deferral window remaining under the NPD licence]

BASE-CASE NPV (without the option to delay):   NOK −260 million
  [Pₐ − Pₑ, undiscounted, reflecting the static net present value if the project were sanctioned today at current valuations without flexibility]

### model_answer

**Option valuation — Black-Scholes (BSOP)**

**Assumptions:** the option is valued with the Black-Scholes model on the five drivers below. BSOP prices a EUROPEAN option; N(d1) and N(d2) are read from the normal-distribution tables. This is an **option to delay** (a call option on the deferred investment); the marked judgement is mapping the scenario to the five drivers.

**Step 1 — The five drivers (identification + mapping)**

| Driver | Maps to | Value |
|------|------|------|
| Underlying, Pₐ | PV of the licence block's risked production cash flows | NOK 2840.0m |
| Exercise, Pₑ | the development capex required at FID | NOK 3100.0m |
| Volatility, s | annual volatility | 34.00% |
| Risk-free, r | risk-free rate | 3.80% |
| Time, t | time to expiry | 4.0 years |

**Step 2 — d1, d2 and the cumulative normals**

d1 = [ln(Pₐ/Pₑ) + (r + s²/2)·t] / (s·√t) = **0.4347**; d2 = d1 − s·√t = **-0.2453**.

From the normal tables: **N(d1) = 0.6681**, **N(d2) = 0.4031** (read at the 2-dp rounding of d1/d2).

**Step 3 — Option value**

c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2) = NOK 2840.0m×0.6681 − NOK 2662.9m×0.4031 = **NOK 824.0m**.

**Step 4 — The option and the decision (code-owned)**

The option to delay is worth **NOK 824.0m**, which exceeds the immediate NPV of NOK -260.0m — the flexibility to wait for uncertainty to resolve adds more value than committing now, so **defer** and preserve the option.

**Step 5 — Interpretation, assumptions and limitations**

This situation is classified as a real option to delay (defer): Nordvik holds a call on the underlying project value, with the NPD licence expiry date acting as the option's expiry and the development capex representing the strike price — the company pays the investment cost only if and when it chooses to sanction the project, preserving full upside while capping the downside to the licence fee already sunk. The underlying asset (Pₐ) is the risked PV of the block's production cash flows, capturing the economic value Nordvik obtains on sanction; the exercise price (Pₑ) is the capital commitment required, which is treated as fixed under the pre-FEED cost estimate. The four-year deferral window is material: a longer time to expiry increases the option value by giving management more opportunity to gather information — on oil prices, reservoir performance and cost trends — before committing irreversibly, and this time value is precisely what the static negative NPV fails to capture. The loudest limitation of applying BSOP here is volatility estimation: Block 7219's production cash flows are not traded, so there is no market-observed volatility series for this specific asset, and the peer-company equity volatility proxy conflates asset volatility with capital-structure effects and exploration-portfolio differences, rendering the input subjective and potentially imprecise — the option value is therefore indicative rather than definitive. On balance, the board should be advised to preserve the option and defer the FID: the flexibility to wait, gather further information on the oil-price environment and refine the reservoir model carries positive economic value that the static NPV suppresses, and immediate sanction of a negative-NPV project at today's valuations would destroy shareholder value.

*Reconciliation: d1 0.4347 / d2 -0.2453 → N 0.6681/0.4031 → value NOK 824.0m. ✓*

### hint

You've run the BSOP numbers — now check whether you've named the real-option archetype, explained why the option value changes the decision signal that the static NPV alone would give, and told the board in plain terms what to do and why waiting preserves value that immediate sanction destroys.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates execute d1, d2 and the option premium correctly, then treat the number as the finish line rather than the starting point of the advice. That thinking is wrong because the entire purpose of applying BSOP to a real option is to demonstrate that static NPV systematically misprice managerial flexibility — the option value is only meaningful when it is explicitly compared to the immediate-investment signal and used to resolve the board's binary decision. The second, linked failure is FENCE-SITTING on the real-option archetype: writing "this could be an option to delay or expand" without committing to the specific mapping — licence expiry as expiry date, development capex as strike, risked production PV as the underlying — earns no credit because the examiner is testing whether you can translate scenario facts into the BSOP framework, not whether you know option archetypes exist. On own-figure rule: if your d1 or d2 is slightly off, carry it forward into N(d1)/N(d2) and the premium calculation consistently — where the method downstream is correct, those marks remain available, and the error is charged once at its source, not compounded across every subsequent step. At the boardroom bar, the senior adviser's question is always the same: "You've valued the option — now what are you telling the board to do, and what is the single biggest reason your volatility input might make that advice less reliable than the number suggests?"

### answer_schema

```json
{
  "params": {
    "Pa": 2840,
    "Pe": 3100,
    "time": 4,
    "base_npv": -260,
    "risk_free": 3.8,
    "volatility": 34,
    "pv_exercise": 2662.863670297483
  },
  "components": [
    {
      "unit": "NOKm",
      "label": "Underlying asset value (Pₐ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pa",
      "working_steps": [
        "identify the value of the underlying"
      ],
      "expected_value": 2840
    },
    {
      "unit": "NOKm",
      "label": "Exercise price (Pₑ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pe",
      "working_steps": [
        "identify the exercise price"
      ],
      "expected_value": 3100
    },
    {
      "unit": "%",
      "label": "Volatility (s)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "volatility",
      "working_steps": [
        "identify the volatility of the underlying"
      ],
      "expected_value": 34
    },
    {
      "unit": "%",
      "label": "Risk-free rate (r)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "risk_free",
      "working_steps": [
        "identify the risk-free rate"
      ],
      "expected_value": 3.8
    },
    {
      "unit": "years",
      "label": "Time to expiry (t, years)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "time",
      "working_steps": [
        "identify the time to expiry"
      ],
      "expected_value": 4
    },
    {
      "unit": "",
      "label": "d1",
      "weight": 1,
      "recompute": "bsop_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "Pa",
        "Pe",
        "volatility",
        "risk_free",
        "time"
      ],
      "component_id": "d1",
      "working_steps": [
        "d1 = [ln(Pₐ/Pₑ) + (r + s²/2)t] / (s√t)"
      ],
      "expected_value": 0.4347087362970796
    },
    {
      "unit": "",
      "label": "d2",
      "weight": 1,
      "recompute": "bsop_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "d1",
        "volatility",
        "time"
      ],
      "component_id": "d2",
      "working_steps": [
        "d2 = d1 − s√t"
      ],
      "expected_value": -0.24529126370292043
    },
    {
      "unit": "",
      "label": "N(d1)",
      "weight": 1,
      "recompute": "norm_cdf_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d1"
      ],
      "component_id": "Nd1",
      "working_steps": [
        "N(d1) from the normal tables"
      ],
      "expected_value": 0.6681130386125493
    },
    {
      "unit": "",
      "label": "N(d2)",
      "weight": 1,
      "recompute": "norm_cdf_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d2"
      ],
      "component_id": "Nd2",
      "working_steps": [
        "N(d2) from the normal tables"
      ],
      "expected_value": 0.40311551070981266
    },
    {
      "unit": "NOKm",
      "label": "Call value (c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2))",
      "weight": 3,
      "recompute": "bsop_call",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "Pa",
        "Pe",
        "risk_free",
        "time",
        "Nd1",
        "Nd2"
      ],
      "component_id": "call",
      "working_steps": [
        "c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2)"
      ],
      "expected_value": 823.999381257064
    }
  ]
}
```

---

## Drill 3 — option_to_expand (B2c, call)  ·  `40405564-463d-450e-95e3-2bda15ad38a9`
- LO B2c · mode quantitative · command_verb "assess, value and advise" · L3 · marks_guide 15

### question

Assess the value of VerdanBrint A/S's option to expand its green-hydrogen production facility using the Black-Scholes Option Pricing (BSOP) model, identifying the real-option archetype and mapping the five drivers to the scenario. Advise the board whether the expansion option justifies proceeding with the pilot phase, having regard to the base-case project position.

### context_text

BACKGROUND — VERDANBRINT A/S, DENMARK (snapshot date: 1 July 2025)

VerdanBrint A/S ("VerdanBrint") is a Danish clean-energy developer headquartered in Esbjerg, Denmark, operating under the oversight of a board that reports to a consortium of Nordic institutional investors. In June 2023 VerdanBrint commissioned a pilot green-hydrogen electrolysis plant on the Jutland coast, powered by co-located offshore wind-energy offtake. The pilot phase — designed to validate electrolyser efficiency at commercial wind-load conditions — has a base-case NPV of DKK −28 million when valued on a stand-alone basis: operating cash flows are insufficient to cover the pilot's DKK 310 million capital outlay at VerdanBrint's hurdle rate of 9.5%.

The board is now evaluating whether the pilot's true strategic value lies in the growth option it confers: if electrolyser performance and green-hydrogen spot prices are satisfactory at the end of a three-year assessment window (expiring 30 June 2028), VerdanBrint will have the exclusive contractual right — but not the obligation — to proceed with a full-scale commercial expansion. The full-scale plant would require a further capital investment of DKK 1,400 million. The present value of the projected cash flows from the full-scale plant (discounted at VerdanBrint's risk-adjusted hurdle rate) was estimated at DKK 1,250 million as at the snapshot date. Green-hydrogen output prices and electrolyser-efficiency outcomes are volatile; VerdanBrint's technical and commercial advisers have estimated an annualised cash-flow volatility of 38% for the full-scale plant, drawing on comparable European electrolysis projects and scenario modelling. The continuously compounded risk-free rate, proxied by the 3-year Danish government bond yield as at the snapshot date, stood at 3.1%.

FIVE BSOP DRIVERS — REAL OPTION TO EXPAND

  Pₐ  (underlying)  : DKK 1,250 million — present value of the full-scale plant's projected operating cash flows
  Pₑ  (exercise)    : DKK 1,400 million — capital investment required to execute the full-scale expansion
  s   (volatility)  : 38% per annum
  r   (risk-free)   : 3.1% per annum (continuously compounded)
  t   (time)        : 3 years (to the expansion decision date of 30 June 2028)

BASE-CASE NPV (pilot phase, without the expansion option): DKK −28 million

### model_answer

**Option valuation — Black-Scholes (BSOP)**

**Assumptions:** the option is valued with the Black-Scholes model on the five drivers below. BSOP prices a EUROPEAN option; N(d1) and N(d2) are read from the normal-distribution tables. This is an **option to expand** (a call option on the follow-on investment); the marked judgement is mapping the scenario to the five drivers.

**Step 1 — The five drivers (identification + mapping)**

| Driver | Maps to | Value |
|------|------|------|
| Underlying, Pₐ | the PV of the full-scale plant's projected operating cash flows | DKK 1250.0m |
| Exercise, Pₑ | the capital investment required to execute the full-scale expansion | DKK 1400.0m |
| Volatility, s | annual volatility | 38.00% |
| Risk-free, r | risk-free rate | 3.10% |
| Time, t | time to expiry | 3.0 years |

**Step 2 — d1, d2 and the cumulative normals**

d1 = [ln(Pₐ/Pₑ) + (r + s²/2)·t] / (s·√t) = **0.2982**; d2 = d1 − s·√t = **-0.3600**.

From the normal tables: **N(d1) = 0.6172**, **N(d2) = 0.3594** (read at the 2-dp rounding of d1/d2).

**Step 3 — Option value**

c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2) = DKK 1250.0m×0.6172 − DKK 1275.7m×0.3594 = **DKK 313.0m**.

**Step 4 — The option and the decision (code-owned)**

The expansion (growth) option is worth **DKK 313.0m**; the expanded value = base NPV DKK -28.0m + DKK 313.0m = **DKK 285.0m**, so with the growth option the project **is value-creating and should proceed**.

**Step 5 — Interpretation, assumptions and limitations**

This is a real option to expand — a call archetype — in which the pilot phase functions as the premium paid to secure the exclusive right, but not the obligation, to scale up commercial hydrogen production; the board should exercise that right only if full-scale economics prove favourable at the 2028 decision date. The underlying asset (Pₐ) is the present value of the full-scale plant's cash flows, and the exercise price (Pₑ) is the scale-up capital cost, so the option is modestly out-of-the-money on a simple intrinsic basis, meaning time value and volatility are the primary sources of option worth. The three-year window grants VerdanBrint a material deferral benefit: over that horizon, swings in green-hydrogen spot prices and electrolyser-efficiency outcomes could move the expansion firmly into value-creating territory, which is precisely what a high volatility assumption captures. The loudest limitation of applying BSOP here is volatility estimation: because the full-scale plant's cash flows are generated by a non-traded real asset with no continuous market price history, the 38% annualised volatility is a subjectively constructed proxy drawn from comparable projects, and the no-arbitrage replication argument that underpins BSOP's theoretical validity requires a traded twin asset — an assumption that breaks for this illiquid real underlying, making the computed value indicative rather than definitive. The board should nonetheless proceed with the pilot, because the standalone NPV shortfall is modest relative to the scale of the growth option being acquired, and walking away forfeits an irreversible strategic position in Danish green-hydrogen infrastructure that cannot readily be repurchased at current cost.

*Reconciliation: d1 0.2982 / d2 -0.3600 → N 0.6172/0.3594 → call DKK 313.0m → expanded DKK 285.0m. ✓*

### hint

Your BSOP mechanics may be sound, but the board question is still unanswered — check whether you have explicitly reconciled the growth-option value against the base-case NPV position and converted that reconciliation into a clear proceed/do-not-proceed recommendation with a reason tied to VerdanBrint's specific strategic position.

### full_reveal

The dominant failure in real-options drills is ABANDONED-AFTER-CALC: the candidate completes the BSOP computation, states the call value, and stops — leaving the decision marks entirely unearned. This matters because the command verb is "assess," which requires a verdict, and the drill explicitly asks the board whether the expansion option justifies proceeding; a number without a recommendation is not advice, it is arithmetic. The correct mental model is to treat the BSOP output as the floor of the answer, not its ceiling: the call value must be added to the base-case NPV to produce an expanded project value, and that expanded value is what drives the recommendation — the pilot phase is the option premium securing an exclusive, irreversible strategic position, and the board needs to know whether acquiring that position is worth the standalone shortfall. A second, linked misconception is UNDEVELOPED-ASSUMPTION: candidates who reach Step 5 often list BSOP's limitations (European-option constraint, constant volatility, traded-twin-asset requirement) as a bullet inventory rather than explaining why each assumption is strained for a real underlying like VerdanBrint's full-scale plant — the critical point is that BSOP's no-arbitrage replication argument requires a continuously traded asset whose price dynamics mirror the underlying, and a non-traded hydrogen facility cannot satisfy that condition, making the valuation indicative rather than definitive. If your d1 or d2 calculation contains an arithmetic slip, carry your own N(d1) and N(d2) readings forward consistently into the call formula and then into the expanded-value reconciliation — where the downstream method is correct, those marks remain available and the error is charged once, at its source.

### answer_schema

```json
{
  "params": {
    "Pa": 1250,
    "Pe": 1400,
    "time": 3,
    "base_npv": -28,
    "risk_free": 3.1,
    "volatility": 38,
    "pv_exercise": 1275.6709004145969
  },
  "components": [
    {
      "unit": "DKKm",
      "label": "Underlying asset value (Pₐ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pa",
      "working_steps": [
        "identify the value of the underlying"
      ],
      "expected_value": 1250
    },
    {
      "unit": "DKKm",
      "label": "Exercise price (Pₑ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pe",
      "working_steps": [
        "identify the exercise price"
      ],
      "expected_value": 1400
    },
    {
      "unit": "%",
      "label": "Volatility (s)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "volatility",
      "working_steps": [
        "identify the volatility of the underlying"
      ],
      "expected_value": 38
    },
    {
      "unit": "%",
      "label": "Risk-free rate (r)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "risk_free",
      "working_steps": [
        "identify the risk-free rate"
      ],
      "expected_value": 3.1
    },
    {
      "unit": "years",
      "label": "Time to expiry (t, years)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "time",
      "working_steps": [
        "identify the time to expiry"
      ],
      "expected_value": 3
    },
    {
      "unit": "",
      "label": "d1",
      "weight": 1,
      "recompute": "bsop_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "Pa",
        "Pe",
        "volatility",
        "risk_free",
        "time"
      ],
      "component_id": "d1",
      "working_steps": [
        "d1 = [ln(Pₐ/Pₑ) + (r + s²/2)t] / (s√t)"
      ],
      "expected_value": 0.29820341150579865
    },
    {
      "unit": "",
      "label": "d2",
      "weight": 1,
      "recompute": "bsop_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "d1",
        "volatility",
        "time"
      ],
      "component_id": "d2",
      "working_steps": [
        "d2 = d1 − s√t"
      ],
      "expected_value": -0.35997589537037467
    },
    {
      "unit": "",
      "label": "N(d1)",
      "weight": 1,
      "recompute": "norm_cdf_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d1"
      ],
      "component_id": "Nd1",
      "working_steps": [
        "N(d1) from the normal tables"
      ],
      "expected_value": 0.617225972815752
    },
    {
      "unit": "",
      "label": "N(d2)",
      "weight": 1,
      "recompute": "norm_cdf_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d2"
      ],
      "component_id": "Nd2",
      "working_steps": [
        "N(d2) from the normal tables"
      ],
      "expected_value": 0.3594326426692961
    },
    {
      "unit": "DKKm",
      "label": "Call value (c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2))",
      "weight": 3,
      "recompute": "bsop_call",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "Pa",
        "Pe",
        "risk_free",
        "time",
        "Nd1",
        "Nd2"
      ],
      "component_id": "call",
      "working_steps": [
        "c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2)"
      ],
      "expected_value": 313.014703107351
    },
    {
      "unit": "DKKm",
      "label": "Expanded value (base NPV + expansion call)",
      "weight": 3,
      "recompute": "base_plus_call",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "call"
      ],
      "component_id": "expanded_npv",
      "working_steps": [
        "= base NPV -28.0 + expansion call"
      ],
      "expected_value": 285.014703107351
    }
  ]
}
```

---

## Drill 4 — option_to_withdraw (B2c, put via parity)  ·  `c0ea5f85-e2df-4295-b9c3-0229e1083b8f`
- LO B2c · mode quantitative · command_verb "assess, value and advise" · L3 · marks_guide 15

### question

Assess the value of Pacific Horizon's option to withdraw the Meridian Trader from its current deployment using the Black-Scholes Option Pricing (BSOP) model; identify the real-option archetype; advise the board whether the withdrawal option materially changes the investment case; and evaluate the key limitations of applying BSOP in this context.

### context_text

PACIFIC HORIZON CONTAINER LINES LIMITED — BOARD ADVISORY NOTE
Date of analysis: 1 July 2025

BACKGROUND
Pacific Horizon Container Lines Limited ("Pacific Horizon") is a Hong Kong-registered container-shipping vessel operator whose fleet serves intra-Asia trade lanes out of Kwai Tsing Container Port. In early 2025 the board committed a tranche of capital to operate the Meridian Trader, a 4,500-TEU feeder vessel, exclusively on the Hong Kong–Haiphong–Manila corridor under a variable-rate spot-market model. Projected box-rate softness on that corridor has since compressed forecast utilisation, and the board's investment committee is questioning whether the vessel should be redeployed — sold outright into the secondary containership market — before the end of the three-year operating window originally envisaged.

THE WITHDRAWAL / REDEPLOYMENT OPTION
Pacific Horizon retains the contractual and physical ability to withdraw the Meridian Trader from the corridor at any point over the next three years and sell the vessel into the secondary containership market at a price consistent with broker valuations as at 1 July 2025. Exercise of the option would terminate the operating programme and realise the secondary-market vessel value; if the option is not exercised, Pacific Horizon continues to collect freight revenues on the corridor.

BASE-CASE INVESTMENT POSITION (without the option)
The base-case NPV of continuing to operate the Meridian Trader on the corridor for the full three-year window, discounted at Pacific Horizon's shipping-division WACC of 9.2%, has been assessed by the treasury function at −HKD 38 million. The option to withdraw is therefore decision-relevant and must be valued.

FIVE BSOP DRIVERS — AS AT 1 JULY 2025

• Pₐ (underlying) — the present value of the cash flows from CONTINUING to operate the Meridian Trader on the corridor for the three-year window, estimated by treasury at HKD 490 million.
  [Underlying label: the PV of the Meridian Trader's continuing freight-corridor cash flows]

• Pₑ (exercise price) — the secondary-market resale / redeployment value of the Meridian Trader as assessed by two independent shipbrokers as at 1 July 2025: HKD 540 million.
  [Exercise label: the secondary-market resale value of the vessel]

• s (volatility) — the annualised volatility of containership asset values in the 4,000–5,000 TEU segment, proxied from three years of Baltic and Orient Exchange secondary-market transaction data: 28% per annum.

• r (risk-free rate) — the annualised yield on Hong Kong Government three-year Exchange Fund Notes as at 1 July 2025: 3.8% per annum.

• t (time to expiry) — the operating window during which Pacific Horizon retains the right to withdraw: 3 years.

BASE-CASE NPV (without the withdrawal option): −HKD 38 million.

### model_answer

**Option valuation — Black-Scholes (BSOP)**

**Assumptions:** the option is valued with the Black-Scholes model on the five drivers below. BSOP prices a EUROPEAN option; N(d1) and N(d2) are read from the normal-distribution tables. This is an **option to withdraw / abandon** (a put option on the recoverable value; a redeploy/switch option sits in the same put family); the marked judgement is mapping the scenario to the five drivers.

**Step 1 — The five drivers (identification + mapping)**

| Driver | Maps to | Value |
|------|------|------|
| Underlying, Pₐ | the PV of the Meridian Trader's continuing freight-corridor cash flows | HKD 490.0m |
| Exercise, Pₑ | the secondary-market resale value of the vessel | HKD 540.0m |
| Volatility, s | annual volatility | 28.00% |
| Risk-free, r | risk-free rate | 3.80% |
| Time, t | time to expiry | 3.0 years |

**Step 2 — d1, d2 and the cumulative normals**

d1 = [ln(Pₐ/Pₑ) + (r + s²/2)·t] / (s·√t) = **0.2772**; d2 = d1 − s·√t = **-0.2078**.

From the normal tables: **N(d1) = 0.6092**, **N(d2) = 0.4177** (read at the 2-dp rounding of d1/d2).

**Step 3 — Option value**

c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2) = HKD 490.0m×0.6092 − HKD 481.8m×0.4177 = **HKD 97.2m**.

By put-call parity, the abandonment (put) value = c − Pₐ + Pₑ·e^(−rt) = HKD 97.2m − HKD 490.0m + HKD 481.8m = **HKD 89.1m**.

**Step 4 — The option and the decision (code-owned)**

The abandonment put is worth **HKD 89.1m**; the project value WITH the option to withdraw = base NPV HKD -38.0m + HKD 89.1m = **HKD 51.1m**, so the downside protection **turns the project value-positive and it should proceed**.

**Step 5 — Interpretation, assumptions and limitations**

This is a real option to withdraw (abandon/redeploy): Pacific Horizon holds the right, but not the obligation, to exit the operating programme by selling the Meridian Trader into the secondary containership market, making this a put option on the vessel's operating value with the resale price as the strike — a classic withdraw/redeploy archetype within the put/switch family. The underlying (Pₐ) reflects the economic value of the corridor's freight cash flows, and because that present value is modestly below the broker-assessed resale value (Pₑ), the put is slightly in the money before time-value is layered on, which amplifies the option's decision-relevance. Volatility is the dominant uncertainty driver: because the Meridian Trader is a non-traded real asset, the 28% per annum figure is a proxy derived from secondary-market transaction data rather than observed traded-instrument volatility, and the no-arbitrage replication logic underpinning BSOP requires a traded twin asset — a condition that is at best approximate for a physical vessel, meaning the computed value is indicative rather than precise. BSOP also prices a European option (exercisable only at maturity), whereas Pacific Horizon's withdrawal right is effectively American (exercisable at any point during the three-year window), so the model likely understates the option's true worth. On balance, given that the base-case NPV without the option is negative, the board should regard the withdrawal option as the critical value component of this investment and take the computed expanded NPV as a floor on the project's strategic worth, with a strong presumption toward retaining optionality rather than locking into a long-term operational commitment on the corridor.

*Reconciliation: d1 0.2772 / d2 -0.2078 → N 0.6092/0.4177 → call HKD 97.2m → put HKD 89.1m → with-option HKD 51.1m. ✓*

### hint

You have the BSOP mechanics — now ask yourself: what type of option does Pacific Horizon actually hold (call or put?), how does put-call parity connect your call value to that abandonment right, and what does adding the option value to the base NPV tell the board to do?

### full_reveal

The classic misconception here is ABANDONED-AFTER-CALC: candidates grind through d1, d2 and the call value, then stop — leaving the put-call parity step, the archetype labelling, and the board recommendation (the marks that separate a pass from a strong pass) untouched on the table. The error matters because BSOP prices a call by construction, but Pacific Horizon's right to exit is a put — the call value is only an intermediate result, not the answer, and treating it as the answer misidentifies both the option archetype and the direction of protection the option provides. The correct mental model is to treat the BSOP call as the input to put-call parity, which surfaces the abandonment-put value; that put value is then added to the base-case NPV to produce the expanded NPV — and it is that combined figure, set against the negative base NPV, that drives the board recommendation. If your d1 or d2 is slightly off, carry your own call value forward through put-call parity and into the expanded NPV consistently — where the downstream method is correct, those marks may still score, with the error charged once at its source. At the boardroom bar, the board is not paying for the arithmetic; they are paying to know whether the withdrawal option is the decisive value component of this investment and what that means for the deployment decision.

### answer_schema

```json
{
  "params": {
    "Pa": 490,
    "Pe": 540,
    "time": 3,
    "base_npv": -38,
    "risk_free": 3.8,
    "volatility": 28,
    "pv_exercise": 481.8192961765005
  },
  "components": [
    {
      "unit": "HKDm",
      "label": "Underlying asset value (Pₐ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pa",
      "working_steps": [
        "identify the value of the underlying"
      ],
      "expected_value": 490
    },
    {
      "unit": "HKDm",
      "label": "Exercise price (Pₑ)",
      "weight": 2,
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "Pe",
      "working_steps": [
        "identify the exercise price"
      ],
      "expected_value": 540
    },
    {
      "unit": "%",
      "label": "Volatility (s)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "volatility",
      "working_steps": [
        "identify the volatility of the underlying"
      ],
      "expected_value": 28
    },
    {
      "unit": "%",
      "label": "Risk-free rate (r)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "risk_free",
      "working_steps": [
        "identify the risk-free rate"
      ],
      "expected_value": 3.8
    },
    {
      "unit": "years",
      "label": "Time to expiry (t, years)",
      "weight": 2,
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "time",
      "working_steps": [
        "identify the time to expiry"
      ],
      "expected_value": 3
    },
    {
      "unit": "",
      "label": "d1",
      "weight": 1,
      "recompute": "bsop_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "Pa",
        "Pe",
        "volatility",
        "risk_free",
        "time"
      ],
      "component_id": "d1",
      "working_steps": [
        "d1 = [ln(Pₐ/Pₑ) + (r + s²/2)t] / (s√t)"
      ],
      "expected_value": 0.2772028786397527
    },
    {
      "unit": "",
      "label": "d2",
      "weight": 1,
      "recompute": "bsop_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "d1",
        "volatility",
        "time"
      ],
      "component_id": "d2",
      "working_steps": [
        "d2 = d1 − s√t"
      ],
      "expected_value": -0.20777134747953296
    },
    {
      "unit": "",
      "label": "N(d1)",
      "weight": 1,
      "recompute": "norm_cdf_d1",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d1"
      ],
      "component_id": "Nd1",
      "working_steps": [
        "N(d1) from the normal tables"
      ],
      "expected_value": 0.6091877709311508
    },
    {
      "unit": "",
      "label": "N(d2)",
      "weight": 1,
      "recompute": "norm_cdf_d2",
      "tolerance": {
        "kind": "absolute",
        "value": 0.01
      },
      "depends_on": [
        "d2"
      ],
      "component_id": "Nd2",
      "working_steps": [
        "N(d2) from the normal tables"
      ],
      "expected_value": 0.41770378339131364
    },
    {
      "unit": "HKDm",
      "label": "Call value (c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2))",
      "weight": 3,
      "recompute": "bsop_call",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "Pa",
        "Pe",
        "risk_free",
        "time",
        "Nd1",
        "Nd2"
      ],
      "component_id": "call",
      "working_steps": [
        "c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2)"
      ],
      "expected_value": 97.24426483239978
    },
    {
      "unit": "HKDm",
      "label": "Put value via put-call parity (p = c − Pₐ + Pₑ·e^(−rt))",
      "weight": 3,
      "recompute": "put_call_parity",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "call",
        "Pa",
        "Pe",
        "risk_free",
        "time"
      ],
      "component_id": "put",
      "working_steps": [
        "p = c − Pₐ + Pₑ·e^(−rt)"
      ],
      "expected_value": 89.06356100890025
    },
    {
      "unit": "HKDm",
      "label": "Project value with the abandonment option (base NPV + put)",
      "weight": 3,
      "recompute": "base_plus_put",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "put"
      ],
      "component_id": "expanded_npv",
      "working_steps": [
        "= base NPV -38.0 + abandonment put"
      ],
      "expected_value": 51.06356100890025
    }
  ]
}
```

---
