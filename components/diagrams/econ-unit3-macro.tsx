// ─── IB Economics Diagrams — Unit 3: Macroeconomics ─────────────────────────
// AD/AS, Business Cycle, Inflation, Unemployment, Phillips Curve

import React from 'react';

const STROKE = 'var(--chat-text, #e8e0d0)';
const MUTED = 'var(--chat-muted, #9a9080)';
const BRAND = 'var(--brand, #2d5a3d)';
const AMBER = '#c9903a';
const RED = '#c0392b';
const BLUE = '#2980b9';
const PURPLE = '#8e44ad';
const FONT = 'Georgia, serif';

function Axes({ width = 420, height = 340, xlabel = 'Real GDP', ylabel = 'Price Level' }: any) {
  return (
    <>
      <line x1="60" y1="20" x2="60" y2={height} stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1={height} x2={width} y2={height} stroke={STROKE} strokeWidth="2" />
      <polygon points={`60,12 55,24 65,24`} fill={STROKE} />
      <polygon points={`${width + 8},${height} ${width - 4},${height - 5} ${width - 4},${height + 5}`} fill={STROKE} />
      <text x={width / 2 + 30} y={height + 26} fontSize="12" fill={STROKE} textAnchor="middle">{xlabel}</text>
      <text x="16" y={height / 2} fontSize="12" fill={STROKE} textAnchor="middle" transform={`rotate(-90,16,${height / 2})`}>{ylabel}</text>
    </>
  );
}

// ─── BUSINESS_CYCLE ───────────────────────────────────────────────────────────
export function BUSINESS_CYCLE() {
  return (
    <svg viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="16" fontSize="12" fill={MUTED} textAnchor="middle">The Business Cycle</text>
      <line x1="60" y1="20" x2="60" y2="370" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="370" x2="500" y2="370" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="508,370 496,365 496,375" fill={STROKE} />
      <text x="280" y="400" fontSize="12" fill={STROKE} textAnchor="middle">Time</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Real GDP</text>
      {/* Long-run trend */}
      <line x1="80" y1="300" x2="490" y2="100" stroke={MUTED} strokeWidth="1.5" strokeDasharray="8,4" />
      <text x="470" y="90" fontSize="11" fill={MUTED}>Long-run trend</text>
      {/* Business cycle wave */}
      <path d="M 80,300 Q 140,180 200,150 Q 260,120 300,200 Q 340,280 390,260 Q 430,240 480,160" fill="none" stroke={BRAND} strokeWidth="2.5" />
      {/* Peak */}
      <circle cx="200" cy="150" r="5" fill={AMBER} />
      <text x="205" y="138" fontSize="11" fill={AMBER}>Peak</text>
      {/* Trough */}
      <circle cx="340" cy="280" r="5" fill={RED} />
      <text x="348" y="295" fontSize="11" fill={RED}>Trough</text>
      {/* Recovery arrow */}
      <text x="430" y="152" fontSize="11" fill={BRAND}>Recovery</text>
      {/* Labels */}
      <text x="155" y="230" fontSize="10" fill={MUTED} textAnchor="middle">Contraction</text>
      <text x="370" y="240" fontSize="10" fill={MUTED} textAnchor="middle">Expansion</text>
      <text x="260" y="410" fontSize="11" fill={MUTED} textAnchor="middle">Short-term fluctuations around the long-run growth trend</text>
    </svg>
  );
}

// ─── AD_CURVE ─────────────────────────────────────────────────────────────────
export function AD_CURVE() {
  return (
    <svg viewBox="0 0 480 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Aggregate Demand (AD) Curve</text>
      <Axes width={440} height={360} />
      <path d="M 100,60 Q 250,130 400,340" fill="none" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="328" fontSize="14" fill={BLUE} fontWeight="bold">AD</text>
      <text x="240" y="395" fontSize="11" fill={MUTED} textAnchor="middle">AD = C + I + G + (X – M). Downward sloping: higher price level → lower real GDP demanded</text>
    </svg>
  );
}

