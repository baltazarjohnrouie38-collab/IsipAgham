import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  Pencil,
  Plus,
  RotateCw,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NATURAL_VOICE_OPTIONS, useSpeech } from '../../hooks/useSpeech';
import type { NaturalVoiceName } from '../../lib/api';
import { playUiSound } from '../../lib/sound';
import {
  computeNextSM2Review,
  deleteStudySet,
  formatSM2IntervalLabel,
  isStrugglingCard,
  renameStudySet,
  saveStudySession,
  sortFlashcardsBySM2Priority,
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
  key: string;
  setId: string;
  setTitle: string;
  course: string;
  card: FlashcardItem;
}

function makeCardKey(setId: string, cardId: string): string {
  return `${setId}::${cardId}`;
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

function getCardDifficultyBadge(card: FlashcardItem): {
  label: string;
  className: string;
  struggling: boolean;
} {
  const lapses = card.lapses ?? 0;
  const reps = card.repetitions ?? Math.max(0, (card.box || 1) - 1);
  if (card.lastRating === 'again' || (lapses > 0 && reps === 0)) {
    return {
      label: lapses > 1 ? `Struggling · Lapsed ×${lapses}` : 'Struggling · Needs Retry',
      className: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-900',
      struggling: true,
    };
  }
  if (isStrugglingCard(card)) {
    return {
      label: `Priority Review · EF ${(card.easeFactor || 2.5).toFixed(2)}`,
      className:
        'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900',
      struggling: true,
    };
  }
  if (!card.lastReviewedAt) {
    return {
      label: 'New Card',
      className:
        'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900',
      struggling: false,
    };
  }
  if (card.nextReviewAt <= Date.now()) {
    return {
      label: 'Due Now',
      className:
        'text-sky-800 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-900',
      struggling: false,
    };
  }
  return {
    label: `Mastered · Reps ${reps}`,
    className:
      'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900',
    struggling: false,
  };
}

export const FlashcardsTab: React.FC<FlashcardsTabProps> = ({
  studySets,
  selectedSetId,
  onSelectSet,
  onGoToMaterials,
  onStartQuiz,
}) => {
  const { user, awardXp, toggleChecklistItem } = useAuth();
  const {
    supported: ttsSupported,
    speaking,
    loading: ttsLoading,
    rate,
    setRate,
    voice,
    setVoice,
    speak,
    stop,
  } = useSpeech();
  const [searchParams] = useSearchParams();

  const [viewMode, setViewMode] = useState<'flashcards' | 'reviewer' | 'sets'>(
    searchParams.get('view') === 'sets' ? 'sets' : 'flashcards'
  );
  const [reviewAllDueMode, setReviewAllDueMode] = useState(false);
  const [smartPrioritySort, setSmartPrioritySort] = useState(true);

  useEffect(() => {
    if (searchParams.get('view') === 'sets') {
      setReviewAllDueMode(false);
      setViewMode('sets');
    }
  }, [searchParams]);

  const [sessionQueueKeys, setSessionQueueKeys] = useState<string[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dueOnlyInSet, setDueOnlyInSet] = useState(false);
  const [showAllSets, setShowAllSets] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [sessionReviewed, setSessionReviewed] = useState(0);

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
        if (card.nextReviewAt <= endOfTodayMs || isStrugglingCard(card)) {
          list.push({
            key: makeCardKey(set.id, card.id),
            setId: set.id,
            setTitle: set.title,
            course: set.course,
            card,
          });
        }
      }
    }
    return sortFlashcardsBySM2Priority(list, Date.now(), endOfTodayMs);
  }, [studySets, endOfTodayMs]);

  const allStrugglingCount = useMemo(() => {
    let count = 0;
    for (const set of studySets) {
      for (const card of set.flashcards) {
        if (isStrugglingCard(card)) count += 1;
      }
    }
    return count;
  }, [studySets]);

  // Pool of candidate cards for the current mode
  const candidatePool: CrossDeckCard[] = useMemo(() => {
    if (!activeSet) return [];
    if (reviewAllDueMode) return allDueTodayCards;

    const base = (
      dueOnlyInSet
        ? activeSet.flashcards.filter(
            (c) => c.nextReviewAt <= endOfTodayMs || isStrugglingCard(c)
          )
        : activeSet.flashcards
    ).map((card) => ({
      key: makeCardKey(activeSet.id, card.id),
      setId: activeSet.id,
      setTitle: activeSet.title,
      course: activeSet.course,
      card,
    }));

    return smartPrioritySort
      ? sortFlashcardsBySM2Priority(base, Date.now(), endOfTodayMs)
      : base;
  }, [activeSet, reviewAllDueMode, allDueTodayCards, dueOnlyInSet, endOfTodayMs, smartPrioritySort]);

  const candidateByKey = useMemo(() => {
    const map = new Map<string, CrossDeckCard>();
    for (const item of candidatePool) {
      map.set(item.key, item);
    }
    // Also index all cards across studySets so a rated card stays visible in sessionQueueKeys
    for (const set of studySets) {
      for (const card of set.flashcards) {
        const key = makeCardKey(set.id, card.id);
        if (!map.has(key)) {
          map.set(key, {
            key,
            setId: set.id,
            setTitle: set.title,
            course: set.course,
            card,
          });
        }
      }
    }
    return map;
  }, [candidatePool, studySets]);

  const queueSignature = `${activeSet?.id || ''}|${reviewAllDueMode}|${dueOnlyInSet}|${smartPrioritySort}`;
  const lastSignatureRef = useRef<string>('');
  const candidatePoolRef = useRef<CrossDeckCard[]>(candidatePool);
  candidatePoolRef.current = candidatePool;

  // Rebuild priority-sorted session queue ONLY when context/mode/sort changes
  useEffect(() => {
    if (lastSignatureRef.current !== queueSignature) {
      lastSignatureRef.current = queueSignature;
      setSessionQueueKeys(candidatePoolRef.current.map((c) => c.key));
      setCardIndex(0);
      setFlipped(false);
      setFeedback(null);
      setSessionReviewed(0);
      setRenamingSet(false);
      setEditingCardMode('none');
      stop();
    }
  }, [queueSignature, stop]);

  // Keep sessionQueueKeys synced if cards are added/deleted in Firestore without resetting position
  useEffect(() => {
    const poolKeys = candidatePool.map((c) => c.key);
    setSessionQueueKeys((prev) => {
      if (prev.length === 0 && poolKeys.length > 0) {
        return poolKeys;
      }
      const existingAllKeys = new Set<string>();
      for (const set of studySets) {
        for (const card of set.flashcards) {
          existingAllKeys.add(makeCardKey(set.id, card.id));
        }
      }
      const filtered = prev.filter((k) => existingAllKeys.has(k));
      const seen = new Set(filtered);
      const added = poolKeys.filter((k) => !seen.has(k));
      if (added.length === 0 && filtered.length === prev.length) return prev;
      return [...filtered, ...added];
    });
  }, [candidatePool, studySets]);

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

  const orderedSessionCards: CrossDeckCard[] = sessionQueueKeys
    .map((k) => candidateByKey.get(k))
    .filter((item): item is CrossDeckCard => Boolean(item));

  const safeIndex =
    orderedSessionCards.length > 0 ? Math.min(cardIndex, orderedSessionCards.length - 1) : 0;
  const activeItem = orderedSessionCards[safeIndex];
  const dueInActiveSet = activeSet.flashcards.filter(
    (c) => c.nextReviewAt <= endOfTodayMs || isStrugglingCard(c)
  ).length;
  const strugglingInActiveSet = activeSet.flashcards.filter((c) => isStrugglingCard(c)).length;

  const handleListen = (text: string) => {
    if (speaking || ttsLoading) {
      stop();
      return;
    }
    speak(text);
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
              lapses: sm2.lapses,
              lastRating: sm2.lastRating,
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

      setSessionReviewed((n) => n + 1);

      // Update active session queue: re-queue struggling cards ("Again" / "Hard") soon so they get repeated!
      const ratedKey = activeItem.key;
      let nextQueue = [...sessionQueueKeys];
      let nextIdx = safeIndex + 1;

      if (rating === 'again') {
        // Re-insert 2 cards ahead (or at the end if queue is short) so the student immediately practices it again
        const insertAt = Math.min(nextQueue.length, safeIndex + 3);
        nextQueue.splice(insertAt, 0, ratedKey);
        if (nextIdx >= nextQueue.length) nextIdx = 0;
        setFeedback(
          `Rated Again — queued again in 2 cards for active recall (${labelStr} SM-2 interval) · +${btnMeta.xp} XP`
        );
      } else if (rating === 'hard') {
        // Reinforce once more ~4 cards later if not already pending ahead
        const hasPendingAhead = nextQueue.slice(safeIndex + 1).includes(ratedKey);
        if (!hasPendingAhead) {
          const insertAt = Math.min(nextQueue.length, safeIndex + 5);
          nextQueue.splice(insertAt, 0, ratedKey);
        }
        if (nextIdx >= nextQueue.length) nextIdx = 0;
        setFeedback(
          `Rated Hard — prioritized for follow-up review (${labelStr}) · +${btnMeta.xp} XP`
        );
      } else {
        // Good or Easy: remove any duplicate future retries of this card in the current session
        const head = nextQueue.slice(0, safeIndex + 1);
        const tail = nextQueue.slice(safeIndex + 1).filter((k) => k !== ratedKey);
        nextQueue = [...head, ...tail];
        if (reviewAllDueMode || dueOnlyInSet) {
          // Remove from due queue once mastered for today
          nextQueue.splice(safeIndex, 1);
          nextIdx = safeIndex < nextQueue.length ? safeIndex : 0;
        } else if (nextIdx >= nextQueue.length) {
          nextIdx = 0;
        }
        setFeedback(`Rated ${btnMeta.label} — next review in ${labelStr} · +${btnMeta.xp} XP`);
      }

      setSessionQueueKeys(nextQueue);
      setCardIndex(nextIdx);
      setFlipped(false);
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
          lapses: 0,
          nextReviewAt: now,
        };
        const newKey = makeCardKey(targetSet.id, newCard.id);
        await updateStudySetFlashcards(targetSet.id, [...targetSet.flashcards, newCard]);
        setSessionQueueKeys((prev) => [newKey, ...prev]);
        setCardIndex(0);
        setFeedback('Added new flashcard at the front of your queue.');
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
      setSessionQueueKeys((prev) => prev.filter((k) => k !== activeItem.key));
      setCardIndex((prev) => Math.max(0, prev - 1));
      setFlipped(false);
      setFeedback('Removed flashcard.');
    } finally {
      setSavingCard(false);
    }
  };

  const handlePrioritizeNow = () => {
    const sorted = sortFlashcardsBySM2Priority(candidatePool, Date.now(), endOfTodayMs);
    setSmartPrioritySort(true);
    setSessionQueueKeys(sorted.map((c) => c.key));
    setCardIndex(0);
    setFlipped(false);
    setFeedback('Re-sorted queue with struggling and overdue flashcards first.');
  };

  const activeBadge = activeItem ? getCardDifficultyBadge(activeItem.card) : null;

  return (
    <div className="space-y-6">
      {/* Due Today & Struggling Banner */}
      <Card className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-bold text-slate-900 dark:text-neutral-100 tabular-nums">
              Due Today: {allDueTodayCards.length} flashcard{allDueTodayCards.length === 1 ? '' : 's'} across {studySets.length} set{studySets.length === 1 ? '' : 's'}
            </p>
            {allStrugglingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300 tabular-nums">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {allStrugglingCount} struggling prioritized
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-neutral-400">
            SM-2 spaced repetition automatically surfaces cards you struggle with first and re-queues Again/Hard cards during your session.
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
                : `Review Priority Due (${allDueTodayCards.length})`}
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
                data-sound="tab"
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
                data-sound="tab"
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
                data-sound="tab"
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
        <AlertBanner tone="success" title="SM-2 Study Queue Updated">
          {feedback}
        </AlertBanner>
      )}

      {viewMode === 'sets' ? (
        <div key="sets" className="animate-enter space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(showAllSets ? studySets : studySets.slice(0, 6)).map((set) => {
              const setDue = set.flashcards.filter(
                (c) => c.nextReviewAt <= endOfTodayMs || isStrugglingCard(c)
              ).length;
              const setStruggling = set.flashcards.filter((c) => isStrugglingCard(c)).length;
              const bannerClass = COURSE_BANNER[set.course] || 'bg-blue-700';
              return (
                <div
                  key={set.id}
                  className="liquid-glass rounded-[22px] hover:-translate-y-0.5 transition-[transform,box-shadow] duration-200 overflow-hidden flex flex-col justify-between"
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
                        {set.flashcards.length} cards · {setDue} due
                        {setStruggling > 0 ? ` · ${setStruggling} struggling` : ''} ·{' '}
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
                  aria-label="Natural voice"
                  value={voice}
                  onChange={(e) => setVoice(e.target.value as NaturalVoiceName)}
                  className="min-h-[40px] rounded-xl border border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-2.5 text-xs font-semibold text-slate-800 dark:text-neutral-200"
                >
                  {NATURAL_VOICE_OPTIONS.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
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
                  variant={speaking || ttsLoading ? 'danger' : 'outline'}
                  size="sm"
                  loading={ttsLoading}
                  icon={speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  onClick={() =>
                    handleListen(`${activeSet.title}. ${activeSet.reviewerSummary}`)
                  }
                >
                  {ttsLoading ? 'Preparing...' : speaking ? 'Stop Reading' : 'Read Aloud'}
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
                ? `Reviewing priority due queue (${orderedSessionCards.length} left${
                    sessionReviewed > 0 ? ` · ${sessionReviewed} rated this session` : ''
                  })`
                : `${dueInActiveSet} due · ${strugglingInActiveSet} struggling · ${activeSet.flashcards.length} total cards`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {!reviewAllDueMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setSmartPrioritySort((prev) => !prev)}
                    className={`px-3.5 min-h-[40px] rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                      smartPrioritySort
                        ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                        : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-stone-200 dark:border-neutral-700 hover:bg-stone-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{smartPrioritySort ? 'SM-2 Priority: ON' : 'Original Order'}</span>
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrioritizeNow}
                  >
                    Re-sort Struggling First
                  </Button>
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
                    className={`px-3.5 min-h-[40px] rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
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
                All due and struggling cards are reviewed for today!
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
                  data-sound="flip"
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
                  <div className="flip-card-face liquid-glass-strong rounded-[26px] p-6 sm:p-10 min-h-[260px] flex flex-col justify-between transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                      <div className="flex flex-wrap items-center gap-2">
                        <span>Question · {activeItem.setTitle}</span>
                        {activeBadge && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${activeBadge.className}`}
                          >
                            {activeBadge.label}
                          </span>
                        )}
                      </div>
                      <span>
                        Card {safeIndex + 1} of {orderedSessionCards.length} · Reps{' '}
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
                          {ttsLoading ? (
                            <>
                              <Volume2 className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                              <span>Preparing...</span>
                            </>
                          ) : speaking ? (
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
                  <div className="flip-card-face flip-card-back liquid-glass-strong rounded-[26px] border border-[#007AFF]/35 dark:border-[#4DA3FF]/35 p-6 sm:p-10 min-h-[260px] flex flex-col justify-between">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-blue-700 dark:text-blue-400 font-semibold tabular-nums">
                      <span>Answer · {activeItem.setTitle}</span>
                      <span>
                        Card {safeIndex + 1} of {orderedSessionCards.length} · EF{' '}
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
                          {ttsLoading ? (
                            <>
                              <Volume2 className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                              <span>Preparing...</span>
                            </>
                          ) : speaking ? (
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
                      data-sound="none"
                      disabled={savingCard}
                      onClick={() => {
                        playUiSound(
                          btn.rating === 'easy' || btn.rating === 'good'
                            ? 'correct'
                            : btn.rating === 'again'
                            ? 'wrong'
                            : 'click'
                        );
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
                        prev > 0 ? prev - 1 : orderedSessionCards.length - 1
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
                        prev < orderedSessionCards.length - 1 ? prev + 1 : 0
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
