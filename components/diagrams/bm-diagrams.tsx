// ─── IB Business Management Diagrams ─────────────────────────────────────────
// SWOT, Ansoff, BCG, Decision Tree, Org Charts, Product Lifecycle, etc.

import React from 'react';

const STROKE = 'var(--chat-text, #2c2825)';
const MUTED = 'var(--chat-muted, #5c5650)';
const BRAND = '#5aab7a';
const AMBER = '#c9903a';
const RED = '#c0392b';
const BLUE = '#2980b9';
const PURPLE = '#8e44ad';
const FONT = 'Georgia, serif';
const BG = 'transparent';

// ─── BM_SWOT ──────────────────────────────────────────────────────────────────
export function BM_SWOT() {
  const cells = [
    { x: 60, y: 60, w: 190, h: 150, label: 'S — Strengths', sub: 'Internal, positive', color: BRAND },
    { x: 260, y: 60, w: 190, h: 150, label: 'W — Weaknesses', sub: 'Internal, negative', color: RED },
    { x: 60, y: 220, w: 190, h: 150, label: 'O — Opportunities', sub: 'External, positive', color: BLUE },
    { x: 260, y: 220, w: 190, h: 150, label: 'T — Threats', sub: 'External, negative', color: AMBER },
  ];
  return (
    <svg viewBox="0 0 510 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 510, fontFamily: FONT }}>
      <text x="255" y="30" fontSize="13" fill={MUTED} textAnchor="middle" fontWeight="bold">SWOT Analysis</text>
      {/* Axis labels */}
      <text x="155" y="52" fontSize="11" fill={STROKE} textAnchor="middle">INTERNAL</text>
      <text x="355" y="52" fontSize="11" fill={STROKE} textAnchor="middle">INTERNAL</text>
      <text x="30" y="145" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,30,145)">HELPFUL</text>
      <text x="30" y="300" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,30,300)">HARMFUL</text>
      <text x="155" y="388" fontSize="10" fill={MUTED} textAnchor="middle">Strengths / Weaknesses</text>
      <text x="355" y="388" fontSize="10" fill={MUTED} textAnchor="middle">Opportunities / Threats</text>
      {cells.map((c, i) => (
        <g key={i}>
          <rect x={c.x} y={c.y} width={c.w} height={c.h} rx="4" fill={c.color} opacity="0.12" stroke={c.color} strokeWidth="1.5" />
          <text x={c.x + c.w / 2} y={c.y + 55} fontSize="13" fill={c.color} textAnchor="middle" fontWeight="bold">{c.label}</text>
          <text x={c.x + c.w / 2} y={c.y + 74} fontSize="10" fill={MUTED} textAnchor="middle">{c.sub}</text>
          <text x={c.x + 12} y={c.y + 100} fontSize="10" fill={STROKE}>• e.g. _______________</text>
          <text x={c.x + 12} y={c.y + 118} fontSize="10" fill={STROKE}>• e.g. _______________</text>
          <text x={c.x + 12} y={c.y + 136} fontSize="10" fill={STROKE}>• e.g. _______________</text>
        </g>
      ))}
      <text x="255" y="400" fontSize="10" fill={MUTED} textAnchor="middle">SWOT feeds into TOWS matrix — match S with O (grow), address W with T (defend)</text>
    </svg>
  );
}

// ─── BM_ANSOFF ────────────────────────────────────────────────────────────────
export function BM_ANSOFF() {
  return (
    <svg viewBox="0 0 520 440" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="22" fontSize="13" fill={MUTED} textAnchor="middle" fontWeight="bold">Ansoff Matrix</text>
      {/* Headers */}
      <text x="190" y="45" fontSize="11" fill={STROKE} textAnchor="middle">EXISTING MARKETS</text>
      <text x="390" y="45" fontSize="11" fill={STROKE} textAnchor="middle">NEW MARKETS</text>
      <text x="40" y="165" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,40,165)">EXISTING PRODUCTS</text>
      <text x="40" y="330" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,40,330)">NEW PRODUCTS</text>
      {/* Cell 1 — Market Penetration */}
      <rect x="80" y="60" width="210" height="160" rx="4" fill={BRAND} opacity="0.15" stroke={BRAND} strokeWidth="1.5" />
      <text x="185" y="115" fontSize="13" fill={BRAND} textAnchor="middle" fontWeight="bold">Market</text>
      <text x="185" y="132" fontSize="13" fill={BRAND} textAnchor="middle" fontWeight="bold">Penetration</text>
      <text x="185" y="155" fontSize="10" fill={MUTED} textAnchor="middle">Existing product,</text>
      <text x="185" y="168" fontSize="10" fill={MUTED} textAnchor="middle">existing market</text>
      <text x="185" y="185" fontSize="10" fill={BRAND} textAnchor="middle">LOWEST RISK</text>
      {/* Cell 2 — Market Development */}
      <rect x="295" y="60" width="210" height="160" rx="4" fill={BLUE} opacity="0.15" stroke={BLUE} strokeWidth="1.5" />
      <text x="400" y="115" fontSize="13" fill={BLUE} textAnchor="middle" fontWeight="bold">Market</text>
      <text x="400" y="132" fontSize="13" fill={BLUE} textAnchor="middle" fontWeight="bold">Development</text>
      <text x="400" y="155" fontSize="10" fill={MUTED} textAnchor="middle">Existing product,</text>
      <text x="400" y="168" fontSize="10" fill={MUTED} textAnchor="middle">new market</text>
      <text x="400" y="185" fontSize="10" fill={BLUE} textAnchor="middle">MEDIUM RISK</text>
      {/* Cell 3 — Product Development */}
      <rect x="80" y="225" width="210" height="160" rx="4" fill={AMBER} opacity="0.15" stroke={AMBER} strokeWidth="1.5" />
      <text x="185" y="280" fontSize="13" fill={AMBER} textAnchor="middle" fontWeight="bold">Product</text>
      <text x="185" y="297" fontSize="13" fill={AMBER} textAnchor="middle" fontWeight="bold">Development</text>
      <text x="185" y="320" fontSize="10" fill={MUTED} textAnchor="middle">New product,</text>
      <text x="185" y="333" fontSize="10" fill={MUTED} textAnchor="middle">existing market</text>
      <text x="185" y="350" fontSize="10" fill={AMBER} textAnchor="middle">MEDIUM-HIGH RISK</text>
      {/* Cell 4 — Diversification */}
      <rect x="295" y="225" width="210" height="160" rx="4" fill={RED} opacity="0.15" stroke={RED} strokeWidth="1.5" />
      <text x="400" y="280" fontSize="13" fill={RED} textAnchor="middle" fontWeight="bold">Diversification</text>
      <text x="400" y="320" fontSize="10" fill={MUTED} textAnchor="middle">New product,</text>
      <text x="400" y="333" fontSize="10" fill={MUTED} textAnchor="middle">new market</text>
      <text x="400" y="350" fontSize="10" fill={RED} textAnchor="middle">HIGHEST RISK</text>
      {/* Risk arrow */}
      <path d="M 500,70 L 500,375" stroke={MUTED} strokeWidth="1.5" markerEnd="url(#riskA)" />
      <text x="512" y="225" fontSize="10" fill={MUTED} textAnchor="start" transform="rotate(90,512,225)">← INCREASING RISK →</text>
      <defs><marker id="riskA" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={MUTED} /></marker></defs>
      <text x="260" y="420" fontSize="11" fill={MUTED} textAnchor="middle">Penetration (low risk) → Diversification (high risk). Each strategy involves different resources.</text>
    </svg>
  );
}

