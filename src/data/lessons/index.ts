import term1Data from './term1.json';
import term2Data from './term2.json';
import term3Data from './term3.json';
import physics3Data from './physics3.json';
import type { BuiltInLesson, PhysicsCourse } from '../../types';

export interface CourseInfo {
  course: PhysicsCourse;
  shortTitle: string;
  fullTitle: string;
  description: string;
}

export const COURSES_META: CourseInfo[] = [
  {
    course: 'Physics 1',
    shortTitle: 'Physics 1',
    fullTitle: 'Physics 1: Measurements, Kinematics, and Dynamics',
    description:
      'SI units, measurement uncertainty, 1D/2D kinematics, projectile and circular motion, forces, work, energy, momentum, rotation, and SHM.',
  },
  {
    course: 'Physics 2',
    shortTitle: 'Physics 2',
    fullTitle: 'Physics 2: Gravity, Fluid Mechanics, Heat, and Thermodynamics',
    description:
      'Universal gravitation, hydrostatics, Pascal and Archimedes principles, Bernoulli equation, heat transfer, thermal expansion, and thermodynamic laws.',
  },
  {
    course: 'Physics 3',
    shortTitle: 'Physics 3',
    fullTitle: 'Physics 3: Electricity and Electromagnetism',
    description:
      'Electrostatics, Coulomb’s law, electric fields, Gauss’s law, DC circuits, Kirchhoff’s rules, magnetic fields, electromagnetic induction, and Maxwell’s equations.',
  },
];

export const PHYSICS1_LESSONS = [
  ...(term1Data as BuiltInLesson[]),
  ...(term2Data as BuiltInLesson[]),
];
export const PHYSICS2_LESSONS = term3Data as BuiltInLesson[];
export const PHYSICS3_LESSONS = physics3Data as BuiltInLesson[];

export const ALL_LESSONS: BuiltInLesson[] = [
  ...PHYSICS1_LESSONS,
  ...PHYSICS2_LESSONS,
  ...PHYSICS3_LESSONS,
];

export function getLessonById(id: string | undefined | null): BuiltInLesson | undefined {
  if (!id) return undefined;
  return ALL_LESSONS.find((l) => l.id === id);
}

export function getLessonsByCourse(course: PhysicsCourse): BuiltInLesson[] {
  return ALL_LESSONS.filter((l) => l.course === course);
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

  const sections = [
    `${lesson.code} ${lesson.title} (${lesson.course})`,
    `Objective: ${lesson.objective}`,
    `Key Formula: ${lesson.keyFormula}`,
    `Explanation:\n${lesson.explanation}`,
  ];

  if (lesson.keyTerms?.length) {
    sections.push(
      `Key Definitions:\n${lesson.keyTerms
        .map((kt) => `- ${kt.term}: ${kt.definition}`)
        .join('\n')}`
    );
  }

  if (lesson.realWorldExamples?.length) {
    sections.push(
      `Real-World Examples:\n${lesson.realWorldExamples
        .map((ex) => `- ${ex}`)
        .join('\n')}`
    );
  }

  sections.push(
    `Worked Example:\nProblem: ${lesson.workedExample.problem}\n${steps}\nAnswer: ${lesson.workedExample.finalAnswer}`
  );

  return sections.join('\n\n');
}
