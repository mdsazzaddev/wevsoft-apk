import { describe, expect, it } from 'vitest';
import { sanitizeOverlay, toStudioConfig, parseStudioConfig } from './serialize';
import {
  newCountdownOverlay,
  newDrawOverlay,
  newGifOverlay,
  newHashtagOverlay,
  newLinkOverlay,
  newLocationOverlay,
  newMediaSlide,
  newMentionOverlay,
  newMusicOverlay,
  newQuestionOverlay,
  newTextOverlay,
  uid,
} from './types';

describe('IG story overlay serialize', () => {
  it('sanitizes draw overlays with strokes', () => {
    const draw = newDrawOverlay({
      strokes: [
        {
          id: uid('stk'),
          color: '#ef4444',
          width: 16,
          points: [
            { x: 10, y: 20 },
            { x: 30, y: 40 },
          ],
        },
        {
          id: uid('stk'),
          color: '#ffffff',
          width: 8,
          points: [{ x: 100, y: 200 }],
          eraser: true,
        },
      ],
    });
    const clean = sanitizeOverlay(draw);
    expect(clean?.kind).toBe('draw');
    expect(clean?.strokes).toHaveLength(2);
    expect(clean?.strokes?.[0].color).toBe('#ef4444');
    expect(clean?.strokes?.[0].points).toEqual([
      { x: 10, y: 20 },
      { x: 30, y: 40 },
    ]);
    expect(clean?.strokes?.[1].eraser).toBe(true);
  });

  it('drops empty stroke lists points and keeps valid draw layer', () => {
    const clean = sanitizeOverlay({
      kind: 'draw',
      id: 'ov1',
      strokes: [{ id: 's1', color: '#fff', width: 4, points: [] }, { id: 's2', color: '#00ff00', width: 10, points: [{ x: 1, y: 2 }] }],
      x: 0,
      y: 0,
      w: 1080,
      h: 1920,
    });
    expect(clean?.kind).toBe('draw');
    expect(clean?.strokes).toHaveLength(1);
    expect(clean?.strokes?.[0].points[0]).toEqual({ x: 1, y: 2 });
  });

  it('sanitizes mention and hashtag meta on text overlays', () => {
    const mention = sanitizeOverlay(newMentionOverlay('alice', 'user_1'));
    expect(mention?.kind).toBe('text');
    expect(mention?.text).toBe('@alice');
    expect(mention?.meta).toEqual({ type: 'mention', userId: 'user_1', tag: 'alice' });

    const tag = sanitizeOverlay(newHashtagOverlay('wevsoft'));
    expect(tag?.text).toBe('#wevsoft');
    expect(tag?.meta).toEqual({ type: 'hashtag', tag: 'wevsoft' });
  });

  it('round-trips draw + mention through studio config', () => {
    const slide = newMediaSlide(
      { url: '/uploads/x.jpg', type: 'image', name: 'x', mediaId: 'm1' },
      {
        overlays: [
          newDrawOverlay({
            strokes: [{ id: 's1', color: '#ffffff', width: 12, points: [{ x: 5, y: 5 }, { x: 50, y: 60 }] }],
          }),
          newMentionOverlay('bob'),
          newTextOverlay('hello'),
        ],
      },
    );
    const cfg = toStudioConfig(slide);
    const json = JSON.stringify({ studio: cfg });
    const parsed = parseStudioConfig(json);
    expect(parsed).not.toBeNull();
    expect(parsed!.overlays.some((o) => o.kind === 'draw' && (o.strokes?.length || 0) > 0)).toBe(true);
    expect(parsed!.overlays.some((o) => o.meta?.type === 'mention')).toBe(true);
  });

  it('ignores unknown meta types', () => {
    const clean = sanitizeOverlay({
      ...newTextOverlay('x'),
      meta: { type: 'location', tag: 'dhaka' },
    });
    expect(clean?.meta).toBeUndefined();
  });

  it('sanitizes Phase-2 sticker overlays', () => {
    expect(sanitizeOverlay(newQuestionOverlay('Hi?'))?.kind).toBe('question');
    expect(sanitizeOverlay(newCountdownOverlay('Eid'))?.sticker?.endsAt).toBeTruthy();
    expect(sanitizeOverlay(newLinkOverlay('example.com'))?.sticker?.url).toMatch(/^https:\/\//);
    expect(sanitizeOverlay(newLocationOverlay('Dhaka'))?.sticker?.placeName).toBe('Dhaka');
    expect(sanitizeOverlay(newMusicOverlay({ title: 'Song', musicUrl: '/uploads/a.mp3' }))?.sticker?.musicUrl).toBe(
      '/uploads/a.mp3',
    );
    expect(sanitizeOverlay(newGifOverlay('https://media.tenor.com/x.gif'))?.kind).toBe('gif');
  });
});
