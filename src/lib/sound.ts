import { useCallback, useEffect, useState } from 'react';
import { triggerIosIsland } from './iosEffects';

const SOUND_STORAGE_KEY = 'isipagham_sound_enabled';
const SOUND_EVENT_NAME = 'isipagham:sound-pref';

export type UiSoundKind =
  | 'click'
  | 'tab'
  | 'toggle'
  | 'flip'
  | 'login'
  | 'lock'
  | 'correct'
  | 'wrong'
  | 'celebrate'
  | 'success';

let sharedAudioCtx: AudioContext | null = null;
let cachedNoiseBuffer: AudioBuffer | null = null;
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

function getNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (cachedNoiseBuffer && cachedNoiseBuffer.sampleRate === ctx.sampleRate) {
    return cachedNoiseBuffer;
  }
  const length = Math.max(1, Math.floor(ctx.sampleRate * 0.08));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    channel[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length * 0.25));
  }
  cachedNoiseBuffer = buffer;
  return buffer;
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

// Soft iOS-style organic percussive noise transient (like iOS keyboard Tock / Lock / Switch)
function playTactileImpulse(
  ctx: AudioContext,
  opts: {
    centerFreq: number;
    q: number;
    duration: number;
    gain: number;
    startOffset?: number;
  }
) {
  const start = ctx.currentTime + (opts.startOffset ?? 0);
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(opts.centerFreq, start);
  filter.Q.setValueAtTime(opts.q, start);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(opts.gain, start + 0.0015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(start);
  source.stop(start + opts.duration + 0.01);
}

// Warm iOS marimba / glass-bell sine resonance
function playGlassTone(
  ctx: AudioContext,
  opts: {
    freq: number;
    endFreq?: number;
    startOffset?: number;
    duration: number;
    peakGain: number;
    addOvertone?: boolean;
  }
) {
  const start = ctx.currentTime + (opts.startOffset ?? 0);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(opts.freq, start);
  if (opts.endFreq) {
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, start + opts.duration);
  }

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(opts.peakGain, start + Math.min(0.006, opts.duration * 0.2));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + opts.duration + 0.015);

  if (opts.addOvertone) {
    const overtone = ctx.createOscillator();
    const overtoneGain = ctx.createGain();
    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(opts.freq * 2, start);

    overtoneGain.gain.setValueAtTime(0.0001, start);
    overtoneGain.gain.linearRampToValueAtTime(opts.peakGain * 0.22, start + 0.004);
    overtoneGain.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration * 0.55);

    overtone.connect(overtoneGain);
    overtoneGain.connect(ctx.destination);
    overtone.start(start);
    overtone.stop(start + opts.duration * 0.6);
  }
}

export function playUiSound(kind: UiSoundKind = 'click', forcePlay = false): void {
  if (typeof window === 'undefined') return;
  if (!forcePlay && !isSoundEnabled()) return;

  const nowMs = performance.now();
  const isPriorityTone =
    kind === 'correct' ||
    kind === 'wrong' ||
    kind === 'celebrate' ||
    kind === 'login' ||
    kind === 'lock';
  if (!isPriorityTone && nowMs - lastPlayTimestamp < 22) return;
  lastPlayTimestamp = nowMs;

  const ctx = getAudioContext();
  if (!ctx || ctx.state === 'suspended') return;

  if (kind === 'tab') {
    // Subtle iOS Liquid Glass dock / tab tap: crisp damped transient + warm body thump
    playTactileImpulse(ctx, { centerFreq: 2150, q: 2.2, duration: 0.014, gain: 0.045 });
    playGlassTone(ctx, { freq: 310, endFreq: 195, duration: 0.026, peakGain: 0.032 });
    return;
  }

  if (kind === 'toggle') {
    // Authentic iOS UISwitch micro-tock (soft tactile snap)
    playTactileImpulse(ctx, { centerFreq: 2600, q: 2.8, duration: 0.012, gain: 0.05 });
    playGlassTone(ctx, { freq: 380, endFreq: 520, duration: 0.024, peakGain: 0.024 });
    return;
  }

  if (kind === 'flip') {
    // Soft airy iOS card swipe / breath
    playTactileImpulse(ctx, { centerFreq: 1350, q: 0.9, duration: 0.045, gain: 0.042 });
    playGlassTone(ctx, { freq: 240, endFreq: 340, duration: 0.032, peakGain: 0.018 });
    return;
  }

  if (kind === 'login') {
    // Crisp Apple Face ID / glass unlock chime (E5 -> A5 -> C#6)
    playTactileImpulse(ctx, { centerFreq: 2200, q: 1.8, duration: 0.016, gain: 0.032 });
    playGlassTone(ctx, { freq: 659.25, duration: 0.16, peakGain: 0.038, addOvertone: true });
    playGlassTone(ctx, {
      freq: 880.0,
      duration: 0.18,
      peakGain: 0.04,
      startOffset: 0.075,
      addOvertone: true,
    });
    playGlassTone(ctx, {
      freq: 1108.73,
      duration: 0.28,
      peakGain: 0.044,
      startOffset: 0.15,
      addOvertone: true,
    });
    return;
  }

  if (kind === 'lock') {
    // Authentic iOS Lock / Sign-out soft dual mechanical glass click
    playTactileImpulse(ctx, { centerFreq: 1850, q: 2.4, duration: 0.016, gain: 0.055 });
    playGlassTone(ctx, { freq: 280, endFreq: 140, duration: 0.035, peakGain: 0.03 });
    playTactileImpulse(ctx, {
      centerFreq: 1350,
      q: 2.0,
      duration: 0.018,
      gain: 0.04,
      startOffset: 0.055,
    });
    playGlassTone(ctx, {
      freq: 190,
      endFreq: 105,
      duration: 0.045,
      peakGain: 0.026,
      startOffset: 0.055,
    });
    return;
  }

  if (kind === 'correct' || kind === 'success') {
    // Gentle Apple Pay / iOS Glass Bell confirmation chime (F5 -> C6)
    playGlassTone(ctx, {
      freq: 698.46,
      duration: 0.19,
      peakGain: 0.042,
      addOvertone: true,
    });
    playGlassTone(ctx, {
      freq: 1046.5,
      duration: 0.28,
      peakGain: 0.045,
      startOffset: 0.085,
      addOvertone: true,
    });
    return;
  }

  if (kind === 'celebrate') {
    // Warm Apple glass marimba flourish (F5 -> A5 -> C6 -> F6)
    const notes = [698.46, 880.0, 1046.5, 1396.91];
    notes.forEach((freq, idx) => {
      playGlassTone(ctx, {
        freq,
        duration: idx === 3 ? 0.36 : 0.16,
        peakGain: idx === 3 ? 0.048 : 0.038,
        startOffset: idx * 0.075,
        addOvertone: true,
      });
    });
    return;
  }

  if (kind === 'wrong') {
    // Soft muted iOS haptic nudge (warm low thump, zero harsh buzz)
    playGlassTone(ctx, { freq: 155, endFreq: 95, duration: 0.07, peakGain: 0.05 });
    playTactileImpulse(ctx, { centerFreq: 680, q: 1.5, duration: 0.02, gain: 0.03 });
    return;
  }

  // Default tactile iOS Tock (organic damped wood/glass tap — never a retro beep)
  playTactileImpulse(ctx, { centerFreq: 1950, q: 2.0, duration: 0.012, gain: 0.046 });
  playGlassTone(ctx, { freq: 210, endFreq: 120, duration: 0.02, peakGain: 0.028 });
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
      window.setTimeout(() => playUiSound('toggle', true), 15);
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
