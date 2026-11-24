import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { saveQuizAttempt } from '../../lib/studyService';
import type { QuizQuestion, StudySet } from '../../types';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Select } from '../ui/Input';
import { MathInline } from '../ui/MathText';

interface QuizTabProps {
  studySets: StudySet[];
  selectedSetId: string | null;
  onSelectSet: (id: string) => void;
  onGoToMaterials: () => void;
}

function normalizeAnswer(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\.0+(?=\s|$)/g, '')
    .replace(/,/g, '');
}

function isShortAnswerCorrect(userAnswer: string, q: QuizQuestion): boolean {
  const normUser = normalizeAnswer(userAnswer);
  if (!normUser) return false;
  const candidates =
    q.acceptableAnswers && q.acceptableAnswers.length > 0
      ? q.acceptableAnswers
      : [q.choices[q.correctIndex] || ''];

  return candidates.some((cand) => {
    const normCand = normalizeAnswer(cand);
    if (!normCand) return false;
    if (normUser === normCand) return true;
    const userNum = parseFloat(normUser);
    const candNum = parseFloat(normCand);
    if (
      !Number.isNaN(userNum) &&
      !Number.isNaN(candNum) &&
      String(userNum) === normUser.replace(/[^0-9.-]/g, '') &&
      Math.abs(userNum - candNum) <= Math.max(0.05, Math.abs(candNum) * 0.02)
    ) {
      return true;
    }
    return false;
  });
}

function isQuestionCorrect(
  q: QuizQuestion,
  choiceAnswers: Record<string, number>,
  textAnswers: Record<string, string>
): boolean {
  const kind = q.type || 'mcq';
  if (kind === 'short_answer') {
    return isShortAnswerCorrect(textAnswers[q.id] || '', q);
  }
  return choiceAnswers[q.id] === q.correctIndex;
}

function isQuestionAnswered(
  q: QuizQuestion,
  choiceAnswers: Record<string, number>,
  textAnswers: Record<string, string>
): boolean {
  const kind = q.type || 'mcq';
  if (kind === 'short_answer') {
    return Boolean((textAnswers[q.id] || '').trim());
  }
  return choiceAnswers[q.id] !== undefined;
}

