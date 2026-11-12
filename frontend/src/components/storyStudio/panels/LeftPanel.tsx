import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, Image as ImageIcon, Loader2, Music, Play, Plus, Search, Trash2, Type, Upload, X, LayoutTemplate } from 'lucide-react';
import StoryVideoThumb from '../../social/StoryVideoThumb';
import { slideDuration } from '../model/timing';
import { COMING_SOON, Tip } from './ui';
import SlideThumb from './SlideThumb';
import LayerList from './LayerList';
import { useStudio } from './StudioContext';

const FILE_ACCEPT = 'image/*,video/*';

export const STICKER_GROUPS: { label: string; items: string[] }[] = [
  { label: 'Smileys', items: ['😀', '😂', '🥹', '😍', '😎', '🤩', '🥳', '😭', '😡', '🤔', '😴', '🤯'] },
  { label: 'Hearts & shine', items: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💖', '✨', '⭐', '🔥'] },
  { label: 'Gestures', items: ['👍', '👏', '🙌', '🙏', '💪', '👀', '🤝', '✌️', '🤞', '👋', '🫶', '💯'] },
  { label: 'Fun', items: ['🎉', '🎈', '🎁', '🎶', '📸', '☀️', '🌈', '🌙', '🌸', '🍕', '☕', '🚀'] },
];

function PanelShell({ title, onClose, children, accent, footer }: { title: string; onClose: () => void; children: React.ReactNode; accent?: string; footer?: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-[15px] font-semibold text-[color:var(--ss-text)]">
          {accent ? <span className="text-[color:var(--ss-accent)]">{accent}</span> : null}
          {title}
        </h2>
        <button type="button" onClick={onClose} aria-label="Close panel" className="rounded p-1 text-[color:var(--ss-muted)] hover:text-[color:var(--ss-text)]">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain ss-scroll">{children}</div>
      {footer ? <div className="shrink-0 border-t border-[color:var(--ss-border)] px-4 pb-3 pt-3">{footer}</div> : null}
    </div>
  );
}

function ComingSoonCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="mx-4 mt-2 flex flex-col items-center gap-2 rounded-xl border border-dashed border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-4 py-8 text-center" data-testid="ss-coming-soon">
      <div className="text-[color:var(--ss-muted)]">{icon}</div>
      <p className="text-[13px] font-semibold text-[color:var(--ss-text)]">{title}</p>
      <p className="text-[12px] leading-snug text-[color:var(--ss-muted)]">{text}</p>
      <span className="rounded-full bg-[color:var(--ss-accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--ss-accent)]">{COMING_SOON}</span>
    </div>
  );
}

