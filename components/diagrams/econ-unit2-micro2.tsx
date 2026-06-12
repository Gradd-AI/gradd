// ─── IB Economics Diagrams — Unit 2: Microeconomics (Part 2) ─────────────────
// Elasticity, Price Controls, Externalities, Lorenz Curve, Monopoly

import React from 'react';

const STROKE = 'var(--chat-text, #2c2825)';
const MUTED = 'var(--chat-muted, #5c5650)';
const BRAND = '#5aab7a';
const AMBER = '#c9903a';
const RED = '#c0392b';
const BLUE = '#2980b9';
const PURPLE = '#8e44ad';
const FONT = 'Georgia, serif';

function Axes({ width = 420, height = 340, xlabel = 'Quantity', ylabel = 'Price' }: any) {
  return (
    <>
      <line x1="60" y1="20" x2="60" y2={height} stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1={height} x2={width} y2={height} stroke={STROKE} strokeWidth="2" />
      <polygon points={`60,12 55,24 65,24`} fill={STROKE} />
      <polygon points={`${width + 8},${height} ${width - 4},${height - 5} ${width - 4},${height + 5}`} fill={STROKE} />
      <text x={width / 2 + 30} y={height + 36} fontSize="13" fill={STROKE} textAnchor="middle">{xlabel}</text>
      <text x="22" y={height / 2} fontSize="13" fill={STROKE} textAnchor="middle" transform={`rotate(-90,22,${height / 2})`}>{ylabel}</text>
    </>
  );
}

// ─── PED_ELASTIC_INELASTIC ────────────────────────────────────────────────────
export function PED_ELASTIC_INELASTIC() {
  return (
    <svg viewBox="0 0 540 424" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 540, fontFamily: FONT }}>
      <text x="270" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Price Elasticity of Demand — Elastic vs Inelastic</text>
      {/* Elastic — left panel */}
      <g transform="translate(0,0)">
        <Axes width={220} height={350} xlabel="Q" ylabel="P" />
        <line x1="80" y1="60" x2="210" y2="340" stroke={BLUE} strokeWidth="2.5" />
        <text x="186" y="348" fontSize="12" fill={BLUE}>D (elastic)</text>
        <text x="140" y="400" fontSize="11" fill={BLUE} textAnchor="middle">Relatively flat</text>
        <text x="140" y="414" fontSize="11" fill={MUTED} textAnchor="middle">PED {'>'} 1</text>
      </g>
      {/* Inelastic — right panel */}
      <g transform="translate(260,0)">
        <Axes width={220} height={350} xlabel="Q" ylabel="P" />
        <line x1="80" y1="60" x2="160" y2="340" stroke={RED} strokeWidth="2.5" />
        <text x="162" y="334" fontSize="12" fill={RED}>D (inelastic)</text>
        <text x="140" y="400" fontSize="11" fill={RED} textAnchor="middle">Relatively steep</text>
        <text x="140" y="414" fontSize="11" fill={MUTED} textAnchor="middle">PED {'<'} 1</text>
      </g>
    </svg>
  );
}

// ─── PED_PERFECTLY_ELASTIC ────────────────────────────────────────────────────
export function PED_PERFECTLY_ELASTIC() {
  return (
    <svg viewBox="0 0 460 408" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 460, fontFamily: FONT }}>
      <text x="230" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Perfectly Elastic Demand (PED = ∞)</text>
      <Axes width={420} height={350} />
      {/* Horizontal demand line */}
      <line x1="80" y1="180" x2="410" y2="180" stroke={BLUE} strokeWidth="2.5" />
      <text x="415" y="184" fontSize="13" fill={BLUE} fontWeight="bold">D</text>
      <line x1="60" y1="180" x2="80" y2="180" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="184" fontSize="12" fill={AMBER} textAnchor="end">P*</text>
      <text x="230" y="400" fontSize="11" fill={MUTED} textAnchor="middle">Any price above P*: Qd falls to zero. Consumers accept any quantity at P*.</text>
    </svg>
  );
}

