// lib/supabase/client.ts
// Browser-side Supabase client for use in 'use client' components and hooks.
 
import { createClient as _createClient, SupabaseClient } from '@supabase/supabase-js'
 
let client: SupabaseClient | null = null
 
function getSupabaseBrowserClient(): SupabaseClient {
  if (client) return client
  client = _createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  return client
}
 
// Named export used by existing login/signup pages
export function createClient(): SupabaseClient {
  return getSupabaseBrowserClient()
}
 
// Named export used by new dashboard hook and page
export { getSupabaseBrowserClient }