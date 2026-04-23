// app/dashboard/page.tsx
// Dashboard page — authenticated, subscription-gated.
// Fetches all data via useDashboardData hook and renders the toggle dashboard.
// Replace the existing dashboard page body with this file.

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useDashboardData } from '@/hooks/useDashboardData'
import ParentStudentDashboard from '@/components/dashboard/ParentStudentDashboard'

// ─── Subscription gate ──────────────────────────────────────────────────────

interface Profile {
  student_name: string
  subscription_status: string
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const dashboardData = useDashboardData()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        router.replace('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('student_name, subscription_status')
        .eq('id', user.id)
        .single()

      if (error || !data) {
        router.replace('/login')
        return
      }

      // Gate: redirect to subscribe if no active subscription
      if (data.subscription_status !== 'active') {
        router.replace('/subscribe')
        return
      }

      setProfile(data as Profile)
      setProfileLoading(false)
    }

    loadProfile()
  }, [supabase, router])

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Loading your dashboard…</p>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav — minimal, matches existing app nav */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-teal-700 tracking-tight">Gradd</span>
          <nav className="flex items-center gap-4">
            <a
              href="/session"
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 transition-colors"
            >
              Start session
            </a>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        <ParentStudentDashboard
          dashboardData={dashboardData}
          studentName={profile.student_name}
        />
      </main>
    </div>
  )
}
