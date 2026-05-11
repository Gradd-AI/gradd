import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type IBSubject = 'IB_ECONOMICS' | 'IB_BUSINESS' | 'IB_BUNDLE';
type IBLevel = 'SL' | 'HL';
type CoursePosition = 'beginning' | 'mid-programme' | 'exam-prep';

interface OnboardingPayload {
  subject: IBSubject;
  economicsLevel?: IBLevel;
  businessLevel?: IBLevel;
  coursePosition: CoursePosition;
}

export async function POST(request: Request) {
  const supabase = await createServerClient();

  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  let user = null;
  const { data: { user: cookieUser } } = await supabase.auth.getUser();
  if (cookieUser) {
    user = cookieUser;
  } else if (token) {
    const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
    user = tokenUser;
  }

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: OnboardingPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { subject, economicsLevel, businessLevel, coursePosition } = body;

  const validSubjects: IBSubject[] = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'];
  const validLevels: IBLevel[] = ['SL', 'HL'];
  const validPositions: CoursePosition[] = ['beginning', 'mid-programme', 'exam-prep'];

  if (!validSubjects.includes(subject)) {
    return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
  }
  if (!validPositions.includes(coursePosition)) {
    return NextResponse.json({ error: 'Invalid course position' }, { status: 400 });
  }
  if ((subject === 'IB_ECONOMICS' || subject === 'IB_BUNDLE') && !validLevels.includes(economicsLevel!)) {
    return NextResponse.json({ error: 'Invalid economics level' }, { status: 400 });
  }
  if ((subject === 'IB_BUSINESS' || subject === 'IB_BUNDLE') && !validLevels.includes(businessLevel!)) {
    return NextResponse.json({ error: 'Invalid business level' }, { status: 400 });
  }

  // Derive exam_level for backward compatibility with session routing
  let examLevel: IBLevel;
  if (subject === 'IB_ECONOMICS') examLevel = economicsLevel!;
  else if (subject === 'IB_BUSINESS') examLevel = businessLevel!;
  else examLevel = (economicsLevel === 'HL' || businessLevel === 'HL') ? 'HL' : 'SL';

  // ── Update profile ──────────────────────────────────────────────────────────
  const profileUpdate: Record<string, string> = {
    subject,
    exam_level: examLevel,
    updated_at: new Date().toISOString(),
  };
  if (economicsLevel) profileUpdate.ib_economics_level = economicsLevel;
  if (businessLevel)  profileUpdate.ib_business_level  = businessLevel;

  const { error: profileError } = await supabase
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id);

  if (profileError) {
    console.error('Profile update error:', profileError);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }

  // ── Create student_progress rows ────────────────────────────────────────────

  const baseProgress = {
    student_id: user.id,
    session_number: 0,
    total_session_count: 0,
    course_position: coursePosition,
    updated_at: new Date().toISOString(),
  };

  const progressRows = [];

  if (subject === 'IB_ECONOMICS' || subject === 'IB_BUNDLE') {
    progressRows.push({
      ...baseProgress,
      subject: 'IB_ECONOMICS',
      current_lesson_code: 'IB_ECON_001',
      current_unit_code: 'UNIT_1',
      current_unit_name: 'Introduction to Economics',
      current_lesson_name: 'Economics as a Social Science',
    });
  }

  if (subject === 'IB_BUSINESS' || subject === 'IB_BUNDLE') {
    progressRows.push({
      ...baseProgress,
      subject: 'IB_BUSINESS',
      current_lesson_code: 'IB_BM_001',
      current_unit_code: 'UNIT_1',
      current_unit_name: 'Introduction to Business Management',
      current_lesson_name: 'What is a Business?',
    });
  }

  for (const row of progressRows) {
    const { error: progressError } = await supabase
      .from('student_progress')
      .upsert(row, { onConflict: 'student_id,subject' });

    if (progressError) {
      console.error('IB ONBOARDING PROGRESS ERROR:', JSON.stringify({
        message: progressError.message,
        code: progressError.code,
        details: progressError.details,
        hint: progressError.hint,
        row,
      }));
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
