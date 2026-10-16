import type { ExerciseDefinition, LoggedExercise, LoggedSet, UserFitnessProfile, WeightUnit } from '../types/workout';
import { calculateWarmupPyramid, convertWeight } from './progression';
import { roundToStep, weightStep, type ExercisePlan } from './nextTargets';

// Pure helpers for an in-progress workout (spec §1 + §3 "Target weight vs. set weight").

type Draft = NonNullable<UserFitnessProfile['activeWorkoutDraft']>;

const WARMUP_REPS = [8, 5, 3];
const WARMUP_RPE = [5, 6, 7];
const rirFor = (rpe: number) => Math.max(0, 10 - rpe);

function warmupSets(ex: ExerciseDefinition, targetWeight: number, unit: WeightUnit): LoggedSet[] {
  const step = weightStep(ex.name, unit);
  return calculateWarmupPyramid(targetWeight, ex.warmupSetsCount).map((g, i) => {
    const rpe = WARMUP_RPE[Math.min(i, WARMUP_RPE.length - 1)];
    return {
      id: `${ex.id}-w${i + 1}`,
      setNumber: i + 1,
      isWarmup: true,
      weight: roundToStep(g.suggestedWeight, step),
      reps: WARMUP_REPS[Math.min(i, WARMUP_REPS.length - 1)],
      rpe,
      rir: rirFor(rpe),
      completed: false,
    };
  });
}

export function buildExerciseLog(ex: ExerciseDefinition, plan: ExercisePlan, unit: WeightUnit, note?: string): LoggedExercise {
  const last = plan.sets.length - 1;
  const working: LoggedSet[] = plan.sets.map((t, i) => ({
    id: `${ex.id}-s${i + 1}`,
    setNumber: i + 1,
    isWarmup: false,
    weight: t.weight,
    reps: t.reps,
    rpe: t.rpe,
    rir: rirFor(t.rpe),
    completed: false,
    ...(i === last && ex.lastSetTechnique ? { intensityTechniqueApplied: ex.lastSetTechnique } : {}),
  }));
  return {
    exerciseId: ex.id,
    exerciseName: ex.name,
    notes: note ?? '',
    sets: [...warmupSets(ex, plan.targetWeight, unit), ...working],
  };
}

export function applyTargetWeight(log: LoggedExercise, ex: ExerciseDefinition, weight: number, unit: WeightUnit): LoggedExercise {
  const derived = new Map(warmupSets(ex, weight, unit).map((s) => [s.id, s.weight]));
  return {
    ...log,
    sets: log.sets.map((s) => {
      if (s.completed) return s;
      if (!s.isWarmup) return { ...s, weight };
      const w = derived.get(s.id);
      return w === undefined ? s : { ...s, weight: w };
    }),
  };
}

export function updateSet(
  log: LoggedExercise,
  setId: string,
  patch: Partial<Pick<LoggedSet, 'weight' | 'reps' | 'rpe' | 'completed'>>
): LoggedExercise {
  return {
    ...log,
    sets: log.sets.map((s) => {
      if (s.id !== setId) return s;
      const next = { ...s, ...patch };
      return { ...next, rir: rirFor(next.rpe) };
    }),
  };
}

export function nextPendingSet(
  order: string[],
  logs: Record<string, LoggedExercise>
): { exerciseId: string; setId: string } | null {
  for (const exerciseId of order) {
    const sets = logs[exerciseId]?.sets ?? [];
    const pending = [...sets.filter((s) => s.isWarmup), ...sets.filter((s) => !s.isWarmup)].find((s) => !s.completed);
    if (pending) return { exerciseId, setId: pending.id };
  }
  return null;
}

export function topSet(log: LoggedExercise): LoggedSet | undefined {
  const done = log.sets.filter((s) => !s.isWarmup && s.completed);
  return done.length ? done.reduce((a, b) => (b.weight * b.reps > a.weight * a.reps ? b : a)) : undefined;
}

export function convertDraftUnits(draft: Draft, from: WeightUnit, to: WeightUnit): Draft {
  const conv = (w: number) => (w > 0 ? convertWeight(w, from, to) : w);
  const convMap = (m?: Record<string, number>) =>
    m ? Object.fromEntries(Object.entries(m).map(([k, w]) => [k, conv(w)])) : undefined;
  return {
    ...draft,
    exercises: draft.exercises.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s, weight: conv(s.weight) })) })),
    targetWeights: convMap(draft.targetWeights),
    baseWorkingWeights: convMap(draft.baseWorkingWeights),
  };
}
