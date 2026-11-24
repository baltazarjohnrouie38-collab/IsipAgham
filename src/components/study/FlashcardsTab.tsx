import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  RotateCw,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useSpeech } from '../../hooks/useSpeech';
import {
  computeNextSM2Review,
  deleteStudySet,
  formatSM2IntervalLabel,
  renameStudySet,
  saveStudySession,
  updateStudySetFlashcards,
} from '../../lib/studyService';
import type { FlashcardItem, SM2Rating, StudySet } from '../../types';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select, Textarea } from '../ui/Input';
import { MathText } from '../ui/MathText';

interface FlashcardsTabProps {
  studySets: StudySet[];
  selectedSetId: string | null;
  onSelectSet: (id: string) => void;
  onGoToMaterials: () => void;
  onStartQuiz: (setId: string) => void;
}

interface CrossDeckCard {
  setId: string;
  setTitle: string;
  course: string;
  card: FlashcardItem;
}

const COURSE_BANNER: Record<string, string> = {
  'Physics 1': 'bg-blue-700',
  'Physics 2': 'bg-amber-600',
  'Physics 3': 'bg-sky-600',
};

const SM2_BUTTONS: Array<{
  rating: SM2Rating;
  label: string;
  xp: number;
  style: string;
}> = [
  {
    rating: 'again',
    label: 'Again',
    xp: 2,
    style:
      'border-red-300 text-red-700 bg-red-50/70 hover:bg-red-100 dark:border-red-900 dark:text-red-300 dark:bg-red-950/40 dark:hover:bg-red-950/70',
  },
  {
    rating: 'hard',
    label: 'Hard',
    xp: 4,
    style:
      'border-amber-300 text-amber-800 bg-amber-50/70 hover:bg-amber-100 dark:border-amber-900 dark:text-amber-300 dark:bg-amber-950/40 dark:hover:bg-amber-950/70',
  },
  {
    rating: 'good',
    label: 'Good',
    xp: 5,
    style:
      'border-blue-600 text-white bg-blue-700 hover:bg-blue-800 dark:border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
  },
  {
    rating: 'easy',
    label: 'Easy',
    xp: 6,
    style:
      'border-emerald-300 text-emerald-800 bg-emerald-50/80 hover:bg-emerald-100 dark:border-emerald-900 dark:text-emerald-300 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70',
  },
];

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  studySets,
  selectedSetId,
  onSelectSet,
  onGoToMaterials,
  onStartQuiz,
}) => {
  const { user, awardXp, toggleChecklistItem } = useAuth();
  const { supported: ttsSupported, speaking, rate, setRate, speak, stop } = useSpeech();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'flashcards' | 'reviewer' | 'sets'>(
    searchParams.get('view') === 'sets' ? 'sets' : 'flashcards'
  );
  const [reviewAllDueMode, setReviewAllDueMode] = useState(false);

  useEffect(() => {
    if (searchParams.get('view') === 'sets') {
      setReviewAllDueMode(false);
      setViewMode('sets');
    }
  }, [searchParams]);

  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dueOnlyInSet, setDueOnlyInSet] = useState(false);
  const [showAllSets, setShowAllSets] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Set rename state
  const [renamingSet, setRenamingSet] = useState(false);
  const [setTitleDraft, setSetTitleDraft] = useState('');

  // Card add / edit state
  const [editingCardMode, setEditingCardMode] = useState<'none' | 'add' | 'edit'>('none');
  const [cardFrontDraft, setCardFrontDraft] = useState('');
  const [cardBackDraft, setCardBackDraft] = useState('');

  const activeSet = studySets.find((s) => s.id === selectedSetId) || studySets[0] || null;

  const endOfTodayMs = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  }, []);

  const allDueTodayCards: CrossDeckCard[] = useMemo(() => {
    const list: CrossDeckCard[] = [];
    for (const set of studySets) {
      for (const card of set.flashcards) {
        if (card.nextReviewAt <= endOfTodayMs) {
          list.push({
            setId: set.id,
            setTitle: set.title,
            course: set.course,
            card,
          });
        }
      }
    }
    return list;
  }, [studySets, endOfTodayMs]);

  useEffect(() => {
    setCardIndex(0);
    setFlipped(false);
    setFeedback(null);
    setRenamingSet(false);
    setEditingCardMode('none');
    stop();
  }, [activeSet?.id, dueOnlyInSet, reviewAllDueMode]);

  if (!activeSet) {
    return (
      <Card className="text-center py-10 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
          No Saved Study Sets yet
        </h2>
        <p className="text-base text-slate-600 dark:text-neutral-400 max-w-md mx-auto">
          Open any built-in lesson or upload a Physics material first to create flashcards and quizzes.
        </p>
        <div>
          <Button onClick={onGoToMaterials}>Go to Materials</Button>
        </div>
      </Card>
    );
  }

  const visibleCrossCards: CrossDeckCard[] = reviewAllDueMode
    ? allDueTodayCards
    : (dueOnlyInSet
        ? activeSet.flashcards.filter((c) => c.nextReviewAt <= endOfTodayMs)
        : activeSet.flashcards
      ).map((card) => ({
        setId: activeSet.id,
        setTitle: activeSet.title,
        course: activeSet.course,
        card,
      }));

  const safeIndex =
    visibleCrossCards.length > 0 ? Math.min(cardIndex, visibleCrossCards.length - 1) : 0;
  const activeItem = visibleCrossCards[safeIndex];
  const dueInActiveSet = activeSet.flashcards.filter((c) => c.nextReviewAt <= endOfTodayMs).length;

  const handleListen = (text: string) => {
    if (speaking) {
      stop();
      return;
    }
    speak(text.replace(/\$+/g, ''));
    void toggleChecklistItem('try_tts_darkmode', true);
  };

  const handleRateCard = async (rating: SM2Rating) => {
    if (!user || !activeItem) return;
    const targetSet = studySets.find((s) => s.id === activeItem.setId);
    if (!targetSet) return;

    const btnMeta = SM2_BUTTONS.find((b) => b.rating === rating)!;
    const labelStr = formatSM2IntervalLabel(activeItem.card, rating);

    setSavingCard(true);
    setFeedback(null);
    stop();
    try {
      const sm2 = computeNextSM2Review(activeItem.card, rating);
      const updated = targetSet.flashcards.map((c) =>
        c.id === activeItem.card.id
          ? {
              ...c,
              box: sm2.nextBox,
              easeFactor: sm2.easeFactor,
              intervalDays: sm2.intervalDays,
              repetitions: sm2.repetitions,
              nextReviewAt: sm2.nextReviewAt,
              lastReviewedAt: Date.now(),
            }
          : c
      );

      await updateStudySetFlashcards(targetSet.id, updated);
      await awardXp(btnMeta.xp, { cardsReviewed: 1 });
      await saveStudySession({
        userId: user.uid,
        type: 'flashcard_review',
        durationSeconds: 15,
        cardsReviewed: 1,
        xpEarned: btnMeta.xp,
      });

      setFeedback(`Rated ${btnMeta.label} — next review in ${labelStr} · +${btnMeta.xp} XP`);
      setFlipped(false);
      if (safeIndex < visibleCrossCards.length - 1) {
        setCardIndex(safeIndex + 1);
      } else {
        setCardIndex(0);
      }
    } finally {
      setSavingCard(false);
    }
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = setTitleDraft.trim();
    if (!trimmed) return;
    await renameStudySet(activeSet.id, trimmed);
    setRenamingSet(false);
    setFeedback(`Renamed study set to "${trimmed}".`);
  };

  const openAddCard = () => {
    setEditingCardMode('add');
    setCardFrontDraft('');
    setCardBackDraft('');
  };

  const openEditCard = () => {
    if (!activeItem) return;
    setEditingCardMode('edit');
    setCardFrontDraft(activeItem.card.front);
    setCardBackDraft(activeItem.card.back);
  };

  const handleSaveCardEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const front = cardFrontDraft.trim();
    const back = cardBackDraft.trim();
    if (!front || !back) return;

    const targetSet =
      editingCardMode === 'edit' && activeItem
        ? studySets.find((s) => s.id === activeItem.setId) || activeSet
        : activeSet;

    setSavingCard(true);
    try {
      if (editingCardMode === 'add') {
        const now = Date.now();
        const newCard: FlashcardItem = {
          id: `card_custom_${now}`,
          front: front.slice(0, 500),
          back: back.slice(0, 1000),
          box: 1,
          easeFactor: 2.5,
          intervalDays: 0,
          repetitions: 0,
          nextReviewAt: now,
        };
        await updateStudySetFlashcards(targetSet.id, [...targetSet.flashcards, newCard]);
        setCardIndex(targetSet.flashcards.length);
        setFeedback('Added new flashcard to this set.');
      } else if (editingCardMode === 'edit' && activeItem) {
        const updated = targetSet.flashcards.map((c) =>
          c.id === activeItem.card.id
            ? { ...c, front: front.slice(0, 500), back: back.slice(0, 1000) }
            : c
        );
        await updateStudySetFlashcards(targetSet.id, updated);
        setFeedback('Updated flashcard.');
      }
      setEditingCardMode('none');
      setFlipped(false);
    } finally {
      setSavingCard(false);
    }
  };

  const handleDeleteCurrentCard = async () => {
    if (!activeItem) return;
    const targetSet = studySets.find((s) => s.id === activeItem.setId);
    if (!targetSet || targetSet.flashcards.length <= 1) {
      setFeedback('A study set must keep at least 1 flashcard. You can edit it or delete the set.');
      return;
    }
    setSavingCard(true);
    try {
      const updated = targetSet.flashcards.filter((c) => c.id !== activeItem.card.id);
      await updateStudySetFlashcards(targetSet.id, updated);
      setCardIndex((prev) => Math.max(0, prev - 1));
      setFlipped(false);
      setFeedback('Removed flashcard.');
    } finally {
      setSavingCard(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Due Today Banner */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-base font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
            Due Today: {allDueTodayCards.length} flashcard{allDueTodayCards.length === 1 ? '' : 's'} across {studySets.length} set{studySets.length === 1 ? '' : 's'}
          </p>
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            SM-2 spaced repetition adjusts your next review interval using Again / Hard / Good / Easy.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {allDueTodayCards.length > 0 && (
            <Button
              variant={reviewAllDueMode ? 'secondary' : 'primary'}
              size="sm"
              icon={<Layers className="h-4 w-4" />}
              onClick={() => {
                setViewMode('flashcards');
                setReviewAllDueMode((v) => !v);
              }}
            >
              {reviewAllDueMode
                ? 'Exit Due Queue'
                : `Review Due Today (${allDueTodayCards.length})`}
            </Button>
          )}
        </div>
      </Card>

      {/* Study Set Selector, Rename & Sub-mode Tabs */}
      <Card className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="flex-1 max-w-md space-y-2">
            {!renamingSet ? (
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Active Study Set"
                    value={activeSet.id}
                    disabled={reviewAllDueMode}
                    onChange={(e) => onSelectSet(e.target.value)}
                  >
                    {studySets.map((set) => (
                      <option key={set.id} value={set.id}>
                        {set.title} ({set.course})
                      </option>
                    ))}
                  </Select>
                </div>
                {!reviewAllDueMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label="Rename study set"
                    icon={<Pencil className="h-4 w-4" />}
                    onClick={() => {
                      setSetTitleDraft(activeSet.title);
                      setRenamingSet(true);
                    }}
                  >
                    Rename
                  </Button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveRename} className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Rename Study Set"
                    value={setTitleDraft}
                    onChange={(e) => setSetTitleDraft(e.target.value)}
                    maxLength={160}
                    required
                  />
                </div>
                <Button type="submit" size="sm" icon={<Check className="h-4 w-4" />}>
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={<X className="h-4 w-4" />}
                  onClick={() => setRenamingSet(false)}
                >
                  Cancel
                </Button>
              </form>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1 p-1 rounded-xl bg-stone-100 dark:bg-neutral-800">
              <button
                type="button"
                onClick={() => setViewMode('flashcards')}
                className={`px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'flashcards'
                    ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400'
                }`}
              >
                Flashcards ({activeSet.flashcards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewAllDueMode(false);
                  setViewMode('reviewer');
                }}
                className={`px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'reviewer'
                    ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400'
                }`}
              >
                Reviewer
              </button>
              <button
                type="button"
                onClick={() => {
                  setReviewAllDueMode(false);
                  setViewMode('sets');
                }}
                className={`px-3 min-h-[40px] rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                  viewMode === 'sets'
                    ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                    : 'text-slate-600 dark:text-neutral-400'
                }`}
              >
                Saved Sets ({studySets.length})
              </button>
            </div>

            <Button variant="outline" size="sm" onClick={() => onStartQuiz(activeSet.id)}>
              Take Quiz ({activeSet.quizQuestions.length})
            </Button>
          </div>
        </div>
      </Card>

      {feedback && (
        <AlertBanner tone="success" title="Study Set Updated">
          {feedback}
        </AlertBanner>
      )}

      {viewMode === 'sets' ? (
        <div key="sets" className="animate-enter space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAllSets ? studySets : studySets.slice(0, 6)).map((set) => {
              const setDue = set.flashcards.filter((c) => c.nextReviewAt <= endOfTodayMs).length;
              const bannerClass = COURSE_BANNER[set.course] || 'bg-blue-700';
              return (
                <div
                  key={set.id}
                  className="rounded-2xl bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,border-color] duration-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className={`h-12 ${bannerClass} px-4 flex items-center justify-end`}>
                      <span className="text-[11px] font-bold text-white/95 tracking-wide">
                        {set.course}
                      </span>
                    </div>
                    <div className="p-4 space-y-1.5">
                      <h3 className="text-base font-bold text-slate-900 dark:text-neutral-100 line-clamp-2">
                        {set.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                        {set.flashcards.length} cards · {setDue} due today ·{' '}
                        {set.quizQuestions.length} quiz items
                      </p>
                    </div>
                  </div>

                  <div className="px-4 pb-4 pt-1 flex flex-wrap items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => {
                        onSelectSet(set.id);
                        setViewMode('flashcards');
                      }}
                    >
                      Study
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSelectSet(set.id);
                        setViewMode('reviewer');
                      }}
                    >
                      Reviewer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartQuiz(set.id)}
                    >
                      Quiz
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete ${set.title}`}
                      icon={<Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />}
                      onClick={() => {
                        void deleteStudySet(set.id);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {studySets.length > 6 && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllSets((v) => !v)}
              >
                {showAllSets ? 'Show fewer sets' : `See more (${studySets.length - 6} more)`}
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'reviewer' ? (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200 dark:border-neutral-800">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
                {activeSet.title} — Reviewer
              </h2>
              <p className="text-xs text-slate-500 dark:text-neutral-400">
                {activeSet.course} · Key formulas, concepts, and SI units
              </p>
            </div>

            {ttsSupported && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  aria-label="Speech speed"
                  value={rate}
                  onChange={(e) => setRate(Number(e.target.value))}
                  className="min-h-[40px] rounded-xl border border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2.5 text-xs font-semibold text-slate-800 dark:text-neutral-200"
                >
                  <option value={0.85}>0.85x Speed</option>
                  <option value={1}>1.0x Normal</option>
                  <option value={1.15}>1.15x Fast</option>
                </select>
                <Button
                  variant={speaking ? 'danger' : 'outline'}
                  size="sm"
                  icon={speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  onClick={() =>
                    handleListen(`${activeSet.title}. ${activeSet.reviewerSummary}`)
                  }
                >
                  {speaking ? 'Stop Reading' : 'Read Aloud'}
                </Button>
              </div>
            )}
          </div>
          <MathText
            text={activeSet.reviewerSummary}
            className="font-lesson text-base sm:text-[17px] text-slate-800 dark:text-neutral-200 leading-[1.75]"
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600 dark:text-neutral-400 tabular-nums">
              {reviewAllDueMode
                ? `Reviewing all due cards today (${allDueTodayCards.length} left)`
                : `${dueInActiveSet} due today · ${activeSet.flashcards.length} total cards`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!reviewAllDueMode && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={openAddCard}
                  >
                    Add Card
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDueOnlyInSet((prev) => !prev)}
                    className={`px-3.5 min-h-[40px] rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                      dueOnlyInSet
                        ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                        : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-stone-200 dark:border-neutral-700 hover:bg-stone-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    {dueOnlyInSet ? 'Showing Due Today Only' : 'Show Due Today Only'}
                  </button>
                </>
              )}
            </div>
          </div>

          {editingCardMode !== 'none' && (
            <Card className="space-y-4 border-blue-300 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-neutral-100">
                  {editingCardMode === 'add' ? 'Add Flashcard' : 'Edit Current Flashcard'}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingCardMode('none')}
                  aria-label="Close card editor"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-stone-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleSaveCardEdit} className="space-y-3">
                <Textarea
                  label="Front (Question / Prompt — supports $LaTeX$)"
                  value={cardFrontDraft}
                  onChange={(e) => setCardFrontDraft(e.target.value)}
                  rows={2}
                  required
                />
                <Textarea
                  label="Back (Answer & Units — supports $LaTeX$)"
                  value={cardBackDraft}
                  onChange={(e) => setCardBackDraft(e.target.value)}
                  rows={3}
                  required
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" size="sm" loading={savingCard}>
                    {editingCardMode === 'add' ? 'Add Flashcard' : 'Save Changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCardMode('none')}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {!activeItem ? (
            <Card className="text-center py-10 space-y-3">
              <p className="text-base font-bold text-slate-900 dark:text-neutral-100">
                All due cards are reviewed for today!
              </p>
              <p className="text-sm text-slate-600 dark:text-neutral-400">
                Great focus. Switch off Due Only to practice any card anytime.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReviewAllDueMode(false);
                    setDueOnlyInSet(false);
                  }}
                >
                  Show All Cards
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flip-perspective">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setFlipped((f) => !f)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setFlipped((f) => !f);
                    }
                  }}
                  aria-label={flipped ? 'Flip flashcard to question' : 'Flip flashcard to answer'}
                  className={`flip-card-inner cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded-2xl ${
                    flipped ? 'is-flipped' : ''
                  }`}
                >
                  {/* Front Face (Question) */}
                  <div className="flip-card-face rounded-2xl bg-white dark:bg-[#141416] border border-stone-200 dark:border-neutral-800 p-6 sm:p-10 min-h-[260px] flex flex-col justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-stone-300 dark:hover:border-neutral-700 transition-colors">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                      <span>Question · {activeItem.setTitle}</span>
                      <span>
                        Card {safeIndex + 1} of {visibleCrossCards.length} · Reps{' '}
                        {activeItem.card.repetitions ?? Math.max(0, (activeItem.card.box || 1) - 1)}
                      </span>
                    </div>

                    <div className="py-6 text-center">
                      <MathText
                        text={activeItem.card.front}
                        className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-neutral-100 leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Tap card to reveal answer
                      </span>
                      {ttsSupported && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleListen(activeItem.card.front);
                          }}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-stone-200 dark:border-neutral-700 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          {speaking ? (
                            <>
                              <Square className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Back Face (Answer) */}
                  <div className="flip-card-face flip-card-back rounded-2xl bg-[#FAF9F6] dark:bg-neutral-900 border border-blue-200 dark:border-blue-900/70 p-6 sm:p-10 min-h-[260px] flex flex-col justify-between shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
                    <div className="flex items-center justify-between gap-2 text-xs text-blue-700 dark:text-blue-400 font-semibold tabular-nums">
                      <span>Answer · {activeItem.setTitle}</span>
                      <span>
                        Card {safeIndex + 1} of {visibleCrossCards.length} · EF{' '}
                        {(activeItem.card.easeFactor || 2.5).toFixed(2)}
                      </span>
                    </div>

                    <div className="py-6 text-center">
                      <MathText
                        text={activeItem.card.back}
                        className="font-lesson text-lg sm:text-xl font-semibold text-slate-900 dark:text-neutral-100 leading-relaxed"
                      />
                    </div>

                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                        Tap card to flip back
                      </span>
                      {ttsSupported && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleListen(activeItem.card.back);
                          }}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 rounded-full border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-semibold text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-700 cursor-pointer"
                        >
                          {speaking ? (
                            <>
                              <Square className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4-Button SM-2 Spaced Repetition Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {SM2_BUTTONS.map((btn) => {
                  const nextLabel = formatSM2IntervalLabel(activeItem.card, btn.rating);
                  return (
                    <button
                      key={btn.rating}
                      type="button"
                      disabled={savingCard}
                      onClick={() => {
                        void handleRateCard(btn.rating);
                      }}
                      className={`min-h-[52px] px-3 py-2 rounded-xl border font-semibold transition-[transform,background-color] duration-150 active:scale-[0.97] flex flex-col items-center justify-center cursor-pointer disabled:opacity-50 ${btn.style}`}
                    >
                      <span className="text-sm font-bold">{btn.label}</span>
                      <span className="text-[11px] opacity-85 tabular-nums">
                        {nextLabel} · +{btn.xp} XP
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Navigation & Card Edit Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ChevronLeft className="h-4 w-4" />}
                    onClick={() => {
                      stop();
                      setFlipped(false);
                      setCardIndex((prev) =>
                        prev > 0 ? prev - 1 : visibleCrossCards.length - 1
                      );
                    }}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<ChevronRight className="h-4 w-4" />}
                    onClick={() => {
                      stop();
                      setFlipped(false);
                      setCardIndex((prev) =>
                        prev < visibleCrossCards.length - 1 ? prev + 1 : 0
                      );
                    }}
                  >
                    Next
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Pencil className="h-3.5 w-3.5" />}
                    onClick={openEditCard}
                  >
                    Edit Card
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />}
                    onClick={() => {
                      void handleDeleteCurrentCard();
                    }}
                  >
                    Delete Card
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
