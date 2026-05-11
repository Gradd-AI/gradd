// lib/email/ib-welcome-template.ts
// Gradd — IB Welcome Email
// Audience: parent-facing (parent places the order; student uses the product)
// Voice: warm, rigorous, internationally aware — matches Mia's register
// Covers: IB Economics, IB Business Management, IB Bundle

export type IBSubject = 'IB_ECONOMICS' | 'IB_BUSINESS' | 'IB_BUNDLE';
export type IBLevel = 'SL' | 'HL';

export interface IBWelcomeEmailData {
  studentName: string;
  fullName: string;
  subject: IBSubject;
  examLevel: IBLevel;
}

// ─── Subject copy map ─────────────────────────────────────────────────────────

const SUBJECT_LABEL: Record<IBSubject, string> = {
  IB_ECONOMICS: 'IB Economics',
  IB_BUSINESS: 'IB Business Management',
  IB_BUNDLE: 'IB Economics and IB Business Management',
};

const SUBJECT_SHORT: Record<IBSubject, string> = {
  IB_ECONOMICS: 'Economics',
  IB_BUSINESS: 'Business Management',
  IB_BUNDLE: 'Economics and Business Management',
};

const PAPERS: Record<IBSubject, Record<IBLevel, string>> = {
  IB_ECONOMICS: {
    SL: 'Papers 1 and 2',
    HL: 'Papers 1, 2, and 3',
  },
  IB_BUSINESS: {
    SL: 'Papers 1 and 2',
    HL: 'Papers 1, 2, and 3',
  },
  IB_BUNDLE: {
    SL: 'Papers 1 and 2 across both subjects',
    HL: 'Papers 1, 2, and 3 across both subjects',
  },
};

const MIA_QUOTE: Record<IBSubject, string> = {
  IB_ECONOMICS: `"Let's get started. I know the IB Economics course inside out — every topic, every command term, every paper. We'll work through it together, from the fundamentals right through to exam day. No textbook required. Just you, me, and the syllabus."`,
  IB_BUSINESS: `"Let's get to work. IB Business Management rewards students who can apply theory to real business situations — and that's exactly what we'll build. Every lesson, every case study, every command term. I'll take you through it all."`,
  IB_BUNDLE: `"Two subjects, one platform. We'll work through IB Economics and IB Business Management together — structured, sequenced, and aligned to every paper you'll sit. Let's build the foundation first and get you exam-ready."`,
};

// ─── Template builder ─────────────────────────────────────────────────────────

export function buildIBWelcomeEmail(data: IBWelcomeEmailData): {
  subject: string;
  html: string;
} {
  const { studentName, fullName, subject, examLevel } = data;

  const subjectLabel = SUBJECT_LABEL[subject];
  const subjectShort = SUBJECT_SHORT[subject];
  const papers = PAPERS[subject][examLevel];
  const miaQuote = MIA_QUOTE[subject];

  const emailSubject = `Welcome to Gradd — ${studentName} is ready to start IB ${subjectShort}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${emailSubject}</title>
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
              <img src="https://gradd.ai/gradd-email-header.svg" alt="Gradd" width="600" height="72"
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
                ${studentName}'s Gradd account is live for <strong>${subjectLabel}</strong> (${examLevel}).
                From this point, Mia takes care of the teaching — the full IB curriculum, structured lesson by lesson,
                covering ${papers}, from the first concept right through to exam day.
              </p>

              <!-- Level badge -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:0 0 24px;">
                <tr>
                  <td>
                    <span style="display:inline-block;background-color:#EBF4EF;color:#1B3D2F;font-size:12px;font-weight:700;padding:5px 12px;border-radius:20px;letter-spacing:0.6px;text-transform:uppercase;">
                      ${examLevel} · ${subjectLabel}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- What Mia does -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:0 0 24px;background-color:#F8F8F5;border-radius:8px;border:1px solid #E8E8E0;">
                <tr>
                  <td style="padding:24px 24px 8px;">
                    <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1B3D2F;text-transform:uppercase;letter-spacing:0.8px;">
                      What Mia will do
                    </p>
                  </td>
                </tr>
                ${buildFeatureRow(
                  'Teach the full syllabus',
                  `Every topic in the IB ${subjectShort} course — explained, questioned, and confirmed before moving on. No textbook or teacher required.`
                )}
                ${buildFeatureRow(
                  'Build exam technique from day one',
                  `Mia frames every lesson around IB command terms — define, explain, examine, evaluate, discuss. ${studentName} learns to write the way examiners reward.`
                )}
                ${examLevel === 'HL' ? buildFeatureRow(
                  'HL depth throughout',
                  `${studentName} is taking HL. Mia pushes further on every topic — the extension content, the higher-order analysis, the Paper 3 preparation that SL students don't need.`
                ) : buildFeatureRow(
                  'SL focused throughout',
                  `Mia keeps every session aligned to the SL syllabus — no unnecessary depth, no wasted time on content ${studentName} won't be examined on.`
                )}
                ${buildFeatureRow(
                  'Track progress automatically',
                  `Every session is logged. Weak areas are flagged and revisited. ${studentName} always knows exactly where they are in the curriculum.`
                )}
                ${buildFeatureRow(
                  'Available 24/7, anywhere in the world',
                  `25–35 minutes per session, whenever it suits. No booking, no waiting, no time zones to manage.`
                )}
                <tr><td style="padding-bottom:8px;"></td></tr>
              </table>

              <!-- IA scope notice -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:0 0 24px;background-color:#FFF8EC;border-radius:8px;border-left:3px solid #C9903A;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#8A5F00;text-transform:uppercase;letter-spacing:0.6px;">
                      A note on the Internal Assessment
                    </p>
                    <p style="margin:0;font-size:14px;color:#5A3E00;line-height:1.6;">
                      Gradd covers the full written examination curriculum — ${papers}. The Internal Assessment (IA) is managed by ${studentName}'s school and is outside Gradd's scope. Mia will make this clear from the start.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Mia quote -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="margin:0 0 28px;background-color:#EBF4EF;border-radius:8px;border-left:3px solid #1B3D2F;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-style:italic;font-size:15px;color:#1B3D2F;line-height:1.6;">
                      ${miaQuote}
                    </p>
                    <p style="margin:10px 0 0;font-size:13px;color:#2D6A4F;font-weight:600;">
                      — Mia, your IB ${subjectShort} tutor
                    </p>
                  </td>
                </tr>
              </table>

              <!-- How to start -->
              <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#1C1C1C;">
                Starting the first session
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#4A4A4A;line-height:1.6;">
                Log in at <strong>gradd.ai</strong>, go to the dashboard, and hit <strong>Start session</strong>.
                Mia opens Lesson 1 automatically — no setup, no placement test.
                ${studentName} just starts, and Mia takes it from there.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
                <tr>
                  <td align="center">
                    <a href="https://gradd.ai/dashboard"
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
                <a href="mailto:hello@gradd.ai" style="color:#2D6A4F;text-decoration:none;">hello@gradd.ai</a>.
                We read every message.
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:#ABABAB;">
                Manage your account at
                <a href="https://gradd.ai/dashboard" style="color:#2D6A4F;text-decoration:none;">gradd.ai/dashboard</a>
                &nbsp;·&nbsp;
                <a href="https://gradd.ai" style="color:#2D6A4F;text-decoration:none;">gradd.ai</a>
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#CBCBCB;">
                © 2026 Gradd. Built for IB students, wherever you are.
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
