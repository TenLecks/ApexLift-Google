import { useCallback, useEffect, useRef, useState } from 'react';
import { sounds } from '../utils/audio';
import { cancelRestAlert, prepareRestAlerts, scheduleRestAlert, vibrate } from '../utils/restAlert';
import { adjustEndAt, secondsLeftAt } from './restCountdownMath';

export interface RestCountdown {
  secondsLeft: number;
  isRunning: boolean;
  start(seconds: number, label?: string): void;
  adjust(deltaSeconds: number): void;
  skip(): void;
}

export function useRestCountdown(): RestCountdown {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastBeepRef = useRef<number | null>(null);
  const completedRef = useRef(true);
  const labelRef = useRef<string | undefined>(undefined);
  const endAtRef = useRef<number | null>(null);
  endAtRef.current = endAt;

  const tick = useCallback((target: number) => {
    const left = secondsLeftAt(target, Date.now());
    setSecondsLeft(left);
    const visible = typeof document === 'undefined' || !document.hidden;
    if (visible && left > 0 && left <= 3 && lastBeepRef.current !== left) {
      lastBeepRef.current = left;
      sounds.playTick();
    }
    if (left === 0) {
      if (!completedRef.current) {
        completedRef.current = true;
        // In the background the scheduled notification does the alerting instead.
        if (visible) {
          sounds.playTimerComplete();
          void vibrate();
        }
      }
      setEndAt(null);
    }
  }, []);

  useEffect(() => {
    if (endAt === null) return;
    tick(endAt);
    const id = setInterval(() => tick(endAt), 300);
    return () => clearInterval(id);
  }, [endAt, tick]);

  // Background alert: schedule when the app is hidden mid-rest, cancel when it is back.
  useEffect(() => {
    const onVisibility = () => {
      const target = endAtRef.current;
      if (document.hidden) {
        if (target !== null) void scheduleRestAlert(target, labelRef.current);
      } else {
        void cancelRestAlert();
        if (target !== null) tick(target);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [tick]);

  const start = useCallback((seconds: number, label?: string) => {
    // Always restarts, even when the duration equals the previous rest.
    lastBeepRef.current = null;
    completedRef.current = false;
    labelRef.current = label;
    setSecondsLeft(seconds);
    setEndAt(Date.now() + seconds * 1000);
    void prepareRestAlerts();
  }, []);

  const adjust = useCallback((deltaSeconds: number) => {
    setEndAt((prev) => (prev === null ? prev : adjustEndAt(prev, Date.now(), deltaSeconds)));
  }, []);

  const skip = useCallback(() => {
    completedRef.current = true;
    setEndAt(null);
    setSecondsLeft(0);
    void cancelRestAlert();
  }, []);

  return { secondsLeft, isRunning: endAt !== null, start, adjust, skip };
}
