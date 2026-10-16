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
  assert.deepEqual(nextWorkout(p), { week: 3, dayType: 'Full Body A', resume: false, cycleComplete: false });
});
await test('nextWorkout: Day B once Day A of the current week is done', () => {
  const p = { ...getDefaultProfile(), currentWeek: 3, completedWorkouts: [done(3, 'Full Body A')] };
  assert.deepEqual(nextWorkout(p), { week: 3, dayType: 'Full Body B', resume: false, cycleComplete: false });
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
  assert.deepEqual(nextWorkout(p), { week: 2, dayType: 'Full Body B', resume: true, cycleComplete: false });
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

await test('nextWorkout: after both week-12 workouts the cycle is complete', () => {
  const p = { ...getDefaultProfile(), currentWeek: 12, completedWorkouts: [done(12, 'Full Body A'), done(12, 'Full Body B')] };
  assert.equal(nextWorkout(p).cycleComplete, true);
});
await test('nextWorkout: a skipped week 12 with Day A done also completes the cycle', () => {
  const p = { ...getDefaultProfile(), currentWeek: 12, skippedWeeks: [12], completedWorkouts: [done(12, 'Full Body A')] };
  assert.equal(nextWorkout(p).cycleComplete, true);
});
await test('nextWorkout: week 12 with Day B still to do is not complete', () => {
  const p = { ...getDefaultProfile(), currentWeek: 12, completedWorkouts: [done(12, 'Full Body A')] };
  assert.deepEqual(nextWorkout(p), { week: 12, dayType: 'Full Body B', resume: false, cycleComplete: false });
});
