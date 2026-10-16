import React, { useEffect, useState } from 'react';
import { Check, Circle, Eye, Play, RotateCw, Sparkles, Trophy } from 'lucide-react';
import { useWeekSwipe } from '../../hooks/useWeekSwipe';
import type { UserFitnessProfile } from '../../types/workout';
import { PROGRAM_WEEKS } from '../../data/programData';
import { estimateMinutes, nextWorkout, plusOneTarget, weekStatus } from '../../utils/home';

type DayType = 'Full Body A' | 'Full Body B';

interface WorkoutHomeProps {
  profile: UserFitnessProfile;
  viewWeek: number;
  onChangeWeek(week: number): void;
  onStart(week: number, dayType: DayType): void;
  onView(week: number, dayType: DayType): void;
  onExtra(week: number): void;
  onStartNewCycle(): void;
}

const DAYS: DayType[] = ['Full Body A', 'Full Body B'];

export const WorkoutHome: React.FC<WorkoutHomeProps> = ({ profile, viewWeek, onChangeWeek, onStart, onView, onExtra, onStartNewCycle }) => {
  const current = profile.currentWeek || 1;
  const status = weekStatus(profile, viewWeek);
  const plan = PROGRAM_WEEKS.find((w) => w.weekNumber === viewWeek) || PROGRAM_WEEKS[0];
  const next = nextWorkout(profile);
  const nextPlan = PROGRAM_WEEKS.find((w) => w.weekNumber === next.week) || PROGRAM_WEEKS[0];
  const nextTemplate = next.dayType === 'Full Body A' ? nextPlan.workouts.dayA : nextPlan.workouts.dayB;
  const isDone = (d: DayType) => profile.completedWorkouts.some((w) => w.weekNumber === viewWeek && w.dayType === d);
  const bonusThisWeek = profile.bonusSessions.filter((b) => b.weekNumber === viewWeek);

  // +1 safeguard: auto-pick previous vs current week, shown on the card and switchable.
  const target = plusOneTarget(profile);
  const [usePrevious, setUsePrevious] = useState(target.isPrevious);
  useEffect(() => setUsePrevious(target.isPrevious), [target.isPrevious, current]);
  const plusOneWeek = status === 'current' ? (target.isPrevious && usePrevious ? current - 1 : current) : viewWeek;
  const countsForPrevious = status === 'current' && plusOneWeek === current - 1;
  const swipe = useWeekSwipe({
    canPrev: viewWeek > 1,
    canNext: viewWeek < 12,
    onStep: (step) => onChangeWeek(viewWeek + step),
  });

  return (
    <div {...swipe.bind} className="-mx-4 overflow-x-clip">
    <div style={swipe.slideStyle} className="px-4">
    <div className="mx-auto max-w-[480px] space-y-3">
      <div className="-mx-4 -mt-4 px-4 pt-3 pb-3 bg-frame">
        <div className="rounded-xl bg-frame-2 px-3 py-2 text-center">
          <div className="font-black text-frame-ink">Week {viewWeek}</div>
          <div className="text-[10px] text-frame-muted">
            {plan.blockTitle}
            {plan.isDeload ? ' · deload' : ''}
          </div>
          {/* Position in the 12 weeks; swipe left/right to move. */}
          <div className="mt-1.5 flex justify-center gap-1" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full ${i + 1 === viewWeek ? 'w-4 bg-frame-ink' : i + 1 === current ? 'w-1.5 bg-frame-ink/70' : 'w-1.5 bg-frame-ink/30'}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-1.5 text-center text-[11px] text-frame-muted">
          {status === 'current' ? (
            <>Your current week{profile.streakWeeks > 0 ? ` · 🔥 ${profile.streakWeeks} wk streak` : ''}</>
          ) : (
            <>
              {status === 'past' ? 'Viewing a finished week' : 'Preview'} ·{' '}
              <button type="button" onClick={() => onChangeWeek(current)} className="text-frame-ink font-semibold underline">
                Back to Week {current}
              </button>
            </>
          )}
        </div>
      </div>

      {status === 'current' &&
        (next.cycleComplete ? (
          <div className="rounded-2xl border border-amber-500/50 bg-amber-950/20 p-4">
            <div className="text-[11px] uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> Cycle {profile.currentCycle ?? 1} complete
            </div>
            <div className="text-xl font-black text-white">All 12 weeks done</div>
            <div className="text-xs text-zinc-400 mt-0.5">Start the next cycle from your final weights. Your history, badges and XP are kept.</div>
            <button
              type="button"
              onClick={onStartNewCycle}
              className="mt-3 w-full h-12 rounded-xl bg-amber-400 active:bg-amber-300 text-zinc-950 font-black flex items-center justify-center gap-2"
            >
              <RotateCw className="w-5 h-5" /> Start Cycle {(profile.currentCycle ?? 1) + 1}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/20 p-4">
            <div className="text-[11px] uppercase tracking-wider text-zinc-400">{next.resume ? 'Workout in progress' : 'Next workout'}</div>
            <div className="text-xl font-black text-white">
              {next.dayType}
              {next.week !== current ? <span className="text-sm text-zinc-400"> · week {next.week}</span> : null}
              {nextPlan.isDeload ? <span className="ml-2 text-xs text-sky-300 uppercase">deload</span> : null}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {nextTemplate.exercises.length} exercises · ~{estimateMinutes(nextTemplate)} min
            </div>
            <button
              type="button"
              onClick={() => onStart(next.week, next.dayType)}
              className="mt-3 w-full h-12 rounded-xl bg-emerald-500 active:bg-emerald-400 text-zinc-950 font-black flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" /> {next.resume ? 'Resume workout' : 'Start workout'}
            </button>
          </div>
        ))}

      {status !== 'future' && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="font-bold text-white text-sm">Got extra time?</div>
          <div className="text-xs text-zinc-400">A quick readiness check picks yoga, Zone 2 or weak-point work.</div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                countsForPrevious ? 'border-amber-500 bg-amber-500/15 text-amber-300' : 'border-teal-500 bg-teal-500/15 text-teal-300'
              }`}
            >
              Counts for Week {plusOneWeek}
            </span>
            {status === 'current' && target.isPrevious && (
              <button type="button" onClick={() => setUsePrevious((v) => !v)} className="text-xs text-emerald-400 underline">
                switch to Week {usePrevious ? current : current - 1}
              </button>
            )}
          </div>
          {countsForPrevious && (
            <>
              <div className="mt-2 grid grid-cols-7 gap-1">
                {target.days.map((d) => (
                  <span
                    key={d.label}
                    className={`text-center text-[10px] rounded py-0.5 ${
                      d.today
                        ? 'ring-1 ring-amber-400 text-amber-300 bg-zinc-800'
                        : d.done
                          ? 'bg-green-500/20 text-green-700'
                          : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {d.label}
                  </span>
                ))}
              </div>
              <div className="mt-1 text-[11px] text-zinc-400">Same week as your Week {current - 1} workouts.</div>
            </>
          )}
          <button
            type="button"
            onClick={() => onExtra(plusOneWeek)}
            className="mt-3 w-full h-11 rounded-xl border border-teal-500/60 text-teal-300 font-bold flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> +1 Extra for Week {plusOneWeek}
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1.5">
        <div className="text-[11px] uppercase tracking-wider text-zinc-400">{status === 'future' ? 'Planned' : 'This week'}</div>
        {DAYS.map((d) => {
          const template = d === 'Full Body A' ? plan.workouts.dayA : plan.workouts.dayB;
          return (
            <div key={d} className="text-sm">
              <div className="flex items-center gap-2">
                {isDone(d) ? <Check className="w-4 h-4 text-green-600" /> : <Circle className="w-4 h-4 text-zinc-600" />}
                <span className={isDone(d) ? 'text-zinc-400' : 'text-white'}>{d}</span>
                {status === 'past' && isDone(d) && (
                  <button type="button" onClick={() => onView(viewWeek, d)} className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                )}
                {status === 'past' && !isDone(d) && (
                  <span className="ml-auto text-xs text-zinc-500">{profile.skippedWeeks?.includes(viewWeek) ? 'skipped' : 'not logged'}</span>
                )}
              </div>
              {status === 'future' && <div className="ml-6 text-xs text-zinc-500">{template.exercises.map((e) => e.name).join(' · ')}</div>}
            </div>
          );
        })}
        {bonusThisWeek.map((b) => (
          <div key={b.id} className="flex items-center gap-2 text-sm text-zinc-400">
            <Sparkles className="w-4 h-4 text-teal-400" /> {b.title}
          </div>
        ))}
      </div>
    </div>
    </div>
    </div>
  );
};
