// Week swiping on the Workout tab: returns +1 (next week), -1 (previous week) or 0.
// A swipe must be mostly horizontal, and either long (≥ 20% of the screen) or a quick flick.

export function swipeStep({ dx, dy, ms, width }: { dx: number; dy: number; ms: number; width: number }): -1 | 0 | 1 {
  const horizontal = Math.abs(dx) > 1.5 * Math.abs(dy);
  const long = Math.abs(dx) >= Math.max(60, width * 0.2);
  const flick = Math.abs(dx) >= 30 && Math.abs(dx) / Math.max(ms, 1) >= 0.45;
  if (!horizontal || !(long || flick)) return 0;
  return dx < 0 ? 1 : -1;
}