// ─── PED_PERFECTLY_INELASTIC ──────────────────────────────────────────────────
export function PED_PERFECTLY_INELASTIC() {
  return (
    <svg viewBox="0 0 460 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 460, fontFamily: FONT }}>
      <text x="230" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Perfectly Inelastic Demand (PED = 0)</text>
      <Axes width={420} height={350} />
      {/* Vertical demand line */}
      <line x1="230" y1="30" x2="230" y2="350" stroke={BLUE} strokeWidth="2.5" />
      <text x="238" y="50" fontSize="13" fill={BLUE} fontWeight="bold">D</text>
      <text x="230" y="370" fontSize="12" fill={AMBER} textAnchor="middle">Q*</text>
      <text x="230" y="402" fontSize="11" fill={MUTED} textAnchor="middle">Quantity demanded does not change regardless of price. (e.g. life-saving medicine)</text>
    </svg>
  );
}

// ─── PRICE_CEILING ────────────────────────────────────────────────────────────
export function PRICE_CEILING() {
  return (
    <svg viewBox="0 0 500 446" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Price Ceiling (Maximum Price)</text>
      <Axes width={460} height={370} />
      <line x1="80" y1="60" x2="420" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="410" y="328" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      <line x1="80" y1="340" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="410" y="74" fontSize="14" fill={RED} fontWeight="bold">S</text>
      {/* Equilibrium */}
      <circle cx="250" cy="200" r="4" fill={STROKE} />
      <line x1="60" y1="200" x2="250" y2="200" stroke={STROKE} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <text x="52" y="204" fontSize="11" fill={MUTED} textAnchor="end">Pe</text>
      {/* Price ceiling — BELOW equilibrium */}
      <line x1="60" y1="270" x2="460" y2="270" stroke={AMBER} strokeWidth="2" strokeDasharray="8,4" />
      <text x="465" y="274" fontSize="12" fill={AMBER} fontWeight="bold">Pc</text>
      {/* Shortage — Qd > Qs at Pc */}
      <line x1="150" y1="270" x2="150" y2="370" stroke={BLUE} strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="330" y1="270" x2="330" y2="370" stroke={RED} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="152" y="383" fontSize="11" fill={RED} textAnchor="middle">Qs</text>
      <text x="332" y="383" fontSize="11" fill={BLUE} textAnchor="middle">Qd</text>
      {/* Shortage brace */}
      <line x1="150" y1="386" x2="330" y2="386" stroke={AMBER} strokeWidth="1.5" />
      <text x="240" y="420" fontSize="12" fill={AMBER} textAnchor="middle">← Shortage →</text>
      <text x="250" y="437" fontSize="11" fill={MUTED} textAnchor="middle">Pc must be set below Pe to be effective</text>
    </svg>
  );
}

// ─── PRICE_FLOOR ──────────────────────────────────────────────────────────────
export function PRICE_FLOOR() {
  return (
    <svg viewBox="0 0 500 446" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Price Floor (Minimum Price)</text>
      <Axes width={460} height={370} />
      <line x1="80" y1="60" x2="420" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="410" y="328" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      <line x1="80" y1="340" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="410" y="74" fontSize="14" fill={RED} fontWeight="bold">S</text>
      {/* Equilibrium */}
      <circle cx="250" cy="200" r="4" fill={STROKE} />
      <line x1="60" y1="200" x2="250" y2="200" stroke={STROKE} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <text x="52" y="204" fontSize="11" fill={MUTED} textAnchor="end">Pe</text>
      {/* Price floor — ABOVE equilibrium */}
      <line x1="60" y1="130" x2="460" y2="130" stroke={AMBER} strokeWidth="2" strokeDasharray="8,4" />
      <text x="465" y="134" fontSize="12" fill={AMBER} fontWeight="bold">Pf</text>
      {/* Surplus — Qs > Qd at Pf */}
      <line x1="160" y1="130" x2="160" y2="370" stroke={BLUE} strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="340" y1="130" x2="340" y2="370" stroke={RED} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="162" y="383" fontSize="11" fill={BLUE} textAnchor="middle">Qd</text>
      <text x="342" y="383" fontSize="11" fill={RED} textAnchor="middle">Qs</text>
      <line x1="160" y1="386" x2="340" y2="386" stroke={AMBER} strokeWidth="1.5" />
      <text x="250" y="420" fontSize="12" fill={AMBER} textAnchor="middle">← Surplus →</text>
      <text x="250" y="437" fontSize="11" fill={MUTED} textAnchor="middle">Pf must be set above Pe to be effective (e.g. minimum wage)</text>
    </svg>
  );
}

