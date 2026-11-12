import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, UploadCloud, Loader2 } from 'lucide-react';
import { useStore } from '../store';
import { useOverlayBack } from '../hooks/useOverlayBack';

export default function UploadModal({ onClose }: { onClose: () => void }) {
  useOverlayBack(true, onClose);
  const { t } = useTranslation();
  const token = useStore(state => state.token);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    
    // Upload files sequentially for simplicity in this example
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      
      try {
        await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        setProgress(Math.round(((i + 1) / acceptedFiles.length) * 100));
      } catch (err) {
        console.error("Upload failed", err);
      }
    }
    
    setUploading(false);
    onClose();
    // Dispatch a custom event to trigger refresh
    window.dispatchEvent(new Event('media-uploaded'));
  }, [token, onClose]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop } as any);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-border"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">{t('Upload')}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
              <X size={20} />
            </button>
          </div>

          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 size={40} className="text-primary animate-spin" />
                <div className="text-lg font-medium">{progress}%</div>
                <div className="w-full bg-muted rounded-full h-2 mt-4">
                  <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4">
                <UploadCloud size={48} className="text-muted-foreground" />
                <p className="text-muted-foreground font-medium">{t('DropMedia')}</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