// ─── AD_SHIFT ─────────────────────────────────────────────────────────────────
export function AD_SHIFT() {
  return (
    <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Shifts of the AD Curve</text>
      <Axes width={460} height={370} />
      <path d="M 100,60 Q 250,130 400,340" fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="405" y="328" fontSize="13" fill={MUTED} fontStyle="italic">AD₁</text>
      <path d="M 180,60 Q 330,120 460,320" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="455" y="308" fontSize="13" fill={BRAND} fontWeight="bold">AD₂ ↑</text>
      <path d="M 60,100 Q 170,160 310,340" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="315" y="328" fontSize="13" fill={RED} fontStyle="italic">AD₃ ↓</text>
      <text x="250" y="405" fontSize="11" fill={MUTED} textAnchor="middle">Causes: C, I, G, X–M change | Policy: fiscal (G, T) or monetary (interest rates)</text>
    </svg>
  );
}

// ─── SRAS_CURVE ───────────────────────────────────────────────────────────────
export function SRAS_CURVE() {
  return (
    <svg viewBox="0 0 480 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Short-Run Aggregate Supply (SRAS)</text>
      <Axes width={440} height={360} />
      <path d="M 80,340 Q 250,260 420,60" fill="none" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="74" fontSize="14" fill={RED} fontWeight="bold">SRAS</text>
      <text x="240" y="395" fontSize="11" fill={MUTED} textAnchor="middle">Upward sloping — higher price level incentivises more production in the short run</text>
    </svg>
  );
}

// ─── SRAS_SHIFT ───────────────────────────────────────────────────────────────
export function SRAS_SHIFT() {
  return (
    <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Shifts of the SRAS Curve</text>
      <Axes width={460} height={370} />
      <path d="M 80,340 Q 250,255 420,60" fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="425" y="74" fontSize="13" fill={MUTED} fontStyle="italic">SRAS₁</text>
      <path d="M 180,340 Q 340,250 460,80" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="455" y="92" fontSize="13" fill={BRAND} fontWeight="bold">SRAS₂ →</text>
      <path d="M 60,280 Q 180,210 330,60" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="335" y="74" fontSize="13" fill={RED} fontStyle="italic">SRAS₃ ←</text>
      <text x="250" y="405" fontSize="11" fill={MUTED} textAnchor="middle">Rightward: lower input costs, better tech | Leftward: higher wages, raw material costs</text>
    </svg>
  );
}

// ─── LRAS_MONETARIST ──────────────────────────────────────────────────────────
export function LRAS_MONETARIST() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Monetarist / New Classical LRAS</text>
      <Axes width={440} height={370} />
      <path d="M 80,340 Q 250,255 420,60" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5,3" opacity="0.5" />
      <text x="425" y="74" fontSize="12" fill={RED} opacity="0.6">SRAS</text>
      <path d="M 80,60 Q 250,120 400,340" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" opacity="0.5" />
      <text x="405" y="328" fontSize="12" fill={BLUE} opacity="0.6">AD</text>
      {/* LRAS — vertical */}
      <line x1="250" y1="30" x2="250" y2="370" stroke={BRAND} strokeWidth="3" />
      <text x="258" y="50" fontSize="14" fill={BRAND} fontWeight="bold">LRAS</text>
      {/* Yfe label */}
      <text x="250" y="388" fontSize="12" fill={BRAND} textAnchor="middle">Yfe</text>
      <text x="240" y="420" fontSize="11" fill={MUTED} textAnchor="middle">LRAS is vertical at full employment output (Yfe) — price level does not affect long-run output</text>
    </svg>
  );
}

// ─── AS_KEYNESIAN ─────────────────────────────────────────────────────────────
export function AS_KEYNESIAN() {
  return (
    <svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Keynesian Aggregate Supply Curve</text>
      <Axes width={460} height={380} />
      {/* Keynesian AS — flat then upward then near-vertical */}
      <path d="M 80,280 L 220,280 Q 300,280 340,220 Q 380,160 400,60" fill="none" stroke={RED} strokeWidth="2.5" />
      <text x="405" y="72" fontSize="13" fill={RED} fontWeight="bold">AS</text>
      {/* Zones */}
      <text x="150" y="260" fontSize="10" fill={MUTED} textAnchor="middle">Recessionary</text>
      <text x="150" y="272" fontSize="10" fill={MUTED} textAnchor="middle">zone</text>
      <text x="290" y="245" fontSize="10" fill={MUTED} textAnchor="middle">Intermediate</text>
      <text x="390" y="150" fontSize="10" fill={MUTED} textAnchor="middle">Full</text>
      <text x="390" y="162" fontSize="10" fill={MUTED} textAnchor="middle">employment</text>
      {/* Deflationary gap annotation */}
      <path d="M 80,240 Q 250,190 380,240" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" opacity="0.5" />
      <text x="230" y="230" fontSize="11" fill={BLUE} textAnchor="middle">AD (below full employment)</text>
      <text x="250" y="420" fontSize="11" fill={MUTED} textAnchor="middle">In Keynesian model, economy can be stuck below full employment with no self-correction</text>
    </svg>
  );
}

