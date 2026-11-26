import React, { useEffect, useState } from 'react';
import appIconUrl from '../../assets/images/regenerated_image_1795555562184.jpg';

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
    }, 360);

    const doneTimer = window.setTimeout(() => {
      setPhase('done');
    }, 700);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase]);

  if (phase === 'done') return null;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden ios-app-canvas transition-[opacity,transform] duration-340 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] ${
        phase === 'fading' ? 'opacity-0 scale-[1.04]' : 'opacity-100 scale-100'
      }`}
    >
      <div className="relative z-10 flex items-center justify-center ios-launch-icon">
        <div className="relative p-1.5 rounded-[30px] liquid-glass-strong shadow-[0_24px_60px_-12px_rgba(0,122,255,0.34)]">
          <div className="relative overflow-hidden rounded-[24px] h-20 w-20 sm:h-22 sm:w-22">
            <img
              src={appIconUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="ios-launch-sheen absolute inset-0 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
};
