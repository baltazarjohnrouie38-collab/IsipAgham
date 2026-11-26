import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth, getLocalDateKey } from './AuthContext';
import { ALL_LESSONS } from '../data/lessons';
import { showDueCardsNotification } from '../lib/notifications';
import { subscribeStudySets } from '../lib/studyService';
import type { StudySet } from '../types';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'due' | 'reminder' | 'goal' | 'lesson' | 'streak';
  createdAt: number;
  actionLabel?: string;
  actionTo?: string;
  unread: boolean;
}

interface StoredEventNotification {
  id: string;
  title: string;
  message: string;
  category: AppNotification['category'];
  createdAt: number;
  actionLabel?: string;
  actionTo?: string;
}

interface NotificationContextValue {
  studySets: StudySet[];
  dueTodayCount: number;
  reminderTriggeredToday: boolean;
  notifications: AppNotification[];
  unreadCount: number;
  bellOpen: boolean;
  setBellOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedNotifId: string | null;
  selectNotification: (id: string | null) => void;
  openBellWithNotification: (id?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  pushCustomNotification: (input: {
    id?: string;
    title: string;
    message: string;
    category?: AppNotification['category'];
    actionLabel?: string;
    actionTo?: string;
  }) => string;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

function readStorageArray<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeStorageArray<T>(key: string, value: T[]): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota failures
  }
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [selectedNotifId, setSelectedNotifId] = useState<string | null>(null);
  const [reminderTriggeredToday, setReminderTriggeredToday] = useState(false);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [storedEvents, setStoredEvents] = useState<StoredEventNotification[]>([]);

  const readKey = user ? `isipagham_notif_read_${user.uid}` : '';
  const eventsKey = user ? `isipagham_notif_events_${user.uid}` : '';

  useEffect(() => {
    if (!user) {
      setStudySets([]);
      setReadIds([]);
      setStoredEvents([]);
      return;
    }
    setReadIds(readStorageArray<string>(`isipagham_notif_read_${user.uid}`));
    setStoredEvents(readStorageArray<StoredEventNotification>(`isipagham_notif_events_${user.uid}`));
    return subscribeStudySets(user.uid, setStudySets);
  }, [user]);

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

  const pushCustomNotification = useCallback(
    (input: {
      id?: string;
      title: string;
      message: string;
      category?: AppNotification['category'];
      actionLabel?: string;
      actionTo?: string;
    }) => {
      const id =
        input.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const entry: StoredEventNotification = {
        id,
        title: input.title,
        message: input.message,
        category: input.category || 'reminder',
        createdAt: Date.now(),
        actionLabel: input.actionLabel,
        actionTo: input.actionTo,
      };
      setStoredEvents((prev) => {
        const next = [entry, ...prev.filter((e) => e.id !== id)].slice(0, 15);
        if (eventsKey) writeStorageArray(eventsKey, next);
        return next;
      });
      setReadIds((prev) => {
        if (!prev.includes(id)) return prev;
        const next = prev.filter((r) => r !== id);
        if (readKey) writeStorageArray(readKey, next);
        return next;
      });
      return id;
    },
    [eventsKey, readKey]
  );

