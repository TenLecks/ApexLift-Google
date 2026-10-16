import assert from 'node:assert/strict';
import { test } from './testkit';
import {
  GIST_FILENAME,
  autoBackup,
  countWorkouts,
  getBackupStatus,
  shouldAutoOverwrite,
  type KeyValueStore,
} from './gistBackup';
import { getDefaultProfile } from './storage';
import type { CompletedWorkoutSession, UserFitnessProfile } from '../types/workout';

const TOKEN = 'ghp_secret_token_123';

const memStore = (init: Record<string, string> = {}): KeyValueStore => {
  const m = new Map(Object.entries(init));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
};

const w = (i: number): CompletedWorkoutSession => ({
  id: `w${i}`, weekNumber: 1, dayType: 'Full Body A', dateCompleted: '2026-10-01T00:00:00Z', durationMinutes: 40, exercises: [],
});
const profileWith = (n: number): UserFitnessProfile => ({ ...getDefaultProfile(), completedWorkouts: Array.from({ length: n }, (_, i) => w(i)) });

type Call = { url: string; method: string; body?: string; auth?: string };
const fakeFetch = (handler: (c: Call) => { status: number; json?: unknown } | Error) => {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit = {}) => {
    const call: Call = {
      url,
      method: init.method ?? 'GET',
      body: init.body as string | undefined,
      auth: (init.headers as Record<string, string> | undefined)?.Authorization,
    };
    calls.push(call);
    const r = handler(call);
    if (r instanceof Error) throw r;
    return { ok: r.status < 300, status: r.status, json: async () => r.json } as Response;
  }) as typeof fetch;
  return { fn, calls };
};
const gistWith = (p: UserFitnessProfile) => ({
  id: 'g1',
  updated_at: '2026-10-15T10:00:00Z',
  files: { [GIST_FILENAME]: { content: JSON.stringify(p), truncated: false } },
});

await test('countWorkouts includes bonus sessions and past cycles', () => {
  const p = profileWith(2);
  p.bonusSessions = [{ id: 'b', date: '', weekNumber: 1, type: 'yoga', title: '', durationMinutes: 20, fatigueScore: 1, sorenessScore: 1, perceivedEffort: 1, addedVolumeMuscles: [] }];
  p.pastCycles = [{ cycleNumber: 1, startDate: '', endDate: '', completedWorkouts: [w(9), w(10)], bonusSessions: [] }];
  assert.equal(countWorkouts(p), 5);
});
await test('shouldAutoOverwrite: false when GitHub has more, true when nothing there', () => {
  assert.equal(shouldAutoOverwrite(profileWith(0), profileWith(5)), false);
  assert.equal(shouldAutoOverwrite(profileWith(5), profileWith(5)), true);
  assert.equal(shouldAutoOverwrite(profileWith(0), null), true);
});
await test('autoBackup does nothing without a token', async () => {
  const { fn, calls } = fakeFetch(() => ({ status: 200 }));
  await autoBackup(profileWith(1), { fetchFn: fn, store: memStore() });
  assert.equal(calls.length, 0);
});
await test('autoBackup never shrinks a bigger backup (fresh install / reset / demo)', async () => {
  const store = memStore({ apexlift_github_pat: TOKEN, apexlift_github_gist_id: 'g1' });
  const { fn, calls } = fakeFetch((c) => (c.method === 'GET' ? { status: 200, json: gistWith(profileWith(5)) } : { status: 200, json: { id: 'g1' } }));
  await autoBackup(profileWith(0), { fetchFn: fn, store });
  assert.equal(calls.some((c) => c.method === 'PATCH' || c.method === 'POST'), false);
  assert.match(getBackupStatus(store).blockedReason ?? '', /more workouts/);
});
await test('autoBackup with no cached id finds the gist by filename, then PATCHes it', async () => {
  const store = memStore({ apexlift_github_pat: TOKEN });
  const { fn, calls } = fakeFetch((c) => {
    if (c.url.includes('/gists?')) return { status: 200, json: [{ id: 'other', files: { 'x.json': {} } }, { id: 'g1', files: { [GIST_FILENAME]: {} } }] };
    if (c.method === 'GET') return { status: 200, json: gistWith(profileWith(1)) };
    return { status: 200, json: { id: 'g1' } };
  });
  await autoBackup(profileWith(2), { fetchFn: fn, store });
  const write = calls.find((c) => c.method === 'PATCH');
  assert.ok(write && write.url.endsWith('/gists/g1'));
  assert.equal(store.getItem('apexlift_github_gist_id'), 'g1');
  assert.ok(getBackupStatus(store).lastSuccessAt);
  assert.equal(calls.every((c) => c.auth === `Bearer ${TOKEN}`), true);
});
await test('autoBackup creates a secret gist when none exists', async () => {
  const store = memStore({ apexlift_github_pat: TOKEN });
  const { fn, calls } = fakeFetch((c) => (c.url.includes('/gists?') ? { status: 200, json: [] } : { status: 201, json: { id: 'new1' } }));
  await autoBackup(profileWith(1), { fetchFn: fn, store });
  const post = calls.find((c) => c.method === 'POST');
  assert.ok(post);
  assert.equal(JSON.parse(post!.body!).public, false);
  assert.equal(store.getItem('apexlift_github_gist_id'), 'new1');
});
await test('autoBackup on a bad token (401) marks pending + error and does not throw', async () => {
  const store = memStore({ apexlift_github_pat: TOKEN, apexlift_github_gist_id: 'g1' });
  const { fn } = fakeFetch(() => ({ status: 401, json: { message: 'Bad credentials' } }));
  await autoBackup(profileWith(1), { fetchFn: fn, store });
  const s = getBackupStatus(store);
  assert.equal(s.pending, true);
  assert.match(s.lastError ?? '', /Bad credentials|401/);
});
await test('autoBackup offline (network error) marks pending and does not throw', async () => {
  const store = memStore({ apexlift_github_pat: TOKEN, apexlift_github_gist_id: 'g1' });
  const { fn } = fakeFetch(() => new TypeError('Failed to fetch'));
  await autoBackup(profileWith(1), { fetchFn: fn, store });
  assert.equal(getBackupStatus(store).pending, true);
});
await test('the backup body never contains the token', async () => {
  const store = memStore({ apexlift_github_pat: TOKEN, apexlift_github_gist_id: 'g1' });
  const { fn, calls } = fakeFetch((c) => (c.method === 'GET' ? { status: 200, json: gistWith(profileWith(0)) } : { status: 200, json: { id: 'g1' } }));
  await autoBackup(profileWith(1), { fetchFn: fn, store });
  const write = calls.find((c) => c.method === 'PATCH')!;
  assert.equal(write.body!.includes(TOKEN), false);
});
