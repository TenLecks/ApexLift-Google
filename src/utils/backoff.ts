import type { ExerciseDefinition, WeightUnit } from '../types/workout';
import { weightStep } from './nextTargets';

// Back-off sets follow the heavy set done just before them (owner's rule):
// heavy weight − 10%, rounded DOWN to the gym step. For weighted dips the weight is the
// added weight only. This is the only set weight in the app tied to another set.

export const BACKOFF_DROP = 0.1;

export function backoffWeightFrom(heavyWeight: number, backoffName: string, unit: WeightUnit): number {
  if (heavyWeight <= 0) return 0;
  const step = weightStep(backoffName, unit);
  const raw = heavyWeight * (1 - BACKOFF_DROP);
  return Math.round(Math.floor(raw / step + 1e-9) * step * 100) / 100;
}

const baseName = (name: string) => name.replace(/\s*\((heavy|back ?off)\)\s*$/i, '').trim().toLowerCase();

/** The heavy exercise a back-off exercise belongs to, in the same workout ("X (Heavy)" ↔ "X (Back off)"). */
export function heavyPartnerOf(ex: ExerciseDefinition, dayExercises: ExerciseDefinition[]): ExerciseDefinition | undefined {
  if (ex.isHeavyOrBackoff !== 'backoff') return undefined;
  return dayExercises.find((e) => e.isHeavyOrBackoff === 'heavy' && baseName(e.name) === baseName(ex.name));
}
