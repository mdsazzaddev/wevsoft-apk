import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowLeft, Check, ChevronDown, Cloud, Keyboard, Loader2, MoreVertical, Pencil, Play, Redo2, Trash2, Undo2, Upload, Zap } from 'lucide-react';
import { canRedo, canUndo } from '../model/projectReducer';
import type { Privacy } from '../model/types';
import { totalDuration } from '../model/timing';
import { formatClock } from '../model/timing';
import { Tip, iconBtn } from './ui';
import { useStudio } from './StudioContext';

export interface PublishProgress {
  busy: boolean;
  done: number;
  total: number;
  error: string | null;
}

const PRIVACY_OPTIONS: { value: Privacy; label: string }[] = [
  { value: 'public', label: 'Public (Everyone)' },
  { value: 'friends', label: 'Friends only' },
  { value: 'followers', label: 'Followers' },
  { value: 'close_friends', label: 'Close friends' },
  { value: 'private', label: 'Only me' },
];

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onOut();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [ref, onOut, active]);
}

export default function TopBar({
  onBack,
  onPreview,
  onPublish,
  progress,
  onShortcuts,
  onDiscard,
  onClassic,
}: {
  onBack: () => void;
  onPreview: () => void;
  onPublish: () => void;
  progress: PublishProgress;
  onShortcuts: () => void;
  onDiscard: () => void;
  onClassic: () => void;
}) {
  const s = useStudio();
  const { state, dispatch } = s;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.doc.name);
  const [exportOpen, setExportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useOutside(exportRef, () => setExportOpen(false), exportOpen);
  useOutside(menuRef, () => setMenuOpen(false), menuOpen);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync in effect (existing behavior)
  useEffect(() => setName(state.doc.name), [state.doc.name]);

  const slides = state.doc.slides;
  const pending = slides.filter((x) => !x.publishedStoryId).length;
  const canPublish = pending > 0 && !progress.busy && s.uploading === 0;
  const statusText =
    s.saveStatus === 'saving' ? 'Saving…' : s.saveStatus === 'error' ? 'Could not save draft' : slides.length === 0 && !s.savedAt ? 'New project' : 'All changes saved';

  const commitName = () => {
    setEditing(false);
    const v = name.trim() || 'My Story Project';
    dispatch({ type: 'rename', name: v });
  };

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] px-3 md:gap-3 md:px-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-3">
        <Tip label="Back">
          <button type="button" onClick={onBack} aria-label="Back" className={iconBtn}>
            <ArrowLeft size={18} />
          </button>
        </Tip>
        <h1 className="hidden whitespace-nowrap text-[15px] font-semibold text-[color:var(--ss-text)] lg:block">Story Studio</h1>
        <span className="hidden rounded-md bg-[color:var(--ss-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--ss-accent)] lg:block" title="Story Studio is in beta">
          Beta
        </span>
      </div>

      <div className="mx-auto flex min-w-0 items-center gap-3 lg:gap-8">
        <div className="flex min-w-0 items-center gap-1.5">
          {editing ? (
            <input
              autoFocus
              aria-label="Project name"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitName();
                if (e.key === 'Escape') {
                  setName(state.doc.name);
                  setEditing(false);
                }
              }}
              className="h-8 w-44 rounded-md border border-[color:var(--ss-accent)] bg-[color:var(--ss-field)] px-2 text-center text-[14px] font-medium text-[color:var(--ss-text)] outline-none"
            />
          ) : (
            <>
              <span className="max-w-[10rem] truncate text-[14px] font-medium text-[color:var(--ss-text)] md:max-w-[16rem]" data-testid="ss-project-name">
                {state.doc.name}
              </span>
              <Tip label="Rename project">
                <button type="button" onClick={() => setEditing(true)} aria-label="Rename project" className="rounded p-1 text-[color:var(--ss-muted)] hover:text-[color:var(--ss-text)]">
                  <Pencil size={13} />
                </button>
              </Tip>
            </>
          )}
        </div>
        <span
          className="hidden items-center gap-1.5 whitespace-nowrap text-[12px] text-[color:var(--ss-muted)] md:flex"
          data-testid="ss-save-status"
          title="Drafts are saved automatically on this device"
          aria-live="polite"
        >
          {s.saveStatus === 'saving' ? <Loader2 size={13} className="animate-spin" /> : s.saveStatus === 'error' ? <AlertCircle size={13} className="text-red-500" /> : <Cloud size={13} className="text-emerald-500" />}
          <span className="sr-only lg:not-sr-only">{statusText}</span>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <Tip label="Undo (Ctrl+Z)">
          <button type="button" onClick={() => dispatch({ type: 'undo' })} disabled={!canUndo(state)} aria-label="Undo" className={`${iconBtn} border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)]`}>
            <Undo2 size={17} />
          </button>
        </Tip>
        <Tip label="Redo (Ctrl+Shift+Z)">
          <button type="button" onClick={() => dispatch({ type: 'redo' })} disabled={!canRedo(state)} aria-label="Redo" className={`${iconBtn} border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)]`}>
            <Redo2 size={17} />
          </button>
        </Tip>
        <button
          type="button"
          onClick={onPreview}
          disabled={slides.length === 0}
          className="hidden h-9 items-center gap-2 rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] px-3.5 text-[13px] font-semibold text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)] disabled:cursor-not-allowed disabled:opacity-45 sm:inline-flex"
        >
          <Play size={15} /> Preview
        </button>

        <div ref={exportRef} className="relative">
          <button
            type="button"
            onClick={() => setExportOpen((v) => !v)}
            aria-haspopup="dialog"
            aria-expanded={exportOpen}
            disabled={slides.length === 0}
            data-testid="ss-export"
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--ss-accent)] px-3.5 text-[13px] font-semibold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 md:px-5"
          >
            <Upload size={15} /> Export <ChevronDown size={14} className="opacity-80" />
          </button>
          {exportOpen ? (
            <div role="dialog" aria-label="Export story" className="absolute right-0 top-11 z-50 w-[300px] rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] p-4 shadow-2xl">
              <p className="text-[14px] font-semibold text-[color:var(--ss-text)]">Publish to Story</p>
              <p className="mt-1 text-[12px] leading-snug text-[color:var(--ss-muted)]">
                {slides.length} slide{slides.length === 1 ? '' : 's'} · {formatClock(totalDuration(slides))} total. Each slide is shared as its own story for 24 hours{s.spaceName ? ` as ${s.spaceName}` : ''}.
                {pending !== slides.length ? ` ${slides.length - pending} already published.` : ''}
              </p>
              <label className="mt-3 block text-[11px] font-medium text-[color:var(--ss-muted)]">
                Audience
                <select
                  aria-label="Audience"
                  value={state.doc.privacy}
                  onChange={(e) => dispatch({ type: 'setPrivacy', privacy: e.target.value as Privacy })}
                  className="mt-1 h-9 w-full rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-2 text-[13px] text-[color:var(--ss-text)]"
                >
                  {PRIVACY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {progress.error ? <p className="mt-2 text-[12px] text-red-500" role="alert">{progress.error}</p> : null}
              <button
                type="button"
                data-testid="ss-publish"
                disabled={!canPublish}
                onClick={() => {
                  onPublish();
                }}
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[color:var(--ss-accent)] text-[13px] font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {progress.busy ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Publishing {progress.done}/{progress.total}…
                  </>
                ) : s.uploading > 0 ? (
                  'Waiting for uploads…'
                ) : pending === 0 ? (
                  <>
                    <Check size={15} /> All slides published
                  </>
                ) : (
                  <>
                    <Zap size={15} /> {progress.error ? 'Retry remaining slides' : `Share ${pending} slide${pending === 1 ? '' : 's'} to story`}
                  </>
                )}
              </button>
              <p className="mt-2 text-[11px] text-[color:var(--ss-muted)]">Rendered video/PNG file export is coming soon — publishing is the export today.</p>
            </div>
          ) : null}
        </div>

        <div ref={menuRef} className="relative">
          <Tip label="More">
            <button type="button" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} aria-label="More options" className={`${iconBtn} border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)]`}>
              <MoreVertical size={17} />
            </button>
          </Tip>
          {menuOpen ? (
            <div role="menu" className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] py-1 shadow-2xl">
              {[
                { icon: <Play size={15} />, label: 'Preview', onClick: onPreview, disabled: slides.length === 0 },
                { icon: <Keyboard size={15} />, label: 'Keyboard shortcuts', onClick: onShortcuts },
                { icon: <Zap size={15} />, label: 'Classic quick story', onClick: onClassic },
                { icon: <Trash2 size={15} />, label: 'Discard project', onClick: onDiscard, danger: true, disabled: slides.length === 0 },
              ].map((it) => (
                <button
                  key={it.label}
                  type="button"
                  role="menuitem"
                  disabled={it.disabled}
                  onClick={() => {
                    setMenuOpen(false);
                    it.onClick();
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] hover:bg-[color:var(--ss-hover)] disabled:opacity-40 ${it.danger ? 'text-red-500' : 'text-[color:var(--ss-text)]'}`}
                >
                  {it.icon} {it.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
