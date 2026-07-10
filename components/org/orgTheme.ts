// components/org/orgTheme.ts
// House-token styling for the /org coordinator dashboard. No new design system —
// everything keys off the globals.css CSS variables (--brand, --surface, --border,
// --font-display = Georgia, etc.). Scoped under `.org` so nothing leaks.
// Polish pass (heatmap-hero, hover states, sparklines) is the banked Phase c+ session.

export type Band = 'green' | 'amber' | 'red';

/** Muted RAG band chip tones (warm, house cream palette — not traffic-light harsh). */
export function bandTone(band: Band): { bg: string; fg: string; label: string } {
  switch (band) {
    case 'green': return { bg: '#dce8dd', fg: '#1e5a38', label: 'Green' };
    case 'amber': return { bg: '#f0e4c8', fg: '#8a6a1c', label: 'Amber' };
    case 'red':   return { bg: '#ecd0c8', fg: '#a4402e', label: 'Red' };
  }
}

/** Authoritative APM sub-area → syllabus topic (source: scripts/apm-framework.ts).
 *  Shown on column-header hover so a coordinator reading a code sees the plain name. */
export const SUB_AREA_NAME: Record<string, string> = {
  A1: 'Strategic management accounting',
  A2: 'Performance hierarchy',
  A3: 'Financial performance measurement',
  A4: 'Non-financial performance measurement',
  A5: 'Sustainability',
  B1: 'Budgetary planning and control',
  B2: 'Performance and reward',
  B3: 'Performance improvement models and techniques',
  B4: 'Performance optimisation in specific contexts',
  C1: 'Management reports',
  D1: 'Technology and information systems',
  D2: 'Data science and analytics',
};

// Continuous RAG ramp anchors (warm, muted — not traffic-light harsh). Miss-rate
// 0.0 = clean sage, 0.5 = amber, 1.0 = rust. Interpolated in RGB so the field reads
// as one smooth gradient rather than five visible bands.
const RAMP: [number, number, number][] = [
  [196, 217, 197], // sage  (0.0)
  [237, 221, 176], // amber (0.5)
  [214, 160, 138], // rust  (1.0)
];
const mix = (a: number[], b: number[], t: number) =>
  a.map((v, i) => Math.round(v + (b[i] - v) * t));

/** Heatmap cell tint by miss-rate: continuous sage → amber → rust. */
export function cellTone(missRate: number | null): { bg: string; fg: string } {
  if (missRate == null) return { bg: 'var(--surface-2)', fg: 'var(--text-light)' };
  const t = Math.max(0, Math.min(1, missRate));
  const [c0, c1, seg] = t < 0.5 ? [RAMP[0], RAMP[1], t / 0.5] : [RAMP[1], RAMP[2], (t - 0.5) / 0.5];
  const [r, g, b] = mix(c0, c1, seg);
  // One deep warm ink across the whole ramp — maximal legibility at 3 metres.
  return { bg: `rgb(${r}, ${g}, ${b})`, fg: '#2c2114' };
}

