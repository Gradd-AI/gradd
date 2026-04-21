export interface ParsedSignals {
  sessionSummary: SessionSummarySignal | null;
  lessonComplete: LessonCompleteSignal | null;
  lessonIncomplete: LessonIncompleteSignal | null;
  unitComplete: UnitCompleteSignal | null;
  weakAreaFlags: WeakAreaFlagSignal[];
}

export interface SessionSummarySignal {
  session: number;
  type: string;
  lesson: string;
  conceptsCovered: string[];
  lessonComplete: boolean;
  weakFlagsCount: number;
  applyScores: string;
  sessionFlag: string;
  nextAction: string;
}

export interface LessonCompleteSignal {
  lessonCode: string;
  weakConcepts: string[];
  applyScores: string;
  nextLesson: string;
}

export interface LessonIncompleteSignal {
  lessonCode: string;
  lastConceptCompleted: string | null;
  resumeFrom: string;
}

export interface UnitCompleteSignal {
  unitCode: string;
  checkpointScore: string;
  weakTopicsFlagged: string[];
  revisionSessionsInserted: number;
}

export interface WeakAreaFlagSignal {
  lessonCode: string;
  conceptSlug: string;
  errorDescription: string;
  recommendedAction: string;
}

export function parseSignals(responseText: string): ParsedSignals {
  return {
    sessionSummary: parseSessionSummary(responseText),
    lessonComplete: parseLessonComplete(responseText),
    lessonIncomplete: parseLessonIncomplete(responseText),
    unitComplete: parseUnitComplete(responseText),
    weakAreaFlags: parseWeakAreaFlags(responseText),
  };
}

function parseSessionSummary(text: string): SessionSummarySignal | null {
  const match = text.match(
    /\[SESSION_SUMMARY:\s*session:(\d+)\s*\|\s*type:(\S+)\s*\|\s*lesson:(\S+)\s*\|\s*concepts_covered:([^|]+)\|\s*lesson_complete:(TRUE|FALSE)\s*\|\s*weak_flags_this_session:(\d+)\s*\|\s*apply_scores:([^|]+)\|\s*session_flag:([^|]+)\|\s*next_action:([^\]]+)\]/i
  );
  if (!match) return null;

  return {
    session: parseInt(match[1]),
    type: match[2].trim(),
    lesson: match[3].trim(),
    conceptsCovered: match[4].trim().split(',').map(s => s.trim()).filter(Boolean),
    lessonComplete: match[5].trim().toUpperCase() === 'TRUE',
    weakFlagsCount: parseInt(match[6]),
    applyScores: match[7].trim(),
    sessionFlag: match[8].trim(),
    nextAction: match[9].trim(),
  };
}

function parseLessonComplete(text: string): LessonCompleteSignal | null {
  const match = text.match(
    /\[LESSON_COMPLETE:\s*(\S+)\s*\|\s*weak_concepts:([^|]+)\|\s*apply_scores:([^|]+)\|\s*next_lesson:([^\]]+)\]/i
  );
  if (!match) return null;

  const weakConcepts =
    match[2].trim() === 'NONE'
      ? []
      : match[2].trim().split(',').map(s => s.trim()).filter(Boolean);

  return {
    lessonCode: match[1].trim(),
    weakConcepts,
    applyScores: match[3].trim(),
    nextLesson: match[4].trim(),
  };
}

function parseLessonIncomplete(text: string): LessonIncompleteSignal | null {
  const match = text.match(
    /\[LESSON_INCOMPLETE:\s*(\S+)\s*\|\s*last_concept_completed:([^|]+)\|\s*resume_from:([^\]]+)\]/i
  );
  if (!match) return null;

  return {
    lessonCode: match[1].trim(),
    lastConceptCompleted: match[2].trim() === 'NONE' ? null : match[2].trim(),
    resumeFrom: match[3].trim(),
  };
}

function parseUnitComplete(text: string): UnitCompleteSignal | null {
  const match = text.match(
    /\[UNIT_COMPLETE:\s*(\S+)\s*\|\s*checkpoint_score:(\d+\/\d+)\s*\|\s*weak_topics_flagged:([^|]+)\|\s*revision_sessions_inserted:(\d+)\]/i
  );
  if (!match) return null;

  const weakTopics =
    match[3].trim() === 'NONE'
      ? []
      : match[3].trim().split(',').map(s => s.trim()).filter(Boolean);

  return {
    unitCode: match[1].trim(),
    checkpointScore: match[2].trim(),
    weakTopicsFlagged: weakTopics,
    revisionSessionsInserted: parseInt(match[4]),
  };
}

function parseWeakAreaFlags(text: string): WeakAreaFlagSignal[] {
  const flags: WeakAreaFlagSignal[] = [];
  const pattern = /\[WEAK_AREA_FLAG:\s*([^|]+)\|\s*([^|]+)\|\s*([^\]]+)\]/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const lessonCode = match[1].trim();
    const description = match[2].trim();
    const action = match[3].trim();

    const conceptSlug = description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 60);

    flags.push({
      lessonCode,
      conceptSlug,
      errorDescription: description,
      recommendedAction: action,
    });
  }

  return flags;
}
