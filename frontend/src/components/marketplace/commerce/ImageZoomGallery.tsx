import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ImageZoomGalleryProps {
  images: string[];
  videos?: string[];
}

export default function ImageZoomGallery({ images = [], videos = [] }: ImageZoomGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<React.CSSProperties>({ display: 'none' });
  const imgRef = useRef<HTMLImageElement>(null);
  const touchX = useRef<number | null>(null);
  const lightboxTouchX = useRef<number | null>(null);

  const nextImage = useCallback(() => {
    if (images.length < 2) return;
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prevImage = useCallback(() => {
    if (images.length < 2) return;
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation for desktop / laptop
  useEffect(() => {
    if (!isLightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      else if (e.key === 'ArrowRight') nextImage();
      else if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  if (!images || images.length === 0) {
    return (
      <div className="w-full aspect-square max-h-[380px] md:max-h-[480px] bg-card flex items-center justify-center rounded-2xl border border-primary/30">
        <span className="text-zinc-500 text-sm">No images available</span>
      </div>
    );
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imgRef.current) return;
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;

    // Calculate percentage for background position
    const xPercent = Math.max(0, Math.min(100, (x / width) * 100));
    const yPercent = Math.max(0, Math.min(100, (y / height) * 100));

    setZoomStyle({
      display: 'block',
      backgroundImage: `url(${images[activeIndex]})`,
      backgroundPosition: `${xPercent}% ${yPercent}%`,
      backgroundSize: '220%',
      backgroundRepeat: 'no-repeat',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ display: 'none' });
  };

  // Touch swipe handling for main image container (iPhone / Android)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current == null || images.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
    if (dx > 45) prevImage();
    else if (dx < -45) nextImage();
    touchX.current = null;
  };

  // Touch swipe handling for Lightbox (iPhone / Android)
  const onLightboxTouchStart = (e: React.TouchEvent) => {
    lightboxTouchX.current = e.changedTouches[0]?.clientX ?? null;
  };
  const onLightboxTouchEnd = (e: React.TouchEvent) => {
    if (lightboxTouchX.current == null || images.length < 2) return;
    const dx = (e.changedTouches[0]?.clientX ?? lightboxTouchX.current) - lightboxTouchX.current;
    if (dx > 45) prevImage();
    else if (dx < -45) nextImage();
    lightboxTouchX.current = null;
  };

  return (
    <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
      {/* Main Image Showcase Container */}
      <div
        className="relative w-full aspect-square max-h-[400px] sm:max-h-[460px] md:max-h-[500px] lg:max-h-[540px] bg-card rounded-2xl border border-primary/30 overflow-hidden cursor-zoom-in group select-none shadow-md"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsLightboxOpen(true)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          ref={imgRef}
          src={images[activeIndex]}
          alt={`Product preview ${activeIndex + 1}`}
          className="w-full h-full object-contain p-2 sm:p-4 transition-transform duration-300 group-hover:scale-[1.02]"
          loading="eager"
        />

        {/* Zoom Overlay (Hover lens on Laptop & PC) */}
        <div
          className="absolute inset-0 pointer-events-none hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-card"
          style={zoomStyle}
        />

        {/* Zoom Icon Hint */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/15 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ZoomIn className="w-4 h-4 text-zinc-200" />
        </div>

        {/* Left & Right Chevron controls (Quick click on desktop/tablet) */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              aria-label="Previous image"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 hover:scale-105"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              aria-label="Next image"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 hover:scale-105"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Slide Counter Badge (Mobile & Touch friendly) */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-primary/30 text-[11px] font-semibold text-zinc-200 pointer-events-none shadow-sm">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Videos strip if any */}
      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((src) => (
            <div key={src} className="relative rounded-xl border border-primary/30 overflow-hidden bg-black max-h-48">
              <video src={src} controls className="w-full h-full object-contain max-h-48" />
            </div>
          ))}
        </div>
      )}

      {/* Horizontal Thumbnails Strip */}
      {images.length > 1 && (
        <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1.5 pt-0.5 snap-x scrollbar-thin px-0.5">
          {images.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`Thumbnail ${idx + 1}`}
              className={`relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 overflow-hidden snap-center transition-all bg-card ${
                activeIndex === idx
                  ? 'border-primary shadow-[0_0_12px_rgba(212,175,55,0.25)] scale-[1.02]'
                  : 'border-white/10 hover:border-white/30 opacity-75 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
              {activeIndex !== idx && (
                <div className="absolute inset-0 bg-black/30 hover:bg-transparent transition-colors" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox (iOS/Android touch swipe + PC keyboard shortcuts) */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
            onTouchStart={onLightboxTouchStart}
            onTouchEnd={onLightboxTouchEnd}
          >
            {/* Top Lightbox Controls Bar */}
            <div className="w-full max-w-5xl flex items-center justify-between z-50 px-2 py-1">
              <span className="text-xs sm:text-sm font-semibold text-zinc-300 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                {activeIndex + 1} / {images.length}
              </span>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="p-2 text-white/80 hover:text-white bg-white/10 rounded-full hover:bg-white/20 border border-white/10 transition-colors"
                title="Close (Esc)"
                aria-label="Close"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Central Main Preview Image */}
            <div className="relative w-full max-w-5xl flex-1 flex items-center justify-center my-2 sm:my-4">
              {images.length > 1 && (
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-2 sm:left-4 p-2.5 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors z-50 backdrop-blur-md"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}

              <motion.img
                key={activeIndex}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.18 }}
                src={images[activeIndex]}
                alt={`Lightbox image ${activeIndex + 1}`}
                className="max-w-full max-h-[70vh] sm:max-h-[78vh] md:max-h-[82vh] object-contain select-none"
              />

              {images.length > 1 && (
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-2 sm:right-4 p-2.5 sm:p-3 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 transition-colors z-50 backdrop-blur-md"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              )}
            </div>

            {/* Lightbox Bottom Thumbnails */}
            {images.length > 1 && (
              <div className="w-full max-w-2xl flex gap-2 overflow-x-auto py-2 px-2 snap-x justify-start sm:justify-center scrollbar-thin">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIndex(idx)}
                    className={`relative flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg border-2 overflow-hidden snap-center transition-all ${
                      activeIndex === idx
                        ? 'border-primary shadow-[0_0_8px_rgba(212,175,55,0.4)] scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt={`Lightbox thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
