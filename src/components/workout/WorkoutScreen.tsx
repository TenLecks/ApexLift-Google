import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { ChevronLeft, Flag, MoreVertical, RotateCcw, ArrowRightLeft, Info } from 'lucide-react';
import type { CompletedWorkoutSession, LoggedExercise, LoggedSet, UserFitnessProfile } from '../../types/workout';
import { PROGRAM_WEEKS } from '../../data/programData';
import { planExercise, weightStep, type ExercisePlan } from '../../utils/nextTargets';
import { isDeloadWeek } from '../../utils/progression';
import { applyTargetWeight, buildExerciseLog, nextPendingSet, pickDayType, updateSet } from '../../utils/workoutSession';
import { useRestCountdown } from '../../hooks/useRestCountdown';
import { sounds } from '../../utils/audio';
import { WarmupPyramidModal } from '../WarmupPyramidModal';
import { ExerciseItem } from './ExerciseItem';
import { ExerciseMenu } from './ExerciseMenu';
import { SetPanel } from './SetPanel';

type DayType = 'Full Body A' | 'Full Body B';

interface WorkoutScreenProps {
  profile: UserFitnessProfile;
  selectedWeek: number;
  initialDayType?: DayType;
  onFinishWorkout: (session: CompletedWorkoutSession) => void;
  onOpenRirGuide: () => void;
  onUpdateDraft?: (draft: UserFitnessProfile['activeWorkoutDraft']) => void;
  onUpdateExerciseNote?: (exerciseId: string, note: string) => void;
  onExit?: () => void;
}

type SetRef = { exerciseId: string; setId: string };

const fmtClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const WorkoutScreen: React.FC<WorkoutScreenProps> = ({
  profile,
  selectedWeek,
  initialDayType,
  onFinishWorkout,
  onOpenRirGuide,
  onUpdateDraft,
  onUpdateExerciseNote,
  onExit,
}) => {
  const weekPlan = PROGRAM_WEEKS.find((w) => w.weekNumber === selectedWeek) || PROGRAM_WEEKS[0];
  const unit = profile.weightUnit;
  const [dayType, setDayType] = useState<DayType>(() => pickDayType(profile.activeWorkoutDraft, selectedWeek, initialDayType));
  const template = dayType === 'Full Body A' ? weekPlan.workouts.dayA : weekPlan.workouts.dayB;
  const order = useMemo(() => template.exercises.map((e) => e.id), [template]);
  const defs = useMemo(() => Object.fromEntries(template.exercises.map((e) => [e.id, e])), [template]);

  const [logs, setLogs] = useState<Record<string, LoggedExercise>>({});
  const [targetWeights, setTargetWeights] = useState<Record<string, number>>({});
  const [startTime, setStartTime] = useState(Date.now());
  const [dirty, setDirty] = useState(false);
  const [restored, setRestored] = useState(false);
  const [selected, setSelected] = useState<SetRef | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [warmupCalcFor, setWarmupCalcFor] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [now, setNow] = useState(Date.now());
  const rest = useRestCountdown();

  const completedSession = profile.completedWorkouts.find((w) => w.weekNumber === selectedWeek && w.dayType === dayType);
  const readOnly = Boolean(completedSession);

  const planFor = (exerciseId: string, chosenSubstitution?: string): ExercisePlan =>
    planExercise({
      exercise: defs[exerciseId],
      weekNumber: selectedWeek,
      isDeload: weekPlan.isDeload,
      unit,
      chosenSubstitution,
      workouts: profile.completedWorkouts,
      pastCycles: profile.pastCycles,
      manualTarget: profile.weeklyTargets[`${selectedWeek}_${exerciseId}`],
      isDeloadWeek,
    });

  const plans = useMemo(
    () => Object.fromEntries(order.map((id) => [id, planFor(id, logs[id]?.chosenSubstitution)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, selectedWeek, unit, profile.completedWorkouts, profile.weeklyTargets, logs]
  );

  const focus = (nextLogs: Record<string, LoggedExercise>) => {
    const next = nextPendingSet(order, nextLogs);
    setSelected(next);
    setExpandedId(next?.exerciseId ?? order[0] ?? null);
  };

  // Initialise: completed session (read-only) → matching draft → fresh plan.
  useEffect(() => {
    if (completedSession) {
      const l = Object.fromEntries(completedSession.exercises.map((e) => [e.exerciseId, e]));
      setLogs(l);
      setTargetWeights({});
      setRestored(false);
      setSelected(null);
      setExpandedId(order[0] ?? null);
      return;
    }
    const d = profile.activeWorkoutDraft;
    if (d && d.weekNumber === selectedWeek && d.dayType === dayType) {
      const hasLogged = d.exercises.some((e) => e.sets.some((s) => s.completed));
      if (hasLogged || d.hasWeightChanged) {
        const l = Object.fromEntries(d.exercises.map((e) => [e.exerciseId, e]));
        const tw =
          d.targetWeights ??
          d.baseWorkingWeights ??
          Object.fromEntries(d.exercises.map((e) => [e.exerciseId, e.sets.find((s) => !s.isWarmup)?.weight ?? 0]));
        setLogs(l);
        setTargetWeights(tw);
        setStartTime(new Date(d.startedAt).getTime() || Date.now());
        setDirty(Boolean(d.hasWeightChanged));
        setRestored(true);
        focus(l);
        return;
      }
    }
    const l: Record<string, LoggedExercise> = {};
    const tw: Record<string, number> = {};
    for (const ex of template.exercises) {
      const p = planFor(ex.id);
      l[ex.id] = buildExerciseLog(ex, p, unit, profile.exerciseNotes?.[ex.id] || '');
      tw[ex.id] = p.targetWeight;
    }
    setLogs(l);
    setTargetWeights(tw);
    setStartTime(Date.now());
    setDirty(false);
    setRestored(false);
    focus(l);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, dayType, Boolean(completedSession), unit, resetKey]);

  // Persist the draft once something was logged or a weight changed.
  useEffect(() => {
    if (readOnly || Object.keys(logs).length === 0) return;
    const hasLogged = Object.values(logs).some((e) => e.sets.some((s) => s.completed));
    if (!hasLogged && !dirty) return;
    onUpdateDraft?.({
      weekNumber: selectedWeek,
      dayType,
      startedAt: new Date(startTime).toISOString(),
      exercises: order.map((id) => logs[id]).filter(Boolean),
      targetWeights,
      hasWeightChanged: dirty,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, targetWeights, dirty, startTime]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const pending = readOnly ? null : nextPendingSet(order, logs);
  const selectedSet: LoggedSet | undefined = selected ? logs[selected.exerciseId]?.sets.find((s) => s.id === selected.setId) : undefined;

  const patchSelected = (patch: Partial<Pick<LoggedSet, 'weight' | 'reps' | 'rpe'>>) => {
    if (!selected) return;
    if (patch.weight !== undefined) setDirty(true);
    setLogs((prev) => ({ ...prev, [selected.exerciseId]: updateSet(prev[selected.exerciseId], selected.setId, patch) }));
  };

  const submit = () => {
    if (!selected || !selectedSet) return;
    const ex = defs[selected.exerciseId];
    let nextLogs = logs;
    if (!selectedSet.completed) {
      nextLogs = { ...logs, [selected.exerciseId]: updateSet(logs[selected.exerciseId], selected.setId, { completed: true }) };
      setLogs(nextLogs);
      if (!selectedSet.isWarmup) rest.start(ex.restTimeSeconds || 120);
      else sounds.playTick();
    }
    focus(nextLogs);
  };

  const setTarget = (exerciseId: string, weight: number) => {
    setDirty(true);
    setTargetWeights((prev) => ({ ...prev, [exerciseId]: weight }));
    setLogs((prev) => ({ ...prev, [exerciseId]: applyTargetWeight(prev[exerciseId], defs[exerciseId], weight, unit) }));
  };

  const swap = (exerciseId: string, name: string) => {
    const ex = defs[exerciseId];
    const sub = name === ex.name ? undefined : name;
    const log = logs[exerciseId];
    const anyLogged = log.sets.some((s) => s.completed);
    // Nothing logged yet: re-plan from this variation's own history.
    const rebuilt = anyLogged ? log : buildExerciseLog(ex, planFor(exerciseId, sub), unit, log.notes);
    const nextLog = { ...rebuilt, exerciseName: name, chosenSubstitution: sub };
    if (!anyLogged) setTargetWeights((prev) => ({ ...prev, [exerciseId]: planFor(exerciseId, sub).targetWeight }));
    setDirty(true);
    const nextLogs = { ...logs, [exerciseId]: nextLog };
    setLogs(nextLogs);
    if (!anyLogged && selected?.exerciseId === exerciseId) focus(nextLogs);
  };

  const saveNote = (exerciseId: string, note: string) => {
    setLogs((prev) => ({ ...prev, [exerciseId]: { ...prev[exerciseId], notes: note } }));
    onUpdateExerciseNote?.(exerciseId, note);
  };

  const anyLogged = Object.values(logs).some((e) => e.sets.some((s) => s.completed));

  const switchDay = () => {
    setTopMenuOpen(false);
    const target: DayType = dayType === 'Full Body A' ? 'Full Body B' : 'Full Body A';
    const hasProgress = anyLogged || dirty;
    if (hasProgress && !window.confirm(`You have an unfinished ${dayType} workout. Switch anyway and discard it?`)) return;
    if (hasProgress) onUpdateDraft?.(null);
    rest.skip();
    setDayType(target);
  };

  const discardDraft = () => {
    setTopMenuOpen(false);
    if (!window.confirm('Discard this workout in progress and start fresh?')) return;
    onUpdateDraft?.(null);
    rest.skip();
    setResetKey((k) => k + 1);
  };

  const finish = () => {
    const left = order.reduce((n, id) => n + (logs[id]?.sets.filter((s) => !s.isWarmup && !s.completed).length ?? 0), 0);
    if (left > 0 && !window.confirm(`Finish with ${left} working set${left === 1 ? '' : 's'} not logged?`)) return;
    const durationMinutes = Math.max(1, Math.round((Date.now() - startTime) / 60000));
    onFinishWorkout({
      id: `w${selectedWeek}-${dayType.replace(/\s+/g, '')}-${Date.now()}`,
      weekNumber: selectedWeek,
      dayType,
      dateCompleted: new Date().toISOString(),
      durationMinutes,
      exercises: order.map((id) => logs[id]).filter(Boolean),
      notes: `Week ${selectedWeek} ${dayType} completed in ${durationMinutes} minutes.`,
    });
    onUpdateDraft?.(null);
    rest.skip();
    sounds.playVictoryFanfare();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  const panelTitle = (() => {
    if (!selected || !selectedSet) return '';
    const name = logs[selected.exerciseId]?.exerciseName || defs[selected.exerciseId]?.name;
    if (selectedSet.isWarmup) return `${name} · Warm-up ${selectedSet.setNumber}`;
    const total = logs[selected.exerciseId].sets.filter((s) => !s.isWarmup).length;
    return `${name} · Set ${selectedSet.setNumber} of ${total}`;
  })();

  const showPanel = !readOnly && selected && selectedSet;

  return (
    <div className="mx-auto max-w-[480px]">
      <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-frame text-frame-ink flex items-center gap-2">
        {onExit && (
          <button type="button" aria-label="Back" onClick={onExit} className="p-1.5 -ml-1.5 rounded-lg text-frame-ink active:bg-frame-2">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-bold text-frame-ink text-sm truncate">
            Week {selectedWeek} · {dayType}
            {weekPlan.isDeload ? <span className="ml-1.5 text-[10px] text-frame-muted uppercase">deload</span> : null}
          </div>
        </div>
        {!readOnly && <span className="font-mono text-xs text-frame-muted">⏱ {fmtClock(now - startTime)}</span>}
        <div className="relative">
          <button type="button" aria-label="Workout options" onClick={() => setTopMenuOpen((o) => !o)} className="p-1.5 rounded-lg text-frame-ink active:bg-frame-2">
            <MoreVertical className="w-5 h-5" />
          </button>
          {topMenuOpen && (
            <div className="absolute right-0 mt-1 w-56 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl py-1 text-sm z-40">
              <button type="button" onClick={switchDay} className="w-full px-3 py-2.5 text-left flex items-center gap-2 active:bg-zinc-800">
                <ArrowRightLeft className="w-4 h-4" /> Switch to {dayType === 'Full Body A' ? 'Full Body B' : 'Full Body A'}
              </button>
              {!readOnly && (
                <button type="button" onClick={discardDraft} className="w-full px-3 py-2.5 text-left flex items-center gap-2 active:bg-zinc-800">
                  <RotateCcw className="w-4 h-4" /> Discard &amp; start fresh
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setTopMenuOpen(false);
                  onOpenRirGuide();
                }}
                className="w-full px-3 py-2.5 text-left flex items-center gap-2 active:bg-zinc-800"
              >
                <Info className="w-4 h-4" /> RIR / RPE guide
              </button>
            </div>
          )}
        </div>
      </div>

      {restored && !readOnly && <div className="mt-2 text-xs text-amber-300">Workout in progress — restored.</div>}
      {readOnly && <div className="mt-2 text-xs text-zinc-400">Completed workout · view only</div>}

      <div className={`mt-3 space-y-2 ${showPanel ? 'pb-[calc(16rem+env(safe-area-inset-bottom))]' : 'pb-6'}`}>
        {template.exercises.map((ex, i) =>
          logs[ex.id] ? (
            <ExerciseItem
              key={ex.id}
              index={i}
              exercise={ex}
              log={logs[ex.id]}
              plan={readOnly ? undefined : plans[ex.id]}
              targetWeight={targetWeights[ex.id] ?? 0}
              unit={unit}
              weightStep={weightStep(logs[ex.id].exerciseName || ex.name, unit)}
              expanded={expandedId === ex.id}
              readOnly={readOnly}
              selectedSetId={selected?.exerciseId === ex.id ? selected.setId : null}
              pendingSetId={pending?.exerciseId === ex.id ? pending.setId : null}
              onExpand={() => setExpandedId((cur) => (cur === ex.id ? null : ex.id))}
              onSelectSet={(setId) => setSelected({ exerciseId: ex.id, setId })}
              onTargetWeight={(w) => setTarget(ex.id, w)}
              onOpenMenu={() => setMenuFor(ex.id)}
            />
          ) : null
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={finish}
            className="w-full h-12 mt-2 rounded-xl border border-emerald-500/60 text-emerald-300 font-bold flex items-center justify-center gap-2"
          >
            <Flag className="w-4 h-4" /> Finish workout
          </button>
        )}
      </div>

      {showPanel && (
        <SetPanel
          title={panelTitle}
          set={selectedSet!}
          mode={selectedSet!.completed ? 'edit' : 'log'}
          unit={unit}
          weightStep={weightStep(logs[selected!.exerciseId]?.exerciseName || defs[selected!.exerciseId].name, unit)}
          rest={rest}
          onChange={patchSelected}
          onSubmit={submit}
        />
      )}

      {menuFor && logs[menuFor] && (
        <ExerciseMenu
          exercise={defs[menuFor]}
          log={logs[menuFor]}
          readOnly={readOnly}
          onClose={() => setMenuFor(null)}
          onSwap={(name) => swap(menuFor, name)}
          onSaveNote={(note) => saveNote(menuFor, note)}
          onWarmupCalculator={() => {
            setWarmupCalcFor(menuFor);
            setMenuFor(null);
          }}
        />
      )}

      {warmupCalcFor && (
        <WarmupPyramidModal
          isOpen
          onClose={() => setWarmupCalcFor(null)}
          exerciseName={defs[warmupCalcFor].name}
          workingWeight={targetWeights[warmupCalcFor] ?? 0}
          warmupSetsCount={defs[warmupCalcFor].warmupSetsCount}
          unit={unit}
        />
      )}
    </div>
  );
};
