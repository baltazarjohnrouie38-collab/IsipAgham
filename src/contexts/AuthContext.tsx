import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import type { ChecklistKey, PhysicsCourse, UserProfile } from '../types';
import { useTheme } from './ThemeContext';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signUpWithAccount: (params: {
    username: string;
    password: string;
    email?: string;
    course?: PhysicsCourse;
  }) => Promise<void>;
  signInWithAccount: (params: { identifier: string; password: string }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
  awardXp: (
    deltaXp: number,
    extraCounters?: { studySeconds?: number; cardsReviewed?: number; aiQuestions?: number }
  ) => Promise<void>;
  toggleLessonCompleted: (lessonId: string, done?: boolean) => Promise<void>;
  markCourseVisited: (course: PhysicsCourse) => Promise<void>;
  toggleChecklistItem: (key: ChecklistKey, done?: boolean) => Promise<void>;
  deleteAccountAndData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getLocalDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getYesterdayDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return getLocalDateKey(d);
}

export function getCurrentWeekKey(date = new Date()): string {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((temp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${temp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function sanitizeUsername(raw: string): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return 'Student';
  return trimmed.slice(0, 24);
}

function usernameToAuthEmail(username: string): string {
  const slug = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const safeSlug = slug.length >= 2 ? slug : 'student_user';
  return `${safeSlug}@users.isipagham.app`;
}

function formatAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code === 'auth/operation-not-allowed') {
    return 'Username/Password sign-in is not enabled yet in Firebase Console. Enable Email/Password under Authentication -> Sign-in method, or use Google Sign-In below.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'That username or email is already registered. Try signing in or picking another username.';
  }
  if (
    code === 'auth/invalid-credential' ||
    code === 'auth/wrong-password' ||
    code === 'auth/user-not-found'
  ) {
    return 'Incorrect username/email or password. Please check and try again.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid username or email address.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Sign-in window was closed before completing.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'For security, please sign out and sign back in before deleting your account.';
  }
  return err instanceof Error ? err.message : 'Authentication failed. Please try again.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const { darkMode, setDarkMode } = useTheme();

  const clearAuthError = () => setAuthError(null);

  const ensureUserDocuments = async (
    firebaseUser: User,
    options?: { username?: string; email?: string; course?: PhysicsCourse }
  ) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const lbRef = doc(db, 'leaderboard', firebaseUser.uid);

    let snap;
    try {
      snap = await getDoc(userRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
    }

    if (!snap.exists()) {
      const username = sanitizeUsername(
        options?.username ||
          firebaseUser.displayName ||
          firebaseUser.email?.split('@')[0] ||
          'PhysicsLearner'
      );
      const isSynthetic = (firebaseUser.email || '').endsWith('@users.isipagham.app');
      const storedEmail = options?.email?.trim()
        ? options.email.trim().slice(0, 254)
        : !isSynthetic && firebaseUser.email
        ? firebaseUser.email.slice(0, 254)
        : '';

      const today = getLocalDateKey();
      const weekKey = getCurrentWeekKey();

      const batch = writeBatch(db);
      batch.set(userRef, {
        uid: firebaseUser.uid,
        username,
        nickname: username,
        email: storedEmail,
        course: options?.course || 'Physics 1',
        darkMode,
        pomodoroWorkMin: 25,
        pomodoroBreakMin: 5,
        dailyGoalMinutes: 15,
        notificationsEnabled: false,
        notificationTime: '19:00',
        xp: 0,
        weeklyXp: 0,
        weekKey,
        streakDays: 0,
        lastStudyDate: '',
        todayStudyDate: today,
        todayStudySeconds: 0,
        totalStudySeconds: 0,
        cardsReviewedCount: 0,
        aiQuestionsAsked: 0,
        lessonsCompleted: [],
        visitedCourses: [],
        checklist: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(lbRef, {
        uid: firebaseUser.uid,
        nickname: username,
        xp: 0,
        weeklyXp: 0,
        weekKey,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
    }
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await ensureUserDocuments(firebaseUser);
      } catch (err) {
        console.error(err);
      }

      const userRef = doc(db, 'users', firebaseUser.uid);
      unsubProfile = onSnapshot(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const raw = snapshot.data() as Partial<UserProfile>;
            const normalized: UserProfile = {
              uid: raw.uid || firebaseUser.uid,
              username: raw.username || raw.nickname || 'Student',
              email: raw.email || '',
              nickname: raw.nickname || raw.username || 'Student',
              course: raw.course || 'Physics 1',
              darkMode: Boolean(raw.darkMode),
              pomodoroWorkMin: raw.pomodoroWorkMin || 25,
              pomodoroBreakMin: raw.pomodoroBreakMin || 5,
              dailyGoalMinutes: raw.dailyGoalMinutes || 15,
              notificationsEnabled: Boolean(raw.notificationsEnabled),
              notificationTime: raw.notificationTime || '19:00',
              fcmToken: raw.fcmToken,
              xp: raw.xp ?? 0,
              weeklyXp: raw.weeklyXp ?? 0,
              weekKey: raw.weekKey || getCurrentWeekKey(),
              streakDays: raw.streakDays ?? 0,
              lastStudyDate: raw.lastStudyDate || '',
              todayStudyDate: raw.todayStudyDate || getLocalDateKey(),
              todayStudySeconds: raw.todayStudySeconds ?? 0,
              totalStudySeconds: raw.totalStudySeconds ?? 0,
              cardsReviewedCount: raw.cardsReviewedCount ?? 0,
              aiQuestionsAsked: raw.aiQuestionsAsked ?? 0,
              lessonsCompleted: Array.isArray(raw.lessonsCompleted) ? raw.lessonsCompleted : [],
              visitedCourses: Array.isArray(raw.visitedCourses) ? raw.visitedCourses : [],
              checklist: raw.checklist || {},
              createdAt: raw.createdAt,
              updatedAt: raw.updatedAt,
            };
            setProfile(normalized);
            setDarkMode(normalized.darkMode);
          }
          setLoading(false);
        },
        (error) => {
          setLoading(false);
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      );
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, []);

  const signUpWithAccount = async (params: {
    username: string;
    password: string;
    email?: string;
    course?: PhysicsCourse;
  }) => {
    setAuthError(null);
    const cleanUser = sanitizeUsername(params.username);
    const optionalEmail = params.email?.trim() || '';
    const authEmail = optionalEmail ? optionalEmail : usernameToAuthEmail(cleanUser);

    try {
      const cred = await createUserWithEmailAndPassword(auth, authEmail, params.password);
      await ensureUserDocuments(cred.user, {
        username: cleanUser,
        email: optionalEmail,
        course: params.course || 'Physics 1',
      });
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signInWithAccount = async (params: { identifier: string; password: string }) => {
    setAuthError(null);
    const raw = params.identifier.trim();
    const authEmail = raw.includes('@') ? raw : usernameToAuthEmail(raw);

    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, params.password);
      await ensureUserDocuments(cred.user, {
        username: raw.includes('@') ? raw.split('@')[0] : raw,
      });
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      await ensureUserDocuments(cred.user);
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;
    const userRef = doc(db, 'users', user.uid);
    const lbRef = doc(db, 'leaderboard', user.uid);

    const allowedKeys: (keyof UserProfile)[] = [
      'username',
      'nickname',
      'course',
      'darkMode',
      'pomodoroWorkMin',
      'pomodoroBreakMin',
      'dailyGoalMinutes',
      'notificationsEnabled',
      'notificationTime',
      'fcmToken',
      'xp',
      'weeklyXp',
      'weekKey',
      'streakDays',
      'lastStudyDate',
      'todayStudyDate',
      'todayStudySeconds',
      'totalStudySeconds',
      'cardsReviewedCount',
      'aiQuestionsAsked',
      'lessonsCompleted',
      'visitedCourses',
      'checklist',
    ];

    const sanitized: Record<string, unknown> = { updatedAt: serverTimestamp() };
    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        if ((key === 'nickname' || key === 'username') && typeof updates[key] === 'string') {
          const clean = sanitizeUsername(updates[key] as string);
          sanitized.nickname = clean;
          sanitized.username = clean;
        } else {
          sanitized[key] = updates[key];
        }
      }
    }

    const batch = writeBatch(db);
    batch.update(userRef, sanitized);

    const shouldSyncLb =
      sanitized.nickname !== undefined ||
      sanitized.xp !== undefined ||
      sanitized.weeklyXp !== undefined ||
      sanitized.weekKey !== undefined;

    if (shouldSyncLb) {
      const currentWeek = getCurrentWeekKey();
      const lbWeeklyXp =
        sanitized.weeklyXp !== undefined
          ? (sanitized.weeklyXp as number)
          : profile.weekKey === currentWeek
          ? profile.weeklyXp
          : 0;
      batch.set(
        lbRef,
        {
          uid: user.uid,
          nickname: (sanitized.nickname as string) ?? profile.nickname,
          xp: (sanitized.xp as number) ?? profile.xp,
          weeklyXp: lbWeeklyXp,
          weekKey: (sanitized.weekKey as string) ?? currentWeek,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const awardXp = async (
    deltaXp: number,
    extraCounters?: { studySeconds?: number; cardsReviewed?: number; aiQuestions?: number }
  ) => {
    if (!user || !profile) return;
    const addedXp = Math.max(0, Math.round(deltaXp));
    const nextXp = Math.min(1000000, Math.max(0, (profile.xp || 0) + addedXp));

    const currentWeek = getCurrentWeekKey();
    const baseWeekly = profile.weekKey === currentWeek ? profile.weeklyXp || 0 : 0;
    const nextWeeklyXp = Math.min(1000000, baseWeekly + addedXp);

    const today = getLocalDateKey();
    const yesterday = getYesterdayDateKey();
    let nextStreak = profile.streakDays || 0;
    if (profile.lastStudyDate === today) {
      nextStreak = Math.max(1, nextStreak);
    } else if (profile.lastStudyDate === yesterday) {
      nextStreak = nextStreak + 1;
    } else {
      nextStreak = 1;
    }

    const baseTodaySec = profile.todayStudyDate === today ? profile.todayStudySeconds || 0 : 0;
    const addedStudySec = extraCounters?.studySeconds ?? 0;

    const updates: Partial<UserProfile> = {
      xp: nextXp,
      weeklyXp: nextWeeklyXp,
      weekKey: currentWeek,
      streakDays: nextStreak,
      lastStudyDate: today,
      todayStudyDate: today,
      todayStudySeconds: baseTodaySec + addedStudySec,
    };

    if (addedStudySec > 0) {
      updates.totalStudySeconds = (profile.totalStudySeconds || 0) + addedStudySec;
    }
    if (extraCounters?.cardsReviewed) {
      updates.cardsReviewedCount = (profile.cardsReviewedCount || 0) + extraCounters.cardsReviewed;
    }
    if (extraCounters?.aiQuestions) {
      updates.aiQuestionsAsked = (profile.aiQuestionsAsked || 0) + extraCounters.aiQuestions;
    }

    await updateUserProfile(updates);
  };

  const toggleLessonCompleted = async (lessonId: string, done?: boolean) => {
    if (!user || !profile) return;
    const current = profile.lessonsCompleted || [];
    const already = current.includes(lessonId);
    const shouldBeDone = done !== undefined ? done : !already;

    if (shouldBeDone === already) return;

    const nextList = shouldBeDone
      ? [...current, lessonId].slice(0, 60)
      : current.filter((id) => id !== lessonId);

    if (shouldBeDone) {
      await updateUserProfile({ lessonsCompleted: nextList });
      await awardXp(15, { studySeconds: 180 });
    } else {
      await updateUserProfile({ lessonsCompleted: nextList });
    }
  };

  const markCourseVisited = async (course: PhysicsCourse) => {
    if (!user || !profile) return;
    const existing = profile.visitedCourses || [];
    if (existing.includes(course)) return;
    const next = [...existing, course].slice(0, 3);
    const nextChecklist = { ...(profile.checklist || {}) };
    if (next.length === 3) {
      nextChecklist.open_3d_all_courses = true;
    }
    await updateUserProfile({ visitedCourses: next, checklist: nextChecklist });
  };

  const toggleChecklistItem = async (key: ChecklistKey, done?: boolean) => {
    if (!user || !profile) return;
    const current = Boolean(profile.checklist?.[key]);
    const nextValue = done !== undefined ? done : !current;
    const nextChecklist = { ...(profile.checklist || {}), [key]: nextValue };
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        checklist: nextChecklist,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const deleteAccountAndData = async () => {
    if (!user) return;
    const uid = user.uid;
    const userOwnedCollections = [
      'materials',
      'studySets',
      'quizAttempts',
      'studySessions',
      'aiMessages',
    ];

    try {
      for (const colName of userOwnedCollections) {
        const snap = await getDocs(query(collection(db, colName), where('userId', '==', uid)));
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }

      const finalBatch = writeBatch(db);
      finalBatch.delete(doc(db, 'leaderboard', uid));
      finalBatch.delete(doc(db, 'users', uid));
      await finalBatch.commit();

      await deleteUser(user);
    } catch (err) {
      const msg = formatAuthError(err);
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        clearAuthError,
        signUpWithAccount,
        signInWithAccount,
        signInWithGoogle,
        signOutUser,
        updateUserProfile,
        awardXp,
        toggleLessonCompleted,
        markCourseVisited,
        toggleChecklistItem,
        deleteAccountAndData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
