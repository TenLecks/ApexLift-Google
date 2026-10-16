import React, { useState, useEffect, useRef } from 'react';
import {
  UserFitnessProfile,
  CompletedWorkoutSession,
  BonusSessionLog,
  WeeklyExerciseTarget,
  Badge,
  PastCycle,
} from './types/workout';
import {
  normalizeProfile,
  loadUserProfile,
  saveUserProfile,
  updateStreakAndBadges,
  seedSampleDemoData,
  getDefaultProfile,
} from './utils/storage';
import { draftHasProgress } from './utils/workoutSession';
import { ensureKg } from './utils/units';
import { RoadmapView } from './components/RoadmapView';
import { WorkoutScreen } from './components/workout/WorkoutScreen';
import { WeeklyTargetsView } from './components/WeeklyTargetsView';
import { ProgressVisualizationView } from './components/ProgressVisualizationView';
import { BadgesView } from './components/BadgesView';
import { AdaptiveBonusModal } from './components/AdaptiveBonusModal';
import { RirGuideModal } from './components/RirGuideModal';
import { BackupScreen } from './components/shell/BackupScreen';
import { backStack } from './utils/backStack';
import { addNativeListener, callNative } from './utils/native';
import { UpdatesScreen } from './components/shell/UpdatesScreen';
import { autoBackup, retryPendingBackup } from './utils/gistBackup';
import { Award, X } from 'lucide-react';
import { BottomTabs, type TabKey } from './components/shell/BottomTabs';
import { SubScreen } from './components/shell/SubScreen';
import { WorkoutHome } from './components/shell/WorkoutHome';
import { StatsScreen } from './components/shell/StatsScreen';
import { MoreScreen, type SubKey } from './components/shell/MoreScreen';

