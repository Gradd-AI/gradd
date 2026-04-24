// app/api/cron/weekly-email/route.ts
// Gradd — Weekly Progress Email Cron Job
// Schedule: Monday 07:00 UTC (= 08:00 IST summer / 07:00 GMT winter)
// Auth: CRON_SECRET header (set in Vercel env vars)
// Sends via Resend to all active subscribers

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import {
  buildWeeklyProgressEmail,
  buildCoachingLine,
  type WeeklyProgressData,
} from '@/lib/email/weekly-progress-template';

// ── LC exam date — update each academic year ──────────────────
// LC Business written paper: typically first week of June.
// 2025: Wednesday 04/06/2025
const LC_EXAM_DATE = new Date('2025-06-04T09:00:00.000Z');

// ── Total lessons in the curriculum ──────────────────────────
const TOTAL_LESSONS = 279;

// ── Clients ──────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY!);

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Handler ───────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel passes this automatically when configured
  const secret = request.headers.get('authorization');
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const supabase = getServiceClient();
  const now = new Date();

  // Weeks to exam — floor to avoid fractional weeks
  const msToExam = LC_EXAM_DATE.getTime() - now.getTime();
  const weeksToExam = Math.max(Math.floor(msToExam / (1000 * 60 * 60 * 24 * 7)), 0);

  // ── 1. Fetch all active subscribers ──────────────────────────
  const { data: activeProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, student_name')
    .eq('subscription_status', 'active');

  if (profilesError) {
    console.error('[weekly-email] Failed to fetch profiles:', profilesError);
    return NextResponse.json(
      { error: 'Failed to fetch profiles', detail: profilesError.message },
      { status: 500 }
    );
  }

  if (!activeProfiles || activeProfiles.length === 0) {
    return NextResponse.json({ sent: 0, message: 'No active subscribers' });
  }

  const studentIds = activeProfiles.map((p) => p.id);

  // ── 2. Batch fetch progress data ─────────────────────────────

  // student_progress: current position
  const { data: progressRows } = await supabase
    .from('student_progress')
    .select('student_id, current_lesson_name')
    .in('student_id', studentIds);

  // lesson_completions: count per student
  const { data: completionCounts } = await supabase
    .from('lesson_completions')
    .select('student_id')
    .in('student_id', studentIds);

  // sessions this week: started_at >= 7 days ago
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentSessions } = await supabase
    .from('sessions')
    .select('student_id, started_at')
    .in('student_id', studentIds)
    .gte('started_at', sevenDaysAgo);

  // weak areas: unresolved
  const { data: weakAreaRows } = await supabase
    .from('weak_areas')
    .select('student_id')
    .in('student_id', studentIds)
    .is('resolved_at', null);

  // ── 3. Build lookup maps ──────────────────────────────────────

  const progressMap = new Map(
    (progressRows ?? []).map((r) => [r.student_id, r.current_lesson_name])
  );

  // lesson completions per student
  const completionsMap = new Map<string, number>();
  for (const row of completionCounts ?? []) {
    completionsMap.set(row.student_id, (completionsMap.get(row.student_id) ?? 0) + 1);
  }

  // sessions this week per student
  const sessionsWeekMap = new Map<string, number>();
  for (const row of recentSessions ?? []) {
    sessionsWeekMap.set(row.student_id, (sessionsWeekMap.get(row.student_id) ?? 0) + 1);
  }

  // weak areas per student
  const weakMap = new Map<string, number>();
  for (const row of weakAreaRows ?? []) {
    weakMap.set(row.student_id, (weakMap.get(row.student_id) ?? 0) + 1);
  }

  // ── 4. Send emails ────────────────────────────────────────────

  let sent = 0;
  let failed = 0;
  const errors: { email: string; error: string }[] = [];

  for (const profile of activeProfiles) {
    try {
      const lessonsCompleted = completionsMap.get(profile.id) ?? 0;
      const curriculumPercent = Math.min(
        Math.round((lessonsCompleted / TOTAL_LESSONS) * 100),
        100
      );
      const sessionsThisWeek = sessionsWeekMap.get(profile.id) ?? 0;
      const weakAreasCount = weakMap.get(profile.id) ?? 0;
      const nextLessonName =
        progressMap.get(profile.id) ?? 'Unit 1 — Introduction to People in Business';

      // Sessions per week needed — use 0.65× lesson count to account for revision sessions
      // (backlog B2: remaining lessons × 0.65 = realistic session estimate)
      const remainingLessons = TOTAL_LESSONS - lessonsCompleted;
      const remainingSessionsEstimate = Math.ceil(remainingLessons * 0.65);
      const sessionsPerWeekNeeded =
        weeksToExam > 0 ? Math.ceil(remainingSessionsEstimate / weeksToExam) : 0;

      const coachingLine = buildCoachingLine(
        sessionsThisWeek,
        sessionsPerWeekNeeded,
        weakAreasCount,
        profile.student_name
      );

      const emailData: WeeklyProgressData = {
        studentName: profile.student_name,
        parentEmail: profile.email,
        curriculumPercent,
        sessionsThisWeek,
        sessionsPerWeekNeeded,
        weakAreasCount,
        nextLessonName,
        coachingLine,
        weeksToExam,
      };

      const { subject, html } = buildWeeklyProgressEmail(emailData);

      await resend.emails.send({
        from: 'Gradd <progress@gradd.ie>',
        to: profile.email,
        subject,
        html,
      });

      sent++;
    } catch (err) {
      failed++;
      errors.push({
        email: profile.email,
        error: err instanceof Error ? err.message : String(err),
      });
      console.error(`[weekly-email] Failed to send to ${profile.email}:`, err);
    }
  }

  console.log(
    `[weekly-email] Complete — sent: ${sent}, failed: ${failed}, total: ${activeProfiles.length}`
  );

  return NextResponse.json({
    sent,
    failed,
    total: activeProfiles.length,
    ...(errors.length > 0 && { errors }),
  });
}
