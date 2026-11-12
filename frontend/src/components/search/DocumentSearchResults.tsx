import React from 'react';
import { FileText, Download, FileSpreadsheet, FileIcon as FilePresentation, FileImage, FileAudio, FileVideo, FileArchive } from 'lucide-react';

interface DocumentSearchResultsProps {
  results: any[];
}

export const DocumentSearchResults: React.FC<DocumentSearchResultsProps> = ({ results }) => {
  if (results.length === 0) return null;

  const getFileIcon = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />;
      case 'doc':
      case 'docx': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xls':
      case 'xlsx':
      case 'csv': return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
      case 'ppt':
      case 'pptx': return <FilePresentation className="w-8 h-8 text-orange-500" />;
      case 'zip':
      case 'rar':
      case '7z': return <FileArchive className="w-8 h-8 text-yellow-600" />;
      case 'jpg':
      case 'jpeg':
      case 'png': return <FileImage className="w-8 h-8 text-purple-500" />;
      case 'mp3':
      case 'wav': return <FileAudio className="w-8 h-8 text-pink-500" />;
      case 'mp4':
      case 'mov': return <FileVideo className="w-8 h-8 text-indigo-500" />;
      default: return <FileText className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col p-4 gap-2">
      {results.map((result, idx) => (
        <div
          key={result.id || idx}
          className="flex items-center gap-4 p-3 bg-card border border-border rounded-xl hover:bg-muted/50 transition-colors group cursor-pointer"
          onClick={() => window.open(result.fileUrl || result.url, '_blank')}
        >
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
            {getFileIcon(result.fileName || result.title || '')}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground truncate mb-1">
              {result.fileName || result.title || 'Unknown Document'}
            </h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatSize(result.fileSize)}</span>
              <span>•</span>
              <span className="truncate">{result.sender?.name || 'Unknown User'}</span>
              <span>•</span>
              <span>{new Date(result.createdAt || result.timestamp).toLocaleDateString()}</span>
            </div>
          </div>
          
          <button
            className="p-2 rounded-full hover:bg-background text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => {
              e.stopPropagation();
              window.open(result.fileUrl || result.url, '_blank');
            }}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
