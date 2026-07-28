> ## ⚑ MARKING TEST FIXTURE — read this before the script
>
> **Banked 2026-07-28.** This is an **authentic blind-candidate script**: sat against
> `AFM_MOCK1_CANDIDATE_VIEW.md` with no access to any answer-side field. **The script below is
> verbatim and must stay that way** — everything above this line is hand-maintained framing, and
> nothing below it may be corrected, tidied or re-rendered. Its value is that it is real.
>
> **Why it is kept: it is the case the marker must not get wrong.** Q3(i) is a near-correct
> attempt carrying **one named conceptual error** — the unexpired basis is ignored — against a
> correct contract count, correct sell direction, correct scenario reconciliation and a committed
> recommendation. This is the heavy-partial-credit case, not the zero case.
>
> ### The single error, and how far it propagates
>
> The candidate takes the closing futures price as `100 − prevailing rate` (95.00 / 96.80),
> omitting the **0.15 unexpired basis**, so it locks `4.45% + 0.50% = 4.95%` where the code-owned
> answer is **4.80%**. The 0.15pp miss **is** the omitted basis, 1:1.
>
> Scored mechanically against `b201` requirement (i)'s 7 components — **2 pass, 5 fail, and every
> one of the 5 failures is that same omission**:
>
> | component | expected | tolerance | candidate | verdict |
> |---|---|---|---|---|
> | `contracts` | 96 | abs ±0.5 | 96 | **PASS** |
> | `mm_interest` | 1,320,000 | rel 0.5% | €1.320m | **PASS** |
> | `unexpired_basis` | 0.15 | abs ±0.01 | *never stated* | FAIL (not attempted) |
> | `closing_price` | 94.85 | abs ±0.01 | 95.00 | FAIL (0.15 out — 15× band) |
> | `futures_profit` | 168,000 | rel 0.5% | €132,000 | FAIL (21.4% under) |
> | `net_outcome` | 1,152,000 | rel 0.5% | €1.188m | FAIL (3.1% over) |
> | `effective_rate` | 4.80 | abs ±0.05 | 4.95 | FAIL (0.15 out — 3× band) |
>
> **Correction to the framing this fixture was requested under:** `effective_rate` carries an
> **absolute ±0.05** tolerance, not a relative one. The conclusion is unchanged and if anything
> firmer — 0.15 out is **3× the band**, so the component scores **0** either way — but a fixture
> that is a marking spec has to name the real mechanism. The "~3.1% out" figure is the *relative*
> size of the miss (0.15 ÷ 4.80); it is `net_outcome` that is actually judged on a 0.5% relative
> band and fails at 3.1%.
>
> **This is the wrong outcome for a script this strong.** Exact-figure tolerance marking alone
> returns 2/7 on a requirement where the candidate got the contract count right — the **#1
> examiner-flagged error** this family's GATE 21 exists to seed — sold rather than bought, priced
> both scenarios correctly off its own closing price, reconciled to a single rate, and committed to
> advice. Under own-figure rule the great majority of the 12 technical marks survive one upstream
> conceptual slip. **The fixture exists to pin that**: a marker that reads these 5 red components
> as 5 errors has miscounted a single one.
>
> ### The candidate's own self-check does NOT discriminate — marking must catch this
>
> The requirement asks the candidate to *"show that the same rate results whether the base rate
> rises to 5.0% or falls to 3.2%."* The candidate got **4.95% under both scenarios** and read the
> consistency as confirmation ("*The futures hedge converts the uncertain floating base rate into
> an effective base rate of 4.45%*"). The check is **invariant to the basis omission** — it
> reconciles just as cleanly at the wrong rate as at the right one, because the omitted 0.15
> applies identically to both legs. **Marking must catch the basis omission because the
> candidate's internal check never will.**
>
> ### Two further things this script evidences
>
> - **B1(ii) VaR ambiguity (→ EDIT 1 in `AFM_SURFACED.md`).** The candidate wrote its own
>   *"Ambiguity"* section stating outright that the paper does not say whether the £52m is a loss
>   against zero NPV or a shortfall against the £44m mean, then **guessed** the zero-NPV reading
>   and flagged that the board should confirm the convention. It guessed right. That is luck.
> - **"guaranteed" register leak (→ EDIT 2).** The word appears **4×** in this script — 3× in
>   A(iii) (`Guaranteed euro receipt`, the comparison-table header, and *"the higher guaranteed
>   euro receipt"*) and once in Q3(i) (*"a completely guaranteed 4.95% rate"*). It propagated out
>   of the exhibit and into student output, which is the evidence that the irhedge FR1 register
>   ruling has to reach fxhedge content.
>
> **Not marked yet.** Marking and debrief are out of the lean sit build; no `passed` verdict, no
> marks, no band has been recorded against this script.

# ACCA Advanced Financial Management

## Mock Paper 1 — Candidate Answer

---

# Question 1 — Solenne Industries SA

## Report to the board of Solenne Industries SA

**Date:** 1 September 20X5
**Subject:** Financial appraisal, currency management and treasury arrangements for Rio Verde

---

## Requirement (i): Project-specific discount rate

### 1. Ungearing the comparable company’s equity beta

The comparable Brazilian bioethanol producer has:

* Equity beta = 1.35
* Equity proportion = 60%
* Debt proportion = 40%
* Brazilian corporate tax rate = 34%
* Debt beta = zero

The asset beta is:

[
\beta_a
=======

\frac{\beta_e \times E}
{E+D(1-T)}
]

[
\beta_a
=======

\frac{1.35 \times 0.60}
{0.60+(0.40 \times (1-0.34))}
]

[
\beta_a
=======

\frac{0.810}
{0.60+(0.40 \times 0.66)}
]

[
\beta_a
=======

\frac{0.810}
{0.864}
]

[
\boxed{\beta_a=0.9375}
]

Alternatively:

[
\beta_a
=======

\frac{1.35}
{1+(1-0.34)(40/60)}
===================

# \frac{1.35}{1.44}

0.9375
]

### 2. Regearing the asset beta to Solenne’s capital structure

Solenne’s capital structure is:

* Equity = 70%
* Debt = 30%
* French corporate tax rate for regearing = 25%

[
\beta_{e,\ project}
===================

\beta_a
\left[
1+(1-T)\frac{D}{E}
\right]
]

[
\beta_{e,\ project}
===================

0.9375
\left[
1+(1-0.25)\frac{0.30}{0.70}
\right]
]

[
\beta_{e,\ project}
===================

0.9375
\left[
1+(0.75 \times 0.428571)
\right]
]

[
\beta_{e,\ project}
===================

0.9375 \times 1.321429
]

[
\boxed{\beta_{e,\ project}=1.23884}
]

### 3. Project-specific cost of equity

Using CAPM:

[
K_e=R_f+\beta_e(R_m-R_f)
]

[
K_e
===

4.5%+(1.23884 \times 6.0%)
]

[
K_e
===

4.5%+7.433%
]

[
\boxed{K_e=11.933%}
]

### 4. Post-tax cost of debt

The French tax rate is specified for weighting Solenne’s post-tax debt cost:

[
K_d(1-T)
========

5.5% \times (1-0.25)
]

[
K_d(1-T)
========

5.5% \times 0.75
]

[
\boxed{K_d(1-T)=4.125%}
]

### 5. Project-specific weighted average cost of capital

[
WACC
====

(E/V \times K_e)+(D/V \times K_d(1-T))
]

[
WACC
====

(0.70 \times 11.933%)
+
(0.30 \times 4.125%)
]

[
WACC
====

8.353%+1.238%
]

[
\boxed{WACC=9.591%}
]

Solenne should therefore use a project-specific discount rate of approximately:

[
\boxed{9.6%}
]

### Why Solenne’s group cost of capital should not be used

The Rio Verde project is a Brazilian bioethanol operation. Its operating risks will differ from those of Solenne’s existing European specialty-chemicals activities.

Using Solenne’s existing group cost of capital would assume that:

* Brazilian bioethanol has the same operating risk as Solenne’s existing businesses;
* the project has the same sensitivity to market conditions;
* Solenne’s existing equity beta reflects Rio Verde’s business risk; and
* the new project will be financed using a risk profile identical to Solenne’s current operations.

Those assumptions are not justified.

The comparable company’s equity beta incorporates the market risk associated with Brazilian bioethanol. Ungearing removes the comparable company’s financing risk, and regearing introduces Solenne’s intended financing structure.

The resulting 9.6% rate is therefore more closely aligned with Rio Verde’s business risk and Solenne’s financing structure.

### Assumptions and limitations

* The risk-free rate, market risk premium and Solenne debt cost are assumed to be nominal euro inputs, consistent with a euro appraisal.
* No separate Brazilian country-risk premium has been provided. It would be inappropriate to invent one.
* The comparable company is assumed to be genuinely comparable in operational and market risk.
* The project’s financing is assumed to maintain Solenne’s 70:30 equity-to-debt structure.
* The company margin and debt beta are assumed to remain stable.

---

## Requirement (ii): Euro NPV of Rio Verde

### 1. Year-one operating cash flow in BRL

Normal-year PBIT:

[
\text{PBIT}=BRL320.0m
]

Brazilian corporate tax:

[
BRL320.0m \times 34%
====================

BRL108.8m
]

Post-tax operating profit:

[
BRL320.0m-BRL108.8m
===================

BRL211.2m
]

Add back depreciation:

[
BRL211.2m+BRL80.0m
==================

BRL291.2m
]

Deduct capital reinvestment:

[
BRL291.2m-BRL60.0m
==================

BRL231.2m
]

Deduct increase in working capital:

[
BRL231.2m-BRL20.0m
==================

BRL211.2m
]

Therefore:

[
\boxed{\text{Year-one cash flow before remittance tax}=BRL211.2m}
]

### 2. French corporate tax and double-tax relief

The French tax otherwise payable on the same PBIT would be:

[
BRL320.0m \times 25%
====================

BRL80.0m
]

Brazilian corporate tax already suffered is:

[
BRL320.0m \times 34%
====================

BRL108.8m
]

The credit is capped at the French charge:

[
\text{Tax credit}
=================

# \min(BRL108.8m,BRL80.0m)

BRL80.0m
]

Additional French corporate tax:

[
BRL80.0m-BRL80.0m
=================

\boxed{BRL0}
]

The excess Brazilian tax is not refunded.

### 3. Brazilian withholding tax on remittance

The project’s depreciation, reinvestment and working-capital movements net to zero in year one:

[
BRL80.0m-BRL60.0m-BRL20.0m
==========================

BRL0
]

Therefore, the distributable cash flow equals the post-Brazilian-tax profit of BRL211.2m.

Withholding tax:

[
BRL211.2m \times 15%
====================

BRL31.68m
]

Net year-one remittance:

[
BRL211.2m-BRL31.68m
===================

\boxed{BRL179.52m}
]

This agrees, subject to rounding, with the BRL179.5m first remittance stated in the paper.

### 4. BRL remittances over the four years

The cash flows grow by 3% annually.

#### Year 1

[
BRL179.520m
]

#### Year 2

[
BRL179.520m \times 1.03
=======================

BRL184.9056m
]

#### Year 3

[
BRL184.9056m \times 1.03
========================

BRL190.4528m
]

#### Year 4

[
BRL190.4528m \times 1.03
========================

BRL196.1664m
]

### 5. Forecast exchange rates using purchasing power parity

The spot quotation is BRL per EUR1.

Because Brazilian inflation is higher than eurozone inflation, the BRL is expected to weaken against the EUR.

[
S_t
===

S_0
\left(
\frac{1+i_{BRL}}{1+i_{EUR}}
\right)^t
]

[
S_t
===

5.60
\left(
\frac{1.045}{1.020}
\right)^t
]

Annual exchange-rate factor:

[
\frac{1.045}{1.020}
===================

1.0245098
]

#### Year 1 exchange rate

[
5.60 \times 1.0245098
=====================

\boxed{BRL5.737255/EUR}
]

#### Year 2 exchange rate

[
5.60 \times 1.0245098^2
=======================

\boxed{BRL5.877874/EUR}
]

#### Year 3 exchange rate

[
5.60 \times 1.0245098^3
=======================

\boxed{BRL6.021939/EUR}
]

#### Year 4 exchange rate

[
5.60 \times 1.0245098^4
=======================

\boxed{BRL6.169536/EUR}
]

### 6. Conversion of remittances into euros

| Year | Net BRL remittance | BRL/EUR rate | Euro cash flow |
| ---: | -----------------: | -----------: | -------------: |
|    1 |        BRL179.520m |     5.737255 |       €31.290m |
|    2 |        BRL184.906m |     5.877874 |       €31.458m |
|    3 |        BRL190.453m |     6.021939 |       €31.626m |
|    4 |        BRL196.166m |     6.169536 |       €31.796m |

Detailed calculations:

#### Year 1

[
\frac{BRL179.520m}{5.737255}
============================

\boxed{€31.290m}
]

#### Year 2

[
\frac{BRL184.9056m}{5.877874}
=============================

\boxed{€31.458m}
]

#### Year 3

[
\frac{BRL190.4528m}{6.021939}
=============================

\boxed{€31.626m}
]

#### Year 4

[
\frac{BRL196.1664m}{6.169536}
=============================

\boxed{€31.796m}
]

The euro cash flows increase only slowly because most of the 3% BRL cash-flow growth is offset by the BRL’s expected depreciation.

### 7. Initial investment in euros

[
\frac{BRL480m}{BRL5.60/EUR}
===========================

\boxed{€85.714m}
]

### 8. Discounting the euro cash flows

The project-specific discount rate is 9.590625%.

[
DF_t
====

\frac{1}{(1.09590625)^t}
]

| Year | Euro cash flow | Discount factor | Present value |
| ---: | -------------: | --------------: | ------------: |
|    0 |     (€85.714m) |        1.000000 |    (€85.714m) |
|    1 |       €31.290m |        0.912487 |      €28.552m |
|    2 |       €31.458m |        0.832632 |      €26.193m |
|    3 |       €31.626m |        0.759766 |      €24.029m |
|    4 |       €31.796m |        0.693276 |      €22.043m |

#### Year 1 present value

[
€31.290m \times 0.912487
========================

€28.552m
]

#### Year 2 present value

[
€31.458m \times 0.832632
========================

€26.193m
]

#### Year 3 present value

[
€31.626m \times 0.759766
========================

€24.029m
]

#### Year 4 present value

[
€31.796m \times 0.693276
========================

€22.043m
]

Total present value of remittances:

[
€28.552m+€26.193m+€24.029m+€22.043m
===================================

\boxed{€100.817m}
]

Net present value:

[
NPV
===

€100.817m-€85.714m
]

[
\boxed{NPV=€15.103m}
]

### Advice to the board

Rio Verde has a positive estimated NPV of approximately €15.1m. On the financial assumptions provided, it is expected to increase Solenne’s shareholder wealth and should proceed.

However, the positive recommendation is subject to material limitations:

* no terminal value or disposal proceeds have been provided;
* no recovery of working capital at the end of year four has been provided;
* no closure, remediation or decommissioning cost has been provided;
* purchasing power parity may not accurately predict the BRL/EUR rate;
* no separate political, regulatory or country-risk premium is included;
* the comparable-company beta may not capture all the risks of Solenne’s first South American operation; and
* the project’s NPV remains exposed to changes in operating performance, tax rules, remittance restrictions and exchange rates.

Because no terminal value or working-capital recovery is stated, neither has been included. Adding an unsupported amount would overstate the reliability of the appraisal.

---

## Requirement (iii): Hedge of the first BRL179.5m remittance

Solenne will receive BRL179.5m in three months and needs to convert this into euros.

### A. Forward contract

The three-month forward rate is:

[
BRL5.66/EUR1
]

Guaranteed euro receipt:

[
\frac{BRL179.5m}{BRL5.66/EUR}
=============================

\boxed{€31.714m}
]

### B. Money-market hedge

Because Solenne will receive BRL in the future, it should:

1. borrow the present value of the BRL receipt now;
2. convert the borrowed BRL into EUR at spot;
3. deposit the EUR for three months; and
4. use the future BRL receipt to repay the BRL loan.

#### Step 1: Borrow the present value of BRL179.5m

BRL borrowing rate:

[
12.0% \text{ annually}
]

Three-month rate:

[
12.0% \times \frac{3}{12}
=========================

3.0%
]

BRL amount borrowed now:

[
\frac{BRL179.5m}{1.03}
======================

\boxed{BRL174.2718m}
]

Repayment after three months:

[
BRL174.2718m \times 1.03
========================

BRL179.5m
]

#### Step 2: Convert the BRL borrowing into euros at spot

[
\frac{BRL174.2718m}{BRL5.60/EUR}
================================

\boxed{€31.1200m}
]

#### Step 3: Deposit the euros for three months

EUR deposit rate:

[
2.0% \text{ annually}
]

Three-month rate:

[
2.0% \times \frac{3}{12}
========================

0.5%
]

Future value of EUR deposit:

[
€31.1200m \times 1.005
======================

\boxed{€31.2756m}
]

### Comparison

| Hedge              | Guaranteed euro receipt |
| ------------------ | ----------------------: |
| Forward contract   |                €31.714m |
| Money-market hedge |                €31.276m |

Additional receipt from using the forward:

[
€31.714m-€31.276m
=================

\boxed{€0.438m}
]

The forward provides approximately €438,000 more than the money-market hedge.

### Recommendation

Solenne should use the forward contract, assuming comparable counterparty security and transaction costs.

It provides:

* the higher guaranteed euro receipt;
* a simple contractual hedge;
* no requirement to use a BRL borrowing facility;
* no additional balance-sheet borrowing; and
* less administrative work than the money-market hedge.

### Assumptions

* Interest rates are applied on a simple, pro-rata basis for three months.
* There are no transaction fees, bid–offer spreads or credit charges.
* Solenne has sufficient forward-contract credit facilities.
* The remittance amount and date are certain.
* Counterparty default risk is immaterial.

If the amount or timing is uncertain, a forward could create an overhedged or underhedged position. An option could offer flexibility, but no option data are provided.

---

## Requirement (iv): Establishing a group treasury function

### Potential advantages of centralisation

#### 1. Group-wide visibility

A central treasury would give Solenne a consolidated view of:

* cash balances;
* borrowing requirements;
* foreign-currency exposures;
* bank counterparties;
* interest-rate exposures; and
* liquidity forecasts.

At present, each subsidiary operates independently. This increases the risk that surplus cash exists in one subsidiary while another subsidiary borrows externally.

#### 2. Cash pooling and reduced external borrowing

A central function could establish physical or notional cash pooling.

Surplus funds from one subsidiary could offset deficits elsewhere, potentially reducing:

* gross external borrowing;
* interest expense;
* idle cash balances; and
* bank charges.

The legal, tax and regulatory feasibility of moving funds between France, other European jurisdictions and Brazil would have to be confirmed.

#### 3. Netting of currency exposures

Subsidiary currency receipts and payments could be matched before external hedging.

For example, one subsidiary’s BRL, USD or GBP requirement may partly offset another subsidiary’s receipt. Central netting would reduce the gross volume of external transactions and associated spreads and fees.

#### 4. Greater negotiating power

A central treasury would negotiate banking facilities for the group rather than subsidiary by subsidiary.

The larger combined volume may produce:

* lower borrowing margins;
* improved deposit rates;
* lower foreign-exchange spreads;
* larger credit lines; and
* improved access to specialist treasury products.

#### 5. Specialist expertise and stronger controls

The Brazilian venture introduces new risks involving:

* BRL volatility;
* withholding tax;
* cross-border remittances;
* emerging-market banking;
* political or regulatory restrictions; and
* potentially complex derivatives.

A dedicated central team could develop expertise that would be uneconomic to duplicate in every subsidiary.

Centralisation would also allow consistent policies covering:

* approved instruments;
* counterparty limits;
* hedge ratios;
* segregation of duties;
* authorisation levels;
* dealing records; and
* treasury reporting.

#### 6. Reduced speculation and inconsistency

Independent subsidiary desks may take inconsistent approaches to similar exposures. They may also enter positions that are operationally convenient locally but inappropriate for the group as a whole.

Central limits and reporting would reduce the risk of unauthorised or speculative trading.

### Potential disadvantages and risks

#### 1. Loss of local responsiveness

Subsidiary teams understand their local customers, suppliers, banks, regulations and cash-flow patterns.

Excessive centralisation could delay:

* urgent payments;
* local facility decisions;
* responses to customer defaults; and
* day-to-day working-capital management.

The non-executive director’s concern is therefore valid if Lyon becomes a bureaucratic approval layer.

#### 2. Implementation cost

A central treasury would require:

* specialist staff;
* treasury-management systems;
* bank connectivity;
* cybersecurity controls;
* revised authorisation processes;
* staff training; and
* legal and tax advice.

The benefits must exceed these continuing costs.

#### 3. Forecasting quality

A central treasury is only effective if subsidiaries provide timely and accurate forecasts. Poor local data could lead Lyon to:

* borrow too much or too little;
* hedge incorrect amounts;
* create liquidity shortages; or
* enter unnecessary derivatives.

Local accountability for forecasting must therefore remain.

#### 4. Tax, legal and regulatory restrictions

Cash pooling and intercompany funding may create:

* transfer-pricing issues;
* withholding taxes;
* thin-capitalisation concerns;
* legal restrictions on upstream lending;
* exchange-control restrictions; and
* trapped-cash problems.

These issues may be particularly important in Brazil.

#### 5. Concentration and operational risk

Centralisation creates a potential single point of failure. System outages, fraud, cyberattacks or staff failure in Lyon could affect the entire group.

Strong disaster-recovery arrangements and segregation of duties would be required.

### Impact on the existing subsidiary treasury desks

The local desks should not simply be removed. Their responsibilities should be redesigned.

Lyon should normally control:

* external group borrowing;
* major bank relationships;
* foreign-exchange and interest-rate hedging;
* cash pooling;
* intercompany funding;
* counterparty limits;
* treasury policy; and
* group liquidity reporting.

Subsidiaries should retain responsibility for:

* local cash-flow forecasting;
* customer collections;
* supplier-payment scheduling;
* local banking administration;
* short-term working-capital information;
* compliance with local laws; and
* identifying underlying currency exposures.

The subsidiary desks would therefore move from independent dealing centres to operational treasury units reporting into a group framework.

### Recommendation

Solenne should establish a central treasury in Lyon, but use a controlled hybrid model rather than fully removing local authority.

The model should include:

* clearly defined central and local responsibilities;
* delegated limits for urgent local transactions;
* service-level standards for central approvals;
* standard cash-flow forecasting;
* central dealing and counterparty controls;
* appropriate treasury technology; and
* regular review of savings and service quality.

This approach should capture the financial and risk-control benefits of centralisation without unnecessarily slowing the subsidiaries.

---

# Question 2 — Brecon Renewables plc

## Briefing note to the board

**Date:** 1 September 20X5
**Subject:** Risk appraisal of the Firth Array project

---

## Requirement (i): Scenario analysis

The project requires an immediate investment of £500m.

The discount rate is 10%.

### 1. Discount factors

#### Year 1

[
DF_1
====

# \frac{1}{1.10}

0.909091
]

#### Year 2

[
DF_2
====

# \frac{1}{1.10^2}

0.826446
]

#### Year 3

[
DF_3
====

# \frac{1}{1.10^3}

0.751315
]

#### Year 4

[
DF_4
====

# \frac{1}{1.10^4}

0.683013
]

---

### 2. Strong-demand scenario

Probability:

[
30%
]

#### Year 1 present value

[
£210m \times 0.909091
=====================

£190.909m
]

#### Year 2 present value

[
£230m \times 0.826446
=====================

£190.083m
]

#### Year 3 present value

[
£250m \times 0.751315
=====================

£187.829m
]

#### Year 4 present value

[
£270m \times 0.683013
=====================

£184.414m
]

Total present value of inflows:

[
£190.909m+£190.083m+£187.829m+£184.414m
=======================================

£753.234m
]

Strong-demand NPV:

[
£753.234m-£500m
===============

\boxed{£253.234m}
]

---

### 3. Base-case scenario

Probability:

[
50%
]

#### Year 1 present value

[
£150m \times 0.909091
=====================

£136.364m
]

#### Year 2 present value

[
£160m \times 0.826446
=====================

£132.231m
]

#### Year 3 present value

[
£170m \times 0.751315
=====================

£127.724m
]

#### Year 4 present value

[
£180m \times 0.683013
=====================

£122.942m
]

Total present value of inflows:

[
£136.364m+£132.231m+£127.724m+£122.942m
=======================================

£519.261m
]

Base-case NPV:

[
£519.261m-£500m
===============

\boxed{£19.261m}
]

---

### 4. Weak-demand scenario

Probability:

[
20%
]

#### Year 1 present value

[
£85m \times 0.909091
====================

£77.273m
]

#### Year 2 present value

[
£90m \times 0.826446
====================

£74.380m
]

#### Year 3 present value

[
£95m \times 0.751315
====================

£71.375m
]

#### Year 4 present value

[
£100m \times 0.683013
=====================

£68.301m
]

Total present value of inflows:

[
£77.273m+£74.380m+£71.375m+£68.301m
===================================

£291.329m
]

Weak-demand NPV:

[
£291.329m-£500m
===============

\boxed{(£208.671m)}
]

---

### 5. Expected NPV

[
ENPV
====

\sum(p \times NPV)
]

Strong-demand contribution:

[
0.30 \times £253.234m
=====================

£75.970m
]

Base-case contribution:

[
0.50 \times £19.261m
====================

£9.631m
]

Weak-demand contribution:

[
0.20 \times (−£208.671m)
========================

−£41.734m
]

Therefore:

[
ENPV
====

£75.970m+£9.631m-£41.734m
]

[
\boxed{ENPV=£43.867m}
]

### 6. Probability of a negative NPV

The strong and base scenarios both produce positive NPVs.

Only the weak-demand scenario produces a negative NPV.

Therefore:

[
P(NPV<0)
========

P(\text{weak demand})
]

[
\boxed{P(NPV<0)=20%}
]

### Advice to the board

The positive ENPV of approximately £43.9m indicates that Firth Array is expected to create shareholder value.

However, the expected value conceals a material downside:

* there is a 20% probability of a negative NPV;
* the weak scenario produces a substantial loss of approximately £208.7m;
* the base-case NPV is only £19.3m despite the £500m capital commitment; and
* much of the ENPV is generated by the strong-demand scenario.

The project is therefore financially attractive on an expected-value basis but carries significant downside risk.

Before proceeding, the board should establish whether Brecon can tolerate the liquidity, covenant and shareholder consequences of the weak-demand outcome.

### Assumptions

* The three scenarios are mutually exclusive and collectively exhaustive.
* Their stated probabilities are reliable.
* All cash flows occur at each year-end.
* The £500m outlay occurs immediately.
* The 10% discount rate remains appropriate in every scenario.
* No terminal value or refinancing proceeds are included because none are provided.

---

## Requirement (ii): Monte Carlo simulation

The simulation produced:

* Mean NPV: £44m
* Standard deviation: £60m
* Probability of negative NPV: 22%
* 95% Value-at-Risk: £52m
* Number of iterations: 10,000

### Part (a): Likelihood of success and risk profile

#### Expected result

The mean NPV is:

[
\boxed{£44m}
]

This indicates that, across the simulated outcomes, Firth Array is expected to create approximately £44m of value.

Relative to the £500m initial investment:

[
\frac{£44m}{£500m}\times100
===========================

\boxed{8.8%}
]

This is not the project’s accounting return. It indicates the expected NPV relative to the capital committed after discounting the cash flows at the project cost of capital.

The simulation’s £44m mean is very close to the scenario ENPV of £43.9m. This provides some consistency between the two analyses, although it does not prove that the underlying assumptions are correct.

#### Probability of success

The probability of a negative NPV is 22%.

Therefore:

[
P(NPV\geq0)
===========

100%-22%
]

[
\boxed{P(NPV\geq0)=78%}
]

Approximately:

[
10,000 \times 22%
=================

2,200
]

of the 10,000 simulated outcomes produced a negative NPV.

The project is therefore more likely than not to create value, but a 22% failure probability is material for a £500m commitment.

#### Dispersion of outcomes

The standard deviation of NPV is £60m.

Comparison with the mean:

[
\frac{£60m}{£44m}
=================

\boxed{1.36}
]

The standard deviation is approximately 1.36 times the expected NPV. This indicates a broad spread of possible outcomes relative to the expected gain.

The expected NPV is positive, but it is not large relative to the uncertainty surrounding it. Changes in electricity prices, availability and construction costs can materially alter the result.

#### Overall interpretation

The simulation suggests:

* a positive expected financial result;
* a 78% likelihood of a non-negative NPV;
* a substantial 22% probability of destroying value;
* significant variability around the expected result; and
* exposure to potentially severe outcomes beyond those represented by the mean.

The simulation is more informative than the three-scenario analysis because the risk variables are allowed to vary continuously rather than being restricted to three discrete combinations.

However, its reliability depends on:

* the distributions selected for each risk variable;
* the assumed correlations between electricity prices, turbine availability and construction costs;
* the quality of the underlying engineering and commercial data;
* whether extreme events are adequately represented; and
* whether 10,000 iterations provide stable tail estimates.

Simulation does not remove uncertainty. It expresses the uncertainty embedded in the model.

---

### Part (b): Interpretation and use of Value-at-Risk

I interpret the £52m project VaR as a loss measured relative to zero NPV.

At a 95% confidence level, the result means that the project’s NPV loss is expected not to exceed approximately £52m in 95% of modelled outcomes.

Equivalently:

* the approximate fifth-percentile NPV is negative £52m; and
* there is a 5% probability that the project’s NPV loss will be greater than £52m.

Relative to the initial investment:

[
\frac{£52m}{£500m}\times100
===========================

\boxed{10.4%}
]

This does **not** mean that £52m is the maximum possible loss. Outcomes in the worst 5% of the distribution may be substantially worse.

The VaR figure also does not indicate:

* the average loss once the £52m threshold is breached;
* the maximum loss in an extreme event;
* whether Brecon would suffer a cash or funding crisis;
* whether debt covenants would be breached; or
* how quickly the loss might emerge.

The board should compare the VaR and more severe stress outcomes against:

* available liquidity;
* borrowing capacity;
* covenant headroom;
* the ability to raise additional equity;
* the impact on Brecon’s other projects;
* the company’s risk appetite; and
* possible risk mitigation through contracts, insurance or staged investment.

The board should also request the expected shortfall or average loss within the worst 5% of outcomes. VaR alone gives no information about the severity of losses beyond the threshold.

### Ambiguity

The paper does not expressly state whether £52m is:

1. a loss relative to zero NPV; or
2. a shortfall of £52m relative to the expected NPV of £44m.

The standard interpretation of a stated project VaR is a £52m loss relative to zero, which I have used. The board should confirm the advisers’ precise VaR convention before relying on it.

### Recommendation

Firth Array is financially acceptable on an expected-NPV basis, but it should not be approved solely because its mean NPV is positive.

Approval should depend on Brecon’s ability to absorb:

* at least the modelled £52m VaR loss;
* losses materially beyond £52m in the worst 5% of outcomes; and
* the much larger £208.7m loss identified in the weak-demand scenario.

The board should also stress-test combinations of low electricity prices, poor availability and construction overruns before committing the full £500m.

---

# Question 3 — Aldebrino SpA

## Report to the board

**Date:** 1 September 20X5
**Subject:** Interest-rate and foreign-exchange risk management

---

## Requirement (i): Interest-rate futures hedge

Aldebrino will:

* borrow €48m;
* draw the loan in six months;
* borrow for six months;
* pay base rate plus 0.5%;
* use three-month interest-rate futures;
* use contracts of €1m each; and
* sell futures because it is exposed to an increase in borrowing rates.

### 1. Current implied futures interest rate

The current futures price is 95.55.

[
\text{Implied futures rate}
===========================

100-95.55
]

[
\boxed{\text{Implied futures rate}=4.45%}
]

Assuming a perfect hedge, Aldebrino locks in:

[
4.45%+0.50%
===========

\boxed{4.95%}
]

### 2. Number of futures contracts

The borrowing period is six months, while each contract relates to a three-month period.

[
N
=

\frac{\text{Loan amount} \times \text{Loan duration}}
{\text{Contract size} \times \text{Contract duration}}
]

[
N
=

\frac{€48m \times 6/12}
{€1m \times 3/12}
]

[
N
=

\frac{€24m}
{€0.25m}
]

[
\boxed{N=96\text{ contracts}}
]

Aldebrino should sell 96 futures contracts.

---

### Scenario 1: Base rate rises to 5.0%

#### A. Loan interest

Actual loan rate:

[
5.0%+0.5%
=========

5.5%
]

Interest for six months:

[
€48m \times 5.5% \times \frac{6}{12}
]

# [

€48m \times 0.055 \times 0.5
]

[
\boxed{\text{Loan interest}=€1.320m}
]

#### B. Futures gain

Assuming the futures rate rises to 5.0%, the futures price becomes:

[
100-5.0
=======

95.00
]

Aldebrino sold futures at 95.55 and closes them at 95.00.

Price movement:

[
95.55-95.00
===========

0.55
]

This represents an interest-rate movement of:

[
0.55%
]

Gain per contract:

[
€1m \times 0.55% \times \frac{3}{12}
]

# [

€1m \times 0.0055 \times 0.25
]

