export type SessionType =
  | 'NEW_TOPIC'
  | 'REVISION'
  | 'EXAM_PRACTICE'
  | 'ABQ_DRILL'
  | 'SHORT_Q_DRILL'
  | 'UNIT_CHECKPOINT';

interface StudentProgress {
  pending_unit_checkpoint: boolean;
  abq_drill_due: boolean;
  session_type: SessionType;
}

export function determineSessionType(progress: StudentProgress): SessionType {
  // Unit checkpoint takes absolute priority — gates the next unit
  if (progress.pending_unit_checkpoint) return 'UNIT_CHECKPOINT';

  // ABQ drill due (triggered every 10 sessions after Unit 3 is complete)
  if (progress.abq_drill_due) return 'ABQ_DRILL';

  // Scheduled revision sessions (inserted by backend when session_flag triggers it)
  if (progress.session_type === 'REVISION') return 'REVISION';

  // Default: new topic
  return 'NEW_TOPIC';
}

export function sessionTypeLabel(type: SessionType): string {
  const labels: Record<SessionType, string> = {
    NEW_TOPIC: 'New Topic',
    REVISION: 'Revision',
    EXAM_PRACTICE: 'Exam Practice',
    ABQ_DRILL: 'ABQ Drill',
    SHORT_Q_DRILL: 'Short Questions',
    UNIT_CHECKPOINT: 'Unit Checkpoint',
  };
  return labels[type] ?? type;
}
