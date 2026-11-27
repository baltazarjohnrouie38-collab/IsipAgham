import type { Timestamp } from 'firebase/firestore';

export type PhysicsCourse = 'Physics 1' | 'Physics 2' | 'Physics 3';

export type MaterialSourceType = 'pdf' | 'pptx' | 'docx' | 'image' | 'text' | 'seed' | 'lesson';

export type ChecklistKey =
  | 'upload_material'
  | 'generate_flashcards'
  | 'take_quiz'
  | 'use_timer_sr'
  | 'ask_ai_three'
  | 'open_3d_all_courses'
  | 'try_tts_darkmode'
  | 'enable_notifications'
  | 'check_dashboard_leaderboard'
  | 'add_home_screen';

export interface UserProfile {
  uid: string;
  username: string;
  email?: string;
  nickname: string;
  avatarUrl?: string;
  course: PhysicsCourse;
  darkMode: boolean;
  pomodoroWorkMin: number;
  pomodoroBreakMin: number;
  dailyGoalMinutes: number;
  notificationsEnabled: boolean;
  notificationTime: string;
  fcmToken?: string;
  xp: number;
  weeklyXp: number;
  weekKey: string;
  streakDays: number;
  lastStudyDate: string;
  todayStudyDate: string;
  todayStudySeconds: number;
  totalStudySeconds: number;
  cardsReviewedCount: number;
  aiQuestionsAsked: number;
  lessonsCompleted: string[];
  visitedCourses: PhysicsCourse[];
  checklist: Partial<Record<ChecklistKey, boolean>>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  avatarUrl?: string;
  xp: number;
  weeklyXp?: number;
  weekKey?: string;
  updatedAt?: Timestamp;
}

export interface StudyMaterial {
  id: string;
  userId: string;
  title: string;
  course: PhysicsCourse;
  sourceType: MaterialSourceType;
  extractedText: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type SM2Rating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  /** Legacy Leitner box 1..5 kept for compatibility */
  box: number;
  /** SM-2 ease factor (default 2.5, min 1.3) */
  easeFactor?: number;
  /** SM-2 interval in days */
  intervalDays?: number;
  /** SM-2 consecutive successful repetitions */
  repetitions?: number;
  /** Number of times the card was rated Again (lapsed) */
  lapses?: number;
  /** Most recent SM-2 rating */
  lastRating?: SM2Rating;
  /** Epoch ms for next due review */
  nextReviewAt: number;
  /** Epoch ms of last review */
  lastReviewedAt?: number;
}

export type QuizQuestionType = 'mcq' | 'true_false' | 'short_answer';

export interface QuizQuestion {
  id: string;
  type?: QuizQuestionType;
  question: string;
  choices: string[];
  correctIndex: number;
  acceptableAnswers?: string[];
  explanation: string;
}

export interface StudySet {
  id: string;
  userId: string;
  materialId: string;
  lessonId?: string;
  title: string;
  course: PhysicsCourse;
  reviewerSummary: string;
  flashcards: FlashcardItem[];
  quizQuestions: QuizQuestion[];
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  studySetId: string;
  studySetTitle: string;
  course: PhysicsCourse;
  score: number;
  totalQuestions: number;
  percentage: number;
  xpEarned: number;
  createdAt?: Timestamp;
}

export interface StudySession {
  id: string;
  userId: string;
  type: 'pomodoro' | 'flashcard_review';
  durationSeconds: number;
  cardsReviewed: number;
  xpEarned: number;
  createdAt?: Timestamp;
}

export interface AiMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  materialTitle?: string;
  createdAt?: Timestamp;
}

export interface LessonCheckQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonKeyTerm {
  term: string;
  definition: string;
}

export interface BuiltInLesson {
  id: string;
  code: string;
  term?: 1 | 2 | 3;
  termTitle?: string;
  course: PhysicsCourse;
  title: string;
  objective: string;
  keyFormula: string;
  explanation: string;
  keyTerms?: LessonKeyTerm[];
  realWorldExamples?: string[];
  workedExample: {
    problem: string;
    solutionSteps: string[];
    finalAnswer: string;
  };
  checkQuestions: LessonCheckQuestion[];
  suggestedSceneId?: string;
}

export interface VisualizerScenario {
  id: string;
  userId: string;
  sceneId: string;
  course: PhysicsCourse;
  title: string;
  notes?: string;
  params: Record<string, number | string>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