[
\boxed{\text{Gain per contract}=€1,375}
]

Total futures gain:

[
€1,375 \times 96
================

\boxed{€132,000}
]

#### C. Net borrowing cost

[
€1.320m-€0.132m
===============

\boxed{€1.188m}
]

Effective annual interest rate:

[
\frac{€1.188m}
{€48m \times 6/12}
]

# [

\frac{€1.188m}{€24m}
]

[
\boxed{\text{Effective rate}=4.95%}
]

---

### Scenario 2: Base rate falls to 3.2%

#### A. Loan interest

Actual loan rate:

[
3.2%+0.5%
=========

3.7%
]

Interest for six months:

[
€48m \times 3.7% \times \frac{6}{12}
]

# [

€48m \times 0.037 \times 0.5
]

[
\boxed{\text{Loan interest}=€0.888m}
]

#### B. Futures loss

Assuming the futures rate falls to 3.2%, the futures price becomes:

[
100-3.2
=======

96.80
]

Aldebrino sold futures at 95.55 and closes them at 96.80.

Price movement against Aldebrino:

[
96.80-95.55
===========

1.25
]

This represents an interest-rate movement of:

[
1.25%
]

Loss per contract:

[
€1m \times 1.25% \times \frac{3}{12}
]

# [

€1m \times 0.0125 \times 0.25
]