export default function App() {
  const [profile, setProfile] = useState<UserFitnessProfile>(() => loadUserProfile());
  const [selectedWeek, setSelectedWeek] = useState<number>(
    profile.activeWorkoutDraft?.weekNumber || profile.currentWeek || 1
  );
  const [tab, setTab] = useState<TabKey>('workout');
  const [sub, setSub] = useState<SubKey | null>(null);
  const [inWorkout, setInWorkout] = useState(false);
  // Week shown on the Workout tab; snaps back to the current week (spec: week switcher).
  const [viewWeek, setViewWeek] = useState<number>(profile.currentWeek || 1);
  const [workoutDay, setWorkoutDay] = useState<'Full Body A' | 'Full Body B'>(
    profile.activeWorkoutDraft?.dayType ?? 'Full Body A'
  );

  // Modals state
  const [isRirGuideOpen, setIsRirGuideOpen] = useState<boolean>(false);
  const [isAdaptiveBonusOpen, setIsAdaptiveBonusOpen] = useState<boolean>(false);
  const [adaptiveBonusWeek, setAdaptiveBonusWeek] = useState<number>(selectedWeek);

  // Unlocked badge alert toast
  const [badgeToast, setBadgeToast] = useState<Badge | null>(null);

  useEffect(() => {
    saveUserProfile(profile);
  }, [profile]);

  // Retry a backup that failed (e.g. offline at the gym) on start and when back online.
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => setViewWeek(profile.currentWeek || 1), [profile.currentWeek, profile.completedWorkouts.length]);

  // Android back button: open sheets/menus first, then workout → sub-screen → Workout tab → exit.
  const [exitHint, setExitHint] = useState(false);
  const navRef = useRef({ inWorkout, sub, tab, exitHint });
  navRef.current = { inWorkout, sub, tab, exitHint };
  useEffect(
    () =>
      addNativeListener('App', 'backButton', () => {
        if (backStack.handle()) return;
        const n = navRef.current;
        if (n.inWorkout) setInWorkout(false);
        else if (n.sub) setSub(null);
        else if (n.tab !== 'workout') setTab('workout');
        else if (n.exitHint) void callNative('App', 'exitApp');
        else {
          setExitHint(true);
          setTimeout(() => setExitHint(false), 2000);
        }
      }),
    []
  );
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) setViewWeek(profileRef.current.currentWeek || 1);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  useEffect(() => {
    const retry = () => void retryPendingBackup(() => profileRef.current);
    retry();
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, []);

  const handleUpdateDraft = (draft: UserFitnessProfile['activeWorkoutDraft']) => {
    setProfile((prev) => ({ ...prev, activeWorkoutDraft: draft }));
  };

  const handleFinishWorkout = (session: CompletedWorkoutSession) => {
    const nextCompleted = [
      ...profile.completedWorkouts.filter(
        (w) => !(w.weekNumber === session.weekNumber && w.dayType === session.dayType)
      ),
      session,
    ];

    const updatedProfile: UserFitnessProfile = {
      ...profile,
      completedWorkouts: nextCompleted,
      activeWorkoutDraft: null,
    };

    const { profile: evaluated, newlyUnlockedBadges } = updateStreakAndBadges(updatedProfile);
    setProfile(evaluated);
    void autoBackup(evaluated);

    if (newlyUnlockedBadges.length > 0) {
      setBadgeToast(newlyUnlockedBadges[0]);
    }
  };

  const handleSaveBonusSession = (session: BonusSessionLog) => {
    const nextBonus = [...profile.bonusSessions, session];
    const updatedProfile: UserFitnessProfile = {
      ...profile,
      bonusSessions: nextBonus,
    };

    const { profile: evaluated, newlyUnlockedBadges } = updateStreakAndBadges(updatedProfile);
    setProfile(evaluated);
    void autoBackup(evaluated);

    if (newlyUnlockedBadges.length > 0) {
      setBadgeToast(newlyUnlockedBadges[0]);
    }
  };

  const handleSaveTargets = (targets: Record<string, WeeklyExerciseTarget>) => {
    setProfile((prev) => {
      const updated = { ...prev, weeklyTargets: targets };
      saveUserProfile(updated);
      return updated;
    });
  };

  const handleLoadDemoData = () => {
    if (
      !window.confirm(
        'Load demo data? This REPLACES all your logged workouts, targets and badges. Export a backup first if you want to keep them.'
      )
    ) {
      return;
    }
    const demo = seedSampleDemoData();
    demo.activeWorkoutDraft = null;
    setProfile(demo);
    setSelectedWeek(demo.currentWeek);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all logged workouts and achievements to start fresh?')) {
      const reset = getDefaultProfile();
      reset.activeWorkoutDraft = null;
      setProfile(reset);
      setSelectedWeek(1);
      saveUserProfile(reset);
    }
  };

  const handleSelectWeek = (week: number) => {
    if (week === selectedWeek) return;
    const draft = profile.activeWorkoutDraft;
    const hasCompletedSet = draftHasProgress(draft);
    if (draft && draft.weekNumber !== week && hasCompletedSet) {
      const confirmed = window.confirm(
        `You have an unfinished ${draft.dayType} workout. Switch anyway and discard it?`
      );
      if (!confirmed) {
        return;
      }
      handleUpdateDraft(null);
    }
    setSelectedWeek(week);
  };

  const handleStartWorkout = (week: number, dayType: 'Full Body A' | 'Full Body B') => {
    const draft = profile.activeWorkoutDraft;
    const hasCompletedSet = draftHasProgress(draft);
    if (draft && (draft.weekNumber !== week || draft.dayType !== dayType) && hasCompletedSet) {
      const confirmed = window.confirm(
        `You have an unfinished ${draft.dayType} workout. Switch anyway and discard it?`
      );
      if (!confirmed) {
        return;
      }
      handleUpdateDraft(null);
    }
    setSelectedWeek(week);
    setWorkoutDay(dayType);
    setSub(null);
    setInWorkout(true);
  };

  const handleUpdateExerciseNote = (exerciseId: string, note: string) => {
    setProfile((prev) => {
      const updatedNotes = {
        ...(prev.exerciseNotes || {}),
        [exerciseId]: note,
      };
      const updated: UserFitnessProfile = {
        ...prev,
        exerciseNotes: updatedNotes,
      };
      saveUserProfile(updated);
      return updated;
    });
  };

  const handleToggleSkipWeek = (weekNumber: number) => {
    const currentSkipped = profile.skippedWeeks || [];
    const isAlreadySkipped = currentSkipped.includes(weekNumber);
    const nextSkipped = isAlreadySkipped
      ? currentSkipped.filter((w) => w !== weekNumber)
      : [...currentSkipped, weekNumber];

    const updatedProfile: UserFitnessProfile = {
      ...profile,
      skippedWeeks: nextSkipped,
    };
    const { profile: evaluated } = updateStreakAndBadges(updatedProfile);
    setProfile(evaluated);
    setSelectedWeek(evaluated.currentWeek);
  };

  const handleStartNewCycle = () => {
    const currentCycleNum = profile.currentCycle || 1;
    if (
      !window.confirm(
        `Start Cycle ${currentCycleNum + 1}? Your current 12-week workout logs will be archived into Cycle History. Your badges and XP will be preserved, and your final weights from this cycle will be used as baseline targets for Cycle ${currentCycleNum + 1}!`
      )
    ) {
      return;
    }

    const allDates = [
      ...profile.completedWorkouts.map((w) => new Date(w.dateCompleted).getTime()),
      ...profile.bonusSessions.map((b) => new Date(b.date).getTime()),
    ].filter((t) => !isNaN(t));

    const startDate =
      allDates.length > 0 ? new Date(Math.min(...allDates)).toISOString() : new Date().toISOString();
    const endDate = new Date().toISOString();

    const newPastCycle: PastCycle = {
      cycleNumber: currentCycleNum,
      startDate,
      endDate,
      completedWorkouts: profile.completedWorkouts,
      bonusSessions: profile.bonusSessions,
    };

    const updatedPastCycles = [...(profile.pastCycles || []), newPastCycle];

    const resetProfile: UserFitnessProfile = {
      ...profile,
      currentCycle: currentCycleNum + 1,
      pastCycles: updatedPastCycles,
      currentWeek: 1,
      completedWorkouts: [],
      bonusSessions: [],
      weeklyTargets: {},
      activeWorkoutDraft: null,
      skippedWeeks: [],
    };

    const { profile: evaluated } = updateStreakAndBadges(resetProfile);
    setProfile(evaluated);
    setSelectedWeek(1);
    saveUserProfile(evaluated);
  };

  const handleOpenBonusFromRoadmap = (week: number) => {
    setAdaptiveBonusWeek(week);
    setIsAdaptiveBonusOpen(true);
  };

  // Opening a finished workout to look at it never touches an in-progress draft.
  const viewWorkout = (week: number, dayType: 'Full Body A' | 'Full Body B') => {
    setSelectedWeek(week);
    setWorkoutDay(dayType);
    setSub(null);
    setInWorkout(true);
  };

  // Same confirmation as the roadmap when another day's draft has progress.
  const startWorkoutFromHome = (week: number, dayType: 'Full Body A' | 'Full Body B') => handleStartWorkout(week, dayType);

  const openExtra = (week: number) => {
    setAdaptiveBonusWeek(week);
    setIsAdaptiveBonusOpen(true);
  };

  const renderSub = () => {
    switch (sub) {
      case 'roadmap':
        return (
          <SubScreen title="12-week roadmap" onBack={() => setSub(null)}>
            <RoadmapView
              profile={profile}
              selectedWeek={selectedWeek}
              onSelectWeek={handleSelectWeek}
              onStartWorkout={handleStartWorkout}
              onOpenAdaptiveBonus={handleOpenBonusFromRoadmap}
              onToggleSkipWeek={handleToggleSkipWeek}
              onStartNewCycle={handleStartNewCycle}
            />
          </SubScreen>
        );
      case 'targets':
        return (
          <SubScreen
            title="Weekly targets"
            onBack={() => setSub(null)}
            right={
              <select
                aria-label="Week"
                value={selectedWeek}
                onChange={(e) => handleSelectWeek(Number(e.target.value))}
                className="rounded-lg bg-zinc-900 border border-zinc-700 px-2 py-1 text-sm text-white"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Week {i + 1}
                  </option>
                ))}
              </select>
            }
          >
            <WeeklyTargetsView profile={profile} selectedWeek={selectedWeek} onSaveTargets={handleSaveTargets} />
          </SubScreen>
        );
      case 'badges':
        return (
          <SubScreen title="Badges & trophies" onBack={() => setSub(null)}>
            <BadgesView profile={profile} />
          </SubScreen>
        );
      case 'backup':
        return (
          <SubScreen title="Back up / Restore" onBack={() => setSub(null)}>
            <BackupScreen
              profile={profile}
              onRestore={(restored) => {
                const { profile: evaluated } = updateStreakAndBadges(ensureKg(normalizeProfile(restored)));
                setProfile(evaluated);
                setSelectedWeek(evaluated.currentWeek || 1);
              }}
            />
          </SubScreen>
        );
      case 'updates':
        return (
          <SubScreen title="App updates" onBack={() => setSub(null)}>
            <UpdatesScreen />
          </SubScreen>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500 selection:text-zinc-950">
      <main
        className={`w-full mx-auto px-4 pt-2 ${
          inWorkout ? 'max-w-[480px]' : 'max-w-5xl pb-[calc(5rem+env(safe-area-inset-bottom))]'
        }`}
      >
        {inWorkout ? (
          <WorkoutScreen
            key={`${selectedWeek}-${workoutDay}`}
            profile={profile}
            selectedWeek={selectedWeek}
            initialDayType={workoutDay}
            onFinishWorkout={handleFinishWorkout}
            onOpenRirGuide={() => setIsRirGuideOpen(true)}
            onUpdateDraft={handleUpdateDraft}
            onUpdateExerciseNote={handleUpdateExerciseNote}
            onExit={() => setInWorkout(false)}
          />
        ) : sub ? (
          renderSub()
        ) : tab === 'workout' ? (
          <div className="pt-2">
            <WorkoutHome
              profile={profile}
              viewWeek={viewWeek}
              onChangeWeek={setViewWeek}
              onStart={startWorkoutFromHome}
              onView={viewWorkout}
              onExtra={openExtra}
              onStartNewCycle={handleStartNewCycle}
            />
          </div>
        ) : tab === 'stats' ? (
          <div className="pt-2">
            <StatsScreen profile={profile} selectedWeek={profile.currentWeek || selectedWeek} />
          </div>
        ) : (
          <div className="pt-2">
            <MoreScreen
              onOpen={setSub}
              onOpenRirGuide={() => setIsRirGuideOpen(true)}
              onLoadDemo={handleLoadDemoData}
              onReset={handleResetData}
            />
          </div>
        )}
      </main>

      {!inWorkout && (
        <BottomTabs
          current={tab}
          onChange={(t) => {
            setSub(null);
            setTab(t);
          }}
        />
      )}

      <RirGuideModal isOpen={isRirGuideOpen} onClose={() => setIsRirGuideOpen(false)} />

      <AdaptiveBonusModal
        isOpen={isAdaptiveBonusOpen}
        onClose={() => setIsAdaptiveBonusOpen(false)}
        weekNumber={adaptiveBonusWeek}
        onSaveBonusSession={handleSaveBonusSession}
      />

      {exitHint && (
        <div className="fixed inset-x-0 bottom-24 z-50 flex justify-center pointer-events-none">
          <div className="rounded-full bg-zinc-100 text-zinc-950 text-sm px-4 py-2 shadow-lg">Press back again to exit</div>
        </div>
      )}

      {badgeToast && (
        <div className="fixed top-4 inset-x-4 mx-auto z-50 max-w-sm bg-gradient-to-r from-amber-500 to-yellow-600 text-zinc-950 p-4 rounded-2xl shadow-2xl flex items-start gap-3">
          <div className="p-2 rounded-xl bg-black/10">
            <Award className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div className="flex-1">
            <span className="text-[11px] font-black uppercase tracking-wider block opacity-80">Badge Unlocked! (+100 XP)</span>
            <div className="font-black text-sm">{badgeToast.title}</div>
            <p className="text-xs mt-0.5 opacity-90">{badgeToast.description}</p>
          </div>
          <button onClick={() => setBadgeToast(null)} className="p-1 rounded-lg hover:bg-black/10 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
