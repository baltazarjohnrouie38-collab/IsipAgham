import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  ChevronRight,
  Clock,
  Layers,
  Plus,
  Send,
  Target,
} from 'lucide-react';
import { useAuth, getLocalDateKey } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { ALL_LESSONS } from '../data/lessons';
import { subscribeLeaderboard } from '../lib/studyService';
import type { LeaderboardEntry } from '../types';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Logo } from '../components/ui/Logo';
import {
  LessonsGraphicIcon,
  NotesGraphicIcon,
  StreakGraphicIcon,
  TrophyGraphicIcon,
  UploadGraphicIcon,
  VisualizerGraphicIcon,
} from '../components/ui/PhysicsIcons';
import { UserAvatar } from '../components/ui/UserAvatar';
import heroMascotUrl from '../assets/images/regenerated_image_1795533934834.jpg';

const RING_ACCENT: Record<string, string> = {
  'Physics 1': 'text-blue-600 dark:text-blue-400',
  'Physics 2': 'text-amber-500 dark:text-amber-400',
  'Physics 3': 'text-sky-600 dark:text-sky-400',
};

const RANK_MEDAL_COLORS = [
  'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  'bg-stone-200 text-stone-700 dark:bg-neutral-800 dark:text-neutral-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300',
];

const ProgressRing: React.FC<{ percent: number; colorClass: string }> = ({
  percent,
  colorClass,
}) => {
  const r = 18;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <div className="relative h-12 w-12 shrink-0 flex items-center justify-center">
      <svg className="h-12 w-12 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          className="text-stone-200 dark:text-neutral-800"
        />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${colorClass} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-700 dark:text-neutral-200 tabular-nums">
        {clamped}%
      </span>
    </div>
  );
};

