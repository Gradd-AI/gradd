'use client';

import { useEffect, useRef } from 'react';
import type { ServedPaper } from '@/lib/acca/paper';
import { mockResultsViewed } from '@/lib/acca/surface-events';
import { emitSurfaceEvent } from '@/lib/acca/surface-event-client';

// The only client code on the results page: it renders nothing and fires one event.
//
// A SERVER-SIDE emit would have been simpler and is wrong for the same reason `case_opened`
// is client-side — a Next <Link> prefetch renders the RSC payload on hover, so the server
// would report a paper as re-read by a student who moved their mouse past a row on
// /acca/progress. An overcount is the one error a "did they come back" metric cannot absorb.
//
// The ref guard is for React Strict Mode, which double-invokes effects in development. The
// 2026-08-12 walk proved one row per view with this shape; without it, dev traffic writes two.
export default function MockResultsViewed(
  { attemptId, mockId, paper }: { attemptId: string; mockId: string; paper: ServedPaper },
) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    emitSurfaceEvent(mockResultsViewed(attemptId, mockId, paper));
  }, [attemptId, mockId, paper]);
  return null;
}
