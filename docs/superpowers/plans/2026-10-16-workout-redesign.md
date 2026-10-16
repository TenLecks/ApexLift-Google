# ApexLift Workout Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-mode workout logger and 8-button header with a checklist + thumb-panel workout screen and Workout/Stats/More tabs, add RPE-aware progression, and back up to a GitHub Gist automatically after each workout.

**Architecture:** Pure logic moves into small tested modules (`utils/nextTargets.ts`, `utils/workoutSession.ts`, `utils/gistBackup.ts`); React components under `components/workout/` and `components/shell/` consume them. The old `WorkoutView`, `RestTimer`, `Navbar`, `CloudBackupModal` are deleted once replaced. Profile shape and localStorage key are unchanged; new fields are optional.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind 4, lucide-react. Tests: plain `node:assert` scripts run with `tsx` (already a devDependency).

**Spec:** `docs/superpowers/specs/2026-10-16-workout-redesign-design.md`

## Global Constraints

- localStorage key stays `apexlift_fitness_profile_v1`; new `UserFitnessProfile` fields optional; old saved data must load.
- Client-side only: no server code, no API keys besides the user's own Gist token, no Gemini calls, **no new npm dependencies**.
- Must work at 360 px wide with no horizontal scroll; bottom UI respects `env(safe-area-inset-bottom)`; desktop uses the same layout centred at `max-w-[480px]`.
- Keep dark zinc/emerald Tailwind look and lucide icons.
- Do not touch `.github/workflows/trigger-apk-update.yml` or `src/data/programData.ts` content.
- Weight steps: 2 kg dumbbells (name contains `db`/`dumbbell`), 2.5 kg otherwise, 5 lbs in lbs. Reps step 1. RPE step 0.5, range 5–10.
- Keep working: draft save/restore, timestamp rest timer that restarts on every logged working set, switch day/week confirmation, per-exercise notes, substitutions with separate history, skip week, Cycle 2, kg/lbs conversion with confirm, +1 Extra workout modal.
- `npm run lint`, `npm run build`, `npm test` pass after every task.

## Review Focus

1. App killed mid-workout and reopened → Resume workout restores every logged set and the panel loads the first unlogged set (Task 4 manual check, Task 2 test `nextPendingSet` on a restored draft).
2. Opening a week/day that is already completed → read-only list, no panel, no draft is created (Task 4 manual check).
3. kg↔lbs switch while a draft exists → panel and list show converted numbers, target weight converted too (Task 2 test `convertDraftUnits`).
4. Gist failures: wrong token (401), offline, rate limit → finishing a workout still completes instantly; status shows the error / "pending" (Task 6 tests).
5. A fresh install / Reset / Load demo followed by Finish → automatic backup is skipped because GitHub has more workouts (Task 6 test `shouldAutoOverwrite`).

---

### Task 1: Progression engine

**Files:**
- Create: `src/utils/nextTargets.ts`, `src/utils/nextTargets.test.ts`
- Modify: `src/utils/progression.ts` (`generateSmartTarget` delegates; keep its export and `TargetSuggestion` shape for `WeeklyTargetsView`), `package.json` (`"test": "tsx src/utils/nextTargets.test.ts && tsx src/utils/workoutSession.test.ts && tsx src/utils/gistBackup.test.ts"` — add each file as its task lands)

**Interfaces:**
- Produces:
  - `type ExerciseClass = 'compound' | 'isolation'`
  - `classifyExercise(ex: ExerciseDefinition): ExerciseClass` — compound if `isHeavyOrBackoff` is `'heavy'|'backoff'`, or `targetMuscles` has 2+ entries including any of Chest, Back / Lats, Quads, Hamstrings, Glutes.
  - `targetRpeOf(ex: ExerciseDefinition): number` — upper bound of `targetRpe` (`'8-9'`→9, `'9-10'`→10, `'10'`→10).
  - `weightStep(exName: string, unit: WeightUnit): number`
  - `interface SetTarget { weight: number; reps: number; rpe: number }`
  - `interface ExercisePlan { targetWeight: number; sets: SetTarget[]; reason: string; lastTime?: { weight: number; reps: number; rpe: number; date: string } ; isFirstTime: boolean }`
  - `planExercise(args: { exercise: ExerciseDefinition; weekNumber: number; isDeload: boolean; unit: WeightUnit; chosenSubstitution?: string; workouts: CompletedWorkoutSession[]; pastCycles?: PastCycle[]; manualTarget?: WeeklyExerciseTarget }): ExercisePlan`

