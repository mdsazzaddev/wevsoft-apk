import React, { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { marketFetch } from './utils';

interface ImageSearchButtonProps {
  onResults: (products: any[]) => void;
}

export default function ImageSearchButton({ onResults }: ImageSearchButtonProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/v1/marketplace/image-search', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        onResults(data.products || []);
      } else {
        console.error('Image search failed');
        onResults([]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      onResults([]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 flex items-center justify-center"
        title="Search by image"
      >
        {isUploading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Camera className="w-5 h-5" />
        )}
      </button>
    </>
  );
}
