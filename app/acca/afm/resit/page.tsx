// PUBLIC, no-auth page — AFM's free entry point, and until now the paper had none. AFM
// carried 63 drills, 5 practice cases and a live mock behind an auth wall with no free
// diagnostic in front of any of it, which is why the pillar's resit band was scoped
// "Failed APM?" — sending an AFM resitter to /acca/resit would have profiled them against
// APM's topic groups and, because the lo_code prefixes collide exactly, routed them into
// APM's drills.
//
// Sits under /acca/afm/* alongside the AFM spoke and /acca/afm/mock, not at
// /acca/resit/afm — the AFM surfaces are grouped by paper, not by feature.
//
// Differs from app/acca/resit/page.tsx ONLY in the `paper` prop.

import ResitRunner from '@/components/acca/ResitRunner';

export default function AfmResitPage() {
  return <ResitRunner paper="AFM" />;
}
