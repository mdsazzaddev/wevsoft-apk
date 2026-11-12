import React, { useState } from 'react';
import { FileText, Image as ImageIcon, Link as LinkIcon, Mic, Download, Trash2, UploadCloud } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SharedFile {
  id: string;
  name: string;
  type: 'document' | 'media' | 'link' | 'voice';
  size?: number;
  url: string;
  uploader: { name: string; avatar?: string };
  createdAt: string;
}

interface SharedFilesGridProps {
  files: SharedFile[];
  onDelete: (id: string) => void;
  onUpload: (files: FileList) => void;
}

export const SharedFilesGrid: React.FC<SharedFilesGridProps> = ({ files, onDelete, onUpload }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'document' | 'media' | 'link' | 'voice'>('all');
  const [isDragging, setIsDragging] = useState(false);

  const tabs = [
    { id: 'all', label: 'All Files' },
    { id: 'document', label: 'Docs' },
    { id: 'media', label: 'Media' },
    { id: 'link', label: 'Links' },
    { id: 'voice', label: 'Voice' },
  ] as const;

  const filteredFiles = activeTab === 'all' ? files : files.filter(f => f.type === activeTab);

  const getIcon = (type: string) => {
    switch(type) {
      case 'document': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'media': return <ImageIcon className="w-8 h-8 text-purple-500" />;
      case 'link': return <LinkIcon className="w-8 h-8 text-green-500" />;
      case 'voice': return <Mic className="w-8 h-8 text-pink-500" />;
      default: return <FileText className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  return (
    <div 
      className="flex flex-col h-full bg-background p-4 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 mb-4 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative whitespace-nowrap ${
              activeTab === tab.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
        {filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
            <UploadCloud className="w-16 h-16 mb-4" />
            <p>Drag and drop files here</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredFiles.map(file => (
              <motion.div 
                layout
                key={file.id} 
                className="bg-card border border-border rounded-xl p-3 flex flex-col group relative overflow-hidden hover:border-primary/50 transition-colors"
              >
                <div className="h-20 bg-muted/30 rounded-lg flex items-center justify-center mb-3 group-hover:bg-muted/50 transition-colors">
                  {getIcon(file.type)}
                </div>
                <h4 className="text-sm font-semibold text-foreground truncate mb-1" title={file.name}>{file.name}</h4>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-[10px] text-muted-foreground">{formatSize(file.size)}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[60px]">{file.uploader.name}</span>
                </div>
                
                <div className="absolute inset-x-0 bottom-0 bg-background/90 backdrop-blur-sm border-t border-border flex items-center justify-center gap-4 py-2 translate-y-full group-hover:translate-y-0 transition-transform">
                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-foreground hover:text-primary bg-muted rounded-md transition-colors">
                    <Download className="w-4 h-4" />
                  </a>
                  <button onClick={() => onDelete(file.id)} className="p-1.5 text-foreground hover:text-red-500 bg-muted rounded-md transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center pointer-events-none m-4"
          >
            <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <UploadCloud className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Drop files to upload</h3>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
