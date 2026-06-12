// ─── IB Economics Diagrams — Unit 4: The Global Economy ─────────────────────
// Exchange Rates, Trade Protection, Terms of Trade, J-Curve

import React from 'react';

const STROKE = 'var(--chat-text, #2c2825)';
const MUTED = 'var(--chat-muted, #5c5650)';
const BRAND = '#5aab7a';
const AMBER = '#c9903a';
const RED = '#c0392b';
const BLUE = '#2980b9';
const PURPLE = '#8e44ad';
const FONT = 'Georgia, serif';

function Axes({ width = 420, height = 340, xlabel = 'Quantity', ylabel = 'Exchange Rate' }: any) {
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

// ─── EXCHANGE_RATE_FLOATING ───────────────────────────────────────────────────
export function EXCHANGE_RATE_FLOATING() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Floating Exchange Rate Determination</text>
      <Axes width={440} height={370} xlabel="Quantity of €" ylabel="Exchange Rate ($/€)" />
      {/* Demand for € — downward sloping */}
      <line x1="80" y1="60" x2="400" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="328" fontSize="14" fill={BLUE} fontWeight="bold">D (€)</text>
      {/* Supply of € — upward sloping */}
      <line x1="80" y1="340" x2="400" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="405" y="74" fontSize="14" fill={RED} fontWeight="bold">S (€)</text>
      {/* Equilibrium */}
      <circle cx="240" cy="200" r="6" fill={AMBER} />
      <line x1="60" y1="200" x2="240" y2="200" stroke={AMBER} strokeWidth="1.2" strokeDasharray="4,3" />
      <line x1="240" y1="200" x2="240" y2="370" stroke={AMBER} strokeWidth="1.2" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="13" fill={AMBER} textAnchor="end">ER*</text>
      <text x="240" y="388" fontSize="13" fill={AMBER} textAnchor="middle">Q*</text>
      <text x="240" y="422" fontSize="11" fill={MUTED} textAnchor="middle">Exchange rate determined by demand and supply for the currency in forex markets</text>
    </svg>
  );
}

// ─── EXCHANGE_RATE_CHANGE ─────────────────────────────────────────────────────
export function EXCHANGE_RATE_CHANGE() {
  return (
    <svg viewBox="0 0 500 444" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Currency Appreciation (Demand Increase)</text>
      <Axes width={460} height={370} xlabel="Quantity of €" ylabel="Exchange Rate ($/€)" />
      {/* Supply */}
      <line x1="80" y1="340" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="74" fontSize="14" fill={RED} fontWeight="bold">S (€)</text>
      {/* D1 */}
      <line x1="80" y1="60" x2="380" y2="330" stroke={BLUE} strokeWidth="2" strokeDasharray="5,3" />
      <text x="385" y="318" fontSize="12" fill={BLUE} fontStyle="italic">D₁</text>
      {/* D2 */}
      <line x1="180" y1="60" x2="450" y2="310" stroke={BRAND} strokeWidth="2.5" />
      <text x="455" y="298" fontSize="14" fill={BRAND} fontWeight="bold">D₂</text>
      {/* E1 */}
      <circle cx="230" cy="210" r="5" fill={BLUE} />
      <line x1="60" y1="210" x2="230" y2="210" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="214" fontSize="11" fill={BLUE} textAnchor="end">ER₁</text>
      {/* E2 */}
      <circle cx="306" cy="154" r="5" fill={BRAND} />
      <line x1="60" y1="154" x2="306" y2="154" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="158" fontSize="11" fill={BRAND} textAnchor="end">ER₂</text>
      <text x="250" y="422" fontSize="11" fill={MUTED} textAnchor="middle">Higher demand for € → appreciation (ER rises). Reverse for depreciation.</text>
      <text x="250" y="436" fontSize="11" fill={MUTED} textAnchor="middle">Causes: higher interest rates, stronger exports, foreign investment inflows</text>
    </svg>
  );
}

