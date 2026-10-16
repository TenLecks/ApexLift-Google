# ApexLift redesign: workout flow, navigation, progression, auto-backup

Date: 2026-10-16 · Repo: TenLecks/ApexLift-Google (edited in Google AI Studio and directly) · Runs as a web app inside an Android APK (Capacitor WebView).

## Why

The owner uses the app on an Android phone, mid-workout, between sets. Today it is unintuitive:

- Logging a workout means a lot of scrolling. Day A in the default "Touch Steppers" mode is ~8,000 px tall (~10 phone screens); one set row is ~260 px; the first full screen is a title card, mode switcher and info banner before any exercise.
- There are three workout modes (Touch Steppers / Focus Station / Table), each with different features: one shows all exercises but scrolls forever, one edits everything but hides the other exercises.
- The header shows ~8 buttons at all times (week picker, streak, KG, RIR guide, +1 Extra Workout, cloud backup, Load Demo, reset) that are irrelevant while training, and on a ~375 px phone the header overflows horizontally (the "⋮ More" button sits off-screen at x≈553).
- The weight/rep suggestion ignores RPE, never lowers weight, ignores deload weeks, and copies one set's numbers to every set.
- Backup is manual and partly broken in the APK ("Download backup" uses a `data:` link that does nothing in Android WebView).

Success: a whole session is logged with minimal scrolling, every set is logged from the same thumb position, upcoming exercises are visible at a glance, rarely used things are out of the way, next-session numbers are sensible without thinking, and workout history survives deleting the app.

## Goals

1. One workout screen (replaces the three modes) — "checklist + thumb panel".
2. Three-tab app structure: Workout · Stats · More.
3. RPE-aware double progression for next-session targets.
4. Automatic backup to a GitHub Gist after every finished workout, plus restore.

## Non-goals

- Fixing why the APK does not receive over-the-air updates (separate investigation; the phone is still on the original build).
- Native/APK changes (notifications, keep-awake, native share). Everything here is web code in `src/`.
- Changing the 12-week program content (`src/data/programData.ts`), badges, XP rules, or the +1 Extra Workout logic.
- Redesigning Roadmap, Weekly Targets, Badges, RIR guide internals — they only move.
- Workout history list or bodyweight log (owner explicitly declined).

## Anti-goals (would be a failure even if it "works")

- Losing or corrupting existing saved data. The localStorage key `apexlift_fitness_profile_v1` and the existing profile shape stay; new fields are optional and default safely.
- Any server code, API key, or Gemini call. Client-side only; no new npm dependencies.
- Breaking what already works: in-progress draft persistence + restore, rest timer accuracy (timestamp-based, restarts on every logged set), switch-day/week confirmation, notes per exercise, substitutions with separate history, skip week, Cycle 2, kg/lbs conversion.
- Anything that needs horizontal scrolling at 360–412 px width.

## Constraints

- Mobile first: must work at 360 px wide; respect `env(safe-area-inset-bottom)`.
- Dark theme, existing Tailwind/zinc/emerald look and lucide icons.
- Desktop/tablet may simply use the same layout centered (max-width ~480 px). No separate desktop design.
- `npm run lint` and `npm run build` must pass.
- The repo is also edited by Google AI Studio, which pulls from GitHub. Keep `.github/workflows/trigger-apk-update.yml` untouched.

## 1. Workout screen (decided)

Layout, top to bottom:

- **Slim top bar** only: `Week N · Full Body A` on the left; workout elapsed clock and a `⋮` menu on the right. The `⋮` menu holds: switch to Day A/B (with the existing unfinished-workout confirmation), discard draft, RIR/RPE guide.
- **Exercise checklist** (scrolls):
  - Finished exercises: one dimmed line with ✓ and the top set (e.g. `✓ Flat DB Press (Heavy) · 32 × 6`).
  - Upcoming exercises: one line each (name + `N sets`).
  - The **current exercise is expanded**: name, a small `⋮` (substitution, form cues/coaching notes, warm-up calculator, add/edit note), the saved exercise note if any (e.g. "seat height 4"), one line `Last time 80 kg × 10 · aim for 11` (from progression, §3), then one compact readout row per set: `W1 40 × 8`, `1 80 × 10 @8 ✓`, `2 80 × 9 @9 ✓`, `3 80 × 9 @9 next`. Warm-up rows are dimmed and labelled `W`.
  - Tapping a collapsed exercise expands it (and collapses the previous one). Tapping a set row loads that set into the panel (to fix a logged set or log out of order).
  - The current exercise auto-advances to the next one when its last working set is logged.
  - A **Finish workout** button at the end of the list (existing finish logic, XP, confetti, draft clear).
