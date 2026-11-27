import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Search,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ALL_LESSONS, COURSES_META, getLessonsByCourse } from '../data/lessons';
import type { PhysicsCourse } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { MathInline } from '../components/ui/MathText';

export const LessonsPage: React.FC = () => {
  const { profile, toggleLessonCompleted } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<'all' | PhysicsCourse>('all');
  const [query, setQuery] = useState('');

  const completedSet = useMemo(
    () => new Set(profile?.lessonsCompleted || []),
    [profile?.lessonsCompleted]
  );

  const nextUnfinishedLesson = useMemo(
    () => ALL_LESSONS.find((l) => !completedSet.has(l.id)) || ALL_LESSONS[0],
    [completedSet]
  );

  const totalCompleted = ALL_LESSONS.filter((l) => completedSet.has(l.id)).length;
  const totalPct = Math.round((totalCompleted / ALL_LESSONS.length) * 100);

  const visibleCourses = useMemo(
    () =>
      selectedCourse === 'all'
        ? COURSES_META
        : COURSES_META.filter((c) => c.course === selectedCourse),
    [selectedCourse]
  );

  const normalizedQuery = query.trim().toLowerCase();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Built-in Physics Lessons"
        subtitle={`${ALL_LESSONS.length} step-by-step Grade 12 Academic Track lessons across Physics 1, Physics 2, and Physics 3`}
        action={
          <div className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">
            {totalCompleted} / {ALL_LESSONS.length} completed ({totalPct}%)
          </div>
        }
      />

      {/* Continue Next Unfinished Lesson Banner */}
      {nextUnfinishedLesson && (
        <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-200/80 dark:border-blue-900/70 bg-blue-50/40 dark:bg-blue-950/20">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              {totalCompleted === ALL_LESSONS.length
                ? `All ${ALL_LESSONS.length} Lessons Completed — Kaya mo talaga!`
                : 'Up Next in Your Curriculum'}
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-slate-900 dark:text-neutral-100 truncate">
              {nextUnfinishedLesson.code} {nextUnfinishedLesson.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-neutral-300 line-clamp-1">
              {nextUnfinishedLesson.objective}
            </p>
          </div>
          <Link to={`/lessons/${nextUnfinishedLesson.id}`} className="shrink-0">
            <Button icon={<ArrowRight className="h-4 w-4" />}>
              {totalCompleted === 0 ? 'Start Lesson 1.1' : 'Open Lesson'}
            </Button>
          </Link>
        </Card>
      )}

      {/* Course Filter & Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1.5 rounded-full liquid-glass w-full md:w-fit overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'all', label: `All Courses (${ALL_LESSONS.length})` },
              { key: 'Physics 1', label: `Physics 1 (${getLessonsByCourse('Physics 1').length})` },
              { key: 'Physics 2', label: `Physics 2 (${getLessonsByCourse('Physics 2').length})` },
              { key: 'Physics 3', label: `Physics 3 (${getLessonsByCourse('Physics 3').length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              data-sound="tab"
              onClick={() => setSelectedCourse(item.key)}
              className={`px-3.5 min-h-[42px] rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCourse === item.key
                  ? 'liquid-lens-active text-[#007AFF] dark:text-[#4DA3FF]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search
            className="h-4 w-4 text-slate-400 dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search lesson title or formula..."
            aria-label="Search lessons"
            className="w-full h-11 pl-10 pr-4 rounded-full liquid-glass text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20"
          />
        </div>
      </div>

      {/* Physics 1, 2, and 3 Sections */}
      <div className="space-y-8">
        {visibleCourses.map((courseMeta) => {
          const allInCourse = getLessonsByCourse(courseMeta.course);
          const doneInCourse = allInCourse.filter((l) => completedSet.has(l.id)).length;
          const pctCourse = Math.round((doneInCourse / allInCourse.length) * 100);

          const filtered = normalizedQuery
            ? allInCourse.filter(
                (l) =>
                  l.title.toLowerCase().includes(normalizedQuery) ||
                  l.code.toLowerCase().includes(normalizedQuery) ||
                  l.objective.toLowerCase().includes(normalizedQuery)
              )
            : allInCourse;

          if (normalizedQuery && filtered.length === 0) return null;

          return (
            <section key={courseMeta.course} className="space-y-3">
              {/* Course Progress Header */}
              <Card className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                      {courseMeta.course}
                    </p>
                    <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-neutral-100">
                      {courseMeta.fullTitle}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-neutral-400">
                      {courseMeta.description}
                    </p>
                  </div>
                  <div className="text-left sm:text-right shrink-0 tabular-nums">
                    <p className="text-lg font-bold text-slate-950 dark:text-neutral-100">
                      {doneInCourse} / {allInCourse.length}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">{pctCourse}% complete</p>
                  </div>
                </div>

                <div className="h-2.5 w-full rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                    style={{ width: `${pctCourse}%` }}
                  />
                </div>
              </Card>

              {/* Lesson Rows */}
              <Card padding="none" className="divide-y divide-stone-200/80 dark:divide-neutral-800 overflow-hidden">
                {filtered.map((lesson) => {
                  const isDone = completedSet.has(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className="flex items-center justify-between gap-3 px-4 py-3.5 hover:bg-stone-50/80 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          void toggleLessonCompleted(lesson.id);
                        }}
                        aria-label={
                          isDone
                            ? `Mark ${lesson.code} ${lesson.title} incomplete`
                            : `Mark ${lesson.code} ${lesson.title} complete`
                        }
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-stone-100 dark:hover:bg-neutral-800 shrink-0 cursor-pointer"
                      >
                        {isDone ? (
                          <CheckCircle2
                            className="h-5 w-5 text-blue-700 dark:text-blue-400"
                            aria-hidden="true"
                          />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300 dark:text-neutral-600" aria-hidden="true" />
                        )}
                      </button>

                      <Link
                        to={`/lessons/${lesson.id}`}
                        className="flex-1 min-w-0 py-1 group"
                      >
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 tabular-nums">
                            {lesson.code}
                          </span>
                          <span
                            className={`text-base font-semibold group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors ${
                              isDone
                                ? 'text-slate-600 dark:text-neutral-400'
                                : 'text-slate-900 dark:text-neutral-100'
                            }`}
                          >
                            {lesson.title}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-neutral-400 mt-1 line-clamp-1">
                          {lesson.objective}
                        </p>
                        <div className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                          <MathInline text={lesson.keyFormula} />
                        </div>
                      </Link>

                      <Link
                        to={`/lessons/${lesson.id}`}
                        className="shrink-0 min-h-[40px] px-3.5 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 inline-flex items-center gap-1.5 transition-colors"
                      >
                        <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                        <span className="hidden sm:inline">Study</span>
                      </Link>
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default LessonsPage;