// ─── BM_BCG ───────────────────────────────────────────────────────────────────
export function BM_BCG() {
  return (
    <svg viewBox="0 0 520 460" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="22" fontSize="13" fill={MUTED} textAnchor="middle" fontWeight="bold">BCG Matrix (Boston Consulting Group)</text>
      {/* Headers */}
      <text x="185" y="48" fontSize="11" fill={STROKE} textAnchor="middle">HIGH MARKET SHARE</text>
      <text x="385" y="48" fontSize="11" fill={STROKE} textAnchor="middle">LOW MARKET SHARE</text>
      <text x="38" y="168" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,38,168)">HIGH GROWTH</text>
      <text x="38" y="340" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,38,340)">LOW GROWTH</text>
      {/* Stars */}
      <rect x="80" y="60" width="200" height="175" rx="4" fill={BRAND} opacity="0.15" stroke={BRAND} strokeWidth="1.5" />
      <text x="180" y="110" fontSize="22" textAnchor="middle">⭐</text>
      <text x="180" y="138" fontSize="14" fill={BRAND} textAnchor="middle" fontWeight="bold">Stars</text>
      <text x="180" y="158" fontSize="10" fill={MUTED} textAnchor="middle">High growth, high share</text>
      <text x="180" y="172" fontSize="10" fill={MUTED} textAnchor="middle">Invest heavily. Future</text>
      <text x="180" y="185" fontSize="10" fill={MUTED} textAnchor="middle">cash cows.</text>
      {/* Question Marks */}
      <rect x="285" y="60" width="200" height="175" rx="4" fill={AMBER} opacity="0.15" stroke={AMBER} strokeWidth="1.5" />
      <text x="385" y="110" fontSize="22" textAnchor="middle">❓</text>
      <text x="385" y="138" fontSize="14" fill={AMBER} textAnchor="middle" fontWeight="bold">Question Marks</text>
      <text x="385" y="158" fontSize="10" fill={MUTED} textAnchor="middle">High growth, low share</text>
      <text x="385" y="172" fontSize="10" fill={MUTED} textAnchor="middle">Invest or divest?</text>
      <text x="385" y="185" fontSize="10" fill={MUTED} textAnchor="middle">Uncertain future.</text>
      {/* Cash Cows */}
      <rect x="80" y="240" width="200" height="175" rx="4" fill={BLUE} opacity="0.15" stroke={BLUE} strokeWidth="1.5" />
      <text x="180" y="290" fontSize="22" textAnchor="middle">🐄</text>
      <text x="180" y="318" fontSize="14" fill={BLUE} textAnchor="middle" fontWeight="bold">Cash Cows</text>
      <text x="180" y="338" fontSize="10" fill={MUTED} textAnchor="middle">Low growth, high share</text>
      <text x="180" y="352" fontSize="10" fill={MUTED} textAnchor="middle">Generate cash. Fund</text>
      <text x="180" y="365" fontSize="10" fill={MUTED} textAnchor="middle">Stars and Question Marks.</text>
      {/* Dogs */}
      <rect x="285" y="240" width="200" height="175" rx="4" fill={RED} opacity="0.15" stroke={RED} strokeWidth="1.5" />
      <text x="385" y="290" fontSize="22" textAnchor="middle">🐕</text>
      <text x="385" y="318" fontSize="14" fill={RED} textAnchor="middle" fontWeight="bold">Dogs</text>
      <text x="385" y="338" fontSize="10" fill={MUTED} textAnchor="middle">Low growth, low share</text>
      <text x="385" y="352" fontSize="10" fill={MUTED} textAnchor="middle">Divest or harvest.</text>
      <text x="385" y="365" fontSize="10" fill={MUTED} textAnchor="middle">Limited potential.</text>
      <text x="260" y="435" fontSize="11" fill={MUTED} textAnchor="middle">Used for product portfolio analysis — aims for balanced portfolio with cash flow to fund growth</text>
    </svg>
  );
}

