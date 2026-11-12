import React, { memo } from 'react';
import type { ReactionType } from '../../lib/reactions';
import { FACE_LAYERS, reactionImage, REACTION_ASSET_BASE } from './reactionLayout';
import './reactions.css';

/** `idle` rests, `hover` loops the reaction's own animation, `active` plays it once with a pop (on select). */
export type ReactionIconState = 'idle' | 'hover' | 'active';

const norm = (t: ReactionType | string): 'love' | 'haha' | 'wow' | 'sad' | 'angry' =>
  (t === 'like' ? 'love' : (t as any)) as any;

const pos = (b: readonly number[]): React.CSSProperties => ({ left: `${b[0]}%`, top: `${b[1]}%`, width: `${b[2]}%`, height: `${b[3]}%` });

function Layer({ id, name }: { id: string; name: string }) {
  const box = (FACE_LAYERS as any)[id][name] as readonly number[];
  return (
    <img
      className={`rx-l rx-${name}`}
      src={`${REACTION_ASSET_BASE}/${id}-${name}.webp`}
      alt=""
      draggable={false}
      decoding="async"
      style={pos(box)}
    />
  );
}

function FaceBody({ id }: { id: 'haha' | 'wow' | 'sad' | 'angry' }) {
  const names = Object.keys(FACE_LAYERS[id]);
  const has = (n: string) => names.includes(n);
  const tearBox = (FACE_LAYERS.sad as any).tear as readonly number[];
  return (
    <span className="rx-body">
      <img className="rx-plate" src={`${REACTION_ASSET_BASE}/${id}-plate.webp`} alt="" draggable={false} decoding="async" />
      {id === 'angry' && <span className="rx-heat" />}
      {has('browL') && <Layer id={id} name="browL" />}
      {has('browR') && <Layer id={id} name="browR" />}
      {has('eyeL') && <Layer id={id} name="eyeL" />}
      {has('eyeR') && <Layer id={id} name="eyeR" />}
      {id === 'sad' && (
        <>
          <span className="rx-wet rx-wetL" style={pos((FACE_LAYERS.sad as any).eyeL)} />
          <span className="rx-wet rx-wetR" style={pos((FACE_LAYERS.sad as any).eyeR)} />
        </>
      )}
      {has('mouth') && <Layer id={id} name="mouth" />}
      {id === 'sad' && (
        <>
          <Layer id="sad" name="tear" />
          <img
            className="rx-l rx-tear2"
            src={`${REACTION_ASSET_BASE}/sad-tear.webp`}
            alt=""
            draggable={false}
            decoding="async"
            style={{ ...pos([100 - tearBox[0] - tearBox[2], tearBox[1], tearBox[2], tearBox[3]]) }}
          />
        </>
      )}
    </span>
  );
}

function ReactionIconImpl({
  type,
  size = 24,
  state = 'idle',
  playKey,
  className = '',
  staticImage = false,
}: {
  type: ReactionType | string;
  size?: number | string;
  state?: ReactionIconState;
  /** Change to replay the one-shot `active` animation. */
  playKey?: string | number;
  className?: string;
  /** Plain cut-out image (no layers) — for summaries/lists where nothing animates. */
  staticImage?: boolean;
}) {
  const id = norm(type);
  const px = typeof size === 'number' ? `${size}px` : size;
  const style = { width: px, height: px } as React.CSSProperties;
  if (staticImage) {
    return <img src={reactionImage(id)} alt="" draggable={false} className={`rx-static ${className}`} style={{ width: px, height: px }} />;
  }
  return (
    <span key={state === 'active' ? playKey : undefined} className={`rx-face rx-${id} ${className}`} data-state={state} style={style} aria-hidden="true">
      {id === 'love' ? (
        <>
          <span className="rx-glow" />
          <span className="rx-body"><img className="rx-plate" src={`${REACTION_ASSET_BASE}/love.webp`} alt="" draggable={false} decoding="async" /></span>
          <span className="rx-minis">
            <img src={`${REACTION_ASSET_BASE}/love.webp`} alt="" draggable={false} style={{ ['--dx' as any]: '-70%', ['--r' as any]: '-18deg', animationDelay: '0s' }} />
            <img src={`${REACTION_ASSET_BASE}/love.webp`} alt="" draggable={false} style={{ ['--dx' as any]: '55%', ['--r' as any]: '14deg', animationDelay: '.35s' }} />
            <img src={`${REACTION_ASSET_BASE}/love.webp`} alt="" draggable={false} style={{ ['--dx' as any]: '6%', ['--r' as any]: '6deg', animationDelay: '.7s' }} />
          </span>
        </>
      ) : (
        <>
          <FaceBody id={id} />
          {id === 'angry' && (
            <span className="rx-steam">
              <i className="l1" /><i className="l2" /><i className="r1" /><i className="r2" />
            </span>
          )}
        </>
      )}
    </span>
  );
}

export const ReactionIcon = memo(ReactionIconImpl);
export default ReactionIcon;