// ─── LRAS_SHIFT ───────────────────────────────────────────────────────────────
export function LRAS_SHIFT() {
  return (
    <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Outward Shift of LRAS (Long-run Growth)</text>
      <Axes width={460} height={370} />
      <line x1="200" y1="30" x2="200" y2="370" stroke={MUTED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="205" y="50" fontSize="12" fill={MUTED} fontStyle="italic">LRAS₁</text>
      <text x="200" y="388" fontSize="11" fill={MUTED} textAnchor="middle">Yfe₁</text>
      <line x1="340" y1="30" x2="340" y2="370" stroke={BRAND} strokeWidth="3" />
      <text x="348" y="50" fontSize="13" fill={BRAND} fontWeight="bold">LRAS₂</text>
      <text x="340" y="388" fontSize="11" fill={BRAND} textAnchor="middle">Yfe₂</text>
      <path d="M 250,200 L 310,200" stroke={AMBER} strokeWidth="2" markerEnd="url(#amL)" />
      <defs><marker id="amL" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={AMBER} /></marker></defs>
      <text x="280" y="190" fontSize="11" fill={AMBER} textAnchor="middle">Growth</text>
      <text x="250" y="408" fontSize="11" fill={MUTED} textAnchor="middle">Causes: better technology, more capital, improved institutions, skilled workforce</text>
    </svg>
  );
}

// ─── MACRO_EQUILIBRIUM_SR ─────────────────────────────────────────────────────
export function MACRO_EQUILIBRIUM_SR() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Short-run Macroeconomic Equilibrium</text>
      <Axes width={440} height={370} />
      <path d="M 80,60 Q 240,140 400,340" fill="none" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="328" fontSize="13" fill={BLUE} fontWeight="bold">AD</text>
      <path d="M 80,340 Q 250,255 420,60" fill="none" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="74" fontSize="13" fill={RED} fontWeight="bold">SRAS</text>
      <circle cx="250" cy="200" r="6" fill={AMBER} />
      <line x1="60" y1="200" x2="250" y2="200" stroke={AMBER} strokeWidth="1.2" strokeDasharray="4,3" />
      <line x1="250" y1="200" x2="250" y2="370" stroke={AMBER} strokeWidth="1.2" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="12" fill={AMBER} textAnchor="end">PL*</text>
      <text x="250" y="388" fontSize="12" fill={AMBER} textAnchor="middle">Y*</text>
      <text x="240" y="418" fontSize="11" fill={MUTED} textAnchor="middle">AD intersects SRAS — short-run equilibrium price level and output</text>
    </svg>
  );
}

// ─── MACRO_EQUILIBRIUM_LR ─────────────────────────────────────────────────────
export function MACRO_EQUILIBRIUM_LR() {
  return (
    <svg viewBox="0 0 500 450" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Long-run Equilibrium + Inflationary / Deflationary Gap</text>
      <Axes width={460} height={380} />
      <path d="M 80,60 Q 240,140 400,350" fill="none" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="338" fontSize="12" fill={BLUE} fontWeight="bold">AD</text>
      <path d="M 80,350 Q 250,260 420,70" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5,3" />
      <text x="425" y="82" fontSize="12" fill={RED}>SRAS</text>
      <line x1="260" y1="30" x2="260" y2="380" stroke={BRAND} strokeWidth="3" />
      <text x="268" y="50" fontSize="13" fill={BRAND} fontWeight="bold">LRAS</text>
      <text x="260" y="398" fontSize="12" fill={BRAND} textAnchor="middle">Yfe</text>
      {/* AD2 causing inflationary gap */}
      <path d="M 160,60 Q 310,130 450,330" fill="none" stroke={AMBER} strokeWidth="2" strokeDasharray="5,3" />
      <text x="455" y="318" fontSize="12" fill={AMBER}>AD₂</text>
      {/* Deflationary gap AD3 */}
      <path d="M 60,100 Q 190,180 340,350" fill="none" stroke={PURPLE} strokeWidth="2" strokeDasharray="5,3" />
      <text x="344" y="338" fontSize="12" fill={PURPLE}>AD₃</text>
      <text x="145" y="190" fontSize="10" fill={PURPLE} textAnchor="middle">← Deflationary gap</text>
      <text x="360" y="160" fontSize="10" fill={AMBER} textAnchor="middle">Inflationary gap →</text>
      <text x="250" y="435" fontSize="11" fill={MUTED} textAnchor="middle">Long-run equilibrium where AD = SRAS = LRAS at Yfe</text>
    </svg>
  );
}

