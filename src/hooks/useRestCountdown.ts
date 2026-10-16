import { useCallback, useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import { adjustEndAt, secondsLeftAt } from './restCountdownMath';

export interface RestCountdown {
  secondsLeft: number;
  isRunning: boolean;
  start(seconds: number): void;
  adjust(deltaSeconds: number): void;
  skip(): void;
}

export function useRestCountdown(): RestCountdown {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastBeepRef = useRef<number | null>(null);
  const completedRef = useRef(true);

  const tick = useCallback((target: number) => {
    const left = secondsLeftAt(target, Date.now());
    setSecondsLeft(left);
    if (left > 0 && left <= 3 && lastBeepRef.current !== left) {
      lastBeepRef.current = left;
      sounds.playTick();
    }
    if (left === 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        sounds.playTimerComplete();
      }
      setEndAt(null);
    }
  }, []);

  useEffect(() => {
    if (endAt === null) return;
    tick(endAt);
    const id = setInterval(() => tick(endAt), 300);
    const onVisible = () => {
      if (!document.hidden) tick(endAt);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [endAt, tick]);

  const start = useCallback((seconds: number) => {
    // Always restarts, even when the duration equals the previous rest.
    lastBeepRef.current = null;
    completedRef.current = false;
    setSecondsLeft(seconds);
    setEndAt(Date.now() + seconds * 1000);
  }, []);

  const adjust = useCallback((deltaSeconds: number) => {
    setEndAt((prev) => (prev === null ? prev : adjustEndAt(prev, Date.now(), deltaSeconds)));
  }, []);

  const skip = useCallback(() => {
    completedRef.current = true;
    setEndAt(null);
    setSecondsLeft(0);
  }, []);

  return { secondsLeft, isRunning: endAt !== null, start, adjust, skip };
}
