import assert from 'node:assert/strict';
import { test } from './testkit';
import { classifyExercise, targetRpeOf, planExercise, weightStep } from './nextTargets';
import type { CompletedWorkoutSession, ExerciseDefinition, LoggedSet } from '../types/workout';

const rdl: ExerciseDefinition = {
  id: 'rdl', name: 'Romanian Deadlift', targetMuscles: ['Hamstrings', 'Glutes'], primaryMuscle: 'Hamstrings',
  warmupSetsCount: 2, workingSetsCount: 2, repRange: '8-10', minReps: 8, maxReps: 10,
  targetRpe: '8-9', targetRir: '1-2', restTimeMinutes: 2, restTimeSeconds: 120,
  substitution1: 'DB Romanian Deadlift', substitution2: 'Hyperextension', coachingNotes: '', isHeavyOrBackoff: 'heavy',
};
const raise: ExerciseDefinition = {
  id: 'lat', name: 'Cable Lateral Raise', targetMuscles: ['Shoulders / Delts'], primaryMuscle: 'Shoulders / Delts',
  warmupSetsCount: 0, workingSetsCount: 2, repRange: '10-15', minReps: 10, maxReps: 15,
  targetRpe: '10', targetRir: '0', restTimeMinutes: 1, restTimeSeconds: 60,
  substitution1: 'DB Lateral Raise', substitution2: 'Machine Lateral Raise', coachingNotes: '',
};
const dbPress: ExerciseDefinition = {
  ...rdl, id: 'dbp', name: 'Flat DB Press (Heavy)', targetMuscles: ['Chest', 'Triceps'], primaryMuscle: 'Chest',
  repRange: '4-6', minReps: 4, maxReps: 6, targetRpe: '8-9', workingSetsCount: 1,
};

let n = 0;
const set = (weight: number, reps: number, rpe: number, extra: Partial<LoggedSet> = {}): LoggedSet => ({
  id: `s${++n}`, setNumber: 1, isWarmup: false, weight, reps, rpe, rir: Math.max(0, 10 - rpe), completed: true, ...extra,
});
const session = (ex: ExerciseDefinition, sets: LoggedSet[], week = 1, sub?: string): CompletedWorkoutSession => ({
  id: `w${week}-${ex.id}-${sub ?? ''}`, weekNumber: week, dayType: 'Full Body A', dateCompleted: '2026-10-01T10:00:00.000Z',
  durationMinutes: 45, exercises: [{ exerciseId: ex.id, exerciseName: ex.name, chosenSubstitution: sub, sets }],
});
const plan = (ex: ExerciseDefinition, sets: LoggedSet[], opts: { isDeload?: boolean } = {}) =>
  planExercise({ exercise: ex, weekNumber: 2, isDeload: opts.isDeload ?? false, unit: 'kg', workouts: [session(ex, sets)] });
const firstSet = (p: ReturnType<typeof planExercise>) => ({ weight: p.sets[0].weight, reps: p.sets[0].reps });