// ─── EXCHANGE_RATE_FIXED ──────────────────────────────────────────────────────
export function EXCHANGE_RATE_FIXED() {
  return (
    <svg viewBox="0 0 500 454" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Maintaining a Fixed Exchange Rate</text>
      <Axes width={460} height={380} xlabel="Quantity of Currency" ylabel="Exchange Rate" />
      {/* Supply */}
      <line x1="80" y1="350" x2="420" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="74" fontSize="14" fill={RED} fontWeight="bold">S</text>
      {/* Demand — shifted right (appreciation pressure) */}
      <line x1="180" y1="60" x2="450" y2="330" stroke={BLUE} strokeWidth="2.5" />
      <text x="455" y="318" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      {/* Free market rate */}
      <circle cx="310" cy="158" r="5" fill={MUTED} />
      <text x="318" y="140" fontSize="11" fill={MUTED}>Market rate</text>
      <line x1="60" y1="158" x2="310" y2="158" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      {/* Fixed rate — below free market */}
      <line x1="60" y1="220" x2="460" y2="220" stroke={AMBER} strokeWidth="2" strokeDasharray="8,4" />
      <text x="452" y="224" fontSize="12" fill={AMBER} fontWeight="bold">Fixed ER</text>
      {/* Excess demand at fixed rate */}
      <line x1="190" y1="220" x2="190" y2="380" stroke={RED} strokeWidth="1.5" strokeDasharray="4,3" />
      <line x1="350" y1="220" x2="350" y2="380" stroke={BLUE} strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="190" y="398" fontSize="11" fill={RED} textAnchor="middle">Qs</text>
      <text x="350" y="398" fontSize="11" fill={BLUE} textAnchor="middle">Qd</text>
      <text x="270" y="428" fontSize="11" fill={AMBER} textAnchor="middle">← Excess demand (CB must supply currency) →</text>
      <text x="250" y="446" fontSize="11" fill={MUTED} textAnchor="middle">Central bank intervenes — sells own currency to maintain fixed ER</text>
    </svg>
  );
}

// ─── EXCHANGE_RATE_MANAGED ────────────────────────────────────────────────────
export function EXCHANGE_RATE_MANAGED() {
  return (
    <svg viewBox="0 0 500 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Managed Exchange Rate (Crawling Peg / Managed Float)</text>
      <Axes width={460} height={370} xlabel="Quantity of Currency" ylabel="Exchange Rate" />
      {/* Supply */}
      <line x1="80" y1="340" x2="420" y2="70" stroke={RED} strokeWidth="2.5" />
      <text x="425" y="82" fontSize="14" fill={RED} fontWeight="bold">S</text>
      <line x1="80" y1="60" x2="400" y2="340" stroke={BLUE} strokeWidth="2.5" />
      <text x="405" y="328" fontSize="14" fill={BLUE} fontWeight="bold">D</text>
      {/* Free market rate */}
      <circle cx="240" cy="200" r="5" fill={MUTED} />
      <line x1="60" y1="200" x2="240" y2="200" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="11" fill={MUTED} textAnchor="end">ER*</text>
      {/* Upper band */}
      <line x1="60" y1="140" x2="460" y2="140" stroke={BRAND} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="65" y="135" fontSize="11" fill={BRAND}>Upper band</text>
      {/* Lower band */}
      <line x1="60" y1="260" x2="460" y2="260" stroke={PURPLE} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="65" y="255" fontSize="11" fill={PURPLE}>Lower band</text>
      {/* Shaded band */}
      <rect x="60" y="140" width="400" height="120" fill={AMBER} opacity="0.08" />
      <text x="260" y="215" fontSize="11" fill={AMBER} textAnchor="middle">Managed band — CB intervenes at boundaries</text>
      <text x="250" y="420" fontSize="11" fill={MUTED} textAnchor="middle">Currency allowed to fluctuate within a band. CB intervenes at limits.</text>
    </svg>
  );
}

