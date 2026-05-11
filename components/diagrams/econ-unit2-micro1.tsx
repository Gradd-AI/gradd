// ─── IB Economics Diagrams — Unit 2: Microeconomics (Part 1) ─────────────────
// Demand, Supply, Equilibrium, Surplus

import React from 'react';

const STROKE = 'var(--chat-text, #e8e0d0)';
const MUTED = 'var(--chat-muted, #9a9080)';
const BRAND = 'var(--brand, #2d5a3d)';
const AMBER = '#c9903a';
const RED = '#c0392b';
const BLUE = '#2980b9';
const FONT = 'Georgia, serif';

function Axes({ width = 420, height = 340, xlabel = 'Quantity', ylabel = 'Price' }) {
  return (
    <>
      <line x1="60" y1="20" x2="60" y2={height} stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1={height} x2={width} y2={height} stroke={STROKE} strokeWidth="2" />
      <polygon points={`60,12 55,24 65,24`} fill={STROKE} />
      <polygon points={`${width + 8},${height} ${width - 4},${height - 5} ${width - 4},${height + 5}`} fill={STROKE} />
      <text x={width / 2 + 30} y={height + 28} fontSize="13" fill={STROKE} textAnchor="middle">{xlabel}</text>
      <text x="16" y={height / 2} fontSize="13" fill={STROKE} textAnchor="middle" transform={`rotate(-90,16,${height / 2})`}>{ylabel}</text>
    </>
  );
}

// ─── DEMAND_CURVE ─────────────────────────────────────────────────────────────
export function DEMAND_CURVE() {
  return (
    <svg viewBox="0 0 460 390" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 460, fontFamily: FONT }}>
      <text x="230" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Demand Curve</text>
      <Axes width={420} height={350} />
      <line x1="80" y1="60" x2="400" y2="330" stroke={BLUE} strokeWidth="2.5" />
      <text x="390" y="315" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      <text x="230" y="380" fontSize="11" fill={MUTED} textAnchor="middle">As price falls, quantity demanded rises (inverse relationship)</text>
    </svg>
  );
}

// ─── DEMAND_SHIFT ─────────────────────────────────────────────────────────────
export function DEMAND_SHIFT() {
  return (
    <svg viewBox="0 0 500 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Shifts of the Demand Curve</text>
      <Axes width={460} height={360} />
      {/* Original D */}
      <line x1="100" y1="60" x2="380" y2="340" stroke={BLUE} strokeWidth="2" strokeDasharray="6,4" />
      <text x="368" y="328" fontSize="13" fill={BLUE} fontStyle="italic">D₁</text>
      {/* Rightward shift (increase) */}
      <line x1="200" y1="60" x2="450" y2="330" stroke={BRAND} strokeWidth="2.5" />
      <text x="440" y="318" fontSize="13" fill={BRAND} fontWeight="bold">D₂</text>
      {/* Leftward shift (decrease) */}
      <line x1="60" y1="100" x2="260" y2="340" stroke={RED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="248" y="328" fontSize="13" fill={RED} fontStyle="italic">D₃</text>
      {/* Arrows */}
      <path d="M 240,180 L 290,180" stroke={BRAND} strokeWidth="1.5" markerEnd="url(#arD)" />
      <text x="265" y="170" fontSize="10" fill={BRAND} textAnchor="middle">Increase</text>
      <path d="M 180,220 L 130,220" stroke={RED} strokeWidth="1.5" markerEnd="url(#arR)" />
      <text x="155" y="210" fontSize="10" fill={RED} textAnchor="middle">Decrease</text>
      <defs>
        <marker id="arD" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={BRAND} /></marker>
        <marker id="arR" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={RED} /></marker>
      </defs>
      <text x="250" y="395" fontSize="11" fill={MUTED} textAnchor="middle">Causes: income, tastes, substitutes, complements, expectations, number of consumers</text>
    </svg>
  );
}

// ─── SUPPLY_CURVE ─────────────────────────────────────────────────────────────
export function SUPPLY_CURVE() {
  return (
    <svg viewBox="0 0 460 390" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 460, fontFamily: FONT }}>
      <text x="230" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Supply Curve</text>
      <Axes width={420} height={350} />
      <line x1="80" y1="330" x2="400" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="390" y="74" fontSize="14" fill={RED} fontWeight="bold">S</text>
      <text x="230" y="380" fontSize="11" fill={MUTED} textAnchor="middle">As price rises, quantity supplied rises (positive relationship)</text>
    </svg>
  );
}

