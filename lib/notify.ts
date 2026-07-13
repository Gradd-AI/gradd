// lib/notify.ts
// Internal ops alerts — a single best-effort email to the operator inbox on
// key business events (new signup, payment, warm lead). This is NOT a
// user-facing send: it never blocks the caller and never throws.
//
// Destination is read at call time from NOTIFY_EMAIL (server-side only — do
// NOT expose as NEXT_PUBLIC). If NOTIFY_EMAIL is unset, the send is skipped.
//
// Best-effort contract (mirrors the resit capture send): NEVER throws to the
// caller. A Resend hiccup, a missing key, or an unset address must never fail an
// auth-callback redirect, a Stripe webhook 200, or a resit response.
//
// INSTRUMENTED (2026-07-13): instead of silently swallowing, every skip or
// failure is console.error'd with the exact reason AND returned as a string, so
// a caller can log it and Vercel function logs give the definitive answer to
// "why didn't this alert arrive?". Returns null on a successful send.

import { Resend } from 'resend';

// Verified sender domain (same as every other Gradd Resend send).
const FROM = 'Gradd Alerts <hello@gradd.ie>';

/**
 * Send a one-line internal alert to NOTIFY_EMAIL. Best-effort: never throws.
 * Returns null on success, or a short skip/failure reason string (also
 * console.error'd) — missing config, a Resend error, or a thrown exception.
 *
 * @param subject Inbox-rule-friendly subject, e.g. "[Gradd] New ACCA signup".
 * @param line    One-line body: who · what · product · UTM (if known).
 * @returns null if sent; otherwise the reason it was skipped/failed.
 */
export async function notifyGrant(subject: string, line: string): Promise<string | null> {
  const to = process.env.NOTIFY_EMAIL;
  const apiKey = process.env.RESEND_API_KEY;
  if (!to)     { console.error('[notify] SKIP — NOTIFY_EMAIL unset'); return 'NOTIFY_EMAIL unset'; }
  if (!apiKey) { console.error('[notify] SKIP — RESEND_API_KEY unset'); return 'RESEND_API_KEY unset'; }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from: FROM, to, subject, text: line });
    if (error) {
      const msg = (error as { message?: string }).message ?? String(error);
      console.error('[notify] SEND ERROR —', msg);
      return `send error: ${msg}`;
    }
    return null; // sent
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error('[notify] SEND THREW —', msg);
    return `send threw: ${msg}`;
  }
}