// ─── TARIFF ───────────────────────────────────────────────────────────────────
export function TARIFF() {
  return (
    <svg viewBox="0 0 520 460" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Effect of a Tariff</text>
      <line x1="60" y1="20" x2="60" y2="390" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="390" x2="480" y2="390" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="488,390 476,385 476,395" fill={STROKE} />
      <text x="270" y="426" fontSize="12" fill={STROKE} textAnchor="middle">Quantity</text>
      <text x="22" y="210" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,210)">Price</text>
      {/* Domestic supply */}
      <line x1="80" y1="370" x2="380" y2="70" stroke={RED} strokeWidth="2.5" />
      <text x="385" y="82" fontSize="14" fill={RED} fontWeight="bold">Sd</text>
      {/* Domestic demand */}
      <line x1="80" y1="70" x2="440" y2="370" stroke={BLUE} strokeWidth="2.5" />
      <text x="445" y="358" fontSize="14" fill={BLUE} fontWeight="bold">Dd</text>
      {/* World price — horizontal */}
      <line x1="60" y1="270" x2="480" y2="270" stroke={MUTED} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="484" y="274" fontSize="11" fill={MUTED}>Pw</text>
      {/* Tariff price — above world price */}
      <line x1="60" y1="210" x2="480" y2="210" stroke={AMBER} strokeWidth="2" strokeDasharray="8,4" />
      <text x="484" y="214" fontSize="12" fill={AMBER} fontWeight="bold">Pw+t</text>
      {/* Q points at world price */}
      <line x1="148" y1="270" x2="148" y2="390" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      <line x1="362" y1="270" x2="362" y2="390" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      {/* Q points at tariff price */}
      <line x1="182" y1="210" x2="182" y2="390" stroke={AMBER} strokeWidth="1" strokeDasharray="4,3" />
      <line x1="318" y1="210" x2="318" y2="390" stroke={AMBER} strokeWidth="1" strokeDasharray="4,3" />
      <text x="148" y="408" fontSize="11" fill={MUTED} textAnchor="middle">Qs₁</text>
      <text x="182" y="408" fontSize="11" fill={AMBER} textAnchor="middle">Qs₂</text>
      <text x="318" y="408" fontSize="11" fill={AMBER} textAnchor="middle">Qd₂</text>
      <text x="362" y="408" fontSize="11" fill={MUTED} textAnchor="middle">Qd₁</text>
      {/* Govt revenue rectangle */}
      <rect x="182" y="210" width="136" height="60" fill={BRAND} opacity="0.2" />
      <text x="250" y="245" fontSize="10" fill={BRAND} textAnchor="middle">Govt revenue</text>
      {/* Deadweight loss triangles */}
      <polygon points="148,270 182,270 182,210" fill={AMBER} opacity="0.3" />
      <polygon points="318,270 362,270 318,210" fill={AMBER} opacity="0.3" />
      <text x="160" y="255" fontSize="9" fill={AMBER}>DWL</text>
      <text x="340" y="255" fontSize="9" fill={AMBER}>DWL</text>
      <text x="260" y="445" fontSize="11" fill={MUTED} textAnchor="middle">Tariff raises domestic price → less imports, higher domestic production, govt revenue, welfare loss</text>
    </svg>
  );
}

// ─── IMPORT_QUOTA ─────────────────────────────────────────────────────────────
export function IMPORT_QUOTA() {
  return (
    <svg viewBox="0 0 520 450" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Import Quota Effect</text>
      <line x1="60" y1="20" x2="60" y2="380" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="380" x2="480" y2="380" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="488,380 476,375 476,385" fill={STROKE} />
      <text x="270" y="406" fontSize="12" fill={STROKE} textAnchor="middle">Quantity</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Price</text>
      <line x1="80" y1="360" x2="380" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="385" y="72" fontSize="14" fill={RED} fontWeight="bold">Sd</text>
      <line x1="80" y1="60" x2="440" y2="360" stroke={BLUE} strokeWidth="2.5" />
      <text x="445" y="348" fontSize="14" fill={BLUE} fontWeight="bold">Dd</text>
      {/* World price */}
      <line x1="60" y1="260" x2="480" y2="260" stroke={MUTED} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="484" y="264" fontSize="11" fill={MUTED}>Pw</text>
      {/* S + quota — shifts Sd right by quota amount */}
      <line x1="180" y1="360" x2="460" y2="60" stroke={BRAND} strokeWidth="2.5" strokeDasharray="5,3" />
      <text x="460" y="72" fontSize="14" fill={BRAND} fontWeight="bold">Sd + Q</text>
      {/* New equilibrium */}
      <circle cx="300" cy="200" r="5" fill={BRAND} />
      <line x1="60" y1="200" x2="300" y2="200" stroke={BRAND} strokeWidth="1" strokeDasharray="4,3" />
      <text x="52" y="204" fontSize="11" fill={BRAND} textAnchor="end">Pq</text>
      <text x="260" y="430" fontSize="11" fill={MUTED} textAnchor="middle">Quota limits imports → domestic price rises above world price, welfare loss occurs</text>
    </svg>
  );
}