// ─── NEG_EXT_PRODUCTION ───────────────────────────────────────────────────────
export function NEG_EXT_PRODUCTION() {
  return (
    <svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Negative Externality of Production</text>
      <Axes width={460} height={370} xlabel="Quantity" ylabel="Price / Cost" />
      {/* Demand = MSB */}
      <line x1="80" y1="60" x2="420" y2="330" stroke={BLUE} strokeWidth="2.5" />
      <text x="425" y="318" fontSize="14" fill={BLUE} fontWeight="bold">MSB = D</text>
      {/* MPC (supply) — lower, market supply */}
      <line x1="80" y1="320" x2="400" y2="80" stroke={RED} strokeWidth="2.5" />
      <text x="405" y="92" fontSize="14" fill={RED} fontWeight="bold">MPC (S)</text>
      {/* MSC — above MPC (external costs added) */}
      <line x1="80" y1="240" x2="400" y2="40" stroke={PURPLE} strokeWidth="2.5" />
      <text x="405" y="52" fontSize="14" fill={PURPLE} fontWeight="bold">MSC</text>
      {/* Market equilibrium — MPC meets D */}
      <circle cx="248" cy="194" r="5" fill={RED} />
      <text x="255" y="188" fontSize="11" fill={RED} fontStyle="italic">Qm</text>
      <line x1="248" y1="194" x2="248" y2="370" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      {/* Socially optimal — MSC meets D */}
      <circle cx="194" cy="222" r="5" fill={PURPLE} />
      <text x="178" y="216" fontSize="11" fill={PURPLE} fontStyle="italic">Q*</text>
      <line x1="194" y1="222" x2="194" y2="370" stroke={PURPLE} strokeWidth="1" strokeDasharray="4,3" />
      {/* Welfare loss triangle */}
      <polygon points="194,222 248,194 248,222" fill={AMBER} opacity="0.4" />
      <text x="254" y="222" fontSize="11" fill={AMBER} textAnchor="middle">WL</text>
      <text x="215" y="390" fontSize="11" fill={PURPLE} textAnchor="middle">Q*</text>
      <text x="255" y="390" fontSize="11" fill={RED} textAnchor="middle">Qm</text>
      <text x="250" y="434" fontSize="11" fill={MUTED} textAnchor="middle">Qm {'>'} Q* — overproduction creates welfare loss. MSC {'>'} MSB.</text>
    </svg>
  );
}

