// ─── IB Economics Diagrams — Unit 1: Introduction to Economics ───────────────
// All diagrams use CSS variables from the Gradd design system.
// Props: highlight?: string[] — array of element IDs to highlight in amber

import React from 'react';

const STROKE = 'var(--chat-text, #2c2825)';
const MUTED = 'var(--chat-muted, #5c5650)';
const BRAND = 'var(--brand, #2d5a3d)';
const AMBER = '#c9903a';
const RED = '#c0392b';
const BLUE = '#2980b9';
const BG = 'transparent';
const FONT = 'Georgia, serif';

// ─── PPC_BASIC ────────────────────────────────────────────────────────────────
export function PPC_BASIC({ highlight = [] }: { highlight?: string[] }) {
  return (
    <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <rect width="500" height="420" fill={BG} />
      {/* Axes */}
      <line x1="60" y1="20" x2="60" y2="360" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="360" x2="460" y2="360" stroke={STROKE} strokeWidth="2" />
      {/* Arrow heads */}
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="468,360 456,355 456,365" fill={STROKE} />
      {/* PPC curve — concave to origin */}
      <path d="M 60,50 Q 180,80 300,200 Q 380,290 450,360" fill="none" stroke={BRAND} strokeWidth="2.5" />
      {/* Point A on curve */}
      <circle cx="160" cy="112" r="5" fill={AMBER} />
      <text x="170" y="108" fontSize="13" fill={AMBER} fontStyle="italic">A</text>
      {/* Point B on curve */}
      <circle cx="340" cy="242" r="5" fill={AMBER} />
      <text x="350" y="238" fontSize="13" fill={AMBER} fontStyle="italic">B</text>
      {/* Inside point */}
      <circle cx="220" cy="260" r="5" fill={MUTED} />
      <text x="230" y="256" fontSize="12" fill={MUTED}>Inefficient</text>
      {/* Outside point */}
      <circle cx="380" cy="140" r="5" fill={RED} />
      <text x="390" y="134" fontSize="12" fill={RED}>Unattainable</text>
      {/* Axis labels */}
      <text x="240" y="400" fontSize="13" fill={STROKE} textAnchor="middle">Good A (e.g. Coffee)</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Good B (e.g. Cocoa)</text>
      {/* Title */}
      <text x="250" y="15" fontSize="13" fill={MUTED} textAnchor="middle">Production Possibility Curve (PPC)</text>
    </svg>
  );
}

// ─── PPC_GROWTH ───────────────────────────────────────────────────────────────
export function PPC_GROWTH({ highlight = [] }: { highlight?: string[] }) {
  return (
    <svg viewBox="0 0 520 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 520, fontFamily: FONT }}>
      <rect width="520" height="420" fill={BG} />
      <line x1="60" y1="20" x2="60" y2="360" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="360" x2="480" y2="360" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="488,360 476,355 476,365" fill={STROKE} />
      {/* Original PPC */}
      <path d="M 60,60 Q 200,90 320,220 Q 390,300 460,360" fill="none" stroke={MUTED} strokeWidth="2" strokeDasharray="6,4" />
      <text x="310" y="228" fontSize="12" fill={MUTED} fontStyle="italic">PPC₁</text>
      {/* New PPC — outward shift */}
      <path d="M 60,30 Q 220,60 370,200 Q 450,285 490,360" fill="none" stroke={BRAND} strokeWidth="2.5" />
      <text x="400" y="165" fontSize="12" fill={BRAND} fontStyle="italic">PPC₂</text>
      {/* Shift arrows */}
      <line x1="200" y1="145" x2="250" y2="118" stroke={AMBER} strokeWidth="1.5" markerEnd="url(#arrow)" strokeDasharray="4,3" />
      <line x1="320" y1="250" x2="370" y2="222" stroke={AMBER} strokeWidth="1.5" strokeDasharray="4,3" />
      <defs>
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={AMBER} />
        </marker>
      </defs>
      {/* Labels */}
      <text x="240" y="400" fontSize="13" fill={STROKE} textAnchor="middle">Good A</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Good B</text>
      <text x="260" y="15" fontSize="13" fill={MUTED} textAnchor="middle">PPC — Outward Shift (Economic Growth)</text>
      <text x="260" y="380" fontSize="11" fill={AMBER} textAnchor="middle">Outward shift = more of both goods now possible</text>
    </svg>
  );
}

