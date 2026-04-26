import fs from 'fs';
import path from 'path';

interface WeakArea {
  lesson_code: string;
  concept_slug: string;
  error_description: string;
}

interface UnitCompletion {
  unit_code: string;
}

interface LessonCompletion {
  lesson_code: string;
}

export interface ContextVariables {
  STUDENT_NAME: string;
  EXAM_LEVEL: string;
  CURRENT_UNIT_CODE: string;
  CURRENT_UNIT_NAME: string;
  CURRENT_LESSON_CODE: string;
  CURRENT_LESSON_NAME: string;
  LESSONS_COMPLETED_THIS_UNIT: string;
  UNITS_COMPLETED_LIST: string;
  SESSION_NUMBER: number;
  SESSION_TYPE: string;
  WEAK_AREAS_LIST: string;
  LAST_SESSION_SUMMARY: string;
  SPACED_REP_DUE: string;
  ABQ_DRILL_DUE: string;
}

export async function buildInjectedSystemPrompt(vars: ContextVariables): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    'prompts',
    'lc_business_tutor_system_prompt_v1_4.md'
  );

  let prompt: string;
  try {
    prompt = fs.readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error(`System prompt not found at ${promptPath}`);
  }

  // Strip the file header block (title, version, status, curriculum reference lines)
  // These are developer metadata — the model must never see them
  prompt = prompt.replace(/^#.*?\n(##.*?\n)*/, '');

  // Strip developer notes blockquote before the first ---
  prompt = prompt.replace(/> \*\*DEVELOPER NOTES.*?^---/ms, '---');

  // Strip the footer developer note at the very end of the file
  prompt = prompt.replace(/\*Error Watch Lists.*$/ms, '');

  // Collapse any leading whitespace/newlines left after stripping
  prompt = prompt.trimStart();

  const replacements: Record<string, string> = {
    '{{STUDENT_NAME}}': vars.STUDENT_NAME,
    '{{EXAM_LEVEL}}': vars.EXAM_LEVEL === 'higher' ? 'Higher Level' : 'Ordinary Level',
    '{{CURRENT_UNIT_CODE}}': vars.CURRENT_UNIT_CODE,
    '{{CURRENT_UNIT_NAME}}': vars.CURRENT_UNIT_NAME,
    '{{CURRENT_LESSON_CODE}}': vars.CURRENT_LESSON_CODE,
    '{{CURRENT_LESSON_NAME}}': vars.CURRENT_LESSON_NAME,
    '{{LESSONS_COMPLETED_THIS_UNIT}}': vars.LESSONS_COMPLETED_THIS_UNIT,
    '{{UNITS_COMPLETED_LIST}}': vars.UNITS_COMPLETED_LIST,
    '{{SESSION_NUMBER}}': String(vars.SESSION_NUMBER),
    '{{SESSION_TYPE}}': vars.SESSION_TYPE,
    '{{WEAK_AREAS_LIST}}': vars.WEAK_AREAS_LIST,
    '{{LAST_SESSION_SUMMARY}}': vars.LAST_SESSION_SUMMARY || 'No previous session.',
    '{{SPACED_REP_DUE}}': vars.SPACED_REP_DUE,
    '{{ABQ_DRILL_DUE}}': vars.ABQ_DRILL_DUE,
  };

  for (const [token, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(token, value);
  }

  return prompt;
}

export function formatWeakAreasList(weakAreas: WeakArea[]): string {
  if (!weakAreas || weakAreas.length === 0) return 'NONE';
  return weakAreas
    .map(w => `${w.lesson_code} | ${w.concept_slug} | ${w.error_description}`)
    .join('\n');
}

export function formatUnitsCompletedList(completions: UnitCompletion[]): string {
  if (!completions || completions.length === 0) return 'NONE';
  return completions.map(c => c.unit_code).join(', ');
}

export function formatLessonsCompletedThisUnit(
  completions: LessonCompletion[],
  currentUnitCode: string
): string {
  if (!completions || completions.length === 0) return 'NONE';
  const prefix = currentUnitCode.replace('UNIT_', '');
  const unitCompletions = completions.filter(c => c.lesson_code.startsWith(prefix + '.'));
  if (unitCompletions.length === 0) return 'NONE';
  return unitCompletions.map(c => c.lesson_code).join(', ');
}
