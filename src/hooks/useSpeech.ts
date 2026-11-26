import { useCallback, useEffect, useRef, useState } from 'react';
import { synthesizeSpeechApi, type NaturalVoiceName } from '../lib/api';

const VOICE_STORAGE_KEY = 'isipagham_tts_voice';
const VOICE_EVENT_NAME = 'isipagham:tts-voice';

export const NATURAL_VOICE_OPTIONS: Array<{
  id: NaturalVoiceName;
  label: string;
  description: string;
}> = [
  { id: 'Aria', label: 'Aria (Warm Tutor)', description: 'Natural, expressive & conversational' },
  { id: 'Sarah', label: 'Sarah (Calm & Clear)', description: 'Soft, steady study narration' },
  { id: 'Liam', label: 'Liam (Lively)', description: 'Upbeat & engaging explainer' },
  { id: 'Brian', label: 'Brian (Deep & Crisp)', description: 'Rich, resonant lecture voice' },
  { id: 'George', label: 'George (Storyteller)', description: 'Warm, articulate British tone' },
];

const LEGACY_VOICE_MAP: Record<string, NaturalVoiceName> = {
  Zephyr: 'Aria',
  Kore: 'Sarah',
  Puck: 'Liam',
  Charon: 'Brian',
  Fenrir: 'George',
};

const MAX_CACHE_ENTRIES = 40;
const audioBufferBytesCache = new Map<string, { bytes: Uint8Array; mimeType: string }>();

let ttsAudioCtx: AudioContext | null = null;
function ensureTtsAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ttsAudioCtx) {
    ttsAudioCtx = new Ctor();
  }
  if (ttsAudioCtx.state === 'suspended') {
    void ttsAudioCtx.resume().catch(() => undefined);
  }
  return ttsAudioCtx;
}

