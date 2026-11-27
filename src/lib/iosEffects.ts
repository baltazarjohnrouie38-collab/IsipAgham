import { useEffect, useState } from 'react';

export interface IosIslandPayload {
  title: string;
  subtitle?: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'neutral';
}

export interface IosAuthTransitionPayload {
  mode: 'login' | 'signup' | 'logout' | 'deleted';
  username?: string;
}

export const IOS_ISLAND_EVENT = 'isipagham:ios-island';
export const IOS_AUTH_TRANSITION_EVENT = 'isipagham:ios-auth-transition';

export function triggerIosIsland(payload: IosIslandPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<IosIslandPayload>(IOS_ISLAND_EVENT, { detail: payload }));
}

export function triggerIosAuthTransition(payload: IosAuthTransitionPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<IosAuthTransitionPayload>(IOS_AUTH_TRANSITION_EVENT, { detail: payload })
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function prefersReducedTransparency(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
}

export function useTabBarScrollMinimize(): boolean {
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || prefersReducedMotion()) return;

    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      if (y <= 32) {
        setMinimized(false);
      } else if (y - lastY > 14 && y > 96) {
        setMinimized(true);
      } else if (lastY - y > 12) {
        setMinimized(false);
      }
      lastY = y;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return minimized;
}

export function useIosInteractiveEffects(): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    let scrollRafId: number | null = null;
    let activeCard: HTMLElement | null = null;
    let pendingX = 50;
    let pendingY = 50;

    const updateScrollAttr = () => {
      scrollRafId = null;
      const scrolled = window.scrollY > 18;
      if (scrolled) {
        document.documentElement.dataset.iosScrolled = 'true';
      } else {
        delete document.documentElement.dataset.iosScrolled;
      }
    };

    const handleScroll = () => {
      if (scrollRafId === null) {
        scrollRafId = window.requestAnimationFrame(updateScrollAttr);
      }
    };

    updateScrollAttr();

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

      const isTouch = e.pointerType === 'touch';
      if (isTouch && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(6);
        } catch {
          // Ignore vibration permission errors
        }
      }

      if (prefersReducedMotion() || prefersReducedTransparency()) return;

      const x = e.clientX;
      const y = e.clientY;
      if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) return;

      const ripple = document.createElement('span');
      ripple.className = isTouch ? 'ios-touch-ripple' : 'ios-touch-ripple ios-touch-ripple-fine';
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      document.body.appendChild(ripple);

      window.setTimeout(() => {
        ripple.remove();
      }, 420);
    };

    const flushSpotlight = () => {
      rafId = null;
      if (activeCard) {
        activeCard.style.setProperty('--glass-mx', `${pendingX}%`);
        activeCard.style.setProperty('--glass-my', `${pendingY}%`);
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || prefersReducedMotion() || prefersReducedTransparency()) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const card = target.closest(
        '.liquid-glass, .liquid-glass-strong, .liquid-dock, .liquid-btn-primary, .liquid-btn-outline, .apple-surface'
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
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, { capture: true });
      document.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (scrollRafId !== null) window.cancelAnimationFrame(scrollRafId);
      if (activeCard) {
        activeCard.style.removeProperty('--glass-mx');
        activeCard.style.removeProperty('--glass-my');
      }
      delete document.documentElement.dataset.iosScrolled;
    };
  }, []);
}
