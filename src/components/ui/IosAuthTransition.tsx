import React, { useEffect, useRef, useState } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import {
  IOS_AUTH_TRANSITION_EVENT,
  type IosAuthTransitionPayload,
} from '../../lib/iosEffects';
import appIconUrl from '../../assets/images/isipagham_blue_logo_1795790996722.jpg';

interface ActiveTransition extends IosAuthTransitionPayload {
  key: number;
  phase: 'active' | 'fading';
}

export const IosAuthTransition: React.FC = () => {
  const [active, setActive] = useState<ActiveTransition | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const doneTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const clearTimers = () => {
      if (fadeTimerRef.current !== null) {
        window.clearTimeout(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      if (doneTimerRef.current !== null) {
        window.clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
      }
    };

    const handleTransition = (event: Event) => {
      if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      const detail = (event as CustomEvent<IosAuthTransitionPayload>).detail;
      if (!detail?.mode) return;

      clearTimers();

      const key = Date.now();
      setActive({ ...detail, key, phase: 'active' });

      const holdMs = detail.mode === 'logout' || detail.mode === 'deleted' ? 760 : 1080;
      const totalMs = holdMs + 480;

      fadeTimerRef.current = window.setTimeout(() => {
        setActive((prev) => (prev && prev.key === key ? { ...prev, phase: 'fading' } : prev));
      }, holdMs);

      doneTimerRef.current = window.setTimeout(() => {
        setActive((prev) => (prev && prev.key === key ? null : prev));
      }, totalMs);
    };

    window.addEventListener(IOS_AUTH_TRANSITION_EVENT, handleTransition);
    return () => {
      window.removeEventListener(IOS_AUTH_TRANSITION_EVENT, handleTransition);
      clearTimers();
    };
  }, []);

  if (!active) return null;

  const isLogout = active.mode === 'logout';
  const isDeleted = active.mode === 'deleted';
  const isExitTransition = isLogout || isDeleted;
  const isSignup = active.mode === 'signup';
  const cleanName = active.username?.trim();

  const heading = isDeleted
    ? 'Account Deleted'
    : isLogout
    ? 'Signing Out'
    : isSignup
    ? cleanName
      ? `Welcome, ${cleanName}`
      : 'Account Created'
    : cleanName
    ? `Welcome back, ${cleanName}`
    : 'Welcome back';

  const subtitle = isDeleted
    ? 'All data erased · Returning to Sign In…'
    : isLogout
    ? 'Securing your study progress…'
    : isSignup
    ? 'Setting up your Physics 1–3 studio…'
    : 'Unlocking your Physics workspace…';

  return (
    <div
      key={active.key}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[105] flex flex-col items-center justify-center overflow-hidden ios-app-canvas transition-[opacity,transform,filter] duration-480 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        active.phase === 'fading'
          ? isExitTransition
            ? 'opacity-0 scale-[0.96] blur-[4px]'
            : 'opacity-0 scale-[1.08] blur-[6px]'
          : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Ambient Radial Halo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`ios-launch-orb h-80 w-80 sm:h-[420px] sm:w-[420px] rounded-full blur-3xl ${
            isExitTransition
              ? 'bg-gradient-to-tr from-slate-400/20 via-[#007AFF]/18 to-indigo-500/22 dark:from-slate-600/25 dark:via-[#0A84FF]/22 dark:to-indigo-500/24'
              : 'bg-gradient-to-tr from-emerald-400/22 via-[#007AFF]/20 to-sky-400/22 dark:from-emerald-500/25 dark:via-[#0A84FF]/24 dark:to-indigo-500/24'
          }`}
        />
      </div>

      {/* Central Liquid Glass Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative flex items-center justify-center h-40 w-40 sm:h-44 sm:w-44">
          {/* Expanding Glass Shockwave Rings */}
          <div
            className={`ios-launch-pulse absolute h-24 w-24 rounded-full border ${
              isExitTransition
                ? 'border-sky-400/45 dark:border-sky-300/40'
                : 'border-emerald-400/50 dark:border-emerald-300/45 shadow-[0_0_24px_rgba(16,185,129,0.22)]'
            }`}
          />
          <div
            className={`ios-launch-pulse-delayed absolute h-24 w-24 rounded-full border ${
              isExitTransition
                ? 'border-indigo-400/35 dark:border-indigo-300/30'
                : 'border-[#007AFF]/40 dark:border-sky-400/35'
            }`}
          />

          {/* Orbital Ring */}
          <div
            className={`${
              isExitTransition ? 'ios-auth-seal-ring' : 'ios-launch-orbit-cw'
            } absolute h-36 w-36 sm:h-40 sm:w-40 rounded-full border border-dashed ${
              isExitTransition
                ? 'border-slate-400/40 dark:border-white/25'
                : 'border-emerald-500/35 dark:border-emerald-400/35'
            }`}
          >
            <span
              className={`absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full ring-2 ring-white/80 dark:ring-white/30 ${
                isExitTransition
                  ? 'bg-gradient-to-br from-sky-300 to-[#007AFF] shadow-[0_0_12px_rgba(0,122,255,0.8)]'
                  : 'bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]'
              }`}
            />
          </div>

          {/* Squircle Liquid Glass Badge */}
          <div className="relative z-10 ios-launch-icon">
            <div
              className={`relative p-1.5 rounded-[30px] liquid-glass-strong ${
                isExitTransition
                  ? 'shadow-[0_24px_60px_-12px_rgba(15,23,42,0.28)]'
                  : 'shadow-[0_24px_60px_-12px_rgba(16,185,129,0.34)]'
              }`}
            >
              {isExitTransition ? (
                <div className="relative overflow-hidden rounded-[24px] h-22 w-22 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-[#0F1E3D] text-white">
                  {isDeleted ? (
                    <ShieldCheck className="h-9 w-9 text-emerald-300 drop-shadow-[0_2px_10px_rgba(16,185,129,0.45)]" />
                  ) : (
                    <Lock className="h-9 w-9 text-sky-300 drop-shadow-[0_2px_10px_rgba(56,189,248,0.45)]" />
                  )}
                  <div className="ios-launch-sheen absolute inset-0 pointer-events-none" />
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-[24px] h-22 w-22">
                  <img
                    src={appIconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="ios-launch-sheen absolute inset-0 pointer-events-none" />
                  <div className="ios-launch-sheen-second absolute inset-0 pointer-events-none" />
                </div>
              )}
            </div>

            {!isExitTransition && (
              <div className="ios-auth-check-badge absolute -bottom-1.5 -right-1.5 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center ring-3 ring-white dark:ring-slate-900 shadow-[0_6px_18px_rgba(16,185,129,0.5)]">
                <Check className="h-4.5 w-4.5 stroke-[3]" />
              </div>
            )}
          </div>
        </div>

        <h2 className="ios-launch-title mt-3 font-display text-2xl sm:text-[26px] font-bold tracking-tight text-slate-950 dark:text-white max-w-xs truncate">
          {heading}
        </h2>
        <p className="ios-launch-subtitle mt-1 text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>

        <div className="ios-launch-progress-track mt-4 h-1.5 w-36 sm:w-44 overflow-hidden rounded-full liquid-progress-track">
          <div
            className={`ios-auth-progress-fill h-full w-full rounded-full ${
              isExitTransition
                ? 'bg-gradient-to-r from-slate-400 via-[#007AFF] to-indigo-500'
                : 'bg-gradient-to-r from-emerald-400 via-[#007AFF] to-sky-400'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
