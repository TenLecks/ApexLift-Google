import React, { useState } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { readUpdaterLog } from '../../utils/updaterLog';

export const UpdatesScreen: React.FC = () => {
  const [log, setLog] = useState(() => readUpdaterLog());
  const [copied, setCopied] = useState(false);

  return (
    <div className="mx-auto max-w-[480px] space-y-3 text-sm">
      <p className="text-xs text-zinc-400">
        Each time the app opens it checks GitHub for a new version and downloads it. A new version is applied the next time you
        close and reopen the app.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setLog(readUpdaterLog())}
          className="flex-1 h-10 rounded-lg bg-zinc-800 text-white font-semibold flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(log.join('\n'))
              .then(() => setCopied(true))
              .catch(() => setCopied(false))
          }
          className="flex-1 h-10 rounded-lg bg-zinc-800 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" /> {copied ? 'Copied' : 'Copy log'}
        </button>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300 space-y-1 break-words">
        {log.length ? log.map((line, i) => <div key={i}>{line}</div>) : <div className="text-zinc-500">No update checks recorded yet.</div>}
      </div>
    </div>
  );
};
