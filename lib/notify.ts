// lib/notify.ts
// Internal ops alerts — a single best-effort email to the operator inbox on
// key business events (new signup, payment, warm lead). This is NOT a
// user-facing send: it never blocks the caller and never throws.
//
// Destination is read at call time from NOTIFY_EMAIL (server-side only — do
// NOT expose as NEXT_PUBLIC). If NOTIFY_EMAIL is unset, notifyGrant is a silent
// no-op, so leaving it out of an environment simply disables alerts there.
//
// Best-effort contract (mirrors the resit capture send): wrapped in try/catch
// and fully swallowed. A Resend hiccup, a missing key, or an unset address must
// never fail an auth-callback redirect, a Stripe webhook 200, or a resit
// response. Fire-and-forget — callers do not await a result they act on.

import { Resend } from 'resend';

// Verified sender domain (same as every other Gradd Resend send).
const FROM = 'Gradd Alerts <hello@gradd.ie>';

/**
 * Send a one-line internal alert to NOTIFY_EMAIL. Best-effort: swallows all
 * errors and returns without throwing. No-op if NOTIFY_EMAIL or RESEND_API_KEY
 * is unset.
 *
 * @param subject Inbox-rule-friendly subject, e.g. "[Gradd] New APM signup".
 * @param line    One-line body: who · what · product · UTM (if known).
 */
export async function notifyGrant(subject: string, line: string): Promise<void> {
  try {
    const to = process.env.NOTIFY_EMAIL;
    const apiKey = process.env.RESEND_API_KEY;
    if (!to || !apiKey) return; // silently disabled

    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      text: line,
    });
  } catch {
    // swallow — internal alert is best-effort and must never block the caller.
  }
}
