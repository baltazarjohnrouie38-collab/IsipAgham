import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Square,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import type { ChecklistKey } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PWAInstallButton } from '../components/ui/PWAInstallButton';

interface ChecklistDefinition {
  key: ChecklistKey;
  title: string;
  description: string;
  actionTo: string;
  actionLabel: string;
}

const CHECKLIST_ITEMS: ChecklistDefinition[] = [
  {
    key: 'upload_material',
    title: '1. Upload or load a Study Material',
    description:
      'Upload a PDF, PowerPoint (.pptx), Word (.docx), photo of notes, or paste Physics text in Study Hub.',
    actionTo: '/study?tab=materials',
    actionLabel: 'Go to Materials',
  },
  {
    key: 'generate_flashcards',
    title: '2. Generate automatic flashcards & reviewer',
    description:
      'Use any Study Material to create Q&A flashcards, a short reviewer summary, and practice quiz questions.',
    actionTo: '/study?tab=materials',
    actionLabel: 'Generate Set',
  },
  {
    key: 'take_quiz',
    title: '3. Take a Physics quiz',
    description:
      'Answer a multiple-choice quiz, submit, and review explanations with formulas and SI units.',
    actionTo: '/study?tab=quiz',
    actionLabel: 'Open Quizzes',
  },
  {
    key: 'use_timer_sr',
    title: '4. Use the Pomodoro timer & spaced repetition',
    description:
      'Complete or run a study timer session and review due flashcards in Leitner spaced repetition.',
    actionTo: '/study?tab=timer',
    actionLabel: 'Open Timer',
  },
  {
    key: 'ask_ai_three',
    title: '5. Ask the AI Physics Tutor three questions',
    description:
      'Ask at least 3 Physics 1–3 questions (avoid typing personal details) and verify answers with your teacher.',
    actionTo: '/ai',
    actionLabel: 'Open AI Tutor',
  },
  {
    key: 'open_3d_all_courses',
    title: '6. Open a 3D scene from Physics 1, 2, and 3',
    description:
      'Explore at least one interactive 3D simulation in each of Physics 1, Physics 2, and Physics 3.',
    actionTo: '/visualizer',
    actionLabel: 'Open Visualizer',
  },
  {
    key: 'try_tts_darkmode',
    title: '7. Try Text-to-Speech and Dark Mode',
    description:
      'Listen to a reviewer or flashcard read aloud using Web Speech, and test the Dark Mode toggle.',
    actionTo: '/study?tab=flashcards',
    actionLabel: 'Open Flashcards',
  },
  {
    key: 'enable_notifications',
    title: '8. Turn on study reminder notifications',
    description:
      'Set your preferred daily reminder time for due flashcard reviews in Profile & Settings.',
    actionTo: '/profile',
    actionLabel: 'Reminder Settings',
  },
  {
    key: 'check_dashboard_leaderboard',
    title: '9. Check Progress Dashboard & Global Leadership Board',
    description:
      'View your study time, cards reviewed, quiz score history, XP, and global nickname ranking.',
    actionTo: '/study?tab=progress',
    actionLabel: 'View Dashboard',
  },
  {
    key: 'add_home_screen',
    title: '10. Add IsipAgham to your phone home screen',
    description:
      'Install IsipAgham via your browser’s Add to Home Screen / Install prompt for quick access.',
    actionTo: '/profile',
    actionLabel: 'App Settings',
  },
];

export const ChecklistPage: React.FC = () => {
  const { profile, toggleChecklistItem } = useAuth();
  const { isInstalled } = usePWAInstall();

  useEffect(() => {
    if (isInstalled && profile && !profile.checklist?.add_home_screen) {
      void toggleChecklistItem('add_home_screen', true);
    }
  }, [isInstalled, profile, toggleChecklistItem]);

  const checklistMap = profile?.checklist || {};
  const completedCount = CHECKLIST_ITEMS.filter((item) => Boolean(checklistMap[item.key])).length;
  const pct = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  const getProgressDetail = (key: ChecklistKey): string | null => {
    if (key === 'ask_ai_three') {
      return `Progress: ${Math.min(3, profile?.aiQuestionsAsked ?? 0)} / 3 questions`;
    }
    if (key === 'open_3d_all_courses') {
      const visited = profile?.visitedCourses || [];
      return visited.length > 0
        ? `Visited: ${visited.join(', ')} (${visited.length}/3)`
        : 'Visited: 0 / 3 courses';
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Week Checklist"
        subtitle="Track your weekly Physics study habits and explore IsipAgham’s learning tools"
        action={
          <div className="text-sm font-bold text-blue-700 dark:text-blue-400 tabular-nums">
            {completedCount} / {CHECKLIST_ITEMS.length} completed ({pct}%)
          </div>
        }
      />

      {/* Overall Progress Bar */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck
              className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-base font-bold text-slate-900 dark:text-neutral-100">
              Weekly Progress
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-600 dark:text-neutral-400 tabular-nums">
            {completedCount} of {CHECKLIST_ITEMS.length} tasks done
          </span>
        </div>

        <div className="w-full h-3 rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 dark:text-neutral-400">
          Many tasks check off automatically as you study. You can also tap any task below to tick or untick it manually; your progress is saved to your account.
        </p>
      </Card>

      {/* Checklist Items */}
      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => {
          const checked = Boolean(checklistMap[item.key]);
          const detail = getProgressDetail(item.key);
          return (
            <Card
              key={item.key}
              padding="sm"
              className={`transition-colors ${
                checked
                  ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                  : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    void toggleChecklistItem(item.key);
                  }}
                  aria-pressed={checked}
                  className="flex items-start gap-3 text-left flex-1 min-w-0 min-h-[44px] py-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded-lg"
                >
                  {checked ? (
                    <CheckSquare
                      className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  ) : (
                    <Square
                      className="h-5 w-5 text-slate-400 dark:text-neutral-500 shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                  )}
                  <div className="space-y-1 min-w-0">
                    <p
                      className={`text-sm font-bold ${
                        checked
                          ? 'text-slate-600 dark:text-neutral-400 line-through'
                          : 'text-slate-900 dark:text-neutral-100'
                      }`}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                      {item.description}
                    </p>
                    {detail && (
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                        {detail}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-2 pl-8 sm:pl-0 shrink-0">
                  {item.key === 'add_home_screen' && <PWAInstallButton compact />}
                  <Link to={item.actionTo}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                    >
                      {item.actionLabel}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ChecklistPage;