// ─── BM_DECISION_TREE ─────────────────────────────────────────────────────────
export function BM_DECISION_TREE() {
  return (
    <svg viewBox="0 0 540 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 540, fontFamily: FONT }}>
      <text x="270" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Decision Tree — Expected Monetary Value (EMV)</text>
      {/* Decision node */}
      <rect x="30" y="180" width="50" height="50" rx="4" fill={BLUE} opacity="0.3" stroke={BLUE} strokeWidth="2" />
      <text x="55" y="210" fontSize="12" fill={STROKE} textAnchor="middle" fontWeight="bold">D</text>
      {/* Option A line */}
      <line x1="80" y1="195" x2="200" y2="130" stroke={STROKE} strokeWidth="1.5" />
      <text x="140" y="150" fontSize="11" fill={STROKE}>Option A</text>
      {/* Chance node A */}
      <circle cx="210" cy="125" r="18" fill={AMBER} opacity="0.3" stroke={AMBER} strokeWidth="2" />
      <text x="210" y="130" fontSize="10" fill={STROKE} textAnchor="middle">C</text>
      {/* A outcomes */}
      <line x1="228" y1="115" x2="360" y2="70" stroke={BRAND} strokeWidth="1.5" />
      <text x="295" y="78" fontSize="10" fill={BRAND}>p=0.6</text>
      <text x="365" y="68" fontSize="11" fill={STROKE}>+€80,000</text>
      <line x1="228" y1="135" x2="360" y2="170" stroke={RED} strokeWidth="1.5" />
      <text x="295" y="165" fontSize="10" fill={RED}>p=0.4</text>
      <text x="365" y="168" fontSize="11" fill={STROKE}>−€20,000</text>
      {/* EMV A */}
      <text x="210" y="155" fontSize="10" fill={AMBER} textAnchor="middle">EMV=</text>
      <text x="210" y="168" fontSize="10" fill={AMBER} textAnchor="middle">€40k</text>
      <text x="450" y="78" fontSize="10" fill={MUTED}>(0.6×80,000)</text>
      <text x="450" y="168" fontSize="10" fill={MUTED}>(0.4×−20,000)</text>
      {/* Option B line */}
      <line x1="80" y1="215" x2="200" y2="280" stroke={STROKE} strokeWidth="1.5" />
      <text x="140" y="262" fontSize="11" fill={STROKE}>Option B</text>
      {/* Chance node B */}
      <circle cx="210" cy="290" r="18" fill={AMBER} opacity="0.3" stroke={AMBER} strokeWidth="2" />
      <text x="210" y="295" fontSize="10" fill={STROKE} textAnchor="middle">C</text>
      {/* B outcomes */}
      <line x1="228" y1="280" x2="360" y2="240" stroke={BRAND} strokeWidth="1.5" />
      <text x="295" y="250" fontSize="10" fill={BRAND}>p=0.3</text>
      <text x="365" y="238" fontSize="11" fill={STROKE}>+€120,000</text>
      <line x1="228" y1="300" x2="360" y2="340" stroke={RED} strokeWidth="1.5" />
      <text x="295" y="338" fontSize="10" fill={RED}>p=0.7</text>
      <text x="365" y="338" fontSize="11" fill={STROKE}>−€10,000</text>
      {/* EMV B */}
      <text x="210" y="320" fontSize="10" fill={AMBER} textAnchor="middle">EMV=</text>
      <text x="210" y="333" fontSize="10" fill={AMBER} textAnchor="middle">€29k</text>
      {/* Legend */}
      <rect x="30" y="360" width="14" height="14" rx="2" fill={BLUE} opacity="0.4" />
      <text x="50" y="372" fontSize="10" fill={STROKE}>□ = Decision node</text>
      <circle cx="157" cy="367" r="7" fill={AMBER} opacity="0.4" />
      <text x="170" y="372" fontSize="10" fill={STROKE}>○ = Chance node</text>
      <text x="270" y="400" fontSize="11" fill={MUTED} textAnchor="middle">EMV = Σ (probability × outcome). Choose option with highest EMV. Here: Option A (€40k {'>'} €29k).</text>
    </svg>
  );
}

// ─── BM_ORG_HIERARCHICAL ──────────────────────────────────────────────────────
export function BM_ORG_HIERARCHICAL() {
  return (
    <svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Hierarchical Organisational Structure</text>
      {/* Level 1 — CEO */}
      <rect x="190" y="35" width="140" height="44" rx="4" fill={BRAND} opacity="0.25" stroke={BRAND} strokeWidth="1.5" />
      <text x="260" y="60" fontSize="12" fill={STROKE} textAnchor="middle" fontWeight="bold">CEO / Director</text>
      <text x="260" y="74" fontSize="9" fill={MUTED} textAnchor="middle">Level 1</text>
      {/* Level 2 */}
      <line x1="260" y1="79" x2="260" y2="100" stroke={MUTED} strokeWidth="1.5" />
      <line x1="100" y1="100" x2="420" y2="100" stroke={MUTED} strokeWidth="1.5" />
      {[100, 260, 420].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="100" x2={x} y2="118" stroke={MUTED} strokeWidth="1.5" />
          <rect x={x - 60} y="118" width="120" height="40" rx="4" fill={BLUE} opacity="0.2" stroke={BLUE} strokeWidth="1" />
          <text x={x} y="141" fontSize="11" fill={STROKE} textAnchor="middle">{['Marketing Mgr', 'Finance Mgr', 'Ops Mgr'][i]}</text>
          <text x={x} y="153" fontSize="9" fill={MUTED} textAnchor="middle">Level 2</text>
        </g>
      ))}
      {/* Level 3 */}
      {[100, 260, 420].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="158" x2={x} y2="178" stroke={MUTED} strokeWidth="1.5" />
          <line x1={x - 40} y1="178" x2={x + 40} y2="178" stroke={MUTED} strokeWidth="1.5" />
          {[-40, 40].map((dx, j) => (
            <g key={j}>
              <line x1={x + dx} y1="178" x2={x + dx} y2="196" stroke={MUTED} strokeWidth="1" />
              <rect x={x + dx - 35} y="196" width="70" height="36" rx="3" fill={AMBER} opacity="0.15" stroke={AMBER} strokeWidth="1" />
              <text x={x + dx} y="218" fontSize="9" fill={STROKE} textAnchor="middle">Team Member</text>
              <text x={x + dx} y="228" fontSize="8" fill={MUTED} textAnchor="middle">Level 3</text>
            </g>
          ))}
        </g>
      ))}
      <text x="260" y="280" fontSize="11" fill={MUTED} textAnchor="middle">Tall hierarchy: many levels, narrow span of control</text>
      <text x="260" y="295" fontSize="11" fill={MUTED} textAnchor="middle">Clear chain of command | Slower communication | More supervision</text>
    </svg>
  );
}

// ─── BM_ORG_FLAT ──────────────────────────────────────────────────────────────
export function BM_ORG_FLAT() {
  return (
    <svg viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Flat Organisational Structure</text>
      {/* CEO */}
      <rect x="190" y="40" width="140" height="44" rx="4" fill={BRAND} opacity="0.25" stroke={BRAND} strokeWidth="1.5" />
      <text x="260" y="65" fontSize="12" fill={STROKE} textAnchor="middle" fontWeight="bold">CEO / Director</text>
      {/* Horizontal line */}
      <line x1="260" y1="84" x2="260" y2="110" stroke={MUTED} strokeWidth="1.5" />
      <line x1="60" y1="110" x2="460" y2="110" stroke={MUTED} strokeWidth="1.5" />
      {/* 5 direct reports */}
      {[60, 160, 260, 360, 460].map((x, i) => (
        <g key={i}>
          <line x1={x} y1="110" x2={x} y2="128" stroke={MUTED} strokeWidth="1.5" />
          <rect x={x - 45} y="128" width="90" height="44" rx="4" fill={BLUE} opacity="0.2" stroke={BLUE} strokeWidth="1" />
          <text x={x} y="152" fontSize="10" fill={STROKE} textAnchor="middle">{['Marketing', 'Finance', 'Operations', 'HR', 'Sales'][i]}</text>
          <text x={x} y="165" fontSize="9" fill={MUTED} textAnchor="middle">Team Lead</text>
        </g>
      ))}
      <text x="260" y="210" fontSize="11" fill={MUTED} textAnchor="middle">Flat structure: few levels, wide span of control</text>
      <text x="260" y="225" fontSize="11" fill={MUTED} textAnchor="middle">Faster communication | More autonomy | Harder to manage at scale</text>
    </svg>
  );
}

