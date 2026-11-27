import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, CheckCircle2, Compass, Layers, Play, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { PhysicsCourse } from '../types';
import {
  COURSE_LIST,
  VISUALIZER_SCENES,
  type SceneComponentProps,
  type VisualizerSceneMeta,
} from '../components/visualizer/scenesCatalog';
import { detectAndParseRealScenario } from '../components/visualizer/scenariosCatalog';
import {
  useVisualizerScenarios,
  VisualizerScenarioProvider,
} from '../components/visualizer/VisualizerScenarioContext';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { MathInline } from '../components/ui/MathText';

const lazySceneCache = new Map<
  string,
  React.LazyExoticComponent<React.ComponentType<SceneComponentProps>>
>();

function getLazySceneComponent(scene: VisualizerSceneMeta) {
  let cached = lazySceneCache.get(scene.id);
  if (!cached) {
    cached = React.lazy(scene.loader);
    lazySceneCache.set(scene.id, cached);
  }
  return cached;
}

const SAMPLE_PROMPTS = [
  {
    label: 'Car Crash (1200 kg vs 1800 kg)',
    text: 'A 1200 kg car at 14 m/s hits a stopped 1800 kg SUV and sticks (inelastic)',
  },
  {
    label: '220V Home Kettle & Toaster',
    text: '220V parallel circuit with a 32 ohm kettle and 48 ohm toaster',
  },
  {
    label: 'Steel Bridge Heating',
    text: '120 m steel bridge heating up by 45 °C in summer',
  },
  {
    label: 'Basketball 3-Point Arc',
    text: 'Basketball shot launched at 52° with 8.5 m/s speed',
  },
];

const RealScenarioQuickBar: React.FC<{
  onLaunchScene: (scene: VisualizerSceneMeta) => void;
}> = ({ onLaunchScene }) => {
  const ctx = useVisualizerScenarios();
  const [scenarioInput, setScenarioInput] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const runScenarioText = (rawText: string, customLabel?: string) => {
    const result = detectAndParseRealScenario(rawText);
    if (!result) {
      setNotice('Type a real-world situation with numbers or units to simulate it in 3D.');
      return;
    }
    const targetScene = VISUALIZER_SCENES.find((s) => s.id === result.sceneId);
    if (!targetScene) return;
    ctx?.queueScenarioApply(
      targetScene.id,
      result.params,
      customLabel || rawText.trim().slice(0, 48)
    );
    onLaunchScene(targetScene);
    setNotice(
      `Loaded "${targetScene.title}" with ${
        result.matchedCount > 0 ? `${result.matchedCount} detected values` : 'matching defaults'
      }. Fine-tune values below anytime!`
    );
  };

  return (
    <Card className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
          <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-neutral-100">
            Simulate Your Own Real-World Scenario
          </h2>
        </div>
        <span className="text-[11px] font-medium text-slate-500 dark:text-neutral-400">
          Paste a problem or measurements — or click "+ Add My Data / Scenario" inside any scene
        </span>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          runScenarioText(scenarioInput);
        }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <input
          type="text"
          value={scenarioInput}
          onChange={(e) => setScenarioInput(e.target.value)}
          placeholder="e.g., 1200 kg car at 50 km/h hits a stopped 800 kg van, or 15 m coconut drop..."
          className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 px-3.5 text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          icon={<Play className="h-4 w-4" aria-hidden="true" />}
        >
          Simulate in 3D
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-neutral-400 mr-1">
          <Sparkles className="h-3 w-3 text-amber-500" aria-hidden="true" />
          Try:
        </span>
        {SAMPLE_PROMPTS.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              setScenarioInput(item.text);
              runScenarioText(item.text, item.label);
            }}
            className="min-h-[30px] px-2.5 rounded-lg border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 text-[11px] font-semibold text-slate-700 dark:text-neutral-200 hover:border-blue-500 cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {notice && (
        <p className="text-xs font-medium text-blue-700 dark:text-blue-400">{notice}</p>
      )}
    </Card>
  );
};

