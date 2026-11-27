import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Atom,
  BookOpen,
  Bot,
  Lightbulb,
  RotateCcw,
  Send,
  ShieldAlert,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ALL_LESSONS, buildLessonStudyText, getLessonById } from '../data/lessons';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { NATURAL_VOICE_OPTIONS, useSpeech } from '../hooks/useSpeech';
import { askPhysicsTutorApi, type NaturalVoiceName } from '../lib/api';
import {
  clearAiMessages,
  saveAiMessage,
  subscribeAiMessages,
  subscribeMaterials,
} from '../lib/studyService';
import type { AiMessage, StudyMaterial } from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { AlertBanner } from '../components/ui/AlertBanner';
import { MathText } from '../components/ui/MathText';

const STARTER_PROMPTS = [
  {
    course: 'Physics 1',
    text: 'How do I find the maximum height and range of a projectile launched at 35° with speed 20 m/s?',
  },
  {
    course: 'Physics 2',
    text: "Explain Archimedes' principle and how to calculate buoyant force with SI units.",
  },
  {
    course: 'Physics 3',
    text: 'What is the difference between series and parallel DC circuits using Ohm’s law?',
  },
  {
    course: 'Physics 3',
    text: "Explain Faraday's and Lenz's laws when a magnet moves into a wire coil.",
  },
];

