'use client';

import type { SurfaceEvent } from './surface-events';

// The browser half of the surface-event pair. Separate from `surface-events.ts` so that
// module stays PURE and the fixtures can import the builders and the parser without a
// network stub anywhere near them.
//
// FIRE-AND-FORGET, AND SILENT ON FAILURE — a view event must never be able to affect the
// surface it is measuring. No await, no state, no error surfaced: if the request is blocked,
// slow, or 500s, the student sees nothing and the count is short by one. That is the correct
// trade for telemetry and the wrong trade for anything a decision depends on, which is why
// the route's header states plainly that nothing reads these at serve time.
//
// NO `user_id` IS SENT. Not omitted by oversight — the route derives identity from the
// session and `parseSurfaceEvent` rejects `user_id` as an unknown key, so sending one would
// 400 the request. Passing an identity from here is the exact hole the authed sink closes.
export function emitSurfaceEvent(event: SurfaceEvent): void {
  void fetch('/api/acca/surface-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => { /* telemetry never breaks the surface it measures */ });
}
