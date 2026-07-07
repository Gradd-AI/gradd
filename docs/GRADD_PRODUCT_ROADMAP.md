# GRADD_PRODUCT_ROADMAP.md — Strategic Feature Roadmap

**Scope:** This is a *strategy* document, not a backlog. It sequences the major
product horizons and the moats that make Gradd defensible. It exists to keep
near-term decisions from foreclosing the horizons that follow. For sprint-level
work items, see `Gradd_Master_Backlog_v3_5.md`.

**Guardrail (read first):** Nothing below Horizon 1 is buildable now. The
roadmap's only near-term job is to stop Horizon 1 decisions from foreclosing
Horizons 2–3 — specifically through **data capture** and **product-neutral org
design**. The current *live* priority remains: **Meta Pixel → Facebook
campaign.** Everything here is downstream of that.

---

## HORIZON 1 — now → Q4 2026 — B2C proof

**Goal:** prove the B2C engine. APM subscribers plus real retention data.

**Sequence (locked):** APM → AFM → AAA. **ATX last, or skipped.**

**AFM is the next build.** Effort is roughly **40–50% of APM** because the
architecture ports whole — the work is a **content pipeline** plus **ONE new
build**:

- **Numeric-answer verification layer for calculation marking.**
  Two-part model:
  - **Code checks the number** — deterministic verification of the final
    calculated value.
  - **Model judges the workings** — LLM evaluates method, layout, and
    own-figure credit around that number.

**Standing requirement — never break this in schema changes:** capture *all*
data a future org dashboard will need. At minimum:

- attempt history
- weak areas
- drill completion
- mock scores

Every schema change from here forward must preserve these signals. This is the
single most important Horizon 1 constraint — it is what makes Horizons 2 and 3
possible without a rebuild.

---

## HORIZON 2 — 2027 — the org layer

**Built ONCE, product-neutral.** One org layer serves IB school coordinators
**and** ACCA employer training managers *identically*.

Components:

- `orgs` table
- seats
- admin roles
- invite flow
- admin dashboard: cohort progress, weak-area heatmaps, learner drill-down

**Design rule:** school licensing must **NOT** be built as an IB-only feature.
Model it as a generic org that both education and employer buyers consume the
same way.

**Wedge:** **ACCA employer licensing is the stronger wedge.** Firms already pay
for trainees' qualification, so the sale is a numeric ROI argument —
**resit-rate reduction** — not a net-new budget ask.

---

## HORIZON 3 — exam-readiness prediction

Per-learner **readiness score** computed from signals we already collect:

- miss counts
- completeness verdicts
- marking bands
- mock results

Two markets, one feature:

- **B2C:** urgency + retention.
- **B2B:** *the product itself* — who is at risk **before** the exam fee is
  wasted.

**No competitor has this.** It is the payoff for the Horizon 1 data-capture
guardrail.

---

## HORIZON 4 — multi-paper lifetime

An ACCA trainee sits **up to 13 papers over 3–5 years.**

- Cross-paper account spanning the full qualification.
- Employer pays **per-seat, per-year** (**€500+/seat** vs **€49/mo** B2C).
- **SSO + provisioning arrive HERE** — not before. Do not build enterprise
  identity plumbing earlier; it is wasted until the multi-paper lifetime exists
  to justify it.

---

## STRENGTH ADDITIONS — product moats

Sequenced opportunistically, not gated to a single horizon.

### 1. Examiner-report intelligence loop
Ingest every ACCA examiner report per sitting into the failure catalogue and
drills. Marketable as **per-sitting freshness** that no static competitor can
match.

### 2. Resit diagnostic wedge
Free tool: learner uploads their ACCA results breakdown → receives a targeted
resit plan. **Email capture at the wow moment.** Productises the resit ad angle
directly — with a **60% fail rate, the resit market *is* the market.**

### 3. CBE-fidelity workspace + pacing analytics
Evolve the mock runner toward **ACCA CBE-style response areas.** Add
**per-requirement timing analytics** with coached pacing fixes.

---

## Guardrail (restated)

Nothing here is buildable now. The roadmap's near-term job is **only** to stop
Horizon 1 decisions foreclosing Horizons 2–3 — through data capture and
product-neutral org design. **Current live priority remains: Meta Pixel →
Facebook campaign.**
