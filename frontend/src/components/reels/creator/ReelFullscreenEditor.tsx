import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Image as ImageIcon,
  Loader2,
  Music2,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Sticker,
  Type,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useStore } from '../../../store';
import {
  DEFAULT_ADJUSTMENTS,
  FILTER_PRESETS,
  SPEED_OPTIONS,
  createReelEditState,
  newOverlayId,
  type ReelAspectMode,
  type ReelCropAspect,
  type ReelEditState,
  type ReelFilterPreset,
} from '../../../lib/reelEditState';
import { formatDurationLabel } from '../../../lib/reelVideoAnalysis';
import MusicPickerModal, { type PostMusicSelection } from '../../social/MusicPickerModal';
import ReelPreviewFrame from './ReelPreviewFrame';
import {
  StepAudienceVisibility,
  StepInteractionControls,
  inputClass,
  FieldLabel,
} from '../../creator/CreatorPublishSteps';
import type { CreatorPublishSettings } from '../../../lib/creatorPublish';

type ToolId = 'trim' | 'crop' | 'filter' | 'adjust' | 'audio' | 'cover' | 'text' | 'stickers' | 'details';

const TOOLS: Array<{ id: ToolId; label: string; icon: React.ReactNode }> = [
  { id: 'trim', label: 'Trim', icon: <Scissors size={16} /> },
  { id: 'crop', label: 'Crop', icon: <Crop size={16} /> },
  { id: 'filter', label: 'Filter', icon: <Sparkles size={16} /> },
  { id: 'adjust', label: 'Adjust', icon: <SlidersHorizontal size={16} /> },
  { id: 'audio', label: 'Audio', icon: <Music2 size={16} /> },
  { id: 'cover', label: 'Cover', icon: <ImageIcon size={16} /> },
  { id: 'text', label: 'Text', icon: <Type size={16} /> },
  { id: 'stickers', label: 'Stickers', icon: <Sticker size={16} /> },
  { id: 'details', label: 'Details', icon: <Wand2 size={16} /> },
];

const EMOJI_STICKERS = ['🔥', '❤️', '😂', '✨', '👏', '🎵', '💯', '🙌', '😎', '🌟'];

type Props = {
  previewUrl: string | null;
  durationSec: number;
  edit: ReelEditState;
  onChange: (next: ReelEditState) => void;
  publishSettings: CreatorPublishSettings;
  onPublishSettings: (next: CreatorPublishSettings) => void;
  thumbnail: string;
  onThumbnail: (dataUrl: string) => void;
};

function patch(edit: ReelEditState, partial: Partial<ReelEditState>): ReelEditState {
  return { ...edit, ...partial };
}

