'use client';

// components/landing/ScrollableHint.tsx
// MARKS A SCROLL CONTAINER AS ACTUALLY-SCROLLABLE, so a "scroll to see more" cue can be
// driven by the condition it describes rather than by a guess about when that condition holds.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// The compare-table hint used to be `display: none` with `@media (max-width: 720px) {
// display: block }` — i.e. "assume the table overflows on a phone and not otherwise". Both
// halves of that assumption were wrong in production at the same time: APM's table overflowed
// at 1920px with the hint HIDDEN (the only cue that more table existed was the visual clip at
// the container edge), while a narrow viewport with a short table would have shown a hint
// pointing at nothing. A breakpoint is a proxy for overflow, and the proxy is only as good as
// the longest string any future config puts in a cell — which is exactly the failure already
// banked in `AFM_SURFACED.md` for the exactly-fits flex nav.
//
// So: measure. This sets `data-scrollable="true"|"false"` on every matching container and the
// CSS keys off that attribute. The cue now appears whenever the table scrolls, at any width,
// and hides when it does not.
//
// ── RENDERS NULL, DELIBERATELY ──────────────────────────────────────────────
// It contributes no markup — it only annotates existing server-rendered DOM. That keeps the
// pages that use it server-rendered (ACCALandingPage's FAQPage JSON-LD must not move behind
// hydration) and means adding it cannot change a rendered-body snapshot — which is what lets
// it sit inside APM's SHA-256 pin. Effects still run for a component that returns null,
// because it is mounted.
//
// ── NO-JS BEHAVIOUR, STATED PLAINLY ─────────────────────────────────────────
// Without JS the attribute is never set and the hint stays hidden at every width. That is a
// deliberate trade: the alternative (keeping the old media query as a floor) reintroduces the
// exact wrong-at-both-ends behaviour this replaces, and would flash an incorrect hint before
// hydration. The table still scrolls and still visibly clips without the cue; the cue is an
// affordance, not the affordance itself.

import { useEffect } from 'react';

interface Props {
  /** CSS selector for the scroll container(s) to annotate, e.g. '.plp-cmptable-scroll'. */
  selector: string;
}

/** Sub-pixel layout can leave scrollWidth a hair above clientWidth on a container that does
 *  not actually scroll. A 1px floor keeps a rounding artefact from showing a false cue. */
const OVERFLOW_EPSILON = 1;

export default function ScrollableHint({ selector }: Props) {
  useEffect(() => {
    const containers = Array.from(document.querySelectorAll<HTMLElement>(selector));
    if (containers.length === 0) return;

    const sync = () => {
      for (const el of containers) {
        el.setAttribute(
          'data-scrollable',
          el.scrollWidth - el.clientWidth > OVERFLOW_EPSILON ? 'true' : 'false',
        );
      }
    };

    sync();

    // BOTH the container and its content are observed, and they answer different questions.
    // The container's width changes when the viewport does; the CONTENT's width changes when
    // the text inside it reflows — a longer cell in a future config, a different locale, a
    // user font-size override. Observing only one of the two makes the cue correct for one
    // class of change and stale for the other.
    const ro = new ResizeObserver(sync);
    for (const el of containers) {
      ro.observe(el);
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    window.addEventListener('resize', sync, { passive: true });

    // A late web-font swap changes text metrics, and therefore table width, after first
    // paint. Without this the first measurement can be taken against fallback-font metrics.
    document.fonts?.ready?.then(sync).catch(() => {});

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
      for (const el of containers) el.removeAttribute('data-scrollable');
    };
  }, [selector]);

  return null;
}