// ─── BM_PRODUCT_LIFECYCLE ─────────────────────────────────────────────────────
export function BM_PRODUCT_LIFECYCLE() {
  return (
    <svg viewBox="0 0 520 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Product Life Cycle (PLC)</text>
      {/* Axes */}
      <line x1="60" y1="20" x2="60" y2="350" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="350" x2="500" y2="350" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="508,350 496,345 496,355" fill={STROKE} />
      <text x="280" y="378" fontSize="12" fill={STROKE} textAnchor="middle">Time</text>
      <text x="22" y="190" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,190)">Sales / Profit</text>
      {/* Zero profit line */}
      <line x1="60" y1="280" x2="500" y2="280" stroke={MUTED} strokeWidth="1" strokeDasharray="4,3" opacity="0.6" />
      <text x="52" y="284" fontSize="10" fill={MUTED} textAnchor="end">0</text>
      {/* Sales curve */}
      <path d="M 80,340 Q 140,330 180,260 Q 230,170 280,120 Q 340,90 380,100 Q 430,115 480,200" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="490" y="190" fontSize="14" fill={BRAND} fontWeight="bold">Sales</text>
      {/* Profit curve — lower, S-shaped offset */}
      <path d="M 80,350 Q 120,350 160,320 Q 200,280 240,230 Q 290,190 340,185 Q 390,185 430,220 Q 460,250 490,310" fill="none" stroke={AMBER} strokeWidth="2" strokeDasharray="6,3" />
      <text x="492" y="305" fontSize="11" fill={AMBER}>Profit</text>
      {/* Stage dividers */}
      <line x1="155" y1="30" x2="155" y2="350" stroke={MUTED} strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />
      <line x1="295" y1="30" x2="295" y2="350" stroke={MUTED} strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />
      <line x1="400" y1="30" x2="400" y2="350" stroke={MUTED} strokeWidth="1" strokeDasharray="5,4" opacity="0.5" />
      {/* Stage labels */}
      <text x="107" y="38" fontSize="11" fill={STROKE} textAnchor="middle">Introduction</text>
      <text x="225" y="38" fontSize="11" fill={STROKE} textAnchor="middle">Growth</text>
      <text x="348" y="38" fontSize="11" fill={STROKE} textAnchor="middle">Maturity</text>
      <text x="450" y="38" fontSize="11" fill={STROKE} textAnchor="middle">Decline</text>
      {/* Extension strategy arrow */}
      <path d="M 430,180 Q 450,150 470,160 Q 490,170 490,190" fill="none" stroke={PURPLE} strokeWidth="1.5" strokeDasharray="4,3" markerEnd="url(#extArr)" />
      <text x="455" y="136" fontSize="9" fill={PURPLE} textAnchor="middle">Extension</text>
      <text x="455" y="146" fontSize="9" fill={PURPLE} textAnchor="middle">strategy</text>
      <defs><marker id="extArr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={PURPLE} /></marker></defs>
      <text x="260" y="400" fontSize="11" fill={MUTED} textAnchor="middle">Linked to: cash flow (Introduction = negative), BCG matrix, marketing mix decisions</text>
      <text x="260" y="415" fontSize="11" fill={MUTED} textAnchor="middle">Extension strategies: rebranding, new markets, product modification, price reduction</text>
    </svg>
  );
}

// ─── BM_POSITION_MAP ──────────────────────────────────────────────────────────
export function BM_POSITION_MAP() {
  return (
    <svg viewBox="0 0 460 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 460, fontFamily: FONT }}>
      <text x="230" y="12" fontSize="11" fill={MUTED} textAnchor="middle">Positioning Map (Perceptual Map)</text>
      {/* Axes */}
      <line x1="230" y1="30" x2="230" y2="390" stroke={STROKE} strokeWidth="2" />
      <line x1="30" y1="210" x2="430" y2="210" stroke={STROKE} strokeWidth="2" />
      <polygon points="230,22 225,34 235,34" fill={STROKE} />
      <polygon points="438,210 426,205 426,215" fill={STROKE} />
      {/* Axis labels */}
      <text x="230" y="22" fontSize="11" fill={STROKE} textAnchor="middle">HIGH QUALITY</text>
      <text x="230" y="408" fontSize="11" fill={STROKE} textAnchor="middle">LOW QUALITY</text>
      <text x="18" y="215" fontSize="11" fill={STROKE} textAnchor="middle" transform="rotate(-90,18,215)">LOW PRICE</text>
      <text x="440" y="215" fontSize="11" fill={STROKE} textAnchor="end">HIGH PRICE</text>
      {/* Brand bubbles */}
      {[
        { x: 340, y: 80, label: 'Brand A', color: BRAND },
        { x: 320, y: 150, label: 'Brand B', color: BLUE },
        { x: 160, y: 80, label: 'Brand C', color: AMBER },
        { x: 140, y: 300, label: 'Brand D', color: RED },
        { x: 340, y: 320, label: 'Brand E', color: PURPLE },
      ].map((b, i) => (
        <g key={i}>
          <circle cx={b.x} cy={b.y} r="24" fill={b.color} opacity="0.25" stroke={b.color} strokeWidth="1.5" />
          <text x={b.x} y={b.y + 4} fontSize="11" fill={b.color} textAnchor="middle" fontWeight="bold">{b.label}</text>
        </g>
      ))}
      {/* Gap opportunity */}
      <circle cx="150" cy="160" r="28" fill="none" stroke={MUTED} strokeWidth="1.5" strokeDasharray="5,3" />
      <text x="148" y="155" fontSize="9" fill={MUTED} textAnchor="middle">Market</text>
      <text x="148" y="167" fontSize="9" fill={MUTED} textAnchor="middle">gap?</text>
      <text x="230" y="400" fontSize="11" fill={MUTED} textAnchor="middle">Shows competitors' positions on two key attributes — helps identify market gaps and USP</text>
    </svg>
  );
}

