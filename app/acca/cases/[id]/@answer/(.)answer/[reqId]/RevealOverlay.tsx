'use client';

// The overlay SHELL for the intercepted worked answer. It owns dismissal and nothing else — the
// document inside it is a server component passed as `children`, so no part of the artefact, the
// gate or the row ever ships to the browser as component code.
//
// `router.back()` rather than a push to the case URL: the modal was opened by a navigation, so
// going back is what leaves the history stack where the student expects it (browser Back closes
// the overlay instead of leaving the case, and Forward reopens it — the four properties the
// parallel-routes doc lists as the reason to build modals this way).

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function RevealOverlay({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const backdrop = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') router.back();
    }
    document.addEventListener('keydown', onKey);
    // The page behind is a 100vh shell with its own scrollers; locking the body while the overlay
    // is up stops a wheel gesture that reaches the end of the document from scrolling the case.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [router]);

  return (
    <div
      ref={backdrop}
      className="rd-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Worked answer"
      // Backdrop only — a click that started inside the sheet must not dismiss it, which is what
      // comparing against the backdrop element itself (rather than using a bare onClick) buys.
      onMouseDown={(e) => { if (e.target === backdrop.current) router.back(); }}
    >
      <button type="button" className="rd-overlay-close" onClick={() => router.back()}>
        Close
      </button>
      {children}
    </div>
  );
}
