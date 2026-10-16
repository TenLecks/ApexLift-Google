import React, { useState } from 'react';
import { Check, ChevronRight, Minus, MoreVertical, Plus, StickyNote } from 'lucide-react';
import type { ExerciseDefinition, LoggedExercise, WeightUnit } from '../../types/workout';
import type { ExercisePlan } from '../../utils/nextTargets';
import { topSet } from '../../utils/workoutSession';

interface ExerciseItemProps {
  index: number;
  exercise: ExerciseDefinition;
  log: LoggedExercise;
  plan?: ExercisePlan;
  targetWeight: number;
  unit: WeightUnit;
  weightStep: number;
  expanded: boolean;
  readOnly: boolean;
  selectedSetId: string | null;
  pendingSetId: string | null;
  onExpand(): void;
  onSelectSet(setId: string): void;
  onTargetWeight(weight: number): void;
  onOpenMenu(): void;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

export const ExerciseItem: React.FC<ExerciseItemProps> = ({
  index,
  exercise,
  log,
  plan,
  targetWeight,
  unit,
  weightStep,
  expanded,
  readOnly,
  selectedSetId,
  pendingSetId,
  onExpand,
  onSelectSet,
  onTargetWeight,
  onOpenMenu,
}) => {
  const working = log.sets.filter((s) => !s.isWarmup);
  const doneWorking = working.filter((s) => s.completed).length;
  const isDone = working.length > 0 && doneWorking === working.length;
  const top = topSet(log);
  const name = log.exerciseName || exercise.name;
  const [targetText, setTargetText] = useState<string | null>(null);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onExpand}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left ${
          isDone ? 'border-zinc-800 bg-zinc-900/40 text-zinc-500' : 'border-zinc-800 bg-zinc-900 text-zinc-200'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {isDone ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <span className="w-4 text-xs text-zinc-500 shrink-0">{index + 1}</span>}
          <span className="truncate font-semibold text-sm">{name}</span>
        </span>
        <span className="text-xs text-zinc-500 shrink-0 font-mono">
          {isDone && top ? `${fmt(top.weight)} × ${top.reps}` : doneWorking > 0 ? `${doneWorking}/${working.length}` : `${working.length} sets`}
        </span>
      </button>
    );
  }

  const commitTarget = () => {
    if (targetText === null) return;
    const v = parseFloat(targetText.replace(',', '.'));
    if (Number.isFinite(v) && v >= 0) onTargetWeight(Math.round(v * 100) / 100);
    setTargetText(null);
  };

  return (
    <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/20 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onExpand} className="text-left min-w-0">
          <div className="font-bold text-white leading-tight">{name}</div>
          <div className="text-[11px] text-zinc-500">
            {exercise.repRange} reps · RPE {exercise.targetRpe} · {Math.round((exercise.restTimeSeconds || 120) / 60 * 10) / 10}m rest
          </div>
        </button>
        <button type="button" aria-label="Exercise options" onClick={onOpenMenu} className="p-1.5 -mr-1 rounded-lg text-zinc-400 active:bg-zinc-800 shrink-0">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {log.notes ? (
        <div className="flex items-start gap-1.5 text-xs text-amber-200/90">
          <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{log.notes}</span>
        </div>
      ) : null}

      {plan && (
        <div className="text-xs text-zinc-400">
          {plan.lastTime ? (
            <>
              Last time <span className="text-zinc-200 font-semibold">{fmt(plan.lastTime.weight)} {unit} × {plan.lastTime.reps}</span>
              {' · '}
            </>
          ) : null}
          <span className="text-emerald-300">{plan.reason}</span>
        </div>
      )}

      {!readOnly && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950/60 border border-zinc-800 px-2 py-1">
          <span className="text-xs text-zinc-400">Target weight</span>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Target weight minus" onClick={() => onTargetWeight(Math.max(0, targetWeight - weightStep))} className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-200">
              <Minus className="w-4 h-4" />
            </button>
            <input
              aria-label="Target weight"
              inputMode="decimal"
              value={targetText ?? fmt(targetWeight)}
              onChange={(e) => setTargetText(e.target.value)}
              onBlur={commitTarget}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-16 bg-transparent text-center font-black text-white focus:outline-none"
            />
            <span className="text-xs text-zinc-500 w-6">{unit}</span>
            <button type="button" aria-label="Target weight plus" onClick={() => onTargetWeight(targetWeight + weightStep)} className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-emerald-400">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        {log.sets.map((s) => {
          const selected = s.id === selectedSetId;
          const label = s.isWarmup ? `W${s.setNumber}` : String(s.setNumber);
          return (
            <button
              key={s.id}
              type="button"
              disabled={readOnly}
              onClick={() => onSelectSet(s.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm font-mono ${
                selected ? 'bg-emerald-500/15 ring-1 ring-emerald-500' : ''
              } ${s.isWarmup ? 'text-zinc-500' : 'text-zinc-100'}`}
            >
              <span className="w-6 text-left text-xs">{label}</span>
              <span className="font-bold">
                {fmt(s.weight)} × {s.reps}
              </span>
              <span className={s.isWarmup ? 'text-zinc-600' : 'text-amber-300'}>@{s.rpe}</span>
              {s.intensityTechniqueApplied && s.intensityTechniqueApplied !== 'none' && !s.isWarmup ? (
                <span className="text-[10px] text-fuchsia-300 font-sans uppercase">{s.intensityTechniqueApplied.replace(/_/g, ' ')}</span>
              ) : null}
              <span className="ml-auto text-xs font-sans">
                {s.completed ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : s.id === pendingSetId ? (
                  <span className="text-emerald-400 flex items-center">next <ChevronRight className="w-3 h-3" /></span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