[
\boxed{\text{Loss per contract}=€3,125}
]

Total futures loss:

[
€3,125 \times 96
================

\boxed{€300,000}
]

#### C. Net borrowing cost

[
€0.888m+€0.300m
===============

\boxed{€1.188m}
]

Effective annual interest rate:

[
\frac{€1.188m}
{€48m \times 6/12}
]

# [

\frac{€1.188m}{€24m}
]

[
\boxed{\text{Effective rate}=4.95%}
]

### Summary

| Base rate at loan draw | Loan interest | Futures gain/(loss) | Net six-month cost | Effective annual rate |
| ---------------------: | ------------: | ------------------: | -----------------: | --------------------: |
|                   5.0% |       €1.320m |        €0.132m gain |            €1.188m |                 4.95% |
|                   3.2% |       €0.888m |      (€0.300m) loss |            €1.188m |                 4.95% |

The futures hedge converts the uncertain floating base rate into an effective base rate of 4.45%. After adding Aldebrino’s 0.5% company margin, the effective rate is 4.95%.

### Advice to treasury

Aldebrino should sell 96 contracts if it wishes to protect itself against rising rates.

The hedge removes the benefit of falling rates because the reduction in loan interest is offset by a futures loss. That is the cost of fixing the rate through futures rather than retaining two-way exposure.

