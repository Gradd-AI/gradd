// lib/email/welcome-template.ts
// Gradd — Signup Confirmation Email Template
// Audience: parent-facing (parent places the order; student uses the product)
// Voice: warm, confident, Irish-aware — matches Aoife's register

export interface WelcomeEmailData {
  studentName: string;
  parentEmail: string;
  fullName: string;
}

export function buildWelcomeEmail(data: WelcomeEmailData): {
  subject: string;
  html: string;
} {
  const { studentName, fullName } = data;
  const subject = `Welcome to Gradd — ${studentName} is all set`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
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

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 0;">

              <p style="margin:0 0 20px;font-size:16px;color:#1C1C1C;line-height:1.6;">
                Hi ${fullName},
              </p>

              <p style="margin:0 0 20px;font-size:16px;color:#1C1C1C;line-height:1.6;">
                ${studentName}'s Gradd account is live. From this point, Aoife takes care of the teaching — the full LC Business curriculum, structured lesson by lesson, from Unit 1 right through to exam day.
              </p>

              <!-- What Aoife does -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:0 0 24px;background-color:#F8F8F5;border-radius:8px;border:1px solid #E8E8E0;">
                <tr>
                  <td style="padding:24px 24px 8px;">
                    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1B3D2F;text-transform:uppercase;letter-spacing:0.8px;">
                      What Aoife will do
                    </p>
                  </td>
                </tr>
                ${buildFeatureRow('Teach the full syllabus', 'Every concept in the SEC Business course — explained, questioned, and confirmed before moving on.')}
                ${buildFeatureRow('Build exam technique from day one', 'Aoife marks ${studentName}\'s answers using the SRP structure that SEC examiners reward. No nasty surprises on results day.')}
                ${buildFeatureRow('Track progress automatically', 'Every session is logged. Weak areas are flagged and revisited. You\'ll get a progress summary every Monday morning.')}
                ${buildFeatureRow('Work at your schedule', '25–35 minutes per session, whenever it suits. No booking, no waiting, no cancellations.')}
                <tr><td style="padding-bottom:8px;"></td></tr>
              </table>

              <!-- Aoife quote -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:0 0 28px;background-color:#EBF4EF;border-radius:8px;border-left:3px solid #1B3D2F;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-style:italic;font-size:15px;color:#1B3D2F;line-height:1.6;">
                      "Right, ${studentName} — let's get started. I know the Business course inside out, and I'll take you through it step by step. No textbook, no guesswork. Just you, me, and the syllabus."
                    </p>
                    <p style="margin:10px 0 0;font-size:13px;color:#2D6A4F;font-weight:600;">
                      — Aoife, your LC Business tutor
                    </p>
                  </td>
                </tr>
              </table>

              <!-- How to start -->
              <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1C1C1C;">
                Starting the first session
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4A4A4A;line-height:1.6;">
                Log in, go to the dashboard, and hit <strong>Start session</strong>. Aoife opens Unit 1 automatically — no setup, no placement test. ${studentName} just starts, and Aoife takes it from there.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="https://gradd.ie/dashboard"
                      style="display:inline-block;background-color:#1B3D2F;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;">
                      Go to dashboard →
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
              <p style="margin:0;font-size:13px;color:#4A4A4A;line-height:1.6;">
                Questions? Reply to this email or reach us at
                <a href="mailto:hello@gradd.ie" style="color:#2D6A4F;text-decoration:none;">hello@gradd.ie</a>.
                We're a small Irish team and we read every message.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#ABABAB;">
                Manage your account at
                <a href="https://gradd.ie/dashboard" style="color:#2D6A4F;text-decoration:none;">gradd.ie/dashboard</a>
                &nbsp;·&nbsp;
                <a href="https://gradd.ie" style="color:#2D6A4F;text-decoration:none;">gradd.ie</a>
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#CBCBCB;">
                © 2026 Gradd. Irish-built, Irish-focused.
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

function buildFeatureRow(title: string, body: string): string {
  return `
    <tr>
      <td style="padding:0 24px 16px;">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="vertical-align:top;padding-right:10px;padding-top:2px;">
              <div style="width:6px;height:6px;background-color:#1B3D2F;border-radius:50%;margin-top:6px;"></div>
            </td>
            <td>
              <p style="margin:0;font-size:14px;color:#1C1C1C;line-height:1.5;">
                <strong>${title}</strong> — ${body}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}