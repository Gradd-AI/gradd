// lib/email/weekly-progress-template.ts
// Weekly progress email for Gradd students.
// Two modes:
//   - Early (< 4 weeks active): summary counts only
//   - Established (4+ weeks active): named lessons, named weak areas, trajectory coaching

export interface WeeklyEmailData {
  studentName: string
  parentName: string
  email: string
  // Activity
  sessionsThisWeek: number
  sessionsLastWeek: number
  studyStreakDays: number
  totalSessionCount: number
  // Curriculum position
  currentLessonName: string
  currentUnitName: string
  // Detailed data (populated for established students only)
  lessonsCompletedThisWeek: { lesson_code: string; lesson_name: string }[]
  activeWeakAreas: { concept_slug: string; error_description: string }[]
  // Meta
  weeksActive: number
  daysToExam: number
}

type Trajectory = 'improving' | 'declining' | 'consistent' | 'new'

function getTrajectory(thisWeek: number, lastWeek: number): Trajectory {
  if (lastWeek === 0) return 'new'
  if (thisWeek > lastWeek) return 'improving'
  if (thisWeek < lastWeek) return 'declining'
  return 'consistent'
}

function trajectoryCoachingLine(
  trajectory: Trajectory,
  studentName: string,
  sessionsThisWeek: number
): string {
  switch (trajectory) {
    case 'improving':
      return `${studentName} is building real momentum — more sessions this week than last. That consistency is exactly what separates strong results from average ones.`
    case 'declining':
      return `This week was a bit quieter than last. Even one focused session with Aoife this week will keep the curve moving in the right direction.`
    case 'consistent':
      return `Steady and consistent — ${studentName} is keeping a reliable pace. Consistency over time is what the LC rewards.`
    case 'new':
      return sessionsThisWeek > 0
        ? `${studentName} is off to a great start. Early momentum like this sets the tone for the whole year.`
        : `No sessions yet this week — remind ${studentName} that even a 20-minute session with Aoife keeps the knowledge fresh.`
  }
}

function formatLessonList(lessons: { lesson_code: string; lesson_name: string }[]): string {
  if (lessons.length === 0) return ''
  return lessons
    .map(l => `<li style="margin:0 0 6px;font-size:15px;color:#4A4A4A;">${l.lesson_name} <span style="color:#ABABAB;font-size:13px;">(${l.lesson_code})</span></li>`)
    .join('\n')
}

function formatWeakAreaList(areas: { concept_slug: string; error_description: string }[]): string {
  if (areas.length === 0) return ''
  return areas
    .slice(0, 3) // cap at 3 — don't overwhelm
    .map(a => `<li style="margin:0 0 6px;font-size:15px;color:#4A4A4A;">${a.error_description}</li>`)
    .join('\n')
}

export function generateWeeklyProgressEmail(data: WeeklyEmailData): string {
  const trajectory = getTrajectory(data.sessionsThisWeek, data.sessionsLastWeek)
  const isEstablished = data.weeksActive >= 4
  const coachingLine = trajectoryCoachingLine(trajectory, data.studentName, data.sessionsThisWeek)

  const hasLessonsThisWeek = data.lessonsCompletedThisWeek.length > 0
  const hasWeakAreas = data.activeWeakAreas.length > 0

  // ── Lessons completed block (established students only) ──────────────────
  const lessonsBlock = isEstablished && hasLessonsThisWeek
    ? `
      <tr>
        <td style="padding:0 40px 28px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#1B3D2F;">
            Lessons completed this week
          </p>
          <ul style="margin:0;padding:0 0 0 18px;">
            ${formatLessonList(data.lessonsCompletedThisWeek)}
          </ul>
        </td>
      </tr>`
    : ''

  // ── Weak areas block (established students only, max 3) ──────────────────
  const weakAreasBlock = isEstablished && hasWeakAreas
    ? `
      <tr>
        <td style="padding:0 40px 28px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#B94040;">
            Areas to revisit
          </p>
          <ul style="margin:0;padding:0 0 0 18px;">
            ${formatWeakAreaList(data.activeWeakAreas)}
          </ul>
          <p style="margin:10px 0 0;font-size:13px;color:#ABABAB;">
            Aoife will revisit these automatically in upcoming sessions.
          </p>
        </td>
      </tr>`
    : ''

  // ── Stats row ─────────────────────────────────────────────────────────────
  const sessionsLabel = data.sessionsThisWeek === 1 ? 'session' : 'sessions'
  const streakLabel = data.studyStreakDays === 1 ? 'day' : 'days'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly progress — ${data.studentName}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:Arial,Helvetica,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="https://gradd.ie/gradd-email-header.svg" alt="Gradd" width="600" height="72"
                style="display:block;border:0;width:100%;max-width:600px;" />
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding:36px 40px 24px;">
              <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#1B3D2F;">
                Weekly update — ${data.studentName}
              </p>
              <p style="margin:0;font-size:15px;color:#4A4A4A;line-height:1.6;">
                Hi ${data.parentName}, here's how ${data.studentName} got on with Aoife this week.
              </p>
            </td>
          </tr>

          <!-- Stats strip -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="33%" style="text-align:center;background-color:#F5F5F0;border-radius:8px;padding:16px 8px;">
                    <p style="margin:0;font-size:26px;font-weight:700;color:#1B3D2F;">${data.sessionsThisWeek}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#ABABAB;text-transform:uppercase;letter-spacing:0.6px;">${sessionsLabel} this week</p>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;background-color:#F5F5F0;border-radius:8px;padding:16px 8px;">
                    <p style="margin:0;font-size:26px;font-weight:700;color:#1B3D2F;">${data.studyStreakDays}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#ABABAB;text-transform:uppercase;letter-spacing:0.6px;">${streakLabel} streak</p>
                  </td>
                  <td width="4%"></td>
                  <td width="33%" style="text-align:center;background-color:#F5F5F0;border-radius:8px;padding:16px 8px;">
                    <p style="margin:0;font-size:26px;font-weight:700;color:#1B3D2F;">${data.daysToExam}</p>
                    <p style="margin:4px 0 0;font-size:12px;color:#ABABAB;text-transform:uppercase;letter-spacing:0.6px;">days to exam</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Coaching line -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0;font-size:15px;color:#4A4A4A;line-height:1.7;font-style:italic;border-left:3px solid #7EC8A4;padding-left:16px;">
                ${coachingLine}
              </p>
            </td>
          </tr>

          <!-- Lessons completed this week (established only) -->
          ${lessonsBlock}

          <!-- Weak areas (established only) -->
          ${weakAreasBlock}

          <!-- Current position -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#1B3D2F;">
                Currently studying
              </p>
              <p style="margin:0;font-size:15px;color:#4A4A4A;">
                ${data.currentLessonName}
                <span style="color:#ABABAB;"> · ${data.currentUnitName}</span>
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="https://gradd.ie/dashboard"
                      style="display:inline-block;background-color:#1B3D2F;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
                      View full dashboard →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 36px;">
              <hr style="border:none;border-top:1px solid #E8E8E0;margin:0 0 24px;" />
              <p style="margin:0;font-size:12px;color:#ABABAB;line-height:1.6;">
                Gradd · AI-powered LC Business tutor ·
                <a href="https://gradd.ie" style="color:#2D6A4F;text-decoration:none;">gradd.ie</a>
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#CBCBCB;">
                © 2026 Gradd. Irish-built, Irish-focused.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}