Rules (spec §3, per working set k from last session's set k, last available set if fewer; technique sets (`intensityTechniqueApplied` not `none`/undefined on the exercise's last set) are excluded as inputs and copy the previous set's target; missing RPE = target):

| last set | next |
|---|---|
| reps ≥ max, RPE ≤ T | weight + step, reps = min |
| reps ≥ max, RPE > T | same, same |
| min ≤ reps < max, RPE ≤ T − 2 | compound: weight + step, same reps · isolation: reps + 2 capped at max |
| min ≤ reps < max, T − 2 < RPE ≤ T | same weight, reps + 1 capped at max |
| min ≤ reps < max, RPE > T | same, same |
| reps < min | weight − 5% (at least one step), reps = min |
| isDeload | weight − 10% (at least one step), reps = min, rpe = T − 2 |

Weights round to the nearest step; never below one step. `targetWeight` = the highest set weight. `manualTarget` (if present) overrides: every set = `manualTarget.targetWeight`, reps = `targetRepsMin`, rpe = `targetRpe`. First time: keep today's baseline (30 kg/65 lb heavy, 22.5 kg/50 lb otherwise), `isFirstTime: true`. Past-cycle source: same weights, reps = min, reason mentions the cycle. `reason` examples: `"RPE 7 at 80 kg — jumping to 82.5 kg"`, `"Hit 10 reps @9 — +2.5 kg"`, `"Aim for 11 reps"`, `"Missed the range — dropping to 76 kg"`, `"Deload week — 72.5 kg"`.

- [ ] **Step 1: Write failing tests** in `src/utils/nextTargets.test.ts` (node `assert/strict`, a tiny `test(name, fn)` helper that prints ✓/✗ and sets `process.exitCode = 1` on failure). Build fixtures with a compound exercise (RDL: `minReps 8, maxReps 10, targetRpe '8-9'`, `isHeavyOrBackoff 'heavy'`, not DB) and an isolation one (`Cable Lateral Raise`, `targetMuscles ['Shoulders / Delts']`, `10–15`, `'10'`). Cases:
  - `top of range at target → +2.5, reps 8`: last 80×10@9 → `{weight: 82.5, reps: 8}`
  - `top of range grinding → hold`: last 80×10@9.5 (T=9) → `{80, 10}`
  - `much easier compound → weight first`: last 80×9@7 → `{82.5, 9}`
  - `much easier isolation → +2 reps`: last 10×12@8 (T=10) → `{10, 14}`; last 10×14@8 → `{10, 15}` (capped)
  - `on target → +1 rep`: last 80×9@9 → `{80, 10}`
  - `RPE 10 inside range with T=10 is on target`: isolation 10×12@10 → `{10, 13}`
  - `below range → -5% rounded to step`: last 80×6@10 → `{75, 8}` (76 rounds to nearest 2.5 = 75)
  - `deload → -10%, min reps, T-2`: last 80×10@9, isDeload → `{72.5, 8, rpe 7}`
  - `per-set targets`: last sets [80×10@9, 80×8@9] → sets `[{82.5,8},{80,9}]`, `targetWeight 82.5`
  - `manual target wins`: manualTarget 90/8/9 → all sets 90×8@9
  - `technique set copies previous set target`
  - `first time → baseline, isFirstTime`
  - `substitution history isolated`: a session with `chosenSubstitution: 'Leg Press'` is ignored when planning without substitution
  - `dumbbell step 2 kg`: `Flat DB Press` 32×6@8 (T=9, range 4–6) → `{34, 4}`
  - `classifyExercise` and `targetRpeOf` table checks.
