import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, LogIn, Moon, Sparkles, Sun, Trophy, Volume2 } from 'lucide-react';
import { IOS_ISLAND_EVENT, type IosIslandPayload } from '../../lib/iosEffects';

export const IosDynamicIsland: React.FC = () => {
  const [active, setActive] = useState<(IosIslandPayload & { key: number }) | null>(null);

  useEffect(() => {
    let hideTimer: number | null = null;

    const handleEvent = (e: Event) => {
      const detail = (e as CustomEvent<IosIslandPayload>).detail;
      if (!detail?.title) return;
      setActive({ ...detail, key: Date.now() });

      if (hideTimer !== null) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        setActive(null);
      }, 2400);
    };

    window.addEventListener(IOS_ISLAND_EVENT, handleEvent);
    return () => {
      window.removeEventListener(IOS_ISLAND_EVENT, handleEvent);
      if (hideTimer !== null) window.clearTimeout(hideTimer);
    };
  }, []);

  if (!active) return null;

  const lower = active.title.toLowerCase();
  const icon = lower.includes('dark') ? (
    <Moon className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
  ) : lower.includes('light') ? (
    <Sun className="h-4 w-4 text-amber-300 shrink-0" aria-hidden="true" />
  ) : lower.includes('sound') ? (
    <Volume2 className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
  ) : lower.includes('signed out') ? (
    <Lock className="h-4 w-4 text-sky-300 shrink-0" aria-hidden="true" />
  ) : lower.includes('welcome') || lower.includes('signed in') || lower.includes('account') ? (
    <LogIn className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
  ) : lower.includes('xp') ? (
    <Trophy className="h-4 w-4 text-amber-400 shrink-0" aria-hidden="true" />
  ) : active.tone === 'emerald' ? (
    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
  ) : (
    <Sparkles className="h-4 w-4 text-sky-400 shrink-0" aria-hidden="true" />
  );

  return (
    <div
      key={active.key}
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[90] pointer-events-none px-4 max-w-[calc(100vw-2rem)]"
    >
      <div className="ios-island-enter rounded-full bg-slate-950/90 dark:bg-[#0D1428]/92 backdrop-blur-2xl border border-white/20 shadow-[0_14px_38px_-6px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.22)] px-4 py-2 flex items-center gap-2.5 text-white whitespace-nowrap">
        {icon}
        <span className="text-xs font-bold tracking-tight">{active.title}</span>
        {active.subtitle && (
          <span className="text-xs text-slate-300 font-medium truncate max-w-[160px]">
            · {active.subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
