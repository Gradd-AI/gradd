import fs from 'fs';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LESSON_COUNTS } from './lesson-counts';

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
  NEXT_LESSON_CODE: string;   // fetched from lessons.next_lesson_code
  NEXT_LESSON_NAME: string;   // fetched from lessons.lesson_name for next lesson
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

  // 1. Strip the file header block (title, version, status, curriculum ref lines at top)
  prompt = prompt.replace(/^(#[^\n]*\n)+/, '');

  // 2. Strip developer notes blockquote
  prompt = prompt.replace(/> \*\*DEVELOPER NOTES.*?^---/ms, '---');

  // 3. Strip all intermediate layer continuation headers (# Parts N-N lines)
  prompt = prompt.replace(/^# ━━━[^\n]*\n(#[^\n]*\n)*/gm, '');

  // 4. Strip all italic developer footers (*Appended to..., *Total document parts..., etc.)
  prompt = prompt.replace(/^\*[^\n]*(Version|Appended|Date:|Parts:|Total document|Developer note)[^\n]*\n/gm, '');

  // 5. Strip orphaned double dividers left after footer removal
  prompt = prompt.replace(/^---\n---\n/gm, '---\n');

  // 6. Collapse leading whitespace
  prompt = prompt.trimStart();

  const replacements: Record<string, string> = {
    '{{STUDENT_NAME}}': vars.STUDENT_NAME,
    '{{EXAM_LEVEL}}': vars.EXAM_LEVEL === 'higher' ? 'Higher Level' : 'Ordinary Level',
    '{{CURRENT_UNIT_CODE}}': vars.CURRENT_UNIT_CODE,
    '{{CURRENT_UNIT_NAME}}': vars.CURRENT_UNIT_NAME,
    '{{CURRENT_LESSON_CODE}}': vars.CURRENT_LESSON_CODE,
    '{{CURRENT_LESSON_NAME}}': vars.CURRENT_LESSON_NAME,
    '{{NEXT_LESSON_CODE}}': vars.NEXT_LESSON_CODE,
    '{{NEXT_LESSON_NAME}}': vars.NEXT_LESSON_NAME,
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


export interface IBEconomicsContextVariables {
  STUDENT_NAME: string;
  EXAM_LEVEL: string;
  CURRENT_UNIT_CODE: string;
  CURRENT_UNIT_NAME: string;
  CURRENT_LESSON_CODE: string;
  CURRENT_LESSON_NAME: string;
  NEXT_LESSON_CODE: string;
  NEXT_LESSON_NAME: string;
  LESSONS_COMPLETED_THIS_UNIT: string;
  UNITS_COMPLETED_LIST: string;
  SESSION_NUMBER: number;
  SESSION_TYPE: string;
  WEAK_AREAS_LIST: string;
  LAST_SESSION_SUMMARY: string;
  COURSE_POSITION: string;
  EXAM_QUESTIONS_CONTEXT?: string;
}

export async function buildIBEconomicsPrompt(
  vars: IBEconomicsContextVariables
): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    'prompts',
    'ib_economics_tutor_system_prompt_v1_8.md'
  );

  let prompt: string;
  try {
    prompt = fs.readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error(`IB Economics prompt not found at ${promptPath}`);
  }

  const replacements: Record<string, string> = {
    '{{STUDENT_NAME}}':               vars.STUDENT_NAME,
    '{{EXAM_LEVEL}}':                 vars.EXAM_LEVEL,
    '{{CURRENT_UNIT_CODE}}':          vars.CURRENT_UNIT_CODE,
    '{{CURRENT_UNIT_NAME}}':          vars.CURRENT_UNIT_NAME,
    '{{CURRENT_LESSON_CODE}}':        vars.CURRENT_LESSON_CODE,
    '{{CURRENT_LESSON_NAME}}':        vars.CURRENT_LESSON_NAME,
    '{{NEXT_LESSON_CODE}}':           vars.NEXT_LESSON_CODE,
    '{{NEXT_LESSON_NAME}}':           vars.NEXT_LESSON_NAME,
    '{{LESSONS_COMPLETED_THIS_UNIT}}': vars.LESSONS_COMPLETED_THIS_UNIT,
    '{{UNITS_COMPLETED_LIST}}':       vars.UNITS_COMPLETED_LIST,
    '{{SESSION_NUMBER}}':             String(vars.SESSION_NUMBER),
    '{{SESSION_TYPE}}':               vars.SESSION_TYPE,
    '{{WEAK_AREAS_LIST}}':            vars.WEAK_AREAS_LIST,
    '{{LAST_SESSION_SUMMARY}}':       vars.LAST_SESSION_SUMMARY || 'No previous session.',
    '{{COURSE_POSITION}}':            vars.COURSE_POSITION,
    '{{EXAM_QUESTIONS_CONTEXT}}':     vars.EXAM_QUESTIONS_CONTEXT ?? '',
  };

  for (const [token, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(token, value);
  }

  return prompt;
}

type ExamQuestion = {
  id: string;
  question_text: string;
  context_text: string | null;
  paper: string;
  command_term: string;
  marks: number;
  ao_level: string | null;
  level: string;
  tier: number;
  scheme_data?: { accepted_points?: { point: string; marks: number }[]; marking_rule?: string } | null;
};

export async function fetchExamQuestionsContext(
  supabase: SupabaseClient,
  lessonCode: string,
  examLevel: string,
  subject: string,
  unitCode?: string,
): Promise<{ formatted: string }> {
  const levels = examLevel === 'HL' ? ['SL', 'HL'] : ['SL'];

  const { data, error } = await supabase.rpc('fetch_exam_questions_tiered', {
    p_lesson_code: lessonCode,
    p_subject:     subject,
    p_levels:      levels,
    p_unit_code:   unitCode ?? null,
  });

  if (error || !data || (data as ExamQuestion[]).length === 0) {
    return { formatted: '' };
  }

  const formatted = (data as ExamQuestion[])
    .map((q, i) => {
      const ao  = q.ao_level ? ` (${q.ao_level})` : '';
      const ctx = q.context_text ? `${q.context_text}\n` : '';
      const scheme = q.scheme_data?.accepted_points?.length
        ? `\n[[SCHEME_INJECTED]]\nMARK SCHEME (${q.scheme_data.marking_rule ?? 'award per point'}):\n` +
          q.scheme_data.accepted_points.map((p, n) => `${n + 1}. (${p.marks} mark) ${p.point}`).join('\n')
        : '';
      return `EXAMPLE ${i + 1} — Paper ${q.paper}, ${q.marks} marks, "${q.command_term}"${ao}\n${ctx}${q.question_text}${scheme}`;
    })
    .join('\n---\n');

  return { formatted };
}

export async function buildIBBusinessPrompt(
  vars: IBEconomicsContextVariables
): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    'prompts',
    'ib_business_tutor_system_prompt_v1_8.md'
  );

  let prompt: string;
  try {
    prompt = fs.readFileSync(promptPath, 'utf-8');
  } catch {
    throw new Error(`IB Business prompt not found at ${promptPath}`);
  }

  const replacements: Record<string, string> = {
    '{{STUDENT_NAME}}':                vars.STUDENT_NAME,
    '{{EXAM_LEVEL}}':                  vars.EXAM_LEVEL,
    '{{CURRENT_UNIT_CODE}}':           vars.CURRENT_UNIT_CODE,
    '{{CURRENT_UNIT_NAME}}':           vars.CURRENT_UNIT_NAME,
    '{{CURRENT_LESSON_CODE}}':         vars.CURRENT_LESSON_CODE,
    '{{CURRENT_LESSON_NAME}}':         vars.CURRENT_LESSON_NAME,
    '{{NEXT_LESSON_CODE}}':            vars.NEXT_LESSON_CODE,
    '{{NEXT_LESSON_NAME}}':            vars.NEXT_LESSON_NAME,
    '{{LESSONS_COMPLETED_THIS_UNIT}}': vars.LESSONS_COMPLETED_THIS_UNIT,
    '{{UNITS_COMPLETED_LIST}}':        vars.UNITS_COMPLETED_LIST,
    '{{SESSION_NUMBER}}':              String(vars.SESSION_NUMBER),
    '{{SESSION_TYPE}}':                vars.SESSION_TYPE,
    '{{WEAK_AREAS_LIST}}':             vars.WEAK_AREAS_LIST,
    '{{LAST_SESSION_SUMMARY}}':        vars.LAST_SESSION_SUMMARY || 'No previous session.',
    '{{COURSE_POSITION}}':             vars.COURSE_POSITION,
    '{{EXAM_QUESTIONS_CONTEXT}}':      vars.EXAM_QUESTIONS_CONTEXT ?? '',
  };

  for (const [token, value] of Object.entries(replacements)) {
    prompt = prompt.replaceAll(token, value);
  }

  return prompt;
}

export function deriveCoursePosition(
  lessonOrder: number,
  subject: string,
  examLevel: string,
): string {
  const key = `${subject}_${examLevel}`;
  const total = LESSON_COUNTS[key];
  if (total === undefined) {
    console.warn(`deriveCoursePosition: unknown key "${key}" — check subject and examLevel values`);
  }
  const pct = lessonOrder / (total ?? 210);
  if (pct < 0.33) return 'beginning';
  if (pct < 0.67) return 'mid-programme';
  return 'exam-prep';
}