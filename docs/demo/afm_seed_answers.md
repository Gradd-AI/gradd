# AFM Mock Paper 1 — seed candidate answers (demo sit)

**Purpose.** Eight candidate answers for `afm-paper-1`, to be submitted by
`scripts/seed-demo-sit.ts` through the real sit routes so demo moment (b) has a completed
timed attempt with a readable pacing profile and a real spread of marks.

**⚠️ METHOD — BLIND, and it matters.** These were written WITHOUT sight of
`model_answer`, `answer_schema`, `hint` or `full_reveal` for any of the eight requirements.
The only inputs were `scenario_intro`, the exhibits, and the requirement `question` text —
i.e. exactly what a candidate sees. No query in this session selected a sealed field for
these three cases. If any figure below happens to agree with the model answer, that is the
arithmetic agreeing, not a copy.

**⚠️ THESE ARE NOT MODEL ANSWERS.** Four of the eight contain deliberate errors, named
below. Do not read this file as a reference for what the paper's answers should be, and do
not let it leak into any authoring or review pack.

**Banding, as instructed.** R1 and R5 strong · R2, R3, R4, R6 mid · R7 and R8 weak.

| # | Case | Requirement | Marks | Intended band | Deliberate defect |
|---|---|---|---|---|---|
| R1 | Solenne | (i) B3e | 10 | **strong** | none — full method, correct |
| R2 | Solenne | (ii) B5b | 16 | mid | ignores the 15% withholding tax and the double-tax relief entirely; rounds the discount rate to 10% |
| R3 | Solenne | (iii) E2b | 8 | mid | money-market hedge uses the BRL **deposit** rate (10%) where a receipt hedge needs the **borrowing** rate (12%); conclusion still lands right |
| R4 | Solenne | (iv) E1a | 6 | mid | generic centralisation benefits; never engages the NED's quoted objection; thin on subsidiary-desk impact |
| R5 | Brecon | (i) B1a | 12 | **strong** | none — all three scenarios discounted, ENPV and P(neg) both correct |
| R6 | Brecon | (ii) B1b | 8 | mid | describes the outputs but treats VaR loosely and does not commit on the decision |
| R7 | Aldebrino | (i) E3a | 12 | weak | **buys** futures (a borrower must sell); **48 contracts** not 96 (drops the hedge-period scaling — the examiner-flagged error); no basis; no reconciliation across the two scenarios |
| R8 | Aldebrino | (ii) E2a | 8 | weak | names the three exposures and barely describes them; restates the exhibit; almost no management content |

---

## R1 — Solenne (i) B3e — 10 marks — STRONG

The group WACC is not the right rate. Solenne's own cost of capital reflects the business
risk of a European specialty-chemicals group financed 70:30. Rio Verde is a Brazilian
bioethanol plant — a different industry, a different country, and a different risk profile.
Discounting it at the group rate would value it as though it carried Solenne's risk, which
it does not, and would systematically favour any project riskier than the existing business.

So I take the beta of a company that does carry the project's business risk — the listed
Brazilian bioethanol producer — strip out its financial risk, and re-apply Solenne's.

Ungear the proxy's equity beta, using the proxy's own tax rate of 34% because the debt tax
shield being removed is the Brazilian company's:

Ba = 1.35 x 60 / (60 + 40 x 0.66)
   = 1.35 x 60 / 86.4
   = 0.9375

Regear to Solenne's 70:30 structure at the French rate of 25%, because that is the tax
shield Solenne will actually enjoy:

Be = 0.9375 x (70 + 30 x 0.75) / 70
   = 0.9375 x 92.5 / 70
   = 1.2388

Cost of equity:

Ke = 4.5% + 1.2388 x 6.0% = 11.93%

Weighted average, with debt at Solenne's post-tax cost:

WACC = 0.70 x 11.93% + 0.30 x 5.5% x 0.75
     = 8.35% + 1.24%
     = 9.59%

The project-specific discount rate is approximately 9.6%.

Two things the board should note. The rate rests on a single proxy company, so it inherits
whatever is idiosyncratic about that firm's gearing and operations. And it is a rate for the
project's business risk in euro terms — it is not a Brazilian rate, and it does not by itself
handle the currency question, which is dealt with in requirement (iii).

---

## R2 — Solenne (ii) B5b — 16 marks — MID
*(deliberate defect: withholding tax and double-tax relief omitted; rate rounded to 10%)*

Free cash flow in BRL, from Exhibit 1:

PBIT                        320.0
Tax at 34%                 (108.8)
Post-tax profit             211.2
Add back depreciation        80.0
Less reinvestment           (60.0)
Less increase in WC         (20.0)
Net BRL cash flow           211.2

Growing at 3% a year:

Year 1  211.2
Year 2  217.5
Year 3  224.1
Year 4  230.8