// ─── DEMAND_PULL_INFLATION ────────────────────────────────────────────────────
export function DEMAND_PULL_INFLATION() {
  return (
    <svg viewBox="0 0 500 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Demand-Pull Inflation</text>
      <Axes width={460} height={370} />
      <path d="M 80,350 Q 250,260 420,70" fill="none" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="82" fontSize="12" fill={RED} fontWeight="bold">SRAS</text>
      {/* AD1 */}
      <path d="M 80,60 Q 240,140 400,340" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" />
      <text x="405" y="328" fontSize="12" fill={BLUE} fontStyle="italic">AD₁</text>
      {/* AD2 */}
      <path d="M 160,60 Q 310,130 450,310" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="455" y="298" fontSize="12" fill={BRAND} fontWeight="bold">AD₂</text>
      {/* E1 */}
      <circle cx="240" cy="200" r="5" fill={BLUE} />
      <line x1="60" y1="200" x2="240" y2="200" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="11" fill={BLUE} textAnchor="end">PL₁</text>
      <line x1="240" y1="200" x2="240" y2="370" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="240" y="388" fontSize="11" fill={BLUE} textAnchor="middle">Y₁</text>
      {/* E2 */}
      <circle cx="318" cy="152" r="5" fill={BRAND} />
      <line x1="60" y1="152" x2="318" y2="152" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="156" fontSize="11" fill={BRAND} textAnchor="end">PL₂</text>
      <line x1="318" y1="152" x2="318" y2="370" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="318" y="388" fontSize="11" fill={BRAND} textAnchor="middle">Y₂</text>
      <text x="250" y="418" fontSize="11" fill={MUTED} textAnchor="middle">AD rises → price level and real output both increase</text>
    </svg>
  );
}

// ─── COST_PUSH_INFLATION ──────────────────────────────────────────────────────
export function COST_PUSH_INFLATION() {
  return (
    <svg viewBox="0 0 500 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Cost-Push Inflation</text>
      <Axes width={460} height={370} />
      <path d="M 80,60 Q 240,140 400,340" fill="none" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="328" fontSize="12" fill={BLUE} fontWeight="bold">AD</text>
      {/* SRAS1 */}
      <path d="M 180,350 Q 330,255 450,70" fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="5,3" />
      <text x="455" y="82" fontSize="12" fill={MUTED} fontStyle="italic">SRAS₁</text>
      {/* SRAS2 — shifts left (costs rise) */}
      <path d="M 80,300 Q 230,215 380,60" fill="none" stroke={RED} strokeWidth="2.5" />
      <text x="385" y="72" fontSize="12" fill={RED} fontWeight="bold">SRAS₂</text>
      {/* E1 */}
      <circle cx="310" cy="190" r="5" fill={MUTED} />
      <line x1="60" y1="190" x2="310" y2="190" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="194" fontSize="11" fill={MUTED} textAnchor="end">PL₁</text>
      <line x1="310" y1="190" x2="310" y2="370" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="310" y="388" fontSize="11" fill={MUTED} textAnchor="middle">Y₁</text>
      {/* E2 */}
      <circle cx="216" cy="244" r="5" fill={RED} />
      <line x1="60" y1="244" x2="216" y2="244" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="248" fontSize="11" fill={RED} textAnchor="end">PL₂</text>
      <line x1="216" y1="244" x2="216" y2="370" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="216" y="388" fontSize="11" fill={RED} textAnchor="middle">Y₂</text>
      <text x="250" y="418" fontSize="11" fill={MUTED} textAnchor="middle">SRAS shifts left → higher price level, lower output (stagflation)</text>
    </svg>
  );
}

