import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { WeightUnit } from '../../types/workout';

export type SubKey = 'roadmap' | 'targets' | 'badges' | 'backup';

interface MoreScreenProps {
  unit: WeightUnit;
  onOpen(sub: SubKey): void;
  onOpenRirGuide(): void;
  onToggleUnit(): void;
  onLoadDemo(): void;
  onReset(): void;
}

const Row: React.FC<{ label: string; value?: string; danger?: boolean; onClick(): void }> = ({ label, value, danger, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full flex items-center justify-between px-4 py-3.5 text-left border-b border-zinc-800/70 last:border-b-0 active:bg-zinc-800/60"
  >
    <span className={danger ? 'text-red-400' : 'text-zinc-100'}>{label}</span>
    <span className="flex items-center gap-1 text-zinc-500 text-sm">
      {value}
      <ChevronRight className="w-4 h-4" />
    </span>
  </button>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1.5">
    <div className="px-1 text-[11px] uppercase tracking-wider text-zinc-500">{title}</div>
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">{children}</div>
  </div>
);

export const MoreScreen: React.FC<MoreScreenProps> = ({ unit, onOpen, onOpenRirGuide, onToggleUnit, onLoadDemo, onReset }) => (
  <div className="mx-auto max-w-[480px] space-y-5">
    <Section title="Program">
      <Row label="12-week roadmap" onClick={() => onOpen('roadmap')} />
      <Row label="Weekly targets" onClick={() => onOpen('targets')} />
      <Row label="Badges & trophies" onClick={() => onOpen('badges')} />
      <Row label="RIR / RPE guide" onClick={onOpenRirGuide} />
    </Section>
    <Section title="Data">
      <Row label="Back up / Restore" onClick={() => onOpen('backup')} />
    </Section>
    <Section title="Settings">
      <Row label="Units" value={unit} onClick={onToggleUnit} />
      <Row label="Load demo data" onClick={onLoadDemo} />
      <Row label="Reset all data" danger onClick={onReset} />
    </Section>
  </div>
);
