import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Clock,
  Flame,
  Layers,
  RefreshCw,
  Search,
  Target,
  Trophy,
} from 'lucide-react';
import { useAuth, getCurrentWeekKey, getLocalDateKey } from '../../contexts/AuthContext';
import { TERMS_META, getLessonsByTerm } from '../../data/lessons';
import type { LeaderboardEntry, QuizAttempt, StudySession, StudySet } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Logo } from '../ui/Logo';

interface ProgressTabProps {
  attempts: QuizAttempt[];
  sessions: StudySession[];
  leaderboard: LeaderboardEntry[];
  studySets?: StudySet[];
  onSwitchTab?: (tab: 'flashcards' | 'quiz' | 'materials') => void;
}

const MedalBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return (
      <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" aria-label="1st place">
        <path d="M9 3h5l2 8h-5z" fill="#EF4444" />
        <path d="M23 3h-5l-2 8h5z" fill="#DC2626" />
        <circle cx="16" cy="20" r="9.5" fill="#F59E0B" stroke="#FDE68A" strokeWidth="1.5" />
        <text x="16" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">
          1
        </text>
      </svg>
    );
  }
  if (rank === 2) {
    return (
      <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" aria-label="2nd place">
        <path d="M9 3h5l2 8h-5z" fill="#2563EB" />
        <path d="M23 3h-5l-2 8h5z" fill="#1D4ED8" />
        <circle cx="16" cy="20" r="9.5" fill="#94A3B8" stroke="#E2E8F0" strokeWidth="1.5" />
        <text x="16" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">
          2
        </text>
      </svg>
    );
  }
  if (rank === 3) {
    return (
      <svg className="h-8 w-8 shrink-0" viewBox="0 0 32 32" aria-label="3rd place">
        <path d="M9 3h5l2 8h-5z" fill="#0284C7" />
        <path d="M23 3h-5l-2 8h5z" fill="#0369A1" />
        <circle cx="16" cy="20" r="9.5" fill="#D97706" stroke="#FCD34D" strokeWidth="1.5" />
        <text x="16" y="24" textAnchor="middle" fontSize="11" fontWeight="800" fill="#FFFFFF">
          3
        </text>
      </svg>
    );
  }
  return (
    <span className="w-8 h-8 inline-flex items-center justify-center text-xs font-bold text-slate-500 dark:text-neutral-400 tabular-nums shrink-0">
      #{rank}
    </span>
  );
};

