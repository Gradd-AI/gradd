// app/api/cron/weekly-email/route.ts
// Runs every Monday at 07:00 UTC via Vercel cron.
// Sends personalised weekly progress email to all active subscribers.
// Early mode (<4 weeks): counts only.
// Established mode (4+ weeks): named lessons, weak areas, trajectory coaching.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { generateWeeklyProgressEmail, WeeklyEmailData } from '@/lib/email/weekly-progress-template'

const resend = new Resend(process.env.RESEND_API_KEY)

const EXAM_DATE = new Date('2026-06-08')
const WEEKS_FOR_DETAILED_EMAIL = 4

function daysToExam(): number {
  const now = new Date()
  const diff = EXAM_DATE.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

function weeksActive(createdAt: string): number {
  const created = new Date(createdAt)
  const now = new Date()
  return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 7))
}

function getWindowStart(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function GET(request: Request) {
  // Verify this is a legitimate Vercel cron call
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getServiceClient()
  const thisWeekStart = getWindowStart(7)
  const lastWeekStart = getWindowStart(14)
  const examDays = daysToExam()

  // ── Fetch all active subscribers with profile + progress ─────────────────
  const { data: subscribers, error: subError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      student_name,
      created_at,
      student_progress (
        current_lesson_name,
        current_unit_name,
        total_session_count
      )
    `)
    .eq('subscription_status', 'active')

  if (subError || !subscribers) {
    console.error('[weekly-email] Failed to fetch subscribers:', subError?.message)
    return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
  }

  const results = { sent: 0, failed: 0, skipped: 0 }

  for (const subscriber of subscribers) {
    try {
      const progress = subscriber.student_progress?.[0]
      if (!progress) {
        results.skipped++
        continue
      }

      const weeks = weeksActive(subscriber.created_at)
      const isEstablished = weeks >= WEEKS_FOR_DETAILED_EMAIL

      // ── Sessions this week ───────────────────────────────────────────────
      const { count: sessionsThisWeek } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', subscriber.id)
        .gte('started_at', thisWeekStart)

      // ── Sessions last week ───────────────────────────────────────────────
      const { count: sessionsLastWeek } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', subscriber.id)
        .gte('started_at', lastWeekStart)
        .lt('started_at', thisWeekStart)

      // ── Study streak ────────────────────────────────────────────────────
      // Count consecutive days with at least one session, going back from today
      const { data: recentSessions } = await supabase
        .from('sessions')
        .select('started_at')
        .eq('student_id', subscriber.id)
        .gte('started_at', getWindowStart(30))
        .order('started_at', { ascending: false })

      const studyStreakDays = calculateStreak(recentSessions ?? [])

      // ── Lessons completed this week (established only) ──────────────────
      let lessonsCompletedThisWeek: { lesson_code: string; lesson_name: string }[] = []
      if (isEstablished) {
        const { data: completions } = await supabase
          .from('lesson_completions')
          .select('lesson_code, completed_at')
          .eq('student_id', subscriber.id)
          .gte('completed_at', thisWeekStart)
          .order('completed_at', { ascending: true })

        if (completions && completions.length > 0) {
          // Join with lessons table to get names
          const codes = completions.map(c => c.lesson_code)
          const { data: lessonRows } = await supabase
            .from('lessons')
            .select('lesson_code, lesson_name')
            .in('lesson_code', codes)

          const nameMap = new Map(lessonRows?.map(l => [l.lesson_code, l.lesson_name]) ?? [])
          lessonsCompletedThisWeek = completions.map(c => ({
            lesson_code: c.lesson_code,
            lesson_name: nameMap.get(c.lesson_code) ?? c.lesson_code,
          }))
        }
      }

      // ── Active weak areas (established only, max 3) ─────────────────────
      let activeWeakAreas: { concept_slug: string; error_description: string }[] = []
      if (isEstablished) {
        const { data: weakRows } = await supabase
          .from('weak_areas')
          .select('concept_slug, error_description')
          .eq('student_id', subscriber.id)
          .is('resolved_at', null)
          .order('occurrence_count', { ascending: false })
          .limit(3)

        activeWeakAreas = weakRows ?? []
      }

      // ── Build email data ─────────────────────────────────────────────────
      const emailData: WeeklyEmailData = {
        studentName: subscriber.student_name,
        parentName: subscriber.full_name,
        email: subscriber.email,
        sessionsThisWeek: sessionsThisWeek ?? 0,
        sessionsLastWeek: sessionsLastWeek ?? 0,
        studyStreakDays,
        totalSessionCount: progress.total_session_count,
        currentLessonName: progress.current_lesson_name,
        currentUnitName: progress.current_unit_name,
        lessonsCompletedThisWeek,
        activeWeakAreas,
        weeksActive: weeks,
        daysToExam: examDays,
      }

      const html = generateWeeklyProgressEmail(emailData)

      await resend.emails.send({
        from: 'Gradd <hello@gradd.ie>',
        to: subscriber.email,
        subject: `${subscriber.student_name}'s weekly progress with Aoife`,
        html,
      })

      results.sent++
    } catch (err) {
      console.error(`[weekly-email] Failed for ${subscriber.email}:`, err)
      results.failed++
    }
  }

  console.log(`[weekly-email] Done — sent: ${results.sent}, failed: ${results.failed}, skipped: ${results.skipped}`)
  return NextResponse.json(results)
}

// ── Streak calculation ───────────────────────────────────────────────────────
// Counts consecutive days with at least one session, going back from today.
function calculateStreak(sessions: { started_at: string }[]): number {
  if (sessions.length === 0) return 0

  const sessionDays = new Set(
    sessions.map(s => new Date(s.started_at).toISOString().split('T')[0])
  )

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 30; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    if (sessionDays.has(key)) {
      streak++
    } else {
      break
    }
  }

  return streak
}