- [ ] **Step 2:** `npx tsx src/utils/nextTargets.test.ts` → fails (module missing).
- [ ] **Step 3:** Implement `src/utils/nextTargets.ts`; make `generateSmartTarget` call `planExercise` and map: `suggestedWeight = targetWeight`, `suggestedRepsMin = sets[0].reps`, `suggestedRepsMax = exercise.maxReps`, `targetRpe = sets[0].rpe`, `reason`, `previousBest*`/`previousSessionDate` from `lastTime`. Need `isDeload`: look up `PROGRAM_WEEKS` by `weekNumber` inside `generateSmartTarget`.
- [ ] **Step 4:** `npx tsx src/utils/nextTargets.test.ts` → all ✓; `npm run lint` clean.
- [ ] **Step 5:** Add `test` script; commit `feat(progression): RPE-aware double progression with per-set targets`.

---

### Task 2: Workout session logic (pure)

**Files:**
- Create: `src/utils/workoutSession.ts`, `src/utils/workoutSession.test.ts`
- Modify: `src/types/workout.ts` (add optional `targetWeights?: Record<string, number>` to `activeWorkoutDraft`; keep `baseWorkingWeights` readable for old drafts), `package.json` test script

**Interfaces:**
- Consumes: `planExercise`, `weightStep` (Task 1); `calculateWarmupPyramid` (`progression.ts`).
- Produces:
  - `buildExerciseLog(ex: ExerciseDefinition, plan: ExercisePlan, unit: WeightUnit, note?: string): LoggedExercise` — warm-ups from `calculateWarmupPyramid(plan.targetWeight, ex.warmupSetsCount)` rounded to step, reps 8/5/3, **RPE 5/6/7** (3rd+ = 7), ids `${ex.id}-w${n}`; working sets from `plan.sets`, ids `${ex.id}-s${n}`, last set gets `intensityTechniqueApplied: ex.lastSetTechnique`; `rir = max(0, 10 - rpe)`.
  - `applyTargetWeight(log: LoggedExercise, ex: ExerciseDefinition, weight: number, unit: WeightUnit): LoggedExercise` — every **unlogged** working set → `weight`; every **unlogged** warm-up re-derived from `weight`; completed sets untouched.
  - `updateSet(log: LoggedExercise, setId: string, patch: Partial<Pick<LoggedSet,'weight'|'reps'|'rpe'|'completed'>>): LoggedExercise` — changes only that set; recomputes its `rir`.
  - `nextPendingSet(order: string[], logs: Record<string, LoggedExercise>): { exerciseId: string; setId: string } | null` — first uncompleted set (warm-ups before working sets) of the first exercise in `order` that has one.
  - `topSet(log: LoggedExercise): LoggedSet | undefined` — completed working set with max `weight*reps`.
  - `convertDraftUnits(draft: NonNullable<UserFitnessProfile['activeWorkoutDraft']>, from: WeightUnit, to: WeightUnit): typeof draft` — converts set weights and `targetWeights` (move the draft branch of `handleToggleUnit` in `App.tsx` to call this).

- [ ] **Step 1: Failing tests:**
  - `buildExerciseLog warm-up RPEs are 5,6,7` (exercise with 3 warm-ups) and no warm-up has RPE 10.
  - `applyTargetWeight sets all unlogged working sets to exactly 85` (sets were 82.5 and 80) and leaves a completed set at 80.
  - `applyTargetWeight re-derives unlogged warm-ups only` (a completed warm-up keeps its weight).
  - `updateSet changes only that set` (target 80, set 1 → 82.5, set 2 stays 80, warm-ups unchanged).
  - `nextPendingSet` on a restored draft with ex1 complete and ex2 warm-up 1 done → `{ex2, ex2-w2}`; all done → `null`.
  - `convertDraftUnits kg→lbs→kg round-trips 100 kg` and converts `targetWeights`.