const VisualizerPageContent: React.FC = () => {
  const { profile, markCourseVisited } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSceneId = searchParams.get('scene');
  const initialScene =
    VISUALIZER_SCENES.find((s) => s.id === initialSceneId) ?? VISUALIZER_SCENES[0];

  const [selectedCourse, setSelectedCourse] = useState<PhysicsCourse>(initialScene.course);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(initialScene.id);

  const activeScene = useMemo(
    () => VISUALIZER_SCENES.find((s) => s.id === selectedSceneId) ?? VISUALIZER_SCENES[0],
    [selectedSceneId]
  );

  // Sync URL ?scene= query param if changed externally
  useEffect(() => {
    const paramId = searchParams.get('scene');
    if (paramId) {
      const match = VISUALIZER_SCENES.find((s) => s.id === paramId);
      if (match && match.id !== selectedSceneId) {
        setSelectedSceneId(match.id);
        setSelectedCourse(match.course);
      }
    }
  }, [searchParams, selectedSceneId]);

  // Mark the active scene's course as visited for Study Week Checklist progress
  useEffect(() => {
    if (!profile) return;
    const visited = profile.visitedCourses || [];
    if (!visited.includes(activeScene.course)) {
      void markCourseVisited(activeScene.course);
    }
  }, [activeScene.course, profile, markCourseVisited]);

  const scenesByTopic = useMemo(() => {
    const inCourse = VISUALIZER_SCENES.filter((s) => s.course === selectedCourse);
    const grouped = new Map<string, VisualizerSceneMeta[]>();
    for (const sc of inCourse) {
      const list = grouped.get(sc.topic) ?? [];
      list.push(sc);
      grouped.set(sc.topic, list);
    }
    return Array.from(grouped.entries());
  }, [selectedCourse]);

  const visitedCourses = profile?.visitedCourses || [];
  const ActiveSceneComponent = getLazySceneComponent(activeScene);

  const handleSelectCourse = (course: PhysicsCourse) => {
    React.startTransition(() => {
      setSelectedCourse(course);
      const firstInCourse = VISUALIZER_SCENES.find((s) => s.course === course);
      if (firstInCourse && activeScene.course !== course) {
        setSelectedSceneId(firstInCourse.id);
        setSearchParams({ scene: firstInCourse.id });
      }
    });
  };

  const handleSelectScene = (scene: VisualizerSceneMeta) => {
    React.startTransition(() => {
      setSelectedSceneId(scene.id);
      setSelectedCourse(scene.course);
      setSearchParams({ scene: scene.id });
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D Physics Visualizer"
        subtitle="Interactive simulations covering Physics 1, Physics 2, and Physics 3 with custom real-world data"
        action={
          <div className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
            Courses explored: {visitedCourses.length} / 3
          </div>
        }
      />

      <RealScenarioQuickBar onLaunchScene={handleSelectScene} />

      {/* Course Selector */}
      <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-1 sm:p-1.5 rounded-full liquid-glass">
        {COURSE_LIST.map((course) => {
          const isActive = selectedCourse === course;
          const isVisited = visitedCourses.includes(course);
          const count = VISUALIZER_SCENES.filter((s) => s.course === course).length;
          return (
            <button
              key={course}
              type="button"
              onClick={() => handleSelectCourse(course)}
              className={`min-h-[44px] min-w-0 px-2 sm:px-3 py-2 rounded-full text-[11px] min-[380px]:text-xs sm:text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'liquid-lens-active text-[#007AFF] dark:text-[#4DA3FF]'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="truncate">{course}</span>
              <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                ({count})
              </span>
              {isVisited && (
                <CheckCircle2
                  className="h-3.5 w-3.5 text-[#007AFF] dark:text-[#4DA3FF] shrink-0"
                  aria-label="Visited"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Topic-Grouped Scene Selector */}
      <Card className="space-y-4">
        <div className="flex flex-col min-[460px]:flex-row min-[460px]:items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-900 dark:text-neutral-100">
              {selectedCourse} Topics &amp; Simulations
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-neutral-400">
            Select a topic to load its 3D scene
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenesByTopic.map(([topic, items]) => (
            <div
              key={topic}
              className="rounded-xl border border-stone-200 dark:border-neutral-800 bg-[#FAF9F6] dark:bg-neutral-950 p-3 space-y-2"
            >
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
                {topic}
              </p>
              <div className="space-y-1.5">
                {items.map((scene) => {
                  const isCurrent = scene.id === activeScene.id;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      onClick={() => handleSelectScene(scene)}
                      className={`w-full text-left min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between gap-2 cursor-pointer border ${
                        isCurrent
                          ? 'bg-blue-700 text-white border-blue-700 dark:bg-blue-600 dark:border-blue-600'
                          : 'bg-white dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 border-stone-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-600'
                      }`}
                    >
                      <span className="truncate">{scene.title}</span>
                      <Box className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Active Scene Header & Equations */}
      <Card className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
              {activeScene.course} • {activeScene.topic}
            </p>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-neutral-100">
              {activeScene.title}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400">{activeScene.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 min-w-0">
          {activeScene.formulas.map((eq) => (
            <div
              key={eq}
              className="min-w-0 rounded-xl bg-[#FAF9F6] dark:bg-neutral-950 border border-stone-200 dark:border-neutral-800 px-3.5 py-2.5 text-sm sm:text-base text-slate-900 dark:text-neutral-100 overflow-x-auto no-scrollbar flex items-center"
            >
              <MathInline text={eq} />
            </div>
          ))}
        </div>
      </Card>

      {/* Lazy-Loaded 3D Scene Stage */}
      <Suspense
        fallback={
          <Card className="space-y-3">
            <Skeleton className="h-[360px] w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          </Card>
        }
      >
        <ActiveSceneComponent key={activeScene.id} playing={true} resetToken={0} />
      </Suspense>
    </div>
  );
};

export const VisualizerPage: React.FC = () => (
  <VisualizerScenarioProvider>
    <VisualizerPageContent />
  </VisualizerScenarioProvider>
);

export default VisualizerPage;
