// lib/email/weekly-progress-template.ts
// Gradd — Weekly Progress Email Template
// Rendered server-side, sent via Resend
// Audience: parent-facing (copy notes: parent first, student second)

export interface WeeklyProgressData {
  studentName: string;
  parentEmail: string;
  curriculumPercent: number;       // 0–100
  sessionsThisWeek: number;
  sessionsPerWeekNeeded: number;   // remaining sessions / weeks to exam
  weakAreasCount: number;
  nextLessonName: string;
  coachingLine: string;
  weeksToExam: number;
}

export function buildWeeklyProgressEmail(data: WeeklyProgressData): {
  subject: string;
  html: string;
} {
  const {
    studentName,
    curriculumPercent,
    sessionsThisWeek,
    sessionsPerWeekNeeded,
    weakAreasCount,
    nextLessonName,
    coachingLine,
    weeksToExam,
  } = data;

  const progressBarWidth = Math.min(Math.round(curriculumPercent), 100);
  const paceStatus = getPaceStatus(sessionsThisWeek, sessionsPerWeekNeeded);
  const subject = `${studentName}'s Gradd progress this week`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F5F0;font-family:Arial,Helvetica,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F5F0;padding:32px 16px;">
    <tr>
      <td align="center">

        <!-- Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:0;line-height:0;font-size:0;">
              <img src="https://gradd.ie/gradd-email-header.svg" alt="Gradd" width="600" height="72"
                style="display:block;border:0;width:100%;max-width:600px;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 0;">

              <!-- Greeting -->
              <p style="margin:0 0 8px;font-size:16px;color:#4A4A4A;line-height:1.5;">
                Here's how ${studentName} got on this week.
              </p>

              <!-- Pace banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:24px 0 0;background-color:${paceStatus.bg};border-radius:8px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:${paceStatus.color};">
                      ${paceStatus.icon} ${paceStatus.label}
                    </p>
                    <p style="margin:4px 0 0;font-size:13px;color:${paceStatus.subColor};">
                      ${coachingLine}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Stats grid -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;">
                <tr>
                  <!-- Curriculum % -->
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background-color:#F8F8F5;border-radius:8px;border:1px solid #E8E8E0;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#8A8A8A;text-transform:uppercase;letter-spacing:0.8px;">
                            Curriculum complete
                          </p>
                          <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#1B3D2F;line-height:1;">
                            ${progressBarWidth}%
                          </p>
                          <!-- Progress bar -->
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
                            <tr>
                              <td style="background-color:#E0EDE7;border-radius:4px;height:6px;overflow:hidden;">
                                <table cellpadding="0" cellspacing="0" border="0" style="width:${progressBarWidth}%;height:6px;background-color:#1B3D2F;border-radius:4px;">
                                  <tr><td></td></tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Sessions this week -->
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background-color:#F8F8F5;border-radius:8px;border:1px solid #E8E8E0;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#8A8A8A;text-transform:uppercase;letter-spacing:0.8px;">
                            Sessions this week
                          </p>
                          <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#1B3D2F;line-height:1;">
                            ${sessionsThisWeek}
                          </p>
                          <p style="margin:6px 0 0;font-size:12px;color:#8A8A8A;">
                            Target: ${sessionsPerWeekNeeded > 15
                              ? 'Focus on weak units'
                              : `${sessionsPerWeekNeeded}/week to finish by June`}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Second row stats -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 0;">
                <tr>
                  <!-- Weak areas -->
                  <td width="50%" style="padding-right:8px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background-color:#F8F8F5;border-radius:8px;border:1px solid #E8E8E0;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#8A8A8A;text-transform:uppercase;letter-spacing:0.8px;">
                            Active weak areas
                          </p>
                          <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:${weakAreasCount > 0 ? '#B45309' : '#1B3D2F'};line-height:1;">
                            ${weakAreasCount}
                          </p>
                          <p style="margin:6px 0 0;font-size:12px;color:#8A8A8A;">
                            ${weakAreasCount === 0
                              ? 'No active flags — well done'
                              : 'Aoife will revisit these this week'}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>

                  <!-- Weeks to exam -->
                  <td width="50%" style="padding-left:8px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0"
                      style="background-color:#F8F8F5;border-radius:8px;border:1px solid #E8E8E0;">
                      <tr>
                        <td style="padding:16px 18px;">
                          <p style="margin:0;font-size:11px;font-weight:600;color:#8A8A8A;text-transform:uppercase;letter-spacing:0.8px;">
                            Weeks to LC exam
                          </p>
                          <p style="margin:8px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:700;color:#1B3D2F;line-height:1;">
                            ${Math.max(weeksToExam, 0)}
                          </p>
                          <p style="margin:6px 0 0;font-size:12px;color:#8A8A8A;">
                            LC Business written exam
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Next up -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:24px 0 0;background-color:#EBF4EF;border-radius:8px;border-left:3px solid #1B3D2F;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0;font-size:11px;font-weight:600;color:#2D6A4F;text-transform:uppercase;letter-spacing:0.8px;">
                      Next up with Aoife
                    </p>
                    <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#1B3D2F;">
                      ${nextLessonName}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 0;">
                <tr>
                  <td align="center">
                    <a href="https://gradd.ie/session"
                      style="display:inline-block;background-color:#1B3D2F;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
                      Continue with Aoife →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:32px 40px 36px;">
              <hr style="border:none;border-top:1px solid #E8E8E0;margin:0 0 24px;" />
              <p style="margin:0;font-size:12px;color:#ABABAB;line-height:1.6;">
                This email was sent to you as part of your Gradd subscription.<br />
                Manage your account at
                <a href="https://gradd.ie/dashboard" style="color:#2D6A4F;text-decoration:none;">gradd.ie/dashboard</a>
                &nbsp;·&nbsp;
                <a href="https://gradd.ie" style="color:#2D6A4F;text-decoration:none;">gradd.ie</a>
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#CBCBCB;">
                © 2025 Gradd. Irish-built, Irish-focused.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();

  return { subject, html };
}