function getStoredVoice(): NaturalVoiceName {
  if (typeof window === 'undefined') return 'Aria';
  try {
    const raw = window.localStorage.getItem(VOICE_STORAGE_KEY);
    if (raw && NATURAL_VOICE_OPTIONS.some((v) => v.id === raw)) {
      return raw as NaturalVoiceName;
    }
    if (raw && raw in LEGACY_VOICE_MAP) {
      return LEGACY_VOICE_MAP[raw];
    }
  } catch {
    // ignore storage errors
  }
  return 'Aria';
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
    .replace(/\\(?:left|right|displaystyle|quad|qquad|,|;)\b/g, ' ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 over $2')
    .replace(/\\sqrt\{([^}]+)\}/g, 'square root of $1')
    .replace(/\\vec\{([^}]+)\}/g, 'vector $1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\^\{\\circ\}|\\circ|°/g, ' degrees')
    .replace(/\\sin\b/g, 'sine ')
    .replace(/\\cos\b/g, 'cosine ')
    .replace(/\\tan\b/g, 'tangent ')
    .replace(/\bsin\(/g, 'sine of (')
    .replace(/\bcos\(/g, 'cosine of (')
    .replace(/\btan\(/g, 'tangent of (')
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
    .replace(/\\Phi|\\phi/g, 'phi ')
    .replace(/\\varepsilon/g, 'epsilon ')
    .replace(/\\Omega/g, 'ohms ')
    .replace(/\\times|×/g, ' times ')
    .replace(/\\cdot|·/g, ' times ')
    .replace(/\\approx|≈/g, ' is approximately ')
    .replace(/\\leq|≤/g, ' is less than or equal to ')
    .replace(/\\geq|≥/g, ' is greater than or equal to ')
    .replace(/\\neq|≠/g, ' is not equal to ')
    .replace(/→|=>/g, ' gives ')
    .replace(/\bm\/s\^\{?2\}?|\bm\/s²/gi, 'meters per second squared')
    .replace(/\bm\/s\b/gi, 'meters per second')
    .replace(/\bkm\/h\b/gi, 'kilometers per hour')
    .replace(/\brad\/s\^\{?2\}?/gi, 'radians per second squared')
    .replace(/\brad\/s\b/gi, 'radians per second')
    .replace(/\^\{?2\}?/g, ' squared')
    .replace(/\^\{?3\}?/g, ' cubed')
    .replace(/\^\{(-?\d+)\}/g, ' to the power of $1')
    .replace(/\^(-?\d+)/g, ' to the power of $1')
    .replace(/([A-Za-z])_\{([^}]+)\}/g, '$1 $2')
    .replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1 $2')
    .replace(/\s*=\s*/g, ' equals ')
    .replace(/\s*\+\s*/g, ' plus ')
    .replace(/(\d)\s*-\s*(\d)/g, '$1 minus $2')
    .replace(/\s*\/\s*/g, ' divided by ')
    .replace(/[{}]/g, ' ')
    .replace(/[*#_`~|]/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitIntoSpeechChunks(text: string, maxChunkLen = 420): string[] {
  if (text.length <= maxChunkLen) return [text];

  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;
    if (sentence.length > maxChunkLen) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      // Split long sentences softly at commas/semicolons
      const subParts = sentence.split(/(?<=[,;:])\s+/);
      let sub = '';
      for (const part of subParts) {
        if ((sub + ' ' + part).trim().length > maxChunkLen && sub) {
          chunks.push(sub.trim());
          sub = part;
        } else {
          sub = sub ? `${sub} ${part}` : part;
        }
      }
      if (sub.trim()) chunks.push(sub.trim());
      continue;
    }

    if ((current + ' ' + sentence).trim().length > maxChunkLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text.slice(0, maxChunkLen)];
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryStr = window.atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

function cacheAudioBytes(key: string, entry: { bytes: Uint8Array; mimeType: string }) {
  if (audioBufferBytesCache.has(key)) {
    audioBufferBytesCache.delete(key);
  }
  audioBufferBytesCache.set(key, entry);
  if (audioBufferBytesCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioBufferBytesCache.keys().next().value;
    if (oldestKey) {
      audioBufferBytesCache.delete(oldestKey);
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
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [rate, setRateState] = useState(1);
  const [voice, setVoiceState] = useState<NaturalVoiceName>(() => getStoredVoice());

  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
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
    if (activeSourceRef.current) {
      activeSourceRef.current.playbackRate.value = nextRate;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.playbackRate = nextRate;
    }
  }, []);

  const stop = useCallback(() => {
    seqRef.current += 1;
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.onended = null;
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {
        // ignore if already stopped
      }
      activeSourceRef.current = null;
    }
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (activeUtteranceRef.current) {
      activeUtteranceRef.current.onstart = null;
      activeUtteranceRef.current.onend = null;
      activeUtteranceRef.current.onerror = null;
      activeUtteranceRef.current = null;
    }
    if (browserSupported) {
      window.speechSynthesis.cancel();
    }
    setLoading(false);
    setSpeaking(false);
  }, [browserSupported]);

  const speakWithBrowserFallback = useCallback(
    (cleanedText: string, requestSeq: number, errorOnFailure?: string): boolean => {
      if (!browserSupported || seqRef.current !== requestSeq) {
        setLoading(false);
        setSpeaking(false);
        return false;
      }

      const browserChunks = splitIntoSpeechChunks(cleanedText, 210);
      if (browserChunks.length === 0) {
        setLoading(false);
        setSpeaking(false);
        return false;
      }

      window.speechSynthesis.cancel();
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const speakChunkAt = (chunkIdx: number) => {
        if (seqRef.current !== requestSeq) return;
        if (chunkIdx >= browserChunks.length) {
          activeUtteranceRef.current = null;
          setLoading(false);
          setSpeaking(false);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(browserChunks[chunkIdx]);
        activeUtteranceRef.current = utterance;
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
            speakChunkAt(chunkIdx + 1);
          }
        };
        utterance.onerror = (event) => {
          if (seqRef.current !== requestSeq) return;
          activeUtteranceRef.current = null;
          setLoading(false);
          setSpeaking(false);
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            setSpeechError(
              errorOnFailure || 'Could not play voice audio on this browser.'
            );
          }
        };

        window.speechSynthesis.speak(utterance);
      };

      // Defer slightly after cancel() so Chromium does not cancel the newly queued utterance
      fallbackTimerRef.current = window.setTimeout(() => {
        fallbackTimerRef.current = null;
        speakChunkAt(0);
      }, 35);
      return true;
    },
    [browserSupported]
  );

  const fetchChunkAudio = useCallback(
    async (
      chunkText: string,
      chosenVoice: NaturalVoiceName,
      signal: AbortSignal
    ): Promise<{ bytes: Uint8Array; mimeType: string }> => {
      const cacheKey = `${chosenVoice}::${chunkText}`;
      const cached = audioBufferBytesCache.get(cacheKey);
      if (cached) return cached;

      const { audioBase64, mimeType } = await synthesizeSpeechApi({
        text: chunkText,
        voiceName: chosenVoice,
        signal,
      });
      const entry = {
        bytes: base64ToUint8Array(audioBase64),
        mimeType: mimeType || 'audio/mpeg',
      };
      cacheAudioBytes(cacheKey, entry);
      return entry;
    },
    []
  );

  const playAudioBytes = useCallback(
    async (
      entry: { bytes: Uint8Array; mimeType: string },
      requestSeq: number
    ): Promise<void> => {
      if (seqRef.current !== requestSeq) return;
      const ctx = ensureTtsAudioContext();

      if (ctx) {
        try {
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          // Copy slice because decodeAudioData detaches the passed ArrayBuffer
          const copyBuf = entry.bytes.buffer.slice(
            entry.bytes.byteOffset,
            entry.bytes.byteOffset + entry.bytes.byteLength
          );
          const audioBuffer = await ctx.decodeAudioData(copyBuf as ArrayBuffer);
          if (seqRef.current !== requestSeq) return;

          await new Promise<void>((resolve, reject) => {
            if (seqRef.current !== requestSeq) {
              resolve();
              return;
            }
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.playbackRate.value = rateRef.current;
            source.connect(ctx.destination);
            activeSourceRef.current = source;

            source.onended = () => {
              if (activeSourceRef.current === source) {
                activeSourceRef.current = null;
              }
              resolve();
            };

            try {
              setLoading(false);
              setSpeaking(true);
              source.start(0);
            } catch (err) {
              reject(err);
            }
          });
          return;
        } catch {
          // Fall through to HTMLAudioElement if decodeAudioData fails
        }
      }

      const copyBytes = new Uint8Array(entry.bytes.length);
      copyBytes.set(entry.bytes);
      const blob = new Blob([copyBytes], { type: entry.mimeType || 'audio/wav' });
      const url = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        if (seqRef.current !== requestSeq) {
          URL.revokeObjectURL(url);
          resolve();
          return;
        }
        const audio = new Audio(url);
        audio.playbackRate = rateRef.current;
        activeAudioRef.current = audio;

        audio.onplay = () => {
          if (seqRef.current === requestSeq) {
            setLoading(false);
            setSpeaking(true);
          }
        };
        audio.onended = () => {
          URL.revokeObjectURL(url);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          reject(new Error('Audio element error'));
        };

        void audio.play().catch((err) => {
          URL.revokeObjectURL(url);
          if (activeAudioRef.current === audio) {
            activeAudioRef.current = null;
          }
          reject(err);
        });
      });
    },
    []
  );

  const speak = useCallback(
    (rawText: string) => {
      const cleaned = cleanPhysicsSpeechText(rawText);
      if (!supported || !cleaned) return;

      stop();
      setSpeechError(null);
      // Unlock AudioContext synchronously during user click gesture so async audio never gets blocked
      ensureTtsAudioContext();

      const requestSeq = seqRef.current;
      const chosenVoice = voice;

      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        speakWithBrowserFallback(cleaned, requestSeq);
        return;
      }

      const chunks = splitIntoSpeechChunks(cleaned, 480);
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);

      void (async () => {
        let playedAnyApiChunk = false;
        try {
          let nextPromise: Promise<{ bytes: Uint8Array; mimeType: string }> | null =
            fetchChunkAudio(chunks[0], chosenVoice, controller.signal);

          for (let idx = 0; idx < chunks.length; idx += 1) {
            if (seqRef.current !== requestSeq || !nextPromise) break;
            const currentEntry = await nextPromise;
            if (seqRef.current !== requestSeq) break;

            // Prefetch next chunk in parallel while current chunk plays
            nextPromise =
              idx + 1 < chunks.length
                ? fetchChunkAudio(chunks[idx + 1], chosenVoice, controller.signal)
                : null;

            await playAudioBytes(currentEntry, requestSeq);
            playedAnyApiChunk = true;
          }

          if (seqRef.current === requestSeq) {
            abortRef.current = null;
            setLoading(false);
            setSpeaking(false);
          }
        } catch (err) {
          if (seqRef.current !== requestSeq) return;
          if (err instanceof DOMException && err.name === 'AbortError') return;
          abortRef.current = null;

          const errMessage =
            err instanceof Error
              ? err.message
              : 'Could not play natural voice audio right now.';

          // Automatically fall back to browser Web Speech if cloud TTS failed before playing
          if (!playedAnyApiChunk && browserSupported) {
            const started = speakWithBrowserFallback(cleaned, requestSeq, errMessage);
            if (started) return;
          }

          setLoading(false);
          setSpeaking(false);
          setSpeechError(errMessage);
        }
      })();
    },
    [
      supported,
      browserSupported,
      stop,
      voice,
      fetchChunkAudio,
      playAudioBytes,
      speakWithBrowserFallback,
    ]
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
    speechError,
    rate,
    setRate,
    voice,
    setVoice,
    speak,
    stop,
  };
}
