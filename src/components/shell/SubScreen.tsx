import React from 'react';
import { ChevronLeft } from 'lucide-react';

export const SubScreen: React.FC<{ title: string; onBack(): void; children: React.ReactNode; right?: React.ReactNode }> = ({
  title,
  onBack,
  children,
  right,
}) => (
  <div>
    <div className="sticky top-0 z-30 -mx-4 px-4 py-2 bg-zinc-950/95 backdrop-blur border-b border-zinc-900 flex items-center gap-2">
      <button type="button" aria-label="Back" onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg text-zinc-300 active:bg-zinc-800">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className="flex-1 font-bold text-white truncate">{title}</h1>
      {right}
    </div>
    <div className="pt-3">{children}</div>
  </div>
);
