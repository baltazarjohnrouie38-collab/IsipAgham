import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteVisualizerScenario,
  saveVisualizerScenario,
  subscribeVisualizerScenarios,
  updateVisualizerScenario,
} from '../../lib/studyService';
import type { PhysicsCourse, VisualizerScenario } from '../../types';

export interface PendingScenarioApply {
  sceneId: string;
  params: Record<string, number | string>;
  title?: string;
  seq: number;
}

interface VisualizerScenarioContextValue {
  scenarios: VisualizerScenario[];
  loading: boolean;
  pendingApply: PendingScenarioApply | null;
  queueScenarioApply: (sceneId: string, params: Record<string, number | string>, title?: string) => void;
  clearPendingApply: () => void;
  saveCustomScenario: (input: {
    sceneId: string;
    course: PhysicsCourse;
    title: string;
    notes?: string;
    params: Record<string, number | string>;
  }) => Promise<VisualizerScenario>;
  editCustomScenario: (
    scenarioId: string,
    updates: { title: string; notes?: string; params: Record<string, number | string> }
  ) => Promise<void>;
  removeCustomScenario: (scenarioId: string) => Promise<void>;
}

const VisualizerScenarioContext = createContext<VisualizerScenarioContextValue | undefined>(undefined);

function getLocalStorageKey(uid: string): string {
  return `isipagham_visualizer_scenarios_${uid}`;
}

export const VisualizerScenarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [scenarios, setScenarios] = useState<VisualizerScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingApply, setPendingApply] = useState<PendingScenarioApply | null>(null);

  useEffect(() => {
    if (!user) {
      setScenarios([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const cached = window.localStorage.getItem(getLocalStorageKey(user.uid));
      if (cached) {
        const parsed = JSON.parse(cached) as VisualizerScenario[];
        if (Array.isArray(parsed)) setScenarios(parsed);
      }
    } catch {
      // ignore storage read issues
    }

    const unsub = subscribeVisualizerScenarios(user.uid, (items) => {
      setScenarios(items);
      setLoading(false);
      try {
        window.localStorage.setItem(getLocalStorageKey(user.uid), JSON.stringify(items));
      } catch {
        // ignore storage quota errors
      }
    });

    return () => {
      unsub();
    };
  }, [user]);

  const queueScenarioApply = useCallback(
    (sceneId: string, params: Record<string, number | string>, title?: string) => {
      setPendingApply((prev) => ({
        sceneId,
        params,
        title,
        seq: (prev?.seq ?? 0) + 1,
      }));
    },
    []
  );

  const clearPendingApply = useCallback(() => {
    setPendingApply(null);
  }, []);

  const saveCustomScenario = useCallback(
    async (input: {
      sceneId: string;
      course: PhysicsCourse;
      title: string;
      notes?: string;
      params: Record<string, number | string>;
    }): Promise<VisualizerScenario> => {
      if (!user) {
        throw new Error('Please sign in to save custom 3D scenarios.');
      }
      const id = await saveVisualizerScenario({
        userId: user.uid,
        sceneId: input.sceneId,
        course: input.course,
        title: input.title,
        notes: input.notes,
        params: input.params,
      });
      return {
        id,
        userId: user.uid,
        sceneId: input.sceneId,
        course: input.course,
        title: input.title,
        notes: input.notes,
        params: input.params,
      };
    },
    [user]
  );

  const editCustomScenario = useCallback(
    async (
      scenarioId: string,
      updates: { title: string; notes?: string; params: Record<string, number | string> }
    ) => {
      await updateVisualizerScenario(scenarioId, updates);
    },
    []
  );

  const removeCustomScenario = useCallback(async (scenarioId: string) => {
    await deleteVisualizerScenario(scenarioId);
  }, []);

  return (
    <VisualizerScenarioContext.Provider
      value={{
        scenarios,
        loading,
        pendingApply,
        queueScenarioApply,
        clearPendingApply,
        saveCustomScenario,
        editCustomScenario,
        removeCustomScenario,
      }}
    >
      {children}
    </VisualizerScenarioContext.Provider>
  );
};

export function useVisualizerScenarios() {
  return useContext(VisualizerScenarioContext);
}
