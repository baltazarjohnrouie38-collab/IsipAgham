import React, { useEffect, useState } from 'react';
import appIconUrl from '../../assets/images/regenerated_image_1795555562184.jpg';
import liquidBackdropUrl from '../../assets/images/ios_liquid_backdrop_1795687710854.jpg';

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
    }, 580);

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, 960);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden transition-[opacity,transform] duration-350 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] ${
        phase === 'fading' ? 'opacity-0 scale-[1.06] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      <img
        src={liquidBackdropUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover brightness-105 saturate-110 dark:brightness-[0.34] dark:saturate-125"
        referrerPolicy="no-referrer"
      />
      <div className="absolute inset-0 bg-white/45 dark:bg-[#060913]/72 backdrop-blur-3xl" />

      <div className="relative z-10 flex flex-col items-center gap-4 ios-launch-icon">
        <div className="relative p-1.5 rounded-[30px] liquid-glass-strong shadow-[0_24px_60px_-12px_rgba(0,122,255,0.42)]">
          <div className="relative overflow-hidden rounded-[24px] h-22 w-22 sm:h-24 sm:w-24">
            <img
              src={appIconUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="ios-launch-sheen absolute inset-0 pointer-events-none" />
          </div>
        </div>

        <div className="text-center space-y-0.5">
          <p className="font-display text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            IsipAgham
          </p>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Grade 12 Physics
          </p>
        </div>
      </div>
    </div>
  );
};
