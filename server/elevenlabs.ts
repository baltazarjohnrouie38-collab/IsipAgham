import { formatPhysicsTextForSpeech, redactPotentialPii } from './gemini.ts';

export type ElevenLabsPresetVoice = 'Aria' | 'Sarah' | 'Liam' | 'Brian' | 'George';

export class ElevenLabsServiceError extends Error {
  statusCode: number;
  retryable: boolean;

  constructor(message: string, statusCode = 500, retryable = false) {
    super(message);
    this.name = 'ElevenLabsServiceError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

const ELEVENLABS_VOICE_MAP: Record<ElevenLabsPresetVoice, { id: string; preferredNames: string[] }> = {
  Aria: {
    id: '9BWtsMINqrJLrRacOk9x',
    preferredNames: ['aria', 'rachel', 'alice', 'sarah'],
  },
  Sarah: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    preferredNames: ['sarah', 'bella', 'jessica', 'laura', 'lily'],
  },
  Liam: {
    id: 'TX3LPaxmHKxFdv7VOQHJ',
    preferredNames: ['liam', 'charlie', 'josh', 'antoni'],
  },
  Brian: {
    id: 'nPczCjzI2devNBz1zQrb',
    preferredNames: ['brian', 'daniel', 'adam', 'george'],
  },
  George: {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    preferredNames: ['george', 'daniel', 'callum', 'brian'],
  },
};

const LEGACY_VOICE_ALIAS: Record<string, ElevenLabsPresetVoice> = {
  Zephyr: 'Aria',
  Kore: 'Sarah',
  Puck: 'Liam',
  Charon: 'Brian',
  Fenrir: 'George',
};

const ELEVENLABS_PRIMARY_MODEL = 'eleven_flash_v2_5';
const ELEVENLABS_FALLBACK_MODEL = 'eleven_multilingual_v2';

interface AccountVoice {
  voice_id: string;
  name: string;
}

let cachedAccountVoices: { fetchedAt: number; voices: AccountVoice[] } | null = null;
const VOICE_CACHE_TTL_MS = 5 * 60 * 1000;

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

function resolvePresetVoice(voiceName?: string): ElevenLabsPresetVoice {
  if (voiceName && voiceName in ELEVENLABS_VOICE_MAP) {
    return voiceName as ElevenLabsPresetVoice;
  }
  if (voiceName && voiceName in LEGACY_VOICE_ALIAS) {
    return LEGACY_VOICE_ALIAS[voiceName];
  }
  return 'Aria';
}

async function fetchAccountVoices(apiKey: string): Promise<AccountVoice[]> {
  if (cachedAccountVoices && Date.now() - cachedAccountVoices.fetchedAt < VOICE_CACHE_TTL_MS) {
    return cachedAccountVoices.voices;
  }

  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    method: 'GET',
    headers: {
      'xi-api-key': apiKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as {
    voices?: Array<{ voice_id?: string; name?: string }>;
  };

  const voices = (data.voices || [])
    .filter((v): v is AccountVoice => Boolean(v.voice_id && v.name))
    .map((v) => ({ voice_id: v.voice_id, name: v.name }));

  if (voices.length > 0) {
    cachedAccountVoices = { fetchedAt: Date.now(), voices };
  }
  return voices;
}

function pickFallbackVoiceId(preset: ElevenLabsPresetVoice, accountVoices: AccountVoice[]): string | null {
  if (accountVoices.length === 0) return null;
  const preferred = ELEVENLABS_VOICE_MAP[preset].preferredNames;
  for (const target of preferred) {
    const found = accountVoices.find((v) => v.name.toLowerCase().includes(target));
    if (found) return found.voice_id;
  }
  const indexMap: Record<ElevenLabsPresetVoice, number> = {
    Aria: 0,
    Sarah: 1,
    Liam: 2,
    Brian: 3,
    George: 4,
  };
  return accountVoices[indexMap[preset] % accountVoices.length]?.voice_id || accountVoices[0].voice_id;
}

async function callElevenLabsTts(params: {
  apiKey: string;
  voiceId: string;
  modelId: string;
  text: string;
}): Promise<{ audioBase64: string; mimeType: string; provider: 'elevenlabs' }> {
  const safeVoiceId = encodeURIComponent(params.voiceId);
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${safeVoiceId}?output_format=mp3_44100_128`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': params.apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: params.text,
      model_id: params.modelId,
      voice_settings: {
        stability: 0.45,
        similarity_boost: 0.78,
        style: 0.15,
        use_speaker_boost: true,
      },
    }),
    signal: AbortSignal.timeout(22000),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const errJson = (await response.json()) as {
        detail?: { message?: string; status?: string } | string;
        message?: string;
      };
      if (typeof errJson.detail === 'string') {
        detail = errJson.detail;
      } else if (errJson.detail && typeof errJson.detail === 'object') {
        detail = errJson.detail.message || errJson.detail.status || '';
      } else if (errJson.message) {
        detail = errJson.message;
      }
    } catch {
      detail = '';
    }

    if (response.status === 401 || response.status === 403) {
      throw new ElevenLabsServiceError(
        'ElevenLabs API key was rejected or lacks permission. Please verify ELEVENLABS_API_KEY in Settings > Secrets.',
        response.status,
        false
      );
    }
    if (response.status === 402) {
      throw new ElevenLabsServiceError(
        'ElevenLabs voice quota or plan limit has been reached for this key.',
        402,
        false
      );
    }
    if (response.status === 429) {
      throw new ElevenLabsServiceError(
        'ElevenLabs is rate-limiting requests right now. Please wait a few seconds and try again.',
        429,
        true
      );
    }

    throw new ElevenLabsServiceError(
      detail || `ElevenLabs voice request failed (${response.status}).`,
      response.status,
      response.status >= 500 || response.status === 404 || response.status === 400
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (buffer.length === 0) {
    throw new ElevenLabsServiceError('ElevenLabs returned an empty audio stream.', 502, true);
  }

  return {
    audioBase64: buffer.toString('base64'),
    mimeType: 'audio/mpeg',
    provider: 'elevenlabs',
  };
}

export async function synthesizeElevenLabsTts(params: {
  text: string;
  voiceName?: string;
}): Promise<{ audioBase64: string; mimeType: string; provider: 'elevenlabs' }> {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new ElevenLabsServiceError(
      'ElevenLabs voice is not configured yet. Add ELEVENLABS_API_KEY in Settings > Secrets.',
      503,
      false
    );
  }

  const cleanText = formatPhysicsTextForSpeech(redactPotentialPii(params.text));
  if (!cleanText) {
    throw new ElevenLabsServiceError('There is no readable text to speak.', 400, false);
  }

  const preset = resolvePresetVoice(params.voiceName);
  const primaryVoiceId = ELEVENLABS_VOICE_MAP[preset].id;

  try {
    return await callElevenLabsTts({
      apiKey,
      voiceId: primaryVoiceId,
      modelId: ELEVENLABS_PRIMARY_MODEL,
      text: cleanText,
    });
  } catch (err) {
    if (err instanceof ElevenLabsServiceError && !err.retryable) {
      throw err;
    }

    // If a premade voice ID or flash model isn't enabled on this account, resolve from /v1/voices and/or fallback model
    const accountVoices = await fetchAccountVoices(apiKey).catch(() => []);
    const resolvedVoiceId = pickFallbackVoiceId(preset, accountVoices) || primaryVoiceId;

    try {
      return await callElevenLabsTts({
        apiKey,
        voiceId: resolvedVoiceId,
        modelId: ELEVENLABS_PRIMARY_MODEL,
        text: cleanText,
      });
    } catch (secondErr) {
      if (secondErr instanceof ElevenLabsServiceError && !secondErr.retryable) {
        throw secondErr;
      }

      return await callElevenLabsTts({
        apiKey,
        voiceId: resolvedVoiceId,
        modelId: ELEVENLABS_FALLBACK_MODEL,
        text: cleanText,
      });
    }
  }
}
