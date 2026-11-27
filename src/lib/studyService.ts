import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import type {
  AiMessage,
  FlashcardItem,
  LeaderboardEntry,
  MaterialSourceType,
  PhysicsCourse,
  QuizAttempt,
  QuizQuestion,
  SM2Rating,
  StudyMaterial,
  StudySession,
  StudySet,
} from '../types';

export function makeDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now()}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

function sortByCreatedDesc<T extends { createdAt?: { toMillis?: () => number } }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
}

export function subscribeMaterials(
  userId: string,
  onData: (items: StudyMaterial[]) => void
) {
  const q = query(collection(db, 'materials'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(sortByCreatedDesc(snap.docs.map((d) => d.data() as StudyMaterial)));
    },
    (error) => {
      if (!auth.currentUser) return;
      handleFirestoreError(error, OperationType.LIST, 'materials');
    }
  );
}

export function subscribeStudySets(
  userId: string,
  onData: (items: StudySet[]) => void
) {
  const q = query(collection(db, 'studySets'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(sortByCreatedDesc(snap.docs.map((d) => d.data() as StudySet)));
    },
    (error) => {
      if (!auth.currentUser) return;
      handleFirestoreError(error, OperationType.LIST, 'studySets');
    }
  );
}

export async function saveStudyMaterial(params: {
  userId: string;
  title: string;
  course: PhysicsCourse;
  sourceType: MaterialSourceType;
  extractedText: string;
}): Promise<string> {
  const id = makeDocId('mat');
  const cleanTitle = params.title.trim().slice(0, 160) || 'Untitled Material';
  const cleanText = params.extractedText.trim().slice(0, 95000);
  try {
    await setDoc(doc(db, 'materials', id), {
      id,
      userId: params.userId,
      title: cleanTitle,
      course: params.course,
      sourceType: params.sourceType,
      extractedText: cleanText,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `materials/${id}`);
  }
}

export async function deleteStudyMaterial(materialId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'materials', materialId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `materials/${materialId}`);
  }
}

