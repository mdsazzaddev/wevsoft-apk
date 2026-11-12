import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, GripVertical, Lock, MoreVertical, Smile, Type, Image as ImageIcon, Film, Square } from 'lucide-react';
import { overlayLabel, type Overlay } from '../model/types';
import { useStudio } from './StudioContext';

function RowMenu({ o, index, count, onClose }: { o: Overlay; index: number; count: number; onClose: () => void }) {
  const s = useStudio();
  const slideId = s.slide!.id;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [onClose]);
  const item = (label: string, fn: () => void, opts: { disabled?: boolean; danger?: boolean } = {}) => (
    <button
      type="button"
      role="menuitem"
      disabled={opts.disabled}
      onClick={() => {
        fn();
        onClose();
      }}
      className={`block w-full px-3 py-1.5 text-left text-[12.5px] hover:bg-[color:var(--ss-hover)] disabled:opacity-40 ${opts.danger ? 'text-red-500' : 'text-[color:var(--ss-text)]'}`}
    >
      {label}
    </button>
  );
  return (
    <div ref={ref} role="menu" className="absolute right-6 top-8 z-40 w-44 overflow-hidden rounded-lg border border-[color:var(--ss-border)] bg-[color:var(--ss-panel)] py-1 shadow-xl">
      {item('Rename', () => window.dispatchEvent(new CustomEvent('ss:rename-layer', { detail: o.id })))}
      {item('Duplicate', () => s.dispatch({ type: 'duplicateOverlay', slideId, overlayId: o.id }))}
      {item(o.locked ? 'Unlock' : 'Lock', () => s.dispatch({ type: 'updateOverlay', slideId, overlayId: o.id, patch: { locked: !o.locked } }))}
      {item('Bring forward', () => s.dispatch({ type: 'moveOverlayLayer', slideId, overlayId: o.id, toIndex: index + 1 }), { disabled: index >= count - 1 })}
      {item('Send backward', () => s.dispatch({ type: 'moveOverlayLayer', slideId, overlayId: o.id, toIndex: index - 1 }), { disabled: index <= 0 })}
      {item('Delete', () => s.dispatch({ type: 'removeOverlay', slideId, overlayId: o.id }), { danger: true })}
    </div>
  );
}

export default function LayerList({ compact = false }: { compact?: boolean }) {
  const s = useStudio();
  const slide = s.slide;
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: Event) => setRenaming((e as CustomEvent).detail);
    window.addEventListener('ss:rename-layer', h);
    return () => window.removeEventListener('ss:rename-layer', h);
  }, []);

  if (!slide) {
    return <p className="px-4 py-6 text-center text-[12px] text-[color:var(--ss-muted)]">Add a slide to see its layers.</p>;
  }

  const overlays = slide.overlays;
  // Top of the list = top of the stack (last in array).
  const ordered = [...overlays].map((o, i) => ({ o, i })).reverse();
  const rowBase = `relative flex items-center gap-2.5 rounded-lg px-2 ${compact ? 'h-10' : 'h-[46px]'}`;

  return (
    <ul className="px-2 pb-2" data-testid="ss-layer-list" aria-label="Layers">
      {ordered.map(({ o, i }) => {
        const selected = s.state.selectedOverlayId === o.id;
        const Icon = o.kind === 'sticker' || o.kind === 'poll' ? Smile : o.kind === 'draw' ? Smile : Type;
        return (
          <li
            key={o.id}
            className={`${rowBase} ${selected ? 'bg-[color:var(--ss-accent-soft)]' : 'hover:bg-[color:var(--ss-hover)]'} ${dragId === o.id ? 'opacity-40' : ''}`}
            draggable
            onDragStart={(e) => {
              setDragId(o.id);
              e.dataTransfer.setData('text/plain', o.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={() => setDragId(null)}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId && dragId !== o.id) s.dispatch({ type: 'moveOverlayLayer', slideId: slide.id, overlayId: dragId, toIndex: i });
              setDragId(null);
            }}
          >
            <button
              type="button"
              aria-label={o.visible ? `Hide ${overlayLabel(o)}` : `Show ${overlayLabel(o)}`}
              aria-pressed={!o.visible}
              onClick={() => s.dispatch({ type: 'updateOverlay', slideId: slide.id, overlayId: o.id, patch: { visible: !o.visible } })}
              className="shrink-0 text-[color:var(--ss-text)] opacity-80 hover:opacity-100"
            >
              {o.visible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button type="button" onClick={() => s.dispatch({ type: 'selectOverlay', id: o.id })} data-testid="ss-layer-row" aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center text-[color:var(--ss-text)]">{o.kind === 'sticker' ? <span className="text-[16px] leading-none">{o.text}</span> : <Icon size={16} />}</span>
              {renaming === o.id ? (
                <input
                  autoFocus
                  defaultValue={overlayLabel(o)}
                  aria-label="Layer name"
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    s.dispatch({ type: 'updateOverlay', slideId: slide.id, overlayId: o.id, patch: { name: e.target.value.trim() } });
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-[color:var(--ss-accent)] bg-[color:var(--ss-field)] px-1.5 py-0.5 text-[13px] text-[color:var(--ss-text)] outline-none"
                />
              ) : (
                <span className={`truncate text-[13px] ${selected ? 'font-medium text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)]'}`}>{overlayLabel(o)}</span>
              )}
            </button>
            {o.locked ? <Lock size={13} className="shrink-0 text-[color:var(--ss-muted)]" aria-label="Locked" /> : null}
            <button type="button" aria-label={`Options for ${overlayLabel(o)}`} aria-haspopup="menu" onClick={() => setMenuFor(menuFor === o.id ? null : o.id)} className="shrink-0 rounded p-0.5 text-[color:var(--ss-muted)] hover:text-[color:var(--ss-text)]">
              <MoreVertical size={15} />
            </button>
            <span className="shrink-0 cursor-grab text-[color:var(--ss-muted)]" aria-hidden title="Drag to reorder"><GripVertical size={15} /></span>
            {menuFor === o.id ? <RowMenu o={o} index={i} count={overlays.length} onClose={() => setMenuFor(null)} /> : null}
          </li>
        );
      })}

      <li className={`${rowBase} ${!s.state.selectedOverlayId ? 'bg-[color:var(--ss-accent-soft)]' : 'hover:bg-[color:var(--ss-hover)]'}`}>
        <span className="w-4 shrink-0" />
        <button type="button" onClick={() => s.dispatch({ type: 'selectOverlay', id: null })} data-testid="ss-layer-media" className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded bg-[color:var(--ss-hover)] text-[color:var(--ss-text)]">
            {slide.media?.type === 'video' ? <Film size={14} /> : slide.media ? <ImageIcon size={14} /> : <Square size={14} />}
          </span>
          <span className="truncate text-[13px] text-[color:var(--ss-text)]">{slide.media ? (slide.media.type === 'video' ? 'Video' : 'Image') : 'Text slide'}</span>
        </button>
      </li>
      {slide.media ? (
        <li className={`${rowBase} opacity-70`}>
          <span className="w-4 shrink-0" />
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded" style={{ background: slide.bgColor, boxShadow: 'inset 0 0 0 1px rgba(128,128,128,.4)' }} />
          <span className="truncate text-[13px] text-[color:var(--ss-text)]">Background</span>
        </li>
      ) : null}
      {overlays.length === 0 ? <li className="px-2 pt-2 text-[12px] text-[color:var(--ss-muted)]">No text or stickers on this slide yet.</li> : null}
    </ul>
  );
}
