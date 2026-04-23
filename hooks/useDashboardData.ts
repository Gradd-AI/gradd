// hooks/useDashboardData.ts
// Fetches all data required for the parent and student dashboard views.
// Called once on dashboard mount; re-fetched after each session completes.

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface LastSession {
  id: string
  session_number: number
  session_type: string
  lesson_code: string | null
  lesson_name: string | null          // resolved from lessons table
  concepts_covered: string[]
  weak_flags_count: number
  started_at: string
  ended_at: string | null
  apply_scores: string | null
}

export interface WeakArea {
  id: string
  concept_slug: string
  error_description: string
  lesson_code: string
  occurrence_count: number
}

export interface RecentSession {
  id: string
  session_number: number
  session_type: string
  lesson_code: string | null
  started_at: string
  ended_at: string | null
  weak_flags_count: number
}

export interface StudentProgress {
  current_unit_code: string
  current_unit_name: string
  current_lesson_code: string
  current_lesson_name: string
  session_number: number
  spaced_rep_due: boolean
  abq_drill_due: boolean
  units_completed: string[]
  lessons_completed_this_unit: string[]
  last_session_summary: string | null
}

export interface DashboardData {
  progress: StudentProgress | null
  lastSession: LastSession | null
  recentSessions: RecentSession[]
  weakAreas: WeakArea[]
  weakAreasCount: number
  totalLessonsCompleted: number
  totalLessons: number
  sessionsThisWeek: number
  curriculumPercent: number
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function getMondayThisWeek(): Date {
  const now = new Date()
  const day = now.getDay()                       // 0 = Sun, 1 = Mon …
  const diff = day === 0 ? -6 : 1 - day          // days back to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

function prettifySlug(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useDashboardData(): DashboardData {
  const supabase = createClientComponentClient()

  const [data, setData] = useState<Omit<DashboardData, 'refetch'>>({
    progress: null,
    lastSession: null,
    recentSessions: [],
    weakAreas: [],
    weakAreasCount: 0,
    totalLessonsCompleted: 0,
    totalLessons: 279,               // matches lessons_seed.sql row count
    sessionsThisWeek: 0,
    curriculumPercent: 0,
    loading: true,
    error: null,
  })

  const fetch = useCallback(async () => {
    setData((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) throw new Error('Not authenticated')

      const userId = user.id
      const mondayISO = getMondayThisWeek().toISOString()

      // Run all queries in parallel — no waterfalls
      const [
        progressRes,
        lastSessionRes,
        recentSessionsRes,
        weakAreasRes,
        weakAreasCountRes,
        completedCountRes,
        totalLessonsRes,
        sessionsThisWeekRes,
      ] = await Promise.all([
        // 1. Student progress row
        supabase
          .from('student_progress')
          .select(
            'current_unit_code, current_unit_name, current_lesson_code, ' +
            'current_lesson_name, session_number, spaced_rep_due, abq_drill_due, ' +
            'units_completed, lessons_completed_this_unit, last_session_summary'
          )
          .eq('student_id', userId)
          .single(),

        // 2. Most recent completed session
        supabase
          .from('sessions')
          .select(
            'id, session_number, session_type, lesson_code, concepts_covered, ' +
            'weak_flags_count, started_at, ended_at, apply_scores'
          )
          .eq('student_id', userId)
          .not('ended_at', 'is', null)
          .order('started_at', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // 3. Recent sessions (last 5, for parent view list)
        supabase
          .from('sessions')
          .select(
            'id, session_number, session_type, lesson_code, started_at, ended_at, weak_flags_count'
          )
          .eq('student_id', userId)
          .not('ended_at', 'is', null)
          .order('started_at', { ascending: false })
          .limit(5),

        // 4. Active weak areas (top 5 for display)
        supabase
          .from('weak_areas')
          .select('id, concept_slug, error_description, lesson_code, occurrence_count')
          .eq('student_id', userId)
          .is('resolved_at', null)
          .order('occurrence_count', { ascending: false })
          .limit(5),

        // 5. Total active weak area count
        supabase
          .from('weak_areas')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', userId)
          .is('resolved_at', null),

        // 6. Total lessons completed (all time)
        supabase
          .from('lesson_completions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', userId),

        // 7. Total lessons in platform (from static lessons table)
        supabase
          .from('lessons')
          .select('*', { count: 'exact', head: true }),

        // 8. Sessions started this week (Mon–now)
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', userId)
          .gte('started_at', mondayISO),
      ])

      // Throw on any hard failures
      for (const res of [progressRes, recentSessionsRes, weakAreasRes, weakAreasCountRes, completedCountRes]) {
        if (res.error && res.error.code !== 'PGRST116') throw res.error
      }

      const progress = progressRes.data as StudentProgress | null
      const rawLastSession = lastSessionRes.data
      const totalLessons = (totalLessonsRes.count ?? 279)
      const totalLessonsCompleted = completedCountRes.count ?? 0
      const weakAreasCount = weakAreasCountRes.count ?? 0
      const sessionsThisWeek = sessionsThisWeekRes.count ?? 0

      // Resolve lesson name for last session
      let lastSession: LastSession | null = null
      if (rawLastSession) {
        let lessonName: string | null = null
        if (rawLastSession.lesson_code) {
          const { data: lessonRow } = await supabase
            .from('lessons')
            .select('lesson_name')
            .eq('lesson_code', rawLastSession.lesson_code)
            .single()
          lessonName = lessonRow?.lesson_name ?? null
        }

        lastSession = {
          ...rawLastSession,
          lesson_name: lessonName,
          concepts_covered: (rawLastSession.concepts_covered ?? []).map(prettifySlug),
        }
      }

      const curriculumPercent =
        totalLessons > 0
          ? Math.min(100, Math.round((totalLessonsCompleted / totalLessons) * 100))
          : 0

      setData({
        progress,
        lastSession,
        recentSessions: (recentSessionsRes.data ?? []) as RecentSession[],
        weakAreas: (weakAreasRes.data ?? []) as WeakArea[],
        weakAreasCount,
        totalLessonsCompleted,
        totalLessons,
        sessionsThisWeek,
        curriculumPercent,
        loading: false,
        error: null,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data'
      setData((prev) => ({ ...prev, loading: false, error: message }))
    }
  }, [supabase])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { ...data, refetch: fetch }
}
