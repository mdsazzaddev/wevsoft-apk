import React, { useState, useRef, useEffect } from 'react';
import { X, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { motion } from 'motion/react';

interface CoverPhotoEditorProps {
  imageUrl: string;
  initialScale?: number;
  initialX?: number;
  initialY?: number;
  onSave: (config: { url: string; scale: number; x: number; y: number }) => void;
  onCancel: () => void;
}

export function CoverPhotoEditor({
  imageUrl,
  initialScale = 1.0,
  initialX = 0.5,
  initialY = 0.5,
  onSave,
  onCancel,
}: CoverPhotoEditorProps) {
  const [scale, setScale] = useState(initialScale);
  const [position, setPosition] = useState({ x: initialX, y: initialY });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startPercentage = useRef({ x: position.x, y: position.y });
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    startPercentage.current = { ...position };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const container = containerRef.current.getBoundingClientRect();
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    
    const pxToPctX = dx / (container.width * scale);
    const pxToPctY = dy / (container.height * scale);
    
    const newX = Math.max(0, Math.min(1, startPercentage.current.x - pxToPctX));
    const newY = Math.max(0, Math.min(1, startPercentage.current.y - pxToPctY));
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((s) => Math.max(1, Math.min(3, s + delta)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h3 className="font-bold text-lg">Reposition Cover Photo</h3>
          <button onClick={onCancel} className="p-2 rounded-full hover:bg-muted transition-colors"><X size={20} /></button>
        </div>
        
        <div className="p-6 flex-1 flex flex-col gap-6">
          <p className="text-sm text-muted-foreground text-center">Drag to reposition. Use scroll wheel or slider to zoom.</p>
          
          <div 
            ref={containerRef}
            // Same frame as the desktop profile cover (820:312).
            className="w-full aspect-[820/312] rounded-2xl overflow-hidden relative cursor-move bg-muted shadow-inner select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{
              touchAction: 'none'
            }}
          >
            <div 
              className="w-full h-full"
              style={{
                backgroundImage: `url(${JSON.stringify(imageUrl)})`,
                // Mirrors coverBackground() on the profile pages: fill, then zoom.
                backgroundSize: 'cover',
                backgroundPosition: `${position.x * 100}% ${position.y * 100}%`,
                backgroundRepeat: 'no-repeat',
                transform: `scale(${scale})`,
                transformOrigin: `${position.x * 100}% ${position.y * 100}%`,
                transition: isDragging ? 'none' : 'background-position 0.1s ease-out'
              }}
            />
            {/* Phones show the centre 16:9 of this frame (full height, ~68% width). */}
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[67.6%] pointer-events-none border-x-2 border-dashed border-white/70">
              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-semibold">Mobile view</span>
            </div>
            <div className="absolute inset-0 pointer-events-none opacity-20 border-[0.5px] border-white/50 bg-[linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] bg-[size:33.33%_33.33%]" />
          </div>

          <div className="flex items-center gap-4 max-w-md mx-auto w-full px-4">
            <ZoomOut size={18} className="text-muted-foreground" />
            <input 
              type="range" 
              min="1" 
              max="3" 
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 accent-primary"
            />
            <ZoomIn size={18} className="text-muted-foreground" />
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/30 flex justify-end gap-3">
          <button onClick={onCancel} className="px-5 py-2.5 font-bold rounded-xl hover:bg-muted transition-colors">Cancel</button>
          <button 
            onClick={() => onSave({ url: imageUrl, scale, ...position })}
            className="px-5 py-2.5 font-bold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Check size={18} /> Save Cover
          </button>
        </div>
      </motion.div>
    </div>
  );
}
