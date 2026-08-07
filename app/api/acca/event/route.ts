import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// ── The ACCA funnel event sink ────────────────────────────────────────────────
// `event_type` is a free string by design — this route validates shape, not vocabulary.
//
// LIVE TYPES, and the only emitter is app/acca/tutor/TutorChat.tsx:
//   drill_shown · area_selected · try_another_clicked · tutor_intent ·
//   teach_through_delivered · drill_resolved
//
// ── RETIRED: `reveal_shown` and `try_tutor_clicked` (ruled 2026-08-07) ───────
// Both are DEAD. Neither string appears anywhere in this codebase, so nothing has emitted them
// since whatever surface once did was deleted; the last rows for either are from 2026-06-23 and
// are anonymous (user_id NULL). They are recorded here because the rows still exist and a funnel
// query that counts `reveal_shown` returns zero while reveals are in fact being served — which
// reads as "the feature is unused" rather than "the probe is unplugged". That misreading is the
// entire reason this note exists.
//
// RETIRED RATHER THAN REPAIRED, deliberately. An authed reveal is ALREADY recorded three ways:
// `tutor_intent {intent:'reveal'}` and `drill_resolved` in this table, and durably as
// `acca_drill_messages.call_type='reveal'` plus `acca_tutor_progress.resolved`. Re-emitting
// `reveal_shown` would add a fourth overlapping signal that can silently disagree with the other
// three, and the message row is the authoritative one because it survives a client that never
// fires. Count reveals from `acca_drill_messages`, not from this table.
//
// The historical rows are NOT deleted — they are the only record that the anonymous surface ever
// ran, and deleting them would buy nothing.

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { anon_id, user_id, event_type, drill_lo, metadata } = body as {
    anon_id?: unknown;
    user_id?: unknown;
    event_type?: unknown;
    drill_lo?: unknown;
    metadata?: unknown;
  };

  if (typeof event_type !== 'string' || !event_type) {
    return NextResponse.json({ error: 'event_type required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  await supabase.from('acca_funnel_events').insert({
    anon_id: typeof anon_id === 'string' ? anon_id : null,
    user_id: typeof user_id === 'string' ? user_id : null,
    event_type,
    drill_lo: typeof drill_lo === 'string' ? drill_lo : null,
    metadata:
      metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : null,
  });

  return NextResponse.json({ ok: true });
}
