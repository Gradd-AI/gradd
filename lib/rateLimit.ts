// lib/rateLimit.ts
// Per-user message rate limiting using Supabase.
// 50 messages per 1-hour sliding window.
// Uses service role client — bypasses RLS.

import { createClient } from '@supabase/supabase-js'

const WINDOW_HOURS = 1
const MAX_MESSAGES = 50

function getWindowStart(): string {
  const now = new Date()
  // Truncate to the current hour
  now.setMinutes(0, 0, 0)
  return now.toISOString()
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  const supabase = getServiceClient()
  const windowStart = getWindowStart()

  const resetAt = new Date(windowStart)
  resetAt.setHours(resetAt.getHours() + WINDOW_HOURS)

  // Upsert: increment count if row exists for this window, insert if not
  const { data, error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_window_start: windowStart,
    p_max_messages: MAX_MESSAGES,
  })

  if (error) {
    // On any DB error, fail open — don't block legitimate users
    console.error('[rateLimit] DB error, failing open:', error.message)
    return { allowed: true, remaining: MAX_MESSAGES, resetAt }
  }

  const count: number = data ?? 1
  const allowed = count <= MAX_MESSAGES
  const remaining = Math.max(0, MAX_MESSAGES - count)

  return { allowed, remaining, resetAt }
}
