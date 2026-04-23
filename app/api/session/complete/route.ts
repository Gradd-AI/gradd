import { createServerClient } from '@/lib/supabase/server';
import { parseSignals } from '@/lib/signal-parser';
import { NextResponse } from 'next/server';

const UNIT_SEQUENCE: Record<string, { code: string; name: string }> = {
  UNIT_1: { code: 'UNIT_2', name: 'Business Management' },
  UNIT_2: { code: 'UNIT_3', name: 'Business Management (cont.)' },
  UNIT_3: { code: 'UNIT_4A', name: 'Finance — Accounts' },
  UNIT_4A: { code: 'UNIT_4B', name: 'Finance — Ratios' },
  UNIT_4B: { code: 'UNIT_4C', name: 'Finance — Cash Flow' },
  UNIT_4C: { code: 'UNIT_5', name: 'Domestic Environment' },
  UNIT_5: { code: 'UNIT_6', name: 'International Environment' },
  UNIT_6: { code: 'EXAM_PREP', name: 'Exam Preparation' },
};

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Load session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Load current progress
  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', user.id)
    .single();

  if (!progress) return NextResponse.json({ error: 'Progress not found' }, { status: 500 });

  // Parse all signals from the final response text
  const rawText = (session.raw_final_response as string) ?? '';
  const signals = parseSignals(rawText);

  const progressUpdates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // --- SESSION_SUMMARY ---
  if (signals.sessionSummary) {
    const s = signals.sessionSummary;

    progressUpdates.last_session_summary = rawText.match(/\[SESSION_SUMMARY:[^\]]+\]/)?.[0] ?? '';

    // Spaced repetition counter
    if (s.type === 'NEW_TOPIC') {
      const newCount = (progress.new_topic_session_count ?? 0) + 1;
      if (newCount >= 5) {
        progressUpdates.new_topic_session_count = 0;
        progressUpdates.spaced_rep_due = true;
      } else {
        progressUpdates.new_topic_session_count = newCount;
      }
    }

    // Reset spaced rep flag once run
    if (
      progress.spaced_rep_due &&
      !['EXAM_PRACTICE', 'ABQ_DRILL', 'SHORT_Q_DRILL', 'UNIT_CHECKPOINT'].includes(s.type)
    ) {
      progressUpdates.spaced_rep_due = false;
    }

    // ABQ drill: every 10 sessions after Unit 3 complete
    const unit3Complete = (progress.units_completed as string[])?.includes('UNIT_3');
    if (unit3Complete && (progress.total_session_count ?? 0) % 10 === 0) {
      progressUpdates.abq_drill_due = true;
    }
    if (s.type === 'ABQ_DRILL') {
      progressUpdates.abq_drill_due = false;
    }

    // Revision scheduling
    if (
      s.sessionFlag === 'multiple_concepts_unresolved' ||
      s.nextAction?.startsWith('INSERT_REVISION_BEFORE')
    ) {
      progressUpdates.session_type = 'REVISION';
    } else {
      progressUpdates.session_type = 'NEW_TOPIC';
    }

    // Update session row
    await supabase
      .from('sessions')
      .update({
        concepts_covered: s.conceptsCovered,
        lesson_complete: s.lessonComplete,
        weak_flags_count: s.weakFlagsCount,
        apply_scores: s.applyScores,
        session_flag: s.sessionFlag,
        next_action: s.nextAction,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId);
  } else {
    // Always stamp ended_at even without a summary signal
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // --- WEAK_AREA_FLAGS ---
  for (const flag of signals.weakAreaFlags) {
    const { data: existing } = await supabase
      .from('weak_areas')
      .select('id, occurrence_count')
      .eq('student_id', user.id)
      .eq('lesson_code', flag.lessonCode)
      .eq('concept_slug', flag.conceptSlug)
      .is('resolved_at', null)
      .single();

    if (existing) {
      await supabase
        .from('weak_areas')
        .update({
          occurrence_count: (existing.occurrence_count ?? 1) + 1,
          recommended_action: flag.recommendedAction,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('weak_areas').insert({
        student_id: user.id,
        lesson_code: flag.lessonCode,
        concept_slug: flag.conceptSlug,
        error_description: flag.errorDescription,
        recommended_action: flag.recommendedAction,
        session_number: session.session_number,
      });
    }
  }

  // --- LESSON_COMPLETE ---
  if (signals.lessonComplete) {
    const lc = signals.lessonComplete;

    await supabase.from('lesson_completions').upsert({
      student_id: user.id,
      lesson_code: lc.lessonCode,
      completed_at: new Date().toISOString(),
      session_number: session.session_number,
      weak_concepts: lc.weakConcepts,
      apply_scores: lc.applyScores,
      next_lesson_code: lc.nextLesson,
    });

    // Advance current lesson
    if (lc.nextLesson && lc.nextLesson !== 'NONE') {
      // Fetch next lesson details
      const { data: nextLesson } = await supabase
        .from('lessons')
        .select('lesson_name, unit_code, unit_name')
        .eq('lesson_code', lc.nextLesson)
        .single();

      if (nextLesson) {
        progressUpdates.current_lesson_code = lc.nextLesson;
        progressUpdates.current_lesson_name = nextLesson.lesson_name;
      }
    }

    // Update lessons_completed_this_unit in progress
    const existing = (progress.lessons_completed_this_unit as string[]) ?? [];
    if (!existing.includes(lc.lessonCode)) {
      progressUpdates.lessons_completed_this_unit = [...existing, lc.lessonCode];
    }

    progressUpdates.resume_from_concept = null;
  }

  // --- LESSON_INCOMPLETE ---
  if (signals.lessonIncomplete) {
    progressUpdates.resume_from_concept = signals.lessonIncomplete.resumeFrom;
  }

  // --- UNIT_COMPLETE ---
  if (signals.unitComplete) {
    const uc = signals.unitComplete;
    const scoreNum = parseInt(uc.checkpointScore.split('/')[0]);

    await supabase.from('unit_completions').upsert({
      student_id: user.id,
      unit_code: uc.unitCode,
      completed_at: new Date().toISOString(),
      session_number: session.session_number,
      checkpoint_score: scoreNum,
      weak_topics_flagged: uc.weakTopicsFlagged,
      revision_sessions_inserted: uc.revisionSessionsInserted,
    });

    // Update units_completed array
    const completedUnits = (progress.units_completed as string[]) ?? [];
    if (!completedUnits.includes(uc.unitCode)) {
      progressUpdates.units_completed = [...completedUnits, uc.unitCode];
    }

    // Advance to next unit
    const nextUnit = UNIT_SEQUENCE[uc.unitCode];
    if (nextUnit) {
      progressUpdates.current_unit_code = nextUnit.code;
      progressUpdates.current_unit_name = nextUnit.name;
      progressUpdates.lessons_completed_this_unit = [];
      progressUpdates.pending_unit_checkpoint = false;
      progressUpdates.checkpoint_unit_code = null;
    }
  }

  // Write all progress updates
  if (Object.keys(progressUpdates).length > 1) {
    await supabase
      .from('student_progress')
      .update(progressUpdates)
      .eq('student_id', user.id);
  }

  return NextResponse.json({ success: true });
}