// ─── SUPPLY_SHIFT ─────────────────────────────────────────────────────────────
export function SUPPLY_SHIFT() {
  return (
    <svg viewBox="0 0 500 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Shifts of the Supply Curve</text>
      <Axes width={460} height={360} />
      {/* Original S */}
      <line x1="100" y1="340" x2="380" y2="60" stroke={RED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="368" y="72" fontSize="13" fill={RED} fontStyle="italic">S₁</text>
      {/* Rightward shift (increase in supply) */}
      <line x1="200" y1="340" x2="450" y2="70" stroke={BRAND} strokeWidth="2.5" />
      <text x="440" y="82" fontSize="13" fill={BRAND} fontWeight="bold">S₂</text>
      {/* Leftward shift (decrease) */}
      <line x1="62" y1="300" x2="270" y2="60" stroke={AMBER} strokeWidth="2" strokeDasharray="6,4" />
      <text x="258" y="72" fontSize="13" fill={AMBER} fontStyle="italic">S₃</text>
      {/* Arrows */}
      <path d="M 250,200 L 310,200" stroke={BRAND} strokeWidth="1.5" markerEnd="url(#arS)" />
      <text x="280" y="190" fontSize="10" fill={BRAND} textAnchor="middle">Increase</text>
      <path d="M 200,240 L 140,240" stroke={AMBER} strokeWidth="1.5" markerEnd="url(#arA)" />
      <text x="170" y="230" fontSize="10" fill={AMBER} textAnchor="middle">Decrease</text>
      <defs>
        <marker id="arS" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={BRAND} /></marker>
        <marker id="arA" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={AMBER} /></marker>
      </defs>
      <text x="250" y="395" fontSize="11" fill={MUTED} textAnchor="middle">Causes: factor costs, technology, taxes/subsidies, number of firms, expectations</text>
    </svg>
  );
}

// ─── MARKET_EQUILIBRIUM ───────────────────────────────────────────────────────
export function MARKET_EQUILIBRIUM() {
  return (
    <svg viewBox="0 0 480 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Market Equilibrium</text>
      <Axes width={440} height={360} />
      {/* Demand */}
      <line x1="80" y1="60" x2="420" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="410" y="328" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      {/* Supply */}
      <line x1="80" y1="340" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="410" y="74" fontSize="14" fill={RED} fontWeight="bold">S</text>
      {/* Equilibrium point */}
      <circle cx="250" cy="200" r="6" fill={AMBER} />
      <text x="262" y="194" fontSize="13" fill={AMBER} fontWeight="bold">E (P*, Q*)</text>
      {/* Dashed lines to axes */}
      <line x1="60" y1="200" x2="250" y2="200" stroke={AMBER} strokeWidth="1" strokeDasharray="5,3" />
      <line x1="250" y1="200" x2="250" y2="360" stroke={AMBER} strokeWidth="1" strokeDasharray="5,3" />
      {/* Axis labels */}
      <text x="52" y="204" fontSize="12" fill={AMBER} textAnchor="end">P*</text>
      <text x="250" y="378" fontSize="12" fill={AMBER} textAnchor="middle">Q*</text>
      <text x="240" y="400" fontSize="11" fill={MUTED} textAnchor="middle">At P*: Qd = Qs — market clears, no surplus or shortage</text>
    </svg>
  );
}

// ─── EQUILIBRIUM_CHANGE ───────────────────────────────────────────────────────
export function EQUILIBRIUM_CHANGE() {
  return (
    <svg viewBox="0 0 500 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Change in Equilibrium (Demand Increase Shown)</text>
      <Axes width={460} height={370} />
      {/* Original D */}
      <line x1="80" y1="60" x2="380" y2="340" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" opacity="0.6" />
      <text x="368" y="328" fontSize="12" fill={BLUE} fontStyle="italic">D₁</text>
      {/* New D */}
      <line x1="180" y1="60" x2="460" y2="330" stroke={BLUE} strokeWidth="2.5" />
      <text x="450" y="318" fontSize="13" fill={BLUE} fontWeight="bold">D₂</text>
      {/* Supply */}
      <line x1="80" y1="340" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="410" y="72" fontSize="14" fill={RED} fontWeight="bold">S</text>
      {/* Old equilibrium */}
      <circle cx="230" cy="200" r="5" fill={MUTED} />
      <text x="215" y="192" fontSize="12" fill={MUTED} fontStyle="italic">E₁</text>
      <line x1="60" y1="200" x2="230" y2="200" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <line x1="230" y1="200" x2="230" y2="370" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      {/* New equilibrium */}
      <circle cx="310" cy="150" r="6" fill={AMBER} />
      <text x="322" y="144" fontSize="12" fill={AMBER} fontWeight="bold">E₂</text>
      <line x1="60" y1="150" x2="310" y2="150" stroke={AMBER} strokeWidth="1" strokeDasharray="4,3" />
      <line x1="310" y1="150" x2="310" y2="370" stroke={AMBER} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="154" fontSize="11" fill={AMBER} textAnchor="end">P₂</text>
      <text x="52" y="204" fontSize="11" fill={MUTED} textAnchor="end">P₁</text>
      <text x="230" y="388" fontSize="11" fill={MUTED} textAnchor="middle">Q₁</text>
      <text x="310" y="388" fontSize="11" fill={AMBER} textAnchor="middle">Q₂</text>
      <text x="250" y="418" fontSize="11" fill={MUTED} textAnchor="middle">Increase in demand → higher price, higher quantity</text>
    </svg>
  );
}

// ─── CONSUMER_PRODUCER_SURPLUS ────────────────────────────────────────────────
export function CONSUMER_PRODUCER_SURPLUS() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Consumer and Producer Surplus</text>
      <Axes width={440} height={370} />
      {/* Demand */}
      <line x1="80" y1="60" x2="420" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="410" y="328" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      {/* Supply */}
      <line x1="80" y1="340" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="410" y="74" fontSize="14" fill={RED} fontWeight="bold">S</text>
      {/* Equilibrium */}
      <circle cx="250" cy="200" r="5" fill={STROKE} />
      {/* P* line */}
      <line x1="60" y1="200" x2="250" y2="200" stroke={STROKE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="12" fill={STROKE} textAnchor="end">P*</text>
      <line x1="250" y1="200" x2="250" y2="370" stroke={STROKE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="250" y="388" fontSize="12" fill={STROKE} textAnchor="middle">Q*</text>
      {/* Consumer surplus — triangle above P*, below D */}
      <polygon points="60,200 80,60 250,200" fill={BLUE} opacity="0.25" />
      <text x="130" y="170" fontSize="12" fill={BLUE} textAnchor="middle">Consumer</text>
      <text x="130" y="184" fontSize="12" fill={BLUE} textAnchor="middle">Surplus</text>
      {/* Producer surplus — triangle below P*, above S */}
      <polygon points="60,200 80,340 250,200" fill={RED} opacity="0.25" />
      <text x="130" y="295" fontSize="12" fill={RED} textAnchor="middle">Producer</text>
      <text x="130" y="309" fontSize="12" fill={RED} textAnchor="middle">Surplus</text>
      <text x="240" y="418" fontSize="11" fill={MUTED} textAnchor="middle">Social/Community surplus maximised at competitive equilibrium</text>
    </svg>
  );
}

// ─── ALLOCATIVE_EFFICIENCY ────────────────────────────────────────────────────
export function ALLOCATIVE_EFFICIENCY() {
  return (
    <svg viewBox="0 0 480 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Allocative Efficiency (MB = MC)</text>
      <Axes width={440} height={360} xlabel="Quantity" ylabel="Price / Cost" />
      {/* MB = Demand curve */}
      <line x1="80" y1="60" x2="420" y2="330" stroke={BLUE} strokeWidth="2.5" />
      <text x="430" y="318" fontSize="13" fill={BLUE} fontWeight="bold">MB (D)</text>
      {/* MC = Supply curve */}
      <line x1="80" y1="330" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="430" y="74" fontSize="13" fill={RED} fontWeight="bold">MC (S)</text>
      {/* Intersection */}
      <circle cx="250" cy="195" r="7" fill={AMBER} />
      <text x="265" y="189" fontSize="13" fill={AMBER} fontWeight="bold">MB = MC</text>
      <line x1="60" y1="195" x2="250" y2="195" stroke={AMBER} strokeWidth="1.2" strokeDasharray="5,3" />
      <line x1="250" y1="195" x2="250" y2="360" stroke={AMBER} strokeWidth="1.2" strokeDasharray="5,3" />
      <text x="52" y="199" fontSize="12" fill={AMBER} textAnchor="end">P*</text>
      <text x="250" y="378" fontSize="12" fill={AMBER} textAnchor="middle">Q*</text>
      <text x="240" y="400" fontSize="11" fill={MUTED} textAnchor="middle">At Q*: resources allocated to their highest valued use — social surplus maximised</text>
    </svg>
  );
}
