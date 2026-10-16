import React, { useState } from 'react';
import { useBackHandler } from '../../hooks/useBackHandler';
import { Calculator, X } from 'lucide-react';
import type { ExerciseDefinition, LoggedExercise } from '../../types/workout';

interface ExerciseMenuProps {
  exercise: ExerciseDefinition;
  log: LoggedExercise;
  readOnly: boolean;
  onClose(): void;
  onSwap(name: string): void;
  onSaveNote(note: string): void;
  onWarmupCalculator(): void;
}

// Bottom sheet with the rarely used per-exercise extras (spec §1).
export const ExerciseMenu: React.FC<ExerciseMenuProps> = ({ exercise, log, readOnly, onClose, onSwap, onSaveNote, onWarmupCalculator }) => {
  const [note, setNote] = useState(log.notes ?? '');
  useBackHandler(true, onClose);
  const current = log.chosenSubstitution ?? exercise.name;
  const options = [exercise.name, exercise.substitution1, exercise.substitution2].filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div
        className="mx-auto w-full max-w-[480px] max-h-[85vh] overflow-y-auto rounded-t-2xl bg-zinc-900 border-t border-zinc-700 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{log.exerciseName || exercise.name}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 active:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!readOnly && (
          <label className="block space-y-1">
            <span className="text-xs text-zinc-400">Exercise / substitution</span>
            <select
              value={current}
              onChange={(e) => onSwap(e.target.value)}
              className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2.5 text-sm text-white"
            >
              {options.map((o, i) => (
                <option key={o} value={o}>
                  {i === 0 ? `Original: ${o}` : `Sub ${i}: ${o}`}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block space-y-1">
          <span className="text-xs text-zinc-400">Note (kept for this exercise every week)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="e.g. seat height 4"
            className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm text-white"
          />
          <button
            type="button"
            onClick={() => {
              onSaveNote(note.trim());
              onClose();
            }}
            className="w-full h-10 rounded-lg bg-zinc-800 text-sm font-semibold text-white"
          >
            Save note
          </button>
        </label>

        {!readOnly && exercise.warmupSetsCount > 0 && (
          <button
            type="button"
            onClick={onWarmupCalculator}
            className="w-full h-10 rounded-lg bg-zinc-800 text-sm font-semibold text-white flex items-center justify-center gap-2"
          >
            <Calculator className="w-4 h-4" /> Warm-up calculator
          </button>
        )}

        <div className="space-y-1 text-sm text-zinc-300">
          <div className="text-xs text-zinc-400">Form cues</div>
          <p>{exercise.coachingNotes}</p>
          {exercise.techniqueNote ? <p className="text-fuchsia-200">{exercise.techniqueNote}</p> : null}
        </div>
      </div>
    </div>
  );
};
