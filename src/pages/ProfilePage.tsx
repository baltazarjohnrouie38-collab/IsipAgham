import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Box,
  Camera,
  CheckSquare,
  ChevronRight,
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { NATURAL_VOICE_OPTIONS, useSpeech } from '../hooks/useSpeech';
import type { NaturalVoiceName } from '../lib/api';
import { processAvatarImageFile } from '../lib/avatar';
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
  const {
    profile,
    updateUserProfile,
    toggleChecklistItem,
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
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
      setNickname(profile.nickname || profile.username);
      setCourse(profile.course || 'Physics 1');
      setDailyGoalMinutes(profile.dailyGoalMinutes || 15);
      setNotifEnabled(Boolean(profile.notificationsEnabled));
      setNotifTime(profile.notificationTime || '19:00');
    }
  }, [
    profile?.uid,
    profile?.course,
    profile?.dailyGoalMinutes,
    profile?.notificationsEnabled,
    profile?.notificationTime,
  ]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);
    const trimmed = nickname.trim();
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
      setStatusMsg('Profile, Physics course, and daily goal saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update settings.');
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

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setErrorMsg(null);
    try {
      await deleteAccountAndData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete account.');
      setDeleting(false);
    }
  };

  const handleAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatusMsg(null);
    setErrorMsg(null);
    setUploadingAvatar(true);
    try {
      const avatarDataUrl = await processAvatarImageFile(file);
      await updateUserProfile({ avatarUrl: avatarDataUrl });
      setStatusMsg('Profile picture updated!');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not upload profile picture.');
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
          <div className="space-y-1.5 min-w-0">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-neutral-100 truncate">
              {displayName}
            </h1>
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
                  window.setTimeout(() => nicknameInputRef.current?.focus(), 60);
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
        <div className="border-b border-stone-200 dark:border-neutral-800 flex items-center gap-6 overflow-x-auto">
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
                      {(profile?.xp ?? 0).toLocaleString()} XP earned · {profile?.streakDays ?? 0}d streak · {(profile?.lessonsCompleted || []).length}/47 lessons
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
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={24}
                  minLength={2}
                  required
                  hint="Shown on the Global Leadership Board. Avoid using your full real name."
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

                <Button type="submit" loading={saving}>
                  Save Profile Settings
                </Button>
              </form>
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
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Natural Reading Voice"
                    value={voice}
                    onChange={(e) => setVoice(e.target.value as NaturalVoiceName)}
                    className="min-h-[38px] rounded-xl border border-stone-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 px-3 text-xs font-semibold text-slate-800 dark:text-neutral-100"
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

                {!confirmDelete ? (
                  <Button
                    variant="danger"
                    icon={<Trash2 className="h-4 w-4" />}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete Account &amp; Data
                  </Button>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="danger"
                      loading={deleting}
                      onClick={() => {
                        void handleDeleteAccount();
                      }}
                    >
                      Confirm Permanent Delete
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
