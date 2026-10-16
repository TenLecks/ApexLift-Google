import type { DayWorkoutTemplate, UserFitnessProfile } from '../types/workout';

type DayType = 'Full Body A' | 'Full Body B';

export function nextWorkout(p: UserFitnessProfile): { week: number; dayType: DayType; resume: boolean; cycleComplete: boolean } {
  const d = p.activeWorkoutDraft;
  if (d && d.exercises.some((e) => e.sets.some((s) => s.completed))) {
    return { week: d.weekNumber, dayType: d.dayType, resume: true, cycleComplete: false };
  }
  const week = p.currentWeek || 1;
  const done = (day: DayType) => p.completedWorkouts.some((w) => w.weekNumber === week && w.dayType === day);
  // currentWeek stays at 12 once everything is done; then there is no next workout in this cycle.
  const weekFinished = (done('Full Body A') && done('Full Body B')) || Boolean(p.skippedWeeks?.includes(week));
  return { week, dayType: done('Full Body A') ? 'Full Body B' : 'Full Body A', resume: false, cycleComplete: week === 12 && weekFinished };
}

export function estimateMinutes(t: DayWorkoutTemplate): number {
  const minutes = t.exercises.reduce(
    (sum, e) => sum + e.warmupSetsCount + e.workingSetsCount * ((e.restTimeSeconds || 120) / 60 + 1),
    0
  );
  return Math.max(5, Math.round(minutes / 5) * 5);
}