// ─── BM_BREAKEVEN ─────────────────────────────────────────────────────────────
export function BM_BREAKEVEN() {
  return (
    <svg viewBox="0 0 520 450" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Break-Even Chart</text>
      <line x1="60" y1="20" x2="60" y2="370" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="370" x2="480" y2="370" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="488,370 476,365 476,375" fill={STROKE} />
      <text x="270" y="414" fontSize="12" fill={STROKE} textAnchor="middle">Output / Units Sold</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Revenue / Costs (€)</text>
      {/* Fixed costs — horizontal */}
      <line x1="60" y1="260" x2="480" y2="260" stroke={BLUE} strokeWidth="2" />
      <text x="484" y="264" fontSize="14" fill={BLUE} fontWeight="bold">FC</text>
      {/* Total costs — from FC intercept, rising */}
      <line x1="60" y1="260" x2="440" y2="60" stroke={RED} strokeWidth="2.5" />
      <text x="445" y="72" fontSize="14" fill={RED} fontWeight="bold">TC</text>
      {/* Total revenue — from origin */}
      <line x1="60" y1="370" x2="450" y2="50" stroke={BRAND} strokeWidth="2.5" />
      <text x="455" y="62" fontSize="14" fill={BRAND} fontWeight="bold">TR</text>
      {/* Break-even point */}
      <circle cx="252" cy="183" r="6" fill={AMBER} />
      <line x1="252" y1="183" x2="252" y2="370" stroke={AMBER} strokeWidth="1.5" strokeDasharray="5,3" />
      <line x1="60" y1="183" x2="252" y2="183" stroke={AMBER} strokeWidth="1.5" strokeDasharray="5,3" />
      <text x="260" y="177" fontSize="12" fill={AMBER} fontWeight="bold">BEP</text>
      <text x="252" y="388" fontSize="11" fill={AMBER} textAnchor="middle">Q_be</text>
      {/* Margin of safety */}
      <line x1="252" y1="358" x2="400" y2="358" stroke={PURPLE} strokeWidth="2" />
      <text x="326" y="350" fontSize="10" fill={PURPLE} textAnchor="middle">Margin of Safety</text>
      <text x="400" y="388" fontSize="11" fill={MUTED} textAnchor="middle">Q_actual</text>
      {/* Profit area */}
      <polygon points="252,183 450,50 450,60" fill={BRAND} opacity="0.15" />
      <text x="370" y="130" fontSize="10" fill={BRAND} textAnchor="middle">Profit zone</text>
      {/* Loss area */}
      <polygon points="60,260 60,370 252,370 252,183" fill={RED} opacity="0.08" />
      <text x="150" y="320" fontSize="10" fill={RED} textAnchor="middle">Loss zone</text>
      <text x="260" y="430" fontSize="11" fill={MUTED} textAnchor="middle">BEP = Fixed Costs ÷ Contribution per unit | Contribution = Selling price − Variable cost per unit</text>
    </svg>
  );
}

// ─── BM_CASHFLOW ──────────────────────────────────────────────────────────────
export function BM_CASHFLOW() {
  return (
    <svg viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Cash Flow Forecast Structure</text>
      {/* Table */}
      {[
        { row: 'Month', vals: ['Jan', 'Feb', 'Mar', 'Apr'] },
        { row: 'Opening Balance', vals: ['(€)', '(€)', '(€)', '(€)'] },
        { row: 'Cash Inflows', vals: ['', '', '', ''] },
        { row: '  Sales revenue', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: '  Other inflows', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: 'Total Inflows (A)', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: 'Cash Outflows', vals: ['', '', '', ''] },
        { row: '  Materials', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: '  Wages', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: '  Overheads', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: 'Total Outflows (B)', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: 'Net Cash Flow (A−B)', vals: ['xxxx', 'xxxx', 'xxxx', 'xxxx'] },
        { row: 'Closing Balance', vals: ['(€)', '(€)', '(€)', '(€)'] },
      ].map((r, i) => {
        const y = 40 + i * 22;
        const isHeader = i === 0;
        const isTotal = r.row.startsWith('Total') || r.row.startsWith('Net') || r.row === 'Closing Balance' || r.row === 'Opening Balance';
        const isSection = r.row === 'Cash Inflows' || r.row === 'Cash Outflows';
        const fill = isHeader ? BRAND : isTotal ? AMBER : isSection ? BLUE : 'transparent';
        const opacity = isHeader || isTotal ? 0.2 : isSection ? 0.1 : 0;
        return (
          <g key={i}>
            {opacity > 0 && <rect x="30" y={y} width="470" height="20" fill={fill} opacity={opacity} rx="2" />}
            <text x="36" y={y + 14} fontSize={isHeader || isTotal ? '11' : '10'} fill={isSection ? BLUE : STROKE} fontWeight={isHeader || isTotal ? 'bold' : 'normal'}>{r.row}</text>
            {r.vals.map((v, j) => (
              <text key={j} x={240 + j * 65} y={y + 14} fontSize="10" fill={isHeader ? STROKE : MUTED} textAnchor="middle">{v}</text>
            ))}
          </g>
        );
      })}
      {/* Grid lines */}
      {[240, 305, 370, 435, 500].map((x, i) => (
        <line key={i} x1={x - 30} y1="38" x2={x - 30} y2="330" stroke={MUTED} strokeWidth="0.5" opacity="0.4" />
      ))}
      <line x1="30" y1="38" x2="500" y2="38" stroke={MUTED} strokeWidth="0.5" opacity="0.4" />
      <line x1="30" y1="60" x2="500" y2="60" stroke={MUTED} strokeWidth="0.5" opacity="0.4" />
      <text x="260" y="348" fontSize="11" fill={MUTED} textAnchor="middle">Closing balance = Opening balance + Net cash flow</text>
      <text x="260" y="362" fontSize="11" fill={MUTED} textAnchor="middle">Next month's opening balance = this month's closing balance</text>
    </svg>
  );
}

