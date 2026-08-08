// PUBLIC, no-auth page — deliberately omits the per-page auth guard that /acca/tutor,
// /acca/mock, /acca/cases use (same pattern as /acca/auth and /acca/subscribe). This is the
// free resit diagnostic wedge; anyone can reach it.
//
// The whole surface lives in components/acca/ResitRunner.tsx. This page and
// app/acca/afm/resit/page.tsx differ ONLY in the `paper` prop — the same split
// app/acca/mock and app/acca/afm/mock already use for SitRunner.

import ResitRunner from '@/components/acca/ResitRunner';

export default function ResitPage() {
  return <ResitRunner paper="APM" />;
}
