import type {
  CompletedWorkoutSession,
  ExerciseDefinition,
  LoggedExercise,
  LoggedSet,
  MuscleGroup,
  PastCycle,
  WeeklyExerciseTarget,
  WeightUnit,
} from '../types/workout';

// RPE-aware double progression (spec §3). Pure: no storage, no program lookups.

export type ExerciseClass = 'compound' | 'isolation';

export interface SetTarget {
  weight: number;
  reps: number;
  rpe: number;
}

export interface ExercisePlan {
  targetWeight: number;
  sets: SetTarget[];
  reason: string;
  lastTime?: { weight: number; reps: number; rpe: number; date: string };
  isFirstTime: boolean;
}

export interface PlanExerciseArgs {
  exercise: ExerciseDefinition;
  weekNumber: number;
  isDeload: boolean;
  unit: WeightUnit;
  chosenSubstitution?: string;
  workouts: CompletedWorkoutSession[];
  pastCycles?: PastCycle[];
  manualTarget?: WeeklyExerciseTarget;
}

const MAJOR_MUSCLES: MuscleGroup[] = ['Chest', 'Back / Lats', 'Quads', 'Hamstrings', 'Glutes'];

export function classifyExercise(ex: ExerciseDefinition): ExerciseClass {
  if (ex.isHeavyOrBackoff === 'heavy' || ex.isHeavyOrBackoff === 'backoff') return 'compound';
  const hitsMajor = ex.targetMuscles.some((m) => MAJOR_MUSCLES.includes(m));
  return ex.targetMuscles.length >= 2 && hitsMajor ? 'compound' : 'isolation';
}

export function targetRpeOf(ex: ExerciseDefinition): number {
  const parts = ex.targetRpe.split('-').map((p) => parseFloat(p));
  const upper = parts[parts.length - 1];
  return Number.isFinite(upper) ? upper : 9;
}

export function isDumbbellExercise(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes('db') || n.includes('dumbbell');
}

export function weightStep(exName: string, unit: WeightUnit): number {
  if (unit === 'lbs') return 5;
  return isDumbbellExercise(exName) ? 2 : 2.5;
}

export function roundToStep(value: number, step: number): number {
  return Math.round(Math.round(value / step) * step * 100) / 100;
}

const isTechniqueSet = (s: LoggedSet) =>
  s.intensityTechniqueApplied !== undefined && s.intensityTechniqueApplied !== 'none';

const sameSubstitution = (a?: string, b?: string) => (a?.trim() || undefined) === (b?.trim() || undefined);

interface LastSession {
  sets: LoggedSet[];
  date: string;
  pastCycleNumber?: number;
}

function workingSetsOf(ex: LoggedExercise): LoggedSet[] {
  return ex.sets.filter((s) => !s.isWarmup && s.completed && s.weight > 0);
}

function findInSessions(
  sessions: CompletedWorkoutSession[],
  exerciseId: string,
  sub: string | undefined,
  maxWeek: number
): { sets: LoggedSet[]; date: string } | null {
  for (let w = maxWeek; w >= 1; w--) {
    for (const s of sessions.filter((x) => x.weekNumber === w)) {
      const match = s.exercises.find((e) => e.exerciseId === exerciseId && sameSubstitution(e.chosenSubstitution, sub));
      const sets = match ? workingSetsOf(match) : [];
      if (sets.length > 0) return { sets, date: s.dateCompleted };
    }
  }
  return null;
}

function findLastSession(args: PlanExerciseArgs): LastSession | null {
  const { exercise, weekNumber, chosenSubstitution, workouts, pastCycles } = args;
  const current = findInSessions(workouts, exercise.id, chosenSubstitution, weekNumber - 1);
  if (current) return current;
  for (let i = (pastCycles?.length ?? 0) - 1; i >= 0; i--) {
    const cycle = pastCycles![i];
    const found = findInSessions(cycle.completedWorkouts, exercise.id, chosenSubstitution, 12);
    if (found) return { ...found, pastCycleNumber: cycle.cycleNumber };
  }
  return null;
}

type RuleKind = 'up' | 'jump' | 'reps' | 'hold' | 'drop' | 'deload';

