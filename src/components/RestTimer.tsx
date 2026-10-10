import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Plus, Minus } from 'lucide-react';
import { sounds } from '../utils/audio';

interface RestTimerProps {
  initialSeconds: number;
  isActive: boolean;
  onClose: () => void;
  exerciseName?: string;
  startKey: number;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds,
  isActive,
  onClose,
  exerciseName,
  startKey,
}) => {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(initialSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(isActive);
  const [pausedRemainingMs, setPausedRemainingMs] = useState<number | null>(null);

  const lastBeepSecondRef = useRef<number | null>(null);
  const hasCompletedPlayedRef = useRef<boolean>(false);

  // Whenever startKey changes or initialSeconds changes while active, restart timer
  useEffect(() => {
    if (isActive) {
      const targetEnd = Date.now() + initialSeconds * 1000;
      setEndAt(targetEnd);
      setSecondsLeft(initialSeconds);
      setIsRunning(true);
      setPausedRemainingMs(null);
      lastBeepSecondRef.current = null;
      hasCompletedPlayedRef.current = false;
    }
  }, [startKey, initialSeconds, isActive]);

  // Helper to recompute remaining time from endAt timestamp
  const tickCompute = (targetEndAt: number) => {
    const diffMs = targetEndAt - Date.now();
    const remainingSec = Math.max(0, Math.ceil(diffMs / 1000));
    setSecondsLeft(remainingSec);

    // Audio ticks for 3, 2, 1 seconds
    if (remainingSec <= 3 && remainingSec > 0) {
      if (lastBeepSecondRef.current !== remainingSec) {
        lastBeepSecondRef.current = remainingSec;
        sounds.playTick();
      }
    }

    // Complete chime exactly once when reached 0
    if (remainingSec === 0) {
      if (!hasCompletedPlayedRef.current) {
        hasCompletedPlayedRef.current = true;
        sounds.playTimerComplete();
      }
      setIsRunning(false);
    }
  };

  // Timer interval loop
  useEffect(() => {
    if (!isRunning || !endAt) return;

    // Run immediate check
    tickCompute(endAt);

    const interval = setInterval(() => {
      tickCompute(endAt);
    }, 300);

    return () => clearInterval(interval);
  }, [isRunning, endAt]);

  // Recompute immediately when app/screen returns to visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isRunning && endAt) {
        tickCompute(endAt);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, endAt]);

  if (!isActive) return null;

  const handleTogglePause = () => {
    if (isRunning && endAt) {
      // Pause: record exact remaining milliseconds
      const remMs = Math.max(0, endAt - Date.now());
      setPausedRemainingMs(remMs);
      setIsRunning(false);
    } else if (!isRunning) {
      // Resume: set a fresh endAt based on paused remaining ms
      const remMs = pausedRemainingMs !== null ? pausedRemainingMs : secondsLeft * 1000;
      const newEnd = Date.now() + remMs;
      setEndAt(newEnd);
      setPausedRemainingMs(null);
      setIsRunning(true);
      tickCompute(newEnd);
    }
  };

  const handleAdjustTime = (deltaSeconds: number) => {
    const deltaMs = deltaSeconds * 1000;
    if (isRunning && endAt) {
      const newEnd = Math.max(Date.now(), endAt + deltaMs);
      setEndAt(newEnd);
      tickCompute(newEnd);
    } else {
      const currentRemMs = pausedRemainingMs !== null ? pausedRemainingMs : secondsLeft * 1000;
      const newRemMs = Math.max(0, currentRemMs + deltaMs);
      setPausedRemainingMs(newRemMs);
      setSecondsLeft(Math.ceil(newRemMs / 1000));
    }
  };

  const handleReset = () => {
    const targetEnd = Date.now() + initialSeconds * 1000;
    setEndAt(targetEnd);
    setSecondsLeft(initialSeconds);
    setPausedRemainingMs(null);
    setIsRunning(true);
    lastBeepSecondRef.current = null;
    hasCompletedPlayedRef.current = false;
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  const pct = Math.max(0, Math.min(100, ((initialSeconds - secondsLeft) / (initialSeconds || 1)) * 100));

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] sm:bottom-4 right-4 z-40 max-w-[calc(100vw-2rem)] sm:max-w-sm w-full bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl p-4 text-zinc-100 backdrop-blur-md">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Timer className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''} text-emerald-400`} />
          <span>Rest Interval {exerciseName ? `• ${exerciseName}` : ''}</span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-300 p-1 rounded-md transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="py-3 flex items-center justify-between">
        <div>
          <div className="text-3xl font-black font-mono tracking-tight text-white">
            {formattedTime}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {secondsLeft === 0 ? 'Rest complete! Crush your next set.' : 'Recover ATP & nervous system'}
          </div>
        </div>

        {/* Quick adjustments */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleAdjustTime(-30)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="-30s"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleTogglePause}
            className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold transition shadow-sm"
          >
            {isRunning ? <Pause className="w-4 h-4 fill-zinc-950" /> : <Play className="w-4 h-4 fill-zinc-950" />}
          </button>
          <button
            onClick={() => handleAdjustTime(30)}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="+30s"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition"
            title="Reset timer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
