import React, { useEffect, useState } from 'react';
import appIconUrl from '../../assets/images/isipagham_blue_logo_1795790996722.jpg';

export const IosLaunchEffect: React.FC = () => {
  const [phase, setPhase] = useState<'opening' | 'fading' | 'done'>(() => {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return 'done';
    }
    return 'opening';
  });

  useEffect(() => {
    if (phase === 'done') return;

    const fadeTimer = window.setTimeout(() => {
      setPhase('fading');
    }, 1550);

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, 2100);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden ios-app-canvas transition-[opacity,transform,filter] duration-550 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        phase === 'fading'
          ? 'opacity-0 scale-[1.09] blur-[6px]'
          : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Ambient iOS Caustic Light Blooms */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="ios-launch-orb h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-gradient-to-tr from-[#007AFF]/20 via-sky-400/18 to-indigo-500/20 dark:from-[#0A84FF]/28 dark:via-sky-400/20 dark:to-indigo-500/26 blur-3xl" />
      </div>

      {/* Concentric Physics Rings & Emblem Stage */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center h-44 w-44 sm:h-52 sm:w-52">
          {/* Expanding Liquid Glass Shockwave Pulses */}
          <div className="ios-launch-pulse absolute h-24 w-24 rounded-full border border-[#007AFF]/40 dark:border-sky-400/45 shadow-[0_0_24px_rgba(0,122,255,0.22)]" />
          <div className="ios-launch-pulse-delayed absolute h-24 w-24 rounded-full border border-indigo-400/35 dark:border-indigo-300/35" />

          {/* Outer Orbital Physics Ring */}
          <div className="ios-launch-orbit-cw absolute h-40 w-40 sm:h-46 sm:w-46 rounded-full border border-dashed border-[#007AFF]/25 dark:border-sky-300/25">
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-gradient-to-br from-sky-300 to-[#007AFF] shadow-[0_0_12px_rgba(0,122,255,0.85)] ring-2 ring-white/80 dark:ring-white/30" />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-indigo-400/80 shadow-[0_0_8px_rgba(99,102,241,0.75)]" />
          </div>

          {/* Inner Counter-Rotating Orbital Ring */}
          <div className="ios-launch-orbit-ccw absolute h-30 w-30 sm:h-34 sm:w-34 rounded-full border border-white/65 dark:border-white/15 shadow-[inset_0_0_16px_rgba(0,122,255,0.12)]">
            <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)] ring-2 ring-white/80 dark:ring-white/25" />
          </div>

          {/* Outer Luminous Squircle Halo */}
          <div className="ios-launch-halo absolute h-26 w-26 sm:h-28 sm:w-28 rounded-[34px] bg-gradient-to-br from-[#007AFF]/30 via-sky-400/20 to-indigo-500/30 blur-xl" />

          {/* Spring-Loaded Liquid Glass App Icon */}
          <div className="relative z-10 ios-launch-icon">
            <div className="relative p-1.5 rounded-[30px] liquid-glass-strong shadow-[0_24px_60px_-12px_rgba(0,122,255,0.38)]">
              <div className="relative overflow-hidden rounded-[24px] h-22 w-22 sm:h-24 sm:w-24">
                <img
                  src={appIconUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="ios-launch-sheen absolute inset-0 pointer-events-none" />
                <div className="ios-launch-sheen-second absolute inset-0 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Staggered Title, Physics Subtitle & Liquid Progress Bar */}
        <div className="mt-4 flex flex-col items-center text-center px-6">
          <h1 className="ios-launch-title font-display text-2xl sm:text-[28px] font-bold tracking-tight text-slate-950 dark:text-white">
            IsipAgham
          </h1>
          <p className="ios-launch-subtitle mt-1 text-xs sm:text-sm font-medium tracking-wide text-slate-500 dark:text-slate-400">
            Grade 12 Physics 1 · 2 · 3
          </p>

          <div className="ios-launch-progress-track mt-4 h-1.5 w-36 sm:w-44 overflow-hidden rounded-full liquid-progress-track">
            <div className="ios-launch-progress-fill h-full w-full rounded-full liquid-progress-fill" />
          </div>
        </div>
      </div>
    </div>
  );
};