// ─── PPC_MOVEMENT ─────────────────────────────────────────────────────────────
export function PPC_MOVEMENT({ highlight = [] }: { highlight?: string[] }) {
  return (
    <svg viewBox="0 0 500 420" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 500, fontFamily: FONT }}>
      <rect width="500" height="420" fill={BG} />
      <line x1="60" y1="20" x2="60" y2="360" stroke={STROKE} strokeWidth="2" />
      <line x1="60" y1="360" x2="460" y2="360" stroke={STROKE} strokeWidth="2" />
      <polygon points="60,12 55,24 65,24" fill={STROKE} />
      <polygon points="468,360 456,355 456,365" fill={STROKE} />
      {/* PPC curve */}
      <path d="M 60,50 Q 180,80 300,200 Q 380,290 450,360" fill="none" stroke={BRAND} strokeWidth="2.5" />
      {/* Point A */}
      <circle cx="148" cy="108" r="6" fill={BLUE} />
      <text x="162" y="92" fontSize="13" fill={BLUE} fontWeight="bold">A (100, 50)</text>
      {/* Point B */}
      <circle cx="310" cy="206" r="6" fill={AMBER} />
      <text x="320" y="202" fontSize="13" fill={AMBER} fontWeight="bold">B (150, 30)</text>
      {/* Arrow along curve */}
      <path d="M 155,114 Q 230,155 304,200" fill="none" stroke={AMBER} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#arrowB)" />
      <defs>
        <marker id="arrowB" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={AMBER} />
        </marker>
      </defs>
      {/* Dashed projection lines */}
      <line x1="148" y1="108" x2="148" y2="360" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <line x1="60" y1="108" x2="148" y2="108" stroke={BLUE} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <line x1="310" y1="206" x2="310" y2="360" stroke={AMBER} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      <line x1="60" y1="206" x2="310" y2="206" stroke={AMBER} strokeWidth="1" strokeDasharray="4,3" opacity="0.5" />
      {/* Axis tick labels */}
      <text x="148" y="375" fontSize="11" fill={BLUE} textAnchor="middle">100</text>
      <text x="310" y="375" fontSize="11" fill={AMBER} textAnchor="middle">150</text>
      <text x="52" y="112" fontSize="11" fill={BLUE} textAnchor="end">50</text>
      <text x="52" y="210" fontSize="11" fill={AMBER} textAnchor="end">30</text>
      {/* Labels */}
      <text x="240" y="400" fontSize="13" fill={STROKE} textAnchor="middle">Coffee (tonnes)</text>
      <text x="22" y="200" fontSize="13" fill={STROKE} textAnchor="middle" transform="rotate(-90,22,200)">Cocoa (tonnes)</text>
      <text x="250" y="15" fontSize="13" fill={MUTED} textAnchor="middle">Movement Along the PPC (Reallocation)</text>
    </svg>
  );
}

