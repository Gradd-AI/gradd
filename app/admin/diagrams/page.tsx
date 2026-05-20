'use client';

import { DiagramRenderer, DIAGRAM_CODES } from '@/components/diagrams';

// ─── Diagram groups ───────────────────────────────────────────────────────────

const GROUPS = [
  {
    section: 'IB Economics',
    groups: [
      {
        label: 'Unit 1 — Introduction to Economics',
        codes: ['PPC_BASIC', 'PPC_GROWTH', 'PPC_MOVEMENT', 'CIRCULAR_FLOW'],
      },
      {
        label: 'Unit 2 — Microeconomics (Part 1)',
        codes: [
          'DEMAND_CURVE', 'DEMAND_SHIFT', 'SUPPLY_CURVE', 'SUPPLY_SHIFT',
          'MARKET_EQUILIBRIUM', 'EQUILIBRIUM_CHANGE',
          'CONSUMER_PRODUCER_SURPLUS', 'ALLOCATIVE_EFFICIENCY',
        ],
      },
      {
        label: 'Unit 2 — Microeconomics (Part 2)',
        codes: [
          'PED_ELASTIC_INELASTIC', 'PED_PERFECTLY_ELASTIC', 'PED_PERFECTLY_INELASTIC',
          'PRICE_CEILING', 'PRICE_FLOOR',
          'NEG_EXT_PRODUCTION', 'NEG_EXT_CONSUMPTION',
          'POS_EXT_PRODUCTION', 'POS_EXT_CONSUMPTION',
          'LORENZ_CURVE', 'MONOPOLY',
        ],
      },
      {
        label: 'Unit 3 — Macroeconomics',
        codes: [
          'BUSINESS_CYCLE',
          'AD_CURVE', 'AD_SHIFT',
          'SRAS_CURVE', 'SRAS_SHIFT',
          'LRAS_MONETARIST', 'AS_KEYNESIAN', 'LRAS_SHIFT',
          'MACRO_EQUILIBRIUM_SR', 'MACRO_EQUILIBRIUM_LR',
          'DEMAND_PULL_INFLATION', 'COST_PUSH_INFLATION',
          'PHILLIPS_CURVE_SR', 'PHILLIPS_CURVE_LR',
          'CROWDING_OUT', 'SUPPLY_SIDE_LRAS', 'UNEMPLOYMENT_MINIMUM_WAGE',
        ],
      },
      {
        label: 'Unit 4 — The Global Economy',
        codes: [
          'EXCHANGE_RATE_FLOATING', 'EXCHANGE_RATE_CHANGE',
          'EXCHANGE_RATE_FIXED', 'EXCHANGE_RATE_MANAGED',
          'TARIFF', 'IMPORT_QUOTA', 'J_CURVE', 'TERMS_OF_TRADE',
        ],
      },
    ],
  },
  {
    section: 'IB Business Management',
    groups: [
      {
        label: 'Business Management Tools',
        codes: [
          'BM_SWOT', 'BM_ANSOFF', 'BM_BCG', 'BM_DECISION_TREE',
          'BM_ORG_HIERARCHICAL', 'BM_ORG_FLAT',
          'BM_PRODUCT_LIFECYCLE', 'BM_POSITION_MAP',
          'BM_BREAKEVEN', 'BM_CASHFLOW',
          'BM_FORCE_FIELD', 'BM_GANTT',
          'BM_STOCK_CONTROL', 'BM_SCATTER_REGRESSION',
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLabel(code: string): string {
  return code
    .replace(/^BM_/, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,400&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: oklch(96.2% 0.012 78);
  color: oklch(18% 0.012 60);
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.audit-page {
  max-width: 1360px;
  margin: 0 auto;
  padding: 0 24px 80px;
}

.audit-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: oklch(96.2% 0.012 78);
  border-bottom: 1px solid oklch(86% 0.014 78);
  padding: 16px 24px;
  display: flex;
  align-items: baseline;
  gap: 16px;
}
.audit-header h1 {
  font-family: "Geist", ui-sans-serif, system-ui, sans-serif;
  font-size: 16px;
  font-weight: 600;
  color: oklch(18% 0.012 60);
}
.audit-header .meta {
  font-family: "Geist Mono", ui-monospace, monospace;
  font-size: 11px;
  color: oklch(54% 0.012 60);
  letter-spacing: 0.06em;
}

.audit-section-heading {
  font-family: "Fraunces", "Times New Roman", Georgia, serif;
  font-style: italic;
  font-size: 28px;
  font-weight: 400;
  color: oklch(22% 0.035 168);
  letter-spacing: -0.015em;
  padding: 48px 0 8px;
  border-bottom: 2px solid oklch(22% 0.035 168);
  margin-bottom: 0;
}

.audit-group-heading {
  font-family: "Geist Mono", ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: oklch(54% 0.012 60);
  padding: 32px 0 16px;
}

.audit-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
@media (max-width: 900px) {
  .audit-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .audit-grid { grid-template-columns: 1fr; }
}

.audit-cell {
  border: 1px solid oklch(86% 0.014 78);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.audit-cell-code {
  font-family: "Geist Mono", ui-monospace, monospace;
  font-size: 10.5px;
  color: oklch(54% 0.012 60);
  letter-spacing: 0.06em;
  padding: 10px 14px 0;
  line-height: 1;
}

.audit-cell-diagram {
  padding: 12px 16px;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.audit-cell-diagram > * {
  width: 100%;
  max-width: 100%;
  height: auto;
}

.audit-cell-label {
  padding: 8px 14px 12px;
  font-size: 12.5px;
  color: oklch(34% 0.012 60);
  border-top: 1px solid oklch(86% 0.014 78);
  background: oklch(93.5% 0.015 78);
  font-weight: 500;
}
`;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DiagramAudit() {
  const total = DIAGRAM_CODES.length;

  return (
    <div className="ib-session">
      <style>{CSS}</style>

      <header className="audit-header">
        <h1>Diagram Audit — {total} diagrams</h1>
        <span className="meta">
          {GROUPS[0].groups.reduce((s, g) => s + g.codes.length, 0)} IB Economics
          &nbsp;·&nbsp;
          {GROUPS[1].groups.reduce((s, g) => s + g.codes.length, 0)} IB Business Management
        </span>
      </header>

      <div className="audit-page">
        {GROUPS.map(({ section, groups }) => (
          <div key={section}>
            <h2 className="audit-section-heading">{section}</h2>

            {groups.map(({ label, codes }) => (
              <div key={label}>
                <div className="audit-group-heading">{label}</div>
                <div className="audit-grid">
                  {codes.map(code => {
                    return (
                      <div key={code} className="audit-cell">
                        <div className="audit-cell-code">{code}</div>
                        <div className="audit-cell-diagram">
                          <DiagramRenderer code={code} />
                        </div>
                        <div className="audit-cell-label">{toLabel(code)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