- **Thumb panel**, fixed at the bottom above the safe area — the *only* place numbers are edited:
  - Header: `RDL · Set 3 of 3` (or `Warm-up 1`) and, while resting, the countdown.
  - Three big controls: weight (− value +), reps (− value +), RPE (− value +). Tapping a value allows typing it.
  - Big **Log set N** button. Logging marks the set completed, saves the draft, starts the rest timer (working sets only, not warm-ups), and loads the next set.
  - While resting, the panel shows the countdown with −30 / +30 / skip; the Log button stays usable (logging early restarts the timer).
  - Editing a logged set (tapped from the list) shows **Save** instead of Log and does not start the timer.
- Steps: weight 2 kg for dumbbells, 2.5 kg otherwise (lbs: 5); reps 1; RPE 0.5 (range 5–10). RIR stays derived/stored as today.
- Warm-up / target weight interaction: see §3 "Target weight vs. set weight".
- **Warm-up RPE bug (verified):** warm-ups are saved at RPE 5 / 6.5 / 7.5, but today's RPE `<select>` only has options 10, 9.5, 9, 8.5, 8, 7, 6, so a non-matching value renders as its first option, "RPE 10". The panel's − / + RPE control replaces every RPE `<select>`; the displayed value must always equal the stored value. New warm-ups pre-fill RPE 5, 6, 7 (1st, 2nd, 3rd+). Warm-ups never feed progression, badges (e.g. "RIR Zero Club") or volume — keep the existing `!isWarmup` filters.
- Remove: the three-mode switcher, "Automatic Calculations" banner, big week/day title card, separate floating `RestTimer` card (timer lives in the panel; reuse its timestamp logic).

## 2. App structure (decided)

Bottom tab bar, always visible (all widths): **Workout · Stats · More**.

- **Workout tab, between workouts:** a "Next workout" card (day name, exercise count, rough duration, **Start workout**); a **+1 Extra workout** card (opens the existing AdaptiveBonusModal); "This week" A/B checklist. If a draft exists, the card says **Resume workout**. During a workout the tab shows §1.
- **Stats tab:** existing 1RM & volume analytics, plus a compact progress line (week X of 12, workouts done, streak, level/XP) — streak/XP leave the header.
- **More tab:** a list — Program: 12-week roadmap (includes skip week, start new cycle), Weekly targets, Badges & trophies, RIR/RPE guide · Data: Back up / Restore · Settings: Units (kg/lbs, existing conversion + confirm), Load demo data (existing confirm), Reset all data (existing confirm). Each opens the existing view/modal full-screen with a back arrow.
- The app opens on the Workout tab. The old header and its 8 buttons are removed.

## 3. Progression (decided)

Replace `generateSmartTarget` logic (keep its call sites/shape where practical). Inputs: the most recent previous session of the same `exerciseId` **and** same `chosenSubstitution` (existing rule), all of its completed working sets (weight, reps, RPE), the exercise's rep range and target RPE (`targetRpe` upper bound, e.g. "8-9" → 9), whether the current week is a deload (`WeekPlan.isDeload`), and the unit.

Exercise class: **compound** if `isHeavyOrBackoff` is `'heavy'` or `'backoff'`, or it targets 2+ muscle groups including Chest, Back / Lats, Quads, Hamstrings or Glutes; otherwise **isolation**. (My call — the data only flags 12 exercises as heavy/backoff.)

Per working set (set k of next session is based on set k of last session; if last session had fewer sets, use its last set):

| Last time (that set) | Next time |
|---|---|
| reps ≥ top of range and RPE ≤ target | weight + 1 step; reps = bottom of range |
| reps ≥ top of range and RPE > target | same weight, same reps |
| in range, RPE ≤ target − 2 (much easier) | compound: weight + 1 step, same reps · isolation: reps + 2 (capped at top; if that hits the top, next rule applies next time) |
| in range, target − 2 < RPE ≤ target | same weight, reps + 1 (capped at top) |
| in range, RPE > target | same weight, same reps |
| reps < bottom of range | weight − 5% (≥1 step), reps = bottom of range |
| current week is deload | weight − 10% (≥1 step), reps = bottom of range, target RPE − 2 |

