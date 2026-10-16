import React, { useEffect, useState } from 'react';
import { CloudUpload, Copy, Download, KeyRound } from 'lucide-react';
import type { UserFitnessProfile } from '../../types/workout';
import {
  autoBackup,
  clearBackupWarning,
  countWorkouts,
  getBackupStatus,
  getToken,
  locateBackup,
  setToken,
  type BackupStatus,
} from '../../utils/gistBackup';

interface BackupScreenProps {
  profile: UserFitnessProfile;
  onRestore(p: UserFitnessProfile): void;
}

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=ApexLift%20backup';

const ago = (iso?: string) => {
  if (!iso) return '';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} h ago`;
  return new Date(iso).toLocaleDateString();
};

type Found = { profile: UserFitnessProfile; updatedAt: string; count: number };

export const BackupScreen: React.FC<BackupScreenProps> = ({ profile, onRestore }) => {
  const [tokenInput, setTokenInput] = useState('');
  const [hasToken, setHasToken] = useState(Boolean(getToken()));
  const [status, setStatus] = useState<BackupStatus>(() => getBackupStatus());
  const [busy, setBusy] = useState<string | null>(null);
  const [found, setFound] = useState<Found | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');

  useEffect(() => {
    const id = setInterval(() => setStatus(getBackupStatus()), 5000);
    return () => clearInterval(id);
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setStatus(getBackupStatus());
    }
  };

  const saveToken = () =>
    run('Checking GitHub…', async () => {
      const t = tokenInput.trim();
      if (!t) return;
      setToken(t);
      setHasToken(true);
      setTokenInput('');
      const b = await locateBackup(t);
      if (b) setFound(b);
      else setMessage('Token saved. No backup yet — one will be made after your next workout.');
    });

  const backupNow = () =>
    run('Backing up…', async () => {
      let force = false;
      if (status.blockedReason) {
        force = window.confirm(
          `GitHub has ${status.remoteCount ?? '?'} workouts, this phone has ${countWorkouts(profile)}. Overwrite the GitHub backup with this phone's data?`
        );
        if (!force) return;
      }
      const s = await autoBackup(profile, { force });
      if (s.pending) setMessage(`Backup failed: ${s.lastError}`);
    });

  const findForRestore = () =>
    run('Looking for backup…', async () => {
      const t = getToken();
      if (!t) return;
      const b = await locateBackup(t);
      if (b) setFound(b);
      else setMessage('No backup found on GitHub for this token.');
    });

  const restore = (f: Found) => {
    if (!window.confirm(`Replace all data on this phone with the backup from ${new Date(f.updatedAt).toLocaleString()} (${f.count} workouts)?`)) return;
    onRestore(f.profile);
    clearBackupWarning();
    setStatus(getBackupStatus());
    setFound(null);
    setMessage('Restored from GitHub.');
  };

  const restoreFromText = () => {
    try {
      const parsed = JSON.parse(pasteText) as UserFitnessProfile;
      if (!Array.isArray(parsed.completedWorkouts)) throw new Error('Not an ApexLift backup.');
      if (!window.confirm(`Replace all data on this phone with this backup (${countWorkouts(parsed)} workouts)?`)) return;
      onRestore(parsed);
      clearBackupWarning();
      setStatus(getBackupStatus());
      setPasteText('');
      setMessage('Restored from pasted backup.');
    } catch (e) {
      setMessage(`Could not read that text: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const statusLine = status.blockedReason
    ? status.blockedReason
    : status.pending
      ? `Backup pending — will retry${status.lastError ? ` (${status.lastError})` : ''}`
      : status.lastSuccessAt
        ? `Last backed up: ${ago(status.lastSuccessAt)}`
        : hasToken
          ? 'No backup yet'
          : 'Automatic backup is off';

  return (
    <div className="mx-auto max-w-[480px] space-y-4 text-sm">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center gap-2 font-bold text-white">
          <CloudUpload className="w-5 h-5 text-sky-400" /> Automatic GitHub backup
        </div>
        <p className="text-xs text-zinc-400">Backs up to a private-link Gist on your GitHub after every finished workout.</p>
        <div className={`rounded-lg px-3 py-2 text-xs ${status.blockedReason || status.pending ? 'bg-amber-500/10 text-amber-200' : 'bg-zinc-950 text-zinc-300'}`}>
          {statusLine}
        </div>

        {hasToken ? (
          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={!!busy} onClick={backupNow} className="h-11 rounded-xl bg-emerald-500 text-zinc-950 font-bold disabled:opacity-50">
              Back up now
            </button>
            <button type="button" disabled={!!busy} onClick={findForRestore} className="h-11 rounded-xl bg-zinc-800 text-white font-semibold disabled:opacity-50">
              Restore from GitHub
            </button>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400 flex items-center gap-1">
            <KeyRound className="w-3.5 h-3.5" /> {hasToken ? 'Replace GitHub token' : 'GitHub token (gist access only)'}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_…"
              className="flex-1 min-w-0 rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-white"
            />
            <button type="button" disabled={!!busy || !tokenInput.trim()} onClick={saveToken} className="px-4 rounded-lg bg-zinc-800 text-white font-semibold disabled:opacity-50">
              Save
            </button>
          </div>
          {!hasToken && (
            <a href={TOKEN_URL} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline">
              Create a token (tick only “gist”)
            </a>
          )}
        </div>

        {busy && <div className="text-xs text-zinc-400">{busy}</div>}
        {message && <div className="text-xs text-zinc-300">{message}</div>}

        {found && (
          <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 space-y-2">
            <div className="text-xs text-sky-100">
              Backup found from {new Date(found.updatedAt).toLocaleString()} · {found.count} workouts (this phone: {countWorkouts(profile)}).
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => restore(found)} className="h-10 rounded-lg bg-sky-500 text-zinc-950 font-bold">
                Restore it
              </button>
              <button type="button" onClick={() => setFound(null)} className="h-10 rounded-lg bg-zinc-800 text-white">
                Keep this phone's data
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
        <div className="font-bold text-white">Manual backup</div>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard
              .writeText(JSON.stringify(profile))
              .then(() => setMessage('Backup copied — paste it into a note or chat.'))
              .catch(() => setMessage('Could not copy to the clipboard.'))
          }
          className="w-full h-10 rounded-lg bg-zinc-800 text-white font-semibold flex items-center justify-center gap-2"
        >
          <Copy className="w-4 h-4" /> Copy backup text
        </button>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          rows={3}
          placeholder="Paste backup text here to restore"
          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-xs text-white"
        />
        <button
          type="button"
          disabled={!pasteText.trim()}
          onClick={restoreFromText}
          className="w-full h-10 rounded-lg bg-zinc-800 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Download className="w-4 h-4" /> Restore from text
        </button>
      </div>
    </div>
  );
};
