import { describe, expect, it } from 'vitest';
import { canRedo, canUndo, createEditorState, reduce, selectedOverlay, selectedSlide, type Action, type EditorState } from './projectReducer';
import { newMediaSlide, newProject, newSticker, newTextOverlay, newTextSlide, MAX_SLIDES } from './types';
import { slideAtTime, slideDuration, slideOffsets, totalDuration, formatClock } from './timing';
import { buildFilterCss, presetAtIntensity, temperatureTint, vignetteCss } from './filters';
import { draftKey, mergeConfigJson, parseDraft, parseStudioConfig, serializeDraft, toStudioConfig } from './serialize';

const img = (name: string, duration = 5) => newMediaSlide({ url: `/uploads/${name}.jpg`, type: 'image', name, mediaId: name }, { duration });
const vid = (name: string, nat: number) => newMediaSlide({ url: `/uploads/${name}.mp4`, type: 'video', name, mediaId: name, naturalDuration: nat });

function run(actions: Action[], start?: EditorState): EditorState {
  return actions.reduce((s, a) => reduce(s, a), start ?? createEditorState(newProject()));
}

describe('project reducer', () => {
  it('adds slides, selects the new one and supports undo/redo', () => {
    const a = img('a');
    const b = img('b');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }, { type: 'addSlide', slide: b, at: 2 }]);
    expect(s.doc.slides.map((x) => x.id)).toEqual([a.id, b.id]);
    expect(s.selectedSlideId).toBe(b.id);
    expect(canUndo(s)).toBe(true);
    s = reduce(s, { type: 'undo' });
    expect(s.doc.slides).toHaveLength(1);
    expect(canRedo(s)).toBe(true);
    s = reduce(s, { type: 'redo' });
    expect(s.doc.slides).toHaveLength(2);
    expect(canRedo(s)).toBe(false);
  });

  it('a new edit clears the redo stack', () => {
    let s = run([{ type: 'addSlide', slide: img('a'), at: 1 }, { type: 'addSlide', slide: img('b'), at: 2 }, { type: 'undo' }]);
    expect(canRedo(s)).toBe(true);
    s = reduce(s, { type: 'rename', name: 'Trip', at: 3 });
    expect(canRedo(s)).toBe(false);
    expect(s.doc.name).toBe('Trip');
  });

  it('reorders and duplicates slides (duplicate gets fresh ids, overlays copied)', () => {
    const a = img('a');
    const b = img('b');
    const c = img('c');
    let s = run([a, b, c].map((slide, i) => ({ type: 'addSlide', slide, at: i }) as Action));
    s = reduce(s, { type: 'moveSlide', id: c.id, toIndex: 0, at: 10 });
    expect(s.doc.slides.map((x) => x.media?.name)).toEqual(['c', 'a', 'b']);
    s = reduce(s, { type: 'addOverlay', slideId: a.id, overlay: newTextOverlay('Hi'), at: 11 });
    s = reduce(s, { type: 'duplicateSlide', id: a.id, at: 12 });
    expect(s.doc.slides).toHaveLength(4);
    const copy = s.doc.slides[2];
    expect(copy.id).not.toBe(a.id);
    expect(copy.overlays[0].text).toBe('Hi');
    expect(copy.overlays[0].id).not.toBe(s.doc.slides[1].overlays[0].id);
    expect(s.selectedSlideId).toBe(copy.id);
  });

  it('removing the selected slide selects a neighbour', () => {
    const a = img('a');
    const b = img('b');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }, { type: 'addSlide', slide: b, at: 2 }]);
    s = reduce(s, { type: 'removeSlide', id: b.id, at: 3 });
    expect(s.selectedSlideId).toBe(a.id);
    s = reduce(s, { type: 'removeSlide', id: a.id, at: 4 });
    expect(s.doc.slides).toHaveLength(0);
    expect(s.selectedSlideId).toBeNull();
  });

  it('caps slide count', () => {
    let s = createEditorState(newProject());
    for (let i = 0; i < MAX_SLIDES + 5; i += 1) s = reduce(s, { type: 'addSlide', slide: img(`s${i}`), at: i });
    expect(s.doc.slides).toHaveLength(MAX_SLIDES);
  });

  it('clamps slide duration and coalesces slider drags into one undo step', () => {
    const a = img('a');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }]);
    s = reduce(s, { type: 'updateSlide', id: a.id, patch: { duration: 7 }, coalesce: 'dur', at: 1000 });
    s = reduce(s, { type: 'updateSlide', id: a.id, patch: { duration: 8 }, coalesce: 'dur', at: 1100 });
    s = reduce(s, { type: 'updateSlide', id: a.id, patch: { duration: 99 }, coalesce: 'dur', at: 1200 });
    expect(selectedSlide(s)?.duration).toBe(15);
    s = reduce(s, { type: 'undo' });
    expect(selectedSlide(s)?.duration).toBe(5);
  });

  it('does not coalesce when the pause is long or the key differs', () => {
    const a = img('a');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }]);
    s = reduce(s, { type: 'updateSlide', id: a.id, patch: { duration: 6 }, coalesce: 'dur', at: 1000 });
    s = reduce(s, { type: 'updateSlide', id: a.id, patch: { duration: 7 }, coalesce: 'dur', at: 5000 });
    s = reduce(s, { type: 'undo' });
    expect(selectedSlide(s)?.duration).toBe(6);
  });

  it('overlay lifecycle: add, update (clamped), duplicate, layer order, remove', () => {
    const a = img('a');
    const t = newTextOverlay('One');
    const st = newSticker('🔥');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }, { type: 'addOverlay', slideId: a.id, overlay: t, at: 2 }, { type: 'addOverlay', slideId: a.id, overlay: st, at: 3 }]);
    expect(selectedOverlay(s)?.id).toBe(st.id);
    s = reduce(s, { type: 'updateOverlay', slideId: a.id, overlayId: t.id, patch: { opacity: 500, fontSize: 1 }, at: 4 });
    const updated = selectedSlide(s)!.overlays.find((o) => o.id === t.id)!;
    expect(updated.opacity).toBe(100);
    expect(updated.fontSize).toBe(12);
    s = reduce(s, { type: 'moveOverlayLayer', slideId: a.id, overlayId: t.id, toIndex: 1, at: 5 });
    expect(selectedSlide(s)!.overlays.map((o) => o.id)).toEqual([st.id, t.id]);
    s = reduce(s, { type: 'duplicateOverlay', slideId: a.id, overlayId: t.id, at: 6 });
    expect(selectedSlide(s)!.overlays).toHaveLength(3);
    s = reduce(s, { type: 'removeOverlay', slideId: a.id, overlayId: st.id, at: 7 });
    expect(selectedSlide(s)!.overlays).toHaveLength(2);
    s = reduce(s, { type: 'undo' });
    expect(selectedSlide(s)!.overlays).toHaveLength(3);
  });

  it('undo keeps selection valid when the selected overlay disappears', () => {
    const a = img('a');
    const t = newTextOverlay('One');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }, { type: 'addOverlay', slideId: a.id, overlay: t, at: 2 }]);
    s = reduce(s, { type: 'undo' });
    expect(s.selectedOverlayId).toBeNull();
  });

  it('markPublished is not an undoable edit', () => {
    const a = img('a');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }]);
    const pastLen = s.past.length;
    s = reduce(s, { type: 'markPublished', slideId: a.id, storyId: 'story1' });
    expect(s.doc.slides[0].publishedStoryId).toBe('story1');
    expect(s.past.length).toBe(pastLen);
  });

  it('resetAdjust restores neutral filter/adjust/effects', () => {
    const a = img('a');
    let s = run([{ type: 'addSlide', slide: a, at: 1 }]);
    s = reduce(s, { type: 'updateSlide', id: a.id, patch: { filterId: 'vivid', adjust: { ...a.adjust, brightness: 140 }, effects: { vignette: 50, grain: 20 } }, at: 2 });
    s = reduce(s, { type: 'resetAdjust', id: a.id, at: 3 });
    const sl = selectedSlide(s)!;
    expect(sl.filterId).toBe('none');
    expect(sl.adjust.brightness).toBe(100);
    expect(sl.effects.vignette).toBe(0);
  });
});

