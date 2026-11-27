import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Compass,
  Pencil,
  Play,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { MathInline } from '../ui/MathText';
import type { VisualizerScenario } from '../../types';
import {
  clampParamToCustomBounds,
  parseScenarioTextForScene,
  SCENE_SCENARIO_SCHEMAS,
} from './scenariosCatalog';
import { useVisualizerScenarios } from './VisualizerScenarioContext';

interface SceneScenarioStudioProps {
  sceneId: string;
  paramValues: Record<string, number | string>;
  onApplyParams: (next: Record<string, number | string>) => void;
}

export const SceneScenarioStudio: React.FC<SceneScenarioStudioProps> = ({
  sceneId,
  paramValues,
  onApplyParams,
}) => {
  const ctx = useVisualizerScenarios();
  const schema = SCENE_SCENARIO_SCHEMAS[sceneId];

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [draftParams, setDraftParams] = useState<Record<string, number | string>>(paramValues);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const savedForScene = useMemo(
    () => (ctx?.scenarios || []).filter((s) => s.sceneId === sceneId),
    [ctx?.scenarios, sceneId]
  );

  // Sync draft when opening builder cleanly
  useEffect(() => {
    if (!builderOpen && !editingId) {
      setDraftParams(paramValues);
    }
  }, [paramValues, builderOpen, editingId]);

  // Auto-apply any pending scenario queued from the top quick-scenario bar
  useEffect(() => {
    if (!ctx?.pendingApply || ctx.pendingApply.sceneId !== sceneId) return;
    onApplyParams(ctx.pendingApply.params);
    if (ctx.pendingApply.title) {
      setActiveLabel(ctx.pendingApply.title);
    }
    ctx.clearPendingApply();
  }, [ctx, sceneId, onApplyParams]);

  if (!schema) return null;

  const openNewBuilder = () => {
    setEditingId(null);
    setTitle('');
    setNotes('');
    setDraftParams({ ...paramValues });
    setFeedback(null);
    setBuilderOpen(true);
  };

  const openEditBuilder = (scen: VisualizerScenario) => {
    setEditingId(scen.id);
    setTitle(scen.title);
    setNotes(scen.notes || '');
    setDraftParams({ ...paramValues, ...scen.params });
    setFeedback(null);
    setBuilderOpen(true);
  };

  const handleAutoFill = () => {
    if (!notes.trim()) {
      setFeedback('Enter a real-world description or measurements above first.');
      return;
    }
    const parsed = parseScenarioTextForScene(sceneId, notes, draftParams);
    setDraftParams(parsed.params);
    if (parsed.matchedCount > 0) {
      setFeedback(
        `Detected ${parsed.matchedCount} measurement${parsed.matchedCount > 1 ? 's' : ''} and updated the fields below.`
      );
    } else {
      setFeedback(
        'No standard units found in text — adjust the numeric inputs below directly.'
      );
    }
  };

  const handleParamChange = (key: string, val: string) => {
    const spec = schema.params.find((p) => p.key === key);
    if (!spec) return;
    if (spec.type === 'select') {
      setDraftParams((prev) => ({ ...prev, [key]: val }));
      return;
    }
    const num = parseFloat(val);
    if (Number.isFinite(num)) {
      setDraftParams((prev) => ({ ...prev, [key]: num }));
    } else if (val === '' || val === '-') {
      setDraftParams((prev) => ({ ...prev, [key]: val }));
    }
  };

  const getSanitizedDraft = (): Record<string, number | string> => {
    const clean: Record<string, number | string> = {};
    for (const spec of schema.params) {
      const raw = draftParams[spec.key] ?? paramValues[spec.key] ?? spec.defaultValue;
      clean[spec.key] = clampParamToCustomBounds(spec, raw);
    }
    return clean;
  };

  const handleRunIn3D = () => {
    const clean = getSanitizedDraft();
    onApplyParams(clean);
    setActiveLabel(title.trim() || 'Custom Data');
    setFeedback('Applied to 3D simulation.');
  };

  const handleSaveAndRun = async () => {
    const clean = getSanitizedDraft();
    const cleanTitle = title.trim() || 'My Custom Scenario';
    setSaving(true);
    setFeedback(null);
    try {
      if (editingId && ctx?.editCustomScenario) {
        await ctx.editCustomScenario(editingId, {
          title: cleanTitle,
          notes: notes.trim(),
          params: clean,
        });
      } else if (ctx?.saveCustomScenario) {
        await ctx.saveCustomScenario({
          sceneId,
          course: schema.course,
          title: cleanTitle,
          notes: notes.trim(),
          params: clean,
        });
      }
      onApplyParams(clean);
      setActiveLabel(cleanTitle);
      setBuilderOpen(false);
      setEditingId(null);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Could not save scenario.');
    } finally {
      setSaving(false);
    }
  };

  const formatParamSummary = (params: Record<string, number | string>) => {
    return schema.params
      .map((spec) => {
        const val = params[spec.key];
        if (val === undefined) return null;
        if (spec.type === 'select') {
          const opt = spec.options?.find((o) => o.value === String(val));
          return opt ? opt.label.split(' ')[0] : String(val);
        }
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        const formatted = Number.isFinite(num)
          ? Number.isInteger(num)
            ? String(num)
            : Number(num.toFixed(2)).toString()
          : String(val);
        return `${formatted}${spec.unit ? ` ${spec.unit}` : ''}`;
      })
      .filter(Boolean)
      .join(' • ');
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Compass className="h-4 w-4 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-neutral-100">
              Real-World &amp; Custom Scenarios
            </h3>
            {activeLabel && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <Check className="h-3 w-3" aria-hidden="true" />
                Active: {activeLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
            Load real-life physics scenarios or enter your own measurements to watch them in 3D.
          </p>
        </div>

        <Button
          variant={builderOpen ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => (builderOpen ? setBuilderOpen(false) : openNewBuilder())}
          icon={builderOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        >
          {builderOpen ? 'Close Builder' : 'Add My Data / Scenario'}
        </Button>
      </div>

      {/* Custom Data & Real-World Scenario Builder */}
      {builderOpen && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-neutral-100">
              {editingId ? 'Edit Saved Scenario' : 'Enter Your Own Data or Real-World Problem'}
            </h4>
            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
              Supports real-world units (m/s, km/h, cm, mm, kg, °, V, Ω, A, °C)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-200">
                Scenario Name
              </label>
              <input
                type="text"
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Jeepney braking or Basketball shot"
                className="w-full min-h-[40px] rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-neutral-200">
                  Real-World Description (Optional)
                </label>
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Auto-Fill Numbers
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={600}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Ball thrown at 50° with 22 m/s on Moon"
                  className="flex-1 min-w-0 min-h-[40px] rounded-xl border border-stone-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 text-sm text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Exact Parameter Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {schema.params.map((spec) => {
              const currentVal = draftParams[spec.key] ?? paramValues[spec.key] ?? spec.defaultValue;
              return (
                <div
                  key={spec.key}
                  className="rounded-xl border border-stone-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-2.5 space-y-1"
                >
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-neutral-300">
                    <MathInline text={spec.label} />
                    {spec.unit ? ` (${spec.unit})` : ''}
                  </label>

                  {spec.type === 'select' ? (
                    <select
                      value={String(currentVal)}
                      onChange={(e) => handleParamChange(spec.key, e.target.value)}
                      className="w-full min-h-[36px] rounded-lg border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 px-2 text-xs font-semibold text-slate-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    >
                      {spec.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        type="number"
                        step={spec.step ?? 'any'}
                        min={spec.customMin ?? spec.min}
                        max={spec.customMax ?? spec.max}
                        value={currentVal}
                        onChange={(e) => handleParamChange(spec.key, e.target.value)}
                        className="w-full min-h-[36px] rounded-lg border border-stone-200 dark:border-neutral-700 bg-[#FAF9F6] dark:bg-neutral-950 px-2.5 text-sm font-bold text-slate-900 dark:text-neutral-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-600"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-neutral-500 tabular-nums">
                        Range: {spec.customMin ?? spec.min} to {spec.customMax ?? spec.max}{' '}
                        {spec.unit || ''}
                      </p>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {feedback && (
            <p className="text-xs font-medium text-blue-700 dark:text-blue-300">{feedback}</p>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunIn3D}
              icon={<Play className="h-4 w-4" aria-hidden="true" />}
            >
              Run in 3D
            </Button>
            {ctx && (
              <Button
                variant="primary"
                size="sm"
                loading={saving}
                onClick={() => void handleSaveAndRun()}
                icon={<Save className="h-4 w-4" aria-hidden="true" />}
              >
                {editingId ? 'Update & Run in 3D' : 'Save & Run in 3D'}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Built-in Real-World Scenarios */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
          Real-World Scenarios
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {schema.realScenarios.map((scen) => {
            const isSelected = activeLabel === scen.title;
            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => {
                  onApplyParams(scen.params);
                  setActiveLabel(scen.title);
                }}
                className={`text-left rounded-xl border p-3 transition-colors cursor-pointer space-y-1 ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-500'
                    : 'border-stone-200 dark:border-neutral-800 bg-[#FAF9F6] dark:bg-neutral-950 hover:border-blue-500 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-neutral-100">
                    {scen.title}
                  </span>
                  <Play className="h-3.5 w-3.5 text-blue-700 dark:text-blue-400 shrink-0" aria-hidden="true" />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-snug">
                  {scen.summary}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* User's Saved Custom Scenarios for this Scene */}
      {savedForScene.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-stone-200 dark:border-neutral-800">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-neutral-400">
            My Saved Scenarios ({savedForScene.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {savedForScene.map((scen) => {
              const isSelected = activeLabel === scen.title;
              return (
                <div
                  key={scen.id}
                  className={`rounded-xl border p-3 flex items-start justify-between gap-2 ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/30 dark:border-blue-500'
                      : 'border-stone-200 dark:border-neutral-800 bg-[#FAF9F6] dark:bg-neutral-950'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onApplyParams(scen.params);
                      setActiveLabel(scen.title);
                    }}
                    className="flex-1 min-w-0 text-left cursor-pointer space-y-1"
                  >
                    <p className="text-xs font-bold text-slate-900 dark:text-neutral-100 truncate">
                      {scen.title}
                    </p>
                    {scen.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-neutral-400 line-clamp-2">
                        {scen.notes}
                      </p>
                    )}
                    <p className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 tabular-nums truncate">
                      {formatParamSummary(scen.params)}
                    </p>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditBuilder(scen)}
                      aria-label={`Edit ${scen.title}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-white dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void ctx?.removeCustomScenario(scen.id)}
                      aria-label={`Delete ${scen.title}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-white dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