// ── Pace helpers ──────────────────────────────────────────────

interface PaceStatus {
  label: string;
  icon: string;
  bg: string;
  color: string;
  subColor: string;
}

function getPaceStatus(
  sessionsThisWeek: number,
  sessionsPerWeekNeeded: number
): PaceStatus {
  if (sessionsPerWeekNeeded > 15) {
    // Late-starter edge case — don't show alarming numbers
    return {
      label: 'Exam focus mode',
      icon: '🎯',
      bg: '#FFF8E6',
      color: '#92400E',
      subColor: '#B45309',
    };
  }

  if (sessionsThisWeek === 0) {
    return {
      label: 'No sessions this week',
      icon: '⏰',
      bg: '#FEF2F2',
      color: '#991B1B',
      subColor: '#B91C1C',
    };
  }

  const ratio = sessionsThisWeek / Math.max(sessionsPerWeekNeeded, 1);

  if (ratio >= 1) {
    return {
      label: 'On track',
      icon: '✅',
      bg: '#F0FDF4',
      color: '#166534',
      subColor: '#15803D',
    };
  }

  if (ratio >= 0.6) {
    return {
      label: 'Slightly behind',
      icon: '📈',
      bg: '#FFFBEB',
      color: '#92400E',
      subColor: '#B45309',
    };
  }

  return {
    label: 'Behind pace',
    icon: '⚠️',
    bg: '#FEF2F2',
    color: '#991B1B',
    subColor: '#B91C1C',
  };
}

// ── Coaching line generator ───────────────────────────────────
// Called from the cron route — generates a single contextual line
// based on pace data. Keep it human, warm, and specific.

export function buildCoachingLine(
  sessionsThisWeek: number,
  sessionsPerWeekNeeded: number,
  weakAreasCount: number,
  studentName: string
): string {
  if (sessionsPerWeekNeeded > 15) {
    return `At this stage of the year, Aoife will prioritise ${studentName}'s weakest units and exam technique — that's where the marks are.`;
  }

  if (sessionsThisWeek === 0) {
    return `${studentName} didn't have a session this week. Even one 30-minute session with Aoife would make a real difference this week.`;
  }

  const ratio = sessionsThisWeek / Math.max(sessionsPerWeekNeeded, 1);

  if (ratio >= 1.2) {
    return `Excellent week — ${studentName} is ahead of pace. Aoife will keep the momentum going.`;
  }

  if (ratio >= 1) {
    return `${studentName} hit the weekly target. Consistent pace like this builds the exam confidence that matters.`;
  }

  if (ratio >= 0.6) {
    return `A couple more sessions this week would bring ${studentName} back on track for the June exam.`;
  }

  return `${studentName} needs ${sessionsPerWeekNeeded - sessionsThisWeek} more sessions this week to stay on pace. Aoife picks up exactly where she left off.`;
}