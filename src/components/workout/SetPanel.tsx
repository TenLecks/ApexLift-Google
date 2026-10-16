import React, { useEffect, useState } from 'react';
import { Check, Minus, Plus, Timer } from 'lucide-react';
import type { LoggedSet, WeightUnit } from '../../types/workout';
import type { RestCountdown } from '../../hooks/useRestCountdown';

type Patch = Partial<Pick<LoggedSet, 'weight' | 'reps' | 'rpe'>>;

interface SetPanelProps {
  title: string;
  set: LoggedSet;
  mode: 'log' | 'edit';
  unit: WeightUnit;
  weightStep: number;
  rest: RestCountdown;
  onChange(patch: Patch): void;
  onSubmit(): void;
}

const RPE_MIN = 5;
const RPE_MAX = 10;
const round2 = (v: number) => Math.round(v * 100) / 100;
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

interface ControlProps {
  label: string;
  value: number;
  step: number;
  min: number;
  max?: number;
  onSet(v: number): void;
}

const Control: React.FC<ControlProps> = ({ label, value, step, min, max, onSet }) => {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const clamp = (v: number) => round2(Math.min(max ?? Infinity, Math.max(min, v)));
  const commit = () => {
    const parsed = parseFloat(text.replace(',', '.'));
    if (Number.isFinite(parsed)) onSet(clamp(parsed));
    else setText(String(value));
  };
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-zinc-700 bg-zinc-950 p-1.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 text-center">{label}</div>
      <input
        aria-label={label}
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="w-full bg-transparent text-center text-2xl font-black text-white focus:outline-none"
      />
      <div className="flex gap-1">
        <button
          type="button"
          aria-label={`${label} minus`}
          onClick={() => onSet(clamp(value - step))}
          className="flex-1 h-11 rounded-lg bg-zinc-800 active:bg-zinc-700 flex items-center justify-center text-zinc-200"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label={`${label} plus`}
          onClick={() => onSet(clamp(value + step))}
          className="flex-1 h-11 rounded-lg bg-zinc-800 active:bg-zinc-700 flex items-center justify-center text-emerald-400"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const SetPanel: React.FC<SetPanelProps> = ({ title, set, mode, unit, weightStep, rest, onChange, onSubmit }) => (
  <div className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] bg-zinc-900/95 backdrop-blur border-t border-emerald-500/40 rounded-t-2xl">
    <div className="mx-auto max-w-[480px] px-3 pt-2.5 pb-3 space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-bold text-white truncate">{title}</span>
        {rest.isRunning && (
          <span className="flex items-center gap-1 font-mono font-black text-emerald-400 shrink-0">
            <Timer className="w-4 h-4" /> Rest {fmtTime(rest.secondsLeft)}
          </span>
        )}
      </div>
      {rest.isRunning && (
        <div className="flex gap-1.5 text-xs">
          <button type="button" onClick={() => rest.adjust(-30)} className="flex-1 h-8 rounded-lg bg-zinc-800 text-zinc-300">
            −30s
          </button>
          <button type="button" onClick={() => rest.adjust(30)} className="flex-1 h-8 rounded-lg bg-zinc-800 text-zinc-300">
            +30s
          </button>
          <button type="button" onClick={rest.skip} className="flex-1 h-8 rounded-lg bg-zinc-800 text-zinc-300">
            Skip
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <Control label={unit} value={set.weight} step={weightStep} min={0} onSet={(weight) => onChange({ weight })} />
        <Control label="reps" value={set.reps} step={1} min={0} onSet={(reps) => onChange({ reps: Math.round(reps) })} />
        <Control label="RPE" value={set.rpe} step={0.5} min={RPE_MIN} max={RPE_MAX} onSet={(rpe) => onChange({ rpe })} />
      </div>
      <button
        type="button"
        onClick={onSubmit}
        className="w-full h-12 rounded-xl bg-emerald-500 active:bg-emerald-400 text-zinc-950 font-black flex items-center justify-center gap-2"
      >
        <Check className="w-5 h-5" />
        {mode === 'log' ? (set.isWarmup ? `Log warm-up ${set.setNumber}` : `Log set ${set.setNumber}`) : 'Save'}
      </button>
    </div>
  </div>
);
