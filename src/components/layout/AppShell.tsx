import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  BellOff,
  BookOpen,
  Bot,
  Box,
  CheckCheck,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Clock,
  Flame,
  GraduationCap,
  Home,
  Layers,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trophy,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  registerStudyNotifications,
  showDueCardsNotification,
} from '../../lib/notifications';
import type { PhysicsCourse } from '../../types';
import { Logo } from '../ui/Logo';
import { OfflineBanner } from '../ui/OfflineBanner';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import sidebarLogoUrl from '../../assets/images/regenerated_image_1795533932091.jpg';

interface NavItem {
  to: string;
  label: string;
  mobileLabel: string;
  icon: React.FC<{ className?: string }>;
  end?: boolean;
}

const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Home', mobileLabel: 'Home', icon: Home, end: true },
  { to: '/lessons', label: 'Lessons', mobileLabel: 'Lessons', icon: GraduationCap },
  { to: '/study', label: 'Study Hub', mobileLabel: 'Study', icon: BookOpen },
  { to: '/visualizer', label: '3D Visualizer', mobileLabel: '3D Sim', icon: Box },
  { to: '/ai', label: 'AI Tutor', mobileLabel: 'AI Tutor', icon: Bot },
];

const SIDEBAR_NAV: NavItem[] = [
  ...MOBILE_NAV,
  { to: '/profile', label: 'Profile', mobileLabel: 'Profile', icon: User },
  { to: '/checklist', label: 'Study Week', mobileLabel: 'Checklist', icon: CheckSquare },
];

const COURSE_SWATCH: Record<PhysicsCourse, string> = {
  'Physics 1': 'bg-blue-600',
  'Physics 2': 'bg-amber-500',
  'Physics 3': 'bg-sky-500',
};

