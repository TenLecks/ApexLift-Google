import assert from 'node:assert/strict';
import { test } from './testkit';
import { estimateMinutes, nextWorkout } from './home';
import { getDefaultProfile } from './storage';
import type { CompletedWorkoutSession, DayWorkoutTemplate } from '../types/workout';

const done = (week: number, dayType: 'Full Body A' | 'Full Body B'): CompletedWorkoutSession => ({
  id: `${week}${dayType}`, weekNumber: week, dayType, dateCompleted: '2026-10-01T00:00:00Z', durationMinutes: 40, exercises: [],
});

await test('nextWorkout: Day A of the current week when nothing is done', () => {
  const p = { ...getDefaultProfile(), currentWeek: 3 };
  assert.deepEqual(nextWorkout(p), { week: 3, dayType: 'Full Body A', resume: false });
});
await test('nextWorkout: Day B once Day A of the current week is done', () => {
  const p = { ...getDefaultProfile(), currentWeek: 3, completedWorkouts: [done(3, 'Full Body A')] };
  assert.deepEqual(nextWorkout(p), { week: 3, dayType: 'Full Body B', resume: false });
});
await test('nextWorkout: a draft with a logged set is resumed', () => {
  const p = {
    ...getDefaultProfile(),
    currentWeek: 3,
    activeWorkoutDraft: {
      weekNumber: 2, dayType: 'Full Body B' as const, startedAt: '2026-10-01T00:00:00Z',
      exercises: [{ exerciseId: 'x', exerciseName: 'x', sets: [{ id: 's', setNumber: 1, isWarmup: false, weight: 1, reps: 1, rpe: 8, rir: 2, completed: true }] }],
    },
  };
  assert.deepEqual(nextWorkout(p), { week: 2, dayType: 'Full Body B', resume: true });
});
await test('estimateMinutes: working sets × (rest + 1 min) + 1 min per warm-up, rounded to 5', () => {
  const t = {
    exercises: [
      { warmupSetsCount: 2, workingSetsCount: 2, restTimeSeconds: 120 },
      { warmupSetsCount: 0, workingSetsCount: 3, restTimeSeconds: 60 },
    ],
  } as unknown as DayWorkoutTemplate;
  // 2 + 2×3 + 3×2 = 14 → 15
  assert.equal(estimateMinutes(t), 15);
});
