import { useCallback, useEffect, useState } from 'react';
import { triggerIosIsland } from './iosEffects';

const SOUND_STORAGE_KEY = 'isipagham_sound_enabled';
const SOUND_EVENT_NAME = 'isipagham:sound-pref';

export type UiSoundKind =
  | 'click'
  | 'tab'
  | 'toggle'
  | 'flip'
  | 'correct'
  | 'wrong'
  | 'celebrate'
  | 'success';

let sharedAudioCtx: AudioContext | null = null;
let lastPlayTimestamp = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new Ctor();
  }
  if (sharedAudioCtx.state === 'suspended') {
    void sharedAudioCtx.resume().catch(() => undefined);
  }
  return sharedAudioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const raw = window.localStorage.getItem(SOUND_STORAGE_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
  } catch {
    // Ignore storage errors in private contexts
  }
  window.dispatchEvent(new CustomEvent(SOUND_EVENT_NAME, { detail: enabled }));
}

function playTone(
  ctx: AudioContext,
  opts: {
    freq: number;
    endFreq?: number;
    type?: OscillatorType;
    startOffset?: number;
    duration: number;
    peakGain: number;
  }
) {
  const start = ctx.currentTime + (opts.startOffset ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, start + opts.duration);
  }

  gain.gain.setValueAtTime(0.0008, start);
  gain.gain.linearRampToValueAtTime(opts.peakGain, start + Math.min(0.012, opts.duration * 0.25));
  gain.gain.exponentialRampToValueAtTime(0.0006, start + opts.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + opts.duration + 0.01);
}

export function playUiSound(kind: UiSoundKind = 'click', forcePlay = false): void {
  if (typeof window === 'undefined') return;
  if (!forcePlay && !isSoundEnabled()) return;

  const nowMs = performance.now();
  const isPriorityTone = kind === 'correct' || kind === 'wrong' || kind === 'celebrate';
  if (!isPriorityTone && nowMs - lastPlayTimestamp < 22) return;
  lastPlayTimestamp = nowMs;

  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended') return;

  if (kind === 'tab') {
    // Gentle two-note glass/marimba step for switching tabs & nav items
    playTone(ctx, { freq: 523.25, duration: 0.048, peakGain: 0.045, type: 'sine' });
    playTone(ctx, {
      freq: 698.46,
      duration: 0.075,
      peakGain: 0.05,
      type: 'triangle',
      startOffset: 0.028,
    });
    return;
  }

  if (kind === 'toggle') {
    // Silky iOS glass switch pop
    playTone(ctx, {
      freq: 440,
      endFreq: 760,
      duration: 0.046,
      peakGain: 0.048,
      type: 'sine',
    });
    return;
  }

  if (kind === 'flip') {
    playTone(ctx, {
      freq: 340,
      endFreq: 610,
      duration: 0.058,
      peakGain: 0.052,
      type: 'triangle',
    });
    return;
  }

  if (kind === 'correct' || kind === 'success') {
    // Bright rewarding major chord chime (C5 -> E5 -> G5)
    playTone(ctx, { freq: 523.25, duration: 0.14, peakGain: 0.058, type: 'triangle' });
    playTone(ctx, {
      freq: 659.25,
      duration: 0.16,
      peakGain: 0.058,
      type: 'triangle',
      startOffset: 0.065,
    });
    playTone(ctx, {
      freq: 783.99,
      duration: 0.22,
      peakGain: 0.05,
      type: 'sine',
      startOffset: 0.13,
    });
    return;
  }

  if (kind === 'celebrate') {
    // Joyful 4-note ascending arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      playTone(ctx, {
        freq,
        duration: idx === 3 ? 0.3 : 0.14,
        peakGain: idx === 3 ? 0.062 : 0.052,
        type: idx === 3 ? 'sine' : 'triangle',
        startOffset: idx * 0.07,
      });
    });
    return;
  }

  if (kind === 'wrong') {
    // Soft, gentle low wood tap (encouraging, never harsh)
    playTone(ctx, {
      freq: 270,
      endFreq: 185,
      duration: 0.11,
      peakGain: 0.052,
      type: 'triangle',
    });
    return;
  }

  // Default tactile click
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1180, t);
  filter.Q.setValueAtTime(1.1, t);

  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, t);
  osc.frequency.exponentialRampToValueAtTime(340, t + 0.024);

  gain.gain.setValueAtTime(0.001, t);
  gain.gain.linearRampToValueAtTime(0.065, t + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.026);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.03);
}

export function useSoundSettings() {
  const [soundEnabled, setEnabledState] = useState<boolean>(() => isSoundEnabled());

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<boolean>;
      if (typeof custom.detail === 'boolean') {
        setEnabledState(custom.detail);
      } else {
        setEnabledState(isSoundEnabled());
      }
    };
    window.addEventListener(SOUND_EVENT_NAME, handler);
    return () => window.removeEventListener(SOUND_EVENT_NAME, handler);
  }, []);

  const toggleSound = useCallback(() => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setEnabledState(next);
    triggerIosIsland({
      title: next ? 'Sound Effects On' : 'Sound Effects Muted',
      tone: 'neutral',
    });
    if (next) {
      getAudioContext();
      window.setTimeout(() => playUiSound('toggle', true), 15);
    }
  }, []);

  const updateSound = useCallback((next: boolean) => {
    setSoundEnabled(next);
    setEnabledState(next);
    if (next) {
      getAudioContext();
      window.setTimeout(() => playUiSound('click', true), 15);
    }
  }, []);

  return { soundEnabled, toggleSound, setSoundEnabled: updateSound };
}

export function useGlobalClickSound() {
  useEffect(() => {
    const unlock = () => {
      getAudioContext();
    };

    const handleClick = (e: MouseEvent) => {
      if (!isSoundEnabled()) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest(
        'button, a, [role="button"], [role="tab"], summary, select, input[type="checkbox"], input[type="radio"]'
      ) as HTMLElement | null;

      if (!interactive) return;
      if (
        (interactive as HTMLButtonElement).disabled ||
        interactive.getAttribute('aria-disabled') === 'true'
      ) {
        return;
      }

      const explicit = target.closest('[data-sound]')?.getAttribute('data-sound') as
        | UiSoundKind
        | 'none'
        | undefined;
      if (explicit === 'none') return;

      if (explicit) {
        playUiSound(explicit);
        return;
      }

      if (interactive.closest('nav') || interactive.getAttribute('role') === 'tab') {
        playUiSound('tab');
        return;
      }

      playUiSound('click');
    };

    document.addEventListener('pointerdown', unlock, { passive: true, capture: true });
    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('pointerdown', unlock, { capture: true });
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, []);
}
