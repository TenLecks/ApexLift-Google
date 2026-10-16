import assert from 'node:assert/strict';
import { test } from './testkit';
import { backoffWeightFrom, heavyPartnerOf } from './backoff';
import { PROGRAM_WEEKS } from '../data/programData';

await test('back-off = heavy weight − 10%, rounded DOWN to the gym step', () => {
  assert.equal(backoffWeightFrom(32, 'Flat DB Press (Back off)', 'kg'), 28); // 28.8 → 28 (2 kg dumbbells)
  assert.equal(backoffWeightFrom(100, 'Hack Squat (Back off)', 'kg'), 90);
  assert.equal(backoffWeightFrom(92.5, 'Hack Squat (Back off)', 'kg'), 82.5); // 83.25 → 82.5
  assert.equal(backoffWeightFrom(34, 'Slight Incline DB Press (Back off)', 'kg'), 30); // 30.6 → 30
});
await test('weighted dips use the added weight only', () => {
  assert.equal(backoffWeightFrom(20, 'Weighted Dip (Back off)', 'kg'), 17.5); // 18 → 17.5
  assert.equal(backoffWeightFrom(0, 'Weighted Dip (Back off)', 'kg'), 0);
});
await test('every back-off exercise in the program finds its heavy set, and nothing else is linked', () => {
  for (const week of PROGRAM_WEEKS) {
    for (const day of [week.workouts.dayA, week.workouts.dayB]) {
      for (const ex of day.exercises) {
        const partner = heavyPartnerOf(ex, day.exercises);
        if (ex.isHeavyOrBackoff === 'backoff') {
          assert.ok(partner, `${ex.name} (week ${week.weekNumber}) has no heavy partner`);
          assert.equal(partner!.isHeavyOrBackoff, 'heavy');
        } else {
          assert.equal(partner, undefined, `${ex.name} should not be linked`);
        }
      }
    }
  }
});
