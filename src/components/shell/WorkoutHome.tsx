import React from 'react';
import { Check, Circle, Play, Sparkles } from 'lucide-react';
import type { UserFitnessProfile } from '../../types/workout';
import { PROGRAM_WEEKS } from '../../data/programData';
import { estimateMinutes, nextWorkout } from '../../utils/home';

interface WorkoutHomeProps {
  profile: UserFitnessProfile;
  onStart(week: number, dayType: 'Full Body A' | 'Full Body B'): void;
  onExtra(week: number): void;
}

export const WorkoutHome: React.FC<WorkoutHomeProps> = ({ profile, onStart, onExtra }) => {
  const next = nextWorkout(profile);
  const week = PROGRAM_WEEKS.find((w) => w.weekNumber === next.week) || PROGRAM_WEEKS[0];
  const template = next.dayType === 'Full Body A' ? week.workouts.dayA : week.workouts.dayB;
  const thisWeek = profile.currentWeek || 1;
  const isDone = (d: 'Full Body A' | 'Full Body B') =>
    profile.completedWorkouts.some((w) => w.weekNumber === thisWeek && w.dayType === d);
  const bonusThisWeek = profile.bonusSessions.filter((b) => b.weekNumber === thisWeek);

  return (
    <div className="mx-auto max-w-[480px] space-y-3">
      <div className="text-xs text-zinc-400">
        Week <span className="text-emerald-400 font-bold">{thisWeek}</span> of 12 · {week.blockTitle}
        {profile.streakWeeks > 0 ? ` · 🔥 ${profile.streakWeeks} wk streak` : ''}
      </div>

      <div className="rounded-2xl border border-emerald-500/50 bg-emerald-950/20 p-4">
        <div className="text-[11px] uppercase tracking-wider text-zinc-400">{next.resume ? 'Workout in progress' : 'Next workout'}</div>
        <div className="text-xl font-black text-white">
          {next.dayType}
          {next.week !== thisWeek ? <span className="text-sm text-zinc-400"> · week {next.week}</span> : null}
          {week.isDeload ? <span className="ml-2 text-xs text-sky-300 uppercase">deload</span> : null}
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          {template.exercises.length} exercises · ~{estimateMinutes(template)} min
        </div>
        <button
          type="button"
          onClick={() => onStart(next.week, next.dayType)}
          className="mt-3 w-full h-12 rounded-xl bg-emerald-500 active:bg-emerald-400 text-zinc-950 font-black flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" /> {next.resume ? 'Resume workout' : 'Start workout'}
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
        <div className="font-bold text-white text-sm">Got extra time this week?</div>
        <div className="text-xs text-zinc-400">A quick readiness check picks yoga, Zone 2 or weak-point work.</div>
        <button
          type="button"
          onClick={() => onExtra(thisWeek)}
          className="mt-3 w-full h-11 rounded-xl border border-teal-500/60 text-teal-300 font-bold flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> +1 Extra workout
        </button>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-1.5">
        <div className="text-[11px] uppercase tracking-wider text-zinc-400">This week</div>
        {(['Full Body A', 'Full Body B'] as const).map((d) => (
          <div key={d} className="flex items-center gap-2 text-sm">
            {isDone(d) ? <Check className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-zinc-600" />}
            <span className={isDone(d) ? 'text-zinc-400' : 'text-white'}>{d}</span>
          </div>
        ))}
        {bonusThisWeek.map((b) => (
          <div key={b.id} className="flex items-center gap-2 text-sm text-zinc-400">
            <Sparkles className="w-4 h-4 text-teal-400" /> {b.title}
          </div>
        ))}
      </div>
    </div>
  );
};
