// lib/acca/sit-attempt.ts
// Which paper is a sit request about, and which attempt row is it? Shared by
// app/api/acca/sit (the paper READ + the clock) and app/api/acca/sit/results (the
// debrief), so the two verbs and the two routes can never disagree about which paper
// is being sat.
//
// This is the ONE piece of the sit surface that is not pure — it queries
// acca_mock_attempts — so it takes the client as a parameter rather than creating one.
// The RESOLUTION ORDER itself is pure and is exported separately (resolveOrder) so the
// precedence rule can be fixtured without a database.
//
// WHY IT MOVED OUT OF THE ROUTE (2026-07-31): the results endpoint has to resolve the
// same paper the sit route served, from the same hints, or a student who sat AFM could
// be handed the APM debrief. Copying three helpers into a second route is exactly the
// drift this module exists to prevent.

import { getMockPaper, getMockPapers, type MockPaper } from '@/lib/acca/mocks';
import { resolvePaper } from '@/lib/acca/paper';

export interface AttemptRow {
  /** Surrogate key added by migration 20260801120000 so an attempt can be REFERENCED.
   *  acca_case_progress.attempt_id points at this, which is what makes a sit row
   *  distinguishable from practice work by construction. */
  id: string;
  mock_id: string;
  started_at: string;
  ends_at: string;
  completed: boolean;
  completed_at?: string | null;
}

/** The minimum surface of the Supabase client these helpers use. Typed structurally so
 *  callers pass their own service client without this module importing one. */
type Queryable = {
  from: (table: string) => any;   // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * Which hint wins, as a PURE rule.
 *
 * ── CORRECTED 2026-08-01: AN EXPLICIT `paper=` OUTRANKS AN OPEN ATTEMPT ─────
 * The order was mock_id → open attempt → paper param, justified as "an open sit outranks a
 * query hint, so a refresh mid-paper always returns to the paper being sat". That reasoning
 * holds for a BARE GET, where there is no hint to respect and the open attempt is the only
 * thing that knows what the student is doing. It is wrong the moment the caller NAMES a paper:
 * `/acca/afm/mock` asks for AFM explicitly, and returning APM because an old APM attempt is
 * still open is a cross-paper content leak — the student is served the wrong paper's scenarios,
 * requirements and marks.
 *
 * So the rule is now: an EXPLICIT hint of either kind wins, and the open attempt is the
 * fallback for a bare request. `mock_id` still outranks `paper` because it is the more specific
 * of the two explicit hints.
 *
 * `paperParam` must be the RAW query/body value, not the result of `resolvePaper()` — that
 * function defaults absent input to 'APM', which would make every bare request look explicit
 * and defeat the open-attempt fallback entirely.
 */
export type ResolutionSource = 'mock_id' | 'paper_param' | 'open_attempt';

export function resolveOrder(
  mockId: string | null,
  openAttemptMockId: string | null,
  paperParam?: string | null,
): ResolutionSource {
  if (mockId) return 'mock_id';
  if (paperParam) return 'paper_param';
  if (openAttemptMockId) return 'open_attempt';
  return 'paper_param';
}

/** The caller's latest attempt for ONE paper. Scoped by mock_id, so an open APM attempt
 *  is never mistaken for an AFM one — the ids are unique across the merged registry. */
export async function attemptFor(
  supabase: Queryable,
  userId: string,
  mockId: string,
): Promise<AttemptRow | null> {
  const { data } = await supabase
    .from('acca_mock_attempts')
    .select('id, mock_id, started_at, ends_at, completed, completed_at')
    .eq('user_id', userId)
    .eq('mock_id', mockId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

/** The caller's most recent UNCOMPLETED attempt across every paper, if any. */
export async function openAttemptAnyPaper(
  supabase: Queryable,
  userId: string,
): Promise<AttemptRow | null> {
  const { data } = await supabase
    .from('acca_mock_attempts')
    .select('id, mock_id, started_at, ends_at, completed, completed_at')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const row = (data as AttemptRow | null) ?? null;
  // An attempt whose mock_id is not in the registry unlocks nothing and resolves nothing.
  return row && getMockPaper(row.mock_id) ? row : null;
}

export interface ResolvedPaper {
  config: MockPaper;
  attempt: AttemptRow | null;
  source: ResolutionSource;
}

/**
 * Which paper is this request about?
 *   1. explicit `mock_id`   — the most specific hint; must exist in the registry
 *   2. explicit `paper=`    — the caller NAMED a paper; it wins over any open attempt
 *   3. the caller's open attempt — the fallback for a BARE request, so a refresh with no
 *                             hint still returns to the paper being sat
 * Returns null when the hint names nothing servable, which callers turn into a 404.
 *
 * Step 2 was previously step 3. See `resolveOrder` for why that was a cross-paper leak.
 */
export async function resolvePaperConfig(
  supabase: Queryable,
  userId: string,
  url: URL,
): Promise<ResolvedPaper | null> {
  const mockId = url.searchParams.get('mock_id');
  if (mockId) {
    const config = getMockPaper(mockId);
    return config
      ? { config, attempt: await attemptFor(supabase, userId, config.id), source: 'mock_id' }
      : null;
  }
  // RAW, not resolvePaper() — that defaults absent input to 'APM', which would make every
  // bare request look explicit and permanently shadow the open-attempt fallback below.
  const paperParam = url.searchParams.get('paper');
  if (paperParam) {
    const config = getMockPapers(resolvePaper(paperParam))[0];
    return config
      ? { config, attempt: await attemptFor(supabase, userId, config.id), source: 'paper_param' }
      : null;
  }
  const open = await openAttemptAnyPaper(supabase, userId);
  if (open) {
    return { config: getMockPaper(open.mock_id)!, attempt: open, source: 'open_attempt' };
  }
  const config = getMockPapers(resolvePaper(null))[0];
  return config
    ? { config, attempt: await attemptFor(supabase, userId, config.id), source: 'paper_param' }
    : null;
}

/** Build the URL the resolver reads from a POST body's hints. Kept here so GET and POST
 *  feed the resolver identically rather than each assembling their own hint object. */
export function hintUrl(requestUrl: string, mockId?: unknown, paper?: unknown): URL {
  const hint = new URL(requestUrl);
  if (typeof mockId === 'string' && mockId) hint.searchParams.set('mock_id', mockId);
  if (typeof paper === 'string' && paper) hint.searchParams.set('paper', paper);
  return hint;
}
