import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckSquare,
  ChevronDown,
  Flame,
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
import { ALL_LESSONS } from '../../data/lessons';
import type { PhysicsCourse } from '../../types';
import { Logo } from '../ui/Logo';
import { OfflineBanner } from '../ui/OfflineBanner';
import {
  ChecklistGraphicIcon,
  HomeGraphicIcon,
  LessonsGraphicIcon,
  ProfileGraphicIcon,
  StudyGraphicIcon,
  TutorGraphicIcon,
  VisualizerGraphicIcon,
} from '../ui/PhysicsIcons';
import { PWAInstallButton } from '../ui/PWAInstallButton';
import { UserAvatar } from '../ui/UserAvatar';
import sidebarLogoUrl from '../../assets/images/regenerated_image_1795533932091.jpg';

interface NavItem {
  to: string;
  label: string;
  mobileLabel: string;
  icon: React.FC<{ className?: string }>;
  end?: boolean;
}

const MOBILE_NAV: NavItem[] = [
  { to: '/', label: 'Home', mobileLabel: 'Home', icon: HomeGraphicIcon, end: true },
  { to: '/lessons', label: 'Lessons', mobileLabel: 'Lessons', icon: LessonsGraphicIcon },
  { to: '/study', label: 'Study Hub', mobileLabel: 'Study', icon: StudyGraphicIcon },
  { to: '/visualizer', label: '3D Visualizer', mobileLabel: '3D Sim', icon: VisualizerGraphicIcon },
  { to: '/ai', label: 'AI Tutor', mobileLabel: 'AI Tutor', icon: TutorGraphicIcon },
];

const SIDEBAR_NAV: NavItem[] = [
  ...MOBILE_NAV,
  { to: '/profile', label: 'Profile', mobileLabel: 'Profile', icon: ProfileGraphicIcon },
  { to: '/checklist', label: 'Study Week', mobileLabel: 'Checklist', icon: ChecklistGraphicIcon },
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
    unreadCount,
    bellOpen,
    setBellOpen,
    selectedNotifId,
    selectNotification,
  } = useNotifications();
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [showDeckSearch, setShowDeckSearch] = useState(false);
  const [deckQuery, setDeckQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openBell') === '1') {
      const notifParam = params.get('notif');
      navigate(
        notifParam
          ? `/notifications?notif=${encodeURIComponent(notifParam)}`
          : '/notifications',
        { replace: true }
      );
    }
  }, [location.search, navigate]);

  useEffect(() => {
    if (!bellOpen) return;
    setBellOpen(false);
    navigate(
      selectedNotifId
        ? `/notifications?notif=${encodeURIComponent(selectedNotifId)}`
        : '/notifications'
    );
  }, [bellOpen, selectedNotifId, setBellOpen, navigate]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuOpen && menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [menuOpen]);

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

  const displayName = profile?.nickname || profile?.username || 'Student';
  const streakDays = profile?.streakDays ?? 0;
  const remindersEnabled = Boolean(profile?.notificationsEnabled);
  const isNotificationsPage = location.pathname === '/notifications';

  const handleOpenNotificationsTab = () => {
    setMenuOpen(false);
    selectNotification(null);
    if (isNotificationsPage) {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
      return;
    }
    navigate('/notifications');
  };

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
                  `group flex items-center gap-3 px-3 min-h-[44px] rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50/90 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200 ring-1 ring-blue-200/80 dark:ring-blue-800/70 shadow-[0_1px_2px_rgba(37,99,235,0.06)]'
                      : 'text-slate-600 dark:text-neutral-300 hover:bg-stone-100/80 dark:hover:bg-neutral-800/70 hover:text-slate-900 dark:hover:text-neutral-100'
                  }`
                }
              >
                <span className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-150 group-hover:scale-105">
                  <Icon className="h-6 w-6" />
                </span>
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
                    Browse {ALL_LESSONS.length} Lessons
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
                {(profile?.lessonsCompleted || []).length}/{ALL_LESSONS.length}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-stone-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((profile?.lessonsCompleted || []).length / ALL_LESSONS.length) * 100)
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
          <Logo size="sm" src={sidebarLogoUrl} />
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
          <button
            type="button"
            onClick={handleOpenNotificationsTab}
            aria-label={`Notifications (${unreadCount} unread)`}
            className={`relative min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
              isNotificationsPage
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                : 'text-slate-700 dark:text-neutral-200 hover:bg-stone-100 dark:hover:bg-neutral-800'
            }`}
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
            className="rounded-full shrink-0"
          >
            <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl} size="sm" />
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

          <button
            type="button"
            onClick={handleOpenNotificationsTab}
            aria-label={`Notifications (${unreadCount} unread)`}
            title={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} — open Notifications`
                : 'Open Notifications & study reminders'
            }
            className={`relative h-10 w-10 rounded-full border shadow-[0_1px_2px_rgba(15,23,42,0.03)] inline-flex items-center justify-center transition-colors cursor-pointer ${
              isNotificationsPage
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-800 dark:text-blue-300'
                : 'bg-white dark:bg-[#141416] border-stone-200/90 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 hover:bg-stone-50 dark:hover:bg-neutral-800'
            }`}
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
              <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl} size="xs" />
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
                `flex flex-col items-center justify-center gap-0.5 min-h-[44px] text-[11px] font-semibold transition-colors ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-400'
                    : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`h-7 w-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive ? 'bg-blue-50 dark:bg-blue-950/60' : ''
                    }`}
                  >
                    <Icon className="h-5.5 w-5.5 shrink-0" />
                  </span>
                  <span className="truncate max-w-full px-1">{mobileLabel}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