(My call) "Below the bottom of the range" is the only failure trigger. 31 of 45 exercises have a target RPE of 10 (`'10'` / `'9-10'`), so RPE 10 inside the range counts as *on target* (+1 rep), not failure; the "RPE > target" rows only ever apply to the `'8-9'` exercises. No set-level target needs to be stored.

(My call) **Intensity-technique sets** (`lastSetTechnique`: dropset, myo-reps, partials…): logged in the same panel as weight / reps / RPE, where reps = the main straight-set reps before the technique; the technique stays a label (`intensityTechniqueApplied`). They are excluded as progression *inputs*; the technique set's next target copies the target of the straight set before it.

**Target weight vs. set weight (decided by owner):**
- Each exercise has a **Target weight**, shown with − / + in the expanded exercise header. It is pre-filled from progression (the top working set's target) or a manual Weekly target.
- Changing the **Target weight** sets **every unlogged working set** of that exercise to exactly that weight (not a shift — all become the target), and re-derives every **unlogged warm-up** from it. Logged sets never change.
- Changing the weight of **one set in the panel changes only that set** — warm-ups included (e.g. doing a warm-up heavier/lighter than suggested) — and never touches the target or other sets. Example: target 80, set 1 done at 82.5 → set 2 stays 80.
- Reps / RPE edits are always per set.

Rounding: to the gym step (2 kg dumbbells, 2.5 kg other; lbs 5). Missing RPE on a set → treat as on target.
Priority: a manual target in Weekly targets (`weeklyTargets[week_exerciseId]`) overrides everything. First time an exercise is done → existing baseline behaviour.
The panel pre-fills each set with its own target; the "Last time … · aim for …" line shows the top set and a short reason (e.g. "RPE 7 at 80 kg — jumping to 82.5 kg").
Pure function, unit-testable; add a small test file covering each table row (no new dependencies — a plain `tsx`/node assert script is fine; `tsx` is already a devDependency).

## 4. Auto-backup (decided)

- Destination: one secret GitHub Gist, file `apexlift_fitness_profile.json`, description `ApexLift Workout & Hypertrophy Progress Cloud Sync` — the same file/description the current app version already uses, so a backup made from the old build is found and continued.
- Auth: a classic GitHub token with only the `gist` scope, entered once in More → Back up / Restore; stored in localStorage (`apexlift_github_pat`, existing key). Gist id cached in `apexlift_github_gist_id` (existing key).
- If no gist id is cached, find it by listing the user's gists (`GET /gists`) and matching the filename; create one only if none exists.
- Trigger: automatically after **Finish workout** and after saving a +1 Extra workout. Also a **Back up now** button.
- Offline / failure: mark "backup pending" in localStorage; retry on next app start and on the `online` event. Never block or delay finishing a workout.
- Status line on the Back up / Restore screen: "Last backed up: 5 min ago" / "Backup pending — will retry" / last error text.
- Restore: paste token → **Restore from GitHub** → finds the gist → confirm ("Replace all data on this phone with the backup from <date>?") → load (run the same normalisation as `loadUserProfile`).
- Manual fallback stays: Copy backup text / paste-to-restore. Remove the broken "Download backup" button.
- The token is never written into the backup, into logs, or into the repo.
- (My call) **Never let an automatic backup shrink the backup.** Before an automatic overwrite, read the Gist; if it holds more finished workouts (current + `pastCycles`) than the phone, skip the automatic backup and show "Backup on GitHub has more workouts than this phone — restore or overwrite?" on the Back up / Restore screen. Only the manual **Back up now** (with a confirm stating both counts) can overwrite in that case. This covers Reset, Load demo, and a fresh install.
- (My call) When a token is entered and a backup already exists, immediately offer **Restore** (showing its date and workout count) before any backup runs.

## Left to the builder

Component/file structure, state management, exact copy text, icons, animations, how the panel's numeric typing works, and whether the Stats tab reuses `ProgressVisualizationView` as-is.