// ─── BM_FORCE_FIELD ───────────────────────────────────────────────────────────
export function BM_FORCE_FIELD() {
  return (
    <svg viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Force Field Analysis (Lewin) — HL</text>
      {/* Central line */}
      <line x1="260" y1="40" x2="260" y2="370" stroke={STROKE} strokeWidth="2.5" />
      <text x="260" y="390" fontSize="11" fill={STROKE} textAnchor="middle">PROPOSED CHANGE</text>
      {/* Driving forces — left */}
      <text x="130" y="50" fontSize="12" fill={BRAND} textAnchor="middle" fontWeight="bold">Driving Forces</text>
      {[
        { label: 'Market demand', score: 4, y: 90 },
        { label: 'Profitability', score: 3, y: 150 },
        { label: 'Technology', score: 5, y: 210 },
        { label: 'Leadership', score: 2, y: 270 },
      ].map((f, i) => (
        <g key={i}>
          <line x1={260 - f.score * 28} y1={f.y} x2={255} y2={f.y} stroke={BRAND} strokeWidth={f.score * 2 + 2} markerEnd="url(#drA)" opacity="0.7" />
          <text x={260 - f.score * 28 - 6} y={f.y + 4} fontSize="10" fill={BRAND} textAnchor="end">{f.label} ({f.score})</text>
        </g>
      ))}
      {/* Restraining forces — right */}
      <text x="390" y="50" fontSize="12" fill={RED} textAnchor="middle" fontWeight="bold">Restraining Forces</text>
      {[
        { label: 'Resistance to change', score: 4, y: 90 },
        { label: 'Cost', score: 3, y: 150 },
        { label: 'Lack of skills', score: 2, y: 210 },
        { label: 'Time constraints', score: 3, y: 270 },
      ].map((f, i) => (
        <g key={i}>
          <line x1={260 + f.score * 28} y1={f.y} x2={265} y2={f.y} stroke={RED} strokeWidth={f.score * 2 + 2} markerEnd="url(#rsA)" opacity="0.7" />
          <text x={260 + f.score * 28 + 6} y={f.y + 4} fontSize="10" fill={RED} textAnchor="start">{f.label} ({f.score})</text>
        </g>
      ))}
      <defs>
        <marker id="drA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={BRAND} /></marker>
        <marker id="rsA" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill={RED} /></marker>
      </defs>
      {/* Totals */}
      <text x="130" y="340" fontSize="12" fill={BRAND} textAnchor="middle" fontWeight="bold">Total: 14</text>
      <text x="390" y="340" fontSize="12" fill={RED} textAnchor="middle" fontWeight="bold">Total: 12</text>
      <text x="260" y="398" fontSize="11" fill={MUTED} textAnchor="middle">Net driving force: +2 → Change likely to succeed.</text>
      <text x="260" y="413" fontSize="11" fill={MUTED} textAnchor="middle">Scores 1–5. Thicker arrow = stronger force.</text>
    </svg>
  );
}

// ─── BM_GANTT ─────────────────────────────────────────────────────────────────
export function BM_GANTT() {
  const tasks = ['Market research', 'Product design', 'Prototyping', 'Testing', 'Production setup', 'Launch'];
  const bars = [
    { start: 0, dur: 2 }, { start: 1, dur: 3 }, { start: 3, dur: 2 },
    { start: 4, dur: 2 }, { start: 5, dur: 3 }, { start: 7, dur: 1 },
  ];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
  const colW = 44;
  const rowH = 32;
  const labelW = 120;
  const top = 55;
  return (
    <svg viewBox="0 0 540 310" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 540, fontFamily: FONT }}>
      <text x="270" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Gantt Chart (HL)</text>
      {/* Month headers */}
      {months.map((m, i) => (
        <g key={i}>
          <rect x={labelW + i * colW} y={30} width={colW} height={22} fill={BRAND} opacity="0.15" />
          <text x={labelW + i * colW + colW / 2} y={45} fontSize="10" fill={STROKE} textAnchor="middle">{m}</text>
        </g>
      ))}
      {/* Task rows */}
      {tasks.map((t, i) => (
        <g key={i}>
          <rect x={0} y={top + i * rowH} width={labelW - 4} height={rowH - 2} fill="transparent" />
          <text x={labelW - 8} y={top + i * rowH + 18} fontSize="10" fill={STROKE} textAnchor="end">{t}</text>
          {/* Background row */}
          <rect x={labelW} y={top + i * rowH} width={months.length * colW} height={rowH - 2} fill={i % 2 ? MUTED : 'transparent'} opacity="0.05" />
          {/* Gantt bar */}
          <rect
            x={labelW + bars[i].start * colW + 2}
            y={top + i * rowH + 4}
            width={bars[i].dur * colW - 4}
            height={rowH - 10}
            rx="3"
            fill={BRAND}
            opacity="0.6"
          />
        </g>
      ))}
      {/* Grid lines */}
      {months.map((_, i) => (
        <line key={i} x1={labelW + i * colW} y1={28} x2={labelW + i * colW} y2={top + tasks.length * rowH} stroke={MUTED} strokeWidth="0.5" opacity="0.4" />
      ))}
      <line x1={labelW} y1={28} x2={labelW + months.length * colW} y2={28} stroke={MUTED} strokeWidth="0.5" opacity="0.4" />
      <text x="270" y="285" fontSize="11" fill={MUTED} textAnchor="middle">Shows tasks, durations, and dependencies. Critical path = longest route with no float.</text>
    </svg>
  );
}