export default function ReelFullscreenEditor({
  previewUrl,
  durationSec,
  edit,
  onChange,
  publishSettings,
  onPublishSettings,
  thumbnail,
  onThumbnail,
}: Props) {
  const token = useStore((s) => s.token);
  const [tool, setTool] = useState<ToolId>('trim');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [musicOpen, setMusicOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [textDraft, setTextDraft] = useState('Your text');
  const videoEl = useRef<HTMLVideoElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const duration = durationSec > 0 ? durationSec : Math.max(edit.trimEnd || 0, 1);
  const trimEnd = edit.trimEnd == null ? duration : Math.min(edit.trimEnd, duration);
  const trimStart = Math.min(edit.trimStart, Math.max(0, trimEnd - 0.5));

  useEffect(() => {
    const el = videoEl.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [previewUrl]);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoEl.current = el;
  }, []);

  const togglePlay = () => {
    const el = videoEl.current;
    if (!el) return;
    if (el.paused) {
      if (el.currentTime < trimStart || el.currentTime >= trimEnd) el.currentTime = trimStart;
      el.play().catch(() => toast.error('Could not play preview'));
    } else {
      el.pause();
    }
  };

  const captureCoverAtPlayhead = () => {
    const el = videoEl.current;
    if (!el) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = el.videoWidth || 720;
      canvas.height = el.videoHeight || 1280;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      const url = canvas.toDataURL('image/jpeg', 0.85);
      onChange(patch(edit, { coverDataUrl: url, coverTimeSec: el.currentTime }));
      onThumbnail(url);
      toast.success('Cover updated');
    } catch {
      toast.error('Could not capture cover');
    }
  };

  const suggestAiTitle = async () => {
    if (!token) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/generate-post', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: publishSettings.description || publishSettings.title || 'Create a short catchy reel title',
          tone: 'engaging',
          language: publishSettings.language || 'auto',
          contentType: 'reel',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'AI title unavailable');
        return;
      }
      const title =
        data.title ||
        data.caption ||
        data.content ||
        (typeof data.text === 'string' ? data.text : '') ||
        '';
      const cleaned = String(title).replace(/^["']|["']$/g, '').trim().slice(0, 200);
      if (!cleaned) {
        toast.error('No suggestion returned');
        return;
      }
      onPublishSettings({ ...publishSettings, title: cleaned });
      toast.success('Title suggestion applied — you can edit it');
    } catch {
      toast.error('AI title failed');
    } finally {
      setAiLoading(false);
    }
  };

  const applyMusic = (selection: PostMusicSelection | null) => {
    if (!selection) {
      onChange(patch(edit, { music: null }));
      return;
    }
    onChange(
      patch(edit, {
        music: {
          musicId: selection.musicId,
          startTime: selection.startTime,
          endTime: selection.endTime,
          volume: selection.volume,
          originalAudioMuted: selection.originalAudioMuted,
          title: selection.title,
          artist: selection.artist,
          coverImage: selection.coverImage,
          audioUrl: selection.audioUrl,
          duration: selection.duration,
        },
        muted: selection.originalAudioMuted ? true : edit.muted,
      }),
    );
  };

  const panel = useMemo(() => {
    if (tool === 'trim') {
      return (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Non-destructive trim — preview only until publish. {formatDurationLabel(trimEnd - trimStart)} selected.
          </p>
          <div>
            <FieldLabel>Start · {formatDurationLabel(trimStart)}</FieldLabel>
            <input
              type="range"
              min={0}
              max={Math.max(0.1, duration)}
              step={0.05}
              value={trimStart}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange(patch(edit, { trimStart: Math.min(v, trimEnd - 0.5) }));
                if (videoEl.current) videoEl.current.currentTime = v;
              }}
              className="w-full"
            />
          </div>
          <div>
            <FieldLabel>End · {formatDurationLabel(trimEnd)}</FieldLabel>
            <input
              type="range"
              min={0}
              max={Math.max(0.1, duration)}
              step={0.05}
              value={trimEnd}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange(patch(edit, { trimEnd: Math.max(v, trimStart + 0.5) }));
              }}
              className="w-full"
            />
          </div>
          <div className="h-2 rounded-full bg-muted relative overflow-hidden">
            <div
              className="absolute inset-y-0 bg-primary/70"
              style={{
                left: `${(trimStart / duration) * 100}%`,
                width: `${((trimEnd - trimStart) / duration) * 100}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() => onChange(patch(edit, { trimStart: 0, trimEnd: null }))}
            >
              Reset trim
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() => {
                // Lightweight “split” = set end at playhead (keep start)
                onChange(patch(edit, { trimEnd: Math.max(currentTime, trimStart + 0.5) }));
              }}
            >
              Split at playhead (set end)
            </button>
          </div>
        </div>
      );
    }

    if (tool === 'crop') {
      const modes: Array<{ id: ReelAspectMode; label: string }> = [
        { id: 'fit', label: 'Fit' },
        { id: 'crop', label: 'Crop' },
        { id: 'original', label: 'Original' },
      ];
      const aspects: ReelCropAspect[] = ['9:16', '4:5', '1:1', '16:9', 'free'];
      return (
        <div className="space-y-3">
          <FieldLabel>Frame</FieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {modes.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onChange(patch(edit, { aspectMode: m.id }))}
                className={`rounded-xl border px-2 py-2 text-xs font-bold ${
                  edit.aspectMode === m.id ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <FieldLabel>Crop ratio</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {aspects.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange(patch(edit, { cropAspect: a }))}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                  edit.cropAspect === a ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          {edit.aspectMode === 'crop' && (
            <>
              <FieldLabel>Reframe X</FieldLabel>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={edit.reframeX}
                onChange={(e) => onChange(patch(edit, { reframeX: Number(e.target.value) }))}
                className="w-full"
              />
              <FieldLabel>Reframe Y</FieldLabel>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.01}
                value={edit.reframeY}
                onChange={(e) => onChange(patch(edit, { reframeY: Number(e.target.value) }))}
                className="w-full"
              />
            </>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() =>
                onChange(patch(edit, { rotation: ((edit.rotation + 270) % 360) as ReelEditState['rotation'] }))
              }
            >
              <RotateCcw size={14} /> 90° left
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() =>
                onChange(patch(edit, { rotation: ((edit.rotation + 90) % 360) as ReelEditState['rotation'] }))
              }
            >
              <RotateCw size={14} /> 90° right
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() => onChange(patch(edit, { flipH: !edit.flipH }))}
            >
              <FlipHorizontal2 size={14} /> Flip H
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() => onChange(patch(edit, { flipV: !edit.flipV }))}
            >
              <FlipVertical2 size={14} /> Flip V
            </button>
          </div>
        </div>
      );
    }

    if (tool === 'filter') {
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FILTER_PRESETS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => onChange(patch(edit, { filterPreset: f.id as ReelFilterPreset }))}
                className={`rounded-xl border px-2 py-2 text-left ${
                  edit.filterPreset === f.id ? 'border-primary bg-primary/10' : 'border-border bg-muted/40'
                }`}
              >
                <p className="text-xs font-bold">{f.label}</p>
              </button>
            ))}
          </div>
          <FieldLabel>Intensity · {edit.filterIntensity}%</FieldLabel>
          <input
            type="range"
            min={0}
            max={100}
            value={edit.filterIntensity}
            onChange={(e) => onChange(patch(edit, { filterIntensity: Number(e.target.value) }))}
            className="w-full"
            disabled={edit.filterPreset === 'none'}
          />
        </div>
      );
    }

    if (tool === 'adjust') {
      const rows: Array<{ key: keyof typeof DEFAULT_ADJUSTMENTS; label: string; min: number; max: number }> = [
        { key: 'brightness', label: 'Brightness', min: 50, max: 150 },
        { key: 'contrast', label: 'Contrast', min: 50, max: 150 },
        { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
        { key: 'exposure', label: 'Exposure', min: -50, max: 50 },
        { key: 'temperature', label: 'Temperature', min: -100, max: 100 },
        { key: 'sharpness', label: 'Sharpness', min: 0, max: 100 },
        { key: 'fade', label: 'Fade', min: 0, max: 100 },
        { key: 'vignette', label: 'Vignette', min: 0, max: 100 },
      ];
      return (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.key}>
              <FieldLabel>
                {r.label} · {edit.adjustments[r.key]}
              </FieldLabel>
              <input
                type="range"
                min={r.min}
                max={r.max}
                value={edit.adjustments[r.key]}
                onChange={(e) =>
                  onChange(
                    patch(edit, {
                      adjustments: { ...edit.adjustments, [r.key]: Number(e.target.value) },
                    }),
                  )
                }
                className="w-full"
              />
            </div>
          ))}
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
            onClick={() => onChange(patch(edit, { adjustments: { ...DEFAULT_ADJUSTMENTS } }))}
          >
            Reset adjustments
          </button>
        </div>
      );
    }

    if (tool === 'audio') {
      return (
        <div className="space-y-3">
          <FieldLabel>Speed</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {SPEED_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(patch(edit, { speed: s }))}
                className={`rounded-full border px-3 py-1 text-[11px] font-bold ${
                  edit.speed === s ? 'border-primary bg-primary/10' : 'border-border'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <FieldLabel>Original volume · {Math.round(edit.volume * 100)}%</FieldLabel>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={edit.volume}
            onChange={(e) => onChange(patch(edit, { volume: Number(e.target.value), muted: false }))}
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
              onClick={() => onChange(patch(edit, { muted: !edit.muted }))}
            >
              {edit.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              {edit.muted ? 'Unmute original' : 'Mute original'}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              onClick={() => setMusicOpen(true)}
            >
              <Music2 size={14} />
              {edit.music ? 'Edit music' : 'Add music'}
            </button>
            {edit.music && (
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold"
                onClick={() => onChange(patch(edit, { music: null }))}
              >
                Remove music
              </button>
            )}
          </div>
          {edit.music && (
            <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
              <p className="font-bold">{edit.music.title}</p>
              <p className="text-muted-foreground">
                {edit.music.artist || 'Unknown'} · segment {formatDurationLabel(edit.music.startTime)}–
                {formatDurationLabel(edit.music.endTime ?? edit.music.duration)}
              </p>
            </div>
          )}
        </div>
      );
    }

    if (tool === 'cover') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-20 h-32 rounded-xl overflow-hidden bg-muted border border-border">
              {(edit.coverDataUrl || thumbnail) ? (
                <img src={edit.coverDataUrl || thumbnail} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImageIcon size={18} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={captureCoverAtPlayhead}
                className="block px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Use current frame
              </button>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="block px-3 py-2 rounded-xl border border-border text-xs font-bold"
              >
                Upload cover image
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  if (!f.type.startsWith('image/')) {
                    toast.error('Cover must be an image');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    const url = String(reader.result || '');
                    onChange(patch(edit, { coverDataUrl: url, coverTimeSec: null }));
                    onThumbnail(url);
                  };
                  reader.readAsDataURL(f);
                }}
              />
            </div>
          </div>
          <FieldLabel>Scrub to pick a frame</FieldLabel>
          <input
            type="range"
            min={trimStart}
            max={trimEnd}
            step={0.05}
            value={Math.min(Math.max(currentTime, trimStart), trimEnd)}
            onChange={(e) => {
              const t = Number(e.target.value);
              if (videoEl.current) videoEl.current.currentTime = t;
              setCurrentTime(t);
            }}
            className="w-full"
          />
        </div>
      );
    }

    if (tool === 'text') {
      return (
        <div className="space-y-3">
          <FieldLabel>Text</FieldLabel>
          <input
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            className={inputClass}
            maxLength={80}
          />
          <button
            type="button"
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
            onClick={() => {
              const text = textDraft.trim();
              if (!text) return;
              onChange(
                patch(edit, {
                  textOverlays: [
                    ...edit.textOverlays,
                    {
                      id: newOverlayId('txt'),
                      text,
                      x: 0.5,
                      y: 0.4,
                      fontSize: 22,
                      color: '#ffffff',
                      bg: 'rgba(0,0,0,0.35)',
                      opacity: 1,
                      align: 'center',
                      startSec: trimStart,
                      endSec: trimEnd,
                    },
                  ],
                }),
              );
            }}
          >
            Add text overlay
          </button>
          <div className="space-y-2">
            {edit.textOverlays.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5">
                <p className="flex-1 text-xs truncate">{t.text}</p>
                <button
                  type="button"
                  className="text-[11px] font-bold text-rose-500"
                  onClick={() =>
                    onChange(patch(edit, { textOverlays: edit.textOverlays.filter((x) => x.id !== t.id) }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tool === 'stickers') {
      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {EMOJI_STICKERS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="w-10 h-10 rounded-xl border border-border text-lg hover:bg-muted"
                onClick={() =>
                  onChange(
                    patch(edit, {
                      stickers: [
                        ...edit.stickers,
                        {
                          id: newOverlayId('stk'),
                          emoji,
                          x: 0.5,
                          y: 0.35,
                          scale: 1,
                          rotation: 0,
                          startSec: trimStart,
                          endSec: trimEnd,
                        },
                      ],
                    }),
                  )
                }
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {edit.stickers.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5">
                <span className="text-lg">{s.emoji}</span>
                <button
                  type="button"
                  className="ml-auto text-[11px] font-bold text-rose-500"
                  onClick={() =>
                    onChange(patch(edit, { stickers: edit.stickers.filter((x) => x.id !== s.id) }))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // details
    return (
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <FieldLabel>Title *</FieldLabel>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={aiLoading}
                onClick={suggestAiTitle}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline disabled:opacity-40"
              >
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                Suggest title
              </button>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {publishSettings.title.length}/200
              </span>
            </div>
          </div>
          <input
            value={publishSettings.title}
            onChange={(e) => onPublishSettings({ ...publishSettings, title: e.target.value })}
            className={inputClass}
            maxLength={200}
            placeholder="Reel title"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <FieldLabel>Caption</FieldLabel>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {publishSettings.description.length} characters
            </span>
          </div>
          <textarea
            value={publishSettings.description}
            onChange={(e) => onPublishSettings({ ...publishSettings, description: e.target.value })}
            className={`${inputClass} min-h-[90px] resize-none leading-relaxed`}
            placeholder="Write a caption... Add #hashtags or details"
          />
        </div>
        <div>
          <FieldLabel>Hashtags</FieldLabel>
          <input
            value={publishSettings.hashtags}
            onChange={(e) => onPublishSettings({ ...publishSettings, hashtags: e.target.value })}
            className={inputClass}
            placeholder="#reels #wevsoft"
          />
        </div>
        <div>
          <FieldLabel>Visibility</FieldLabel>
          <StepAudienceVisibility value={publishSettings} onChange={onPublishSettings} showHeading={false} showSafety={false} />
        </div>
        <div>
          <FieldLabel>Interactions</FieldLabel>
          <StepInteractionControls value={publishSettings} onChange={onPublishSettings} />
        </div>
      </div>
    );
  }, [
    tool,
    edit,
    onChange,
    trimStart,
    trimEnd,
    duration,
    currentTime,
    textDraft,
    publishSettings,
    onPublishSettings,
    aiLoading,
    thumbnail,
    onThumbnail,
  ]);

  return (
    <div className="flex flex-col md:flex-row gap-3 md:gap-5 min-h-0 h-full w-full">
      {/* Preview column */}
      <div className="md:flex-1 h-[36vh] max-h-[300px] md:h-full md:max-h-none md:min-h-0 bg-neutral-950 rounded-2xl border border-neutral-800 p-2.5 md:p-4 flex flex-col shrink-0 overflow-hidden shadow-inner">
        <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
          <div className="flex rounded-full bg-muted/80 p-0.5">
            <button
              type="button"
              onClick={() => onChange(patch(edit, { previewDevice: 'mobile' }))}
              className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                edit.previewDevice === 'mobile' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              Mobile
            </button>
            <button
              type="button"
              onClick={() => onChange(patch(edit, { previewDevice: 'desktop' }))}
              className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                edit.previewDevice === 'desktop' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'
              }`}
            >
              Desktop
            </button>
          </div>
          <button
            type="button"
            onClick={() => onChange(patch(edit, { showSafeArea: !edit.showSafeArea }))}
            className="text-[11px] font-bold text-muted-foreground hover:text-foreground"
          >
            Safe area {edit.showSafeArea ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden py-1">
          <ReelPreviewFrame src={previewUrl} edit={edit} onVideoRef={setVideoRef} className="h-full w-full" />
        </div>

        <div className="mt-2 flex items-center justify-center gap-3 shrink-0">
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-white/90 shadow"
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
            {playing ? 'Pause' : 'Play'}
          </button>
          <span className="text-[11px] text-white/70 tabular-nums">
            {formatDurationLabel(currentTime)} / {formatDurationLabel(duration)}
          </span>
        </div>
      </div>

      {/* Tools + properties */}
      <div className="w-full md:w-[420px] lg:w-[460px] flex flex-col min-h-0 h-full shrink-0">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2 shrink-0">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTool(t.id)}
              className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                tool === t.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted/50 text-muted-foreground border-border'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl border border-border bg-card/60 p-3 md:p-4">
          {panel}
        </div>
        <button
          type="button"
          className="mt-2 text-[11px] font-bold text-muted-foreground hover:text-foreground self-start"
          onClick={() => onChange(createReelEditState({ previewDevice: edit.previewDevice, showSafeArea: edit.showSafeArea }))}
        >
          Reset all edits
        </button>
      </div>

      <MusicPickerModal
        open={musicOpen}
        onClose={() => setMusicOpen(false)}
        value={
          edit.music
            ? {
                musicId: edit.music.musicId,
                startTime: edit.music.startTime,
                endTime: edit.music.endTime,
                volume: edit.music.volume,
                originalAudioMuted: edit.music.originalAudioMuted,
                title: edit.music.title,
                artist: edit.music.artist,
                coverImage: edit.music.coverImage,
                audioUrl: edit.music.audioUrl,
                duration: edit.music.duration,
              }
            : null
        }
        onApply={(sel) => {
          applyMusic(sel);
          setMusicOpen(false);
        }}
      />
    </div>
  );
}