### Important limitation: maturity and basis risk

The loan is drawn in six months, but the futures contracts expire in nine months. Aldebrino will therefore close the futures three months before expiry.

The calculation assumes that:

* the futures rate moves exactly in line with the relevant base rate;
* the futures price at hedge close is 100 minus the prevailing base rate;
* the company margin remains 0.5%; and
* there is no residual basis difference.

In practice, the futures rate and borrowing base rate may not move one-for-one. Because the futures contract does not expire at the loan draw date, the hedge does not provide a completely guaranteed 4.95% rate.

A contract expiring closer to the loan draw date, or an appropriately dated forward-rate agreement, would provide a closer match if available.

Other assumptions are:

* no transaction costs;
* no tax on futures gains or losses;
* no financing cost or liquidity effect from daily variation margin; and
* the loan amount and borrowing period do not change.

---

## Requirement (ii): Foreign-exchange exposures

Aldebrino faces three distinct forms of foreign-exchange exposure.

---

### 1. Transaction exposure

#### Nature of the exposure

Transaction exposure arises from contracted or highly certain foreign-currency cash flows.

Aldebrino invoices:

* US customers in USD; and
* UK customers in GBP.

The receivables are settled 60–90 days after the sale.

Between the invoice date and receipt date, USD or GBP may weaken against EUR. If that occurs, the foreign-currency receipt will convert into fewer euros.