export const HomePage: React.FC = () => {
  const { user, profile } = useAuth();
  const {
    studySets,
    dueTodayCount,
    notifications,
    unreadCount,
    openBellWithNotification,
  } = useNotifications();
  const navigate = useNavigate();

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [promptInput, setPromptInput] = useState('');

  useEffect(() => {
    if (!user) return;
    return subscribeLeaderboard(setLeaderboard);
  }, [user]);

  const latestUnread = useMemo(
    () => notifications.find((n) => n.unread) || null,
    [notifications]
  );

  const completedLessons = profile?.lessonsCompleted || [];
  const nextLesson = useMemo(() => {
    const done = new Set(completedLessons);
    return ALL_LESSONS.find((l) => !done.has(l.id)) || ALL_LESSONS[0];
  }, [completedLessons]);

  const todayKey = getLocalDateKey();
  const todaySeconds =
    profile?.todayStudyDate === todayKey ? profile.todayStudySeconds || 0 : 0;
  const todayMinutes = Math.round(todaySeconds / 60);
  const dailyGoalMinutes = profile?.dailyGoalMinutes || 15;
  const goalPct = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

  const displayName = profile?.nickname || profile?.username || 'Student';

  const topThree = useMemo(() => leaderboard.slice(0, 3), [leaderboard]);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = promptInput.trim();
    if (!q) {
      navigate('/ai');
      return;
    }
    navigate(`/ai?q=${encodeURIComponent(q)}`);
  };

  const recentSets = studySets.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Mascot Hero Prompt Section */}
      <section className="pt-2 pb-1 flex flex-col items-center text-center space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="animate-float-gentle h-18 w-18 rounded-3xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_2px_10px_rgba(15,23,42,0.05)] flex items-center justify-center shrink-0">
            <Logo size="lg" showText={false} src={heroMascotUrl} />
          </div>
          <div className="sm:text-left space-y-1">
            <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400">
              Kumusta, {displayName} · Grade 12 {profile?.course || 'Physics 1'} · Kaya mo &apos;yan!
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-neutral-100 text-balance">
              What shall we study?
            </h1>
          </div>
        </div>

        {/* Prompt Search / Ask AI Bar */}
        <form
          onSubmit={handlePromptSubmit}
          className="w-full max-w-2xl flex items-center gap-2"
        >
          <Link
            to="/study?tab=materials"
            aria-label="Upload new study material"
            title="Upload PDF, PPTX, DOCX, or photo"
            className="h-12 w-12 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 inline-flex items-center justify-center shrink-0 transition-colors"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
          </Link>

          <div className="relative flex-1">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Ask a Physics question (e.g., projectile motion, Bernoulli's principle)..."
              aria-label="Ask AI Physics Tutor a question"
              className="w-full h-12 pl-5 pr-12 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_3px_rgba(15,23,42,0.04)] text-base text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <button
              type="submit"
              aria-label="Ask Physics Question"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 inline-flex items-center justify-center transition-colors cursor-pointer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <Link
            to="/lessons"
            className="min-h-[44px] px-4 rounded-2xl bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs text-xs sm:text-sm font-semibold hover:-translate-y-0.5 active:scale-[0.97] inline-flex items-center gap-2 transition-[transform,background-color] duration-150 whitespace-nowrap shrink-0"
          >
            <LessonsGraphicIcon className="h-5 w-5" />
            <span>{ALL_LESSONS.length} Lessons</span>
          </Link>

          <Link
            to="/study?tab=materials"
            className="min-h-[44px] px-4 rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 hover:-translate-y-0.5 active:scale-[0.97] inline-flex items-center gap-2 transition-[transform,background-color,border-color] duration-150 whitespace-nowrap shrink-0"
          >
            <UploadGraphicIcon className="h-5 w-5" />
            <span>Upload File</span>
          </Link>

          <Link
            to="/study?tab=materials&mode=text"
            className="min-h-[44px] px-4 rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 hover:-translate-y-0.5 active:scale-[0.97] inline-flex items-center gap-2 transition-[transform,background-color,border-color] duration-150 whitespace-nowrap shrink-0"
          >
            <NotesGraphicIcon className="h-5 w-5" />
            <span>Paste Notes</span>
          </Link>

          <Link
            to="/visualizer"
            className="min-h-[44px] px-4 rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] text-xs sm:text-sm font-semibold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 hover:-translate-y-0.5 active:scale-[0.97] inline-flex items-center gap-2 transition-[transform,background-color,border-color] duration-150 whitespace-nowrap shrink-0"
          >
            <VisualizerGraphicIcon className="h-5 w-5" />
            <span>3D Visualizer</span>
          </Link>
        </div>
      </section>

      {/* Home Screen Unread Notification Banner -> Opens Notifications Tab */}
      {latestUnread && unreadCount > 0 && (
        <button
          type="button"
          onClick={() => {
            openBellWithNotification(latestUnread.id);
          }}
          className="w-full text-left rounded-2xl bg-white dark:bg-[#141416] border border-blue-200 dark:border-blue-900/70 p-3.5 sm:px-5 shadow-[0_2px_10px_rgba(37,99,235,0.06)] hover:border-blue-400 dark:hover:border-blue-700 hover:-translate-y-0.5 transition-[transform,border-color,box-shadow] duration-150 flex items-center justify-between gap-3 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-10 w-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5" aria-hidden="true" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                {unreadCount} New Notification{unreadCount === 1 ? '' : 's'} · Tap to view in Notifications
              </p>
              <p className="text-sm font-bold text-slate-900 dark:text-neutral-100 truncate">
                {latestUnread.title}
              </p>
              <p className="text-xs text-slate-600 dark:text-neutral-400 truncate">
                {latestUnread.message}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-700 text-white dark:bg-blue-600 text-xs font-semibold shrink-0">
            <span className="hidden sm:inline">View all</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </button>
      )}

      {/* Daily Goal + Streak + Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm" className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-neutral-400">
            <StreakGraphicIcon className="h-4.5 w-4.5" />
            <span>Study Streak</span>
          </div>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
            {profile?.streakDays ?? 0} day{(profile?.streakDays ?? 0) === 1 ? '' : 's'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-neutral-400">
            <span>Daily Goal</span>
            <span className="tabular-nums text-blue-700 dark:text-blue-400">
              {todayMinutes}/{dailyGoalMinutes}m
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400">
            {goalPct >= 100 ? 'Goal met today!' : `${Math.max(0, dailyGoalMinutes - todayMinutes)}m left today`}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Due Today</p>
          <p className="font-display text-2xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
            {dueTodayCount} card{dueTodayCount === 1 ? '' : 's'}
          </p>
        </Card>

        <Card padding="sm" className="space-y-1.5">
          <p className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Lessons &amp; XP</p>
          <p className="font-display text-2xl font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
            {completedLessons.length}/{ALL_LESSONS.length} · {profile?.xp ?? 0} XP
          </p>
        </Card>
      </div>

      {/* Continue Built-in Lesson Card */}
      {nextLesson && (
        <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-blue-200/80 dark:border-blue-900/70">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Continue Curriculum · {nextLesson.course}
            </p>
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-neutral-100 truncate">
              {nextLesson.code} {nextLesson.title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-neutral-400 line-clamp-1">
              {nextLesson.objective}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/lessons">
              <Button variant="outline" size="sm">
                All {ALL_LESSONS.length}
              </Button>
            </Link>
            <Link to={`/lessons/${nextLesson.id}`}>
              <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                Continue
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Jump Back In Study Sets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
            Jump back in
          </h2>
          <Link
            to="/study?tab=flashcards&view=sets"
            className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline"
          >
            View all sets
          </Link>
        </div>

        {recentSets.length === 0 ? (
          <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
                No personal study sets yet
              </p>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                Open any built-in lesson and tap &ldquo;Make Flashcards&rdquo;, or upload your own notes to generate SM-2 flashcards and quizzes.
              </p>
            </div>
            <Link to="/study?tab=materials" className="shrink-0">
              <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                Add Material
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentSets.map((set) => {
              const total = set.flashcards.length || 1;
              const now = Date.now();
              const masteredOrReviewed = set.flashcards.filter(
                (c) => (c.repetitions || 0) >= 1 || (c.nextReviewAt || 0) > now
              ).length;
              const pct = Math.round((masteredOrReviewed / total) * 100);
              const ringColor = RING_ACCENT[set.course] || 'text-blue-600';

              return (
                <Link
                  key={set.id}
                  to={`/study?tab=flashcards&setId=${encodeURIComponent(set.id)}`}
                  className="group rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] transition-[transform,box-shadow,border-color] duration-200 flex items-center gap-3.5"
                >
                  <ProgressRing percent={pct} colorClass={ringColor} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100 truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                      {set.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums truncate">
                      {set.course} · {set.flashcards.length} cards
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Daily Physics Challenge + Global Leadership Board Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <Card className="lg:col-span-2 flex flex-col justify-between gap-5">
          <div className="flex items-start gap-4">
            <UserAvatar
              name={displayName}
              avatarUrl={profile?.avatarUrl}
              size="lg"
              className="ring-4 ring-blue-50 dark:ring-neutral-800"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                <Target className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Daily Physics Challenge</span>
              </div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
                {dueTodayCount > 0
                  ? `${dueTodayCount} flashcard${dueTodayCount === 1 ? '' : 's'} waiting for SM-2 review today`
                  : studySets.length > 0
                  ? 'All due reviews done — launch a Physics quiz or calm Pomodoro block'
                  : 'Generate flashcards from any lesson or uploaded notes to start'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                Honest spaced repetition with Again / Hard / Good / Easy intervals keeps formulas fresh for quizzes.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link to={studySets.length > 0 ? '/study?tab=flashcards' : '/lessons'}>
              <Button icon={<Layers className="h-4 w-4" />}>
                {dueTodayCount > 0
                  ? 'Review Due Cards'
                  : studySets.length > 0
                  ? 'Practice Flashcards'
                  : 'Open Lessons'}
              </Button>
            </Link>
            {studySets.length > 0 && (
              <Link to="/study?tab=quiz">
                <Button variant="outline">Quick Quiz</Button>
              </Link>
            )}
            <Link to="/study?tab=timer">
              <Button variant="ghost" icon={<Clock className="h-4 w-4" />}>
                Focus Timer
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrophyGraphicIcon className="h-5 w-5 shrink-0" />
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-neutral-100">
                Global Leadership Board
              </h2>
            </div>
            <Link
              to="/study?tab=progress"
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline shrink-0"
            >
              View all
            </Link>
          </div>

          {topThree.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-neutral-400 py-4">
              No XP logged yet. Review cards, complete a lesson, or take a quiz to earn XP!
            </p>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-neutral-800/80">
              {topThree.map((entry, idx) => {
                const isSelf = entry.uid === user?.uid;
                return (
                  <div
                    key={entry.uid}
                    className="py-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`h-6 w-6 rounded-full text-[11px] font-bold inline-flex items-center justify-center shrink-0 tabular-nums ${
                          RANK_MEDAL_COLORS[idx] || RANK_MEDAL_COLORS[2]
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <UserAvatar
                        name={entry.nickname}
                        avatarUrl={entry.avatarUrl}
                        size="xs"
                        tone={isSelf ? 'primary' : 'neutral'}
                      />
                      <span className="text-sm font-bold text-slate-900 dark:text-neutral-100 truncate">
                        {entry.nickname}
                        {isSelf && (
                          <span className="ml-1 text-xs font-semibold text-blue-700 dark:text-blue-400">
                            (You)
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-xs font-bold tabular-nums shrink-0">
                      {entry.xp.toLocaleString()} XP
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-neutral-400">
            Usernames &amp; XP only · RA 10173 compliant
          </p>
        </Card>
      </div>
    </div>
  );
};

export default HomePage;
