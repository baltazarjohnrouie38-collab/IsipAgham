import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BellOff,
  Box,
  Camera,
  Check,
  CheckSquare,
  ChevronRight,
  Loader2,
  LogOut,
  Moon,
  Pencil,
  ShieldCheck,
  Sun,
  Trash2,
  Trophy,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth, type DeleteAccountProgress } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { ALL_LESSONS } from '../data/lessons';
import { NATURAL_VOICE_OPTIONS, useSpeech } from '../hooks/useSpeech';
import type { NaturalVoiceName } from '../lib/api';
import { validateAvatarImageFile } from '../lib/avatar';
import {
  registerStudyNotifications,
  showDueCardsNotification,
} from '../lib/notifications';
import { useSoundSettings } from '../lib/sound';
import type { ChecklistKey, PhysicsCourse } from '../types';
import { AlertBanner } from '../components/ui/AlertBanner';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Input';
import { PWAInstallButton } from '../components/ui/PWAInstallButton';
import { UserAvatar } from '../components/ui/UserAvatar';
import { AvatarCropModal } from '../components/profile/AvatarCropModal';
import { JoinLeaderboardModal } from '../components/study/JoinLeaderboardModal';

type ProfileTabKey = 'overview' | 'reminders' | 'privacy';

const ALL_CHECKLIST_KEYS: ChecklistKey[] = [
  'upload_material',
  'generate_flashcards',
  'take_quiz',
  'use_timer_sr',
  'ask_ai_three',
  'open_3d_all_courses',
  'try_tts_darkmode',
  'enable_notifications',
  'check_dashboard_leaderboard',
  'add_home_screen',
];

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    profile,
    updateUserProfile,
    toggleChecklistItem,
    leaveGlobalLeaderboard,
    signOutUser,
    deleteAccountAndData,
  } = useAuth();
  const { dueTodayCount, pushCustomNotification } = useNotifications();
  const { darkMode, toggleDarkMode } = useTheme();
  const { soundEnabled, toggleSound } = useSoundSettings();
  const {
    voice,
    setVoice,
    speaking: previewSpeaking,
    loading: previewLoading,
    speechError: previewError,
    speak: previewSpeak,
    stop: previewStop,
  } = useSpeech();

  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<ProfileTabKey>(
    initialTab === 'reminders' || initialTab === 'privacy' ? initialTab : 'overview'
  );
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [course, setCourse] = useState<PhysicsCourse>(profile?.course || 'Physics 1');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState<number>(
    profile?.dailyGoalMinutes || 15
  );

  const [notifEnabled, setNotifEnabled] = useState(Boolean(profile?.notificationsEnabled));
  const [notifTime, setNotifTime] = useState(profile?.notificationTime || '19:00');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingNotif, setSavingNotif] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<DeleteAccountProgress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [joinLeaderboardOpen, setJoinLeaderboardOpen] = useState(false);
  const [confirmingLeaveBoard, setConfirmingLeaveBoard] = useState(false);
  const [leavingBoard, setLeavingBoard] = useState(false);
  const [editingHeroName, setEditingHeroName] = useState(false);
  const [heroNameDraft, setHeroNameDraft] = useState(profile?.nickname || profile?.username || '');
  const [savingHeroName, setSavingHeroName] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);

  const nicknameInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'overview' || tabParam === 'reminders' || tabParam === 'privacy') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (profile) {
      const nextName = profile.nickname || profile.username || 'Student';
      setNickname(nextName);
      setHeroNameDraft(nextName);
      setCourse(profile.course || 'Physics 1');
      setDailyGoalMinutes(profile.dailyGoalMinutes || 15);
      setNotifEnabled(Boolean(profile.notificationsEnabled));
      setNotifTime(profile.notificationTime || '19:00');
    }
  }, [
    profile?.uid,
    profile?.nickname,
    profile?.username,
    profile?.course,
    profile?.dailyGoalMinutes,
    profile?.notificationsEnabled,
    profile?.notificationTime,
  ]);

  const formatSaveError = (err: unknown, fallback: string) => {
    if (!(err instanceof Error)) return fallback;
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed && typeof parsed.error === 'string' && parsed.error) {
        return parsed.error;
      }
    } catch {
      // plain error message
    }
    return err.message || fallback;
  };

  const handleSaveHeroUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    const cleaned = heroNameDraft.trim().replace(/\s+/g, ' ');
    if (cleaned.length < 2 || cleaned.length > 24) {
      setErrorMsg('Username must be between 2 and 24 characters.');
      return;
    }
    setSavingHeroName(true);
    try {
      await updateUserProfile({
        username: cleaned,
        nickname: cleaned,
      });
      setNickname(cleaned);
      setHeroNameDraft(cleaned);
      setEditingHeroName(false);
      setStatusMsg(`Username updated to "${cleaned}".`);
    } catch (err) {
      setErrorMsg(formatSaveError(err, 'Could not update username. Please try again.'));
    } finally {
      setSavingHeroName(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    setSettingsFeedback(null);
    const trimmed = nickname.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 24) {
      setErrorMsg('Username must be between 2 and 24 characters.');
      return;
    }
    const safeGoal = Math.min(180, Math.max(5, Math.round(dailyGoalMinutes)));

    setSaving(true);
    try {
      await updateUserProfile({
        username: trimmed,
        nickname: trimmed,
        course,
        dailyGoalMinutes: safeGoal,
      });
      setNickname(trimmed);
      setHeroNameDraft(trimmed);
      setStatusMsg('Profile, Physics course, and daily goal saved.');
      setSettingsFeedback(`Saved! Your username is now "${trimmed}".`);
    } catch (err) {
      setErrorMsg(formatSaveError(err, 'Failed to update settings.'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDark = () => {
    const next = !darkMode;
    toggleDarkMode();
    void updateUserProfile({ darkMode: next });
    void toggleChecklistItem('try_tts_darkmode', true);
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    setSavingNotif(true);

    try {
      if (notifEnabled) {
        const res = await registerStudyNotifications();
        await updateUserProfile({
          notificationsEnabled: true,
          notificationTime: notifTime,
          ...(res.fcmToken ? { fcmToken: res.fcmToken } : {}),
        });
        void toggleChecklistItem('enable_notifications', true);
        setStatusMsg(`${res.note} Daily reminder time set to ${notifTime}.`);
      } else {
        await updateUserProfile({
          notificationsEnabled: false,
          notificationTime: notifTime,
        });
        setStatusMsg('Study reminder notifications turned off.');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not update notification settings.');
    } finally {
      setSavingNotif(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteStep(1);
    setDeleteAcknowledged(false);
    setDeleteConfirmText('');
    setDeleteModalError(null);
    setDeleteProgress(null);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteModalOpen(false);
    setDeleteModalError(null);
  };

  const isDeletePhraseMatched = deleteConfirmText.trim().toUpperCase() === 'DELETE';

  const handleDeleteAccount = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isDeletePhraseMatched) {
      setDeleteModalError('Please type DELETE to confirm permanent account deletion.');
      return;
    }

    setDeleting(true);
    setDeleteModalError(null);
    setDeleteProgress({
      step: 'collections',
      percent: 25,
      label: 'Removing study materials, flashcards & AI history…',
    });

    try {
      await deleteAccountAndData({
        onProgress: (progress) => setDeleteProgress(progress),
      });
      navigate('/', { replace: true });
    } catch (err) {
      setDeleteModalError(err instanceof Error ? err.message : 'Could not delete account.');
      setDeleteProgress(null);
      setDeleting(false);
    }
  };

  const handleAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatusMsg(null);
    setErrorMsg(null);
    try {
      validateAvatarImageFile(file);
      setPendingAvatarFile(file);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not open selected image.');
    }
  };

  const handleSaveCroppedAvatar = async (avatarDataUrl: string) => {
    setStatusMsg(null);
    setErrorMsg(null);
    setUploadingAvatar(true);
    try {
      await updateUserProfile({ avatarUrl: avatarDataUrl });
      setPendingAvatarFile(null);
      setStatusMsg('Profile picture updated!');
    } catch (err) {
      setErrorMsg(formatSaveError(err, 'Could not upload profile picture.'));
      throw err;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setStatusMsg(null);
    setErrorMsg(null);
    setUploadingAvatar(true);
    try {
      await updateUserProfile({ avatarUrl: '' });
      setStatusMsg('Profile picture removed.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not remove profile picture.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLeaveLeaderboard = async () => {
    setStatusMsg(null);
    setErrorMsg(null);
    setLeavingBoard(true);
    try {
      await leaveGlobalLeaderboard();
      setConfirmingLeaveBoard(false);
      setStatusMsg('Left Global Leadership Board. Your XP is now private.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not leave Global Leadership Board.');
    } finally {
      setLeavingBoard(false);
    }
  };

  const isLeaderboardJoined = Boolean(profile?.leaderboardJoined);
  const displayName = profile?.nickname || profile?.username || 'Student';
  const checklistDoneCount = ALL_CHECKLIST_KEYS.filter((k) =>
    Boolean(profile?.checklist?.[k])
  ).length;
  const visitedCoursesCount = profile?.visitedCourses?.length ?? 0;

  return (
    <div className="space-y-6">
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        aria-label="Upload profile picture"
        onChange={(e) => {
          void handleAvatarSelected(e);
        }}
      />

      {/* Profile Hero Header */}
      <div className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="relative inline-flex self-start shrink-0">
            <UserAvatar
              name={displayName}
              avatarUrl={profile?.avatarUrl}
              size="xl"
              className="ring-4 ring-white dark:ring-[#141416] shadow-sm"
            />
            <button
              type="button"
              disabled={uploadingAvatar}
              onClick={() => avatarInputRef.current?.click()}
              aria-label={profile?.avatarUrl ? 'Change profile picture' : 'Upload profile picture'}
              title={profile?.avatarUrl ? 'Change profile picture' : 'Upload profile picture'}
              className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white border-2 border-white dark:border-[#141416] flex items-center justify-center shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            {editingHeroName ? (
              <form
                onSubmit={handleSaveHeroUsername}
                className="flex flex-wrap items-center gap-2 max-w-md"
              >
                <input
                  type="text"
                  value={heroNameDraft}
                  onChange={(e) => setHeroNameDraft(e.target.value)}
                  minLength={2}
                  maxLength={24}
                  required
                  autoFocus
                  aria-label="New username"
                  placeholder="Enter username (2–24 chars)"
                  className="min-h-[40px] flex-1 min-w-[160px] rounded-xl border border-blue-400 dark:border-blue-500 bg-white dark:bg-neutral-950 px-3 text-base sm:text-sm font-semibold text-slate-950 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <Button type="submit" size="sm" loading={savingHeroName}>
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={savingHeroName}
                  onClick={() => {
                    setHeroNameDraft(displayName);
                    setEditingHeroName(false);
                  }}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-neutral-100 truncate">
                  {displayName}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setHeroNameDraft(displayName);
                    setEditingHeroName(true);
                  }}
                  aria-label="Edit username"
                  title="Change username"
                  className="h-8 w-8 rounded-full border border-stone-200 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900 text-slate-600 dark:text-neutral-300 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 truncate">
              Grade 12 · {profile?.course || 'Physics 1'} ·{' '}
              {profile?.email || 'Username-only sign-in (no email stored)'}
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                loading={uploadingAvatar}
                icon={<Upload className="h-3.5 w-3.5" />}
                onClick={() => avatarInputRef.current?.click()}
              >
                {profile?.avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {profile?.avatarUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingAvatar}
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    void handleRemoveAvatar();
                  }}
                >
                  Remove Photo
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                icon={<Pencil className="h-3.5 w-3.5" />}
                onClick={() => {
                  setActiveTab('overview');
                  window.setTimeout(() => {
                    nicknameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    nicknameInputRef.current?.focus();
                  }, 80);
                }}
              >
                Edit Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={darkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                onClick={handleToggleDark}
              >
                {darkMode ? 'Light Mode' : 'Dark Mode'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<LogOut className="h-3.5 w-3.5" />}
                onClick={() => {
                  void signOutUser();
                }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Clean Underline Tabs */}
        <div className="border-b border-stone-200 dark:border-neutral-800 flex items-center gap-5 sm:gap-6 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'overview', label: 'Course & Account' },
              { key: 'reminders', label: 'Study Reminders' },
              { key: 'privacy', label: 'Privacy & Home Screen' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              data-sound="tab"
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 min-h-[44px] text-sm font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.key
                  ? 'border-blue-700 text-blue-800 dark:border-blue-400 dark:text-blue-300'
                  : 'border-transparent text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <AlertBanner tone="success" title="Saved">
          {statusMsg}
        </AlertBanner>
      )}

      {errorMsg && (
        <AlertBanner tone="error" title="Notice">
          {errorMsg}
        </AlertBanner>
      )}

      <div key={activeTab} className="animate-enter">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Flat Divided Progress Rows */}
            <Card padding="sm" className="divide-y divide-stone-100 dark:divide-neutral-800">
              <Link
                to="/study?tab=progress"
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Trophy className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      Global Leadership Board &amp; XP
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                      {isLeaderboardJoined ? 'Joined (Active)' : 'Not joined yet'} · {(profile?.xp ?? 0).toLocaleString()} XP earned · {profile?.streakDays ?? 0}d streak · {(profile?.lessonsCompleted || []).length}/{ALL_LESSONS.length} lessons
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              </Link>

              <Link
                to="/checklist"
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <CheckSquare className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      Study Week Checklist
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                      {checklistDoneCount} of 10 weekly study tasks completed
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              </Link>

              <Link
                to="/visualizer"
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <Box className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      3D Physics Visualizer
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                      {visitedCoursesCount} of 3 courses explored (Physics 1, 2 &amp; 3)
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" aria-hidden="true" />
              </Link>
            </Card>

            {/* Account & Physics Course Settings Card */}
            <Card className="space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
                Student Profile &amp; Study Goal
              </h2>

              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-neutral-900/80 border border-stone-200/80 dark:border-neutral-800 max-w-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={displayName} avatarUrl={profile?.avatarUrl} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100">
                      Profile Picture
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      Shown in your header and Global Leadership Board
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    loading={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {profile?.avatarUrl ? 'Change' : 'Upload'}
                  </Button>
                  {profile?.avatarUrl && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={uploadingAvatar}
                      onClick={() => {
                        void handleRemoveAvatar();
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-lg">
                <Input
                  ref={nicknameInputRef}
                  label="Username (Leaderboard Name)"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (settingsFeedback) setSettingsFeedback(null);
                  }}
                  maxLength={24}
                  minLength={2}
                  required
                  hint={
                    isLeaderboardJoined
                      ? '2–24 characters. Updates both your profile and Global Leadership Board name.'
                      : '2–24 characters. Used across your profile and if you join the Global Leadership Board.'
                  }
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Physics Course"
                    value={course}
                    onChange={(e) => setCourse(e.target.value as PhysicsCourse)}
                  >
                    <option value="Physics 1">Physics 1</option>
                    <option value="Physics 2">Physics 2</option>
                    <option value="Physics 3">Physics 3</option>
                  </Select>

                  <Select
                    label="Daily Study Goal"
                    value={String(dailyGoalMinutes)}
                    onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
                  >
                    <option value="10">10 minutes / day</option>
                    <option value="15">15 minutes / day</option>
                    <option value="25">25 minutes / day</option>
                    <option value="45">45 minutes / day</option>
                    <option value="60">60 minutes / day</option>
                  </Select>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" loading={saving}>
                    Save Profile Settings
                  </Button>
                  {settingsFeedback && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      {settingsFeedback}
                    </span>
                  )}
                </div>
              </form>

              <div className="pt-2 border-t border-stone-200/80 dark:border-neutral-800 max-w-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#FAF9F6] dark:bg-neutral-900/80 border border-stone-200/80 dark:border-neutral-800">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-neutral-100 flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
                      <span>Global Leaderboard Status</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-neutral-400">
                      {isLeaderboardJoined
                        ? `Activated — Visible as "${displayName}" (${(profile?.xp ?? 0).toLocaleString()} XP)`
                        : 'Not joined — Activate to publish your username, avatar, and XP'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {!isLeaderboardJoined ? (
                      <Button
                        type="button"
                        size="sm"
                        icon={<Trophy className="h-3.5 w-3.5" />}
                        onClick={() => setJoinLeaderboardOpen(true)}
                      >
                        Join Global Leaderboard
                      </Button>
                    ) : confirmingLeaveBoard ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="danger"
                          loading={leavingBoard}
                          onClick={() => {
                            void handleLeaveLeaderboard();
                          }}
                        >
                          Confirm Leave
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={leavingBoard}
                          onClick={() => setConfirmingLeaveBoard(false)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setConfirmingLeaveBoard(true)}
                      >
                        Leave Leaderboard
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'reminders' && (
          <Card className="space-y-4 max-w-2xl">
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
                Study Reminder Notifications (FCM)
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-0.5">
                Receive a friendly reminder for due spaced-repetition flashcards at your chosen study time.
              </p>
            </div>

            <form onSubmit={handleSaveNotifications} className="space-y-4">
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                  Daily Due-Review Reminders
                </span>
                <Button
                  type="button"
                  variant={notifEnabled ? 'primary' : 'outline'}
                  size="sm"
                  icon={notifEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  onClick={() => setNotifEnabled((v) => !v)}
                >
                  {notifEnabled ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <Input
                label="Reminder Time"
                type="time"
                value={notifTime}
                onChange={(e) => setNotifTime(e.target.value)}
                required
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" loading={savingNotif}>
                  Save Reminder Settings
                </Button>
                {notifEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStatusMsg(null);
                      setErrorMsg(null);
                      const title = 'Study Reminder Alert';
                      const body =
                        dueTodayCount > 0
                          ? `You have ${dueTodayCount} flashcard${dueTodayCount === 1 ? '' : 's'} due today. Tap to review!`
                          : `Ready for your daily Grade 12 ${profile?.course || 'Physics 1'} session! Kaya mo 'yan!`;
                      const newId = pushCustomNotification({
                        title,
                        message: body,
                        category: 'reminder',
                        actionLabel: dueTodayCount > 0 ? 'Review Due Cards' : 'Open Study Hub',
                        actionTo: dueTodayCount > 0 ? '/study?tab=flashcards' : '/study?tab=timer',
                      });
                      void showDueCardsNotification(dueTodayCount, title, body, newId).then((res) => {
                        if (res.ok) setStatusMsg(res.message);
                        else setErrorMsg(res.message);
                      });
                    }}
                  >
                    Send Test Notification
                  </Button>
                )}
              </div>
            </form>
          </Card>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <Card className="space-y-4">
              <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
                Appearance &amp; Phone Home Screen
              </h2>

              <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-200 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">Dark Mode</p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Saved to your account across devices.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  onClick={handleToggleDark}
                >
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </div>

              <div className="flex items-center justify-between gap-4 py-2 border-b border-stone-200 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                    Click Sound Effects
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Plays a subtle tactile click on buttons, navigation, and flashcards.
                  </p>
                </div>
                <Button
                  variant={soundEnabled ? 'primary' : 'outline'}
                  size="sm"
                  icon={soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  onClick={toggleSound}
                >
                  {soundEnabled ? 'Sound On' : 'Muted'}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-stone-200 dark:border-neutral-800">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                    Natural Reading Voice
                  </p>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Used when listening to lessons, flashcards, and AI Tutor answers.
                  </p>
                </div>
                <div className="w-full sm:w-auto flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Natural Reading Voice"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value as NaturalVoiceName)}
                    className="min-h-[40px] max-w-full min-w-0 flex-1 sm:flex-initial rounded-xl border border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 text-xs font-semibold text-slate-800 dark:text-neutral-100"
                  >
                    {NATURAL_VOICE_OPTIONS.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    loading={previewLoading}
                    icon={<Volume2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      if (previewSpeaking || previewLoading) {
                        previewStop();
                      } else {
                        previewSpeak(
                          'Kumusta! I am your IsipAgham Physics tutor. Let us master Grade 12 Physics together!'
                        );
                      }
                    }}
                  >
                    {previewSpeaking ? 'Stop' : 'Preview'}
                  </Button>
                </div>
              </div>
              {previewError && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  {previewError}
                </p>
              )}

              <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
                IsipAgham can be added to your Android or iPhone home screen for full-screen app launch. An active internet connection is required (no offline mode).
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <PWAInstallButton />
                <Link to="/checklist">
                  <Button variant="outline" icon={<CheckSquare className="h-4 w-4" />}>
                    Study Week Checklist
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className="h-5 w-5 text-blue-700 dark:text-blue-400 shrink-0"
                  aria-hidden="true"
                />
                <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
                  Data Privacy &amp; Account Controls (RA 10173)
                </h2>
              </div>
              <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 leading-relaxed">
                IsipAgham collects only your chosen username and optional email. We never ask for your full name, home address, or phone number. You can sign out or permanently delete your account and all study records anytime.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="outline"
                  icon={<LogOut className="h-4 w-4" />}
                  onClick={() => {
                    void signOutUser();
                  }}
                >
                  Sign Out
                </Button>

                <Button
                  variant="danger"
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={openDeleteModal}
                >
                  Delete Account &amp; Data
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Multi-step Permanent Account Deletion Confirmation Modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/55 backdrop-blur-md pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-modal-title"
          onClick={closeDeleteModal}
        >
          <Card
            padding="md"
            className="animate-pop w-full max-w-md max-h-[88dvh] overflow-y-auto space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="delete-account-modal-title"
                    className="font-display text-lg font-bold text-slate-950 dark:text-white"
                  >
                    {deleting
                      ? 'Deleting Your Account…'
                      : deleteStep === 1
                      ? 'Delete Account Permanently?'
                      : 'Final Verification Required'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {deleting
                      ? 'Please wait while we erase all records and return you to Sign In'
                      : `Step ${deleteStep} of 2 · Cannot be undone`}
                  </p>
                </div>
              </div>
              {!deleting && (
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  aria-label="Close delete account dialog"
                  className="min-h-[36px] min-w-[36px] rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-900/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>

            {deleting ? (
              <div className="space-y-4 py-1" aria-live="polite">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                    <span className="text-slate-700 dark:text-slate-200 truncate">
                      {deleteProgress?.label || 'Processing deletion…'}
                    </span>
                    <span className="text-rose-600 dark:text-rose-400 tabular-nums shrink-0">
                      {deleteProgress?.percent ?? 15}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full overflow-hidden bg-slate-200/85 dark:bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 transition-[width] duration-300 ease-out"
                      style={{ width: `${deleteProgress?.percent ?? 15}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/75 dark:bg-white/[0.03] p-3.5 space-y-2.5 text-xs">
                  {(
                    [
                      { key: 'collections', label: 'Erase materials, flashcards, quizzes & AI chats' },
                      { key: 'profile', label: 'Remove profile, XP & Global Leadership Board' },
                      { key: 'auth', label: 'Finalize account removal & return to Sign In' },
                    ] as const
                  ).map((item, idx) => {
                    const order = ['collections', 'profile', 'auth', 'done'];
                    const activeIndex = order.indexOf(deleteProgress?.step || 'collections');
                    const isDone = activeIndex > idx || deleteProgress?.step === 'done';
                    const isCurrent = activeIndex === idx && deleteProgress?.step !== 'done';
                    return (
                      <div key={item.key} className="flex items-center gap-2.5">
                        {isDone ? (
                          <span className="h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <Check className="h-3.5 w-3.5 stroke-[2.75]" aria-hidden="true" />
                          </span>
                        ) : isCurrent ? (
                          <span className="h-5 w-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          </span>
                        ) : (
                          <span className="h-5 w-5 rounded-full border border-slate-300 dark:border-white/20 shrink-0" />
                        )}
                        <span
                          className={
                            isDone
                              ? 'font-semibold text-emerald-700 dark:text-emerald-300'
                              : isCurrent
                              ? 'font-semibold text-slate-900 dark:text-white'
                              : 'text-slate-500 dark:text-slate-400'
                          }
                        >
                          {item.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : deleteStep === 1 ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-200/80 dark:border-rose-500/25 bg-rose-50/75 dark:bg-rose-950/35 p-3.5 space-y-2 text-xs sm:text-sm text-rose-950 dark:text-rose-100">
                  <p className="font-semibold">
                    The following data for <span className="font-bold">{displayName}</span> will be permanently erased:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs leading-relaxed">
                    <li>Your login account, profile photo, XP, streak, and settings</li>
                    <li>Your entry on the Global Leadership Board</li>
                    <li>All uploaded PDFs/notes, generated flashcards, and quizzes</li>
                    <li>All quiz scores, Pomodoro logs, and AI Physics Tutor chats</li>
                  </ul>
                </div>

                <label className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] cursor-pointer select-none min-h-[44px]">
                  <input
                    type="checkbox"
                    checked={deleteAcknowledged}
                    onChange={(e) => setDeleteAcknowledged(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-rose-600 cursor-pointer shrink-0"
                  />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">
                    I understand this permanently deletes my account and all study records, and cannot be recovered.
                  </span>
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={closeDeleteModal}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    disabled={!deleteAcknowledged}
                    onClick={() => {
                      setDeleteModalError(null);
                      setDeleteStep(2);
                    }}
                  >
                    Continue to Final Step
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                {deleteModalError && (
                  <AlertBanner tone="error" title="Deletion notice">
                    {deleteModalError}
                  </AlertBanner>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      htmlFor="delete-confirm-phrase"
                      className="block text-sm font-medium text-slate-800 dark:text-slate-200"
                    >
                      Type <span className="font-bold text-rose-600 dark:text-rose-400">DELETE</span> to confirm
                    </label>
                    {isDeletePhraseMatched && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Matched
                      </span>
                    )}
                  </div>
                  <Input
                    id="delete-confirm-phrase"
                    placeholder="Type DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    autoComplete="off"
                    autoFocus
                    required
                  />
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed rounded-xl bg-slate-100/80 dark:bg-white/[0.04] p-3">
                  Once confirmed, all your saved Physics study records and profile will be erased immediately and you will be returned to the Sign In page.
                </p>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setDeleteModalError(null);
                      setDeleteStep(1);
                    }}
                  >
                    Back
                  </Button>
                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <Button type="button" variant="outline" onClick={closeDeleteModal}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="danger"
                      icon={<Trash2 className="h-4 w-4" />}
                      disabled={!isDeletePhraseMatched}
                    >
                      Permanently Delete
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
      <JoinLeaderboardModal
        open={joinLeaderboardOpen}
        onClose={() => setJoinLeaderboardOpen(false)}
        onJoined={() => setStatusMsg('Joined the Global Leadership Board!')}
      />

      <AvatarCropModal
        file={pendingAvatarFile}
        saving={uploadingAvatar}
        onChooseAnother={() => avatarInputRef.current?.click()}
        onCancel={() => {
          if (!uploadingAvatar) setPendingAvatarFile(null);
        }}
        onSave={handleSaveCroppedAvatar}
      />
    </div>
  );
};

export default ProfilePage;