For example, a USD invoice creates a specific exposure from the date its euro value becomes relevant until the dollars are converted into euros.

Transaction exposure directly affects:

* realised euro revenue;
* cash flow;
* operating margin; and
* reported profit.

#### Management methods

Aldebrino can manage transaction exposure using:

**Forward contracts**

Sell the expected USD or GBP receipt forward and buy EUR. This fixes the euro value but removes any benefit from favourable exchange-rate movements.

**Money-market hedges**

Borrow the present value of the foreign-currency receipt, convert it into EUR now and repay the foreign-currency borrowing when the customer pays.

**Currency options**

Purchase the right to sell USD or GBP at a specified rate. An option protects against an adverse movement while retaining the benefit of a favourable movement, but requires an upfront premium.

**Natural hedging**

Match USD receipts against USD costs or debt, and GBP receipts against GBP costs or debt.

**Netting**

Offset foreign-currency receipts and payments within the group before entering external hedges.

**Invoicing policy**

Where commercially possible, invoice customers in EUR. This transfers the exchange risk to the customer, although customers may reject the change or demand lower prices.

**Leading and lagging**

Accelerate or delay receipts and payments where exchange movements are expected and commercial terms permit. This should be tightly controlled because it may become speculative.

#### Appropriate approach

Known receivables should normally be hedged using forwards or money-market hedges. Options may be more suitable where the amount or timing is uncertain.