export const QuizTab: React.FC<QuizTabProps> = ({
  studySets,
  selectedSetId,
  onSelectSet,
  onGoToMaterials,
}) => {
  const { user, awardXp, toggleChecklistItem } = useAuth();
  const activeSet = studySets.find((s) => s.id === selectedSetId) || studySets[0] || null;

  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, number>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastXp, setLastXp] = useState(0);

  useEffect(() => {
    setChoiceAnswers({});
    setTextAnswers({});
    setSubmitted(false);
    setLastXp(0);
  }, [activeSet?.id]);

  if (!activeSet) {
    return (
      <Card className="text-center py-10 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
          No Quizzes available yet
        </h2>
        <p className="text-base text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
          Generate a Study Set from a built-in lesson or uploaded material first to unlock its mixed Physics quiz.
        </p>
        <div>
          <Button onClick={onGoToMaterials}>Go to Materials</Button>
        </div>
      </Card>
    );
  }

  const questions = activeSet.quizQuestions;
  const answeredCount = questions.filter((q) =>
    isQuestionAnswered(q, choiceAnswers, textAnswers)
  ).length;
  const score = questions.reduce(
    (acc, q) => (isQuestionCorrect(q, choiceAnswers, textAnswers) ? acc + 1 : acc),
    0
  );
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  const handleSubmitQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || questions.length === 0) return;
    setSaving(true);
    try {
      const xpEarned = score * 10 + 15;
      await saveQuizAttempt({
        userId: user.uid,
        studySetId: activeSet.id,
        studySetTitle: activeSet.title,
        course: activeSet.course,
        score,
        totalQuestions: questions.length,
        xpEarned,
      });
      await awardXp(xpEarned);
      void toggleChecklistItem('take_quiz', true);
      setLastXp(xpEarned);
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setChoiceAnswers({});
    setTextAnswers({});
    setSubmitted(false);
    setLastXp(0);
  };

  return (
    <div className="space-y-6">
      <Card className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Select
            label="Quiz Study Set"
            value={activeSet.id}
            onChange={(e) => onSelectSet(e.target.value)}
          >
            {studySets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.title} ({set.course})
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 tabular-nums">
          {questions.length} mixed questions · {answeredCount} answered
        </p>
      </Card>

      {submitted && (
        <AlertBanner
          tone={percentage >= 70 ? 'success' : 'info'}
          title={`Score: ${score} / ${questions.length} (${percentage}%) · +${lastXp} XP earned`}
        >
          {percentage >= 70
            ? 'Magaling! Review every explanation below to lock in the formulas.'
            : 'Kaya mo \'yan! Check the step-by-step solutions below and try again.'}
        </AlertBanner>
      )}

      <form onSubmit={handleSubmitQuiz} className="space-y-4">
        {questions.map((q, idx) => {
          const kind = q.type || 'mcq';
          const isCorrect = isQuestionCorrect(q, choiceAnswers, textAnswers);
          const expectedDisplay =
            q.acceptableAnswers?.[0] || q.choices?.[q.correctIndex] || '';

          return (
            <Card key={q.id} className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                    {kind === 'true_false'
                      ? 'True or False'
                      : kind === 'short_answer'
                      ? 'Short Answer'
                      : 'Multiple Choice'}
                  </span>
                  <p className="text-base font-bold text-slate-900 dark:text-neutral-100 leading-relaxed">
                    {idx + 1}. <MathInline text={q.question} />
                  </p>
                </div>

                {submitted && (
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                      isCorrect
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        <span>Correct</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        <span>Incorrect</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              {kind === 'short_answer' ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    disabled={submitted}
                    value={textAnswers[q.id] || ''}
                    onChange={(e) =>
                      setTextAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Type your answer (include SI units if numerical)..."
                    aria-label={`Answer for question ${idx + 1}`}
                    className={`w-full min-h-[46px] rounded-xl border px-4 py-2.5 text-base text-slate-900 dark:text-neutral-100 bg-white dark:bg-neutral-950 focus:outline-none focus:ring-2 focus:ring-blue-600 ${
                      submitted
                        ? isCorrect
                          ? 'border-emerald-600 bg-emerald-50/40 dark:bg-emerald-950/30'
                          : 'border-red-500 bg-red-50/40 dark:bg-red-950/30'
                        : 'border-stone-300 dark:border-neutral-700'
                    }`}
                  />
                  {submitted && !isCorrect && expectedDisplay && (
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      Expected answer: <MathInline text={expectedDisplay} />
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className={
                    kind === 'true_false'
                      ? 'grid grid-cols-2 gap-2.5'
                      : 'grid grid-cols-1 gap-2'
                  }
                >
                  {(kind === 'true_false' && (!q.choices || q.choices.length < 2)
                    ? ['True', 'False']
                    : q.choices
                  ).map((choice, cIdx) => {
                    const picked = choiceAnswers[q.id];
                    const isSelected = picked === cIdx;
                    const isAnswer = cIdx === q.correctIndex;

                    let borderStyle =
                      'border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-blue-600 dark:hover:border-blue-500';

                    if (!submitted && isSelected) {
                      borderStyle =
                        'border-blue-700 dark:border-blue-500 bg-blue-50/70 dark:bg-blue-950/40';
                    } else if (submitted && isAnswer) {
                      borderStyle =
                        'border-emerald-600 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40';
                    } else if (submitted && isSelected && !isAnswer) {
                      borderStyle =
                        'border-red-600 dark:border-red-500 bg-red-50 dark:bg-red-950/40';
                    }

                    const letter = String.fromCharCode(65 + cIdx);
                    return (
                      <button
                        key={cIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() =>
                          setChoiceAnswers((prev) => ({ ...prev, [q.id]: cIdx }))
                        }
                        className={`w-full min-h-[46px] text-left px-4 py-3 rounded-xl border text-sm sm:text-base font-medium transition-colors flex items-center justify-between gap-3 cursor-pointer disabled:cursor-default ${borderStyle}`}
                      >
                        <span className="text-slate-900 dark:text-neutral-100">
                          {kind !== 'true_false' && (
                            <span className="font-bold mr-2">{letter}.</span>
                          )}
                          <MathInline text={choice} />
                        </span>
                        {submitted && isAnswer && (
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 shrink-0">
                            Correct
                          </span>
                        )}
                        {submitted && isSelected && !isAnswer && (
                          <span className="text-xs font-semibold text-red-700 dark:text-red-400 shrink-0">
                            Your Choice
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {submitted && (
                <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800 p-3.5 text-sm sm:text-base text-slate-700 dark:text-neutral-300 leading-relaxed font-lesson">
                  <span className="font-sans font-semibold text-slate-900 dark:text-neutral-100">
                    Explanation:{' '}
                  </span>
                  <MathInline text={q.explanation} />
                </div>
              )}
            </Card>
          );
        })}

        <div className="flex flex-wrap items-center gap-3">
          {!submitted ? (
            <Button
              type="submit"
              size="lg"
              loading={saving}
              disabled={answeredCount < questions.length}
            >
              {answeredCount < questions.length
                ? `Answer all questions (${answeredCount}/${questions.length})`
                : 'Submit Quiz'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="lg"
              icon={<RotateCcw className="h-4 w-4" />}
              onClick={handleRetake}
            >
              Retake Quiz
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
