import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Search,
  X,
} from 'lucide-react';
import {
  FORMULA_TOPIC_GROUPS,
  PHYSICS_CONSTANTS,
  formatFormulaForClipboard,
  type FormulaEntry,
} from '../../data/formulas';
import { ALL_LESSONS } from '../../data/lessons';
import type { PhysicsCourse } from '../../types';
import { Card } from '../ui/Card';
import { MathInline, MathText } from '../ui/MathText';

interface QuickFormulasViewProps {
  compact?: boolean;
  initialCourse?: 'all' | PhysicsCourse;
  onNavigateLesson?: () => void;
}

const COURSE_OPTIONS: Array<{ key: 'all' | PhysicsCourse; label: string }> = [
  { key: 'all', label: `All (${ALL_LESSONS.length})` },
  {
    key: 'Physics 1',
    label: `Physics 1 (${ALL_LESSONS.filter((l) => l.course === 'Physics 1').length})`,
  },
  {
    key: 'Physics 2',
    label: `Physics 2 (${ALL_LESSONS.filter((l) => l.course === 'Physics 2').length})`,
  },
  {
    key: 'Physics 3',
    label: `Physics 3 (${ALL_LESSONS.filter((l) => l.course === 'Physics 3').length})`,
  },
];

export const QuickFormulasView: React.FC<QuickFormulasViewProps> = ({
  compact = false,
  initialCourse = 'all',
  onNavigateLesson,
}) => {
  const [selectedCourse, setSelectedCourse] = useState<'all' | PhysicsCourse>(initialCourse);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [showConstants, setShowConstants] = useState(!compact);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const courseTopics = useMemo(
    () =>
      selectedCourse === 'all'
        ? FORMULA_TOPIC_GROUPS
        : FORMULA_TOPIC_GROUPS.filter((group) => group.course === selectedCourse),
    [selectedCourse]
  );

  const normalizedQuery = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    const baseGroups =
      selectedTopicId === 'all'
        ? courseTopics
        : courseTopics.filter((group) => group.id === selectedTopicId);

    if (!normalizedQuery) return baseGroups;

    return baseGroups
      .map((group) => {
        const groupMatches =
          group.title.toLowerCase().includes(normalizedQuery) ||
          group.subtitle.toLowerCase().includes(normalizedQuery) ||
          group.course.toLowerCase().includes(normalizedQuery);

        const matchingEntries = groupMatches
          ? group.entries
          : group.entries.filter((entry) => {
              const haystack = [
                entry.lesson.code,
                entry.lesson.title,
                entry.lesson.course,
                entry.lesson.objective,
                entry.lesson.keyFormula,
                entry.variables,
                entry.keywords,
                entry.topicTitle,
              ]
                .join(' ')
                .toLowerCase();
              return haystack.includes(normalizedQuery);
            });

        return { ...group, entries: matchingEntries };
      })
      .filter((group) => group.entries.length > 0);
  }, [courseTopics, selectedTopicId, normalizedQuery]);

  const totalMatchingFormulas = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.entries.length, 0),
    [filteredGroups]
  );

  const handleSelectCourse = (course: 'all' | PhysicsCourse) => {
    setSelectedCourse(course);
    setSelectedTopicId('all');
  };

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 1600);
    } catch {
      // Clipboard unavailable in restricted context
    }
  };

  const handleCopyEntry = (entry: FormulaEntry) => {
    void handleCopyText(entry.lesson.id, formatFormulaForClipboard(entry));
  };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {/* Course Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div
          className="flex items-center gap-1 p-1 rounded-full liquid-glass w-full lg:w-fit overflow-x-auto no-scrollbar"
          role="tablist"
          aria-label="Filter formulas by physics course"
        >
          {COURSE_OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={selectedCourse === item.key}
              data-sound="tab"
              onClick={() => handleSelectCourse(item.key)}
              className={`px-3.5 min-h-[40px] rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedCourse === item.key
                  ? 'liquid-lens-active text-[#007AFF] dark:text-[#4DA3FF]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-80 shrink-0">
          <Search
            className="h-4 w-4 text-slate-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search formula, symbol, or topic..."
            aria-label="Search formulas"
            className="w-full h-11 pl-10 pr-10 rounded-full liquid-glass text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear formula search"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Topic Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        <button
          type="button"
          onClick={() => setSelectedTopicId('all')}
          className={`px-3 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            selectedTopicId === 'all'
              ? 'bg-[#007AFF] text-white shadow-xs'
              : 'bg-white/60 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-white/15 border border-slate-900/10 dark:border-white/15'
          }`}
        >
          All Topics ({courseTopics.length})
        </button>
        {courseTopics.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => setSelectedTopicId(topic.id)}
            className={`px-3 min-h-[36px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedTopicId === topic.id
                ? 'bg-[#007AFF] text-white shadow-xs'
                : 'bg-white/60 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-white/85 dark:hover:bg-white/15 border border-slate-900/10 dark:border-white/15'
            }`}
          >
            {topic.title}
          </button>
        ))}
      </div>

      {/* Collapsible Fundamental Physics Constants Strip */}
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => setShowConstants((v) => !v)}
          aria-expanded={showConstants}
          className="w-full px-4 sm:px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-950 dark:text-white">
              Fundamental Physics Constants
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Standard SI constants for Physics 1, 2, and 3 calculations · Tap any constant to copy
            </p>
          </div>
          <span className="h-8 w-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
            {showConstants ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
        </button>

        {showConstants && (
          <div className="border-t border-slate-900/10 dark:border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:gap-px bg-slate-900/5 dark:bg-white/10">
            {PHYSICS_CONSTANTS.map((item) => {
              const constKey = `const-${item.copyText}`;
              const isCopied = copiedId === constKey;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    void handleCopyText(constKey, item.copyText);
                  }}
                  className="bg-white/80 dark:bg-slate-950/75 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 p-3 text-left transition-colors cursor-pointer flex items-start justify-between gap-2"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-baseline gap-2 text-sm font-bold text-slate-950 dark:text-white">
                      <MathInline text={item.symbol} />
                      <span className="font-mono text-xs font-semibold text-[#007AFF] dark:text-sky-400 tabular-nums">
                        <MathInline text={item.valueTex} />
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      {item.name}
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 shrink-0 pt-0.5">
                    {isCopied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Active Result Summary */}
      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-0.5 tabular-nums">
        <span>
          Showing {totalMatchingFormulas} {totalMatchingFormulas === 1 ? 'formula' : 'formulas'} across{' '}
          {filteredGroups.length} {filteredGroups.length === 1 ? 'topic' : 'topics'}
        </span>
        {(selectedCourse !== 'all' || selectedTopicId !== 'all' || normalizedQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedCourse('all');
              setSelectedTopicId('all');
              setQuery('');
            }}
            className="font-semibold text-[#007AFF] dark:text-sky-400 hover:underline cursor-pointer whitespace-nowrap"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Categorized Topic Sections */}
      {filteredGroups.length === 0 ? (
        <Card className="text-center py-10 space-y-3">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No formulas match &ldquo;{query.trim()}&rdquo;
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Try searching by topic name (such as kinematics, buoyancy, or circuits), scientist (Newton, Bernoulli, Faraday), or symbol.
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedCourse('all');
                setSelectedTopicId('all');
                setQuery('');
              }}
              className="liquid-btn-outline px-4 min-h-[40px] rounded-full text-xs sm:text-sm font-semibold cursor-pointer"
            >
              Show All Formulas
            </button>
          </div>
        </Card>
      ) : (
        <div className={compact ? 'space-y-5' : 'space-y-7'}>
          {filteredGroups.map((group) => (
            <section key={group.id} className="space-y-2.5">
              {/* Clean Editorial Section Header — zero static pill boxes */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 px-0.5">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#007AFF] dark:text-sky-400">
                    <span>{group.course}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {group.entries.length} {group.entries.length === 1 ? 'formula' : 'formulas'}
                    </span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white">
                    {group.title}
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  {group.subtitle}
                </p>
              </div>

              <Card
                padding="none"
                className="divide-y divide-slate-900/10 dark:divide-white/10 overflow-hidden"
              >
                {group.entries.map((entry) => {
                  const isCopied = copiedId === entry.lesson.id;
                  return (
                    <article
                      key={entry.lesson.id}
                      className="p-4 sm:px-5 sm:py-4 space-y-2.5 hover:bg-white/40 dark:hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="font-mono text-xs font-bold text-[#007AFF] dark:text-sky-400 tabular-nums">
                              {entry.lesson.code}
                            </span>
                            <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                              {entry.lesson.title}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            <MathInline text={entry.variables} />
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyEntry(entry)}
                            aria-label={`Copy formula for ${entry.lesson.code} ${entry.lesson.title}`}
                            className="min-h-[36px] px-2.5 rounded-full border border-slate-900/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007AFF]/50 hover:text-[#007AFF] dark:hover:text-sky-400 inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                          >
                            {isCopied ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                                <span className="hidden sm:inline">Copy</span>
                              </>
                            )}
                          </button>

                          <Link
                            to={`/lessons/${entry.lesson.id}`}
                            onClick={() => onNavigateLesson?.()}
                            className="min-h-[36px] px-3 rounded-full border border-slate-900/10 dark:border-white/15 bg-white/70 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-[#007AFF]/50 hover:text-[#007AFF] dark:hover:text-sky-400 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                          >
                            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Lesson</span>
                          </Link>
                        </div>
                      </div>

                      <div className="text-sm sm:text-base text-slate-950 dark:text-slate-100">
                        <MathText text={entry.lesson.keyFormula} />
                      </div>
                    </article>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
