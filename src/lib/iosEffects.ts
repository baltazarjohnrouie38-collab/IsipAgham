import { useEffect } from 'react';

export interface IosIslandPayload {
  title: string;
  subtitle?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'neutral';
}

export const IOS_ISLAND_EVENT = 'isipagham:ios-island';

export function triggerIosIsland(payload: IosIslandPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<IosIslandPayload>(IOS_ISLAND_EVENT, { detail: payload }));
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useIosInteractiveEffects(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    let activeCard: HTMLElement | null = null;
    let pendingX = 50;
    let pendingY = 50;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'button, a, [role="button"], [role="tab"], [data-ios-press]'
      ) as HTMLElement | null;

      if (!interactive) return;
      if (
        (interactive as HTMLButtonElement).disabled ||
        interactive.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      if (e.pointerType === 'touch' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(6);
        } catch {
          // Ignore vibration permission errors
        }
      }

      if (prefersReducedMotion()) return;

      const x = e.clientX;
      const y = e.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return;

      const ripple = document.createElement('span');
      ripple.className = 'ios-touch-ripple';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      document.body.appendChild(ripple);

      window.setTimeout(() => {
        ripple.remove();
      }, 440);
    };

    const flushSpotlight = () => {
      rafId = null;
      if (activeCard) {
        activeCard.style.setProperty('--glass-mx', `${pendingX}%`);
        activeCard.style.setProperty('--glass-my', `${pendingY}%`);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || prefersReducedMotion()) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const card = target.closest(
        '.liquid-glass, .liquid-glass-strong, .liquid-btn-primary, .liquid-btn-outline'
      ) as HTMLElement | null;

      if (!card) {
        if (activeCard) {
          activeCard.style.removeProperty('--glass-mx');
          activeCard.style.removeProperty('--glass-my');
          activeCard = null;
        }
        return;
      }

      if (activeCard && activeCard !== card) {
        activeCard.style.removeProperty('--glass-mx');
        activeCard.style.removeProperty('--glass-my');
      }
      activeCard = card;

      const rect = card.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      pendingX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      pendingY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

      if (rafId === null) {
        rafId = window.requestAnimationFrame(flushSpotlight);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, { passive: true, capture: true });
    document.addEventListener('pointermove', handlePointerMove, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('pointermove', handlePointerMove);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (activeCard) {
        activeCard.style.removeProperty('--glass-mx');
        activeCard.style.removeProperty('--glass-my');
      }
    };
  }, []);
}