export async function saveStudySet(params: {
  userId: string;
  materialId: string;
  lessonId?: string;
  title: string;
  course: PhysicsCourse;
  reviewerSummary: string;
  flashcards: Array<{ front: string; back: string }>;
  quizQuestions: Array<{
    type?: 'mcq' | 'true_false' | 'short_answer';
    question: string;
    choices: string[];
    correctIndex: number;
    acceptableAnswers?: string[];
    explanation: string;
  }>;
}): Promise<string> {
  const id = makeDocId('set');
  const now = Date.now();
  const formattedCards: FlashcardItem[] = params.flashcards.slice(0, 30).map((c, idx) => ({
    id: `card_${idx}_${now}`,
    front: c.front.slice(0, 500),
    back: c.back.slice(0, 1000),
    box: 1,
    easeFactor: 2.5,
    intervalDays: 0,
    repetitions: 0,
    nextReviewAt: now,
  }));

  const formattedQuestions: QuizQuestion[] = params.quizQuestions.slice(0, 20).map((q, idx) => ({
    id: `q_${idx}_${now}`,
    type: q.type || 'mcq',
    question: q.question.slice(0, 500),
    choices: (q.choices || []).slice(0, 4),
    correctIndex: q.correctIndex ?? 0,
    ...(q.acceptableAnswers && q.acceptableAnswers.length > 0
      ? { acceptableAnswers: q.acceptableAnswers.slice(0, 5) }
      : {}),
    explanation: q.explanation.slice(0, 600),
  }));

  try {
    await setDoc(doc(db, 'studySets', id), {
      id,
      userId: params.userId,
      materialId: params.materialId,
      ...(params.lessonId ? { lessonId: params.lessonId.slice(0, 40) } : {}),
      title: params.title.trim().slice(0, 160),
      course: params.course,
      reviewerSummary: params.reviewerSummary.slice(0, 28000),
      flashcards: formattedCards,
      quizQuestions: formattedQuestions,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `studySets/${id}`);
  }
}

export async function renameStudySet(setId: string, newTitle: string): Promise<void> {
  const cleanTitle = newTitle.trim().slice(0, 160);
  if (!cleanTitle) return;
  try {
    await updateDoc(doc(db, 'studySets', setId), {
      title: cleanTitle,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `studySets/${setId}`);
  }
}

export async function updateStudySetFlashcards(
  setId: string,
  flashcards: FlashcardItem[]
): Promise<void> {
  try {
    await updateDoc(doc(db, 'studySets', setId), {
      flashcards: flashcards.slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `studySets/${setId}`);
  }
}

export async function deleteStudySet(setId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'studySets', setId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `studySets/${setId}`);
  }
}

export async function saveQuizAttempt(params: {
  userId: string;
  studySetId: string;
  studySetTitle: string;
  course: PhysicsCourse;
  score: number;
  totalQuestions: number;
  xpEarned: number;
}): Promise<void> {
  const id = makeDocId('quiz');
  const percentage =
    params.totalQuestions > 0 ? Math.round((params.score / params.totalQuestions) * 100) : 0;
  try {
    await setDoc(doc(db, 'quizAttempts', id), {
      id,
      userId: params.userId,
      studySetId: params.studySetId,
      studySetTitle: params.studySetTitle.slice(0, 160),
      course: params.course,
      score: params.score,
      totalQuestions: params.totalQuestions,
      percentage,
      xpEarned: params.xpEarned,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `quizAttempts/${id}`);
  }
}

export async function saveStudySession(params: {
  userId: string;
  type: 'pomodoro' | 'flashcard_review';
  durationSeconds: number;
  cardsReviewed: number;
  xpEarned: number;
}): Promise<void> {
  const id = makeDocId('sess');
  try {
    await setDoc(doc(db, 'studySessions', id), {
      id,
      userId: params.userId,
      type: params.type,
      durationSeconds: Math.max(0, Math.round(params.durationSeconds)),
      cardsReviewed: Math.max(0, Math.round(params.cardsReviewed)),
      xpEarned: Math.max(0, Math.round(params.xpEarned)),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `studySessions/${id}`);
  }
}

export function subscribeQuizAttempts(
  userId: string,
  onData: (items: QuizAttempt[]) => void
) {
  const q = query(collection(db, 'quizAttempts'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(sortByCreatedDesc(snap.docs.map((d) => d.data() as QuizAttempt)));
    },
    (error) => {
      if (!auth.currentUser) return;
      handleFirestoreError(error, OperationType.LIST, 'quizAttempts');
    }
  );
}

export function subscribeStudySessions(
  userId: string,
  onData: (items: StudySession[]) => void
) {
  const q = query(collection(db, 'studySessions'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      onData(sortByCreatedDesc(snap.docs.map((d) => d.data() as StudySession)));
    },
    (error) => {
      if (!auth.currentUser) return;
      handleFirestoreError(error, OperationType.LIST, 'studySessions');
    }
  );
}

/** SM-2 spaced-repetition calculation with 4 buttons: Again / Hard / Good / Easy */
export function computeNextSM2Review(
  card: Pick<FlashcardItem, 'box' | 'easeFactor' | 'intervalDays' | 'repetitions' | 'lapses'>,
  rating: SM2Rating
): {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
  lastRating: SM2Rating;
  nextBox: number;
  nextReviewAt: number;
} {
  const now = Date.now();
  const prevEf = typeof card.easeFactor === 'number' && card.easeFactor >= 1.3 ? card.easeFactor : 2.5;
  const prevInterval = typeof card.intervalDays === 'number' && card.intervalDays > 0 ? card.intervalDays : 0;
  const prevReps = typeof card.repetitions === 'number' ? card.repetitions : Math.max(0, (card.box || 1) - 1);
  const prevLapses = typeof card.lapses === 'number' && card.lapses >= 0 ? card.lapses : 0;

  if (rating === 'again') {
    return {
      easeFactor: Number(Math.max(1.3, prevEf - 0.2).toFixed(2)),
      intervalDays: 0,
      repetitions: 0,
      lapses: prevLapses + 1,
      lastRating: 'again',
      nextBox: 1,
      nextReviewAt: now + 5 * 60 * 1000, // 5 minutes re-learn interval
    };
  }

  let easeFactor = prevEf;
  let intervalDays = 1;
  const repetitions = prevReps + 1;

  if (rating === 'hard') {
    easeFactor = Math.max(1.3, prevEf - 0.14);
    intervalDays =
      repetitions === 1 ? 0.5 : Math.max(1, Math.round(Math.max(1, prevInterval) * 1.2 * 10) / 10);
  } else if (rating === 'good') {
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.max(1, Math.round(Math.max(1, prevInterval) * easeFactor));
  } else {
    // easy
    easeFactor = Math.min(3.2, prevEf + 0.15);
    if (repetitions === 1) intervalDays = 4;
    else if (repetitions === 2) intervalDays = 8;
    else intervalDays = Math.max(4, Math.round(Math.max(1, prevInterval) * easeFactor * 1.3));
  }

  const nextBox =
    intervalDays >= 14 ? 5 : intervalDays >= 6 ? 4 : intervalDays >= 3 ? 3 : intervalDays >= 1 ? 2 : 1;

  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    lapses: prevLapses,
    lastRating: rating,
    nextBox,
    nextReviewAt: now + Math.round(intervalDays * 24 * 60 * 60 * 1000),
  };
}

export function formatSM2IntervalLabel(
  card: Pick<FlashcardItem, 'box' | 'easeFactor' | 'intervalDays' | 'repetitions' | 'lapses'>,
  rating: SM2Rating
): string {
  if (rating === 'again') return '5m';
  const { intervalDays } = computeNextSM2Review(card, rating);
  if (intervalDays < 1) {
    return `${Math.max(1, Math.round(intervalDays * 24))}h`;
  }
  return `${Math.round(intervalDays)}d`;
}

/** Identifies flashcards the learner is currently struggling with via SM-2 signals */
export function isStrugglingCard(card: FlashcardItem): boolean {
  const ef = typeof card.easeFactor === 'number' ? card.easeFactor : 2.5;
  const lapses = card.lapses ?? 0;
  const reps = card.repetitions ?? Math.max(0, (card.box || 1) - 1);
  if (card.lastRating === 'again') return true;
  if (card.lastRating === 'hard' && reps < 3) return true;
  if (lapses > 0 && reps < 2) return true;
  return ef <= 2.25;
}

/** Higher priority score means the card should be surfaced earlier in the SM-2 study queue */
export function getCardSM2PriorityScore(
  card: FlashcardItem,
  now = Date.now(),
  endOfTodayMs = now
): number {
  const ef = typeof card.easeFactor === 'number' ? card.easeFactor : 2.5;
  const lapses = card.lapses ?? 0;
  const reps = card.repetitions ?? Math.max(0, (card.box || 1) - 1);

  let score = 0;
  // Immediate re-learn / failed cards come first
  if (card.lastRating === 'again') score += 10000;
  // Cards rated Hard or recently lapsed
  if (card.lastRating === 'hard') score += 5000;
  if (lapses > 0) score += Math.min(3000, lapses * 900) - Math.min(800, reps * 250);

  // Low ease factor strongly boosts priority
  score += Math.round((2.6 - Math.min(2.6, ef)) * 1200);

  // Overdue or due right now
  if (card.nextReviewAt <= now) {
    const overdueHours = Math.max(0, (now - card.nextReviewAt) / 3600000);
    score += 1800 + Math.min(800, overdueHours * 12);
  } else if (card.nextReviewAt <= endOfTodayMs) {
    score += 700;
  } else {
    // Future card: push well below due/struggling cards, earliest due first
    const daysOut = Math.max(0, (card.nextReviewAt - now) / 86400000);
    score -= Math.min(1500, daysOut * 20);
  }

  // Unseen cards slightly ahead of well-mastered future cards
  if (!card.lastReviewedAt) score += 250;
  score -= Math.min(400, reps * 45);

  return score;
}

export function sortFlashcardsBySM2Priority<T extends { card: FlashcardItem }>(
  items: T[],
  now = Date.now(),
  endOfTodayMs = now
): T[] {
  return [...items].sort(
    (a, b) =>
      getCardSM2PriorityScore(b.card, now, endOfTodayMs) -
      getCardSM2PriorityScore(a.card, now, endOfTodayMs)
  );
}

export function subscribeLeaderboard(onData: (entries: LeaderboardEntry[]) => void) {
  const q = collection(db, 'leaderboard');
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as LeaderboardEntry)
        .sort((a, b) => (b.xp || 0) - (a.xp || 0));
      onData(list.slice(0, 100));
    },
    (error) => {
      if (!auth.currentUser) return;
      handleFirestoreError(error, OperationType.LIST, 'leaderboard');
    }
  );
}

export function subscribeAiMessages(
  userId: string,
  onData: (messages: AiMessage[]) => void
) {
  const q = query(collection(db, 'aiMessages'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as AiMessage)
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
          const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
          return ta - tb;
        });
      onData(list);
    },
    (error) => {
      if (!auth.currentUser) return;
      handleFirestoreError(error, OperationType.LIST, 'aiMessages');
    }
  );
}

export async function saveAiMessage(params: {
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  materialTitle?: string;
}): Promise<void> {
  const id = makeDocId('msg');
  try {
    await setDoc(doc(db, 'aiMessages', id), {
      id,
      userId: params.userId,
      role: params.role,
      content: params.content.slice(0, 19500),
      ...(params.materialTitle ? { materialTitle: params.materialTitle.slice(0, 160) } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `aiMessages/${id}`);
  }
}

export async function clearAiMessages(userId: string): Promise<void> {
  try {
    const snap = await getDocs(
      query(collection(db, 'aiMessages'), where('userId', '==', userId))
    );
    if (snap.empty) return;
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'aiMessages');
  }
}