// ─── CIRCULAR_FLOW ────────────────────────────────────────────────────────────
export function CIRCULAR_FLOW({ highlight = [] }: { highlight?: string[] }) {
  return (
    <svg viewBox="0 0 560 480" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', maxWidth: 560, fontFamily: FONT }}>
      <rect width="560" height="480" fill={BG} />
      {/* Title */}
      <text x="280" y="18" fontSize="13" fill={MUTED} textAnchor="middle">Circular Flow of Income</text>
      {/* Households box */}
      <rect x="30" y="190" width="120" height="60" rx="6" fill="none" stroke={BRAND} strokeWidth="2" />
      <text x="90" y="222" fontSize="13" fill={STROKE} textAnchor="middle" fontWeight="bold">Households</text>
      {/* Firms box */}
      <rect x="410" y="190" width="120" height="60" rx="6" fill="none" stroke={BRAND} strokeWidth="2" />
      <text x="470" y="222" fontSize="13" fill={STROKE} textAnchor="middle" fontWeight="bold">Firms</text>
      {/* Government box */}
      <rect x="200" y="30" width="160" height="50" rx="6" fill="none" stroke={BLUE} strokeWidth="1.5" />
      <text x="280" y="60" fontSize="12" fill={BLUE} textAnchor="middle">Government</text>
      {/* Banks box */}
      <rect x="200" y="400" width="160" height="50" rx="6" fill="none" stroke={BLUE} strokeWidth="1.5" />
      <text x="280" y="430" fontSize="12" fill={BLUE} textAnchor="middle">Banks / Financial Sector</text>
      {/* Foreign box removed for clarity — annotate */}
      {/* Real flow — top (Labour from HH to Firms) */}
      <path d="M 150,205 Q 280,120 410,205" fill="none" stroke={AMBER} strokeWidth="1.8" markerEnd="url(#am)" />
      <text x="280" y="148" fontSize="11" fill={AMBER} textAnchor="middle">Labour, Land, Capital</text>
      {/* Money flow — bottom (Wages from Firms to HH) */}
      <path d="M 410,235 Q 280,320 150,235" fill="none" stroke={STROKE} strokeWidth="1.8" markerEnd="url(#wh)" />
      <text x="280" y="302" fontSize="11" fill={STROKE} textAnchor="middle">Wages, Rent, Profit</text>
      {/* Leakages — left side */}
      <line x1="90" y1="190" x2="90" y2="80" stroke={RED} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#red)" />
      <text x="30" y="135" fontSize="10" fill={RED}>S (Saving)</text>
      <line x1="90" y1="80" x2="200" y2="56" stroke={RED} strokeWidth="1" strokeDasharray="5,3" />
      {/* Injections — right side */}
      <line x1="470" y1="190" x2="470" y2="80" stroke={BRAND} strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#gr)" />
      <text x="480" y="135" fontSize="10" fill={BRAND}>G (Govt spending)</text>
      <line x1="360" y1="56" x2="470" y2="80" stroke={BRAND} strokeWidth="1" strokeDasharray="5,3" />
      {/* Leakages bottom — Taxes */}
      <line x1="90" y1="250" x2="90" y2="360" stroke={RED} strokeWidth="1.5" strokeDasharray="5,3" />
      <text x="20" y="310" fontSize="10" fill={RED}>T (Tax)</text>
      <line x1="90" y1="360" x2="200" y2="426" stroke={RED} strokeWidth="1" strokeDasharray="5,3" />
      {/* Injections bottom — Investment */}
      <line x1="470" y1="250" x2="470" y2="360" stroke={BRAND} strokeWidth="1.5" strokeDasharray="5,3" />
      <text x="475" y="310" fontSize="10" fill={BRAND}>I (Investment)</text>
      <line x1="360" y1="426" x2="470" y2="360" stroke={BRAND} strokeWidth="1" strokeDasharray="5,3" />
      {/* Imports/Exports label */}
      <text x="280" y="468" fontSize="10" fill={MUTED} textAnchor="middle">Also: M (Imports) = leakage | X (Exports) = injection</text>
      {/* Markers */}
      <defs>
        <marker id="am" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={AMBER} /></marker>
        <marker id="wh" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={STROKE} /></marker>
        <marker id="red" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={RED} /></marker>
        <marker id="gr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill={BRAND} /></marker>
      </defs>
    </svg>
  );
}
