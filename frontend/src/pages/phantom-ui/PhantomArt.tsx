import { useState } from 'react';

/**
 * Original Phantom artwork. Uses generated raster art from /phantom/*.webp when present,
 * otherwise falls back to the hand-built SVG scenes below (no third-party art).
 */
export function ArtImage({ name, className, fallback }: { name: string; className?: string; fallback: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img src={`/phantom/${name}.webp`} alt="" aria-hidden className={`${className || ''} ph-art-${name}`} onError={() => setFailed(true)} draggable={false} />;
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Ruined-city skyline silhouette, deterministic. */
export function Skyline({ seed = 7, height = 260, width = 1200, color = '#07080b', glow = '#ff2638', windows = true }: { seed?: number; height?: number; width?: number; color?: string; glow?: string; windows?: boolean }) {
  const r = rng(seed);
  const blds: Array<{ x: number; w: number; h: number; spire: boolean }> = [];
  let x = 0;
  while (x < width) { const w = 18 + r() * 60; blds.push({ x, w, h: height * (0.25 + r() * 0.75), spire: r() > 0.8 }); x += w - 2; }
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMax slice" className="ph-skyline" aria-hidden>
      {blds.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={height - b.h} width={b.w} height={b.h} fill={color} />
          {b.spire && <rect x={b.x + b.w / 2 - 1.5} y={height - b.h - 26} width={3} height={26} fill={color} />}
          {windows && Array.from({ length: Math.floor(b.h / 22) }).map((_, j) => (r() > 0.83 ? <rect key={j} x={b.x + 4 + r() * (b.w - 10)} y={height - b.h + 8 + j * 22} width={3} height={4} fill={glow} opacity={0.35 + r() * 0.5} /> : null))}
        </g>
      ))}
    </svg>
  );
}

/** Hooded phantom figure with glowing eyes. */
export function HoodedFigure({ className, eyes = '#ff2638' }: { className?: string; eyes?: string }) {
  return (
    <svg viewBox="0 0 400 460" className={className} aria-hidden>
      <defs>
        <radialGradient id="phHoodShade" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#2a0a0e" />
          <stop offset="60%" stopColor="#110407" />
          <stop offset="100%" stopColor="#050203" />
        </radialGradient>
        <radialGradient id="phFace" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#000" />
          <stop offset="100%" stopColor="#0a0204" />
        </radialGradient>
        <filter id="phEyeGlow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="phRim" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ff2638" stopOpacity=".55" /><stop offset="30%" stopColor="#ff2638" stopOpacity="0" /><stop offset="70%" stopColor="#ff2638" stopOpacity="0" /><stop offset="100%" stopColor="#ff2638" stopOpacity=".55" /></linearGradient>
      </defs>
      <path d="M200 18 C120 22 78 92 74 170 C70 236 58 280 18 330 C0 352 0 460 0 460 L400 460 C400 460 400 352 382 330 C342 280 330 236 326 170 C322 92 280 14 200 18 Z" fill="url(#phHoodShade)" />
      <path d="M200 18 C120 22 78 92 74 170 C70 236 58 280 18 330 C0 352 0 460 0 460 L400 460 C400 460 400 352 382 330 C342 280 330 236 326 170 C322 92 280 14 200 18 Z" fill="url(#phRim)" />
      <path d="M200 70 C146 74 120 126 122 182 C124 236 156 286 200 300 C244 286 276 236 278 182 C280 126 254 66 200 70 Z" fill="url(#phFace)" />
      <path d="M150 300 C170 330 230 330 250 300 L270 460 L130 460 Z" fill="#070203" opacity=".9" />
      <g filter="url(#phEyeGlow)">
        <path d="M160 190 L188 196 L184 202 L162 198 Z" fill={eyes} />
        <path d="M240 190 L212 196 L216 202 L238 198 Z" fill={eyes} />
      </g>
    </svg>
  );
}

/** Small round ghost avatar (hood + eyes) used for every phantom identity. */
export function GhostAvatar({ size = 36, ring = true }: { size?: number; ring?: boolean }) {
  return (
    <span className={`ph-ghost-av${ring ? ' ring' : ''}`} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 40 40" width="100%" height="100%">
        <circle cx="20" cy="20" r="20" fill="#1a0507" />
        <path d="M20 6 C12 6 9 13 9 20 C9 26 7 30 4 34 L36 34 C33 30 31 26 31 20 C31 13 28 6 20 6 Z" fill="#050203" />
        <path d="M20 12 C15 12 13.5 16 13.5 20 C13.5 24 16 27 20 28 C24 27 26.5 24 26.5 20 C26.5 16 25 12 20 12 Z" fill="#000" />
        <rect x="15" y="19" width="3.4" height="1.4" rx=".7" fill="#ff2638" />
        <rect x="21.6" y="19" width="3.4" height="1.4" rx=".7" fill="#ff2638" />
      </svg>
    </span>
  );
}

/** Full scene: red sky, moon, skyline and the hooded figure. */
export function HeroScene() {
  return (
    <div className="ph-scene">
      <div className="ph-scene-sky" />
      <div className="ph-scene-moon" />
      <div className="ph-scene-city"><Skyline seed={11} height={340} /></div>
      <HoodedFigure className="ph-scene-figure" />
      <div className="ph-scene-embers" />
    </div>
  );
}

export function CityScene({ seed = 3, sign = false }: { seed?: number; sign?: boolean }) {
  return (
    <div className="ph-city-scene">
      <div className="ph-scene-sky" />
      <div className="ph-city-far"><Skyline seed={seed + 5} height={420} color="#1a0507" windows={false} /></div>
      <div className="ph-city-near"><Skyline seed={seed} height={300} /></div>
      {sign && <div className="ph-neon"><span className="ph-neon-w">W</span><span>WEVSOFT</span><span>PHANTOM</span></div>}
      <div className="ph-water" />
    </div>
  );
}

export function WMark({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 24" width={size * 1.33} height={size} aria-hidden>
      <path d="M1 2 L7 2 L11 15 L15 4 L17 4 L21 15 L25 2 L31 2 L23 22 L19 22 L16 12 L13 22 L9 22 Z" fill="#ff2638" />
    </svg>
  );
}
