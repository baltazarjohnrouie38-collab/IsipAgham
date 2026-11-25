import { useCallback, useEffect, useRef, useState } from 'react';
import { synthesizeSpeechApi, type NaturalVoiceName } from '../lib/api';

const VOICE_STORAGE_KEY = 'isipagham_tts_voice';
const VOICE_EVENT_NAME = 'isipagham:tts-voice';

export const NATURAL_VOICE_OPTIONS: Array<{
  id: NaturalVoiceName;
  label: string;
  description: string;
}> = [
  { id: 'Zephyr', label: 'Zephyr (Warm Tutor)', description: 'Clear, upbeat & conversational' },
  { id: 'Kore', label: 'Kore (Calm & Steady)', description: 'Gentle, articulate study guide' },
  { id: 'Puck', label: 'Puck (Lively)', description: 'Energetic & bright explainer' },
  { id: 'Charon', label: 'Charon (Deep & Clear)', description: 'Grounded, measured lecture tone' },
  { id: 'Fenrir', label: 'Fenrir (Crisp)', description: 'Focused & expressive narration' },
];

const MAX_CACHE_ENTRIES = 28;
const audioUrlCache = new Map<string, string>();

function getStoredVoice(): NaturalVoiceName {
  if (typeof window === 'undefined') return 'Zephyr';
  try {
    const raw = window.localStorage.getItem(VOICE_STORAGE_KEY) as NaturalVoiceName | null;
    if (raw && NATURAL_VOICE_OPTIONS.some((v) => v.id === raw)) {
      return raw;
    }
  } catch {
    // ignore storage errors
  }
  return 'Zephyr';
}

function storeVoice(voice: NaturalVoiceName) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_STORAGE_KEY, voice);
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new CustomEvent(VOICE_EVENT_NAME, { detail: voice }));
}

export function cleanPhysicsSpeechText(raw: string): string {
  return raw
    .replace(/\$\$/g, ' ')
    .replace(/\$/g, '')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\vec\{([^}]+)\}/g, 'vector $1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\Delta/g, 'delta ')
    .replace(/\\theta/g, 'theta ')
    .replace(/\\omega/g, 'omega ')
    .replace(/\\alpha/g, 'alpha ')
    .replace(/\\beta/g, 'beta ')
    .replace(/\\gamma/g, 'gamma ')
    .replace(/\\lambda/g, 'lambda ')
    .replace(/\\mu/g, 'mu ')
    .replace(/\\pi/g, 'pi ')
    .replace(/\\rho/g, 'rho ')
    .replace(/\\sigma/g, 'sigma ')
    .replace(/\\tau/g, 'tau ')
    .replace(/\\Phi/g, 'phi ')
    .replace(/\\times/g, ' times ')
    .replace(/\\cdot/g, ' times ')
    .replace(/\^2\b/g, ' squared')
    .replace(/\^3\b/g, ' cubed')
    .replace(/[*#_`~]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function base64ToBlobUrl(base64: string, mimeType: string): string {
  const binaryStr = window.atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mimeType || 'audio/wav' });
  return URL.createObjectURL(blob);
}

function cacheAudioUrl(key: string, url: string) {
  if (audioUrlCache.has(key)) {
    audioUrlCache.delete(key);
  }
  audioUrlCache.set(key, url);
  if (audioUrlCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioUrlCache.keys().next().value;
    if (oldestKey) {
      const oldUrl = audioUrlCache.get(oldestKey);
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      audioUrlCache.delete(oldestKey);
    }
  }
}

function pickBestNaturalBrowserVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  const pool = english.length > 0 ? english : voices;

  const preferredPatterns = [
    /natural/i,
    /neural/i,
    /aria|jenny|guy|samantha|ava|daniel|karen|serena/i,
    /google\s+(us|uk)\s+english/i,
    /en-US|en-GB/i,
  ];

  for (const pattern of preferredPatterns) {
    const match = pool.find((v) => pattern.test(v.name) || pattern.test(v.lang));
    if (match) return match;
  }

  return pool[0] || null;
}

