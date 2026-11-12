import { MAX_SLIDE_SECONDS, MIN_SLIDE_SECONDS, clamp, type Slide } from './types';

/** Seconds a slide is on screen. Videos play their natural length (1.5–60 s, same as StoryViewer). */
export function slideDuration(slide: Pick<Slide, 'media' | 'duration'>): number {
  if (slide.media?.type === 'video') {
    const d = slide.media.naturalDuration;
    return d && Number.isFinite(d) ? clamp(d, 1.5, 60) : 5;
  }
  return clamp(slide.duration, MIN_SLIDE_SECONDS, MAX_SLIDE_SECONDS);
}

export function slideOffsets(slides: Slide[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (const s of slides) {
    out.push(t);
    t += slideDuration(s);
  }
  return out;
}

export function totalDuration(slides: Slide[]): number {
  return slides.reduce((a, s) => a + slideDuration(s), 0);
}

/** Which slide is on screen at project time `t` and how far into it we are. */
export function slideAtTime(slides: Slide[], t: number): { index: number; local: number } {
  if (!slides.length) return { index: -1, local: 0 };
  const total = totalDuration(slides);
  const time = clamp(t, 0, Math.max(0, total));
  let acc = 0;
  for (let i = 0; i < slides.length; i += 1) {
    const d = slideDuration(slides[i]);
    if (time < acc + d || i === slides.length - 1) {
      return { index: i, local: clamp(time - acc, 0, d) };
    }
    acc += d;
  }
  return { index: slides.length - 1, local: 0 };
}

/** mm:ss */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