- [ ] **Step 2:** run → fail.
- [ ] **Step 3:** implement; wire `App.tsx` `handleToggleUnit` draft branch to `convertDraftUnits`.
- [ ] **Step 4:** `npm test` all ✓, `npm run lint` clean.
- [ ] **Step 5:** commit `feat(workout): pure session helpers for target weight vs set weight`.

---

### Task 3: Thumb panel with rest countdown

**Files:**
- Create: `src/hooks/useRestCountdown.ts`, `src/components/workout/SetPanel.tsx`
- Delete (end of Task 4): `src/components/RestTimer.tsx`

**Interfaces:**
- Produces:
  - `useRestCountdown(): { secondsLeft: number; isRunning: boolean; start(seconds: number): void; adjust(deltaSeconds: number): void; skip(): void }` — port the timestamp logic from `RestTimer.tsx` (`endAt`, 300 ms tick, `visibilitychange` recompute, tick sound for last 3 s, `sounds.playTimerComplete()` exactly once). `start` always restarts, even with the same seconds.
  - `SetPanel` props: `{ title: string /* "RDL · Set 3 of 3" or "Warm-up 1" */; set: LoggedSet; mode: 'log' | 'edit'; unit: WeightUnit; weightStep: number; rest: ReturnType<typeof useRestCountdown>; onChange(patch: Partial<Pick<LoggedSet,'weight'|'reps'|'rpe'>>): void; onSubmit(): void }`.
  - Layout: header row (title left, `Rest m:ss` right while running); three equal controls (weight / reps / RPE) each `−  value  +`, value tappable to type (numeric `inputMode="decimal"`), RPE clamps 5–10 step 0.5; full-width button `Log set N` (mode `log`) or `Save` (mode `edit`); while running a slim row `−30  +30  Skip`. Fixed bottom, `pb-[env(safe-area-inset-bottom)]`, max-w 480 centred. Buttons ≥44 px tall.
- [ ] **Step 1:** implement hook + component (no unit test framework for React; verified in Task 4).
- [ ] **Step 2:** `npm run lint` clean; commit `feat(workout): thumb panel and rest countdown hook`.

---

### Task 4: Workout screen (checklist) replaces WorkoutView

**Files:**
- Create: `src/components/workout/WorkoutScreen.tsx`, `src/components/workout/ExerciseItem.tsx`, `src/components/workout/ExerciseMenu.tsx`
- Modify: `src/App.tsx` (render `WorkoutScreen` instead of `WorkoutView`; pass the same props + `onUpdateExerciseNote`)
- Delete: `src/components/WorkoutView.tsx`, `src/components/RestTimer.tsx`

**Interfaces:**
- Consumes: Tasks 1–3. Keeps `WarmupPyramidModal` for the warm-up calculator.
- `WorkoutScreen` props = old `WorkoutViewProps` (`profile, selectedWeek, onFinishWorkout, onOpenRirGuide, onUpdateDraft, onUpdateExerciseNote`) + `onExit(): void` (back to Workout home, Task 5).

Behaviour (spec §1): slim top bar `Week N · Full Body A` + elapsed clock + `⋮` (switch day with existing confirm text, discard draft, RIR guide); list: done exercises one dimmed line `✓ name · W × R`, upcoming one line `name · N sets`, current expanded with `⋮` (substitution select, form cues = `coachingNotes`/`techniqueNote`, warm-up calculator, note edit), saved note, Target weight `− value +` (calls `applyTargetWeight`, marks draft dirty), line `Last time W kg × R · <reason>`, readout rows `W1 40 × 8`, `1 80 × 10 @8 ✓`, selected row highlighted, `next` on the pending one; tap exercise → expand; tap set → load into panel (`edit` if completed). Logging: `updateSet(..., {completed: true})`, start rest with `exercise.restTimeSeconds || 120` for working sets only, auto-advance via `nextPendingSet`, expand that exercise. `Finish workout` button at list end (same session object + `onUpdateDraft(null)` + fanfare/confetti as today). Draft persisted on every change using `targetWeights` (fallback to `baseWorkingWeights` when restoring old drafts); keep the rule "no draft until a set is logged or a weight changed". Completed sessions: list only, panel hidden, Finish hidden. List gets bottom padding equal to panel height. Remove: mode switcher, info banner, title card.

