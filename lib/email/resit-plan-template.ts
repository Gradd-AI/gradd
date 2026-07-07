// lib/email/resit-plan-template.ts
// Gradd.ai — Resit diagnostic plan email.
// Audience: an ACCA APM candidate who just failed and asked us to email their
// plan. Voice: direct, encouraging, no fluff — Ezra's register, not Aoife's.

export interface ResitPlanEmailData {
  plan: string;      // the model-written narrative (plain text, paragraphs split by blank lines)
  score: number;     // last APM score, 0–49
  sitting: string;   // e.g. "Jun 2026"
}

// Minimal HTML escape — the plan is model output, so never inject it raw.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Render the narrative into email paragraphs. Blank lines separate paragraphs;
// single newlines become <br> within a paragraph.
function renderPlan(plan: string): string {
  return plan
    .trim()
    .split(/\n\s*\n/)
    .map((para) => {
      const body = esc(para).replace(/\n/g, '<br />');
      return `<p style="margin:0 0 18px;font-size:15px;color:#1C1C1C;line-height:1.65;">${body}</p>`;
    })
    .join('\n');
}

export function buildResitPlanEmail(data: ResitPlanEmailData): {
  subject: string;
  html: string;
} {
  const { plan, score, sitting } = data;
  const subject = `Your APM resit plan`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f7f3ec;font-family:Georgia,'Times New Roman',serif;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f7f3ec;padding:32px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" border="0"
          style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(14,43,30,0.08);border:1px solid #ddd5c5;">

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 8px;">

              <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#6b5f4e;text-transform:uppercase;letter-spacing:0.8px;font-family:Arial,Helvetica,sans-serif;">
                Gradd.ai · ACCA APM
              </p>
              <h1 style="margin:0 0 4px;font-size:24px;color:#0e2b1e;line-height:1.2;">
                Your resit plan
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#6b5f4e;line-height:1.5;">
                Based on your ${esc(sitting)} sitting — a mark of ${score}/100.
              </p>

              ${renderPlan(plan)}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0 8px;">
                <tr>
                  <td align="center">
                    <a href="https://gradd.ai/acca/auth?next=/acca"
                      style="display:inline-block;background-color:#0e2b1e;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;font-family:Arial,Helvetica,sans-serif;">
                      Start the free drills for your weak areas →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:8px 40px 36px;">
              <hr style="border:none;border-top:1px solid #ddd5c5;margin:16px 0 20px;" />
              <p style="margin:0;font-size:13px;color:#6b5f4e;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                Questions? Reply to this email or reach us at
                <a href="mailto:hello@gradd.ie" style="color:#0e2b1e;text-decoration:none;">hello@gradd.ie</a>.
              </p>
              <p style="margin:12px 0 0;font-size:12px;color:#ABABAB;font-family:Arial,Helvetica,sans-serif;">
                © 2026 Gradd. <a href="https://gradd.ai" style="color:#6b5f4e;text-decoration:none;">gradd.ai</a>
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
