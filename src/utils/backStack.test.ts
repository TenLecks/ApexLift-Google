import assert from 'node:assert/strict';
import { test } from './testkit';
import { createBackStack } from './backStack';

await test('the most recently opened handler gets the back press', () => {
  const s = createBackStack();
  const calls: string[] = [];
  s.push(() => calls.push('sheet-1'));
  s.push(() => calls.push('menu'));
  assert.equal(s.handle(), true);
  assert.deepEqual(calls, ['menu']);
});
await test('removing a handler (closing it) hands back to the one below', () => {
  const s = createBackStack();
  const calls: string[] = [];
  s.push(() => calls.push('modal'));
  const remove = s.push(() => calls.push('menu'));
  remove();
  s.handle();
  assert.deepEqual(calls, ['modal']);
});
await test('an empty stack reports that nothing handled the press', () => {
  assert.equal(createBackStack().handle(), false);
});
