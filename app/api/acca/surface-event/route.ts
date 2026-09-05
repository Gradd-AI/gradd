import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { recordAuthFailure } from '@/lib/acca/error-recorder';
import { parseSurfaceEvent } from '@/lib/acca/surface-events';
import { getMockPaper } from '@/lib/acca/mocks';

// ── THE AUTHED SURFACE-EVENT SINK ─────────────────────────────────────────────
// Writes `case_list_viewed` / `case_opened` / `mock_intro_viewed` into the SAME table as the
// drill funnel (`acca_funnel_events`), through a DIFFERENT door. Two doors, one table,
// disjoint vocabularies — and each door refuses the other's vocabulary, so neither can
// become a second way to write the other's facts.
//
// ── WHY NOT JUST EXTEND /api/acca/event ──────────────────────────────────────
// Because that route MUST STAY AUTH-FREE. It serves the anonymous pre-signup drill funnel —
// 45 rows in that table are anon_id-keyed with no user at all, by design — so requiring a
// session there would break the thing it exists for. And it accepts a CLIENT-SUPPLIED
// `user_id` (route.ts:52), which is fine for an anonymous funnel and is precisely wrong for
// an event that is a claim about an identified student's work.
//
// So the split is by TRUST, not by tidiness: anonymous + client-attributed over there,
// authenticated + server-attributed here.
//
// ── ATTRIBUTABLE OR REFUSED, STRUCTURALLY ────────────────────────────────────
// 87 of the 504 rows already in `acca_funnel_events` have NEITHER `user_id` NOR `anon_id`.
// CORRECTED 2026-08-12 after reading the table by day: that is NOT scattered coercion by the
// older sink, it is one CLOSED two-day window (2026-06-25 and 06-27, 100% of both days) in
// which the emitter sent neither identity — anon_id dropped as the anonymous surface was
// removed, user_id not yet threaded through. The sink's null tolerance LET those rows land
// rather than causing them, and nothing has produced an unattributable row since.
//
// The conclusion is unchanged even though the cause was: an event that cannot be attributed
// to a student cannot answer a question about a student, and a sink that accepts a null
// identity will store whatever a mis-wired emitter sends. So none of it is inherited:
//
//   • no session → 401, and NOTHING IS WRITTEN.
//   • `user_id` is taken from `auth.getUser()`. The request body's `user_id` is never read —
//     `parseSurfaceEvent` rejects it as an unknown key — so it cannot be forged onto another
//     student even in principle.
//   • `anon_id` is always NULL. There is no anonymous case or mock surface: both are behind
//     APM_CASES + auth + a per-paper entitlement, so an anonymous view of either is not a
//     thing that can happen, and a column for it would only ever hold a lie.
//   • a malformed payload → 400, and NOTHING IS WRITTEN. `parseSurfaceEvent` is strict in
//     both directions (missing key AND unknown key), so a typo'd metadata key lands as
//     nothing rather than as a row with a hole in it.
//
// There is therefore NO CODE PATH in this route that writes an unattributable row.
//
// ── WHAT IS AND IS NOT GUARANTEED ────────────────────────────────────────────
// All three events are CLIENT-TRIGGERED, because all three are facts only the browser has
// (a list rendered, a case load resolved, a start screen shown). That fixes the ceiling:
//
//   TRUSTED     WHO. The user_id comes from the session cookie.
//   NOT TRUSTED WHETHER. A blocked fetch undercounts; a logged-in student poking this
//               endpoint with curl overcounts — for their OWN row only.
//
// That ceiling is affordable because NOTHING READS THESE AT SERVE TIME. No drill selection,
// no entitlement, no marking, no debrief consults them; they are read by hand, in SQL, to
// answer "did anyone open this". A wrong row costs a wrong count, never a wrong serve. Do not
// wire a serving decision to one of these without revisiting this comment.
//
// NOT GATED ON APM_CASES, deliberately. The flag decides whether the SURFACES exist; a
// telemetry sink that 404s when the flag is off would add a second reason for a missing row
// and make a zero ambiguous — which is the whole failure this event set exists to end.
//
// Fire-and-forget from the caller's point of view, but this route still answers honestly
// (401/400/200) so a fixture or a walk can tell the difference between refused and recorded.

export async function POST(request: Request): Promise<Response> {
  // ── 1. Identity FIRST. No session, no row. ──
  const authClient = await createServerClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  // An OUTAGE records; a logged-out request does not. `recordAuthFailure` owns that
  // distinction (`isAuthOutage`) — an unfiltered version would write a row on every
  // anonymous hit, because no session is itself an AuthSessionMissingError.
  if (authError) await recordAuthFailure('api/acca/surface-event', authError);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // ── 2. Canonicalise or refuse. `parsed.event` is the BUILDER'S output, never the
  //       caller's object, so nothing unexpected can ride along into the row. ──
  const parsed = parseSurfaceEvent(body, getMockPaper);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.reason }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('acca_funnel_events').insert({
    // The session's user, not the body's. This line is the whole attribution guarantee.
    user_id: user.id,
    anon_id: null,
    event_type: parsed.event.event_type,
    // `drill_lo` stays NULL: it is drill-shaped, and writing a case id into it would break
    // every existing funnel query that groups by it. Case identity lives in `metadata`.
    drill_lo: null,
    metadata: parsed.event.metadata,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, event_type: parsed.event.event_type });
}