// ─── BM_STOCK_CONTROL ─────────────────────────────────────────────────────────
export function BM_STOCK_CONTROL() {
  return (
    <svg viewBox="0 0 520 430" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Stock Control Chart (HL)</text>
      <line x1="60" y1="20" x2="60" y2="370" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="370" x2="480" y2="370" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="488,370 476,365 476,375" fill={STROKE} />
      <text x="270" y="398" fontSize="12" fill={STROKE} textAnchor="middle">Time</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Stock Level (units)</text>
      {/* Max stock */}
      <line x1="60" y1="60" x2="480" y2="60" stroke={MUTED} strokeWidth="1.5" strokeDasharray="6,4" />
      <text x="484" y="64" fontSize="10" fill={MUTED}>Max</text>
      {/* Reorder level */}
      <line x1="60" y1="200" x2="480" y2="200" stroke={AMBER} strokeWidth="2" strokeDasharray="8,4" />
      <text x="484" y="204" fontSize="11" fill={AMBER} fontWeight="bold">Reorder level</text>
      {/* Buffer stock */}
      <line x1="60" y1="300" x2="480" y2="300" stroke={RED} strokeWidth="2" strokeDasharray="8,4" />
      <text x="484" y="304" fontSize="11" fill={RED} fontWeight="bold">Buffer stock</text>
      {/* Sawtooth stock level */}
      <path d="M 80,60 L 180,300 L 180,60 L 300,300 L 300,60 L 420,300 L 420,60 L 480,200" fill="none" stroke={BRAND} strokeWidth="2.5" />
      {/* Reorder points */}
      <circle cx="130" cy="200" r="5" fill={AMBER} />
      <circle cx="250" cy="200" r="5" fill={AMBER} />
      <circle cx="370" cy="200" r="5" fill={AMBER} />
      {/* Lead time brace */}
      <line x1="130" y1="340" x2="180" y2="340" stroke={BLUE} strokeWidth="1.5" />
      <line x1="130" y1="335" x2="130" y2="345" stroke={BLUE} strokeWidth="1" />
      <line x1="180" y1="335" x2="180" y2="345" stroke={BLUE} strokeWidth="1" />
      <text x="155" y="358" fontSize="10" fill={BLUE} textAnchor="middle">Lead time</text>
      <text x="260" y="415" fontSize="11" fill={MUTED} textAnchor="middle">Reorder level = demand during lead time + buffer. Buffer protects against stockouts.</text>
    </svg>
  );
}

// ─── BM_SCATTER_REGRESSION ────────────────────────────────────────────────────
export function BM_SCATTER_REGRESSION() {
  const points = [
    [100,210],[130,240],[160,290],[190,310],[200,330],[230,350],[250,380],[280,400],[310,430],[340,450]
  ];
  const W = 440; const H = 360; const ox = 80; const oy = 30;
  const scaleX = (x: number) => ox + (x - 80) * 1.1;
  const scaleY = (y: number) => oy + H - (y - 180) * 0.7;
  return (
    <svg viewBox="0 0 500 452" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x="250" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Simple Linear Regression — Scatter Diagram (HL)</text>
      <line x1={ox} y1={oy} x2={ox} y2={oy + H} stroke={STROKE} strokeWidth="2" />
      <line x1={ox} y1={oy + H} x2={ox + W} y2={oy + H} stroke={STROKE} strokeWidth="2" />
      <polygon points={`${ox},${oy - 8} ${ox - 5},${oy + 4} ${ox + 5},${oy + 4}`} fill={STROKE} />
      <polygon points={`${ox + W + 8},${oy + H} ${ox + W - 4},${oy + H - 5} ${ox + W - 4},${oy + H + 5}`} fill={STROKE} />
      <text x={ox + W / 2} y={oy + H + 26} fontSize="12" fill={STROKE} textAnchor="middle">Time / Independent Variable (x)</text>
      <text x="22" y={oy + H / 2} fontSize="13" fill={STROKE} textAnchor="middle" transform={`rotate(-90,22,${oy + H / 2})`}>Sales / Dependent Variable (y)</text>
      {/* Data points */}
      {points.map(([x, y], i) => (
        <circle key={i} cx={scaleX(x)} cy={scaleY(y)} r="5" fill={BLUE} opacity="0.7" />
      ))}
      {/* Line of best fit */}
      <line x1={scaleX(90)} y1={scaleY(200)} x2={scaleX(350)} y2={scaleY(460)} stroke={RED} strokeWidth="2.5" />
      <text x={scaleX(355)} y={scaleY(460)} fontSize="14" fill={RED} fontWeight="bold">LOBF</text>
      {/* Extrapolation */}
      <line x1={scaleX(340)} y1={scaleY(450)} x2={scaleX(400)} y2={scaleY(510)} stroke={AMBER} strokeWidth="2" strokeDasharray="6,4" />
      <text x={scaleX(390)} y={scaleY(502)} fontSize="10" fill={AMBER}>Extrapolation</text>
      {/* Correlation label */}
      <text x="250" y="410" fontSize="11" fill={MUTED} textAnchor="middle">Positive correlation. LOBF forecasts future values.</text>
      <text x="250" y="424" fontSize="11" fill={MUTED} textAnchor="middle">Extrapolation extends beyond the data range — use with caution.</text>
      <text x="250" y="438" fontSize="11" fill={MUTED} textAnchor="middle">Limitation: assumes linear relationship; past trend may not continue.</text>
    </svg>
  );
}

// ─── BM_MOTIVATION_TAYLOR ─────────────────────────────────────────────────────
export function BM_MOTIVATION_TAYLOR() {
  const cx = 250;
  const bx = 100, bw = 300, bh = 54;
  const steps = [
    { color: AMBER, bold: "'Economic man'",           sub: 'workers motivated by money alone' },
    { color: BRAND, bold: '1. Time-and-motion study', sub: 'find the one best method' },
    { color: BLUE,  bold: '2. Division of labour',    sub: 'small specialised tasks' },
    { color: RED,   bold: '3. Piece-rate pay',        sub: 'paid per unit produced' },
  ];
  return (
    <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <text x={cx} y="18" fontSize="13" fill={MUTED} textAnchor="middle" fontWeight="bold">Taylor — Scientific Management</text>
      {steps.map(({ color, bold, sub }, i) => {
        const y = 28 + i * (bh + 18);
        return (
          <g key={i}>
            <rect x={bx} y={y} width={bw} height={bh} rx="4" fill={color} opacity="0.15" stroke={color} strokeWidth="1.5" />
            <text x={cx} y={y + 22} fontSize="12" fill={color} textAnchor="middle" fontWeight="bold">{bold}</text>
            <text x={cx} y={y + 38} fontSize="10" fill={MUTED} textAnchor="middle">{sub}</text>
            {i < steps.length - 1 && (
              <g>
                <line x1={cx} y1={y + bh} x2={cx} y2={y + bh + 12} stroke={MUTED} strokeWidth="1.5" />
                <polygon points={`${cx - 5},${y + bh + 12} ${cx + 5},${y + bh + 12} ${cx},${y + bh + 18}`} fill={MUTED} />
              </g>
            )}
          </g>
        );
      })}
      {/* Arrow to result */}
      <line x1={cx} y1={298} x2={cx} y2={310} stroke={MUTED} strokeWidth="1.5" />
      <polygon points={`${cx - 5},310 ${cx + 5},310 ${cx},316`} fill={MUTED} />
      {/* Result */}
      <rect x={bx} y={316} width={bw} height={bh} rx="4" fill={BRAND} opacity="0.25" stroke={BRAND} strokeWidth="2" />
      <text x={cx} y={338} fontSize="13" fill={BRAND} textAnchor="middle" fontWeight="bold">Result: maximum efficiency</text>
      <text x={cx} y={354} fontSize="10" fill={MUTED} textAnchor="middle">higher output, lower unit cost</text>
      <text x={cx} y="393" fontSize="11" fill={MUTED} textAnchor="middle">External/extrinsic motivation — money is the sole driver</text>
      <text x={cx} y="408" fontSize="11" fill={MUTED} textAnchor="middle">Criticism: ignores social needs (Maslow L3–L5; Herzberg motivators)</text>
    </svg>
  );
}

