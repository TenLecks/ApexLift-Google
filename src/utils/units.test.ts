import assert from 'node:assert/strict';
import { test } from './testkit';
import { ensureKg } from './units';
import { getDefaultProfile } from './storage';
import type { UserFitnessProfile } from '../types/workout';

const lbsProfile = (): UserFitnessProfile => ({
  ...getDefaultProfile(),
  weightUnit: 'lbs',
  completedWorkouts: [{ id: 'w', weekNumber: 1, dayType: 'Full Body A', dateCompleted: '', durationMinutes: 40,
    exercises: [{ exerciseId: 'x', exerciseName: 'x', sets: [{ id: 's', setNumber: 1, isWarmup: false, weight: 220.5, reps: 8, rpe: 9, rir: 1, completed: true }] }] }],
  weeklyTargets: { '1_x': { exerciseId: 'x', weekNumber: 1, targetWeight: 110, targetRepsMin: 8, targetRepsMax: 10, targetRpe: 9, isCustomOverride: true } },
  pastCycles: [{ cycleNumber: 1, startDate: '', endDate: '', bonusSessions: [], completedWorkouts: [{ id: 'p', weekNumber: 1, dayType: 'Full Body B', dateCompleted: '', durationMinutes: 40,
    exercises: [{ exerciseId: 'y', exerciseName: 'y', sets: [{ id: 't', setNumber: 1, isWarmup: false, weight: 44, reps: 8, rpe: 9, rir: 1, completed: true }] }] }] }],
});

await test('ensureKg converts an lbs profile to kg everywhere (workouts, targets, past cycles)', () => {
  const p = ensureKg(lbsProfile());
  assert.equal(p.weightUnit, 'kg');
  assert.equal(p.completedWorkouts[0].exercises[0].sets[0].weight, 100);
  assert.equal(p.weeklyTargets['1_x'].targetWeight, 50);
  assert.equal(p.pastCycles![0].completedWorkouts[0].exercises[0].sets[0].weight, 20);
});
await test('ensureKg leaves a kg profile untouched', () => {
  const kg = getDefaultProfile();
  assert.equal(ensureKg(kg), kg);
});
