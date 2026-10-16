import type { DayWorkoutTemplate, UserFitnessProfile } from '../types/workout';

type DayType = 'Full Body A' | 'Full Body B';

export function nextWorkout(p: UserFitnessProfile): { week: number; dayType: DayType; resume: boolean } {
  const d = p.activeWorkoutDraft;
  if (d && d.exercises.some((e) => e.sets.some((s) => s.completed))) {
    return { week: d.weekNumber, dayType: d.dayType, resume: true };
  }
  const week = p.currentWeek || 1;
  const doneA = p.completedWorkouts.some((w) => w.weekNumber === week && w.dayType === 'Full Body A');
  return { week, dayType: doneA ? 'Full Body B' : 'Full Body A', resume: false };
}

export function estimateMinutes(t: DayWorkoutTemplate): number {
  const minutes = t.exercises.reduce(
    (sum, e) => sum + e.warmupSetsCount + e.workingSetsCount * ((e.restTimeSeconds || 120) / 60 + 1),
    0
  );
  return Math.max(5, Math.round(minutes / 5) * 5);
}
