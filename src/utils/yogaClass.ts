import type { BonusSessionLog } from '../types/workout';

// Quick log for a yoga class attended outside the app: a yoga +1 session, no guided steps.

export const YOGA_CLASS_MINUTES = [45, 60, 75, 90] as const;

export function yogaClassLog(weekNumber: number, minutes: number, now: Date = new Date()): BonusSessionLog {
  return {
    id: `bonus-${now.getTime()}`,
    date: now.toISOString(),
    weekNumber,
    type: 'yoga',
    title: 'Yoga class',
    durationMinutes: minutes,
    fatigueScore: 3,
    sorenessScore: 3,
    perceivedEffort: 4,
    // Same credit as the in-app yoga routines.
    addedVolumeMuscles: [{ muscle: 'Abs / Core', sets: 1 }],
    notes: 'Yoga class',
  };
}