// ─── BM_MOTIVATION_MASLOW ─────────────────────────────────────────────────────
export function BM_MOTIVATION_MASLOW() {
  // Stepped trapezoid bands, bottom to top. Each side narrows by 23px per level.
  // y dividers: 345,288,231,174,117,60 — band height 57px each.
  // rightX = right edge of each band at its mid-y (for connector line start).
  const bands = [
    { pts: '50,345 340,345 317,288 73,288',   color: BLUE,   midY: 316.5, rightX: 328.5, name: 'Physiological',     sub: '(food, shelter, pay)' },
    { pts: '73,288 317,288 294,231 96,231',   color: BRAND,  midY: 259.5, rightX: 305.5, name: 'Safety',             sub: '(job security, safe conds.)' },
    { pts: '96,231 294,231 271,174 119,174',  color: AMBER,  midY: 202.5, rightX: 282.5, name: 'Social',             sub: '(belonging, teamwork)' },
    { pts: '119,174 271,174 248,117 142,117', color: PURPLE, midY: 145.5, rightX: 259.5, name: 'Esteem',             sub: '(recognition, status)' },
    { pts: '142,117 248,117 225,60 165,60',   color: RED,    midY: 88.5,  rightX: 236.5, name: 'Self-actualisation', sub: '(growth, potential)' },
  ];
  return (
    <svg viewBox="0 0 540 410" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 540, fontFamily: FONT }}>
      <text x="270" y="18" fontSize="13" fill={MUTED} textAnchor="middle" fontWeight="bold">Maslow's Hierarchy of Needs</text>
      <text x="16" y="210" fontSize="10" fill={MUTED} textAnchor="middle" transform="rotate(-90,16,210)">Lower needs first ↑</text>
      {bands.map(({ pts, color, midY, rightX, name, sub }, i) => (
        <g key={i}>
          <polygon points={pts} fill={color} opacity="0.2" stroke={color} strokeWidth="1.5" />
          <line x1={rightX} y1={midY} x2={354} y2={midY} stroke={MUTED} strokeWidth="1" opacity="0.5" />
          <text x="358" y={midY - 3} fontSize="11" fill={color} fontWeight="bold">{name}</text>
          <text x="358" y={midY + 10} fontSize="9" fill={MUTED}>{sub}</text>
        </g>
      ))}
      <text x="270" y="375" fontSize="11" fill={MUTED} textAnchor="middle">Lower needs (1–2) must be satisfied before higher needs motivate</text>
      <text x="270" y="390" fontSize="11" fill={MUTED} textAnchor="middle">Pay = level 1 (basic need) — not a motivator in itself (cf. Herzberg)</text>
    </svg>
  );
}

// ─── BM_MOTIVATION_HERZBERG ───────────────────────────────────────────────────
export function BM_MOTIVATION_HERZBERG() {
  const hygiene   = ['Pay / salary', 'Working conditions', 'Job security', 'Company policy', 'Supervision'];
  const motivators = ['Achievement', 'Recognition', 'Responsibility', 'The work itself', 'Advancement'];
  return (
    <svg viewBox="0 0 520 290" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <text x="260" y="18" fontSize="13" fill={MUTED} textAnchor="middle" fontWeight="bold">Herzberg — Two-Factor Theory</text>
      {/* Column backgrounds */}
      <rect x="20" y="26" width="225" height="222" rx="4" fill={RED} opacity="0.07" stroke={RED} strokeWidth="1.5" />
      <rect x="275" y="26" width="225" height="222" rx="4" fill={BRAND} opacity="0.07" stroke={BRAND} strokeWidth="1.5" />
      {/* Column headers */}
      <text x="132" y="43" fontSize="12" fill={RED} textAnchor="middle" fontWeight="bold">HYGIENE FACTORS</text>
      <text x="387" y="43" fontSize="12" fill={BRAND} textAnchor="middle" fontWeight="bold">MOTIVATORS</text>
      {/* Subtitles */}
      <text x="132" y="57" fontSize="9" fill={MUTED} textAnchor="middle">absence → dissatisfaction;</text>
      <text x="132" y="69" fontSize="9" fill={MUTED} textAnchor="middle">presence → neutral (not motivating)</text>
      <text x="387" y="57" fontSize="9" fill={MUTED} textAnchor="middle">presence →</text>
      <text x="387" y="69" fontSize="9" fill={MUTED} textAnchor="middle">motivation & satisfaction</text>
      {/* Dividers */}
      <line x1="30"  y1="77" x2="235" y2="77" stroke={RED}   strokeWidth="1" opacity="0.4" />
      <line x1="285" y1="77" x2="490" y2="77" stroke={BRAND} strokeWidth="1" opacity="0.4" />
      {/* Hygiene items */}
      {hygiene.map((item, i) => (
        <g key={i}>
          <circle cx="37" cy={92 + i * 32} r="3" fill={RED} opacity="0.7" />
          <text x="47" y={96 + i * 32} fontSize="11" fill={STROKE}>{item}</text>
        </g>
      ))}
      {/* Motivator items */}
      {motivators.map((item, i) => (
        <g key={i}>
          <circle cx="292" cy={92 + i * 32} r="3" fill={BRAND} opacity="0.7" />
          <text x="302" y={96 + i * 32} fontSize="11" fill={STROKE}>{item}</text>
        </g>
      ))}
      {/* Caption */}
      <rect x="20" y="257" width="480" height="24" rx="4" fill={RED} opacity="0.12" stroke={RED} strokeWidth="1" />
      <text x="260" y="273" fontSize="11" fill={RED} textAnchor="middle" fontWeight="bold">Pay is a HYGIENE factor, not a motivator</text>
    </svg>
  );
}
