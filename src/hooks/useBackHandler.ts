import { useEffect, useRef } from 'react';
import { backStack } from '../utils/backStack';

/** While `active`, the Android back button calls `handler` (e.g. close this sheet) instead of navigating. */
export function useBackHandler(active: boolean, handler: () => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => (active ? backStack.push(() => ref.current()) : undefined), [active]);
}