// ─── J_CURVE ──────────────────────────────────────────────────────────────────
export function J_CURVE() {
  return (
    <svg viewBox="0 0 480 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 480, fontFamily: FONT }}>
      <text x="240" y="16" fontSize="13" fill={MUTED} textAnchor="middle">J-Curve Effect (HL)</text>
      <line x1="60" y1="20" x2="60" y2="380" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="380" x2="440" y2="380" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="448,380 436,375 436,385" fill={STROKE} />
      <text x="250" y="408" fontSize="12" fill={STROKE} textAnchor="middle">Time</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Current Account Balance</text>
      {/* Zero line */}
      <line x1="60" y1="230" x2="440" y2="230" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" />
      <text x="50" y="234" fontSize="10" fill={MUTED} textAnchor="end">0</text>
      {/* J-curve shape */}
      <path d="M 80,190 L 140,190 Q 160,190 180,260 Q 210,320 240,340 Q 300,360 360,260 Q 400,200 430,140" fill="none" stroke={BRAND} strokeWidth="2.5" />
      {/* Depreciation point */}
      <line x1="150" y1="20" x2="150" y2="380" stroke={AMBER} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="152" y="40" fontSize="11" fill={AMBER}>Depreciation</text>
      {/* Short-run deterioration */}
      <text x="220" y="360" fontSize="10" fill={RED} textAnchor="middle">Short-run</text>
      <text x="220" y="372" fontSize="10" fill={RED} textAnchor="middle">deterioration</text>
      {/* Long-run improvement */}
      <text x="390" y="126" fontSize="10" fill={BRAND} textAnchor="middle">Long-run</text>
      <text x="390" y="138" fontSize="10" fill={BRAND} textAnchor="middle">improvement</text>
      <text x="240" y="424" fontSize="11" fill={MUTED} textAnchor="middle">After depreciation: CA worsens before improving as demand adjusts (Marshall-Lerner condition)</text>
    </svg>
  );
}

// ─── TERMS_OF_TRADE ───────────────────────────────────────────────────────────
export function TERMS_OF_TRADE() {
  return (
    <svg viewBox="0 0 500 400" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="16" fontSize="13" fill={MUTED} textAnchor="middle">Terms of Trade (HL)</text>
      {/* Formula box */}
      <rect x="60" y="40" width="380" height="70" rx="8" fill="none" stroke={BRAND} strokeWidth="1.5" />
      <text x="250" y="63" fontSize="12" fill={STROKE} textAnchor="middle" fontWeight="bold">ToT = Index of Export Prices</text>
      <text x="250" y="79" fontSize="12" fill={STROKE} textAnchor="middle" fontWeight="bold">÷ Index of Import Prices × 100</text>
      <text x="250" y="100" fontSize="12" fill={MUTED} textAnchor="middle">A rise in ToT = improvement (exports buy more imports)</text>
      {/* Timeline showing ToT movement */}
      <line x1="60" y1="200" x2="440" y2="200" stroke={STROKE} strokeWidth="2" />
      <polygon points="448,200 436,195 436,205" fill={STROKE} />
      <text x="255" y="380" fontSize="12" fill={STROKE} textAnchor="middle">Time</text>
      <line x1="60" y1="140" x2="60" y2="320" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,132 55,144 65,144" fill={STROKE} />
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">ToT Index</text>
      <text x="52" y="204" fontSize="11" fill={MUTED} textAnchor="end">100</text>
      {/* ToT line */}
      <path d="M 80,200 Q 180,180 260,160 Q 320,145 380,170 Q 420,185 440,180" fill="none" stroke={BRAND} strokeWidth="2.5" />
      {/* Improvement / deterioration labels */}
      <text x="270" y="148" fontSize="11" fill={BRAND}>Improvement ↑</text>
      <text x="390" y="190" fontSize="11" fill={RED}>Deterioration ↓</text>
      <text x="250" y="345" fontSize="11" fill={MUTED} textAnchor="middle">ToT {'>'} 100: favourable | ToT {'<'} 100: unfavourable</text>
      <text x="250" y="360" fontSize="11" fill={MUTED} textAnchor="middle">Primary commodity exporters face long-term ToT deterioration (Prebisch-Singer)</text>
    </svg>
  );
}
