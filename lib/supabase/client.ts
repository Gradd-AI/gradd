// lib/supabase/client.ts
// Browser-side Supabase client using @supabase/ssr.
// Stores session in cookies (not localStorage) so proxy.ts can read it server-side.

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}

// Used by existing login/signup pages
export function createClient(): SupabaseClient {
  return getSupabaseBrowserClient()
}

// Used by dashboard hook and page
export { getSupabaseBrowserClient }
