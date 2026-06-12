// ─── Gradd Diagram Library — Master Index ─────────────────────────────────────
// Version: 1.1 | Covers: IB Economics (47) + IB Business Management (17)
// Usage: import { getDiagram, DIAGRAM_CODES } from '@/components/diagrams/index'

export { PPC_BASIC, PPC_GROWTH, PPC_MOVEMENT, CIRCULAR_FLOW } from './econ-unit1';
export {
  DEMAND_CURVE, DEMAND_SHIFT, SUPPLY_CURVE, SUPPLY_SHIFT,
  MARKET_EQUILIBRIUM, EQUILIBRIUM_CHANGE, CONSUMER_PRODUCER_SURPLUS, ALLOCATIVE_EFFICIENCY,
} from './econ-unit2-micro1';
export {
  PED_ELASTIC_INELASTIC, PED_PERFECTLY_ELASTIC, PED_PERFECTLY_INELASTIC,
  PRICE_CEILING, PRICE_FLOOR,
  NEG_EXT_PRODUCTION, NEG_EXT_CONSUMPTION, POS_EXT_PRODUCTION, POS_EXT_CONSUMPTION,
  LORENZ_CURVE, MONOPOLY,
} from './econ-unit2-micro2';
export {
  BUSINESS_CYCLE, AD_CURVE, AD_SHIFT, SRAS_CURVE, SRAS_SHIFT,
  LRAS_MONETARIST, AS_KEYNESIAN, LRAS_SHIFT,
  MACRO_EQUILIBRIUM_SR, MACRO_EQUILIBRIUM_LR,
  DEMAND_PULL_INFLATION, COST_PUSH_INFLATION,
  PHILLIPS_CURVE_SR, PHILLIPS_CURVE_LR, CROWDING_OUT, SUPPLY_SIDE_LRAS,
  UNEMPLOYMENT_MINIMUM_WAGE,
} from './econ-unit3-macro';
export {
  EXCHANGE_RATE_FLOATING, EXCHANGE_RATE_CHANGE, EXCHANGE_RATE_FIXED, EXCHANGE_RATE_MANAGED,
  TARIFF, IMPORT_QUOTA, J_CURVE, TERMS_OF_TRADE,
} from './econ-unit4-global';
export {
  BM_SWOT, BM_ANSOFF, BM_BCG, BM_DECISION_TREE,
  BM_ORG_HIERARCHICAL, BM_ORG_FLAT,
  BM_PRODUCT_LIFECYCLE, BM_POSITION_MAP, BM_BREAKEVEN, BM_CASHFLOW,
  BM_FORCE_FIELD, BM_GANTT, BM_STOCK_CONTROL, BM_SCATTER_REGRESSION,
  BM_MOTIVATION_TAYLOR, BM_MOTIVATION_MASLOW, BM_MOTIVATION_HERZBERG,
} from './bm-diagrams';

import React from 'react';
import * as EconUnit1 from './econ-unit1';
import * as EconUnit2Micro1 from './econ-unit2-micro1';
import * as EconUnit2Micro2 from './econ-unit2-micro2';
import * as EconUnit3 from './econ-unit3-macro';
import * as EconUnit4 from './econ-unit4-global';
import * as BMDiagrams from './bm-diagrams';