describe('slide timing', () => {
  const slides = [img('a', 5), vid('v', 12), img('b', 4)];
  it('uses natural length for video and the duration for images', () => {
    expect(slideDuration(slides[0])).toBe(5);
    expect(slideDuration(slides[1])).toBe(12);
    expect(slideDuration(vid('long', 500))).toBe(60);
    expect(slideDuration(vid('short', 0.2))).toBe(1.5);
    expect(slideDuration(img('x', 99))).toBe(15);
  });
  it('computes offsets, total and slide at time', () => {
    expect(slideOffsets(slides)).toEqual([0, 5, 17]);
    expect(totalDuration(slides)).toBe(21);
    expect(slideAtTime(slides, 0)).toEqual({ index: 0, local: 0 });
    expect(slideAtTime(slides, 5)).toEqual({ index: 1, local: 0 });
    expect(slideAtTime(slides, 16.5)).toEqual({ index: 1, local: 11.5 });
    expect(slideAtTime(slides, 999)).toEqual({ index: 2, local: 4 });
    expect(slideAtTime([], 3)).toEqual({ index: -1, local: 0 });
  });
  it('formats mm:ss', () => {
    expect(formatClock(21)).toBe('00:21');
    expect(formatClock(75.4)).toBe('01:15');
  });
});

