import assert from 'node:assert/strict';
import { test } from './testkit';
import { normalizeProfile } from './storage';
import type { UserFitnessProfile } from '../types/workout';

await test('normalizeProfile fills fields an old-version backup lacks', () => {
  const old = { name: 'Athlete', weightUnit: 'kg', currentWeek: 1, completedWorkouts: [], badges: {} } as unknown as UserFitnessProfile;
  const p = normalizeProfile(old);
  assert.deepEqual(p.bonusSessions, []);
  assert.deepEqual(p.weeklyTargets, {});
  assert.deepEqual(p.pastCycles, []);
  assert.equal(p.currentCycle, 1);
  assert.ok(Object.keys(p.badges).length > 0);
});
await test('normalizeProfile keeps existing data and unlocked badges', () => {
  const p0 = normalizeProfile({ completedWorkouts: [{ id: 'x' }], badges: { first_step: { unlockedAt: '2026-10-01' } } } as unknown as UserFitnessProfile);
  assert.equal(p0.completedWorkouts.length, 1);
  assert.equal(p0.badges.first_step.unlockedAt, '2026-10-01');
});
