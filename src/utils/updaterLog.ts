// Written by the APK's over-the-air updater (apexlift repo, apk/updater.js).
export const UPDATER_LOG_KEY = 'apexlift_updater_log';

export function readUpdaterLog(store: Pick<Storage, 'getItem'> = globalThis.localStorage): string[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(UPDATER_LOG_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}