/** "today" / "2 days ago" / "—". */
export function fmtDays(days: number | null): string {
  if (days == null) return 'never';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

/** ISO date → "12 Jun". */
export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}`;
}

// Scoped stylesheet. Rendered once per page via <style>{ORG_CSS}</style>.
export const ORG_CSS = `
.org { max-width: 1040px; margin: 0 auto; padding: 0 20px 64px; }
.org-header {
  position: sticky; top: 0; z-index: 10; background: var(--brand);
  margin: 0 -20px 28px; padding: 14px 20px;
  display: flex; align-items: center; gap: 12px;
}
.org-header a.wordmark { font-family: var(--font-display); font-size: 20px; color: #fff; text-decoration: none; font-weight: 600; }
.org-crumb { color: #b9cabf; font-size: 13px; display: flex; gap: 8px; align-items: center; }
.org-crumb a { color: #b9cabf; text-decoration: none; }
.org-crumb a:hover { color: #fff; }

.org h1 { font-family: var(--font-display); font-size: 34px; color: var(--brand); margin: 8px 0 6px; font-weight: 600; letter-spacing: -0.4px; line-height: 1.15; }
.org h2 { font-family: var(--font-display); font-size: 21px; color: var(--brand); margin: 32px 0 14px; font-weight: 600; }
.org .sub { color: var(--text-muted); font-size: 15px; margin-bottom: 22px; }

/* utilisation — a quiet trust signal, not an afterthought */
.org-util { font-size: 13px; color: var(--text-muted); background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand-light); border-radius: var(--radius-sm); padding: 10px 16px; display: inline-block; margin-bottom: 8px; letter-spacing: .01em; }
.org-util b { color: var(--text); font-weight: 700; font-variant-numeric: tabular-nums; }

/* cohort cards */
.org-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 18px; }
.org-card { display: block; text-decoration: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px; box-shadow: var(--shadow-sm); transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease; }
.org-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); border-color: var(--brand-light); }
.org-card .label { font-family: var(--font-display); font-size: 21px; color: var(--brand); font-weight: 600; letter-spacing: -.3px; }
.org-card .meta { color: var(--text-muted); font-size: 13px; margin: 3px 0 18px; }
.org-statgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.org-stat { background: var(--surface-2); border-radius: var(--radius-sm); padding: 12px 10px; text-align: center; }
.org-stat .n { font-family: var(--font-display); font-size: 30px; font-weight: 600; color: var(--text); line-height: 1; letter-spacing: -.5px; font-variant-numeric: tabular-nums; }
.org-stat .n.green { color: #1e5a38; }
.org-stat .n.red { color: #a4402e; }
.org-stat .k { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; margin-top: 5px; }

/* RAG mix bar — refined segmented bar */
.org-ragbar { display: flex; gap: 2px; height: 12px; background: transparent; }
.org-ragbar > span { display: block; border-radius: 3px; min-width: 2px; }
.org-ragbar > span:first-child { border-radius: 6px 3px 3px 6px; }
.org-ragbar > span:last-child { border-radius: 3px 6px 6px 3px; }
.org-ragrow { display: flex; align-items: center; gap: 16px; font-size: 12px; color: var(--text-muted); margin-top: 10px; }
.org-ragrow .seg { display: inline-flex; align-items: center; gap: 6px; }
.org-ragrow .seg i { width: 9px; height: 9px; border-radius: 2px; display: inline-block; }
.org-ragrow b { color: var(--text); font-weight: 700; font-variant-numeric: tabular-nums; }
.org-ragrow .active { margin-left: auto; color: var(--text-light); }

/* chips — squared micro-caps, editorial not badge-library */
.org-chip { display: inline-block; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px; letter-spacing: .09em; text-transform: uppercase; line-height: 1; }

/* heatmap ─ the hero. Table fits the 1040px shell (12 cols), so on the meeting-room
   screen it doesn't scroll and hover tooltips escape freely; overflow is re-enabled
   only on narrow viewports as a fallback. */
.org-heat-wrap { position: relative; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 4px; box-shadow: var(--shadow-sm); }
@media (max-width: 1100px) { .org-heat-wrap { overflow-x: auto; } }
table.org-heat { border-collapse: separate; border-spacing: 3px; width: 100%; font-size: 14px; }
table.org-heat th, table.org-heat td { padding: 10px 8px; text-align: center; white-space: nowrap; }
table.org-heat thead th { position: relative; color: var(--text-muted); font-weight: 700; font-size: 12px; letter-spacing: .06em; cursor: default; }
table.org-heat th.name, table.org-heat td.name { text-align: left; }
table.org-heat td.cell { position: relative; font-variant-numeric: tabular-nums; font-weight: 700; font-size: 15px; border-radius: 6px; letter-spacing: .01em; }
table.org-heat tbody tr:hover td.name .org-name-link { color: var(--brand); }
/* cohort roll-up — set apart and heavier so the average reads across the room */
table.org-heat tr.rollup td { padding-top: 16px; }
table.org-heat tr.rollup td.name { font-family: var(--font-display); font-size: 15px; font-weight: 600; color: var(--brand); vertical-align: middle; }
table.org-heat tr.rollup td.cell { font-size: 17px; font-weight: 800; box-shadow: inset 0 0 0 1.5px rgba(44,33,20,.14); }
table.org-heat tr.rollup td::before { content: ''; position: absolute; top: 6px; left: 4px; right: 4px; border-top: 2px solid var(--border); }
.org-name-link { color: var(--text); text-decoration: none; font-weight: 500; transition: color .12s; }
.org-name-link:hover { color: var(--brand); text-decoration: underline; }

/* styled hover tooltips (cells + column headers) — no title-attribute */
.org-tip { position: absolute; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%) translateY(4px); background: var(--brand); color: #fff; font-size: 12px; font-weight: 500; line-height: 1.4; letter-spacing: .01em; padding: 7px 11px; border-radius: 8px; white-space: nowrap; box-shadow: var(--shadow); opacity: 0; visibility: hidden; transition: opacity .12s ease, transform .12s ease; z-index: 30; pointer-events: none; text-transform: none; }
.org-tip b { font-weight: 700; }
.org-tip::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: var(--brand); }
.cell:hover .org-tip, thead th:hover .org-tip { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
/* header tips point downward (nothing above the header row) */
thead th .org-tip { bottom: auto; top: calc(100% + 8px); transform: translateX(-50%) translateY(-4px); }
thead th .org-tip::after { top: auto; bottom: 100%; border-top-color: transparent; border-bottom-color: var(--brand); }
thead th:hover .org-tip { transform: translateX(-50%) translateY(0); }

/* drill-down */
.org-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 22px 24px; margin-bottom: 16px; box-shadow: var(--shadow-sm); }

/* verdict row — readiness score left, activity sparkline right */
.org-verdict { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 18px; }
.org-verdict-score { display: flex; align-items: center; gap: 12px; }

/* four component tiles — the explainability centrepiece */
.org-comp { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 640px) { .org-comp { grid-template-columns: repeat(2, 1fr); } }
.org-comp .c { background: var(--surface-2); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 16px 16px 14px; }
.org-comp .c .c-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 9px; }
.org-comp .c .c-name { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .06em; }
.org-comp .c .c-w { font-size: 10.5px; font-weight: 600; color: var(--text-light); background: var(--surface); border: 1px solid var(--border); border-radius: 5px; padding: 1px 6px; white-space: nowrap; }
.org-comp .c .v { font-family: var(--font-display); font-size: 32px; font-weight: 600; color: var(--text); line-height: 1; letter-spacing: -.5px; font-variant-numeric: tabular-nums; }
.org-comp .c .d { font-size: 12px; color: var(--text-muted); margin-top: 8px; line-height: 1.45; }