describe('filters', () => {
  const base = newMediaSlide({ url: '/a.jpg', type: 'image', name: 'a' });
  it('is "none" for a neutral slide', () => {
    expect(buildFilterCss(base)).toBe('none');
  });
  it('combines preset and adjustments', () => {
    const css = buildFilterCss({ ...base, filterId: 'mono', adjust: { ...base.adjust, brightness: 120 } });
    expect(css).toContain('grayscale(1)');
    expect(css).toContain('brightness(1.2)');
  });
  it('scales a preset by intensity', () => {
    expect(presetAtIntensity('mono', 50).grayscale).toBeCloseTo(0.5);
    expect(presetAtIntensity('mono', 0).grayscale).toBe(0);
    expect(buildFilterCss({ ...base, filterId: 'mono', filterIntensity: 0 })).toBe('none');
  });
  it('temperature + vignette helpers', () => {
    expect(temperatureTint(0)).toBeNull();
    expect(temperatureTint(50)?.color).toBe('#ff9a3c');
    expect(temperatureTint(-50)?.color).toBe('#3c8cff');
    expect(vignetteCss({ vignette: 0 })).toBeNull();
    expect(vignetteCss({ vignette: 60 })).toContain('radial-gradient');
  });
});

describe('serialisation', () => {
  it('round-trips a studio config and hides invisible layers', () => {
    const s = img('a');
    s.overlays = [newTextOverlay('shown'), newTextOverlay('hidden', { visible: false })];
    s.filterId = 'warm';
    const cfg = toStudioConfig(s);
    expect(cfg.overlays).toHaveLength(1);
    const parsed = parseStudioConfig(JSON.stringify({ studio: cfg }));
    expect(parsed?.filterId).toBe('warm');
    expect(parsed?.overlays[0].text).toBe('shown');
  });
  it('rejects non-studio config such as the video thumbnail json', () => {
    expect(parseStudioConfig('{"thumbnailUrl":"/t.jpg"}')).toBeNull();
    expect(parseStudioConfig('not json')).toBeNull();
    expect(parseStudioConfig(null)).toBeNull();
  });
  it('mergeConfigJson keeps the thumbnail', () => {
    const merged = JSON.parse(mergeConfigJson('{"thumbnailUrl":"/t.jpg"}', toStudioConfig(img('a'))));
    expect(merged.thumbnailUrl).toBe('/t.jpg');
    expect(merged.studio.v).toBe(1);
  });
  it('clamps hostile numbers', () => {
    const cfg = parseStudioConfig(JSON.stringify({ studio: { v: 1, zoom: 99, duration: -4, adjust: { brightness: 9999 }, overlays: [{ text: 'x', fontSize: 99999, color: 'javascript:1' }] } }));
    expect(cfg?.zoom).toBe(3);
    expect(cfg?.duration).toBe(1);
    expect(cfg?.adjust.brightness).toBe(200);
    expect(cfg?.overlays[0].fontSize).toBe(600);
    expect(cfg?.overlays[0].color).toBe('#ffffff');
  });
  it('draft round-trip drops blob: media and keeps server media', () => {
    const keep = img('keep');
    const blob = newMediaSlide({ url: 'blob:http://x/1', type: 'image', name: 'b' });
    const text = newTextSlide();
    const doc = newProject({ name: 'Trip', slides: [keep, blob, text] });
    const back = parseDraft(serializeDraft(doc, 1234));
    expect(back?.savedAt).toBe(1234);
    expect(back?.doc.name).toBe('Trip');
    expect(back?.doc.slides.map((s) => s.kind)).toEqual(['media', 'text']);
    expect(back?.doc.slides[0].media?.url).toBe('/uploads/keep.jpg');
  });
  it('parseDraft refuses garbage and keys are scoped per user/space', () => {
    expect(parseDraft('{"v":9}')).toBeNull();
    expect(parseDraft('oops')).toBeNull();
    expect(draftKey('u1')).not.toBe(draftKey('u1', 'sp1'));
    expect(draftKey('u1')).not.toBe(draftKey('u2'));
  });
});

describe('refreshMediaUrls', () => {
  it('rewrites stale media urls in the doc and in undo/redo history, without adding an undo step', () => {
    const v = vid('v', 10);
    let s = run([{ type: 'addSlide', slide: v, at: 1 }, { type: 'updateSlide', id: v.id, patch: { fit: 'contain' }, at: 5000 }]);
    const pastLen = s.past.length;
    s = reduce(s, { type: 'refreshMediaUrls', urls: { v: '/uploads/opt-v.mp4' } });
    expect(s.doc.slides[0].media?.url).toBe('/uploads/opt-v.mp4');
    expect(s.past).toHaveLength(pastLen);
    expect(s.past.every((d) => d.slides.every((x) => x.media?.url === '/uploads/opt-v.mp4'))).toBe(true);
    const same = reduce(s, { type: 'refreshMediaUrls', urls: { v: '/uploads/opt-v.mp4' } });
    expect(same).toBe(s);
  });
});
