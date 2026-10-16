import assert from 'node:assert/strict';
import { test } from './testkit';
import { swipeStep } from './swipe';

const W = 375; // phone width
await test('a clear swipe left goes to the next week, right to the previous', () => {
  assert.equal(swipeStep({ dx: -120, dy: 10, ms: 300, width: W }), 1);
  assert.equal(swipeStep({ dx: 120, dy: -8, ms: 300, width: W }), -1);
});
await test('a short drag does nothing', () => {
  assert.equal(swipeStep({ dx: -40, dy: 0, ms: 400, width: W }), 0);
});
await test('a quick flick counts even when short', () => {
  assert.equal(swipeStep({ dx: -45, dy: 5, ms: 90, width: W }), 1);
});
await test('a mostly vertical gesture (scrolling) never changes week', () => {
  assert.equal(swipeStep({ dx: -120, dy: 150, ms: 300, width: W }), 0);
  assert.equal(swipeStep({ dx: 70, dy: 90, ms: 80, width: W }), 0);
});