The cash flows are in reais and Solenne needs a euro appraisal, so I convert each year at a
forecast rate using purchasing power parity. Brazilian inflation 4.5%, eurozone 2.0%, so the
real depreciates against the euro at roughly 1.045/1.02 = 2.45% a year from a spot of 5.60:

Year 1  5.74      Year 2  5.88      Year 3  6.02      Year 4  6.17

Euro cash flows:

Year 1  211.2 / 5.74 = 36.8
Year 2  217.5 / 5.88 = 37.0
Year 3  224.1 / 6.02 = 37.2
Year 4  230.8 / 6.17 = 37.4

Outlay: BRL 480m / 5.60 = EUR 85.7m at today's spot.

Discounting at 10%:

Year 1  36.8 x 0.909 = 33.5
Year 2  37.0 x 0.826 = 30.6
Year 3  37.2 x 0.751 = 27.9
Year 4  37.4 x 0.683 = 25.5
PV of inflows              117.5
Less outlay                (85.7)
NPV                        +31.8

The project has a positive net present value of about EUR 32 million, so on financial
grounds it should proceed. The euro cash flows are almost flat across the four years —
the 3% BRL growth is very nearly cancelled by the real's expected depreciation — so
essentially all of the value comes from the size of the annual flow rather than from any
growth in it. That makes the appraisal sensitive to the year-one figure and to the
inflation differential; if Brazilian inflation runs above 4.5% the euro flows shrink.

---

## R3 — Solenne (iii) E2b — 8 marks — MID
*(deliberate defect: MMH uses the BRL deposit rate, not the borrowing rate)*

Solenne is receiving BRL 179.5m in three months and wants the euro value fixed.

**Forward contract.** Sell the reais forward at 5.66:

179.5 / 5.66 = EUR 31.71m

**Money-market hedge.** The idea is to create a BRL liability now that the receipt will
settle, convert the proceeds to euros today, and hold euros for the three months.

Borrow reais at the BRL rate of 10% annual, so 2.5% for three months:

179.5 / 1.025 = BRL 175.1m borrowed today

Convert at spot 5.60:

175.1 / 5.60 = EUR 31.27m

Deposit euros at 2.0% annual, so 0.5% for three months:

31.27 x 1.005 = EUR 31.43m

**Comparison.** The forward delivers EUR 31.71m against EUR 31.43m from the money market —
about EUR 0.28m more. I recommend the forward contract.

It is also the simpler instrument: one contract with the bank, no borrowing facility to
arrange in Brazil and no euro deposit to place, which matters for a group that has never
run a central treasury. The forward does commit Solenne to deliver the reais, so if the
remittance slips or comes in short the company is left having to buy reais in the market
to settle.

---

