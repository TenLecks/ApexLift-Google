// Timestamp-based countdown math: remaining time is always derived from the end
// timestamp, so it stays correct while Android pauses timers (screen off, app switch).

export function secondsLeftAt(endAt: number | null, now: number): number {
  if (endAt === null) return 0;
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function adjustEndAt(endAt: number, now: number, deltaSeconds: number): number {
  return Math.max(now, endAt + deltaSeconds * 1000);
}
