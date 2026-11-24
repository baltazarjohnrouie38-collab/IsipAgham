import { auth } from './firebase';
import type { ExtractedSourceType } from '../../server/extract';
import type { GeneratedStudySetPayload } from '../../server/gemini';
import type { PhysicsCourse } from '../types';

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in first.');
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

function cleanErrorMessage(raw: string | undefined, fallback: string): string {
  if (!raw || !raw.trim()) return fallback;
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        error?: { code?: number; status?: string; message?: string } | string;
        message?: string;
      };
      if (typeof parsed.error === 'string') return parsed.error;
      if (parsed.error && typeof parsed.error === 'object') {
        if (parsed.error.code === 503 || parsed.error.status === 'UNAVAILABLE') {
          return 'The AI Tutor is experiencing a brief traffic spike right now. Please try again in a few seconds.';
        }
        if (parsed.error.message) return parsed.error.message;
      }
      if (parsed.message) return parsed.message;
    } catch {
      // fall through
    }
  }
  return trimmed;
}

async function parseJsonResponse<T>(response: Response, fallbackError: string): Promise<T & { error?: string }> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error(fallbackError);
    }
    return {} as T & { error?: string };
  }
  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(fallbackError);
  }
}

export async function extractDocumentApi(file: File): Promise<{
  extractedText: string;
  sourceType: ExtractedSourceType;
}> {
  const headers = await getAuthHeader();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/extract', {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await parseJsonResponse<{
    extractedText?: string;
    sourceType?: ExtractedSourceType;
  }>(response, 'Could not extract text from this file.');

  if (!response.ok || !data.extractedText || !data.sourceType) {
    throw new Error(cleanErrorMessage(data.error, 'Could not extract text from this file.'));
  }

  return {
    extractedText: data.extractedText,
    sourceType: data.sourceType,
  };
}

export async function generateStudySetApi(params: {
  title: string;
  course: PhysicsCourse;
  extractedText: string;
  focus?: 'all' | 'flashcards' | 'reviewer' | 'quiz';
}): Promise<GeneratedStudySetPayload> {
  const authHeaders = await getAuthHeader();
  const response = await fetch('/api/generate-study-set', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await parseJsonResponse<GeneratedStudySetPayload>(
    response,
    'Failed to generate flashcards and quiz.'
  );
  if (!response.ok || !data.reviewerSummary) {
    throw new Error(cleanErrorMessage(data.error, 'Failed to generate flashcards and quiz.'));
  }
  return data;
}

export async function askPhysicsTutorApi(params: {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  simpleMode?: boolean;
  materialContext?: {
    title: string;
    course: PhysicsCourse;
    extractedText: string;
  };
}): Promise<string> {
  const authHeaders = await getAuthHeader();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await parseJsonResponse<{ answer?: string; retryable?: boolean }>(
      response,
      'Failed to get Physics assistant reply.'
    );

    if (response.ok && data.answer) {
      return data.answer;
    }

    const shouldRetry = attempt === 0 && (response.status === 503 || data.retryable);
    if (shouldRetry) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }

    throw new Error(cleanErrorMessage(data.error, 'Failed to get Physics assistant reply.'));
  }

  throw new Error('The AI Tutor is experiencing a brief traffic spike right now. Please try again.');
}