- [ ] **Step 1:** build components; delete old files; `npm run lint` + `npm run build` clean.
- [ ] **Step 2:** Manual check at 375×812 in the browser preview (`npm run dev`), each must hold:
  - Day A fits in ≤ 2.5 screens (`document.documentElement.scrollHeight ≤ 2100`) with one exercise expanded.
  - No horizontal overflow (`scrollWidth === innerWidth`).
  - Log warm-ups + 2 working sets: timer only starts on working sets, restarts at full length on the 2nd set; warm-up RPE shows 5/6/7.
  - Set 1 changed to 82.5 → set 2 still 80; Target weight → 85 sets all unlogged sets to 85.
  - Reload page mid-workout → Resume restores sets; panel on first unlogged set (Review Focus 1).
  - Open an already-completed day → no panel, no new draft in localStorage (Review Focus 2).
  - Toggle kg→lbs with a draft → numbers converted (Review Focus 3).
- [ ] **Step 3:** commit `feat(workout): checklist + thumb panel workout screen`.

---

### Task 5: App shell — Workout / Stats / More

**Files:**
- Create: `src/components/shell/BottomTabs.tsx`, `src/components/shell/WorkoutHome.tsx`, `src/components/shell/StatsScreen.tsx`, `src/components/shell/MoreScreen.tsx`, `src/components/shell/SubScreen.tsx` (full-screen wrapper with back arrow + title)
- Modify: `src/App.tsx` (tabs `'workout' | 'stats' | 'more'`, sub-screen state `'roadmap' | 'targets' | 'badges' | 'rir' | 'backup' | null`, `inWorkout` boolean; open on `workout`)
- Delete: `src/components/Navbar.tsx`

Behaviour (spec §2): `WorkoutHome` — "Next workout" card (first of A/B not done in `currentWeek`; text `N exercises · ~M min` where M = Σ(sets × (rest + 1 min)) rounded to 5; button `Start workout`, or `Resume workout` if a draft exists), `+1 Extra workout` card (opens existing `AdaptiveBonusModal`), "This week" A/B ✓/○. `StatsScreen` — one line `Week X of 12 · D/24 workouts · 🔥 S wk streak · Lvl L (XP)` above existing `ProgressVisualizationView`. `MoreScreen` — sections Program (12-week roadmap, Weekly targets, Badges & trophies, RIR/RPE guide), Data (Back up / Restore), Settings (Units `kg ›` with existing convert confirm, Load demo data, Reset all data in red) — each opens existing view inside `SubScreen` (RIR guide may stay a modal). Roadmap's "Log A/B" buttons start that workout (`handleStartWorkout`), keeping skip week and new cycle. Bottom tabs hidden while `inWorkout`; the workout's top-bar back/exit returns to home without discarding the draft.

- [ ] **Step 1:** implement; `npm run lint` + `npm run build` clean.
- [ ] **Step 2:** Manual check at 360 px: no horizontal overflow on all three tabs and each sub-screen; app opens on Workout; Start → workout → back → Resume shows; Roadmap/Targets/Badges reachable from More with back arrow; +1 Extra workout opens and saves.
- [ ] **Step 3:** commit `feat(shell): bottom tabs Workout/Stats/More, header removed`.

---

### Task 6: Gist auto-backup and restore

**Files:**
- Create: `src/utils/gistBackup.ts`, `src/utils/gistBackup.test.ts`, `src/components/shell/BackupScreen.tsx`
- Modify: `src/App.tsx` (call `autoBackup` after `handleFinishWorkout` and `handleSaveBonusSession` without awaiting; on mount and on `window` `online` call `retryPendingBackup`), `package.json` test script
- Delete: `src/components/CloudBackupModal.tsx`

