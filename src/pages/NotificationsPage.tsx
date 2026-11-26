import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellOff,
  BookOpen,
  CheckCheck,
  ChevronRight,
  Clock,
  Flame,
  Layers,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications, type AppNotification } from '../contexts/NotificationContext';
import {
  registerStudyNotifications,
  showDueCardsNotification,
} from '../lib/notifications';
import { playUiSound } from '../lib/sound';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

function formatNotifAge(ts: number): string {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.max(1, Math.round(days / 30));
  return `${months}mo ago`;
}

function getCategoryVisual(category: AppNotification['category']) {
  switch (category) {
    case 'due':
      return {
        icon: Layers,
        bgClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
      };
    case 'reminder':
      return {
        icon: Bell,
        bgClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
      };
    case 'goal':
      return {
        icon: Clock,
        bgClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
      };
    case 'lesson':
      return {
        icon: BookOpen,
        bgClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
      };
    case 'streak':
    default:
      return {
        icon: Flame,
        bgClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      };
  }
}

export const NotificationsPage: React.FC = () => {
  const { profile, updateUserProfile, toggleChecklistItem } = useAuth();
  const {
    dueTodayCount,
    notifications,
    unreadCount,
    selectedNotifId,
    selectNotification,
    markAsRead,
    markAllAsRead,
    pushCustomNotification,
  } = useNotifications();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reminderTimeInput, setReminderTimeInput] = useState(profile?.notificationTime || '19:00');
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);

  const highlightedId = searchParams.get('notif') || selectedNotifId;

  useEffect(() => {
    if (profile?.notificationTime) {
      setReminderTimeInput(profile.notificationTime);
    }
  }, [profile?.notificationTime]);

  useEffect(() => {
    const paramNotif = searchParams.get('notif');
    if (paramNotif) {
      selectNotification(paramNotif);
    }
  }, [searchParams, selectNotification]);

  const handleBack = () => {
    playUiSound('click');
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleNotificationClick = (notif: AppNotification) => {
    playUiSound('click');
    markAsRead(notif.id);
    if (searchParams.has('notif')) {
      setSearchParams({}, { replace: true });
    }
    if (notif.actionTo) {
      navigate(notif.actionTo);
    }
  };

  const handleToggleReminder = async () => {
    if (!profile) return;
    setReminderBusy(true);
    setReminderFeedback(null);
    try {
      const nextEnabled = !profile.notificationsEnabled;
      if (nextEnabled) {
        const res = await registerStudyNotifications();
        await updateUserProfile({
          notificationsEnabled: true,
          notificationTime: reminderTimeInput || '19:00',
          ...(res.fcmToken ? { fcmToken: res.fcmToken } : {}),
        });
        void toggleChecklistItem('enable_notifications', true);
        setReminderFeedback(
          res.granted
            ? `Daily reminders turned on for ${reminderTimeInput || '19:00'}.`
            : `In-app reminders turned on for ${reminderTimeInput || '19:00'}. (${res.note})`
        );
      } else {
        await updateUserProfile({
          notificationsEnabled: false,
          notificationTime: reminderTimeInput || '19:00',
        });
        setReminderFeedback('Daily study reminders paused.');
      }
      playUiSound('success');
    } catch (err) {
      setReminderFeedback(
        err instanceof Error ? err.message : 'Could not update reminder settings.'
      );
    } finally {
      setReminderBusy(false);
    }
  };

  const handleSaveReminderTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setReminderBusy(true);
    setReminderFeedback(null);
    try {
      await updateUserProfile({
        notificationTime: reminderTimeInput || '19:00',
        notificationsEnabled: true,
      });
      void toggleChecklistItem('enable_notifications', true);
      playUiSound('success');
      setReminderFeedback(`Reminder time updated to ${reminderTimeInput || '19:00'}.`);
    } catch (err) {
      setReminderFeedback(
        err instanceof Error ? err.message : 'Could not save reminder time.'
      );
    } finally {
      setReminderBusy(false);
    }
  };

  const handleSendTestReminder = async () => {
    setReminderBusy(true);
    setReminderFeedback(null);
    try {
      const title = 'Study Reminder Alert';
      const body =
        dueTodayCount > 0
          ? `You have ${dueTodayCount} flashcard${dueTodayCount === 1 ? '' : 's'} due today. Quick spaced-repetition rounds build lasting Physics mastery!`
          : `Ready for your daily Grade 12 ${profile?.course || 'Physics 1'} session! Kaya mo 'yan!`;
      const newId = pushCustomNotification({
        title,
        message: body,
        category: 'reminder',
        actionLabel: dueTodayCount > 0 ? 'Review Due Cards' : 'Open Study Hub',
        actionTo: dueTodayCount > 0 ? '/study?tab=flashcards' : '/study?tab=timer',
      });
      const res = await showDueCardsNotification(dueTodayCount, title, body, newId);
      playUiSound('success');
      setReminderFeedback(res.message);
    } finally {
      setReminderBusy(false);
    }
  };

  const remindersEnabled = Boolean(profile?.notificationsEnabled);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Top Bar: Back Button + Centered Title + Action */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="h-11 w-11 rounded-full liquid-glass flex items-center justify-center text-slate-800 dark:text-white hover:scale-105 active:scale-95 transition-transform cursor-pointer shrink-0"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="text-center min-w-0">
          <h1 className="font-display text-lg sm:text-xl font-bold text-slate-950 dark:text-white truncate">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : remindersEnabled
              ? `Daily reminder at ${profile?.notificationTime || '19:00'}`
              : 'All caught up'}
          </p>
        </div>

        <div className="shrink-0 min-w-[44px] flex justify-end">
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => {
                playUiSound('click');
                markAllAsRead();
              }}
              className="min-h-[40px] px-3.5 rounded-full liquid-glass text-xs font-semibold text-[#007AFF] dark:text-[#4DA3FF] hover:scale-[1.02] active:scale-[0.97] inline-flex items-center gap-1.5 transition-transform cursor-pointer whitespace-nowrap"
            >
              <CheckCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read all</span>
            </button>
          ) : (
            <Link
              to="/profile?tab=reminders"
              aria-label="Notification Settings"
              className="h-11 w-11 rounded-full liquid-glass flex items-center justify-center text-slate-700 dark:text-slate-100 hover:scale-105 active:scale-95 transition-transform"
            >
              <Settings className="h-4.5 w-4.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>

      {/* Full-Width Clean Notification Feed */}
      <Card padding="none" className="overflow-hidden">
        {notifications.length === 0 ? (
          <div className="px-6 py-12 text-center space-y-2">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-white/70 dark:bg-white/10 backdrop-blur-md flex items-center justify-center text-slate-500 dark:text-slate-400">
              <Bell className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="text-base font-bold text-slate-900 dark:text-white">
              No notifications yet
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Due flashcards, daily study reminders, streaks, and upcoming Physics lessons will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/10">
            {notifications.map((notif) => {
              const { icon: Icon, bgClass } = getCategoryVisual(notif.category);
              const isHighlighted = highlightedId === notif.id;

              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => handleNotificationClick(notif)}
                  className={`w-full text-left px-4 sm:px-5 py-4 flex items-start gap-3.5 transition-colors cursor-pointer ${
                    isHighlighted
                      ? 'bg-[#007AFF]/14 dark:bg-[#0A84FF]/22'
                      : notif.unread
                      ? 'bg-[#007AFF]/7 dark:bg-[#0A84FF]/12 hover:bg-[#007AFF]/12 dark:hover:bg-[#0A84FF]/18'
                      : 'bg-transparent hover:bg-white/45 dark:hover:bg-white/6'
                  }`}
                >
                  {/* Avatar / Icon + Unread Dot */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`h-11 w-11 rounded-full flex items-center justify-center ${bgClass}`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    {notif.unread && (
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#007AFF] dark:bg-[#4DA3FF] ring-2 ring-white/90 dark:ring-[#12192E]"
                        aria-label="Unread"
                      />
                    )}
                  </div>

                  {/* Clean Full-Width Message Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm sm:text-base leading-snug ${
                          notif.unread
                            ? 'font-bold text-slate-950 dark:text-neutral-100'
                            : 'font-semibold text-slate-800 dark:text-neutral-200'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <ChevronRight
                        className="h-4 w-4 text-slate-400 dark:text-neutral-500 shrink-0 mt-1"
                        aria-hidden="true"
                      />
                    </div>

                    <p className="text-sm text-slate-600 dark:text-neutral-300 leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs text-slate-500 dark:text-neutral-400">
                      <span className="tabular-nums">{formatNotifAge(notif.createdAt)}</span>
                      {notif.actionLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-blue-700 dark:text-blue-400">
                            {notif.actionLabel}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Daily Study Reminder Controls */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-slate-950 dark:text-neutral-100">
              Daily Study Reminder
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400">
              Prompts you at your study time each day
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={remindersEnabled ? 'primary' : 'outline'}
            loading={reminderBusy}
            icon={
              remindersEnabled ? (
                <Bell className="h-4 w-4" aria-hidden="true" />
              ) : (
                <BellOff className="h-4 w-4" aria-hidden="true" />
              )
            }
            onClick={() => void handleToggleReminder()}
          >
            {remindersEnabled ? 'On' : 'Enable'}
          </Button>
        </div>

        <form onSubmit={handleSaveReminderTime} className="flex items-center gap-2.5">
          <label className="sr-only" htmlFor="notifications-reminder-time">
            Reminder Time
          </label>
          <div className="relative flex-1">
            <Clock
              className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="notifications-reminder-time"
              type="time"
              value={reminderTimeInput}
              onChange={(e) => setReminderTimeInput(e.target.value)}
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-900 text-sm font-semibold text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>
          <Button type="submit" variant="outline" size="md" disabled={reminderBusy}>
            Save
          </Button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <button
            type="button"
            disabled={reminderBusy}
            onClick={() => void handleSendTestReminder()}
            className="min-h-[40px] text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-60"
          >
            Send Test Reminder
          </button>
          <Link
            to="/profile?tab=reminders"
            className="min-h-[40px] inline-flex items-center text-xs sm:text-sm font-medium text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100"
          >
            All reminder settings
          </Link>
        </div>

        {reminderFeedback && (
          <p className="text-xs sm:text-sm leading-relaxed rounded-xl bg-stone-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 px-3.5 py-2.5">
            {reminderFeedback}
          </p>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage;
