import React from 'react';
import type { UserFitnessProfile } from '../../types/workout';
import { ProgressVisualizationView } from '../ProgressVisualizationView';

export const StatsScreen: React.FC<{ profile: UserFitnessProfile; selectedWeek: number }> = ({ profile, selectedWeek }) => {
  const anchors = profile.completedWorkouts.filter((w) => w.dayType !== 'Adaptive Bonus').length;
  return (
    <div className="space-y-3">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs text-zinc-300 flex flex-wrap gap-x-3 gap-y-1">
        <span>
          Week <b className="text-white">{profile.currentWeek || 1}</b> of 12
        </span>
        <span>
          <b className="text-white">{anchors}</b>/24 workouts
        </span>
        <span>🔥 {profile.streakWeeks} wk streak</span>
        <span>
          Lvl <b className="text-white">{profile.level}</b> ({profile.totalXp.toLocaleString()} XP)
        </span>
      </div>
      <ProgressVisualizationView profile={profile} selectedWeek={selectedWeek} />
    </div>
  );
};
