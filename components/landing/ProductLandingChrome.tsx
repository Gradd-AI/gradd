'use client';

// components/landing/ProductLandingChrome.tsx
// The ONLY client code in the product-landing template.
//
// ── THE BOUNDARY, AND WHY IT IS DRAWN HERE ──────────────────────────────────
// ACCALandingPage is `'use client'` for its WHOLE 1,150 lines, because two pieces of
// scroll chrome need `useState` — a header shadow past 40px and a back-to-top button past
// 600px. Everything else on that page is static.
//
// Porting that wholesale would have made the generalised template a client component, and
// that is not a style preference: `<script type="application/ld+json">` emitted from a
// client component is React-hydrated markup rather than part of the server-rendered HTML,
// and the FAQPage schema is worth a rich result. Metadata and JSON-LD MUST stay server-
// rendered, so the chrome is the island and the page is not.
//
// These two controls are also genuinely all that needs a client: the FAQ on APM is a plain
// <dl>, not an accordion, so it needs no state at all. Nothing here reads config content;
// it takes booleans and renders furniture.

import { useEffect, useState } from 'react';

interface Props {
  /** Toggle a shadow on the sticky header past a small scroll offset. */
  headerShadow?: boolean;
  /** Show a back-to-top control once the visitor is well down the page. */
  backToTop?: boolean;
}

const SHADOW_AT = 40;
const TOP_BUTTON_AT = 600;

export default function ProductLandingChrome({ headerShadow = false, backToTop = false }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

  // Nothing to listen for if neither control is on — an idle scroll listener on every
  // product page is a cost with no output.
  const active = headerShadow || backToTop;

  useEffect(() => {
    if (!active) return;
    const onScroll = () => {
      if (headerShadow) setScrolled(window.scrollY > SHADOW_AT);
      if (backToTop) setShowTop(window.scrollY > TOP_BUTTON_AT);
    };
    onScroll();   // set initial state for a visitor who lands mid-page (a #anchor, a restored scroll)
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [active, headerShadow, backToTop]);

  // The header is SERVER-rendered, so this cannot pass it a prop. It sets a data attribute
  // on the template's own root instead and the CSS keys off that — the header keeps its
  // server-rendered markup and the shadow is a pure presentation concern.
  useEffect(() => {
    if (!headerShadow) return;
    const root = document.querySelector('.plp');
    if (!root) return;
    root.setAttribute('data-scrolled', scrolled ? 'true' : 'false');
    return () => root.removeAttribute('data-scrolled');
  }, [headerShadow, scrolled]);

  if (!active) return null;

  return (
    <>
      {backToTop && (
        <button
          type="button"
          className={`plp-totop${showTop ? ' is-visible' : ''}`}
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" width="16" height="16">
            <path
              d="M8 13V3M3.5 7.5L8 3l4.5 4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </>
  );
}