await test('top of range at target → +2.5 kg, reps back to bottom', () => {
  assert.deepEqual(firstSet(plan(rdl, [set(80, 10, 9)])), { weight: 82.5, reps: 8 });
});
await test('top of range grinding (RPE above target) → hold', () => {
  assert.deepEqual(firstSet(plan(rdl, [set(80, 10, 9.5)])), { weight: 80, reps: 10 });
});
await test('much easier on a compound → add weight first, same reps', () => {
  assert.deepEqual(firstSet(plan(rdl, [set(80, 9, 7)])), { weight: 82.5, reps: 9 });
});
await test('much easier on an isolation → +2 reps, capped at top', () => {
  assert.deepEqual(firstSet(plan(raise, [set(10, 12, 8)])), { weight: 10, reps: 14 });
  assert.deepEqual(firstSet(plan(raise, [set(10, 14, 8)])), { weight: 10, reps: 15 });
});
await test('on target → +1 rep', () => {
  assert.deepEqual(firstSet(plan(rdl, [set(80, 9, 9)])), { weight: 80, reps: 10 });
});
await test('RPE 10 inside range with target 10 counts as on target', () => {
  assert.deepEqual(firstSet(plan(raise, [set(10, 12, 10)])), { weight: 10, reps: 13 });
});
await test('in range but RPE above target → hold', () => {
  assert.deepEqual(firstSet(plan(rdl, [set(80, 9, 10)])), { weight: 80, reps: 9 });
});
await test('below range → -5% rounded to step, reps to bottom', () => {
  assert.deepEqual(firstSet(plan(rdl, [set(80, 6, 10)])), { weight: 75, reps: 8 });
});
await test('deload → -10%, bottom reps, target RPE - 2', () => {
  const p = plan(rdl, [set(80, 10, 9)], { isDeload: true });
  assert.deepEqual({ ...firstSet(p), rpe: p.sets[0].rpe }, { weight: 72.5, reps: 8, rpe: 7 });
});
await test('each set gets its own target; targetWeight is the highest', () => {
  const p = plan(rdl, [set(80, 10, 9), set(80, 8, 9)]);
  assert.deepEqual(p.sets.map((s) => ({ weight: s.weight, reps: s.reps })), [{ weight: 82.5, reps: 8 }, { weight: 80, reps: 9 }]);
  assert.equal(p.targetWeight, 82.5);
});
await test('missing sets use the last available set', () => {
  const p = plan({ ...rdl, workingSetsCount: 3 }, [set(80, 9, 9), set(80, 8, 9)]);
  assert.equal(p.sets.length, 3);
  assert.deepEqual({ weight: p.sets[2].weight, reps: p.sets[2].reps }, { weight: 80, reps: 9 });
});
await test('manual weekly target wins over progression', () => {
  const p = planExercise({
    exercise: rdl, weekNumber: 2, isDeload: false, unit: 'kg', workouts: [session(rdl, [set(80, 10, 9)])],
    manualTarget: { exerciseId: rdl.id, weekNumber: 2, targetWeight: 90, targetRepsMin: 8, targetRepsMax: 10, targetRpe: 9, isCustomOverride: true },
  });
  assert.deepEqual(p.sets.map((s) => [s.weight, s.reps, s.rpe]), [[90, 8, 9], [90, 8, 9]]);
  assert.equal(p.targetWeight, 90);
});
await test('technique set is ignored as input and copies the previous set target', () => {
  const p = plan(rdl, [set(80, 9, 9), set(60, 20, 10, { intensityTechniqueApplied: 'dropset' })]);
  assert.deepEqual(p.sets.map((s) => ({ weight: s.weight, reps: s.reps })), [{ weight: 80, reps: 10 }, { weight: 80, reps: 10 }]);
});
await test('first time → baseline and isFirstTime', () => {
  const p = planExercise({ exercise: rdl, weekNumber: 1, isDeload: false, unit: 'kg', workouts: [] });
  assert.equal(p.isFirstTime, true);
  assert.equal(p.targetWeight, 30);
  assert.deepEqual(p.sets.map((s) => s.reps), [8, 8]);
});
await test('substitution history is kept separate', () => {
  const p = planExercise({
    exercise: rdl, weekNumber: 2, isDeload: false, unit: 'kg',
    workouts: [session(rdl, [set(120, 10, 9)], 1, 'Leg Press')],
  });
  assert.equal(p.isFirstTime, true);
});
await test('dumbbell exercises step by 2 kg', () => {
  assert.deepEqual(firstSet(plan(dbPress, [set(32, 6, 8)])), { weight: 34, reps: 4 });
});
await test('lastTime reports the top set and a reason is given', () => {
  const p = plan(rdl, [set(80, 9, 7)]);
  assert.deepEqual(p.lastTime && { weight: p.lastTime.weight, reps: p.lastTime.reps, rpe: p.lastTime.rpe }, { weight: 80, reps: 9, rpe: 7 });
  assert.match(p.reason, /82\.5/);
});
await test('classifyExercise and targetRpeOf', () => {
  assert.equal(classifyExercise(rdl), 'compound');
  assert.equal(classifyExercise({ ...rdl, isHeavyOrBackoff: undefined }), 'compound');
  assert.equal(classifyExercise(raise), 'isolation');
  assert.equal(classifyExercise({ ...raise, targetMuscles: ['Biceps', 'Forearms'] }), 'isolation');
  assert.equal(targetRpeOf(rdl), 9);
  assert.equal(targetRpeOf(raise), 10);
  assert.equal(targetRpeOf({ ...rdl, targetRpe: '9-10' }), 10);
  assert.equal(weightStep('Flat DB Press', 'kg'), 2);
  assert.equal(weightStep('Romanian Deadlift', 'kg'), 2.5);
  assert.equal(weightStep('Flat DB Press', 'lbs'), 5);
});