/* activity sparkline */
.org-spark { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.org-spark-label { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-light); }
.org-spark svg { display: block; }
.org-spark-legend { display: flex; gap: 14px; font-size: 11px; color: var(--text-muted); }
.org-spark-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }

.org-kv { display: flex; flex-wrap: wrap; gap: 8px; }
.org-kv .pill { background: var(--surface-2); border: 1px solid var(--border-light); border-radius: 6px; padding: 4px 11px; font-size: 12px; font-weight: 500; color: var(--text); }
table.org-list { border-collapse: collapse; width: 100%; font-size: 13px; }
table.org-list th, table.org-list td { padding: 9px 10px; text-align: left; border-bottom: 1px solid var(--border-light); }
table.org-list tbody tr:last-child td { border-bottom: none; }
table.org-list th { color: var(--text-light); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; }
table.org-list td.date { font-variant-numeric: tabular-nums; color: var(--text-muted); white-space: nowrap; }
table.org-list td.num { text-align: right; font-variant-numeric: tabular-nums; }
.org-out { display: inline-block; font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 5px; text-transform: uppercase; letter-spacing: .05em; }
.org-out.ok { background: #dce8dd; color: #1e5a38; }
.org-out.miss { background: #ecd0c8; color: #a4402e; }
.org-note { font-size: 12px; color: var(--text-light); margin-top: 6px; }
.org-back { display: inline-block; margin-bottom: 14px; font-size: 13px; color: var(--brand); text-decoration: none; }
.org-back:hover { text-decoration: underline; }
`;
