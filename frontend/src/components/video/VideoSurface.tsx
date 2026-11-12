import React from 'react';
import type { VideoPresentation } from '../../lib/videoPresentation';

interface VideoSurfaceProps {
  presentation: VideoPresentation;
  poster?: string;
  brightness?: number;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function VideoSurface({
  presentation,
  poster,
  brightness = 1,
  children,
  className = '',
  style,
}: VideoSurfaceProps) {
  const { mode, background } = presentation;
  
  const showBlur = background === 'blur' && poster;
  const showSolid = background === 'solid' || (background === 'blur' && !poster);

  return (
    <div 
      className={`relative overflow-hidden w-full h-full flex items-center justify-center ${showSolid ? 'bg-black' : ''} ${className}`}
      style={style}
    >
      {showBlur && (
        <img
          src={poster}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 z-0 w-full h-full scale-125 object-cover opacity-50 pointer-events-none select-none"
          style={{ filter: `brightness(${brightness}) blur(40px)` }}
        />
      )}
      <div className={`relative z-10 w-full h-full flex items-center justify-center`}>
        {children}
      </div>
    </div>
  );
}
