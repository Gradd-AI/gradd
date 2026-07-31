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

/** Which hint wins, as a PURE rule — an explicit mock_id, then an open attempt, then the
 *  paper query param. An open sit outranks a query hint so a refresh mid-paper always
 *  returns to the paper being sat, never to whatever `?paper=` happens to say. */
export type ResolutionSource = 'mock_id' | 'open_attempt' | 'paper_param';

export function resolveOrder(
  mockId: string | null,
  openAttemptMockId: string | null,
): ResolutionSource {
  if (mockId) return 'mock_id';
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
    .select('mock_id, started_at, ends_at, completed, completed_at')
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
    .select('mock_id, started_at, ends_at, completed, completed_at')
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
 *   1. explicit `mock_id`  — must exist in the registry
 *   2. the caller's open attempt — so a refresh mid-sit never switches paper
 *   3. `paper=` (APM default via resolvePaper) — the first paper for that paper code
 * Returns null when the hint names nothing servable, which callers turn into a 404.
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
  const open = await openAttemptAnyPaper(supabase, userId);
  if (open) {
    return { config: getMockPaper(open.mock_id)!, attempt: open, source: 'open_attempt' };
  }
  const config = getMockPapers(resolvePaper(url.searchParams.get('paper')))[0];
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
