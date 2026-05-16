// app/api/dev/preview-ib-email/route.ts
// TEMPORARY — delete before merging fix/ib-weekly-email to main.
// Renders the IB weekly progress email as HTML for local copy review.
//
// Usage:
//   /api/dev/preview-ib-email?mode=early        — < 4 weeks active (counts only)
//   /api/dev/preview-ib-email?mode=established   — 4+ weeks active (lessons + weak areas)
//   /api/dev/preview-ib-email                    — defaults to established

import { NextRequest } from 'next/server'
import { generateIBWeeklyProgressEmail, IBWeeklyEmailData } from '@/lib/email/ib-weekly-progress-template'

const SAMPLE_BASE: Omit<IBWeeklyEmailData, 'weeksActive' | 'lessonsCompletedThisWeek' | 'activeWeakAreas'> = {
  studentName:        'Aoife',
  parentName:         'Siobhán',
  email:              'preview@example.com',
  subject:            'IB_ECONOMICS',
  sessionsThisWeek:   4,
  sessionsLastWeek:   2,
  studyStreakDays:    6,
  totalSessionCount:  23,
  currentLessonName:  'Price Elasticity of Demand — Formula, Degrees, and Determinants',
  currentUnitName:    'Microeconomics',
  daysToExam:         347,
}

const EARLY_DATA: IBWeeklyEmailData = {
  ...SAMPLE_BASE,
  weeksActive:               2,
  lessonsCompletedThisWeek:  [],
  activeWeakAreas:           [],
}

const ESTABLISHED_DATA: IBWeeklyEmailData = {
  ...SAMPLE_BASE,
  weeksActive: 11,
  lessonsCompletedThisWeek: [
    { lesson_code: 'IB_ECON_037', lesson_name: 'Price Elasticity of Demand — Formula, Degrees, and Determinants' },
    { lesson_code: 'IB_ECON_038', lesson_name: 'PED and Total Revenue — The Key Relationship' },
    { lesson_code: 'IB_ECON_039', lesson_name: 'Income and Cross Elasticity of Demand' },
  ],
  activeWeakAreas: [
    { concept_slug: 'ped_and_total_revenue', error_description: 'Consistently inverts the PED–revenue relationship for inelastic goods' },
    { concept_slug: 'consumer_surplus_calculation', error_description: 'Misidentifies the surplus area on price-ceiling diagrams' },
    { concept_slug: 'comparative_advantage', error_description: 'Confuses absolute advantage with comparative advantage in trade scenarios' },
  ],
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not found', { status: 404 })
  }

  const mode = req.nextUrl.searchParams.get('mode') ?? 'established'
  const data = mode === 'early' ? EARLY_DATA : ESTABLISHED_DATA

  const html = generateIBWeeklyProgressEmail(data)
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
