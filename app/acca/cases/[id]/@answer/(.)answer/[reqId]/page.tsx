// app/acca/cases/[id]/@answer/(.)answer/[reqId]/page.tsx
//
// THE INTERCEPTED OVERLAY. Rendered instead of `answer/[reqId]/page.tsx` when the student reaches
// that URL by CLIENT-SIDE navigation from inside the case — the transcript stays mounted behind
// it, so expanding the worked answer never destroys the conversation that earned it.
//
// ── WHY THE MATCHER IS `(.)` AND WHY IT LOOKS WRONG ──────────────────────────
// `(..)` is relative to ROUTE SEGMENTS, not to the file system, and `@answer` is a SLOT — slots
// are not segments (Next.js parallel-routes doc: "for `/@analytics/views` the URL will be
// `/views`"). So this file's segment path is `/acca/cases/[id]/answer/[reqId]`, one level below
// `[id]`, and `(.)` — "same level" — is the matcher that reaches it. Two file-system levels up,
// one segment level. Same shape as the doc's own `app/@auth/(.)login`.
//
// ── WHY THIS IS NOT A SECOND IMPLEMENTATION ──────────────────────────────────
// It renders `RevealDocument` — the same server component the standalone page renders, with the
// same gate inside it. The overlay adds chrome and nothing else. A modal that fetched its own
// copy would be the second place the moat has to be remembered, which is the failure this
// arrangement exists to avoid.

import RevealDocument from '../../../answer/[reqId]/RevealDocument';
import { REVEAL_DOCUMENT_CSS } from '../../../answer/[reqId]/styles';
import RevealOverlay from './RevealOverlay';

export default async function InterceptedAnswer({
  params,
}: {
  params: Promise<{ id: string; reqId: string }>;
}) {
  const { id, reqId } = await params;
  return (
    <>
      <style>{REVEAL_DOCUMENT_CSS}</style>
      {/* The overlay shell is a client component (it needs Escape, a backdrop click and
          router.back()); the DOCUMENT inside it stays a server component and is passed as
          children — the interleaving pattern the parallel-routes doc recommends for exactly
          this, so nothing about the artefact or its gate ships to the browser as code. */}
      <RevealOverlay>
        <RevealDocument caseId={id} reqId={reqId} chrome="overlay" />
      </RevealOverlay>
    </>
  );
}
