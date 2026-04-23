// lib/supabase/client.ts
// Browser-side Supabase client for use in 'use client' components and hooks.
// Uses @supabase/supabase-js directly — no auth-helpers dependency required.

import { createClient, SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client
  client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