---

### 2. Translation exposure

#### Nature of the exposure

Translation exposure arises when Aldebrino consolidates the USD-denominated net assets of its US subsidiary into its euro financial statements.

At each reporting date:

* the US subsidiary’s assets and liabilities are translated into EUR;
* exchange-rate movements change their reported euro value; and
* a translation gain or loss may arise in the consolidated accounts.

Unlike the individual customer receivables, the underlying net investment is not necessarily settled in cash at the reporting date.

Translation exposure primarily affects:

* reported net assets;
* consolidated reserves;
* gearing ratios;
* return ratios;
* covenant calculations; and
* reported financial-statement volatility.

It becomes a realised economic cash effect if the subsidiary is sold, liquidated or remits funds.

#### Management methods

**Net-investment hedge**

Aldebrino could borrow in USD against the US subsidiary’s net assets.

If the USD weakens:

* the euro value of the subsidiary’s net assets falls; but
* the euro value of the USD liability also falls.

The movements may offset each other.

**Foreign-exchange forwards or derivatives**

Aldebrino could use derivatives to hedge part of the net investment, subject to hedge-accounting and rollover considerations.

**Matching assets and liabilities**

Finance US assets with USD liabilities within the subsidiary.

**Selective non-hedging**

The board may decide not to hedge translation exposure where:

