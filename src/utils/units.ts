import type { BonusSessionLog, CompletedWorkoutSession, LoggedExercise, UserFitnessProfile } from '../types/workout';
import { convertWeight } from './progression';
import { convertDraftUnits } from './workoutSession';

// The app is kg-only. Older data saved in lbs is converted once on load / restore.

const toKg = (w: number) => (w > 0 ? convertWeight(w, 'lbs', 'kg') : w);
const exercisesToKg = (exs: LoggedExercise[] = []) =>
  exs.map((ex) => ({ ...ex, sets: ex.sets.map((s) => ({ ...s, weight: toKg(s.weight) })) }));
const workoutsToKg = (ws: CompletedWorkoutSession[] = []) => ws.map((w) => ({ ...w, exercises: exercisesToKg(w.exercises) }));
const bonusToKg = (bs: BonusSessionLog[] = []) =>
  bs.map((b) => (b.exercisesLogged ? { ...b, exercisesLogged: exercisesToKg(b.exercisesLogged) } : b));

export function ensureKg(p: UserFitnessProfile): UserFitnessProfile {
  if (p.weightUnit !== 'lbs') return p;
  return {
    ...p,
    weightUnit: 'kg',
    completedWorkouts: workoutsToKg(p.completedWorkouts),
    bonusSessions: bonusToKg(p.bonusSessions),
    weeklyTargets: Object.fromEntries(
      Object.entries(p.weeklyTargets ?? {}).map(([k, t]) => [k, { ...t, targetWeight: toKg(t.targetWeight) }])
    ),
    pastCycles: p.pastCycles?.map((c) => ({
      ...c,
      completedWorkouts: workoutsToKg(c.completedWorkouts),
      bonusSessions: bonusToKg(c.bonusSessions),
    })),
    activeWorkoutDraft: p.activeWorkoutDraft ? convertDraftUnits(p.activeWorkoutDraft, 'lbs', 'kg') : p.activeWorkoutDraft,
  };
}