  // Trigger scheduled daily check-in notification at/after configured time
  useEffect(() => {
    if (!user || !profile?.notificationsEnabled || !profile.notificationTime) {
      setReminderTriggeredToday(false);
      return;
    }

    const checkReminder = () => {
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const localDate = getLocalDateKey(now);
      const todayKey = `isipagham_notified_${user.uid}_${localDate}`;
      if (hhmm >= profile.notificationTime) {
        setReminderTriggeredToday(true);
        if (!window.localStorage.getItem(todayKey)) {
          window.localStorage.setItem(todayKey, '1');
          const id = `daily-checkin-${localDate}`;
          const body =
            dueTodayCount > 0
              ? `It's ${profile.notificationTime}! You have ${dueTodayCount} flashcard${dueTodayCount === 1 ? '' : 's'} due today. Kaya mo 'yan!`
              : `It's ${profile.notificationTime} — time for your daily Grade 12 ${profile.course || 'Physics 1'} check-in!`;
          pushCustomNotification({
            id,
            title: 'Daily Physics Check-In',
            message: body,
            category: 'reminder',
            actionLabel: dueTodayCount > 0 ? 'Review Due Cards' : 'Open Study Hub',
            actionTo: dueTodayCount > 0 ? '/study?tab=flashcards' : '/study?tab=timer',
          });
          void showDueCardsNotification(dueTodayCount, 'IsipAgham Daily Reminder', body, id);
        }
      }
    };

    checkReminder();
    const timer = window.setInterval(checkReminder, 20000);
    return () => window.clearInterval(timer);
  }, [
    user,
    profile?.notificationsEnabled,
    profile?.notificationTime,
    profile?.course,
    dueTodayCount,
    pushCustomNotification,
  ]);

