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
    /\[UNIT_COMPLETE:\s*(\S+)\s*\|\s*checkpoint_score:\s*(\d+\/\d+)\s*\|\s*weak_topics_flagged:\s*([^|]+?)\s*\|\s*revision_sessions_inserted:\s*(\d+)\]/i
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
  // Matches the JSON format emitted by v1.2+ prompts:
  // [WEAK_AREA_FLAG: { "topic": "...", "lesson_code": "...", "concept": "...", "severity": "..." }]
  const pattern = /\[WEAK_AREA_FLAG:\s*\{([\s\S]*?)\}\s*\]/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const body = '{' + match[1] + '}';
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(body);
    } catch (err) {
      console.error('[signal-parser] WEAK_AREA_FLAG: malformed JSON — skipping flag:', body, err);
      continue;
    }

    const topic = (parsed.topic ?? '').trim();
    const lessonCode = (parsed.lesson_code ?? '').trim();
    const concept = (parsed.concept ?? '').trim();
    const severity = (parsed.severity ?? 'moderate').trim();

    if (!lessonCode || !concept) {
      console.error('[signal-parser] WEAK_AREA_FLAG: missing lesson_code or concept — skipping:', parsed);
      continue;
    }

    const conceptSlug = topic
      ? topic.substring(0, 60)
      : concept.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 60);

    flags.push({
      lessonCode,
      conceptSlug,
      errorDescription: concept,
      recommendedAction: `[${severity}] re-teach from a different angle before advancing`,
    });
  }

  return flags;
}