// ─── NEG_EXT_CONSUMPTION ──────────────────────────────────────────────────────
export function NEG_EXT_CONSUMPTION() {
  return (
    <svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Negative Externality of Consumption</text>
      <Axes width={460} height={370} xlabel="Quantity" ylabel="Price / Cost" />
      {/* Supply = MSC */}
      <line x1="80" y1="330" x2="420" y2="70" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="82" fontSize="14" fill={RED} fontWeight="bold">MSC = S</text>
      {/* MPB (market demand — what consumers value privately) */}
      <line x1="80" y1="60" x2="420" y2="320" stroke={BLUE} strokeWidth="2.5" />
      <text x="425" y="308" fontSize="14" fill={BLUE} fontWeight="bold">MPB (D)</text>
      {/* MSB — below MPB */}
      <line x1="80" y1="120" x2="380" y2="330" stroke={PURPLE} strokeWidth="2.5" />
      <text x="383" y="342" fontSize="14" fill={PURPLE} fontWeight="bold">MSB</text>
      {/* Market Q */}
      <circle cx="250" cy="195" r="5" fill={BLUE} />
      <line x1="250" y1="195" x2="250" y2="370" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="255" y="388" fontSize="11" fill={BLUE}>Qm</text>
      {/* Socially optimal Q */}
      <circle cx="196" cy="228" r="5" fill={PURPLE} />
      <line x1="196" y1="228" x2="196" y2="370" stroke={PURPLE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="186" y="388" fontSize="11" fill={PURPLE}>Q*</text>
      {/* Welfare loss */}
      <polygon points="196,228 250,195 250,228" fill={AMBER} opacity="0.4" />
      <text x="254" y="230" fontSize="11" fill={AMBER} textAnchor="middle">WL</text>
      <text x="250" y="434" fontSize="11" fill={MUTED} textAnchor="middle">Qm {'>'} Q* — over-consumption. MSB {'<'} MSC at Qm. (e.g. demerit goods, alcohol)</text>
    </svg>
  );
}

// ─── POS_EXT_PRODUCTION ───────────────────────────────────────────────────────
export function POS_EXT_PRODUCTION() {
  return (
    <svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Positive Externality of Production</text>
      <Axes width={460} height={370} xlabel="Quantity" ylabel="Price / Cost" />
      <line x1="80" y1="60" x2="420" y2="330" stroke={BLUE} strokeWidth="2.5" />
      <text x="425" y="318" fontSize="14" fill={BLUE} fontWeight="bold">MSB = D</text>
      {/* MPC — higher cost (market) */}
      <line x1="80" y1="300" x2="400" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="405" y="72" fontSize="14" fill={RED} fontWeight="bold">MPC (S)</text>
      {/* MSC — below MPC (external benefits reduce net cost) */}
      <line x1="80" y1="360" x2="420" y2="100" stroke={BRAND} strokeWidth="2.5" />
      <text x="425" y="112" fontSize="14" fill={BRAND} fontWeight="bold">MSC</text>
      {/* Market Q — MPC meets D */}
      <circle cx="240" cy="200" r="5" fill={RED} />
      <line x1="240" y1="200" x2="240" y2="370" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="240" y="388" fontSize="11" fill={RED} textAnchor="middle">Qm</text>
      {/* Social optimum — MSC meets D */}
      <circle cx="295" cy="172" r="5" fill={BRAND} />
      <line x1="295" y1="172" x2="295" y2="370" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="295" y="388" fontSize="11" fill={BRAND} textAnchor="middle">Q*</text>
      {/* Welfare loss */}
      <polygon points="240,200 295,172 240,172" fill={AMBER} opacity="0.4" />
      <text x="250" y="434" fontSize="11" fill={MUTED} textAnchor="middle">Qm {'<'} Q* — underproduction. Welfare loss from unrealised gains.</text>
    </svg>
  );
}

// ─── POS_EXT_CONSUMPTION ──────────────────────────────────────────────────────
export function POS_EXT_CONSUMPTION() {
  return (
    <svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Positive Externality of Consumption</text>
      <Axes width={460} height={370} xlabel="Quantity" ylabel="Price / Cost" />
      <line x1="80" y1="330" x2="420" y2="70" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="82" fontSize="14" fill={RED} fontWeight="bold">MSC = S</text>
      {/* MPB */}
      <line x1="80" y1="60" x2="420" y2="320" stroke={BLUE} strokeWidth="2.5" />
      <text x="425" y="308" fontSize="14" fill={BLUE} fontWeight="bold">MPB (D)</text>
      {/* MSB — above MPB */}
      <line x1="80" y1="30" x2="420" y2="270" stroke={BRAND} strokeWidth="2.5" />
      <text x="425" y="258" fontSize="14" fill={BRAND} fontWeight="bold">MSB</text>
      {/* Market Q */}
      <circle cx="250" cy="195" r="5" fill={BLUE} />
      <line x1="250" y1="195" x2="250" y2="370" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="250" y="388" fontSize="11" fill={BLUE} textAnchor="middle">Qm</text>
      {/* Social optimum */}
      <circle cx="310" cy="160" r="5" fill={BRAND} />
      <line x1="310" y1="160" x2="310" y2="370" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="310" y="388" fontSize="11" fill={BRAND} textAnchor="middle">Q*</text>
      <polygon points="250,195 310,160 310,195" fill={AMBER} opacity="0.4" />
      <text x="250" y="434" fontSize="11" fill={MUTED} textAnchor="middle">Qm {'<'} Q* — under-consumption. Welfare loss. (e.g. merit goods, education, vaccines)</text>
    </svg>
  );
}

// ─── LORENZ_CURVE ─────────────────────────────────────────────────────────────
export function LORENZ_CURVE() {
  return (
    <svg viewBox="0 0 460 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 460, fontFamily: FONT }}>
      <text x="230" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Lorenz Curve and Gini Coefficient</text>
      {/* Axes */}
      <line x1="60" y1="20" x2="60" y2="370" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="370" x2="420" y2="370" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="428,370 416,365 416,375" fill={STROKE} />
      <text x="240" y="408" fontSize="12" fill={STROKE} textAnchor="middle">Cumulative % of Population</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Cumulative % of Income</text>
      {/* Line of perfect equality */}
      <line x1="60" y1="370" x2="420" y2="30" stroke={MUTED} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="406" y="24" fontSize="11" fill={MUTED}>Line of equality</text>
      {/* Lorenz curve */}
      <path d="M 60,370 Q 160,360 240,280 Q 340,180 420,30" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="310" y="250" fontSize="14" fill={BRAND} fontWeight="bold">Lorenz Curve</text>
      {/* Gini shading */}
      <path d="M 60,370 Q 160,360 240,280 Q 340,180 420,30 L 60,370" fill={AMBER} opacity="0.15" />
      {/* Gini label */}
      <text x="200" y="340" fontSize="11" fill={AMBER}>Gini = A / (A+B)</text>
      {/* Axis tick labels */}
      <text x="60" y="388" fontSize="11" fill={MUTED} textAnchor="middle">0%</text>
      <text x="240" y="388" fontSize="11" fill={MUTED} textAnchor="middle">50%</text>
      <text x="420" y="388" fontSize="11" fill={MUTED} textAnchor="middle">100%</text>
      <text x="44" y="374" fontSize="10" fill={MUTED} textAnchor="end">0%</text>
      <text x="44" y="204" fontSize="10" fill={MUTED} textAnchor="end">50%</text>
      <text x="44" y="34" fontSize="10" fill={MUTED} textAnchor="end">100%</text>
      <text x="230" y="430" fontSize="11" fill={MUTED} textAnchor="middle">The further the curve from the diagonal, the greater the inequality</text>
    </svg>
  );
}

// ─── MONOPOLY ─────────────────────────────────────────────────────────────────
export function MONOPOLY() {
  return (
    <svg viewBox="0 0 520 450" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Monopoly — Profit Maximisation and Deadweight Loss (HL)</text>
      <line x1="60" y1="20" x2="60" y2="380" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="380" x2="480" y2="380" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="488,380 476,375 476,385" fill={STROKE} />
      <text x="270" y="408" fontSize="12" fill={STROKE} textAnchor="middle">Quantity</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Price / Cost / Revenue</text>
      {/* AR = Demand */}
      <line x1="80" y1="60" x2="440" y2="360" stroke={BLUE} strokeWidth="2.5" />
      <text x="445" y="348" fontSize="14" fill={BLUE} fontWeight="bold">AR (D)</text>
      {/* MR — twice as steep */}
      <line x1="80" y1="60" x2="260" y2="360" stroke={PURPLE} strokeWidth="2" />
      <text x="265" y="348" fontSize="14" fill={PURPLE} fontWeight="bold">MR</text>
      {/* MC */}
      <line x1="80" y1="300" x2="440" y2="100" stroke={RED} strokeWidth="2" />
      <text x="445" y="112" fontSize="14" fill={RED} fontWeight="bold">MC</text>
      {/* AC — U-shaped approx */}
      <path d="M 80,280 Q 200,180 340,200 Q 400,210 440,230" fill="none" stroke={AMBER} strokeWidth="2" />
      <text x="445" y="242" fontSize="12" fill={AMBER} fontWeight="bold">AC</text>
      {/* Profit max: MR = MC at Qm */}
      <circle cx="178" cy="252" r="5" fill={PURPLE} />
      <line x1="178" y1="252" x2="178" y2="380" stroke={PURPLE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="178" y="396" fontSize="11" fill={PURPLE} textAnchor="middle">Qm</text>
      {/* Pm — price on AR at Qm */}
      <line x1="178" y1="210" x2="60" y2="210" stroke={PURPLE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="214" fontSize="11" fill={PURPLE} textAnchor="end">Pm</text>
      <circle cx="178" cy="210" r="4" fill={PURPLE} />
      {/* Competitive Q — MC = AR */}
      <circle cx="292" cy="178" r="4" fill={BRAND} />
      <line x1="292" y1="178" x2="292" y2="380" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="292" y="396" fontSize="11" fill={BRAND} textAnchor="middle">Qc</text>
      <line x1="292" y1="178" x2="60" y2="178" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="182" fontSize="11" fill={BRAND} textAnchor="end">Pc</text>
      {/* Deadweight loss */}
      <polygon points="178,210 292,178 178,252" fill={AMBER} opacity="0.35" />
      <text x="240" y="240" fontSize="11" fill={AMBER} textAnchor="middle">DWL</text>
      <text x="260" y="438" fontSize="11" fill={MUTED} textAnchor="middle">Monopolist produces Qm, charges Pm {'>'} Pc — deadweight loss triangle</text>
    </svg>
  );
}