// ─── PHILLIPS_CURVE_SR ────────────────────────────────────────────────────────
export function PHILLIPS_CURVE_SR() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Short-run Phillips Curve (HL)</text>
      <line x1="60" y1="20" x2="60" y2="370" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="370" x2="440" y2="370" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="448,370 436,365 436,375" fill={STROKE} />
      <text x="250" y="400" fontSize="12" fill={STROKE} textAnchor="middle">Unemployment Rate (%)</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Inflation Rate (%)</text>
      {/* SRPC curve */}
      <path d="M 100,60 Q 200,150 380,340" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="385" y="328" fontSize="13" fill={BRAND} fontWeight="bold">SRPC</text>
      {/* Points */}
      <circle cx="160" cy="108" r="5" fill={AMBER} />
      <text x="168" y="104" fontSize="11" fill={AMBER}>High inflation,</text>
      <text x="168" y="116" fontSize="11" fill={AMBER}>Low unemployment</text>
      <circle cx="310" cy="254" r="5" fill={BLUE} />
      <text x="318" y="250" fontSize="11" fill={BLUE}>Low inflation,</text>
      <text x="318" y="262" fontSize="11" fill={BLUE}>High unemployment</text>
      <text x="240" y="420" fontSize="11" fill={MUTED} textAnchor="middle">Trade-off: policymakers choose a point on the SRPC</text>
    </svg>
  );
}

// ─── PHILLIPS_CURVE_LR ────────────────────────────────────────────────────────
export function PHILLIPS_CURVE_LR() {
  return (
    <svg viewBox="0 0 500 450" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Long-run Phillips Curve (HL)</text>
      <line x1="60" y1="20" x2="60" y2="380" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="380" x2="460" y2="380" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="468,380 456,375 456,385" fill={STROKE} />
      <text x="260" y="410" fontSize="12" fill={STROKE} textAnchor="middle">Unemployment Rate (%)</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Inflation Rate (%)</text>
      {/* SRPC1 */}
      <path d="M 100,60 Q 200,160 380,360" fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="5,3" />
      <text x="385" y="348" fontSize="11" fill={MUTED} fontStyle="italic">SRPC₁</text>
      {/* SRPC2 — shifted right */}
      <path d="M 200,60 Q 300,160 450,340" fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="5,3" />
      <text x="455" y="328" fontSize="11" fill={MUTED} fontStyle="italic">SRPC₂</text>
      {/* LRPC — vertical at NRU */}
      <line x1="260" y1="30" x2="260" y2="380" stroke={BRAND} strokeWidth="3" />
      <text x="268" y="50" fontSize="13" fill={BRAND} fontWeight="bold">LRPC</text>
      <text x="260" y="398" fontSize="12" fill={BRAND} textAnchor="middle">NRU</text>
      {/* Expectations arrows */}
      <path d="M 220,180 Q 240,200 258,180" fill="none" stroke={AMBER} strokeWidth="1.5" markerEnd="url(#amPC)" strokeDasharray="4,3" />
      <defs><marker id="amPC" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={AMBER} /></marker></defs>
      <text x="240" y="440" fontSize="11" fill={MUTED} textAnchor="middle">In the long run: no trade-off — LRPC vertical at the Natural Rate of Unemployment</text>
    </svg>
  );
}