* the subsidiary is a long-term investment;
* no disposal is planned;
* the exposure has no immediate cash-flow effect; and
* the cost of maintaining a rolling hedge exceeds its benefit.

#### Assessment

Hedging a purely accounting exposure can create real cash costs, interest payments and derivative settlements.

Aldebrino should therefore hedge translation exposure only where financial-statement volatility threatens:

* covenants;
* borrowing capacity;
* credit ratings;
* dividend policy; or
* an anticipated disposal value.

---

### 3. Economic exposure

#### Nature of the exposure

Economic exposure is the long-term effect of exchange-rate movements on Aldebrino’s future competitiveness, cash flows and market value.

A sustained strengthening of the EUR against the USD would make Aldebrino’s euro-cost products more expensive relative to products made by US competitors.

This exposure exists even before individual sales contracts are signed.

It may lead to:

* lower US sales volumes;
* pressure to reduce USD selling prices;
* lower euro margins;
* lost market share;
* reduced future cash flows; and
* a reduction in Aldebrino’s value.

Transaction exposure concerns identifiable invoices. Economic exposure concerns the value of future business and Aldebrino’s strategic competitive position.

#### Management methods

Economic exposure is difficult to hedge solely with short-term derivatives because it is continuous, long term and uncertain in amount.

Aldebrino could use:

