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

// --- Week switcher + "+1 counts for which week" (Sun–Sat calendar weeks, phone's local time) ---

export type WeekStatus = 'past' | 'current' | 'future';

export function weekStatus(p: UserFitnessProfile, week: number): WeekStatus {
  const current = p.currentWeek || 1;
  return week < current ? 'past' : week > current ? 'future' : 'current';
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function startOfSunWeek(date: Date): Date {
  const s = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  s.setDate(s.getDate() - s.getDay());
  return s;
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export interface PlusOneTarget {
  week: number;
  /** True when the extra counts for the week before the current one. */
  isPrevious: boolean;
  days: { label: string; done: boolean; today: boolean }[];
}

/**
 * Which week a +1 session started from the current week should count for: the previous week
 * while the current week is still empty and today is in the same Sun–Sat week as the previous
 * week's last workout; otherwise the current week.
 */
export function plusOneTarget(p: UserFitnessProfile, today: Date = new Date()): PlusOneTarget {
  const current = p.currentWeek || 1;
  const prev = current - 1;
  const weekStart = startOfSunWeek(today);
  const allDates = [
    ...p.completedWorkouts.map((w) => new Date(w.dateCompleted)),
    ...p.bonusSessions.map((b) => new Date(b.date)),
  ].filter((x) => !Number.isNaN(x.getTime()));
  const days = DAY_LABELS.map((label, i) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    return { label, done: allDates.some((x) => sameDay(x, day)), today: sameDay(day, today) };
  });

  const currentStarted =
    p.completedWorkouts.some((w) => w.weekNumber === current) || p.bonusSessions.some((b) => b.weekNumber === current);
  const prevDates = [
    ...p.completedWorkouts.filter((w) => w.weekNumber === prev).map((w) => new Date(w.dateCompleted)),
    ...p.bonusSessions.filter((b) => b.weekNumber === prev).map((b) => new Date(b.date)),
  ].filter((x) => !Number.isNaN(x.getTime()));
  const usePrevious =
    prev >= 1 &&
    !currentStarted &&
    !p.skippedWeeks?.includes(prev) &&
    prevDates.length > 0 &&
    startOfSunWeek(new Date(Math.max(...prevDates.map((x) => x.getTime())))).getTime() === weekStart.getTime();

  return { week: usePrevious ? prev : current, isPrevious: usePrevious, days };
}