// ─── All diagram components by signal code ────────────────────────────────────
const DIAGRAM_MAP: Record<string, React.FC<any>> = {
  // Unit 1 — Introduction to Economics
  PPC_BASIC: EconUnit1.PPC_BASIC,
  PPC_GROWTH: EconUnit1.PPC_GROWTH,
  PPC_MOVEMENT: EconUnit1.PPC_MOVEMENT,
  CIRCULAR_FLOW: EconUnit1.CIRCULAR_FLOW,

  // Unit 2 — Microeconomics (Part 1)
  DEMAND_CURVE: EconUnit2Micro1.DEMAND_CURVE,
  DEMAND_SHIFT: EconUnit2Micro1.DEMAND_SHIFT,
  SUPPLY_CURVE: EconUnit2Micro1.SUPPLY_CURVE,
  SUPPLY_SHIFT: EconUnit2Micro1.SUPPLY_SHIFT,
  MARKET_EQUILIBRIUM: EconUnit2Micro1.MARKET_EQUILIBRIUM,
  EQUILIBRIUM_CHANGE: EconUnit2Micro1.EQUILIBRIUM_CHANGE,
  CONSUMER_PRODUCER_SURPLUS: EconUnit2Micro1.CONSUMER_PRODUCER_SURPLUS,
  ALLOCATIVE_EFFICIENCY: EconUnit2Micro1.ALLOCATIVE_EFFICIENCY,

  // Unit 2 — Microeconomics (Part 2)
  PED_ELASTIC_INELASTIC: EconUnit2Micro2.PED_ELASTIC_INELASTIC,
  PED_PERFECTLY_ELASTIC: EconUnit2Micro2.PED_PERFECTLY_ELASTIC,
  PED_PERFECTLY_INELASTIC: EconUnit2Micro2.PED_PERFECTLY_INELASTIC,
  PRICE_CEILING: EconUnit2Micro2.PRICE_CEILING,
  PRICE_FLOOR: EconUnit2Micro2.PRICE_FLOOR,
  NEG_EXT_PRODUCTION: EconUnit2Micro2.NEG_EXT_PRODUCTION,
  NEG_EXT_CONSUMPTION: EconUnit2Micro2.NEG_EXT_CONSUMPTION,
  POS_EXT_PRODUCTION: EconUnit2Micro2.POS_EXT_PRODUCTION,
  POS_EXT_CONSUMPTION: EconUnit2Micro2.POS_EXT_CONSUMPTION,
  LORENZ_CURVE: EconUnit2Micro2.LORENZ_CURVE,
  MONOPOLY: EconUnit2Micro2.MONOPOLY,

  // Unit 3 — Macroeconomics
  BUSINESS_CYCLE: EconUnit3.BUSINESS_CYCLE,
  AD_CURVE: EconUnit3.AD_CURVE,
  AD_SHIFT: EconUnit3.AD_SHIFT,
  SRAS_CURVE: EconUnit3.SRAS_CURVE,
  SRAS_SHIFT: EconUnit3.SRAS_SHIFT,
  LRAS_MONETARIST: EconUnit3.LRAS_MONETARIST,
  AS_KEYNESIAN: EconUnit3.AS_KEYNESIAN,
  LRAS_SHIFT: EconUnit3.LRAS_SHIFT,
  MACRO_EQUILIBRIUM_SR: EconUnit3.MACRO_EQUILIBRIUM_SR,
  MACRO_EQUILIBRIUM_LR: EconUnit3.MACRO_EQUILIBRIUM_LR,
  DEMAND_PULL_INFLATION: EconUnit3.DEMAND_PULL_INFLATION,
  COST_PUSH_INFLATION: EconUnit3.COST_PUSH_INFLATION,
  PHILLIPS_CURVE_SR: EconUnit3.PHILLIPS_CURVE_SR,
  PHILLIPS_CURVE_LR: EconUnit3.PHILLIPS_CURVE_LR,
  CROWDING_OUT: EconUnit3.CROWDING_OUT,
  SUPPLY_SIDE_LRAS: EconUnit3.SUPPLY_SIDE_LRAS,
  UNEMPLOYMENT_MINIMUM_WAGE: EconUnit3.UNEMPLOYMENT_MINIMUM_WAGE,

  // Unit 4 — The Global Economy
  EXCHANGE_RATE_FLOATING: EconUnit4.EXCHANGE_RATE_FLOATING,
  EXCHANGE_RATE_CHANGE: EconUnit4.EXCHANGE_RATE_CHANGE,
  EXCHANGE_RATE_FIXED: EconUnit4.EXCHANGE_RATE_FIXED,
  EXCHANGE_RATE_MANAGED: EconUnit4.EXCHANGE_RATE_MANAGED,
  TARIFF: EconUnit4.TARIFF,
  IMPORT_QUOTA: EconUnit4.IMPORT_QUOTA,
  J_CURVE: EconUnit4.J_CURVE,
  TERMS_OF_TRADE: EconUnit4.TERMS_OF_TRADE,

  // IB Business Management
  BM_SWOT: BMDiagrams.BM_SWOT,
  BM_ANSOFF: BMDiagrams.BM_ANSOFF,
  BM_BCG: BMDiagrams.BM_BCG,
  BM_DECISION_TREE: BMDiagrams.BM_DECISION_TREE,
  BM_ORG_HIERARCHICAL: BMDiagrams.BM_ORG_HIERARCHICAL,
  BM_ORG_FLAT: BMDiagrams.BM_ORG_FLAT,
  BM_PRODUCT_LIFECYCLE: BMDiagrams.BM_PRODUCT_LIFECYCLE,
  BM_POSITION_MAP: BMDiagrams.BM_POSITION_MAP,
  BM_BREAKEVEN: BMDiagrams.BM_BREAKEVEN,
  BM_CASHFLOW: BMDiagrams.BM_CASHFLOW,
  BM_FORCE_FIELD: BMDiagrams.BM_FORCE_FIELD,
  BM_GANTT: BMDiagrams.BM_GANTT,
  BM_STOCK_CONTROL: BMDiagrams.BM_STOCK_CONTROL,
  BM_SCATTER_REGRESSION: BMDiagrams.BM_SCATTER_REGRESSION,
  BM_MOTIVATION_TAYLOR: BMDiagrams.BM_MOTIVATION_TAYLOR,
  BM_MOTIVATION_MASLOW: BMDiagrams.BM_MOTIVATION_MASLOW,
  BM_MOTIVATION_HERZBERG: BMDiagrams.BM_MOTIVATION_HERZBERG,
};

/**
 * Returns the diagram component for a given signal code.
 * Returns null if the code is not found.
 */
export function getDiagram(code: string): React.FC<any> | null {
  return DIAGRAM_MAP[code] ?? null;
}

/** All valid diagram codes — use for validation */
export const DIAGRAM_CODES = Object.keys(DIAGRAM_MAP);

/**
 * DiagramRenderer — renders a diagram from a signal code.
 * Wraps the SVG in a styled container matching the session UI.
 */
export function DiagramRenderer({ code, className }: { code: string; className?: string }) {
  const Component = getDiagram(code);
  if (!Component) return null;
  return (
    <div
      className={className}
      style={{
        margin: '12px 0',
        padding: '16px',
        background: 'var(--chat-surface, rgba(255,255,255,0.04))',
        borderRadius: 'var(--radius-sm, 8px)',
        border: '1px solid var(--chat-border, rgba(255,255,255,0.08))',
        maxWidth: 560,
      }}
    >
      <Component />
    </div>
  );
}
