export interface TrialReminderProps {
  firstName: string;
  subject: 'IB_ECONOMICS' | 'IB_BUSINESS' | 'IB_BUNDLE';
  level: 'SL' | 'HL';
  sessionsCompleted: number;
  unitsTouched: string[];
  nextLessonTitle: string;
  trialEndDate: string;
  billingAmount: string;
  billingCadence: 'monthly' | 'annual';
  dashboardUrl: string;
  manageSubscriptionUrl: string;
}

const SUBJECT_LABEL: Record<TrialReminderProps['subject'], string> = {
  IB_ECONOMICS: 'IB Economics',
  IB_BUSINESS: 'IB Business Management',
  IB_BUNDLE: 'IB Economics + Business Management',
};

export function buildIBTrialReminderEmail(props: TrialReminderProps): { subject: string; html: string } {
  const subjectLabel = SUBJECT_LABEL[props.subject];
  const cadenceLabel = props.billingCadence === 'annual' ? 'per year' : 'per month';

  const unitsList = props.unitsTouched.length > 0
    ? props.unitsTouched.map(u => `<li style="margin: 4px 0; font-size: 14px; color: #2d2d2d;">${u}</li>`).join('')
    : '<li style="margin: 4px 0; font-size: 14px; color: #6b6b6b;">No sessions completed yet — Mia is ready when you are.</li>';

  const progressNoun = props.sessionsCompleted === 1 ? 'session' : 'sessions';

  const emailSubject = props.sessionsCompleted > 0
    ? `${props.firstName}, your trial ends in 2 days — here's what you've covered with Mia`
    : `${props.firstName}, your trial ends in 2 days — Mia's ready when you are`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${emailSubject}</title>
</head>
<body style="margin:0;padding:0;background:#f7f3ec;font-family:Georgia,'Times New Roman',serif;color:#1b1b1b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background:#1b3d2f;padding:24px 32px;text-align:left;line-height:1;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Gradd</span><span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;color:#d97706;">.</span><span style="font-family:Arial,Helvetica,sans-serif;font-size:26px;font-weight:700;color:#d97706;">ai</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 0;">

              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#1b3d2f;line-height:1.35;font-family:Georgia,'Times New Roman',serif;">
                Hi ${props.firstName}, your trial ends on ${props.trialEndDate}
              </h1>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.65;color:#2d2d2d;">
                Two days left on your Gradd trial. After ${props.trialEndDate}, your <strong>${subjectLabel} (${props.level})</strong> subscription continues at <strong>${props.billingAmount} ${cadenceLabel}</strong> — Mia keeps teaching, your progress keeps building.
              </p>

              <!-- Progress block -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                style="margin:0 0 24px;background:#f7f3ec;border-radius:8px;border:1px solid #e5dfd3;">
                <tr>
                  <td style="padding:20px 24px 8px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1b3d2f;text-transform:uppercase;letter-spacing:0.6px;">
                      Your progress so far
                    </p>
                    <p style="margin:0 0 10px;font-size:16px;color:#1b1b1b;">
                      <strong>${props.sessionsCompleted}</strong> ${progressNoun} completed
                    </p>
                    <p style="margin:0 0 6px;font-size:13px;color:#4a4a4a;font-weight:600;">Topics covered:</p>
                    <ul style="margin:0 0 0 0;padding-left:18px;line-height:1.7;">
                      ${unitsList}
                    </ul>
                    ${props.nextLessonTitle ? `
                    <p style="margin:14px 0 0;font-size:14px;color:#2d2d2d;">
                      <strong style="color:#1b3d2f;">Up next:</strong> ${props.nextLessonTitle}
                    </p>` : ''}
                  </td>
                </tr>
                <tr><td style="padding-bottom:12px;"></td></tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#1b3d2f;border-radius:8px;">
                    <a href="${props.dashboardUrl}"
                      style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.1px;">
                      Continue with Mia →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:13px;line-height:1.65;color:#4a4a4a;">
                Not the right fit? You can cancel any time before <strong>${props.trialEndDate}</strong> and you won't be charged. <a href="${props.manageSubscriptionUrl}" style="color:#1b3d2f;text-decoration:underline;">Manage your subscription</a>.
              </p>

              <p style="margin:0 0 0;font-size:13px;line-height:1.65;color:#4a4a4a;">
                Even after the trial ends, our 7-day money-back guarantee applies to your first paid week.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px 28px;">
              <hr style="border:none;border-top:1px solid #e5dfd3;margin:0 0 20px;" />
              <p style="margin:0 0 6px;font-size:12px;color:#8a8a8a;text-align:center;">
                Gradd · AI tutor for IB Economics and Business Management · <a href="https://gradd.ai/ib" style="color:#1b3d2f;text-decoration:none;">gradd.ai</a>
              </p>
              <p style="margin:0;font-size:12px;color:#8a8a8a;text-align:center;">
                Questions? Reply to this email — we read every one.
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

  return { subject: emailSubject, html };
}