function nextFor(
  last: LoggedSet,
  ex: ExerciseDefinition,
  cls: ExerciseClass,
  T: number,
  step: number,
  isDeload: boolean
): SetTarget & { kind: RuleKind } {
  const w = last.weight;
  const rpe = last.rpe > 0 ? last.rpe : T; // missing RPE = on target
  const reduce = (pct: number) => Math.max(step, Math.min(roundToStep(w * (1 - pct), step), w - step));

  if (isDeload) return { weight: reduce(0.1), reps: ex.minReps, rpe: T - 2, kind: 'deload' };
  if (last.reps >= ex.maxReps) {
    return rpe <= T
      ? { weight: w + step, reps: ex.minReps, rpe: T, kind: 'up' }
      : { weight: w, reps: last.reps, rpe: T, kind: 'hold' };
  }
  if (last.reps < ex.minReps) return { weight: reduce(0.05), reps: ex.minReps, rpe: T, kind: 'drop' };
  if (rpe <= T - 2) {
    return cls === 'compound'
      ? { weight: w + step, reps: last.reps, rpe: T, kind: 'jump' }
      : { weight: w, reps: Math.min(last.reps + 2, ex.maxReps), rpe: T, kind: 'reps' };
  }
  if (rpe <= T) return { weight: w, reps: Math.min(last.reps + 1, ex.maxReps), rpe: T, kind: 'reps' };
  return { weight: w, reps: last.reps, rpe: T, kind: 'hold' };
}

function reasonFor(kind: RuleKind, last: LoggedSet, next: SetTarget, unit: WeightUnit): string {
  const u = unit;
  switch (kind) {
    case 'up':
      return `Hit ${last.reps} reps @${last.rpe} — up to ${next.weight} ${u}`;
    case 'jump':
      return `RPE ${last.rpe} at ${last.weight} ${u} — jumping to ${next.weight} ${u}`;
    case 'reps':
      return `Aim for ${next.reps} reps`;
    case 'hold':
      return `Hold ${next.weight} ${u} × ${next.reps} — own it first`;
    case 'drop':
      return `Missed the range — dropping to ${next.weight} ${u}`;
    case 'deload':
      return `Deload week — ${next.weight} ${u}`;
  }
}

const topSetOf = (sets: LoggedSet[]) => sets.reduce((a, b) => (b.weight * b.reps > a.weight * a.reps ? b : a));

export function planExercise(args: PlanExerciseArgs): ExercisePlan {
  const { exercise: ex, unit, isDeload, manualTarget } = args;
  const T = targetRpeOf(ex);
  const step = weightStep(ex.name, unit);
  const count = Math.max(1, ex.workingSetsCount);
  const hasTechnique = ex.lastSetTechnique !== undefined && ex.lastSetTechnique !== 'none';
  const last = findLastSession(args);
  const lastTime = last
    ? (() => {
        const top = topSetOf(last.sets);
        return { weight: top.weight, reps: top.reps, rpe: top.rpe, date: last.date };
      })()
    : undefined;

  const uniform = (weight: number, reps: number, rpe: number, reason: string, isFirstTime: boolean): ExercisePlan => ({
    targetWeight: weight,
    sets: Array.from({ length: count }, () => ({ weight, reps, rpe })),
    reason,
    lastTime,
    isFirstTime,
  });

  if (manualTarget) {
    return uniform(manualTarget.targetWeight, manualTarget.targetRepsMin, manualTarget.targetRpe, 'Your target from Weekly targets', !last);
  }
  if (!last) {
    const base = ex.isHeavyOrBackoff === 'heavy' ? (unit === 'kg' ? 30 : 65) : unit === 'kg' ? 22.5 : 50;
    return uniform(base, ex.minReps, T, 'First time — calibrate today with your warm-ups', true);
  }
  if (last.pastCycleNumber !== undefined) {
    const top = topSetOf(last.sets);
    return uniform(top.weight, ex.minReps, T, `Cycle ${last.pastCycleNumber} final weight — ${top.weight} ${unit}`, false);
  }

  const straight = last.sets.filter((s) => !isTechniqueSet(s));
  const inputs = straight.length > 0 ? straight : last.sets;
  const sets: SetTarget[] = [];
  let reason = '';
  for (let k = 0; k < count; k++) {
    if (hasTechnique && k === count - 1 && k > 0) {
      sets.push({ ...sets[k - 1] });
      continue;
    }
    const input = inputs[Math.min(k, inputs.length - 1)];
    const { kind, ...target } = nextFor(input, ex, classifyExercise(ex), T, step, isDeload);
    if (k === 0) reason = reasonFor(kind, input, target, unit);
    sets.push(target);
  }
  return { targetWeight: Math.max(...sets.map((s) => s.weight)), sets, reason, lastTime, isFirstTime: false };
}
