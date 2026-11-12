import type { ReactionType } from '../../lib/reactions';

/**
 * Layer geometry for the layered 3D reaction faces, in % of the (square) face box.
 * Extracted from the design reference: `<id>-plate.webp` is the blank glossy face and each
 * layer (`<id>-<name>.webp`) is a feature cut out of the same artwork, so the resting
 * state is pixel-identical to the reference while each part can animate on its own.
 */
export type LayerBox = readonly [left: number, top: number, width: number, height: number];

export const FACE_LAYERS: Record<'haha' | 'wow' | 'sad' | 'angry', Record<string, LayerBox>> = {
  haha: {
    eyeR: [53.71, 24.382, 24.028, 25.795],
    eyeL: [20.495, 24.735, 24.028, 26.148],
    mouth: [15.194, 49.117, 67.845, 39.223],
  },
  wow: {
    browL: [19.366, 19.014, 16.549, 8.099],
    browR: [64.437, 19.014, 14.789, 6.338],
    eyeL: [23.239, 29.577, 17.254, 22.887],
    eyeR: [59.155, 29.577, 17.606, 22.887],
    mouth: [36.972, 55.634, 25.352, 32.042],
  },
  sad: {
    browL: [15.972, 21.528, 21.528, 17.708],
    browR: [62.5, 21.528, 21.528, 17.361],
    eyeL: [25.347, 33.681, 16.319, 22.917],
    eyeR: [57.986, 33.681, 17.014, 22.917],
    mouth: [38.194, 64.236, 29.514, 17.361],
    tear: [11.458, 50, 28.819, 43.75],
  },
  angry: {
    eyeL: [29.474, 40.702, 16.491, 23.509],
    browL: [21.053, 33.333, 25.614, 20.351],
    eyeR: [55.088, 40.702, 16.842, 23.509],
    browR: [54.386, 33.333, 25.965, 20.351],
    mouth: [31.579, 64.211, 37.544, 18.596],
  },
};

export const REACTION_ASSET_BASE = '/reactions';

export function reactionImage(type: ReactionType | string): string {
  const id = type === 'like' ? 'love' : type;
  return `${REACTION_ASSET_BASE}/${id}.webp`;
}

let preloaded = false;
/** Warm the browser cache for every layer so hover/animate never pops in. Idempotent. */
export function preloadReactionAssets(): void {
  if (preloaded || typeof window === 'undefined') return;
  preloaded = true;
  const urls: string[] = [`${REACTION_ASSET_BASE}/love.webp`];
  (Object.keys(FACE_LAYERS) as (keyof typeof FACE_LAYERS)[]).forEach((id) => {
    urls.push(`${REACTION_ASSET_BASE}/${id}.webp`, `${REACTION_ASSET_BASE}/${id}-plate.webp`);
    Object.keys(FACE_LAYERS[id]).forEach((l) => urls.push(`${REACTION_ASSET_BASE}/${id}-${l}.webp`));
  });
  const run = () => urls.forEach((u) => { const i = new Image(); i.decoding = 'async'; i.src = u; });
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void) => void);
  if (ric) ric(run); else window.setTimeout(run, 300);
}
