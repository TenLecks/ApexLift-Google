import assert from 'node:assert/strict';
import { test } from '../utils/testkit';
import { adjustEndAt, secondsLeftAt } from './restCountdownMath';

await test('secondsLeftAt rounds up and never goes negative', () => {
  assert.equal(secondsLeftAt(null, 1000), 0);
  assert.equal(secondsLeftAt(1000 + 119_001, 1000), 120);
  assert.equal(secondsLeftAt(1000 + 500, 1000), 1);
  assert.equal(secondsLeftAt(1000, 5000), 0);
});
await test('secondsLeftAt stays accurate after a long background gap (screen off)', () => {
  const start = 10_000;
  const endAt = start + 120_000;
  assert.equal(secondsLeftAt(endAt, start + 30_000), 90);
});
await test('adjustEndAt adds and removes time but never ends in the past', () => {
  assert.equal(adjustEndAt(50_000, 10_000, 30), 80_000);
  assert.equal(adjustEndAt(50_000, 10_000, -30), 20_000);
  assert.equal(adjustEndAt(20_000, 10_000, -30), 10_000);
});
