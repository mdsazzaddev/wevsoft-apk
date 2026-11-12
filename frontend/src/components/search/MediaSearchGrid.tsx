import React from 'react';
import { Play } from 'lucide-react';

interface MediaSearchGridProps {
  results: any[];
  onMediaClick: (media: any) => void;
}

export const MediaSearchGrid: React.FC<MediaSearchGridProps> = ({ results, onMediaClick }) => {
  if (results.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
      {results.map((result, idx) => {
        const isVideo = result.mediaType?.startsWith('video') || result.fileName?.match(/\.(mp4|webm|ogg)$/i);
        const url = result.mediaUrl || result.url;
        
        return (
          <div
            key={result.id || idx}
            onClick={() => onMediaClick(result)}
            className="group relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer"
          >
            {isVideo ? (
              <>
                <video src={url} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                    <Play className="w-5 h-5 text-white ml-1" />
                  </div>
                </div>
              </>
            ) : (
              <img src={url} alt="Media" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            )}
            
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <p className="text-white text-xs truncate">
                {result.sender?.name || 'Unknown'}
              </p>
              <p className="text-white/70 text-[10px]">
                {new Date(result.createdAt || result.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
