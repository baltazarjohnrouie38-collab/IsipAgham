import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  subscribeLeaderboard,
  subscribeMaterials,
  subscribeQuizAttempts,
  subscribeStudySessions,
  subscribeStudySets,
} from '../lib/studyService';
import type {
  LeaderboardEntry,
  QuizAttempt,
  StudyMaterial,
  StudySession,
  StudySet,
} from '../types';
import { PageHeader } from '../components/ui/PageHeader';
import { MaterialsTab } from '../components/study/MaterialsTab';
import { FlashcardsTab } from '../components/study/FlashcardsTab';
import { QuizTab } from '../components/study/QuizTab';
import { TimerTab } from '../components/study/TimerTab';
import { ProgressTab } from '../components/study/ProgressTab';

type StudyTabKey = 'materials' | 'flashcards' | 'quiz' | 'timer' | 'progress';

const VALID_TABS: StudyTabKey[] = ['materials', 'flashcards', 'quiz', 'timer', 'progress'];

export const StudyPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as StudyTabKey) || 'materials';
  const [activeTab, setActiveTab] = useState<StudyTabKey>(
    VALID_TABS.includes(initialTab) ? initialTab : 'materials'
  );

  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [studySets, setStudySets] = useState<StudySet[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);

  useEffect(() => {
    const paramTab = searchParams.get('tab') as StudyTabKey;
    const paramSetId = searchParams.get('setId');
    if (paramTab && VALID_TABS.includes(paramTab)) {
      setActiveTab(paramTab);
    }
    if (paramSetId) {
      setSelectedSetId(paramSetId);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user) return;
    const unsubMats = subscribeMaterials(user.uid, setMaterials);
    const unsubSets = subscribeStudySets(user.uid, (sets) => {
      setStudySets(sets);
      setSelectedSetId((prev) => prev || sets[0]?.id || null);
    });
    const unsubAttempts = subscribeQuizAttempts(user.uid, setAttempts);
    const unsubSessions = subscribeStudySessions(user.uid, setSessions);
    const unsubLeaderboard = subscribeLeaderboard(setLeaderboard);

    return () => {
      unsubMats();
      unsubSets();
      unsubAttempts();
      unsubSessions();
      unsubLeaderboard();
    };
  }, [user]);

  const switchTab = (tab: StudyTabKey) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Study Hub"
        subtitle="Upload notes, study SM-2 flashcards with TTS, take mixed quizzes, focus with the calm timer, and track your rank"
      />

      <div className="flex flex-wrap gap-1.5 p-1.5 rounded-full liquid-glass w-full sm:w-fit">
        {(
          [
            { key: 'materials', label: `Materials (${materials.length})` },
            { key: 'flashcards', label: `Flashcards & Sets (${studySets.length})` },
            { key: 'quiz', label: 'Quizzes' },
            { key: 'timer', label: 'Timer' },
            { key: 'progress', label: 'Dashboard & Rank' },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            data-sound="tab"
            onClick={() => switchTab(item.key)}
            className={`px-3.5 min-h-[44px] rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer ${
              activeTab === item.key
                ? 'liquid-lens-active text-[#007AFF] dark:text-[#4DA3FF]'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div key={activeTab} className="animate-enter">
        {activeTab === 'materials' && (
          <MaterialsTab
            materials={materials}
            onGeneratedSet={(setId) => {
              setSelectedSetId(setId);
              switchTab('flashcards');
            }}
          />
        )}

        {activeTab === 'flashcards' && (
          <FlashcardsTab
            studySets={studySets}
            selectedSetId={selectedSetId}
            onSelectSet={setSelectedSetId}
            onGoToMaterials={() => switchTab('materials')}
            onStartQuiz={(setId) => {
              setSelectedSetId(setId);
              switchTab('quiz');
            }}
          />
        )}

        {activeTab === 'quiz' && (
          <QuizTab
            studySets={studySets}
            selectedSetId={selectedSetId}
            onSelectSet={setSelectedSetId}
            onGoToMaterials={() => switchTab('materials')}
          />
        )}

        {activeTab === 'timer' && <TimerTab sessions={sessions} />}

        {activeTab === 'progress' && (
          <ProgressTab
            attempts={attempts}
            sessions={sessions}
            leaderboard={leaderboard}
            studySets={studySets}
            onSwitchTab={switchTab}
          />
        )}
      </div>
    </div>
  );
};

export default StudyPage;
