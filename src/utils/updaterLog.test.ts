import assert from 'node:assert/strict';
import { test } from './testkit';
import { readUpdaterLog } from './updaterLog';

const store = (v: string | null) => ({ getItem: () => v });
await test('readUpdaterLog returns the entries, newest first', () => {
  assert.deepEqual(readUpdaterLog(store(JSON.stringify(['b', 'a']))), ['b', 'a']);
});
await test('readUpdaterLog tolerates a missing or broken log', () => {
  assert.deepEqual(readUpdaterLog(store(null)), []);
  assert.deepEqual(readUpdaterLog(store('{oops')), []);
  assert.deepEqual(readUpdaterLog(store('"text"')), []);
});
