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
import { triggerIosIsland } from '../../lib/iosEffects';
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
  'Physics 1': 'bg-[#007AFF]',
  'Physics 2': 'bg-amber-500',
  'Physics 3': 'bg-sky-400',
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
    triggerIosIsland({
      title: next ? 'Dark Glass' : 'Light Glass',
      subtitle: 'Appearance updated',
      tone: 'blue',
    });
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

  const completedPct = Math.min(
    100,
    Math.round(((profile?.lessonsCompleted || []).length / ALL_LESSONS.length) * 100)
  );

  return (
    <div className="relative min-h-screen text-slate-950 dark:text-slate-50 flex flex-col lg:flex-row">
      {/* Apple iOS System Grouped Canvas Background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none select-none ios-app-canvas"
        aria-hidden="true"
      />

      <OfflineBanner />

      {/* Desktop Floating Liquid Glass Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:fixed lg:inset-y-4 lg:left-4 liquid-glass-strong rounded-[28px] z-30 overflow-hidden">
        <div className="h-16 px-5 flex items-center justify-between shrink-0">
          <NavLink to="/" className="focus-visible:outline-none">
            <Logo size="sm" src={sidebarLogoUrl} />
          </NavLink>
          <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/75 dark:bg-white/10 border border-white/80 dark:border-white/15 text-[#007AFF] dark:text-sky-300">
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
                  `group flex items-center gap-3 px-3 min-h-[42px] rounded-[16px] text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'liquid-lens-active'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-white/55 dark:hover:bg-white/10 hover:text-slate-950 dark:hover:text-white'
                  }`
                }
              >
                <span className="h-7 w-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <Icon className="h-5.5 w-5.5" />
                </span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="space-y-2 pt-1">
            <Link
              to="/study?tab=flashcards"
              className="liquid-btn-primary w-full min-h-[42px] px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-[0.96]"
            >
              <Layers className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Study Flashcards</span>
            </Link>
            <Link
              to="/study?tab=materials"
              className="liquid-btn-outline w-full min-h-[40px] px-4 rounded-full text-sm font-semibold flex items-center justify-center gap-1.5 transition-transform duration-200 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-[0.96]"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Add Material</span>
            </Link>
          </div>
        </div>

        {/* Scrollable "My study sets" Quick-Jump List */}
        <div className="mt-4 pt-4 border-t border-slate-900/10 dark:border-white/10 flex-1 flex flex-col min-h-0 px-3">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                {showDeckSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              </button>
              <Link
                to="/study?tab=materials"
                aria-label="Create new study set"
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-white/60 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
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
                className="w-full h-9 rounded-full border border-white/80 dark:border-white/15 bg-white/75 dark:bg-slate-950/60 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/40"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-0.5 pb-3 pr-0.5">
            {filteredSets.length === 0 ? (
              <div className="px-2 py-3 text-xs text-slate-500 dark:text-slate-400 space-y-1.5">
                <p>
                  {studySets.length === 0
                    ? 'No study sets yet. Open a built-in lesson or upload notes.'
                    : 'No matching study sets.'}
                </p>
                {studySets.length === 0 && (
                  <Link
                    to="/lessons"
                    className="inline-block font-semibold text-[#007AFF] dark:text-sky-400 hover:underline"
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
                  className="w-full text-left flex items-center gap-2.5 px-2.5 py-2 rounded-[12px] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${COURSE_SWATCH[set.course] || 'bg-[#007AFF]'}`}
                    aria-hidden="true"
                  />
                  <span className="truncate">{set.title}</span>
                </button>
              ))
            )}
          </div>

          {/* Bottom Sidebar Lesson Progress Glass Card */}
          <div className="mb-3 p-3.5 rounded-[20px] liquid-glass space-y-2.5 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 dark:text-white">Lessons Done</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                {(profile?.lessonsCompleted || []).length}/{ALL_LESSONS.length}
              </span>
            </div>
            <div className="liquid-progress-track h-2 w-full overflow-hidden">
              <div
                className="liquid-progress-fill h-full transition-all duration-300"
                style={{ width: `${completedPct}%` }}
              />
            </div>
            <Link
              to="/lessons"
              className="liquid-btn-outline w-full min-h-[34px] px-3 rounded-full text-xs font-semibold flex items-center justify-center transition-transform active:scale-[0.97]"
            >
              Continue Lessons
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Compact Header */}
      <header className="lg:hidden sticky top-2 mx-3 z-30 h-13 liquid-glass rounded-full px-3 sm:px-4 flex items-center justify-between">
        <NavLink to="/" className="focus-visible:outline-none">
          <Logo size="sm" src={sidebarLogoUrl} />
        </NavLink>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/study?tab=progress"
            title="Current daily study streak"
            className="min-h-[36px] px-2.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-xs font-bold text-amber-700 dark:text-amber-300 inline-flex items-center gap-1 tabular-nums"
          >
            <Flame className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-hidden="true" />
            <span>{streakDays}</span>
          </Link>
          <Link
            to="/study?tab=progress"
            title="Total XP"
            className="min-h-[36px] px-2.5 rounded-full bg-white/65 dark:bg-white/10 border border-white/75 dark:border-white/15 text-xs font-bold text-slate-900 dark:text-slate-100 inline-flex items-center gap-1 tabular-nums"
          >
            <Trophy className="h-3.5 w-3.5 text-[#007AFF] dark:text-sky-400 shrink-0" aria-hidden="true" />
            <span>{profile?.xp ?? 0}</span>
          </Link>
          <PWAInstallButton compact />
          <button
            type="button"
            onClick={handleOpenNotificationsTab}
            aria-label={`Notifications (${unreadCount} unread)`}
            className={`relative min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-full border transition-all cursor-pointer ${
              isNotificationsPage
                ? 'liquid-lens-active'
                : 'bg-white/60 dark:bg-white/10 border-white/70 dark:border-white/15 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Bell className="h-4.5 w-4.5" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-[#FF3B30] text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : remindersEnabled ? (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#007AFF] dark:bg-sky-400" />
            ) : null}
          </button>
          <button
            type="button"
            data-sound="toggle"
            onClick={handleToggleTheme}
            aria-label={darkMode ? 'Switch to light glass' : 'Switch to dark glass'}
            className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-full bg-white/60 dark:bg-white/10 border border-white/70 dark:border-white/15 text-slate-700 dark:text-slate-200 transition-transform active:scale-90 cursor-pointer"
          >
            {darkMode ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>
          <Link
            to="/profile"
            aria-label="Open Profile & Settings"
            className="rounded-full shrink-0 ring-2 ring-white/80 dark:ring-white/20"
          >
            <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl} size="sm" />
          </Link>
        </div>
      </header>

      {/* Right Workspace Column */}
      <div className="relative z-10 flex-1 lg:pl-76 flex flex-col min-w-0">
        {/* Desktop Floating Liquid Glass Utility Strip */}
        <header className="hidden lg:flex items-center justify-end gap-2.5 px-8 pt-4 pb-1">
          <Link
            to="/study?tab=progress"
            title="Current daily study streak"
            className="liquid-glass h-10 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:-translate-y-0.5 transition-all tabular-nums"
          >
            <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>{streakDays}d streak</span>
          </Link>

          <Link
            to="/study?tab=flashcards"
            className="liquid-glass h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:-translate-y-0.5 transition-all tabular-nums"
          >
            <Layers className="h-3.5 w-3.5 text-[#007AFF] dark:text-sky-400" aria-hidden="true" />
            <span>{dueTodayCount} due today</span>
          </Link>

          <Link
            to="/study?tab=progress"
            className="liquid-glass h-10 px-3.5 rounded-full inline-flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:-translate-y-0.5 transition-all tabular-nums"
          >
            <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>{profile?.xp ?? 0} XP</span>
          </Link>

          <button
            type="button"
            data-sound="toggle"
            onClick={handleToggleTheme}
            aria-label={darkMode ? 'Switch to light glass' : 'Switch to dark glass'}
            title={darkMode ? 'Switch to light glass' : 'Switch to dark glass'}
            className="liquid-glass h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-100 hover:-translate-y-0.5 active:scale-92 transition-all cursor-pointer"
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleOpenNotificationsTab}
            aria-label={`Notifications (${unreadCount} unread)`}
            title={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'} — open Notifications`
                : 'Open Notifications & study reminders'
            }
            className={`relative h-10 w-10 rounded-full inline-flex items-center justify-center hover:-translate-y-0.5 transition-all cursor-pointer ${
              isNotificationsPage
                ? 'liquid-lens-active'
                : 'liquid-glass text-slate-700 dark:text-slate-100'
            }`}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center tabular-nums shadow-xs">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : remindersEnabled ? (
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#007AFF] dark:bg-sky-400" />
            ) : null}
          </button>

          {/* User Avatar & Frosted Liquid Glass Dropdown */}
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
              className="liquid-glass h-10 pl-1.5 pr-3 rounded-full inline-flex items-center gap-1.5 hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl} size="xs" />
              <ChevronDown className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="animate-pop origin-top-right absolute right-0 mt-2 w-60 rounded-[24px] liquid-glass-strong overflow-hidden z-40"
              >
                <div className="px-4 py-3 border-b border-slate-900/10 dark:border-white/10">
                  <p className="text-xs font-bold text-slate-950 dark:text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Grade 12 · {profile?.course || 'Physics 1'}
                  </p>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <Link
                    to="/profile"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-[14px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                  >
                    <span>Profile &amp; Course</span>
                    <User className="h-4 w-4 text-slate-400 dark:text-slate-400" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/profile?tab=reminders"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-[14px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                  >
                    <span>Reminder Settings</span>
                    <Settings className="h-4 w-4 text-slate-400 dark:text-slate-400" aria-hidden="true" />
                  </Link>
                  <Link
                    to="/checklist"
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-[14px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                  >
                    <span>Study Week Checklist</span>
                    <CheckSquare className="h-4 w-4 text-slate-400 dark:text-slate-400" aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleToggleTheme();
                      setMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-[14px] text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <span>{darkMode ? 'Light Glass' : 'Dark Glass'}</span>
                    {darkMode ? (
                      <Sun className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    )}
                  </button>
                </div>

                <div className="p-1.5 pt-0">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOutUser();
                    }}
                    className="liquid-btn-secondary w-full flex items-center justify-between px-3.5 py-2.5 rounded-[16px] text-sm font-semibold transition-all cursor-pointer"
                  >
                    <span>Sign Out</span>
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 pb-28 lg:pb-12">
          <div key={location.pathname} className="ios-workspace-enter max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Floating Curved Liquid Glass Navigator — always pinned without scrolling */}
      <nav
        aria-label="Mobile bottom navigation"
        className="lg:hidden fixed bottom-3 left-3 right-3 z-30 liquid-dock rounded-full pb-safe"
      >
        <div className="grid grid-cols-5 h-15 p-1.5 gap-1">
          {MOBILE_NAV.map(({ to, mobileLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `group flex flex-col items-center justify-center gap-0.5 rounded-full min-h-[44px] text-[10px] font-semibold transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1.25,0.36,1)] active:scale-[0.92] ${
                  isActive
                    ? 'liquid-lens-active'
                    : 'text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white'
                }`
              }
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 group-active:scale-90" />
              <span className="truncate max-w-full px-1">{mobileLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};