export const AppShell: React.FC = () => {
  const { profile, updateUserProfile, toggleChecklistItem, signOutUser } = useAuth();
  const {
    studySets,
    dueTodayCount,
    notifications,
    unreadCount,
    bellOpen,
    setBellOpen,
    selectedNotifId,
    selectNotification,
    openBellWithNotification,
    markAllAsRead,
    pushCustomNotification,
  } = useNotifications();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showDeckSearch, setShowDeckSearch] = useState(false);
  const [deckQuery, setDeckQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reminderTimeInput, setReminderTimeInput] = useState(profile?.notificationTime || '19:00');
  const [reminderFeedback, setReminderFeedback] = useState<string | null>(null);
  const [reminderBusy, setReminderBusy] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const desktopBellRef = useRef<HTMLDivElement | null>(null);
  const mobileBellRef = useRef<HTMLDivElement | null>(null);
  const desktopBellBtnRef = useRef<HTMLButtonElement | null>(null);
  const mobileBellBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (profile?.notificationTime) {
      setReminderTimeInput(profile.notificationTime);
    }
  }, [profile?.notificationTime]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openBell') === '1') {
      const notifParam = params.get('notif') || undefined;
      openBellWithNotification(notifParam);
      params.delete('openBell');
      params.delete('notif');
      const nextSearch = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true }
      );
    }
  }, [location.pathname, location.search, navigate, openBellWithNotification]);

  useEffect(() => {
    if (!bellOpen) return;
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;
    const btn = isDesktop ? desktopBellBtnRef.current : mobileBellBtnRef.current;
    btn?.focus({ preventScroll: true });
  }, [bellOpen]);

  useEffect(() => {
    if (!menuOpen && !bellOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuOpen && menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (
        bellOpen &&
        !(desktopBellRef.current && desktopBellRef.current.contains(target)) &&
        !(mobileBellRef.current && mobileBellRef.current.contains(target))
      ) {
        setBellOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen, bellOpen]);

  const filteredSets = useMemo(() => {
    const q = deckQuery.trim().toLowerCase();
    if (!q) return studySets;
    return studySets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.course.toLowerCase().includes(q)
    );
  }, [studySets, deckQuery]);

  const handleToggleTheme = () => {
    const next = !darkMode;
    toggleDarkMode();
    if (profile) {
      void updateUserProfile({ darkMode: next });
      void toggleChecklistItem('try_tts_darkmode', true);
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
      setReminderFeedback(res.message);
    } finally {
      setReminderBusy(false);
    }
  };

  const displayName = profile?.nickname || profile?.username || 'Student';
  const nicknameInitial = displayName.charAt(0).toUpperCase();
  const streakDays = profile?.streakDays ?? 0;
  const remindersEnabled = Boolean(profile?.notificationsEnabled);
  const selectedNotif = selectedNotifId
    ? notifications.find((n) => n.id === selectedNotifId) || null
    : null;

  const formatNotifAge = (ts: number) => {
    const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  };

  const renderReminderPopover = () => (
    <div
      role="dialog"
      aria-label="Notifications and Study Reminders"
      className="animate-pop origin-top-right absolute right-0 mt-2 w-88 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-white dark:bg-[#141416] border border-stone-200 dark:border-neutral-800 shadow-xl overflow-hidden z-40"
    >
      <div className="px-4 py-3 border-b border-stone-100 dark:border-neutral-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
          <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
            Notifications
          </p>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold tabular-nums">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Mark all read</span>
          </button>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              remindersEnabled
                ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                : 'bg-stone-100 text-slate-600 dark:bg-neutral-800 dark:text-neutral-400'
            }`}
          >
            {remindersEnabled ? `Daily ${profile?.notificationTime || '19:00'}` : 'All caught up'}
          </span>
        )}
      </div>

      <div className="p-3.5 space-y-3">
        {selectedNotif ? (
          <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => selectNotification(null)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                <span>All notifications</span>
              </button>
              <span className="text-[11px] text-slate-500 dark:text-neutral-400">
                {formatNotifAge(selectedNotif.createdAt)}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-950 dark:text-neutral-100">
                {selectedNotif.title}
              </p>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-neutral-200">
                {selectedNotif.message}
              </p>
            </div>
            {selectedNotif.actionTo && (
              <Link
                to={selectedNotif.actionTo}
                onClick={() => {
                  selectNotification(null);
                  setBellOpen(false);
                }}
                className="inline-flex items-center justify-center w-full min-h-[36px] px-3 rounded-lg bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-xs font-semibold transition-colors"
              >
                {selectedNotif.actionLabel || 'Open'}
              </Link>
            )}
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-xl bg-[#FAF9F6] dark:bg-neutral-900 border border-stone-200/80 dark:border-neutral-800 p-3 text-center space-y-1">
            <p className="text-xs font-bold text-slate-900 dark:text-neutral-100">
              No notifications yet
            </p>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400">
              Due flashcards, daily study reminders, and next lessons will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
            {notifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => selectNotification(notif.id)}
                className={`w-full text-left rounded-xl p-2.5 border transition-colors cursor-pointer flex items-start gap-2.5 ${
                  notif.unread
                    ? 'bg-blue-50/75 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/60 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                    : 'bg-[#FAF9F6] dark:bg-neutral-900/70 border-stone-200/70 dark:border-neutral-800 hover:bg-stone-100/70 dark:hover:bg-neutral-800/80'
                }`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    notif.unread ? 'bg-blue-600 dark:bg-blue-400' : 'bg-stone-300 dark:bg-neutral-700'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        notif.unread
                          ? 'font-bold text-slate-950 dark:text-neutral-100'
                          : 'font-semibold text-slate-700 dark:text-neutral-300'
                      }`}
                    >
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-slate-400 dark:text-neutral-500 shrink-0">
                      {formatNotifAge(notif.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-neutral-400 line-clamp-2 leading-snug">
                    {notif.message}
                  </p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-1" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}

        <div className="pt-2 border-t border-stone-100 dark:border-neutral-800 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                Daily Reminder
              </p>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                Prompts you at your study time
              </p>
            </div>
            <button
              type="button"
              disabled={reminderBusy}
              onClick={() => void handleToggleReminder()}
              className={`min-h-[32px] px-3 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-60 ${
                remindersEnabled
                  ? 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500'
                  : 'bg-stone-100 text-slate-700 hover:bg-stone-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {remindersEnabled ? (
                <>
                  <Bell className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>On</span>
                </>
              ) : (
                <>
                  <BellOff className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Enable</span>
                </>
              )}
            </button>
          </div>

          <form onSubmit={handleSaveReminderTime} className="flex items-center gap-2">
            <label className="sr-only" htmlFor="bell-reminder-time">
              Reminder Time
            </label>
            <div className="relative flex-1">
              <Clock
                className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="bell-reminder-time"
                type="time"
                value={reminderTimeInput}
                onChange={(e) => setReminderTimeInput(e.target.value)}
                className="w-full h-9 pl-8 pr-2 rounded-lg border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-900 text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <button
              type="submit"
              disabled={reminderBusy}
              className="h-9 px-3 rounded-lg border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-60"
            >
              Save
            </button>
          </form>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              disabled={reminderBusy}
              onClick={() => void handleSendTestReminder()}
              className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-60"
            >
              Send Test Reminder
            </button>
            <Link
              to="/profile?tab=reminders"
              onClick={() => setBellOpen(false)}
              className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100"
            >
              All settings
            </Link>
          </div>

          {reminderFeedback && (
            <p className="text-[11px] leading-snug rounded-lg bg-stone-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 px-2.5 py-2">
              {reminderFeedback}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF9F6] dark:bg-[#0B0B0C] text-slate-900 dark:text-neutral-100 flex flex-col lg:flex-row">
      <OfflineBanner />

      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white dark:bg-[#141416] border-r border-stone-200/90 dark:border-neutral-800 z-30">
        <div className="h-16 px-5 flex items-center justify-between">
          <NavLink to="/" className="focus-visible:outline-none">
            <Logo size="sm" src={sidebarLogoUrl} />
          </NavLink>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            {profile?.course || 'Physics 1'}
          </span>
        </div>

        {/* Primary Nav + Study / + Add CTAs */}
        <div className="px-3 space-y-4">
          <nav className="space-y-1" aria-label="Main navigation">
            {SIDEBAR_NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 min-h-[42px] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300'
                      : 'text-slate-600 dark:text-neutral-300 hover:bg-stone-100/80 dark:hover:bg-neutral-800/70 hover:text-slate-900 dark:hover:text-neutral-100'
                  }`
                }
              >
                <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="space-y-2 pt-1">
            <Link
              to="/study?tab=flashcards"
              className="w-full min-h-[44px] px-4 rounded-full bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-sm font-semibold flex items-center justify-center gap-2 transition-[transform,background-color] duration-150 active:scale-[0.97] shadow-xs"
            >
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Study Flashcards</span>
            </Link>
            <Link
              to="/study?tab=materials"
              className="w-full min-h-[42px] px-4 rounded-full bg-white text-slate-800 hover:bg-stone-50 border border-stone-200 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800 text-sm font-semibold flex items-center justify-center gap-1.5 transition-[transform,background-color] duration-150 active:scale-[0.97]"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Add Material</span>
            </Link>
          </div>
        </div>

        {/* Scrollable "My study sets" Quick-Jump List */}
        <div className="mt-4 pt-4 border-t border-stone-200/80 dark:border-neutral-800 flex-1 flex flex-col min-h-0 px-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-neutral-300">
              My study sets
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Search study sets"
                onClick={() => {
                  setShowDeckSearch((v) => !v);
                  if (showDeckSearch) setDeckQuery('');
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-stone-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                {showDeckSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
              <Link
                to="/study?tab=materials"
                aria-label="Create new study set"
                className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-stone-100 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {showDeckSearch && (
            <div className="px-1 mb-2">
              <input
                type="search"
                value={deckQuery}
                onChange={(e) => setDeckQuery(e.target.value)}
                placeholder="Filter sets..."
                aria-label="Filter study sets"
                className="w-full h-9 rounded-lg border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-900 px-2.5 text-xs text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-0.5 pb-3 pr-0.5">
            {filteredSets.length === 0 ? (
              <div className="px-2 py-3 text-xs text-slate-500 dark:text-neutral-400 space-y-1.5">
                <p>
                  {studySets.length === 0
                    ? 'No study sets yet. Open a built-in lesson or upload notes.'
                    : 'No matching study sets.'}
                </p>
                {studySets.length === 0 && (
                  <Link
                    to="/lessons"
                    className="inline-block font-semibold text-blue-700 dark:text-blue-400 hover:underline"
                  >
                    Browse 47 Lessons
                  </Link>
                )}
              </div>
            ) : (
              filteredSets.map((set) => (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => navigate(`/study?tab=flashcards&setId=${encodeURIComponent(set.id)}`)}
                  title={`${set.title} (${set.course})`}
                  className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-stone-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
                >
                  <span
                    className={`h-3 w-3 rounded-[3px] shrink-0 ${COURSE_SWATCH[set.course] || 'bg-blue-600'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{set.title}</span>
                </button>
              ))
            )}
          </div>

          {/* Bottom Sidebar Lesson Progress Card */}
          <div className="mb-3 p-3 rounded-2xl bg-[#FAF9F6] dark:bg-neutral-900/90 border border-stone-200/90 dark:border-neutral-800 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-neutral-100">Lessons Done</span>
              <span className="font-semibold text-slate-500 dark:text-neutral-400 tabular-nums">
                {(profile?.lessonsCompleted || []).length}/47
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((profile?.lessonsCompleted || []).length / 47) * 100)
                  )}%`,
                }}
              />
            </div>
            <Link
              to="/lessons"
              className="w-full min-h-[34px] px-3 rounded-full bg-white dark:bg-[#141416] border border-stone-200 dark:border-neutral-700 text-xs font-semibold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors"
            >
              Continue Lessons
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-white/95 dark:bg-[#141416]/95 border-b border-stone-200/90 dark:border-neutral-800 px-3 sm:px-4 flex items-center justify-between">
        <NavLink to="/" className="focus-visible:outline-none">
          <Logo size="sm" />
        </NavLink>

        <div className="flex items-center gap-1.5">
          <Link
            to="/study?tab=progress"
            title="Daily study streak"
            className="min-h-[36px] px-2.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-xs font-bold text-amber-800 dark:text-amber-300 inline-flex items-center gap-1 tabular-nums"
          >
            <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            <span>{streakDays}</span>
          </Link>
          <Link
            to="/study?tab=progress"
            title="Total XP"
            className="min-h-[36px] px-2.5 rounded-full bg-stone-100 dark:bg-neutral-800 text-xs font-bold text-slate-800 dark:text-neutral-100 inline-flex items-center gap-1 tabular-nums"
          >
            <Trophy className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <span>{profile?.xp ?? 0}</span>
          </Link>
          <PWAInstallButton compact />
          <div className="relative" ref={mobileBellRef}>
            <button
              ref={mobileBellBtnRef}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                selectNotification(null);
                setBellOpen((o) => !o);
              }}
              aria-expanded={bellOpen}
              aria-label={`Notifications (${unreadCount} unread)`}
              className="relative min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : remindersEnabled ? (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
              ) : null}
            </button>
            {bellOpen && renderReminderPopover()}
          </div>
          <button
            type="button"
            onClick={handleToggleTheme}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <Link
            to="/profile"
            aria-label="Open Profile & Settings"
            className="h-9 w-9 rounded-full bg-blue-700 dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0"
          >
            {nicknameInitial}
          </Link>
        </div>
      </header>

      {/* Right Workspace Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Desktop Top Utility Strip */}
        <header className="hidden lg:flex items-center justify-end gap-2.5 px-8 pt-4 pb-1">
          <Link
            to="/study?tab=progress"
            title="Current daily study streak"
            className="h-10 px-3.5 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors tabular-nums"
          >
            <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>{streakDays}d streak</span>
          </Link>

          <Link
            to="/study?tab=flashcards"
            className="h-10 px-3.5 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors tabular-nums"
          >
            <Layers className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <span>{dueTodayCount} due today</span>
          </Link>

          <Link
            to="/study?tab=progress"
            className="h-10 px-3.5 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-neutral-100 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors tabular-nums"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>{profile?.xp ?? 0} XP</span>
          </Link>

          <div className="relative" ref={desktopBellRef}>
            <button
              ref={desktopBellBtnRef}
              type="button"
              onClick={() => {
                setMenuOpen(false);
                selectNotification(null);
                setBellOpen((o) => !o);
              }}
              aria-expanded={bellOpen}
              aria-label={`Notifications (${unreadCount} unread)`}
              title={
                unreadCount > 0
                  ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} — click to read`
                  : 'Notifications & study reminders'
              }
              className="relative h-10 w-10 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] inline-flex items-center justify-center text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              ) : remindersEnabled ? (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400" />
              ) : null}
            </button>
            {bellOpen && renderReminderPopover()}
          </div>

          {/* User Avatar & Profile Dropdown */}
          <div className="relative" ref={menuContainerRef}>
            <button
              type="button"
              onClick={() => {
                setBellOpen(false);
                setMenuOpen((o) => !o);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              className="h-10 pl-1.5 pr-2.5 rounded-full bg-white dark:bg-[#141416] border border-stone-200/90 dark:border-neutral-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)] inline-flex items-center gap-1.5 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <span className="h-7 w-7 rounded-full bg-blue-700 dark:bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {nicknameInitial}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 dark:text-neutral-400" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="animate-pop origin-top-right absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#141416] border border-stone-200 dark:border-neutral-800 shadow-lg overflow-hidden z-40"
              >
                <div className="px-4 py-3 border-b border-stone-100 dark:border-neutral-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                    Grade 12 · {profile?.course || 'Physics 1'}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span>Profile &amp; Course</span>
                    <User className="h-4 w-4 text-slate-400 dark:text-neutral-500" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/profile?tab=reminders"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span>Reminder Settings</span>
                    <Settings className="h-4 w-4 text-slate-400 dark:text-neutral-500" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/checklist"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <span>Study Week Checklist</span>
                    <CheckSquare className="h-4 w-4 text-slate-400 dark:text-neutral-500" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleToggleTheme();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
                    {darkMode ? (
                      <Sun className="h-4 w-4 text-slate-400 dark:text-neutral-400" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOutUser();
                  }}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold bg-[#0F172A] text-white hover:bg-[#1E293B] dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
                >
                  <span>Sign Out</span>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 pb-24 lg:pb-10">
          <div key={location.pathname} className="animate-enter max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Fixed 5-Tab Bottom Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#141416]/95 border-t border-stone-200/90 dark:border-neutral-800 pb-safe"
      >
        <div className="grid grid-cols-5 h-16">
          {MOBILE_NAV.map(({ to, mobileLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-full px-1">{mobileLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