function StorySlidesRow() {
  const s = useStudio();
  const slides = s.state.doc.slides;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  return (
    <div className="px-4 pb-4 pt-1">
      <h3 className="mb-2 text-[13px] font-semibold text-[color:var(--ss-text)]">Story Slides</h3>
      <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple className="hidden" data-testid="ss-file-input-slides" onChange={(e) => { if (e.target.files?.length) s.importFiles(e.target.files); e.target.value = ''; }} />
      <div className="flex gap-2 overflow-x-auto pb-1 ss-scroll" data-testid="ss-slides-row">
        <div className="flex shrink-0 flex-col gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Add slide from your device"
            className="flex h-[78px] w-[62px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[color:var(--ss-border)] bg-[color:var(--ss-field)] text-[12px] font-medium text-[color:var(--ss-muted)] hover:border-[color:var(--ss-accent)] hover:text-[color:var(--ss-accent)]"
          >
            {s.uploading > 0 ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
            Add
          </button>
          <button type="button" onClick={s.addTextSlide} className="rounded-md px-1 text-[10px] font-medium text-[color:var(--ss-accent)] hover:underline" aria-label="Add text slide">
            + Text slide
          </button>
        </div>
        {slides.map((sl, i) => {
          const active = sl.id === s.state.selectedSlideId;
          return (
            <div
              key={sl.id}
              className="group/slide relative flex shrink-0 flex-col items-center gap-1"
              draggable
              onDragStart={(e) => {
                setDragId(sl.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', sl.id);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverId(sl.id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== sl.id) s.dispatch({ type: 'moveSlide', id: dragId, toIndex: i });
                setDragId(null);
                setOverId(null);
              }}
            >
              <button
                type="button"
                onClick={() => {
                  s.dispatch({ type: 'selectSlide', id: sl.id });
                  s.seek(s.state.doc.slides.slice(0, i).reduce((a, x) => a + slideDuration(x), 0));
                }}
                aria-label={`Slide ${i + 1}, ${slideDuration(sl)} seconds`}
                aria-current={active}
                data-testid="ss-slide-thumb"
                className={`relative h-[78px] w-[62px] overflow-hidden rounded-xl border-2 ${active ? 'border-[color:var(--ss-accent)]' : overId === sl.id ? 'border-[color:var(--ss-accent)]/50' : 'border-transparent'} ${dragId === sl.id ? 'opacity-40' : ''}`}
              >
                <SlideThumb slide={sl} className="h-full w-full" />
                <span className="absolute bottom-1 left-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/70 text-[10px] font-bold text-white">{i + 1}</span>
                {sl.publishedStoryId ? <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white" title="Published"><Check size={10} /></span> : null}
              </button>
              <span className={`text-[11px] font-medium ${active ? 'text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-muted)]'}`}>{Math.round(slideDuration(sl))}s</span>
              <div className={`absolute -top-1 left-1/2 hidden -translate-x-1/2 gap-0.5 rounded-md bg-[color:var(--ss-panel)] p-0.5 shadow-md ring-1 ring-[color:var(--ss-border)] group-hover/slide:flex group-focus-within/slide:flex ${active ? '[@media(hover:none)]:flex' : ''}`}>
                <button type="button" aria-label="Move slide earlier" disabled={i === 0} onClick={() => s.dispatch({ type: 'moveSlide', id: sl.id, toIndex: i - 1 })} className="rounded p-0.5 text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)] disabled:opacity-30"><ArrowLeft size={12} /></button>
                <button type="button" aria-label="Move slide later" disabled={i === slides.length - 1} onClick={() => s.dispatch({ type: 'moveSlide', id: sl.id, toIndex: i + 1 })} className="rounded p-0.5 text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)] disabled:opacity-30"><ArrowRight size={12} /></button>
                <button type="button" aria-label="Duplicate slide" onClick={() => s.dispatch({ type: 'duplicateSlide', id: sl.id })} className="rounded p-0.5 text-[color:var(--ss-text)] hover:bg-[color:var(--ss-hover)]"><Copy size={12} /></button>
                <button type="button" aria-label="Delete slide" onClick={() => s.dispatch({ type: 'removeSlide', id: sl.id })} className="rounded p-0.5 text-red-500 hover:bg-[color:var(--ss-hover)]"><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>
      {slides.length === 0 ? <p className="mt-2 text-[12px] text-[color:var(--ss-muted)]">No slides yet. Upload media or pick from Recent to start your story.</p> : null}
    </div>
  );
}

function MediaPanel() {
  const s = useStudio();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'images' | 'videos' | 'audio' | 'stickers'>('all');
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const used = useMemo(() => new Set(s.state.doc.slides.map((x) => x.media?.mediaId).filter(Boolean) as string[]), [s.state.doc.slides]);

  const items = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return s.library.filter((m) => (tab === 'images' ? m.type === 'image' : tab === 'videos' ? m.type === 'video' : true)).filter((m) => !needle || m.name.toLowerCase().includes(needle));
  }, [s.library, q, tab]);
  const shown = showAll ? items : items.slice(0, 6);

  const tabs: { id: typeof tab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'images', label: 'Images' },
    { id: 'videos', label: 'Videos' },
    { id: 'audio', label: 'Audio' },
    { id: 'stickers', label: 'Stickers' },
  ];

  return (
    <PanelShell title=" & Assets" accent="Media" onClose={() => s.setLeftOpen(false)} footer={<StorySlidesRow />}>
      <div className="px-4">
        <label className="relative block">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ss-muted)]" />
          <input
            type="search"
            aria-label="Search your media"
            placeholder="Search your photos & videos…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] pl-9 pr-3 text-[13px] text-[color:var(--ss-text)] outline-none placeholder:text-[color:var(--ss-muted)] focus:border-[color:var(--ss-accent)]"
          />
        </label>
        <div role="tablist" aria-label="Media type" className="mt-3 flex border-b border-[color:var(--ss-border)]">
          {tabs.map((t) => {
            const soon = t.id === 'audio';
            const active = tab === t.id;
            return (
              <Tip key={t.id} label={soon ? COMING_SOON : t.label}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-disabled={soon}
                  onClick={() => !soon && setTab(t.id)}
                  className={`-mb-px px-2.5 pb-2 pt-1 text-[12.5px] font-medium ${soon ? 'cursor-not-allowed opacity-50' : ''} ${active ? 'border-b-2 border-[color:var(--ss-accent)] text-[color:var(--ss-accent)]' : 'text-[color:var(--ss-text)]'}`}
                >
                  {t.label}
                </button>
              </Tip>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 px-4">
        <input ref={fileRef} type="file" accept={FILE_ACCEPT} multiple className="hidden" data-testid="ss-file-input" onChange={(e) => { if (e.target.files?.length) s.importFiles(e.target.files); e.target.value = ''; }} />
        <button type="button" onClick={() => fileRef.current?.click()} data-testid="ss-upload" className="flex min-h-[84px] flex-col items-start justify-between rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] p-3 text-left hover:border-[color:var(--ss-accent)]">
          {s.uploading > 0 ? <Loader2 size={20} className="animate-spin text-[color:var(--ss-accent)]" /> : <Upload size={20} className="text-[color:var(--ss-accent)]" />}
          <span>
            <span className="block text-[13px] font-semibold text-[color:var(--ss-text)]">Upload</span>
            <span className="block text-[11px] text-[color:var(--ss-muted)]">Images, Videos</span>
          </span>
        </button>
        <Tip label="Stock media needs a licensed source — coming soon">
          <button type="button" aria-disabled="true" onClick={(e) => e.preventDefault()} className="flex min-h-[84px] w-full cursor-not-allowed flex-col items-start justify-between rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] p-3 text-left opacity-60">
            <ImageIcon size={20} className="text-[color:var(--ss-accent)]" />
            <span>
              <span className="block text-[13px] font-semibold text-[color:var(--ss-text)]">Stock Media</span>
              <span className="block text-[11px] text-[color:var(--ss-muted)]">{COMING_SOON}</span>
            </span>
          </button>
        </Tip>
      </div>

      {tab === 'stickers' ? (
        <StickerGrid />
      ) : (
        <div className="mt-4 px-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[color:var(--ss-text)]">Recent</h3>
            {items.length > 6 ? (
              <button type="button" onClick={() => setShowAll((v) => !v)} className="text-[12px] font-medium text-[color:var(--ss-accent)] hover:underline">
                {showAll ? 'Show less' : 'See all'}
              </button>
            ) : null}
          </div>
          {s.libraryLoading ? (
            <div className="grid grid-cols-3 gap-2" aria-busy="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-lg bg-[color:var(--ss-hover)]" />
              ))}
            </div>
          ) : s.libraryError ? (
            <p className="text-[12px] text-red-500" role="alert">
              {s.libraryError}{' '}
              <button type="button" className="font-semibold underline" onClick={s.reloadLibrary}>Retry</button>
            </p>
          ) : items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[color:var(--ss-border)] p-4 text-center text-[12px] text-[color:var(--ss-muted)]" data-testid="ss-library-empty">
              {q ? 'No media matches your search.' : 'Your media library is empty. Upload a photo or video to begin.'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2" data-testid="ss-library-grid">
              {shown.map((m) => {
                const inUse = used.has(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => s.addFromLibrary(m)}
                    aria-label={`Add ${m.type} ${m.name} to story`}
                    title={m.name}
                    data-testid="ss-library-item"
                    className="group/m relative aspect-square overflow-hidden rounded-lg bg-[color:var(--ss-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ss-accent)]"
                  >
                    {m.type === 'video' ? <StoryVideoThumb url={m.url} className="h-full w-full object-cover" /> : <img src={m.url} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />}
                    {m.type === 'video' ? (
                      <span className="absolute bottom-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white"><Play size={10} fill="currentColor" /></span>
                    ) : null}
                    {inUse ? (
                      <span className="absolute left-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[color:var(--ss-accent)] text-white"><Check size={11} /></span>
                    ) : (
                      <span className="absolute inset-0 hidden items-center justify-center bg-black/35 text-white group-hover/m:flex"><Plus size={20} /></span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </PanelShell>
  );
}

function StickerGrid() {
  const s = useStudio();
  return (
    <div className="mt-3 space-y-3 px-4 pb-4" data-testid="ss-sticker-grid">
      <div>
        <h3 className="mb-1.5 text-[12px] font-semibold text-[color:var(--ss-muted)]">Interactive</h3>
        <button
          type="button"
          disabled={!s.slide}
          onClick={() => s.addPoll()}
          data-testid="ss-add-poll"
          className="flex w-full items-center gap-2 rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-3 py-2.5 text-left hover:border-[color:var(--ss-accent)] disabled:opacity-40"
        >
          <span className="text-[22px]">📊</span>
          <span>
            <span className="block text-[13px] font-semibold text-[color:var(--ss-text)]">Poll sticker</span>
            <span className="block text-[11px] text-[color:var(--ss-muted)]">Single, quiz, slider, yes/no…</span>
          </span>
        </button>
      </div>
      {STICKER_GROUPS.map((g) => (
        <div key={g.label}>
          <h3 className="mb-1.5 text-[12px] font-semibold text-[color:var(--ss-muted)]">{g.label}</h3>
          <div className="grid grid-cols-6 gap-1">
            {g.items.map((e) => (
              <button key={e} type="button" aria-label={`Add sticker ${e}`} disabled={!s.slide} onClick={() => s.addSticker(e)} className="flex aspect-square items-center justify-center rounded-lg text-[24px] hover:bg-[color:var(--ss-hover)] disabled:opacity-40">
                {e}
              </button>
            ))}
          </div>
        </div>
      ))}
      {!s.slide ? <p className="text-[12px] text-[color:var(--ss-muted)]">Add a slide first to place stickers.</p> : null}
    </div>
  );
}

function TextPanel() {
  const s = useStudio();
  const presets: { id: 'heading' | 'subheading' | 'body'; label: string; cls: string }[] = [
    { id: 'heading', label: 'Add a heading', cls: 'text-[22px] font-bold' },
    { id: 'subheading', label: 'Add a subheading', cls: 'text-[17px] font-semibold' },
    { id: 'body', label: 'Add body text', cls: 'text-[13px] font-medium' },
  ];
  return (
    <PanelShell title="Text" onClose={() => s.setLeftOpen(false)}>
      <div className="space-y-2 px-4 pb-4">
        {presets.map((p) => (
          <button key={p.id} type="button" disabled={!s.slide} onClick={() => s.addText(p.id)} data-testid={`ss-add-text-${p.id}`} className={`flex h-14 w-full items-center rounded-xl border border-[color:var(--ss-border)] bg-[color:var(--ss-field)] px-4 text-left text-[color:var(--ss-text)] hover:border-[color:var(--ss-accent)] disabled:opacity-40 ${p.cls}`}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={s.addTextSlide} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[color:var(--ss-border)] text-[13px] font-medium text-[color:var(--ss-accent)] hover:bg-[color:var(--ss-accent-soft)]">
          <Type size={15} /> New text-only slide
        </button>
        {!s.slide ? <p className="text-[12px] text-[color:var(--ss-muted)]">Add a slide first, or start with a text-only slide.</p> : null}
      </div>
    </PanelShell>
  );
}

export default function LeftPanel() {
  const s = useStudio();
  if (s.leftTab === 'media') return <MediaPanel />;
  if (s.leftTab === 'text') return <TextPanel />;
  if (s.leftTab === 'stickers') {
    return (
      <PanelShell title="Stickers" onClose={() => s.setLeftOpen(false)}>
        <StickerGrid />
      </PanelShell>
    );
  }
  if (s.leftTab === 'layers') {
    return (
      <PanelShell title="Layers" onClose={() => s.setLeftOpen(false)}>
        <LayerList />
      </PanelShell>
    );
  }
  if (s.leftTab === 'music') {
    return (
      <PanelShell title="Music" onClose={() => s.setLeftOpen(false)}>
        <ComingSoonCard icon={<Music size={26} />} title="Music library" text="Add licensed music and voiceover with waveform editing. Needs an audio source and server mixing." />
      </PanelShell>
    );
  }
  return (
    <PanelShell title="Templates" onClose={() => s.setLeftOpen(false)}>
      <ComingSoonCard icon={<LayoutTemplate size={26} />} title="Story templates" text="Saved layouts and brand kits are planned for the next phase." />
    </PanelShell>
  );
}
