import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { triggerIosIsland } from '../../lib/iosEffects';
import { saveStudySession } from '../../lib/studyService';
import type { StudySession } from '../../types';
import { AlertBanner } from '../ui/AlertBanner';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';

interface TimerTabProps {
  sessions?: StudySession[];
}

function playCompletionChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.14;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.36);
    });
  } catch {
    // Ignore audio context restriction errors
  }
}

function triggerVibrationCue() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([200, 100, 200]);
  }
}

export const TimerTab: React.FC<TimerTabProps> = ({ sessions = [] }) => {
  const { user, profile, updateUserProfile, awardXp, toggleChecklistItem } = useAuth();

  const [workMin, setWorkMin] = useState<number>(profile?.pomodoroWorkMin || 25);
  const [breakMin, setBreakMin] = useState<number>(profile?.pomodoroBreakMin || 5);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [secondsLeft, setSecondsLeft] = useState<number>((profile?.pomodoroWorkMin || 25) * 60);
  const [running, setRunning] = useState(false);
  const [calmFullscreen, setCalmFullscreen] = useState(false);
  const [soundCue, setSoundCue] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const elapsedFocusSecRef = useRef(0);

  useEffect(() => {
    if (profile && !running) {
      const nextWork = profile.pomodoroWorkMin || 25;
      const nextBreak = profile.pomodoroBreakMin || 5;
      setWorkMin(nextWork);
      setBreakMin(nextBreak);
      if (mode === 'focus') setSecondsLeft(nextWork * 60);
      else setSecondsLeft(nextBreak * 60);
    }
  }, [profile?.pomodoroWorkMin, profile?.pomodoroBreakMin]);

  const completeFocusSession = async (studiedSeconds: number) => {
    if (!user || studiedSeconds < 30) return;
    const mins = Math.max(1, Math.round(studiedSeconds / 60));
    const xpEarned = Math.min(100, Math.max(5, mins + 5));
    await saveStudySession({
      userId: user.uid,
      type: 'pomodoro',
      durationSeconds: studiedSeconds,
      cardsReviewed: 0,
      xpEarned,
    });
    await awardXp(xpEarned, { studySeconds: studiedSeconds });
    void toggleChecklistItem('use_timer_sr', true);
    setStatusMsg(`Logged ${mins} min focus session · +${xpEarned} XP`);
    triggerIosIsland({
      title: 'Focus Session Complete',
      subtitle: `+${xpEarned} XP earned (${mins}m)`,
      tone: 'emerald',
    });
  };

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (soundCue) {
            playCompletionChime();
            triggerVibrationCue();
          }
          if (mode === 'focus') {
            const studied = elapsedFocusSecRef.current || workMin * 60;
            elapsedFocusSecRef.current = 0;
            void completeFocusSession(studied);
            setMode('break');
            return breakMin * 60;
          } else {
            setStatusMsg('Break complete! Ready for your next Physics focus block.');
            setMode('focus');
            return workMin * 60;
          }
        }
        if (mode === 'focus') {
          elapsedFocusSecRef.current += 1;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [running, mode, workMin, breakMin, soundCue]);

  const handleModeSwitch = (nextMode: 'focus' | 'break') => {
    setRunning(false);
    elapsedFocusSecRef.current = 0;
    setMode(nextMode);
    setSecondsLeft((nextMode === 'focus' ? workMin : breakMin) * 60);
    setStatusMsg(null);
  };

  const handleReset = () => {
    setRunning(false);
    elapsedFocusSecRef.current = 0;
    setSecondsLeft((mode === 'focus' ? workMin : breakMin) * 60);
  };

  const handleSaveDurations = async (e: React.FormEvent) => {
    e.preventDefault();
    const safeWork = Math.min(120, Math.max(1, Math.round(workMin)));
    const safeBreak = Math.min(60, Math.max(1, Math.round(breakMin)));
    setWorkMin(safeWork);
    setBreakMin(safeBreak);
    setSavingPrefs(true);
    try {
      await updateUserProfile({
        pomodoroWorkMin: safeWork,
        pomodoroBreakMin: safeBreak,
      });
      if (!running) {
        setSecondsLeft((mode === 'focus' ? safeWork : safeBreak) * 60);
      }
      setStatusMsg(`Saved Pomodoro durations (${safeWork}m focus / ${safeBreak}m break).`);
    } finally {
      setSavingPrefs(false);
    }
  };

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const totalSec = (mode === 'focus' ? workMin : breakMin) * 60;
  const progressPct = totalSec > 0 ? Math.round(((totalSec - secondsLeft) / totalSec) * 100) : 0;

  // SVG progress ring dimensions for Calm Focus Mode
  const ringR = 104;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (progressPct / 100) * ringC;

  const pomodoroLogs = sessions.filter((s) => s.type === 'pomodoro').slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Calm Full-Screen Focus Overlay */}
      {calmFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Calm focus timer screen"
          className="fixed inset-0 z-50 bg-[#EEF3FA]/95 dark:bg-[#060913]/95 backdrop-blur-3xl text-slate-950 dark:text-slate-50 flex flex-col items-center justify-between p-6 sm:p-10"
        >
          <div className="w-full max-w-2xl flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
              {mode === 'focus' ? 'Calm Focus Session' : 'Recharge Break'}
            </span>
            <Button
              variant="outline"
              size="sm"
              icon={<Minimize2 className="h-4 w-4" />}
              onClick={() => setCalmFullscreen(false)}
            >
              Exit Calm Screen
            </Button>
          </div>

          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative h-64 w-64 flex items-center justify-center">
              <svg className="h-64 w-64 -rotate-90" viewBox="0 0 240 240" aria-hidden="true">
                <circle
                  cx="120"
                  cy="120"
                  r={ringR}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-stone-200 dark:text-neutral-800"
                />
                <circle
                  cx="120"
                  cy="120"
                  r={ringR}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringC}
                  strokeDashoffset={ringOffset}
                  className="text-blue-700 dark:text-blue-400 transition-[stroke-dashoffset] duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-5xl sm:text-6xl font-bold tracking-tight tabular-nums">
                  {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
                </p>
                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                  {running ? 'Stay steady · Kaya mo \'yan' : 'Paused'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                icon={running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                onClick={() => setRunning((r) => !r)}
              >
                {running ? 'Pause' : 'Start Focus'}
              </Button>
              <Button
                variant="outline"
                size="lg"
                icon={<RotateCcw className="h-5 w-5" />}
                onClick={handleReset}
              >
                Reset
              </Button>
            </div>
          </div>

          <p className="text-sm text-slate-500 dark:text-neutral-400 text-center max-w-md">
            Put your phone face down or keep this calm ring open. Completed focus sessions earn XP automatically.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {statusMsg && (
            <AlertBanner tone="success" title="Pomodoro Update">
              {statusMsg}
            </AlertBanner>
          )}

          <Card padding="lg" className="space-y-6 text-center">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-stone-100 dark:bg-neutral-800 w-64 mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => handleModeSwitch('focus')}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    mode === 'focus'
                      ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  Focus ({workMin}m)
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch('break')}
                  className={`min-h-[44px] rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                    mode === 'break'
                      ? 'bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 shadow-xs'
                      : 'text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  Break ({breakMin}m)
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                icon={<Maximize2 className="h-4 w-4" />}
                onClick={() => setCalmFullscreen(true)}
              >
                Calm Full Screen
              </Button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                {mode === 'focus' ? 'Physics Study Focus · Kaya mo \'yan' : 'Short Recharge Break'}
              </p>
              <p className="font-display text-6xl sm:text-7xl font-bold tracking-tight text-slate-900 dark:text-neutral-100 tabular-nums">
                {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
              </p>
              <div className="max-w-sm mx-auto h-2.5 rounded-full bg-stone-100 dark:bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-blue-700 dark:bg-blue-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                icon={running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                onClick={() => setRunning((r) => !r)}
              >
                {running ? 'Pause' : 'Start Timer'}
              </Button>

              <Button
                variant="outline"
                size="lg"
                icon={<RotateCcw className="h-5 w-5" />}
                onClick={handleReset}
              >
                Reset
              </Button>

              {mode === 'focus' && elapsedFocusSecRef.current >= 60 && (
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  onClick={() => {
                    const studied = elapsedFocusSecRef.current;
                    elapsedFocusSecRef.current = 0;
                    setRunning(false);
                    void completeFocusSession(studied);
                    setSecondsLeft(workMin * 60);
                  }}
                >
                  Log Session Now
                </Button>
              )}
            </div>
          </Card>

          {/* Visible Session Log */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-neutral-100">
                  Focus Session Log
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-neutral-400 tabular-nums">
                {pomodoroLogs.length} recent block{pomodoroLogs.length === 1 ? '' : 's'}
              </span>
            </div>

            {pomodoroLogs.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-neutral-400 py-2">
                Complete a focus timer block (or study at least 1 minute and log it) to record your session history here.
              </p>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-neutral-800">
                {pomodoroLogs.map((sess) => {
                  const minsLogged = Math.max(1, Math.round(sess.durationSeconds / 60));
                  const dateLabel = sess.createdAt?.toDate
                    ? sess.createdAt.toDate().toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Today';
                  return (
                    <div
                      key={sess.id}
                      className="py-2.5 flex items-center justify-between text-sm tabular-nums"
                    >
                      <span className="text-slate-800 dark:text-neutral-200 font-medium">
                        {minsLogged} min Physics Focus · {dateLabel}
                      </span>
                      <span className="font-semibold text-blue-700 dark:text-blue-400">
                        +{sess.xpEarned} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="space-y-5 h-fit">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
            Timer Settings
          </h2>

          <form onSubmit={handleSaveDurations} className="space-y-4">
            <Input
              label="Focus Duration (minutes)"
              type="number"
              min={1}
              max={120}
              value={workMin}
              onChange={(e) => setWorkMin(Number(e.target.value) || 25)}
            />
            <Input
              label="Break Duration (minutes)"
              type="number"
              min={1}
              max={60}
              value={breakMin}
              onChange={(e) => setBreakMin(Number(e.target.value) || 5)}
            />
            <Button type="submit" fullWidth loading={savingPrefs}>
              Save Durations
            </Button>
          </form>

          <div className="pt-3 border-t border-stone-200 dark:border-neutral-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
                  Sound &amp; Vibration Cue
                </p>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Plays chime + vibrates when timer ends.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                icon={soundCue ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                onClick={() => setSoundCue((v) => !v)}
              >
                {soundCue ? 'On' : 'Muted'}
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => {
                playCompletionChime();
                triggerVibrationCue();
              }}
            >
              Test Chime &amp; Vibration
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
