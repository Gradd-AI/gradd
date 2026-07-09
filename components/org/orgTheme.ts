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

/** Heatmap cell tint by miss-rate: sage (low) → amber → rust (high). Muted tones. */
export function cellTone(missRate: number | null): { bg: string; fg: string } {
  if (missRate == null) return { bg: 'var(--surface-2)', fg: 'var(--text-light)' };
  if (missRate < 0.15) return { bg: '#cdddce', fg: '#234a32' }; // strong sage
  if (missRate < 0.35) return { bg: '#dfe8da', fg: '#3a5a40' }; // light sage
  if (missRate < 0.55) return { bg: '#efe4c9', fg: '#6b5320' }; // light amber
  if (missRate < 0.75) return { bg: '#e6cfa1', fg: '#6b4a17' }; // amber
  return { bg: '#dcae9c', fg: '#7a3b28' };                       // rust
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

.org h1 { font-family: var(--font-display); font-size: 30px; color: var(--brand); margin-bottom: 4px; font-weight: 600; }
.org h2 { font-family: var(--font-display); font-size: 20px; color: var(--brand); margin: 28px 0 12px; font-weight: 600; }
.org .sub { color: var(--text-muted); font-size: 14px; margin-bottom: 20px; }

/* utilisation line */
.org-util { font-size: 13px; color: var(--text-muted); background: var(--surface-2); border-radius: var(--radius-sm); padding: 8px 14px; display: inline-block; margin-bottom: 8px; }
.org-util b { color: var(--text); font-weight: 600; }

/* cohort cards */
.org-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
.org-card { display: block; text-decoration: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; transition: box-shadow .15s ease, transform .15s ease; }
.org-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.org-card .label { font-family: var(--font-display); font-size: 19px; color: var(--brand); font-weight: 600; }
.org-card .meta { color: var(--text-muted); font-size: 13px; margin: 2px 0 16px; }
.org-statgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; }
.org-stat { background: var(--surface-2); border-radius: var(--radius-sm); padding: 10px; text-align: center; }
.org-stat .n { font-family: var(--font-display); font-size: 22px; font-weight: 600; color: var(--text); line-height: 1.1; }
.org-stat .k { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }

/* RAG mix bar */
.org-ragbar { display: flex; height: 10px; border-radius: 6px; overflow: hidden; background: var(--surface-2); }
.org-ragbar > span { display: block; }
.org-ragrow { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); margin-top: 8px; }
.org-ragrow b { color: var(--text); }

/* chips */
.org-chip { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; letter-spacing: .03em; }

/* heatmap */
.org-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
table.org-heat { border-collapse: collapse; width: 100%; font-size: 13px; }
table.org-heat th, table.org-heat td { padding: 7px 8px; text-align: center; white-space: nowrap; }
table.org-heat thead th { background: var(--surface-2); color: var(--text-muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; position: sticky; top: 0; }
table.org-heat th.name, table.org-heat td.name { text-align: left; position: sticky; left: 0; background: var(--surface); z-index: 1; }
table.org-heat tbody tr:hover td.name { background: var(--surface-2); }
table.org-heat td.cell { font-variant-numeric: tabular-nums; font-weight: 600; }
table.org-heat tr.rollup td { border-top: 2px solid var(--border); font-weight: 700; background: var(--surface-2); }
.org-name-link { color: var(--brand); text-decoration: none; font-weight: 600; }
.org-name-link:hover { text-decoration: underline; }

/* drill-down */
.org-panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
.org-comp { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.org-comp .c { background: var(--surface-2); border-radius: var(--radius-sm); padding: 12px; }
.org-comp .c .k { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .04em; }
.org-comp .c .v { font-family: var(--font-display); font-size: 24px; font-weight: 600; color: var(--text); }
.org-comp .c .d { font-size: 12px; color: var(--text-muted); }
.org-kv { display: flex; flex-wrap: wrap; gap: 8px; }
.org-kv .pill { background: var(--surface-2); border-radius: 999px; padding: 3px 10px; font-size: 12px; color: var(--text); }
table.org-list { border-collapse: collapse; width: 100%; font-size: 13px; }
table.org-list th, table.org-list td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--border-light); }
table.org-list th { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
table.org-list td.num { text-align: right; font-variant-numeric: tabular-nums; }
.org-note { font-size: 12px; color: var(--text-light); margin-top: 6px; }
.org-back { display: inline-block; margin-bottom: 14px; font-size: 13px; color: var(--brand); text-decoration: none; }
.org-back:hover { text-decoration: underline; }
`;