**Operational hedging**

Locate some production, assembly or sourcing in the United States, creating USD costs to offset USD revenue.

**Foreign-currency financing**

Use USD debt so that interest and principal payments provide a natural offset against USD operating cash flows.

**Supplier diversification**

Purchase components or services in USD where commercially and operationally sensible.

**Market diversification**

Reduce dependence on any one currency area by expanding into markets whose currency exposures behave differently.

**Flexible production**

Develop the ability to switch production or sourcing between currency zones.

**Pricing strategy**

Use indexed prices, shorter quotation periods, currency-adjustment clauses or differentiated products that support pricing power.

**Product differentiation**

Improve quality, technology, service or brand strength so customers are less likely to switch solely because of exchange rates.

**Longer-term derivatives**

Rolling forwards, options or currency swaps can provide partial protection, although they cannot fully hedge uncertain future sales indefinitely.

#### Assessment

Economic exposure is potentially more serious than short-term transaction exposure because it can undermine Aldebrino’s entire competitive position.

It must be managed strategically through the location and currency structure of:

* revenues;
* operating costs;
* assets;
* liabilities; and
* production capacity.

---

### Overall recommendation

Aldebrino should adopt separate policies for each exposure:

* **Transaction exposure:** hedge identifiable USD and GBP receivables according to approved hedge ratios and time limits.
* **Translation exposure:** hedge selectively where accounting volatility could affect covenants, financing or a likely disposal.
* **Economic exposure:** build long-term operational and financing offsets rather than relying only on derivatives.

The exposures overlap but are not interchangeable. A customer invoice may create transaction exposure, repeated future US sales create economic exposure, and ownership of the US subsidiary creates translation exposure. Each therefore requires a different management response.

---

**End of candidate answer**