## R4 — Solenne (iv) E1a — 6 marks — MID
*(deliberate defect: generic; never engages the NED's quoted objection)*

Establishing a group treasury at Lyon would bring several benefits.

Cash would be pooled across the four subsidiaries rather than sitting in separate accounts,
so surplus cash in one could fund a deficit in another instead of the group borrowing and
depositing at the same time and paying the spread on both. Borrowing centrally should also
secure finer margins, because the group borrows in larger size and presents a stronger
covenant than any single subsidiary. Netting intercompany balances would cut the number of
external currency transactions and the fees and spreads that go with them.

There would be a concentration of expertise. Currency and interest-rate hedging is
specialist work, and four desks each doing a little of it will do it less well than one
desk doing all of it. That matters now because the Brazilian exposure is a new type of risk
that none of the existing desks has handled.

Control and reporting would improve. A central function sets policy on what may be hedged
and with which instruments, and can see the group's net position rather than four gross
ones.

There are costs. Setting up the function requires staff, systems and premises, and there is
a transition period during which both structures run. The subsidiaries would lose autonomy
over their own cash and banking relationships, which may affect local banking
relationships they have built up.

On balance the Brazilian project is a reasonable trigger for the change, and I would
recommend the board proceed with establishing the function.

---

## R5 — Brecon (i) B1a — 12 marks — STRONG

Discount factors at 10%: 0.909, 0.826, 0.751, 0.683.

**Strong demand (p = 0.30):** 210, 230, 250, 270

210 x 0.909 = 190.9
230 x 0.826 = 190.1
250 x 0.751 = 187.8
270 x 0.683 = 184.4
PV = 753.2   less 500   NPV = +253.2

**Base case (p = 0.50):** 150, 160, 170, 180

150 x 0.909 = 136.4
160 x 0.826 = 132.2
170 x 0.751 = 127.7
180 x 0.683 = 122.9
PV = 519.2   less 500   NPV = +19.2

**Weak demand (p = 0.20):** 85, 90, 95, 100

85 x 0.909 = 77.3
90 x 0.826 = 74.4
95 x 0.751 = 71.4
100 x 0.683 = 68.3
PV = 291.4   less 500   NPV = -208.6

**Expected NPV:**

ENPV = 0.30 x 253.2 + 0.50 x 19.2 + 0.20 x (-208.6)
     = 76.0 + 9.6 - 41.7
     = +GBP 43.9m

**Probability of a negative NPV:** only the weak-demand scenario is negative, so 20%.

**Advice.** The expected NPV is positive at about GBP 44m, so on the decision rule the
project is acceptable — but the board should not read that as a comfortable margin, for
two reasons.

First, the base case is the most likely single outcome at 50% and it is only marginally
positive at GBP 19m on a GBP 500m commitment. That is a return of under 4% of the capital
committed, and it would take very little — a small slip in turbine availability, a modest
overrun on construction — to move it below zero.

Second, the ENPV is being carried by the strong-demand case. Take that scenario away and
the remaining two have a combined expected value that is firmly negative. The board is
therefore being asked to commit GBP 500m on the strength of a 30% outcome, with a 20%
chance of losing GBP 209m.

An expected value is an average over outcomes that will not happen. This project happens
once, and Brecon gets one draw. I would want the board to satisfy itself on the plausibility
of the strong-demand assumptions specifically, and to consider whether the downside is
survivable, before treating a positive ENPV as sufficient.

---

## R6 — Brecon (ii) B1b — 8 marks — MID
*(deliberate defect: VaR treated loosely; no committed recommendation)*

**(a) Likelihood of success and risk profile.**

The simulation gives a mean NPV of GBP 44m, which is close to the GBP 43.9m from the
scenario analysis, so the two approaches broadly agree on the central expectation. That is
reassuring — the scenario work was not wildly off.

The probability of a negative NPV is 22%, so roughly one run in five destroys value. Put
the other way, about 78% of the simulated outcomes are positive, which sounds like a
reasonable likelihood of success.

The standard deviation of GBP 60m is larger than the mean of GBP 44m. That tells us the
spread of outcomes is wide relative to the expected return, so the project is high-risk.
The simulation has an advantage over the three scenarios in that it lets the input
variables move continuously and in combination, rather than forcing them into three fixed
bundles, so it explores far more of the possible outcome space.

**(b) Value at Risk.**

The Value-at-Risk figure of GBP 52m at the 95% confidence level is a measure of the
downside. It tells the board how bad things could get in a poor outcome — there is a 5%
chance of a loss of at least GBP 52m on this project.

The board should use it as one input among several. It puts a number on the tail rather
than on the average, which the mean NPV does not do, and GBP 52m can be compared against
what the group could absorb without difficulty. It does not tell you what happens beyond
the 95% point, so the worst case is not bounded by it.

The board will need to weigh the positive expected NPV against this downside measure and
decide whether the risk profile is within its appetite before committing the capital.

---

## R7 — Aldebrino (i) E3a — 12 marks — WEAK
*(deliberate defects: buys futures instead of selling; 48 contracts not 96; no basis; no reconciliation)*

Aldebrino is borrowing EUR 48m so it needs to hedge against interest rates going up.

Number of contracts = 48,000,000 / 1,000,000 = 48 contracts.

The futures are priced at 95.55, which implies an interest rate of 100 - 95.55 = 4.45%.

I would buy 48 futures contracts to hedge the loan.

If the base rate rises to 5.0%, the company pays 5.0% + 0.5% margin = 5.5% on the loan.
Interest = 48,000,000 x 5.5% x 6/12 = EUR 1,320,000.

The futures price would fall to about 100 - 5.0 = 95.00. Bought at 95.55, so there is a
loss of 0.55 on the futures.

If the base rate falls to 3.2%, the company pays 3.7% on the loan, so interest is
48,000,000 x 3.7% x 6/12 = EUR 888,000, and the futures price rises to 96.80, giving a gain.

So the effective cost is around 4.45% to 5.5% depending on what happens to rates, which is
roughly the futures rate of 4.45% plus the margin of 0.5%, so about 4.95%.

The treasury should go ahead with the hedge because it removes the uncertainty about the
interest rate on the loan.

---

## R8 — Aldebrino (ii) E2a — 8 marks — WEAK
*(deliberate defect: named-but-not-described; almost no management content)*

Aldebrino faces three types of foreign exchange exposure.

The first is transaction exposure. This arises on the US dollar and pound sterling
receivables from its US and UK customers, which are settled 60-90 days after the sale.

The second is translation exposure. The US subsidiary's dollar net assets are retranslated
into euros at each year end for the consolidated balance sheet.

The third is economic exposure. A sustained strengthening of the euro against the dollar
would make Aldebrino's products less competitive against US rivals over the longer term.

These can be managed in different ways. Transaction exposure can be hedged using forward
contracts, futures, options or a money market hedge. Translation exposure can be managed by
matching assets and liabilities in the same currency. Economic exposure is harder to hedge
and is usually managed by diversifying operations.

The board should put hedging arrangements in place for these exposures.
