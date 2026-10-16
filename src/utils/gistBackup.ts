import type { UserFitnessProfile } from '../types/workout';

// Automatic backup to one secret GitHub Gist (spec §4). The file name and description
// match what the original app version used, so its existing backup is found and continued.

export const GIST_FILENAME = 'apexlift_fitness_profile.json';
export const GIST_DESCRIPTION = 'ApexLift Workout & Hypertrophy Progress Cloud Sync';
const TOKEN_KEY = 'apexlift_github_pat';
const GIST_ID_KEY = 'apexlift_github_gist_id';
const STATUS_KEY = 'apexlift_backup_status';
const API = 'https://api.github.com';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export interface BackupStatus {
  lastSuccessAt?: string;
  pending?: boolean;
  lastError?: string;
  blockedReason?: string;
  remoteCount?: number;
}

interface Opts {
  fetchFn?: typeof fetch;
  store?: KeyValueStore;
}

const storeOf = (o?: Opts): KeyValueStore => o?.store ?? globalThis.localStorage;
const fetchOf = (o?: Opts): typeof fetch => o?.fetchFn ?? globalThis.fetch.bind(globalThis);

export const getToken = (o?: Opts) => storeOf(o).getItem(TOKEN_KEY)?.trim() || null;
export const setToken = (token: string, o?: Opts) => storeOf(o).setItem(TOKEN_KEY, token.trim());

export function getBackupStatus(store: KeyValueStore = globalThis.localStorage): BackupStatus {
  try {
    return JSON.parse(store.getItem(STATUS_KEY) || '{}') as BackupStatus;
  } catch {
    return {};
  }
}

function setStatus(store: KeyValueStore, s: BackupStatus) {
  store.setItem(STATUS_KEY, JSON.stringify(s));
}

export function countWorkouts(p: UserFitnessProfile): number {
  const past = (p.pastCycles ?? []).reduce((n, c) => n + c.completedWorkouts.length + c.bonusSessions.length, 0);
  return p.completedWorkouts.length + p.bonusSessions.length + past;
}

export function shouldAutoOverwrite(local: UserFitnessProfile, remote: UserFitnessProfile | null): boolean {
  return remote === null || countWorkouts(local) >= countWorkouts(remote);
}

async function gh(fetchFn: typeof fetch, token: string, path: string, init: RequestInit = {}) {
  const res = await fetchFn(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`GitHub ${res.status}${body.message ? `: ${body.message}` : ''}`);
  }
  return res.json();
}

export async function findBackupGist(token: string, fetchFn: typeof fetch = fetchOf()): Promise<string | null> {
  const gists = (await gh(fetchFn, token, '/gists?per_page=100')) as { id: string; files: Record<string, unknown> }[];
  return gists.find((g) => g.files && GIST_FILENAME in g.files)?.id ?? null;
}

export async function readBackup(
  token: string,
  gistId: string,
  fetchFn: typeof fetch = fetchOf()
): Promise<{ profile: UserFitnessProfile; updatedAt: string } | null> {
  const gist = (await gh(fetchFn, token, `/gists/${gistId}`)) as {
    updated_at: string;
    files: Record<string, { content?: string; truncated?: boolean; raw_url?: string }>;
  };
  const file = gist.files?.[GIST_FILENAME];
  if (!file) return null;
  let content = file.content ?? '';
  if (file.truncated && file.raw_url) content = await (await fetchFn(file.raw_url)).text();
  return { profile: JSON.parse(content) as UserFitnessProfile, updatedAt: gist.updated_at };
}

export async function writeBackup(
  token: string,
  profile: UserFitnessProfile,
  gistId: string | null,
  fetchFn: typeof fetch = fetchOf()
): Promise<string> {
  const body = JSON.stringify({
    description: GIST_DESCRIPTION,
    ...(gistId ? {} : { public: false }),
    files: { [GIST_FILENAME]: { content: JSON.stringify(profile, null, 2) } },
  });
  const res = (await gh(fetchFn, token, gistId ? `/gists/${gistId}` : '/gists', {
    method: gistId ? 'PATCH' : 'POST',
    body,
  })) as { id: string };
  return res.id;
}

async function resolveGistId(token: string, store: KeyValueStore, fetchFn: typeof fetch): Promise<string | null> {
  const cached = store.getItem(GIST_ID_KEY);
  if (cached) return cached;
  const found = await findBackupGist(token, fetchFn);
  if (found) store.setItem(GIST_ID_KEY, found);
  return found;
}

/** Runs after a finished workout. Never throws; failures are recorded as "pending". */
export async function autoBackup(profile: UserFitnessProfile, o: Opts & { force?: boolean } = {}): Promise<BackupStatus> {
  const store = storeOf(o);
  const fetchFn = fetchOf(o);
  const prev = getBackupStatus(store);
  const token = getToken(o);
  if (!token) return prev;
  try {
    let gistId = await resolveGistId(token, store, fetchFn);
    if (gistId && !o.force) {
      const remote = await readBackup(token, gistId, fetchFn);
      if (remote && !shouldAutoOverwrite(profile, remote.profile)) {
        const s: BackupStatus = {
          ...prev,
          pending: false,
          remoteCount: countWorkouts(remote.profile),
          blockedReason: 'Backup on GitHub has more workouts than this phone — restore or overwrite?',
        };
        setStatus(store, s);
        return s;
      }
    }
    gistId = await writeBackup(token, profile, gistId, fetchFn);
    store.setItem(GIST_ID_KEY, gistId);
    const s: BackupStatus = { lastSuccessAt: new Date().toISOString() };
    setStatus(store, s);
    return s;
  } catch (e) {
    const s: BackupStatus = { ...prev, pending: true, lastError: e instanceof Error ? e.message : String(e) };
    setStatus(store, s);
    return s;
  }
}

export async function retryPendingBackup(getProfile: () => UserFitnessProfile, o: Opts = {}): Promise<void> {
  if (getBackupStatus(storeOf(o)).pending) await autoBackup(getProfile(), o);
}

/** Locate the existing backup for a token (for restore / the "backup found" prompt). */
export async function locateBackup(token: string, o: Opts = {}) {
  const store = storeOf(o);
  const fetchFn = fetchOf(o);
  const id = await findBackupGist(token, fetchFn);
  if (!id) return null;
  store.setItem(GIST_ID_KEY, id);
  const data = await readBackup(token, id, fetchFn);
  return data ? { ...data, count: countWorkouts(data.profile) } : null;
}
