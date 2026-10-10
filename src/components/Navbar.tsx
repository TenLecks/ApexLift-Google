import React, { useState } from 'react';
import { WeightUnit, UserFitnessProfile } from '../types/workout';
import {
  Dumbbell,
  Calendar,
  Flame,
  Award,
  BarChart3,
  Sliders,
  PlusCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Cloud,
  MoreVertical,
  X,
  SkipForward,
} from 'lucide-react';

interface NavbarProps {
  currentTab: 'roadmap' | 'workout' | 'bonus' | 'targets' | 'analytics' | 'badges';
  setCurrentTab: (tab: 'roadmap' | 'workout' | 'bonus' | 'targets' | 'analytics' | 'badges') => void;
  profile: UserFitnessProfile;
  selectedWeek: number;
  setSelectedWeek: (week: number) => void;
  onToggleUnit: () => void;
  onOpenRirGuide: () => void;
  onOpenAdaptiveBonus: () => void;
  onOpenBackup: () => void;
  onLoadDemoData: () => void;
  onResetData: () => void;
  onToggleSkipWeek?: (weekNumber: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  profile,
  selectedWeek,
  setSelectedWeek,
  onToggleUnit,
  onOpenRirGuide,
  onOpenAdaptiveBonus,
  onOpenBackup,
  onLoadDemoData,
  onResetData,
  onToggleSkipWeek,
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
        {/* Top Utility Bar */}
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2.5 text-xs sm:text-sm">
          {/* Brand & Program Indicator */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 font-black tracking-tight text-base sm:text-lg text-emerald-400">
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Dumbbell className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span>ApexLift</span>
            </div>
            <span className="inline-block px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono shrink-0">
              Cycle {profile.currentCycle || 1} · Week {selectedWeek}
            </span>
            <span className="hidden lg:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
              12-Week Hypertrophy
            </span>
          </div>

          {/* Center / Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Week Selector with Skip / Un-skip button */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-xs">
              <span className="text-zinc-400 font-semibold uppercase text-[11px]">Wk:</span>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(Number(e.target.value))}
                className="bg-transparent font-bold text-emerald-400 focus:outline-none cursor-pointer text-xs"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => {
                  const isSkipped = profile.skippedWeeks?.includes(w);
                  return (
                    <option key={w} value={w} className="bg-zinc-900 text-zinc-100">
                      Week {w} {isSkipped ? '(Skipped)' : w === 5 || w === 12 ? '(Deload)' : ''}
                    </option>
                  );
                })}
              </select>

              {profile.skippedWeeks?.includes(selectedWeek) ? (
                <button
                  onClick={() => onToggleSkipWeek?.(selectedWeek)}
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-semibold text-[10px] transition shrink-0 ml-0.5"
                  title="Un-skip this week"
                >
                  Un-skip
                </button>
              ) : selectedWeek === profile.currentWeek ? (
                <button
                  onClick={() => onToggleSkipWeek?.(selectedWeek)}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-amber-500/20 hover:text-amber-300 text-zinc-400 font-semibold text-[10px] transition shrink-0 ml-0.5"
                  title="Skip this week to advance program"
                >
                  Skip
                </button>
              ) : null}
            </div>

            {/* Weekly Consistency Streak */}
            <div
              title="Weekly Consistency Streak: Earned by completing anchor workouts each week"
              className="flex items-center gap-1 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg px-2 py-1 text-amber-300 font-bold text-xs"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse shrink-0" />
              <span className="whitespace-nowrap">{profile.streakWeeks} Wk</span>
            </div>

            {/* Level / XP */}
            <div
              title={`Total XP: ${profile.totalXp} XP`}
              className="hidden sm:flex items-center gap-1.5 bg-zinc-900 border border-indigo-500/30 rounded-lg px-2.5 py-1 text-indigo-300 font-semibold text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Lvl {profile.level}</span>
            </div>

            {/* DESKTOP CONTROLS (≥ 640px) */}
            <div className="hidden sm:flex items-center gap-2 sm:gap-2.5">
              {/* Unit Toggle Button */}
              <button
                onClick={onToggleUnit}
                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-mono text-xs transition"
                title="Toggle between kg and lbs"
              >
                {profile.weightUnit.toUpperCase()}
              </button>

              {/* RIR / RPE Scale Guide Modal Button */}
              <button
                onClick={onOpenRirGuide}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs transition"
                title="Open Scientific RPE & RIR Guide"
              >
                <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
                <span>RIR Guide</span>
              </button>

