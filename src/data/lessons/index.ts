import term1Data from './term1.json';
import term2Data from './term2.json';
import term3Data from './term3.json';
import type { BuiltInLesson } from '../../types';

export interface TermInfo {
  term: 1 | 2 | 3;
  course: 'Physics 1' | 'Physics 2';
  shortTitle: string;
  fullTitle: string;
  description: string;
}

export const TERMS_META: TermInfo[] = [
  {
    term: 1,
    course: 'Physics 1',
    shortTitle: 'Term 1 · Physics 1',
    fullTitle: 'Term 1 (Physics 1): Measurements and Translational Kinematics',
    description: 'SI units, measurement uncertainty, 1D/2D kinematics, projectile, circular, and relative motion.',
  },
  {
    term: 2,
    course: 'Physics 1',
    shortTitle: 'Term 2 · Physics 1',
    fullTitle: 'Term 2 (Physics 1): Dynamics',
    description: 'Forces, vectors, Newton’s laws, work, energy, momentum, rotation, torque, and SHM.',
  },
  {
    term: 3,
    course: 'Physics 2',
    shortTitle: 'Term 3 · Physics 2',
    fullTitle: 'Term 3 (Physics 2): Gravity, Fluid Mechanics, Heat, and Thermodynamics',
    description: 'Universal gravitation, fluids, heat transfer, thermal expansion, thermodynamic laws, and engines.',
  },
];

export const TERM1_LESSONS = term1Data as BuiltInLesson[];
export const TERM2_LESSONS = term2Data as BuiltInLesson[];
export const TERM3_LESSONS = term3Data as BuiltInLesson[];

export const ALL_LESSONS: BuiltInLesson[] = [
  ...TERM1_LESSONS,
  ...TERM2_LESSONS,
  ...TERM3_LESSONS,
];

export function getLessonById(id: string | undefined | null): BuiltInLesson | undefined {
  if (!id) return undefined;
  return ALL_LESSONS.find((l) => l.id === id);
}

export function getLessonsByTerm(term: 1 | 2 | 3): BuiltInLesson[] {
  return ALL_LESSONS.filter((l) => l.term === term);
}

export function getNextLesson(currentId: string): BuiltInLesson | undefined {
  const idx = ALL_LESSONS.findIndex((l) => l.id === currentId);
  if (idx === -1 || idx + 1 >= ALL_LESSONS.length) return undefined;
  return ALL_LESSONS[idx + 1];
}

export function buildLessonStudyText(lesson: BuiltInLesson): string {
  const steps = lesson.workedExample.solutionSteps
    .map((s, i) => `Step ${i + 1}: ${s}`)
    .join('\n');

  return [
    `${lesson.code} ${lesson.title} (${lesson.course})`,
    `Objective: ${lesson.objective}`,
    `Key Formula: ${lesson.keyFormula}`,
    `Explanation:\n${lesson.explanation}`,
    `Worked Example:\nProblem: ${lesson.workedExample.problem}\n${steps}\nAnswer: ${lesson.workedExample.finalAnswer}`,
  ].join('\n\n');
}