  const notifications = useMemo<AppNotification[]>(() => {
    const readSet = new Set(readIds);
    const items: StoredEventNotification[] = [];
    const todayKey = getLocalDateKey();

    if (dueTodayCount > 0) {
      items.push({
        id: `due-today-${todayKey}-${dueTodayCount}`,
        title: `${dueTodayCount} Flashcard${dueTodayCount === 1 ? '' : 's'} Due Today`,
        message: `You have ${dueTodayCount} physics flashcard${dueTodayCount === 1 ? '' : 's'} ready for SM-2 spaced-repetition review. Short rounds keep formulas sharp for exams!`,
        category: 'due',
        createdAt: Date.now() - 60_000,
        actionLabel: 'Review Due Cards',
        actionTo: '/study?tab=flashcards',
      });
    }

    const todaySeconds =
      profile?.todayStudyDate === todayKey ? profile.todayStudySeconds || 0 : 0;
    const todayMinutes = Math.round(todaySeconds / 60);
    const dailyGoalMinutes = profile?.dailyGoalMinutes || 15;
    if (todayMinutes < dailyGoalMinutes) {
      const remaining = Math.max(1, dailyGoalMinutes - todayMinutes);
      items.push({
        id: `goal-progress-${todayKey}`,
        title: `${remaining}m Left on Today's Goal`,
        message: `You have logged ${todayMinutes} of ${dailyGoalMinutes} minutes today. Start a calm Pomodoro focus timer or a quick quiz to finish your daily study goal.`,
        category: 'goal',
        createdAt: Date.now() - 180_000,
        actionLabel: 'Start Focus Timer',
        actionTo: '/study?tab=timer',
      });
    }

    const doneSet = new Set(profile?.lessonsCompleted || []);
    const nextLesson = ALL_LESSONS.find((l) => !doneSet.has(l.id));
    if (nextLesson) {
      items.push({
        id: `next-lesson-${nextLesson.id}`,
        title: `Up Next: ${nextLesson.code} ${nextLesson.title}`,
        message: `Continue ${nextLesson.course}: ${nextLesson.objective}`,
        category: 'lesson',
        createdAt: Date.now() - 300_000,
        actionLabel: 'Open Lesson',
        actionTo: `/lessons/${nextLesson.id}`,
      });
    }

    if ((profile?.streakDays ?? 0) > 0) {
      items.push({
        id: `streak-${todayKey}-${profile?.streakDays}`,
        title: `${profile?.streakDays}-Day Physics Streak`,
        message: `Keep your ${profile?.streakDays}-day study streak going! Reviewing even one card or reading one lesson step counts today.`,
        category: 'streak',
        createdAt: Date.now() - 420_000,
        actionLabel: 'View Progress',
        actionTo: '/study?tab=progress',
      });
    }

    const combined = [...storedEvents, ...items];
    const seen = new Set<string>();
    const deduped: AppNotification[] = [];
    for (const item of combined) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push({
        ...item,
        unread: !readSet.has(item.id),
      });
    }
    return deduped;
  }, [
    readIds,
    dueTodayCount,
    profile?.todayStudyDate,
    profile?.todayStudySeconds,
    profile?.dailyGoalMinutes,
    profile?.lessonsCompleted,
    profile?.streakDays,
    storedEvents,
  ]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.unread).length,
    [notifications]
  );

  const markAsRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.includes(id)) return prev;
        const next = [...prev, id].slice(-60);
        if (readKey) writeStorageArray(readKey, next);
        return next;
      });
    },
    [readKey]
  );

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setReadIds((prev) => {
      const merged = Array.from(new Set([...prev, ...allIds])).slice(-80);
      if (readKey) writeStorageArray(readKey, merged);
      return merged;
    });
  }, [notifications, readKey]);

  const selectNotification = useCallback(
    (id: string | null) => {
      setSelectedNotifId(id);
      if (id) {
        markAsRead(id);
      }
    },
    [markAsRead]
  );

  const openBellWithNotification = useCallback(
    (id?: string) => {
      const targetId =
        id ||
        notifications.find((n) => n.unread)?.id ||
        notifications[0]?.id ||
        null;
      setBellOpen(true);
      if (targetId) {
        setSelectedNotifId(targetId);
        markAsRead(targetId);
      } else {
        setSelectedNotifId(null);
      }
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [notifications, markAsRead]
  );

  // Listen for OS/home-screen notification clicks (foreground custom event & SW postMessage)
  useEffect(() => {
    const handleOpenBellEvent = (ev: Event) => {
      const custom = ev as CustomEvent<{ notifId?: string | null; title?: string; body?: string }>;
      const detail = custom.detail || {};
      if (detail.notifId) {
        openBellWithNotification(detail.notifId);
      } else if (detail.title && detail.body) {
        const newId = pushCustomNotification({
          title: detail.title,
          message: detail.body,
          category: 'reminder',
          actionLabel: dueTodayCount > 0 ? 'Review Due Cards' : 'Open Study Hub',
          actionTo: dueTodayCount > 0 ? '/study?tab=flashcards' : '/study?tab=timer',
        });
        openBellWithNotification(newId);
      } else {
        openBellWithNotification();
      }
    };

    const handleSwMessage = (ev: MessageEvent) => {
      const data = ev.data as {
        type?: string;
        notifId?: string | null;
        title?: string | null;
        body?: string | null;
      } | null;
      if (!data || data.type !== 'OPEN_NOTIFICATION_BELL') return;
      if (data.notifId) {
        openBellWithNotification(data.notifId);
      } else if (data.title && data.body) {
        const newId = pushCustomNotification({
          title: data.title,
          message: data.body,
          category: 'reminder',
          actionLabel: dueTodayCount > 0 ? 'Review Due Cards' : 'Open Study Hub',
          actionTo: dueTodayCount > 0 ? '/study?tab=flashcards' : '/study?tab=timer',
        });
        openBellWithNotification(newId);
      } else {
        openBellWithNotification();
      }
    };

    window.addEventListener('isipagham:open-bell', handleOpenBellEvent);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
    }
    return () => {
      window.removeEventListener('isipagham:open-bell', handleOpenBellEvent);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      }
    };
  }, [openBellWithNotification, pushCustomNotification, dueTodayCount]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      studySets,
      dueTodayCount,
      reminderTriggeredToday,
      notifications,
      unreadCount,
      bellOpen,
      setBellOpen,
      selectedNotifId,
      selectNotification,
      openBellWithNotification,
      markAsRead,
      markAllAsRead,
      pushCustomNotification,
    }),
    [
      studySets,
      dueTodayCount,
      reminderTriggeredToday,
      notifications,
      unreadCount,
      bellOpen,
      selectedNotifId,
      selectNotification,
      openBellWithNotification,
      markAsRead,
      markAllAsRead,
      pushCustomNotification,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return ctx;
}
