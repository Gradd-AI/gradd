'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

const APM_SECTIONS: Record<string, string> = {
  A: 'Strategic Planning and Control',
  B: 'Performance Measurement Systems and Design',
  C: 'Strategic Performance Measurement',
  D: 'Performance Evaluation and Corporate Failure',
  E: 'Current Issues in Performance Management',
};

export interface PickerArea {
  subArea: string;
  sampleTopic: string;
  count: number;
}

interface AreaPickerProps {
  areas: PickerArea[];
  onSelect: (subArea: string) => void;
  loading?: boolean;
  currentSubArea?: string;
}

function findRichestSection(areas: PickerArea[]): string | null {
  const counts = new Map<string, number>();
  for (const area of areas) {
    const s = area.subArea[0]?.toUpperCase();
    if (s) counts.set(s, (counts.get(s) ?? 0) + area.count);
  }
  let max = 0;
  let best: string | null = null;
  for (const [key, count] of counts) {
    if (count > max) { max = count; best = key; }
  }
  return best;
}

export default function AreaPicker({ areas, onSelect, loading, currentSubArea }: AreaPickerProps) {
  const sections = useMemo(() => {
    const map = new Map<string, PickerArea[]>();
    for (const area of areas) {
      const s = area.subArea[0]?.toUpperCase();
      if (!s) continue;
      if (!map.has(s)) map.set(s, []);
      map.get(s)!.push(area);
    }
    return new Map([...map.entries()].sort());
  }, [areas]);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const best = findRichestSection(areas);
    return best ? new Set([best]) : new Set();
  });

  // For lazy-load case (tutor sidebar): areas starts empty, auto-expand richest once they arrive
  const autoExpandedRef = useRef(false);
  useEffect(() => {
    if (autoExpandedRef.current || areas.length === 0 || expandedSections.size > 0) return;
    const best = findRichestSection(areas);
    if (best) {
      setExpandedSections(new Set([best]));
      autoExpandedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areas]);

  function toggleSection(key: string) {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  if (areas.length === 0) {
    return (
      <>
        <style>{CSS}</style>
        <p className="apm-picker-empty">No areas available yet</p>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="apm-picker">
        {Array.from(sections.entries()).map(([sectionKey, sectionAreas]) => {
          const title = APM_SECTIONS[sectionKey] ?? `Section ${sectionKey}`;
          const isOpen = expandedSections.has(sectionKey);
          const total = sectionAreas.reduce((s, a) => s + a.count, 0);

          return (
            <div key={sectionKey} className="apm-picker-section">
              <button
                className="apm-picker-section-hd"
                onClick={() => toggleSection(sectionKey)}
                aria-expanded={isOpen}
              >
                <span className={`apm-picker-chevron${isOpen ? ' open' : ''}`}>▶</span>
                <span className="apm-picker-section-key">{sectionKey}</span>
                <span className="apm-picker-section-name">{title}</span>
                <span className="apm-picker-section-count">{total}</span>
              </button>

              {isOpen && sectionAreas.map(area => {
                const isCurrent = area.subArea === currentSubArea;
                return (
                  <button
                    key={area.subArea}
                    className={`apm-picker-area${isCurrent ? ' current' : ''}`}
                    onClick={() => !loading && onSelect(area.subArea)}
                    disabled={loading}
                    aria-current={isCurrent ? 'true' : undefined}
                  >
                    <span className="apm-picker-area-code">{area.subArea}</span>
                    <span className="apm-picker-area-name">{area.sampleTopic}</span>
                    <span className="apm-picker-area-count">{area.count}</span>
                    <span className="apm-picker-area-cta">
                      {isCurrent ? 'current' : loading ? '' : 'drill →'}
                    </span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Scoped CSS ─────────────────────────────────────────────────────────────────
// Prefix: .apm-picker
// Used in two contexts: dashboard card (inside .apm-dash) and tutor sidebar (inside .et).
// Both parent scopes define --rust. Section/area rows are pure flex, no fixed widths.

const CSS = `
.apm-picker {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.apm-picker-section { display: flex; flex-direction: column; }

.apm-picker-section-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 13px;
  text-align: left;
  color: var(--text);
  transition: background 0.12s;
}
.apm-picker-section-hd:hover { background: var(--surface-2); }

.apm-picker-chevron {
  font-size: 8px;
  color: var(--text-muted);
  transition: transform 0.15s ease;
  flex-shrink: 0;
  display: inline-block;
}
.apm-picker-chevron.open { transform: rotate(90deg); }

.apm-picker-section-key {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: oklch(64% 0.17 47);
  background: rgba(192,94,60,0.1);
  border: 1px solid rgba(192,94,60,0.2);
  padding: 2px 7px;
  border-radius: 4px;
  flex-shrink: 0;
}
.apm-picker-section-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  min-width: 0;
}
.apm-picker-section-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-light);
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.apm-picker-area {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px 9px 30px;
  border-radius: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 13px;
  text-align: left;
  transition: background 0.12s;
  color: var(--text);
}
.apm-picker-area:hover:not(:disabled) { background: var(--surface-2); }
.apm-picker-area:disabled { opacity: 0.6; cursor: not-allowed; }
.apm-picker-area.current { background: rgba(192,94,60,0.07); }

.apm-picker-area-code {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  flex-shrink: 0;
  min-width: 22px;
}
.apm-picker-area.current .apm-picker-area-code { color: oklch(64% 0.17 47); }

.apm-picker-area-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.apm-picker-area-count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-2);
  border: 1px solid var(--border-light);
  padding: 2px 7px;
  border-radius: 10px;
  font-weight: 500;
  flex-shrink: 0;
}

.apm-picker-area-cta {
  font-size: 11px;
  font-weight: 600;
  color: var(--brand);
  flex-shrink: 0;
  min-width: 44px;
  text-align: right;
  opacity: 0;
  transition: opacity 0.1s;
}
.apm-picker-area:hover:not(:disabled) .apm-picker-area-cta { opacity: 1; }
.apm-picker-area.current .apm-picker-area-cta {
  color: var(--text-muted);
  opacity: 1;
  font-weight: 400;
}

.apm-picker-empty {
  font-size: 13px;
  color: var(--text-muted);
  padding: 16px 0;
  text-align: center;
}
`;
