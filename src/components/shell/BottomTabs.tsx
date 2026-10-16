import React from 'react';
import { BarChart3, Dumbbell, Menu } from 'lucide-react';

export type TabKey = 'workout' | 'stats' | 'more';

const TABS: { key: TabKey; label: string; Icon: typeof Dumbbell }[] = [
  { key: 'workout', label: 'Workout', Icon: Dumbbell },
  { key: 'stats', label: 'Stats', Icon: BarChart3 },
  { key: 'more', label: 'More', Icon: Menu },
];

export const BottomTabs: React.FC<{ current: TabKey; onChange(tab: TabKey): void }> = ({ current, onChange }) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 bg-frame border-t border-frame pb-[env(safe-area-inset-bottom)]">
    <div className="mx-auto max-w-[480px] grid grid-cols-3">
      {TABS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${current === key ? 'text-frame-ink font-bold' : 'text-frame-muted/80'}`}
        >
          <Icon className="w-5 h-5" />
          {label}
        </button>
      ))}
    </div>
  </nav>
);
