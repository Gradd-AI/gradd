// app/api/cron/trial-reminders/route.ts
// Runs daily at 09:00 UTC via Vercel cron.
// Sends a day-2 trial reminder to every IB student whose trial_ends_at
// falls in the 47–49 hour window from now. One send per student enforced
// via trial_reminder_sent_at.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { buildIBTrialReminderEmail } from '@/lib/email/ib-trial-reminder-template';

const IB_SUBJECTS = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'] as const;
type IBSubject = typeof IB_SUBJECTS[number];

// ── Unit name maps ─────────────────────────────────────────────────────────────
const ECON_UNIT_NAMES: Record<string, string> = {
  UNIT_1: 'Introduction to Economics',
  UNIT_2: 'Microeconomics',
  UNIT_3: 'Macroeconomics',
  UNIT_4: 'The Global Economy',
};
const BM_UNIT_NAMES: Record<string, string> = {
  UNIT_1: 'Business Organisation and Environment',
  UNIT_2: 'Human Resource Management',
  UNIT_3: 'Finance and Accounts',
  UNIT_4: 'Marketing',
  UNIT_5: 'Operations Management',
};

function unitNames(unitCodes: string[], subject: IBSubject): string[] {
  const map = subject === 'IB_ECONOMICS' ? ECON_UNIT_NAMES
    : subject === 'IB_BUSINESS' ? BM_UNIT_NAMES
    : { ...ECON_UNIT_NAMES, ...BM_UNIT_NAMES };
  return unitCodes.map(c => map[c] ?? c);
}

// ── Billing amount fallback from subscription_tier ─────────────────────────────
function deriveAmount(tier: string | null, cadence: string | null): string {
  if (tier?.includes('bundle')) return cadence === 'annual' ? '€579' : '€74.99';
  if (tier?.includes('ib')) return cadence === 'annual' ? '€349' : '€44.99';
  return '€44.99';
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY!);
  const url = new URL(req.url);
  const providedSecret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  // Vercel Cron also sends a special header on scheduled invocations — allow both
  const isVercelCron = req.headers.get('user-agent')?.includes('vercel-cron') ?? false;
  const cronHeader = req.headers.get('authorization') === `Bearer ${expectedSecret}`;

  if (!isVercelCron && !cronHeader && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();

  // 47–49 hour window: catches trials expiring ~2 days from now regardless
  // of when exactly today's cron fires.
  const windowStart = new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();

  // trial_ends_at is already written by the Stripe webhook (handleSubscriptionChange).
  // subscription_status is 'active' for trialing users per mapStripeStatus.
  const { data: trials, error } = await supabase
    .from('profiles')
    .select('id, email, student_name, subject, exam_level, trial_ends_at, stripe_price_amount, stripe_billing_cadence, subscription_tier, trial_reminder_sent_at')
    .eq('subscription_status', 'active')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', windowStart)
    .lte('trial_ends_at', windowEnd)
    .is('trial_reminder_sent_at', null);

  if (error) {
    console.error('[trial-reminders] Supabase error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: Array<{ email: string; status: string; error?: string }> = [];

  for (const trial of trials ?? []) {
    try {
      if (!IB_SUBJECTS.includes(trial.subject as IBSubject)) continue;

      const subject = trial.subject as IBSubject;

      // ── Progress ─────────────────────────────────────────────────────────────
      const [{ data: progress }, { count: sessionsCount }] = await Promise.all([
        supabase
          .from('student_progress')
          .select('units_completed, current_lesson_name')
          .eq('student_id', trial.id)
          .eq('subject', subject)
          .single(),
        supabase
          .from('sessions')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', trial.id),
      ]);

      const rawUnits: string[] = Array.isArray(progress?.units_completed) ? progress.units_completed : [];
      const touchedNames = unitNames(rawUnits, subject);

      const trialEndDate = new Date(trial.trial_ends_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      const billingAmount = trial.stripe_price_amount
        ?? deriveAmount(trial.subscription_tier, trial.stripe_billing_cadence);
      const billingCadence = (trial.stripe_billing_cadence === 'annual' ? 'annual' : 'monthly') as 'monthly' | 'annual';

      const { subject: emailSubject, html } = buildIBTrialReminderEmail({
        firstName:             trial.student_name ?? 'there',
        subject,
        level:                 (['SL', 'HL'].includes(trial.exam_level) ? trial.exam_level : 'SL') as 'SL' | 'HL',
        sessionsCompleted:     sessionsCount ?? 0,
        unitsTouched:          touchedNames,
        nextLessonTitle:       progress?.current_lesson_name ?? '',
        trialEndDate,
        billingAmount,
        billingCadence,
        dashboardUrl:          'https://gradd.ai/dashboard',
        manageSubscriptionUrl: 'https://gradd.ai/dashboard',
      });

      await resend.emails.send({
        from: 'Mia at Gradd <mia@gradd.ie>',
        to:   trial.email,
        subject: emailSubject,
        html,
      });

      await supabase
        .from('profiles')
        .update({ trial_reminder_sent_at: new Date().toISOString() })
        .eq('id', trial.id);

      results.push({ email: trial.email, status: 'sent' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[trial-reminders] Failed for', trial.email, msg);
      results.push({ email: trial.email, status: 'error', error: msg });
    }
  }

  console.log(`[trial-reminders] Done — processed: ${results.length}`);
  return NextResponse.json({ processed: results.length, results });
}