              {/* Squeeze Extra Session Quick Button */}
              <button
                onClick={onOpenAdaptiveBonus}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-zinc-950 font-bold text-xs shadow-sm transition active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+1 Extra</span>
              </button>

              {/* Cloud / Backup Button */}
              <button
                onClick={onOpenBackup}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sky-300 text-xs transition"
                title="Export / Restore Backup, save to GitHub or file"
              >
                <Cloud className="w-3.5 h-3.5 text-sky-400" />
                <span>Backup</span>
              </button>

              {/* Demo Data Quick Controls */}
              <div className="flex items-center gap-1">
                <button
                  onClick={onLoadDemoData}
                  className="px-2 py-1 text-xs rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition"
                  title="Load sample progression data"
                >
                  Load Demo
                </button>
                <button
                  onClick={onResetData}
                  className="p-1 text-zinc-500 hover:text-red-400 transition"
                  title="Reset all logs and targets"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* MOBILE "⋮ More" BUTTON (< 640px) */}
            <div className="sm:hidden relative">
              <button
                onClick={() => setIsMoreMenuOpen((v) => !v)}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                title="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Mobile More Dropdown */}
              {isMoreMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsMoreMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-2 z-50 text-xs space-y-1">
                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onToggleUnit();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-200 flex items-center justify-between font-medium"
                    >
                      <span>Weight Unit</span>
                      <span className="font-mono text-emerald-400 font-bold uppercase">
                        {profile.weightUnit} (Switch)
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenRirGuide();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-200 flex items-center gap-2 font-medium"
                    >
                      <HelpCircle className="w-4 h-4 text-zinc-400" />
                      <span>RIR Scale Guide</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenBackup();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-sky-300 flex items-center gap-2 font-medium"
                    >
                      <Cloud className="w-4 h-4 text-sky-400" />
                      <span>Backup & Sync</span>
                    </button>

                    <div className="border-t border-zinc-800 my-1" />

                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onLoadDemoData();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-800 text-zinc-300 flex items-center gap-2 font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Load Demo Data</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onResetData();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-400 flex items-center gap-2 font-medium"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset All Data</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DESKTOP Top Tabs Row (≥ 640px) */}
        <nav className="hidden sm:flex max-w-7xl mx-auto px-4 space-x-1 sm:space-x-2 overflow-x-auto border-t border-zinc-900 py-1.5 scrollbar-none">
          <button
            onClick={() => setCurrentTab('roadmap')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              currentTab === 'roadmap'
                ? 'bg-zinc-800 text-emerald-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>12-Week Roadmap</span>
          </button>

          <button
            onClick={() => setCurrentTab('workout')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              currentTab === 'workout'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Workout Logger</span>
          </button>

          <button
            onClick={() => setCurrentTab('bonus')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              currentTab === 'bonus'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Adaptive +1 Engine</span>
          </button>

          <button
            onClick={() => setCurrentTab('targets')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              currentTab === 'targets'
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Weekly Targets</span>
          </button>

          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              currentTab === 'analytics'
                ? 'bg-zinc-800 text-sky-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>1RM & Volume Analytics</span>
          </button>

          <button
            onClick={() => setCurrentTab('badges')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              currentTab === 'badges'
                ? 'bg-zinc-800 text-yellow-400 border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Badges & Trophies</span>
          </button>
        </nav>
      </header>

      {/* MOBILE FIXED BOTTOM TAB BAR (< 640px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/80 px-1 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="grid grid-cols-6 gap-0.5 max-w-md mx-auto">
          <button
            onClick={() => setCurrentTab('roadmap')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
              currentTab === 'roadmap'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Roadmap</span>
          </button>

          <button
            onClick={() => setCurrentTab('workout')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
              currentTab === 'workout'
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Dumbbell className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Workout</span>
          </button>

          <button
            onClick={onOpenAdaptiveBonus}
            className="flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition text-teal-400 hover:text-teal-300"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">+1</span>
          </button>

          <button
            onClick={() => setCurrentTab('targets')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
              currentTab === 'targets'
                ? 'text-amber-400 bg-amber-500/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Targets</span>
          </button>

          <button
            onClick={() => setCurrentTab('analytics')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
              currentTab === 'analytics'
                ? 'text-sky-400 bg-sky-500/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Stats</span>
          </button>

          <button
            onClick={() => setCurrentTab('badges')}
            className={`flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition ${
              currentTab === 'badges'
                ? 'text-yellow-400 bg-yellow-500/10'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span className="text-[10px] font-semibold mt-0.5 truncate">Badges</span>
          </button>
        </div>
      </nav>
    </>
  );
};
