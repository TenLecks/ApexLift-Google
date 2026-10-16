import assert from 'node:assert/strict';
import { test } from './testkit';
import { estimateMinutes, nextWorkout, plusOneTarget, weekStatus } from './home';
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

// --- week switcher + +1 safeguard (Sun–Sat calendar weeks, local time) ---
const on = (week: number, dayType: 'Full Body A' | 'Full Body B', date: Date): CompletedWorkoutSession => ({
  ...done(week, dayType), dateCompleted: date.toISOString(),
});
const d = (y: number, m: number, day: number, h = 18) => new Date(y, m - 1, day, h);
// Oct 2026: Sun 11, Mon 12, Thu 15, Sat 17, Sun 18, Mon 19
const week3Done = () => ({
  ...getDefaultProfile(), currentWeek: 4,
  completedWorkouts: [on(3, 'Full Body A', d(2026, 10, 12)), on(3, 'Full Body B', d(2026, 10, 15))],
});

await test('plusOneTarget: Saturday after finishing Week 3 Mon+Thu → counts for Week 3', () => {
  const t = plusOneTarget(week3Done(), d(2026, 10, 17, 10));
  assert.equal(t.week, 3);
  assert.equal(t.isPrevious, true);
});
await test('plusOneTarget: the next Sunday starts a new calendar week → counts for Week 4', () => {
  assert.deepEqual(plusOneTarget(week3Done(), d(2026, 10, 18, 9)).week, 4);
});
await test('plusOneTarget: once anything is logged in Week 4 it counts for Week 4', () => {
  const p = week3Done();
  p.bonusSessions = [{ id: 'b', date: d(2026, 10, 16).toISOString(), weekNumber: 4, type: 'yoga', title: '', durationMinutes: 20, fatigueScore: 1, sorenessScore: 1, perceivedEffort: 1, addedVolumeMuscles: [] }];
  assert.equal(plusOneTarget(p, d(2026, 10, 17)).week, 4);
});
await test('plusOneTarget: previous week skipped or no previous week → current week', () => {
  assert.equal(plusOneTarget({ ...getDefaultProfile(), currentWeek: 4, skippedWeeks: [3] }, d(2026, 10, 17)).week, 4);
  assert.equal(plusOneTarget({ ...getDefaultProfile(), currentWeek: 1 }, d(2026, 10, 17)).week, 1);
});
await test('plusOneTarget: day strip runs Sun→Sat with workout days ticked and today marked', () => {
  const t = plusOneTarget(week3Done(), d(2026, 10, 17, 10));
  assert.deepEqual(t.days.map((x) => x.label), ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  assert.deepEqual(t.days.filter((x) => x.done).map((x) => x.label), ['Mon', 'Thu']);
  assert.deepEqual(t.days.filter((x) => x.today).map((x) => x.label), ['Sat']);
});
await test('weekStatus: past / current / future relative to the current week', () => {
  const p = { ...getDefaultProfile(), currentWeek: 4 };
  assert.deepEqual([3, 4, 5].map((w) => weekStatus(p, w)), ['past', 'current', 'future']);
});