**Interfaces:**
- Produces (all accept an injectable `fetchFn = fetch` as last param for tests):
  - Constants: `GIST_FILENAME = 'apexlift_fitness_profile.json'`, `GIST_DESCRIPTION = 'ApexLift Workout & Hypertrophy Progress Cloud Sync'`, keys `apexlift_github_pat`, `apexlift_github_gist_id`, `apexlift_backup_status` (JSON `{ lastSuccessAt?: string; pending?: boolean; lastError?: string; blockedReason?: string }`).
  - `countWorkouts(p: UserFitnessProfile): number` — `completedWorkouts.length + bonusSessions.length + Σ pastCycles (completedWorkouts + bonusSessions)`.
  - `findBackupGist(token, fetchFn): Promise<string | null>` — `GET https://api.github.com/gists?per_page=100`, first gist whose `files` has `GIST_FILENAME`.
  - `readBackup(token, gistId, fetchFn): Promise<{ profile: UserFitnessProfile; updatedAt: string } | null>`
  - `writeBackup(token, profile, gistId | null, fetchFn): Promise<string /* gistId */>` — PATCH existing or POST `{ public: false }`.
  - `shouldAutoOverwrite(local: UserFitnessProfile, remote: UserFitnessProfile | null): boolean` — `remote === null || countWorkouts(local) >= countWorkouts(remote)`.
  - `autoBackup(profile, fetchFn?): Promise<void>` — no token → return; resolve gist id (cache) → read remote → if `!shouldAutoOverwrite` set `blockedReason` and stop → write → `lastSuccessAt`; any error → `pending: true, lastError`. Never throws.
  - `retryPendingBackup(getProfile: () => UserFitnessProfile, fetchFn?)` — runs `autoBackup` if `pending`.
  - Headers: `Authorization: Bearer <token>`, `Accept: application/vnd.github+json`. Token never included in the backup JSON or console output.
- `BackupScreen` (More → Back up / Restore): token field + Save (on save: `findBackupGist`; if found, show "Backup found from <date> · N workouts — Restore?" before anything is written); status line (`Last backed up: 5 min ago` / `Backup pending — will retry` / error / blocked message "Backup on GitHub has more workouts than this phone — restore or overwrite?"); `Back up now` (if blocked: confirm stating both counts, then force write); `Restore from GitHub` (confirm "Replace all data on this phone with the backup from <date>?", then normalise via the same merge as `loadUserProfile` — export a `normalizeProfile(p)` from `storage.ts` and reuse it in `loadUserProfile`); manual fallback `Copy backup text` + paste box + `Restore from text`. No Download button.

- [ ] **Step 1: Failing tests** with a fake `fetchFn` recording calls:
  - `countWorkouts includes past cycles and bonus`
  - `shouldAutoOverwrite false when remote has more` (local 0, remote 5) and `true when remote null`
  - `autoBackup with remote larger does not PATCH and sets blockedReason` (Review Focus 5)
  - `autoBackup on 401 sets pending + lastError and resolves` (Review Focus 4); `on network TypeError → pending`
  - `autoBackup without cached id finds gist by filename then PATCHes it`; `none found → POST public:false`
  - `backup body never contains the token string`
- [ ] **Step 2:** run → fail. **Step 3:** implement. **Step 4:** `npm test` all ✓, lint/build clean.
- [ ] **Step 5:** Manual: finish a workout offline (devtools offline) → finishes instantly, status "pending"; back online → succeeds. Commit `feat(backup): automatic Gist backup after workouts with restore`.

---

### Task 7: Final verification and ship

- [ ] **Step 1:** `npm test`, `npm run lint`, `npm run build` all pass.
- [ ] **Step 2:** Repeat Task 4 Step 2 and Task 5 Step 2 checks at 360×780 and 412×915.
- [ ] **Step 3:** `git push` to `TenLecks/ApexLift-Google` main; confirm `trigger-apk-update.yml` run succeeded and a new release appears in `TenLecks/apexlift` whose notes `source:` equals the pushed SHA.
- [ ] **Step 4:** Tell the owner to tap **Pull** in AI Studio before editing there.
