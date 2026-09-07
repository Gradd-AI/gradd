// app/acca/cases/[id]/answer/[reqId]/page.tsx
//
// THE STANDALONE WORKED ANSWER. This is what a HARD navigation renders — a deep link, a refresh,
// a new tab, a bookmark. The soft-navigation case is intercepted by
// `../../@answer/(.)answer/[reqId]/page.tsx`, which renders the SAME component inside an overlay.
//
// Per the Next.js intercepting-routes contract: the interception applies to client-side
// navigation only, and on a full page load "the entire page should render instead of the modal".
// This file is that page, and it is the one a shared URL resolves to.
//
// No `?paper=`: this route is ID-ADDRESSED twice over (a case id and a requirement id are both
// globally-unique primary keys), so the paper comes off the case row inside `RevealDocument`.
// `lib/acca/paper-url.ts` lists id-addressed links as one of the three categories that stay bare.

import type { Metadata } from 'next';
import RevealDocument from './RevealDocument';
import { REVEAL_DOCUMENT_CSS } from './styles';

// The title deliberately says nothing about the case or the requirement. A browser tab, a
// bookmark bar and a shared-link preview are all places this string is read by somebody who has
// not earned the artefact behind it.
export const metadata: Metadata = {
  title: 'Worked answer · Gradd',
  robots: { index: false, follow: false },
};

export default async function ExpandedAnswerPage({
  params,
}: {
  params: Promise<{ id: string; reqId: string }>;
}) {
  const { id, reqId } = await params;
  return (
    <div className="rd-page">
      <style>{REVEAL_DOCUMENT_CSS}</style>
      <RevealDocument caseId={id} reqId={reqId} chrome="page" />
    </div>
  );
}
