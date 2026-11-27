import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Bot,
  Box,
  CheckCircle2,
  ClipboardList,
  Globe2,
  Layers,
  Square,
  Volume2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  buildLessonStudyText,
  getLessonById,
  getNextLesson,
} from '../data/lessons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSpeech } from '../hooks/useSpeech';
import { generateStudySetApi } from '../lib/api';
import { playUiSound } from '../lib/sound';
import { saveStudySet, subscribeStudySets } from '../lib/studyService';
import type { StudySet } from '../types';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { MathInline, MathText } from '../components/ui/MathText';

export const LessonDetailPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user, profile, toggleLessonCompleted, toggleChecklistItem } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const {
    supported: ttsSupported,
    speaking,
    loading: ttsLoading,
    speechError,
    speak,
    stop,
  } = useSpeech();

  const lesson = getLessonById(lessonId);
  const nextLesson = lesson ? getNextLesson(lesson.id) : undefined;

  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [selectedChoices, setSelectedChoices] = useState<Record<number, number>>({});
  const [revealedChecks, setRevealedChecks] = useState<Record<number, boolean>>({});
  const [generatingAction, setGeneratingAction] = useState<'flashcards' | 'quiz' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeStudySets(user.uid, setStudySets);
  }, [user]);

  useEffect(() => {
    setSelectedChoices({});
    setRevealedChecks({});
    setActionError(null);
    stop();
  }, [lessonId]);

  const existingLessonSet = useMemo(
    () => (lesson ? studySets.find((s) => s.lessonId === lesson.id) : undefined),
    [studySets, lesson]
  );

  if (!lesson) {
    return (
      <Card className="text-center py-12 space-y-4">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-neutral-100">
          Lesson not found
        </h1>
        <p className="text-base text-slate-600 dark:text-neutral-400">
          Choose any lesson from Physics 1, Physics 2, or Physics 3 to begin studying.
        </p>
        <div>
          <Link to="/lessons">
            <Button icon={<ArrowLeft className="h-4 w-4" />}>Back to All Lessons</Button>
          </Link>
        </div>
      </Card>
    );
  }

  const isCompleted = (profile?.lessonsCompleted || []).includes(lesson.id);

  const handleOpenOrGenerateSet = async (targetTab: 'flashcards' | 'quiz') => {
    if (!user) return;
    setActionError(null);

    if (existingLessonSet) {
      navigate(`/study?tab=${targetTab}&setId=${encodeURIComponent(existingLessonSet.id)}`);
      return;
    }

    if (!isOnline) {
      setActionError('You are offline. Reconnect to generate flashcards and quiz questions from this lesson.');
      return;
    }

    setGeneratingAction(targetTab);
    try {
      const lessonText = buildLessonStudyText(lesson);
      const generated = await generateStudySetApi({
        title: `${lesson.code} ${lesson.title}`,
        course: lesson.course,
        extractedText: lessonText,
        focus: targetTab === 'quiz' ? 'quiz' : 'flashcards',
      });

      const setId = await saveStudySet({
        userId: user.uid,
        materialId: `lesson_${lesson.id}`,
        lessonId: lesson.id,
        title: `${lesson.code} ${lesson.title}`,
        course: lesson.course,
        reviewerSummary: generated.reviewerSummary,
        flashcards: generated.flashcards,
        quizQuestions: generated.quizQuestions,
      });

      void toggleChecklistItem('generate_flashcards', true);
      navigate(`/study?tab=${targetTab}&setId=${encodeURIComponent(setId)}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not generate study set.');
    } finally {
      setGeneratingAction(null);
    }
  };

  const handleListenLesson = () => {
    if (speaking || ttsLoading) {
      stop();
      return;
    }
    const defsSpeech = lesson.keyTerms?.length
      ? ` Key Definitions: ${lesson.keyTerms.map((t) => `${t.term}: ${t.definition}`).join('. ')}.`
      : '';
    const realWorldSpeech = lesson.realWorldExamples?.length
      ? ` Real-World Examples: ${lesson.realWorldExamples.join('. ')}.`
      : '';
    const cleanSpeech = `${lesson.code} ${lesson.title}. Objective: ${lesson.objective}. ${lesson.explanation}${defsSpeech}${realWorldSpeech}`;
    speak(cleanSpeech);
    void toggleChecklistItem('try_tts_darkmode', true);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Breadcrumb + Completion Action */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/lessons"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline min-h-[40px]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>All Lessons</span>
        </Link>

        <Button
          variant={isCompleted ? 'secondary' : 'outline'}
          size="sm"
          data-sound="none"
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => {
            playUiSound(isCompleted ? 'click' : 'celebrate');
            void toggleLessonCompleted(lesson.id);
          }}
        >
          {isCompleted ? 'Completed (+15 XP)' : 'Mark Complete (+15 XP)'}
        </Button>
      </div>

      {/* Header & Objective */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
          <span>{lesson.course}</span>
          <span>·</span>
          <span>Lesson {lesson.code}</span>
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-neutral-100">
          {lesson.code} {lesson.title}
        </h1>

        <div className="rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">
            Learning Objective
          </p>
          <p className="text-base text-slate-800 dark:text-neutral-200 leading-relaxed">
            {lesson.objective}
          </p>
          <div className="pt-1 text-base text-blue-900 dark:text-blue-200 font-medium overflow-x-auto no-scrollbar max-w-full">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mr-2">
              Key Formula:
            </span>
            <MathInline text={lesson.keyFormula} />
          </div>
        </div>
      </header>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          loading={generatingAction === 'flashcards'}
          disabled={generatingAction !== null && generatingAction !== 'flashcards'}
          icon={<Layers className="h-4 w-4" />}
          onClick={() => {
            void handleOpenOrGenerateSet('flashcards');
          }}
        >
          {existingLessonSet ? 'Open Flashcards' : 'Make Flashcards'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          loading={generatingAction === 'quiz'}
          disabled={generatingAction !== null && generatingAction !== 'quiz'}
          icon={<ClipboardList className="h-4 w-4" />}
          onClick={() => {
            void handleOpenOrGenerateSet('quiz');
          }}
        >
          {existingLessonSet ? 'Quiz Me' : 'Generate & Quiz Me'}
        </Button>

        <Link to={`/ai?lessonId=${encodeURIComponent(lesson.id)}`}>
          <Button variant="outline" size="sm" icon={<Bot className="h-4 w-4" />}>
            Ask the AI
          </Button>
        </Link>

        {lesson.suggestedSceneId && (
          <Link to={`/visualizer?scene=${encodeURIComponent(lesson.suggestedSceneId)}`}>
            <Button variant="outline" size="sm" icon={<Box className="h-4 w-4" />}>
              3D Lab
            </Button>
          </Link>
        )}

        {ttsSupported && (
          <Button
            variant={speaking || ttsLoading ? 'danger' : 'ghost'}
            size="sm"
            loading={ttsLoading}
            icon={speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            onClick={handleListenLesson}
          >
            {ttsLoading ? 'Preparing Voice...' : speaking ? 'Stop Reading' : 'Listen'}
          </Button>
        )}
      </div>

      {actionError && (
        <AlertBanner tone="error" title="Could not open study set">
          {actionError}
        </AlertBanner>
      )}
      {speechError && (
        <AlertBanner tone="warning" title="Voice Notice">
          {speechError}
        </AlertBanner>
      )}

      {/* Clear Explanation (Humanist Serif >= 16px) */}
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-950 dark:text-neutral-100">
          Concept Explanation &amp; All You Need to Know
        </h2>
        <MathText
          text={lesson.explanation}
          className="font-lesson text-base sm:text-[17px] text-slate-800 dark:text-neutral-200 leading-[1.75]"
        />
      </Card>

      {/* Key Definitions & Terms */}
      {lesson.keyTerms && lesson.keyTerms.length > 0 && (
        <Card className="space-y-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-neutral-100">
              Key Definitions &amp; Terms
            </h2>
          </div>
          <dl className="divide-y divide-stone-200/80 dark:divide-neutral-800">
            {lesson.keyTerms.map((item, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <dt className="text-sm sm:text-base font-bold text-slate-950 dark:text-neutral-100">
                  <MathInline text={item.term} />
                </dt>
                <dd className="font-lesson text-base text-slate-700 dark:text-neutral-300 leading-relaxed">
                  <MathInline text={item.definition} />
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* Real-World Explanations & Everyday Examples */}
      {lesson.realWorldExamples && lesson.realWorldExamples.length > 0 && (
        <Card className="space-y-4 border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/25 dark:bg-emerald-950/10">
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-emerald-700 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-slate-950 dark:text-neutral-100">
              Real-World Explanations &amp; Applications
            </h2>
          </div>
          <ul className="space-y-3">
            {lesson.realWorldExamples.map((example, idx) => (
              <li
                key={idx}
                className="flex items-start gap-3 font-lesson text-base text-slate-800 dark:text-neutral-200 leading-relaxed"
              >
                <span className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <MathInline text={example} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Worked Example */}
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-950 dark:text-neutral-100">
          Worked Example
        </h2>
        <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800 p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
            Problem
          </p>
          <MathText
            text={lesson.workedExample.problem}
            className="font-lesson text-base text-slate-900 dark:text-neutral-100 leading-relaxed"
          />
        </div>

        <ol className="space-y-2.5 pl-1">
          {lesson.workedExample.solutionSteps.map((step, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-base text-slate-800 dark:text-neutral-200 leading-relaxed"
            >
              <span className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1 font-lesson">
                <MathInline text={step} />
              </div>
            </li>
          ))}
        </ol>

        <div className="rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 p-3.5 text-base font-semibold text-emerald-900 dark:text-emerald-200">
          Final Answer: <MathInline text={lesson.workedExample.finalAnswer} />
        </div>
      </Card>

      {/* 2 Quick Check Questions */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-950 dark:text-neutral-100">
            Quick Check Questions
          </h2>
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            Test your understanding before moving on. Kaya mo &apos;yan!
          </p>
        </div>

        <div className="space-y-6">
          {lesson.checkQuestions.map((cq, qIdx) => {
            const picked = selectedChoices[qIdx];
            const revealed = Boolean(revealedChecks[qIdx]);
            const isRight = picked === cq.correctIndex;

            return (
              <div key={qIdx} className="space-y-3 pt-2 border-t border-stone-200/80 dark:border-neutral-800 first:border-t-0 first:pt-0">
                <p className="text-base font-semibold text-slate-900 dark:text-neutral-100 leading-relaxed">
                  {qIdx + 1}. <MathInline text={cq.prompt} />
                </p>

                <div className="grid grid-cols-1 gap-2">
                  {cq.choices.map((choice, cIdx) => {
                    const isSelected = picked === cIdx;
                    const isAnswer = cIdx === cq.correctIndex;

                    let style =
                      'border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-blue-600';
                    if (revealed && isAnswer) {
                      style =
                        'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-500';
                    } else if (revealed && isSelected && !isAnswer) {
                      style =
                        'border-red-500 bg-red-50 dark:bg-red-950/40 dark:border-red-500';
                    } else if (!revealed && isSelected) {
                      style =
                        'border-blue-700 bg-blue-50/70 dark:bg-blue-950/40 dark:border-blue-500';
                    }

                    return (
                      <button
                        key={cIdx}
                        type="button"
                        data-sound="none"
                        onClick={() => {
                          playUiSound(cIdx === cq.correctIndex ? 'correct' : 'wrong');
                          setSelectedChoices((prev) => ({ ...prev, [qIdx]: cIdx }));
                          setRevealedChecks((prev) => ({ ...prev, [qIdx]: true }));
                        }}
                        className={`w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl border text-sm sm:text-base font-medium transition-colors flex items-center justify-between gap-2 cursor-pointer ${style}`}
                      >
                        <span>
                          <span className="font-bold mr-2">{String.fromCharCode(65 + cIdx)}.</span>
                          <MathInline text={choice} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {revealed && (
                  <div
                    className={`rounded-xl p-3 text-sm leading-relaxed ${
                      isRight
                        ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200'
                    }`}
                  >
                    <span className="font-bold">
                      {isRight ? 'Correct! ' : 'Good try — '}
                    </span>
                    <MathInline text={cq.explanation} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Bottom Lesson Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        <Button
          variant={isCompleted ? 'outline' : 'secondary'}
          data-sound="none"
          className="w-full sm:w-auto"
          icon={<CheckCircle2 className="h-4 w-4" />}
          onClick={() => {
            playUiSound(isCompleted ? 'click' : 'celebrate');
            void toggleLessonCompleted(lesson.id);
          }}
        >
          {isCompleted ? 'Completed' : 'Mark Lesson Complete (+15 XP)'}
        </Button>

        {nextLesson ? (
          <Link
            to={`/lessons/${nextLesson.id}`}
            className="w-full sm:w-auto"
            onClick={() => {
              if (!isCompleted) {
                void toggleLessonCompleted(lesson.id, true);
              }
            }}
          >
            <Button fullWidth icon={<ArrowRight className="h-4 w-4" />}>
              Next Lesson: {nextLesson.code}
            </Button>
          </Link>
        ) : (
          <Link to="/lessons" className="w-full sm:w-auto">
            <Button fullWidth icon={<ArrowLeft className="h-4 w-4" />}>
              Back to Curriculum
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default LessonDetailPage;
