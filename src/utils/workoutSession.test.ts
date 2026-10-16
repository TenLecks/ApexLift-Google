import assert from 'node:assert/strict';
import { test } from './testkit';
import {
  applyTargetWeight,
  buildExerciseLog,
  convertDraftUnits,
  nextPendingSet,
  topSet,
  updateSet,
} from './workoutSession';
import type { ExerciseDefinition, LoggedExercise, UserFitnessProfile } from '../types/workout';
import type { ExercisePlan } from './nextTargets';

const rdl: ExerciseDefinition = {
  id: 'rdl', name: 'Romanian Deadlift', targetMuscles: ['Hamstrings', 'Glutes'], primaryMuscle: 'Hamstrings',
  warmupSetsCount: 3, workingSetsCount: 2, repRange: '8-10', minReps: 8, maxReps: 10,
  targetRpe: '8-9', targetRir: '1-2', restTimeMinutes: 2, restTimeSeconds: 120,
  substitution1: 'a', substitution2: 'b', coachingNotes: '', isHeavyOrBackoff: 'heavy', lastSetTechnique: 'dropset',
};
const plan: ExercisePlan = {
  targetWeight: 82.5,
  sets: [{ weight: 82.5, reps: 8, rpe: 9 }, { weight: 80, reps: 9, rpe: 9 }],
  reason: 'r',
  isFirstTime: false,
};
const fresh = () => buildExerciseLog(rdl, plan, 'kg', 'seat 4');
const byId = (log: LoggedExercise, id: string) => log.sets.find((s) => s.id === id)!;

await test('buildExerciseLog: warm-up RPEs are 5, 6, 7 and never 10', () => {
  const log = fresh();
  const warm = log.sets.filter((s) => s.isWarmup);
  assert.deepEqual(warm.map((s) => s.rpe), [5, 6, 7]);
  assert.deepEqual(warm.map((s) => s.id), ['rdl-w1', 'rdl-w2', 'rdl-w3']);
  assert.equal(log.notes, 'seat 4');
});
await test('buildExerciseLog: working sets follow the plan; technique on last set', () => {
  const work = fresh().sets.filter((s) => !s.isWarmup);
  assert.deepEqual(work.map((s) => [s.id, s.weight, s.reps, s.rpe]), [['rdl-s1', 82.5, 8, 9], ['rdl-s2', 80, 9, 9]]);
  assert.equal(work[1].intensityTechniqueApplied, 'dropset');
  assert.equal(work[0].intensityTechniqueApplied, undefined);
});
await test('applyTargetWeight sets every unlogged working set to exactly the target', () => {
  let log = updateSet(fresh(), 'rdl-s1', { weight: 80, completed: true });
  log = applyTargetWeight(log, rdl, 85, 'kg');
  assert.equal(byId(log, 'rdl-s1').weight, 80); // logged: untouched
  assert.equal(byId(log, 'rdl-s2').weight, 85);
});
await test('applyTargetWeight re-derives only unlogged warm-ups', () => {
  let log = updateSet(fresh(), 'rdl-w1', { weight: 50, completed: true });
  log = applyTargetWeight(log, rdl, 100, 'kg');
  assert.equal(byId(log, 'rdl-w1').weight, 50);
  assert.deepEqual([byId(log, 'rdl-w2').weight, byId(log, 'rdl-w3').weight], [65, 85]);
});
await test('updateSet changes only that set (target 80, set 1 → 82.5, set 2 stays 80)', () => {
  const base = applyTargetWeight(fresh(), rdl, 80, 'kg');
  const warmBefore = base.sets.filter((s) => s.isWarmup).map((s) => s.weight);
  const log = updateSet(base, 'rdl-s1', { weight: 82.5 });
  assert.equal(byId(log, 'rdl-s1').weight, 82.5);
  assert.equal(byId(log, 'rdl-s2').weight, 80);
  assert.deepEqual(log.sets.filter((s) => s.isWarmup).map((s) => s.weight), warmBefore);
});
await test('updateSet on a warm-up changes only that warm-up', () => {
  const log = updateSet(fresh(), 'rdl-w2', { weight: 60 });
  assert.equal(byId(log, 'rdl-w2').weight, 60);
  assert.equal(byId(log, 'rdl-s1').weight, 82.5);
});
await test('updateSet recomputes RIR from RPE', () => {
  assert.equal(byId(updateSet(fresh(), 'rdl-s1', { rpe: 7.5 }), 'rdl-s1').rir, 2.5);
});
await test('nextPendingSet on a restored draft resumes at the first unlogged set', () => {
  const ex1 = { ...fresh(), exerciseId: 'a', sets: fresh().sets.map((s) => ({ ...s, completed: true })) };
  const ex2 = updateSet({ ...fresh(), exerciseId: 'b' }, 'rdl-w1', { completed: true });
  assert.deepEqual(nextPendingSet(['a', 'b'], { a: ex1, b: ex2 }), { exerciseId: 'b', setId: 'rdl-w2' });
  assert.equal(nextPendingSet(['a'], { a: ex1 }), null);
});
await test('topSet is the completed working set with the largest weight × reps', () => {
  let log = updateSet(fresh(), 'rdl-s1', { weight: 80, reps: 10, completed: true });
  log = updateSet(log, 'rdl-s2', { weight: 85, reps: 8, completed: true });
  assert.equal(topSet(log)?.id, 'rdl-s1');
  assert.equal(topSet(fresh()), undefined);
});
await test('convertDraftUnits converts set weights and target weights, round-trips 100 kg', () => {
  const draft: NonNullable<UserFitnessProfile['activeWorkoutDraft']> = {
    weekNumber: 1, dayType: 'Full Body A', startedAt: '2026-10-16T10:00:00Z',
    exercises: [updateSet(fresh(), 'rdl-s1', { weight: 100 })], targetWeights: { rdl: 100 },
  };
  const lbs = convertDraftUnits(draft, 'kg', 'lbs');
  assert.equal(lbs.exercises[0].sets.find((s) => s.id === 'rdl-s1')!.weight, 220.5);
  assert.equal(lbs.targetWeights!.rdl, 220.5);
  const back = convertDraftUnits(lbs, 'lbs', 'kg');
  assert.equal(back.exercises[0].sets.find((s) => s.id === 'rdl-s1')!.weight, 100);
});
