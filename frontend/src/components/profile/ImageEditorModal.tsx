import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Type, Move, SlidersHorizontal, Trash2, LayoutTemplate, Palette, Sticker, Wand2, Sparkles, Droplets } from 'lucide-react';

interface TextOverlay {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

interface ImageEditorModalProps {
  file: File;
  type: 'avatar' | 'cover' | 'post';
  onClose: () => void;
  onSave: (editedFile: File) => void;
}

export default function ImageEditorModal({ file, type, onClose, onSave }: ImageEditorModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [blur, setBlur] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<'free'|'square'|'portrait'|'landscape'>('free');
  const [filter, setFilter] = useState('none');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [activeTab, setActiveTab] = useState<'crop' | 'adjust' | 'text' | 'stickers' | 'templates' | 'ai'>('crop');
  const [gradientOverlay, setGradientOverlay] = useState<string>('none');
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [stickers, setStickers] = useState<{id: string, emoji: string, x: number, y: number}[]>([]);
  const [newText, setNewText] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [draggingText, setDraggingText] = useState<string | null>(null);
  const [draggingSticker, setDraggingSticker] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [file]);

  useEffect(() => {
    const handleGlobalUp = () => {
      setIsDragging(false);
      setDraggingText(null);
      setDraggingSticker(null);
    };
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchend', handleGlobalUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Determine if we are dragging a text overlay
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let clickedText = null;
    let clickedSticker = null;
    
    for (let i = textOverlays.length - 1; i >= 0; i--) {
       const t = textOverlays[i];
       if (x > t.x && x < t.x + 100 && y > t.y - 20 && y < t.y + 10) {
          clickedText = t.id;
          break;
       }
    }
    
    for (let i = stickers.length - 1; i >= 0; i--) {
       const s = stickers[i];
       if (x > s.x && x < s.x + 40 && y > s.y - 40 && y < s.y + 10) {
          clickedSticker = s.id;
          break;
       }
    }

    if (clickedSticker) {
       setDraggingSticker(clickedSticker);
    } else if (clickedText) {
       setDraggingText(clickedText);
    } else {
       setIsDragging(true);
       setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (draggingText) {
       const x = e.clientX - rect.left;
       const y = e.clientY - rect.top;
       setTextOverlays(textOverlays.map(t => t.id === draggingText ? { ...t, x, y } : t));
    } else if (draggingSticker) {
       const x = e.clientX - rect.left;
       const y = e.clientY - rect.top;
       setStickers(stickers.map(s => s.id === draggingSticker ? { ...s, x, y } : s));
    } else if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    let clickedText = null;
    let clickedSticker = null;

    for (let i = textOverlays.length - 1; i >= 0; i--) {
      const t = textOverlays[i];
      if (x > t.x && x < t.x + 100 && y > t.y - 20 && y < t.y + 10) {
        clickedText = t.id;
        break;
      }
    }

    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i];
      if (x > s.x && x < s.x + 40 && y > s.y - 40 && y < s.y + 10) {
        clickedSticker = s.id;
        break;
      }
    }

    if (clickedSticker) {
      setDraggingSticker(clickedSticker);
    } else if (clickedText) {
      setDraggingText(clickedText);
    } else {
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    if (draggingText) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setTextOverlays(textOverlays.map((t) => (t.id === draggingText ? { ...t, x, y } : t)));
    } else if (draggingSticker) {
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      setStickers(stickers.map((s) => (s.id === draggingSticker ? { ...s, x, y } : s)));
    } else if (isDragging) {
      setPosition({ x: touch.clientX - dragStart.x, y: touch.clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDraggingText(null);
    setDraggingSticker(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggingText(null);
    setDraggingSticker(null);
  };

  const removeBackground = () => {
    setIsAiProcessing(true);
    // Simulate AI processing time
    setTimeout(() => {
      setIsAiProcessing(false);
      // Here we would actually use an AI model to remove background
      // For now we'll just apply a generic visual effect to simulate it
      setBrightness(110);
      setContrast(120);
    }, 2000);
  };

  const handleSave = () => {
    if (!canvasRef.current || !imgRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions based on type
    let targetWidth = 800;
    let targetHeight = 800;
    if (type === 'avatar') {
      targetWidth = 800;
      targetHeight = 800;
    } else if (type === 'cover') {
      // Facebook-style desktop cover frame is 820:312; saved at 2x (1640x624).
      // Phones show the centre 16:9 of the same image.
      targetWidth = 1640;
      targetHeight = 624;
    } else {
      // type === 'post'
      if (aspectRatio === 'square') {
        targetWidth = 800;
        targetHeight = 800;
      } else if (aspectRatio === 'portrait') {
        targetWidth = 800;
        targetHeight = 1000;
      } else if (aspectRatio === 'landscape') {
        targetWidth = 800;
        targetHeight = 450;
      } else {
        const naturalW = imgRef.current.naturalWidth || 800;
        const naturalH = imgRef.current.naturalHeight || 800;
        const ratio = naturalW / naturalH;
        targetWidth = 800;
        targetHeight = Math.round(800 / ratio);
      }
    }
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px)`;
    if (filter === 'grayscale') filterString += ' grayscale(100%)';
    if (filter === 'sepia') filterString += ' sepia(100%)';
    if (filter === 'vintage') filterString += ' sepia(50%) contrast(120%) saturate(140%)';
    
    ctx.filter = filterString;
    
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    
    // Apply drag position (scaled from preview container size to canvas size)
    const previewWidth = imgRef.current?.parentElement?.clientWidth || 256;
    const previewHeight = imgRef.current?.parentElement?.clientHeight || 256;
    ctx.translate(position.x * (targetWidth / previewWidth), position.y * (targetHeight / previewHeight));
    
    // Calculate aspect ratio preserving dimensions
    const imgRatio = imgRef.current.naturalWidth / imgRef.current.naturalHeight;
    const targetRatio = targetWidth / targetHeight;
    
    let drawWidth: number;
    let drawHeight: number;
    
    if (type === 'avatar') {
       // For avatar, make sure it fills the smallest dimension
       if (imgRatio > 1) {
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgRatio;
       } else {
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgRatio;
       }
    } else {
       // Cover
       if (imgRatio > targetRatio) {
          drawHeight = targetHeight;
          drawWidth = targetHeight * imgRatio;
       } else {
          drawWidth = targetWidth;
          drawHeight = targetWidth / imgRatio;
       }
    }
    
    ctx.drawImage(
      imgRef.current,
      -drawWidth / 2,
      -drawHeight / 2,
      drawWidth,
      drawHeight
    );
    ctx.restore();

    // Apply gradient overlay
    if (gradientOverlay !== 'none') {
       const grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
       if (gradientOverlay === 'dark') {
          grd.addColorStop(0, "transparent");
          grd.addColorStop(1, "rgba(0,0,0,0.8)");
       } else if (gradientOverlay === 'primary') {
          grd.addColorStop(0, "rgba(59, 130, 246, 0.4)");
          grd.addColorStop(1, "rgba(147, 51, 234, 0.6)");
       } else if (gradientOverlay === 'warm') {
          grd.addColorStop(0, "rgba(245, 158, 11, 0.3)");
          grd.addColorStop(1, "rgba(239, 68, 68, 0.5)");
       }
       ctx.fillStyle = grd;
       ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply text overlays
    if (type === 'cover') {
       textOverlays.forEach(t => {
          ctx.font = 'bold 36px Inter, sans-serif';
          ctx.fillStyle = t.color;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 4;
          // approximate position mapping from preview to actual canvas
          const previewWidth = 500; // rough preview width
          const xRatio = canvas.width / previewWidth;
          const yRatio = canvas.height / (previewWidth * (targetHeight/targetWidth));
          ctx.fillText(t.text, t.x * xRatio, t.y * yRatio);
          ctx.shadowBlur = 0; // reset
       });
       
       stickers.forEach(s => {
          ctx.font = '48px Arial';
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 4;
          const previewWidth = 500;
          const xRatio = canvas.width / previewWidth;
          const yRatio = canvas.height / (previewWidth * (targetHeight/targetWidth));
          ctx.fillText(s.emoji, s.x * xRatio, s.y * yRatio);
          ctx.shadowBlur = 0; // reset
       });
    }
    
    canvas.toBlob((blob) => {
      if (blob) {
        const editedFile = new File([blob], file.name, { type: 'image/jpeg' });
        onSave(editedFile);
      }
    }, 'image/jpeg', 0.9);
  };

  let previewFilterString = `brightness(${brightness}%) contrast(${contrast}%) blur(${blur}px)`;
  if (filter === 'grayscale') previewFilterString += ' grayscale(100%)';
  if (filter === 'sepia') previewFilterString += ' sepia(100%)';
  if (filter === 'vintage') previewFilterString += ' sepia(50%) contrast(120%) saturate(140%)';

  return (
    <div className="fixed inset-0 z-[110] bg-background flex flex-col">
      <div className="bg-card w-full h-[100dvh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Palette size={20} className="text-primary"/> 
            Edit {type === 'avatar' ? 'Profile Picture' : type === 'cover' ? 'Cover Photo' : 'Post Photo'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 min-h-0">
          
          {/* Image Preview Area */}
          <div className="flex-1 min-h-[42dvh] md:min-h-0 bg-neutral-950 relative overflow-hidden flex items-center justify-center border-b md:border-b-0 md:border-r border-border touch-none select-none p-4"
               onMouseDown={handleMouseDown}
               onMouseMove={handleMouseMove}
               onMouseUp={handleMouseUp}
               onMouseLeave={handleMouseUp}
               onTouchStart={handleTouchStart}
               onTouchMove={handleTouchMove}
               onTouchEnd={handleTouchEnd}
          >
             <div 
                className={`relative overflow-hidden cursor-move ring-2 ring-primary/50 shadow-[0_0_50px_rgba(0,0,0,0.5)] ${
                  type === 'cover'
                    ? 'w-full max-w-[1250px] aspect-[820/312] mx-auto rounded-xl'
                    : type === 'avatar'
                    ? 'w-64 h-64 rounded-full'
                    : aspectRatio === 'square'
                    ? 'w-64 h-64 max-w-[85vw] max-h-[45vh] aspect-square mx-auto rounded-xl'
                    : aspectRatio === 'portrait'
                    ? 'w-56 h-72 max-w-[85vw] max-h-[45vh] aspect-[4/5] mx-auto rounded-xl'
                    : aspectRatio === 'landscape'
                    ? 'w-full max-w-[500px] aspect-[16/9] max-h-[45vh] mx-auto rounded-xl'
                    : 'w-full max-w-[480px] aspect-[4/3] max-h-[45vh] mx-auto rounded-xl'
                }`}
             >
                {type === 'cover' && (
                  // Phones crop to the centre 16:9 (full height, ~68% of the width).
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[67.6%] pointer-events-none z-20 border-x-2 border-dashed border-white/70">
                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] font-semibold">Mobile view</span>
                  </div>
                )}
                {/* Grid Overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 border border-border grid grid-cols-3 grid-rows-3 mix-blend-overlay opacity-50">
                   <div className="border-r border-b border-border"></div>
                   <div className="border-r border-b border-border"></div>
                   <div className="border-b border-border"></div>
                   <div className="border-r border-b border-border"></div>
                   <div className="border-r border-b border-border"></div>
                   <div className="border-b border-border"></div>
                   <div className="border-r border-border"></div>
                   <div className="border-r border-border"></div>
                   <div></div>
                </div>

                {/* Gradient Overlay Preview */}
                {type === 'cover' && gradientOverlay !== 'none' && (
                   <div className={`absolute inset-0 pointer-events-none z-20 ${
                      gradientOverlay === 'dark' ? 'bg-gradient-to-t from-black/80 to-transparent' :
                      gradientOverlay === 'primary' ? 'bg-gradient-to-br from-blue-500/40 to-purple-600/60' :
                      'bg-gradient-to-br from-amber-500/30 to-red-500/50'
                   }`}></div>
                )}

                {/* Text Overlay Preview */}
                {type === 'cover' && textOverlays.map(t => (
                   <div 
                     key={t.id}
                     className="absolute z-30 font-bold text-2xl drop-shadow-md cursor-move pointer-events-none"
                     style={{ left: t.x, top: t.y, color: t.color, transform: 'translate(0, -100%)' }}
                   >
                     {t.text}
                   </div>
                ))}

                {/* Sticker Preview */}
                {type === 'cover' && stickers.map(s => (
                   <div 
                     key={s.id}
                     className="absolute z-30 text-4xl drop-shadow-md cursor-move pointer-events-none"
                     style={{ left: s.x, top: s.y, transform: 'translate(0, -100%)' }}
                   >
                     {s.emoji}
                   </div>
                ))}

                {isAiProcessing && (
                  <div className="absolute inset-0 z-40 bg-black/10 dark:bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Sparkles className="animate-bounce text-violet-500 mb-2" size={32} />
                    <span className="text-sm font-bold animate-pulse">AI Processing...</span>
                  </div>
                )}

                {imageSrc && (
                   <img 
                      ref={imgRef}
                      src={imageSrc} 
                      alt="Preview" 
                      className="absolute max-w-none origin-center pointer-events-none transition-transform duration-75"
                      style={{ 
                        transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${scale}) rotate(${rotate}deg)`,
                        left: '50%',
                        top: '50%',
                        filter: previewFilterString,
                        width: type === 'avatar' ? '100%' : '100%',
                        height: type === 'avatar' ? '100%' : 'auto',
                        objectFit: 'cover'
                      }} 
                   />
                )}
             </div>
             
             {/* Hidden canvas for saving */}
             <canvas ref={canvasRef} className="hidden" />
          </div>
          
          {/* Controls Sidebar */}
          <div className="w-full md:w-80 shrink-0 md:shrink-0 min-h-0 max-h-[58dvh] md:max-h-none bg-muted/10 p-6 overflow-y-auto flex flex-col">
             
             <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl flex-wrap">
               <button onClick={() => setActiveTab('crop')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'crop' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Crop</button>
               <button onClick={() => setActiveTab('adjust')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${activeTab === 'adjust' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>Adjust</button>
               <button onClick={() => setActiveTab('ai')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${activeTab === 'ai' ? 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-500 shadow-sm' : 'text-muted-foreground'}`}><Sparkles size={12}/> AI</button>
               {type === 'cover' && (
                 <>
                   <button onClick={() => setActiveTab('templates')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'templates' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><LayoutTemplate size={12}/> FX</button>
                   <button onClick={() => setActiveTab('stickers')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'stickers' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><Sticker size={12}/> Emoji</button>
                   <button onClick={() => setActiveTab('text')} className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${activeTab === 'text' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><Type size={12}/> Text</button>
                 </>
               )}
             </div>

             {activeTab === 'crop' && (
               <div className="space-y-6">
                 <div>
                   <span className="text-xs font-semibold text-muted-foreground block mb-2">Aspect Ratio</span>
                   {type === 'cover' ? (
                     <div className="rounded-lg border border-primary bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
                       820:312 · 1640×624
                     </div>
                   ) : (
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setAspectRatio('square')} className={`py-2 rounded-lg text-xs font-bold border ${aspectRatio === 'square' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Square</button>
                     <button onClick={() => setAspectRatio('portrait')} className={`py-2 rounded-lg text-xs font-bold border ${aspectRatio === 'portrait' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Portrait</button>
                     <button onClick={() => setAspectRatio('landscape')} className={`py-2 rounded-lg text-xs font-bold border ${aspectRatio === 'landscape' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Landscape</button>
                     <button onClick={() => setAspectRatio('free')} className={`py-2 rounded-lg text-xs font-bold border ${aspectRatio === 'free' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Free</button>
                   </div>
                   )}
                 </div>
                 <div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><ZoomIn size={14}/> Zoom</span>
                     <span className="text-xs font-mono">{Math.round(scale * 100)}%</span>
                   </div>
                   <input type="range" min="0.5" max="3" step="0.05" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full accent-primary" />
                 </div>
                 <div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><RotateCw size={14}/> Rotate</span>
                     <span className="text-xs font-mono">{rotate}°</span>
                   </div>
                   <input type="range" min="-180" max="180" value={rotate} onChange={(e) => setRotate(parseInt(e.target.value))} className="w-full accent-primary" />
                   <div className="flex gap-2 mt-3">
                     <button onClick={() => setRotate(rotate - 90)} className="flex-1 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold hover:bg-muted transition-colors">-90°</button>
                     <button onClick={() => setRotate(rotate + 90)} className="flex-1 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold hover:bg-muted transition-colors">+90°</button>
                     <button onClick={() => {setScale(1); setRotate(0); setPosition({x:0, y:0}); setAspectRatio('free');}} className="flex-1 py-1.5 bg-background border border-border rounded-lg text-xs font-semibold hover:bg-muted transition-colors">Reset</button>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'adjust' && (
               <div className="space-y-6 overflow-y-auto pr-2 pb-4">
                 <div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-muted-foreground">Brightness</span>
                     <span className="text-xs font-mono">{brightness}%</span>
                   </div>
                   <input type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(parseInt(e.target.value))} className="w-full accent-primary" />
                 </div>
                 
                 <div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-muted-foreground">Contrast</span>
                     <span className="text-xs font-mono">{contrast}%</span>
                   </div>
                   <input type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(parseInt(e.target.value))} className="w-full accent-primary" />
                 </div>

                 <div>
                   <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2"><Droplets size={14}/> Blur</span>
                     <span className="text-xs font-mono">{blur}px</span>
                   </div>
                   <input type="range" min="0" max="20" value={blur} onChange={(e) => setBlur(parseInt(e.target.value))} className="w-full accent-primary" />
                 </div>

                 <div className="pt-2 border-t border-border">
                   <span className="text-xs font-semibold text-muted-foreground block mb-3">Filters</span>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setFilter('none')} className={`py-2 px-2 rounded-lg text-xs font-bold border ${filter === 'none' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Normal</button>
                     <button onClick={() => setFilter('grayscale')} className={`py-2 px-2 rounded-lg text-xs font-bold border ${filter === 'grayscale' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>B & W</button>
                     <button onClick={() => setFilter('sepia')} className={`py-2 px-2 rounded-lg text-xs font-bold border ${filter === 'sepia' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Sepia</button>
                     <button onClick={() => setFilter('vintage')} className={`py-2 px-2 rounded-lg text-xs font-bold border ${filter === 'vintage' ? 'border-primary bg-primary/10 text-primary' : 'border-border'}`}>Vintage</button>
                   </div>
                 </div>

                 <button onClick={() => {setBrightness(100); setContrast(100); setBlur(0); setFilter('none');}} className="w-full py-2 bg-background border border-border rounded-lg text-xs font-semibold hover:bg-muted transition-colors mt-2">Reset Adjustments</button>
               </div>
             )}

             {activeTab === 'ai' && (
               <div className="space-y-4">
                  <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-xl p-4 text-center space-y-4">
                    <div className="w-12 h-12 bg-violet-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <Wand2 size={24} className="text-foreground dark:text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-violet-500 mb-1">AI Background Removal</h4>
                      <p className="text-xs text-muted-foreground">Automatically isolate the subject from the background using our advanced AI model.</p>
                    </div>
                    <button 
                      onClick={removeBackground}
                      disabled={isAiProcessing}
                      className="w-full py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2"
                    >
                      {isAiProcessing ? <span className="animate-pulse">Processing...</span> : <>Remove Background <Sparkles size={16}/></>}
                    </button>
                  </div>
               </div>
             )}

             {activeTab === 'templates' && type === 'cover' && (
               <div className="space-y-6">
                 <div>
                   <span className="text-xs font-semibold text-muted-foreground block mb-3">Gradient Overlays</span>
                   <div className="grid grid-cols-2 gap-2">
                     <button onClick={() => setGradientOverlay('none')} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 ${gradientOverlay === 'none' ? 'border-primary text-primary' : 'border-border'}`}>None</button>
                     <button onClick={() => setGradientOverlay('dark')} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 bg-gradient-to-t from-black/80 to-transparent text-white ${gradientOverlay === 'dark' ? 'border-primary' : 'border-border'}`}>Cinematic</button>
                     <button onClick={() => setGradientOverlay('primary')} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 bg-gradient-to-br from-blue-500/80 to-purple-600/80 text-white ${gradientOverlay === 'primary' ? 'border-primary' : 'border-border'}`}>Brand</button>
                     <button onClick={() => setGradientOverlay('warm')} className={`py-3 px-2 rounded-xl text-xs font-bold border-2 bg-gradient-to-br from-amber-500/80 to-red-500/80 text-white ${gradientOverlay === 'warm' ? 'border-primary' : 'border-border'}`}>Sunset</button>
                   </div>
                 </div>
               </div>
             )}

             {activeTab === 'text' && type === 'cover' && (
               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-semibold text-muted-foreground block mb-2">Add Text</label>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Enter text..." 
                       value={newText}
                       onChange={(e) => setNewText(e.target.value)}
                       className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary"
                     />
                     <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                     <button 
                       onClick={() => {
                         if (newText) {
                           setTextOverlays([...textOverlays, { id: Date.now().toString(), text: newText, color: textColor, x: 50, y: 100 }]);
                           setNewText('');
                         }
                       }}
                       className="px-3 py-1.5 bg-primary text-primary-foreground font-bold rounded-lg text-sm hover:bg-primary/90"
                     >
                       Add
                     </button>
                   </div>
                   <p className="text-[10px] text-muted-foreground mt-2 italic">Drag text on the image preview to reposition it.</p>
                 </div>

                 <div className="space-y-2 pt-2 border-t border-border">
                   {textOverlays.map(t => (
                     <div key={t.id} className="flex justify-between items-center bg-background border border-border px-3 py-2 rounded-lg">
                       <div className="flex items-center gap-2">
                         <div className="w-4 h-4 rounded-full border border-border" style={{backgroundColor: t.color}}></div>
                         <span className="text-sm font-semibold truncate max-w-[120px]">{t.text}</span>
                       </div>
                       <button onClick={() => setTextOverlays(textOverlays.filter(x => x.id !== t.id))} className="text-red-500 p-1 hover:bg-red-500/10 rounded"><Trash2 size={14}/></button>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {activeTab === 'stickers' && type === 'cover' && (
               <div className="space-y-4">
                 <div>
                   <span className="text-xs font-semibold text-muted-foreground block mb-2">Campus Stickers</span>
                   <div className="grid grid-cols-4 gap-2">
                     {['🎓', '📚', '⚽', '🏆', '🎉', '💻', '🧪', '🚌'].map((emoji) => (
                       <button
                         key={emoji}
                         onClick={() => {
                           setStickers([...stickers, { id: Date.now().toString(), emoji, x: 100, y: 150 }]);
                         }}
                         className="h-12 flex items-center justify-center text-2xl bg-background border border-border rounded-xl hover:bg-muted transition-colors hover:scale-105"
                       >
                         {emoji}
                       </button>
                     ))}
                   </div>
                   <p className="text-[10px] text-muted-foreground mt-2 italic">Drag stickers on the image preview to reposition.</p>
                 </div>

                 <div className="space-y-2 pt-2 border-t border-border">
                   {stickers.map(s => (
                     <div key={s.id} className="flex justify-between items-center bg-background border border-border px-3 py-2 rounded-lg">
                       <span className="text-xl">{s.emoji}</span>
                       <button onClick={() => setStickers(stickers.filter(x => x.id !== s.id))} className="text-red-500 p-1 hover:bg-red-500/10 rounded"><Trash2 size={14}/></button>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             <div className="mt-auto pt-6 flex gap-3">
               <button onClick={onClose} className="flex-1 py-2.5 bg-background border border-border rounded-xl font-semibold hover:bg-muted transition-colors">Cancel</button>
               <button onClick={handleSave} disabled={isAiProcessing} className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50">
                 <Check size={18} /> Save
               </button>
             </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