export const AiTutorPage: React.FC = () => {
  const { user, profile, awardXp, toggleChecklistItem } = useAuth();
  const isOnline = useOnlineStatus();
  const {
    supported: ttsSupported,
    speaking,
    loading: ttsLoading,
    speechError,
    voice,
    setVoice,
    speak,
    stop,
  } = useSpeech();
  const [searchParams, setSearchParams] = useSearchParams();

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [selectedContextKey, setSelectedContextKey] = useState<string>('');
  const [simpleMode, setSimpleMode] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedRetry, setFailedRetry] = useState<{
    question: string;
    simpleMode: boolean;
  } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const qParam = searchParams.get('q');
    const lessonParam = searchParams.get('lessonId');
    let changed = false;

    if (lessonParam) {
      const found = getLessonById(lessonParam);
      if (found) {
        setSelectedContextKey(`lesson:${found.id}`);
        if (!qParam) {
          setQuestion(`Can you walk me through ${found.code} ${found.title} with a simple example?`);
        }
        changed = true;
      }
    }

    if (qParam && qParam.trim()) {
      setQuestion(qParam.trim());
      changed = true;
    }

    if (changed) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;
    const unsubMats = subscribeMaterials(user.uid, (list) => {
      setMaterials(list);
    });
    const unsubMsgs = subscribeAiMessages(user.uid, setMessages);
    return () => {
      unsubMats();
      unsubMsgs();
    };
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, sending]);

  useEffect(() => {
    if (!speaking && !ttsLoading) {
      setSpeakingMessageId(null);
    }
  }, [speaking, ttsLoading]);

  const activeContext = useMemo(() => {
    if (!selectedContextKey) return null;
    if (selectedContextKey.startsWith('lesson:')) {
      const id = selectedContextKey.slice('lesson:'.length);
      const lesson = getLessonById(id);
      if (!lesson) return null;
      return {
        label: `${lesson.code} ${lesson.title}`,
        title: `${lesson.code} ${lesson.title}`,
        course: lesson.course,
        extractedText: buildLessonStudyText(lesson),
      };
    }
    if (selectedContextKey.startsWith('mat:')) {
      const id = selectedContextKey.slice('mat:'.length);
      const mat = materials.find((m) => m.id === id);
      if (!mat) return null;
      return {
        label: mat.title,
        title: mat.title,
        course: mat.course,
        extractedText: mat.extractedText,
      };
    }
    return null;
  }, [selectedContextKey, materials]);

  const questionsAsked = profile?.aiQuestionsAsked ?? 0;

  const handleSend = async (
    overrideText?: string,
    forceSimpleMode?: boolean,
    skipSaveUserMessage = false
  ) => {
    const trimmed = (overrideText ?? question).trim();
    if (!trimmed || !user || sending) return;
    if (!isOnline) {
      setError('No Internet Connection. Reconnect to ask the AI Physics Tutor.');
      return;
    }

    setError(null);
    setFailedRetry(null);
    setSending(true);
    if (!overrideText) {
      setQuestion('');
    }

    const useSimple = forceSimpleMode !== undefined ? forceSimpleMode : simpleMode;
    const historySource =
      skipSaveUserMessage &&
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user'
        ? messages.slice(0, -1)
        : messages;
    const recentHistory = historySource.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      if (!skipSaveUserMessage) {
        await saveAiMessage({
          userId: user.uid,
          role: 'user',
          content: trimmed,
          materialTitle: activeContext?.title,
        });
      }

      const answer = await askPhysicsTutorApi({
        question: trimmed,
        history: recentHistory,
        simpleMode: useSimple,
        materialContext: activeContext
          ? {
              title: activeContext.title,
              course: activeContext.course,
              extractedText: activeContext.extractedText,
            }
          : undefined,
      });

      await saveAiMessage({
        userId: user.uid,
        role: 'assistant',
        content: answer,
        materialTitle: activeContext?.title,
      });

      const nextCount = questionsAsked + 1;
      await awardXp(2, { aiQuestions: 1 });
      if (nextCount >= 3 && !profile?.checklist?.ask_ai_three) {
        await toggleChecklistItem('ask_ai_three', true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not get an answer right now.');
      setFailedRetry({ question: trimmed, simpleMode: useSimple });
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = async () => {
    if (!user) return;
    setClearing(true);
    stop();
    try {
      await clearAiMessages(user.uid);
      setConfirmClear(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear chat history.');
    } finally {
      setClearing(false);
    }
  };

  const handleSpeakToggle = (msg: AiMessage) => {
    if (!ttsSupported) return;
    if ((speaking || ttsLoading) && speakingMessageId === msg.id) {
      stop();
      setSpeakingMessageId(null);
    } else {
      setSpeakingMessageId(msg.id);
      speak(msg.content);
    }
  };

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI Physics Tutor"
        subtitle="Lesson-aware Physics 1–3 explanations with formulas, SI units, and an 'Explain like I'm 12' mode"
        action={
          <div className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-neutral-300 tabular-nums">
            Questions asked: {questionsAsked}
          </div>
        }
      />

      <AlertBanner tone="warning" title="Important Study & Privacy Reminder">
        Always verify AI answers, solutions, and lab values with your Physics teacher. Do not type personal information (such as your full name, school ID, phone number, or address).
      </AlertBanner>

      <Card className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
          <div className="flex-1 min-w-0">
            <Select
              label="Lesson or Study Material Context (Optional)"
              value={selectedContextKey}
              onChange={(e) => setSelectedContextKey(e.target.value)}
              hint={`Ground the tutor in any of the ${ALL_LESSONS.length} built-in lessons or your own uploaded notes.`}
            >
              <option value="">General Grade 12 Physics 1–3 (All topics)</option>
              {materials.length > 0 && (
                <optgroup label="Your Uploaded Study Materials">
                  {materials.map((mat) => (
                    <option key={mat.id} value={`mat:${mat.id}`}>
                      [{mat.course}] {mat.title}
                    </option>
                  ))}
                </optgroup>
              )}
              <optgroup label="Built-in Curriculum Lessons (Physics 1–3)">
                {ALL_LESSONS.map((l) => (
                  <option key={l.id} value={`lesson:${l.id}`}>
                    [{l.course}] {l.code} {l.title}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>

          <div className="w-full lg:w-auto flex flex-wrap items-center gap-2 shrink-0">
            {ttsSupported && (
              <select
                aria-label="Tutor reading voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value as NaturalVoiceName)}
                className="min-h-[44px] max-w-full min-w-0 flex-1 sm:flex-initial rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                {NATURAL_VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    Voice: {v.label}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setSimpleMode((v) => !v)}
              aria-pressed={simpleMode}
              className={`min-h-[44px] px-4 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                simpleMode
                  ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                  : 'bg-white dark:bg-neutral-900 text-slate-700 dark:text-neutral-200 border-stone-200 dark:border-neutral-700 hover:bg-stone-50 dark:hover:bg-neutral-800'
              }`}
            >
              <Lightbulb className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Explain like I&apos;m 12: {simpleMode ? 'ON' : 'OFF'}</span>
            </button>

            {messages.length > 0 && (
              <>
                {!confirmClear ? (
                  <Button
                    variant="outline"
                    size="md"
                    icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => setConfirmClear(true)}
                  >
                    Clear Chat
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      size="md"
                      loading={clearing}
                      onClick={handleClearChat}
                    >
                      Confirm Clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="md"
                      onClick={() => setConfirmClear(false)}
                      disabled={clearing}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {activeContext && (
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 px-3.5 py-2.5 text-xs sm:text-sm text-blue-900 dark:text-blue-200">
            <BookOpen className="h-4 w-4 shrink-0 text-blue-700 dark:text-blue-400" aria-hidden="true" />
            <span className="truncate">
              Grounded in: <strong>{activeContext.label}</strong> ({activeContext.course})
            </span>
          </div>
        )}
      </Card>

      {(error || speechError) && (
        <AlertBanner
          tone={/traffic|limit|moment|busy/i.test(error || speechError || '') ? 'warning' : 'error'}
          title={
            speechError && !error
              ? 'Voice Playback Issue'
              : /traffic|limit|moment|busy/i.test(error || '')
              ? 'AI Tutor Temporarily Busy'
              : 'Assistant Error'
          }
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span>{error || speechError}</span>
            {error && failedRetry && isOnline && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                loading={sending}
                icon={<RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() =>
                  void handleSend(failedRetry.question, failedRetry.simpleMode, true)
                }
              >
                Try Again
              </Button>
            )}
          </div>
        </AlertBanner>
      )}

      <Card padding="none" className="overflow-hidden flex flex-col">
        <div className="max-h-[54dvh] sm:max-h-[520px] min-h-[260px] sm:min-h-[300px] overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="py-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                  <Bot className="h-5 w-5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <h2 className="font-display text-base font-bold text-slate-900 dark:text-neutral-100">
                    Ask a Physics 1, 2, or 3 question
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400">
                    I explain concepts step-by-step with KaTeX formulas and SI units. Toggle &ldquo;Explain like I&apos;m 12&rdquo; anytime for everyday Filipino analogies!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STARTER_PROMPTS.map((item) => (
                  <button
                    key={item.text}
                    type="button"
                    disabled={sending || !isOnline}
                    onClick={() => void handleSend(item.text)}
                    className="text-left rounded-[18px] border border-white/75 dark:border-white/12 bg-white/60 dark:bg-white/6 backdrop-blur-md hover:border-[#007AFF]/50 dark:hover:border-[#4DA3FF]/50 hover:bg-white/80 dark:hover:bg-white/10 p-3.5 transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
                  >
                    <p className="text-xs font-semibold text-[#007AFF] dark:text-[#4DA3FF] mb-1 flex items-center gap-1.5">
                      <Atom className="h-3.5 w-3.5" aria-hidden="true" />
                      {item.course}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {item.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      const isReadingThis = speaking && speakingMessageId === msg.id;
                      const isLoadingThis = ttsLoading && speakingMessageId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`min-w-0 max-w-[92%] sm:max-w-[82%] rounded-[22px] px-3.5 sm:px-4 py-3 sm:py-3.5 space-y-2 ${
                      isUser
                        ? 'liquid-btn-primary text-white rounded-br-[6px]'
                        : 'bg-white/75 dark:bg-white/10 text-slate-900 dark:text-slate-100 border border-white/80 dark:border-white/12 backdrop-blur-md rounded-bl-[6px]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-xs font-semibold ${
                          isUser ? 'text-blue-100' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isUser ? profile?.nickname || 'You' : 'IsipAgham Tutor'}
                      </span>
                      {msg.materialTitle && (
                        <span
                          className={`text-xs truncate max-w-[190px] ${
                            isUser ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          Ref: {msg.materialTitle}
                        </span>
                      )}
                    </div>

                    <MathText
                      text={msg.content}
                      className={
                        isUser
                          ? 'text-base leading-relaxed text-white'
                          : 'font-lesson text-base leading-relaxed text-slate-900 dark:text-slate-100'
                      }
                    />

                    {!isUser && (
                      <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-slate-200/70 dark:border-white/10">
                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          Verify with your teacher
                        </span>
                        {ttsSupported && (
                          <button
                            type="button"
                            onClick={() => handleSpeakToggle(msg)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-[#007AFF] dark:text-[#4DA3FF] hover:underline min-h-[36px] px-2 cursor-pointer"
                          >
                            {isLoadingThis ? (
                              <>
                                <Volume2 className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                                Preparing...
                              </>
                            ) : isReadingThis ? (
                              <>
                                <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />
                                Stop
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Listen
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-[22px] rounded-bl-[6px] px-4 py-3 bg-white/75 dark:bg-white/10 border border-white/80 dark:border-white/12 backdrop-blur-md text-sm text-slate-600 dark:text-slate-200 flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#007AFF] dark:text-[#4DA3FF] animate-pulse" aria-hidden="true" />
                <span>Working out the Physics explanation and SI units...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick "Explain like I'm 12" follow-up when a reply exists */}
        {lastAssistantMsg && !sending && isOnline && (
          <div className="px-4 py-2 border-t border-slate-200/60 dark:border-white/10 bg-white/45 dark:bg-white/4 backdrop-blur-md flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Still tricky? Ask for a simpler breakdown.
            </span>
            <button
              type="button"
              onClick={() =>
                void handleSend(
                  'Explain that last answer like I am 12 years old using simple everyday examples.',
                  true
                )
              }
              className="text-xs font-semibold text-[#007AFF] dark:text-[#4DA3FF] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              Explain like I&apos;m 12
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="border-t border-slate-200/60 dark:border-white/10 bg-white/55 dark:bg-white/5 backdrop-blur-xl p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={2000}
            placeholder={
              isOnline
                ? 'Ask a Physics 1–3 question (avoid personal details)...'
                : 'Offline — reconnect to send a question'
            }
            disabled={sending || !isOnline}
            aria-label="Physics question"
            className="flex-1 min-w-0 w-full min-h-[46px] rounded-full bg-white/85 dark:bg-white/8 border border-white/85 dark:border-white/15 px-4 py-2.5 text-base text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-4 focus:ring-[#007AFF]/20"
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={sending}
            disabled={!question.trim() || !isOnline}
            className="w-full sm:w-auto"
            icon={<Send className="h-4 w-4" aria-hidden="true" />}
          >
            Ask Tutor (+2 XP)
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default AiTutorPage;