export const ProgressTab: React.FC<ProgressTabProps> = ({
  attempts,
  sessions,
  leaderboard,
  studySets = [],
  onSwitchTab,
}) => {
  const { user, profile, toggleChecklistItem } = useAuth();
  const navigate = useNavigate();

  const [challengeMode, setChallengeMode] = useState<'flashcards' | 'quiz'>('flashcards');
  const [periodMode, setPeriodMode] = useState<'weekly' | 'alltime'>('weekly');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user && profile && !profile.checklist?.check_dashboard_leaderboard) {
      void toggleChecklistItem('check_dashboard_leaderboard', true);
    }
  }, [user?.uid]);

  const dueTodayCount = useMemo(() => {
    const now = Date.now();
    let count = 0;
    for (const set of studySets) {
      for (const card of set.flashcards || []) {
        if ((card.nextReviewAt || 0) <= now) count += 1;
      }
    }
    return count;
  }, [studySets]);

  const currentWeekKey = getCurrentWeekKey();
  const todayKey = getLocalDateKey();
  const todayMinutes = Math.round(
    (profile?.todayStudyDate === todayKey ? profile.todayStudySeconds || 0 : 0) / 60
  );
  const dailyGoalMinutes = profile?.dailyGoalMinutes || 15;
  const dailyGoalPct = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      if (periodMode === 'weekly') {
        const aWeek = a.weekKey === currentWeekKey ? a.weeklyXp || 0 : 0;
        const bWeek = b.weekKey === currentWeekKey ? b.weeklyXp || 0 : 0;
        if (bWeek !== aWeek) return bWeek - aWeek;
      }
      return (b.xp || 0) - (a.xp || 0);
    });
  }, [leaderboard, periodMode, currentWeekKey]);

  const filteredLeaderboard = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return sortedLeaderboard;
    return sortedLeaderboard.filter((entry) => entry.nickname.toLowerCase().includes(q));
  }, [sortedLeaderboard, searchTerm]);

  const totalMinutes = Math.round((profile?.totalStudySeconds || 0) / 60);
  const avgQuizPct =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length)
      : 0;

  const recentChartAttempts = [...attempts].slice(0, 10).reverse();
  const displayName = profile?.nickname || profile?.username || 'You';
  const userInitial = displayName.charAt(0).toUpperCase();
  const completedLessonsSet = useMemo(
    () => new Set(profile?.lessonsCompleted || []),
    [profile?.lessonsCompleted]
  );

  const handleLaunchChallenge = () => {
    if (studySets.length === 0) {
      if (onSwitchTab) {
        onSwitchTab('materials');
      } else {
        navigate('/study?tab=materials');
      }
      return;
    }
    if (onSwitchTab) {
      onSwitchTab(challengeMode);
    } else {
      navigate(`/study?tab=${challengeMode}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-400">
            <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>Study Streak</span>
          </div>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
            {profile?.streakDays ?? 0} day{(profile?.streakDays ?? 0) === 1 ? '' : 's'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-neutral-400">
            <span>Daily Goal</span>
            <span className="tabular-nums text-blue-700 dark:text-blue-400">
              {todayMinutes}/{dailyGoalMinutes}m
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${dailyGoalPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
            {totalMinutes}m total studied
          </p>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-400">
            <Layers className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <span>Cards Due / Reviewed</span>
          </div>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
            {dueTodayCount} / {profile?.cardsReviewedCount ?? 0}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-400">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>Total XP · Quiz Avg</span>
          </div>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
            {(profile?.xp ?? 0).toLocaleString()} · {attempts.length > 0 ? `${avgQuizPct}%` : '—'}
          </p>
        </Card>
      </div>

      {/* Term 1, Term 2, Term 3 Curriculum Progress */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
              Lesson Completion by Term
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              47 built-in lessons across Terms 1, 2, and 3
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/lessons')}>
            Open Lessons
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TERMS_META.map((term) => {
            const lessons = getLessonsByTerm(term.term);
            const done = lessons.filter((l) => completedLessonsSet.has(l.id)).length;
            const pct = Math.round((done / lessons.length) * 100);
            return (
              <div
                key={term.term}
                className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800 p-3.5 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-blue-700 dark:text-blue-400">{term.shortTitle}</span>
                  <span className="text-slate-700 dark:text-neutral-300 tabular-nums">
                    {done}/{lessons.length} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Daily Physics Challenge Focal Card */}
      <Card className="relative overflow-hidden space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center shrink-0">
              <Target className="h-4.5 w-4.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                Daily Physics Challenge
              </p>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                Grade 12 Physics 1–3 · Steady practice wins
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setChallengeMode((prev) => (prev === 'flashcards' ? 'quiz' : 'flashcards'))
            }
            aria-label="Switch daily challenge mode"
            className="h-10 w-10 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 hover:rotate-90 active:scale-90 inline-flex items-center justify-center transition-[transform,background-color] duration-200 cursor-pointer shrink-0"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-700 dark:bg-blue-600 text-white text-lg font-bold flex items-center justify-center shrink-0">
              {userInitial}
            </div>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
                {challengeMode === 'flashcards' ? 'SM-2 Flashcard Sprint' : 'Mixed Quiz Drill'}
              </p>
              <p className="text-sm text-slate-600 dark:text-neutral-400 tabular-nums">
                {studySets.length === 0
                  ? 'Generate a study set from any lesson or uploaded notes to begin'
                  : challengeMode === 'flashcards'
                  ? `${dueTodayCount} flashcard${dueTodayCount === 1 ? '' : 's'} due today · +2 to +6 XP per card`
                  : `${studySets.length} study set${studySets.length === 1 ? '' : 's'} ready · +10 XP per correct answer`}
              </p>
            </div>
          </div>

          <Button
            onClick={handleLaunchChallenge}
            icon={
              challengeMode === 'flashcards' ? (
                <BookOpen className="h-4 w-4" />
              ) : (
                <Target className="h-4 w-4" />
              )
            }
          >
            {studySets.length === 0
              ? 'Add Study Material'
              : challengeMode === 'flashcards'
              ? dueTodayCount > 0
                ? `Review ${dueTodayCount} Due`
                : 'Practice Cards'
              : 'Launch Quiz'}
          </Button>
        </div>
      </Card>

      {/* Global Leadership Board Card */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
          Global Leadership Board
        </h2>

        <Card className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-2xl bg-stone-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <Logo size="sm" showText={false} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-neutral-400">
                  Usernames &amp; XP only · RA 10173 compliant
                </p>
                <p className="text-lg font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
                  {sortedLeaderboard.length} learner{sortedLeaderboard.length === 1 ? '' : 's'} worldwide
                </p>
              </div>
            </div>

            <div className="relative w-full sm:w-56">
              <Search
                className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search username..."
                aria-label="Search Global Leadership Board by username"
                className="w-full h-10 pl-9 pr-3 rounded-full border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-900 text-xs text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPeriodMode('weekly')}
              className={`min-h-[38px] px-4 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                periodMode === 'weekly'
                  ? 'bg-blue-700 text-white dark:bg-blue-600'
                  : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-stone-200 dark:border-neutral-700'
              }`}
            >
              Weekly XP ({currentWeekKey})
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('alltime')}
              className={`min-h-[38px] px-4 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                periodMode === 'alltime'
                  ? 'bg-blue-700 text-white dark:bg-blue-600'
                  : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-stone-200 dark:border-neutral-700'
              }`}
            >
              All-Time XP
            </button>
          </div>

          {filteredLeaderboard.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500 dark:text-neutral-400">
              {sortedLeaderboard.length === 0
                ? 'No learners on the Global Leadership Board yet. Complete a lesson, quiz, or card review to earn XP!'
                : 'No learners match that username filter.'}
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-neutral-800/80">
              {filteredLeaderboard.map((entry) => {
                const rank =
                  sortedLeaderboard.findIndex((item) => item.uid === entry.uid) + 1;
                const isSelf = entry.uid === user?.uid;
                const initial = (entry.nickname || 'S').charAt(0).toUpperCase();
                const displayXp =
                  periodMode === 'weekly'
                    ? entry.weekKey === currentWeekKey
                      ? entry.weeklyXp || 0
                      : 0
                    : entry.xp || 0;

                return (
                  <div
                    key={entry.uid}
                    className={`py-3 px-2.5 sm:px-3 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                      isSelf ? 'bg-blue-50/70 dark:bg-blue-950/35' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MedalBadge rank={rank} />
                      <span
                        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelf
                            ? 'bg-blue-700 text-white dark:bg-blue-600'
                            : 'bg-stone-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-200'
                        }`}
                        aria-hidden="true"
                      >
                        {initial}
                      </span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-neutral-100 truncate block">
                          {entry.nickname}
                          {isSelf && (
                            <span className="ml-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                              (You)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <span className="px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold tabular-nums shrink-0">
                      {displayXp.toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Quiz Scores Over Time & Sessions */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
              Quiz Scores Over Time
            </h2>
            <p className="text-xs text-slate-500 dark:text-neutral-400">
              Last {recentChartAttempts.length} completed quizzes
            </p>
          </div>
        </div>

        {recentChartAttempts.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-neutral-400">
            Complete a quiz in the Quizzes tab to see your score trend here.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="h-44 flex items-end gap-2 pt-4 pb-2 px-2 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800">
              {recentChartAttempts.map((a, idx) => (
                <div
                  key={a.id}
                  className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full min-w-0"
                >
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-neutral-300 tabular-nums">
                    {a.percentage}%
                  </span>
                  <div
                    className="w-full max-w-[36px] rounded-t-lg bg-blue-700 dark:bg-blue-500 transition-all"
                    style={{ height: `${Math.max(8, a.percentage)}%` }}
                    title={`${a.studySetTitle}: ${a.score}/${a.totalQuestions} (${a.percentage}%)`}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400 tabular-nums">
                    Q{idx + 1}
                  </span>
                </div>
              ))}
            </div>

            <div className="divide-y divide-stone-200 dark:divide-neutral-800">
              {attempts.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-neutral-100 truncate">
                      {a.studySetTitle}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {a.course} · +{a.xpEarned} XP
                    </p>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-neutral-100 tabular-nums shrink-0">
                    {a.score}/{a.totalQuestions} ({a.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sessions.length > 0 && (
          <div className="pt-3 border-t border-stone-200 dark:border-neutral-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400 mb-2 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Recent Study Sessions ({sessions.length} logged)
            </p>
            <div className="space-y-1.5">
              {sessions.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-xs text-slate-600 dark:text-neutral-300 tabular-nums"
                >
                  <span>
                    {s.type === 'pomodoro'
                      ? `Pomodoro focus (${Math.max(1, Math.round(s.durationSeconds / 60))} min)`
                      : `Flashcard review (${s.cardsReviewed} card${s.cardsReviewed === 1 ? '' : 's'})`}
                  </span>
                  <span className="font-semibold text-blue-700 dark:text-blue-400">
                    +{s.xpEarned} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
