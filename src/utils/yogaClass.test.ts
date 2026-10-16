import assert from 'node:assert/strict';
import { test } from './testkit';
import { YOGA_CLASS_MINUTES, yogaClassLog } from './yogaClass';

await test('yogaClassLog records a yoga +1 session for the given week and length', () => {
  const now = new Date('2026-10-17T18:00:00Z');
  const log = yogaClassLog(3, 75, now);
  assert.equal(log.type, 'yoga');
  assert.equal(log.title, 'Yoga class');
  assert.equal(log.weekNumber, 3);
  assert.equal(log.durationMinutes, 75);
  assert.equal(log.date, now.toISOString());
  assert.deepEqual(log.addedVolumeMuscles, [{ muscle: 'Abs / Core', sets: 1 }]);
  assert.ok(log.id.startsWith('bonus-'));
});
await test('class lengths offered are 45 / 60 / 75 / 90 minutes', () => {
  assert.deepEqual(YOGA_CLASS_MINUTES, [45, 60, 75, 90]);
});