export function useSpeech() {
  const browserSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const audioSupported = typeof window !== 'undefined' && typeof Audio !== 'undefined';
  const supported = audioSupported || browserSupported;

  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rate, setRateState] = useState(1);
  const [voice, setVoiceState] = useState<NaturalVoiceName>(() => getStoredVoice());

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const rateRef = useRef(1);

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent<NaturalVoiceName>;
      if (custom.detail) setVoiceState(custom.detail);
    };
    window.addEventListener(VOICE_EVENT_NAME, handler);
    return () => window.removeEventListener(VOICE_EVENT_NAME, handler);
  }, []);

  const setVoice = useCallback((nextVoice: NaturalVoiceName) => {
    storeVoice(nextVoice);
    setVoiceState(nextVoice);
  }, []);

  const setRate = useCallback((nextRate: number) => {
    rateRef.current = nextRate;
    setRateState(nextRate);
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = nextRate;
    }
  }, []);

  const stop = useCallback(() => {
    seqRef.current += 1;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (browserSupported) {
      window.speechSynthesis.cancel();
    }
    setLoading(false);
    setSpeaking(false);
  }, [browserSupported]);

  const speakWithBrowserFallback = useCallback(
    (cleanedText: string, requestSeq: number) => {
      if (!browserSupported || seqRef.current !== requestSeq) {
        setLoading(false);
        setSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanedText);
      const bestVoice = pickBestNaturalBrowserVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      utterance.lang = bestVoice?.lang || 'en-US';
      utterance.rate = rateRef.current;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        if (seqRef.current === requestSeq) {
          setLoading(false);
          setSpeaking(true);
        }
      };
      utterance.onend = () => {
        if (seqRef.current === requestSeq) {
          setLoading(false);
          setSpeaking(false);
        }
      };
      utterance.onerror = () => {
        if (seqRef.current === requestSeq) {
          setLoading(false);
          setSpeaking(false);
        }
      };
      window.speechSynthesis.speak(utterance);
    },
    [browserSupported]
  );

  const speak = useCallback(
    (rawText: string) => {
      const cleaned = cleanPhysicsSpeechText(rawText);
      if (!supported || !cleaned) return;

      stop();
      const requestSeq = seqRef.current;
      const chosenVoice = voice;
      const cacheKey = `${chosenVoice}::${cleaned.slice(0, 2600)}`;

      const playAudioUrl = (objectUrl: string) => {
        if (seqRef.current !== requestSeq) return;
        const audio = new Audio(objectUrl);
        audio.playbackRate = rateRef.current;
        activeAudioRef.current = audio;

        audio.onplay = () => {
          if (seqRef.current === requestSeq) {
            setLoading(false);
            setSpeaking(true);
          }
        };
        audio.onended = () => {
          if (seqRef.current === requestSeq) {
            activeAudioRef.current = null;
            setLoading(false);
            setSpeaking(false);
          }
        };
        audio.onerror = () => {
          if (seqRef.current === requestSeq) {
            activeAudioRef.current = null;
            speakWithBrowserFallback(cleaned, requestSeq);
          }
        };

        void audio.play().catch(() => {
          if (seqRef.current === requestSeq) {
            activeAudioRef.current = null;
            speakWithBrowserFallback(cleaned, requestSeq);
          }
        });
      };

      const cachedUrl = audioUrlCache.get(cacheKey);
      if (cachedUrl) {
        playAudioUrl(cachedUrl);
        return;
      }

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        speakWithBrowserFallback(cleaned, requestSeq);
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      void synthesizeSpeechApi({
        text: cleaned,
        voiceName: chosenVoice,
        signal: controller.signal,
      })
        .then(({ audioBase64, mimeType }) => {
          if (seqRef.current !== requestSeq) return;
          abortRef.current = null;
          const url = base64ToBlobUrl(audioBase64, mimeType);
          cacheAudioUrl(cacheKey, url);
          playAudioUrl(url);
        })
        .catch((err) => {
          if (seqRef.current !== requestSeq) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          abortRef.current = null;
          speakWithBrowserFallback(cleaned, requestSeq);
        });
    },
    [supported, stop, voice, speakWithBrowserFallback]
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    supported,
    speaking,
    loading,
    rate,
    setRate,
    voice,
    setVoice,
    speak,
    stop,
  };
}