// ─── CROWDING_OUT ─────────────────────────────────────────────────────────────
export function CROWDING_OUT() {
  return (
    <svg viewBox="0 0 500 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Crowding-Out Effect (HL)</text>
      <line x1="60" y1="20" x2="60" y2="380" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="380" x2="460" y2="380" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="468,380 456,375 456,385" fill={STROKE} />
      <text x="260" y="408" fontSize="12" fill={STROKE} textAnchor="middle">Quantity of Loanable Funds</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Real Interest Rate</text>
      {/* Supply of loanable funds — upward */}
      <line x1="80" y1="340" x2="420" y2="60" stroke={BRAND} strokeWidth="2.5" />
      <text x="425" y="72" fontSize="12" fill={BRAND} fontWeight="bold">S</text>
      {/* Original demand D1 */}
      <line x1="80" y1="60" x2="380" y2="360" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" />
      <text x="385" y="348" fontSize="12" fill={BLUE} fontStyle="italic">D₁</text>
      {/* Government borrows — D shifts right to D2 */}
      <line x1="160" y1="60" x2="440" y2="340" stroke={RED} strokeWidth="2.5" />
      <text x="445" y="328" fontSize="12" fill={RED} fontWeight="bold">D₂</text>
      {/* E1 */}
      <circle cx="230" cy="210" r="5" fill={BLUE} />
      <line x1="60" y1="210" x2="230" y2="210" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="214" fontSize="11" fill={BLUE} textAnchor="end">r₁</text>
      {/* E2 */}
      <circle cx="290" cy="158" r="5" fill={RED} />
      <line x1="60" y1="158" x2="290" y2="158" stroke={RED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="162" fontSize="11" fill={RED} textAnchor="end">r₂</text>
      <text x="250" y="425" fontSize="11" fill={MUTED} textAnchor="middle">Govt borrowing raises interest rates → private investment is crowded out</text>
    </svg>
  );
}

// ─── SUPPLY_SIDE_LRAS ─────────────────────────────────────────────────────────
export function SUPPLY_SIDE_LRAS() {
  return (
    <svg viewBox="0 0 500 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Supply-Side Policies — Effect on LRAS</text>
      <Axes width={460} height={370} />
      <path d="M 80,60 Q 240,140 400,340" fill="none" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" opacity="0.6" />
      <text x="405" y="328" fontSize="12" fill={BLUE} opacity="0.6">AD</text>
      <path d="M 80,340 Q 250,255 420,70" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="5,3" opacity="0.6" />
      <text x="425" y="82" fontSize="12" fill={RED} opacity="0.6">SRAS</text>
      <line x1="220" y1="30" x2="220" y2="370" stroke={MUTED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="228" y="50" fontSize="12" fill={MUTED} fontStyle="italic">LRAS₁</text>
      <text x="220" y="388" fontSize="11" fill={MUTED} textAnchor="middle">Yfe₁</text>
      <line x1="360" y1="30" x2="360" y2="370" stroke={BRAND} strokeWidth="3" />
      <text x="368" y="50" fontSize="13" fill={BRAND} fontWeight="bold">LRAS₂</text>
      <text x="360" y="388" fontSize="11" fill={BRAND} textAnchor="middle">Yfe₂</text>
      <path d="M 265,200 L 330,200" stroke={AMBER} strokeWidth="2" markerEnd="url(#amSS)" />
      <defs><marker id="amSS" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={AMBER} /></marker></defs>
      <text x="298" y="190" fontSize="11" fill={AMBER} textAnchor="middle">Supply-side</text>
      <text x="250" y="418" fontSize="11" fill={MUTED} textAnchor="middle">Education, privatisation, deregulation → expand productive capacity</text>
    </svg>
  );
}

// ─── UNEMPLOYMENT_MINIMUM_WAGE ─────────────────────────────────────────────────
export function UNEMPLOYMENT_MINIMUM_WAGE() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="12" fill={MUTED} textAnchor="middle">Minimum Wage and Unemployment</text>
      <line x1="60" y1="20" x2="60" y2="370" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="370" x2="440" y2="370" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="448,370 436,365 436,375" fill={STROKE} />
      <text x="250" y="400" fontSize="12" fill={STROKE} textAnchor="middle">Quantity of Labour</text>
      <text x="16" y="200" fontSize="12" fill={STROKE} textAnchor="middle" transform="rotate(-90,16,200)">Wage Rate</text>
      {/* Labour demand */}
      <line x1="80" y1="60" x2="400" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="328" fontSize="12" fill={BLUE} fontWeight="bold">D (Labour)</text>
      {/* Labour supply */}
      <line x1="80" y1="340" x2="400" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="405" y="74" fontSize="12" fill={RED} fontWeight="bold">S (Labour)</text>
      {/* Equilibrium wage */}
      <circle cx="240" cy="200" r="4" fill={MUTED} />
      <line x1="60" y1="200" x2="240" y2="200" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="11" fill={MUTED} textAnchor="end">We</text>
      {/* Minimum wage — above equilibrium */}
      <line x1="60" y1="140" x2="440" y2="140" stroke={AMBER} strokeWidth="2" strokeDasharray="8,4" />
      <text x="445" y="144" fontSize="12" fill={AMBER} fontWeight="bold">Wm</text>
      {/* Qd of labour at Wm */}
      <line x1="180" y1="140" x2="180" y2="370" stroke={BLUE} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="180" y="388" fontSize="11" fill={BLUE} textAnchor="middle">Qd</text>
      {/* Qs of labour at Wm */}
      <line x1="300" y1="140" x2="300" y2="370" stroke={RED} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="300" y="388" fontSize="11" fill={RED} textAnchor="middle">Qs</text>
      <line x1="180" y1="358" x2="300" y2="358" stroke={AMBER} strokeWidth="1.5" />
      <text x="240" y="415" fontSize="12" fill={AMBER} textAnchor="middle">← Unemployment (Qs – Qd) →</text>
    </svg>
  );
}
